import { Ticket, MaintenanceSchedule, HardwareAsset } from '../types/telecom';

/**
 * Helper to escape CSV cell contents safely according to RFC 4180
 */
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  // Replace internal quotes with double quotes and wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Triggers a client-side browser download of a CSV file with UTF-8 BOM
 * (ensuring Arabic, French accented characters and symbols display correctly in Excel)
 */
function downloadCSV(csvContent: string, defaultFilename: string) {
  // Add UTF-8 BOM (\uFEFF) so Excel respects UTF-8 encoding for Wilayas and French terms
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Ticket records to a structured CSV file
 */
export function exportTicketsToCSV(tickets: Ticket[], customPrefix = 'Djezzy_Tickets') {
  const headers = [
    'Ticket ID',
    'Title',
    'Incident Type',
    'Priority',
    'Category (Cat_alarme)',
    'Alarm Name',
    'Assigned Team',
    'Problem Type',
    'Status (Etat)',
    'Site ID',
    'Site Name',
    'Wilaya',
    'Customer MSISDN',
    'Subscriber Name',
    'Customer Tier',
    'Subscription Plan',
    'Created At',
    'Updated At',
    'SLA Deadline',
    'Root Cause',
    'Resolution Notes',
    'Linked Maintenance ID',
  ];

  const rows = tickets.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.title),
    escapeCSV(t.type),
    escapeCSV(t.Priorite),
    escapeCSV(t.Cat_alarme),
    escapeCSV(t.Alarme),
    escapeCSV(t.Assigne_a),
    escapeCSV(t.Pbm_type),
    escapeCSV(t.Etat),
    escapeCSV(t.siteId || ''),
    escapeCSV(t.siteName || ''),
    escapeCSV(t.wilaya || ''),
    escapeCSV(t.customer?.msisdn || ''),
    escapeCSV(t.customer?.subscriberName || ''),
    escapeCSV(t.customer?.tier || ''),
    escapeCSV(t.customer?.plan || ''),
    escapeCSV(t.createdAt),
    escapeCSV(t.updatedAt),
    escapeCSV(t.slaDeadline),
    escapeCSV(t.rootCause || ''),
    escapeCSV(t.resolutionNotes || ''),
    escapeCSV(t.linkedMaintenanceId || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const filename = `${customPrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Exports Hardware Maintenance Schedule records to a structured CSV file
 */
export function exportMaintenanceToCSV(
  schedules: MaintenanceSchedule[],
  customPrefix = 'Djezzy_Maintenance_Schedules'
) {
  const headers = [
    'Work Order ID',
    'Title',
    'Equipment Type',
    'Maintenance Type',
    'Site ID',
    'Site Name',
    'Wilaya',
    'Status',
    'Scheduled Date',
    'Due Date',
    'Completed Date',
    'Assigned Technician',
    'Assigned Team',
    'Estimated Hours',
    'Actual Hours',
    'Tasks Total',
    'Tasks Completed',
    'Completion %',
    'Checklist Tasks Status',
    'Spare Parts Used',
    'Field Notes',
    'Linked Incident Ticket ID',
  ];

  const rows = schedules.map((s) => {
    const total = s.tasksChecklist.length;
    const completed = s.tasksChecklist.filter((t) => t.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const checklistStr = s.tasksChecklist
      .map((t) => `[${t.completed ? 'DONE' : 'PENDING'}] ${t.label}`)
      .join('; ');
    const partsStr = (s.sparePartsUsed || []).join('; ');

    return [
      escapeCSV(s.id),
      escapeCSV(s.title),
      escapeCSV(s.equipmentType),
      escapeCSV(s.maintenanceType),
      escapeCSV(s.siteId),
      escapeCSV(s.siteName),
      escapeCSV(s.wilaya),
      escapeCSV(s.status),
      escapeCSV(s.scheduledDate),
      escapeCSV(s.dueDate),
      escapeCSV(s.completedDate || ''),
      escapeCSV(s.assignedTechnician),
      escapeCSV(s.assignedTeam),
      escapeCSV(s.estimatedHours),
      escapeCSV(s.actualHours || ''),
      escapeCSV(total),
      escapeCSV(completed),
      escapeCSV(`${pct}%`),
      escapeCSV(checklistStr),
      escapeCSV(partsStr),
      escapeCSV(s.notes || ''),
      escapeCSV(s.linkedTicketId || ''),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const filename = `${customPrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csvContent, filename);
}

/**
 * Exports Hardware Asset Registry to a structured CSV file
 */
export function exportAssetsToCSV(
  assets: HardwareAsset[],
  customPrefix = 'Djezzy_Hardware_Assets'
) {
  const headers = [
    'Asset ID',
    'Equipment Type',
    'Model',
    'Serial Number',
    'Site ID',
    'Site Name',
    'Wilaya',
    'Install Date',
    'Health Status',
    'Last Maintenance Date',
    'Next Due Date',
    'PM Interval (Days)',
    'Fuel Level (%)',
    'Run Hours',
    'Battery Voltage (V)',
    'Estimated Autonomy (Hours)',
    'Shelter Temperature (°C)',
    'Microwave RSL (dBm)',
    'Notes / Observations',
  ];

  const rows = assets.map((a) => [
    escapeCSV(a.id),
    escapeCSV(a.equipmentType),
    escapeCSV(a.model),
    escapeCSV(a.serialNumber),
    escapeCSV(a.siteId),
    escapeCSV(a.siteName),
    escapeCSV(a.wilaya),
    escapeCSV(a.installDate),
    escapeCSV(a.health),
    escapeCSV(a.lastMaintenanceDate),
    escapeCSV(a.nextMaintenanceDate),
    escapeCSV(a.pmIntervalDays),
    escapeCSV(a.telemetry.fuelLevelPercent !== undefined ? a.telemetry.fuelLevelPercent : ''),
    escapeCSV(a.telemetry.runHours !== undefined ? a.telemetry.runHours : ''),
    escapeCSV(a.telemetry.batteryVoltage !== undefined ? a.telemetry.batteryVoltage : ''),
    escapeCSV(
      a.telemetry.autonomyHoursEstimated !== undefined ? a.telemetry.autonomyHoursEstimated : ''
    ),
    escapeCSV(
      a.telemetry.temperatureCelsius !== undefined ? a.telemetry.temperatureCelsius : ''
    ),
    escapeCSV(a.telemetry.rslDbm !== undefined ? a.telemetry.rslDbm : ''),
    escapeCSV(a.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const filename = `${customPrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csvContent, filename);
}
