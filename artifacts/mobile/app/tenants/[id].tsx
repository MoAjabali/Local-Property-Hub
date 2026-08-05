import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatDate, getPaymentMethodLabel } from '@/utils/formatters';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const D = '#EF4444';

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getTenantById, getContractsByTenant, getContractBalance, getUnitById, getFloorById,
    getBuildingById, getCurrencyById, getPaymentsByContract, deleteTenant, getTenantStatement,
    getBaseCurrency, endContract,
  } = useApp();
  const insets = useSafeAreaInsets();

  const tenant = getTenantById(id!);
  const sym = getBaseCurrency().symbol;
  const contracts = tenant ? getContractsByTenant(tenant.id) : [];
  const activeContract = contracts.find(c => c.isActive);
  const balance = activeContract ? getContractBalance(activeContract.id) : null;
  const recentPayments = activeContract ? getPaymentsByContract(activeContract.id).slice(0, 5) : [];
  const statement = tenant ? getTenantStatement(tenant.id) : [];

  const getUnitInfo = (unitId: string) => {
    const unit = getUnitById(unitId);
    const floor = unit ? getFloorById(unit.floorId) : undefined;
    const building = floor ? getBuildingById(floor.buildingId) : undefined;
    return unit ? `${building?.name || ''} - وحدة ${unit.unitNumber}` : 'وحدة غير محددة';
  };

  const handleDelete = () => {
    if (activeContract) {
      Alert.alert('تنبيه', 'لا يمكن حذف مستأجر لديه عقد نشط. أنهِ العقد أولاً.');
      return;
    }
    Alert.alert('حذف المستأجر', `هل تريد حذف "${tenant?.fullName}"؟`, [
      { text: 'إلغاء' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await deleteTenant(id!); router.back(); } },
    ]);
  };

  if (!tenant) {
    return (
      <View style={[s.center, { backgroundColor: BG }]}>
        <Text style={{ color: TM }}>المستأجر غير موجود</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: P, marginTop: 12 }}>عودة</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>{tenant.fullName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={s.name}>{tenant.fullName}</Text>
          {tenant.phone ? <Text style={s.phone}>{tenant.phone}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Tenant info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>بيانات المستأجر</Text>
          {tenant.phone && <Row label="الهاتف" value={tenant.phone} />}
          {tenant.idDocument && <Row label="رقم الهوية" value={tenant.idDocument} />}
        </View>

        {/* Active contract */}
        {activeContract ? (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>العقد الحالي</Text>
              <Row label="الوحدة" value={getUnitInfo(activeContract.unitId)} />
              <Row label="الإيجار الشهري" value={formatCurrency(activeContract.monthlyRent, getCurrencyById(activeContract.currencyId)?.symbol || sym)} />
              <Row label="من" value={formatDate(activeContract.startDate)} />
              <Row label="إلى" value={formatDate(activeContract.endDate)} />
              {balance && (
                <View style={[s.balRow, { backgroundColor: balance.balance > 0 ? '#FEF2F2' : '#ECFDF5' }]}>
                  <Text style={[s.balVal, { color: balance.balance > 0 ? D : S }]}>
                    {balance.balance > 0
                      ? `متأخر: ${formatCurrency(balance.balance, sym)}`
                      : `مسدد: ${formatCurrency(balance.totalPaid, sym)}`}
                  </Text>
                </View>
              )}
            </View>

            <View style={s.actionsRow}>
              <TouchableOpacity style={s.actionBtn} onPress={() => router.push({ pathname: '/payments/new', params: { contractId: activeContract.id } })}>
                <Ionicons name="add-circle" size={18} color={S} />
                <Text style={[s.actionTxt, { color: S }]}>تسجيل دفعة</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#FEF2F2', borderColor: D + '30' }]}
                onPress={() => Alert.alert('إنهاء العقد', 'هل تريد إنهاء العقد؟', [
                  { text: 'إلغاء' },
                  { text: 'إنهاء', style: 'destructive', onPress: () => endContract(activeContract.id) },
                ])}
              >
                <Ionicons name="close-circle" size={18} color={D} />
                <Text style={[s.actionTxt, { color: D }]}>إنهاء العقد</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={s.noContract}>
            <Ionicons name="document-outline" size={44} color={BORDER} />
            <Text style={s.noContractT}>لا يوجد عقد نشط</Text>
            <TouchableOpacity
              style={s.newContractBtn}
              onPress={() => router.push({ pathname: '/contracts/new', params: { tenantId: tenant.id } })}
            >
              <Text style={s.newContractTxt}>+ إنشاء عقد جديد</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent payments */}
        {recentPayments.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>آخر الدفعات</Text>
            {recentPayments.map(p => (
              <View key={p.id} style={s.payRow}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.payAmt}>{formatCurrency(p.equivalentBaseAmount, sym)}</Text>
                  <Text style={s.payMeta}>{getPaymentMethodLabel(p.paymentMethod)}</Text>
                </View>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={s.payDate}>{formatDate(p.paymentDate)}</Text>
                  <Text style={s.payReceipt}>{p.receiptNumber}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Statement summary */}
        {statement.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>كشف الحساب</Text>
            {statement.slice(-6).map(row => (
              <View key={row.id} style={[s.stmRow, { backgroundColor: row.type === 'rent' ? '#FEF9EE' : '#ECFDF5' }]}>
                <Text style={[s.stmBal, { color: row.balance > 0 ? D : S }]}>{formatCurrency(Math.abs(row.balance), sym)}</Text>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={s.stmDesc}>{row.description}</Text>
                  <Text style={s.stmDate}>{formatDate(row.date)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Historical contracts */}
        {contracts.filter(c => !c.isActive).length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>عقود سابقة</Text>
            {contracts.filter(c => !c.isActive).map(c => (
              <View key={c.id} style={s.histRow}>
                <Text style={s.histDate}>{formatDate(c.startDate)} - {formatDate(c.endDate)}</Text>
                <Text style={s.histUnit}>{getUnitInfo(c.unitId)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={r.row}>
      <Text style={r.val}>{value}</Text>
      <Text style={r.lbl}>{label}</Text>
    </View>
  );
}
const r = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lbl: { fontSize: 13, color: '#6B7280' },
  val: { fontSize: 14, color: '#1A1A2E', fontFamily: 'Inter_500Medium', textAlign: 'right', flex: 1, marginRight: 12 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: P },
  backBtn: { padding: 4, marginLeft: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  avatarTxt: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF' },
  name: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'right' },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 12 },
  balRow: { borderRadius: 10, padding: 12, marginTop: 10, alignItems: 'flex-end' },
  balVal: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionBtn: { flex: 1, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: S + '30' },
  actionTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  noContract: { backgroundColor: CARD, borderRadius: 14, padding: 24, alignItems: 'center', gap: 10, marginBottom: 14 },
  noContractT: { fontSize: 15, color: TM },
  newContractBtn: { backgroundColor: P, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  newContractTxt: { color: '#FFF', fontFamily: 'Inter_600SemiBold' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  payAmt: { fontSize: 14, fontFamily: 'Inter_700Bold', color: S },
  payMeta: { fontSize: 12, color: TM },
  payDate: { fontSize: 13, color: T },
  payReceipt: { fontSize: 11, color: TM },
  stmRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, padding: 10, marginBottom: 6 },
  stmDesc: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  stmDate: { fontSize: 11, color: TM, textAlign: 'right' },
  stmBal: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  histRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  histDate: { fontSize: 12, color: TM, textAlign: 'right' },
  histUnit: { fontSize: 13, color: T, textAlign: 'right', marginTop: 2 },
});
