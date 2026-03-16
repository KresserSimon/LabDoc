import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  insertVersuch, insertSchritt,
  upsertParameterValues, insertBild, insertPDF,
  type VersuchStatus, type SchrittStatus,
} from '../../lib/db';
import { Colors, getSchrittStatusColor } from '../../constants/colors';
import { MATERIALS } from '../../constants/materials';
import { PROCESSES, SCHRITT_VORSCHLAEGE, getProcessByName } from '../../constants/processes';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { generateID } from '../../utils/generateID';

interface LocalSchritt {
  tempId: string;
  schritt_name: string;
  process_name: string;
  process_abbr: string;
  machine: string;
  status: SchrittStatus;
  notizen: string;
  params: Record<string, string>;
}

function makeTempId() { return `tmp_${Date.now()}_${Math.random()}`; }

export default function NewVersuch() {
  const router = useRouter();
  const { settings } = useSettingsContext();

  // Stammdaten
  const [versuchId] = useState(() => generateID(settings.versuch_id_prefix, settings.versuch_id_format));
  const [bezeichnung, setBezeichnung] = useState('');
  const [material, setMaterial] = useState(settings.default_material);
  const [dimX, setDimX] = useState('');
  const [dimY, setDimY] = useState('');
  const [dimZ, setDimZ] = useState('');
  const [status, setStatus] = useState<VersuchStatus>(settings.default_status);
  const [notizen, setNotizen] = useState('');

  // Prozesskette
  const [schritte, setSchritte] = useState<LocalSchritt[]>([]);

  // Modals
  const [showMatPicker, setShowMatPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [addSchrittModal, setAddSchrittModal] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Schritt-Form state
  const [sName, setSName] = useState('');
  const [sNameSuggestions, setSNameSuggestions] = useState<string[]>([]);
  const [sProcess, setSProcess] = useState('');
  const [sMachine, setSMachine] = useState('');
  const [sStatus, setSStatus] = useState<SchrittStatus>('Ausstehend');
  const [sNotiz, setSNotiz] = useState('');
  const [sParams, setSParams] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  const openAddSchritt = (index?: number) => {
    if (index !== undefined) {
      const s = schritte[index];
      setSName(s.schritt_name);
      setSProcess(s.process_name);
      setSMachine(s.machine);
      setSStatus(s.status);
      setSNotiz(s.notizen);
      setSParams(s.params);
      setEditIndex(index);
    } else {
      setSName(''); setSProcess(''); setSMachine('');
      setSStatus('Ausstehend'); setSNotiz(''); setSParams({});
      setEditIndex(null);
    }
    setAddSchrittModal(true);
  };

  const onSchrittNameChange = (text: string) => {
    setSName(text);
    if (text.length > 0) {
      setSNameSuggestions(SCHRITT_VORSCHLAEGE.filter(s =>
        s.toLowerCase().startsWith(text.toLowerCase()) && s !== text
      ));
    } else {
      setSNameSuggestions([]);
    }
  };

  const onProcessSelect = (processName: string) => {
    setSProcess(processName);
    const proc = getProcessByName(processName);
    if (proc) {
      const newParams: Record<string, string> = {};
      proc.params.forEach(p => { newParams[p] = sParams[p] ?? ''; });
      setSParams(newParams);
      setSMachine('');
    }
  };

  const saveSchritt = () => {
    if (!sName.trim()) return;
    const proc = getProcessByName(sProcess);
    const newS: LocalSchritt = {
      tempId: editIndex !== null ? schritte[editIndex].tempId : makeTempId(),
      schritt_name: sName.trim(),
      process_name: sProcess,
      process_abbr: proc?.abbr ?? '',
      machine: sMachine,
      status: sStatus,
      notizen: sNotiz,
      params: sParams,
    };
    if (editIndex !== null) {
      setSchritte(prev => prev.map((s, i) => i === editIndex ? newS : s));
    } else {
      setSchritte(prev => [...prev, newS]);
    }
    setAddSchrittModal(false);
  };

  const removeSchritt = (index: number) => {
    setSchritte(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await insertVersuch({
        id: versuchId,
        bezeichnung: bezeichnung || undefined,
        material: material || undefined,
        dim_x: dimX ? parseFloat(dimX) : undefined,
        dim_y: dimY ? parseFloat(dimY) : undefined,
        dim_z: dimZ ? parseFloat(dimZ) : undefined,
        status,
        notizen: notizen || undefined,
      });

      for (let i = 0; i < schritte.length; i++) {
        const s = schritte[i];
        const schrittId = await insertSchritt({
          versuch_id: versuchId,
          position: i + 1,
          schritt_name: s.schritt_name,
          process_name: s.process_name || undefined,
          process_abbr: s.process_abbr || undefined,
          machine: s.machine || undefined,
          status: s.status,
          notizen: s.notizen || undefined,
        });
        const paramArr = Object.entries(s.params)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => ({ param_name: k, param_value: v }));
        if (paramArr.length) await upsertParameterValues(schrittId, paramArr);
      }

      router.replace(`/versuch/${versuchId}`);
    } catch (e: any) {
      Alert.alert('Fehler', e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedProcess = getProcessByName(sProcess);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>NEUER VERSUCH</Text>
            <Text style={styles.headerId}>{versuchId}</Text>
          </View>

          {/* Stammdaten */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STAMMDATEN</Text>

            <Text style={styles.label}>Bezeichnung</Text>
            <TextInput
              style={styles.input}
              value={bezeichnung}
              onChangeText={setBezeichnung}
              placeholder="Kurze Beschreibung..."
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.label}>Material</Text>
            <TouchableOpacity
              style={[styles.input, styles.picker]}
              onPress={() => setShowMatPicker(true)}
            >
              <Text style={material ? styles.pickerValue : styles.pickerPlaceholder}>
                {material || 'Material auswählen...'}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Abmessungen (mm)</Text>
            <View style={styles.dimRow}>
              {([['X', dimX, setDimX], ['Y', dimY, setDimY], ['Z', dimZ, setDimZ]] as const).map(
                ([label, val, setter]) => (
                  <View key={label} style={{ flex: 1 }}>
                    <TextInput
                      style={[styles.input, { textAlign: 'center' }]}
                      value={val}
                      onChangeText={setter}
                      placeholder={label}
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )
              )}
            </View>

            <Text style={styles.label}>Status</Text>
            <TouchableOpacity
              style={[styles.input, styles.picker]}
              onPress={() => setShowStatusPicker(true)}
            >
              <Text style={styles.pickerValue}>{status}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Notizen</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notizen}
              onChangeText={setNotizen}
              placeholder="Allgemeine Notizen zum Versuch..."
              placeholderTextColor={Colors.textSecondary}
              multiline
            />
          </View>

          {/* Prozesskette */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROZESSKETTE</Text>

            {schritte.map((s, idx) => (
              <View key={s.tempId} style={[styles.schrittRow, { borderLeftColor: getSchrittStatusColor(s.status) }]}>
                <Text style={styles.schrittNum}>{idx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schrittName}>{s.schritt_name}</Text>
                  {s.process_abbr ? <Text style={styles.schrittAbbr}>{s.process_abbr}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => openAddSchritt(idx)} style={styles.editSchrittBtn}>
                  <Text style={styles.editSchrittText}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeSchritt(idx)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addSchrittBtn} onPress={() => openAddSchritt()}>
              <Text style={styles.addSchrittText}>+ Schritt hinzufügen</Text>
            </TouchableOpacity>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Speichert...' : 'Versuch speichern'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Material Picker Modal */}
      <Modal visible={showMatPicker} transparent animationType="slide" onRequestClose={() => setShowMatPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>MATERIAL</Text>
            <FlatList
              data={MATERIALS}
              keyExtractor={m => m}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, material === item && styles.modalOptionActive]}
                  onPress={() => { setMaterial(item); setShowMatPicker(false); }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Status Picker Modal */}
      <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>STATUS</Text>
            {(['Entwurf', 'Aktiv', 'Abgeschlossen', 'Archiviert'] as VersuchStatus[]).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.modalOption, status === s && styles.modalOptionActive]}
                onPress={() => { setStatus(s); setShowStatusPicker(false); }}
              >
                <Text style={styles.modalOptionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Schritt Modal */}
      <Modal visible={addSchrittModal} transparent animationType="slide" onRequestClose={() => setAddSchrittModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>
                  {editIndex !== null ? 'SCHRITT BEARBEITEN' : 'SCHRITT HINZUFÜGEN'}
                </Text>

                <Text style={styles.label}>Schritt-Name *</Text>
                <TextInput
                  style={styles.input}
                  value={sName}
                  onChangeText={onSchrittNameChange}
                  placeholder="z.B. Strahlen, Reinigen..."
                  placeholderTextColor={Colors.textSecondary}
                />
                {sNameSuggestions.length > 0 && (
                  <View style={styles.suggestions}>
                    {sNameSuggestions.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestion}
                        onPress={() => { setSName(s); setSNameSuggestions([]); }}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Prozess (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.processChip, !sProcess && styles.processChipActive]}
                      onPress={() => { setSProcess(''); setSParams({}); setSMachine(''); }}
                    >
                      <Text style={[styles.processChipText, !sProcess && styles.processChipTextActive]}>–</Text>
                    </TouchableOpacity>
                    {PROCESSES.map(p => (
                      <TouchableOpacity
                        key={p.abbr}
                        style={[styles.processChip, sProcess === p.name && styles.processChipActive]}
                        onPress={() => onProcessSelect(p.name)}
                      >
                        <Text style={[styles.processChipText, sProcess === p.name && styles.processChipTextActive]}>
                          {p.abbr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {selectedProcess && selectedProcess.machines.length > 0 && (
                  <>
                    <Text style={styles.label}>Maschine</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {selectedProcess.machines.map(m => (
                          <TouchableOpacity
                            key={m}
                            style={[styles.processChip, sMachine === m && styles.processChipActive]}
                            onPress={() => setSMachine(m)}
                          >
                            <Text style={[styles.processChipText, sMachine === m && styles.processChipTextActive]}>
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                {selectedProcess && selectedProcess.params.map(p => (
                  <View key={p}>
                    <Text style={styles.label}>{p}</Text>
                    <TextInput
                      style={styles.input}
                      value={sParams[p] ?? ''}
                      onChangeText={v => setSParams(prev => ({ ...prev, [p]: v }))}
                      placeholder="Wert..."
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                ))}

                <Text style={styles.label}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {(['Ausstehend', 'In Arbeit', 'Abgeschlossen', 'Übersprungen'] as SchrittStatus[]).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.processChip, sStatus === opt && styles.processChipActive]}
                      onPress={() => setSStatus(opt)}
                    >
                      <Text style={[styles.processChipText, sStatus === opt && styles.processChipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Notiz</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={sNotiz}
                  onChangeText={setSNotiz}
                  placeholder="Notiz..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddSchrittModal(false)}>
                    <Text style={styles.cancelBtnText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { flex: 1 }, !sName.trim() && styles.saveBtnDisabled]}
                    onPress={saveSchritt}
                    disabled={!sName.trim()}
                  >
                    <Text style={styles.saveBtnText}>Übernehmen</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  headerTitle: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1 },
  headerId: { fontFamily: 'monospace', fontSize: 22, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  section: {
    backgroundColor: Colors.card, borderRadius: 10, padding: 14,
    borderWidth: 0.5, borderColor: Colors.border, marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'monospace', fontSize: 9, fontWeight: '700',
    color: Colors.textSecondary, letterSpacing: 1, marginBottom: 12,
  },
  label: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 4, letterSpacing: 0.5 },
  input: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 10,
    fontFamily: 'monospace', fontSize: 13, color: Colors.text,
    backgroundColor: Colors.background, marginBottom: 4,
  },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  pickerPlaceholder: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  pickerArrow: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary },
  dimRow: { flexDirection: 'row', gap: 8 },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  schrittRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderLeftWidth: 3, borderRadius: 6, backgroundColor: Colors.background,
    marginBottom: 6,
  },
  schrittNum: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.primary, minWidth: 20 },
  schrittName: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  schrittAbbr: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary },
  editSchrittBtn: { padding: 6 },
  editSchrittText: { fontFamily: 'monospace', fontSize: 14, color: Colors.primary },
  removeBtn: { padding: 6 },
  removeBtnText: { fontFamily: 'monospace', fontSize: 14, color: Colors.danger },
  addSchrittBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 6,
    paddingVertical: 10, alignItems: 'center', borderStyle: 'dashed',
  },
  addSchrittText: { fontFamily: 'monospace', fontSize: 13, color: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: 'monospace', fontSize: 14, color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 36,
  },
  modalTitle: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: '700',
    color: Colors.primary, letterSpacing: 1, marginBottom: 16,
  },
  modalOption: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  modalOptionActive: { backgroundColor: '#e8f0fb' },
  modalOptionText: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  suggestions: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 6, marginTop: -4, marginBottom: 8,
  },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  suggestionText: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  processChip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  processChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  processChipText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  processChipTextActive: { color: '#fff', fontWeight: '700' },
});
