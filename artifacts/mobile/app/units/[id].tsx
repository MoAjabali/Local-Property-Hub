import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, getUnitStatusLabel, getUnitStatusColor } from '@/utils/formatters';
import { UnitStatus } from '@/types';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const W = '#F59E0B'; const D = '#EF4444';

export default function UnitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getUnitById, getFloorById, getBuildingById, getActiveContractForUnit,
    getTenantById, getContractBalance, updateUnit, endContract, getBaseCurrency,
    getPaymentsByContract,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [showStatusModal, setShowStatusModal] = useState(false);

  const unit = getUnitById(id!);
  const floor = unit ? getFloorById(unit.floorId) : undefined;
  const building = floor ? getBuildingById(floor.buildingId) : undefined;
  const contract = unit ? getActiveContractForUnit(unit.id) : undefined;
  const tenant = contract ? getTenantById(contract.tenantId) : undefined;
  const balance = contract ? getContractBalance(contract.id) : undefined;
  const recentPayments = contract ? getPaymentsByContract(contract.id).slice(0, 3) : [];
  const sym = getBaseCurrency().symbol;

  if (!unit) {
    return (
      <View style={[s.center, { backgroundColor: BG }]}>
        <Text style={{ color: TM }}>الوحدة غير موجودة</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: P, marginTop: 12 }}>عودة</Text></TouchableOpacity>
      </View>
    );
  }

  const statusColor = getUnitStatusColor(unit.status);

  const statuses: { value: UnitStatus; label: string }[] = [
    { value: 'vacant', label: 'شاغرة' },
    { value: 'under_maintenance', label: 'قيد الصيانة' },
    { value: 'after_exit', label: 'بعد الخروج' },
  ];

  const handleEndContract = () => {
    if (!contract) return;
    Alert.alert('إنهاء العقد', 'هل تريد إنهاء هذا العقد؟ ستتحول الوحدة إلى حالة "بعد الخروج"', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إنهاء العقد', style: 'destructive', onPress: () => endContract(contract.id) },
    ]);
  };

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, backgroundColor: statusColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.unitNum}>وحدة {unit.unitNumber}</Text>
          <Text style={s.location}>{building?.name}{floor ? ` • ${floor.floorNumber === 0 ? 'الأرضي' : `الطابق ${floor.floorNumber}`}` : ''}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={s.statusTxt}>{getUnitStatusLabel(unit.status)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Contract info */}
        {contract && tenant ? (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>عقد الإيجار الحالي</Text>
              <Row label="المستأجر" value={tenant.fullName} />
              {tenant.phone ? <Row label="الهاتف" value={tenant.phone} /> : null}
              <Row label="قيمة الإيجار" value={formatCurrency(contract.monthlyRent, getBaseCurrency().symbol)} />
              <Row label="تاريخ البداية" value={formatDate(contract.startDate)} />
              <Row label="تاريخ النهاية" value={formatDate(contract.endDate)} />
            </View>

            {balance && (
              <View style={s.card}>
                <Text style={s.cardTitle}>الرصيد المالي</Text>
                <Row label="إجمالي المستحق" value={formatCurrency(balance.totalDue, sym)} />
                <Row label="إجمالي المدفوع" value={formatCurrency(balance.totalPaid, sym)} valueColor={S} />
                <View style={[s.balanceRow, { backgroundColor: balance.balance > 0 ? '#FEF2F2' : '#ECFDF5' }]}>
                  <Text style={[s.balanceVal, { color: balance.balance > 0 ? D : S }]}>
                    {balance.balance > 0 ? `متأخر: ${formatCurrency(balance.balance, sym)}` : 'مسدد بالكامل'}
                  </Text>
                </View>
              </View>
            )}

            {recentPayments.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>آخر الدفعات</Text>
                {recentPayments.map(p => (
                  <View key={p.id} style={s.payRow}>
                    <Text style={s.payAmt}>{formatCurrency(p.equivalentBaseAmount, sym)}</Text>
                    <Text style={s.payDate}>{formatDate(p.paymentDate)} • {p.receiptNumber}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={s.actions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => router.push({ pathname: '/payments/new', params: { contractId: contract.id } })}>
                <Ionicons name="add-circle" size={20} color={S} />
                <Text style={[s.actionTxt, { color: S }]}>تسجيل دفعة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#FEF2F2', borderColor: D + '30' }]} onPress={handleEndContract}>
                <Ionicons name="document-text-outline" size={20} color={D} />
                <Text style={[s.actionTxt, { color: D }]}>إنهاء العقد</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={s.noContract}>
              <Ionicons name="document-outline" size={48} color={BORDER} />
              <Text style={s.noContractT}>لا يوجد عقد نشط</Text>
              {unit.status === 'vacant' && (
                <TouchableOpacity
                  style={s.newContractBtn}
                  onPress={() => router.push({ pathname: '/contracts/new', params: { unitId: unit.id } })}
                >
                  <Ionicons name="add-circle" size={18} color="#FFF" />
                  <Text style={s.newContractTxt}>إنشاء عقد جديد</Text>
                </TouchableOpacity>
              )}
            </View>

            {unit.status !== 'rented' && (
              <TouchableOpacity style={s.changeStatus} onPress={() => setShowStatusModal(true)}>
                <Ionicons name="swap-horizontal" size={18} color={P} />
                <Text style={s.changeStatusTxt}>تغيير حالة الوحدة</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Status change modal */}
      <Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowStatusModal(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>تغيير حالة الوحدة</Text>
          {statuses.filter(st => st.value !== unit.status).map(st => (
            <TouchableOpacity
              key={st.value}
              style={[s.statusOption, { borderColor: getUnitStatusColor(st.value) + '40' }]}
              onPress={async () => { await updateUnit(unit.id, { status: st.value }); setShowStatusModal(false); }}
            >
              <View style={[s.statusDot, { backgroundColor: getUnitStatusColor(st.value) }]} />
              <Text style={s.statusOptTxt}>{st.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowStatusModal(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={r.row}>
      <Text style={[r.val, valueColor ? { color: valueColor, fontFamily: 'Inter_600SemiBold' } : {}]}>{value}</Text>
      <Text style={r.lbl}>{label}</Text>
    </View>
  );
}
const r = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lbl: { fontSize: 13, color: '#6B7280' },
  val: { fontSize: 14, color: '#1A1A2E', fontFamily: 'Inter_500Medium', textAlign: 'right', flex: 1, marginRight: 12 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  backBtn: { padding: 4, marginLeft: 4 },
  unitNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'right' },
  location: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 12 },
  balanceRow: { borderRadius: 10, padding: 12, marginTop: 10, alignItems: 'flex-end' },
  balanceVal: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  payAmt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: S },
  payDate: { fontSize: 12, color: TM },
  actions: { gap: 10 },
  actionBtn: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: S + '30' },
  actionTxt: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  noContract: { backgroundColor: CARD, borderRadius: 14, padding: 30, alignItems: 'center', gap: 12, marginBottom: 14 },
  noContractT: { fontSize: 16, color: TM, fontFamily: 'Inter_500Medium' },
  newContractBtn: { backgroundColor: P, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  newContractTxt: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  changeStatus: { backgroundColor: CARD, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: P + '30' },
  changeStatusTxt: { color: P, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 16 },
  statusOption: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusOptTxt: { fontSize: 15, color: T, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  cancel: { padding: 14, alignItems: 'center' },
  cancelTxt: { color: TM, fontSize: 15 },
});
