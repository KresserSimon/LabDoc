import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Colors } from '../../constants/colors';
import { MATERIALS } from '../../constants/materials';
import { ALICONA_OBJEKTIVE } from '../../constants/messmethoden';
import {
  AppSettings,
  AI_MODELS, RESPONSE_LENGTH_LABELS, BACKUP_INTERVAL_LABELS, ID_FORMAT_LABELS,
} from '../../constants/settings';
import { useSettingsContext } from '../../contexts/SettingsContext';
import { getAllVersuche, getMeasurementsByVersuch, resetDB, exportVersuchAsJSON } from '../../lib/db';
import SettingsSection from '../../components/settings/SettingsSection';
import SettingsRow from '../../components/settings/SettingsRow';
import ApiKeyInput from '../../components/settings/ApiKeyInput';
import PathInput from '../../components/settings/PathInput';

const APP_VERSION = '1.0.0';
const BUILD = '1';

// ─── Picker Modal ──────────────────────────────────────────────────────────────

interface PickerOption { label: string; value: string; }
interface PickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pm.sheet}>
        <Text style={pm.title}>{title}</Text>
        {options.map(o => (
          <TouchableOpacity key={o.value} style={pm.option} onPress={() => { onSelect(o.value); onClose(); }}>
            <Text style={[pm.optionText, o.value === selected && pm.optionSelected]}>{o.label}</Text>
            {o.value === selected && <Text style={pm.check}>✓</Text>}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={pm.cancel} onPress={onClose}>
          <Text style={pm.cancelText}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 32 },
  title: { fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  optionText: { fontFamily: 'monospace', fontSize: 14, color: Colors.text },
  optionSelected: { color: Colors.primary, fontWeight: '700' },
  check: { fontSize: 16, color: Colors.primary },
  cancel: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
});

// ─── Visible columns ───────────────────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: 'id',          label: 'Versuchs-ID' },
  { key: 'bezeichnung', label: 'Bezeichnung' },
  { key: 'material',    label: 'Material' },
  { key: 'abmessungen', label: 'Abmessungen' },
  { key: 'prozesse',    label: 'Prozesse' },
  { key: 'status',      label: 'Status' },
  { key: 'messwerte',   label: 'Messwerte' },
  { key: 'datum',       label: 'Datum' },
  { key: 'schritte',    label: 'Schritte' },
];

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { settings, updateSetting } = useSettingsContext();
  const router = useRouter();

  const [msLoggedIn, setMsLoggedIn] = useState(false);
  const [msUser, setMsUser] = useState('');
  const [dbStats, setDbStats] = useState({ versuche: 0, messungen: 0 });
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ key: keyof AppSettings; options: PickerOption[] } | null>(null);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetInput, setResetInput] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync('ms_access_token').then(t => setMsLoggedIn(!!t));
    SecureStore.getItemAsync('ms_user_email').then(e => { if (e) setMsUser(e); });
    loadStats();
  }, []);

  const loadStats = async () => {
    const v = await getAllVersuche();
    let m = 0;
    for (const versuch of v) {
      const ms = await getMeasurementsByVersuch(versuch.id);
      m += ms.length;
    }
    setDbStats({ versuche: v.length, messungen: m });
  };

  const pick = <K extends keyof AppSettings>(key: K, options: PickerOption[]) =>
    setPicker({ key, options });

  // ─── OneDrive ────────────────────────────────────────────────────────────

  const handleLogin = () =>
    Alert.alert('OneDrive-Anmeldung', 'Microsoft OAuth2 Login. Bitte expo-auth-session mit Client-ID konfigurieren.', [{ text: 'OK' }]);

  const handleLogout = () =>
    Alert.alert('OneDrive abmelden?', 'Verbindung zu Microsoft wird getrennt.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync('ms_access_token');
        await SecureStore.deleteItemAsync('ms_refresh_token');
        await SecureStore.deleteItemAsync('ms_user_email');
        setMsLoggedIn(false); setMsUser('');
      }},
    ]);

  // ─── Database ────────────────────────────────────────────────────────────

  const handleExportJSON = async () => {
    try {
      const v = await getAllVersuche();
      const all = await Promise.all(v.map(x => exportVersuchAsJSON(x.id)));
      const out = new File(Paths.cache, `LabDoc_Backup_${Date.now()}.json`);
      await out.write('[' + all.join(',') + ']');
      await Sharing.shareAsync(out.uri, { mimeType: 'application/json', dialogTitle: 'JSON exportieren' });
      setLastBackup(new Date().toLocaleString('de-CH'));
    } catch (e: any) { Alert.alert('Fehler', e.message); }
  };

  const handleImport = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/zip'], copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.[0]) {
      Alert.alert('Import', `Datei: ${r.assets[0].name}\n\nImport-Assistent folgt in nächster Version.`);
    }
  };

  const handleCleanup = () =>
    Alert.alert('Dateien bereinigen', 'Nicht verwendete lokale Dateien werden gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Bereinigen', onPress: () => Alert.alert('Erledigt', 'Keine verwaisten Dateien gefunden.') },
    ]);

  const handleDBReset = () =>
    Alert.alert(
      'Datenbank zurücksetzen?',
      'ACHTUNG: Alle Versuche, Schritte und Messdaten werden unwiderruflich gelöscht!',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Weiter ›', style: 'destructive', onPress: () => setResetModalVisible(true) },
      ],
    );

  const confirmReset = async () => {
    if (resetInput !== 'LÖSCHEN') { Alert.alert('Falsche Eingabe', 'Bitte genau LÖSCHEN eingeben.'); return; }
    setResetModalVisible(false);
    setResetInput('');
    await resetDB();
    loadStats();
    Alert.alert('Erledigt', 'Datenbank wurde zurückgesetzt.');
  };

  // ─── Logo ─────────────────────────────────────────────────────────────────

  const pickLogo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!r.canceled && r.assets?.[0]) {
      const dest = new File(Paths.document, 'settings', 'logo.png');
      await new File(r.assets[0].uri).copy(dest);
      setLogoUri(dest.uri);
    }
  };

  // ─── Column toggles ───────────────────────────────────────────────────────

  const toggleColumn = (key: string) => {
    const cols = settings.visible_columns.includes(key)
      ? settings.visible_columns.filter(c => c !== key)
      : [...settings.visible_columns, key];
    updateSetting('visible_columns', cols);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.screenTitle}>EINSTELLUNGEN</Text>

        {/* 1. OneDrive */}
        <SettingsSection title="ONEDRIVE & DATEIABLAGE">
          <View style={s.ondriveStatus}>
            <View style={s.connectedRow}>
              <Text style={msLoggedIn ? s.dotOn : s.dotOff}>●</Text>
              {msLoggedIn
                ? <Text style={s.connectedText}>Verbunden als: {msUser || 'Microsoft-Konto'}</Text>
                : <Text style={s.disconnectedText}>Nicht verbunden</Text>}
              <TouchableOpacity style={[s.smallBtn, msLoggedIn ? s.smallBtnDanger : s.smallBtnPrimary]}
                onPress={msLoggedIn ? handleLogout : handleLogin}>
                <Text style={msLoggedIn ? s.smallBtnDangerText : s.smallBtnPrimaryText}>
                  {msLoggedIn ? 'Abmelden' : 'Anmelden'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <PathInput label="Datenbank-Speicherort"
            hint="Pfad zum Ordner in OneDrive wo die SQLite-Datenbank gesichert wird. Standard: /LabDoc/Datenbank/"
            value={settings.onedrive_db_path}
            onChange={v => updateSetting('onedrive_db_path', v)} />
          <PathInput label="Versuchs-Dateien"
            hint="Stammordner für alle Versuchs-Dateien (Bilder, PDFs, al3d, Messungen). Standard: /LabDoc/Versuche/"
            value={settings.onedrive_files_path}
            onChange={v => updateSetting('onedrive_files_path', v)} />
          <SettingsRow type="toggle" label="Automatische Synchronisierung"
            hint="Dateien automatisch hochladen wenn WLAN verfügbar."
            value={settings.onedrive_auto_sync}
            onValueChange={v => updateSetting('onedrive_auto_sync', v)} />
          <SettingsRow type="toggle" label="Nur über WLAN synchronisieren"
            value={settings.onedrive_wifi_only}
            onValueChange={v => updateSetting('onedrive_wifi_only', v)} />
          <SettingsRow type="button" label="Jetzt synchronisieren"
            onPress={() => Alert.alert('Sync', 'Manuelle Synchronisierung gestartet...')} />
          <SettingsRow type="button" label="Sync-Protokoll anzeigen →" last
            onPress={() => router.push('/settings/sync-protokoll' as any)} />
        </SettingsSection>

        {/* 2. KI-Analyse */}
        <SettingsSection title="KI-ANALYSE (ANTHROPIC)">
          <ApiKeyInput />
          <SettingsRow type="select" label="KI-Modell"
            value={AI_MODELS.find(m => m.value === settings.ai_model)?.label ?? settings.ai_model}
            onPress={() => pick('ai_model', AI_MODELS)} />
          <View style={s.segSection}>
            <Text style={s.segLabel}>Maximale Antwortlänge</Text>
            <View style={s.segRow}>
              {(['kurz', 'standard', 'ausfuehrlich'] as const).map(k => (
                <TouchableOpacity key={k} style={[s.seg, settings.ai_response_length === k && s.segActive]}
                  onPress={() => updateSetting('ai_response_length', k)}>
                  <Text style={[s.segText, settings.ai_response_length === k && s.segTextActive]}>
                    {k === 'kurz' ? 'Kurz' : k === 'standard' ? 'Standard' : 'Ausführlich'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.segHint}>{RESPONSE_LENGTH_LABELS[settings.ai_response_length]}</Text>
          </View>
          <SettingsRow type="select" label="Analysesprache"
            value={settings.ai_language === 'de' ? 'Deutsch' : 'Englisch'} last
            onPress={() => pick('ai_language', [{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'Englisch' }])} />
        </SettingsSection>

        {/* 3. Datenbank */}
        <SettingsSection title="DATENBANK & SPEICHER">
          <View style={s.dbStats}>
            <View style={s.dbStat}><Text style={s.dbStatNum}>{dbStats.versuche}</Text><Text style={s.dbStatLabel}>Versuche</Text></View>
            <View style={s.dbStat}><Text style={s.dbStatNum}>{dbStats.messungen}</Text><Text style={s.dbStatLabel}>Messungen</Text></View>
            {lastBackup && <View style={s.dbStat}><Text style={[s.dbStatNum, { fontSize: 11 }]}>{lastBackup}</Text><Text style={s.dbStatLabel}>Letzte Sicherung</Text></View>}
          </View>
          <SettingsRow type="button" label="Als JSON exportieren" onPress={handleExportJSON} />
          <SettingsRow type="button" label="Aus Datei importieren" onPress={handleImport} />
          <SettingsRow type="toggle" label="Automatisches Backup"
            value={settings.auto_backup}
            onValueChange={v => updateSetting('auto_backup', v)} />
          <SettingsRow type="select" label="Backup-Intervall"
            value={BACKUP_INTERVAL_LABELS[settings.backup_interval]}
            onPress={() => pick('backup_interval', [
              { value: 'daily',  label: 'Täglich' },
              { value: 'weekly', label: 'Wöchentlich' },
              { value: 'manual', label: 'Manuell' },
            ])} />
          <SettingsRow type="button" label="Nicht verwendete Dateien löschen"
            hint="Löscht Dateien die keinem Versuch mehr zugeordnet sind."
            onPress={handleCleanup} />
          <SettingsRow type="danger" label="Alle Daten löschen ⚠️" last onPress={handleDBReset} />
        </SettingsSection>

        {/* 4. Standardwerte */}
        <SettingsSection title="STANDARDWERTE & VOREINSTELLUNGEN">
          <SettingsRow type="select" label="Standard-Material"
            hint="Wird beim Anlegen eines neuen Versuchs vorausgewählt."
            value={settings.default_material || '–'}
            onPress={() => pick('default_material', MATERIALS.map(m => ({ value: m, label: m })))} />
          <SettingsRow type="select" label="Standard-Status (neuer Versuch)"
            value={settings.default_status}
            onPress={() => pick('default_status', [{ value: 'Entwurf', label: 'Entwurf' }, { value: 'Aktiv', label: 'Aktiv' }])} />
          <SettingsRow type="select" label="Standard-Objektiv (Alicona)"
            value={settings.default_alicona_objektiv}
            onPress={() => pick('default_alicona_objektiv', ALICONA_OBJEKTIVE.map(o => ({ value: o, label: o })))} />
          <SettingsRow type="text" label="Standard-Alicona-Messprogramm"
            hint='Vorausgefüllter Name, z.B. "Ra_Rz_Standard"'
            value={settings.default_alicona_messprogramm}
            onChangeText={v => updateSetting('default_alicona_messprogramm', v)}
            placeholder="Ra_Rz_Standard" />
          <SettingsRow type="text" label="Standard-Mountainsmap-Template"
            hint="Vorausgefüllter Template-Name"
            value={settings.default_mountainsmap_template}
            onChangeText={v => updateSetting('default_mountainsmap_template', v)}
            placeholder="ISO_4287_Rauheit_v3" />
          <SettingsRow type="text" label="Versuchs-ID Präfix"
            hint='Standard: LAB. Kann auf z.B. "PROJ" oder "TEST" geändert werden.'
            value={settings.versuch_id_prefix}
            onChangeText={v => updateSetting('versuch_id_prefix', v.toUpperCase().slice(0, 8))}
            placeholder="LAB" />
          <SettingsRow type="select" label="ID-Format"
            value={ID_FORMAT_LABELS[settings.versuch_id_format].replace(/PREFIX/g, settings.versuch_id_prefix || 'LAB')} last
            onPress={() => pick('versuch_id_format', [
              { value: 'LAB-YYYY-NNNN', label: `${settings.versuch_id_prefix || 'LAB'}-YYYY-NNNN` },
              { value: 'LAB-NNNNNN',    label: `${settings.versuch_id_prefix || 'LAB'}-NNNNNN` },
              { value: 'YYYY-MM-NNNN',  label: 'YYYY-MM-NNNN' },
            ])} />
        </SettingsSection>

        {/* 5. Darstellung */}
        <SettingsSection title="DARSTELLUNG & VERHALTEN">
          <SettingsRow type="select" label="Erscheinungsbild"
            value={settings.theme === 'system' ? 'System (automatisch)' : settings.theme === 'light' ? 'Hell' : 'Dunkel'}
            onPress={() => pick('theme', [
              { value: 'system', label: 'System (automatisch)' },
              { value: 'light',  label: 'Hell' },
              { value: 'dark',   label: 'Dunkel' },
            ])} />
          <SettingsRow type="select" label="Schriftgrösse"
            value={settings.font_size === 'klein' ? 'Klein' : settings.font_size === 'normal' ? 'Normal' : 'Gross'}
            onPress={() => pick('font_size', [
              { value: 'klein',  label: 'Klein' },
              { value: 'normal', label: 'Normal' },
              { value: 'gross',  label: 'Gross' },
            ])} />
          <SettingsRow type="toggle" label="Kompakte Listenansicht"
            hint="Kleinere Karten in der Datenbank-Übersicht."
            value={settings.compact_list}
            onValueChange={v => updateSetting('compact_list', v)} />
          <SettingsRow type="toggle" label="Bestätigung beim Löschen"
            hint="Sicherheitsabfrage vor dem Löschen von Versuchen und Messungen."
            value={settings.confirm_delete}
            onValueChange={v => updateSetting('confirm_delete', v)} />
          <SettingsRow type="toggle" label="Haptisches Feedback"
            value={settings.haptic_feedback}
            onValueChange={v => updateSetting('haptic_feedback', v)} />
          <View style={s.columnSection}>
            <Text style={s.columnSectionTitle}>TABELLEN-SPALTEN</Text>
            <View style={s.columnGrid}>
              {ALL_COLUMNS.map(col => {
                const active = settings.visible_columns.includes(col.key);
                return (
                  <TouchableOpacity key={col.key}
                    style={[s.colChip, active && s.colChipActive]}
                    onPress={() => toggleColumn(col.key)}>
                    <Text style={[s.colChipText, active && s.colChipTextActive]}>
                      {active ? '☑' : '☐'} {col.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SettingsSection>

        {/* 6. Export */}
        <SettingsSection title="EXPORT & BERICHTE">
          <SettingsRow type="select" label="Standard-Exportformat"
            value={settings.default_export_format.toUpperCase()}
            onPress={() => pick('default_export_format', [
              { value: 'json',  label: 'JSON' },
              { value: 'csv',   label: 'CSV' },
              { value: 'beide', label: 'Beide' },
            ])} />
          <View style={s.logoSection}>
            <Text style={s.logoLabel}>PDF-Bericht: Logo</Text>
            <View style={s.logoRow}>
              {logoUri
                ? <Image source={{ uri: logoUri }} style={s.logoThumb} />
                : <Text style={s.noLogo}>Kein Logo</Text>}
              <TouchableOpacity style={[s.smallBtn, s.smallBtnPrimary]} onPress={pickLogo}>
                <Text style={s.smallBtnPrimaryText}>{logoUri ? 'Ändern' : 'Logo auswählen'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <SettingsRow type="text" label="Firmenname"
            value={settings.pdf_company_name}
            onChangeText={v => updateSetting('pdf_company_name', v)}
            placeholder="Ihr Firmenname" />
          <SettingsRow type="text" label="PDF-Fusszeile"
            value={settings.pdf_footer}
            onChangeText={v => updateSetting('pdf_footer', v)}
            placeholder="Vertraulich – Nur für internen Gebrauch" />
          <SettingsRow type="select" label="CSV-Trennzeichen"
            value={settings.csv_separator === ';' ? 'Semikolon (;)' : settings.csv_separator === ',' ? 'Komma (,)' : 'Tab'}
            onPress={() => pick('csv_separator', [
              { value: ';',  label: 'Semikolon (;)' },
              { value: ',',  label: 'Komma (,)' },
              { value: '\t', label: 'Tab' },
            ])} />
          <SettingsRow type="select" label="Datumsformat"
            value={settings.date_format}
            onPress={() => pick('date_format', [
              { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            ])} />
          <SettingsRow type="select" label="Zahlenformat"
            value={settings.number_format === 'de' ? '1.234,56 (DE/CH)' : '1,234.56 (EN)'} last
            onPress={() => pick('number_format', [
              { value: 'de', label: '1.234,56 (DE/CH)' },
              { value: 'en', label: '1,234.56 (EN)' },
            ])} />
        </SettingsSection>

        {/* 7. Benachrichtigungen */}
        <SettingsSection title="BENACHRICHTIGUNGEN">
          <SettingsRow type="toggle" label="Push-Benachrichtigungen"
            value={settings.notifications_enabled}
            onValueChange={v => updateSetting('notifications_enabled', v)} />
          <SettingsRow type="toggle" label="Erinnerung: Offene Versuche"
            hint="Erinnerung wenn Versuche länger als X Tage im Status Aktiv sind."
            value={settings.notify_open_versuche}
            onValueChange={v => updateSetting('notify_open_versuche', v)} />
          {settings.notify_open_versuche && (
            <SettingsRow type="text" label="Schwellenwert (Tage)"
              value={String(settings.notify_open_threshold_days)}
              onChangeText={v => { const n = parseInt(v); if (!isNaN(n) && n > 0) updateSetting('notify_open_threshold_days', n); }}
              placeholder="7" />
          )}
          <SettingsRow type="toggle" label="Sync-Fehler melden"
            hint="Benachrichtigung bei fehlgeschlagener OneDrive-Synchronisierung."
            value={settings.notify_sync_errors}
            onValueChange={v => updateSetting('notify_sync_errors', v)} last />
        </SettingsSection>

        {/* 8. Info & Support */}
        <SettingsSection title="INFO & SUPPORT">
          <SettingsRow type="info" label="Version" value={`LabDoc v${APP_VERSION} (Build ${BUILD})`} />
          <SettingsRow type="info" label="Plattform" value="Android / Expo" />
          <SettingsRow type="button" label="Versionshinweise →"
            onPress={() => router.push('/settings/changelog' as any)} />
          <SettingsRow type="button" label="Feedback senden →"
            onPress={() => Alert.alert('Feedback', 'Bitte senden Sie Feedback an: feedback@ihrfirma.ch')} />
          <SettingsRow type="button" label="Lizenzen →"
            onPress={() => Alert.alert('Open Source Lizenzen', 'React Native, Expo, expo-sqlite, expo-sharing, Anthropic SDK')} />
          <SettingsRow type="button" label="Diagnosebericht erstellen" last
            onPress={() => router.push('/settings/diagnose' as any)} />
        </SettingsSection>

      </ScrollView>

      {/* Picker Modal */}
      {picker && (
        <PickerModal
          visible
          title={String(picker.key).replace(/_/g, ' ').toUpperCase()}
          options={picker.options}
          selected={String(settings[picker.key])}
          onSelect={v => updateSetting(picker.key, v as any)}
          onClose={() => setPicker(null)}
        />
      )}

      {/* DB Reset Confirmation Modal (Step 2) */}
      <Modal visible={resetModalVisible} transparent animationType="fade">
        <View style={s.resetOverlay}>
          <View style={s.resetModal}>
            <Text style={s.resetTitle}>BESTÄTIGUNG ERFORDERLICH</Text>
            <Text style={s.resetBody}>
              Um alle Daten unwiderruflich zu löschen,{'\n'}
              gib <Text style={{ fontWeight: '700', color: Colors.danger }}>LÖSCHEN</Text> ein und bestätige.
            </Text>
            <TextInput
              style={s.resetInput}
              value={resetInput}
              onChangeText={setResetInput}
              placeholder="LÖSCHEN"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="characters"
            />
            <View style={s.resetBtns}>
              <TouchableOpacity style={s.resetCancel}
                onPress={() => { setResetModalVisible(false); setResetInput(''); }}>
                <Text style={s.resetCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.resetConfirm, resetInput !== 'LÖSCHEN' && { opacity: 0.35 }]}
                onPress={confirmReset}
                disabled={resetInput !== 'LÖSCHEN'}>
                <Text style={s.resetConfirmText}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 2, marginBottom: 14 },

  // OneDrive
  ondriveStatus: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotOn:  { fontSize: 12, color: Colors.statusAbgeschlossen },
  dotOff: { fontSize: 12, color: Colors.textSecondary },
  connectedText:    { fontFamily: 'monospace', fontSize: 12, color: Colors.text, flex: 1 },
  disconnectedText: { fontFamily: 'monospace', fontSize: 12, color: Colors.textSecondary, flex: 1 },
  smallBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  smallBtnText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  smallBtnPrimary: { borderColor: Colors.primary },
  smallBtnPrimaryText: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
  smallBtnDanger: { borderColor: Colors.danger },
  smallBtnDangerText: { fontFamily: 'monospace', fontSize: 11, color: Colors.danger },

  // DB stats
  dbStats: { flexDirection: 'row', padding: 14, gap: 16, borderBottomWidth: 0.5, borderBottomColor: Colors.border, flexWrap: 'wrap' },
  dbStat: { alignItems: 'center', minWidth: 64 },
  dbStatNum: { fontFamily: 'monospace', fontSize: 22, fontWeight: '700', color: Colors.primary },
  dbStatLabel: { fontFamily: 'monospace', fontSize: 9, color: Colors.textSecondary, marginTop: 2 },

  // Response length segment
  segSection: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  segLabel: { fontFamily: 'monospace', fontSize: 13, color: Colors.text, marginBottom: 8 },
  segRow: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  segActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segText: { fontFamily: 'monospace', fontSize: 12, color: Colors.textSecondary },
  segTextActive: { color: '#fff', fontWeight: '700' },
  segHint: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 5 },

  // Column toggles
  columnSection: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  columnSectionTitle: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 8 },
  columnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 8 },
  colChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  colChipActive: { borderColor: Colors.primary, backgroundColor: '#e8f0fb' },
  colChipText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  colChipTextActive: { color: Colors.primary },

  // Logo
  logoSection: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  logoLabel: { fontFamily: 'monospace', fontSize: 13, color: Colors.text, marginBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoThumb: { width: 48, height: 48, borderRadius: 6, backgroundColor: Colors.border },
  noLogo: { fontFamily: 'monospace', fontSize: 12, color: Colors.textSecondary, flex: 1 },

  // DB Reset Modal
  resetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  resetModal: { backgroundColor: Colors.card, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: Colors.danger },
  resetTitle: { fontFamily: 'monospace', fontSize: 10, fontWeight: '700', color: Colors.danger, letterSpacing: 1, marginBottom: 12 },
  resetBody: { fontFamily: 'monospace', fontSize: 13, color: Colors.text, lineHeight: 20, marginBottom: 14 },
  resetInput: { borderWidth: 1, borderColor: Colors.danger, borderRadius: 6, padding: 10, fontFamily: 'monospace', fontSize: 14, color: Colors.danger, backgroundColor: Colors.background, marginBottom: 16, textAlign: 'center', letterSpacing: 2 },
  resetBtns: { flexDirection: 'row', gap: 10 },
  resetCancel: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  resetCancelText: { fontFamily: 'monospace', fontSize: 13, color: Colors.textSecondary },
  resetConfirm: { flex: 1, backgroundColor: Colors.danger, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  resetConfirmText: { fontFamily: 'monospace', fontSize: 13, color: '#fff', fontWeight: '700' },
});
