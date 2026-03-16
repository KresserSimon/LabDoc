import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getAllVersuche, deleteVersuch, exportAllVersuche,
  type Versuch, type VersuchStatus,
} from '../../lib/db';
import { Colors, getStatusColor } from '../../constants/colors';
import { PROCESSES } from '../../constants/processes';
import StatusBadge from '../../components/StatusBadge';

const STATUS_FILTERS: (VersuchStatus | 'Alle')[] = [
  'Alle', 'Entwurf', 'Aktiv', 'Abgeschlossen', 'Archiviert',
];

const PROCESS_FILTERS = ['Alle', ...PROCESSES.map(p => p.abbr)];

export default function Versuche() {
  const router = useRouter();
  const [versuche, setVersuche] = useState<Versuch[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VersuchStatus | 'Alle'>('Alle');
  const [processFilter, setProcessFilter] = useState('Alle');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getAllVersuche();
    setVersuche(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = versuche.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      v.id.toLowerCase().includes(q) ||
      (v.material ?? '').toLowerCase().includes(q) ||
      (v.bezeichnung ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'Alle' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = (v: Versuch) => {
    Alert.alert('Versuch löschen?', `${v.id} – ${v.bezeichnung ?? ''}`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => { await deleteVersuch(v.id); load(); },
      },
    ]);
  };

  const handleExport = async () => {
    const csv = await exportAllVersuche();
    const file = new File(Paths.cache, 'versuche_export.csv');
    await file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'CSV exportieren' });
  };

  const aktiv = versuche.filter(v => v.status === 'Aktiv').length;
  const abgeschlossen = versuche.filter(v => v.status === 'Abgeschlossen').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <StatChip label="GESAMT" value={versuche.length} color={Colors.textSecondary} />
        <StatChip label="AKTIV" value={aktiv} color={Colors.statusAktiv} />
        <StatChip label="ABGESCHL." value={abgeschlossen} color={Colors.statusAbgeschlossen} />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>↑ CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Suche: ID, Material, Bezeichnung..."
          placeholderTextColor={Colors.textSecondary}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, statusFilter === s && styles.chipActive]}
            onPress={() => setStatusFilter(s as VersuchStatus | 'Alle')}
          >
            <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={v => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Keine Versuche vorhanden</Text>
            <Text style={styles.emptyHint}>Tippe auf „+" um einen neuen Versuch anzulegen</Text>
          </View>
        }
        renderItem={({ item: v }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/versuch/${v.id}`)}
            onLongPress={() => handleDelete(v)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardId}>{v.id}</Text>
              <StatusBadge status={v.status} size="sm" />
            </View>
            {v.bezeichnung ? (
              <Text style={styles.cardTitle}>{v.bezeichnung}</Text>
            ) : null}
            <View style={styles.cardMeta}>
              {v.material ? <Text style={styles.metaTag}>{v.material}</Text> : null}
              {v.dim_x ? (
                <Text style={styles.metaTag}>
                  {v.dim_x}×{v.dim_y}×{v.dim_z} mm
                </Text>
              ) : null}
            </View>
            <Text style={styles.cardDate}>
              {new Date(v.created_at).toLocaleDateString('de-CH')}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.card, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
    gap: 8,
  },
  statChip: { alignItems: 'center', minWidth: 56 },
  statValue: { fontFamily: 'monospace', fontSize: 18, fontWeight: '700' },
  statLabel: { fontFamily: 'monospace', fontSize: 8, color: Colors.textSecondary, letterSpacing: 0.5 },
  exportBtn: {
    marginLeft: 'auto', borderWidth: 1, borderColor: Colors.border,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  exportBtnText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  searchRow: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 13, color: Colors.text,
  },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 6 },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'monospace', fontSize: 11, color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardId: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: Colors.primary },
  cardTitle: { fontFamily: 'monospace', fontSize: 14, color: Colors.text, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaTag: {
    fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary,
    backgroundColor: Colors.background, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  cardDate: { fontFamily: 'monospace', fontSize: 10, color: Colors.textSecondary, marginTop: 6 },
  empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
  emptyText: { fontFamily: 'monospace', fontSize: 16, color: Colors.textSecondary },
  emptyHint: { fontFamily: 'monospace', fontSize: 12, color: Colors.textSecondary },
});
