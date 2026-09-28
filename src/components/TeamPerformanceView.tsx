import React, { useState, useMemo } from 'react';
import { Ticket, Assignee } from '../types/telecom';
import { TEAM_LABELS } from '../data/telecomConstants';
import { useLanguage } from '../context/LanguageContext';
import { generateTeamPerformancePdf } from '../utils/generateTeamPerformancePdf';
import {
  PerformanceTrendChart,
  OperatorSparkline,
  OPERATOR_COLORS,
} from './PerformanceTrendChart';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Filter,
  ArrowUpDown,
  Download,
  Shield,
  Activity,
  Award,
  FileText,
  Loader2,
  Check,
  Settings2,
  X,
  LineChart as LineChartIcon,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface DailyTrajectoryPoint {
  dayLabel: string; // '22 Sep', '23 Sep', '24 Sep', '25 Sep', '26 Sep', '27 Sep', '28 Sep'
  date: string;     // '2026-09-22' ... '2026-09-28'
  resolved: number;
  resolvedTarget: number;
  avgResponseMinutes: number;
  slaAdherenceRate: number;
  activeWorkload: number;
  criticalAssigned: number;
}

export interface OperatorMetric {
  id: string;
  name: string;
  role: string;
  team: Assignee;
  shift: 'Morning (07:00-15:00)' | 'Evening (15:00-23:00)' | 'Night (23:00-07:00)';
  resolvedThisShift: number;
  resolvedTarget: number;
  avgResponseMinutes: number; // minutes to first dispatch
  targetResponseMinutes: number; // standard SLA is 20m
  avgResolutionHours: number;
  slaAdherenceRate: number; // percentage (e.g. 96.5%)
  activeTicketsCount: number;
  criticalAssigned: number;
  majorAssigned: number;
  minorAssigned: number;
  history7Days?: DailyTrajectoryPoint[];
}

