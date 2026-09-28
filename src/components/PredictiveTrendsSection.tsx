import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
} from 'recharts';
import { HardwareAsset } from '../types/telecom';
import {
  generateDegradationTimelineData,
  AssetFailurePrediction,
} from '../utils/predictiveDegradationModel';
import { useLanguage } from '../context/LanguageContext';
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Zap,
  Battery,
  Wind,
  Radio,
  Sliders,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PredictiveTrendsSectionProps {
  assets: HardwareAsset[];
  onSchedulePM?: (assetId: string) => void;
}

const ASSET_COLORS: Record<string, string> = {
  'HW-BAT-014': '#EF4444', // Red (Battery)
  'HW-CLM-105': '#06B6D4', // Cyan (HVAC)
  'HW-GE-014': '#F59E0B',  // Amber (Generator)
  'HW-MW-045': '#A855F7',  // Purple (Microwave)
  'HW-REC-088': '#10B981', // Emerald (Rectifier)
  'HW-BSS-031': '#3B82F6', // Blue (BSS)
};

export const PredictiveTrendsSection: React.FC<PredictiveTrendsSectionProps> = ({ assets }) => {
  const { t, isRTL } = useLanguage();
  const [metricMode, setMetricMode] = useState<'health' | 'risk'>('health');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('ALL');
  const [projectionHorizon, setProjectionHorizon] = useState<30 | 60>(60);

  // Generate model data
  const { timeline, predictions, subsystemRisks } = useMemo(() => {
    return generateDegradationTimelineData(assets);
  }, [assets]);

  // Filter timeline points by horizon
  const filteredTimeline = useMemo(() => {
    return timeline.filter((point) => point.dayOffset <= projectionHorizon);
  }, [timeline, projectionHorizon]);

  // Selected asset detail
  const currentPrediction = useMemo(() => {
    if (selectedAssetId === 'ALL') return null;
    return predictions.find((p) => p.assetId === selectedAssetId) || null;
  }, [selectedAssetId, predictions]);

  const getUrgencyBadge = (urgency: AssetFailurePrediction['urgency']) => {
    switch (urgency) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
            MODERATE
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            NOMINAL
          </span>
        );
    }
  };

  const getSubsystemIcon = (type: string) => {
    if (type.includes('Battery')) return <Battery className="w-4 h-4 text-red-400" />;
    if (type.includes('HVAC') || type.includes('Clim')) return <Wind className="w-4 h-4 text-cyan-400" />;
    if (type.includes('Generator')) return <Zap className="w-4 h-4 text-amber-400" />;
    if (type.includes('Microwave')) return <Radio className="w-4 h-4 text-purple-400" />;
    return <Layers className="w-4 h-4 text-blue-400" />;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      const isHistorical = dataPoint?.isHistorical;
      const isProjected = dataPoint?.isProjected;

      return (
        <div className="bg-neutral-950/95 border border-neutral-700 p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md min-w-[200px]">
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800 mb-2">
            <span className="font-mono font-bold text-white">{label}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                isHistorical
                  ? 'bg-neutral-800 text-neutral-300'
                  : isProjected
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {isHistorical ? 'HISTORICAL' : isProjected ? 'AI PROJECTION' : 'LIVE NOW'}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            {payload.map((entry: any) => {
              if (entry.dataKey === 'failureThreshold') return null;
              return (
                <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-sans font-medium text-neutral-300">{entry.name}:</span>
                  </span>
                  <span className="font-bold text-white">
                    {entry.value}
                    {metricMode === 'health' ? '%' : ' pts'}
                  </span>
                </div>
              );
            })}
          </div>

          {metricMode === 'health' && (
            <div className="mt-2 pt-1.5 border-t border-neutral-800 text-[10px] text-red-400 font-sans flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Failure Threshold Cutoff: &lt; 30%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{t('predictive_trends_title')}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>ML DEGRADATION ENGINE</span>
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t('predictive_trends_sub')}
              </p>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector (Health % vs Risk Score) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setMetricMode('health')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                metricMode === 'health'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('predictive_metric_health')}
            </button>
            <button
              onClick={() => setMetricMode('risk')}
              className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                metricMode === 'risk'
                  ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('predictive_metric_risk')}
            </button>
          </div>

          {/* Asset Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <Sliders className="w-3.5 h-3.5 text-neutral-500 ml-1.5" />
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="bg-transparent text-neutral-200 text-xs py-1 px-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-neutral-950 text-white">
                {t('predictive_view_all_assets')}
              </option>
              {predictions.map((p) => (
                <option key={p.assetId} value={p.assetId} className="bg-neutral-950 text-neutral-200">
                  {p.assetId} - {p.model.slice(0, 24)}... ({p.estimatedDaysToFailure}d)
                </option>
              ))}
            </select>
          </div>

          {/* Horizon Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <span className="text-[11px] text-neutral-500 px-1 font-medium">{t('predictive_horizon_label')}:</span>
            <button
              onClick={() => setProjectionHorizon(30)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                projectionHorizon === 30
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              +30d
            </button>
            <button
              onClick={() => setProjectionHorizon(60)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                projectionHorizon === 60
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              +60d
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart: Timeline Degradation & Threshold Cutoff */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-200">
              {metricMode === 'health'
                ? 'Hardware Health & Reliability Trajectory (% Baseline)'
                : 'Projected Failure Risk Score Trajectory (0 - 100)'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-3 h-0.5 bg-neutral-400" />
              <span>{t('predictive_historical_zone')}</span>
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-purple-400" />
              <span>{t('predictive_projection_zone')}</span>
            </span>
            <span className="flex items-center gap-1.5 text-red-400 font-semibold">
              <span className="w-3 h-0.5 bg-red-500" />
              <span>{t('predictive_failure_cutoff')}</span>
            </span>
          </div>
        </div>

        <div className="h-[360px] w-full bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredTimeline} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#333333' }}
              />
              <YAxis
                domain={metricMode === 'health' ? [0, 100] : [0, 100]}
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#333333' }}
                unit={metricMode === 'health' ? '%' : ''}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
              />

              {/* Shaded visual zones for Historical vs Projected */}
              <ReferenceArea
                x1="-30d (Historical)"
                x2="Today (Live)"
                fill="#171717"
                fillOpacity={0.4}
              />
              <ReferenceArea
                x1="Today (Live)"
                x2={`+${projectionHorizon}d (Proj)`}
                fill="#3B0764"
                fillOpacity={0.12}
              />

              {/* Critical Failure Cutoff Threshold Line */}
              {metricMode === 'health' ? (
                <ReferenceLine
                  y={30}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Failure Cutoff (30% Health)',
                    fill: '#EF4444',
                    fontSize: 11,
                    position: 'insideBottomRight',
                  }}
                />
              ) : (
                <ReferenceLine
                  y={70}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'Critical Cutoff (70+ Risk)',
                    fill: '#EF4444',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
              )}

              {/* Render Lines depending on selected asset or all */}
              {selectedAssetId === 'ALL' ? (
                <>
                  <Line
                    type="monotone"
                    dataKey={metricMode === 'health' ? 'HW-BAT-014' : 'HW-BAT-014_risk'}
                    name="HW-BAT-014 (Kouba Battery)"
                    stroke={ASSET_COLORS['HW-BAT-014']}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: ASSET_COLORS['HW-BAT-014'] }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metricMode === 'health' ? 'HW-CLM-105' : 'HW-CLM-105_risk'}
                    name="HW-CLM-105 (Hassi HVAC)"
                    stroke={ASSET_COLORS['HW-CLM-105']}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: ASSET_COLORS['HW-CLM-105'] }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metricMode === 'health' ? 'HW-GE-014' : 'HW-GE-014_risk'}
                    name="HW-GE-014 (Kouba Generator)"
                    stroke={ASSET_COLORS['HW-GE-014']}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: ASSET_COLORS['HW-GE-014'] }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metricMode === 'health' ? 'HW-MW-045' : 'HW-MW-045_risk'}
                    name="HW-MW-045 (Constantine MW)"
                    stroke={ASSET_COLORS['HW-MW-045']}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ASSET_COLORS['HW-MW-045'] }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metricMode === 'health' ? 'HW-REC-088' : 'HW-REC-088_risk'}
                    name="HW-REC-088 (Hydra Rectifier)"
                    stroke={ASSET_COLORS['HW-REC-088']}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={metricMode === 'health' ? 'HW-BSS-031' : 'HW-BSS-031_risk'}
                    name="HW-BSS-031 (Chréa RBS)"
                    stroke={ASSET_COLORS['HW-BSS-031']}
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey={metricMode === 'health' ? selectedAssetId : `${selectedAssetId}_risk`}
                  name={currentPrediction ? `${currentPrediction.assetId} (${currentPrediction.model})` : selectedAssetId}
                  stroke={ASSET_COLORS[selectedAssetId] || '#F59E0B'}
                  strokeWidth={3}
                  dot={{ r: 4, fill: ASSET_COLORS[selectedAssetId] || '#F59E0B' }}
                  activeDot={{ r: 8 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Projected Failure Cards (MTBF / Time-to-Failure Timeline Countdown) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span>Projected Failure Countdown & Corrective Action Matrix</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            {predictions.filter((p) => p.estimatedDaysToFailure <= 14).length} Urgent Assets Under Watch
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {predictions.map((p) => {
            const isImminent = p.estimatedDaysToFailure <= 7;
            const isVeryCritical = p.estimatedDaysToFailure <= 3;
            const color = ASSET_COLORS[p.assetId] || '#F59E0B';

            return (
              <div
                key={p.assetId}
                onClick={() => setSelectedAssetId(p.assetId)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  selectedAssetId === p.assetId
                    ? 'border-amber-400 bg-neutral-950 ring-1 ring-amber-400/40'
                    : isVeryCritical
                    ? 'bg-red-950/25 border-red-700/60 hover:border-red-500'
                    : isImminent
                    ? 'bg-amber-950/20 border-amber-700/50 hover:border-amber-500'
                    : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div>
                  {/* Top Bar: Asset ID & Urgency */}
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getSubsystemIcon(p.equipmentType)}
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {p.assetId}
                      </span>
                    </div>
                    {getUrgencyBadge(p.urgency)}
                  </div>

                  {/* Asset Model & Site */}
                  <div className="text-xs font-medium text-neutral-200 line-clamp-1 mb-1">
                    {p.model}
                  </div>
                  <div className="text-[11px] text-neutral-400 mb-2.5 flex items-center justify-between">
                    <span className="font-mono text-neutral-300">{p.siteId}</span>
                    <span className="truncate text-neutral-500">{p.siteName}</span>
                  </div>

                  {/* Estimated Days Remaining Highlight Pill */}
                  <div className="mb-2.5 p-2 rounded bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 block uppercase font-medium">
                        {t('predictive_days_remaining')}
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                          className={`font-mono text-lg font-bold ${
                            isVeryCritical
                              ? 'text-red-400'
                              : isImminent
                              ? 'text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        >
                          ~{p.estimatedDaysToFailure} {p.estimatedDaysToFailure === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block">Est. Date</span>
                      <span className="font-mono text-[11px] font-semibold text-neutral-300">
                        {p.projectedFailureDate}
                      </span>
                    </div>
                  </div>

                  {/* Projected Failure Mode */}
                  <div className="space-y-1 mb-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      {t('predictive_failure_mode')}:
                    </span>
                    <p className="text-[11px] text-red-300 leading-snug font-medium">
                      {p.failureMode}
                    </p>
                    <p className="text-[10px] text-neutral-400 italic">
                      {p.failureThresholdNote}
                    </p>
                  </div>
                </div>

                {/* Footer: ML Confidence & Recommended Action */}
                <div className="pt-2 border-t border-neutral-800/80 mt-2 text-[10px]">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span>{t('predictive_confidence')}:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {p.confidenceScore}% Fit
                    </span>
                  </div>
                  <p className="text-neutral-300 line-clamp-2 bg-neutral-900/50 p-1.5 rounded border border-neutral-800/50">
                    <strong className="text-amber-400">Action:</strong> {p.recommendedAction}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Subsystem Failure Risk Over Time (30 / 60 / 90 Days Compounded) */}
      <div className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{t('predictive_subsystem_breakdown')}</span>
            </h4>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Probability of site outage by equipment subsystem if routine maintenance cycles are deferred.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-blue-400">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" /> 30-Day Risk
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> 60-Day Risk
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2.5 h-2.5 rounded bg-red-600" /> 90-Day Risk
            </span>
          </div>
        </div>

        <div className="h-[220px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={subsystemRisks}
              margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis
                dataKey="subsystem"
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#333333' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#737373"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#333333' }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  borderColor: '#404040',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="risk30Days" name="30-Day Risk" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="risk60Days" name="60-Day Risk" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="risk90Days" name="90-Day Risk" fill="#DC2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
