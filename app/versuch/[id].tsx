import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, FlatList, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from '../../lib/secureStore';
import {
  getVersuchById, getSchritteForVersuch, updateVersuch, updateSchritt,
  insertSchritt, deleteSchritt, upsertParameterValues, reorderSchritte,
  getMesswerteForVersuch, insertMesswert, deleteMesswert,
  getBilderForVersuch, insertBild, deleteBild,
  getPDFsForVersuch, insertPDF, deletePDF,
  exportVersuchAsJSON,
  type Versuch, type Prozessschritt, type Messwert, type Bild, type PDF,
  type VersuchStatus, type SchrittStatus,
} from '../../lib/db';
import { Colors, getStatusColor, getSchrittStatusColor, getSchrittStatusIcon } from '../../constants/colors';
import { MATERIALS } from '../../constants/materials';
import { PROCESSES, SCHRITT_VORSCHLAEGE, getProcessByName } from '../../constants/processes';
import ProzesskettTimeline from '../../components/ProzesskettTimeline';
import SchrittKarte from '../../components/SchrittKarte';
import MesswertModal from '../../components/MesswertModal';
import StatusBadge from '../../components/StatusBadge';
import MessmethodenTab from '../../components/MessmethodenTab';
import { getMeasurementsByVersuch } from '../../lib/db';
import { type Messmessung, type MessMethode, type KennWert, METHODE_LABELS } from '../../constants/messmethoden';
import { useSettingsContext } from '../../contexts/SettingsContext';

type TabId = 'uebersicht' | 'prozesskette' | 'messungen' | 'bilder' | 'messdaten' | 'pdfs' | 'onedrive' | 'ki';

const TABS: { id: TabId; label: string }[] = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'prozesskette', label: 'Prozesse' },
  { id: 'messungen', label: 'Messungen' },
  { id: 'bilder', label: 'Bilder' },
  { id: 'messdaten', label: 'Messdaten' },
  { id: 'pdfs', label: 'PDFs' },
  { id: 'onedrive', label: 'OneDrive' },
  { id: 'ki', label: 'KI' },
];