export const INITIAL_OPERATORS: OperatorMetric[] = [
  {
    id: 'OP-01',
    name: 'Farid Belhadj',
    role: 'Senior Transmission Lead',
    team: 'NOC_SDH',
    shift: 'Morning (07:00-15:00)',
    resolvedThisShift: 14,
    resolvedTarget: 12,
    avgResponseMinutes: 11,
    targetResponseMinutes: 20,
    avgResolutionHours: 1.6,
    slaAdherenceRate: 98.2,
    activeTicketsCount: 3,
    criticalAssigned: 1,
    majorAssigned: 2,
    minorAssigned: 0,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 12, resolvedTarget: 12, avgResponseMinutes: 13, slaAdherenceRate: 97.5, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 15, resolvedTarget: 12, avgResponseMinutes: 10, slaAdherenceRate: 98.8, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 13, resolvedTarget: 12, avgResponseMinutes: 12, slaAdherenceRate: 97.0, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 14, resolvedTarget: 12, avgResponseMinutes: 11, slaAdherenceRate: 98.0, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 16, resolvedTarget: 12, avgResponseMinutes: 9,  slaAdherenceRate: 99.1, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 13, resolvedTarget: 12, avgResponseMinutes: 12, slaAdherenceRate: 97.8, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 14, resolvedTarget: 12, avgResponseMinutes: 11, slaAdherenceRate: 98.2, activeWorkload: 3, criticalAssigned: 1 },
    ],
  },
  {
    id: 'OP-02',
    name: 'Yasmine Mokhtari',
    role: 'VIP & Corporate Support Specialist',
    team: 'CS_FRONTOFFICE',
    shift: 'Morning (07:00-15:00)',
    resolvedThisShift: 18,
    resolvedTarget: 15,
    avgResponseMinutes: 8,
    targetResponseMinutes: 15,
    avgResolutionHours: 1.2,
    slaAdherenceRate: 97.5,
    activeTicketsCount: 4,
    criticalAssigned: 0,
    majorAssigned: 3,
    minorAssigned: 1,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 14, resolvedTarget: 15, avgResponseMinutes: 10, slaAdherenceRate: 96.0, activeWorkload: 5, criticalAssigned: 1 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 16, resolvedTarget: 15, avgResponseMinutes: 9,  slaAdherenceRate: 97.2, activeWorkload: 4, criticalAssigned: 0 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 17, resolvedTarget: 15, avgResponseMinutes: 8,  slaAdherenceRate: 98.0, activeWorkload: 4, criticalAssigned: 0 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 15, resolvedTarget: 15, avgResponseMinutes: 9,  slaAdherenceRate: 96.8, activeWorkload: 4, criticalAssigned: 0 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 19, resolvedTarget: 15, avgResponseMinutes: 7,  slaAdherenceRate: 98.5, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 17, resolvedTarget: 15, avgResponseMinutes: 8,  slaAdherenceRate: 97.0, activeWorkload: 4, criticalAssigned: 0 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 18, resolvedTarget: 15, avgResponseMinutes: 8,  slaAdherenceRate: 97.5, activeWorkload: 4, criticalAssigned: 0 },
    ],
  },
  {
    id: 'OP-03',
    name: 'Amine Khelil',
    role: 'Power & Environment Controller',
    team: 'O&M_ENV',
    shift: 'Morning (07:00-15:00)',
    resolvedThisShift: 11,
    resolvedTarget: 10,
    avgResponseMinutes: 14,
    targetResponseMinutes: 20,
    avgResolutionHours: 2.4,
    slaAdherenceRate: 95.8,
    activeTicketsCount: 5,
    criticalAssigned: 2,
    majorAssigned: 2,
    minorAssigned: 1,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 8,  resolvedTarget: 10, avgResponseMinutes: 18, slaAdherenceRate: 93.5, activeWorkload: 6, criticalAssigned: 3 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 9,  resolvedTarget: 10, avgResponseMinutes: 16, slaAdherenceRate: 94.2, activeWorkload: 5, criticalAssigned: 2 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 11, resolvedTarget: 10, avgResponseMinutes: 15, slaAdherenceRate: 95.0, activeWorkload: 5, criticalAssigned: 2 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 10, resolvedTarget: 10, avgResponseMinutes: 14, slaAdherenceRate: 95.5, activeWorkload: 5, criticalAssigned: 2 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 12, resolvedTarget: 10, avgResponseMinutes: 13, slaAdherenceRate: 96.2, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 10, resolvedTarget: 10, avgResponseMinutes: 15, slaAdherenceRate: 95.1, activeWorkload: 5, criticalAssigned: 2 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 11, resolvedTarget: 10, avgResponseMinutes: 14, slaAdherenceRate: 95.8, activeWorkload: 5, criticalAssigned: 2 },
    ],
  },
  {
    id: 'OP-04',
    name: 'Sofiane Djebbar',
    role: 'Radio Access RAN Engineer',
    team: 'ACCES_PROD',
    shift: 'Evening (15:00-23:00)',
    resolvedThisShift: 9,
    resolvedTarget: 10,
    avgResponseMinutes: 17,
    targetResponseMinutes: 20,
    avgResolutionHours: 2.8,
    slaAdherenceRate: 94.1,
    activeTicketsCount: 4,
    criticalAssigned: 1,
    majorAssigned: 1,
    minorAssigned: 2,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 7,  resolvedTarget: 10, avgResponseMinutes: 21, slaAdherenceRate: 91.8, activeWorkload: 5, criticalAssigned: 2 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 8,  resolvedTarget: 10, avgResponseMinutes: 19, slaAdherenceRate: 92.5, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 9,  resolvedTarget: 10, avgResponseMinutes: 18, slaAdherenceRate: 93.4, activeWorkload: 5, criticalAssigned: 1 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 8,  resolvedTarget: 10, avgResponseMinutes: 19, slaAdherenceRate: 92.9, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 10, resolvedTarget: 10, avgResponseMinutes: 16, slaAdherenceRate: 94.8, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 9,  resolvedTarget: 10, avgResponseMinutes: 18, slaAdherenceRate: 93.6, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 9,  resolvedTarget: 10, avgResponseMinutes: 17, slaAdherenceRate: 94.1, activeWorkload: 4, criticalAssigned: 1 },
    ],
  },
  {
    id: 'OP-05',
    name: 'Malik Touati',
    role: 'Microwave Backhaul Analyst',
    team: 'ENG_TRANS',
    shift: 'Evening (15:00-23:00)',
    resolvedThisShift: 12,
    resolvedTarget: 10,
    avgResponseMinutes: 13,
    targetResponseMinutes: 20,
    avgResolutionHours: 2.1,
    slaAdherenceRate: 96.0,
    activeTicketsCount: 3,
    criticalAssigned: 1,
    majorAssigned: 1,
    minorAssigned: 1,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 9,  resolvedTarget: 10, avgResponseMinutes: 16, slaAdherenceRate: 94.0, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 11, resolvedTarget: 10, avgResponseMinutes: 14, slaAdherenceRate: 95.5, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 10, resolvedTarget: 10, avgResponseMinutes: 15, slaAdherenceRate: 95.0, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 12, resolvedTarget: 10, avgResponseMinutes: 12, slaAdherenceRate: 96.5, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 13, resolvedTarget: 10, avgResponseMinutes: 11, slaAdherenceRate: 97.0, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 11, resolvedTarget: 10, avgResponseMinutes: 13, slaAdherenceRate: 95.8, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 12, resolvedTarget: 10, avgResponseMinutes: 13, slaAdherenceRate: 96.0, activeWorkload: 3, criticalAssigned: 1 },
    ],
  },
  {
    id: 'OP-06',
    name: 'Redouane Larbi',
    role: 'Desert & South Wilayas Controller',
    team: 'FIELD_OPS',
    shift: 'Morning (07:00-15:00)',
    resolvedThisShift: 8,
    resolvedTarget: 8,
    avgResponseMinutes: 22,
    targetResponseMinutes: 25,
    avgResolutionHours: 3.5,
    slaAdherenceRate: 92.4,
    activeTicketsCount: 3,
    criticalAssigned: 1,
    majorAssigned: 2,
    minorAssigned: 0,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 6,  resolvedTarget: 8, avgResponseMinutes: 26, slaAdherenceRate: 89.5, activeWorkload: 4, criticalAssigned: 2 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 7,  resolvedTarget: 8, avgResponseMinutes: 24, slaAdherenceRate: 90.8, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 7,  resolvedTarget: 8, avgResponseMinutes: 25, slaAdherenceRate: 91.2, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 8,  resolvedTarget: 8, avgResponseMinutes: 23, slaAdherenceRate: 92.0, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 9,  resolvedTarget: 8, avgResponseMinutes: 21, slaAdherenceRate: 93.1, activeWorkload: 3, criticalAssigned: 1 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 7,  resolvedTarget: 8, avgResponseMinutes: 23, slaAdherenceRate: 91.7, activeWorkload: 4, criticalAssigned: 1 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 8,  resolvedTarget: 8, avgResponseMinutes: 22, slaAdherenceRate: 92.4, activeWorkload: 3, criticalAssigned: 1 },
    ],
  },
  {
    id: 'OP-07',
    name: 'Nadia Cherif',
    role: 'Mobile Data & VAS Core Engineer',
    team: 'M_MOBISERV',
    shift: 'Night (23:00-07:00)',
    resolvedThisShift: 7,
    resolvedTarget: 6,
    avgResponseMinutes: 9,
    targetResponseMinutes: 20,
    avgResolutionHours: 1.5,
    slaAdherenceRate: 99.0,
    activeTicketsCount: 2,
    criticalAssigned: 0,
    majorAssigned: 1,
    minorAssigned: 1,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 5,  resolvedTarget: 6, avgResponseMinutes: 11, slaAdherenceRate: 98.2, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 6,  resolvedTarget: 6, avgResponseMinutes: 10, slaAdherenceRate: 98.6, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 6,  resolvedTarget: 6, avgResponseMinutes: 9,  slaAdherenceRate: 99.0, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 7,  resolvedTarget: 6, avgResponseMinutes: 8,  slaAdherenceRate: 99.2, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 8,  resolvedTarget: 6, avgResponseMinutes: 8,  slaAdherenceRate: 99.5, activeWorkload: 1, criticalAssigned: 0 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 6,  resolvedTarget: 6, avgResponseMinutes: 9,  slaAdherenceRate: 98.8, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 7,  resolvedTarget: 6, avgResponseMinutes: 9,  slaAdherenceRate: 99.0, activeWorkload: 2, criticalAssigned: 0 },
    ],
  },
  {
    id: 'OP-08',
    name: 'Kamel Slimani',
    role: 'Site Rollout & Rigging Coordinator',
    team: 'rollout',
    shift: 'Evening (15:00-23:00)',
    resolvedThisShift: 10,
    resolvedTarget: 9,
    avgResponseMinutes: 16,
    targetResponseMinutes: 20,
    avgResolutionHours: 2.2,
    slaAdherenceRate: 95.0,
    activeTicketsCount: 2,
    criticalAssigned: 0,
    majorAssigned: 1,
    minorAssigned: 1,
    history7Days: [
      { dayLabel: '22 Sep', date: '2026-09-22', resolved: 8,  resolvedTarget: 9, avgResponseMinutes: 18, slaAdherenceRate: 93.8, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '23 Sep', date: '2026-09-23', resolved: 9,  resolvedTarget: 9, avgResponseMinutes: 17, slaAdherenceRate: 94.4, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '24 Sep', date: '2026-09-24', resolved: 9,  resolvedTarget: 9, avgResponseMinutes: 16, slaAdherenceRate: 94.9, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '25 Sep', date: '2026-09-25', resolved: 10, resolvedTarget: 9, avgResponseMinutes: 15, slaAdherenceRate: 95.8, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '26 Sep', date: '2026-09-26', resolved: 11, resolvedTarget: 9, avgResponseMinutes: 14, slaAdherenceRate: 96.2, activeWorkload: 2, criticalAssigned: 0 },
      { dayLabel: '27 Sep', date: '2026-09-27', resolved: 9,  resolvedTarget: 9, avgResponseMinutes: 17, slaAdherenceRate: 94.7, activeWorkload: 3, criticalAssigned: 0 },
      { dayLabel: '28 Sep', date: '2026-09-28', resolved: 10, resolvedTarget: 9, avgResponseMinutes: 16, slaAdherenceRate: 95.0, activeWorkload: 2, criticalAssigned: 0 },
    ],
  },
];

