import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Subscription, SubscriptionTier } from '@/types';
import { loadObject, saveObject, STORAGE_KEYS } from '@/utils/storage';
import {
  calculateSubscriptionExpiry,
  planFromLicense,
  subscriptionPlanLabel,
  verifyLicenseCode,
  LicensePlan,
} from '@/utils/license';

const createSubscriberId = () => {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IMT-${Date.now().toString(36).toUpperCase()}-${suffix}`;
};

const DEFAULT_SUBSCRIPTION: Subscription = {
  tier: 'free',
  subscriberId: createSubscriberId(),
  usedCodes: [],
};

// ─── Tier limits ──────────────────────────────────────────────────────────────
export const LIMITS = {
  free: { buildings: 1, units: 3, foreignCurrency: false, backup: false, support: false },
  monthly: { buildings: Infinity, units: Infinity, foreignCurrency: true, backup: true, support: false },
  quarterly: { buildings: Infinity, units: Infinity, foreignCurrency: true, backup: true, support: false },
  yearly: { buildings: Infinity, units: Infinity, foreignCurrency: true, backup: true, support: true },
  lifetime: { buildings: Infinity, units: Infinity, foreignCurrency: true, backup: true, support: true },
};

export const PLANS = [
  {
    tier: 'free' as SubscriptionTier,
    priceLabel: 'مجاني',
    period: '',
    badgeColor: '#6B7280',
    features: ['مبنى واحد فقط', '3 وحدات فقط', 'عملة واحدة (أساسية)', 'بدون نسخ احتياطي'],
    limitations: true,
  },
  {
    tier: 'monthly' as SubscriptionTier,
    code: 'MONTHLY' as LicensePlan,
    priceLabel: '$2.99',
    period: 'شهرياً',
    badgeColor: '#3B82F6',
    highlighted: true,
    features: ['مبانٍ ووحدات غير محدودة', 'جميع العملات + أسعار صرف مباشرة', 'نسخ احتياطي وتصدير البيانات', 'إيصالات PDF قابلة للطباعة'],
    limitations: false,
  },
  {
    tier: 'quarterly' as SubscriptionTier,
    code: 'QUARTERLY' as LicensePlan,
    // التسعيرة الافتراضية قابلة للتعديل قبل الإطلاق.
    priceLabel: '$7.99',
    period: 'كل 3 أشهر',
    badgeColor: '#0EA5E9',
    highlighted: false,
    features: ['كل ميزات الخطة الشهرية', 'تفعيل لمدة 90 يوماً', 'سعر أوفر من الدفع الشهري'],
    limitations: false,
  },
  {
    tier: 'yearly' as SubscriptionTier,
    code: 'YEARLY' as LicensePlan,
    priceLabel: '$24.99',
    period: 'سنوياً',
    badgeColor: '#1B4B82',
    highlighted: false,
    features: ['كل ميزات الخطة الشهرية', 'توفير مقارنة بالدفع الشهري', 'دعم فني مخصص', 'تقارير متقدمة'],
    limitations: false,
  },
  {
    tier: 'lifetime' as SubscriptionTier,
    code: 'LIFETIME' as LicensePlan,
    priceLabel: '$49.99',
    period: 'مدى الحياة',
    badgeColor: '#C9A84C',
    highlighted: false,
    features: ['كل ميزات الخطة السنوية', 'دفع مرة واحدة فقط', 'صالح حتى 31 ديسمبر 2099', 'أعلى أولوية في الدعم'],
    limitations: false,
  },
];

type PaidTier = Exclude<SubscriptionTier, 'free'>;

interface SubscriptionContextType {
  subscription: Subscription;
  isPremium: boolean;
  tier: SubscriptionTier;
  limits: typeof LIMITS.free;
  isExpired: boolean;
  isTamperLocked: boolean;
  retryTimeCheck: () => Promise<boolean>;
  activateCode: (code: string) => Promise<{ ok: true; tier: PaidTier } | { ok: false; error: string }>;
  downgradeToFree: () => Promise<void>;
  canAddBuilding: (currentCount: number) => boolean;
  canAddUnit: (totalUnits: number) => boolean;
  canUseForeignCurrency: () => boolean;
  canUseBackup: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

function normalizeSubscription(value: Subscription): Subscription {
  // Migrate the former mock-only annual tier without losing the customer's
  // locally stored subscription metadata.
  const legacy = value.tier as string;
  return {
    ...value,
    tier: legacy === 'annual' ? 'yearly' : value.tier,
    subscriberId: value.subscriberId || createSubscriberId(),
    usedCodes: Array.isArray(value.usedCodes) ? value.usedCodes : [],
  };
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [isTamperLocked, setIsTamperLocked] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = normalizeSubscription(
        await loadObject<Subscription>(STORAGE_KEYS.SUBSCRIPTION, DEFAULT_SUBSCRIPTION),
      );
      const now = Date.now();
      const firstInstallDate = stored.firstInstallDate || new Date(now).toISOString();
      const previousOpen = stored.lastOpenDate ? new Date(stored.lastOpenDate).getTime() : now;
      const firstInstall = new Date(firstInstallDate).getTime();
      const rolledBack = now < previousOpen || now < firstInstall;
      const next: Subscription = {
        ...stored,
        firstInstallDate,
        // Keep the last known good time while locked so setting the clock
        // forward again can recover without silently weakening the check.
        lastOpenDate: rolledBack ? stored.lastOpenDate : new Date(now).toISOString(),
        tamperLocked: rolledBack,
      };

      setSubscription(next);
      setIsTamperLocked(rolledBack);
      if (
        rolledBack
        || next.firstInstallDate !== stored.firstInstallDate
        || next.lastOpenDate !== stored.lastOpenDate
        || next.subscriberId !== stored.subscriberId
      ) {
        await saveObject(STORAGE_KEYS.SUBSCRIPTION, next);
      }
      setIsReady(true);
    })();
  }, []);

  const now = new Date();
  const isExpired =
    subscription.tier !== 'free' &&
    subscription.tier !== 'lifetime' &&
    !!subscription.expiryDate &&
    new Date(subscription.expiryDate) < now;

  const isPremium = !isTamperLocked && subscription.tier !== 'free' && !isExpired;
  const tier: SubscriptionTier = isPremium ? subscription.tier : 'free';
  const limits = LIMITS[tier];

  const save = async (next: Subscription) => {
    setSubscription(next);
    setIsTamperLocked(next.tamperLocked === true);
    await saveObject(STORAGE_KEYS.SUBSCRIPTION, next);
  };

  const retryTimeCheck = async () => {
    const now = Date.now();
    const firstInstall = subscription.firstInstallDate
      ? new Date(subscription.firstInstallDate).getTime()
      : now;
    const lastOpen = subscription.lastOpenDate
      ? new Date(subscription.lastOpenDate).getTime()
      : now;
    if (now < firstInstall || now < lastOpen) return false;
    await save({
      ...subscription,
      lastOpenDate: new Date(now).toISOString(),
      tamperLocked: false,
    });
    return true;
  };

  const activateCode = async (code: string) => {
    const subscriberId = subscription.subscriberId || createSubscriberId();
    const result = verifyLicenseCode(code, subscriberId);
    if (!result.ok) return result;
    if ((subscription.usedCodes || []).includes(result.payload.nonce)) {
      return { ok: false as const, error: 'تم استخدام كود التفعيل هذا من قبل.' };
    }

    const newTier = planFromLicense(result.payload.plan);
    const activationDate = new Date();
    const next: Subscription = {
      ...subscription,
      tier: newTier,
      startDate: activationDate.toISOString(),
      expiryDate: calculateSubscriptionExpiry(result.payload.plan, subscription.expiryDate, activationDate),
      usedCodes: [...(subscription.usedCodes || []), result.payload.nonce],
      subscriberId,
      tamperLocked: false,
      firstInstallDate: subscription.firstInstallDate || activationDate.toISOString(),
      lastOpenDate: activationDate.toISOString(),
    };
    await save(next);
    return { ok: true as const, tier: newTier };
  };

  const downgradeToFree = async () => save({
    ...subscription,
    tier: 'free',
    startDate: undefined,
    expiryDate: undefined,
  });

  const canAddBuilding = (count: number) => isPremium || count < limits.buildings;
  const canAddUnit = (total: number) => isPremium || total < limits.units;
  const canUseForeignCurrency = () => isPremium || limits.foreignCurrency;
  const canUseBackup = () => isPremium || limits.backup;

  const content = !isReady
    ? <StartupScreen />
    : isTamperLocked
      ? <TamperLockScreen onRetry={retryTimeCheck} />
      : children;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isPremium,
      tier,
      limits,
      isExpired,
      isTamperLocked,
      retryTimeCheck,
      activateCode,
      downgradeToFree,
      canAddBuilding,
      canAddUnit,
      canUseForeignCurrency,
      canUseBackup,
    }}>
      {content}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

export { subscriptionPlanLabel };

function StartupScreen() {
  return (
    <View style={guardStyles.center}>
      <Text style={guardStyles.logo}>إمتلاك</Text>
      <Text style={guardStyles.muted}>جارٍ التحقق من بيانات الجهاز...</Text>
    </View>
  );
}

function TamperLockScreen({ onRetry }: { onRetry: () => Promise<boolean> }) {
  const insets = useSafeAreaInsets();
  const handleRetry = async () => {
    const unlocked = await onRetry();
    if (!unlocked) {
      // The persisted last known good date is intentionally not shown:
      // exposing it would make the anti-tamper boundary easier to target.
      Alert.alert('لم يتم تصحيح الوقت', 'فعّل التاريخ والوقت التلقائيين ثم أعد المحاولة.');
    }
  };

  return (
    <View style={[guardStyles.center, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Ionicons name="time-outline" size={64} color="#B45309" />
      <Text style={guardStyles.title}>تم قفل التطبيق مؤقتاً</Text>
      <Text style={guardStyles.body}>
        تم اكتشاف أن وقت الجهاز رجع إلى تاريخ أقدم من آخر فتح للتطبيق. اضبط التاريخ والوقت على الوضع التلقائي، ثم أعد المحاولة.
      </Text>
      <TouchableOpacity style={guardStyles.retry} onPress={handleRetry} testID="retry-time-check">
        <Text style={guardStyles.retryText}>إعادة التحقق من الوقت</Text>
      </TouchableOpacity>
    </View>
  );
}

const guardStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#FFFDF7' },
  logo: { color: '#1B4B82', fontSize: 32, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  muted: { color: '#6B7280', fontSize: 14 },
  title: { color: '#1A1A2E', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 20 },
  body: { color: '#4B5563', fontSize: 15, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  retry: { backgroundColor: '#1B4B82', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14, marginTop: 24 },
  retryText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
});