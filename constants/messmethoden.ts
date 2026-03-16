export type MessMethode = 'Alicona' | 'Mountainsmap' | 'Sonstige';
export type AliconaObjektiv = '5x' | '10x' | '20x' | '50x';

export interface KennWert {
  name: string;
  wert: string;
  einheit: string;
}

export interface AliconaMessung {
  objektiv: AliconaObjektiv;
  messprogramm: string;
  ra?: number;
  rz?: number;
  rmax?: number;
  rsm?: number;
  sa?: number;
  sz?: number;
  weitere_werte: KennWert[];
}

export interface MountainsmapMessung {
  template_name: string;
  weitere_werte: KennWert[];
}

export interface SonstigeMessung {
  methoden_name: string;
  weitere_werte: KennWert[];
}

export interface MessDatei {
  id: number;
  datei_typ: 'al3d' | 'bmp' | 'pdf' | 'bild' | 'sonstige';
  filename: string;
  local_path?: string;
  onedrive_path?: string;
  size_kb?: number;
}

export interface Messmessung {
  id: number;
  versuch_id: string;
  schritt_id?: number | null;
  methode: MessMethode;
  bezeichnung?: string;
  notizen?: string;
  created_at: string;
  alicona?: AliconaMessung;
  mountainsmap?: MountainsmapMessung;
  sonstige?: SonstigeMessung;
  dateien: MessDatei[];
}

export const ALICONA_OBJEKTIVE: AliconaObjektiv[] = ['5x', '10x', '20x', '50x'];

export const METHODE_LABELS: Record<MessMethode, string> = {
  Alicona: 'Alicona InfiniteFocusSL',
  Mountainsmap: 'Auswertesoftware Mountainsmap',
  Sonstige: 'Sonstige Methode',
};

export const METHODE_COLORS: Record<MessMethode, string> = {
  Alicona: '#1a5fa8',
  Mountainsmap: '#0d7a5f',
  Sonstige: '#ba7517',
};

export const DATEI_ICONS: Record<string, string> = {
  al3d: '📐',
  bmp: '🖼',
  pdf: '📄',
  bild: '🖼',
  sonstige: '📎',
};
