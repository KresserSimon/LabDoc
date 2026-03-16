import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert,
} from 'react-native';
import * as SecureStore from '../../lib/secureStore';
import { Colors } from '../../constants/colors';

const KEY = 'anthropic_api_key';

interface Props {
  onSaved?: () => void;
}

export default function ApiKeyInput({ onSaved }: Props) {
  const [masked, setMasked] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [testError, setTestError] = useState('');

  React.useEffect(() => {
    SecureStore.getItemAsync(KEY).then(v => {
      if (v) { setMasked(maskKey(v)); setHasSaved(true); }
    });
  }, []);

  function maskKey(k: string) {
    if (k.length <= 12) return '••••••••••••';
    return k.slice(0, 8) + '••••••••••••' + k.slice(-4);
  }

  const openEdit = () => { setDraft(''); setTestResult(null); setModalVisible(true); };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('Ungültiger Key', 'Ein Anthropic API Key beginnt mit sk-ant-');
      return;
    }
    await SecureStore.setItemAsync(KEY, trimmed);
    setMasked(maskKey(trimmed));
    setHasSaved(true);
    setModalVisible(false);
    onSaved?.();
  };

  const deleteKey = () => {
    Alert.alert('API-Key löschen?', 'Der gespeicherte Key wird entfernt.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive', onPress: async () => {
          await SecureStore.deleteItemAsync(KEY);
          setMasked('');
          setHasSaved(false);
        },
      },
    ]);
  };

  const testConnection = async () => {
    const key = await SecureStore.getItemAsync(KEY);
    if (!key) { setTestResult('fail'); setTestError('Kein API-Key gespeichert.'); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      setTestResult(res.ok ? 'ok' : 'fail');
      if (!res.ok) setTestError(`HTTP ${res.status}`);
    } catch (e: any) {
      setTestResult('fail'); setTestError(e.message ?? 'Netzwerkfehler');
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.row}>
        <View style={s.left}>
          <Text style={s.label}>Anthropic API Key</Text>
          <Text style={s.value}>{hasSaved ? masked : 'Nicht gesetzt'}</Text>
          <Text style={s.hint}>Wird verschlüsselt gespeichert.</Text>
        </View>
        <View style={s.btns}>
          <TouchableOpacity style={s.btn} onPress={openEdit}>
            <Text style={s.btnText}>Bearbeiten</Text>
          </TouchableOpacity>
          {hasSaved && (
            <TouchableOpacity style={[s.btn, s.btnDanger]} onPress={deleteKey}>
              <Text style={[s.btnText, s.btnDangerText]}>Löschen</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Verbindungstest */}
      <View style={s.testRow}>
        <TouchableOpacity style={s.testBtn} onPress={testConnection} disabled={testing || !hasSaved}>
          <Text style={[s.testBtnText, (!hasSaved || testing) && { opacity: 0.4 }]}>
            {testing ? 'Teste...' : 'Verbindung testen'}
          </Text>
        </TouchableOpacity>
        {testResult === 'ok'   && <Text style={s.testOk}>✓ Verbindung OK</Text>}
        {testResult === 'fail' && <Text style={s.testFail}>✗ {testError}</Text>}
      </View>

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>API KEY EINGEBEN</Text>
            <TextInput
              style={s.modalInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="sk-ant-api03-..."
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={s.modalHint}>Erhältlich auf console.anthropic.com</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalBtnCancel} onPress={() => setModalVisible(false)}>
                <Text style={s.modalBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnSave} onPress={save}>
                <Text style={s.modalBtnSaveText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { flex: 1, paddingRight: 10 },
  label: { fontFamily: 'monospace', fontSize: 13, color: Colors.text, marginBottom: 2 },
  value: { fontFamily: 'monospace', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1 },
  hint: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  btns: { gap: 6 },
  btn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  btnText: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
  btnDanger: { borderColor: Colors.danger },
  btnDangerText: { color: Colors.danger },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  testBtn: { borderWidth: 1, borderColor: Colors.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  testBtnText: { fontFamily: 'monospace', fontSize: 11, color: Colors.accent },
  testOk: { fontFamily: 'monospace', fontSize: 11, color: Colors.statusAbgeschlossen },
  testFail: { fontFamily: 'monospace', fontSize: 11, color: Colors.danger },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: Colors.card, borderRadius: 12, padding: 20 },
  modalTitle: { fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 12 },
  modalInput: { borderWidth: 0.5, borderColor: Colors.border, borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 13, color: Colors.text, backgroundColor: Colors.background, marginBottom: 6 },
  modalHint: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginBottom: 14 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modalBtnCancelText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  modalBtnSave: { flex: 1, backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modalBtnSaveText: { fontFamily: 'monospace', fontSize: 13, color: '#fff', fontWeight: '700' },
});
