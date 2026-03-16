/**
 * Web/Electron-compatible SQLite implementation using the Origin Private File System (OPFS)
 * via the @op-engineering/op-sqlite or a simple IndexedDB-backed store.
 *
 * For Electron, we use a lightweight in-memory + localStorage persistence strategy
 * since expo-sqlite is native-only.
 *
 * This file is automatically used instead of db.ts when bundling for web (metro resolver).
 */

// ─── Types (re-exported so imports work identically) ────────────────────────

export type VersuchStatus = 'Entwurf' | 'Aktiv' | 'Abgeschlossen' | 'Archiviert';
export type SchrittStatus = 'Ausstehend' | 'In Arbeit' | 'Abgeschlossen' | 'Übersprungen';

export interface Versuch {
  id: string;
  bezeichnung?: string;
  material?: string;
  dim_x?: number;
  dim_y?: number;
  dim_z?: number;
  status: VersuchStatus;
  notizen?: string;
  created_at: string;
  updated_at: string;
}

export interface Prozessschritt {
  id: number;
  versuch_id: string;
  position: number;
  schritt_name: string;
  process_name?: string;
  process_abbr?: string;
  machine?: string;
  status: SchrittStatus;
  notizen?: string;
  created_at: string;
  parameter_values: ParameterValue[];
  messwerte?: Messwert[];
  bilder?: Bild[];
}

export interface ParameterValue {
  id?: number;
  schritt_id?: number;
  param_name: string;
  param_value: string;
}

export interface Messwert {
  id?: number;
  versuch_id: string;
  schritt_id?: number | null;
  name: string;
  wert: string;
  einheit: string;
  created_at: string;
}

export interface Bild {
  id?: number;
  versuch_id: string;
  schritt_id?: number | null;
  filename: string;
  local_path: string;
  onedrive_path?: string;
  created_at: string;
}

export interface PDF {
  id?: number;
  versuch_id: string;
  filename: string;
  local_path: string;
  typ?: string;
  size_kb?: number;
  onedrive_path?: string;
  created_at: string;
}

// ─── LocalStorage-backed store ───────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`labdoc_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(`labdoc_${key}`, JSON.stringify(value)); } catch {}
}

let _nextId = load<number>('_nextId', 1);
function nextId(): number {
  const id = _nextId++;
  save('_nextId', _nextId);
  return id;
}

// ─── Init ───────────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  // Nothing to do for localStorage backend
}

export async function resetDB(): Promise<void> {
  const keys = ['versuche', 'prozessschritte', 'parameter_values', 'messwerte', 'bilder', 'pdfs', '_nextId'];
  keys.forEach(k => localStorage.removeItem(`labdoc_${k}`));
  _nextId = 1;
}

// ─── ID Generation ──────────────────────────────────────────────────────────

export function generateVersuchId(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `LAB-${year}-${num}`;
}

// ─── Versuche ───────────────────────────────────────────────────────────────

export async function getAllVersuche(): Promise<Versuch[]> {
  return load<Versuch[]>('versuche', []).sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );
}

export async function getVersuchById(id: string): Promise<Versuch | null> {
  return load<Versuch[]>('versuche', []).find(v => v.id === id) ?? null;
}

export async function insertVersuch(v: Omit<Versuch, 'created_at' | 'updated_at'>): Promise<void> {
  const now = new Date().toISOString();
  const list = load<Versuch[]>('versuche', []);
  list.push({ ...v, created_at: now, updated_at: now });
  save('versuche', list);
}

export async function updateVersuch(v: Partial<Versuch> & { id: string }): Promise<void> {
  const now = new Date().toISOString();
  const list = load<Versuch[]>('versuche', []).map(x =>
    x.id === v.id ? { ...x, ...v, updated_at: now } : x
  );
  save('versuche', list);
}

export async function deleteVersuch(id: string): Promise<void> {
  save('versuche', load<Versuch[]>('versuche', []).filter(v => v.id !== id));
  // Cascade
  const schritte = load<Prozessschritt[]>('prozessschritte', []).filter(s => s.versuch_id === id);
  schritte.forEach(s => {
    save('parameter_values', load<ParameterValue[]>('parameter_values', []).filter(p => p.schritt_id !== s.id));
    save('messwerte', load<Messwert[]>('messwerte', []).filter(m => m.schritt_id !== s.id));
    save('bilder', load<Bild[]>('bilder', []).filter(b => b.schritt_id !== s.id));
  });
  save('prozessschritte', load<Prozessschritt[]>('prozessschritte', []).filter(s => s.versuch_id !== id));
  save('messwerte', load<Messwert[]>('messwerte', []).filter(m => m.versuch_id !== id));
  save('bilder', load<Bild[]>('bilder', []).filter(b => b.versuch_id !== id));
  save('pdfs', load<PDF[]>('pdfs', []).filter(p => p.versuch_id !== id));
}

// ─── Prozessschritte ────────────────────────────────────────────────────────

export async function getSchritteForVersuch(versuch_id: string): Promise<Prozessschritt[]> {
  const schritte = load<Prozessschritt[]>('prozessschritte', [])
    .filter(s => s.versuch_id === versuch_id)
    .sort((a, b) => a.position - b.position);

  return schritte.map(s => ({
    ...s,
    parameter_values: load<ParameterValue[]>('parameter_values', []).filter(p => p.schritt_id === s.id),
    messwerte: load<Messwert[]>('messwerte', []).filter(m => m.schritt_id === s.id),
    bilder: load<Bild[]>('bilder', []).filter(b => b.schritt_id === s.id),
  }));
}

