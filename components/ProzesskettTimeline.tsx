import React from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Colors, getSchrittStatusColor, getSchrittStatusIcon } from '../constants/colors';
import type { Prozessschritt } from '../lib/db';

interface Props {
  schritte: Prozessschritt[];
  onSchrittPress?: (schritt: Prozessschritt) => void;
  activeSchrittId?: number;
}

const CIRCLE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
                     '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

export default function ProzesskettTimeline({ schritte, onSchrittPress, activeSchrittId }: Props) {
  const abgeschlossen = schritte.filter(s => s.status === 'Abgeschlossen').length;
  const total = schritte.length;

  if (total === 0) return null;

  return (
    <View style={styles.wrapper}>
      {/* Fortschrittsbalken */}
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: total > 0 ? `${(abgeschlossen / total) * 100}%` : '0%' },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {abgeschlossen}/{total} Schritte
        </Text>
      </View>

      {/* Horizontale Timeline */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {schritte.map((s, idx) => {
          const color = getSchrittStatusColor(s.status);
          const icon = getSchrittStatusIcon(s.status);
          const isActive = s.id === activeSchrittId;
          const num = CIRCLE_NUMS[idx] ?? `${idx + 1}`;
          const shortName = s.schritt_name.length > 8
            ? s.schritt_name.slice(0, 8) + '…'
            : s.schritt_name;

          return (
            <View key={s.id} style={styles.nodeWrapper}>
              <TouchableOpacity
                style={[
                  styles.node,
                  { borderColor: color },
                  isActive && styles.nodeActive,
                ]}
                onPress={() => onSchrittPress?.(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.nodeNum, { color }]}>{num}</Text>
                <Text style={[styles.nodeName, { color }]} numberOfLines={1}>
                  {shortName}
                </Text>
                <Text style={[styles.nodeIcon, { color }]}>{icon}</Text>
                {s.process_abbr ? (
                  <Text style={[styles.nodeAbbr, { color }]}>{s.process_abbr}</Text>
                ) : null}
              </TouchableOpacity>
              {idx < schritte.length - 1 && (
                <Text style={styles.arrow}>→</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.statusAbgeschlossen,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: Colors.textSecondary,
    minWidth: 80,
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  nodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  node: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 72,
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  nodeActive: {
    backgroundColor: '#e8f0fb',
  },
  nodeNum: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
  },
  nodeName: {
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 1,
  },
  nodeIcon: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 1,
  },
  nodeAbbr: {
    fontFamily: 'monospace',
    fontSize: 8,
    opacity: 0.7,
  },
  arrow: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.border,
  },
});
