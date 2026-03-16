import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Colors } from '../../constants/colors';
import { getAllVersuche } from '../../lib/db';

export default function Diagnose() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const erstellen = async () => {
    setLoading(true);
    try {
      const versuche = await getAllVersuche();
      const info = {
        app: 'LabDoc',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        platform_version: Platform.Version,
        db_schema: {
          versuche: 'id, bezeichnung, material, dim_x/y/z, status, notizen, created_at, updated_at',
          prozessschritte: 'id, versuch_id, position, schritt_name, process_name, machine, status',
          parameter_values: 'id, schritt_id, param_name, param_value',
          messwerte: 'id, versuch_id, schritt_id, name, wert, einheit, created_at',
          messmessungen: 'id, versuch_id, schritt_id, methode, bezeichnung, created_at',
          bilder: 'id, versuch_id, schritt_id, filename, local_path',
          pdfs: 'id, versuch_id, filename, local_path',
        },
        stats: {
          versuche_count: versuche.length,
          status_verteilung: versuche.reduce((acc: Record<string, number>, v) => {
            acc[v.status] = (acc[v.status] ?? 0) + 1;
            return acc;
          }, {}),
        },
        // Keine echten Versuchsdaten
      };

      const out = new File(Paths.cache, `LabDoc_Diagnose_${Date.now()}.json`);
      await out.write(JSON.stringify(info, null, 2));
      await Sharing.shareAsync(out.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Diagnosebericht teilen',
      });
      setDone(true);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.back}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={s.title}>DIAGNOSEBERICHT</Text>
        <View style={{ width: 70 }} />
      </View>

      <View style={s.body}>
        <Text style={s.icon}>🔍</Text>
        <Text style={s.heading}>Diagnosebericht erstellen</Text>
        <Text style={s.desc}>
          Der Bericht enthält:{'\n\n'}
          • App-Version und Plattform{'\n'}
          • Datenbankstruktur (Schema){'\n'}
          • Statistiken (Anzahl Versuche, Status-Verteilung){'\n'}
          • Geräteinformationen{'\n\n'}
          Keine echten Versuchsdaten werden exportiert.
        </Text>

        {done && (
          <View style={s.doneBadge}>
            <Text style={s.doneText}>✓ Bericht erstellt und geteilt</Text>
          </View>
        )}

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={erstellen} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Diagnosebericht erstellen & teilen</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back: { fontFamily: 'monospace', fontSize: 14, color: Colors.primary, width: 70 },
  title: { flex: 1, fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1.2, textAlign: 'center' },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 16, marginTop: 24 },
  heading: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16, textAlign: 'center' },
  desc: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary, lineHeight: 20, backgroundColor: Colors.card, borderRadius: 10, padding: 16, width: '100%', marginBottom: 20, borderWidth: 0.5, borderColor: Colors.border },
  doneBadge: { backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16, width: '100%', alignItems: 'center' },
  doneText: { fontFamily: 'monospace', fontSize: 13, color: Colors.statusAbgeschlossen },
  btn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', width: '100%' },
  btnText: { fontFamily: 'monospace', fontSize: 14, color: '#fff', fontWeight: '700' },
});
