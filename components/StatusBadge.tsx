import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor } from '../constants/colors';

interface Props {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, { borderColor: color }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color }, size === 'sm' && styles.textSm]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  sm: { paddingHorizontal: 5, paddingVertical: 1 },
  text: { fontFamily: 'monospace', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  textSm: { fontSize: 8 },
});
