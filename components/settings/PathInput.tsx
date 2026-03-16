import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}

function isValidPath(p: string) {
  return p.startsWith('/') && p.endsWith('/');
}

export default function PathInput({ label, hint, value, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    let v = draft.trim();
    if (!v.startsWith('/')) v = '/' + v;
    if (!v.endsWith('/')) v = v + '/';
    onChange(v);
    setEditing(false);
  };

  const showTip = () => Alert.alert('Pfad-Hinweis', hint + '\n\nDer Pfad muss mit / beginnen und enden.');

  return (
    <View style={s.container}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        <TouchableOpacity onPress={showTip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.tip}>ℹ</Text>
        </TouchableOpacity>
      </View>
      {editing ? (
        <View style={s.editRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <TouchableOpacity style={s.saveBtn} onPress={commit}>
            <Text style={s.saveBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.valueRow} onPress={() => { setDraft(value); setEditing(true); }}>
          <Text style={[s.value, !isValidPath(value) && s.invalid]}>{value || '–'}</Text>
          <Text style={s.editHint}>Tippen zum Bearbeiten</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  label: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  tip: { fontSize: 14, color: Colors.primary },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 8, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontFamily: 'monospace', fontSize: 13, color: '#fff', fontWeight: '700' },
  valueRow: {},
  value: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  invalid: { color: Colors.danger },
  editHint: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
});
