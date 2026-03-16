import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('labdoc.db');

// ─── Schema Init ────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS versuche (
      id TEXT PRIMARY KEY,
      bezeichnung TEXT,
      material TEXT,
      dim_x REAL,
      dim_y REAL,
      dim_z REAL,
      status TEXT DEFAULT 'Entwurf',
      notizen TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS prozessschritte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      versuch_id TEXT REFERENCES versuche(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      schritt_name TEXT NOT NULL,
      process_name TEXT,
      process_abbr TEXT,
      machine TEXT,
      status TEXT DEFAULT 'Ausstehend',
      notizen TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS parameter_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schritt_id INTEGER REFERENCES prozessschritte(id) ON DELETE CASCADE,
      param_name TEXT,
      param_value TEXT
    );

    CREATE TABLE IF NOT EXISTS messwerte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      versuch_id TEXT REFERENCES versuche(id) ON DELETE CASCADE,
      schritt_id INTEGER REFERENCES prozessschritte(id) ON DELETE SET NULL,
      name TEXT,
      wert TEXT,
      einheit TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bilder (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      versuch_id TEXT REFERENCES versuche(id) ON DELETE CASCADE,
      schritt_id INTEGER REFERENCES prozessschritte(id) ON DELETE SET NULL,
      filename TEXT,
      local_path TEXT,
      onedrive_path TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pdfs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      versuch_id TEXT REFERENCES versuche(id) ON DELETE CASCADE,
      filename TEXT,
      local_path TEXT,
      typ TEXT,
      size_kb REAL,
      onedrive_path TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messmessungen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      versuch_id TEXT NOT NULL REFERENCES versuche(id) ON DELETE CASCADE,
      schritt_id INTEGER REFERENCES prozessschritte(id) ON DELETE SET NULL,
      methode TEXT NOT NULL,
      bezeichnung TEXT,
      notizen TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS alicona_messungen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messung_id INTEGER NOT NULL REFERENCES messmessungen(id) ON DELETE CASCADE,
      objektiv TEXT NOT NULL,
      messprogramm TEXT,
      ra REAL, rz REAL, rmax REAL, rsm REAL, sa REAL, sz REAL,
      weitere_werte TEXT
    );

    CREATE TABLE IF NOT EXISTS mountainsmap_messungen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messung_id INTEGER NOT NULL REFERENCES messmessungen(id) ON DELETE CASCADE,
      template_name TEXT,
      weitere_werte TEXT
    );

    CREATE TABLE IF NOT EXISTS sonstige_messungen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messung_id INTEGER NOT NULL REFERENCES messmessungen(id) ON DELETE CASCADE,
      methoden_name TEXT,
      weitere_werte TEXT
    );

    CREATE TABLE IF NOT EXISTS messung_dateien (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messung_id INTEGER NOT NULL REFERENCES messmessungen(id) ON DELETE CASCADE,
      datei_typ TEXT NOT NULL,
      filename TEXT NOT NULL,
      local_path TEXT,
      onedrive_path TEXT,
      size_kb REAL,
      created_at TEXT
    );
  `);
}

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── ID Generation ──────────────────────────────────────────────────────────

export function generateVersuchId(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `LAB-${year}-${num}`;
}

// ─── Versuche CRUD ──────────────────────────────────────────────────────────

export async function getAllVersuche(): Promise<Versuch[]> {
  return db.getAllAsync<Versuch>('SELECT * FROM versuche ORDER BY created_at DESC');
}

export async function getVersuchById(id: string): Promise<Versuch | null> {
  return db.getFirstAsync<Versuch>('SELECT * FROM versuche WHERE id = ?', [id]);
}

export async function insertVersuch(v: Omit<Versuch, 'created_at' | 'updated_at'>): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO versuche (id, bezeichnung, material, dim_x, dim_y, dim_z, status, notizen, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.id, v.bezeichnung ?? null, v.material ?? null, v.dim_x ?? null,
     v.dim_y ?? null, v.dim_z ?? null, v.status, v.notizen ?? null, now, now]
  );
}

export async function updateVersuch(v: Partial<Versuch> & { id: string }): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE versuche SET bezeichnung=?, material=?, dim_x=?, dim_y=?, dim_z=?,
     status=?, notizen=?, updated_at=? WHERE id=?`,
    [v.bezeichnung ?? null, v.material ?? null, v.dim_x ?? null, v.dim_y ?? null,
     v.dim_z ?? null, v.status ?? 'Entwurf', v.notizen ?? null, now, v.id]
  );
}

