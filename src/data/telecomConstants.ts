import { CatAlarme, Priority, Etat, Assignee, PbmType, EquipmentType } from '../types/telecom';

export const OPTIONS = {
  Priorite: ['Critical', 'Major', 'Minor'] as Priority[],
  Etat: ['OPEN', 'IN_PROGRESS', 'PENDING_PARTS', 'RESOLVED', 'CLOSE'] as Etat[],
  Assigne_a: [
    'rollout',
    'M_MOBISERV',
    'M_OTT',
    'O&M_ENV',
    'ACCES_PROD',
    'NOC_SDH',
    'ENG_TRANS',
    'CS_FRONTOFFICE',
    'FIELD_OPS',
  ] as Assignee[],
  Pbm_type: [
    'QOS',
    'Cause non determinee',
    'Pb Hard Ware',
    'Autonomie',
    'Energie',
    'Customer Complaint',
    'Fiber Cut',
  ] as PbmType[],
  Cat_alarme: ['COMM', 'ENV', 'EQU', 'QLT', 'QLTY'] as CatAlarme[],
};

export const ALARME_MAPPING: Record<CatAlarme, string[]> = {
  COMM: [
    'Canal indisponible',
    'Link Down',
    'PB fibre optique',
    'Pbm Supervision',
    'SDH systeme down',
    'SDH systeme instable',
  ],
  ENV: ['Rectifier', 'Battery', 'GE', 'clim'],
  EQU: ['Hardwer probleme', 'Other alarms'],
  QLT: [
    'QOS 3G',
    'QOS Site',
    'BAD RSL',
    'BAD HW',
    'QOS BSC',
    'QOS Sector',
    'QOS',
    'Call drop',
    'BAD PM',
  ],
  QLTY: ['LOSS-OF-ALL CHANNEL'],
};

export const TEAM_LABELS: Record<Assignee, { label: string; role: string }> = {
  rollout: { label: 'Rollout & Deployment', role: 'Site commissioning & expansion' },
  M_MOBISERV: { label: 'M_MOBISERV', role: 'VAS, SMS, Core Mobile Services' },
  M_OTT: { label: 'M_OTT', role: 'Data Packets, 4G APN & IP Services' },
  'O&M_ENV': { label: 'O&M_ENV', role: 'Power, Generators (GE), Solar & HVAC' },
  ACCES_PROD: { label: 'ACCES_PROD', role: 'Radio Access Network (2G/3G/4G BSS)' },
  NOC_SDH: { label: 'NOC_SDH', role: 'Transmission Backbone & SDH Networks' },
  ENG_TRANS: { label: 'ENG_TRANS', role: 'Microwave Engineering & Fiber Links' },
  CS_FRONTOFFICE: { label: 'CS_FRONTOFFICE', role: 'Customer Care & Subscriber Support' },
  FIELD_OPS: { label: 'FIELD_OPS', role: 'Wilaya Field Intervention Technicians' },
};

export const CATEGORY_DESCRIPTIONS: Record<CatAlarme, string> = {
  COMM: 'Communications & Transmission Links',
  ENV: 'Environment, Energy & Power Systems',
  EQU: 'Hardware Equipment & Shelters',
  QLT: 'Quality of Service & Radio Performance',
  QLTY: 'Quality Outage / Loss of All Channels',
};

export const ALGERIA_WILAYAS = [
  '16 - Alger',
  '31 - Oran',
  '25 - Constantine',
  '23 - Annaba',
  '19 - Sétif',
  '05 - Batna',
  '30 - Ouargla (Hassi Messaoud)',
  '06 - Béjaïa',
  '15 - Tizi Ouzou',
  '09 - Blida',
  '35 - Boumerdès',
  '13 - Tlemcen',
  '07 - Biskra',
  '47 - Ghardaïa',
];

export const EQUIPMENT_TYPES: EquipmentType[] = [
  'Generator (GE)',
  'Battery Bank',
  'Rectifier 48V',
  'HVAC / Clim',
  'Microwave Link',
  'BSS Cabinet (BTS/NodeB)',
  'Tower & Antennas',
  'Optical Terminal (ODF)',
];

