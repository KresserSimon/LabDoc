import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2025-03',
    changes: [
      'Initiale Version',
      'Versuchsverwaltung mit Prozesskette',
      'Messmethoden-Modul: Alicona InfiniteFocusSL, Mountainsmap, Sonstige',
      'OneDrive-Integration (Platzhalter)',
      'KI-Analyse via Anthropic API (claude-sonnet-4)',
      'JSON/CSV-Export mit expo-sharing',
      'Vollständiges Einstellungsmenü',
    ],
  },
];

export default function Changelog() {
  const router = useRouter();
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.back}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={s.title}>VERSIONSHINWEISE</Text>
        <View style={{ width: 70 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {CHANGELOG.map(entry => (
          <View key={entry.version} style={s.entry}>
            <View style={s.entryHeader}>
              <Text style={s.version}>v{entry.version}</Text>
              <Text style={s.date}>{entry.date}</Text>
            </View>
            {entry.changes.map((c, i) => (
              <View key={i} style={s.changeRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.changeText}>{c}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back: { fontFamily: 'monospace', fontSize: 14, color: Colors.primary, width: 70 },
  title: { flex: 1, fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1.2, textAlign: 'center' },
  scroll: { padding: 16 },
  entry: { backgroundColor: Colors.card, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, padding: 14, marginBottom: 12 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  version: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.primary },
  date: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  changeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  bullet: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  changeText: { fontFamily: 'monospace', fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },
});