export async function deleteVersuch(id: string): Promise<void> {
  await db.runAsync('DELETE FROM versuche WHERE id = ?', [id]);
}

// ─── Prozessschritte CRUD ───────────────────────────────────────────────────

export async function getSchritteForVersuch(versuch_id: string): Promise<Prozessschritt[]> {
  const schritte = await db.getAllAsync<Omit<Prozessschritt, 'parameter_values' | 'messwerte' | 'bilder'>>(
    'SELECT * FROM prozessschritte WHERE versuch_id = ? ORDER BY position ASC',
    [versuch_id]
  );

  const result: Prozessschritt[] = [];
  for (const s of schritte) {
    const params = await db.getAllAsync<ParameterValue>(
      'SELECT * FROM parameter_values WHERE schritt_id = ?', [s.id]
    );
    const messwerte = await db.getAllAsync<Messwert>(
      'SELECT * FROM messwerte WHERE schritt_id = ?', [s.id]
    );
    const bilder = await db.getAllAsync<Bild>(
      'SELECT * FROM bilder WHERE schritt_id = ?', [s.id]
    );
    result.push({ ...s, parameter_values: params, messwerte, bilder });
  }
  return result;
}

export async function insertSchritt(
  s: Omit<Prozessschritt, 'id' | 'parameter_values' | 'messwerte' | 'bilder' | 'created_at'>
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO prozessschritte (versuch_id, position, schritt_name, process_name, process_abbr, machine, status, notizen, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.versuch_id, s.position, s.schritt_name, s.process_name ?? null,
     s.process_abbr ?? null, s.machine ?? null, s.status, s.notizen ?? null, now]
  );
  return result.lastInsertRowId;
}

export async function updateSchritt(s: Partial<Prozessschritt> & { id: number }): Promise<void> {
  await db.runAsync(
    `UPDATE prozessschritte SET schritt_name=?, process_name=?, process_abbr=?, machine=?,
     status=?, notizen=?, position=? WHERE id=?`,
    [s.schritt_name ?? '', s.process_name ?? null, s.process_abbr ?? null,
     s.machine ?? null, s.status ?? 'Ausstehend', s.notizen ?? null, s.position ?? 1, s.id]
  );
}

export async function deleteSchritt(id: number): Promise<void> {
  await db.runAsync('DELETE FROM prozessschritte WHERE id = ?', [id]);
}

export async function reorderSchritte(schrittIds: number[]): Promise<void> {
  for (let i = 0; i < schrittIds.length; i++) {
    await db.runAsync('UPDATE prozessschritte SET position = ? WHERE id = ?', [i + 1, schrittIds[i]]);
  }
}

// ─── Parameter Values CRUD ──────────────────────────────────────────────────

export async function upsertParameterValues(schritt_id: number, params: ParameterValue[]): Promise<void> {
  await db.runAsync('DELETE FROM parameter_values WHERE schritt_id = ?', [schritt_id]);
  for (const p of params) {
    if (p.param_value.trim()) {
      await db.runAsync(
        'INSERT INTO parameter_values (schritt_id, param_name, param_value) VALUES (?, ?, ?)',
        [schritt_id, p.param_name, p.param_value]
      );
    }
  }
}

// ─── Messwerte CRUD ─────────────────────────────────────────────────────────

export async function getMesswerteForVersuch(versuch_id: string): Promise<Messwert[]> {
  return db.getAllAsync<Messwert>(
    'SELECT * FROM messwerte WHERE versuch_id = ? ORDER BY created_at DESC',
    [versuch_id]
  );
}

export async function insertMesswert(m: Omit<Messwert, 'id' | 'created_at'>): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO messwerte (versuch_id, schritt_id, name, wert, einheit, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [m.versuch_id, m.schritt_id ?? null, m.name, m.wert, m.einheit, now]
  );
}

export async function deleteMesswert(id: number): Promise<void> {
  await db.runAsync('DELETE FROM messwerte WHERE id = ?', [id]);
}

// ─── Bilder CRUD ────────────────────────────────────────────────────────────

export async function getBilderForVersuch(versuch_id: string): Promise<Bild[]> {
  return db.getAllAsync<Bild>(
    'SELECT * FROM bilder WHERE versuch_id = ? ORDER BY created_at DESC',
    [versuch_id]
  );
}

export async function insertBild(b: Omit<Bild, 'id' | 'created_at'>): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO bilder (versuch_id, schritt_id, filename, local_path, onedrive_path, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [b.versuch_id, b.schritt_id ?? null, b.filename, b.local_path, b.onedrive_path ?? null, now]
  );
}

