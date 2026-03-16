import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { Colors } from '../constants/colors';
import {
  type Messmessung, type MessDatei, type MessMethode,
  type AliconaMessung, type MountainsmapMessung, type SonstigeMessung,
  METHODE_COLORS, METHODE_LABELS,
} from '../constants/messmethoden';
import {
  getMeasurementsByVersuch, createMeasurement, updateMeasurement,
  deleteMeasurement, addMessungDatei, deleteMessungDatei,
  type Prozessschritt,
} from '../lib/db';
import MessmethodenPicker from './MessmethodenPicker';
import MessungKarte from './MessungKarte';
import AliconaFormular from './AliconaFormular';
import MountainsmapFormular from './MountainsmapFormular';
import SonstigeMessungFormular from './SonstigeMessungFormular';

interface Props {
  versuchId: string;
  schritte: Prozessschritt[];
  isAdmin?: boolean;
}

type FilterMethode = MessMethode | 'Alle';

export default function MessmethodenTab({ versuchId, schritte, isAdmin = false }: Props) {
  const [messungen, setMessungen] = useState<Messmessung[]>([]);
  const [filterMethode, setFilterMethode] = useState<FilterMethode>('Alle');
  const [filterSchritt, setFilterSchritt] = useState<number | null | 'alle'>('alle');

  // Modals
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  // Form state
  const [selectedMethode, setSelectedMethode] = useState<MessMethode>('Alicona');
  const [editId, setEditId] = useState<number | null>(null);
  const [bezeichnung, setBezeichnung] = useState('');
  const [notizen, setNotizen] = useState('');
  const [schrittId, setSchrittId] = useState<number | null>(null);
  const [aliconaData, setAliconaData] = useState<AliconaMessung>({ objektiv: '20x', messprogramm: '', weitere_werte: [] });
  const [mountainsmapData, setMountainsmapData] = useState<MountainsmapMessung>({ template_name: '', weitere_werte: [] });
  const [sonstigeData, setSonstigeData] = useState<SonstigeMessung>({ methoden_name: '', weitere_werte: [] });
  const [pendingDateien, setPendingDateien] = useState<Omit<MessDatei, 'id'>[]>([]);
  const [savedDateien, setSavedDateien] = useState<MessDatei[]>([]);

  // Detail view
  const [detailMessung, setDetailMessung] = useState<Messmessung | null>(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getMeasurementsByVersuch(versuchId);
    setMessungen(data);
  }, [versuchId]);

  // Load on mount
  React.useEffect(() => { load(); }, [load]);

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filtered = messungen.filter(m => {
    const matchMethode = filterMethode === 'Alle' || m.methode === filterMethode;
    const matchSchritt = filterSchritt === 'alle' ||
      (filterSchritt === null ? !m.schritt_id : m.schritt_id === filterSchritt);
    return matchMethode && matchSchritt;
  });

  // Gruppiert nach Schritt
  const grouped: { label: string; items: Messmessung[] }[] = [];
  const globalItems = filtered.filter(m => !m.schritt_id);
  if (globalItems.length) grouped.push({ label: 'GESAMTVERSUCH', items: globalItems });
  schritte.forEach(s => {
    const items = filtered.filter(m => m.schritt_id === s.id);
    if (items.length) grouped.push({ label: `SCHRITT ${s.position} – ${s.schritt_name.toUpperCase()}`, items });
  });

  // ─── Open form ─────────────────────────────────────────────────────────────

  const openNew = (methode: MessMethode) => {
    setSelectedMethode(methode);
    setEditId(null);
    setBezeichnung(''); setNotizen(''); setSchrittId(null);
    setAliconaData({ objektiv: '20x', messprogramm: '', weitere_werte: [] });
    setMountainsmapData({ template_name: '', weitere_werte: [] });
    setSonstigeData({ methoden_name: '', weitere_werte: [] });
    setPendingDateien([]);
    setSavedDateien([]);
    setFormVisible(true);
  };

  const openEdit = (m: Messmessung) => {
    setSelectedMethode(m.methode);
    setEditId(m.id);
    setBezeichnung(m.bezeichnung ?? '');
    setNotizen(m.notizen ?? '');
    setSchrittId(m.schritt_id ?? null);
    if (m.alicona) setAliconaData(m.alicona);
    if (m.mountainsmap) setMountainsmapData(m.mountainsmap);
    if (m.sonstige) setSonstigeData(m.sonstige);
    setPendingDateien([]);
    setSavedDateien(m.dateien);
    setFormVisible(true);
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const base = {
        versuch_id: versuchId,
        schritt_id: schrittId,
        methode: selectedMethode,
        bezeichnung: bezeichnung || undefined,
        notizen: notizen || undefined,
        alicona: selectedMethode === 'Alicona' ? aliconaData : undefined,
        mountainsmap: selectedMethode === 'Mountainsmap' ? mountainsmapData : undefined,
        sonstige: selectedMethode === 'Sonstige' ? sonstigeData : undefined,
        dateien: [],
      };

      let messungId: number;
      if (editId) {
        await updateMeasurement(editId, base);
        messungId = editId;
      } else {
        messungId = await createMeasurement(base);
      }

      for (const d of pendingDateien) {
        await addMessungDatei(messungId, d);
      }

      setFormVisible(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: Messmessung) => {
    if (!isAdmin) { Alert.alert('Keine Berechtigung', 'Nur Admins können Messungen löschen.'); return; }
    Alert.alert('Messung löschen?', m.bezeichnung || METHODE_LABELS[m.methode], [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteMeasurement(m.id); load(); } },
    ]);
  };

  const handleDeleteDatei = async (id: number) => {
    if (!isAdmin) { Alert.alert('Keine Berechtigung', 'Nur Admins können Dateien löschen.'); return; }
    await deleteMessungDatei(id);
    setSavedDateien(prev => prev.filter(d => d.id !== id));
    if (detailMessung) {
      setDetailMessung(prev => prev ? { ...prev, dateien: prev.dateien.filter(d => d.id !== id) } : null);
    }
    load();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Filter */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {(['Alle', 'Alicona', 'Mountainsmap', 'Sonstige'] as FilterMethode[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filterMethode === f && styles.chipActive]}
              onPress={() => setFilterMethode(f)}
            >
              <Text style={[styles.chipText, filterMethode === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.addBtn} onPress={() => setPickerVisible(true)}>
          <Text style={styles.addBtnText}>+ Hinzufügen</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <ScrollView contentContainerStyle={styles.list}>
        {grouped.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Keine Messungen vorhanden</Text>
            <Text style={styles.emptyHint}>Tippe auf „+ Hinzufügen"</Text>
          </View>
        )}
        {grouped.map(g => (
          <View key={g.label} style={styles.gruppe}>
            <Text style={styles.gruppeLabel}>{g.label}</Text>
            {g.items.map(m => (
              <MessungKarte
                key={m.id}
                messung={m}
                onPress={() => { setDetailMessung(m); setDetailVisible(true); }}
                onLongPress={() => handleDelete(m)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Methoden-Picker */}
      <MessmethodenPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={m => { setPickerVisible(false); openNew(m); }}
      />

      {/* Formular Modal */}
      <Modal visible={formVisible} animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <Text style={styles.formCancel}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={[styles.formTitle, { color: METHODE_COLORS[selectedMethode] }]}>
              {METHODE_LABELS[selectedMethode].toUpperCase()}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.formSave, saving && { opacity: 0.4 }]}>
                {saving ? '...' : 'Speichern'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            {/* Bezeichnung */}
            <Text style={styles.flabel}>Bezeichnung</Text>
            <TextInput
              style={styles.finput}
              value={bezeichnung}
              onChangeText={setBezeichnung}
              placeholder="z.B. Rauheit nach Schritt 2"
              placeholderTextColor={Colors.textSecondary}
            />

            {/* Zuordnung */}
            <Text style={styles.flabel}>Zuordnung</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.chip, schrittId === null && styles.chipActive]}
                  onPress={() => setSchrittId(null)}
                >
                  <Text style={[styles.chipText, schrittId === null && styles.chipTextActive]}>Gesamtversuch</Text>
                </TouchableOpacity>
                {schritte.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, schrittId === s.id && styles.chipActive]}
                    onPress={() => setSchrittId(s.id)}
                  >
                    <Text style={[styles.chipText, schrittId === s.id && styles.chipTextActive]}>
                      {s.position}. {s.schritt_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Methoden-Formular */}
            {selectedMethode === 'Alicona' && (
              <AliconaFormular
                initial={aliconaData}
                dateien={savedDateien}
                onChange={setAliconaData}
                onAddDatei={d => setPendingDateien(prev => [...prev, d])}
                onDeleteDatei={handleDeleteDatei}
              />
            )}
            {selectedMethode === 'Mountainsmap' && (
              <MountainsmapFormular
                initial={mountainsmapData}
                dateien={savedDateien}
                onChange={setMountainsmapData}
                onAddDatei={d => setPendingDateien(prev => [...prev, d])}
                onDeleteDatei={handleDeleteDatei}
              />
            )}
            {selectedMethode === 'Sonstige' && (
              <SonstigeMessungFormular
                initial={sonstigeData}
                dateien={savedDateien}
                onChange={setSonstigeData}
                onAddDatei={d => setPendingDateien(prev => [...prev, d])}
                onDeleteDatei={handleDeleteDatei}
              />
            )}

            {/* Notizen */}
            <Text style={styles.flabel}>Notizen</Text>
            <TextInput
              style={[styles.finput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={notizen}
              onChangeText={setNotizen}
              placeholder="Optional..."
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        {detailMessung && (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={styles.formHeader}>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Text style={styles.formCancel}>← Zurück</Text>
              </TouchableOpacity>
              <Text style={[styles.formTitle, { color: METHODE_COLORS[detailMessung.methode] }]}>
                {detailMessung.bezeichnung || METHODE_LABELS[detailMessung.methode]}
              </Text>
              <TouchableOpacity onPress={() => { setDetailVisible(false); openEdit(detailMessung); }}>
                <Text style={styles.formSave}>✎ Edit</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <DetailView messung={detailMessung} schritte={schritte} onDeleteDatei={handleDeleteDatei} />
              {isAdmin && (
                <TouchableOpacity
                  style={styles.deleteMessungBtn}
                  onPress={() => { setDetailVisible(false); handleDelete(detailMessung); }}
                >
                  <Text style={styles.deleteMessungText}>Messung löschen</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ─── Detail View ─────────────────────────────────────────────────────────────

function DetailView({ messung, schritte, onDeleteDatei }: {
  messung: Messmessung;
  schritte: Prozessschritt[];
  onDeleteDatei: (id: number) => void;
}) {
  const schritt = schritte.find(s => s.id === messung.schritt_id);
  const { alicona, mountainsmap, sonstige, dateien } = messung;

  return (
    <View>
      <InfoRow label="Methode" value={METHODE_LABELS[messung.methode]} />
      <InfoRow label="Zuordnung" value={schritt ? `${schritt.position}. ${schritt.schritt_name}` : 'Gesamtversuch'} />
      {messung.notizen && <InfoRow label="Notizen" value={messung.notizen} />}
      <InfoRow label="Erfasst" value={new Date(messung.created_at).toLocaleString('de-CH')} />

      {alicona && (
        <View style={dStyles.section}>
          <Text style={dStyles.sTitle}>ALICONA</Text>
          <InfoRow label="Objektiv" value={alicona.objektiv} />
          {alicona.messprogramm ? <InfoRow label="Messprogramm" value={alicona.messprogramm} /> : null}
          {([['Ra', alicona.ra], ['Rz', alicona.rz], ['Rmax', alicona.rmax],
            ['RSm', alicona.rsm], ['Sa', alicona.sa], ['Sz', alicona.sz]] as [string, number | undefined][])
            .filter(([, v]) => v != null)
            .map(([k, v]) => <InfoRow key={k} label={`${k} [µm]`} value={String(v)} mono />)
          }
          {alicona.weitere_werte.map((w, i) => (
            <InfoRow key={i} label={`${w.name} [${w.einheit}]`} value={w.wert} mono />
          ))}
        </View>
      )}

      {mountainsmap && (
        <View style={dStyles.section}>
          <Text style={dStyles.sTitle}>MOUNTAINSMAP</Text>
          <InfoRow label="Template" value={mountainsmap.template_name} />
          {mountainsmap.weitere_werte.map((w, i) => (
            <InfoRow key={i} label={`${w.name} [${w.einheit}]`} value={w.wert} mono />
          ))}
        </View>
      )}

      {sonstige && (
        <View style={dStyles.section}>
          <Text style={dStyles.sTitle}>{sonstige.methoden_name?.toUpperCase() || 'SONSTIGE'}</Text>
          {sonstige.weitere_werte.map((w, i) => (
            <InfoRow key={i} label={`${w.name} [${w.einheit}]`} value={w.wert} mono />
          ))}
        </View>
      )}

      {dateien.length > 0 && (
        <View style={dStyles.section}>
          <Text style={dStyles.sTitle}>DATEIEN</Text>
          {dateien.map(d => (
            <TouchableOpacity
              key={d.id}
              style={dStyles.dateiRow}
              onPress={async () => {
                if (d.local_path) await Sharing.shareAsync(d.local_path);
              }}
              onLongPress={() => Alert.alert('Datei löschen?', d.filename, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => onDeleteDatei(d.id) },
              ])}
            >
              <Text style={{ fontSize: 18 }}>{d.datei_typ === 'al3d' ? '📐' : d.datei_typ === 'pdf' ? '📄' : '🖼'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={dStyles.dateiName}>{d.filename}</Text>
                {d.size_kb && <Text style={dStyles.dateiSize}>{d.size_kb.toFixed(1)} KB</Text>}
              </View>
              <Text style={dStyles.share}>↗ Teilen</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <View style={dStyles.row}>
      <Text style={dStyles.label}>{label}</Text>
      <Text style={[dStyles.value, mono && { fontFamily: 'monospace', fontWeight: '700', color: Colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontFamily: 'monospace', fontSize: 12, color: '#fff', fontWeight: '700' },
  list: { paddingBottom: 40 },
  gruppe: { marginBottom: 12 },
  gruppeLabel: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 6 },
  empty: { paddingTop: 48, alignItems: 'center', gap: 8 },
  emptyText: { fontFamily: 'monospace', fontSize: 14, color: Colors.textSecondary },
  emptyHint: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Colors.card,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  formCancel: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  formTitle: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  formSave: { fontFamily: 'monospace', fontSize: 13, color: Colors.primary, fontWeight: '700' },
  formScroll: { flex: 1 },
  formContent: { padding: 16, paddingBottom: 40 },
  flabel: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 10 },
  finput: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.card, marginBottom: 4 },
  deleteMessungBtn: { marginTop: 24, borderWidth: 1, borderColor: Colors.danger, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  deleteMessungText: { fontFamily: 'monospace', fontSize: 13, color: Colors.danger },
});

const dStyles = StyleSheet.create({
  section: { marginTop: 14, borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: 10 },
  sTitle: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  label: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  value: { fontFamily: 'monospace', fontSize: 12, color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 16 },
  dateiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dateiName: { fontFamily: 'monospace', fontSize: 12, color: Colors.text },
  dateiSize: { fontFamily: 'monospace', fontSize: 9, color: Colors.textSecondary },
  share: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
});
