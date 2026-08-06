import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { getTodayString } from '@/utils/formatters';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';

export default function NewContractScreen() {
  const params = useLocalSearchParams<{ tenantId?: string; unitId?: string }>();
  const { tenants, units, floors, buildings, currencies, addContract, getActiveContractForUnit, getBaseCurrency } = useApp();
  const { canAddUnit, canUseForeignCurrency, isPremium } = useSubscription();
  const insets = useSafeAreaInsets();

  const [tenantId, setTenantId] = useState(params.tenantId || '');
  const [unitId, setUnitId] = useState(params.unitId || '');
  const [currencyId, setCurrencyId] = useState(getBaseCurrency().id);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [showTenantPicker, setShowTenantPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

  const selectedTenant = tenants.find(t => t.id === tenantId);
  const selectedUnit = units.find(u => u.id === unitId);
  const selectedCurrency = currencies.find(c => c.id === currencyId) || getBaseCurrency();

  const totalUnits = units.length;
  const vacantUnits = useMemo(() =>
    units.filter(u => u.status === 'vacant' && !getActiveContractForUnit(u.id)), [units]);

  const filteredTenants = useMemo(() =>
    tenants.filter(t => t.fullName.includes(tenantSearch) || (t.phone || '').includes(tenantSearch)),
    [tenants, tenantSearch]);

  const getUnitLabel = (u: typeof units[0]) => {
    const floor = floors.find(f => f.id === u.floorId);
    const building = floor ? buildings.find(b => b.id === floor.buildingId) : undefined;
    return `${building?.name || ''} - وحدة ${u.unitNumber}${floor ? ` (${floor.floorNumber === 0 ? 'أرضي' : `ط${floor.floorNumber}`})` : ''}`;
  };

  const canSubmit = tenantId && unitId && monthlyRent.trim() && startDate && endDate;

  const handleUnitSelect = (u: typeof units[0]) => {
    // Check unit limit for free tier (totalUnits is already existing units, selecting one doesn't add)
    setUnitId(u.id);
    setShowUnitPicker(false);
  };

  const handleCurrencySelect = (id: string) => {
    const cur = currencies.find(c => c.id === id);
    if (cur && !cur.isBase && !canUseForeignCurrency()) {
      setShowCurrencyPicker(false);
      Alert.alert(
        '🔒 ميزة مدفوعة',
        'استخدام العملات الأجنبية في العقود متاح في النسخة المدفوعة فقط.',
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const rent = parseFloat(monthlyRent);
    if (isNaN(rent) || rent <= 0) { Alert.alert('خطأ', 'أدخل قيمة إيجار صحيحة'); return; }
    if (new Date(endDate) <= new Date(startDate)) { Alert.alert('خطأ', 'تاريخ النهاية يجب أن يكون بعد البداية'); return; }

    // Free tier: check unit count
    if (!canAddUnit(totalUnits)) {
      Alert.alert(
        '🔒 الحد المجاني',
        'الحد المجاني هو 3 وحدات فقط.\nقم بالترقية للحصول على وحدات غير محدودة.',
        [
          { text: 'ترقية الآن', onPress: () => router.push('/subscription') },
          { text: 'إلغاء', style: 'cancel' },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      await addContract({
        tenantId, unitId, currencyId,
        monthlyRent: rent,
        startDate, endDate,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        isActive: true,
      });
      Alert.alert('تم', 'تم إنشاء العقد بنجاح', [{ text: 'حسناً', onPress: () => router.back() }]);
    } catch {
      Alert.alert('خطأ', 'فشل في حفظ العقد');
    } finally { setSaving(false); }
  };

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.title}>عقد إيجار جديد</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
          {/* Free tier warning */}
          {!isPremium && (
            <TouchableOpacity style={s.limitBanner} onPress={() => router.push('/subscription')}>
              <Ionicons name="information-circle" size={16} color="#D97706" />
              <Text style={s.limitBannerTxt}>النسخة المجانية: 3 وحدات كحد أقصى • عملة واحدة فقط</Text>
              <Text style={s.limitBannerLink}>ترقية</Text>
            </TouchableOpacity>
          )}

          <View style={s.card}>
            <Text style={s.sec}>أطراف العقد</Text>
            <Text style={s.fl}>المستأجر *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowTenantPicker(true)}>
              <Ionicons name="chevron-back" size={18} color={TM} />
              <Text style={selectedTenant ? s.pickerVal : s.pickerPlaceholder}>
                {selectedTenant ? selectedTenant.fullName : 'اختر المستأجر...'}
              </Text>
            </TouchableOpacity>

            <Text style={s.fl}>الوحدة *</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowUnitPicker(true)}>
              <Ionicons name="chevron-back" size={18} color={TM} />
              <Text style={selectedUnit ? s.pickerVal : s.pickerPlaceholder}>
                {selectedUnit ? getUnitLabel(selectedUnit) : 'اختر الوحدة...'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.sec}>بنود العقد</Text>
            <Text style={s.fl}>العملة {!canUseForeignCurrency() ? '🔒 (النسخة المجانية: ريال سعودي فقط)' : ''}</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowCurrencyPicker(true)}>
              <Ionicons name="chevron-back" size={18} color={TM} />
              <Text style={s.pickerVal}>{selectedCurrency.name} ({selectedCurrency.symbol})</Text>
            </TouchableOpacity>

            <Text style={s.fl}>الإيجار الشهري *</Text>
            <View style={s.amtRow}>
              <Text style={s.amtSym}>{selectedCurrency.symbol}</Text>
              <TextInput style={[s.input, { flex: 1 }]} value={monthlyRent} onChangeText={setMonthlyRent} placeholder="0" keyboardType="numeric" textAlign="right" />
            </View>

            <Text style={s.fl}>مبلغ التأمين</Text>
            <TextInput style={s.input} value={depositAmount} onChangeText={setDepositAmount} placeholder="0 (اختياري)" keyboardType="numeric" textAlign="right" />

            <Text style={s.fl}>تاريخ البداية *</Text>
            <TextInput style={s.input} value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" textAlign="right" />

            <Text style={s.fl}>تاريخ النهاية *</Text>
            <TextInput style={s.input} value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" textAlign="right" />
          </View>

          <TouchableOpacity style={[s.submit, !canSubmit && { opacity: 0.5 }]} onPress={handleSubmit} disabled={!canSubmit || saving}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'إنشاء العقد'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Tenant Picker */}
      <Modal visible={showTenantPicker} transparent animationType="slide" onRequestClose={() => setShowTenantPicker(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowTenantPicker(false)} />
        <View style={s.pickerSheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>اختر المستأجر</Text>
          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color={TM} style={{ marginLeft: 8 }} />
            <TextInput style={s.searchInput} value={tenantSearch} onChangeText={setTenantSearch} placeholder="بحث..." textAlign="right" placeholderTextColor={TM} />
          </View>
          <FlatList
            data={filteredTenants}
            keyExtractor={t => t.id}
            style={{ maxHeight: 300 }}
            ListEmptyComponent={<Text style={s.emptyList}>لا يوجد مستأجرون</Text>}
            renderItem={({ item: t }) => (
              <TouchableOpacity style={[s.option, tenantId === t.id && s.optionActive]} onPress={() => { setTenantId(t.id); setShowTenantPicker(false); setTenantSearch(''); }}>
                <Text style={[s.optionTxt, tenantId === t.id && { color: P }]}>{t.fullName}</Text>
                {t.phone ? <Text style={s.optionSub}>{t.phone}</Text> : null}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity onPress={() => { setShowTenantPicker(false); router.push('/(tabs)/tenants'); }} style={s.addLink}>
            <Ionicons name="person-add" size={16} color={P} />
            <Text style={s.addLinkTxt}>إضافة مستأجر جديد</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Unit Picker */}
      <Modal visible={showUnitPicker} transparent animationType="slide" onRequestClose={() => setShowUnitPicker(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowUnitPicker(false)} />
        <View style={s.pickerSheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>اختر الوحدة (الشاغرة)</Text>
          <FlatList
            data={vacantUnits}
            keyExtractor={u => u.id}
            style={{ maxHeight: 350 }}
            ListEmptyComponent={<Text style={s.emptyList}>لا توجد وحدات شاغرة</Text>}
            renderItem={({ item: u }) => (
              <TouchableOpacity style={[s.option, unitId === u.id && s.optionActive]} onPress={() => handleUnitSelect(u)}>
                <Text style={[s.optionTxt, unitId === u.id && { color: P }]}>{getUnitLabel(u)}</Text>
              </TouchableOpacity>
            )}
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
                  <View style={s.lockBadge}><Ionicons name="lock-closed" size={12} color="#FFF" /></View>
                )}
              </View>
              {c.isBase && <Text style={s.optionSub}>العملة الأساسية</Text>}
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
  limitBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF9EE', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
  limitBannerTxt: { flex: 1, fontSize: 12, color: '#92400E', textAlign: 'right' },
  limitBannerLink: { fontSize: 12, color: '#D97706', fontFamily: 'Inter_700Bold' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  sec: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 14 },
  fl: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', marginBottom: 6, textAlign: 'right' },
  picker: { backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  pickerVal: { fontSize: 14, color: T, textAlign: 'right', flex: 1, marginRight: 6 },
  pickerPlaceholder: { fontSize: 14, color: TM, textAlign: 'right', flex: 1, marginRight: 6 },
  input: { backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T, marginBottom: 14 },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  amtSym: { fontSize: 16, fontFamily: 'Inter_700Bold', color: TM },
  submit: { backgroundColor: P, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 14 },
  searchWrap: { flexDirection: 'row', backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center', marginBottom: 12 },
  searchInput: { flex: 1, padding: 10, fontSize: 14, color: T },
  emptyList: { textAlign: 'center', color: TM, padding: 20 },
  option: { padding: 14, borderRadius: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionActive: { backgroundColor: '#EEF2FF' },
  optionTxt: { fontSize: 15, color: T, textAlign: 'right', fontFamily: 'Inter_500Medium' },
  optionSub: { fontSize: 12, color: TM, textAlign: 'right', marginTop: 2 },
  addLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, marginTop: 4 },
  addLinkTxt: { color: P, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  lockBadge: { backgroundColor: '#6B7280', borderRadius: 6, padding: 4 },
});