export async function deleteBild(id: number): Promise<void> {
  await db.runAsync('DELETE FROM bilder WHERE id = ?', [id]);
}

export async function updateBildOnedrivePath(id: number, path: string): Promise<void> {
  await db.runAsync('UPDATE bilder SET onedrive_path = ? WHERE id = ?', [path, id]);
}

// ─── PDFs CRUD ──────────────────────────────────────────────────────────────

export async function getPDFsForVersuch(versuch_id: string): Promise<PDF[]> {
  return db.getAllAsync<PDF>(
    'SELECT * FROM pdfs WHERE versuch_id = ? ORDER BY created_at DESC',
    [versuch_id]
  );
}

export async function insertPDF(p: Omit<PDF, 'id' | 'created_at'>): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO pdfs (versuch_id, filename, local_path, typ, size_kb, onedrive_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [p.versuch_id, p.filename, p.local_path, p.typ ?? null, p.size_kb ?? null, p.onedrive_path ?? null, now]
  );
}

export async function deletePDF(id: number): Promise<void> {
  await db.runAsync('DELETE FROM pdfs WHERE id = ?', [id]);
}

// ─── Export ─────────────────────────────────────────────────────────────────

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
    [v.id, v.bezeichnung, v.material, v.dim_x, v.dim_y, v.dim_z,
     v.status, v.created_at].join(';')
  );
  const header = 'ID;Bezeichnung;Material;Dim_X;Dim_Y;Dim_Z;Status;Erstellt';
  return [header, ...rows].join('\n');
}

// ─── Messmessungen CRUD ─────────────────────────────────────────────────────

import type { Messmessung, MessDatei, AliconaMessung, MountainsmapMessung, SonstigeMessung } from '../constants/messmethoden';

async function loadMessungDetails(m: { id: number; methode: string }): Promise<Partial<Messmessung>> {
  if (m.methode === 'Alicona') {
    const row = await db.getFirstAsync<any>('SELECT * FROM alicona_messungen WHERE messung_id = ?', [m.id]);
    if (row) {
      const alicona: AliconaMessung = {
        objektiv: row.objektiv,
        messprogramm: row.messprogramm ?? '',
        ra: row.ra ?? undefined, rz: row.rz ?? undefined, rmax: row.rmax ?? undefined,
        rsm: row.rsm ?? undefined, sa: row.sa ?? undefined, sz: row.sz ?? undefined,
        weitere_werte: row.weitere_werte ? JSON.parse(row.weitere_werte) : [],
      };
      return { alicona };
    }
  } else if (m.methode === 'Mountainsmap') {
    const row = await db.getFirstAsync<any>('SELECT * FROM mountainsmap_messungen WHERE messung_id = ?', [m.id]);
    if (row) {
      const mountainsmap: MountainsmapMessung = {
        template_name: row.template_name ?? '',
        weitere_werte: row.weitere_werte ? JSON.parse(row.weitere_werte) : [],
      };
      return { mountainsmap };
    }
  } else {
    const row = await db.getFirstAsync<any>('SELECT * FROM sonstige_messungen WHERE messung_id = ?', [m.id]);
    if (row) {
      const sonstige: SonstigeMessung = {
        methoden_name: row.methoden_name ?? '',
        weitere_werte: row.weitere_werte ? JSON.parse(row.weitere_werte) : [],
      };
      return { sonstige };
    }
  }
  return {};
}

export async function getMeasurementsByVersuch(versuch_id: string): Promise<Messmessung[]> {
  const rows = await db.getAllAsync<any>('SELECT * FROM messmessungen WHERE versuch_id = ? ORDER BY created_at ASC', [versuch_id]);
  return Promise.all(rows.map(async r => {
    const details = await loadMessungDetails(r);
    const dateien = await db.getAllAsync<MessDatei>('SELECT * FROM messung_dateien WHERE messung_id = ?', [r.id]);
    return { ...r, ...details, dateien } as Messmessung;
  }));
}

export async function getMeasurementsBySchritt(schritt_id: number): Promise<Messmessung[]> {
  const rows = await db.getAllAsync<any>('SELECT * FROM messmessungen WHERE schritt_id = ? ORDER BY created_at ASC', [schritt_id]);
  return Promise.all(rows.map(async r => {
    const details = await loadMessungDetails(r);
    const dateien = await db.getAllAsync<MessDatei>('SELECT * FROM messung_dateien WHERE messung_id = ?', [r.id]);
    return { ...r, ...details, dateien } as Messmessung;
  }));
}

