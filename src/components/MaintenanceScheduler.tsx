import React, { useState, useMemo } from 'react';
import {
  MaintenanceSchedule,
  HardwareAsset,
  MaintenanceStatus,
  MaintenanceType,
  EquipmentType,
  Ticket,
} from '../types/telecom';
import { EQUIPMENT_TYPES } from '../data/telecomConstants';
import { exportMaintenanceToCSV, exportAssetsToCSV } from '../utils/csvExporter';
import {
  calculateAssetRiskScore,
  getAssetsNearingFailure,
  AssetRiskAssessment,
  RiskLevel,
} from '../utils/telemetryRiskCalculator';
import { useLanguage } from '../context/LanguageContext';
import {
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  CheckSquare,
  Square,
  Building,
  ArrowRight,
  ShieldCheck,
  Zap,
  Battery,
  Wind,
  Radio,
  Download,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Flame,
  ShieldAlert,
  Sliders,
  Package,
} from 'lucide-react';

interface MaintenanceSchedulerProps {
  schedules: MaintenanceSchedule[];
  assets: HardwareAsset[];
  tickets: Ticket[];
  onOpenNewMaintenance: () => void;
  onOpenNewCM?: () => void;
  onOpenNewMaintenanceForAsset?: (asset: HardwareAsset) => void;
  onToggleTask: (scheduleId: string, taskId: string) => void;
  onCompleteSchedule: (scheduleId: string) => void;
  onSelectTicketById: (ticketId: string) => void;
  initialStatusFilter?: MaintenanceStatus | '';
}

