import React, { useState } from 'react';
import { Ticket, Etat, HardwareAsset, MaintenanceSchedule } from '../types/telecom';
import { TEAM_LABELS, CATEGORY_DESCRIPTIONS } from '../data/telecomConstants';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Clock,
  Building,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Radio,
  FileText,
  Send,
  Phone,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';

interface TicketDetailDrawerProps {
  ticket: Ticket | null;
  allTickets?: Ticket[];
  hardwareAsset?: HardwareAsset;
  linkedMaintenance?: MaintenanceSchedule;
  onClose: () => void;
  onUpdateStatus: (ticketId: string, newStatus: Etat, resolutionNote?: string) => void;
  onAddHistoryLog: (ticketId: string, action: string, note?: string) => void;
  onCreateMaintenance: (ticket: Ticket) => void;
  onSelectOtherTicket?: (ticket: Ticket) => void;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticket,
  allTickets,
  hardwareAsset,
  linkedMaintenance,
  onClose,
  onUpdateStatus,
  onAddHistoryLog,
  onCreateMaintenance,
  onSelectOtherTicket,
}) => {
  const { t, isRTL } = useLanguage();
  const [logInput, setLogInput] = useState('');
  const [resolutionInput, setResolutionInput] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  // Compute correlated alarms from same site within 5-min window
  const correlatedTickets = React.useMemo(() => {
    if (!ticket || !allTickets || !ticket.siteId) return [];
    const tTime = new Date(ticket.createdAt).getTime();
    return allTickets.filter(
      (other) =>
        other.id !== ticket.id &&
        other.siteId === ticket.siteId &&
        Math.abs(new Date(other.createdAt).getTime() - tTime) <= 5 * 60 * 1000
    );
  }, [ticket, allTickets]);

  if (!ticket) return null;

  const isClosed = ticket.Etat === 'CLOSE' || ticket.Etat === 'RESOLVED';

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logInput.trim()) return;
    onAddHistoryLog(ticket.id, 'Operator Intervention Note', logInput.trim());
    setLogInput('');
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(ticket.id, 'RESOLVED', resolutionInput || 'Issue resolved by field team');
    setShowResolveForm(false);
    setResolutionInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs">
      <div className={`absolute inset-y-0 ${isRTL ? 'left-0 pr-10' : 'right-0 pl-10'} max-w-full flex`}>
        <div className={`w-screen max-w-xl bg-neutral-900 ${isRTL ? 'border-r' : 'border-l'} border-neutral-800 shadow-2xl flex flex-col`}>
          {/* Header */}
          <div className="p-5 border-b border-neutral-800 bg-neutral-950/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {ticket.id}
                </span>
                <span className="text-neutral-500" aria-hidden="true">·</span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    ticket.Etat === 'OPEN'
                      ? 'text-red-400'
                      : ticket.Etat === 'IN_PROGRESS'
                      ? 'text-amber-400'
                      : ticket.Etat === 'PENDING_PARTS'
                      ? 'text-purple-400'
                      : ticket.Etat === 'RESOLVED'
                      ? 'text-emerald-400'
                      : 'text-neutral-500'
                  }`}
                >
                  {ticket.Etat}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-sm font-semibold text-neutral-100 line-clamp-2">
              {ticket.title}
            </h2>

            {/* SLA and Priority strip */}
            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-400 border-t border-neutral-800/80 pt-2.5">
              <div className="flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    ticket.Priorite === 'Critical'
                      ? 'bg-red-500'
                      : ticket.Priorite === 'Major'
                      ? 'bg-amber-500'
                      : 'bg-blue-400'
                  }`}
                />
                <span
                  className={
                    ticket.Priorite === 'Critical'
                      ? 'text-red-400'
                      : ticket.Priorite === 'Major'
                      ? 'text-amber-300'
                      : 'text-neutral-300'
                  }
                >
                  {ticket.Priorite === 'Critical'
                    ? t('prio_critical')
                    : ticket.Priorite === 'Major'
                    ? t('prio_major')
                    : t('prio_minor')}
                </span>
              </div>
              <span className="text-neutral-600" aria-hidden="true">·</span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t('sla_target')}: {ticket.slaDeadline ? ticket.slaDeadline.slice(11, 16) : 'N/A'} UTC</span>
              </div>
            </div>
          </div>

          {/* Quick Status Action Bar */}
          <div className="px-5 py-2.5 bg-neutral-950/90 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] text-neutral-500 whitespace-nowrap">{t('transition_label')}</span>
            {ticket.Etat !== 'IN_PROGRESS' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'IN_PROGRESS')}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('btn_mark_in_progress')}
              </button>
            )}
            {ticket.Etat !== 'PENDING_PARTS' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'PENDING_PARTS')}
                className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('btn_pending_parts')}
              </button>
            )}
            {!isClosed && (
              <button
                onClick={() => setShowResolveForm(true)}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('btn_resolve_ticket')}
              </button>
            )}
            {ticket.Etat === 'RESOLVED' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'CLOSE')}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('btn_close_ticket')}
              </button>
            )}
            {isClosed && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'OPEN')}
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('btn_reopen_ticket')}
              </button>
            )}
          </div>

          {/* Resolve prompt input */}
          {showResolveForm && (
            <form
              onSubmit={handleConfirmResolve}
              className="p-4 bg-emerald-950/20 border-b border-emerald-900/60 text-xs space-y-2"
            >
              <div className="font-semibold text-emerald-400">{t('confirm_resolution')}</div>
              <textarea
                rows={2}
                value={resolutionInput}
                onChange={(e) => setResolutionInput(e.target.value)}
                placeholder="Describe resolution (e.g. Swapped faulty SFP module on sector 2, verified normal BER transmission)..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResolveForm(false)}
                  className="px-2.5 py-1 bg-neutral-800 text-neutral-400 rounded hover:text-white cursor-pointer"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-500 cursor-pointer"
                >
                  {t('confirm_resolution')}
                </button>
              </div>
            </form>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Correlated Multi-Alarm Incident Banner */}
            {correlatedTickets.length > 0 && (
              <div className="p-3.5 bg-neutral-950 border border-amber-500/40 rounded-lg space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Auto-Grouped Incident: {correlatedTickets.length + 1} Alarms within 5-min Window</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Same Site: {ticket.siteId}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  This alarm arrived concurrently with {correlatedTickets.length} other alarms on{' '}
                  <span className="text-white font-medium">{ticket.siteName}</span>. NOC correlation engine auto-groups them into a unified Incident.
                </p>
                <div className="space-y-1.5 pt-1 border-t border-neutral-800">
                  <span className="text-[10px] uppercase font-semibold text-neutral-500 block">
                    Sibling Alarms in Incident:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {correlatedTickets.map((sibling) => (
                      <div
                        key={sibling.id}
                        className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              sibling.Priorite === 'Critical'
                                ? 'bg-red-500'
                                : sibling.Priorite === 'Major'
                                ? 'bg-amber-500'
                                : 'bg-blue-400'
                            }`}
                          />
                          <span className="font-mono font-medium text-white text-[11px]">
                            {sibling.id}
                          </span>
                          <span className="text-neutral-300 text-xs truncate max-w-[200px]">
                            {sibling.Alarme} · {sibling.title}
                          </span>
                        </div>
                        {onSelectOtherTicket && (
                          <button
                            onClick={() => onSelectOtherTicket(sibling)}
                            className="px-2 py-0.5 text-[11px] font-medium text-amber-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Telecom Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-950/50 border border-neutral-800 rounded-lg">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-semibold">
                  {t('category_label')}
                </span>
                <span className="font-semibold text-neutral-200 mt-0.5 block">
                  {ticket.Cat_alarme}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {t(`cat_${ticket.Cat_alarme.toLowerCase()}`) || CATEGORY_DESCRIPTIONS[ticket.Cat_alarme]}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-semibold">
                  {t('alarm_label')}
                </span>
                <span className="font-semibold text-amber-300 mt-0.5 block">{ticket.Alarme}</span>
              </div>

              <div className="pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-semibold">
                  {t('assigned_label')}
                </span>
                <span className="font-mono font-medium text-neutral-200 mt-0.5 block">
                  {ticket.Assigne_a}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {TEAM_LABELS[ticket.Assigne_a]?.role}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-semibold">
                  {t('problem_type_label')}
                </span>
                <span className="font-medium text-neutral-200 mt-0.5 block">{ticket.Pbm_type}</span>
              </div>
            </div>

            {/* Customer Dossier if Customer Ticket */}
            {ticket.customer && (
              <div className="p-4 bg-blue-950/20 border border-blue-900/60 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                    <User className="w-4 h-4" />
                    <span>{t('customer_requests')}</span>
                  </div>
                  <span className="font-mono text-[10px] text-blue-400 font-semibold px-2 py-0.5 bg-blue-950 border border-blue-800 rounded">
                    {ticket.customer.tier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-neutral-300">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">MSISDN</span>
                    <a
                      href={`tel:${ticket.customer.msisdn}`}
                      className="font-mono font-bold text-white hover:text-blue-400 flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-blue-400" />
                      {ticket.customer.msisdn}
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{t('subscriber_name')}</span>
                    <span className="font-medium text-neutral-200">
                      {ticket.customer.subscriberName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{t('subscription_plan')}</span>
                    <span>{ticket.customer.plan}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Location</span>
                    <span>{ticket.customer.commune || ticket.customer.wilaya}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Affected BTS Site details */}
            <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                  <Building className="w-4 h-4 text-neutral-400" />
                  <span>Base Station Subsystem (BTS Site)</span>
                </div>
                <span className="font-mono text-[11px] text-neutral-400">{ticket.siteId}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-neutral-300 pt-1">
                <div>
                  <span className="text-[10px] text-neutral-500 block">Site Name</span>
                  <span className="font-medium">{ticket.siteName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">{t('wilaya_label')}</span>
                  <span>{ticket.wilaya || 'Algeria Network'}</span>
                </div>
              </div>
            </div>

            {/* Linked Hardware Asset & Telemetry */}
            {hardwareAsset && (
              <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>{t('associated_asset')}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      hardwareAsset.health === 'Critical'
                        ? 'border-red-500/40 text-red-400 bg-red-950/20'
                        : hardwareAsset.health === 'Degraded'
                        ? 'border-amber-500/40 text-amber-400 bg-amber-950/20'
                        : 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                    }`}
                  >
                    {t('col_health')}: {t(`health_${hardwareAsset.health.toLowerCase()}`)}
                  </span>
                </div>

                <div className="text-neutral-300">
                  <div className="font-semibold text-white">{hardwareAsset.model}</div>
                  <div className="text-[11px] text-neutral-400">
                    Type: {hardwareAsset.equipmentType} · S/N: {hardwareAsset.serialNumber}
                  </div>
                </div>

                {/* Telemetry live figures */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800 font-mono text-[11px]">
                  {hardwareAsset.telemetry.fuelLevelPercent !== undefined && (
                    <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block">Diesel Fuel</span>
                      <span
                        className={`font-bold ${
                          hardwareAsset.telemetry.fuelLevelPercent < 40
                            ? 'text-red-400'
                            : 'text-neutral-200'
                        }`}
                      >
                        {hardwareAsset.telemetry.fuelLevelPercent}%
                      </span>
                    </div>
                  )}

                  {hardwareAsset.telemetry.batteryVoltage !== undefined && (
                    <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block">Battery Voltage</span>
                      <span
                        className={`font-bold ${
                          hardwareAsset.telemetry.batteryVoltage < 48
                            ? 'text-red-400'
                            : 'text-neutral-200'
                        }`}
                      >
                        {hardwareAsset.telemetry.batteryVoltage}V
                      </span>
                    </div>
                  )}

                  {hardwareAsset.telemetry.temperatureCelsius !== undefined && (
                    <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block">Shelter Temp</span>
                      <span
                        className={`font-bold ${
                          hardwareAsset.telemetry.temperatureCelsius > 35
                            ? 'text-amber-400'
                            : 'text-neutral-200'
                        }`}
                      >
                        {hardwareAsset.telemetry.temperatureCelsius}°C
                      </span>
                    </div>
                  )}

                  {hardwareAsset.telemetry.rslDbm !== undefined && (
                    <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 block">Microwave RSL</span>
                      <span className="font-bold text-amber-400">
                        {hardwareAsset.telemetry.rslDbm} dBm
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hardware Intervention Action Bar if applicable */}
            {!ticket.linkedMaintenanceId &&
              (ticket.Cat_alarme === 'ENV' ||
                ticket.Cat_alarme === 'COMM' ||
                ticket.Pbm_type === 'Pb Hard Ware' ||
                ticket.Pbm_type === 'Autonomie' ||
                ticket.Pbm_type === 'Energie') && (
                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg flex items-center justify-between">
                  <div className="text-amber-200">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span>{t('hardware_action_required')}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Déclencher une maintenance corrective (CM) pour cet incident avec pièces de rechange et SOP terrain.
                    </div>
                  </div>
                  <button
                    onClick={() => onCreateMaintenance(ticket)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors whitespace-nowrap cursor-pointer shadow-sm shadow-amber-950/40"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{t('btn_schedule_cm')}</span>
                  </button>
                </div>
              )}

            {linkedMaintenance && (
              <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{t('linked_pm_order')}: {linkedMaintenance.id}</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {linkedMaintenance.status}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-300">{linkedMaintenance.title}</div>
                <div className="text-[10px] text-neutral-500">
                  Tech: {linkedMaintenance.assignedTechnician} · Scheduled: {linkedMaintenance.scheduledDate}
                </div>
              </div>
            )}

            {/* Detailed Description */}
            <div className="space-y-1">
              <span className="text-neutral-400 font-semibold block">{t('desc_label')}</span>
              <p className="p-3 bg-neutral-950 rounded border border-neutral-800 text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {ticket.description || 'No detailed log provided.'}
              </p>
            </div>

            {/* Root cause and resolution notes */}
            {ticket.rootCause && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-semibold block">{t('root_cause_label')}</span>
                <p className="p-3 bg-neutral-950 rounded border border-neutral-800 text-neutral-300">
                  {ticket.rootCause}
                </p>
              </div>
            )}

            {ticket.resolutionNotes && (
              <div className="space-y-1">
                <span className="text-emerald-400 font-semibold block">{t('resolution_label')}</span>
                <p className="p-3 bg-emerald-950/20 rounded border border-emerald-900/60 text-emerald-200">
                  {ticket.resolutionNotes}
                </p>
              </div>
            )}

            {/* History & Timeline */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-neutral-400 font-semibold block">{t('activity_timeline')}</span>
              <div className="space-y-2">
                {ticket.history?.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-300">{h.user}</span>
                        <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
                          {h.date}
                        </span>
                      </div>
                      <div className="text-neutral-400">{h.action}</div>
                      {h.note && <div className="text-neutral-300 italic mt-0.5">"{h.note}"</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add history note input */}
              <form onSubmit={handleAddLog} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={logInput}
                  onChange={(e) => setLogInput(e.target.value)}
                  placeholder={t('add_note_placeholder')}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!logInput.trim()}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white rounded text-xs transition-colors cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