export async function createMeasurement(data: Omit<Messmessung, 'id' | 'created_at'>): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO messmessungen (versuch_id, schritt_id, methode, bezeichnung, notizen, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.versuch_id, data.schritt_id ?? null, data.methode, data.bezeichnung ?? null, data.notizen ?? null, now, now]
  );
  const id = result.lastInsertRowId;
  if (data.methode === 'Alicona' && data.alicona) {
    const a = data.alicona;
    await db.runAsync(
      `INSERT INTO alicona_messungen (messung_id, objektiv, messprogramm, ra, rz, rmax, rsm, sa, sz, weitere_werte)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, a.objektiv, a.messprogramm ?? null, a.ra ?? null, a.rz ?? null, a.rmax ?? null,
       a.rsm ?? null, a.sa ?? null, a.sz ?? null, JSON.stringify(a.weitere_werte ?? [])]
    );
  } else if (data.methode === 'Mountainsmap' && data.mountainsmap) {
    const mm = data.mountainsmap;
    await db.runAsync(
      `INSERT INTO mountainsmap_messungen (messung_id, template_name, weitere_werte) VALUES (?, ?, ?)`,
      [id, mm.template_name ?? null, JSON.stringify(mm.weitere_werte ?? [])]
    );
  } else if (data.methode === 'Sonstige' && data.sonstige) {
    const s = data.sonstige;
    await db.runAsync(
      `INSERT INTO sonstige_messungen (messung_id, methoden_name, weitere_werte) VALUES (?, ?, ?)`,
      [id, s.methoden_name ?? null, JSON.stringify(s.weitere_werte ?? [])]
    );
  }
  return id;
}

export async function updateMeasurement(id: number, data: Partial<Messmessung>): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE messmessungen SET bezeichnung=?, notizen=?, updated_at=? WHERE id=?`,
    [data.bezeichnung ?? null, data.notizen ?? null, now, id]
  );
  if (data.alicona) {
    const a = data.alicona;
    await db.runAsync(
      `UPDATE alicona_messungen SET objektiv=?, messprogramm=?, ra=?, rz=?, rmax=?, rsm=?, sa=?, sz=?, weitere_werte=? WHERE messung_id=?`,
      [a.objektiv, a.messprogramm ?? null, a.ra ?? null, a.rz ?? null, a.rmax ?? null,
       a.rsm ?? null, a.sa ?? null, a.sz ?? null, JSON.stringify(a.weitere_werte ?? []), id]
    );
  } else if (data.mountainsmap) {
    const mm = data.mountainsmap;
    await db.runAsync(
      `UPDATE mountainsmap_messungen SET template_name=?, weitere_werte=? WHERE messung_id=?`,
      [mm.template_name ?? null, JSON.stringify(mm.weitere_werte ?? []), id]
    );
  } else if (data.sonstige) {
    const s = data.sonstige;
    await db.runAsync(
      `UPDATE sonstige_messungen SET methoden_name=?, weitere_werte=? WHERE messung_id=?`,
      [s.methoden_name ?? null, JSON.stringify(s.weitere_werte ?? []), id]
    );
  }
}

export async function deleteMeasurement(id: number): Promise<void> {
  await db.runAsync('DELETE FROM messmessungen WHERE id = ?', [id]);
}

export async function addMessungDatei(messung_id: number, datei: Omit<MessDatei, 'id'>): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO messung_dateien (messung_id, datei_typ, filename, local_path, onedrive_path, size_kb, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [messung_id, datei.datei_typ, datei.filename, datei.local_path ?? null,
     datei.onedrive_path ?? null, datei.size_kb ?? null, now]
  );
  return result.lastInsertRowId;
}

export async function deleteMessungDatei(datei_id: number): Promise<void> {
  await db.runAsync('DELETE FROM messung_dateien WHERE id = ?', [datei_id]);
}

// ─── DB Reset ───────────────────────────────────────────────────────────────

export async function resetDB(): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS messung_dateien;
    DROP TABLE IF EXISTS sonstige_messungen;
    DROP TABLE IF EXISTS mountainsmap_messungen;
    DROP TABLE IF EXISTS alicona_messungen;
    DROP TABLE IF EXISTS messmessungen;
    DROP TABLE IF EXISTS pdfs;
    DROP TABLE IF EXISTS bilder;
    DROP TABLE IF EXISTS messwerte;
    DROP TABLE IF EXISTS parameter_values;
    DROP TABLE IF EXISTS prozessschritte;
    DROP TABLE IF EXISTS versuche;
  `);
  await initDB();
}

export default db;
