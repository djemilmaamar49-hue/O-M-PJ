import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { MaintenanceSchedule, HardwareAsset, Ticket } from '../types/telecom';
import {
  calculateResourcePlan,
  SparePartForecast,
  TechnicianForecast,
} from '../utils/resourcePlanningModel';
import { useLanguage } from '../context/LanguageContext';
import {
  Users2,
  Boxes,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Filter,
  ShoppingCart,
  ShieldCheck,
  Building,
  Zap,
  Battery,
  Wind,
  Radio,
  FileCheck,
  PackageCheck,
  Check,
} from 'lucide-react';

interface ResourcePlanningSectionProps {
  schedules: MaintenanceSchedule[];
  assets: HardwareAsset[];
  tickets: Ticket[];
}

export const ResourcePlanningSection: React.FC<ResourcePlanningSectionProps> = ({
  schedules,
  assets,
  tickets,
}) => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'both' | 'technicians' | 'parts'>('both');
  const [selectedPartCategory, setSelectedPartCategory] = useState<string>('ALL');
  const [reorderedSkus, setReorderedSkus] = useState<Set<string>>(new Set());
  const [orderToast, setOrderToast] = useState<string | null>(null);

  // Compute 30-day forecast plan
  const plan = useMemo(() => {
    return calculateResourcePlan(schedules, assets, tickets);
  }, [schedules, assets, tickets]);

  const filteredParts = useMemo(() => {
    if (selectedPartCategory === 'ALL') return plan.sparePartsInventory;
    return plan.sparePartsInventory.filter((p) => p.category === selectedPartCategory);
  }, [plan.sparePartsInventory, selectedPartCategory]);

  const handleTriggerReorder = (sku: string, partName: string) => {
    setReorderedSkus((prev) => new Set(prev).add(sku));
    setOrderToast(`${partName} (${sku}): ${t('resource_reorder_success')}`);
    setTimeout(() => {
      setOrderToast(null);
    }, 4500);
  };

  const getStatusBadge = (status: TechnicianForecast['status']) => {
    switch (status) {
      case 'DEFICIT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            {t('resource_status_deficit')}
          </span>
        );
      case 'SURPLUS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            {t('resource_status_surplus')}
          </span>
        );
      case 'OPTIMAL':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {t('resource_status_optimal')}
          </span>
        );
    }
  };

  const getPartReorderBadge = (status: SparePartForecast['reorderStatus']) => {
    switch (status) {
      case 'CRITICAL_SHORTAGE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
            {t('resource_status_critical_badge')}
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {t('resource_status_low_badge')}
          </span>
        );
      case 'SUFFICIENT':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {t('resource_status_sufficient_badge')}
          </span>
        );
    }
  };

  const getCategoryIcon = (category: SparePartForecast['category']) => {
    switch (category) {
      case 'ENERGY':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'HVAC':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'TRANSMISSION':
        return <Radio className="w-3.5 h-3.5 text-purple-400" />;
      case 'RADIO':
        return <Radio className="w-3.5 h-3.5 text-blue-400" />;
      case 'FIBER':
      default:
        return <Boxes className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-6">
      {/* Toast Notification for Reorder simulation */}
      {orderToast && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/90 border border-emerald-700/80 text-xs text-emerald-200 shadow-xl transition-all">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{orderToast}</span>
          </div>
          <button
            onClick={() => setOrderToast(null)}
            className="text-emerald-400 hover:text-white ml-2 text-xs font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{t('resource_planning_title')}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full">
                  NEXT 30 DAYS
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t('resource_planning_sub')}
              </p>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'both'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Resources
          </button>
          <button
            onClick={() => setActiveTab('technicians')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'technicians'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Field Technicians</span>
          </button>
          <button
            onClick={() => setActiveTab('parts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
              activeTab === 'parts'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
            <span>Spare Parts Inventory</span>
            {plan.summary.criticalPartsShortageCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Technicians Forecast */}
        <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>{t('resource_required_techs')}</span>
            <Users2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {plan.summary.totalRequiredTechs}
            </span>
            <span className="text-xs text-neutral-500">
              vs {plan.summary.totalAvailableTechs} {t('resource_available_techs')}
            </span>
          </div>
          <div className="text-[11px] text-red-400 font-semibold pt-1 border-t border-neutral-800/80 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              Net Deficit: -{plan.summary.netStaffingDeficit} Technicians (Peak: O&M_ENV)
            </span>
          </div>
        </div>

        {/* Forecasted Man Hours */}
        <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>{t('resource_man_hours')}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {plan.summary.totalForecastedManHours}h
            </span>
            <span className="text-xs text-neutral-500">Next 30 Days</span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 flex justify-between">
            <span>Scheduled: 1,530h</span>
            <span className="text-red-400 font-medium">ML Failures: 920h</span>
          </div>
        </div>

        {/* Critical Stockouts */}
        <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>{t('resource_critical_stockouts')}</span>
            <Boxes className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-red-400 tabular-nums">
              {plan.summary.criticalPartsShortageCount}
            </span>
            <span className="text-xs text-neutral-500">Critical SKUs</span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80">
            <span>Batteries, GenSet Filters & HVAC Mesh</span>
          </div>
        </div>

        {/* Estimated Reorder Cost */}
        <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Estimated Reorder Value</span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {(plan.summary.totalEstimatedReorderCostDZD / 1000).toLocaleString()}k
            </span>
            <span className="text-xs text-neutral-500 font-mono">DZD</span>
          </div>
          <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80 flex justify-between">
            <span>Central Rouiba Depot</span>
            <span className="text-emerald-400 font-medium">85 Recommended Units</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: FIELD TECHNICIAN FORECAST */}
      {(activeTab === 'both' || activeTab === 'technicians') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs sm:text-sm font-bold text-neutral-200 uppercase tracking-wider">
                {t('resource_tech_demand')}
              </h4>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              Productivity Standard: 140h / month / technician
            </span>
          </div>

          {/* Recharts Workload & Allocation Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 px-1">
                <span className="font-semibold text-neutral-300">
                  Technician Staffing: Available Capacity vs Forecasted 30-Day Demand
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-blue-400">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Available Techs
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Required Techs
                  </span>
                </div>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={plan.technicianForecasts}
                    margin={{ top: 10, right: 20, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="teamId"
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#333333' }}
                    />
                    <YAxis
                      domain={[0, 15]}
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#333333' }}
                      unit=" techs"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        borderColor: '#404040',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="availableTechs" name="Available Techs" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="requiredTechs30Days" name="Required Techs (Demand)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regional Allocation Summary */}
            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{t('resource_regional_breakdown')}</span>
                </div>
                <div className="space-y-2">
                  {plan.regionalAllocations.map((reg) => (
                    <div
                      key={reg.region}
                      className="p-2 rounded bg-neutral-900/60 border border-neutral-800/80 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-neutral-200">{reg.region}</div>
                        <div className="text-[10px] text-neutral-500">
                          {reg.activeSites} Sites · {reg.scheduledPMs} PMs · {reg.predictedOutages} Outages
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-bold text-white">
                          {reg.availableTechs} / {reg.requiredTechs} Techs
                        </div>
                        <span
                          className={`text-[9px] font-mono uppercase font-bold px-1 rounded ${
                            reg.status === 'SHORTAGE'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 italic">
                * Recommendations: Mobilize 2 standby riggers from Oran to Algiers & Ouargla.
              </div>
            </div>
          </div>

          {/* Cards for each Telecom Specialty Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {plan.technicianForecasts.map((team) => (
              <div
                key={team.teamId}
                className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80 space-y-3"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="font-mono font-bold text-xs text-white block">
                      {team.teamId}
                    </span>
                    <span className="text-[11px] text-neutral-400 line-clamp-1">
                      {team.teamName}
                    </span>
                  </div>
                  {getStatusBadge(team.status)}
                </div>

                <div className="text-[11px] text-neutral-500 italic">
                  {team.specialty}
                </div>

                {/* Utilization gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-400">{t('resource_utilization')}:</span>
                    <span
                      className={`font-mono font-bold ${
                        team.utilizationRate > 100
                          ? 'text-red-400'
                          : team.utilizationRate >= 90
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {team.utilizationRate}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        team.utilizationRate > 100
                          ? 'bg-red-500'
                          : team.utilizationRate >= 90
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, team.utilizationRate)}%` }}
                    />
                  </div>
                </div>

                {/* Man-Hours Split */}
                <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t('resource_scheduled_hours')}:</span>
                    <span className="font-mono text-neutral-200">{team.scheduledHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">{t('resource_predictive_hours')}:</span>
                    <span className="font-mono text-red-400 font-bold">{team.predictiveFailureHours}h</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-neutral-800/80">
                    <span className="text-neutral-300 font-semibold">{t('resource_man_hours')}:</span>
                    <span className="font-mono text-white font-bold">{team.totalForecastedHours}h</span>
                  </div>
                </div>

                {/* Key workload drivers */}
                <div className="text-[10px] space-y-1">
                  <span className="text-neutral-500 font-semibold uppercase">Key Workload Drivers:</span>
                  <ul className="list-disc list-inside text-neutral-400 space-y-0.5">
                    {team.keyWorkloadDrivers.slice(0, 2).map((driver, i) => (
                      <li key={i} className="truncate">
                        {driver}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: SPARE PARTS INVENTORY FORECAST */}
      {(activeTab === 'both' || activeTab === 'parts') && (
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs sm:text-sm font-bold text-neutral-200 uppercase tracking-wider">
                {t('resource_parts_inventory')}
              </h4>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-neutral-500 ml-1.5" />
              <select
                value={selectedPartCategory}
                onChange={(e) => setSelectedPartCategory(e.target.value)}
                className="bg-transparent text-neutral-200 text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-neutral-950 text-white">
                  {t('resource_filter_all_categories')}
                </option>
                <option value="ENERGY" className="bg-neutral-950 text-white">
                  Energy & Power (Batteries / GenSet)
                </option>
                <option value="HVAC" className="bg-neutral-950 text-white">
                  HVAC & Climate
                </option>
                <option value="TRANSMISSION" className="bg-neutral-950 text-white">
                  Microwave & Backhaul
                </option>
                <option value="FIBER" className="bg-neutral-950 text-white">
                  Optical & Fiber
                </option>
              </select>
            </div>
          </div>

          {/* Interactive Inventory Table */}
          <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 font-semibold">
                  <th className="py-3 px-3.5">{t('resource_part_name')}</th>
                  <th className="py-3 px-2.5">Depot Location</th>
                  <th className="py-3 px-2.5 text-right">{t('resource_current_stock')}</th>
                  <th className="py-3 px-2.5 text-right">{t('resource_30d_demand')}</th>
                  <th className="py-3 px-2.5 text-right">Proj. Net Stock</th>
                  <th className="py-3 px-2.5 text-center">{t('resource_days_supply')}</th>
                  <th className="py-3 px-2.5 text-center">{t('resource_reorder_status')}</th>
                  <th className="py-3 px-3 text-right">{t('resource_reorder_action')}</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredParts.map((part) => {
                  const isOrdered = reorderedSkus.has(part.sku);
                  const isCritical = part.reorderStatus === 'CRITICAL_SHORTAGE';
                  const isLow = part.reorderStatus === 'LOW_STOCK';

                  return (
                    <tr
                      key={part.sku}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        isCritical ? 'bg-red-950/15' : isLow ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Part Name & SKU */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(part.category)}
                          <div>
                            <div className="font-semibold text-white">{part.partName}</div>
                            <span className="font-mono text-[10px] text-neutral-500">
                              SKU: {part.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse Location */}
                      <td className="py-3 px-2.5 text-neutral-400 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-neutral-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{part.warehouseLocation}</span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-2.5 font-mono text-right font-bold text-neutral-200">
                        {part.currentStock} units
                      </td>

                      {/* 30-Day Demand */}
                      <td className="py-3 px-2.5 font-mono text-right text-neutral-300">
                        <span className="font-bold">{part.total30DayDemand}</span>{' '}
                        <span className="text-[10px] text-neutral-500">
                          ({part.scheduledDemand} PM + {part.predictedFailureDemand} ML)
                        </span>
                      </td>

                      {/* Projected Stock Remaining */}
                      <td className="py-3 px-2.5 font-mono text-right">
                        <span
                          className={`font-bold ${
                            part.projectedStockRemaining < 0
                              ? 'text-red-400 font-extrabold'
                              : part.projectedStockRemaining <= part.minimumSafetyStock
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {part.projectedStockRemaining < 0
                            ? `${part.projectedStockRemaining} (DEFICIT)`
                            : `+${part.projectedStockRemaining}`}
                        </span>
                      </td>

                      {/* Days of Supply */}
                      <td className="py-3 px-2.5 text-center font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            part.daysOfSupply <= 10
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : part.daysOfSupply <= 20
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {part.daysOfSupply}d
                        </span>
                      </td>

                      {/* Reorder Status Badge */}
                      <td className="py-3 px-2.5 text-center">
                        {getPartReorderBadge(part.reorderStatus)}
                      </td>

                      {/* Recommended Reorder Qty */}
                      <td className="py-3 px-3 text-right font-mono text-neutral-300 text-[11px]">
                        {part.recommendedReorderQty > 0 ? (
                          <div>
                            <span className="font-bold text-amber-400">
                              +{part.recommendedReorderQty} units
                            </span>
                            <div className="text-[10px] text-neutral-500">
                              Lead: {part.leadTimeDays}d
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-500">None required</span>
                        )}
                      </td>

                      {/* Reorder Action Button */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {part.recommendedReorderQty > 0 ? (
                          <button
                            onClick={() => handleTriggerReorder(part.sku, part.partName)}
                            disabled={isOrdered}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ml-auto ${
                              isOrdered
                                ? 'bg-emerald-800 text-white cursor-default'
                                : isCritical
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-950'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                            }`}
                          >
                            {isOrdered ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                <span>Ordered</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3" />
                                <span>{t('resource_reorder_btn')}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Optimal</span>
                          </span>
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
