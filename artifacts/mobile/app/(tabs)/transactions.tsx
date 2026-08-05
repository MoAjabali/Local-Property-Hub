import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, getTodayString, getPaymentMethodLabel } from '@/utils/formatters';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const W = '#F59E0B'; const D = '#EF4444';

export default function TransactionsScreen() {
  const {
    payments, maintenanceExpenses, contracts, tenants, units,
    addMaintenanceExpense, deleteMaintenanceExpense, getBaseCurrency, buildings, floors,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'payments' | 'maintenance'>('payments');
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [saving, setSaving] = useState(false);
  const sym = getBaseCurrency().symbol;

  const sortedPayments = useMemo(() =>
    [...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()), [payments]);

  const sortedMaint = useMemo(() =>
    [...maintenanceExpenses].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()), [maintenanceExpenses]);

  const getContractInfo = (contractId: string) => {
    const c = contracts.find(ct => ct.id === contractId);
    if (!c) return { tenantName: 'غير معروف', unitNum: '' };
    const tenant = tenants.find(t => t.id === c.tenantId);
    const unit = units.find(u => u.id === c.unitId);
    return { tenantName: tenant?.fullName || 'غير معروف', unitNum: unit?.unitNumber || '' };
  };

  const getUnitInfo = (unitId?: string) => {
    if (!unitId) return 'عام';
    const unit = units.find(u => u.id === unitId);
    return unit ? `وحدة ${unit.unitNumber}` : 'غير محدد';
  };

  const handleAddMaint = async () => {
    if (!desc.trim() || !amount.trim()) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('خطأ', 'أدخل مبلغاً صحيحاً'); return; }
    setSaving(true);
    await addMaintenanceExpense({ description: desc.trim(), amount: amt, expenseDate: date });
    setDesc(''); setAmount(''); setDate(getTodayString()); setShowMaintForm(false); setSaving(false);
  };

  const totalPayments = useMemo(() => payments.reduce((s, p) => s + p.equivalentBaseAmount, 0), [payments]);
  const totalMaint = useMemo(() => maintenanceExpenses.reduce((s, m) => s + m.amount, 0), [maintenanceExpenses]);

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>المعاملات المالية</Text>
        <TouchableOpacity
          onPress={() => tab === 'payments' ? router.push('/payments/new') : setShowMaintForm(true)}
          style={s.addBtn}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tabBtn, tab === 'payments' && s.tabActive]} onPress={() => setTab('payments')}>
          <Text style={[s.tabTxt, tab === 'payments' && s.tabActiveTxt]}>الدفعات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'maintenance' && s.tabActive]} onPress={() => setTab('maintenance')}>
          <Text style={[s.tabTxt, tab === 'maintenance' && s.tabActiveTxt]}>مصاريف الصيانة</Text>
        </TouchableOpacity>
      </View>

      {tab === 'payments' ? (
        <FlatList
          data={sortedPayments}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={sortedPayments.length > 0 ? (
            <View style={s.summary}>
              <Text style={s.sumLbl}>إجمالي المحصل</Text>
              <Text style={[s.sumVal, { color: S }]}>{formatCurrency(totalPayments, sym)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cash-outline" size={56} color={BORDER} />
              <Text style={s.emptyT}>لا توجد دفعات بعد</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/payments/new')}>
                <Text style={s.emptyBtnT}>+ إضافة دفعة</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: p }) => {
            const { tenantName, unitNum } = getContractInfo(p.contractId);
            return (
              <View style={s.payCard}>
                <View style={s.payLeft}>
                  <View style={[s.payIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="arrow-down-circle" size={22} color={S} />
                  </View>
                  <View style={s.payInfo}>
                    <Text style={s.payName}>{tenantName}</Text>
                    <Text style={s.payMeta}>{unitNum ? `وحدة ${unitNum}  •  ` : ''}{formatDate(p.paymentDate)}</Text>
                    <Text style={s.payMethod}>{getPaymentMethodLabel(p.paymentMethod)} • {p.receiptNumber}</Text>
                  </View>
                </View>
                <Text style={[s.payAmt, { color: S }]}>{formatCurrency(p.equivalentBaseAmount, sym)}</Text>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={sortedMaint}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={sortedMaint.length > 0 ? (
            <View style={s.summary}>
              <Text style={s.sumLbl}>إجمالي مصاريف الصيانة</Text>
              <Text style={[s.sumVal, { color: D }]}>{formatCurrency(totalMaint, sym)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="construct-outline" size={56} color={BORDER} />
              <Text style={s.emptyT}>لا توجد مصاريف بعد</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowMaintForm(true)}>
                <Text style={s.emptyBtnT}>+ إضافة مصروف</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: m }) => (
            <View style={s.maintCard}>
              <View style={s.maintLeft}>
                <View style={[s.payIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="construct" size={20} color={W} />
                </View>
                <View style={s.payInfo}>
                  <Text style={s.payName}>{m.description}</Text>
                  <Text style={s.payMeta}>{getUnitInfo(m.unitId)} • {formatDate(m.expenseDate)}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.payAmt, { color: D }]}>{formatCurrency(m.amount, sym)}</Text>
                <TouchableOpacity onPress={() => Alert.alert('حذف', 'هل تريد حذف هذا المصروف؟', [
                  { text: 'إلغاء' }, { text: 'حذف', style: 'destructive', onPress: () => deleteMaintenanceExpense(m.id) }
                ])}>
                  <Ionicons name="trash-outline" size={16} color={TM} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Maintenance Modal */}
      <Modal visible={showMaintForm} transparent animationType="slide" onRequestClose={() => setShowMaintForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowMaintForm(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة مصروف صيانة</Text>
          <Text style={s.fl}>وصف المصروف *</Text>
          <TextInput style={s.input} value={desc} onChangeText={setDesc} placeholder="مثال: إصلاح سباكة" textAlign="right" />
          <Text style={s.fl}>المبلغ *</Text>
          <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" textAlign="right" />
          <Text style={s.fl}>التاريخ</Text>
          <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" textAlign="right" />
          <TouchableOpacity style={[s.submit, (!desc.trim() || !amount.trim()) && { opacity: 0.5 }]} onPress={handleAddMaint} disabled={!desc.trim() || !amount.trim() || saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'إضافة المصروف'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMaintForm(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: CARD, marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: P },
  tabTxt: { fontSize: 14, fontFamily: 'Inter_500Medium', color: TM },
  tabActiveTxt: { color: '#FFF', fontFamily: 'Inter_600SemiBold' },
  summary: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLbl: { fontSize: 13, color: TM },
  sumVal: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  payCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  payLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  payIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  payInfo: { flex: 1, alignItems: 'flex-end' },
  payName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: T, textAlign: 'right' },
  payMeta: { fontSize: 12, color: TM, marginTop: 2, textAlign: 'right' },
  payMethod: { fontSize: 11, color: TM, marginTop: 1, textAlign: 'right' },
  payAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  maintCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  maintLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyT: { fontSize: 16, color: TM, fontFamily: 'Inter_500Medium' },
  emptyBtn: { backgroundColor: P, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  emptyBtnT: { color: '#FFF', fontFamily: 'Inter_600SemiBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 20 },
  fl: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T, marginBottom: 14 },
  submit: { backgroundColor: P, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  submitTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  cancel: { padding: 14, alignItems: 'center' },
  cancelTxt: { color: TM, fontSize: 15 },
});
