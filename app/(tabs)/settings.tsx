import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { resetDB } from '../../lib/db';
import { Colors } from '../../constants/colors';

const APP_VERSION = '1.0.0';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [msToken, setMsToken] = useState('');
  const [msLoggedIn, setMsLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const key = await SecureStore.getItemAsync('anthropic_api_key');
      if (key) { setApiKey(key); setApiKeySaved(true); }
      const token = await SecureStore.getItemAsync('ms_access_token');
      setMsLoggedIn(!!token);
    })();
  }, []);

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;
    await SecureStore.setItemAsync('anthropic_api_key', apiKey.trim());
    setApiKeySaved(true);
    Alert.alert('Gespeichert', 'Anthropic API-Key wurde sicher gespeichert.');
  };

  const deleteApiKey = async () => {
    Alert.alert('API-Key löschen?', 'Der gespeicherte API-Key wird entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('anthropic_api_key');
          setApiKey('');
          setApiKeySaved(false);
        },
      },
    ]);
  };

  const handleMsLogin = () => {
    Alert.alert(
      'OneDrive-Login',
      'Microsoft OAuth2-Login ist in dieser Version über expo-auth-session konfigurierbar. Bitte Client-ID in app.json eintragen und expo-auth-session verwenden.',
      [{ text: 'OK' }]
    );
  };

  const handleMsLogout = async () => {
    await SecureStore.deleteItemAsync('ms_access_token');
    await SecureStore.deleteItemAsync('ms_refresh_token');
    setMsLoggedIn(false);
  };

  const handleDBReset = () => {
    Alert.alert(
      'Datenbank zurücksetzen?',
      'ACHTUNG: Alle Versuche, Schritte, Messwerte und Bilder werden unwiderruflich gelöscht!',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen', style: 'destructive',
          onPress: async () => {
            await resetDB();
            Alert.alert('Erledigt', 'Datenbank wurde zurückgesetzt.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Anthropic API */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ANTHROPIC API (KI-ANALYSE)</Text>

          <Text style={styles.label}>API-Key</Text>
          <View style={styles.apiRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-..."
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry={!apiKeyVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setApiKeyVisible(v => !v)}
            >
              <Text style={styles.eyeBtnText}>{apiKeyVisible ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {apiKeySaved && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedText}>✓ API-Key gespeichert (sicher)</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, { flex: 1 }]}
              onPress={saveApiKey}
              disabled={!apiKey.trim()}
            >
              <Text style={styles.btnText}>Speichern</Text>
            </TouchableOpacity>
            {apiKeySaved && (
              <TouchableOpacity style={[styles.btnDanger, { flex: 1 }]} onPress={deleteApiKey}>
                <Text style={styles.btnDangerText}>Löschen</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.hint}>
            Modell: claude-sonnet-4-20250514{'\n'}
            Key wird sicher im Gerätespeicher (SecureStore) abgelegt und nie übertragen.
          </Text>
        </View>

        {/* OneDrive */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ONEDRIVE (MICROSOFT)</Text>

          {msLoggedIn ? (
            <>
              <View style={styles.savedBadge}>
                <Text style={styles.savedText}>✓ Mit Microsoft-Konto verbunden</Text>
              </View>
              <TouchableOpacity style={styles.btnDanger} onPress={handleMsLogout}>
                <Text style={styles.btnDangerText}>Abmelden</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Verbinde dein Microsoft-Konto um Versuche, Bilder und PDFs automatisch in OneDrive zu sichern.{'\n'}
                Ordnerstruktur: /LabDoc/Versuche/&#123;ID&#125;/
              </Text>
              <TouchableOpacity style={styles.btn} onPress={handleMsLogin}>
                <Text style={styles.btnText}>Mit Microsoft anmelden</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Datenbank */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATENBANK</Text>
          <Text style={styles.hint}>
            Lokale SQLite-Datenbank auf dem Gerät. Alle Daten bleiben offline verfügbar.
          </Text>
          <TouchableOpacity style={styles.btnDanger} onPress={handleDBReset}>
            <Text style={styles.btnDangerText}>Datenbank zurücksetzen</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP INFO</Text>
          <InfoRow label="App" value="LabDoc" />
          <InfoRow label="Version" value={APP_VERSION} />
          <InfoRow label="Plattform" value="Android (Expo)" />
          <InfoRow label="DB" value="SQLite (expo-sqlite)" />
          <InfoRow label="KI" value="claude-sonnet-4-20250514" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: Colors.card, borderRadius: 10, padding: 14,
    borderWidth: 0.5, borderColor: Colors.border, marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'monospace', fontSize: 9, fontWeight: '700',
    color: Colors.textSecondary, letterSpacing: 1, marginBottom: 12,
  },
  label: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 10,
    fontFamily: 'monospace', fontSize: 13, color: Colors.text,
    backgroundColor: Colors.background,
  },
  apiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyeBtn: { padding: 10, borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6 },
  eyeBtnText: { fontSize: 16 },
  savedBadge: {
    backgroundColor: '#e8f5e9', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 10,
  },
  savedText: { fontFamily: 'monospace', fontSize: 11, color: Colors.statusAbgeschlossen },
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingVertical: 11, alignItems: 'center',
  },
  btnText: { fontFamily: 'monospace', fontSize: 13, color: '#fff', fontWeight: '700' },
  btnDanger: {
    borderWidth: 1, borderColor: Colors.danger, borderRadius: 8,
    paddingVertical: 11, alignItems: 'center', marginBottom: 4,
  },
  btnDangerText: { fontFamily: 'monospace', fontSize: 13, color: Colors.danger },
  hint: {
    fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary,
    lineHeight: 15, marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  infoLabel: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  infoValue: { fontFamily: 'monospace', fontSize: 11, color: Colors.text, fontWeight: '600' },
});
