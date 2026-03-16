export const Colors = {
  primary: '#1a5fa8',
  accent: '#0d7a5f',
  background: '#f4f4f0',
  backgroundDark: '#111111',
  card: '#ffffff',
  border: '#d0d0cc',
  text: '#1a1a1a',
  textSecondary: '#6b6b6b',
  textMono: '#1a1a1a',

  // Status colours
  statusEntwurf: '#8a8a8a',
  statusAktiv: '#1a5fa8',
  statusAbgeschlossen: '#27500a',
  statusArchiviert: '#ba7517',

  // Schritt status
  schrittAusstehend: '#9ca3af',
  schrittInArbeit: '#1a5fa8',
  schrittAbgeschlossen: '#27500a',
  schrittUebersprungen: '#ba7517',

  danger: '#cc2200',
  warning: '#ba7517',
  success: '#27500a',
};

export type StatusColor = typeof Colors;

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Entwurf': return Colors.statusEntwurf;
    case 'Aktiv': return Colors.statusAktiv;
    case 'Abgeschlossen': return Colors.statusAbgeschlossen;
    case 'Archiviert': return Colors.statusArchiviert;
    default: return Colors.statusEntwurf;
  }
}

export function getSchrittStatusColor(status: string): string {
  switch (status) {
    case 'Ausstehend': return Colors.schrittAusstehend;
    case 'In Arbeit': return Colors.schrittInArbeit;
    case 'Abgeschlossen': return Colors.schrittAbgeschlossen;
    case 'Übersprungen': return Colors.schrittUebersprungen;
    default: return Colors.schrittAusstehend;
  }
}

export function getSchrittStatusIcon(status: string): string {
  switch (status) {
    case 'Ausstehend': return '○';
    case 'In Arbeit': return '⟳';
    case 'Abgeschlossen': return '✓';
    case 'Übersprungen': return '–';
    default: return '○';
  }
}
