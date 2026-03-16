export interface ProcessDef {
  name: string;
  abbr: string;
  machines: string[];
  params: string[];
}

export const PROCESSES: ProcessDef[] = [
  {
    name: 'Microblasting', abbr: 'MB300',
    machines: ['SRT 100 MB', 'C80 MB', 'S80', 'SDT100', 'SDT150',
               'MEC SB-125100100 SPL', 'MEC SB-151310-4 SPL',
               'JCK DJQL350-1DGW', 'JCK-DJQL350-4DGW'],
    params: ['Media', 'Mediasize', 'Amount of Nozzle', 'Size of Nozzle',
             'Pressure [Bar]', 'Rotationspeed [mm/min]',
             'Vertical Movement [mm/rotation]', 'Distance [mm]',
             'Flowrate [l/min]', 'Amount of media in Redosing',
             'Height of part [mm]', 'Diameter of Part [mm]'],
  },
  {
    name: 'Glassbeadblasting', abbr: 'GB250',
    machines: ['SRT 100 GB', 'C80 GB', 'S80', 'SDT100', 'SDT150',
               'MEC SB-125100100 SPL', 'MEC SB-151310-4 SPL',
               'JCK DJQL350-1DGW', 'JCK-DJQL350-4DGW'],
    params: ['Media', 'Mediasize', 'Amount of Nozzle', 'Size of Nozzle',
             'Pressure [Bar]', 'Rotationspeed [mm/min]',
             'Vertical Movement [mm/rotation]', 'Distance [mm]',
             'Flowrate [l/min]', 'Amount of media in Redosing',
             'Height of part [mm]', 'Diameter of Part [mm]'],
  },
  {
    name: 'Caldera (µSP)', abbr: 'µSP',
    machines: ['FUJI', '150 PB', '90PB'],
    params: ['Media', 'Mediasize', 'Amount of Nozzle', 'Size of Nozzle',
             'Pressure [Bar]', 'Movementspeed [mm/min]', 'Distance [mm]'],
  },
  {
    name: 'Wetblasting', abbr: 'WB306',
    machines: ['Graf Compact 1.25m'],
    params: ['Media', 'Mediasize', 'Amount of Nozzle', 'Size of Nozzle',
             'Pressure [Bar]', 'Rotationspeed [mm/min]',
             'Vertical Movement [mm/rotation]', 'Distance [mm]',
             'Waterpumpspeed [%]'],
  },
  {
    name: 'Brushing', abbr: 'BP110',
    machines: ['Steinbrenner Brush', 'Kadia', 'Nagel'],
    params: ['Media', 'Mediasize', 'Amount of Brushes',
             'Diameter of Brush [mm]', 'Width of Brush [mm]',
             'Rotationspeed of Brush [1/min]',
             'Rotationspeed of Satellite [1/min]',
             'Rotationspeed of Tool [1/min]'],
  },
  {
    name: 'Dragfinish', abbr: 'DF',
    machines: ['OTEC DF3-4'],
    params: ['Media', 'Mediasize', 'Immersion Depth [mm]',
             'Spindle Rotation Speed [1/min]', 'Rotation of Head [1/min]',
             'Time [min]', 'Ratio CW/CCW'],
  },
  {
    name: 'Vibratoryfinish', abbr: 'VF',
    machines: ['Rösler M1', 'Rösler RDL 125', 'Walther Trowal MV25'],
    params: ['Media', 'Mediasize', 'Fillamount', 'Time [h]', 'Additive',
             'Motorspeed [1/min]', 'Motorangle [°]', 'Motorweight [kg]',
             'Motor - Eccentric weight [%]', 'Ratio CW/CCW'],
  },
  {
    name: 'primeTreat', abbr: 'pC',
    machines: ['primeCell'],
    params: ['Media', 'Mediasize', 'Brushspeed [1/min]', 'Brushdiameter',
             'Bristlediameter', 'Brushangle', 'Brushengagementdepth',
             'Rotationspeed of Satellite [1/min]',
             'Rotationspeed of Tool [1/min]', 'Vertical Movement [mm/min]'],
  },
  {
    name: 'Streamfinish', abbr: 'SF',
    machines: ['OTEC SF'],
    params: ['Media', 'Mediasize', 'Immersion Depth [mm]',
             'Spindle Rotation Speed [1/min]', 'Rotation of Head [1/min]',
             'Time [min]', 'Ratio CW/CCW', 'Bowlspeed [1/min]',
             'Wet/Dry', 'Angle of Robot'],
  },
  {
    name: 'Bandfinish', abbr: 'Bandfinish',
    machines: [],
    params: ['Media', 'Mediasize', 'Pressure [bar]',
             'Spindle Rotation Speed [1/min]', 'Time [s]',
             'Oscillation [Hz]', 'Wet/Dry'],
  },
  {
    name: 'Stonefinish', abbr: 'Stonefinish',
    machines: [],
    params: ['Media', 'Mediasize', 'Pressure [bar]',
             'Spindle Rotation Speed [1/min]', 'Time [s]',
             'Oscillation [Hz]', 'Wet/Dry'],
  },
  {
    name: 'Lapping', abbr: 'LP',
    machines: [],
    params: ['Media', 'Mediasize', 'Weight [kg]', 'Parts in Carrier',
             'Force per mm²', 'Rotationspeed Plate [1/min]', 'Time [min]'],
  },
  {
    name: 'Dlyte (EP)', abbr: 'EP',
    machines: [],
    params: ['Media', 'Voltage [V]', 'Times (T1, T2, T3, T4)',
             'Parts on Holder', 'Stirspeed', 'Time [min]'],
  },
];

export function getProcessByAbbr(abbr: string): ProcessDef | undefined {
  return PROCESSES.find(p => p.abbr === abbr);
}

export function getProcessByName(name: string): ProcessDef | undefined {
  return PROCESSES.find(p => p.name === name);
}

export const SCHRITT_VORSCHLAEGE = [
  'Strahlen', 'Gleitschleifen', 'Reinigen', 'Beschichten',
  'Entgraten', 'Polieren', 'Härten', 'Anlassen', 'Nitrieren',
  'Galvanisieren', 'Eloxieren', 'Phosphatieren', 'Waschen',
  'Trocknen', 'Messen', 'Prüfen', 'Verpacken',
];
