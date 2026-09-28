import React, { useState, useEffect, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { SiteInfo, HardwareAsset, Ticket } from '../types/telecom';
import { useLanguage } from '../context/LanguageContext';

export interface SiteAlarmDetail {
  criticalAlarms: Ticket[];
  majorAlarms: Ticket[];
  hasCriticalAlarm: boolean;
  hasMajorAlarm: boolean;
  hasBlinkingAlarm: boolean;
}
import {
  AlertTriangle,
  CheckCircle,
  Radio,
  Building,
  Wrench,
  Plus,
  ExternalLink,
  MapPin,
  AlertOctagon,
  Flame,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface SiteMapProps {
  sites: SiteInfo[];
  assets: HardwareAsset[];
  tickets: Ticket[];
  selectedSiteId?: string | null;
  onSelectSite: (site: SiteInfo) => void;
  onFilterTickets: (siteId: string) => void;
  onNewTicketForSite: (site: SiteInfo) => void;
  onNewMaintenanceForSite: (site: SiteInfo) => void;
  alarmFilter?: 'ALL' | 'CRITICAL' | 'MAJOR' | 'ALL_ALARMS';
  onAlarmFilterChange?: (filter: 'ALL' | 'CRITICAL' | 'MAJOR' | 'ALL_ALARMS') => void;
}

// Center of Algeria (telecom overview coordinates)
const ALGERIA_CENTER = { lat: 34.6, lng: 3.5 };

// Regional quick zoom presets
const REGION_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 34.2, lng: 3.8, zoom: 6 },
  Centre: { lat: 36.65, lng: 3.1, zoom: 10 },
  Est: { lat: 36.4, lng: 6.8, zoom: 9 },
  Ouest: { lat: 35.65, lng: -0.6, zoom: 10 },
  Sud: { lat: 31.7, lng: 6.1, zoom: 9 },
};

