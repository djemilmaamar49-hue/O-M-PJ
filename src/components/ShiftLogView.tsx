import React, { useState, useMemo } from 'react';
import {
  ShiftLog,
  ShiftMilestone,
  ShiftMilestoneCategory,
  HandoverPriorityItem,
  ShiftIncidentSummary,
  ShiftType,
  Ticket,
  HardwareAsset,
  SiteInfo,
  Assignee,
} from '../types/telecom';
import { OperatorMetric, INITIAL_OPERATORS } from './TeamPerformanceView';
import {
  analyzeShiftHandover,
  answerShiftHandoverQuery,
  ShiftHandoverAnalysisResult,
} from '../utils/aiShiftHandoverAssistant';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  Send,
  Plus,
  ArrowRight,
  Download,
  Users,
  Radio,
  Zap,
  Activity,
  Check,
  FileText,
  Calendar,
  Layers,
  HelpCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Search,
  X,
  RotateCcw,
  FileSearch,
  UserCheck,
  CalendarRange,
} from 'lucide-react';

interface ShiftLogViewProps {
  tickets: Ticket[];
  assets: HardwareAsset[];
  sites: SiteInfo[];
  shiftLogs: ShiftLog[];
  onUpdateShiftLog: (updatedLog: ShiftLog) => void;
  onCreateShiftLog: (newLog: ShiftLog) => void;
  onSelectTicketById: (ticketId: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onToast: (msg: string) => void;
}

export const ShiftLogView: React.FC<ShiftLogViewProps> = ({
  tickets,
  assets,
  sites,
  shiftLogs,
  onUpdateShiftLog,
  onCreateShiftLog,
  onSelectTicketById,
  onNavigateToTab,
  onToast,
}) => {
  const { t, isRTL } = useLanguage();

  // Historical Shift Logs Search & Audit Filter States
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('ALL');
  const [filterShiftType, setFilterShiftType] = useState<string>('ALL');
  const [isAuditLedgerOpen, setIsAuditLedgerOpen] = useState<boolean>(false);

  // Extract all distinct operators & supervisors for the operator query filter
  const availableOperators = useMemo(() => {
    const set = new Set<string>();
    shiftLogs.forEach((log) => {
      if (log.outgoingSupervisor) {
        const name = log.outgoingSupervisor.split('(')[0].trim();
        if (name) set.add(name);
      }
      if (log.incomingSupervisor) {
        const name = log.incomingSupervisor.split('(')[0].trim();
        if (name) set.add(name);
      }
      log.operatorsOnDuty.forEach((op) => {
        const name = op.split('(')[0].trim();
        if (name) set.add(name);
      });
      log.milestones.forEach((m) => {
        if (m.operator) {
          const name = m.operator.split('(')[0].trim();
          if (name) set.add(name);
        }
      });
    });
    return Array.from(set).sort();
  }, [shiftLogs]);

  // Compute filtered historical shift logs based on user search parameters
  const filteredShiftLogs = useMemo(() => {
    return shiftLogs.filter((log) => {
      // 1. Date range query
      if (filterStartDate && log.date < filterStartDate) {
        return false;
      }
      if (filterEndDate && log.date > filterEndDate) {
        return false;
      }

      // 2. Specific operator query
      if (filterOperator && filterOperator !== 'ALL') {
        const targetOp = filterOperator.toLowerCase().trim();
        const matchesDuty = log.operatorsOnDuty.some((op) =>
          op.toLowerCase().includes(targetOp)
        );
        const matchesOut = log.outgoingSupervisor?.toLowerCase().includes(targetOp);
        const matchesIn = log.incomingSupervisor?.toLowerCase().includes(targetOp);
        const matchesMilestone = log.milestones.some((m) =>
          m.operator?.toLowerCase().includes(targetOp)
        );
        const matchesSignOff =
          log.outgoingSignOff?.signedBy?.toLowerCase().includes(targetOp) ||
          log.incomingSignOff?.acknowledgedBy?.toLowerCase().includes(targetOp);

        if (!matchesDuty && !matchesOut && !matchesIn && !matchesMilestone && !matchesSignOff) {
          return false;
        }
      }

      // 3. Shift Type query
      if (filterShiftType && filterShiftType !== 'ALL') {
        if (log.shiftType !== filterShiftType) return false;
      }

      // 4. Keyword text search query
      if (filterKeyword.trim()) {
        const q = filterKeyword.toLowerCase().trim();
        const inId = log.id.toLowerCase().includes(q);
        const inExec = log.executiveSummary?.toLowerCase().includes(q);
        const inWeather = log.weatherAndGridStatus?.toLowerCase().includes(q);
        const inNotes = log.generalNotes?.toLowerCase().includes(q);
        const inIncidents = log.criticalIncidents.some(
          (inc) =>
            inc.ticketId.toLowerCase().includes(q) ||
            inc.title.toLowerCase().includes(q) ||
            inc.siteName?.toLowerCase().includes(q) ||
            inc.wilaya?.toLowerCase().includes(q) ||
            inc.team?.toLowerCase().includes(q)
        );
        const inMilestones = log.milestones.some(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.linkedTicketId?.toLowerCase().includes(q) ||
            m.linkedSiteId?.toLowerCase().includes(q)
        );
        const inPriorities = log.handoverPriorities.some(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.recommendedAction.toLowerCase().includes(q) ||
            p.linkedTicketId?.toLowerCase().includes(q)
        );

        if (!inId && !inExec && !inWeather && !inNotes && !inIncidents && !inMilestones && !inPriorities) {
          return false;
        }
      }

      return true;
    });
  }, [shiftLogs, filterStartDate, filterEndDate, filterOperator, filterShiftType, filterKeyword]);

  // Active shift log selection (defaults to current morning shift or first filtered shift)
  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    shiftLogs[0]?.id || 'SHIFT-2026-09-28-MORN'
  );

