import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { type MessMethode, METHODE_LABELS, METHODE_COLORS } from '../constants/messmethoden';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (methode: MessMethode) => void;
}

const METHODEN: { key: MessMethode; desc: string }[] = [
  { key: 'Alicona',     desc: 'Optische 3D-Oberflächenmessung' },
  { key: 'Mountainsmap', desc: 'Oberflächenanalyse-Software' },
  { key: 'Sonstige',    desc: 'Eigene / freie Methode' },
];

export default function MessmethodenPicker({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>MESSMETHODE WÄHLEN</Text>
          {METHODEN.map(m => (
            <TouchableOpacity
              key={m.key}
              style={styles.option}
              onPress={() => { onSelect(m.key); onClose(); }}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: METHODE_COLORS[m.key] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{METHODE_LABELS[m.key]}</Text>
                <Text style={styles.optionDesc}>{m.desc}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 36,
  },
  title: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: '700',
    color: Colors.textSecondary, letterSpacing: 1, marginBottom: 16,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optionTitle: { fontFamily: 'monospace', fontSize: 14, color: Colors.text, fontWeight: '600' },
  optionDesc: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  arrow: { fontFamily: 'monospace', fontSize: 18, color: Colors.textSecondary },
  cancelBtn: {
    marginTop: 16, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
});
