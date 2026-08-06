import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useSubscription } from '@/context/SubscriptionContext';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';
const S = '#10B981'; const BLUE = '#3B82F6';

export default function PropertiesScreen() {
  const { buildings, addBuilding, getBuildingStats } = useApp();
  const { canAddBuilding, isPremium } = useSubscription();
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddPress = () => {
    if (!canAddBuilding(buildings.length)) {
      Alert.alert(
        '🔒 الحد المجاني',
        'يمكنك إضافة مبنى واحد فقط في النسخة المجانية.\nقم بالترقية للحصول على مبانٍ غير محدودة.',
        [
          { text: 'ترقية الآن', onPress: () => router.push('/subscription') },
          { text: 'إلغاء', style: 'cancel' },
        ]
      );
      return;
    }
    setShowForm(true);
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addBuilding({ name: name.trim(), address: address.trim() });
    setName(''); setAddress(''); setShowForm(false); setSaving(false);
  };

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>عقاراتي</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!isPremium && (
            <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/subscription')}>
              <Ionicons name="star" size={14} color="#C9A84C" />
              <Text style={s.upgradeTxt}>ترقية</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleAddPress} style={s.addBtn}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Free tier banner */}
      {!isPremium && (
        <TouchableOpacity style={s.freeBanner} onPress={() => router.push('/subscription')}>
          <Ionicons name="lock-closed" size={14} color="#D97706" />
          <Text style={s.freeBannerTxt}>
            النسخة المجانية: {buildings.length}/1 مبنى • 3 وحدات كحد أقصى
          </Text>
          <Text style={s.freeBannerLink}>ترقية ←</Text>
        </TouchableOpacity>
      )}

      {buildings.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="business-outline" size={64} color={BORDER} />
          <Text style={s.emptyT}>لا توجد مبانٍ بعد</Text>
          <Text style={s.emptySub}>اضغط + لإضافة مبنى جديد</Text>
        </View>
      ) : (
        <FlatList
          data={buildings}
          keyExtractor={b => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item: b }) => {
            const stats = getBuildingStats(b.id);
            return (
              <TouchableOpacity style={s.card} onPress={() => router.push(`/buildings/${b.id}`)}>
                <View style={s.cardIcon}><Ionicons name="business" size={26} color={P} /></View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{b.name}</Text>
                  {b.address ? <Text style={s.cardAddr}>{b.address}</Text> : null}
                  <View style={s.badges}>
                    <Badge text={`${stats.total} وحدة`} bg="#EEF2FF" color={P} />
                    <Badge text={`${stats.vacant} شاغرة`} bg="#DCFCE7" color={S} />
                    <Badge text={`${stats.rented} مؤجرة`} bg="#DBEAFE" color={BLUE} />
                  </View>
                </View>
                <Ionicons name="chevron-back" size={18} color={TM} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowForm(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة مبنى جديد</Text>
          <Field label="اسم المبنى *" value={name} onChange={setName} placeholder="مثال: عمارة النور" />
          <Field label="العنوان" value={address} onChange={setAddress} placeholder="العنوان التفصيلي" />
          <TouchableOpacity style={[s.submit, !name.trim() && { opacity: 0.5 }]} onPress={handleAdd} disabled={!name.trim() || saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الحفظ...' : 'إضافة المبنى'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(false)} style={s.cancel}>
            <Text style={s.cancelTxt}>إلغاء</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return <View style={[bdg.wrap, { backgroundColor: bg }]}><Text style={[bdg.txt, { color }]}>{text}</Text></View>;
}
const bdg = StyleSheet.create({
  wrap: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  txt: { fontSize: 11, fontFamily: 'Inter_500Medium' },
});

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fl.label}>{label}</Text>
      <TextInput style={fl.input} value={value} onChangeText={onChange} placeholder={placeholder} textAlign="right" />
    </View>
  );
}
const fl = StyleSheet.create({
  label: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: P },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF' },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF9EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  upgradeTxt: { fontSize: 12, color: '#D97706', fontFamily: 'Inter_600SemiBold' },
  freeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF9EE', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: 16, paddingVertical: 10 },
  freeBannerTxt: { flex: 1, fontSize: 12, color: '#92400E', textAlign: 'right' },
  freeBannerLink: { fontSize: 12, color: '#D97706', fontFamily: 'Inter_700Bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyT: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: TM },
  emptySub: { fontSize: 14, color: TM },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  cardName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: T, textAlign: 'right' },
  cardAddr: { fontSize: 13, color: TM, marginTop: 2, textAlign: 'right' },
  badges: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 20 },
  submit: { backgroundColor: P, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  cancel: { padding: 14, alignItems: 'center' },
  cancelTxt: { color: TM, fontSize: 15 },
});