  // Keep selectedShiftId synchronized with filtered results
  React.useEffect(() => {
    if (filteredShiftLogs.length > 0) {
      const exists = filteredShiftLogs.some((s) => s.id === selectedShiftId);
      if (!exists) {
        setSelectedShiftId(filteredShiftLogs[0].id);
      }
    }
  }, [filteredShiftLogs, selectedShiftId]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterKeyword.trim()) count++;
    if (filterStartDate) count++;
    if (filterEndDate) count++;
    if (filterOperator !== 'ALL') count++;
    if (filterShiftType !== 'ALL') count++;
    return count;
  }, [filterKeyword, filterStartDate, filterEndDate, filterOperator, filterShiftType]);

  const handleApplyPreset = (preset: 'ALL' | 'TODAY' | '3D' | '7D') => {
    if (preset === 'ALL') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'TODAY') {
      setFilterStartDate('2026-09-28');
      setFilterEndDate('2026-09-28');
    } else if (preset === '3D') {
      setFilterStartDate('2026-09-26');
      setFilterEndDate('2026-09-28');
    } else if (preset === '7D') {
      setFilterStartDate('2026-09-22');
      setFilterEndDate('2026-09-28');
    }
  };

  const handleResetFilters = () => {
    setFilterKeyword('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterOperator('ALL');
    setFilterShiftType('ALL');
  };

  const currentShift = useMemo(() => {
    return (
      shiftLogs.find((s) => s.id === selectedShiftId) ||
      filteredShiftLogs[0] ||
      shiftLogs[0]
    );
  }, [shiftLogs, selectedShiftId, filteredShiftLogs]);

  // Tab within Shift Log View
  const [activeTab, setActiveTab] = useState<
    'overview' | 'milestones' | 'incidents' | 'signoff'
  >('overview');

  // AI Assistant Target Shift Selection
  const [targetUpcomingShift, setTargetUpcomingShift] = useState<ShiftType>('Evening');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiCustomQuery, setAiCustomQuery] = useState('');
  const [aiQueryAnswer, setAiQueryAnswer] = useState<string | null>(null);

  // Milestones Category Filter
  const [milestoneFilter, setMilestoneFilter] = useState<string>('ALL');

  // New Milestone Form Modal
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [newMilestoneTime, setNewMilestoneTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [newMilestoneCategory, setNewMilestoneCategory] =
    useState<ShiftMilestoneCategory>('INCIDENT');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [newMilestoneOperator, setNewMilestoneOperator] = useState('Farid Belhadj');
  const [newMilestoneImpact, setNewMilestoneImpact] = useState<
    'CRITICAL' | 'MAJOR' | 'NORMAL'
  >('NORMAL');
  const [newMilestoneTicketId, setNewMilestoneTicketId] = useState('');

  // Manual Add Handover Priority Modal
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [newPriorityTitle, setNewPriorityTitle] = useState('');
  const [newPriorityRationale, setNewPriorityRationale] = useState('');
  const [newPriorityAction, setNewPriorityAction] = useState('');
  const [newPriorityLevel, setNewPriorityLevel] = useState<
    'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM'
  >('P2_HIGH');
  const [newPriorityTeam, setNewPriorityTeam] = useState<Assignee>('NOC_SDH');

  // Add Incident to Handover Modal
  const [isAddIncidentModalOpen, setIsAddIncidentModalOpen] = useState(false);
  const [selectedTicketForHandover, setSelectedTicketForHandover] = useState<string>('');
  const [handoverRequiredAction, setHandoverRequiredAction] = useState('');

  // 1. Run AI Handover Analysis
  const aiAnalysis: ShiftHandoverAnalysisResult = useMemo(() => {
    return analyzeShiftHandover(tickets, INITIAL_OPERATORS, targetUpcomingShift);
  }, [tickets, targetUpcomingShift]);

  const handleRefreshAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      onToast(`AI Handover priorities refreshed for ${targetUpcomingShift} shift.`);
    }, 600);
  };

  // Adopt AI Priority into official Shift Log
  const handleAdoptAiPriority = (priority: HandoverPriorityItem) => {
    if (!currentShift) return;

    // Check if already in handoverPriorities
    const exists = currentShift.handoverPriorities.some(
      (p) => p.title === priority.title || p.id === priority.id
    );

    if (exists) {
      onToast('This AI priority is already in the handover checklist.');
      return;
    }

    const updatedPriorities = [
      ...currentShift.handoverPriorities,
      { ...priority, status: 'ACCEPTED' as const },
    ];

    const updatedShift: ShiftLog = {
      ...currentShift,
      handoverPriorities: updatedPriorities,
    };

    onUpdateShiftLog(updatedShift);
    onToast(t('shiftlog_adopted_toast'));
  };

  // Toggle Handover Priority Status (Pending / Done)
  const handleTogglePriorityStatus = (priorityId: string) => {
    if (!currentShift) return;
    const updated = currentShift.handoverPriorities.map((p) => {
      if (p.id === priorityId) {
        return {
          ...p,
          status: p.status === 'DONE' ? ('PENDING' as const) : ('DONE' as const),
        };
      }
      return p;
    });

    onUpdateShiftLog({
      ...currentShift,
      handoverPriorities: updated,
    });
  };

  // Submit Milestone
  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !currentShift) return;

    const milestone: ShiftMilestone = {
      id: `MS-${Date.now().toString().slice(-4)}`,
      timestamp: newMilestoneTime,
      category: newMilestoneCategory,
      title: newMilestoneTitle.trim(),
      description: newMilestoneDesc.trim(),
      operator: newMilestoneOperator.trim() || 'NOC Operator',
      impact: newMilestoneImpact,
      linkedTicketId: newMilestoneTicketId ? newMilestoneTicketId.trim() : undefined,
    };

    const updatedShift: ShiftLog = {
      ...currentShift,
      milestones: [milestone, ...currentShift.milestones],
    };

    onUpdateShiftLog(updatedShift);
    setIsMilestoneModalOpen(false);
    setNewMilestoneTitle('');
    setNewMilestoneDesc('');
    setNewMilestoneTicketId('');
    onToast(`Milestone recorded at ${milestone.timestamp}: ${milestone.title}`);
  };

  // Submit Manual Handover Priority
  const handleSavePriority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityTitle.trim() || !currentShift) return;

    const newPriority: HandoverPriorityItem = {
      id: `HP-MAN-${Date.now().toString().slice(-4)}`,
      priorityLevel: newPriorityLevel,
      title: newPriorityTitle.trim(),
      rationale: newPriorityRationale.trim(),
      recommendedAction: newPriorityAction.trim(),
      assignedTeam: newPriorityTeam,
      status: 'PENDING',
    };

    onUpdateShiftLog({
      ...currentShift,
      handoverPriorities: [...currentShift.handoverPriorities, newPriority],
    });

    setIsPriorityModalOpen(false);
    setNewPriorityTitle('');
    setNewPriorityRationale('');
    setNewPriorityAction('');
    onToast(`Handover priority added: ${newPriority.title}`);
  };

  // Link Ticket to Handover Ledger
  const handleAddTicketToHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForHandover || !currentShift) return;

    const targetTkt = tickets.find((t) => t.id === selectedTicketForHandover);
    if (!targetTkt) return;

    const newIncidentSummary: ShiftIncidentSummary = {
      ticketId: targetTkt.id,
      title: targetTkt.title,
      siteName: targetTkt.siteName || (targetTkt.siteId ? `Site ${targetTkt.siteId}` : 'Core Network'),
      wilaya: targetTkt.wilaya || 'Alger',
      team: targetTkt.Assigne_a,
      priority: targetTkt.Priorite,
      status: targetTkt.Etat,
      slaDeadline: targetTkt.slaDeadline || 'Approaching SLA limit',
      actionRequiredForIncoming:
        handoverRequiredAction.trim() ||
        'Take over dispatch monitoring and maintain hourly contact with field crew.',
    };

    const updatedIncidents = [
      ...currentShift.criticalIncidents.filter((i) => i.ticketId !== targetTkt.id),
      newIncidentSummary,
    ];

    onUpdateShiftLog({
      ...currentShift,
      criticalIncidents: updatedIncidents,
    });

    setIsAddIncidentModalOpen(false);
    setSelectedTicketForHandover('');
    setHandoverRequiredAction('');
    onToast(`Ticket ${targetTkt.id} transferred to incoming handover ledger.`);
  };

  // Handle Outgoing Sign-Off
  const handleOutgoingSignOff = () => {
    if (!currentShift) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updated: ShiftLog = {
      ...currentShift,
      status: 'HANDOVER_PENDING',
      outgoingSignOff: {
        signed: true,
        signedAt: nowStr,
        signedBy: currentShift.outgoingSupervisor,
      },
    };
    onUpdateShiftLog(updated);
    onToast(`Outgoing supervisor ${currentShift.outgoingSupervisor} signed off.`);
  };

  // Handle Incoming Custody Acceptance
  const handleIncomingSignOff = () => {
    if (!currentShift) return;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updated: ShiftLog = {
      ...currentShift,
      status: 'HANDOVER_COMPLETED',
      incomingSignOff: {
        acknowledged: true,
        acknowledgedAt: nowStr,
        acknowledgedBy: currentShift.incomingSupervisor,
      },
    };
    onUpdateShiftLog(updated);
    onToast(
      `Incoming supervisor ${currentShift.incomingSupervisor} accepted shift custody.`
    );
  };

  // Ask AI Q&A
  const handleAskAi = (promptText?: string) => {
    const query = promptText || aiCustomQuery;
    if (!query.trim()) return;
    const answer = answerShiftHandoverQuery(
      query,
      aiAnalysis,
      tickets,
      INITIAL_OPERATORS
    );
    setAiQueryAnswer(answer);
  };

  // Export Shift Handover Report
  const handleExportShiftReport = (targetShift?: ShiftLog) => {
    const shift = targetShift || currentShift;
    if (!shift) return;
    const lines = [
      `DJEZZY GSM NOC - SHIFT HANDOVER REPORT`,
      `Shift ID: ${shift.id}`,
      `Date: ${shift.date} | Shift: ${shift.shiftType} (${shift.shiftHours})`,
      `Status: ${shift.status}`,
      `Outgoing Lead: ${shift.outgoingSupervisor}`,
      `Incoming Lead: ${shift.incomingSupervisor}`,
      `Operators On-Duty: ${shift.operatorsOnDuty.join(', ')}`,
      `------------------------------------------------------------`,
      `EXECUTIVE BRIEFING:`,
      shift.executiveSummary,
      `------------------------------------------------------------`,
      `WEATHER & SONELGAZ ELECTRICAL GRID:`,
      shift.weatherAndGridStatus,
      `------------------------------------------------------------`,
      `CRITICAL INCIDENTS TRANSFERRED:`,
      ...shift.criticalIncidents.map(
        (i) =>
          `* [${i.priority}] ${i.ticketId}: ${i.title} (${i.siteName}) | Team: ${i.team} | Action: ${i.actionRequiredForIncoming}`
      ),
      `------------------------------------------------------------`,
      `HANDOVER PRIORITIES:`,
      ...shift.handoverPriorities.map(
        (p) =>
          `* [${p.priorityLevel}] ${p.title} (${p.assignedTeam}) - Status: ${p.status} | Rec: ${p.recommendedAction}`
      ),
      `------------------------------------------------------------`,
      `SHIFT MILESTONES:`,
      ...shift.milestones.map(
        (m) =>
          `[${m.timestamp}] [${m.category}] ${m.title} (${m.operator}) - ${m.description}`
      ),
      `------------------------------------------------------------`,
      `Outgoing Signed: ${shift.outgoingSignOff?.signed ? `YES at ${shift.outgoingSignOff.signedAt} by ${shift.outgoingSignOff.signedBy}` : 'NO'}`,
      `Incoming Acknowledged: ${shift.incomingSignOff?.acknowledged ? `YES at ${shift.incomingSignOff.acknowledgedAt} by ${shift.incomingSignOff.acknowledgedBy}` : 'NO'}`,
    ];

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Djezzy_NOC_Handover_${shift.id}_${shift.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast(`Shift Handover report downloaded (${shift.id}).`);
  };

  // Filtered Milestones
  const filteredMilestones = useMemo(() => {
    if (!currentShift) return [];
    if (milestoneFilter === 'ALL') return currentShift.milestones;
    return currentShift.milestones.filter((m) => m.category === milestoneFilter);
  }, [currentShift, milestoneFilter]);

  // Unresolved tickets available to add to handover
  const openQueueTickets = useMemo(() => {
    return tickets.filter((t) => t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED');
  }, [tickets]);

  if (!currentShift) {
    return <div className="p-8 text-neutral-400 text-center">Loading NOC Shift Log...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Shift Selector Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-600/20 text-red-400 rounded border border-red-600/30">
                <BookOpen className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">
                {t('shiftlog_title')}
              </h2>
              {/* Shift Status Badge */}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                  currentShift.status === 'HANDOVER_COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : currentShift.status === 'HANDOVER_PENDING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {currentShift.status === 'HANDOVER_COMPLETED'
                  ? 'Handover Completed'
                  : currentShift.status === 'HANDOVER_PENDING'
                  ? 'Handover Pending'
                  : 'Active Shift'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              {t('shiftlog_sub')}
            </p>
          </div>

          {/* Shift Switcher & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Shift Archive Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded border border-neutral-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[210px] sm:max-w-none truncate"
              >
                {filteredShiftLogs.length > 0 ? (
                  filteredShiftLogs.map((s) => (
                    <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                      {s.date} · {s.shiftType} ({s.shiftHours}) {s.status === 'ACTIVE' ? '• Active' : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled className="bg-neutral-900 text-neutral-400">
                    {t('shiftlog_no_results')}
                  </option>
                )}
              </select>
            </div>

            <button
              onClick={() => setIsMilestoneModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('shiftlog_btn_add_milestone')}</span>
            </button>

            <button
              onClick={() => handleExportShiftReport()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors cursor-pointer"
              title="Download text handover file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('shiftlog_btn_export')}</span>
            </button>
          </div>
        </div>

        {/* Historical Shift Log Search & Handover Audit Filter Bar */}
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-neutral-950/80 p-3 rounded-lg border border-neutral-800">
            {/* Left: Search Title & Stats */}
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-neutral-800 text-neutral-300">
                <Filter className="w-3.5 h-3.5 text-red-500" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {t('shiftlog_search_title')}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {filteredShiftLogs.length} / {shiftLogs.length} {t('shiftlog_filter_results_count')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Date Presets & Audit Ledger Button */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-neutral-400 mr-1 hidden sm:inline">
                {t('shiftlog_filter_date_range')}:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('ALL')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  !filterStartDate && !filterEndDate
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {t('shiftlog_preset_all')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('TODAY')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStartDate === '2026-09-28' && filterEndDate === '2026-09-28'
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {t('shiftlog_preset_today')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('3D')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStartDate === '2026-09-26' && filterEndDate === '2026-09-28'
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {t('shiftlog_preset_3d')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('7D')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStartDate === '2026-09-22' && filterEndDate === '2026-09-28'
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {t('shiftlog_preset_7d')}
              </button>

              <button
                type="button"
                onClick={() => setIsAuditLedgerOpen(true)}
                className="ml-auto sm:ml-2 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/80 rounded transition-colors cursor-pointer"
                title="View full audit ledger for filtered handovers"
              >
                <FileSearch className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('shiftlog_audit_ledger_btn')}</span>
              </button>
            </div>
          </div>

          {/* Filter Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2.5">
            {/* Keyword Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder={t('shiftlog_filter_keyword')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
              />
              {filterKeyword && (
                <button
                  type="button"
                  onClick={() => setFilterKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Operator Filter Dropdown */}
            <div className="relative">
              <UserCheck className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 transition-colors cursor-pointer truncate"
              >
                <option value="ALL" className="bg-neutral-900 text-white">
                  {t('shiftlog_filter_all_operators')}
                </option>
                {availableOperators.map((op) => (
                  <option key={op} value={op} className="bg-neutral-900 text-white">
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Inputs: From & To */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs">
                <span className="text-[10px] text-neutral-500 uppercase mr-1">{t('shiftlog_filter_from')}</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-transparent text-white text-[11px] focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex-1 flex items-center bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs">
                <span className="text-[10px] text-neutral-500 uppercase mr-1">{t('shiftlog_filter_to')}</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-transparent text-white text-[11px] focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Shift Type Filter & Reset Button */}
            <div className="flex items-center gap-2">
              <select
                value={filterShiftType}
                onChange={(e) => setFilterShiftType(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-600 transition-colors cursor-pointer"
              >
                <option value="ALL" className="bg-neutral-900 text-white">
                  {t('shiftlog_filter_all_shifts')}
                </option>
                <option value="Morning" className="bg-neutral-900 text-white">Morning (07:00 - 15:00)</option>
                <option value="Evening" className="bg-neutral-900 text-white">Evening (15:00 - 23:00)</option>
                <option value="Night" className="bg-neutral-900 text-white">Night (23:00 - 07:00)</option>
              </select>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 bg-red-950/40 hover:bg-red-950/80 border border-red-800/60 rounded transition-colors cursor-pointer shrink-0"
                  title="Reset all search filters"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('shiftlog_filter_clear')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips bar (if filters are active) */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-neutral-800/80 text-[11px]">
              <span className="text-neutral-500 font-medium">Filtres actifs :</span>
              {filterOperator !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-medium">
                  <span>Opérateur: {filterOperator}</span>
                  <button onClick={() => setFilterOperator('ALL')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {(filterStartDate || filterEndDate) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-medium">
                  <span>Dates: {filterStartDate || '...'} → {filterEndDate || '...'}</span>
                  <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filterShiftType !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-medium">
                  <span>Quart: {filterShiftType}</span>
                  <button onClick={() => setFilterShiftType('ALL')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {filterKeyword.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-medium">
                  <span>Recherche: "{filterKeyword}"</span>
                  <button onClick={() => setFilterKeyword('')} className="hover:text-white cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Shift Identity Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-neutral-800 text-xs">
          <div className="bg-neutral-950/60 p-2.5 rounded border border-neutral-800/80">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
              {t('shiftlog_outgoing_sup')}
            </span>
            <div className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{currentShift.outgoingSupervisor}</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded border border-neutral-800/80">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
              {t('shiftlog_incoming_sup')}
            </span>
            <div className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{currentShift.incomingSupervisor}</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 p-2.5 rounded border border-neutral-800/80 sm:col-span-2">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
              {t('shiftlog_operators_on_duty')} ({currentShift.operatorsOnDuty.length})
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {currentShift.operatorsOnDuty.map((op, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[11px] text-neutral-300 font-medium"
                >
                  {op}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Handover Priorities Assistant (Top Feature Highlight) */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-indigo-950/30 border border-indigo-500/30 rounded-lg p-5 shadow-lg relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* AI Assistant Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/40 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{t('shiftlog_ai_priorities_title')}</span>
                <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-mono">
                  TEAM METRICS AI
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t('shiftlog_ai_priorities_sub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Target shift selector */}
            <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-xs">
              <span className="text-neutral-500">Upcoming:</span>
              <select
                value={targetUpcomingShift}
                onChange={(e) => setTargetUpcomingShift(e.target.value as ShiftType)}
                className="bg-transparent text-indigo-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Evening" className="bg-neutral-900 text-white">
                  Evening (15:00-23:00)
                </option>
                <option value="Night" className="bg-neutral-900 text-white">
                  Night (23:00-07:00)
                </option>
                <option value="Morning" className="bg-neutral-900 text-white">
                  Morning (07:00-15:00)
                </option>
              </select>
            </div>

            <button
              onClick={handleRefreshAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Scanning...' : 'Re-Analyze'}</span>
            </button>
          </div>
        </div>

        {/* 4 AI Core Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {t('shiftlog_stress_index')}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {aiAnalysis.shiftStressScore}/100
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  aiAnalysis.stressAssessment === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-400'
                    : aiAnalysis.stressAssessment === 'ELEVATED'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {aiAnalysis.stressAssessment}
              </span>
            </div>
          </div>

          <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {t('shiftlog_stability_score')}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                {aiAnalysis.networkStabilityScore}%
              </span>
              <span className="text-[10px] text-neutral-400">GSM/4G Nominal</span>
            </div>
          </div>

          <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {t('shiftlog_critical_open')}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-red-400 tabular-nums">
                {aiAnalysis.criticalOpenCount}
              </span>
              <span className="text-[10px] text-neutral-400">
                + {aiAnalysis.majorOpenCount} Major
              </span>
            </div>
          </div>

          <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">
              {t('shiftlog_sla_breaches_risk')}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {aiAnalysis.impendingSlaBreachesCount}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">Priority 1 Radar</span>
            </div>
          </div>
        </div>

        {/* Natural Language Executive Brief */}
        <div className="bg-neutral-950/80 p-3.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 leading-relaxed mb-4">
          <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Handover Intelligence Briefing:</span>
          </div>
          <p>{aiAnalysis.executiveBrief}</p>
        </div>

        {/* Suggested AI Handover Priorities Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Suggested Handover Priorities for {targetUpcomingShift} Team</span>
              <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 text-[10px] font-mono text-neutral-300">
                {aiAnalysis.suggestedPriorities.length}
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiAnalysis.suggestedPriorities.map((item) => {
              const alreadyAdopted = currentShift.handoverPriorities.some(
                (p) => p.title === item.title || p.id === item.id
              );

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2.5 transition-all ${
                    item.priorityLevel === 'P1_CRITICAL'
                      ? 'bg-red-950/20 border-red-500/40'
                      : item.priorityLevel === 'P2_HIGH'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : 'bg-neutral-950/70 border-neutral-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.priorityLevel === 'P1_CRITICAL'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : item.priorityLevel === 'P2_HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {item.priorityLevel.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-neutral-400">
                          {item.assignedTeam}
                        </span>
                      </div>

                      {item.aiConfidence && (
                        <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                          {item.aiConfidence}% AI match
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs font-bold text-white">{item.title}</h5>

                    <p className="text-[11px] text-neutral-400 leading-normal">
                      {item.rationale}
                    </p>

                    <div className="p-2 bg-neutral-900/90 rounded border border-neutral-800 text-[11px] text-neutral-200">
                      <strong className="text-indigo-400">Action: </strong>
                      {item.recommendedAction}
                    </div>
                  </div>

                  {/* Action buttons on priority card */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
                    <span className="text-[10px] font-mono text-neutral-500">
                      Target: {item.deadlineEstimate || 'Shift First Hour'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.linkedTicketId && (
                        <button
                          onClick={() => onSelectTicketById(item.linkedTicketId!)}
                          className="px-2 py-1 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Open Ticket Details"
                        >
                          <Eye className="w-3 h-3 text-neutral-400" />
                          <span>{item.linkedTicketId}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleAdoptAiPriority(item)}
                        disabled={alreadyAdopted}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                          alreadyAdopted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {alreadyAdopted ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Adopted</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>{t('shiftlog_btn_adopt_priority')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload Imbalance Radar from TeamPerformanceView */}
        <div className="mt-5 pt-4 border-t border-neutral-800">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('shiftlog_team_bottlenecks_title')} (TeamPerformanceView Telemetry)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {aiAnalysis.teamBottlenecks.slice(0, 4).map((b) => (
              <div
                key={b.team}
                className="bg-neutral-950/70 p-2.5 rounded border border-neutral-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{b.team}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      b.riskLevel === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-300'
                        : b.riskLevel === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {b.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>Workload: {b.activeCount} tickets</span>
                  <span>Resp: {b.avgResponseTime}m</span>
                </div>
                <p className="text-[10px] text-neutral-500 line-clamp-2">
                  {b.primaryIssue}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Ask AI Assistant Bar */}
        <div className="mt-4 pt-4 border-t border-neutral-800/80">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={aiCustomQuery}
                onChange={(e) => setAiCustomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                placeholder={t('shiftlog_ask_ai_placeholder')}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-indigo-500 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleAskAi()}
              className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('shiftlog_btn_ask')}</span>
            </button>
          </div>

          {/* Quick query chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
            <span className="text-neutral-500 text-[10px]">Quick queries:</span>
            {[
              '⚡ Critical Power & Generator Risks',
              '⏱️ Impending SLA Breaches',
              '👥 Team Workload Bottlenecks',
              '📡 Transmission & Fiber Status',
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiCustomQuery(prompt);
                  handleAskAi(prompt);
                }}
                className="px-2 py-0.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* AI Response Display */}
          {aiQueryAnswer && (
            <div className="mt-3 p-3 bg-neutral-950 rounded border border-indigo-500/30 text-xs text-indigo-100 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-indigo-300 block">AI Shift Assistant Answer:</span>
                <p className="leading-relaxed">{aiQueryAnswer}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Internal Navigation Tabs for Logbook */}
      <div className="flex items-center gap-2 border-b border-neutral-800 text-xs font-semibold pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-red-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('shiftlog_tab_overview')}</span>
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'milestones'
              ? 'border-red-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t('shiftlog_tab_milestones')}</span>
          <span className="px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded text-[10px] font-mono">
            {currentShift.milestones.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'incidents'
              ? 'border-red-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{t('shiftlog_tab_incidents')}</span>
          <span className="px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-800 rounded text-[10px] font-mono">
            {currentShift.criticalIncidents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('signoff')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'signoff'
              ? 'border-red-500 text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t('shiftlog_tab_signoff')}</span>
          {currentShift.status === 'HANDOVER_COMPLETED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ACTIVE PRIORITIES */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Official Shift Handover Priorities Checklist */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  <span>Official Handover Priorities for Incoming Shift</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Actionable items acknowledged and recorded by outgoing NOC supervisors.
                </p>
              </div>

              <button
                onClick={() => setIsPriorityModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Handover Priority</span>
              </button>
            </div>

            {currentShift.handoverPriorities.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 text-xs">
                No priorities recorded yet. Use the AI Assistant above or click "Add Handover Priority".
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/80">
                {currentShift.handoverPriorities.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleTogglePriorityStatus(item.id)}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          item.status === 'DONE'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-neutral-700 bg-neutral-950 hover:border-neutral-500'
                        }`}
                        title="Mark Completed"
                      >
                        {item.status === 'DONE' && <Check className="w-3 h-3" />}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              item.priorityLevel === 'P1_CRITICAL'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : item.priorityLevel === 'P2_HIGH'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {item.priorityLevel.replace('_', ' ')}
                          </span>
                          <span className="font-semibold text-white">{item.title}</span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            [{item.assignedTeam}]
                          </span>
                        </div>

                        <p className="text-neutral-400 text-[11px]">{item.rationale}</p>

                        <div className="text-neutral-300 text-[11px] bg-neutral-950 p-2 rounded border border-neutral-800">
                          <span className="text-emerald-400 font-semibold">Incoming Action: </span>
                          {item.recommendedAction}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.linkedTicketId && (
                        <button
                          onClick={() => onSelectTicketById(item.linkedTicketId!)}
                          className="px-2 py-1 text-[11px] font-mono font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{item.linkedTicketId}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environmental, Grid & Executive Briefing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weather & Grid Status */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{t('shiftlog_weather_grid_title')}</span>
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded border border-neutral-800">
                {currentShift.weatherAndGridStatus}
              </p>
            </div>

            {/* Outgoing Executive Summary */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>{t('shiftlog_executive_summary_title')}</span>
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded border border-neutral-800">
                {currentShift.executiveSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MILESTONES TIMELINE */}
      {activeTab === 'milestones' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Shift Chronological Milestones Ledger</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Real-time logbook recording significant events, network topology changes, and incidents during shift hours.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded border border-neutral-800 text-[11px]">
                <Filter className="w-3 h-3 text-neutral-500 ml-1" />
                {['ALL', 'INCIDENT', 'MAINTENANCE', 'ENVIRONMENT', 'ESCALATION'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMilestoneFilter(cat)}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      milestoneFilter === cat
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsMilestoneModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Milestone</span>
              </button>
            </div>
          </div>

          {/* Timeline List */}
          {filteredMilestones.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No milestones recorded for this category.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
              {filteredMilestones.map((m) => {
                const isCrit = m.impact === 'CRITICAL';
                const isMaj = m.impact === 'MAJOR';

                return (
                  <div key={m.id} className="relative group text-xs">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                        isCrit
                          ? 'bg-red-600 border-red-400 text-white'
                          : isMaj
                          ? 'bg-amber-600 border-amber-400 text-white'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    {/* Milestone Card */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-1.5 hover:border-neutral-700 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">
                            {m.timestamp}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-neutral-900 text-neutral-300 border border-neutral-800">
                            {m.category}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              isCrit
                                ? 'bg-red-500/20 text-red-300'
                                : isMaj
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {m.impact}
                          </span>
                        </div>

                        <span className="text-[11px] text-neutral-500">
                          Recorded by: <strong className="text-neutral-300">{m.operator}</strong>
                        </span>
                      </div>

                      <h4 className="font-semibold text-white">{m.title}</h4>

                      <p className="text-neutral-400 text-[11px] leading-relaxed">
                        {m.description}
                      </p>

                      {(m.linkedTicketId || m.linkedSiteId) && (
                        <div className="pt-2 flex items-center gap-2 text-[11px]">
                          {m.linkedTicketId && (
                            <button
                              onClick={() => onSelectTicketById(m.linkedTicketId!)}
                              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded font-mono text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>{m.linkedTicketId}</span>
                            </button>
                          )}
                          {m.linkedSiteId && (
                            <span className="font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                              Site: {m.linkedSiteId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CRITICAL INCIDENT HANDOVER LEDGER */}
      {activeTab === 'incidents' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Critical Incidents & Alarm Handover Ledger</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Unresolved network alarms and customer-impacting outages transferred directly to the custody of the incoming shift.
              </p>
            </div>

            <button
              onClick={() => setIsAddIncidentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Open Ticket to Handover</span>
            </button>
          </div>

          {currentShift.criticalIncidents.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No critical incidents transferred yet. Click "Link Open Ticket to Handover" to select from active queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950/60 text-neutral-400 font-semibold">
                    <th className="py-2.5 px-3">Ticket Ref</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-4">Title & Site</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">SLA Deadline</th>
                    <th className="py-2.5 px-4">Action for Incoming Shift</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono text-[11px]">
                  {currentShift.criticalIncidents.map((inc) => (
                    <tr key={inc.ticketId} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">
                        <button
                          onClick={() => onSelectTicketById(inc.ticketId)}
                          className="hover:underline text-indigo-400 cursor-pointer"
                        >
                          {inc.ticketId}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            inc.priority === 'Critical'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {inc.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-neutral-200">
                        <div className="font-semibold text-white">{inc.title}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {inc.siteName} · {inc.wilaya}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-neutral-300 font-mono">
                        {inc.team}
                      </td>
                      <td className="py-3 px-3 text-amber-400 font-mono">
                        {inc.slaDeadline?.slice(11, 16) || 'Within 4h'}
                      </td>
                      <td className="py-3 px-4 font-sans text-neutral-300 max-w-xs">
                        <span className="bg-neutral-950 p-1.5 rounded block text-[11px] text-neutral-200 border border-neutral-800/80">
                          {inc.actionRequiredForIncoming}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-sans">
                        <button
                          onClick={() => onSelectTicketById(inc.ticketId)}
                          className="px-2.5 py-1 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TWO-PARTY DIGITAL SIGN-OFF PROTOCOL */}
      {activeTab === 'signoff' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-6">
          <div className="pb-3 border-b border-neutral-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Two-Party NOC Handover Sign-Off Protocol</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Formal operational transfer of network custody between outgoing supervisor and incoming supervisor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Outgoing Supervisor Sign-Off */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-white text-xs">
                  1. {t('shiftlog_signoff_outgoing_title')}
                </span>
                {currentShift.outgoingSignOff?.signed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Signed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                    Awaiting Signature
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-400 space-y-1.5">
                <p>
                  Supervisor: <strong className="text-white">{currentShift.outgoingSupervisor}</strong>
                </p>
                <div className="p-3 bg-neutral-900 rounded border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All active alarms reviewed and categorized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sonelgaz grid status & diesel autonomy recorded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Field operations contacts and ongoing CMs confirmed</span>
                  </div>
                </div>
                {currentShift.outgoingSignOff?.signed && (
                  <p className="text-[11px] font-mono text-neutral-500">
                    Signed at: {currentShift.outgoingSignOff.signedAt} by {currentShift.outgoingSignOff.signedBy}
                  </p>
                )}
              </div>

              {!currentShift.outgoingSignOff?.signed && (
                <button
                  onClick={handleOutgoingSignOff}
                  className="w-full py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors cursor-pointer shadow-sm"
                >
                  {t('shiftlog_signoff_outgoing_btn')}
                </button>
              )}
            </div>

            {/* Step 2: Incoming Supervisor Custody Acceptance */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-semibold text-white text-xs">
                  2. {t('shiftlog_signoff_incoming_title')}
                </span>
                {currentShift.incomingSignOff?.acknowledged ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Custody Accepted
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-400">
                    Pending Acceptance
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-400 space-y-1.5">
                <p>
                  Supervisor: <strong className="text-white">{currentShift.incomingSupervisor}</strong>
                </p>
                <div className="p-3 bg-neutral-900 rounded border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Review of AI suggested handover priorities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Operational briefing with outgoing lead completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Custody of unaddressed tickets and field operations accepted</span>
                  </div>
                </div>
                {currentShift.incomingSignOff?.acknowledged && (
                  <p className="text-[11px] font-mono text-neutral-500">
                    Accepted at: {currentShift.incomingSignOff.acknowledgedAt} by {currentShift.incomingSignOff.acknowledgedBy}
                  </p>
                )}
              </div>

              {currentShift.outgoingSignOff?.signed && !currentShift.incomingSignOff?.acknowledged && (
                <button
                  onClick={handleIncomingSignOff}
                  className="w-full py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors cursor-pointer shadow-sm"
                >
                  {t('shiftlog_signoff_incoming_btn')}
                </button>
              )}
            </div>
          </div>

          {currentShift.status === 'HANDOVER_COMPLETED' && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-bold">{t('shiftlog_signoff_completed_badge')}</div>
                  <div className="text-[11px] text-emerald-400/80">
                    Shift custody transferred to {currentShift.incomingSupervisor} at{' '}
                    {currentShift.incomingSignOff?.acknowledgedAt}.
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleExportShiftReport()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors cursor-pointer"
              >
                Download Archival Stamp
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD MILESTONE MODAL */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Log New Shift Milestone</span>
              </h3>
              <button
                onClick={() => setIsMilestoneModalOpen(false)}
                className="text-neutral-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMilestone} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Timestamp</label>
                  <input
                    type="text"
                    value={newMilestoneTime}
                    onChange={(e) => setNewMilestoneTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Impact Level</label>
                  <select
                    value={newMilestoneImpact}
                    onChange={(e) => setNewMilestoneImpact(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="MAJOR">MAJOR</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Category</label>
                <select
                  value={newMilestoneCategory}
                  onChange={(e) => setNewMilestoneCategory(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="INCIDENT">INCIDENT (Network / Hardware Alarm)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Preventive or Corrective CM)</option>
                  <option value="NETWORK_CHANGE">NETWORK_CHANGE (Configuration or Routing)</option>
                  <option value="ENVIRONMENT">ENVIRONMENT (Sonelgaz Power / Weather)</option>
                  <option value="ESCALATION">ESCALATION (VIP / Management Escalation)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Milestone Title</label>
                <input
                  type="text"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Microwave dish realignment completed"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Description & Technical Details</label>
                <textarea
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  rows={3}
                  placeholder="Include affected BSS sectors, field team dispatched, or telemetry readings..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Operator</label>
                  <input
                    type="text"
                    value={newMilestoneOperator}
                    onChange={(e) => setNewMilestoneOperator(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Linked Ticket ID (optional)</label>
                  <input
                    type="text"
                    value={newMilestoneTicketId}
                    onChange={(e) => setNewMilestoneTicketId(e.target.value)}
                    placeholder="e.g. TKT-1082"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD HANDOVER PRIORITY MODAL */}
      {isPriorityModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-500" />
                <span>Create Handover Priority</span>
              </h3>
              <button
                onClick={() => setIsPriorityModalOpen(false)}
                className="text-neutral-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePriority} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Priority Level</label>
                  <select
                    value={newPriorityLevel}
                    onChange={(e) => setNewPriorityLevel(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="P1_CRITICAL">P1 CRITICAL</option>
                    <option value="P2_HIGH">P2 HIGH</option>
                    <option value="P3_MEDIUM">P3 MEDIUM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Target Team</label>
                  <select
                    value={newPriorityTeam}
                    onChange={(e) => setNewPriorityTeam(e.target.value as Assignee)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="NOC_SDH">NOC_SDH (Transmission)</option>
                    <option value="O&M_ENV">O&M_ENV (Power & Clim)</option>
                    <option value="ACCES_PROD">ACCES_PROD (Radio RAN)</option>
                    <option value="FIELD_OPS">FIELD_OPS (Field Crews)</option>
                    <option value="CS_FRONTOFFICE">CS_FRONTOFFICE (VIP)</option>
                    <option value="ENG_TRANS">ENG_TRANS (Microwave)</option>
                    <option value="M_MOBISERV">M_MOBISERV (Core Data)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Priority Title</label>
                <input
                  type="text"
                  value={newPriorityTitle}
                  onChange={(e) => setNewPriorityTitle(e.target.value)}
                  placeholder="e.g. Fiber link restoration follow-up"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Rationale / Situation</label>
                <textarea
                  value={newPriorityRationale}
                  onChange={(e) => setNewPriorityRationale(e.target.value)}
                  rows={2}
                  placeholder="Why is this urgent for the incoming shift?"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Recommended Action for Incoming Team</label>
                <textarea
                  value={newPriorityAction}
                  onChange={(e) => setNewPriorityAction(e.target.value)}
                  rows={2}
                  placeholder="Specific technical steps to execute..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPriorityModalOpen(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded cursor-pointer"
                >
                  Add Priority
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LINK TICKET TO HANDOVER MODAL */}
      {isAddIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Transfer Ticket to Incoming Handover</span>
              </h3>
              <button
                onClick={() => setIsAddIncidentModalOpen(false)}
                className="text-neutral-400 hover:text-white text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTicketToHandover} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Select Open Ticket</label>
                <select
                  value={selectedTicketForHandover}
                  onChange={(e) => setSelectedTicketForHandover(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-2 text-white font-mono"
                  required
                >
                  <option value="">-- Choose an open ticket ({openQueueTickets.length} available) --</option>
                  {openQueueTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.Priorite}] {t.id} - {t.title.slice(0, 48)}... ({t.Assigne_a})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">
                  Required Action for Incoming Shift Lead
                </label>
                <textarea
                  value={handoverRequiredAction}
                  onChange={(e) => setHandoverRequiredAction(e.target.value)}
                  rows={3}
                  placeholder="Specify immediate instructions (e.g. Call field crew at 16:00, monitor RSL levels, follow up on spare parts)..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddIncidentModalOpen(false)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded cursor-pointer"
                >
                  Transfer to Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Handover Audit Ledger Modal */}
      {isAuditLedgerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileSearch className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{t('shiftlog_audit_ledger_title')}</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {filteredShiftLogs.length} {t('shiftlog_filter_results_count')}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {t('shiftlog_search_sub')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuditLedgerOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Close Audit Ledger"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Audit Summary Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-950/40 border-b border-neutral-800 text-xs">
              <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                  Handovers Audited
                </span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  {filteredShiftLogs.length}
                </span>
              </div>

              <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                  Sign-Off Compliance
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">
                  {Math.round(
                    (filteredShiftLogs.filter((s) => s.incomingSignOff?.acknowledged).length /
                      (filteredShiftLogs.length || 1)) *
                      100
                  )}%
                </span>
              </div>

              <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                  Transferred Criticals
                </span>
                <span className="text-lg font-bold text-red-400 font-mono mt-0.5 block">
                  {filteredShiftLogs.reduce((acc, s) => acc + s.criticalIncidents.length, 0)}
                </span>
              </div>

              <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">
                  Active Filter Scope
                </span>
                <span className="text-xs font-semibold text-neutral-300 mt-1 block truncate">
                  {filterOperator !== 'ALL' ? filterOperator : 'All Operators'}
                  {filterStartDate ? ` · From ${filterStartDate}` : ''}
                </span>
              </div>
            </div>

            {/* Audit Table */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-neutral-800">
              <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-900/90 text-neutral-400 font-semibold border-b border-neutral-800">
                    <tr>
                      <th className="px-3 py-2.5">{t('shiftlog_audit_col_date')}</th>
                      <th className="px-3 py-2.5">{t('shiftlog_audit_col_supervisors')}</th>
                      <th className="px-3 py-2.5">{t('shiftlog_audit_col_operators')}</th>
                      <th className="px-3 py-2.5">{t('shiftlog_audit_col_status')}</th>
                      <th className="px-3 py-2.5">{t('shiftlog_audit_col_incidents')}</th>
                      <th className="px-3 py-2.5">{t('shiftlog_audit_col_signoff')}</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {filteredShiftLogs.map((log) => {
                      const isCurrent = log.id === selectedShiftId;
                      const hasCritical = log.criticalIncidents.length > 0;
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-neutral-900/60 transition-colors ${
                            isCurrent ? 'bg-red-950/20' : ''
                          }`}
                        >
                          {/* Date & Shift */}
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                              <span className="font-mono text-white">{log.date}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                  log.shiftType === 'Morning'
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                    : log.shiftType === 'Evening'
                                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                    : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                                }`}
                              >
                                {log.shiftType}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                {log.shiftHours}
                              </span>
                            </div>
                          </td>

                          {/* Supervisors */}
                          <td className="px-3 py-2.5">
                            <div className="text-white font-medium text-[11px]">
                              <span className="text-neutral-500">Out: </span>
                              {log.outgoingSupervisor}
                            </div>
                            <div className="text-neutral-300 text-[11px] mt-0.5">
                              <span className="text-neutral-500">In: </span>
                              {log.incomingSupervisor}
                            </div>
                          </td>

                          {/* On-Duty Operators */}
                          <td className="px-3 py-2.5 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {log.operatorsOnDuty.map((op, idx) => {
                                const isTargetOp =
                                  filterOperator !== 'ALL' &&
                                  op.toLowerCase().includes(filterOperator.toLowerCase());
                                return (
                                  <span
                                    key={idx}
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                                      isTargetOp
                                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 font-bold'
                                        : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                                    }`}
                                  >
                                    {op.split('(')[0].trim()}
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* Handover Status */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium ${
                                log.status === 'HANDOVER_COMPLETED'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                  : log.status === 'HANDOVER_PENDING'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                  : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                              }`}
                            >
                              {log.status === 'HANDOVER_COMPLETED' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Completed</span>
                                </>
                              ) : log.status === 'HANDOVER_PENDING' ? (
                                <>
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Pending</span>
                                </>
                              ) : (
                                <>
                                  <Activity className="w-3 h-3 text-blue-400" />
                                  <span>Active</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Incidents Transferred */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {hasCritical ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-800/60">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span>{log.criticalIncidents.length} dossiers</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-neutral-500">0 critical</span>
                            )}
                          </td>

                          {/* Sign-Off Status */}
                          <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1 text-neutral-300">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  log.outgoingSignOff?.signed ? 'bg-emerald-500' : 'bg-neutral-600'
                                }`}
                              />
                              <span>
                                {log.outgoingSignOff?.signed ? `Signed: ${log.outgoingSignOff.signedAt}` : 'Unsigned'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-neutral-400 mt-0.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  log.incomingSignOff?.acknowledged ? 'bg-emerald-500' : 'bg-neutral-600'
                                }`}
                              />
                              <span>
                                {log.incomingSignOff?.acknowledged ? `Ack: ${log.incomingSignOff.acknowledgedAt}` : 'Pending Ack'}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedShiftId(log.id);
                                  setIsAuditLedgerOpen(false);
                                  onToast(`Shift ${log.id} (${log.date}) loaded into handover inspector.`);
                                }}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                                  isCurrent
                                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                    : 'bg-red-600 hover:bg-red-500 text-white'
                                }`}
                              >
                                {isCurrent ? 'Active View' : t('shiftlog_audit_action_load')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportShiftReport(log)}
                                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Download text report for this shift"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs">
              <span className="text-neutral-500">
                Audited archive data adheres to ISO 27001 NOC handover traceability standards.
              </span>
              <button
                type="button"
                onClick={() => setIsAuditLedgerOpen(false)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Audit Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
