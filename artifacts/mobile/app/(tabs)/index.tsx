import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatMonth, getFirstDayOfMonth, getLastDayOfMonth } from '@/utils/formatters';

const P = '#1B4B82'; const A = '#C9A84C'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const S = '#10B981'; const W = '#F59E0B'; const D = '#EF4444';

export default function DashboardScreen() {
  const { settings, contracts, buildings, getOverdueAlerts, getPLReport, getBaseCurrency } = useApp();
  const insets = useSafeAreaInsets();
  const sym = getBaseCurrency().symbol;
  const startDate = getFirstDayOfMonth();
  const endDate = getLastDayOfMonth();
  const report = useMemo(() => getPLReport(startDate, endDate), []);
  const alerts = useMemo(() => getOverdueAlerts(), []);
  const active = contracts.filter(c => c.isActive).length;

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>مرحباً، {settings.ownerName}</Text>
          <Text style={s.month}>{formatMonth(new Date())}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={s.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        <View style={s.statsRow}>
          {[
            { v: buildings.length, l: 'المباني' },
            { v: active, l: 'عقود نشطة' },
            { v: alerts.length, l: 'متأخرات', warn: alerts.length > 0 },
          ].map((item) => (
            <View key={item.l} style={[s.statCard, item.warn && { backgroundColor: '#FEF3C7' }]}>
              <Text style={[s.statVal, item.warn && { color: W }]}>{item.v}</Text>
              <Text style={s.statLbl}>{item.l}</Text>
            </View>
          ))}
        </View>

        <View style={s.sec}>
          <Text style={s.secTitle}>ملخص الشهر الحالي</Text>
          <View style={s.grid}>
            <FCard label="المستحق" val={formatCurrency(report.totalDue, sym)} color={P} />
            <FCard label="المحصل" val={formatCurrency(report.totalCollected, sym)} color={S} />
            <FCard label="المتأخرات" val={formatCurrency(report.arrears, sym)} color={report.arrears > 0 ? D : S} />
            <FCard label="نسبة التحصيل" val={`${report.collectionRate.toFixed(0)}%`} color={report.collectionRate >= 80 ? S : W} />
          </View>
        </View>

        <View style={s.sec}>
          <View style={[s.netCard, { backgroundColor: report.netProfit >= 0 ? '#ECFDF5' : '#FEF2F2', borderColor: report.netProfit >= 0 ? S : D }]}>
            <Text style={[s.netLbl, { color: report.netProfit >= 0 ? S : D }]}>صافي الربح الشهري</Text>
            <Text style={[s.netVal, { color: report.netProfit >= 0 ? S : D }]}>{formatCurrency(report.netProfit, sym)}</Text>
          </View>
        </View>

        <View style={s.sec}>
          <Text style={s.secTitle}>إجراءات سريعة</Text>
          <View style={s.actRow}>
            <QA icon="add-circle" label="إضافة دفعة" color={S} onPress={() => router.push('/payments/new')} />
            <QA icon="business" label="إضافة مبنى" color={P} onPress={() => router.push('/(tabs)/properties')} />
            <QA icon="bar-chart" label="التقارير" color={A} onPress={() => router.push('/reports')} />
            <QA icon="construct-outline" label="صيانة" color={W} onPress={() => router.push('/(tabs)/transactions')} />
          </View>
        </View>

        {alerts.length > 0 && (
          <View style={s.sec}>
            <Text style={s.secTitle}>تنبيهات المتأخرات ({alerts.length})</Text>
            {alerts.slice(0, 6).map(a => (
              <TouchableOpacity key={a.contract.id} style={s.alertCard} onPress={() => router.push(`/tenants/${a.tenant.id}`)}>
                <View style={s.alertInfo}>
                  <Text style={s.alertName}>{a.tenant.fullName}</Text>
                  <Text style={s.alertUnit}>وحدة {a.unit.unitNumber}</Text>
                </View>
                <Text style={s.alertBal}>{formatCurrency(a.balance, sym)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FCard({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <View style={[fc.card, { borderRightColor: color, borderRightWidth: 3 }]}>
      <Text style={fc.lbl}>{label}</Text>
      <Text style={[fc.val, { color }]}>{val}</Text>
    </View>
  );
}
const fc = StyleSheet.create({
  card: { backgroundColor: CARD, borderRadius: 10, padding: 12, width: '48%', marginBottom: 10, alignItems: 'flex-end', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  lbl: { fontSize: 12, color: TM, marginBottom: 3, textAlign: 'right' },
  val: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'right' },
});

function QA({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={qa.btn} onPress={onPress}>
      <View style={[qa.ic, { backgroundColor: color + '20' }]}><Ionicons name={icon} size={22} color={color} /></View>
      <Text style={qa.lbl}>{label}</Text>
    </TouchableOpacity>
  );
}
const qa = StyleSheet.create({
  btn: { alignItems: 'center', width: '23%' },
  ic: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  lbl: { fontSize: 10, color: T, textAlign: 'center', fontFamily: 'Inter_500Medium' },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: P },
  greeting: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'right' },
  month: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'right' },
  settingsBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingTop: 16 },
  statCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, alignItems: 'center', width: '30%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statVal: { fontSize: 24, fontFamily: 'Inter_700Bold', color: P },
  statLbl: { fontSize: 11, color: TM, marginTop: 2, textAlign: 'center' },
  sec: { paddingHorizontal: 16, marginTop: 16 },
  secTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, marginBottom: 10, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  netCard: { borderRadius: 12, padding: 16, alignItems: 'flex-end', borderWidth: 1 },
  netLbl: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  netVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  actRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  alertCard: { backgroundColor: '#FEF9EE', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A' },
  alertInfo: { flex: 1, alignItems: 'flex-end' },
  alertName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: T, textAlign: 'right' },
  alertUnit: { fontSize: 12, color: TM, textAlign: 'right' },
  alertBal: { fontSize: 14, fontFamily: 'Inter_700Bold', color: D },
});
