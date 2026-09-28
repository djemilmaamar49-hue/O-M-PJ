import React, { useState, useMemo } from 'react';
import {
  Ticket,
  Priority,
  Etat,
  CatAlarme,
  Assignee,
  PbmType,
  TicketType,
} from '../types/telecom';
import { OPTIONS, TEAM_LABELS } from '../data/telecomConstants';
import { exportTicketsToCSV } from '../utils/csvExporter';
import { useLanguage } from '../context/LanguageContext';
import {
  correlateTickets,
  GroupedIncident,
  DisplayTicketItem,
} from '../utils/ticketAlarmCorrelator';
import {
  Search,
  Download,
  Eye,
  Edit2,
  Trash2,
  Wrench,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Building,
  User,
  Radio,
  Layers,
  ChevronDown,
  ChevronRight,
  Zap,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Minimize2,
  Maximize2,
  CornerDownRight,
  SlidersHorizontal,
  Filter,
  Activity,
  Cpu,
  RotateCcw,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onEditTicket: (ticket: Ticket) => void;
  onDeleteTicket: (ticketId: string) => void;
  onCreateMaintenanceFromTicket: (ticket: Ticket) => void;
  initialTypeFilter?: TicketType | 'ALL';
  priorityFilter?: Priority | '';
  onClearExternalPriority?: () => void;
  onSimulateAlarmStorm?: () => void;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onSelectTicket,
  onEditTicket,
  onDeleteTicket,
  onCreateMaintenanceFromTicket,
  initialTypeFilter = 'ALL',
  priorityFilter = '',
  onClearExternalPriority,
  onSimulateAlarmStorm,
}) => {
  const { t, isRTL } = useLanguage();

  // Local filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'ALL'>(initialTypeFilter);
  const [statusFilter, setStatusFilter] = useState<Etat | ''>('');
  const [localPriorityFilter, setLocalPriorityFilter] = useState<Priority | ''>(priorityFilter);
  const [categoryFilter, setCategoryFilter] = useState<CatAlarme | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState<Assignee | ''>('');
  const [problemTypeFilter, setProblemTypeFilter] = useState<PbmType | ''>('');
  const [sortField, setSortField] = useState<'id' | 'createdAt' | 'Priorite' | 'Etat'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick Filter Multi-Select State
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Priority>>(
    () => (priorityFilter ? new Set<Priority>([priorityFilter]) : new Set<Priority>())
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<CatAlarme>>(new Set());

  // Auto-Group State
  const [isAutoGroupEnabled, setIsAutoGroupEnabled] = useState(true);
  const [correlationWindowMinutes, setCorrelationWindowMinutes] = useState(5);
  const [expandedIncidentIds, setExpandedIncidentIds] = useState<Set<string>>(new Set());

  // Keep synced if parent changes priorityFilter
  React.useEffect(() => {
    if (priorityFilter) {
      setSelectedSeverities(new Set([priorityFilter]));
      setLocalPriorityFilter(priorityFilter);
    }
  }, [priorityFilter]);

  // Keep synced if parent changes initialTypeFilter
  React.useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  const activePriority = localPriorityFilter || priorityFilter;

  // Base tickets for the active type to calculate stream metrics
  const streamBaseTickets = useMemo(() => {
    return tickets.filter((t) => typeFilter === 'ALL' || t.type === typeFilter);
  }, [tickets, typeFilter]);

  // Live count of alarms by severity in the stream
  const severityCounts = useMemo(() => {
    const counts: Record<Priority, number> = { Critical: 0, Major: 0, Minor: 0 };
    for (const t of streamBaseTickets) {
      if (counts[t.Priorite] !== undefined) counts[t.Priorite]++;
    }
    return counts;
  }, [streamBaseTickets]);

  // Live count of alarms by category in the stream
  const categoryCounts = useMemo(() => {
    const counts: Record<CatAlarme, number> = { COMM: 0, ENV: 0, EQU: 0, QLT: 0, QLTY: 0 };
    for (const t of streamBaseTickets) {
      if (counts[t.Cat_alarme] !== undefined) counts[t.Cat_alarme]++;
    }
    return counts;
  }, [streamBaseTickets]);

  // Quick Filter Toggle Handlers
  const toggleSeverity = (p: Priority) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        next.delete(p);
      } else {
        next.add(p);
      }
      if (next.size === 1) {
        setLocalPriorityFilter(Array.from(next)[0]);
      } else {
        setLocalPriorityFilter('');
        if (next.size === 0) onClearExternalPriority?.();
      }
      return next;
    });
  };

  const toggleCategory = (cat: CatAlarme) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      if (next.size === 1) {
        setCategoryFilter(Array.from(next)[0]);
      } else {
        setCategoryFilter('');
      }
      return next;
    });
  };

  const selectAllSeverities = () => {
    if (selectedSeverities.size === OPTIONS.Priorite.length) {
      setSelectedSeverities(new Set());
      setLocalPriorityFilter('');
      onClearExternalPriority?.();
    } else {
      setSelectedSeverities(new Set(OPTIONS.Priorite));
      setLocalPriorityFilter('');
    }
  };

  const selectAllCategories = () => {
    if (selectedCategories.size === OPTIONS.Cat_alarme.length) {
      setSelectedCategories(new Set());
      setCategoryFilter('');
    } else {
      setSelectedCategories(new Set(OPTIONS.Cat_alarme));
      setCategoryFilter('');
    }
  };

  const applyPreset = (preset: 'CRITICAL_OUTAGES' | 'POWER_ENV' | 'TRANS_COMM' | 'RADIO_QOS' | 'CLEAR') => {
    if (preset === 'CRITICAL_OUTAGES') {
      setSelectedSeverities(new Set(['Critical']));
      setSelectedCategories(new Set(['COMM', 'ENV']));
      setLocalPriorityFilter('Critical');
      setCategoryFilter('');
    } else if (preset === 'POWER_ENV') {
      setSelectedSeverities(new Set(['Critical', 'Major']));
      setSelectedCategories(new Set(['ENV']));
      setLocalPriorityFilter('');
      setCategoryFilter('ENV');
    } else if (preset === 'TRANS_COMM') {
      setSelectedSeverities(new Set(['Critical', 'Major']));
      setSelectedCategories(new Set(['COMM']));
      setLocalPriorityFilter('');
      setCategoryFilter('COMM');
    } else if (preset === 'RADIO_QOS') {
      setSelectedSeverities(new Set());
      setSelectedCategories(new Set(['QLT', 'QLTY']));
      setLocalPriorityFilter('');
      setCategoryFilter('');
    } else if (preset === 'CLEAR') {
      setSelectedSeverities(new Set());
      setSelectedCategories(new Set());
      setLocalPriorityFilter('');
      setCategoryFilter('');
      onClearExternalPriority?.();
    }
  };

  // 1. Raw Filter calculation
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Type filter
      if (typeFilter !== 'ALL' && ticket.type !== typeFilter) return false;

      // Status filter
      if (statusFilter && ticket.Etat !== statusFilter) return false;

      // Priority filter: Multi-select if specified, otherwise single activePriority
      if (selectedSeverities.size > 0) {
        if (!selectedSeverities.has(ticket.Priorite)) return false;
      } else if (activePriority && ticket.Priorite !== activePriority) {
        return false;
      }

      // Category filter: Multi-select if specified, otherwise single categoryFilter
      if (selectedCategories.size > 0) {
        if (!selectedCategories.has(ticket.Cat_alarme)) return false;
      } else if (categoryFilter && ticket.Cat_alarme !== categoryFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter && ticket.Assigne_a !== assigneeFilter) return false;

      // Problem type filter
      if (problemTypeFilter && ticket.Pbm_type !== problemTypeFilter) return false;

      // Search query (Ticket ID, Title, Site ID, Site Name, Wilaya, Alarm, MSISDN, Customer name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = ticket.id.toLowerCase().includes(q);
        const matchesTitle = ticket.title.toLowerCase().includes(q);
        const matchesSite =
          ticket.siteId?.toLowerCase().includes(q) || ticket.siteName?.toLowerCase().includes(q);
        const matchesWilaya = ticket.wilaya?.toLowerCase().includes(q);
        const matchesAlarm = ticket.Alarme.toLowerCase().includes(q);
        const matchesCustomer =
          ticket.customer?.msisdn.toLowerCase().includes(q) ||
          ticket.customer?.subscriberName.toLowerCase().includes(q);

        if (
          !matchesId &&
          !matchesTitle &&
          !matchesSite &&
          !matchesWilaya &&
          !matchesAlarm &&
          !matchesCustomer
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    tickets,
    typeFilter,
    statusFilter,
    activePriority,
    selectedSeverities,
    categoryFilter,
    selectedCategories,
    assigneeFilter,
    problemTypeFilter,
    searchQuery,
  ]);

  // 2. Correlation and Auto-Grouping Calculation
  const { displayItems, correlationStats } = useMemo(() => {
    if (!isAutoGroupEnabled) {
      // Standard non-grouped view
      const sorted = [...filteredTickets].sort((a, b) => {
        if (sortField === 'id') {
          return sortOrder === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
        }
        if (sortField === 'Priorite') {
          const weights: Record<Priority, number> = { Critical: 3, Major: 2, Minor: 1 };
          const diff = weights[a.Priorite] - weights[b.Priorite];
          return sortOrder === 'asc' ? diff : -diff;
        }
        if (sortField === 'Etat') {
          return sortOrder === 'asc' ? a.Etat.localeCompare(b.Etat) : b.Etat.localeCompare(a.Etat);
        }
        return sortOrder === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const items: DisplayTicketItem[] = sorted.map((t) => ({
        id: t.id,
        isIncident: false,
        ticket: t,
      }));

      return {
        displayItems: items,
        correlationStats: {
          rawAlarmCount: filteredTickets.length,
          incidentCount: 0,
          standaloneCount: filteredTickets.length,
          totalDisplayed: filteredTickets.length,
          noiseReductionPercent: 0,
          correlatedAlarmsCount: 0,
        },
      };
    }

    // Auto-Group enabled: Correlate alarms within window
    const result = correlateTickets(filteredTickets, correlationWindowMinutes);

    // Apply sorting to the correlated display items
    result.items.sort((a, b) => {
      const getPrio = (item: DisplayTicketItem): Priority =>
        item.isIncident ? item.highestPriority : item.ticket.Priorite;
      const getStatus = (item: DisplayTicketItem): Etat =>
        item.isIncident ? item.status : item.ticket.Etat;
      const getTime = (item: DisplayTicketItem): number =>
        new Date(item.isIncident ? item.createdAt : item.ticket.createdAt).getTime();
      const getId = (item: DisplayTicketItem): string => item.id;

      if (sortField === 'id') {
        return sortOrder === 'asc' ? getId(a).localeCompare(getId(b)) : getId(b).localeCompare(getId(a));
      }
      if (sortField === 'Priorite') {
        const weights: Record<Priority, number> = { Critical: 3, Major: 2, Minor: 1 };
        const diff = weights[getPrio(a)] - weights[getPrio(b)];
        return sortOrder === 'asc' ? diff : -diff;
      }
      if (sortField === 'Etat') {
        return sortOrder === 'asc'
          ? getStatus(a).localeCompare(getStatus(b))
          : getStatus(b).localeCompare(getStatus(a));
      }
      return sortOrder === 'asc' ? getTime(a) - getTime(b) : getTime(b) - getTime(a);
    });

    return {
      displayItems: result.items,
      correlationStats: result.stats,
    };
  }, [filteredTickets, isAutoGroupEnabled, correlationWindowMinutes, sortField, sortOrder]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setStatusFilter('');
    setLocalPriorityFilter('');
    setCategoryFilter('');
    setAssigneeFilter('');
    setProblemTypeFilter('');
    setSelectedSeverities(new Set());
    setSelectedCategories(new Set());
    onClearExternalPriority?.();
  };

  const handleExportCSV = () => {
    const scopeLabel = typeFilter !== 'ALL' ? `Djezzy_${typeFilter}` : 'Djezzy_Tickets';
    exportTicketsToCSV(filteredTickets, scopeLabel);
  };

  const toggleSort = (field: 'id' | 'createdAt' | 'Priorite' | 'Etat') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleIncidentExpansion = (incidentId: string) => {
    setExpandedIncidentIds((prev) => {
      const next = new Set(prev);
      if (next.has(incidentId)) {
        next.delete(incidentId);
      } else {
        next.add(incidentId);
      }
      return next;
    });
  };

  const toggleExpandAllIncidents = () => {
    const allIncidentIds = displayItems.filter((i) => i.isIncident).map((i) => i.id);
    if (expandedIncidentIds.size >= allIncidentIds.length) {
      setExpandedIncidentIds(new Set());
    } else {
      setExpandedIncidentIds(new Set(allIncidentIds));
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
        {/* Row 1: Search & Type Segmented Tabs & Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Segmented Type Controller */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs overflow-x-auto">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('all_incidents')} ({tickets.length})
            </button>
            <button
              onClick={() => setTypeFilter('NETWORK_ALARM')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'NETWORK_ALARM'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-red-500" />
              {t('network_alarms')}
            </button>
            <button
              onClick={() => setTypeFilter('CUSTOMER_SUPPORT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'CUSTOMER_SUPPORT'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              {t('customer_requests')}
            </button>
            <button
              onClick={() => setTypeFilter('HARDWARE_MAINTENANCE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === 'HARDWARE_MAINTENANCE'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              {t('hardware_interventions')}
            </button>
          </div>

          {/* Search Bar, Simulate Storm, & Export */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-neutral-500 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Simulate Burst Alarm Storm button */}
            {onSimulateAlarmStorm && (
              <button
                onClick={onSimulateAlarmStorm}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                title="Simulate 3 incoming alarms from the same site in a 2-minute window to test correlation"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="hidden md:inline">{t('simulate_storm')}</span>
                <span className="md:hidden">Storm</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              title={t('export_csv')}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('export_csv')}</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Toolbar (Multi-Select Category & Severity) */}
        <div className="bg-neutral-950/85 border border-neutral-800/90 rounded-lg p-3.5 space-y-3 shadow-inner">
          {/* Top Bar: Title, Subtitle, Active Filter Indicator & Stream Presets */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800/80">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-1.5 rounded-md bg-red-950/60 border border-red-500/40 text-red-400 shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    {t('quick_filter_title')}
                  </span>
                  {/* Live Stream Status Badge */}
                  {selectedSeverities.size > 0 || selectedCategories.size > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/90 border border-red-500/50 text-red-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span>{t('quick_filter_stream_status')} {filteredTickets.length} / {streamBaseTickets.length}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-800/80 text-neutral-400 border border-neutral-700/60">
                      <span>{t('preset_clear_all')} ({streamBaseTickets.length})</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 hidden sm:block mt-0.5">
                  {t('quick_filter_sub')}
                </p>
              </div>
            </div>

            {/* NOC Stream Presets Bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider hidden sm:inline">
                {t('quick_filter_presets')}
              </span>
              <button
                type="button"
                onClick={() => applyPreset('CRITICAL_OUTAGES')}
                className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-red-300 border border-red-500/30 hover:border-red-500/60 transition-colors cursor-pointer flex items-center gap-1"
                title="Critical Priority + COMM and ENV categories"
              >
                <span>🚨</span>
                <span>{t('preset_critical_outages')}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('POWER_ENV')}
                className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 transition-colors cursor-pointer flex items-center gap-1"
                title="Rectifier, Battery, Generator GE, HVAC"
              >
                <span>⚡</span>
                <span>{t('preset_power_env')}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('TRANS_COMM')}
                className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 transition-colors cursor-pointer flex items-center gap-1"
                title="SDH Backbone & Microwave Transmission Links"
              >
                <span>📡</span>
                <span>{t('preset_trans_links')}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('RADIO_QOS')}
                className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-purple-300 border border-purple-500/30 hover:border-purple-500/60 transition-colors cursor-pointer flex items-center gap-1"
                title="3G/4G QoS Degradations and Call Drops"
              >
                <span>📶</span>
                <span>{t('preset_radio_qos')}</span>
              </button>
              {(selectedSeverities.size > 0 || selectedCategories.size > 0) && (
                <button
                  type="button"
                  onClick={() => applyPreset('CLEAR')}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 transition-colors cursor-pointer flex items-center gap-1"
                  title="Clear Quick Filter toggles"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-400" />
                  <span>{t('preset_clear_all')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Multi-Select Toggles Area */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
            {/* Severities Toggles (Multi-Select) */}
            <div className="xl:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5">
                <span className="font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  {t('quick_filter_severities')}
                </span>
                <button
                  type="button"
                  onClick={selectAllSeverities}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-[10px]"
                >
                  {selectedSeverities.size === OPTIONS.Priorite.length
                    ? t('clear_filters')
                    : t('quick_filter_select_all')}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {/* Critical */}
                <button
                  type="button"
                  onClick={() => toggleSeverity('Critical')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedSeverities.has('Critical')
                      ? 'bg-red-500/20 border-red-500 text-red-200 shadow-sm shadow-red-950/50 ring-1 ring-red-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full ${
                      selectedSeverities.has('Critical') ? 'bg-red-500 animate-pulse' : 'bg-red-500/70'
                    }`} />
                    <span>{t('priority_critical')}</span>
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    selectedSeverities.has('Critical')
                      ? 'bg-red-500/30 text-red-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {severityCounts.Critical}
                  </span>
                </button>

                {/* Major */}
                <button
                  type="button"
                  onClick={() => toggleSeverity('Major')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedSeverities.has('Major')
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm shadow-amber-950/50 ring-1 ring-amber-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{t('priority_major')}</span>
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    selectedSeverities.has('Major')
                      ? 'bg-amber-500/30 text-amber-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {severityCounts.Major}
                  </span>
                </button>

                {/* Minor */}
                <button
                  type="button"
                  onClick={() => toggleSeverity('Minor')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedSeverities.has('Minor')
                      ? 'bg-blue-500/20 border-blue-500 text-blue-200 shadow-sm shadow-blue-950/50 ring-1 ring-blue-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>{t('priority_minor')}</span>
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    selectedSeverities.has('Minor')
                      ? 'bg-blue-500/30 text-blue-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {severityCounts.Minor}
                  </span>
                </button>
              </div>
            </div>

            {/* Categories Toggles (Multi-Select) */}
            <div className="xl:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5">
                <span className="font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-cyan-400" />
                  {t('quick_filter_categories')}
                </span>
                <button
                  type="button"
                  onClick={selectAllCategories}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-[10px]"
                >
                  {selectedCategories.size === OPTIONS.Cat_alarme.length
                    ? t('clear_filters')
                    : t('quick_filter_select_all')}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {/* QLT */}
                <button
                  type="button"
                  onClick={() => toggleCategory('QLT')}
                  title={t('cat_qlt_desc')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategories.has('QLT')
                      ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-sm shadow-purple-950/50 ring-1 ring-purple-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Activity className={`w-3.5 h-3.5 shrink-0 ${
                      selectedCategories.has('QLT') ? 'text-purple-400' : 'text-neutral-500'
                    }`} />
                    <div className="text-left truncate">
                      <span className="font-bold">QLT</span>
                      <span className="hidden lg:inline text-[9px] text-neutral-400 ml-1">QoS</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                    selectedCategories.has('QLT')
                      ? 'bg-purple-500/30 text-purple-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {categoryCounts.QLT}
                  </span>
                </button>

                {/* COMM */}
                <button
                  type="button"
                  onClick={() => toggleCategory('COMM')}
                  title={t('cat_comm_desc')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategories.has('COMM')
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-sm shadow-cyan-950/50 ring-1 ring-cyan-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Radio className={`w-3.5 h-3.5 shrink-0 ${
                      selectedCategories.has('COMM') ? 'text-cyan-400' : 'text-neutral-500'
                    }`} />
                    <div className="text-left truncate">
                      <span className="font-bold">COMM</span>
                      <span className="hidden lg:inline text-[9px] text-neutral-400 ml-1">Trans</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                    selectedCategories.has('COMM')
                      ? 'bg-cyan-500/30 text-cyan-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {categoryCounts.COMM}
                  </span>
                </button>

                {/* ENV */}
                <button
                  type="button"
                  onClick={() => toggleCategory('ENV')}
                  title={t('cat_env_desc')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategories.has('ENV')
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-sm shadow-emerald-950/50 ring-1 ring-emerald-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Zap className={`w-3.5 h-3.5 shrink-0 ${
                      selectedCategories.has('ENV') ? 'text-emerald-400' : 'text-neutral-500'
                    }`} />
                    <div className="text-left truncate">
                      <span className="font-bold">ENV</span>
                      <span className="hidden lg:inline text-[9px] text-neutral-400 ml-1">Power</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                    selectedCategories.has('ENV')
                      ? 'bg-emerald-500/30 text-emerald-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {categoryCounts.ENV}
                  </span>
                </button>

                {/* EQU */}
                <button
                  type="button"
                  onClick={() => toggleCategory('EQU')}
                  title={t('cat_equ_desc')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategories.has('EQU')
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-sm shadow-rose-950/50 ring-1 ring-rose-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Cpu className={`w-3.5 h-3.5 shrink-0 ${
                      selectedCategories.has('EQU') ? 'text-rose-400' : 'text-neutral-500'
                    }`} />
                    <div className="text-left truncate">
                      <span className="font-bold">EQU</span>
                      <span className="hidden lg:inline text-[9px] text-neutral-400 ml-1">Hardw</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                    selectedCategories.has('EQU')
                      ? 'bg-rose-500/30 text-rose-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {categoryCounts.EQU}
                  </span>
                </button>

                {/* QLTY */}
                <button
                  type="button"
                  onClick={() => toggleCategory('QLTY')}
                  title={t('cat_qlty_desc')}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategories.has('QLTY')
                      ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-200 shadow-sm shadow-fuchsia-950/50 ring-1 ring-fuchsia-500/40'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Layers className={`w-3.5 h-3.5 shrink-0 ${
                      selectedCategories.has('QLTY') ? 'text-fuchsia-400' : 'text-neutral-500'
                    }`} />
                    <div className="text-left truncate">
                      <span className="font-bold">QLTY</span>
                      <span className="hidden lg:inline text-[9px] text-neutral-400 ml-1">Chan</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                    selectedCategories.has('QLTY')
                      ? 'bg-fuchsia-500/30 text-fuchsia-100'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {categoryCounts.QLTY}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Toggles Chips Strip */}
          {(selectedSeverities.size > 0 || selectedCategories.size > 0) && (
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60 flex-wrap text-xs">
              <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {t('quick_filter_active_label')} ({selectedSeverities.size + selectedCategories.size}):
              </span>

              {/* Severity chips */}
              {Array.from(selectedSeverities).map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => toggleSeverity(prio)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 cursor-pointer"
                  title="Click to remove"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    prio === 'Critical' ? 'bg-red-400' : prio === 'Major' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <span>{prio}</span>
                  <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                </button>
              ))}

              {/* Category chips */}
              {Array.from(selectedCategories).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-cyan-200 border border-neutral-700 cursor-pointer"
                  title="Click to remove"
                >
                  <span>{cat}</span>
                  <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => applyPreset('CLEAR')}
                className="text-[11px] text-red-400 hover:text-red-300 underline font-medium cursor-pointer ml-auto"
              >
                {t('quick_filter_clear_btn')}
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Secondary Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-neutral-800/80">
          {/* Status filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">{t('status_filter')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Etat | '')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
            >
              <option value="">{t('all_statuses')}</option>
              {OPTIONS.Etat.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              {t('priority_filter')}
            </label>
            <select
              value={activePriority}
              onChange={(e) => {
                const val = e.target.value as Priority | '';
                setLocalPriorityFilter(val);
                setSelectedSeverities(val ? new Set([val]) : new Set());
                if (!val) onClearExternalPriority?.();
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
            >
              <option value="">{t('all_priorities')}</option>
              {OPTIONS.Priorite.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              {t('category_filter')}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                const val = e.target.value as CatAlarme | '';
                setCategoryFilter(val);
                setSelectedCategories(val ? new Set([val]) : new Set());
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
            >
              <option value="">{t('all_categories')}</option>
              {OPTIONS.Cat_alarme.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee Team filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              {t('team_filter')}
            </label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value as Assignee | '')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
            >
              <option value="">{t('all_teams')}</option>
              {OPTIONS.Assigne_a.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Problem Type filter */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              {t('problem_type_filter')}
            </label>
            <select
              value={problemTypeFilter}
              onChange={(e) => setProblemTypeFilter(e.target.value as PbmType | '')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-red-500"
            >
              <option value="">{t('all_problem_types')}</option>
              {OPTIONS.Pbm_type.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded py-1 px-2 text-xs font-medium transition-colors cursor-pointer"
            >
              {t('clear_filters')}
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Auto-Group NOC Alarm Correlation Control Bar */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-lg p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Toggle Button */}
          <button
            onClick={() => setIsAutoGroupEnabled(!isAutoGroupEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isAutoGroupEnabled
                ? 'bg-red-950/40 border-red-500/50 text-red-200 shadow-sm shadow-red-950/30'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className={`w-4 h-4 ${isAutoGroupEnabled ? 'text-red-400' : 'text-neutral-400'}`} />
            <span>{t('autogroup_toggle')}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isAutoGroupEnabled ? 'bg-red-500 animate-pulse' : 'bg-neutral-600'
              }`}
            />
          </button>

          {/* Correlation Statistics & Noise Reduction KPI */}
          {isAutoGroupEnabled && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-mono">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>-{correlationStats.noiseReductionPercent}% {t('noise_reduction')}</span>
              </span>

              <span className="text-xs text-neutral-400 hidden sm:inline">
                <span className="font-mono text-neutral-200 font-bold">{correlationStats.rawAlarmCount}</span> {t('raw_alarms')}{' '}
                {t('grouped_into')}{' '}
                <span className="font-mono text-white font-bold">{correlationStats.totalDisplayed}</span> queue records (
                <span className="font-mono text-red-400 font-semibold">{correlationStats.incidentCount}</span> {t('incidents_count')})
              </span>
            </div>
          )}
        </div>

        {/* Right side controls: Window duration selector & Expand/Collapse All */}
        {isAutoGroupEnabled && (
          <div className="flex items-center gap-2.5 self-end md:self-auto text-xs">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Window:</span>
              <select
                value={correlationWindowMinutes}
                onChange={(e) => setCorrelationWindowMinutes(Number(e.target.value))}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-red-500"
              >
                <option value={3}>3 min</option>
                <option value={5}>5 min (Standard NOC)</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
              </select>
            </div>

            {correlationStats.incidentCount > 0 && (
              <button
                onClick={toggleExpandAllIncidents}
                className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors cursor-pointer text-xs"
              >
                {expandedIncidentIds.size >= correlationStats.incidentCount ? (
                  <>
                    <Minimize2 className="w-3 h-3 text-neutral-400" />
                    <span>Collapse All</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 text-neutral-400" />
                    <span>Expand All</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main High-Density Data Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/60 text-neutral-400 font-semibold select-none">
                <th
                  onClick={() => toggleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('col_id')}</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('Priorite')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('col_priority')}</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                  </div>
                </th>
                <th className="py-3 px-3">{t('col_cat_alarm')}</th>
                <th className="py-3 px-3">{t('col_site_customer')}</th>
                <th className="py-3 px-3">{t('col_team')}</th>
                <th className="py-3 px-3">{t('col_problem')}</th>
                <th
                  onClick={() => toggleSort('Etat')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('col_status')}</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('createdAt')}
                  className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('col_created_sla')}</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-normal">
              {displayItems.length > 0 ? (
                displayItems.map((item) => {
                  if (item.isIncident) {
                    const incident = item as GroupedIncident;
                    const isExpanded = expandedIncidentIds.has(incident.id);
                    const isClosed = incident.status === 'CLOSE' || incident.status === 'RESOLVED';

                    return (
                      <React.Fragment key={incident.id}>
                        {/* Parent Grouped Incident Row */}
                        <tr
                          onClick={() => toggleIncidentExpansion(incident.id)}
                          className={`transition-colors cursor-pointer border-l-4 ${
                            incident.highestPriority === 'Critical'
                              ? 'border-l-red-500 bg-red-950/20 hover:bg-red-950/30'
                              : 'border-l-amber-500 bg-amber-950/15 hover:bg-amber-950/25'
                          }`}
                        >
                          {/* Incident Ref & Badge */}
                          <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-white">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleIncidentExpansion(incident.id);
                                }}
                                className="p-0.5 text-neutral-400 hover:text-white rounded cursor-pointer transition-transform"
                                title={isExpanded ? t('hide_child_alarms') : t('view_child_alarms')}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                                )}
                              </button>
                              <div className="flex flex-col">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                                  <span>{incident.id}</span>
                                </span>
                                <span className="text-[10px] text-amber-400 font-sans font-semibold flex items-center gap-1 mt-0.5">
                                  <Layers className="w-3 h-3" />
                                  <span>{incident.ticketCount} {t('alarms_correlated')}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Highest Priority in Incident */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  incident.highestPriority === 'Critical'
                                    ? 'bg-red-500 animate-ping'
                                    : 'bg-amber-500 animate-pulse'
                                }`}
                              />
                              <span
                                className={`font-semibold ${
                                  incident.highestPriority === 'Critical'
                                    ? 'text-red-400'
                                    : 'text-amber-300'
                                }`}
                              >
                                {incident.highestPriority === 'Critical'
                                  ? t('prio_critical')
                                  : t('prio_major')}
                              </span>
                            </div>
                          </td>

                          {/* Category & Alarms Summary */}
                          <td className="py-3 px-3 max-w-[240px]">
                            <div className="font-semibold text-neutral-100 truncate" title={incident.summaryTitle}>
                              {incident.summaryTitle}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate mt-0.5">
                              {incident.categories.map((c) => (
                                <span
                                  key={c}
                                  className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700 font-mono"
                                >
                                  {c}
                                </span>
                              ))}
                              <span className="truncate">· {incident.primaryAlarm}</span>
                            </div>
                          </td>

                          {/* Site & Cluster */}
                          <td className="py-3 px-3 max-w-[220px]">
                            <div className="flex items-center gap-1.5 text-white font-medium truncate">
                              <Building className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="font-mono text-[11px] font-bold text-amber-300">
                                {incident.siteId}
                              </span>
                              <span className="text-neutral-400">·</span>
                              <span className="truncate">{incident.siteName}</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate mt-0.5 font-sans">
                              {incident.cluster}
                            </div>
                          </td>

                          {/* Team Assigned */}
                          <td className="py-3 px-3 whitespace-nowrap text-neutral-200">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 border border-neutral-700 text-amber-200 font-medium">
                              {incident.assignedTeam}
                            </span>
                          </td>

                          {/* Problem Type: Multi-Alarm Cascade */}
                          <td className="py-3 px-3 whitespace-nowrap text-neutral-300">
                            <span className="inline-flex items-center gap-1 font-semibold text-neutral-200">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>Multi-Alarm Cascade</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                                incident.status === 'OPEN'
                                  ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                                  : incident.status === 'IN_PROGRESS'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                  : incident.status === 'PENDING_PARTS'
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              }`}
                            >
                              {incident.status}
                            </span>
                          </td>

                          {/* Created / Window Duration */}
                          <td className="py-3 px-3 whitespace-nowrap text-neutral-400 font-mono tabular-nums text-[11px]">
                            <div>{incident.createdAt.slice(11, 16)} UTC</div>
                            <div className="text-[10px] text-amber-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{Math.round(incident.windowDurationSeconds / 60) || 1}m window</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td
                            className="py-3 px-4 whitespace-nowrap text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleIncidentExpansion(incident.id)}
                                title={isExpanded ? t('hide_child_alarms') : t('view_child_alarms')}
                                className="px-2 py-1 rounded text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide' : `View (${incident.ticketCount})`}</span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => onSelectTicket(incident.tickets[0])}
                                title="Inspect Root Ticket in Drawer"
                                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {incident.tickets[0] && (
                                <button
                                  onClick={() => onCreateMaintenanceFromTicket(incident.tickets[0])}
                                  title="Dispatch Maintenance Order for Incident"
                                  className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Accordion: Child Alarms Sub-table */}
                        {isExpanded && (
                          <tr className="bg-neutral-950/80 border-b border-neutral-800">
                            <td colSpan={9} className="p-4 pl-8">
                              <div className="bg-neutral-900 border border-neutral-800/80 rounded-lg p-3.5 space-y-3 shadow-inner">
                                {/* Incident Analysis Callout */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-neutral-950 rounded border border-neutral-800 text-xs">
                                  <div className="space-y-0.5">
                                    <div className="text-neutral-300 font-medium flex items-center gap-2">
                                      <span className="text-amber-400 font-bold uppercase tracking-wide text-[10px]">
                                        {t('root_cause_inferred')}
                                      </span>
                                      <span>{incident.rootCauseHypothesis}</span>
                                    </div>
                                    <div className="text-neutral-400 flex items-center gap-2 text-[11px]">
                                      <span className="text-red-400 font-bold uppercase tracking-wide text-[10px]">
                                        {t('recommended_action')}
                                      </span>
                                      <span>{incident.recommendedAction}</span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="text-[11px] font-mono text-neutral-400">
                                      Primary SLA Deadline: <span className="text-neutral-200">{incident.slaDeadline.slice(11, 16)} UTC</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Child Alarms High-Density List */}
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <CornerDownRight className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{t('child_alarms_list')} ({incident.tickets.length})</span>
                                  </div>

                                  <div className="overflow-x-auto border border-neutral-800 rounded bg-neutral-950">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="border-b border-neutral-800 text-[11px] text-neutral-500 bg-neutral-900/60 font-medium">
                                          <th className="py-2 px-3">Time Offset</th>
                                          <th className="py-2 px-3">Ticket ID</th>
                                          <th className="py-2 px-3">Priority</th>
                                          <th className="py-2 px-3">Category & Alarm</th>
                                          <th className="py-2 px-3">Problem Type</th>
                                          <th className="py-2 px-3">Assigned Team</th>
                                          <th className="py-2 px-3">Status</th>
                                          <th className="py-2 px-3 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-neutral-800/40">
                                        {incident.tickets.map((childTkt, idx) => {
                                          const t0 = new Date(incident.createdAt).getTime();
                                          const tc = new Date(childTkt.createdAt).getTime();
                                          const diffSec = Math.round((tc - t0) / 1000);
                                          const offsetStr =
                                            diffSec === 0
                                              ? 'T0 (Root)'
                                              : `+${Math.floor(diffSec / 60)}m ${diffSec % 60}s`;

                                          return (
                                            <tr
                                              key={childTkt.id}
                                              onClick={() => onSelectTicket(childTkt)}
                                              className="hover:bg-neutral-800/50 transition-colors cursor-pointer"
                                            >
                                              {/* Time offset */}
                                              <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-neutral-400">
                                                <span
                                                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                    idx === 0
                                                      ? 'bg-red-950/50 text-red-300 font-bold border border-red-800/50'
                                                      : 'bg-neutral-800 text-neutral-400'
                                                  }`}
                                                >
                                                  {offsetStr}
                                                </span>
                                              </td>

                                              {/* Ticket ID */}
                                              <td className="py-2 px-3 whitespace-nowrap font-mono font-medium text-neutral-200">
                                                {childTkt.id}
                                              </td>

                                              {/* Priority */}
                                              <td className="py-2 px-3 whitespace-nowrap">
                                                <span
                                                  className={`text-[11px] font-medium ${
                                                    childTkt.Priorite === 'Critical'
                                                      ? 'text-red-400'
                                                      : childTkt.Priorite === 'Major'
                                                      ? 'text-amber-300'
                                                      : 'text-neutral-400'
                                                  }`}
                                                >
                                                  {childTkt.Priorite}
                                                </span>
                                              </td>

                                              {/* Alarm */}
                                              <td className="py-2 px-3">
                                                <div className="font-medium text-neutral-200 truncate max-w-xs">
                                                  {childTkt.Alarme}{' '}
                                                  <span className="text-neutral-500 font-normal">
                                                    · {childTkt.title}
                                                  </span>
                                                </div>
                                              </td>

                                              {/* Problem Type */}
                                              <td className="py-2 px-3 whitespace-nowrap text-neutral-400">
                                                {childTkt.Pbm_type}
                                              </td>

                                              {/* Team */}
                                              <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-neutral-300">
                                                {childTkt.Assigne_a}
                                              </td>

                                              {/* Status */}
                                              <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] font-semibold text-neutral-300">
                                                {childTkt.Etat}
                                              </td>

                                              {/* Actions */}
                                              <td
                                                className="py-2 px-3 whitespace-nowrap text-right"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <div className="flex items-center justify-end gap-1">
                                                  <button
                                                    onClick={() => onSelectTicket(childTkt)}
                                                    title="View details"
                                                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
                                                  >
                                                    <Eye className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    onClick={() => onEditTicket(childTkt)}
                                                    title="Edit child ticket"
                                                    className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800"
                                                  >
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    onClick={() => onDeleteTicket(childTkt.id)}
                                                    title="Delete child ticket"
                                                    className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
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
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }

                  // Standalone Individual Ticket Row
                  const ticket = (item as any).ticket as Ticket;
                  const isClosed = ticket.Etat === 'CLOSE' || ticket.Etat === 'RESOLVED';

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket)}
                      className={`hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                        ticket.Priorite === 'Critical' && !isClosed ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Ticket ID */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{ticket.id}</span>
                          {ticket.linkedMaintenanceId && (
                            <span
                              title={`Linked to Maintenance Order ${ticket.linkedMaintenanceId}`}
                              className="text-amber-400"
                            >
                              <Wrench className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
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
                      </td>

                      {/* Category & Alarm */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="font-medium text-neutral-200 truncate" title={ticket.Alarme}>
                          {ticket.Alarme}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          <span>{ticket.Cat_alarme}</span>
                          <span className="mx-1" aria-hidden="true">·</span>
                          <span>{ticket.title}</span>
                        </div>
                      </td>

                      {/* Site or Customer */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {ticket.type === 'CUSTOMER_SUPPORT' && ticket.customer ? (
                          <div>
                            <div className="flex items-center gap-1 font-mono text-neutral-200 truncate">
                              <User className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="tabular-nums">{ticket.customer.msisdn}</span>
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {ticket.customer.subscriberName}
                              {ticket.wilaya && ` · ${ticket.wilaya.replace(/^\d+\s*-\s*/, '')}`}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1 text-neutral-200 truncate">
                              <Building className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="font-mono text-[11px]">{ticket.siteId || 'N/A'}</span>
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {ticket.siteName || ticket.wilaya || 'Network Core'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Team Assigned */}
                      <td className="py-3 px-3 whitespace-nowrap text-neutral-300">
                        <span className="font-mono text-[11px]">{ticket.Assigne_a}</span>
                      </td>

                      {/* Problem Type */}
                      <td className="py-3 px-3 whitespace-nowrap text-neutral-400">
                        <span>{ticket.Pbm_type}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block font-mono text-[11px] font-semibold ${
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
                      </td>

                      {/* Created / SLA */}
                      <td className="py-3 px-3 whitespace-nowrap text-neutral-400 font-mono tabular-nums text-[11px]">
                        <div>{ticket.createdAt.slice(0, 10)}</div>
                        <div className="text-[10px] text-neutral-500">
                          {ticket.createdAt.slice(11, 16)} UTC
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectTicket(ticket)}
                            title="Inspect ticket details"
                            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditTicket(ticket)}
                            title="Edit ticket"
                            className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {(ticket.Cat_alarme === 'ENV' ||
                            ticket.Cat_alarme === 'COMM' ||
                            ticket.Pbm_type === 'Pb Hard Ware' ||
                            ticket.Pbm_type === 'Autonomie' ||
                            ticket.Pbm_type === 'Energie') &&
                            !ticket.linkedMaintenanceId && (
                              <button
                                onClick={() => onCreateMaintenanceFromTicket(ticket)}
                                title={t('btn_schedule_cm')}
                                className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors cursor-pointer"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}
                          <button
                            onClick={() => onDeleteTicket(ticket.id)}
                            title="Delete ticket"
                            className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <AlertCircle className="w-8 h-8 text-neutral-600 mb-2" />
                      <p className="font-semibold text-neutral-200">{t('no_tickets_found')}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {t('no_tickets_sub')}
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors cursor-pointer"
                      >
                        {t('clear_filters')}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Data Summary */}
        <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div>
            {t('showing_records')}{' '}
            <span className="font-mono tabular-nums text-neutral-300 font-semibold">{displayItems.length}</span>{' '}
            {t('of_records')}{' '}
            <span className="font-mono tabular-nums text-neutral-300">{filteredTickets.length}</span>{' '}
            {t('total_tickets')}
            {isAutoGroupEnabled && correlationStats.incidentCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-800/40 font-mono">
                {correlationStats.incidentCount} {t('correlated_incident')} ({correlationStats.correlatedAlarmsCount} {t('alarms_correlated')})
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> {t('critical')}: 4h SLA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t('major')}: 8h SLA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> {t('minor')}: 24h SLA
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
