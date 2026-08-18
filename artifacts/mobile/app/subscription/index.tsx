import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useSubscription, PLANS, subscriptionPlanLabel } from '@/context/SubscriptionContext';
import { SubscriptionTier } from '@/types';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const CARD = '#FFFFFF'; const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981';
type Plan = typeof PLANS[number];

function planName(tier: SubscriptionTier) {
  return subscriptionPlanLabel(tier);
}

export default function SubscriptionScreen() {
  const { settings, updateSettings } = useApp();
  const {
    subscription, isPremium, activateCode, downgradeToFree, isExpired, isTamperLocked,
  } = useSubscription();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [savingPaymentInfo, setSavingPaymentInfo] = useState(false);
  const [bankName, setBankName] = useState(settings.bankName || '');
  const [accountName, setAccountName] = useState(settings.bankAccountName || '');
  const [accountNumber, setAccountNumber] = useState(settings.bankAccountNumber || '');
  const [bankSwift, setBankSwift] = useState(settings.bankSwift || '');
  const [whatsapp, setWhatsapp] = useState(settings.whatsappNumber || '');

  const isCurrent = (tier: SubscriptionTier) => subscription.tier === tier && !isExpired;

  const expiryText = () => {
    if (!isPremium) return null;
    if (subscription.tier === 'lifetime') return 'صالح حتى 31 ديسمبر 2099';
    if (subscription.expiryDate) {
      return `ينتهي في ${new Date(subscription.expiryDate).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric',
      })}`;
    }
    return null;
  };

  const savePaymentInfo = async () => {
    setSavingPaymentInfo(true);
    await updateSettings({
      bankName: bankName.trim(),
      bankAccountName: accountName.trim(),
      bankAccountNumber: accountNumber.trim(),
      bankSwift: bankSwift.trim(),
      whatsappNumber: whatsapp.trim(),
    });
    setSavingPaymentInfo(false);
    Alert.alert('تم الحفظ', 'تم حفظ بيانات التحويل ووسيلة التواصل على هذا الجهاز.');
  };

  const openWhatsApp = async () => {
    const number = whatsapp.trim().replace(/[^\d+]/g, '');
    if (!number) {
      Alert.alert('أضف رقم واتساب', 'احفظ رقم واتساب صاحب المشروع في بيانات التحويل أولاً.');
      return;
    }
    const message = `مرحباً، أريد تفعيل خطة ${selectedPlan ? planName(selectedPlan.tier) : ''} في تطبيق إمتلاك. رقم المشترك: ${subscription.subscriberId}`;
    const url = `https://wa.me/${number.replace('+', '')}?text=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
  };

  const handleSelect = (plan: Plan) => {
    if (plan.tier === 'free') {
      Alert.alert(
        'العودة للنسخة المجانية',
        'سيتم إيقاف ميزات الاشتراك المدفوع على هذا الجهاز. الأكواد المستخدمة ستبقى محفوظة ولن يمكن إعادة استخدامها.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تأكيد', style: 'destructive', onPress: downgradeToFree },
        ],
      );
      return;
    }
    setSelectedPlan(plan);
  };

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      Alert.alert('أدخل الكود', 'الصق كود التفعيل الذي استلمته من صاحب المشروع.');
      return;
    }
    setActivating(true);
    const result = await activateCode(activationCode);
    setActivating(false);
    if (!result.ok) {
      Alert.alert('تعذر التفعيل', result.error);
      return;
    }
    setActivationCode('');
    setSelectedPlan(null);
    Alert.alert(
      'تم التفعيل بنجاح',
      `تم تفعيل الخطة ${planName(result.tier)} على رقم المشترك ${subscription.subscriberId}.`,
      [{ text: 'ابدأ الاستخدام', onPress: () => router.back() }],
    );
  };

  return (
    <View style={s.screen}>
      <LinearGradient colors={['#1B4B82', '#0F1729']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} testID="subscription-close">
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.appName}>إمتلاك</Text>
          <Text style={s.tagline}>الدفع الخارجي والتفعيل بالكود</Text>
          <View style={s.subscriberBadge}>
            <Text style={s.subscriberLabel}>رقم المشترك</Text>
            <Text style={s.subscriberId}>{subscription.subscriberId}</Text>
          </View>
          {isPremium && (
            <View style={s.currentBadge}>
              <Ionicons name="checkmark-circle" size={14} color={S} />
              <Text style={s.currentBadgeTxt}>
                خطتك الحالية: {planName(subscription.tier)} {expiryText() ? ` • ${expiryText()}` : ''}
              </Text>
            </View>
          )}
          {isExpired && <Text style={s.expiredText}>انتهت صلاحية اشتراكك — يمكنك التفعيل بكود جديد</Text>}
          {isTamperLocked && (
            <Text style={s.expiredText}>تم قفل التطبيق بسبب رجوع وقت الجهاز. اضبط الوقت تلقائياً ثم افتح التطبيق.</Text>
          )}
        </View>
        <View style={s.headerSpacer} />
      </LinearGradient>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        bottomOffset={24}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#1B4B82" />
          <View style={s.infoText}>
            <Text style={s.infoTitle}>اشتراك بدون بوابة دفع</Text>
            <Text style={s.infoBody}>
              حوّل المبلغ خارج التطبيق، أرسل صورة الإيصال عبر واتساب، ثم أدخل كود التفعيل الموقع الذي تستلمه.
            </Text>
          </View>
        </View>

        {PLANS.map(plan => {
          const current = isCurrent(plan.tier);
          const selected = selectedPlan?.tier === plan.tier;
          return (
            <View
              key={plan.tier}
              style={[
                s.planCard,
                plan.highlighted && s.planHighlighted,
                current && { borderColor: plan.badgeColor, borderWidth: 2 },
                selected && { borderColor: plan.badgeColor, borderWidth: 2, backgroundColor: '#F8FAFC' },
              ]}
            >
              {plan.highlighted && (
                <View style={[s.popularBadge, { backgroundColor: plan.badgeColor }]}>
                  <Text style={s.popularTxt}>الأكثر شيوعاً</Text>
                </View>
              )}
              {current && (
                <View style={[s.activeBadge, { backgroundColor: plan.badgeColor }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                  <Text style={s.activeBadgeTxt}>خطتك الحالية</Text>
                </View>
              )}
              <View style={s.planTop}>
                <View style={s.priceBlock}>
                  <Text style={[s.price, { color: plan.badgeColor }]}>{plan.priceLabel}</Text>
                  {plan.period ? <Text style={s.period}>/{plan.period}</Text> : null}
                </View>
                <View style={[s.tierBadge, { backgroundColor: `${plan.badgeColor}20` }]}>
                  <Text style={[s.tierBadgeTxt, { color: plan.badgeColor }]}>{planName(plan.tier)}</Text>
                </View>
              </View>
              <View style={s.features}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={s.featureRow}>
                    <Text style={s.featureTxt}>{feature}</Text>
                    <Ionicons name={plan.limitations ? 'close-circle' : 'checkmark-circle'} size={16} color={plan.limitations ? '#9CA3AF' : S} />
                  </View>
                ))}
              </View>
              {current ? (
                <View style={s.currentPlanButton}><Text style={s.currentPlanText}>الخطة مفعّلة</Text></View>
              ) : (
                <TouchableOpacity
                  style={[s.subscribeBtn, { backgroundColor: plan.tier === 'free' ? '#F3F4F6' : plan.badgeColor }]}
                  onPress={() => handleSelect(plan)}
                  testID={`select-plan-${plan.tier}`}
                >
                  <Text style={[s.subscribeTxt, plan.tier === 'free' && { color: TM }]}>
                    {plan.tier === 'free' ? 'العودة للنسخة المجانية' : selected ? 'الخطة المختارة' : 'اختيار الخطة'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {selectedPlan && selectedPlan.tier !== 'free' && (
          <View style={s.paymentCard}>
            <Text style={s.sectionTitle}>خطوات التحويل والتفعيل</Text>
            <Text style={s.stepText}>1. حوّل {selectedPlan.priceLabel} إلى الحساب التالي:</Text>
            <View style={s.bankBox}>
              <PaymentRow label="البنك" value={bankName || 'لم تُضف بيانات البنك بعد'} />
              <PaymentRow label="اسم صاحب الحساب" value={accountName || '—'} />
              <PaymentRow label="رقم الحساب" value={accountNumber || '—'} />
              {bankSwift ? <PaymentRow label="SWIFT" value={bankSwift} /> : null}
            </View>
            <Text style={s.stepText}>2. أرسل صورة الإيصال إلى واتساب، مع ذكر رقم المشترك:</Text>
            <View style={s.subscriberInline}>
              <Text style={s.subscriberInlineText}>{subscription.subscriberId}</Text>
              <Ionicons name="person-circle-outline" size={20} color="#1B4B82" />
            </View>
            <TouchableOpacity style={s.whatsappBtn} onPress={openWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
              <Text style={s.whatsappText}>إرسال رسالة واتساب</Text>
            </TouchableOpacity>
            <Text style={s.stepText}>3. بعد استلام الكود، الصقه هنا للتفعيل Offline:</Text>
            <TextInput
              style={s.codeInput}
              value={activationCode}
              onChangeText={setActivationCode}
              placeholder="الصق كود التفعيل هنا"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="left"
              testID="activation-code-input"
            />
            <TouchableOpacity style={s.activateBtn} onPress={handleActivate} disabled={activating} testID="activate-code-button">
              {activating ? <ActivityIndicator color="#FFF" /> : <Text style={s.activateText}>تحقق من الكود وفعّل الاشتراك</Text>}
            </TouchableOpacity>
            <Text style={s.securityNote}>يتم التحقق من التوقيع والمشترك والرقم الفريد داخل الجهاز، ولا يحتاج التفعيل إلى الإنترنت.</Text>
          </View>
        )}

        <View style={s.paymentSettingsCard}>
          <Text style={s.sectionTitle}>بيانات التحويل والتواصل</Text>
          <Text style={s.smallHint}>هذه البيانات تظهر في شاشة الدفع على هذا الجهاز. أدخل بياناتك الحقيقية قبل توزيع التطبيق.</Text>
          <PaymentInput label="اسم البنك" value={bankName} onChangeText={setBankName} placeholder="مثال: اسم البنك" />
          <PaymentInput label="اسم صاحب الحساب" value={accountName} onChangeText={setAccountName} placeholder="الاسم كما يظهر في الحساب" />
          <PaymentInput label="رقم الحساب" value={accountNumber} onChangeText={setAccountNumber} placeholder="رقم الحساب أو الآيبان" keyboardType="default" />
          <PaymentInput label="رمز SWIFT (اختياري)" value={bankSwift} onChangeText={setBankSwift} placeholder="إن وجد" />
          <PaymentInput label="رقم واتساب مع رمز الدولة" value={whatsapp} onChangeText={setWhatsapp} placeholder="+967..." keyboardType="phone-pad" />
          <TouchableOpacity style={s.savePaymentBtn} onPress={savePaymentInfo} disabled={savingPaymentInfo}>
            {savingPaymentInfo ? <ActivityIndicator color="#1B4B82" /> : <Text style={s.savePaymentText}>حفظ بيانات التحويل</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.disclaimer}>لا تتم أي معاملة مالية داخل التطبيق. لا تضع المفتاح الخاص داخل التطبيق أو في ملف التوزيع.</Text>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.paymentRow}>
      <Text style={s.paymentValue}>{value}</Text>
      <Text style={s.paymentLabel}>{label}</Text>
    </View>
  );
}

function PaymentInput({
  label, value, onChangeText, placeholder, keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={s.settingsInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        textAlign="right"
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingHorizontal: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'flex-start' },
  closeBtn: { padding: 4, marginTop: 4 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 36 },
  appName: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#FFF' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  subscriberBadge: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  subscriberLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  subscriberId: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold', marginTop: 2, textAlign: 'center' },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  currentBadgeTxt: { fontSize: 12, color: S, fontFamily: 'Inter_500Medium' },
  expiredText: { fontSize: 12, color: '#FCA5A5', textAlign: 'center', marginTop: 10, maxWidth: 290 },
  infoCard: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoText: { flex: 1, alignItems: 'flex-end' },
  infoTitle: { color: '#1B4B82', fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'right' },
  infoBody: { color: '#475569', fontSize: 13, lineHeight: 20, marginTop: 4, textAlign: 'right' },
  planCard: { backgroundColor: CARD, borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  planHighlighted: { borderColor: '#3B82F6', borderWidth: 1.5, backgroundColor: '#FAFBFF' },
  popularBadge: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 14, paddingVertical: 5, borderBottomRightRadius: 12 },
  popularTxt: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
  activeBadge: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12 },
  activeBadgeTxt: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, marginTop: 12 },
  priceBlock: { alignItems: 'flex-end' },
  price: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  period: { fontSize: 13, color: TM, marginTop: 2 },
  tierBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  tierBadgeTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  features: { gap: 10, marginBottom: 18 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featureTxt: { fontSize: 14, color: T, flex: 1, textAlign: 'right', marginLeft: 8 },
  subscribeBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  subscribeTxt: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  currentPlanButton: { borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#F0FDF4' },
  currentPlanText: { color: '#16A34A', fontSize: 15, fontFamily: 'Inter_700Bold' },
  paymentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  paymentSettingsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  sectionTitle: { color: T, fontSize: 17, fontFamily: 'Inter_700Bold', textAlign: 'right', marginBottom: 12 },
  stepText: { color: '#475569', fontSize: 13, lineHeight: 20, textAlign: 'right', marginTop: 9 },
  bankBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginTop: 8 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  paymentLabel: { color: TM, fontSize: 12 },
  paymentValue: { color: T, fontSize: 13, flex: 1, textAlign: 'left', marginRight: 10 },
  subscriberInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#EFF6FF', borderRadius: 10, marginTop: 8 },
  subscriberInlineText: { color: '#1B4B82', fontFamily: 'Inter_700Bold', fontSize: 14 },
  whatsappBtn: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#16A34A', marginTop: 10 },
  whatsappText: { color: '#FFF', fontFamily: 'Inter_700Bold', fontSize: 14 },
  codeInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, marginTop: 8, fontSize: 13, color: T, fontFamily: 'Inter_500Medium' },
  activateBtn: { backgroundColor: '#1B4B82', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10 },
  activateText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  securityNote: { color: TM, fontSize: 11, textAlign: 'right', lineHeight: 17, marginTop: 10 },
  smallHint: { color: TM, fontSize: 12, textAlign: 'right', lineHeight: 18, marginBottom: 12 },
  inputGroup: { marginBottom: 10 },
  inputLabel: { color: '#475569', fontSize: 12, textAlign: 'right', marginBottom: 5 },
  settingsInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: T, backgroundColor: '#F8FAFC' },
  savePaymentBtn: { borderWidth: 1, borderColor: '#1B4B82', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  savePaymentText: { color: '#1B4B82', fontSize: 14, fontFamily: 'Inter_700Bold' },
  disclaimer: { textAlign: 'center', fontSize: 11, color: TM, marginTop: 4, lineHeight: 18 },
});