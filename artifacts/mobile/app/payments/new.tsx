import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useApp } from '@/context/AppContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { getTodayString, formatCurrency } from '@/utils/formatters';
import { PaymentMethod } from '@/types';
import { convertLive } from '@/utils/exchangeRateApi';
import { generateReceiptHTML } from '@/utils/receipt';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'نقداً', icon: 'cash-outline' },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: 'card-outline' },
  { value: 'cheque', label: 'شيك', icon: 'document-text-outline' },
];

export default function NewPaymentScreen() {
  const params = useLocalSearchParams<{ contractId?: string }>();
  const {
    contracts, tenants, units, floors, buildings, currencies,
    addPayment, getContractBalance, getBaseCurrency, addExchangeRate,
  } = useApp();
  const { canUseForeignCurrency } = useSubscription();
  const insets = useSafeAreaInsets();
  const baseCur = getBaseCurrency();

  const [contractId, setContractId] = useState(params.contractId || '');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState(baseCur.id);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [showContractPicker, setShowContractPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [lastPayment, setLastPayment] = useState<any>(null);

  const selectedCurrency = currencies.find(c => c.id === currencyId) || baseCur;
  const isForeign = selectedCurrency.id !== baseCur.id;
  const activeContracts = useMemo(() => contracts.filter(c => c.isActive), [contracts]);
  const selectedContract = contracts.find(c => c.id === contractId);
  const balance = selectedContract ? getContractBalance(selectedContract.id) : undefined;
  const amt = parseFloat(amount) || 0;
  const equiv = isForeign && liveRate ? amt * liveRate : amt;

  const getContractLabel = (c: typeof contracts[0]) => {
    const tenant = tenants.find(t => t.id === c.tenantId);
    const unit = units.find(u => u.id === c.unitId);
    return `${tenant?.fullName || 'مستأجر'} - وحدة ${unit?.unitNumber || ''}`;
  };

  // Fetch live rate when currency changes
  useEffect(() => {
    if (!isForeign) { setLiveRate(null); setRateError(null); return; }
    setFetchingRate(true); setRateError(null);
    convertLive(1, selectedCurrency.code, baseCur.code).then(res => {
      if (res) { setLiveRate(res.rate); }
      else { setRateError('تعذر جلب سعر الصرف. أدخله يدوياً.'); }
      setFetchingRate(false);
    });
  }, [currencyId]);

  const handleCurrencySelect = (id: string) => {
    const cur = currencies.find(c => c.id === id);
    if (cur && cur.id !== baseCur.id && !canUseForeignCurrency()) {
      setShowCurrencyPicker(false);
      Alert.alert(
        '🔒 ميزة مدفوعة',
        'استخدام العملات الأجنبية متاح في النسخة المدفوعة فقط.',
        [
          { text: 'ترقية الآن', onPress: () => router.push('/subscription') },
          { text: 'إلغاء', style: 'cancel' },
        ]
      );
      return;
    }
    setCurrencyId(id);
    setShowCurrencyPicker(false);
  };

  const canSubmit = contractId && amount.trim() && (!isForeign || liveRate !== null);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (isNaN(amt) || amt <= 0) { Alert.alert('خطأ', 'أدخل مبلغاً صحيحاً'); return; }
    setSaving(true);
    try {
      const payment = await addPayment({
        contractId, amountPaid: amt, currencyId,
        equivalentBaseAmount: isForeign && liveRate ? amt * liveRate : amt,
        paymentDate, paymentMethod: method,
        notes: note.trim() || undefined,
      });

      // Auto-save exchange rate if foreign
      if (isForeign && liveRate) {
        await addExchangeRate({
          fromCurrencyId: currencyId,
          toCurrencyId: baseCur.id,
          rate: liveRate,
          date: paymentDate,
        });
      }

      setLastPayment(payment);
      Alert.alert(
        '✅ تم تسجيل الدفعة',
        `رقم الإيصال: ${payment.receiptNumber}`,
        [
          { text: 'طباعة الإيصال', onPress: () => printReceipt(payment) },
          { text: 'حسناً', onPress: () => router.back() },
        ]
      );
    } catch {
      Alert.alert('خطأ', 'فشل في حفظ الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = async (payment: any) => {
    try {
      const contract = contracts.find(c => c.id === payment.contractId);
      if (!contract) return;
      const tenant = tenants.find(t => t.id === contract.tenantId);
      const unit = units.find(u => u.id === contract.unitId);
      const floor = unit ? floors.find(f => f.id === unit.floorId) : undefined;
      const building = floor ? buildings.find(b => b.id === floor.buildingId) : undefined;
      const payCurrency = currencies.find(c => c.id === payment.currencyId) || baseCur;
      if (!tenant || !unit) return;

      const html = generateReceiptHTML({
        payment, contract, tenant, unit, floor, building,
        payCurrency, baseCurrency: baseCur, ownerName: 'إمتلاك',
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'مشاركة الإيصال' });
      } else {
        await Print.printAsync({ uri });
      }
      router.back();
    } catch (e) {
      Alert.alert('خطأ', 'فشل في طباعة الإيصال');
      router.back();
    }
  };

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.title}>تسجيل دفعة إيجار</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          <View style={s.card}>
            <Text style={s.sec}>العقد</Text>
            <Text style={s.fl}>اختر العقد *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowContractPicker(true)}>
              <Ionicons name="chevron-back" size={18} color={TM} />
              <Text style={contractId ? s.pickerVal : s.pickerPlaceholder}>
                {contractId ? getContractLabel(selectedContract!) : 'اختر العقد...'}
              </Text>
            </TouchableOpacity>

            {selectedContract && balance && (
              <View style={[s.balanceInfo, { backgroundColor: balance.balance > 0 ? '#FEF9EE' : '#ECFDF5' }]}>
                <Text style={s.balanceLbl}>الرصيد المستحق</Text>
                <Text style={[s.balanceVal, { color: balance.balance > 0 ? '#D97706' : S }]}>
                  {formatCurrency(balance.balance, baseCur.symbol)}
                </Text>
              </View>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.sec}>تفاصيل الدفعة</Text>

            <Text style={s.fl}>العملة</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowCurrencyPicker(true)}>
              <Ionicons name="chevron-back" size={18} color={TM} />
              <Text style={s.pickerVal}>
                {selectedCurrency.name} ({selectedCurrency.symbol})
                {!canUseForeignCurrency() && ' 🔒'}
              </Text>
            </TouchableOpacity>

            {/* Live rate display */}
            {isForeign && (
              <View style={s.rateBox}>
                {fetchingRate ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <ActivityIndicator size="small" color={P} />
                    <Text style={{ color: TM, fontSize: 13 }}>جاري جلب سعر الصرف المباشر...</Text>
                  </View>
                ) : liveRate ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.rateVal}>1 {selectedCurrency.code} = {liveRate.toFixed(4)} {baseCur.code}</Text>
                    <View style={s.rateLiveBadge}><Text style={s.rateLiveTxt}>مباشر 🔴</Text></View>
                  </View>
                ) : rateError ? (
                  <Text style={{ color: '#D97706', fontSize: 12, textAlign: 'right' }}>⚠️ {rateError}</Text>
                ) : null}
              </View>
            )}

            <Text style={s.fl}>المبلغ *</Text>
            <View style={s.amtRow}>
              <Text style={s.amtSym}>{selectedCurrency.symbol}</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="numeric"
                textAlign="right"
                autoFocus={!!contractId}
              />
            </View>

            {/* Equivalent in base currency */}
            {isForeign && amt > 0 && liveRate && (
              <View style={s.equivBox}>
                <Text style={s.equivLabel}>ما يعادل بالعملة الأساسية</Text>
                <Text style={s.equivVal}>{formatCurrency(equiv, baseCur.symbol)}</Text>
              </View>
            )}

            <Text style={s.fl}>طريقة الدفع</Text>
            <View style={s.methodsRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[s.methodBtn, method === m.value && s.methodActive]}
                  onPress={() => setMethod(m.value)}
                >
                  <Ionicons name={m.icon as any} size={18} color={method === m.value ? '#FFF' : TM} />
                  <Text style={[s.methodTxt, method === m.value && { color: '#FFF' }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fl}>التاريخ</Text>
            <TextInput style={s.input} value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" textAlign="right" />

            <Text style={s.fl}>ملاحظة (اختياري)</Text>
            <TextInput style={[s.input, { height: 60 }]} value={note} onChangeText={setNote} placeholder="أي ملاحظة..." textAlign="right" multiline />
          </View>

          <TouchableOpacity
            style={[s.submit, (!canSubmit || saving) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={s.submitTxt}>تسجيل الدفعة</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Contract Picker */}
      <Modal visible={showContractPicker} transparent animationType="slide" onRequestClose={() => setShowContractPicker(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowContractPicker(false)} />
        <View style={s.pickerSheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>اختر العقد</Text>
          <FlatList
            data={activeContracts}
            keyExtractor={c => c.id}
            style={{ maxHeight: 350 }}
            ListEmptyComponent={<Text style={s.emptyList}>لا توجد عقود نشطة</Text>}
            renderItem={({ item: c }) => {
              const bal = getContractBalance(c.id);
              return (
                <TouchableOpacity style={[s.option, contractId === c.id && s.optionActive]} onPress={() => { setContractId(c.id); setShowContractPicker(false); }}>
                  <Text style={[s.optionTxt, contractId === c.id && { color: P }]}>{getContractLabel(c)}</Text>
                  {bal.balance > 0 && <Text style={s.optionSub}>متأخر: {formatCurrency(bal.balance, baseCur.symbol)}</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Currency Picker */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowCurrencyPicker(false)} />
        <View style={s.pickerSheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>اختر العملة</Text>
          {currencies.map(c => (
            <TouchableOpacity key={c.id} style={[s.option, currencyId === c.id && s.optionActive]} onPress={() => handleCurrencySelect(c.id)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[s.optionTxt, currencyId === c.id && { color: P }]}>{c.name} ({c.symbol})</Text>
                {!c.isBase && !canUseForeignCurrency() && (
                  <View style={s.lockBadge}><Ionicons name="lock-closed" size={12} color="#FFF" /><Text style={s.lockTxt}>مدفوع</Text></View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF' },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  sec: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 14 },
  fl: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', marginBottom: 6, textAlign: 'right' },
  picker: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pickerVal: { fontSize: 14, color: T, textAlign: 'right', flex: 1, marginRight: 6 },
  pickerPlaceholder: { fontSize: 14, color: TM, textAlign: 'right', flex: 1, marginRight: 6 },
  balanceInfo: { borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  balanceLbl: { fontSize: 13, color: TM },
  balanceVal: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  rateBox: { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, marginBottom: 14 },
  rateVal: { fontSize: 13, color: P, fontFamily: 'Inter_600SemiBold' },
  rateLiveBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  rateLiveTxt: { fontSize: 11, color: '#EF4444', fontFamily: 'Inter_600SemiBold' },
  equivBox: { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  equivLabel: { fontSize: 13, color: '#047857' },
  equivVal: { fontSize: 15, fontFamily: 'Inter_700Bold', color: S },
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T, marginBottom: 14 },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  amtSym: { fontSize: 16, fontFamily: 'Inter_700Bold', color: TM },
  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  methodBtn: { borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BG },
  methodActive: { backgroundColor: P, borderColor: P },
  methodTxt: { fontSize: 13, color: TM, fontFamily: 'Inter_500Medium' },
  submit: { backgroundColor: S, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '65%' },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 14 },
  emptyList: { textAlign: 'center', color: TM, padding: 20 },
  option: { padding: 14, borderRadius: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionActive: { backgroundColor: '#EEF2FF' },
  optionTxt: { fontSize: 15, color: T, textAlign: 'right', fontFamily: 'Inter_500Medium' },
  optionSub: { fontSize: 12, color: '#D97706', textAlign: 'right', marginTop: 2 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6B7280', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  lockTxt: { color: '#FFF', fontSize: 11 },
});
