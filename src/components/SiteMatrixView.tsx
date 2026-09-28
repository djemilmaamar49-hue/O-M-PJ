import React, { useState, useMemo } from 'react';
import { SiteInfo, HardwareAsset, Ticket } from '../types/telecom';
import { SiteMap } from './SiteMap';
import { useLanguage } from '../context/LanguageContext';
import {
  Building,
  Radio,
  Wrench,
  AlertTriangle,
  CheckCircle,
  MapPin,
  ExternalLink,
  Plus,
  Zap,
  Map as MapIcon,
  LayoutGrid,
  Maximize2,
  Flame,
  AlertOctagon,
  Eye,
} from 'lucide-react';

interface SiteMatrixViewProps {
  sites: SiteInfo[];
  assets: HardwareAsset[];
  tickets: Ticket[];
  onSelectSiteFilter: (siteId: string) => void;
  onNewTicketForSite: (site: SiteInfo) => void;
  onNewMaintenanceForSite: (site: SiteInfo) => void;
}

export const SiteMatrixView: React.FC<SiteMatrixViewProps> = ({
  sites,
  assets,
  tickets,
  onSelectSiteFilter,
  onNewTicketForSite,
  onNewMaintenanceForSite,
}) => {
  const { t, isRTL } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState<'ALL' | 'Centre' | 'Est' | 'Ouest' | 'Sud'>(
    'ALL'
  );
  const [alarmFilter, setAlarmFilter] = useState<'ALL' | 'CRITICAL' | 'MAJOR' | 'ALL_ALARMS'>('ALL');
  const [focusedSiteId, setFocusedSiteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'cards'>('split');

  // Compute active Critical and Major alarms mapping for each site
  const siteAlarmMap = useMemo(() => {
    const map = new Map<
      string,
      {
        criticalAlarms: Ticket[];
        majorAlarms: Ticket[];
        hasCriticalAlarm: boolean;
        hasMajorAlarm: boolean;
        hasBlinkingAlarm: boolean;
      }
    >();

    sites.forEach((site) => {
      const siteActiveTickets = tickets.filter(
        (t) => t.siteId === site.siteId && t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED'
      );
      const criticalAlarms = siteActiveTickets.filter((t) => t.Priorite === 'Critical');
      const majorAlarms = siteActiveTickets.filter((t) => t.Priorite === 'Major');
      const hasCriticalAlarm = criticalAlarms.length > 0;
      const hasMajorAlarm = majorAlarms.length > 0;
      const hasBlinkingAlarm = hasCriticalAlarm || hasMajorAlarm;

      map.set(site.siteId, {
        criticalAlarms,
        majorAlarms,
        hasCriticalAlarm,
        hasMajorAlarm,
        hasBlinkingAlarm,
      });
    });

    return map;
  }, [sites, tickets]);

  const criticalSiteCount = useMemo(() => {
    return Array.from(siteAlarmMap.values()).filter((v) => v.hasCriticalAlarm).length;
  }, [siteAlarmMap]);

  const majorSiteCount = useMemo(() => {
    return Array.from(siteAlarmMap.values()).filter((v) => v.hasMajorAlarm).length;
  }, [siteAlarmMap]);

  const totalBlinkingSites = useMemo(() => {
    return Array.from(siteAlarmMap.values()).filter((v) => v.hasBlinkingAlarm).length;
  }, [siteAlarmMap]);

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (selectedRegion !== 'ALL' && s.region !== selectedRegion) return false;

      const alarmInfo = siteAlarmMap.get(s.siteId);
      if (alarmFilter === 'CRITICAL' && !alarmInfo?.hasCriticalAlarm) return false;
      if (alarmFilter === 'MAJOR' && !alarmInfo?.hasMajorAlarm) return false;
      if (alarmFilter === 'ALL_ALARMS' && !alarmInfo?.hasBlinkingAlarm) return false;

      return true;
    });
  }, [sites, selectedRegion, alarmFilter, siteAlarmMap]);

  const handleLocateOnMap = (siteId: string) => {
    setFocusedSiteId(siteId);
    if (viewMode === 'cards') {
      setViewMode('split');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner, View Switcher & Region Filter */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              <span>{t('site_matrix_title')}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('site_matrix_sub')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{t('mode_split')}</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 text-red-400" />
                <span>{t('mode_map')}</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t('mode_cards')}</span>
              </button>
            </div>

            {/* Region filter */}
            <div className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
              {(['ALL', 'Centre', 'Est', 'Ouest', 'Sud'] as const).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    selectedRegion === reg
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {reg === 'ALL' ? t('region_all') : reg}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Alarms Quick Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-neutral-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
              {t('alarm_filter_all')}:
            </span>

            <button
              onClick={() => setAlarmFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                alarmFilter === 'ALL'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/70 border border-neutral-800'
              }`}
            >
              All Sites ({sites.length})
            </button>

            {/* Critical Alarms Quick Button */}
            <button
              onClick={() => setAlarmFilter('CRITICAL')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                alarmFilter === 'CRITICAL'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950 ring-2 ring-red-400'
                  : 'bg-red-950/40 text-red-300 border border-red-800/60 hover:bg-red-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span>{t('alarm_critical_count')}</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-red-950 text-white border border-red-700">
                {criticalSiteCount} Blinking
              </span>
            </button>

            {/* Major Alarms Quick Button */}
            <button
              onClick={() => setAlarmFilter('MAJOR')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                alarmFilter === 'MAJOR'
                  ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-950 ring-2 ring-amber-300'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{t('alarm_major_count')}</span>
              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-amber-950 text-amber-200 border border-amber-700">
                {majorSiteCount} Blinking
              </span>
            </button>

            {/* Combined Blinking Sites Button */}
            <button
              onClick={() => setAlarmFilter('ALL_ALARMS')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                alarmFilter === 'ALL_ALARMS'
                  ? 'bg-neutral-800 text-amber-300 font-bold border border-amber-500'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/70 border border-neutral-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>All Blinking Alarm Sites ({totalBlinkingSites})</span>
            </button>
          </div>

          {(alarmFilter !== 'ALL' || selectedRegion !== 'ALL') && (
            <button
              onClick={() => {
                setAlarmFilter('ALL');
                setSelectedRegion('ALL');
              }}
              className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              {t('clear_filters')}
            </button>
          )}
        </div>
      </div>

      {/* Map Section (Rendered in 'split' or 'map' mode) */}
      {(viewMode === 'split' || viewMode === 'map') && (
        <SiteMap
          sites={filteredSites}
          assets={assets}
          tickets={tickets}
          selectedSiteId={focusedSiteId}
          onSelectSite={(site) => setFocusedSiteId(site.siteId)}
          onFilterTickets={onSelectSiteFilter}
          onNewTicketForSite={onNewTicketForSite}
          onNewMaintenanceForSite={onNewMaintenanceForSite}
          alarmFilter={alarmFilter}
          onAlarmFilterChange={setAlarmFilter}
        />
      )}

      {/* Grid of BTS Sites (Rendered in 'split' or 'cards' mode) */}
      {(viewMode === 'split' || viewMode === 'cards') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>
              {t('site_matrix_title')} ({filteredSites.length})
            </span>
            <span className="text-[11px] text-neutral-500">
              {t('btn_locate_map')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map((site) => {
              const siteAssets = assets.filter((a) => a.siteId === site.siteId);
              const siteTickets = tickets.filter(
                (t) => t.siteId === site.siteId && t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED'
              );
              const alarmInfo = siteAlarmMap.get(site.siteId);
              const hasCritical = !!alarmInfo?.hasCriticalAlarm;
              const hasMajor = !!alarmInfo?.hasMajorAlarm && !hasCritical;
              const isFocused = focusedSiteId === site.siteId;

              return (
                <div
                  key={site.siteId}
                  onClick={() => setFocusedSiteId(site.siteId)}
                  className={`bg-neutral-900 border rounded-lg p-4 transition-all flex flex-col justify-between cursor-pointer ${
                    isFocused
                      ? 'border-red-500 ring-2 ring-red-500/60 shadow-lg'
                      : hasCritical
                      ? 'border-red-600/80 bg-red-950/20 shadow-md shadow-red-950/30'
                      : hasMajor
                      ? 'border-amber-500/80 bg-amber-950/15'
                      : site.status === 'Outage'
                      ? 'border-red-600/70 bg-red-950/10'
                      : site.status === 'Degraded'
                      ? 'border-amber-500/50 bg-amber-950/5'
                      : 'border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    {/* Header: ID, Status, and Active Alarm Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-bold text-white">
                            {site.siteId}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hasCritical
                                ? 'bg-red-500 animate-ping'
                                : hasMajor
                                ? 'bg-amber-400 animate-pulse'
                                : site.status === 'Outage'
                                ? 'bg-red-500'
                                : site.status === 'Degraded'
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                          />
                        </div>
                        <h3 className="text-xs font-semibold text-neutral-200 mt-0.5">
                          {site.name}
                        </h3>
                      </div>

                      {/* Blinking Priority Alarm Flag or Standard Status */}
                      {hasCritical ? (
                        <div className="animate-blink-critical flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold border border-red-300 shadow-sm shadow-red-950">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>CRITICAL ALARM</span>
                        </div>
                      ) : hasMajor ? (
                        <div className="animate-blink-major flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-mono text-[10px] font-bold border border-amber-200 shadow-sm shadow-amber-950">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-pulse" />
                          <span>MAJOR ALARM</span>
                        </div>
                      ) : (
                        <span
                          className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            site.status === 'Outage'
                              ? 'border-red-500/50 text-red-400 bg-red-950/30'
                              : site.status === 'Degraded'
                              ? 'border-amber-500/50 text-amber-400 bg-amber-950/30'
                              : 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                          }`}
                        >
                          {site.status === 'Outage'
                            ? t('legend_outage')
                            : site.status === 'Degraded'
                            ? t('legend_degraded')
                            : t('legend_nominal')}
                        </span>
                      )}
                    </div>

                    {/* Coordinates & Wilaya */}
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-2.5">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="truncate">{site.wilaya}</span>
                      </div>
                      <span className="font-mono text-[10px] text-neutral-500 tabular-nums shrink-0">
                        {site.coordinates.lat.toFixed(2)}°N, {site.coordinates.lng.toFixed(2)}°E
                      </span>
                    </div>

                    {/* Radio Generations */}
                    <div className="flex items-center gap-1.5 mb-3 text-[11px] font-mono text-neutral-300">
                      <span className="text-neutral-500">{t('bts_technologies')}:</span>
                      {site.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-neutral-300 font-semibold"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Installed Hardware Units */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-800/80 mb-3 text-xs">
                      <div className="text-[11px] text-neutral-400 font-medium flex items-center justify-between">
                        <span>{t('view_assets')}</span>
                        <span className="font-mono text-neutral-500 tabular-nums">
                          {siteAssets.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {siteAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between p-1.5 bg-neutral-950/60 rounded border border-neutral-800/60 text-[11px]"
                          >
                            <span className="text-neutral-300 truncate max-w-[180px]">
                              {asset.equipmentType}
                            </span>
                            <span
                              className={`font-mono font-medium ${
                                asset.health === 'Nominal'
                                  ? 'text-emerald-400'
                                  : asset.health === 'Degraded'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {asset.health === 'Nominal'
                                ? t('nominal')
                                : asset.health === 'Degraded'
                                ? t('degraded')
                                : t('critical')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Alarms with Specific Priority Highlights */}
                    <div className="text-xs pt-2 border-t border-neutral-800/80 mb-4">
                      <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
                        <span className="font-semibold">{t('active_alarms')}</span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            hasCritical
                              ? 'text-red-400'
                              : hasMajor
                              ? 'text-amber-400'
                              : siteTickets.length > 0
                              ? 'text-neutral-300'
                              : 'text-neutral-500'
                          }`}
                        >
                          {siteTickets.length}
                        </span>
                      </div>

                      {siteTickets.length > 0 ? (
                        <div className="space-y-1">
                          {siteTickets.slice(0, 2).map((tkt) => (
                            <div
                              key={tkt.id}
                              className={`text-[11px] p-1 rounded border flex items-center justify-between ${
                                tkt.Priorite === 'Critical'
                                  ? 'bg-red-950/50 border-red-800/60 text-red-200'
                                  : tkt.Priorite === 'Major'
                                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    tkt.Priorite === 'Critical'
                                      ? 'bg-red-500 animate-ping'
                                      : tkt.Priorite === 'Major'
                                      ? 'bg-amber-400 animate-pulse'
                                      : 'bg-neutral-500'
                                  }`}
                                />
                                <span className="font-mono font-bold">{tkt.id}</span>
                                <span className="text-neutral-400 truncate">{tkt.Alarme}</span>
                              </div>
                              <span
                                className={`text-[9px] font-mono font-bold uppercase px-1 rounded ${
                                  tkt.Priorite === 'Critical'
                                    ? 'bg-red-600 text-white'
                                    : tkt.Priorite === 'Major'
                                    ? 'bg-amber-500 text-neutral-950'
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                {tkt.Priorite}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t('no_alarms')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSiteFilter(site.siteId);
                        }}
                        className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t('btn_view_tickets')}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateOnMap(site.siteId);
                        }}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] transition-colors cursor-pointer font-medium"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Locate</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onNewMaintenanceForSite(site)}
                        title={t('btn_schedule_pm')}
                        className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded transition-colors cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onNewTicketForSite(site)}
                        title={t('action_create_ticket')}
                        className="p-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
