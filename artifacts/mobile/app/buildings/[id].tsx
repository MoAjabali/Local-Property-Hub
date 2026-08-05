import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { getUnitStatusColor, getUnitStatusLabel } from '@/utils/formatters';
import { UnitStatus } from '@/types';

const P = '#1B4B82'; const BG = '#F5F7FA'; const CARD = '#FFFFFF';
const T = '#1A1A2E'; const TM = '#6B7280'; const BORDER = '#E5E7EB';

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getBuildingById, getFloorsByBuilding, getUnitsByFloor, getActiveContractForUnit,
    addFloor, addUnit, deleteBuilding,
  } = useApp();
  const insets = useSafeAreaInsets();

  const [showFloorForm, setShowFloorForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [unitNum, setUnitNum] = useState('');
  const [saving, setSaving] = useState(false);

  const building = getBuildingById(id!);
  const floors = getFloorsByBuilding(id!);

  if (!building) {
    return (
      <View style={[s.center, { backgroundColor: BG }]}>
        <Text style={{ color: TM }}>المبنى غير موجود</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: P, marginTop: 12 }}>عودة</Text></TouchableOpacity>
      </View>
    );
  }

  const handleAddFloor = async () => {
    const nextNum = floors.length === 0 ? 0 : Math.max(...floors.map(f => f.floorNumber)) + 1;
    setSaving(true);
    await addFloor({ buildingId: id!, floorNumber: nextNum });
    setShowFloorForm(false); setSaving(false);
  };

  const handleAddUnit = async () => {
    if (!unitNum.trim() || !selectedFloorId) return;
    setSaving(true);
    await addUnit({ floorId: selectedFloorId, unitNumber: unitNum.trim(), status: 'vacant' });
    setUnitNum(''); setShowUnitForm(false); setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert('حذف المبنى', `هل تريد حذف "${building.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { await deleteBuilding(id!); router.back(); } },
    ]);
  };

  const floorLabel = (n: number) => n === 0 ? 'الطابق الأرضي' : `الطابق ${n}`;

  return (
    <View style={[s.container, { backgroundColor: BG }]}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={s.headerTitle}>{building.name}</Text>
          {building.address ? <Text style={s.headerSub}>{building.address}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}>
        {floors.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="layers-outline" size={56} color={BORDER} />
            <Text style={s.emptyT}>لا توجد طوابق بعد</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowFloorForm(true)}>
              <Text style={s.emptyBtnT}>+ إضافة طابق</Text>
            </TouchableOpacity>
          </View>
        ) : (
          floors.map(floor => {
            const floorUnits = getUnitsByFloor(floor.id);
            return (
              <View key={floor.id} style={s.floorCard}>
                <View style={s.floorHeader}>
                  <TouchableOpacity
                    style={s.addUnitBtn}
                    onPress={() => { setSelectedFloorId(floor.id); setShowUnitForm(true); }}
                  >
                    <Ionicons name="add" size={16} color={P} />
                    <Text style={s.addUnitTxt}>وحدة</Text>
                  </TouchableOpacity>
                  <Text style={s.floorTitle}>{floorLabel(floor.floorNumber)}</Text>
                </View>
                {floorUnits.length === 0 ? (
                  <Text style={s.noUnits}>لا توجد وحدات في هذا الطابق</Text>
                ) : (
                  <View style={s.unitGrid}>
                    {floorUnits.map(unit => {
                      const contract = getActiveContractForUnit(unit.id);
                      const statusColor = getUnitStatusColor(unit.status);
                      return (
                        <TouchableOpacity
                          key={unit.id}
                          style={[s.unitTile, { borderColor: statusColor, backgroundColor: statusColor + '15' }]}
                          onPress={() => router.push(`/units/${unit.id}`)}
                        >
                          <View style={[s.unitDot, { backgroundColor: statusColor }]} />
                          <Text style={[s.unitNum, { color: statusColor }]}>{unit.unitNumber}</Text>
                          <Text style={s.unitStatus}>{getUnitStatusLabel(unit.status)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}

        <TouchableOpacity style={s.addFloorBtn} onPress={() => setShowFloorForm(true)}>
          <Ionicons name="add-circle-outline" size={20} color={P} />
          <Text style={s.addFloorTxt}>إضافة طابق جديد</Text>
        </TouchableOpacity>

        {/* Legend */}
        <View style={s.legend}>
          {(['vacant', 'rented', 'under_maintenance', 'after_exit'] as UnitStatus[]).map(status => (
            <View key={status} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: getUnitStatusColor(status) }]} />
              <Text style={s.legendTxt}>{getUnitStatusLabel(status)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Floor Modal */}
      <Modal visible={showFloorForm} transparent animationType="slide" onRequestClose={() => setShowFloorForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowFloorForm(false)} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة طابق جديد</Text>
          <Text style={s.sheetSub}>
            سيُضاف الطابق رقم {floors.length === 0 ? '0 (أرضي)' : floors.length} تلقائياً
          </Text>
          <TouchableOpacity style={s.submit} onPress={handleAddFloor} disabled={saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الإضافة...' : 'إضافة الطابق'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFloorForm(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* Add Unit Modal */}
      <Modal visible={showUnitForm} transparent animationType="slide" onRequestClose={() => setShowUnitForm(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowUnitForm(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.sheetTitle}>إضافة وحدة جديدة</Text>
          <Text style={s.fl}>رقم الوحدة / اسمها *</Text>
          <TextInput style={s.input} value={unitNum} onChangeText={setUnitNum} placeholder="مثال: 101 أو شقة A" textAlign="right" autoFocus />
          <TouchableOpacity style={[s.submit, !unitNum.trim() && { opacity: 0.5 }]} onPress={handleAddUnit} disabled={!unitNum.trim() || saving}>
            <Text style={s.submitTxt}>{saving ? 'جاري الإضافة...' : 'إضافة الوحدة'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowUnitForm(false)} style={s.cancel}><Text style={s.cancelTxt}>إلغاء</Text></TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: P },
  backBtn: { padding: 4, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#FFF', textAlign: 'right' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyT: { fontSize: 16, color: TM, fontFamily: 'Inter_500Medium' },
  emptyBtn: { backgroundColor: P, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  emptyBtnT: { color: '#FFF', fontFamily: 'Inter_600SemiBold' },
  floorCard: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },
  floorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  floorTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: T },
  addUnitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  addUnitTxt: { fontSize: 13, color: P, fontFamily: 'Inter_500Medium' },
  noUnits: { fontSize: 13, color: TM, textAlign: 'center', paddingVertical: 8 },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unitTile: { borderRadius: 10, borderWidth: 1.5, padding: 10, width: '30%', alignItems: 'center', minWidth: 80 },
  unitDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  unitNum: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  unitStatus: { fontSize: 10, color: TM, marginTop: 2, textAlign: 'center' },
  addFloorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: P, borderStyle: 'dashed', marginTop: 4 },
  addFloorTxt: { color: P, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 16, padding: 12, backgroundColor: CARD, borderRadius: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 12, color: TM },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: T, textAlign: 'right', marginBottom: 8 },
  sheetSub: { fontSize: 13, color: TM, textAlign: 'right', marginBottom: 20 },
  fl: { fontSize: 13, color: T, fontFamily: 'Inter_500Medium', marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: T, marginBottom: 14 },
  submit: { backgroundColor: P, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  submitTxt: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  cancel: { padding: 14, alignItems: 'center' },
  cancelTxt: { color: TM, fontSize: 15 },
});
