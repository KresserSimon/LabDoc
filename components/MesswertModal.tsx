import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, wert: string, einheit: string) => void;
}

export default function MesswertModal({ visible, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [wert, setWert] = useState('');
  const [einheit, setEinheit] = useState('');

  const handleSave = () => {
    if (!name.trim() || !wert.trim()) return;
    onSave(name.trim(), wert.trim(), einheit.trim());
    setName(''); setWert(''); setEinheit('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>MESSWERT ERFASSEN</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="z.B. Ra-Wert, Rz, Härte..."
            placeholderTextColor={Colors.textSecondary}
          />

          <View style={styles.row}>
            <View style={{ flex: 2 }}>
              <Text style={styles.label}>Wert</Text>
              <TextInput
                style={styles.input}
                value={wert}
                onChangeText={setWert}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Einheit</Text>
              <TextInput
                style={styles.input}
                value={einheit}
                onChangeText={setEinheit}
                placeholder="µm"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!name || !wert) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!name || !wert}
            >
              <Text style={styles.saveText}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 36,
  },
  title: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: '700',
    color: Colors.primary, letterSpacing: 1, marginBottom: 16,
  },
  label: {
    fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary,
    marginBottom: 4, letterSpacing: 0.5,
  },
  input: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6,
    padding: 10, fontFamily: 'monospace', fontSize: 13,
    color: Colors.text, marginBottom: 12, backgroundColor: Colors.background,
  },
  row: { flexDirection: 'row' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  cancelText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  saveBtn: {
    flex: 1, backgroundColor: Colors.primary,
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontFamily: 'monospace', fontSize: 13, color: '#fff', fontWeight: '700' },
});
