import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { Colors } from '../constants/colors';
import { type SonstigeMessung, type MessDatei, type KennWert } from '../constants/messmethoden';

interface Props {
  initial?: Partial<SonstigeMessung>;
  dateien?: MessDatei[];
  onChange: (data: SonstigeMessung) => void;
  onAddDatei: (datei: Omit<MessDatei, 'id'>) => void;
  onDeleteDatei: (id: number) => void;
}

export default function SonstigeMessungFormular({ initial, dateien = [], onChange, onAddDatei, onDeleteDatei }: Props) {
  const [methodenName, setMethodenName] = useState(initial?.methoden_name ?? '');
  const [weitereWerte, setWeitereWerte] = useState<KennWert[]>(initial?.weitere_werte ?? []);

  const emit = (mn?: string, ww?: KennWert[]) => {
    onChange({ methoden_name: mn ?? methodenName, weitere_werte: ww ?? weitereWerte });
  };

  const handleKamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Kein Kamera-Zugriff'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const filename = `IMG_${Date.now()}.jpg`;
      const dest = new File(Paths.document, 'messungen', filename);
      await new File(asset.uri).copy(dest);
      onAddDatei({ datei_typ: 'bild', filename, local_path: dest.uri });
    }
  };

  const handleGalerie = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() ?? `IMG_${Date.now()}.jpg`;
      const dest = new File(Paths.document, 'messungen', filename);
      await new File(asset.uri).copy(dest);
      onAddDatei({ datei_typ: 'bild', filename, local_path: dest.uri });
    }
  };

  const handleDatei = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const dest = new File(Paths.document, 'messungen', asset.name);
      await new File(asset.uri).copy(dest);
      onAddDatei({ datei_typ: 'sonstige', filename: asset.name, local_path: dest.uri, size_kb: asset.size ? asset.size / 1024 : undefined });
    }
  };

  const addWert = () => {
    const updated = [...weitereWerte, { name: '', wert: '', einheit: '' }];
    setWeitereWerte(updated); emit(undefined, updated);
  };
  const updateWert = (idx: number, field: keyof KennWert, val: string) => {
    const updated = weitereWerte.map((w, i) => i === idx ? { ...w, [field]: val } : w);
    setWeitereWerte(updated); emit(undefined, updated);
  };
  const removeWert = (idx: number) => {
    const updated = weitereWerte.filter((_, i) => i !== idx);
    setWeitereWerte(updated); emit(undefined, updated);
  };

  const bildDateien = dateien.filter(d => d.datei_typ === 'bild');
  const sonstigeDateien = dateien.filter(d => d.datei_typ !== 'bild');

  return (
    <View>
      <Text style={s.label}>Methoden-Name *</Text>
      <TextInput
        style={s.input}
        value={methodenName}
        onChangeText={v => { setMethodenName(v); emit(v); }}
        placeholder="z.B. Tastschnittgerät, Vickers-Härte"
        placeholderTextColor={Colors.textSecondary}
      />

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

      <Text style={s.sectionLabel}>BILDER & DATEIEN</Text>
      <View style={s.uploadRow}>
        <TouchableOpacity style={s.uploadBtn} onPress={handleKamera}>
          <Text style={s.uploadText}>📷 Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.uploadBtn} onPress={handleGalerie}>
          <Text style={s.uploadText}>🖼 Galerie</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.uploadBtn} onPress={handleDatei}>
          <Text style={s.uploadText}>📁 Datei</Text>
        </TouchableOpacity>
      </View>

      {bildDateien.length > 0 && (
        <View style={s.bildGrid}>
          {bildDateien.map(d => (
            <View key={d.id} style={s.bildWrapper}>
              <Image source={{ uri: d.local_path }} style={s.bild} resizeMode="cover" />
              <TouchableOpacity style={s.bildDelete} onPress={() => onDeleteDatei(d.id)}>
                <Text style={{ fontSize: 10, color: '#fff' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {sonstigeDateien.map(d => (
        <View key={d.id} style={s.dateiRow}>
          <Text style={{ fontSize: 18 }}>📎</Text>
          <Text style={s.dateiName} numberOfLines={1}>{d.filename}</Text>
          <TouchableOpacity onPress={() => onDeleteDatei(d.id)}>
            <Text style={s.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4, marginTop: 10 },
  sectionLabel: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginTop: 14, marginBottom: 6, borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: 10 },
  input: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 9, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background, marginBottom: 4 },
  wertRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  addBtn: { paddingVertical: 8, alignItems: 'center' },
  addText: { fontFamily: 'monospace', fontSize: 12, color: Colors.primary },
  uploadRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  uploadBtn: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  uploadText: { fontFamily: 'monospace', fontSize: 11, color: Colors.text },
  bildGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  bildWrapper: { position: 'relative' },
  bild: { width: 80, height: 80, borderRadius: 6, backgroundColor: Colors.border },
  bildDelete: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 2 },
  dateiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  dateiName: { fontFamily: 'monospace', fontSize: 11, color: Colors.text, flex: 1 },
  removeBtn: { fontFamily: 'monospace', fontSize: 14, color: Colors.danger, paddingHorizontal: 4 },
});
