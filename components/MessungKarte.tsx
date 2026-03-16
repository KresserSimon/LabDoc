import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import {
  type Messmessung, METHODE_LABELS, METHODE_COLORS, DATEI_ICONS,
} from '../constants/messmethoden';

interface Props {
  messung: Messmessung;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function MessungKarte({ messung, onPress, onLongPress }: Props) {
  const color = METHODE_COLORS[messung.methode];
  const { alicona, mountainsmap, sonstige, dateien } = messung;

  const al3dCount = dateien.filter(d => d.datei_typ === 'al3d').length;
  const bmpCount  = dateien.filter(d => d.datei_typ === 'bmp' || d.datei_typ === 'bild').length;
  const pdfCount  = dateien.filter(d => d.datei_typ === 'pdf').length;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{messung.methode}</Text>
        </View>
        <Text style={styles.bezeichnung} numberOfLines={1}>
          {messung.bezeichnung || METHODE_LABELS[messung.methode]}
        </Text>
        <Text style={styles.arrow}>›</Text>
      </View>

      {/* Alicona Details */}
      {alicona && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            Obj: {alicona.objektiv}
            {alicona.messprogramm ? `  ·  ${alicona.messprogramm}` : ''}
          </Text>
          <Text style={styles.values}>
            {[
              alicona.ra  != null ? `Ra ${alicona.ra} µm`  : null,
              alicona.rz  != null ? `Rz ${alicona.rz} µm`  : null,
              alicona.sa  != null ? `Sa ${alicona.sa} µm`  : null,
            ].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      )}

      {/* Mountainsmap Details */}
      {mountainsmap && (
        <View style={styles.details}>
          <Text style={styles.detailText}>
            Template: {mountainsmap.template_name || '–'}
          </Text>
          {mountainsmap.weitere_werte.length > 0 && (
            <Text style={styles.values}>
              {mountainsmap.weitere_werte.slice(0, 3)
                .map(w => `${w.name} ${w.wert} ${w.einheit}`).join('  ·  ')}
            </Text>
          )}
        </View>
      )}

      {/* Sonstige Details */}
      {sonstige && (
        <View style={styles.details}>
          <Text style={styles.detailText}>{sonstige.methoden_name || '–'}</Text>
          {sonstige.weitere_werte.length > 0 && (
            <Text style={styles.values}>
              {sonstige.weitere_werte.slice(0, 3)
                .map(w => `${w.name} ${w.wert} ${w.einheit}`).join('  ·  ')}
            </Text>
          )}
        </View>
      )}

      {/* Dateien */}
      {(al3dCount + bmpCount + pdfCount) > 0 && (
        <View style={styles.dateienRow}>
          {al3dCount > 0 && <Text style={styles.dateiChip}>{DATEI_ICONS.al3d} {al3dCount} al3d</Text>}
          {bmpCount  > 0 && <Text style={styles.dateiChip}>{DATEI_ICONS.bmp} {bmpCount} BMP</Text>}
          {pdfCount  > 0 && <Text style={styles.dateiChip}>{DATEI_ICONS.pdf} {pdfCount} PDF</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: Colors.border, borderLeftWidth: 3,
    marginBottom: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: {
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  bezeichnung: { fontFamily: 'monospace', fontSize: 13, color: Colors.text, flex: 1, fontWeight: '600' },
  arrow: { fontFamily: 'monospace', fontSize: 16, color: Colors.textSecondary },
  details: { marginBottom: 4 },
  detailText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  values: { fontFamily: 'monospace', fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  dateienRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  dateiChip: {
    fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary,
    backgroundColor: Colors.background, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
});
