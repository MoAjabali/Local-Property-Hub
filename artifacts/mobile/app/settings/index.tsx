import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useSubscription, PLANS } from '@/context/SubscriptionContext';
import { exportBackup, importBackup } from '@/utils/backup';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const A = '#C9A84C';

export default function SettingsScreen() {
  const { settings, currencies, exchangeRates, updateSettings, addCurrency, setBaseCurrency, addExchangeRate } = useApp();
  const { subscription, isPremium, canUseBackup, tier } = useSubscription();
  const insets = useSafeAreaInsets();

  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [ownerSaved, setOwnerSaved] = useState(true);
  const [showCurrencyForm, setShowCurrencyForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [curCode, setCurCode] = useState('');
  const [curName, setCurName] = useState('');
  const [curSymbol, setCurSymbol] = useState('');
  const [rateFrom, setRateFrom] = useState('');
  const [rateTo, setRateTo] = useState('');
  const [rateValue, setRateValue] = useState('');
  const [rateDate, setRateDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const currentPlan = PLANS.find(p => p.tier === tier);

  const handleSaveOwner = async () => {
    if (!ownerName.trim()) return;
    await updateSettings({ ownerName: ownerName.trim() });
    setOwnerSaved(true);
    Alert.alert('تم', 'تم حفظ الاسم بنجاح');
  };

  const handleAddCurrency = async () => {
    if (!curCode.trim() || !curName.trim() || !curSymbol.trim()) return;
    setSaving(true);
    await addCurrency({ code: curCode.trim().toUpperCase(), name: curName.trim(), symbol: curSymbol.trim(), isBase: false });
    setCurCode(''); setCurName(''); setCurSymbol(''); setShowCurrencyForm(false); setSaving(false);
  };

  const handleAddRate = async () => {
    const rate = parseFloat(rateValue);
    if (!rateFrom || !rateTo || isNaN(rate) || rate <= 0) { Alert.alert('خطأ', 'أدخل بيانات صحيحة'); return; }
    setSaving(true);
    await addExchangeRate({ fromCurrencyId: rateFrom, toCurrencyId: rateTo, rate, date: rateDate });
    setRateFrom(''); setRateTo(''); setRateValue(''); setShowRateForm(false); setSaving(false);
  };

  const handleSetBase = (id: string) => {
    Alert.alert('تغيير العملة الأساسية', 'هل تريد تعيين هذه العملة كعملة أساسية للنظام؟', [
      { text: 'إلغاء' },
      { text: 'تأكيد', onPress: () => setBaseCurrency(id) },
    ]);
  };

  const handleExport = async () => {
    if (!canUseBackup()) {
      Alert.alert('🔒 ميزة مدفوعة', 'النسخ الاحتياطي متاح في النسخة المدفوعة فقط.', [
        { text: 'ترقية الآن', onPress: () => router.push('/subscription') },
        { text: 'إلغاء', style: 'cancel' },
      ]);
      return;
    }
    setBackupLoading(true);
    await exportBackup();
    setBackupLoading(false);
  };

  const handleImport = async () => {
    if (!canUseBackup()) {
      Alert.alert('🔒 ميزة مدفوعة', 'استعادة البيانات متاحة في النسخة المدفوعة فقط.', [
        { text: 'ترقية الآن', onPress: () => router.push('/subscription') },
        { text: 'إلغاء', style: 'cancel' },
      ]);
      return;
    }
    setRestoreLoading(true);
    await importBackup();
    setRestoreLoading(false);
  };

  const getCurrencyName = (id: string) => currencies.find(c => c.id === id)?.name || id;

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.title}>الإعدادات</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

        {/* Subscription Card */}
        <TouchableOpacity style={[s.subCard, { borderColor: currentPlan?.badgeColor || '#6B7280' }]} onPress={() => router.push('/subscription')}>
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.subTitle}>إدارة الاشتراك</Text>
              <Ionicons name="star" size={18} color={isPremium ? A : TM} />
            </View>
            <View style={[s.subBadge, { backgroundColor: (currentPlan?.badgeColor || '#6B7280') + '20' }]}>
              <Text style={[s.subBadgeTxt, { color: currentPlan?.badgeColor || '#6B7280' }]}>
                {isPremium
                  ? `خطة ${currentPlan?.period || 'مدى الحياة'} ✓`
                  : 'النسخة المجانية — اضغط للترقية'}
              </Text>
            </View>
            {subscription.expiryDate && tier !== 'lifetime' && (
              <Text style={s.subExpiry}>
                تنتهي في {new Date(subscription.expiryDate).toLocaleDateString('ar-SA')}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-back" size={20} color={TM} />
        </TouchableOpacity>

        {/* Owner Info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>معلومات المالك</Text>
          <Text style={s.fl}>اسم المالك</Text>
          <TextInput style={s.input} value={ownerName} onChangeText={v => { setOwnerName(v); setOwnerSaved(false); }} placeholder="أدخل اسمك" textAlign="right" />
          <TouchableOpacity style={[s.saveBtn, ownerSaved && { opacity: 0.5 }]} onPress={handleSaveOwner} disabled={ownerSaved}>
            <Text style={s.saveBtnTxt}>حفظ الاسم</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Restore */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            النسخ الاحتياطي والاستعادة {!canUseBackup() ? '🔒' : ''}
          </Text>
          <Text style={s.cardSubtitle}>تصدير بياناتك واستيرادها عبر ملف JSON</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={[s.backupBtn, { backgroundColor: isPremium ? P : '#E5E7EB', flex: 1 }]}
              onPress={handleExport}
              disabled={backupLoading}
            >
              {backupLoading ? (
                <ActivityIndicator size="small" color={isPremium ? '#FFF' : TM} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={isPremium ? '#FFF' : TM} />
                  <Text style={[s.backupBtnTxt, !isPremium && { color: TM }]}>تصدير</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.backupBtn, { backgroundColor: isPremium ? '#ECFDF5' : '#E5E7EB', borderWidth: 1, borderColor: isPremium ? S : BORDER, flex: 1 }]}
              onPress={handleImport}
              disabled={restoreLoading}
            >
              {restoreLoading ? (
                <ActivityIndicator size="small" color={isPremium ? S : TM} />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color={isPremium ? S : TM} />
                  <Text style={[s.backupBtnTxt, { color: isPremium ? S : TM }]}>استعادة</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {!isPremium && (
            <TouchableOpacity style={s.upgradeLink} onPress={() => router.push('/subscription')}>
              <Text style={s.upgradeLinkTxt}>ترقية للوصول إلى النسخ الاحتياطي ←</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Currencies */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <TouchableOpacity style={s.addSmBtn} onPress={() => setShowCurrencyForm(true)}>
              <Ionicons name="add" size={18} color={P} />
              <Text style={s.addSmTxt}>إضافة</Text>
            </TouchableOpacity>
            <Text style={s.cardTitle}>العملات</Text>
          </View>
          {currencies.map(c => (
            <View key={c.id} style={s.currencyRow}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {c.isBase ? (
                  <View style={s.baseBadge}><Text style={s.baseBadgeTxt}>أساسية</Text></View>
                ) : (
                  <TouchableOpacity style={s.setBaseBtn} onPress={() => handleSetBase(c.id)}>
                    <Text style={s.setBaseTxt}>جعلها أساسية</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={s.curName}>{c.name}</Text>
                <Text style={s.curCode}>{c.code} • {c.symbol}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Exchange Rates */}
        {currencies.length > 1 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <TouchableOpacity style={s.addSmBtn} onPress={() => setShowRateForm(true)}>
                <Ionicons name="add" size={18} color={P} />
                <Text style={s.addSmTxt}>إضافة</Text>
              </TouchableOpacity>
              <Text style={s.cardTitle}>أسعار الصرف</Text>
            </View>
            {exchangeRates.length === 0 ? (
              <Text style={s.emptyTxt}>لا توجد أسعار صرف محفوظة</Text>
            ) : (
              exchangeRates.slice(-10).reverse().map(r => (
                <View key={r.id} style={s.rateRow}>
                  <Text style={s.rateVal}>{r.rate.toFixed(4)}</Text>
                  <Text style={s.rateDesc}>{getCurrencyName(r.fromCurrencyId)} → {getCurrencyName(r.toCurrencyId)} • {r.date}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* App Info */}
        <View style={[s.card, { alignItems: 'center', gap: 6 }]}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: P }}>إمتلاك</Text>
          <Text style={{ color: TM, fontSize: 13 }}>نظام إدارة العقارات</Text>
          <Text style={{ color: TM, fontSize: 12 }}>الإصدار 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Add Currency Modal */}
      <Modal visible={showCurrencyForm} transparent animationType="slide" onRequestClose={() => setShowCurrencyForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCurrencyForm(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة عملة جديدة</Text>
          <Text style={s.fl}>رمز العملة *</Text>
          <TextInput style={s.input} value={curCode} onChangeText={setCurCode} placeholder="مثال: USD" textAlign="right" autoCapitalize="characters" />
          <Text style={s.fl}>اسم العملة *</Text>
          <TextInput style={s.input} value={curName} onChangeText={setCurName} placeholder="مثال: دولار أمريكي" textAlign="right" />
          <Text style={s.fl}>الرمز المختصر *</Text>
          <TextInput style={s.input} value={curSymbol} onChangeText={setCurSymbol} placeholder="مثال: $" textAlign="right" />
          <TouchableOpacity style={[s.submit, (!curCode.trim() || !curName.trim() || !curSymbol.trim()) && { opacity: 0.5 }]} onPress={handleAddCurrency} disabled={!curCode.trim() || !curName.trim() || !curSymbol.trim() || saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'إضافة العملة'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCurrencyForm(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Exchange Rate Modal */}
      <Modal visible={showRateForm} transparent animationType="slide" onRequestClose={() => setShowRateForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowRateForm(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة سعر صرف</Text>
          <Text style={s.fl}>من عملة</Text>
          <View style={s.curPickers}>
            {currencies.map(c => (
              <TouchableOpacity key={c.id} style={[s.curPill, rateFrom === c.id && s.curPillActive]} onPress={() => setRateFrom(c.id)}>
                <Text style={[s.curPillTxt, rateFrom === c.id && { color: '#FFF' }]}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fl}>إلى عملة</Text>
          <View style={s.curPickers}>
            {currencies.map(c => (
              <TouchableOpacity key={c.id} style={[s.curPill, rateTo === c.id && s.curPillActive]} onPress={() => setRateTo(c.id)}>
                <Text style={[s.curPillTxt, rateTo === c.id && { color: '#FFF' }]}>{c.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fl}>سعر الصرف *</Text>
          <TextInput style={s.input} value={rateValue} onChangeText={setRateValue} placeholder="1.00" keyboardType="numeric" textAlign="right" />
          <Text style={s.fl}>التاريخ</Text>
          <TextInput style={s.input} value={rateDate} onChangeText={setRateDate} placeholder="YYYY-MM-DD" textAlign="right" />
          <TouchableOpacity style={s.submit} onPress={handleAddRate} disabled={saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'إضافة سعر الصرف'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRateForm(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF' },
  subCard: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  subTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: T },
  subBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  subBadgeTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  subExpiry: { fontSize: 11, color: TM, marginTop: 4, textAlign: 'right' },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 0 },
  cardSubtitle: { fontSize: 12, color: TM, textAlign: 'right', marginTop: 4 },
  fl: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T, marginBottom: 14 },
  saveBtn: { backgroundColor: P, borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnTxt: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  backupBtn: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  backupBtnTxt: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  upgradeLink: { marginTop: 12, padding: 8, alignItems: 'center' },
  upgradeLinkTxt: { color: P, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  addSmBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  addSmTxt: { color: P, fontSize: 13, fontFamily: 'Inter_500Medium' },
  currencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  curName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: T, textAlign: 'right' },
  curCode: { fontSize: 12, color: TM, textAlign: 'right' },
  baseBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  baseBadgeTxt: { color: S, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  setBaseBtn: { borderRadius: 6, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 8, paddingVertical: 3 },
  setBaseTxt: { color: TM, fontSize: 11 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rateDesc: { fontSize: 12, color: T, textAlign: 'right', flex: 1 },
  rateVal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: P },
  emptyTxt: { textAlign: 'center', color: TM, padding: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 20 },
  curPickers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  curPill: { borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: BG },
  curPillActive: { backgroundColor: P, borderColor: P },
  curPillTxt: { fontSize: 13, color: TM, fontFamily: 'Inter_600SemiBold' },
  submit: { backgroundColor: P, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  submitTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  cancel: { padding: 14, alignItems: 'center' },
  cancelTxt: { color: TM, fontSize: 15 },
});
