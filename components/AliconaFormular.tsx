import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { Colors } from '../constants/colors';
import {
  type AliconaMessung, type MessDatei, type KennWert,
  ALICONA_OBJEKTIVE,
} from '../constants/messmethoden';

interface Props {
  initial?: Partial<AliconaMessung>;
  dateien?: MessDatei[];
  onChange: (data: AliconaMessung) => void;
  onAddDatei: (datei: Omit<MessDatei, 'id'>) => void;
  onDeleteDatei: (id: number) => void;
}

const FELDER: { key: keyof AliconaMessung; label: string }[] = [
  { key: 'ra',   label: 'Ra [µm]' },
  { key: 'rz',   label: 'Rz [µm]' },
  { key: 'rmax', label: 'Rmax [µm]' },
  { key: 'rsm',  label: 'RSm [µm]' },
  { key: 'sa',   label: 'Sa [µm]' },
  { key: 'sz',   label: 'Sz [µm]' },
];

export default function AliconaFormular({ initial, dateien = [], onChange, onAddDatei, onDeleteDatei }: Props) {
  const [objektiv, setObjektiv] = useState(initial?.objektiv ?? '20x');
  const [messprogramm, setMessprogramm] = useState(initial?.messprogramm ?? '');
  const [werte, setWerte] = useState<Record<string, string>>({
    ra:   initial?.ra?.toString()   ?? '',
    rz:   initial?.rz?.toString()   ?? '',
    rmax: initial?.rmax?.toString() ?? '',
    rsm:  initial?.rsm?.toString()  ?? '',
    sa:   initial?.sa?.toString()   ?? '',
    sz:   initial?.sz?.toString()   ?? '',
  });
  const [weitereWerte, setWeitereWerte] = useState<KennWert[]>(initial?.weitere_werte ?? []);

  interface EmitInput { obj?: string; prog?: string; ww?: KennWert[]; [key: string]: string | KennWert[] | undefined; }
  const emit = (patch: EmitInput) => {
    const obj = patch.obj ?? objektiv;
    const prog = patch.prog ?? messprogramm;
    const w = patch.ww ?? weitereWerte;
    const merged: Record<string, string> = { ...werte };
    for (const k in patch) { if (typeof patch[k] === 'string') merged[k] = patch[k] as string; }
    const p = (key: string) => merged[key] ? parseFloat(merged[key]) : undefined;
    onChange({
      objektiv: obj as any,
      messprogramm: prog,
      ra: p('ra'), rz: p('rz'), rmax: p('rmax'), rsm: p('rsm'), sa: p('sa'), sz: p('sz'),
      weitere_werte: w,
    });
  };

  const handleAl3d = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.name.toLowerCase().endsWith('.al3d')) {
      Alert.alert('Ungültiger Dateityp', 'Bitte eine .al3d-Datei wählen.'); return;
    }
    const src = new File(asset.uri);
    const dest = new File(Paths.document, 'messungen', asset.name);
    await src.copy(dest);
    onAddDatei({ datei_typ: 'al3d', filename: asset.name, local_path: dest.uri, size_kb: asset.size ? asset.size / 1024 : undefined });
  };

  const handleBMP = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const src = new File(asset.uri);
    const dest = new File(Paths.document, 'messungen', asset.name);
    await src.copy(dest);
    onAddDatei({ datei_typ: 'bmp', filename: asset.name, local_path: dest.uri, size_kb: asset.size ? asset.size / 1024 : undefined });
  };

  const addWeitererWert = () => {
    const updated = [...weitereWerte, { name: '', wert: '', einheit: '' }];
    setWeitereWerte(updated);
    emit({ ww: updated });
  };

  const updateWeitererWert = (idx: number, field: keyof KennWert, val: string) => {
    const updated = weitereWerte.map((w, i) => i === idx ? { ...w, [field]: val } : w);
    setWeitereWerte(updated);
    emit({ ww: updated });
  };

  const removeWeitererWert = (idx: number) => {
    const updated = weitereWerte.filter((_, i) => i !== idx);
    setWeitereWerte(updated);
    emit({ ww: updated });
  };

  return (
    <View>
      {/* Objektiv */}
      <Text style={s.label}>Objektiv *</Text>
      <View style={s.segRow}>
        {ALICONA_OBJEKTIVE.map(o => (
          <TouchableOpacity
            key={o}
            style={[s.seg, objektiv === o && s.segActive]}
            onPress={() => { setObjektiv(o); emit({ obj: o }); }}
          >
            <Text style={[s.segText, objektiv === o && s.segTextActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messprogramm */}
      <Text style={s.label}>Messprogramm</Text>
      <TextInput
        style={s.input}
        value={messprogramm}
        onChangeText={v => { setMessprogramm(v); emit({ prog: v }); }}
        placeholder="z.B. Ra_Rz_Standard"
        placeholderTextColor={Colors.textSecondary}
      />

      {/* Messergebnisse */}
      <Text style={s.sectionLabel}>MESSERGEBNISSE</Text>
      {FELDER.map(f => (
        <View key={f.key} style={s.feldRow}>
          <Text style={s.feldLabel}>{f.label}</Text>
          <TextInput
            style={s.feldInput}
            value={werte[f.key as string] ?? ''}
            onChangeText={v => {
              const updated = { ...werte, [f.key]: v };
              setWerte(updated);
              emit(updated);
            }}
            placeholder="–"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="decimal-pad"
          />
        </View>
      ))}

      {/* Weitere Kennwerte */}
      {weitereWerte.map((w, idx) => (
        <View key={idx} style={s.weitererRow}>
          <TextInput style={[s.input, { flex: 2 }]} value={w.name}
            onChangeText={v => updateWeitererWert(idx, 'name', v)}
            placeholder="Name" placeholderTextColor={Colors.textSecondary} />
          <TextInput style={[s.input, { flex: 1 }]} value={w.wert}
            onChangeText={v => updateWeitererWert(idx, 'wert', v)}
            placeholder="Wert" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
          <TextInput style={[s.input, { flex: 1 }]} value={w.einheit}
            onChangeText={v => updateWeitererWert(idx, 'einheit', v)}
            placeholder="Einh." placeholderTextColor={Colors.textSecondary} />
          <TouchableOpacity onPress={() => removeWeitererWert(idx)}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.addWertBtn} onPress={addWeitererWert}>
        <Text style={s.addWertText}>+ Weiteren Kennwert</Text>
      </TouchableOpacity>

      {/* Dateien */}
      <Text style={s.sectionLabel}>DATEIEN</Text>
      <View style={s.uploadRow}>
        <TouchableOpacity style={s.uploadBtn} onPress={handleAl3d}>
          <Text style={s.uploadText}>↑ .al3d hochladen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.uploadBtn} onPress={handleBMP}>
          <Text style={s.uploadText}>↑ BMP hochladen</Text>
        </TouchableOpacity>
      </View>
      {dateien.map(d => (
        <View key={d.id} style={s.dateiRow}>
          {d.datei_typ === 'bmp' && d.local_path
            ? <Image source={{ uri: d.local_path }} style={s.thumb} />
            : <Text style={s.dateiIcon}>{d.datei_typ === 'al3d' ? '📐' : '🖼'}</Text>
          }
          <View style={{ flex: 1 }}>
            <Text style={s.dateiName} numberOfLines={1}>{d.filename}</Text>
            {d.size_kb && <Text style={s.dateiSize}>{d.size_kb.toFixed(1)} KB</Text>}
          </View>
          <TouchableOpacity onPress={() => onDeleteDatei(d.id)}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 10, letterSpacing: 0.5 },
  sectionLabel: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginTop: 14, marginBottom: 6, borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: 10 },
  input: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 9, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background, marginBottom: 4 },
  segRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  seg: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  segActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  segTextActive: { color: '#fff', fontWeight: '700' },
  feldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  feldLabel: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, width: 80 },
  feldInput: { flex: 1, borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 8, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background },
  weitererRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  addWertBtn: { paddingVertical: 8, alignItems: 'center' },
  addWertText: { fontFamily: 'monospace', fontSize: 12, color: Colors.primary },
  uploadRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  uploadBtn: { flex: 1, borderWidth: 1, borderColor: Colors.primary, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  uploadText: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
  dateiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dateiIcon: { fontSize: 20 },
  thumb: { width: 40, height: 40, borderRadius: 4, backgroundColor: Colors.border },
  dateiName: { fontFamily: 'monospace', fontSize: 11, color: Colors.text },
  dateiSize: { fontFamily: 'monospace', fontSize: 9, color: Colors.textSecondary },
  removeBtn: { fontFamily: 'monospace', fontSize: 14, color: Colors.danger, paddingHorizontal: 4 },
});