export const MaintenanceScheduler: React.FC<MaintenanceSchedulerProps> = ({
  schedules,
  assets,
  tickets,
  onOpenNewMaintenance,
  onOpenNewCM,
  onOpenNewMaintenanceForAsset,
  onToggleTask,
  onCompleteSchedule,
  onSelectTicketById,
  initialStatusFilter = '',
}) => {
  const { t, isRTL } = useLanguage();
  const [activeView, setActiveView] = useState<'schedules' | 'assets'>('schedules');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>(initialStatusFilter);
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | ''>('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH_PLUS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null);

  // Failure Notification alert banner states
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [isAlertExpanded, setIsAlertExpanded] = useState(true);

  // Compute quantitative Risk Scores for all assets
  const assetRiskAssessments = useMemo(() => {
    const map = new Map<string, AssetRiskAssessment>();
    assets.forEach((a) => {
      map.set(a.id, calculateAssetRiskScore(a));
    });
    return map;
  }, [assets]);

  // Identify all hardware assets nearing critical failure thresholds
  const criticalFailureAlerts = useMemo(() => {
    return getAssetsNearingFailure(assets, 65);
  }, [assets]);

  const getStatusLabel = (status: MaintenanceStatus) => {
    switch (status) {
      case 'OVERDUE':
        return t('status_overdue');
      case 'IN_PROGRESS':
        return t('status_in_progress');
      case 'COMPLETED':
        return t('status_completed');
      case 'SCHEDULED':
        return t('status_scheduled');
      default:
        return status;
    }
  };

  const getHealthLabel = (health: string) => {
    if (health === 'Nominal') return t('nominal');
    if (health === 'Degraded') return t('degraded');
    if (health === 'Critical') return t('critical');
    return health;
  };

  const getRiskBadgeLabel = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return t('risk_critical_badge');
      case 'high':
        return t('risk_high_badge');
      case 'moderate':
        return t('risk_moderate_badge');
      case 'nominal':
      default:
        return t('risk_nominal_badge');
    }
  };

  // Sync if initialStatusFilter changes
  React.useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (typeFilter && s.maintenanceType !== typeFilter) return false;
      if (equipmentFilter && s.equipmentType !== equipmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = s.id.toLowerCase().includes(q);
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchSite = s.siteId.toLowerCase().includes(q) || s.siteName.toLowerCase().includes(q);
        const matchTech = s.assignedTechnician.toLowerCase().includes(q);
        const matchWilaya = s.wilaya.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchSite && !matchTech && !matchWilaya) return false;
      }
      return true;
    });
  }, [schedules, statusFilter, equipmentFilter, searchQuery]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (equipmentFilter && a.equipmentType !== equipmentFilter) return false;

      const assessment = assetRiskAssessments.get(a.id);
      if (riskFilter === 'CRITICAL') {
        if (!assessment || assessment.level !== 'critical') return false;
      } else if (riskFilter === 'HIGH_PLUS') {
        if (!assessment || (!assessment.isNearingCritical && assessment.score < 65)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = a.id.toLowerCase().includes(q);
        const matchSite = a.siteId.toLowerCase().includes(q) || a.siteName.toLowerCase().includes(q);
        const matchModel = a.model.toLowerCase().includes(q);
        if (!matchId && !matchSite && !matchModel) return false;
      }
      return true;
    });
  }, [assets, equipmentFilter, riskFilter, searchQuery, assetRiskAssessments]);

  const getEquipmentIcon = (type: EquipmentType) => {
    switch (type) {
      case 'Generator (GE)':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'Battery Bank':
        return <Battery className="w-3.5 h-3.5 text-red-400" />;
      case 'HVAC / Clim':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Microwave Link':
        return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const handleExportCSV = () => {
    if (activeView === 'schedules') {
      exportMaintenanceToCSV(
        filteredSchedules,
        statusFilter ? `Djezzy_Maintenance_${statusFilter}` : 'Djezzy_Maintenance_Schedules'
      );
    } else {
      exportAssetsToCSV(filteredAssets, 'Djezzy_Hardware_Asset_Registry');
    }
  };

  const handleScheduleEmergencyPM = (asset: HardwareAsset) => {
    if (onOpenNewMaintenanceForAsset) {
      onOpenNewMaintenanceForAsset(asset);
    } else {
      onOpenNewMaintenance();
    }
  };

  const handleInspectAssetInTable = (assetId: string) => {
    setActiveView('assets');
    setSearchQuery(assetId);
    setHighlightedAssetId(assetId);
    setTimeout(() => {
      const el = document.getElementById(`asset-row-${assetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* Critical Telemetry Failure Threshold Notification Banner */}
      {/* ============================================================== */}
      {criticalFailureAlerts.length > 0 && !isAlertDismissed && (
        <div className="relative overflow-hidden rounded-xl border border-red-500/50 bg-gradient-to-r from-red-950/80 via-neutral-900 to-neutral-900 p-4 sm:p-5 shadow-xl shadow-red-950/40">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-start sm:items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 shadow-inner shrink-0">
                <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                    <span>{t('risk_alert_title')}</span>
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    {criticalFailureAlerts.length} {t('critical')}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-0.5">
                  <strong className="text-red-300">{criticalFailureAlerts.length}</strong>{' '}
                  {t('risk_alert_sub')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setIsAlertExpanded(!isAlertExpanded)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-800/90 hover:bg-neutral-800 rounded-lg border border-neutral-700/80 transition-colors cursor-pointer"
              >
                <span>{isAlertExpanded ? 'Hide Details' : `Show At-Risk Assets (${criticalFailureAlerts.length})`}</span>
                {isAlertExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsAlertDismissed(true)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                title={t('btn_dismiss_alert')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Expanded At-Risk Asset Cards */}
          {isAlertExpanded && (
            <div className="mt-4 pt-4 border-t border-red-900/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
              {criticalFailureAlerts.map((assessment) => {
                const { asset, score, level, factors, primaryThreat, recommendedAction, urgencyHours } = assessment;
                const isVeryCritical = score >= 80;

                return (
                  <div
                    key={asset.id}
                    className={`rounded-lg p-3.5 border transition-all ${
                      isVeryCritical
                        ? 'bg-red-950/40 border-red-700/70 hover:border-red-500'
                        : 'bg-neutral-900/90 border-amber-800/60 hover:border-amber-600'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {getEquipmentIcon(asset.equipmentType)}
                          <span className="font-mono text-xs font-bold text-white tracking-wider truncate">
                            {asset.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-300 font-medium truncate mt-0.5">
                          {asset.model}
                        </div>
                      </div>

                      {/* Risk Score Pill */}
                      <div className="text-right shrink-0">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            isVeryCritical
                              ? 'bg-red-500 text-white shadow-sm shadow-red-950'
                              : 'bg-amber-500 text-neutral-950 font-bold'
                          }`}
                        >
                          <Flame className="w-3 h-3" />
                          <span>{score}/100</span>
                        </div>
                        <div className="text-[10px] uppercase font-semibold text-red-300 tracking-wider mt-0.5">
                          {getRiskBadgeLabel(level)}
                        </div>
                      </div>
                    </div>

                    {/* Site Information */}
                    <div className="text-[11px] text-neutral-400 mb-2.5 flex items-center gap-1">
                      <Building className="w-3 h-3 text-neutral-500" />
                      <span className="font-mono text-neutral-300">{asset.siteId}</span>
                      <span className="text-neutral-600">·</span>
                      <span className="truncate">{asset.siteName}</span>
                    </div>

                    {/* Telemetry Breaches / Factors */}
                    <div className="space-y-1 mb-3">
                      <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                        Telemetry Violations:
                      </div>
                      {factors.slice(0, 2).map((factor, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded bg-neutral-950/70 border border-neutral-800/80"
                        >
                          <span className="text-neutral-300 font-medium truncate">
                            {factor.parameter}:
                          </span>
                          <span className="font-mono font-bold text-red-400 ml-1">
                            {factor.value}{' '}
                            <span className="text-[10px] font-normal text-neutral-500">
                              ({factor.threshold})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Recommended NOC Action */}
                    <div className="text-[11px] text-neutral-300 bg-neutral-950/40 p-2 rounded border border-neutral-800/60 mb-3 line-clamp-2">
                      <span className="text-amber-400 font-semibold">{t('risk_recommended_action')}: </span>
                      {recommendedAction}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/70">
                      <button
                        onClick={() => handleScheduleEmergencyPM(asset)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer shadow-sm shadow-red-950"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{t('btn_schedule_emergency_pm')}</span>
                      </button>
                      <button
                        onClick={() => handleInspectAssetInTable(asset.id)}
                        className="flex items-center justify-center p-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                        title={t('btn_inspect_asset')}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dismissed notification reminder pill */}
      {criticalFailureAlerts.length > 0 && isAlertDismissed && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-red-950/30 border border-red-900/40 rounded-lg text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span>
              <strong className="text-red-300">{criticalFailureAlerts.length}</strong> {t('risk_alert_sub')}
            </span>
          </div>
          <button
            onClick={() => {
              setIsAlertDismissed(false);
              setIsAlertExpanded(true);
            }}
            className="text-amber-400 hover:text-amber-300 text-xs font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1"
          >
            <span>{t('btn_restore_alert')}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Top Header & View Tabs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>{t('pm_title')}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('pm_sub')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
              <button
                onClick={() => setActiveView('schedules')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  activeView === 'schedules'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('view_schedules')} ({schedules.length})
              </button>
              <button
                onClick={() => setActiveView('assets')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'assets'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>{t('view_assets')} ({assets.length})</span>
                {criticalFailureAlerts.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                    {criticalFailureAlerts.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              title={t('export_csv')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('export_csv')}</span>
            </button>

            {/* Planifier CM - Primary Corrective Maintenance Action */}
            <button
              onClick={onOpenNewCM || onOpenNewMaintenance}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded transition-colors whitespace-nowrap shadow-sm shadow-amber-950/40 cursor-pointer"
              title="Planifier une Maintenance Corrective (CM)"
            >
              <Wrench className="w-3.5 h-3.5 text-neutral-950" />
              <span>{t('btn_schedule_cm')}</span>
            </button>

            {/* Planifier PM - Routine Preventive Maintenance */}
            <button
              onClick={onOpenNewMaintenance}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              title="Planifier une Maintenance Préventive (PM)"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('btn_schedule_pm')}</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-800/80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2 text-neutral-500" />
            <input
              type="text"
              placeholder={t('search_pm_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 pl-9 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {activeView === 'schedules' && (
            <>
              {/* Maintenance Type Filter (All, CM, PM, Emergency) */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as MaintenanceType | '')}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
              >
                <option value="">{t('all_maintenance_types')}</option>
                <option value="CORRECTIVE">{t('type_filter_cm')}</option>
                <option value="PREVENTIVE">{t('type_filter_pm')}</option>
                <option value="EMERGENCY_REPAIR">{t('type_filter_emergency')}</option>
                <option value="COMMISSIONING">{t('type_filter_commissioning')}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as MaintenanceStatus | '')}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
              >
                <option value="">{t('all_statuses')}</option>
                <option value="OVERDUE">{t('status_overdue')}</option>
                <option value="IN_PROGRESS">{t('status_in_progress')}</option>
                <option value="SCHEDULED">{t('status_scheduled')}</option>
                <option value="COMPLETED">{t('status_completed')}</option>
              </select>
            </>
          )}

          {activeView === 'assets' && (
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as 'ALL' | 'CRITICAL' | 'HIGH_PLUS')}
              className={`bg-neutral-950 border rounded px-2 py-1.5 text-xs focus:outline-none ${
                riskFilter === 'CRITICAL'
                  ? 'border-red-500 text-red-300 font-bold'
                  : riskFilter === 'HIGH_PLUS'
                  ? 'border-amber-500 text-amber-300 font-medium'
                  : 'border-neutral-800 text-neutral-300'
              }`}
            >
              <option value="ALL">{t('risk_filter_all')}</option>
              <option value="CRITICAL">{t('risk_filter_critical')}</option>
              <option value="HIGH_PLUS">High & Critical Risk (Score ≥ 65)</option>
            </select>
          )}

          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value as EquipmentType | '')}
            className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
          >
            <option value="">{t('all_equipment')}</option>
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>

          {(statusFilter || typeFilter || equipmentFilter || searchQuery || riskFilter !== 'ALL') && (
            <button
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setEquipmentFilter('');
                setRiskFilter('ALL');
                setSearchQuery('');
                setHighlightedAssetId(null);
              }}
              className="px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded cursor-pointer"
            >
              {t('clear_filters')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'schedules' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Schedules List */}
          <div className="lg:col-span-2 space-y-3">
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map((schedule) => {
                const totalTasks = schedule.tasksChecklist.length;
                const completedTasks = schedule.tasksChecklist.filter((t) => t.completed).length;
                const percentDone =
                  totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const isSelected = selectedScheduleId === schedule.id;

                return (
                  <div
                    key={schedule.id}
                    onClick={() => setSelectedScheduleId(schedule.id)}
                    className={`p-4 bg-neutral-900 border rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 ring-1 ring-amber-500/30'
                        : schedule.status === 'OVERDUE'
                        ? 'border-red-900/60 bg-red-950/5 hover:border-red-700'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white tabular-nums">
                          {schedule.id}
                        </span>
                        <span className="text-neutral-600" aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 text-xs text-neutral-300 font-medium">
                          {getEquipmentIcon(schedule.equipmentType)}
                          {schedule.equipmentType}
                        </span>
                        <span className="text-neutral-600" aria-hidden="true">·</span>
                        {/* Distinct CM vs PM badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                            schedule.maintenanceType === 'CORRECTIVE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : schedule.maintenanceType === 'EMERGENCY_REPAIR'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {schedule.maintenanceType === 'CORRECTIVE' ? (
                            <>
                              <Wrench className="w-2.5 h-2.5" />
                              <span>{t('cm_badge')}</span>
                            </>
                          ) : schedule.maintenanceType === 'EMERGENCY_REPAIR' ? (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{t('em_badge')}</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{t('pm_badge')}</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          schedule.status === 'OVERDUE'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : schedule.status === 'IN_PROGRESS'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : schedule.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        {getStatusLabel(schedule.status)}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white mb-2">{schedule.title}</h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-neutral-400 mb-3 bg-neutral-950/50 p-2 rounded border border-neutral-800/60">
                      <div>
                        <span className="text-neutral-500 block">{t('bts_infra_site')}</span>
                        <span className="font-medium text-neutral-300">{schedule.siteName}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">{t('technician_label')}</span>
                        <span className="font-medium text-neutral-300">{schedule.assignedTechnician}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">{t('due_date')}</span>
                        <span
                          className={`font-mono font-medium ${
                            schedule.status === 'OVERDUE' ? 'text-red-400 font-bold' : 'text-neutral-300'
                          }`}
                        >
                          {schedule.dueDate}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">{t('duration_hours')}</span>
                        <span className="font-mono text-neutral-300">{schedule.estimatedHours}h</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-400">
                          {completedTasks}/{totalTasks} tasks completed
                        </span>
                        <span className="font-mono text-neutral-300 font-semibold">{percentDone}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percentDone === 100
                              ? 'bg-emerald-500'
                              : percentDone > 50
                              ? 'bg-amber-500'
                              : 'bg-neutral-600'
                          }`}
                          style={{ width: `${percentDone}%` }}
                        />
                      </div>
                    </div>

                    {/* Spare Parts Badge if present */}
                    {schedule.sparePartsUsed && schedule.sparePartsUsed.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-neutral-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3 text-amber-400" />
                          <span>Pièces :</span>
                        </span>
                        {schedule.sparePartsUsed.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono border border-neutral-700"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Linked Ticket Badge if present */}
                    {schedule.linkedTicketId && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                        <span className="text-neutral-500">{t('linked_ticket_note')}:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicketById(schedule.linkedTicketId!);
                          }}
                          className="font-mono text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <span>{schedule.linkedTicketId}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-lg">
                <Wrench className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                {t('no_schedules_found')}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Checklist View of Selected Schedule */}
          <div className="space-y-3">
            {selectedScheduleId ? (
              (() => {
                const schedule = schedules.find((s) => s.id === selectedScheduleId);
                if (!schedule) return null;
                const allCompleted = schedule.tasksChecklist.every((t) => t.completed);

                return (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-400">{schedule.id}</div>
                        <div className="text-sm font-semibold text-white mt-0.5">{schedule.title}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          schedule.status === 'OVERDUE'
                            ? 'bg-red-950 text-red-400'
                            : schedule.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-amber-950 text-amber-400'
                        }`}
                      >
                        {getStatusLabel(schedule.status)}
                      </span>
                    </div>

                    {/* Interactive Checklist */}
                    <div>
                      <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('checklist_title')}</span>
                      </div>
                      <div className="space-y-2">
                        {schedule.tasksChecklist.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => onToggleTask(schedule.id, task.id)}
                            className="flex items-start gap-2 p-2 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 cursor-pointer group transition-colors"
                          >
                            <button className="mt-0.5 text-neutral-500 group-hover:text-amber-400 transition-colors">
                              {task.completed ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span
                              className={`text-xs ${
                                task.completed
                                  ? 'line-through text-neutral-500'
                                  : 'text-neutral-200 group-hover:text-white'
                              }`}
                            >
                              {task.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes & Parts */}
                    {schedule.notes && (
                      <div className="text-xs">
                        <span className="text-neutral-500 text-[11px] block">Field Notes</span>
                        <p className="text-neutral-300 italic text-[11px] bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                          "{schedule.notes}"
                        </p>
                      </div>
                    )}

                    {schedule.sparePartsUsed && schedule.sparePartsUsed.length > 0 && (
                      <div className="text-xs">
                        <span className="text-neutral-500 text-[11px] block">Spare Parts Logged</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {schedule.sparePartsUsed.map((p, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-neutral-300"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completion Action */}
                    {schedule.status !== 'COMPLETED' && (
                      <button
                        onClick={() => onCompleteSchedule(schedule.id)}
                        disabled={!allCompleted}
                        className={`w-full py-2 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          allCompleted
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {allCompleted
                            ? t('btn_complete_pm')
                            : t('btn_complete_first')}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-center text-xs text-neutral-400">
                <CheckSquare className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <div className="font-semibold text-neutral-300">{t('checklist_title')}</div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {t('no_tickets_sub')}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Asset Registry View with Risk Score & Live Telemetry */
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-4">{t('asset_serial')}</th>
                  <th className="py-3 px-3">{t('asset_model')}</th>
                  <th className="py-3 px-3">{t('site_code_label')}</th>
                  <th className="py-3 px-3">{t('asset_health')}</th>
                  <th className="py-3 px-3">{t('risk_score_label')}</th>
                  <th className="py-3 px-3">{t('asset_telemetry')}</th>
                  <th className="py-3 px-3">{t('asset_last_pm')}</th>
                  <th className="py-3 px-3">{t('asset_next_pm')}</th>
                  <th className="py-3 px-4 text-right">{t('col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredAssets.map((asset) => {
                  const assessment = assetRiskAssessments.get(asset.id);
                  const score = assessment ? assessment.score : 0;
                  const level = assessment ? assessment.level : 'nominal';
                  const isCritical = level === 'critical';
                  const isHigh = level === 'high';
                  const isHighlighted = highlightedAssetId === asset.id;

                  return (
                    <tr
                      id={`asset-row-${asset.id}`}
                      key={asset.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-950/40 ring-1 ring-amber-500'
                          : isCritical
                          ? 'bg-red-950/20 hover:bg-red-950/30'
                          : isHigh
                          ? 'bg-amber-950/10 hover:bg-neutral-800/50'
                          : 'hover:bg-neutral-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isCritical && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                          )}
                          <span>{asset.id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-200">{asset.model}</div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                          {getEquipmentIcon(asset.equipmentType)}
                          <span>{asset.equipmentType}</span>
                          <span className="text-neutral-600" aria-hidden="true">·</span>
                          <span className="font-mono text-[10px]">S/N: {asset.serialNumber}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono text-neutral-300">{asset.siteId}</div>
                        <div className="text-[11px] text-neutral-400">{asset.siteName}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              asset.health === 'Nominal'
                                ? 'bg-emerald-400'
                                : asset.health === 'Degraded'
                                ? 'bg-amber-400'
                                : 'bg-red-500'
                            }`}
                          />
                          <span
                            className={
                              asset.health === 'Nominal'
                                ? 'text-emerald-400'
                                : asset.health === 'Degraded'
                                ? 'text-amber-400'
                                : 'text-red-400 font-semibold'
                            }
                          >
                            {getHealthLabel(asset.health)}
                          </span>
                        </div>
                      </td>

                      {/* Risk Score Column */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                                isCritical
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : isHigh
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : score >= 40
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {score}/100
                            </span>
                            <span
                              className={`text-[10px] font-semibold ${
                                isCritical
                                  ? 'text-red-400 font-bold'
                                  : isHigh
                                  ? 'text-amber-400'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {getRiskBadgeLabel(level)}
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isCritical
                                  ? 'bg-red-500'
                                  : isHigh
                                  ? 'bg-amber-500'
                                  : score >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(5, score)}%` }}
                            />
                          </div>

                          {assessment && assessment.factors.length > 0 && (
                            <div className="text-[10px] text-neutral-400">
                              {assessment.factors.length} {t('risk_factors_count')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Live Telemetry with Out-of-Threshold Highlighting */}
                      <td className="py-3 px-3 font-mono text-[11px] tabular-nums text-neutral-300">
                        {asset.telemetry.fuelLevelPercent !== undefined && (
                          <span
                            className={
                              asset.telemetry.fuelLevelPercent <= 35
                                ? 'text-red-400 font-bold'
                                : 'text-neutral-300'
                            }
                          >
                            Fuel: {asset.telemetry.fuelLevelPercent}%{' '}
                            {asset.telemetry.fuelLevelPercent <= 35 && '⚠️'} ·{' '}
                          </span>
                        )}
                        {asset.telemetry.batteryVoltage !== undefined && (
                          <span
                            className={
                              asset.telemetry.batteryVoltage <= 48.0
                                ? 'text-red-400 font-bold'
                                : 'text-neutral-300'
                            }
                          >
                            {asset.telemetry.batteryVoltage}V{' '}
                            {asset.telemetry.batteryVoltage <= 48.0 && '⚠️'} ·{' '}
                          </span>
                        )}
                        {asset.telemetry.autonomyHoursEstimated !== undefined && (
                          <span
                            className={
                              asset.telemetry.autonomyHoursEstimated <= 2.5
                                ? 'text-red-400 font-bold'
                                : 'text-neutral-300'
                            }
                          >
                            Autonomy: {asset.telemetry.autonomyHoursEstimated}h{' '}
                            {asset.telemetry.autonomyHoursEstimated <= 2.5 && '⚠️'} ·{' '}
                          </span>
                        )}
                        {asset.telemetry.temperatureCelsius !== undefined && (
                          <span
                            className={
                              asset.telemetry.temperatureCelsius >= 35
                                ? 'text-red-400 font-bold'
                                : 'text-neutral-300'
                            }
                          >
                            {asset.telemetry.temperatureCelsius}°C{' '}
                            {asset.telemetry.temperatureCelsius >= 35 && '⚠️'} ·{' '}
                          </span>
                        )}
                        {asset.telemetry.rslDbm !== undefined && (
                          <span
                            className={
                              asset.telemetry.rslDbm <= -65.0
                                ? 'text-red-400 font-bold'
                                : 'text-neutral-300'
                            }
                          >
                            RSL: {asset.telemetry.rslDbm} dBm{' '}
                            {asset.telemetry.rslDbm <= -65.0 && '⚠️'}
                          </span>
                        )}
                        {!asset.telemetry.fuelLevelPercent &&
                          !asset.telemetry.batteryVoltage &&
                          !asset.telemetry.temperatureCelsius &&
                          !asset.telemetry.rslDbm && (
                            <span className="text-neutral-500">{t('nominal')}</span>
                          )}
                      </td>

                      <td className="py-3 px-3 font-mono tabular-nums text-neutral-400 text-[11px] whitespace-nowrap">
                        {asset.lastMaintenanceDate}
                      </td>

                      <td className="py-3 px-3 font-mono tabular-nums text-[11px] whitespace-nowrap">
                        <span
                          className={
                            asset.nextMaintenanceDate < '2026-09-27'
                              ? 'text-red-400 font-bold'
                              : 'text-neutral-300'
                          }
                        >
                          {asset.nextMaintenanceDate}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {assessment && assessment.isNearingCritical ? (
                          <button
                            onClick={() => handleScheduleEmergencyPM(asset)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded transition-colors cursor-pointer shadow-sm shadow-red-950"
                          >
                            {t('btn_schedule_emergency_pm')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleScheduleEmergencyPM(asset)}
                            className="px-2.5 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                          >
                            {t('btn_schedule_pm')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
