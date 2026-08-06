import React, { createContext, useContext, useEffect, useState } from 'react';
import { Subscription, SubscriptionTier } from '@/types';
import { loadObject, saveObject, STORAGE_KEYS } from '@/utils/storage';

const DEFAULT_SUBSCRIPTION: Subscription = { tier: 'free' };

// ─── Tier limits ──────────────────────────────────────────────────────────────
export const LIMITS = {
  free: { buildings: 1, units: 3, foreignCurrency: false, backup: false, support: false },
  monthly: { buildings: Infinity, units: Infinity, foreignCurrency: true, backup: true, support: false },
  annual: { buildings: Infinity, units: Infinity, foreignCurrency: true, backup: true, support: true },
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
    priceLabel: '$2.99',
    period: 'شهرياً',
    badgeColor: '#3B82F6',
    highlighted: true,
    features: ['مبانٍ ووحدات غير محدودة', 'جميع العملات + أسعار صرف مباشرة', 'نسخ احتياطي وتصدير البيانات', 'إيصالات PDF قابلة للطباعة'],
    limitations: false,
  },
  {
    tier: 'annual' as SubscriptionTier,
    priceLabel: '$24.99',
    period: 'سنوياً',
    badgeColor: '#1B4B82',
    highlighted: false,
    features: ['كل ميزات الخطة الشهرية', 'توفير 30% مقارنة بالشهري', 'دعم فني مخصص', 'تقارير متقدمة'],
    limitations: false,
  },
  {
    tier: 'lifetime' as SubscriptionTier,
    priceLabel: '$49.99',
    period: 'مدى الحياة',
    badgeColor: '#C9A84C',
    highlighted: false,
    features: ['كل ميزات الخطة السنوية', 'دفع مرة واحدة فقط', 'تحديثات مجانية لسنتين', 'أعلى أولوية في الدعم'],
    limitations: false,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
interface SubscriptionContextType {
  subscription: Subscription;
  isPremium: boolean;
  tier: SubscriptionTier;
  limits: typeof LIMITS.free;
  isExpired: boolean;
  upgradeTo: (tier: SubscriptionTier) => Promise<void>;
  downgradeToFree: () => Promise<void>;
  canAddBuilding: (currentCount: number) => boolean;
  canAddUnit: (totalUnits: number) => boolean;
  canUseForeignCurrency: () => boolean;
  canUseBackup: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);

  useEffect(() => {
    loadObject<Subscription>(STORAGE_KEYS.SUBSCRIPTION, DEFAULT_SUBSCRIPTION).then(setSubscription);
  }, []);

  const isExpired =
    subscription.tier !== 'free' &&
    subscription.tier !== 'lifetime' &&
    !!subscription.expiryDate &&
    new Date(subscription.expiryDate) < new Date();

  const isPremium =
    subscription.tier !== 'free' && !isExpired;

  const tier: SubscriptionTier = isPremium ? subscription.tier : 'free';
  const limits = LIMITS[tier];

  const save = async (s: Subscription) => {
    setSubscription(s);
    await saveObject(STORAGE_KEYS.SUBSCRIPTION, s);
  };

  const upgradeTo = async (newTier: SubscriptionTier) => {
    const now = new Date();
    let expiryDate: string | undefined;
    if (newTier === 'monthly') {
      const exp = new Date(now); exp.setMonth(exp.getMonth() + 1);
      expiryDate = exp.toISOString();
    } else if (newTier === 'annual') {
      const exp = new Date(now); exp.setFullYear(exp.getFullYear() + 1);
      expiryDate = exp.toISOString();
    }
    await save({ tier: newTier, startDate: now.toISOString(), expiryDate });
  };

  const downgradeToFree = async () => save({ tier: 'free' });

  const canAddBuilding = (count: number) => isPremium || count < limits.buildings;
  const canAddUnit = (total: number) => isPremium || total < limits.units;
  const canUseForeignCurrency = () => isPremium || limits.foreignCurrency;
  const canUseBackup = () => isPremium || limits.backup;

  return (
    <SubscriptionContext.Provider value={{
      subscription, isPremium, tier, limits, isExpired,
      upgradeTo, downgradeToFree,
      canAddBuilding, canAddUnit, canUseForeignCurrency, canUseBackup,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
