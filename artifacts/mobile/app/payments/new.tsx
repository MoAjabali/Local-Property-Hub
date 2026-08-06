import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { getTodayString, formatCurrency } from '@/utils/formatters';
import { PaymentMethod } from '@/types';

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
  const { contracts, tenants, units, currencies, addPayment, getContractBalance, getBaseCurrency, getActiveContractForUnit } = useApp();
  const insets = useSafeAreaInsets();

  const [contractId, setContractId] = useState(params.contractId || '');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState(getBaseCurrency().id);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [showContractPicker, setShowContractPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const baseCur = getBaseCurrency();
  const selectedCurrency = currencies.find(c => c.id === currencyId) || baseCur;

  const activeContracts = useMemo(() => contracts.filter(c => c.isActive), [contracts]);

  const selectedContract = contracts.find(c => c.id === contractId);
  const contractTenant = selectedContract ? tenants.find(t => t.id === selectedContract.tenantId) : undefined;
  const contractUnit = selectedContract ? units.find(u => u.id === selectedContract.unitId) : undefined;
  const balance = selectedContract ? getContractBalance(selectedContract.id) : undefined;

  const getContractLabel = (c: typeof contracts[0]) => {
    const tenant = tenants.find(t => t.id === c.tenantId);
    const unit = units.find(u => u.id === c.unitId);
    return `${tenant?.fullName || 'مستأجر'} - وحدة ${unit?.unitNumber || ''}`;
  };

  const canSubmit = contractId && amount.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('خطأ', 'أدخل مبلغاً صحيحاً'); return; }
    setSaving(true);
    try {
      // Compute base equivalent
      let equivBase = amt;
      if (!selectedCurrency.isBase) {
        // Simplified: no exchange rate lookup for now, use same value
        equivBase = amt;
      }
      await addPayment({
        contractId,
        amountPaid: amt,
        currencyId,
        equivalentBaseAmount: equivBase,
        paymentDate,
        paymentMethod: method,
        notes: note.trim() || undefined,
      });
      Alert.alert('تم', 'تم تسجيل الدفعة بنجاح', [{ text: 'حسناً', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('خطأ', 'فشل في حفظ الدفعة');
    } finally {
      setSaving(false);
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
              <Text style={s.pickerVal}>{selectedCurrency.name} ({selectedCurrency.symbol})</Text>
            </TouchableOpacity>

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

          <TouchableOpacity style={[s.submit, !canSubmit && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!canSubmit || saving}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'تسجيل الدفعة'}</Text>
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
            <TouchableOpacity key={c.id} style={[s.option, currencyId === c.id && s.optionActive]} onPress={() => { setCurrencyId(c.id); setShowCurrencyPicker(false); }}>
              <Text style={[s.optionTxt, currencyId === c.id && { color: P }]}>{c.name} ({c.symbol})</Text>
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
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T, marginBottom: 14 },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  amtSym: { fontSize: 16, fontFamily: 'Inter_700Bold', color: TM },
  methodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  methodBtn: { borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BG },
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
});