export const PM_CHECKLIST_TEMPLATES: Record<EquipmentType, string[]> = {
  'Generator (GE)': [
    'Check engine oil level and viscosity',
    'Replace oil and diesel fuel filters',
    'Inspect coolant radiator level and hoses',
    'Test auto-start relay during simulated mains cut',
    'Verify fuel tank reserve sensor (>50% min)',
    'Record engine run hours and alternator output voltage',
  ],
  'Battery Bank': [
    'Measure individual cell float voltage (48V string)',
    'Conduct 1-hour controlled discharge capacity test',
    'Torque terminal connectors and apply anti-corrosion grease',
    'Check ambient battery chamber temperature (<25°C)',
    'Calculate backup autonomy hours under current BSS load',
  ],
  'Rectifier 48V': [
    'Verify rectifier module redundancy (N+1 healthy)',
    'Clean dust filters and blower fans',
    'Calibrate DC output busbar voltage (53.5V standard)',
    'Test low-voltage disconnect (LVD) contactor triggers',
    'Check AC input surge arrester / varistor status',
  ],
  'HVAC / Clim': [
    'Wash and clean external condenser coils',
    'Inspect refrigerant R410A pressure and detect leaks',
    'Clean internal evaporator air filters',
    'Test lead/lag alternating controller between dual units',
    'Verify high-temperature alarm relay trigger threshold (>35°C)',
  ],
  'Microwave Link': [
    'Verify Received Signal Level (RSL) matches link budget (±2 dB)',
    'Check dish radome integrity and tower bracket torque',
    'Inspect IF cable and grounding copper kit',
    'Run BER (Bit Error Rate) loopback test on STM-1/Ethernet link',
    'Clean and seal ODU waveguide flange connections',
  ],
  'BSS Cabinet (BTS/NodeB)': [
    'Inspect optical SFP transceivers and fiber patch cords',
    'Check RRU (Remote Radio Unit) jumper cables & VSWR (<1.3)',
    'Vacuum internal cabinet filters and verify fan tray alarms',
    'Verify grounding busbar impedance (<5 Ohms)',
    'Backup BSS configuration database to regional OSS',
  ],
  'Tower & Antennas': [
    'Inspect tower guy wire tension and verticality alignment',
    'Check aviation warning obstruction lamps',
    'Verify mechanical antenna downtilt and azimuth alignment',
    'Examine lightning protection air terminal and down-conductor',
    'Check feeder cable clamping and weatherproofing boots',
  ],
  'Optical Terminal (ODF)': [
    'Inspect optical attenuation with OTDR reflectometer',
    'Clean all SC/APC and LC connector ferrules with lint-free wipes',
    'Re-label splice trays and outgoing patch cables',
    'Verify splice box IP68 sealing integrity',
  ],
};

