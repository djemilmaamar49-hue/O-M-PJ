import React from 'react';
import { Ticket, MaintenanceSchedule, HardwareAsset } from '../types/telecom';
import { CATEGORY_DESCRIPTIONS, TEAM_LABELS } from '../data/telecomConstants';
import { useLanguage } from '../context/LanguageContext';
import { PredictiveTrendsSection } from './PredictiveTrendsSection';
import { ResourcePlanningSection } from './ResourcePlanningSection';
import { Activity, BarChart3, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

interface AnalyticsViewProps {
  tickets: Ticket[];
  schedules: MaintenanceSchedule[];
  assets: HardwareAsset[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tickets, schedules, assets }) => {
  const { t, isRTL } = useLanguage();

  // Category breakdown
  const categoryCounts: Record<string, number> = {
    COMM: 0,
    ENV: 0,
    EQU: 0,
    QLT: 0,
    QLTY: 0,
  };
  tickets.forEach((tkt) => {
    if (categoryCounts[tkt.Cat_alarme] !== undefined) {
      categoryCounts[tkt.Cat_alarme]++;
    }
  });

  // Assignee team breakdown
  const teamCounts: Record<string, number> = {};
  tickets.forEach((tkt) => {
    teamCounts[tkt.Assigne_a] = (teamCounts[tkt.Assigne_a] || 0) + 1;
  });

  // PM status breakdown
  const completedPM = schedules.filter((s) => s.status === 'COMPLETED').length;
  const overduePM = schedules.filter((s) => s.status === 'OVERDUE').length;
  const inProgressPM = schedules.filter((s) => s.status === 'IN_PROGRESS').length;
  const scheduledPM = schedules.filter((s) => s.status === 'SCHEDULED').length;
  const totalPM = schedules.length || 1;
  const pmCompletionRate = Math.round((completedPM / totalPM) * 100);

  // Asset health breakdown
  const nominalAssets = assets.filter((a) => a.health === 'Nominal').length;
  const degradedAssets = assets.filter((a) => a.health === 'Degraded').length;
  const criticalAssets = assets.filter((a) => a.health === 'Critical').length;

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-500" />
          <span>{t('analytics_title')}</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {t('analytics_sub')}
        </p>
      </div>

      {/* Predictive Trends & Hardware Failure Projections */}
      <PredictiveTrendsSection assets={assets} />

      {/* Resource Planning: Technicians & Spare Parts Forecasting */}
      <ResourcePlanningSection schedules={schedules} assets={assets} tickets={tickets} />

      {/* Grid Row 1: Alarms by Category & Team Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              {t('analytics_category_dist')}
            </h3>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {tickets.length} {t('total_tickets')}
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;
              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="font-semibold text-white">
                      {cat} <span className="text-neutral-500 font-normal font-sans">· {CATEGORY_DESCRIPTIONS[cat as keyof typeof CATEGORY_DESCRIPTIONS] || ''}</span>
                    </span>
                    <span className="font-mono tabular-nums text-neutral-400 font-medium">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full rounded-full ${
                        cat === 'COMM'
                          ? 'bg-blue-500'
                          : cat === 'ENV'
                          ? 'bg-amber-400'
                          : cat === 'EQU'
                          ? 'bg-purple-400'
                          : cat === 'QLT'
                          ? 'bg-red-500'
                          : 'bg-rose-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              {t('analytics_team_dist')}
            </h3>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {t('all_teams')}
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(teamCounts).map(([team, count]) => (
              <div
                key={team}
                className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-neutral-200">{team}</span>
                  <div className="text-[10px] text-neutral-500">
                    {TEAM_LABELS[team as keyof typeof TEAM_LABELS]?.role || 'Specialized unit'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-200 tabular-nums">
                    {count}
                  </span>
                  <span className="text-[10px] text-neutral-500">{t('total_tickets')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Row 2: Hardware Maintenance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PM Health */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>{t('analytics_pm_fulfillment')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {pmCompletionRate}%
            </span>
            <span className="text-xs text-neutral-400">{t('analytics_completion_rate')}</span>
          </div>
          <div className="space-y-1 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
            <div className="flex justify-between">
              <span>{t('analytics_completed_pm')}</span>
              <span className="font-mono text-neutral-200">{completedPM}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics_overdue_pm')}</span>
              <span className="font-mono text-red-400 font-bold">{overduePM}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics_in_field_pm')}</span>
              <span className="font-mono text-amber-400">{inProgressPM}</span>
            </div>
          </div>
        </div>

        {/* Hardware Assets Operational Health */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>{t('analytics_hardware_health')}</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {assets.length}
            </span>
            <span className="text-xs text-neutral-400">{t('analytics_monitored_units')}</span>
          </div>
          <div className="space-y-1 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('nominal')}:
              </span>
              <span className="font-mono text-neutral-200">{nominalAssets}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> {t('degraded')}:
              </span>
              <span className="font-mono text-amber-400">{degradedAssets}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" /> {t('critical')}:
              </span>
              <span className="font-mono text-red-400 font-bold">{criticalAssets}</span>
            </div>
          </div>
        </div>

        {/* SLA MTTR Compliance */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>{t('analytics_sla_mttr')}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">2h 45m</span>
            <span className="text-xs text-neutral-400">{t('analytics_mttr_unit')}</span>
          </div>
          <div className="space-y-1 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
            <div className="flex justify-between">
              <span>{t('analytics_critical_limit')}</span>
              <span className="font-mono text-neutral-300">4h</span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics_major_limit')}</span>
              <span className="font-mono text-neutral-300">8h</span>
            </div>
            <div className="flex justify-between">
              <span>{t('analytics_overall_adherence')}</span>
              <span className="font-mono text-emerald-400 font-bold">96.8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
