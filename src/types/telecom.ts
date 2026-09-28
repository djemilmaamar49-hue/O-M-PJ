export type Priority = 'Critical' | 'Major' | 'Minor';

export type Etat = 'OPEN' | 'IN_PROGRESS' | 'PENDING_PARTS' | 'RESOLVED' | 'CLOSE';

export type CatAlarme = 'COMM' | 'ENV' | 'EQU' | 'QLT' | 'QLTY';

export type Assignee =
  | 'rollout'
  | 'M_MOBISERV'
  | 'M_OTT'
  | 'O&M_ENV'
  | 'ACCES_PROD'
  | 'NOC_SDH'
  | 'ENG_TRANS'
  | 'CS_FRONTOFFICE'
  | 'FIELD_OPS';

export type PbmType =
  | 'QOS'
  | 'Cause non determinee'
  | 'Pb Hard Ware'
  | 'Autonomie'
  | 'Energie'
  | 'Customer Complaint'
  | 'Fiber Cut';

export type TicketType = 'NETWORK_ALARM' | 'CUSTOMER_SUPPORT' | 'HARDWARE_MAINTENANCE';

export type CustomerTier = 'CONSUMER' | 'BUSINESS_PRO' | 'VIP_CORPORATE';

export interface CustomerInfo {
  msisdn: string; // e.g. +213 770 12 34 56
  subscriberName: string;
  tier: CustomerTier;
  plan: string;
  wilaya: string;
  commune: string;
}

export type EquipmentType =
  | 'Generator (GE)'
  | 'Battery Bank'
  | 'Rectifier 48V'
  | 'HVAC / Clim'
  | 'Microwave Link'
  | 'BSS Cabinet (BTS/NodeB)'
  | 'Tower & Antennas'
  | 'Optical Terminal (ODF)';

export interface SiteInfo {
  siteId: string; // e.g. 'DZ-ALG-014'
  name: string; // e.g. 'Kouba Plateau'
  wilaya: string;
  commune: string;
  region: 'Centre' | 'Est' | 'Ouest' | 'Sud';
  technologies: ('2G' | '3G' | '4G' | '5G')[];
  status: 'Nominal' | 'Degraded' | 'Outage';
  coordinates: { lat: number; lng: number };
  activeAlarmsCount: number;
}

export interface HardwareTelemetry {
  fuelLevelPercent?: number; // for GE (0-100%)
  runHours?: number; // for GE
  batteryVoltage?: number; // for 48V battery bank (e.g. 52.8V float)
  autonomyHoursEstimated?: number;
  temperatureCelsius?: number; // for clim / shelter
  rslDbm?: number; // Received Signal Level for microwave
}

export interface HardwareAsset {
  id: string; // e.g. 'HW-GE-014'
  siteId: string;
  siteName: string;
  wilaya: string;
  equipmentType: EquipmentType;
  model: string;
  serialNumber: string;
  installDate: string;
  health: 'Nominal' | 'Degraded' | 'Critical';
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  pmIntervalDays: number;
  telemetry: HardwareTelemetry;
  notes: string;
}

export interface MaintenanceChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export type MaintenanceType =
  | 'PREVENTIVE'
  | 'CORRECTIVE'
  | 'EMERGENCY_REPAIR'
  | 'COMMISSIONING';

export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED';

export interface MaintenanceSchedule {
  id: string; // e.g. 'PM-2026-042'
  hardwareAssetId: string;
  siteId: string;
  siteName: string;
  wilaya: string;
  equipmentType: EquipmentType;
  title: string;
  maintenanceType: MaintenanceType;
  scheduledDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  completedDate?: string;
  status: MaintenanceStatus;
  assignedTechnician: string;
  assignedTeam: Assignee;
  estimatedHours: number;
  actualHours?: number;
  tasksChecklist: MaintenanceChecklistItem[];
  notes: string;
  linkedTicketId?: string;
  sparePartsUsed?: string[];
}

export interface TicketLogEntry {
  date: string;
  user: string;
  action: string;
  note?: string;
}

export interface Ticket {
  id: string; // e.g. 'TKT-1082'
  title: string;
  type: TicketType;
  Priorite: Priority;
  Cat_alarme: CatAlarme;
  Alarme: string;
  Assigne_a: Assignee;
  Pbm_type: PbmType;
  Etat: Etat;
  siteId?: string;
  siteName?: string;
  wilaya?: string;
  customer?: CustomerInfo;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  description: string;
  rootCause?: string;
  resolutionNotes?: string;
  linkedMaintenanceId?: string;
  history: TicketLogEntry[];
}

export type ShiftType = 'Morning' | 'Evening' | 'Night';

export type ShiftStatus = 'ACTIVE' | 'HANDOVER_PENDING' | 'HANDOVER_COMPLETED';

export type ShiftMilestoneCategory =
  | 'INCIDENT'
  | 'MAINTENANCE'
  | 'NETWORK_CHANGE'
  | 'ENVIRONMENT'
  | 'ESCALATION';

export interface ShiftMilestone {
  id: string;
  timestamp: string; // e.g. '08:30'
  category: ShiftMilestoneCategory;
  title: string;
  description: string;
  operator: string;
  impact: 'CRITICAL' | 'MAJOR' | 'NORMAL';
  linkedTicketId?: string;
  linkedSiteId?: string;
}

export interface ShiftIncidentSummary {
  ticketId: string;
  title: string;
  siteName?: string;
  wilaya?: string;
  team: Assignee;
  priority: Priority;
  status: Etat;
  slaDeadline: string;
  actionRequiredForIncoming: string;
  notes?: string;
}

export interface HandoverPriorityItem {
  id: string;
  priorityLevel: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM';
  title: string;
  rationale: string;
  recommendedAction: string;
  assignedTeam: Assignee;
  linkedTicketId?: string;
  deadlineEstimate?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DONE';
  aiConfidence?: number;
  sourceMetric?: string;
}

export interface ShiftLog {
  id: string; // e.g. 'SHIFT-2026-09-28-MORN'
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  shiftHours: string; // e.g. '07:00 - 15:00'
  status: ShiftStatus;
  outgoingSupervisor: string;
  incomingSupervisor: string;
  operatorsOnDuty: string[];
  executiveSummary: string;
  weatherAndGridStatus: string;
  milestones: ShiftMilestone[];
  criticalIncidents: ShiftIncidentSummary[];
  handoverPriorities: HandoverPriorityItem[];
  generalNotes: string;
  outgoingSignOff?: {
    signed: boolean;
    signedAt?: string;
    signedBy?: string;
  };
  incomingSignOff?: {
    acknowledged: boolean;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
  };
}
