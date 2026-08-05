import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatMonth, getFirstDayOfMonth, getLastDayOfMonth } from '@/utils/formatters';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const W = '#F59E0B'; const D = '#EF4444'; const A = '#C9A84C';

export default function ReportsScreen() {
  const { getPLReport, getBaseCurrency, buildings, contracts, tenants } = useApp();
  const insets = useSafeAreaInsets();
  const sym = getBaseCurrency().symbol;

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());

  const report = useMemo(() => getPLReport(startDate, endDate), [startDate, endDate]);

  const kpiCards = [
    { label: 'إجمالي المستحق', value: formatCurrency(report.totalDue, sym), color: P, icon: 'document-text' },
    { label: 'إجمالي المحصل', value: formatCurrency(report.totalCollected, sym), color: S, icon: 'cash' },
    { label: 'المتأخرات', value: formatCurrency(report.arrears, sym), color: report.arrears > 0 ? D : S, icon: 'warning' },
    { label: 'مصاريف الصيانة', value: formatCurrency(report.maintenanceCosts, sym), color: W, icon: 'construct' },
  ];

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.title}>التقارير المالية</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Date Range */}
        <View style={s.card}>
          <Text style={s.cardTitle}>الفترة الزمنية</Text>
          <View style={s.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fl}>من</Text>
              <TextInput style={s.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" textAlign="right" />
            </View>
            <Ionicons name="arrow-back" size={20} color={TM} style={{ marginTop: 28 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.fl}>إلى</Text>
              <TextInput style={s.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" textAlign="right" />
            </View>
          </View>

          {/* Quick period buttons */}
          <View style={s.periodRow}>
            {[
              { label: 'هذا الشهر', start: getFirstDayOfMonth(), end: getLastDayOfMonth() },
              { label: 'هذا العام', start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` },
              { label: 'كل الوقت', start: '2000-01-01', end: '2099-12-31' },
            ].map(p => (
              <TouchableOpacity
                key={p.label}
                style={[s.periodBtn, startDate === p.start && endDate === p.end && s.periodBtnActive]}
                onPress={() => { setStartDate(p.start); setEndDate(p.end); }}
              >
                <Text style={[s.periodBtnTxt, startDate === p.start && endDate === p.end && { color: '#FFF' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Net Profit Hero */}
        <View style={[s.heroCard, { backgroundColor: report.netProfit >= 0 ? P : D }]}>
          <Text style={s.heroLabel}>صافي الربح</Text>
          <Text style={s.heroValue}>{formatCurrency(report.netProfit, sym)}</Text>
          <Text style={s.heroSub}>نسبة التحصيل: {report.collectionRate.toFixed(1)}%</Text>
        </View>

        {/* KPI Grid */}
        <View style={s.kpiGrid}>
          {kpiCards.map(k => (
            <View key={k.label} style={[s.kpiCard, { borderTopColor: k.color, borderTopWidth: 3 }]}>
              <Ionicons name={k.icon as any} size={20} color={k.color} />
              <Text style={s.kpiVal}>{k.value}</Text>
              <Text style={s.kpiLbl}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Collection Rate Bar */}
        <View style={s.card}>
          <Text style={s.cardTitle}>نسبة التحصيل</Text>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${Math.min(100, report.collectionRate)}%`, backgroundColor: report.collectionRate >= 80 ? S : report.collectionRate >= 50 ? W : D }]} />
          </View>
          <Text style={[s.barPct, { color: report.collectionRate >= 80 ? S : report.collectionRate >= 50 ? W : D }]}>
            {report.collectionRate.toFixed(1)}%
          </Text>
        </View>

        {/* Summary stats */}
        <View style={s.card}>
          <Text style={s.cardTitle}>إحصاءات عامة</Text>
          <StatRow label="إجمالي المباني" value={`${buildings.length}`} />
          <StatRow label="العقود النشطة" value={`${contracts.filter(c => c.isActive).length}`} />
          <StatRow label="إجمالي المستأجرين" value={`${tenants.length}`} />
          <StatRow label="المستحق - المحصل" value={formatCurrency(report.totalDue - report.totalCollected, sym)} valueColor={report.totalDue > report.totalCollected ? D : S} />
          <StatRow label="ص. الربح (بعد الصيانة)" value={formatCurrency(report.netProfit, sym)} valueColor={report.netProfit >= 0 ? S : D} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={sr.row}>
      <Text style={[sr.val, valueColor ? { color: valueColor, fontFamily: 'Inter_700Bold' } : {}]}>{value}</Text>
      <Text style={sr.lbl}>{label}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lbl: { fontSize: 14, color: TM },
  val: { fontSize: 14, color: T, fontFamily: 'Inter_600SemiBold' },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF' },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 14 },
  dateRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  fl: { fontSize: 13, color: TM, textAlign: 'right', marginBottom: 4 },
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 10, fontSize: 13, color: T },
  periodRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  periodBtn: { borderRadius: 8, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: BG },
  periodBtnActive: { backgroundColor: P, borderColor: P },
  periodBtnTxt: { fontSize: 12, color: TM, fontFamily: 'Inter_500Medium' },
  heroCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 14 },
  heroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_500Medium' },
  heroValue: { fontSize: 32, fontFamily: 'Inter_700Bold', color: '#FFF', marginTop: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, width: '47%', alignItems: 'flex-end', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  kpiVal: { fontSize: 16, fontFamily: 'Inter_700Bold', color: T, marginTop: 8, marginBottom: 4, textAlign: 'right' },
  kpiLbl: { fontSize: 12, color: TM, textAlign: 'right' },
  barBg: { height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 6 },
  barPct: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
});
