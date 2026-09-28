import React from 'react';
import {
  Plus,
  Wrench,
  RefreshCw,
  Radio,
  FileSpreadsheet,
  Calendar,
  Menu,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  currentTab: 'tickets' | 'customer' | 'maintenance' | 'sites' | 'performance' | 'analytics' | 'shiftlog';
  setCurrentTab: (tab: 'tickets' | 'customer' | 'maintenance' | 'sites' | 'performance' | 'analytics' | 'shiftlog') => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenNewTicket: () => void;
  onOpenNewMaintenance: () => void;
  onOpenNewCM?: () => void;
  onSimulateAlarm: () => void;
  onOpenExportArchive: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenNewTicket,
  onOpenNewMaintenance,
  onOpenNewCM,
  onSimulateAlarm,
  onOpenExportArchive,
}) => {
  const { language, setLanguage, t, isRTL } = useLanguage();

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Sidebar Toggle & Brand Zone */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
                aria-label="Toggle Navigation Sidebar"
              >
                <Menu className="w-5 h-5 text-neutral-300" />
              </button>
            )}

            <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center font-bold text-white shadow-sm shadow-red-900/40">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                setCurrentTab('tickets');
              }}
              className="text-lg font-bold tracking-tight text-white hover:text-red-400 transition-colors flex items-center"
            >
              <span>{t('brand_name')}</span>
              <span className="text-neutral-400 font-normal text-xs sm:text-sm ml-1.5 hidden sm:inline">
                {t('brand_sub')}
              </span>
            </a>
          </div>

          {/* Zone 2: Primary Actions & Language Switcher */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center p-0.5 bg-neutral-950 rounded border border-neutral-800 text-[11px] font-semibold">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  language === 'fr'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Français"
              >
                FR
              </button>
              <button
                onClick={() => setLanguage('ar')}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer font-arabic ${
                  language === 'ar'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="العربية (RTL)"
              >
                عربي
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Export Archive Button */}
            <button
              onClick={onOpenExportArchive}
              title={t('export_modal_title')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{t('action_export_csv')}</span>
            </button>

            {/* Simulate Alarm Ingest */}
            <button
              onClick={onSimulateAlarm}
              title={t('action_simulate')}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('action_simulate')}</span>
            </button>

            {/* Planifier CM - Corrective Maintenance Action */}
            <button
              onClick={onOpenNewCM || onOpenNewMaintenance}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm shadow-amber-950/40"
              title="Planifier une Maintenance Corrective (CM)"
            >
              <Wrench className="w-3.5 h-3.5 text-neutral-950" />
              <span>{t('action_schedule_cm')}</span>
            </button>

            {/* Planifier PM - Routine Preventive Maintenance */}
            <button
              onClick={onOpenNewMaintenance}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              title="Planifier une Maintenance Préventive (PM)"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('action_schedule_pm')}</span>
            </button>

            {/* Create Ticket */}
            <button
              onClick={onOpenNewTicket}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors shadow-sm shadow-red-900/30 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('action_create_ticket')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
