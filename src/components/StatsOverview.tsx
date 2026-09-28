import React from 'react';
import { Ticket, MaintenanceSchedule, SiteInfo } from '../types/telecom';
import { AlertTriangle, ShieldAlert, Wrench, Users, Activity, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StatsOverviewProps {
  tickets: Ticket[];
  schedules: MaintenanceSchedule[];
  sites: SiteInfo[];
  onFilterPriority?: (p: 'Critical' | 'Major' | 'Minor' | '') => void;
  onFilterMaintenance?: (status: 'OVERDUE' | 'IN_PROGRESS' | 'SCHEDULED' | '') => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  tickets,
  schedules,
  sites,
  onFilterPriority,
  onFilterMaintenance,
}) => {
  const { t } = useLanguage();
  const openTickets = tickets.filter((t) => t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED');
  const criticalTickets = openTickets.filter((t) => t.Priorite === 'Critical');
  const majorTickets = openTickets.filter((t) => t.Priorite === 'Major');
  const minorTickets = openTickets.filter((t) => t.Priorite === 'Minor');

  const customerRequests = openTickets.filter((t) => t.type === 'CUSTOMER_SUPPORT');
  const corporateComplaints = customerRequests.filter(
    (t) => t.customer?.tier === 'VIP_CORPORATE' || t.customer?.tier === 'BUSINESS_PRO'
  );

  const overdueMaintenance = schedules.filter((s) => s.status === 'OVERDUE');
  const inProgressMaintenance = schedules.filter((s) => s.status === 'IN_PROGRESS');
  const scheduledMaintenance = schedules.filter((s) => s.status === 'SCHEDULED');

  const sitesWithOutage = sites.filter((s) => s.status === 'Outage');
  const sitesDegraded = sites.filter((s) => s.status === 'Degraded');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Network Incidents & Alarms */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
          <span>{t('stat_incidents')}</span>
          <ShieldAlert className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {openTickets.length}
          </span>
          <span className="text-xs text-neutral-400">{t('stat_incidents_sub')}</span>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-neutral-800/80 text-xs">
          <button
            onClick={() => onFilterPriority?.('Critical')}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-red-400 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>{t('critical')}</span>
            <span className="font-mono tabular-nums font-semibold text-red-400">
              {criticalTickets.length}
            </span>
          </button>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <button
            onClick={() => onFilterPriority?.('Major')}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{t('major')}</span>
            <span className="font-mono tabular-nums font-semibold text-amber-400">
              {majorTickets.length}
            </span>
          </button>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <button
            onClick={() => onFilterPriority?.('Minor')}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-blue-400 transition-colors cursor-pointer"
          >
            <span>{t('minor')}</span>
            <span className="font-mono tabular-nums font-semibold text-neutral-400">
              {minorTickets.length}
            </span>
          </button>
        </div>
      </div>

      {/* Metric 2: Customer Support Care */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
          <span>{t('stat_customer')}</span>
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {customerRequests.length}
          </span>
          <span className="text-xs text-neutral-400">{t('stat_customer_sub')}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-semibold font-mono tabular-nums">
              {corporateComplaints.length}
            </span>
            <span>{t('stat_corporate')}</span>
          </div>
          <span className="text-neutral-500">SLA 4h max</span>
        </div>
      </div>

      {/* Metric 3: Hardware Maintenance Schedules */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
          <span>{t('stat_maintenance')}</span>
          <Wrench className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {overdueMaintenance.length + inProgressMaintenance.length + scheduledMaintenance.length}
          </span>
          <span className="text-xs text-neutral-400">{t('stat_maintenance_sub')}</span>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-neutral-800/80 text-xs">
          <button
            onClick={() => onFilterMaintenance?.('OVERDUE')}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{t('overdue')}</span>
            <span className="font-mono tabular-nums font-bold">
              ({overdueMaintenance.length})
            </span>
          </button>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <button
            onClick={() => onFilterMaintenance?.('IN_PROGRESS')}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            <span>{t('in_field')}</span>
            <span className="font-mono tabular-nums font-bold">
              ({inProgressMaintenance.length})
            </span>
          </button>
        </div>
      </div>

      {/* Metric 4: Infrastructure & SLA Health */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between text-neutral-400 text-xs font-medium mb-2">
          <span>{t('stat_availability')}</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            99.64%
          </span>
          <span className="text-xs text-neutral-400">{t('stat_availability_sub')}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-red-400 font-semibold">
              {sitesWithOutage.length}
            </span>
            <span>{t('outages')}</span>
            <span className="text-neutral-600">·</span>
            <span className="font-mono tabular-nums text-amber-400 font-semibold">
              {sitesDegraded.length}
            </span>
            <span>{t('degraded')}</span>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">{t('mttr_label')}</span>
        </div>
      </div>
    </div>
  );
};