export async function insertSchritt(
  s: Omit<Prozessschritt, 'id' | 'parameter_values' | 'messwerte' | 'bilder' | 'created_at'>
): Promise<number> {
  const id = nextId();
  const now = new Date().toISOString();
  const list = load<Prozessschritt[]>('prozessschritte', []);
  list.push({ ...s, id, created_at: now, parameter_values: [] });
  save('prozessschritte', list);
  return id;
}

export async function updateSchritt(s: Partial<Prozessschritt> & { id: number }): Promise<void> {
  const list = load<Prozessschritt[]>('prozessschritte', []).map(x =>
    x.id === s.id ? { ...x, ...s } : x
  );
  save('prozessschritte', list);
}

export async function deleteSchritt(id: number): Promise<void> {
  save('prozessschritte', load<Prozessschritt[]>('prozessschritte', []).filter(s => s.id !== id));
  save('parameter_values', load<ParameterValue[]>('parameter_values', []).filter(p => p.schritt_id !== id));
  save('messwerte', load<Messwert[]>('messwerte', []).filter(m => m.schritt_id !== id));
  save('bilder', load<Bild[]>('bilder', []).filter(b => b.schritt_id !== id));
}

export async function reorderSchritte(schrittIds: number[]): Promise<void> {
  const list = load<Prozessschritt[]>('prozessschritte', []).map(s => {
    const idx = schrittIds.indexOf(s.id);
    return idx >= 0 ? { ...s, position: idx + 1 } : s;
  });
  save('prozessschritte', list);
}

// ─── Parameter Values ────────────────────────────────────────────────────────

export async function upsertParameterValues(schritt_id: number, params: ParameterValue[]): Promise<void> {
  const list = load<ParameterValue[]>('parameter_values', []).filter(p => p.schritt_id !== schritt_id);
  params.filter(p => p.param_value.trim()).forEach(p => {
    list.push({ id: nextId(), schritt_id, param_name: p.param_name, param_value: p.param_value });
  });
  save('parameter_values', list);
}

// ─── Messwerte ───────────────────────────────────────────────────────────────

export async function getMesswerteForVersuch(versuch_id: string): Promise<Messwert[]> {
  return load<Messwert[]>('messwerte', []).filter(m => m.versuch_id === versuch_id);
}

export async function insertMesswert(m: Omit<Messwert, 'id' | 'created_at'>): Promise<void> {
  const list = load<Messwert[]>('messwerte', []);
  list.push({ ...m, id: nextId(), created_at: new Date().toISOString() });
  save('messwerte', list);
}

export async function deleteMesswert(id: number): Promise<void> {
  save('messwerte', load<Messwert[]>('messwerte', []).filter(m => m.id !== id));
}

// ─── Bilder ──────────────────────────────────────────────────────────────────

export async function getBilderForVersuch(versuch_id: string): Promise<Bild[]> {
  return load<Bild[]>('bilder', []).filter(b => b.versuch_id === versuch_id);
}

export async function insertBild(b: Omit<Bild, 'id' | 'created_at'>): Promise<void> {
  const list = load<Bild[]>('bilder', []);
  list.push({ ...b, id: nextId(), created_at: new Date().toISOString() });
  save('bilder', list);
}

export async function deleteBild(id: number): Promise<void> {
  save('bilder', load<Bild[]>('bilder', []).filter(b => b.id !== id));
}

export async function updateBildOnedrivePath(id: number, path: string): Promise<void> {
  save('bilder', load<Bild[]>('bilder', []).map(b => b.id === id ? { ...b, onedrive_path: path } : b));
}

// ─── PDFs ────────────────────────────────────────────────────────────────────

export async function getPDFsForVersuch(versuch_id: string): Promise<PDF[]> {
  return load<PDF[]>('pdfs', []).filter(p => p.versuch_id === versuch_id);
}

export async function insertPDF(p: Omit<PDF, 'id' | 'created_at'>): Promise<void> {
  const list = load<PDF[]>('pdfs', []);
  list.push({ ...p, id: nextId(), created_at: new Date().toISOString() });
  save('pdfs', list);
}

export async function deletePDF(id: number): Promise<void> {
  save('pdfs', load<PDF[]>('pdfs', []).filter(p => p.id !== id));
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportVersuchAsJSON(id: string): Promise<string> {
  const versuch = await getVersuchById(id);
  if (!versuch) throw new Error('Versuch nicht gefunden');
  const schritte = await getSchritteForVersuch(id);
  const messwerte = await getMesswerteForVersuch(id);
  const bilder = await getBilderForVersuch(id);
  const pdfs = await getPDFsForVersuch(id);
  return JSON.stringify({ versuch, schritte, messwerte, bilder, pdfs }, null, 2);
}

export async function exportAllVersuche(): Promise<string> {
  const versuche = await getAllVersuche();
  const rows = versuche.map(v =>
    [v.id, v.bezeichnung, v.material, v.dim_x, v.dim_y, v.dim_z, v.status, v.created_at].join(';')
  );
  return ['ID;Bezeichnung;Material;Dim_X;Dim_Y;Dim_Z;Status;Erstellt', ...rows].join('\n');
}

export default null;