export default function VersuchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { settings } = useSettingsContext();
  const isAdmin = settings.user_role === 'admin';

  const [versuch, setVersuch] = useState<Versuch | null>(null);
  const [schritte, setSchritte] = useState<Prozessschritt[]>([]);
  const [messwerte, setMesswerte] = useState<Messwert[]>([]);
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [pdfs, setPDFs] = useState<PDF[]>([]);
  const [messmessungen, setMessmessungen] = useState<Messmessung[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('uebersicht');
  const [activeSchrittId, setActiveSchrittId] = useState<number | undefined>();

  // Modals
  const [messwertModal, setMesswertModal] = useState(false);
  const [messwertSchrittId, setMesswertSchrittId] = useState<number | null>(null);
  const [addSchrittModal, setAddSchrittModal] = useState(false);
  const [sName, setSName] = useState('');
  const [sProcess, setSProcess] = useState('');
  const [sMachine, setSMachine] = useState('');
  const [sNotiz, setSNotiz] = useState('');
  const [sParams, setSParams] = useState<Record<string, string>>({});
  const [sNameSuggestions, setSNameSuggestions] = useState<string[]>([]);

  // KI
  const [kiLoading, setKiLoading] = useState(false);
  const [kiResult, setKiResult] = useState('');
  const [kiError, setKiError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const [v, s, m, b, p, mm] = await Promise.all([
      getVersuchById(id),
      getSchritteForVersuch(id),
      getMesswerteForVersuch(id),
      getBilderForVersuch(id),
      getPDFsForVersuch(id),
      getMeasurementsByVersuch(id),
    ]);
    setVersuch(v);
    setSchritte(s);
    setMesswerte(m);
    setBilder(b);
    setPDFs(p);
    setMessmessungen(mm);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!versuch) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSchrittStatus = async (id: number, status: SchrittStatus) => {
    await updateSchritt({ id, status });
    load();
  };

  const handleSchrittNotiz = async (id: number, notizen: string) => {
    await updateSchritt({ id, notizen });
  };

  const handleDeleteSchritt = async (id: number) => {
    if (!isAdmin) { Alert.alert('Keine Berechtigung', 'Nur Admins können Schritte löschen.'); return; }
    await deleteSchritt(id);
    load();
  };

  const handleAddMesswert = (schrittId: number | null) => {
    setMesswertSchrittId(schrittId);
    setMesswertModal(true);
  };

  const handleSaveMesswert = async (name: string, wert: string, einheit: string) => {
    await insertMesswert({
      versuch_id: versuch.id,
      schritt_id: messwertSchrittId,
      name, wert, einheit,
    });
    load();
  };

  const handleDeleteMesswert = async (id: number) => {
    if (!isAdmin) { Alert.alert('Keine Berechtigung', 'Nur Admins können Messwerte löschen.'); return; }
    await deleteMesswert(id);
    load();
  };

  const handleAddBild = async (schrittId: number | null) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() ?? 'bild.jpg';
      const srcFile = new File(asset.uri);
      const destFile = new File(Paths.document, filename);
      await srcFile.copy(destFile);
      await insertBild({
        versuch_id: versuch.id,
        schritt_id: schrittId,
        filename,
        local_path: destFile.uri,
      });
      load();
    }
  };

  const handleCamera = async (schrittId: number | null) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Kein Kamera-Zugriff'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = `IMG_${Date.now()}.jpg`;
      const srcFile = new File(asset.uri);
      const destFile = new File(Paths.document, filename);
      await srcFile.copy(destFile);
      await insertBild({ versuch_id: versuch.id, schritt_id: schrittId, filename, local_path: destFile.uri });
      load();
    }
  };

  const handleDeleteBild = async (id: number) => {
    if (!isAdmin) { Alert.alert('Keine Berechtigung', 'Nur Admins können Bilder löschen.'); return; }
    await deleteBild(id);
    load();
  };

  const handleAddPDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const srcFile = new File(asset.uri);
    const destFile = new File(Paths.document, asset.name);
    await srcFile.copy(destFile);
    await insertPDF({
      versuch_id: versuch.id,
      filename: asset.name,
      local_path: destFile.uri,
      size_kb: asset.size ? asset.size / 1024 : undefined,
    });
    load();
  };

  const handleDeletePDF = async (id: number) => {
    if (!isAdmin) { Alert.alert('Keine Berechtigung', 'Nur Admins können PDFs löschen.'); return; }
    await deletePDF(id);
    load();
  };

  const handleExportJSON = async () => {
    const json = await exportVersuchAsJSON(versuch.id);
    const file = new File(Paths.cache, `${versuch.id}.json`);
    await file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  };

  const handleSaveSchritt = async () => {
    if (!sName.trim()) return;
    const proc = getProcessByName(sProcess);
    const schrittId = await insertSchritt({
      versuch_id: versuch.id,
      position: schritte.length + 1,
      schritt_name: sName.trim(),
      process_name: sProcess || undefined,
      process_abbr: proc?.abbr || undefined,
      machine: sMachine || undefined,
      status: 'Ausstehend',
      notizen: sNotiz || undefined,
    });
    const paramArr = Object.entries(sParams)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => ({ param_name: k, param_value: v }));
    if (paramArr.length) await upsertParameterValues(schrittId, paramArr);
    setSName(''); setSProcess(''); setSMachine(''); setSNotiz(''); setSParams({});
    setAddSchrittModal(false);
    load();
  };

  // ─── KI Analyse ────────────────────────────────────────────────────────────

  const handleKIAnalyse = async () => {
    setKiLoading(true); setKiError(''); setKiResult('');
    try {
      const apiKey = await SecureStore.getItemAsync('anthropic_api_key');
      if (!apiKey) { setKiError('Kein Anthropic API-Key. Bitte in Einstellungen konfigurieren.'); return; }

      const prompt = buildKIPrompt(versuch, schritte, messwerte, messmessungen);
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await resp.json();
      if (data.error) { setKiError(data.error.message); return; }
      setKiResult(data.content?.[0]?.text ?? 'Keine Antwort');
    } catch (e: any) {
      setKiError(e.message);
    } finally {
      setKiLoading(false);
    }
  };

  // ─── Render Tabs ────────────────────────────────────────────────────────────

  const selectedProcess = getProcessByName(sProcess);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: versuch.id,
          headerStyle: { backgroundColor: Colors.background },
          headerTitleStyle: { fontFamily: 'monospace', fontWeight: '700', color: Colors.primary },
          headerTintColor: Colors.primary,
          headerRight: () => (
            <TouchableOpacity onPress={handleExportJSON} style={{ paddingRight: 16 }}>
              <Text style={{ fontFamily: 'monospace', fontSize: 12, color: Colors.primary }}>↑ JSON</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Timeline */}
      <ProzesskettTimeline
        schritte={schritte}
        activeSchrittId={activeSchrittId}
        onSchrittPress={s => { setActiveSchrittId(s.id); setActiveTab('prozesskette'); }}
      />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
        {activeTab === 'uebersicht' && (
          <UebersichtTab versuch={versuch} onSave={async updates => { await updateVersuch({ ...versuch, ...updates }); load(); }} />
        )}
        {activeTab === 'prozesskette' && (
          <ProzesskettTab
            schritte={schritte}
            activeSchrittId={activeSchrittId}
            onStatusChange={handleSchrittStatus}
            onNotizChange={handleSchrittNotiz}
            onDelete={handleDeleteSchritt}
            onAddMesswert={id => handleAddMesswert(id)}
            onDeleteMesswert={handleDeleteMesswert}
            onAddBild={id => handleAddBild(id)}
            onDeleteBild={handleDeleteBild}
            onAddSchritt={() => setAddSchrittModal(true)}
          />
        )}
        {activeTab === 'messungen' && (
          <MessmethodenTab versuchId={versuch.id} schritte={schritte} isAdmin={isAdmin} />
        )}
        {activeTab === 'bilder' && (
          <BilderTab
            bilder={bilder}
            schritte={schritte}
            onAddCamera={() => handleCamera(null)}
            onAddGallery={() => handleAddBild(null)}
            onDelete={handleDeleteBild}
          />
        )}
        {activeTab === 'messdaten' && (
          <MessdatenTab
            messwerte={messwerte}
            schritte={schritte}
            onAdd={() => handleAddMesswert(null)}
            onDelete={handleDeleteMesswert}
          />
        )}
        {activeTab === 'pdfs' && (
          <PDFsTab pdfs={pdfs} onAdd={handleAddPDF} onDelete={handleDeletePDF} />
        )}
        {activeTab === 'onedrive' && (
          <OnedriveTab versuch={versuch} bilder={bilder} pdfs={pdfs} />
        )}
        {activeTab === 'ki' && (
          <KITab
            loading={kiLoading}
            result={kiResult}
            error={kiError}
            onAnalyse={handleKIAnalyse}
          />
        )}
      </ScrollView>

      {/* Messwert Modal */}
      <MesswertModal
        visible={messwertModal}
        onClose={() => setMesswertModal(false)}
        onSave={handleSaveMesswert}
      />

      {/* Schritt hinzufügen Modal */}
      <Modal visible={addSchrittModal} transparent animationType="slide" onRequestClose={() => setAddSchrittModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '85%' }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>SCHRITT HINZUFÜGEN</Text>

              <Text style={styles.mlabel}>Schritt-Name *</Text>
              <TextInput
                style={styles.minput}
                value={sName}
                onChangeText={v => {
                  setSName(v);
                  setSNameSuggestions(v ? SCHRITT_VORSCHLAEGE.filter(s => s.toLowerCase().startsWith(v.toLowerCase())) : []);
                }}
                placeholder="z.B. Strahlen..."
                placeholderTextColor={Colors.textSecondary}
              />
              {sNameSuggestions.length > 0 && (
                <View style={styles.suggestions}>
                  {sNameSuggestions.map(s => (
                    <TouchableOpacity key={s} style={styles.suggestion} onPress={() => { setSName(s); setSNameSuggestions([]); }}>
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.mlabel}>Prozess</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={[styles.chip, !sProcess && styles.chipActive]} onPress={() => { setSProcess(''); setSParams({}); }}>
                    <Text style={[styles.chipText, !sProcess && styles.chipTextActive]}>–</Text>
                  </TouchableOpacity>
                  {PROCESSES.map(p => (
                    <TouchableOpacity
                      key={p.abbr}
                      style={[styles.chip, sProcess === p.name && styles.chipActive]}
                      onPress={() => {
                        setSProcess(p.name);
                        const newP: Record<string, string> = {};
                        p.params.forEach(k => { newP[k] = ''; });
                        setSParams(newP);
                        setSMachine('');
                      }}
                    >
                      <Text style={[styles.chipText, sProcess === p.name && styles.chipTextActive]}>{p.abbr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {selectedProcess && selectedProcess.machines.length > 0 && (
                <>
                  <Text style={styles.mlabel}>Maschine</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {selectedProcess.machines.map(m => (
                        <TouchableOpacity key={m} style={[styles.chip, sMachine === m && styles.chipActive]} onPress={() => setSMachine(m)}>
                          <Text style={[styles.chipText, sMachine === m && styles.chipTextActive]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {selectedProcess && selectedProcess.params.map(p => (
                <View key={p}>
                  <Text style={styles.mlabel}>{p}</Text>
                  <TextInput
                    style={styles.minput}
                    value={sParams[p] ?? ''}
                    onChangeText={v => setSParams(prev => ({ ...prev, [p]: v }))}
                    placeholder="Wert..."
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              ))}

              <Text style={styles.mlabel}>Notiz</Text>
              <TextInput
                style={[styles.minput, { minHeight: 56, textAlignVertical: 'top' }]}
                value={sNotiz}
                onChangeText={setSNotiz}
                placeholder="Optional..."
                placeholderTextColor={Colors.textSecondary}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.chip, { flex: 1, justifyContent: 'center' }]} onPress={() => setAddSchrittModal(false)}>
                  <Text style={[styles.chipText, { textAlign: 'center' }]}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1 }, !sName.trim() && { opacity: 0.4 }]}
                  onPress={handleSaveSchritt}
                  disabled={!sName.trim()}
                >
                  <Text style={styles.saveBtnText}>Hinzufügen</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-Tab Components ──────────────────────────────────────────────────────

function UebersichtTab({ versuch, onSave }: {
  versuch: Versuch;
  onSave: (updates: Partial<Versuch>) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [bezeichnung, setBezeichnung] = useState(versuch.bezeichnung ?? '');
  const [material, setMaterial] = useState(versuch.material ?? '');
  const [dimX, setDimX] = useState(versuch.dim_x?.toString() ?? '');
  const [dimY, setDimY] = useState(versuch.dim_y?.toString() ?? '');
  const [dimZ, setDimZ] = useState(versuch.dim_z?.toString() ?? '');
  const [status, setStatus] = useState<VersuchStatus>(versuch.status);
  const [notizen, setNotizen] = useState(versuch.notizen ?? '');
  const [showMatPicker, setShowMatPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const save = () => {
    onSave({
      bezeichnung, material,
      dim_x: dimX ? parseFloat(dimX) : undefined,
      dim_y: dimY ? parseFloat(dimY) : undefined,
      dim_z: dimZ ? parseFloat(dimZ) : undefined,
      status, notizen,
    });
    setEdit(false);
  };

  return (
    <View>
      <View style={[uStyles.card]}>
        <View style={uStyles.cardHeader}>
          <Text style={uStyles.title}>STAMMDATEN</Text>
          <TouchableOpacity onPress={() => edit ? save() : setEdit(true)}>
            <Text style={uStyles.editBtn}>{edit ? 'Speichern' : '✎ Bearbeiten'}</Text>
          </TouchableOpacity>
        </View>

        <Field label="Versuchs-ID" value={versuch.id} mono />
        {edit ? (
          <>
            <Text style={uStyles.label}>Bezeichnung</Text>
            <TextInput style={uStyles.input} value={bezeichnung} onChangeText={setBezeichnung} />

            <Text style={uStyles.label}>Material</Text>
            <TouchableOpacity style={[uStyles.input, { flexDirection: 'row', justifyContent: 'space-between' }]} onPress={() => setShowMatPicker(true)}>
              <Text style={{ fontFamily: 'monospace', fontSize: 13, color: Colors.text }}>{material || '–'}</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 10 }}>▼</Text>
            </TouchableOpacity>

            <Text style={uStyles.label}>Abmessungen (mm)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[['X', dimX, setDimX], ['Y', dimY, setDimY], ['Z', dimZ, setDimZ]].map(([l, v, s]: any) => (
                <TextInput key={l} style={[uStyles.input, { flex: 1, textAlign: 'center' }]}
                  value={v} onChangeText={s} placeholder={l} keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textSecondary} />
              ))}
            </View>

            <Text style={uStyles.label}>Status</Text>
            <TouchableOpacity style={[uStyles.input, { flexDirection: 'row', justifyContent: 'space-between' }]} onPress={() => setShowStatusPicker(true)}>
              <Text style={{ fontFamily: 'monospace', fontSize: 13, color: getStatusColor(status) }}>{status}</Text>
              <Text style={{ fontFamily: 'monospace', fontSize: 10 }}>▼</Text>
            </TouchableOpacity>

            <Text style={uStyles.label}>Notizen</Text>
            <TextInput style={[uStyles.input, { minHeight: 72, textAlignVertical: 'top' }]}
              value={notizen} onChangeText={setNotizen} multiline />
          </>
        ) : (
          <>
            <Field label="Bezeichnung" value={versuch.bezeichnung} />
            <Field label="Material" value={versuch.material} />
            {versuch.dim_x && <Field label="Abmessungen" value={`${versuch.dim_x} × ${versuch.dim_y} × ${versuch.dim_z} mm`} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <Text style={uStyles.fieldLabel}>Status</Text>
              <StatusBadge status={versuch.status} />
            </View>
            {versuch.notizen && <Field label="Notizen" value={versuch.notizen} />}
          </>
        )}

        <Field label="Erstellt" value={new Date(versuch.created_at).toLocaleString('de-CH')} />
        <Field label="Aktualisiert" value={new Date(versuch.updated_at).toLocaleString('de-CH')} />
      </View>

      <Modal visible={showMatPicker} transparent animationType="slide" onRequestClose={() => setShowMatPicker(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <Text style={mStyles.title}>MATERIAL</Text>
            <FlatList data={MATERIALS} keyExtractor={m => m} renderItem={({ item }) => (
              <TouchableOpacity style={mStyles.option} onPress={() => { setMaterial(item); setShowMatPicker(false); }}>
                <Text style={mStyles.optionText}>{item}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>

      <Modal visible={showStatusPicker} transparent animationType="slide" onRequestClose={() => setShowStatusPicker(false)}>
        <View style={mStyles.overlay}>
          <View style={mStyles.sheet}>
            <Text style={mStyles.title}>STATUS</Text>
            {(['Entwurf', 'Aktiv', 'Abgeschlossen', 'Archiviert'] as VersuchStatus[]).map(s => (
              <TouchableOpacity key={s} style={mStyles.option} onPress={() => { setStatus(s); setShowStatusPicker(false); }}>
                <Text style={[mStyles.optionText, { color: getStatusColor(s) }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <View style={uStyles.field}>
      <Text style={uStyles.fieldLabel}>{label}</Text>
      <Text style={[uStyles.fieldValue, mono && { fontFamily: 'monospace', fontWeight: '700', color: Colors.primary }]}>
        {value}
      </Text>
    </View>
  );
}

function ProzesskettTab({
  schritte, activeSchrittId,
  onStatusChange, onNotizChange, onDelete,
  onAddMesswert, onDeleteMesswert,
  onAddBild, onDeleteBild, onAddSchritt,
}: {
  schritte: Prozessschritt[];
  activeSchrittId?: number;
  onStatusChange: (id: number, s: SchrittStatus) => void;
  onNotizChange: (id: number, n: string) => void;
  onDelete: (id: number) => void;
  onAddMesswert: (id: number) => void;
  onDeleteMesswert: (id: number) => void;
  onAddBild: (id: number) => void;
  onDeleteBild: (id: number) => void;
  onAddSchritt: () => void;
}) {
  return (
    <View>
      {schritte.map((s, idx) => (
        <SchrittKarte
          key={s.id}
          schritt={s}
          index={idx}
          process={getProcessByName(s.process_name ?? '')}
          onStatusChange={onStatusChange}
          onNotizChange={onNotizChange}
          onDelete={onDelete}
          onAddMesswert={onAddMesswert}
          onDeleteMesswert={onDeleteMesswert}
          onAddBild={onAddBild}
          onDeleteBild={onDeleteBild}
          defaultExpanded={s.id === activeSchrittId}
        />
      ))}
      <TouchableOpacity style={pStyles.addBtn} onPress={onAddSchritt}>
        <Text style={pStyles.addBtnText}>+ Schritt hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}

function BilderTab({ bilder, schritte, onAddCamera, onAddGallery, onDelete }: {
  bilder: Bild[];
  schritte: Prozessschritt[];
  onAddCamera: () => void;
  onAddGallery: () => void;
  onDelete: (id: number) => void;
}) {
  const global = bilder.filter(b => !b.schritt_id);
  const bySchritt = schritte.map(s => ({
    schritt: s,
    bilder: bilder.filter(b => b.schritt_id === s.id),
  })).filter(g => g.bilder.length > 0);

  return (
    <View>
      <View style={bStyles.btnRow}>
        <TouchableOpacity style={bStyles.btn} onPress={onAddCamera}>
          <Text style={bStyles.btnText}>📷 Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={bStyles.btn} onPress={onAddGallery}>
          <Text style={bStyles.btnText}>🖼 Galerie</Text>
        </TouchableOpacity>
      </View>

      {global.length > 0 && (
        <BildGruppe title="ALLGEMEIN" bilder={global} onDelete={onDelete} />
      )}
      {bySchritt.map(g => (
        <BildGruppe key={g.schritt.id} title={`SCHRITT ${g.schritt.position}: ${g.schritt.schritt_name.toUpperCase()}`} bilder={g.bilder} onDelete={onDelete} />
      ))}
      {bilder.length === 0 && (
        <Text style={bStyles.empty}>Keine Bilder vorhanden</Text>
      )}
    </View>
  );
}

function BildGruppe({ title, bilder, onDelete }: { title: string; bilder: Bild[]; onDelete: (id: number) => void }) {
  return (
    <View style={bStyles.gruppe}>
      <Text style={bStyles.gruppeTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {bilder.map(b => (
          <View key={b.id} style={bStyles.bildWrapper}>
            <Image source={{ uri: b.local_path }} style={bStyles.bild} resizeMode="cover" />
            <Text style={bStyles.bildName} numberOfLines={1}>{b.filename}</Text>
            <TouchableOpacity style={bStyles.bildDelete} onPress={() =>
              Alert.alert('Bild löschen?', b.filename, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => onDelete(b.id!) },
              ])
            }>
              <Text style={{ fontFamily: 'monospace', fontSize: 10, color: Colors.danger }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function MessdatenTab({ messwerte, schritte, onAdd, onDelete }: {
  messwerte: Messwert[];
  schritte: Prozessschritt[];
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  const global = messwerte.filter(m => !m.schritt_id);
  const bySchritt = schritte.map(s => ({
    schritt: s,
    messwerte: messwerte.filter(m => m.schritt_id === s.id),
  })).filter(g => g.messwerte.length > 0);

  return (
    <View>
      <TouchableOpacity style={mTab.addBtn} onPress={onAdd}>
        <Text style={mTab.addBtnText}>+ Messwert erfassen (Gesamtversuch)</Text>
      </TouchableOpacity>

      {global.length > 0 && (
        <View style={mTab.gruppe}>
          <Text style={mTab.gruppeTitle}>GESAMTVERSUCH</Text>
          {global.map(m => (
            <MesswertRow key={m.id} m={m} onDelete={onDelete} />
          ))}
        </View>
      )}

      {bySchritt.map(g => (
        <View key={g.schritt.id} style={mTab.gruppe}>
          <Text style={mTab.gruppeTitle}>
            SCHRITT {g.schritt.position}: {g.schritt.schritt_name.toUpperCase()}
          </Text>
          {g.messwerte.map(m => (
            <MesswertRow key={m.id} m={m} onDelete={onDelete} />
          ))}
        </View>
      ))}

      {messwerte.length === 0 && (
        <Text style={mTab.empty}>Keine Messwerte vorhanden</Text>
      )}
    </View>
  );
}

function MesswertRow({ m, onDelete }: { m: Messwert; onDelete: (id: number) => void }) {
  return (
    <View style={mTab.row}>
      <Text style={mTab.name}>{m.name}</Text>
      <Text style={mTab.value}>{m.wert}</Text>
      <Text style={mTab.unit}>{m.einheit}</Text>
      <TouchableOpacity onPress={() => onDelete(m.id!)}>
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: Colors.danger, paddingHorizontal: 4 }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function PDFsTab({ pdfs, onAdd, onDelete }: {
  pdfs: PDF[];
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  return (
    <View>
      <TouchableOpacity style={pTab.addBtn} onPress={onAdd}>
        <Text style={pTab.addBtnText}>+ PDF hinzufügen</Text>
      </TouchableOpacity>
      {pdfs.length === 0 && <Text style={pTab.empty}>Keine PDFs vorhanden</Text>}
      {pdfs.map(p => (
        <View key={p.id} style={pTab.row}>
          <View style={{ flex: 1 }}>
            <Text style={pTab.name}>{p.filename}</Text>
            <Text style={pTab.meta}>
              {p.typ ? p.typ + ' · ' : ''}{p.size_kb ? `${p.size_kb.toFixed(1)} KB` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('PDF löschen?', p.filename, [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Löschen', style: 'destructive', onPress: () => onDelete(p.id!) },
          ])}>
            <Text style={{ fontFamily: 'monospace', fontSize: 14, color: Colors.danger }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function OnedriveTab({ versuch, bilder, pdfs }: { versuch: Versuch; bilder: Bild[]; pdfs: PDF[] }) {
  return (
    <View style={odStyles.container}>
      <Text style={odStyles.title}>ONEDRIVE SYNC</Text>
      <Text style={odStyles.info}>
        Ordner: /LabDoc/Versuche/{versuch.id}/
      </Text>
      <Text style={odStyles.hint}>
        OneDrive-Integration: Bitte in den Einstellungen mit Microsoft-Konto verbinden.
      </Text>
      <View style={odStyles.summary}>
        <Text style={odStyles.summaryItem}>📁 Stammdaten (JSON)</Text>
        {bilder.map(b => <Text key={b.id} style={odStyles.summaryItem}>🖼 {b.filename}</Text>)}
        {pdfs.map(p => <Text key={p.id} style={odStyles.summaryItem}>📄 {p.filename}</Text>)}
      </View>
    </View>
  );
}

function KITab({ loading, result, error, onAnalyse }: {
  loading: boolean;
  result: string;
  error: string;
  onAnalyse: () => void;
}) {
  return (
    <View style={kiStyles.container}>
      <Text style={kiStyles.title}>KI-ANALYSE</Text>
      <Text style={kiStyles.subtitle}>
        Analyse der Prozesskette mit Claude (claude-sonnet-4-20250514)
      </Text>
      <TouchableOpacity
        style={[kiStyles.btn, loading && kiStyles.btnDisabled]}
        onPress={onAnalyse}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={kiStyles.btnText}>Analyse starten</Text>
        }
      </TouchableOpacity>
      {error ? (
        <View style={kiStyles.errorBox}>
          <Text style={kiStyles.errorText}>{error}</Text>
        </View>
      ) : null}
      {result ? (
        <View style={kiStyles.resultBox}>
          <Text style={kiStyles.resultText}>{result}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── KI Prompt Builder ──────────────────────────────────────────────────────

function buildKIPrompt(versuch: Versuch, schritte: Prozessschritt[], messwerte: Messwert[], messmessungen: Messmessung[]): string {
  const chain = schritte.map((s, i) =>
    `${i + 1}. ${s.schritt_name}${s.process_abbr ? ` (${s.process_abbr})` : ''}${s.machine ? `, Maschine: ${s.machine}` : ''}, Status: ${s.status}
${s.parameter_values.length ? '   Parameter: ' + s.parameter_values.map(p => `${p.param_name}=${p.param_value}`).join(', ') : ''}
${messwerte.filter(m => m.schritt_id === s.id).map(m => `   Messwert: ${m.name}=${m.wert} ${m.einheit}`).join('\n')}`
  ).join('\n');

  const globalMess = messwerte.filter(m => !m.schritt_id)
    .map(m => `- ${m.name}: ${m.wert} ${m.einheit}`).join('\n');

  const schrittName = (id?: number | null) => {
    if (!id) return 'Gesamtversuch';
    const s = schritte.find(s => s.id === id);
    return s ? `${s.position}. ${s.schritt_name}` : `Schritt ${id}`;
  };

  const messText = messmessungen.map(m => {
    const basis = `${m.bezeichnung || METHODE_LABELS[m.methode as MessMethode]} [${schrittName(m.schritt_id)}]`;
    if (m.methode === 'Alicona' && m.alicona) {
      const a = m.alicona;
      const werte = [
        a.ra  != null ? `Ra=${a.ra} µm`  : null,
        a.rz  != null ? `Rz=${a.rz} µm`  : null,
        a.rmax != null ? `Rmax=${a.rmax} µm` : null,
        a.sa  != null ? `Sa=${a.sa} µm`  : null,
        a.sz  != null ? `Sz=${a.sz} µm`  : null,
        ...a.weitere_werte.map((w: KennWert) => `${w.name}=${w.wert} ${w.einheit}`),
      ].filter(Boolean).join(', ');
      return `${basis} Objektiv:${a.objektiv} ${werte}`;
    }
    if (m.methode === 'Mountainsmap' && m.mountainsmap) {
      const werte = m.mountainsmap.weitere_werte.map((w: KennWert) => `${w.name}=${w.wert} ${w.einheit}`).join(', ');
      return `${basis} Template:${m.mountainsmap.template_name} ${werte}`;
    }
    if (m.sonstige) {
      const werte = m.sonstige.weitere_werte.map((w: KennWert) => `${w.name}=${w.wert} ${w.einheit}`).join(', ');
      return `${basis} Methode:${m.sonstige.methoden_name} ${werte}`;
    }
    return basis;
  }).join('\n');

  return `Du bist ein Experte für Oberflächentechnik und Präzisionsfertigung. Analysiere folgenden Laborversuch und gib eine detaillierte Bewertung auf Deutsch.

## Versuch: ${versuch.id}
Bezeichnung: ${versuch.bezeichnung ?? '–'}
Material: ${versuch.material ?? '–'}
Abmessungen: ${versuch.dim_x ?? '–'} × ${versuch.dim_y ?? '–'} × ${versuch.dim_z ?? '–'} mm
Status: ${versuch.status}
${versuch.notizen ? `Notizen: ${versuch.notizen}` : ''}

## Prozesskette (${schritte.length} Schritte)
${chain}

## Gesamtmesswerte
${globalMess || '– keine –'}

## Messmethoden & Oberflächenkennwerte (${messmessungen.length} Messungen)
${messText || '– keine –'}

Bitte analysiere:
1. Bewertung der Prozesskette und ihrer Logik
2. Wechselwirkungen zwischen den einzelnen Schritten
3. Oberflächenqualität: Ra/Rz/Sa im Vergleich zu typischen Zielwerten für ${versuch.material ?? 'das Material'}
4. Vor/Nach-Vergleich der Oberflächenkennwerte über die Prozesskette
5. Auffälligkeiten in den Parametern oder Messwerten
6. Konkrete Optimierungsvorschläge
7. Empfohlene nächste Schritte

Antworte strukturiert und präzise.`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: { flexGrow: 0, backgroundColor: Colors.card, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tabBarContent: { paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  content: { flex: 1 },
  contentPad: { padding: 12, paddingBottom: 40 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  modalTitle: { fontFamily: 'monospace', fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1, marginBottom: 16 },
  mlabel: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 4 },
  minput: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background, marginBottom: 4 },
  suggestions: { backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, marginBottom: 8 },
  suggestion: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  suggestionText: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'monospace', fontSize: 13, color: '#fff', fontWeight: '700' },
});

const uStyles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1 },
  editBtn: { fontFamily: 'monospace', fontSize: 12, color: Colors.primary },
  field: { paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between' },
  fieldLabel: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary },
  fieldValue: { fontFamily: 'monospace', fontSize: 12, color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 16 },
  label: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background, marginBottom: 4 },
});

const pStyles = StyleSheet.create({
  addBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderStyle: 'dashed', marginBottom: 8 },
  addBtnText: { fontFamily: 'monospace', fontSize: 13, color: Colors.primary },
});

const bStyles = StyleSheet.create({
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnText: { fontFamily: 'monospace', fontSize: 12, color: Colors.text },
  gruppe: { marginBottom: 16 },
  gruppeTitle: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
  bildWrapper: { marginRight: 8, alignItems: 'center', position: 'relative' },
  bild: { width: 100, height: 100, borderRadius: 8, backgroundColor: Colors.border },
  bildName: { fontFamily: 'monospace', fontSize: 8, color: Colors.textSecondary, maxWidth: 100, marginTop: 4 },
  bildDelete: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 3 },
  empty: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 32 },
});

const mTab = StyleSheet.create({
  addBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderStyle: 'dashed', marginBottom: 12 },
  addBtnText: { fontFamily: 'monospace', fontSize: 13, color: Colors.primary },
  gruppe: { backgroundColor: Colors.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: Colors.border },
  gruppeTitle: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  name: { fontFamily: 'monospace', fontSize: 12, color: Colors.text, flex: 1 },
  value: { fontFamily: 'monospace', fontSize: 14, color: Colors.primary, fontWeight: '700', marginRight: 4 },
  unit: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, minWidth: 30 },
  empty: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 32 },
});

const pTab = StyleSheet.create({
  addBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderStyle: 'dashed', marginBottom: 12 },
  addBtnText: { fontFamily: 'monospace', fontSize: 13, color: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 8, padding: 12, marginBottom: 6, borderWidth: 0.5, borderColor: Colors.border },
  name: { fontFamily: 'monospace', fontSize: 12, color: Colors.text },
  meta: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  empty: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 32 },
});

const odStyles = StyleSheet.create({
  container: { backgroundColor: Colors.card, borderRadius: 10, padding: 16, borderWidth: 0.5, borderColor: Colors.border },
  title: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', color: Colors.accent, letterSpacing: 1, marginBottom: 8 },
  info: { fontFamily: 'monospace', fontSize: 12, color: Colors.text, marginBottom: 4 },
  hint: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, marginBottom: 12 },
  summary: { gap: 4 },
  summaryItem: { fontFamily: 'monospace', fontSize: 12, color: Colors.text },
});

const kiStyles = StyleSheet.create({
  container: {},
  title: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', color: Colors.accent, letterSpacing: 1, marginBottom: 4 },
  subtitle: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, marginBottom: 16 },
  btn: { backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'monospace', fontSize: 14, color: '#fff', fontWeight: '700' },
  errorBox: { backgroundColor: '#fde8e4', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 0.5, borderColor: Colors.danger },
  errorText: { fontFamily: 'monospace', fontSize: 12, color: Colors.danger },
  resultBox: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: Colors.border },
  resultText: { fontFamily: 'monospace', fontSize: 12, color: Colors.text, lineHeight: 18 },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36, maxHeight: '60%' },
  title: { fontFamily: 'monospace', fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 1, marginBottom: 16 },
  option: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  optionText: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
});
