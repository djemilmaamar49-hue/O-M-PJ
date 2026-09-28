import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Radio,
  Activity,
  AlertTriangle,
  BookOpen,
  MapPin,
  Users,
  ShieldCheck,
  Wrench,
  Cpu,
  TrendingUp,
  PieChart,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  HeartPulse,
} from 'lucide-react';

export type NavigationTab =
  | 'tickets'
  | 'customer'
  | 'maintenance'
  | 'sites'
  | 'performance'
  | 'analytics'
  | 'shiftlog';

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  activeTicketsCount: number;
  criticalTicketsCount: number;
  activeMaintenanceCount: number;
  alarmSitesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed,
  setIsCollapsed,
  activeTicketsCount,
  criticalTicketsCount,
  activeMaintenanceCount,
  alarmSitesCount,
}) => {
  const { t, isRTL } = useLanguage();

  // Accordion state for expandable submenus
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    ops: true,
    customer: true,
    hardware: true,
    governance: true,
  });

  // Automatically keep parent menu open for the active tab
  useEffect(() => {
    if (['tickets', 'shiftlog', 'sites'].includes(currentTab)) {
      setOpenGroups((prev) => ({ ...prev, ops: true }));
    } else if (currentTab === 'customer') {
      setOpenGroups((prev) => ({ ...prev, customer: true }));
    } else if (currentTab === 'maintenance') {
      setOpenGroups((prev) => ({ ...prev, hardware: true }));
    } else if (['performance', 'analytics'].includes(currentTab)) {
      setOpenGroups((prev) => ({ ...prev, governance: true }));
    }
  }, [currentTab]);

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups((prev) => ({ ...prev, [groupId]: true }));
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Menu structure configuration
  const menuGroups = [
    {
      id: 'ops',
      title: t('menu_network_ops'),
      icon: Radio,
      color: 'text-red-500',
      badge: criticalTicketsCount > 0 ? `${criticalTicketsCount} P1` : undefined,
      badgeColor: 'bg-red-950 text-red-400 border-red-800',
      submenus: [
        {
          id: 'tickets',
          tab: 'tickets' as NavigationTab,
          label: t('submenu_active_alarms'),
          icon: AlertTriangle,
          badge: activeTicketsCount > 0 ? String(activeTicketsCount) : undefined,
          badgeColor:
            criticalTicketsCount > 0
              ? 'bg-red-900/60 text-red-200'
              : 'bg-neutral-800 text-neutral-300',
        },
        {
          id: 'shiftlog',
          tab: 'shiftlog' as NavigationTab,
          label: t('submenu_shift_logbook'),
          icon: BookOpen,
          badge: 'AI Handover',
          badgeColor: 'bg-violet-950/80 text-violet-300 border border-violet-800/60',
        },
        {
          id: 'sites',
          tab: 'sites' as NavigationTab,
          label: t('submenu_bts_infrastructure'),
          icon: MapPin,
          badge: alarmSitesCount > 0 ? `${alarmSitesCount} Alertes` : undefined,
          badgeColor: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
        },
      ],
    },
    {
      id: 'customer',
      title: t('menu_customer_support'),
      icon: Users,
      color: 'text-blue-400',
      submenus: [
        {
          id: 'customer',
          tab: 'customer' as NavigationTab,
          label: t('submenu_customer_desk'),
          icon: Users,
        },
        {
          id: 'customer_vip',
          tab: 'customer' as NavigationTab,
          label: t('submenu_corporate_vip'),
          icon: ShieldCheck,
          badge: 'VIP Gold',
          badgeColor: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
        },
      ],
    },
    {
      id: 'hardware',
      title: t('menu_hardware_maintenance'),
      icon: Wrench,
      color: 'text-amber-400',
      badge: activeMaintenanceCount > 0 ? String(activeMaintenanceCount) : undefined,
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
      submenus: [
        {
          id: 'maintenance',
          tab: 'maintenance' as NavigationTab,
          label: t('submenu_work_orders'),
          icon: Calendar,
          badge: activeMaintenanceCount > 0 ? `${activeMaintenanceCount} OT` : undefined,
          badgeColor: 'bg-neutral-800 text-neutral-300',
        },
        {
          id: 'maintenance_assets',
          tab: 'maintenance' as NavigationTab,
          label: t('submenu_asset_inventory'),
          icon: Cpu,
          badge: 'Télémétrie',
          badgeColor: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60',
        },
      ],
    },
    {
      id: 'governance',
      title: t('menu_governance_analytics'),
      icon: BarChart3,
      color: 'text-emerald-400',
      submenus: [
        {
          id: 'performance',
          tab: 'performance' as NavigationTab,
          label: t('submenu_team_velocity'),
          icon: TrendingUp,
          badge: '7j Trend · PDF',
          badgeColor: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60',
        },
        {
          id: 'analytics',
          tab: 'analytics' as NavigationTab,
          label: t('submenu_noc_intelligence'),
          icon: PieChart,
          badge: 'Prédictif ML',
          badgeColor: 'bg-blue-950/80 text-blue-300 border border-blue-800/60',
        },
      ],
    },
  ];

  return (
    <aside
      className={`sticky top-0 z-30 flex flex-col shrink-0 h-full border-r border-neutral-800 bg-neutral-900/95 backdrop-blur-md transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-18' : 'w-68'
      }`}
    >
      {/* Sidebar Header with Collapse Toggle */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between min-h-[52px]">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xs font-bold text-neutral-300 tracking-wider uppercase font-mono truncate">
              NOC Navigation
            </span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
          aria-label={isCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-neutral-300 hover:text-red-400 transition-colors" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-neutral-400 hover:text-white" />
          )}
        </button>
      </div>

      {/* Nav Menu Content with Accordions */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-800">
        {menuGroups.map((group) => {
          const isGroupOpen = !!openGroups[group.id];
          const GroupIcon = group.icon;
          const isGroupActive = group.submenus.some((s) => s.tab === currentTab);

          return (
            <div key={group.id} className="space-y-1">
              {/* Main Menu Header */}
              {isCollapsed ? (
                // Collapsed Icon-Only Button with Tooltip
                <button
                  onClick={() => {
                    const firstSub = group.submenus[0];
                    if (firstSub) setCurrentTab(firstSub.tab);
                  }}
                  className={`w-full flex flex-col items-center justify-center p-2.5 rounded-lg transition-all cursor-pointer relative group ${
                    isGroupActive
                      ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                  title={`${group.title} (${group.submenus.map((s) => s.label).join(', ')})`}
                >
                  <GroupIcon className={`w-5 h-5 ${isGroupActive ? 'text-red-500' : ''}`} />
                  {isGroupActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1" />
                  )}

                  {/* Flyout Hover Menu on Collapsed Sidebar */}
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:flex flex-col bg-neutral-950 border border-neutral-750 p-2 rounded-lg shadow-2xl z-50 min-w-[200px] pointer-events-auto">
                    <div className="text-[11px] font-bold text-neutral-200 border-b border-neutral-800 pb-1.5 mb-1 px-1 flex items-center gap-1.5">
                      <GroupIcon className="w-3.5 h-3.5 text-red-500" />
                      <span>{group.title}</span>
                    </div>
                    <div className="space-y-1">
                      {group.submenus.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentTab(sub.tab);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                            currentTab === sub.tab
                              ? 'bg-red-600/20 text-red-400 font-semibold'
                              : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{sub.label}</span>
                          {sub.badge && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-300">
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </button>
              ) : (
                // Expanded Header with Accordion Toggle
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isGroupActive
                      ? 'text-white bg-neutral-800/60'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <GroupIcon className={`w-4 h-4 shrink-0 ${group.color}`} />
                    <span className="truncate">{group.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {group.badge && (
                      <span
                        className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border ${group.badgeColor}`}
                      >
                        {group.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </div>
                </button>
              )}

              {/* Expanded Submenu Items */}
              {!isCollapsed && isGroupOpen && (
                <div className="pl-3 pr-1 py-0.5 space-y-0.5 border-l-2 border-neutral-800 ml-3.5">
                  {group.submenus.map((sub) => {
                    const SubIcon = sub.icon;
                    const isActive = currentTab === sub.tab;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => setCurrentTab(sub.tab)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-red-600 text-white font-semibold shadow-xs'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <SubIcon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-white' : 'text-neutral-500'
                            }`}
                          />
                          <span className="truncate">{sub.label}</span>
                        </div>

                        {sub.badge && (
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                              isActive
                                ? 'bg-red-800 text-red-100 font-bold'
                                : sub.badgeColor || 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: NOC Operational Status */}
      <div className="p-2.5 border-t border-neutral-800 bg-neutral-950/60 text-xs">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>NOC Alger HQ</span>
              </span>
              <span className="text-emerald-400 font-bold">24/7 En Ligne</span>
            </div>

            <div className="p-2 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between text-[10.5px]">
              <span className="text-neutral-500">Disponibilité GSM:</span>
              <span className="text-emerald-400 font-mono font-bold">99.85%</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="NOC Alger HQ: 24/7 En Ligne (99.85%)">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