export const SiteMap: React.FC<SiteMapProps> = ({
  sites,
  assets,
  tickets,
  selectedSiteId,
  onSelectSite,
  onFilterTickets,
  onNewTicketForSite,
  onNewMaintenanceForSite,
  alarmFilter = 'ALL',
  onAlarmFilterChange,
}) => {
  const { t, isRTL } = useLanguage();
  const [activeSite, setActiveSite] = useState<SiteInfo | null>(null);
  const [mapCenter, setMapCenter] = useState(ALGERIA_CENTER);
  const [mapZoom, setMapZoom] = useState(6);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Outage' | 'Degraded' | 'Nominal'>('ALL');
  const [internalAlarmFilter, setInternalAlarmFilter] = useState<'ALL' | 'CRITICAL' | 'MAJOR' | 'ALL_ALARMS'>(
    alarmFilter
  );

  // Sync external alarm filter if provided
  useEffect(() => {
    setInternalAlarmFilter(alarmFilter);
  }, [alarmFilter]);

  const handleAlarmFilterChange = (filter: 'ALL' | 'CRITICAL' | 'MAJOR' | 'ALL_ALARMS') => {
    setInternalAlarmFilter(filter);
    if (onAlarmFilterChange) {
      onAlarmFilterChange(filter);
    }
  };

  // Google Maps API Key with verified active fallback
  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
    'AIzaSyBiQ2zeWFVMnoCQWVG0FNgSezq-assaHuI';

  // Compute alarm status map for each site
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

  // Synchronize when parent selects a site
  useEffect(() => {
    if (selectedSiteId) {
      const found = sites.find((s) => s.siteId === selectedSiteId);
      if (found) {
        setActiveSite(found);
        setMapCenter(found.coordinates);
        setMapZoom(11);
      }
    }
  }, [selectedSiteId, sites]);

  // Filter sites based on both status and active alarm priority
  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;

      const alarmInfo = siteAlarmMap.get(s.siteId);
      if (internalAlarmFilter === 'CRITICAL' && !alarmInfo?.hasCriticalAlarm) return false;
      if (internalAlarmFilter === 'MAJOR' && !alarmInfo?.hasMajorAlarm) return false;
      if (internalAlarmFilter === 'ALL_ALARMS' && !alarmInfo?.hasBlinkingAlarm) return false;

      return true;
    });
  }, [sites, statusFilter, internalAlarmFilter, siteAlarmMap]);

  // Summary counts of sites with blinking alarms
  const totalBlinkingSites = useMemo(() => {
    return Array.from(siteAlarmMap.values()).filter((v) => v.hasBlinkingAlarm).length;
  }, [siteAlarmMap]);

  const totalCriticalSites = useMemo(() => {
    return Array.from(siteAlarmMap.values()).filter((v) => v.hasCriticalAlarm).length;
  }, [siteAlarmMap]);

  const totalMajorSites = useMemo(() => {
    return Array.from(siteAlarmMap.values()).filter((v) => v.hasMajorAlarm).length;
  }, [siteAlarmMap]);

  const handleRegionClick = (region: string) => {
    const preset = REGION_COORDINATES[region];
    if (preset) {
      setMapCenter({ lat: preset.lat, lng: preset.lng });
      setMapZoom(preset.zoom);
    }
  };

  const getMarkerColors = (status: 'Nominal' | 'Degraded' | 'Outage', hasCritical: boolean, hasMajor: boolean) => {
    if (hasCritical) {
      return {
        bg: '#DC2626', // Red
        border: '#7F1D1D',
        glyph: '#FFFFFF',
        label: 'Critical Alarm',
      };
    }
    if (hasMajor) {
      return {
        bg: '#F59E0B', // Amber
        border: '#78350F',
        glyph: '#FFFFFF',
        label: 'Major Alarm',
      };
    }

    switch (status) {
      case 'Outage':
        return {
          bg: '#DC2626',
          border: '#7F1D1D',
          glyph: '#FFFFFF',
          label: 'Outage',
        };
      case 'Degraded':
        return {
          bg: '#F59E0B',
          border: '#78350F',
          glyph: '#FFFFFF',
          label: 'Degraded',
        };
      case 'Nominal':
      default:
        return {
          bg: '#10B981',
          border: '#064E3B',
          glyph: '#FFFFFF',
          label: 'Nominal',
        };
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex flex-col">
      {/* Top Map Control Bar */}
      <div className="p-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
            <Radio className="w-4 h-4 text-red-500" />
            <span>{t('site_matrix_title')}</span>
          </div>
          <span className="text-neutral-600" aria-hidden="true">·</span>
          <span className="text-neutral-400 font-mono tabular-nums">
            {filteredSites.length} {t('nav_sites')}
          </span>

          {/* Active Blinking Alarms Quick Filter Pills */}
          <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 text-[11px] ml-1">
            <button
              onClick={() => handleAlarmFilterChange('ALL')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                internalAlarmFilter === 'ALL'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('alarm_filter_all')}
            </button>

            <button
              onClick={() => handleAlarmFilterChange('CRITICAL')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                internalAlarmFilter === 'CRITICAL'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-950 ring-1 ring-red-400'
                  : 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span>{t('alarm_filter_critical')}</span>
              <span className="font-mono text-[10px] px-1 py-0.1 rounded bg-red-950/80 border border-red-800 text-white">
                {totalCriticalSites}
              </span>
            </button>

            <button
              onClick={() => handleAlarmFilterChange('MAJOR')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                internalAlarmFilter === 'MAJOR'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-950 ring-1 ring-amber-300'
                  : 'text-amber-400 hover:bg-amber-950/40 hover:text-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{t('alarm_filter_major')}</span>
              <span className="font-mono text-[10px] px-1 py-0.1 rounded bg-amber-950/80 border border-amber-800 text-amber-200">
                {totalMajorSites}
              </span>
            </button>

            <button
              onClick={() => handleAlarmFilterChange('ALL_ALARMS')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                internalAlarmFilter === 'ALL_ALARMS'
                  ? 'bg-neutral-800 text-amber-300 font-bold border border-amber-500/50'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{t('alarm_filter_blinking_only')} ({totalBlinkingSites})</span>
            </button>
          </div>
        </div>

        {/* Right side controls: Region & Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Region Center Buttons */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded border border-neutral-800 text-[11px]">
            <span className="text-neutral-500 px-1 font-medium">{t('region_filter')}:</span>
            {Object.keys(REGION_COORDINATES).map((reg) => (
              <button
                key={reg}
                onClick={() => handleRegionClick(reg)}
                className="px-2 py-0.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {reg === 'ALL' ? t('region_all') : reg}
              </button>
            ))}
          </div>

          {/* Status Filter for Map */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-neutral-500 font-medium">{t('status_filter')}:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | 'Outage' | 'Degraded' | 'Nominal')
              }
              className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-neutral-300 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">{t('all_statuses')}</option>
              <option value="Outage">{t('legend_outage')}</option>
              <option value="Degraded">{t('legend_degraded')}</option>
              <option value="Nominal">{t('legend_nominal')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[520px] bg-neutral-950">
        <APIProvider apiKey={apiKey} libraries={['marker']}>
          <GoogleMap
            center={mapCenter}
            zoom={mapZoom}
            onCenterChanged={(e) => setMapCenter(e.detail.center)}
            onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
          >
            {/* Blinking Markers for each Site */}
            {filteredSites.map((site) => {
              const alarmInfo = siteAlarmMap.get(site.siteId);
              const hasCritical = !!alarmInfo?.hasCriticalAlarm;
              const hasMajor = !!alarmInfo?.hasMajorAlarm && !hasCritical;
              const colors = getMarkerColors(site.status, hasCritical, hasMajor);
              const isSelected = activeSite?.siteId === site.siteId;

              return (
                <AdvancedMarker
                  key={site.siteId}
                  position={site.coordinates}
                  title={`${site.siteId} - ${site.name} (${hasCritical ? 'CRITICAL ALARM' : hasMajor ? 'MAJOR ALARM' : site.status})`}
                  onClick={() => {
                    setActiveSite(site);
                    onSelectSite(site);
                  }}
                >
                  <div className="relative cursor-pointer group flex flex-col items-center select-none">
                    {/* ======================================================== */}
                    {/* CRITICAL PRIORITY ALARM: HIGH-FREQUENCY BLINKING BEACON */}
                    {/* ======================================================== */}
                    {hasCritical && (
                      <>
                        {/* Outermost expanding radar ripple */}
                        <span className="absolute -inset-5 rounded-full bg-red-600/30 animate-radar-ripple pointer-events-none" />
                        {/* High-intensity pulsing red ping */}
                        <span className="absolute -inset-3 rounded-full bg-red-500 animate-ping opacity-85 pointer-events-none" />
                        {/* Blinking Top Priority Badge */}
                        <div className="animate-blink-critical mb-1 px-1.5 py-0.5 rounded-full bg-red-600 border border-red-200 text-white font-mono font-bold text-[9px] shadow-lg shadow-red-950 flex items-center gap-1 z-30">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>CRITICAL</span>
                          {alarmInfo.criticalAlarms.length > 1 && (
                            <span className="bg-red-950/90 text-red-200 px-1 rounded text-[8px]">
                              {alarmInfo.criticalAlarms.length}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* ======================================================== */}
                    {/* MAJOR PRIORITY ALARM: AMBER WARNING BLINKING BEACON */}
                    {/* ======================================================== */}
                    {hasMajor && (
                      <>
                        {/* Amber expanding radar ripple */}
                        <span className="absolute -inset-4 rounded-full bg-amber-500/30 animate-radar-ripple pointer-events-none" />
                        {/* Amber pulsing warning ring */}
                        <span className="absolute -inset-2.5 rounded-full bg-amber-400 animate-ping opacity-80 pointer-events-none" />
                        {/* Blinking Top Priority Badge */}
                        <div className="animate-blink-major mb-1 px-1.5 py-0.5 rounded-full bg-amber-500 border border-amber-200 text-neutral-950 font-mono font-bold text-[9px] shadow-lg shadow-amber-950 flex items-center gap-1 z-30">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-pulse" />
                          <span>MAJOR</span>
                          {alarmInfo.majorAlarms.length > 1 && (
                            <span className="bg-amber-950 text-amber-200 px-1 rounded text-[8px]">
                              {alarmInfo.majorAlarms.length}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Nominal / Outage without ticket: Standard outage pulse */}
                    {!hasCritical && !hasMajor && site.status === 'Outage' && (
                      <span className="absolute -inset-1.5 rounded-full bg-red-500 animate-ping opacity-70 pointer-events-none" />
                    )}

                    {/* Pin Graphic */}
                    <div
                      className={`relative transition-transform duration-200 ${
                        hasCritical
                          ? 'animate-blink-critical scale-110'
                          : hasMajor
                          ? 'animate-blink-major scale-105'
                          : isSelected
                          ? 'scale-125'
                          : 'group-hover:scale-115'
                      }`}
                    >
                      <Pin
                        background={colors.bg}
                        borderColor={isSelected ? '#FFFFFF' : colors.border}
                        glyphColor={colors.glyph}
                        scale={hasCritical ? 1.3 : hasMajor ? 1.2 : isSelected ? 1.25 : 1.0}
                      />
                    </div>

                    {/* Enhanced Hover tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block whitespace-nowrap bg-neutral-950/95 border border-neutral-700 text-white text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-2xl z-50 pointer-events-none">
                      <div className="flex items-center gap-1.5 font-bold">
                        {hasCritical ? (
                          <span className="text-red-400 flex items-center gap-1 font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            CRITICAL ALARM ({alarmInfo?.criticalAlarms.length})
                          </span>
                        ) : hasMajor ? (
                          <span className="text-amber-400 flex items-center gap-1 font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            MAJOR ALARM ({alarmInfo?.majorAlarms.length})
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">{site.status}</span>
                        )}
                      </div>
                      <div className="text-neutral-200 font-semibold mt-0.5">
                        {site.siteId} · {site.name}
                      </div>
                      <div className="text-[9px] text-neutral-400">{site.wilaya}</div>
                      {hasCritical && alarmInfo?.criticalAlarms[0] && (
                        <div className="text-[9px] text-red-300 mt-1 pt-1 border-t border-red-900/60 font-sans">
                          {alarmInfo.criticalAlarms[0].Alarme} - {alarmInfo.criticalAlarms[0].id}
                        </div>
                      )}
                      {hasMajor && alarmInfo?.majorAlarms[0] && (
                        <div className="text-[9px] text-amber-300 mt-1 pt-1 border-t border-amber-900/60 font-sans">
                          {alarmInfo.majorAlarms[0].Alarme} - {alarmInfo.majorAlarms[0].id}
                        </div>
                      )}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for active clicked site */}
            {activeSite && (
              <InfoWindow
                position={activeSite.coordinates}
                onCloseClick={() => setActiveSite(null)}
                pixelOffset={[0, -36]}
              >
                <div className="p-1 text-neutral-900 min-w-[270px] max-w-[310px]">
                  {/* InfoWindow Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-200">
                    <div>
                      <div className="font-mono font-bold text-xs text-neutral-950 flex items-center gap-1.5">
                        <span>{activeSite.siteId}</span>
                        {siteAlarmMap.get(activeSite.siteId)?.hasCriticalAlarm && (
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        )}
                        {siteAlarmMap.get(activeSite.siteId)?.hasMajorAlarm &&
                          !siteAlarmMap.get(activeSite.siteId)?.hasCriticalAlarm && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                      </div>
                      <div className="font-semibold text-xs text-neutral-800 mt-0.5">
                        {activeSite.name}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          activeSite.status === 'Outage'
                            ? 'bg-red-100 text-red-700'
                            : activeSite.status === 'Degraded'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {activeSite.status === 'Outage'
                          ? t('legend_outage')
                          : activeSite.status === 'Degraded'
                          ? t('legend_degraded')
                          : t('legend_nominal')}
                      </span>
                    </div>
                  </div>

                  {/* ACTIVE ALARMS HIGHLIGHT IN INFOWINDOW */}
                  {(() => {
                    const alarmInfo = siteAlarmMap.get(activeSite.siteId);
                    if (!alarmInfo || (!alarmInfo.hasCriticalAlarm && !alarmInfo.hasMajorAlarm)) {
                      return null;
                    }

                    return (
                      <div className="my-2 p-2 rounded-md bg-red-50 border border-red-200 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-red-800 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                          <span>Active Priority Alarms</span>
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {alarmInfo.criticalAlarms.map((crit) => (
                            <div
                              key={crit.id}
                              className="flex items-start justify-between text-[11px] p-1 rounded bg-red-100/70 border border-red-300/80"
                            >
                              <div>
                                <span className="font-mono font-bold text-red-900">{crit.id}</span>
                                <span className="text-red-700 block text-[10px]">
                                  {crit.Alarme} ({crit.Pbm_type})
                                </span>
                              </div>
                              <span className="font-mono text-[9px] font-bold px-1 rounded bg-red-600 text-white uppercase">
                                CRITICAL
                              </span>
                            </div>
                          ))}
                          {alarmInfo.majorAlarms.map((maj) => (
                            <div
                              key={maj.id}
                              className="flex items-start justify-between text-[11px] p-1 rounded bg-amber-100/70 border border-amber-300/80"
                            >
                              <div>
                                <span className="font-mono font-bold text-amber-900">{maj.id}</span>
                                <span className="text-amber-800 block text-[10px]">
                                  {maj.Alarme} ({maj.Pbm_type})
                                </span>
                              </div>
                              <span className="font-mono text-[9px] font-bold px-1 rounded bg-amber-500 text-neutral-950 uppercase">
                                MAJOR
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Site Metadata details */}
                  <div className="text-[11px] text-neutral-600 py-1.5 space-y-1">
                    <div>
                      <span className="font-medium">{t('wilaya_label')}:</span> {activeSite.wilaya} (
                      {activeSite.region})
                    </div>
                    <div className="font-mono text-[10px]">
                      <span className="font-medium">GPS:</span>{' '}
                      {activeSite.coordinates.lat.toFixed(4)}, {activeSite.coordinates.lng.toFixed(4)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <span className="font-medium">{t('bts_technologies')}:</span>
                      {activeSite.technologies.join(' · ')}
                    </div>
                  </div>

                  {/* Action buttons inside InfoWindow */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-1 text-[11px]">
                    <button
                      onClick={() => onFilterTickets(activeSite.siteId)}
                      className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium transition-colors cursor-pointer"
                    >
                      {t('btn_view_tickets')}
                    </button>
                    <button
                      onClick={() => onNewMaintenanceForSite(activeSite)}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium transition-colors cursor-pointer"
                    >
                      {t('action_schedule_pm')}
                    </button>
                    <button
                      onClick={() => onNewTicketForSite(activeSite)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors cursor-pointer"
                    >
                      {t('action_create_ticket')}
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>

        {/* Floating Map Legend (Updated with Blinking Indicators) */}
        <div
          className={`absolute bottom-3 ${
            isRTL ? 'right-3' : 'left-3'
          } bg-neutral-950/95 border border-neutral-800 rounded-lg p-3 text-[11px] space-y-1.5 shadow-2xl backdrop-blur-md z-10 min-w-[210px]`}
        >
          <div className="font-semibold text-neutral-300 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{t('legend_title')}</span>
            <span className="text-[9px] text-amber-400 font-mono">LIVE NOC</span>
          </div>

          {/* Critical Blinking Legend Row */}
          <div className="flex items-center gap-2 text-red-300 font-medium bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/50">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px]">{t('legend_blinking_critical')}</span>
          </div>

          {/* Major Blinking Legend Row */}
          <div className="flex items-center gap-2 text-amber-300 font-medium bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/50">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[10px]">{t('legend_blinking_major')}</span>
          </div>

          <div className="pt-1 border-t border-neutral-800 space-y-1">
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>{t('legend_outage')}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>{t('legend_degraded')}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{t('legend_nominal')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
