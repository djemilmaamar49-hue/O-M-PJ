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
} from 'recharts';
import { OperatorMetric } from './TeamPerformanceView';
import { TrendingUp, TrendingDown, Target, Filter, Info } from 'lucide-react';

export const OPERATOR_COLORS: Record<string, string> = {
  'OP-01': '#10B981', // Farid Belhadj - Emerald
  'OP-02': '#3B82F6', // Yasmine Mokhtari - Blue
  'OP-03': '#F59E0B', // Amine Khelil - Amber
  'OP-04': '#EC4899', // Sofiane Djebbar - Pink
  'OP-05': '#8B5CF6', // Malik Touati - Purple
  'OP-06': '#F97316', // Redouane Larbi - Orange
  'OP-07': '#06B6D4', // Nadia Cherif - Cyan
  'OP-08': '#14B8A6', // Kamel Slimani - Teal
};

interface PerformanceTrendChartProps {
  operators: OperatorMetric[];
  metricType: 'resolved' | 'response' | 'workload';
  targetValue?: number;
  targetLabel?: string;
  unit: string;
  isRTL?: boolean;
}

export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({
  operators,
  metricType,
  targetValue,
  targetLabel,
  unit,
  isRTL = false,
}) => {
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  // Extract all distinct 7 day labels from history
  const days = useMemo(() => {
    if (operators.length === 0 || !operators[0].history7Days) return [];
    return operators[0].history7Days.map((d) => ({
      dayLabel: d.dayLabel,
      date: d.date,
    }));
  }, [operators]);

  // Construct Recharts tabular dataset where each row is a Day, with keys for each operator
  const chartData = useMemo(() => {
    return days.map((d, dayIndex) => {
      const row: Record<string, any> = {
        dayLabel: d.dayLabel,
        date: d.date,
      };

      let sum = 0;
      let count = 0;

      operators.forEach((op) => {
        const histPoint = op.history7Days?.[dayIndex];
        if (histPoint) {
          let val = 0;
          if (metricType === 'resolved') val = histPoint.resolved;
          else if (metricType === 'response') val = histPoint.avgResponseMinutes;
          else if (metricType === 'workload') val = histPoint.activeWorkload;

          row[op.id] = val;
          sum += val;
          count += 1;
        }
      });

      row.teamAvg = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
      if (targetValue !== undefined) {
        row.target = targetValue;
      }

      return row;
    });
  }, [days, operators, metricType, targetValue]);

  // Calculate 7-day aggregate stats
  const aggregateStats = useMemo(() => {
    if (chartData.length < 2) return { avg: 0, deltaPercent: 0, isPositive: true };
    const firstAvg = chartData[0]?.teamAvg || 0;
    const latestAvg = chartData[chartData.length - 1]?.teamAvg || 0;
    const totalAvg =
      chartData.reduce((acc, row) => acc + (row.teamAvg || 0), 0) / (chartData.length || 1);

    const delta = latestAvg - firstAvg;
    const deltaPercent = firstAvg > 0 ? Math.round((delta / firstAvg) * 100) : 0;

    // For response time, a decrease is positive (faster); for resolved, an increase is positive
    const isPositive = metricType === 'response' ? delta <= 0 : delta >= 0;

    return {
      avg: totalAvg.toFixed(1),
      latest: latestAvg.toFixed(1),
      deltaPercent,
      isPositive,
    };
  }, [chartData, metricType]);

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-neutral-950/95 border border-neutral-750 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md min-w-[200px] z-50">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
          <span className="font-bold text-neutral-200">{label}</span>
          <span className="text-[10px] text-neutral-400 font-mono">7-Day Trajectory</span>
        </div>

        <div className="space-y-1.5">
          {payload
            .filter((p: any) => p.dataKey !== 'target')
            .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
            .map((item: any) => {
              const op = operators.find((o) => o.id === item.dataKey);
              const isTeamAvg = item.dataKey === 'teamAvg';
              const name = isTeamAvg ? 'Team Average' : op ? op.name : item.dataKey;
              const color = isTeamAvg ? '#E30613' : item.color;
              const isTargetBreached =
                targetValue !== undefined &&
                (metricType === 'response' ? item.value > targetValue : item.value < targetValue);

              return (
                <div
                  key={item.dataKey}
                  className={`flex items-center justify-between gap-3 text-[11px] ${
                    selectedOpId && selectedOpId === item.dataKey ? 'font-bold bg-neutral-900 px-1 rounded' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-neutral-300">{name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
                    <span className="text-white font-semibold">
                      {item.value} {unit}
                    </span>
                    {targetValue !== undefined && !isTeamAvg && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          isTargetBreached
                            ? 'text-red-400 bg-red-950/50'
                            : 'text-emerald-400 bg-emerald-950/50'
                        }`}
                      >
                        {metricType === 'response'
                          ? item.value <= targetValue
                            ? 'OK'
                            : 'OVER'
                          : item.value >= targetValue
                          ? 'OK'
                          : 'SUB'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {targetValue !== undefined && (
          <div className="pt-2 mt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex items-center justify-between font-mono">
            <span>{targetLabel || 'Target Benchmark'}:</span>
            <span className="text-red-400 font-bold">
              {targetValue} {unit}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Operator Filter Pills & Trajectory Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 max-w-full overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedOpId(null)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              selectedOpId === null
                ? 'bg-neutral-800 text-white border border-neutral-600 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950/80 border border-neutral-800'
            }`}
          >
            All Trajectories ({operators.length})
          </button>

          {operators.map((op) => {
            const isSelected = selectedOpId === op.id;
            const opColor = OPERATOR_COLORS[op.id] || '#A3A3A3';

            return (
              <button
                key={op.id}
                onClick={() => setSelectedOpId(isSelected ? null : op.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'bg-neutral-950/80 text-neutral-400 hover:text-white border-neutral-800'
                }`}
                style={{
                  borderColor: isSelected ? opColor : undefined,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: opColor }}
                />
                <span className="truncate max-w-[80px]">{op.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* 7-Day Aggregate Trend Badge */}
        <div className="flex items-center gap-2 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800 text-[11px] font-mono tabular-nums">
          <span className="text-neutral-500">7D Avg:</span>
          <span className="text-neutral-200 font-bold">
            {aggregateStats.avg} {unit}
          </span>
          <span
            className={`flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.2 rounded ${
              aggregateStats.isPositive
                ? 'bg-emerald-950/60 text-emerald-400'
                : 'bg-amber-950/60 text-amber-400'
            }`}
          >
            {aggregateStats.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {aggregateStats.deltaPercent >= 0 ? '+' : ''}
              {aggregateStats.deltaPercent}%
            </span>
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="h-[240px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
          >
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              stroke="#525252"
              tick={{ fill: '#a3a3a3', fontSize: 10.5 }}
              tickLine={false}
              axisLine={{ stroke: '#404040' }}
            />
            <YAxis
              stroke="#525252"
              tick={{ fill: '#a3a3a3', fontSize: 10.5 }}
              tickLine={false}
              axisLine={{ stroke: '#404040' }}
              domain={metricType === 'response' ? [0, 32] : [0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* SLA / Benchmark Line */}
            {targetValue !== undefined && (
              <ReferenceLine
                y={targetValue}
                stroke="#EF4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: targetLabel || `Target: ${targetValue}`,
                  fill: '#F87171',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            )}

            {/* Team Average Line */}
            <Line
              type="monotone"
              dataKey="teamAvg"
              name="Team Average"
              stroke="#E30613"
              strokeWidth={selectedOpId ? 1.5 : 2.5}
              strokeDasharray={selectedOpId ? '3 3' : undefined}
              dot={{ r: 2.5, fill: '#E30613' }}
              activeDot={{ r: 5 }}
              opacity={selectedOpId ? 0.4 : 0.9}
            />

            {/* Individual Operator Lines */}
            {operators.map((op) => {
              const isSelected = selectedOpId === op.id;
              const isDimmed = selectedOpId !== null && !isSelected;
              const color = OPERATOR_COLORS[op.id] || '#A3A3A3';

              return (
                <Line
                  key={op.id}
                  type="monotone"
                  dataKey={op.id}
                  name={op.name}
                  stroke={color}
                  strokeWidth={isSelected ? 3.5 : 1.8}
                  dot={{ r: isSelected ? 4 : 2.5, fill: color }}
                  activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                  opacity={isSelected ? 1 : isDimmed ? 0.15 : 0.85}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/**
 * Mini Interactive SVG Sparkline for individual operator rows
 */
export const OperatorSparkline: React.FC<{
  data: number[];
  dates?: string[];
  unit: string;
  isResponseTime?: boolean;
  color?: string;
}> = ({ data, dates = [], unit, isResponseTime = false, color = '#10B981' }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length < 2) return null;

  const width = 84;
  const height = 24;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate SVG path points
  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Area under curve
  const areaD = `${pathD} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  // Trajectory direction
  const first = data[0];
  const last = data[data.length - 1];
  const delta = last - first;
  const isPositive = isResponseTime ? delta <= 0 : delta >= 0;

  return (
    <div
      className="relative flex items-center gap-1.5 group cursor-help select-none"
      title={`7-Day Trajectory: ${data.join(' → ')} ${unit}`}
    >
      <svg width={width} height={height} className="overflow-visible">
        {/* Soft gradient fill under line */}
        <path d={areaD} fill={color} fillOpacity={0.12} />
        {/* Main curve line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Endpoint (Today) */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          fill={color}
          stroke="#171717"
          strokeWidth={1}
        />

        {/* Hovered point if any */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <circle
            cx={points[hoveredIdx].x}
            cy={points[hoveredIdx].y}
            r={3.5}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth={1.5}
          />
        )}
      </svg>

      {/* Trajectory direction pill */}
      <span
        className={`text-[9.5px] font-mono px-1 py-0.2 rounded font-semibold tabular-nums ${
          isPositive
            ? 'bg-emerald-950/70 text-emerald-400'
            : 'bg-amber-950/70 text-amber-400'
        }`}
      >
        {delta > 0 ? `+${delta}` : delta === 0 ? '0' : `${delta}`}
      </span>
    </div>
  );
};
