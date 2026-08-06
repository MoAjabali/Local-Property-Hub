import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSubscription, PLANS } from '@/context/SubscriptionContext';
import { SubscriptionTier } from '@/types';

const CARD = '#FFFFFF'; const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981';

export default function SubscriptionScreen() {
  const { subscription, isPremium, upgradeTo, downgradeToFree, isExpired } = useSubscription();
  const insets = useSafeAreaInsets();
  const [purchasing, setPurchasing] = useState<SubscriptionTier | null>(null);
  const [showConfirm, setShowConfirm] = useState<typeof PLANS[0] | null>(null);

  const handleSelect = (plan: typeof PLANS[0]) => {
    if (plan.tier === 'free') {
      Alert.alert(
        'تخفيض الخطة',
        'هل تريد العودة إلى النسخة المجانية؟ ستفقد الوصول للميزات المتقدمة.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تأكيد', style: 'destructive', onPress: downgradeToFree },
        ]
      );
      return;
    }
    setShowConfirm(plan);
  };

  const handlePurchase = async (plan: typeof PLANS[0]) => {
    setShowConfirm(null);
    setPurchasing(plan.tier);
    // Simulate processing delay (mock payment)
    await new Promise(r => setTimeout(r, 1500));
    await upgradeTo(plan.tier);
    setPurchasing(null);
    Alert.alert(
      '🎉 تم الاشتراك بنجاح!',
      `مرحباً بك في خطة ${plan.period ? plan.priceLabel + ' ' + plan.period : plan.tier === 'lifetime' ? 'مدى الحياة' : ''}!\nجميع الميزات أصبحت متاحة الآن.`,
      [{ text: 'ابدأ الاستخدام', onPress: () => router.back() }]
    );
  };

  const isCurrent = (tier: SubscriptionTier) => subscription.tier === tier;

  const expiryText = () => {
    if (!isPremium) return null;
    if (subscription.tier === 'lifetime') return 'لا تنتهي أبداً';
    if (subscription.expiryDate) {
      const d = new Date(subscription.expiryDate);
      return `تنتهي في ${d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1729' }}>
      {/* Header */}
      <LinearGradient colors={['#1B4B82', '#0F1729']} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.appName}>إمتلاك</Text>
          <Text style={s.tagline}>اختر الخطة المناسبة لك</Text>
          {isPremium && (
            <View style={s.currentBadge}>
              <Ionicons name="checkmark-circle" size={14} color={S} />
              <Text style={s.currentBadgeTxt}>
                خطتك الحالية: {PLANS.find(p => p.tier === subscription.tier)?.period || 'مدى الحياة'}
                {expiryText() ? `  •  ${expiryText()}` : ''}
              </Text>
            </View>
          )}
          {isExpired && (
            <View style={[s.currentBadge, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}>
              <Ionicons name="warning" size={14} color="#EF4444" />
              <Text style={[s.currentBadgeTxt, { color: '#EF4444' }]}>انتهت صلاحية اشتراكك</Text>
            </View>
          )}
        </View>
        <View style={{ width: 36 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {PLANS.map(plan => {
          const current = isCurrent(plan.tier);
          const isLoading = purchasing === plan.tier;
          return (
            <View
              key={plan.tier}
              style={[
                s.planCard,
                plan.highlighted && s.planHighlighted,
                current && { borderColor: plan.badgeColor, borderWidth: 2 },
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
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={[s.price, { color: plan.badgeColor }]}>{plan.priceLabel}</Text>
                    {plan.period ? <Text style={s.period}>/{plan.period}</Text> : null}
                  </View>
                </View>
                <View style={[s.tierBadge, { backgroundColor: plan.badgeColor + '20' }]}>
                  <Text style={[s.tierBadgeTxt, { color: plan.badgeColor }]}>
                    {plan.tier === 'free' ? 'مجانية' : plan.tier === 'monthly' ? 'شهرية' : plan.tier === 'annual' ? 'سنوية' : 'مدى الحياة'}
                  </Text>
                </View>
              </View>

              <View style={s.features}>
                {plan.features.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Text style={s.featureTxt}>{f}</Text>
                    <Ionicons
                      name={plan.limitations ? 'close-circle' : 'checkmark-circle'}
                      size={16}
                      color={plan.limitations ? '#9CA3AF' : S}
                    />
                  </View>
                ))}
              </View>

              {plan.tier !== 'free' && (
                <TouchableOpacity
                  style={[
                    s.subscribeBtn,
                    { backgroundColor: current ? '#F3F4F6' : plan.badgeColor },
                    isLoading && { opacity: 0.7 },
                  ]}
                  onPress={() => !current && handleSelect(plan)}
                  disabled={current || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={[s.subscribeTxt, current && { color: TM }]}>
                      {current ? 'خطتك الحالية' : 'اشترك الآن'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              {plan.tier === 'free' && !current && (
                <TouchableOpacity style={[s.subscribeBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => handleSelect(plan)}>
                  <Text style={[s.subscribeTxt, { color: TM }]}>التخفيض للنسخة المجانية</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={s.disclaimer}>
          * هذا تطبيق تجريبي — لا تتم أي معاملة مالية حقيقية. الاشتراك للمحاكاة فقط.
        </Text>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={!!showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(null)}>
        <View style={s.confirmOverlay}>
          <View style={s.confirmSheet}>
            <Text style={s.confirmTitle}>تأكيد الاشتراك</Text>
            <Text style={s.confirmBody}>
              سيتم تفعيل خطة{' '}
              <Text style={{ fontFamily: 'Inter_700Bold', color: showConfirm?.badgeColor }}>
                {showConfirm?.period || 'مدى الحياة'}
              </Text>
              {'\n'}السعر: {showConfirm?.priceLabel}{showConfirm?.period ? `/${showConfirm.period}` : ' (مدفوع مرة واحدة)'}
            </Text>
            <Text style={s.confirmNote}>في بيئة الإنتاج ستُفتح نافذة الدفع الآمنة هنا.</Text>
            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: showConfirm?.badgeColor }]}
              onPress={() => showConfirm && handlePurchase(showConfirm)}
            >
              <Text style={s.confirmBtnTxt}>تأكيد الاشتراك (محاكاة)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowConfirm(null)} style={s.confirmCancel}>
              <Text style={{ color: TM, fontSize: 15 }}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'flex-start' },
  closeBtn: { padding: 4, marginTop: 4 },
  appName: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#FFF' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  currentBadgeTxt: { fontSize: 12, color: S, fontFamily: 'Inter_500Medium' },
  planCard: { backgroundColor: CARD, borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  planHighlighted: { borderColor: '#3B82F6', borderWidth: 1.5, backgroundColor: '#FAFBFF' },
  popularBadge: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 14, paddingVertical: 5, borderBottomRightRadius: 12 },
  popularTxt: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_700Bold' },
  activeBadge: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 12 },
  activeBadgeTxt: { color: '#FFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, marginTop: 12 },
  price: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  period: { fontSize: 14, color: TM },
  tierBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  tierBadgeTxt: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  features: { gap: 10, marginBottom: 18 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featureTxt: { fontSize: 14, color: T, flex: 1, textAlign: 'right', marginLeft: 8 },
  subscribeBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  subscribeTxt: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_700Bold' },
  disclaimer: { textAlign: 'center', fontSize: 11, color: TM, marginTop: 8, lineHeight: 18 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  confirmSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  confirmTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: T, textAlign: 'center', marginBottom: 14 },
  confirmBody: { fontSize: 16, color: T, textAlign: 'center', lineHeight: 26, marginBottom: 12 },
  confirmNote: { fontSize: 12, color: TM, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  confirmBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  confirmCancel: { padding: 12, alignItems: 'center' },
});