export const CM_CHECKLIST_TEMPLATES: Record<EquipmentType, string[]> = {
  'Generator (GE)': [
    'Perform diagnostic scan of engine failure code & auto-start relay',
    'Inspect fuel line for air lock, leaks, or clogged diesel filter',
    'Replace faulty fuel injector / starter motor solenoid',
    'Verify alternator excitation and output voltage under load (400V/230V)',
    'Conduct 30-min live transfer test with ATS under simulated grid failure',
    'Confirm GE alarm clear on NOC supervision console',
  ],
  'Battery Bank': [
    'Conduct thermal scan to identify overheated / shorted cells',
    'Isolate battery breaker and safely disconnect defective cell blocks',
    'Install replacement high-capacity AGM/gel modular cells',
    'Torque terminal interlinks and apply copper anti-oxidation compound',
    'Perform 30-minute controlled discharge load test',
    'Verify nominal float voltage (53.5V) restored on busbar',
  ],
  'Rectifier 48V': [
    'Hot-swap defective rectifier power module with spare unit',
    'Inspect DC distribution busbar for overload and loose terminations',
    'Recalibrate output voltage to 53.5V standard float',
    'Test low-voltage disconnect (LVD) and load shedding contactor',
    'Verify N+1 modular redundancy and clear DC fail alarm at NOC',
  ],
  'HVAC / Clim': [
    'Diagnose compressor fault / refrigerant leak with nitrogen pressure test',
    'Replace defective thermal expansion valve / compressor capacitor',
    'Recharge refrigerant gas R410A to manufacturer spec',
    'Clean choked condenser coils and unblock condensate drain pipe',
    'Test dual-unit automatic changeover and verify shelter temp drops <24°C',
  ],
  'Microwave Link': [
    'Measure Received Signal Level (RSL) and inspect RF cable / waveguide',
    'Replace faulty Outdoor Unit (ODU) or optical SFP transceiver',
    'Re-align parabolic dish azimuth & elevation to link budget target (±1 dB)',
    'Run 15-minute Bit Error Rate (BER) & frame loss test on transmission path',
    'Verify weatherproofing seals and clear Link Down alarm on NOC SDH',
  ],
  'BSS Cabinet (BTS/NodeB)': [
    'Diagnose faulty board (UBBP, BBU main processing, or RRU transceiver)',
    'Hot-swap defective radio unit / optical fiber patch cord',
    'Sweep feeder jumper cable and verify VSWR < 1.3 across all carriers',
    'Check sector transmission power and synchronization with GPS clock',
    'Run sector self-test and verify all radio cells nominal on OSS',
  ],
  'Tower & Antennas': [
    'Perform safety inspection of mast structure, ladders, and feeder clamps',
    'Replace damaged coaxial jumper cables and weatherproofing boots',
    'Inspect and replace faulty aviation obstruction lights',
    'Test lightning arrestor grounding continuity (<5 Ohms)',
    'Clear structural / tower safety hazard ticket',
  ],
  'Optical Terminal (ODF)': [
    'Perform OTDR reflectometer trace to locate fiber break / microbend',
    'Clean dirty LC/APC connectors with lint-free solvent wipe',
    'Re-splice broken optical fibers using precision fusion splicer (<0.02 dB loss)',
    'Re-seat optical attenuators and verify received optical power (dBm)',
    'Confirm transmission restoration on SDH / IP-MPLS core router',
  ],
};

export const COMMON_SPARE_PARTS: Record<EquipmentType, string[]> = {
  'Generator (GE)': [
    'Fuel Filter Element (Perkins/Cummins)',
    'Oil Filter 15W40 Element',
    'Starter Solenoid Relay 12V',
    'AVR (Automatic Voltage Regulator)',
    'Genset Drive Belt',
    'Fuel Level Sensor Probe',
  ],
  'Battery Bank': [
    'Narada 12V 250Ah AGM Block',
    'Coslight 2V 500Ah Cell',
    'Copper Interconnect Busbar Link',
    'Terminal Shunt Resistor 500A',
    'Battery Disconnect Breaker 250A',
  ],
  'Rectifier 48V': [
    'Eltek Flatpack2 48V/3000W Module',
    'Vertiv NetSure 48V/50A Rectifier',
    'SMARTpack2 Controller Unit',
    'DC Output Breaker 63A',
    'Surge Protection Cartridge (SPD)',
  ],
  'HVAC / Clim': [
    'Condenser Fan Motor 230V',
    'Compressor Contactor 24V/220V',
    'Refrigerant Gas R410A (11.3 kg)',
    'Dual Climate Thermostat Controller',
    'Air Filter Cartridge Washable',
  ],
  'Microwave Link': [
    'NEC iPASOLINK ODU 80GHz',
    'Optical SFP+ 10G 1310nm 10km',
    'RG-8 IF Coaxial Cable Jumper (2m)',
    'Grounding Kit 1/2" Feeder',
    'Dish Mounting Bracket U-Bolt Set',
  ],
  'BSS Cabinet (BTS/NodeB)': [
    'Huawei UBBP Universal Baseband Board',
    'Ericsson RRU Remote Radio Unit 1800MHz',
    'ZTE BBU Fan Tray Module',
    'CPRI Optical Fiber Jumper 10m',
    'DIN 7/16 Feeder Jumper 1/2" 3m',
  ],
  'Tower & Antennas': [
    'LED Aviation Obstruction Lamp Red',
    'Feeder Clamping Kit 7/8"',
    'Lightning Down-Conductor Copper Tape',
    'Cold Shrink Weatherproofing Boot',
    'Mechanical Downtilt Bracket',
  ],
  'Optical Terminal (ODF)': [
    'LC-LC Duplex Single-Mode Patch Cord 5m',
    'SC/APC Pigtail Set 12-colors',
    'Fiber Fusion Protection Sleeve 60mm',
    'Optical Attenuator 5dB LC/UPC',
    'ODF 24-Port Splice Tray',
  ],
};

