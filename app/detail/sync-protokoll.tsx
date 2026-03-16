import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';

interface SyncEntry {
  id: string;
  timestamp: string;
  typ: 'upload' | 'download' | 'fehler';
  datei: string;
  status: 'ok' | 'fehler';
  meldung?: string;
}

const SYNC_LOG_KEY = 'labdoc_sync_log';

export default function SyncProtokoll() {
  const router = useRouter();
  const [log, setLog] = useState<SyncEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(SYNC_LOG_KEY).then(raw => {
      if (raw) setLog(JSON.parse(raw));
    });
  }, []);

  const clearLog = async () => {
    await AsyncStorage.removeItem(SYNC_LOG_KEY);
    setLog([]);
  };

  const typIcon = (e: SyncEntry) => {
    if (e.status === 'fehler') return '✗';
    return e.typ === 'upload' ? '↑' : '↓';
  };

  const typColor = (e: SyncEntry) =>
    e.status === 'fehler' ? Colors.danger : e.typ === 'upload' ? Colors.primary : Colors.accent;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.back}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={s.title}>SYNC-PROTOKOLL</Text>
        {log.length > 0 && (
          <TouchableOpacity onPress={clearLog}>
            <Text style={s.clear}>Löschen</Text>
          </TouchableOpacity>
        )}
      </View>

      {log.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>☁</Text>
          <Text style={s.emptyText}>Keine Sync-Einträge vorhanden.</Text>
          <Text style={s.emptyHint}>Einträge erscheinen hier nach der ersten Synchronisierung.</Text>
        </View>
      ) : (
        <FlatList
          data={[...log].reverse()}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.entry}>
              <Text style={[s.entryIcon, { color: typColor(item) }]}>{typIcon(item)}</Text>
              <View style={s.entryBody}>
                <Text style={s.entryFile} numberOfLines={1}>{item.datei}</Text>
                {item.meldung && <Text style={s.entryMsg}>{item.meldung}</Text>}
                <Text style={s.entryTime}>{item.timestamp}</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back: { fontFamily: 'monospace', fontSize: 14, color: Colors.primary, width: 70 },
  title: { flex: 1, fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1.2, textAlign: 'center' },
  clear: { fontFamily: 'monospace', fontSize: 12, color: Colors.danger, width: 70, textAlign: 'right' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16, color: Colors.border },
  emptyText: { fontFamily: 'monospace', fontSize: 14, color: Colors.text, textAlign: 'center' },
  emptyHint: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  entryIcon: { fontSize: 18, fontWeight: '700', width: 22, textAlign: 'center', marginTop: 2 },
  entryBody: { flex: 1 },
  entryFile: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  entryMsg: { fontFamily: 'monospace', fontSize: 11, color: Colors.danger, marginTop: 2 },
  entryTime: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  sep: { height: 0.5, backgroundColor: Colors.border },
});
