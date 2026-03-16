export interface AppSettings {
  // OneDrive
  onedrive_db_path: string;
  onedrive_files_path: string;
  onedrive_auto_sync: boolean;
  onedrive_wifi_only: boolean;

  // KI
  ai_model: string;
  ai_response_length: 'kurz' | 'standard' | 'ausfuehrlich';
  ai_language: 'de' | 'en';

  // Standardwerte
  default_material: string;
  default_status: 'Entwurf' | 'Aktiv';
  default_alicona_objektiv: '5x' | '10x' | '20x' | '50x';
  default_alicona_messprogramm: string;
  default_mountainsmap_template: string;
  versuch_id_prefix: string;
  versuch_id_format: 'LAB-YYYY-NNNN' | 'LAB-NNNNNN' | 'YYYY-MM-NNNN';

  // Darstellung
  theme: 'system' | 'light' | 'dark';
  font_size: 'klein' | 'normal' | 'gross';
  compact_list: boolean;
  confirm_delete: boolean;
  haptic_feedback: boolean;
  visible_columns: string[];

  // Export
  default_export_format: 'json' | 'csv' | 'beide';
  pdf_company_name: string;
  pdf_footer: string;
  csv_separator: ';' | ',' | '\t';
  date_format: 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  number_format: 'de' | 'en';

  // Backup
  auto_backup: boolean;
  backup_interval: 'daily' | 'weekly' | 'manual';

  // Benachrichtigungen
  notifications_enabled: boolean;
  notify_open_versuche: boolean;
  notify_open_threshold_days: number;
  notify_sync_errors: boolean;

  // Benutzerrolle
  user_role: 'user' | 'admin';
}

export const DEFAULT_SETTINGS: AppSettings = {
  onedrive_db_path: '/LabDoc/Datenbank/',
  onedrive_files_path: '/LabDoc/Versuche/',
  onedrive_auto_sync: true,
  onedrive_wifi_only: true,
  ai_model: 'claude-sonnet-4-20250514',
  ai_response_length: 'standard',
  ai_language: 'de',
  default_material: 'Stahl 1.4301',
  default_status: 'Aktiv',
  default_alicona_objektiv: '20x',
  default_alicona_messprogramm: '',
  default_mountainsmap_template: '',
  versuch_id_prefix: 'LAB',
  versuch_id_format: 'LAB-YYYY-NNNN',
  theme: 'system',
  font_size: 'normal',
  compact_list: false,
  confirm_delete: true,
  haptic_feedback: true,
  visible_columns: ['id', 'bezeichnung', 'material', 'abmessungen', 'prozesse', 'status', 'datum'],
  default_export_format: 'json',
  pdf_company_name: '',
  pdf_footer: '',
  csv_separator: ';',
  date_format: 'DD.MM.YYYY',
  number_format: 'de',
  auto_backup: false,
  backup_interval: 'weekly',
  notifications_enabled: false,
  notify_open_versuche: false,
  notify_open_threshold_days: 7,
  notify_sync_errors: true,
  user_role: 'user',
};

export const AI_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4 (Empfohlen)' },
  { value: 'claude-opus-4-20250514',   label: 'Opus 4 (Leistungsstark)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (Schnell)' },
];

export const RESPONSE_LENGTH_LABELS: Record<AppSettings['ai_response_length'], string> = {
  kurz: 'Kurz (500 Tokens)',
  standard: 'Standard (1000 Tokens)',
  ausfuehrlich: 'Ausführlich (2000 Tokens)',
};

export const RESPONSE_LENGTH_TOKENS: Record<AppSettings['ai_response_length'], number> = {
  kurz: 500,
  standard: 1000,
  ausfuehrlich: 2000,
};

export const BACKUP_INTERVAL_LABELS: Record<AppSettings['backup_interval'], string> = {
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  manual: 'Manuell',
};

export const ID_FORMAT_LABELS: Record<AppSettings['versuch_id_format'], string> = {
  'LAB-YYYY-NNNN': 'PREFIX-YYYY-NNNN',
  'LAB-NNNNNN': 'PREFIX-NNNNNN',
  'YYYY-MM-NNNN': 'YYYY-MM-NNNN',
};
