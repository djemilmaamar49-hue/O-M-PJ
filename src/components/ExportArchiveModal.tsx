import React, { useState } from 'react';
import { Ticket, MaintenanceSchedule, HardwareAsset } from '../types/telecom';
import {
  exportTicketsToCSV,
  exportMaintenanceToCSV,
  exportAssetsToCSV,
} from '../utils/csvExporter';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Shield,
  Clock,
  Layers,
  Archive,
} from 'lucide-react';

interface ExportArchiveModalProps {
  isOpen: boolean;
  tickets: Ticket[];
  schedules: MaintenanceSchedule[];
  assets: HardwareAsset[];
  onClose: () => void;
  onToast: (msg: string) => void;
}

type ExportTarget = 'tickets' | 'maintenance' | 'assets' | 'all';

export const ExportArchiveModal: React.FC<ExportArchiveModalProps> = ({
  isOpen,
  tickets,
  schedules,
  assets,
  onClose,
  onToast,
}) => {
  const { t, isRTL } = useLanguage();
  const [target, setTarget] = useState<ExportTarget>('tickets');
  const [ticketStatusScope, setTicketStatusScope] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [maintenanceScope, setMaintenanceScope] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  if (!isOpen) return null;

  // Filtered preview counts
  const scopedTickets = tickets.filter((t) => {
    if (ticketStatusScope === 'ACTIVE') return t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED';
    if (ticketStatusScope === 'CLOSED') return t.Etat === 'CLOSE' || t.Etat === 'RESOLVED';
    return true;
  });

  const scopedSchedules = schedules.filter((s) => {
    if (maintenanceScope === 'PENDING')
      return s.status === 'OVERDUE' || s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED';
    if (maintenanceScope === 'COMPLETED') return s.status === 'COMPLETED';
    return true;
  });

  const handleExport = () => {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (target === 'tickets') {
      exportTicketsToCSV(scopedTickets, `Djezzy_Tickets_${ticketStatusScope}`);
      onToast(`Exported ${scopedTickets.length} tickets to CSV.`);
    } else if (target === 'maintenance') {
      exportMaintenanceToCSV(scopedSchedules, `Djezzy_Maintenance_Schedules_${maintenanceScope}`);
      onToast(`Exported ${scopedSchedules.length} maintenance schedules to CSV.`);
    } else if (target === 'assets') {
      exportAssetsToCSV(assets, 'Djezzy_Hardware_Asset_Registry');
      onToast(`Exported ${assets.length} hardware units to CSV.`);
    } else if (target === 'all') {
      // Export all 3 datasets sequentially
      exportTicketsToCSV(tickets, `Djezzy_Archive_All_Tickets_${timestamp}`);
      setTimeout(() => {
        exportMaintenanceToCSV(schedules, `Djezzy_Archive_All_Maintenance_${timestamp}`);
      }, 400);
      setTimeout(() => {
        exportAssetsToCSV(assets, `Djezzy_Archive_All_Assets_${timestamp}`);
      }, 800);
      onToast('Full NOC Archive exported: Tickets, Maintenance Schedules, and Asset Registry.');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('export_modal_title')}</h2>
              <p className="text-xs text-neutral-400">
                {t('export_modal_sub')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Section 1: Choose Dataset */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-2">
              {t('export_modal_title')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTarget('tickets')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  target === 'tickets'
                    ? 'border-red-500 bg-red-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-neutral-200">{t('export_scope_tickets')}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {scopedTickets.length} {t('total_tickets')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('maintenance')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  target === 'maintenance'
                    ? 'border-amber-500 bg-amber-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-neutral-200">{t('export_scope_maintenance')}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {scopedSchedules.length} {t('view_schedules')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('assets')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  target === 'assets'
                    ? 'border-blue-500 bg-blue-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-neutral-200">{t('export_scope_assets')}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {assets.length} {t('view_assets')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('all')}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  target === 'all'
                    ? 'border-purple-500 bg-purple-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold text-neutral-200">{t('export_scope_all')}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  ZIP / Multi-CSV
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Scoping Options based on selection */}
          {target === 'tickets' && (
            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-2">
              <label className="block text-neutral-300 font-medium">{t('status_filter')}:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTicketStatusScope('ALL')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                    ticketStatusScope === 'ALL'
                      ? 'border-red-500 bg-neutral-900 text-white'
                      : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t('export_status_all')} ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTicketStatusScope('ACTIVE')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                    ticketStatusScope === 'ACTIVE'
                      ? 'border-red-500 bg-neutral-900 text-white'
                      : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t('export_status_active')} (
                  {tickets.filter((t) => t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTicketStatusScope('CLOSED')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                    ticketStatusScope === 'CLOSED'
                      ? 'border-red-500 bg-neutral-900 text-white'
                      : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t('export_status_closed')} (
                  {tickets.filter((t) => t.Etat === 'CLOSE' || t.Etat === 'RESOLVED').length})
                </button>
              </div>
            </div>
          )}

          {target === 'maintenance' && (
            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-2">
              <label className="block text-neutral-300 font-medium">
                {t('status_filter')}:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMaintenanceScope('ALL')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                    maintenanceScope === 'ALL'
                      ? 'border-amber-500 bg-neutral-900 text-white'
                      : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t('export_status_all')} ({schedules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceScope('PENDING')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                    maintenanceScope === 'PENDING'
                      ? 'border-amber-500 bg-neutral-900 text-white'
                      : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t('export_status_active')} (
                  {schedules.filter((s) => s.status !== 'COMPLETED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceScope('COMPLETED')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                    maintenanceScope === 'COMPLETED'
                      ? 'border-amber-500 bg-neutral-900 text-white'
                      : 'border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {t('export_status_closed')} (
                  {schedules.filter((s) => s.status === 'COMPLETED').length})
                </button>
              </div>
            </div>
          )}

          {/* Export Specifications & Excel Compatibility notice */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-[11px] text-neutral-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-neutral-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>UTF-8 & Excel / LibreOffice / BI</span>
            </div>
            <p>
              {t('export_modal_notes')}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <span className="font-mono text-xs text-neutral-400 tabular-nums">
            RFC 4180 CSV
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded transition-colors cursor-pointer"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded transition-colors shadow-sm shadow-red-950 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('btn_download_csv')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
