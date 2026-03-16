import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Colors } from '../constants/colors';
import { type MountainsmapMessung, type MessDatei, type KennWert } from '../constants/messmethoden';

interface Props {
  initial?: Partial<MountainsmapMessung>;
  dateien?: MessDatei[];
  onChange: (data: MountainsmapMessung) => void;
  onAddDatei: (datei: Omit<MessDatei, 'id'>) => void;
  onDeleteDatei: (id: number) => void;
}

export default function MountainsmapFormular({ initial, dateien = [], onChange, onAddDatei, onDeleteDatei }: Props) {
  const [templateName, setTemplateName] = useState(initial?.template_name ?? '');
  const [weitereWerte, setWeitereWerte] = useState<KennWert[]>(initial?.weitere_werte ?? []);

  const emit = (tn?: string, ww?: KennWert[]) => {
    onChange({
      template_name: tn ?? templateName,
      weitere_werte: ww ?? weitereWerte,
    });
  };

  const handlePDF = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const src = new File(asset.uri);
    const dest = new File(Paths.document, 'messungen', asset.name);
    await src.copy(dest);
    onAddDatei({ datei_typ: 'pdf', filename: asset.name, local_path: dest.uri, size_kb: asset.size ? asset.size / 1024 : undefined });
  };

  const addWert = () => {
    const updated = [...weitereWerte, { name: '', wert: '', einheit: '' }];
    setWeitereWerte(updated);
    emit(undefined, updated);
  };

  const updateWert = (idx: number, field: keyof KennWert, val: string) => {
    const updated = weitereWerte.map((w, i) => i === idx ? { ...w, [field]: val } : w);
    setWeitereWerte(updated);
    emit(undefined, updated);
  };

  const removeWert = (idx: number) => {
    const updated = weitereWerte.filter((_, i) => i !== idx);
    setWeitereWerte(updated);
    emit(undefined, updated);
  };

  return (
    <View>
      <Text style={s.label}>Template-Name *</Text>
      <TextInput
        style={s.input}
        value={templateName}
        onChangeText={v => { setTemplateName(v); emit(v); }}
        placeholder="z.B. ISO_4287_Rauheit_v3"
        placeholderTextColor={Colors.textSecondary}
      />

      <TouchableOpacity style={s.uploadBtn} onPress={handlePDF}>
        <Text style={s.uploadText}>↑ PDF-Auswertung hochladen</Text>
      </TouchableOpacity>

      {dateien.map(d => (
        <View key={d.id} style={s.dateiRow}>
          <Text style={{ fontSize: 18 }}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.dateiName} numberOfLines={1}>{d.filename}</Text>
            {d.size_kb && <Text style={s.dateiSize}>{d.size_kb.toFixed(1)} KB</Text>}
          </View>
          <TouchableOpacity onPress={() => onDeleteDatei(d.id)}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={s.sectionLabel}>MESSERGEBNISSE</Text>
      {weitereWerte.map((w, idx) => (
        <View key={idx} style={s.wertRow}>
          <TextInput style={[s.input, { flex: 2 }]} value={w.name}
            onChangeText={v => updateWert(idx, 'name', v)}
            placeholder="Name" placeholderTextColor={Colors.textSecondary} />
          <TextInput style={[s.input, { flex: 1 }]} value={w.wert}
            onChangeText={v => updateWert(idx, 'wert', v)}
            placeholder="Wert" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
          <TextInput style={[s.input, { flex: 1 }]} value={w.einheit}
            onChangeText={v => updateWert(idx, 'einheit', v)}
            placeholder="Einh." placeholderTextColor={Colors.textSecondary} />
          <TouchableOpacity onPress={() => removeWert(idx)}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={addWert}>
        <Text style={s.addText}>+ Kennwert hinzufügen</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 10 },
  sectionLabel: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginTop: 14, marginBottom: 6, borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: 10 },
  input: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 9, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background, marginBottom: 4 },
  uploadBtn: { borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, paddingVertical: 10, alignItems: 'center', marginVertical: 8 },
  uploadText: { fontFamily: 'monospace', fontSize: 12, color: Colors.accent },
  dateiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dateiName: { fontFamily: 'monospace', fontSize: 11, color: Colors.text },
  dateiSize: { fontFamily: 'monospace', fontSize: 9, color: Colors.textSecondary },
  wertRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  addBtn: { paddingVertical: 8, alignItems: 'center' },
  addText: { fontFamily: 'monospace', fontSize: 12, color: Colors.primary },
  removeBtn: { fontFamily: 'monospace', fontSize: 14, color: Colors.danger, paddingHorizontal: 4 },
});
