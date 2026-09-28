import React, { useState } from 'react';
import {
  Ticket,
  MaintenanceSchedule,
  HardwareAsset,
  SiteInfo,
  Priority,
  Etat,
  MaintenanceStatus,
  MaintenanceType,
  ShiftLog,
} from './types/telecom';
import {
  INITIAL_TICKETS,
  INITIAL_HARDWARE_ASSETS,
  INITIAL_MAINTENANCE_SCHEDULES,
  INITIAL_SITES,
} from './data/mockTelecomData';
import { INITIAL_SHIFT_LOGS } from './data/mockShiftData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { TicketList } from './components/TicketList';
import { TicketModal } from './components/TicketModal';
import { TicketDetailDrawer } from './components/TicketDetailDrawer';
import { MaintenanceScheduler } from './components/MaintenanceScheduler';
import { MaintenanceModal } from './components/MaintenanceModal';
import { SiteMatrixView } from './components/SiteMatrixView';
import { AnalyticsView } from './components/AnalyticsView';
import { TeamPerformanceView } from './components/TeamPerformanceView';
import { ShiftLogView } from './components/ShiftLogView';
import { ExportArchiveModal } from './components/ExportArchiveModal';
import { useLanguage } from './context/LanguageContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const { t, isRTL } = useLanguage();
  // Navigation State
  const [currentTab, setCurrentTab] = useState<
    'tickets' | 'customer' | 'maintenance' | 'sites' | 'performance' | 'analytics' | 'shiftlog'
  >('tickets');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data States
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [hardwareAssets, setHardwareAssets] = useState<HardwareAsset[]>(INITIAL_HARDWARE_ASSETS);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>(INITIAL_MAINTENANCE_SCHEDULES);
  const [sites, setSites] = useState<SiteInfo[]>(INITIAL_SITES);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>(INITIAL_SHIFT_LOGS);

  // Cross-component Filters
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<MaintenanceStatus | ''>('');

  // Modals & Drawers State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceInitialType, setMaintenanceInitialType] = useState<MaintenanceType>('PREVENTIVE');
  const [ticketForMaintenance, setTicketForMaintenance] = useState<Ticket | null>(null);
  const [assetForMaintenance, setAssetForMaintenance] = useState<HardwareAsset | null>(null);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  React.useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ticket Handlers
  const handleOpenNewTicket = () => {
    setEditingTicket(null);
    setIsTicketModalOpen(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleSaveTicket = (savedTicket: Ticket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === savedTicket.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTicket.id ? savedTicket : t));
      }
      return [savedTicket, ...prev];
    });

    // Also update active alarms count on site if linked
    if (savedTicket.siteId) {
      setSites((prev) =>
        prev.map((s) => {
          if (s.siteId === savedTicket.siteId) {
            const count = savedTicket.Etat !== 'CLOSE' && savedTicket.Etat !== 'RESOLVED'
              ? s.activeAlarmsCount + 1
              : Math.max(0, s.activeAlarmsCount - 1);
            return { ...s, activeAlarmsCount: count };
          }
          return s;
        })
      );
    }

    showToast(`Ticket ${savedTicket.id} successfully recorded in NOC queue.`);
  };

  const handleDeleteTicket = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null);
    }
    showToast(`Ticket ${ticketId} deleted.`);
  };

  const handleUpdateTicketStatus = (ticketId: string, newStatus: Etat, resolutionNote?: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
          const historyEntry = {
            date: nowStr,
            user: 'NOC Controller',
            action: `Status transitioned to ${newStatus}`,
            note: resolutionNote,
          };
          return {
            ...t,
            Etat: newStatus,
            resolutionNotes: resolutionNote || t.resolutionNotes,
            updatedAt: new Date().toISOString(),
            history: [...t.history, historyEntry],
          };
        }
        return t;
      })
    );
    showToast(`Ticket ${ticketId} status changed to ${newStatus}.`);
  };

  const handleAddTicketHistory = (ticketId: string, action: string, note?: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
          return {
            ...t,
            history: [
              ...t.history,
              { date: nowStr, user: 'Field / NOC Operator', action, note },
            ],
          };
        }
        return t;
      })
    );
    showToast('Activity note added to ticket history.');
  };

  // Maintenance Handlers
  const handleOpenNewCM = () => {
    setTicketForMaintenance(null);
    setAssetForMaintenance(null);
    setMaintenanceInitialType('CORRECTIVE');
    setIsMaintenanceModalOpen(true);
  };

  const handleOpenNewMaintenance = () => {
    setTicketForMaintenance(null);
    setAssetForMaintenance(null);
    setMaintenanceInitialType('PREVENTIVE');
    setIsMaintenanceModalOpen(true);
  };

  const handleOpenNewMaintenanceForAsset = (asset: HardwareAsset) => {
    setTicketForMaintenance(null);
    setAssetForMaintenance(asset);
    setMaintenanceInitialType('EMERGENCY_REPAIR');
    setIsMaintenanceModalOpen(true);
  };

  const handleCreateMaintenanceFromTicket = (ticket: Ticket) => {
    setTicketForMaintenance(ticket);
    setAssetForMaintenance(null);
    setMaintenanceInitialType('CORRECTIVE');
    setIsMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = (newSchedule: MaintenanceSchedule) => {
    setSchedules((prev) => [newSchedule, ...prev]);

    // If linked to a ticket, update ticket with linkedMaintenanceId
    if (newSchedule.linkedTicketId) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === newSchedule.linkedTicketId
            ? { ...t, linkedMaintenanceId: newSchedule.id, Etat: 'IN_PROGRESS' }
            : t
        )
      );
    }

    // Switch view to maintenance tab to see it
    setCurrentTab('maintenance');
    const typeLabel =
      newSchedule.maintenanceType === 'CORRECTIVE'
        ? 'Maintenance Corrective (CM)'
        : newSchedule.maintenanceType === 'EMERGENCY_REPAIR'
        ? 'Réparation d’Urgence'
        : 'Maintenance Préventive (PM)';
    showToast(`Ordre ${newSchedule.id} (${typeLabel}) planifié pour ${newSchedule.siteName}.`);
  };

  const handleToggleMaintenanceTask = (scheduleId: string, taskId: string) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          const updatedTasks = s.tasksChecklist.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          );
          return {
            ...s,
            tasksChecklist: updatedTasks,
            status: s.status === 'SCHEDULED' ? 'IN_PROGRESS' : s.status,
          };
        }
        return s;
      })
    );
  };

  const handleCompleteSchedule = (scheduleId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    let linkedAssetId: string | null = null;
    let linkedTicketId: string | undefined = undefined;

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          linkedAssetId = s.hardwareAssetId;
          linkedTicketId = s.linkedTicketId;
          return {
            ...s,
            status: 'COMPLETED',
            completedDate: today,
            tasksChecklist: s.tasksChecklist.map((t) => ({ ...t, completed: true })),
          };
        }
        return s;
      })
    );

    // Update associated hardware asset health back to Nominal
    if (linkedAssetId) {
      setHardwareAssets((prev) =>
        prev.map((a) =>
          a.id === linkedAssetId
            ? {
                ...a,
                health: 'Nominal',
                lastMaintenanceDate: today,
                telemetry: {
                  ...a.telemetry,
                  batteryVoltage: a.telemetry.batteryVoltage ? 53.5 : undefined,
                  temperatureCelsius: a.telemetry.temperatureCelsius ? 24 : undefined,
                  fuelLevelPercent: a.telemetry.fuelLevelPercent ? 95 : undefined,
                },
              }
            : a
        )
      );
    }

    // If linked ticket, offer resolution
    if (linkedTicketId) {
      handleUpdateTicketStatus(
        linkedTicketId,
        'RESOLVED',
        `Maintenance order ${scheduleId} completed successfully on site.`
      );
    }

    showToast(`Maintenance ${scheduleId} signed off and completed! Asset restored to Nominal.`);
  };

  // Simulate Incoming Real-time Network Alarm / Customer Ticket
  const handleSimulateAlarm = () => {
    const randomSites = sites;
    const randomSite = randomSites[Math.floor(Math.random() * randomSites.length)];
    const isCustomer = Math.random() > 0.5;

    const newId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    let newTicket: Ticket;

    if (isCustomer) {
      newTicket = {
        id: newId,
        title: `Subscriber Report: 4G Network Degradation in ${randomSite.commune}`,
        type: 'CUSTOMER_SUPPORT',
        Priorite: 'Major',
        Cat_alarme: 'QLT',
        Alarme: 'QOS Site',
        Assigne_a: 'CS_FRONTOFFICE',
        Pbm_type: 'Customer Complaint',
        Etat: 'OPEN',
        siteId: randomSite.siteId,
        siteName: randomSite.name,
        wilaya: randomSite.wilaya,
        customer: {
          msisdn: `+213 770 ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`,
          subscriberName: 'Société Algérienne de Transport',
          tier: 'BUSINESS_PRO',
          plan: 'Djezzy Entreprise 4G Flex',
          wilaya: randomSite.wilaya,
          commune: randomSite.commune,
        },
        createdAt: now,
        updatedAt: now,
        slaDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        description: `Multiple business line users reporting throughput throttled below 512kbps on sector 1.`,
        history: [{ date: now.slice(0, 16).replace('T', ' '), user: 'Hotline Portal', action: 'Inbound customer ticket created' }],
      };
    } else {
      newTicket = {
        id: newId,
        title: `Automatic Alarm: Rectifier Module Failure on ${randomSite.name}`,
        type: 'HARDWARE_MAINTENANCE',
        Priorite: 'Critical',
        Cat_alarme: 'ENV',
        Alarme: 'Rectifier',
        Assigne_a: 'O&M_ENV',
        Pbm_type: 'Pb Hard Ware',
        Etat: 'OPEN',
        siteId: randomSite.siteId,
        siteName: randomSite.name,
        wilaya: randomSite.wilaya,
        createdAt: now,
        updatedAt: now,
        slaDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        description: `Rectifier cabinet module #2 tripped on DC overcurrent. N+1 redundancy lost. Immediate site visit required.`,
        history: [{ date: now.slice(0, 16).replace('T', ' '), user: 'OSS Telemetry Engine', action: 'Telemetry alert logged' }],
      };
    }

    setTickets((prev) => [newTicket, ...prev]);
    showToast(`Incoming alert ingested: ${newTicket.id} (${newTicket.Alarme} on ${randomSite.siteId})`);
  };

  // Simulate Incoming Real-time Multi-Alarm Storm (3 alarms within 2m 25s on same site)
  const handleSimulateAlarmStorm = () => {
    const site = sites.find((s) => s.siteId === 'DZ-BLD-031') || sites[0];
    const now = new Date();
    const t0 = now.toISOString();
    const t1 = new Date(now.getTime() + 70 * 1000).toISOString(); // +1m 10s
    const t2 = new Date(now.getTime() + 145 * 1000).toISOString(); // +2m 25s

    const baseRand = Math.floor(2100 + Math.random() * 7000);

    const alarm1: Ticket = {
      id: `TKT-${baseRand}`,
      title: `Emergency: Chréa Mountain High-Capacity Link Down (Antenna Misalignment)`,
      type: 'NETWORK_ALARM',
      Priorite: 'Critical',
      Cat_alarme: 'COMM',
      Alarme: 'Link Down',
      Assigne_a: 'NOC_SDH',
      Pbm_type: 'Pb Hard Ware',
      Etat: 'OPEN',
      siteId: site.siteId,
      siteName: site.name,
      wilaya: site.wilaya,
      createdAt: t0,
      updatedAt: t0,
      slaDeadline: new Date(now.getTime() + 4 * 3600 * 1000).toISOString(),
      description: `Backhaul link to Mitidja BSC collapsed under crosswind turbulence. STM-4 tributary transmission broken.`,
      history: [{ date: t0.slice(0, 16).replace('T', ' '), user: 'NOC Auto-Monitor', action: 'Critical link down alarm generated' }],
    };

    const alarm2: Ticket = {
      id: `TKT-${baseRand + 1}`,
      title: `Chréa Relay Battery Discharge Warning (<46.8V)`,
      type: 'HARDWARE_MAINTENANCE',
      Priorite: 'Critical',
      Cat_alarme: 'ENV',
      Alarme: 'Battery',
      Assigne_a: 'O&M_ENV',
      Pbm_type: 'Autonomie',
      Etat: 'OPEN',
      siteId: site.siteId,
      siteName: site.name,
      wilaya: site.wilaya,
      createdAt: t1,
      updatedAt: t1,
      slaDeadline: new Date(now.getTime() + 4 * 3600 * 1000).toISOString(),
      description: `Mains grid interruption. Battery string voltage down to 46.8V. Estimated autonomy remaining: 2.1 hours.`,
      history: [{ date: t1.slice(0, 16).replace('T', ' '), user: 'OSS Telemetry Engine', action: 'Low autonomy battery warning' }],
    };

    const alarm3: Ticket = {
      id: `TKT-${baseRand + 2}`,
      title: `Chréa Relay Sector 1 & 2 Carrier Drop (Total Loss of Channel)`,
      type: 'NETWORK_ALARM',
      Priorite: 'Major',
      Cat_alarme: 'QLTY',
      Alarme: 'LOSS-OF-ALL CHANNEL',
      Assigne_a: 'ACCES_PROD',
      Pbm_type: 'Cause non determinee',
      Etat: 'OPEN',
      siteId: site.siteId,
      siteName: site.name,
      wilaya: site.wilaya,
      createdAt: t2,
      updatedAt: t2,
      slaDeadline: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
      description: `Radio tributary channel collapse following transmission link interruption. 2 sectors down.`,
      history: [{ date: t2.slice(0, 16).replace('T', ' '), user: 'NOC Correlator', action: 'Secondary carrier failure logged' }],
    };

    setTickets((prev) => [alarm3, alarm2, alarm1, ...prev]);
    showToast(`🚨 Alarm Storm Ingested: 3 alarms from ${site.name} within 2m 25s auto-grouped into Incident!`);
  };

  // Find currently selected ticket for detail drawer
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;
  const linkedAsset = selectedTicket
    ? hardwareAssets.find(
        (a) =>
          a.siteId === selectedTicket.siteId &&
          (selectedTicket.Alarme.toLowerCase().includes(a.equipmentType.toLowerCase().slice(0, 4)) ||
            selectedTicket.Cat_alarme === 'ENV')
      )
    : undefined;
  const linkedSchedule = selectedTicket?.linkedMaintenanceId
    ? schedules.find((s) => s.id === selectedTicket.linkedMaintenanceId)
    : undefined;

  const handleUpdateShiftLog = (updatedLog: ShiftLog) => {
    setShiftLogs((prev) => prev.map((s) => (s.id === updatedLog.id ? updatedLog : s)));
  };

  const handleCreateShiftLog = (newLog: ShiftLog) => {
    setShiftLogs((prev) => [newLog, ...prev]);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Google Maps Quota Exceeded Sticky Notice Banner */}
      {quotaExceeded && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-5 ${isRTL ? 'left-5' : 'right-5'} z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white shadow-xl text-xs`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenNewTicket={handleOpenNewTicket}
        onOpenNewMaintenance={handleOpenNewMaintenance}
        onOpenNewCM={handleOpenNewCM}
        onSimulateAlarm={handleSimulateAlarm}
        onOpenExportArchive={() => setIsExportModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative min-h-0 w-full">
        {/* Left Collapsible Menu & Submenu Navigation */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          activeTicketsCount={tickets.filter((t) => t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED').length}
          criticalTicketsCount={tickets.filter((t) => t.Priorite === 'Critical' && t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED').length}
          activeMaintenanceCount={schedules.filter((s) => s.status !== 'COMPLETED').length}
          alarmSitesCount={sites.filter((s) => s.activeAlarmsCount > 0).length}
        />

        {/* Main Workspace Canvas */}
        <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0 transition-all">
          {/* Tabular KPI Stats Bar */}
          <StatsOverview
            tickets={tickets}
            schedules={schedules}
            sites={sites}
            onFilterPriority={(p) => {
              setPriorityFilter(p);
              setCurrentTab('tickets');
            }}
            onFilterMaintenance={(status) => {
              setMaintenanceStatusFilter(status);
              setCurrentTab('maintenance');
            }}
          />

        {/* Tab 1: Network Alarms & Tickets */}
        {currentTab === 'tickets' && (
          <TicketList
            tickets={tickets}
            onSelectTicket={(t) => setSelectedTicketId(t.id)}
            onEditTicket={handleEditTicket}
            onDeleteTicket={handleDeleteTicket}
            onCreateMaintenanceFromTicket={handleCreateMaintenanceFromTicket}
            initialTypeFilter="ALL"
            priorityFilter={priorityFilter}
            onClearExternalPriority={() => setPriorityFilter('')}
            onSimulateAlarmStorm={handleSimulateAlarmStorm}
          />
        )}

        {/* Tab 2: Customer Support Requests */}
        {currentTab === 'customer' && (
          <div className="space-y-4">
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">
                  {t('desk_customer_title')}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {t('desk_customer_sub')}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTicket(null);
                  setIsTicketModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition-colors whitespace-nowrap cursor-pointer shadow-sm"
              >
                + {t('btn_register_customer')}
              </button>
            </div>

            <TicketList
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicketId(t.id)}
              onEditTicket={handleEditTicket}
              onDeleteTicket={handleDeleteTicket}
              onCreateMaintenanceFromTicket={handleCreateMaintenanceFromTicket}
              initialTypeFilter="CUSTOMER_SUPPORT"
              priorityFilter={priorityFilter}
              onClearExternalPriority={() => setPriorityFilter('')}
            />
          </div>
        )}

        {/* Tab 3: Hardware Maintenance Schedules */}
        {currentTab === 'maintenance' && (
          <MaintenanceScheduler
            schedules={schedules}
            assets={hardwareAssets}
            tickets={tickets}
            onOpenNewMaintenance={handleOpenNewMaintenance}
            onOpenNewCM={handleOpenNewCM}
            onOpenNewMaintenanceForAsset={handleOpenNewMaintenanceForAsset}
            onToggleTask={handleToggleMaintenanceTask}
            onCompleteSchedule={handleCompleteSchedule}
            onSelectTicketById={(ticketId) => {
              setSelectedTicketId(ticketId);
            }}
            initialStatusFilter={maintenanceStatusFilter}
          />
        )}

        {/* Tab 4: BTS Sites & Telecom Infrastructure */}
        {currentTab === 'sites' && (
          <SiteMatrixView
            sites={sites}
            assets={hardwareAssets}
            tickets={tickets}
            onSelectSiteFilter={(siteId) => {
              setCurrentTab('tickets');
            }}
            onNewTicketForSite={(site) => {
              setEditingTicket({
                id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
                title: `Site Alarm on ${site.name}`,
                type: 'NETWORK_ALARM',
                Priorite: 'Major',
                Cat_alarme: 'COMM',
                Alarme: 'Link Down',
                Assigne_a: 'NOC_SDH',
                Pbm_type: 'Pb Hard Ware',
                Etat: 'OPEN',
                siteId: site.siteId,
                siteName: site.name,
                wilaya: site.wilaya,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                slaDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
                description: `Radio or transmission anomaly detected at ${site.name}`,
                history: [],
              });
              setIsTicketModalOpen(true);
            }}
            onNewMaintenanceForSite={(site) => {
              setTicketForMaintenance({
                id: '',
                title: '',
                type: 'HARDWARE_MAINTENANCE',
                Priorite: 'Minor',
                Cat_alarme: 'ENV',
                Alarme: 'GE',
                Assigne_a: 'O&M_ENV',
                Pbm_type: 'Energie',
                Etat: 'OPEN',
                siteId: site.siteId,
                siteName: site.name,
                wilaya: site.wilaya,
                createdAt: '',
                updatedAt: '',
                slaDeadline: '',
                description: '',
                history: [],
              });
              setIsMaintenanceModalOpen(true);
            }}
          />
        )}

        {/* Tab 5: Team Performance */}
        {currentTab === 'performance' && (
          <TeamPerformanceView
            tickets={tickets}
            onSelectOperatorTeam={(team) => {
              setCurrentTab('tickets');
            }}
          />
        )}

        {/* Tab 6: NOC Analytics */}
        {currentTab === 'analytics' && (
          <AnalyticsView
            tickets={tickets}
            schedules={schedules}
            assets={hardwareAssets}
          />
        )}

        {/* Tab 7: NOC Shift Logbook & AI Handover Protocol */}
        {currentTab === 'shiftlog' && (
          <ShiftLogView
            tickets={tickets}
            assets={hardwareAssets}
            sites={sites}
            shiftLogs={shiftLogs}
            onUpdateShiftLog={handleUpdateShiftLog}
            onCreateShiftLog={handleCreateShiftLog}
            onSelectTicketById={(ticketId) => {
              setSelectedTicketId(ticketId);
            }}
            onNavigateToTab={(tab) => {
              setCurrentTab(tab as any);
            }}
            onToast={showToast}
          />
        )}
        </main>
      </div>

      {/* Ticket Creation / Edit Modal */}
      <TicketModal
        isOpen={isTicketModalOpen}
        ticket={editingTicket}
        sites={sites}
        onClose={() => {
          setIsTicketModalOpen(false);
          setEditingTicket(null);
        }}
        onSave={handleSaveTicket}
      />

      {/* Maintenance Order Modal */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        preselectedTicket={ticketForMaintenance}
        preselectedAsset={assetForMaintenance}
        initialType={maintenanceInitialType}
        assets={hardwareAssets}
        sites={sites}
        tickets={tickets}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          setTicketForMaintenance(null);
          setAssetForMaintenance(null);
          setMaintenanceInitialType('PREVENTIVE');
        }}
        onSave={handleSaveMaintenance}
      />

      {/* Ticket Details Inspector Slide-Over */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        allTickets={tickets}
        hardwareAsset={linkedAsset}
        linkedMaintenance={linkedSchedule}
        onClose={() => setSelectedTicketId(null)}
        onUpdateStatus={handleUpdateTicketStatus}
        onAddHistoryLog={handleAddTicketHistory}
        onCreateMaintenance={(t) => {
          setSelectedTicketId(null);
          handleCreateMaintenanceFromTicket(t);
        }}
        onSelectOtherTicket={(t) => setSelectedTicketId(t.id)}
      />

      {/* Export NOC Reports & Archiving Modal */}
      <ExportArchiveModal
        isOpen={isExportModalOpen}
        tickets={tickets}
        schedules={schedules}
        assets={hardwareAssets}
        onClose={() => setIsExportModalOpen(false)}
        onToast={showToast}
      />
    </div>
  );
}
