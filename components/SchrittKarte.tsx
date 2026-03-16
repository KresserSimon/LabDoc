import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, Alert, Image,
} from 'react-native';
import { Colors, getSchrittStatusColor, getSchrittStatusIcon } from '../constants/colors';
import type { Prozessschritt, Messwert, Bild } from '../lib/db';
import type { ProcessDef } from '../constants/processes';

interface Props {
  schritt: Prozessschritt;
  index: number;
  process?: ProcessDef;
  onStatusChange?: (id: number, status: Prozessschritt['status']) => void;
  onNotizChange?: (id: number, notiz: string) => void;
  onDelete?: (id: number) => void;
  onAddMesswert?: (schrittId: number) => void;
  onDeleteMesswert?: (id: number) => void;
  onAddBild?: (schrittId: number) => void;
  onDeleteBild?: (id: number) => void;
  defaultExpanded?: boolean;
}

const STATUS_OPTIONS: Prozessschritt['status'][] = [
  'Ausstehend', 'In Arbeit', 'Abgeschlossen', 'Übersprungen',
];

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
                     '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

export default function SchrittKarte({
  schritt, index, process,
  onStatusChange, onNotizChange, onDelete,
  onAddMesswert, onDeleteMesswert, onAddBild, onDeleteBild,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const statusColor = getSchrittStatusColor(schritt.status);
  const statusIcon = getSchrittStatusIcon(schritt.status);
  const num = CIRCLE_NUMS[index] ?? `${index + 1}`;

  return (
    <View style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 3 }]}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)}>
        <View style={styles.headerLeft}>
          <Text style={[styles.num, { color: statusColor }]}>{num}</Text>
          <View>
            <Text style={styles.name}>{schritt.schritt_name}</Text>
            {schritt.process_abbr ? (
              <Text style={styles.abbr}>{schritt.process_abbr}
                {schritt.machine ? ` · ${schritt.machine}` : ''}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.statusBadge, { borderColor: statusColor }]}
            onPress={() => setShowStatusPicker(v => !v)}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusIcon} {schritt.status}
            </Text>
          </TouchableOpacity>
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Status Picker */}
      {showStatusPicker && (
        <View style={styles.statusPicker}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.statusOption, schritt.status === opt && styles.statusOptionActive]}
              onPress={() => { onStatusChange?.(schritt.id, opt); setShowStatusPicker(false); }}
            >
              <Text style={[styles.statusOptionText, { color: getSchrittStatusColor(opt) }]}>
                {getSchrittStatusIcon(opt)} {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Body */}
      {expanded && (
        <View style={styles.body}>
          {/* Parameter */}
          {schritt.parameter_values.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PARAMETER</Text>
              {schritt.parameter_values.map(p => (
                <View key={p.id ?? p.param_name} style={styles.paramRow}>
                  <Text style={styles.paramName}>{p.param_name}</Text>
                  <Text style={styles.paramValue}>{p.param_value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Messwerte */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>MESSWERTE</Text>
              {onAddMesswert && (
                <TouchableOpacity onPress={() => onAddMesswert(schritt.id)}>
                  <Text style={styles.addBtn}>+ Hinzufügen</Text>
                </TouchableOpacity>
              )}
            </View>
            {(schritt.messwerte ?? []).length === 0 && (
              <Text style={styles.empty}>Keine Messwerte</Text>
            )}
            {(schritt.messwerte ?? []).map(m => (
              <View key={m.id} style={styles.messwertRow}>
                <Text style={styles.messwertName}>{m.name}</Text>
                <Text style={styles.messwertValue}>{m.wert} {m.einheit}</Text>
                {onDeleteMesswert && (
                  <TouchableOpacity onPress={() => onDeleteMesswert(m.id!)}>
                    <Text style={styles.deleteSmall}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Bilder */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BILDER</Text>
              {onAddBild && (
                <TouchableOpacity onPress={() => onAddBild(schritt.id)}>
                  <Text style={styles.addBtn}>+ Aufnehmen</Text>
                </TouchableOpacity>
              )}
            </View>
            {(schritt.bilder ?? []).length === 0 && (
              <Text style={styles.empty}>Keine Bilder</Text>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(schritt.bilder ?? []).map(b => (
                <View key={b.id} style={styles.bildWrapper}>
                  <Image source={{ uri: b.local_path }} style={styles.bild} resizeMode="cover" />
                  <Text style={styles.bildName} numberOfLines={1}>{b.filename}</Text>
                  {onDeleteBild && (
                    <TouchableOpacity style={styles.bildDelete} onPress={() => onDeleteBild(b.id!)}>
                      <Text style={styles.deleteSmall}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Notiz */}
          {onNotizChange && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>NOTIZ</Text>
              <TextInput
                style={styles.notizInput}
                value={schritt.notizen ?? ''}
                onChangeText={t => onNotizChange(schritt.id, t)}
                placeholder="Notiz zum Schritt..."
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>
          )}

          {/* Delete */}
          {onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => Alert.alert('Schritt löschen?', schritt.schritt_name, [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => onDelete(schritt.id) },
              ])}
            >
              <Text style={styles.deleteBtnText}>Schritt entfernen</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    minHeight: 56,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num: { fontFamily: 'monospace', fontSize: 20, fontWeight: '700' },
  name: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: Colors.text },
  abbr: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  statusBadge: {
    borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  statusText: { fontFamily: 'monospace', fontSize: 10, fontWeight: '600' },
  chevron: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary },
  statusPicker: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingBottom: 10,
  },
  statusOption: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  statusOptionActive: { backgroundColor: '#e8f0fb' },
  statusOptionText: { fontFamily: 'monospace', fontSize: 11 },
  body: { paddingHorizontal: 12, paddingBottom: 12 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionTitle: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1 },
  addBtn: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
  paramRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  paramName: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, flex: 1 },
  paramValue: { fontFamily: 'monospace', fontSize: 11, color: Colors.text, fontWeight: '600', textAlign: 'right' },
  messwertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  messwertName: { fontFamily: 'monospace', fontSize: 12, color: Colors.text, flex: 1 },
  messwertValue: { fontFamily: 'monospace', fontSize: 12, color: Colors.primary, fontWeight: '700' },
  deleteSmall: { fontFamily: 'monospace', fontSize: 12, color: Colors.danger, paddingHorizontal: 4 },
  empty: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  bildWrapper: { marginRight: 8, alignItems: 'center' },
  bild: { width: 80, height: 80, borderRadius: 6, backgroundColor: Colors.border },
  bildName: { fontFamily: 'monospace', fontSize: 8, color: Colors.textSecondary, maxWidth: 80, marginTop: 2 },
  bildDelete: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 2 },
  notizInput: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6,
    padding: 8, fontFamily: 'monospace', fontSize: 12, color: Colors.text,
    minHeight: 60, textAlignVertical: 'top',
  },
  deleteBtn: { alignItems: 'center', marginTop: 4, paddingVertical: 8 },
  deleteBtnText: { fontFamily: 'monospace', fontSize: 12, color: Colors.danger },
});