interface TeamPerformanceViewProps {
  tickets: Ticket[];
  onSelectOperatorTeam?: (team: Assignee) => void;
}

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({
  tickets,
  onSelectOperatorTeam,
}) => {
  const { t, isRTL } = useLanguage();
  const [shiftFilter, setShiftFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'resolved' | 'response' | 'workload' | 'sla'>('resolved');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getShiftLabel = (s: string) => {
    if (s.startsWith('Morning')) return t('shift_morning');
    if (s.startsWith('Evening')) return t('shift_evening');
    if (s.startsWith('Night')) return t('shift_night');
    if (s === 'ALL') return t('shift_all');
    return s;
  };

  // Filter and sort operators
  const filteredOperators = useMemo(() => {
    return INITIAL_OPERATORS.filter((op) => {
      if (shiftFilter !== 'ALL' && !op.shift.startsWith(shiftFilter)) return false;
      if (teamFilter !== 'ALL' && op.team !== teamFilter) return false;
      return true;
    }).sort((a, b) => {
      let diff = 0;
      if (sortBy === 'resolved') diff = a.resolvedThisShift - b.resolvedThisShift;
      else if (sortBy === 'response') diff = a.avgResponseMinutes - b.avgResponseMinutes;
      else if (sortBy === 'workload') diff = a.activeTicketsCount - b.activeTicketsCount;
      else if (sortBy === 'sla') diff = a.slaAdherenceRate - b.slaAdherenceRate;
      return sortOrder === 'desc' ? -diff : diff;
    });
  }, [shiftFilter, teamFilter, sortBy, sortOrder]);

  // Aggregate Metrics
  const totalResolved = filteredOperators.reduce((sum, o) => sum + o.resolvedThisShift, 0);
  const totalActiveWorkload = filteredOperators.reduce((sum, o) => sum + o.activeTicketsCount, 0);
  const avgResponse =
    filteredOperators.length > 0
      ? (
          filteredOperators.reduce((sum, o) => sum + o.avgResponseMinutes, 0) /
          filteredOperators.length
        ).toFixed(1)
      : '0';
  const avgSla =
    filteredOperators.length > 0
      ? (
          filteredOperators.reduce((sum, o) => sum + o.slaAdherenceRate, 0) /
          filteredOperators.length
        ).toFixed(1)
      : '0';

  // Find max values for proportional bar chart widths
  const maxResolved = Math.max(...filteredOperators.map((o) => Math.max(o.resolvedThisShift, o.resolvedTarget)), 20);
  const maxWorkload = Math.max(...filteredOperators.map((o) => o.activeTicketsCount), 6);
  const maxResponse = 30; // 30 minutes scale

  // PDF Export States & Management Review
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGeneratedSuccess, setPdfGeneratedSuccess] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviewerName, setReviewerName] = useState('Farid Belhadj / Shift Lead');
  const [reviewerRole, setReviewerRole] = useState('NOC Senior Operations Management');
  const [executiveNotes, setExecutiveNotes] = useState(
    'Transmission and Core units maintained SLA > 97%. Prioritize clearing P1 Critical tickets in Power & Environment; dispatch field standby teams for Desert wilayas; verify generator fuel deliveries prior to evening handover.'
  );

  const handleDownloadPdfReport = (overrideNotes?: string, overrideReviewer?: string, overrideRole?: string) => {
    setIsGeneratingPdf(true);
    try {
      generateTeamPerformancePdf({
        operators: filteredOperators,
        totalResolved,
        totalActiveWorkload,
        avgResponse,
        avgSla,
        shiftFilter,
        teamFilter,
        sortBy,
        sortOrder,
        tickets,
        executiveNotes: overrideNotes !== undefined ? overrideNotes : executiveNotes,
        reviewerName: overrideReviewer !== undefined ? overrideReviewer : reviewerName,
        reviewerRole: overrideRole !== undefined ? overrideRole : reviewerRole,
      });
      setPdfGeneratedSuccess(true);
      setTimeout(() => setPdfGeneratedSuccess(false), 3500);
      setShowReportModal(false);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 7-Day Performance Trajectory Chart View Modes ('bars' | 'trend' | 'combined')
  const [chart1View, setChart1View] = useState<'bars' | 'trend' | 'combined'>('bars');
  const [chart2View, setChart2View] = useState<'bars' | 'trend' | 'combined'>('bars');
  const [chart3View, setChart3View] = useState<'bars' | 'trend' | 'combined'>('bars');
  const [globalTrendMode, setGlobalTrendMode] = useState<boolean>(false);

  const toggleGlobalTrend = () => {
    const nextMode = !globalTrendMode;
    setGlobalTrendMode(nextMode);
    const target = nextMode ? 'trend' : 'bars';
    setChart1View(target);
    setChart2View(target);
    setChart3View(target);
  };

  // Export Performance CSV
  const handleExportPerformanceCSV = () => {
    const headers = [
      'Operator ID',
      'Name',
      'Role',
      'Team',
      'Shift',
      'Tickets Resolved This Shift',
      'Shift Target',
      'Target Met',
      'Average Response Time (min)',
      'Target Response Time (min)',
      'Average MTTR (hours)',
      'SLA Adherence Rate (%)',
      'Active Workload Total',
      'Critical Tickets',
      'Major Tickets',
      'Minor Tickets',
    ];

    const rows = filteredOperators.map((o) => [
      `"${o.id}"`,
      `"${o.name}"`,
      `"${o.role}"`,
      `"${o.team}"`,
      `"${o.shift}"`,
      o.resolvedThisShift,
      o.resolvedTarget,
      o.resolvedThisShift >= o.resolvedTarget ? 'YES' : 'NO',
      o.avgResponseMinutes,
      o.targetResponseMinutes,
      o.avgResolutionHours,
      `${o.slaAdherenceRate}%`,
      o.activeTicketsCount,
      o.criticalAssigned,
      o.majorAssigned,
      o.minorAssigned,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Djezzy_NOC_Team_Performance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary Stats */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              <span>{t('perf_title')}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('perf_sub')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Report Button (exports dashboard & operator stats as PDF for management review) */}
            <button
              onClick={() => handleDownloadPdfReport()}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 rounded shadow-md shadow-red-950/40 border border-red-500 transition-all whitespace-nowrap cursor-pointer"
              title="Download executive PDF report for management review"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pdfGeneratedSuccess ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-white" />
              )}
              <span>
                {isGeneratingPdf
                  ? t('generating_report')
                  : pdfGeneratedSuccess
                  ? t('report_downloaded')
                  : t('download_report')}
              </span>
              <span className="text-[10px] bg-red-900/90 px-1 py-0.5 rounded text-white font-mono uppercase tracking-wide">
                PDF
              </span>
            </button>

            {/* Management Review Options / Configure Notes */}
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              title="Preview report parameters & executive comments"
            >
              <Settings2 className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline">{t('report_management_preview')}</span>
            </button>

            {/* Raw CSV Export Button */}
            <button
              onClick={handleExportPerformanceCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors whitespace-nowrap cursor-pointer"
              title="Export raw performance CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>{t('export_perf_csv')}</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-neutral-800 text-xs">
          <div className="bg-neutral-950/60 p-3 rounded border border-neutral-800">
            <span className="text-[11px] text-neutral-500 block">{t('perf_stat_shift_resolved')}</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                {totalResolved}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">{t('total_tickets')}</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 p-3 rounded border border-neutral-800">
            <span className="text-[11px] text-neutral-500 block">{t('perf_stat_avg_response')}</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                {avgResponse}m
              </span>
              <span className="text-[10px] text-neutral-400">vs 20m target</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 p-3 rounded border border-neutral-800">
            <span className="text-[11px] text-neutral-500 block">{t('perf_stat_sla_compliance')}</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {avgSla}%
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">{t('status_completed')}</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 p-3 rounded border border-neutral-800">
            <span className="text-[11px] text-neutral-500 block">{t('perf_workload')}</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {totalActiveWorkload}
              </span>
              <span className="text-[10px] text-neutral-400">{t('total_tickets')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Sorting Control Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Shift selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800 text-[11px]">
            <span className="text-neutral-500 px-1 font-medium">{t('perf_col_shift')}:</span>
            {['ALL', 'Morning', 'Evening', 'Night'].map((s) => (
              <button
                key={s}
                onClick={() => setShiftFilter(s)}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  shiftFilter === s
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {getShiftLabel(s)}
              </button>
            ))}
          </div>

          {/* Team filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-neutral-500 font-medium">{t('team_filter')}:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">{t('all_teams')}</option>
              <option value="NOC_SDH">NOC_SDH (Transmission)</option>
              <option value="O&M_ENV">O&M_ENV (Power & Clim)</option>
              <option value="ACCES_PROD">ACCES_PROD (Radio RAN)</option>
              <option value="CS_FRONTOFFICE">CS_FRONTOFFICE (Customer Care)</option>
              <option value="ENG_TRANS">ENG_TRANS (Microwave)</option>
              <option value="M_MOBISERV">M_MOBISERV (Core & VAS)</option>
              <option value="FIELD_OPS">FIELD_OPS (Field Crews)</option>
            </select>
          </div>
        </div>

        {/* Sort & 7-Day Trend Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {/* Global 7-Day Trend Mode Switch */}
          <button
            onClick={toggleGlobalTrend}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
              globalTrendMode
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border-neutral-800'
            }`}
            title="Toggle 7-day performance trajectory trend lines across all charts"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${globalTrendMode ? 'text-white' : 'text-emerald-400'}`} />
            <span>{t('perf_trend_toggle')} (7d)</span>
          </button>

          <span className="text-neutral-500 font-medium">{t('col_actions')}:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-neutral-300 focus:outline-none focus:border-red-500"
          >
            <option value="resolved">{t('perf_stat_shift_resolved')}</option>
            <option value="response">{t('perf_response_time')}</option>
            <option value="workload">{t('perf_workload')}</option>
            <option value="sla">{t('perf_stat_sla_compliance')}</option>
          </select>
          <button
            onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded flex items-center gap-1 cursor-pointer"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{sortOrder === 'desc' ? 'High' : 'Low'}</span>
          </button>
        </div>
      </div>

      {/* Main Bar Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart 1: Tickets Resolved per Shift (Actual vs Target) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-800 gap-2">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>{t('perf_resolved_shift')}</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {chart1View === 'trend'
                  ? t('perf_trend_sub_resolved')
                  : t('perf_col_resolved')}
              </p>
            </div>

            {/* View Mode Segmented Switcher */}
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10.5px]">
              <button
                onClick={() => setChart1View('bars')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  chart1View === 'bars'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('perf_view_bars')}
              </button>
              <button
                onClick={() => setChart1View('trend')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  chart1View === 'trend'
                    ? 'bg-neutral-800 text-emerald-400 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>{t('perf_view_trend')}</span>
              </button>
              <button
                onClick={() => setChart1View('combined')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  chart1View === 'combined'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('perf_view_both')}
              </button>
            </div>
          </div>

          {/* Bar Chart View */}
          {(chart1View === 'bars' || chart1View === 'combined') && (
            <div className="space-y-3.5 text-xs">
              {filteredOperators.map((op) => {
                const actualPercent = Math.min(100, Math.round((op.resolvedThisShift / maxResolved) * 100));
                const targetPercent = Math.min(100, Math.round((op.resolvedTarget / maxResolved) * 100));
                const metTarget = op.resolvedThisShift >= op.resolvedTarget;

                return (
                  <div key={op.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200">{op.name}</span>
                        <span className="text-neutral-500 font-mono text-[10px]">
                          [{op.team}]
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Interactive 7-Day Sparkline */}
                        {op.history7Days && (
                          <OperatorSparkline
                            data={op.history7Days.map((d) => d.resolved)}
                            dates={op.history7Days.map((d) => d.dayLabel)}
                            unit="tickets"
                            color={OPERATOR_COLORS[op.id] || '#10B981'}
                          />
                        )}
                        <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
                          <span
                            className={
                              metTarget ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'
                            }
                          >
                            {op.resolvedThisShift}
                          </span>
                          <span className="text-neutral-500">/ {op.resolvedTarget}</span>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Bar with Target Marker */}
                    <div className="relative w-full h-4 bg-neutral-950 rounded overflow-hidden border border-neutral-800">
                      <div
                        className={`h-full rounded transition-all ${
                          metTarget ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${actualPercent}%` }}
                      />
                      {/* Target line indicator */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                        style={{ left: `${targetPercent}%` }}
                        title={`Target: ${op.resolvedTarget}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive 7-Day Trend Chart View */}
          {(chart1View === 'trend' || chart1View === 'combined') && (
            <div className={chart1View === 'combined' ? 'pt-4 border-t border-neutral-800' : ''}>
              {chart1View === 'combined' && (
                <div className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>7-Day Resolution Trajectory & Target Tracking</span>
                </div>
              )}
              <PerformanceTrendChart
                operators={filteredOperators}
                metricType="resolved"
                targetValue={10}
                targetLabel="Target (10)"
                unit="tickets"
                isRTL={isRTL}
              />
            </div>
          )}
        </div>

        {/* Bar Chart 2: Average Response Time by Operator (Minutes) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-800 gap-2">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>{t('perf_response_time')}</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {chart2View === 'trend'
                  ? t('perf_trend_sub_response')
                  : t('perf_col_response_time')}
              </p>
            </div>

            {/* View Mode Segmented Switcher */}
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10.5px]">
              <button
                onClick={() => setChart2View('bars')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  chart2View === 'bars'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('perf_view_bars')}
              </button>
              <button
                onClick={() => setChart2View('trend')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  chart2View === 'trend'
                    ? 'bg-neutral-800 text-emerald-400 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>{t('perf_view_trend')}</span>
              </button>
              <button
                onClick={() => setChart2View('combined')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  chart2View === 'combined'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('perf_view_both')}
              </button>
            </div>
          </div>

          {/* Bar Chart View */}
          {(chart2View === 'bars' || chart2View === 'combined') && (
            <div className="space-y-3.5 text-xs">
              {filteredOperators.map((op) => {
                const responsePercent = Math.min(100, Math.round((op.avgResponseMinutes / maxResponse) * 100));
                const isFast = op.avgResponseMinutes <= 15;
                const isWarning = op.avgResponseMinutes > 20;

                return (
                  <div key={op.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200">{op.name}</span>
                        <span className="text-neutral-500 font-mono text-[10px]">
                          [{op.team}]
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Interactive 7-Day Sparkline */}
                        {op.history7Days && (
                          <OperatorSparkline
                            data={op.history7Days.map((d) => d.avgResponseMinutes)}
                            dates={op.history7Days.map((d) => d.dayLabel)}
                            unit="min"
                            isResponseTime={true}
                            color={isFast ? '#10B981' : isWarning ? '#EF4444' : '#F59E0B'}
                          />
                        )}
                        <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
                          <span
                            className={
                              isFast
                                ? 'text-emerald-400 font-bold'
                                : isWarning
                                ? 'text-red-400 font-bold'
                                : 'text-amber-400 font-bold'
                            }
                          >
                            {op.avgResponseMinutes}m
                          </span>
                          <span className="text-neutral-500">· MTTR: {op.avgResolutionHours}h</span>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Response Bar */}
                    <div className="relative w-full h-4 bg-neutral-950 rounded overflow-hidden border border-neutral-800">
                      <div
                        className={`h-full rounded transition-all ${
                          isFast
                            ? 'bg-blue-500'
                            : isWarning
                            ? 'bg-red-500'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${responsePercent}%` }}
                      />
                      {/* SLA threshold line at 20 min */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400/80 z-10"
                        style={{ left: `${(20 / maxResponse) * 100}%` }}
                        title="20 min SLA"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Interactive 7-Day Trend Chart View */}
          {(chart2View === 'trend' || chart2View === 'combined') && (
            <div className={chart2View === 'combined' ? 'pt-4 border-t border-neutral-800' : ''}>
              {chart2View === 'combined' && (
                <div className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>7-Day Response Latency vs 20m SLA Threshold</span>
                </div>
              )}
              <PerformanceTrendChart
                operators={filteredOperators}
                metricType="response"
                targetValue={20}
                targetLabel="20m SLA Threshold"
                unit="min"
                isRTL={isRTL}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart 3: Active Workload Distribution (Stacked by Priority) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-neutral-800 gap-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>{t('perf_workload')}</span>
            </h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {chart3View === 'trend'
                ? t('perf_trend_sub_workload')
                : t('perf_col_workload')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Legend for bars */}
            {(chart3View === 'bars' || chart3View === 'combined') && (
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> {t('critical')}
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> {t('major')}
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> {t('minor')}
                </span>
              </div>
            )}

            {/* View Mode Segmented Switcher */}
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10.5px]">
              <button
                onClick={() => setChart3View('bars')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  chart3View === 'bars'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('perf_view_bars')}
              </button>
              <button
                onClick={() => setChart3View('trend')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  chart3View === 'trend'
                    ? 'bg-neutral-800 text-emerald-400 font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>{t('perf_view_trend')}</span>
              </button>
              <button
                onClick={() => setChart3View('combined')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  chart3View === 'combined'
                    ? 'bg-neutral-800 text-white font-medium shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('perf_view_both')}
              </button>
            </div>
          </div>
        </div>

        {/* Bar Chart View */}
        {(chart3View === 'bars' || chart3View === 'combined') && (
          <div className="space-y-3.5 text-xs">
            {filteredOperators.map((op) => {
              const total = op.activeTicketsCount;
              const critPct = total > 0 ? (op.criticalAssigned / maxWorkload) * 100 : 0;
              const majPct = total > 0 ? (op.majorAssigned / maxWorkload) * 100 : 0;
              const minPct = total > 0 ? (op.minorAssigned / maxWorkload) * 100 : 0;

              return (
                <div key={op.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200">{op.name}</span>
                      <span className="text-neutral-500 font-mono text-[10px]">
                        {op.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Interactive 7-Day Sparkline */}
                      {op.history7Days && (
                        <OperatorSparkline
                          data={op.history7Days.map((d) => d.activeWorkload)}
                          dates={op.history7Days.map((d) => d.dayLabel)}
                          unit="cases"
                          color={OPERATOR_COLORS[op.id] || '#F59E0B'}
                        />
                      )}
                      <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                        <span className="text-neutral-300 font-bold">
                          {op.activeTicketsCount} {t('total_tickets')}
                        </span>
                        <span className="text-neutral-500">
                          ({t('critical')}: {op.criticalAssigned} · {t('major')}: {op.majorAssigned} · {t('minor')}: {op.minorAssigned})
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          SLA: {op.slaAdherenceRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stacked Bar for Workload */}
                  <div className="w-full h-4 bg-neutral-950 rounded flex overflow-hidden border border-neutral-800">
                    {op.criticalAssigned > 0 && (
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${critPct}%` }}
                        title={`Critical: ${op.criticalAssigned}`}
                      />
                    )}
                    {op.majorAssigned > 0 && (
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${majPct}%` }}
                        title={`Major: ${op.majorAssigned}`}
                      />
                    )}
                    {op.minorAssigned > 0 && (
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${minPct}%` }}
                        title={`Minor: ${op.minorAssigned}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Interactive 7-Day Trend Chart View */}
        {(chart3View === 'trend' || chart3View === 'combined') && (
          <div className={chart3View === 'combined' ? 'pt-4 border-t border-neutral-800' : ''}>
            {chart3View === 'combined' && (
              <div className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>7-Day Active Ticket Backlog Trajectory</span>
              </div>
            )}
            <PerformanceTrendChart
              operators={filteredOperators}
              metricType="workload"
              unit="cases"
              isRTL={isRTL}
            />
          </div>
        )}
      </div>

      {/* Operator Detail Performance Roster */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="p-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div className="font-bold text-neutral-200 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{t('perf_ledger')}</span>
          </div>
          <span className="text-neutral-500 font-mono text-[11px]">
            {filteredOperators.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/40 text-neutral-400 font-semibold">
                <th className="py-2.5 px-4">{t('perf_col_operator')}</th>
                <th className="py-2.5 px-3">{t('perf_col_team')}</th>
                <th className="py-2.5 px-3">{t('perf_col_shift')}</th>
                <th className="py-2.5 px-3 text-right">{t('perf_col_resolved')}</th>
                <th className="py-2.5 px-3 text-right">Target</th>
                <th className="py-2.5 px-3 text-right">{t('perf_col_response_time')}</th>
                <th className="py-2.5 px-3 text-right">MTTR</th>
                <th className="py-2.5 px-3 text-right">{t('perf_col_sla_rate')}</th>
                <th className="py-2.5 px-3 text-center">{t('perf_trend_toggle')}</th>
                <th className="py-2.5 px-4 text-right">{t('perf_col_workload')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono text-[11px]">
              {filteredOperators.map((op) => (
                <tr key={op.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-white">
                    <div>{op.name}</div>
                    <div className="text-[10px] text-neutral-500 font-sans">{op.role}</div>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-300">
                    <span>{op.team}</span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-neutral-400 text-[11px]">
                    {getShiftLabel(op.shift)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                    {op.resolvedThisShift}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-400 tabular-nums">
                    {op.resolvedTarget}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span
                      className={
                        op.avgResponseMinutes <= 15
                          ? 'text-emerald-400 font-semibold'
                          : op.avgResponseMinutes > 20
                          ? 'text-red-400 font-semibold'
                          : 'text-amber-400'
                      }
                    >
                      {op.avgResponseMinutes}m
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-300 tabular-nums">
                    {op.avgResolutionHours}h
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    <span
                      className={
                        op.slaAdherenceRate >= 96
                          ? 'text-emerald-400 font-bold'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {op.slaAdherenceRate}%
                    </span>
                  </td>
                  {/* 7-Day Resolution Trajectory Sparkline in Table */}
                  <td className="py-2.5 px-3 text-center">
                    {op.history7Days ? (
                      <div className="flex justify-center">
                        <OperatorSparkline
                          data={op.history7Days.map((d) => d.resolved)}
                          dates={op.history7Days.map((d) => d.dayLabel)}
                          unit="tickets"
                          color={OPERATOR_COLORS[op.id] || '#10B981'}
                        />
                      </div>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-bold text-amber-400">
                    {op.activeTicketsCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Management Review & PDF Export Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{t('download_report_pdf')}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                      NOC MANAGEMENT
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Djezzy NOC Operations · Executive Performance & Statistics Review
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope & KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Scope Shift</span>
                <span className="font-semibold text-neutral-200">{getShiftLabel(shiftFilter)}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Telecom Unit</span>
                <span className="font-semibold text-neutral-200">{teamFilter === 'ALL' ? 'All Units' : teamFilter}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Operators</span>
                <span className="font-semibold text-neutral-200">{filteredOperators.length} Active</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Resolved / SLA</span>
                <span className="font-semibold text-emerald-400 font-mono">{totalResolved} ({avgSla}%)</span>
              </div>
            </div>

            {/* Executive Configuration Form */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    {t('report_reviewer_name')}
                  </label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-red-500"
                    placeholder="e.g. Farid Belhadj / Shift Lead"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Reviewer Authority / Department
                  </label>
                  <input
                    type="text"
                    value={reviewerRole}
                    onChange={(e) => setReviewerRole(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-red-500"
                    placeholder="e.g. NOC Operations Management"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  {t('report_executive_notes')}
                </label>
                <textarea
                  rows={3}
                  value={executiveNotes}
                  onChange={(e) => setExecutiveNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-red-500 text-xs"
                  placeholder="Operational comments, handover guidance, capacity alerts..."
                />
              </div>

              <div className="p-2.5 rounded bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <span className="font-semibold text-neutral-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Generated in Management Review PDF:
                </span>
                <p>• Executive Summary KPI cards with targets, SLA benchmark, and ticket priorities (P1/P2/P3).</p>
                <p>• Departmental aggregate workload table for all telecom units ({filteredOperators.length} operators).</p>
                <p>• Complete operator productivity and SLA ledger with response velocity & MTTR.</p>
                <p>• Operational risk highlights, capacity bottleneck alerts, and formal sign-off boxes.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdfReport()}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 rounded shadow-sm shadow-red-950/50 transition-colors cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isGeneratingPdf ? t('generating_report') : t('download_report_pdf')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
