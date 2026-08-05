import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/formatters';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const D = '#EF4444';

export default function TenantsScreen() {
  const { tenants, addTenant, getTenantActiveContract, getContractBalance, getBaseCurrency } = useApp();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idDoc, setIdDoc] = useState('');
  const [saving, setSaving] = useState(false);
  const sym = getBaseCurrency().symbol;

  const filtered = useMemo(() =>
    tenants.filter(t => t.fullName.includes(search) || (t.phone || '').includes(search))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tenants, search]);

  const handleAdd = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    await addTenant({ fullName: fullName.trim(), phone: phone.trim(), idDocument: idDoc.trim() });
    setFullName(''); setPhone(''); setIdDoc(''); setShowForm(false); setSaving(false);
  };

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>المستأجرون</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={TM} style={{ marginLeft: 10 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="بحث عن مستأجر..."
          textAlign="right"
          placeholderTextColor={TM}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={56} color={BORDER} />
            <Text style={s.emptyT}>{search ? 'لا توجد نتائج' : 'لا يوجد مستأجرون بعد'}</Text>
            {!search && (
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowForm(true)}>
                <Text style={s.emptyBtnT}>+ إضافة مستأجر</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item: tenant }) => {
          const contract = getTenantActiveContract(tenant.id);
          const balance = contract ? getContractBalance(contract.id) : null;
          const hasBalance = balance && balance.balance > 0;
          return (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/tenants/${tenant.id}`)}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{tenant.fullName.charAt(0)}</Text>
              </View>
              <View style={s.info}>
                <Text style={s.name}>{tenant.fullName}</Text>
                {tenant.phone ? <Text style={s.phone}>{tenant.phone}</Text> : null}
                <View style={s.row}>
                  {contract ? (
                    <View style={[s.badge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[s.badgeTxt, { color: S }]}>مستأجر نشط</Text>
                    </View>
                  ) : (
                    <View style={[s.badge, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={[s.badgeTxt, { color: TM }]}>بدون عقد</Text>
                    </View>
                  )}
                  {hasBalance && (
                    <View style={[s.badge, { backgroundColor: '#FEE2E2', marginRight: 6 }]}>
                      <Text style={[s.badgeTxt, { color: D }]}>{formatCurrency(balance.balance, sym)} متأخر</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-back" size={18} color={TM} />
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowForm(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة مستأجر جديد</Text>
          <Text style={s.fl}>الاسم الكامل *</Text>
          <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="اسم المستأجر" textAlign="right" />
          <Text style={s.fl}>رقم الهاتف</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+967..." keyboardType="phone-pad" textAlign="right" />
          <Text style={s.fl}>رقم الهوية</Text>
          <TextInput style={s.input} value={idDoc} onChangeText={setIdDoc} placeholder="رقم وثيقة الهوية" textAlign="right" />
          <TouchableOpacity style={[s.submit, !fullName.trim() && { opacity: 0.5 }]} onPress={handleAdd} disabled={!fullName.trim() || saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'إضافة المستأجر'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
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
  searchWrap: { flexDirection: 'row', backgroundColor: CARD, marginHorizontal: 16, marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  searchInput: { flex: 1, padding: 12, fontSize: 14, color: T },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  avatarTxt: { fontSize: 18, fontFamily: 'Inter_700Bold', color: P },
  info: { flex: 1, alignItems: 'flex-end' },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: T, textAlign: 'right' },
  phone: { fontSize: 13, color: TM, marginTop: 2, textAlign: 'right' },
  row: { flexDirection: 'row', marginTop: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontFamily: 'Inter_500Medium' },
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
