import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Priority,
  Etat,
  CatAlarme,
  Assignee,
  PbmType,
  TicketType,
  CustomerTier,
  SiteInfo,
} from '../types/telecom';
import {
  OPTIONS,
  ALARME_MAPPING,
  CATEGORY_DESCRIPTIONS,
  TEAM_LABELS,
  ALGERIA_WILAYAS,
} from '../data/telecomConstants';
import { useLanguage } from '../context/LanguageContext';
import { X, AlertCircle, Building, User, Radio, Wrench } from 'lucide-react';

interface TicketModalProps {
  isOpen: boolean;
  ticket: Ticket | null; // null if adding new
  sites: SiteInfo[];
  onClose: () => void;
  onSave: (ticket: Ticket) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  ticket,
  sites,
  onClose,
  onSave,
}) => {
  const { t, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    type: 'NETWORK_ALARM' as TicketType,
    Priorite: 'Major' as Priority,
    Cat_alarme: 'COMM' as CatAlarme,
    Alarme: 'Link Down',
    Assigne_a: 'NOC_SDH' as Assignee,
    Pbm_type: 'Pb Hard Ware' as PbmType,
    Etat: 'OPEN' as Etat,
    siteId: 'DZ-ALG-014',
    siteName: 'Kouba Plateau Hub',
    wilaya: '16 - Alger',
    description: '',
    rootCause: '',
    resolutionNotes: '',
    // Customer info if Customer Support
    msisdn: '+213 7',
    subscriberName: '',
    tier: 'CONSUMER' as CustomerTier,
    plan: 'Djezzy Legend 4G',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title || '',
        type: ticket.type || 'NETWORK_ALARM',
        Priorite: ticket.Priorite || 'Major',
        Cat_alarme: ticket.Cat_alarme || 'COMM',
        Alarme: ticket.Alarme || '',
        Assigne_a: ticket.Assigne_a || 'NOC_SDH',
        Pbm_type: ticket.Pbm_type || 'QOS',
        Etat: ticket.Etat || 'OPEN',
        siteId: ticket.siteId || 'DZ-ALG-014',
        siteName: ticket.siteName || '',
        wilaya: ticket.wilaya || '16 - Alger',
        description: ticket.description || '',
        rootCause: ticket.rootCause || '',
        resolutionNotes: ticket.resolutionNotes || '',
        msisdn: ticket.customer?.msisdn || '+213 7',
        subscriberName: ticket.customer?.subscriberName || '',
        tier: ticket.customer?.tier || 'CONSUMER',
        plan: ticket.customer?.plan || 'Djezzy Legend 4G',
      });
    } else {
      // Default clean state
      setFormData({
        title: '',
        type: 'NETWORK_ALARM',
        Priorite: 'Major',
        Cat_alarme: 'COMM',
        Alarme: ALARME_MAPPING['COMM'][0],
        Assigne_a: 'NOC_SDH',
        Pbm_type: 'Pb Hard Ware',
        Etat: 'OPEN',
        siteId: 'DZ-ALG-014',
        siteName: 'Kouba Plateau Hub',
        wilaya: '16 - Alger',
        description: '',
        rootCause: '',
        resolutionNotes: '',
        msisdn: '+213 770 ',
        subscriberName: '',
        tier: 'CONSUMER',
        plan: 'Djezzy Hadra & Net 4G',
      });
    }
    setErrors({});
  }, [ticket, isOpen]);

  if (!isOpen) return null;

  // Handle Category change -> Reset Alarm to first valid alarm of category
  const handleCategoryChange = (cat: CatAlarme) => {
    const defaultAlarm = ALARME_MAPPING[cat]?.[0] || '';
    setFormData((prev) => ({
      ...prev,
      Cat_alarme: cat,
      Alarme: defaultAlarm,
    }));
    if (errors.Cat_alarme || errors.Alarme) {
      setErrors((prev) => ({ ...prev, Cat_alarme: '', Alarme: '' }));
    }
  };

  const handleSiteChange = (siteId: string) => {
    const selected = sites.find((s) => s.siteId === siteId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        siteId: selected.siteId,
        siteName: selected.name,
        wilaya: selected.wilaya,
      }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) {
      errs.title = 'Incident title is required';
    }
    if (!formData.Priorite) {
      errs.Priorite = 'Priority is required';
    }
    if (!formData.Cat_alarme) {
      errs.Cat_alarme = 'Category is required';
    }
    if (!formData.Alarme) {
      errs.Alarme = 'Alarm is required';
    }
    if (!formData.Assigne_a) {
      errs.Assigne_a = 'Assignee team is required';
    }
    if (!formData.Pbm_type) {
      errs.Pbm_type = 'Problem type is required';
    }
    if (!formData.Etat) {
      errs.Etat = 'Status is required';
    }

    if (formData.type === 'CUSTOMER_SUPPORT') {
      if (!formData.msisdn || formData.msisdn.length < 9) {
        errs.msisdn = 'Valid MSISDN required (+213 7XX...)';
      }
      if (!formData.subscriberName.trim()) {
        errs.subscriberName = 'Subscriber or corporate entity name required';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const now = new Date().toISOString();
    const slaHours = formData.Priorite === 'Critical' ? 4 : formData.Priorite === 'Major' ? 8 : 24;
    const deadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    const updatedTicket: Ticket = {
      id: ticket?.id || `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      title: formData.title,
      type: formData.type,
      Priorite: formData.Priorite,
      Cat_alarme: formData.Cat_alarme,
      Alarme: formData.Alarme,
      Assigne_a: formData.Assigne_a,
      Pbm_type: formData.Pbm_type,
      Etat: formData.Etat,
      siteId: formData.siteId,
      siteName: formData.siteName,
      wilaya: formData.wilaya,
      customer:
        formData.type === 'CUSTOMER_SUPPORT'
          ? {
              msisdn: formData.msisdn,
              subscriberName: formData.subscriberName,
              tier: formData.tier,
              plan: formData.plan,
              wilaya: formData.wilaya,
              commune: formData.siteName || 'Wilaya Capital',
            }
          : undefined,
      createdAt: ticket?.createdAt || now,
      updatedAt: now,
      slaDeadline: ticket?.slaDeadline || deadline,
      description: formData.description,
      rootCause: formData.rootCause,
      resolutionNotes: formData.resolutionNotes,
      linkedMaintenanceId: ticket?.linkedMaintenanceId,
      history: [
        ...(ticket?.history || []),
        {
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: 'NOC Dispatcher',
          action: ticket ? `Updated status to ${formData.Etat}` : 'Created new ticket',
        },
      ],
    };

    onSave(updatedTicket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <h2 className="text-base font-bold text-white">
              {ticket ? `${t('modal_edit_title')} · ${ticket.id}` : t('modal_create_title')}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('modal_sub')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Incident Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              {t('incident_context')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: 'NETWORK_ALARM' }))}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors cursor-pointer ${
                  formData.type === 'NETWORK_ALARM'
                    ? 'border-red-500 bg-red-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Radio className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <div className="font-semibold">{t('network_alarms')}</div>
                  <div className="text-[10px] text-neutral-500">BSS, Microwave, Core</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: 'CUSTOMER_SUPPORT' }))}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors cursor-pointer ${
                  formData.type === 'CUSTOMER_SUPPORT'
                    ? 'border-blue-500 bg-blue-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <User className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold">{t('customer_requests')}</div>
                  <div className="text-[10px] text-neutral-500">Consumer & VIP Corporate</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData((p) => ({ ...p, type: 'HARDWARE_MAINTENANCE' }))}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors cursor-pointer ${
                  formData.type === 'HARDWARE_MAINTENANCE'
                    ? 'border-amber-500 bg-amber-950/20 text-white'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold">{t('hardware_interventions')}</div>
                  <div className="text-[10px] text-neutral-500">Power, GE, Clim, Battery</div>
                </div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('title_label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder={t('title_placeholder')}
              className={`w-full bg-neutral-950 border rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 ${
                errors.title ? 'border-red-500' : 'border-neutral-800'
              }`}
            />
            {errors.title && <p className="text-red-400 text-[11px] mt-1">{errors.title}</p>}
          </div>

          {/* Row 1: Priority & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('priority_filter')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.Priorite}
                onChange={(e) => setFormData((p) => ({ ...p, Priorite: e.target.value as Priority }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {OPTIONS.Priorite.map((p) => (
                  <option key={p} value={p}>
                    {p === 'Critical'
                      ? `${t('prio_critical')} (4h SLA)`
                      : p === 'Major'
                      ? `${t('prio_major')} (8h SLA)`
                      : `${t('prio_minor')} (24h SLA)`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('status_filter')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.Etat}
                onChange={(e) => setFormData((p) => ({ ...p, Etat: e.target.value as Etat }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {OPTIONS.Etat.map((e) => (
                  <option key={e} value={e}>
                    {e === 'OPEN'
                      ? t('status_open')
                      : e === 'IN_PROGRESS'
                      ? t('status_in_progress')
                      : e === 'PENDING_PARTS'
                      ? t('status_pending_parts')
                      : e === 'RESOLVED'
                      ? t('status_resolved')
                      : t('status_closed')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Cascading Category & Alarm Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                {t('category_label')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.Cat_alarme}
                onChange={(e) => handleCategoryChange(e.target.value as CatAlarme)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {OPTIONS.Cat_alarme.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} - {t(`cat_${cat.toLowerCase()}`) || CATEGORY_DESCRIPTIONS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                {t('alarm_label')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.Alarme}
                onChange={(e) => setFormData((p) => ({ ...p, Alarme: e.target.value }))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {formData.Cat_alarme &&
                  ALARME_MAPPING[formData.Cat_alarme]?.map((alm) => (
                    <option key={alm} value={alm}>
                      {alm}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 3: Assigned Team & Problem Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('assigned_label')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.Assigne_a}
                onChange={(e) => setFormData((p) => ({ ...p, Assigne_a: e.target.value as Assignee }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {OPTIONS.Assigne_a.map((team) => (
                  <option key={team} value={team}>
                    {team} ({TEAM_LABELS[team]?.role || team})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('problem_type_label')} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.Pbm_type}
                onChange={(e) => setFormData((p) => ({ ...p, Pbm_type: e.target.value as PbmType }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {OPTIONS.Pbm_type.map((pbm) => (
                  <option key={pbm} value={pbm}>
                    {pbm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional Customer Support Details */}
          {formData.type === 'CUSTOMER_SUPPORT' && (
            <div className="p-4 bg-blue-950/20 border border-blue-900/60 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                <User className="w-3.5 h-3.5" />
                <span>{t('customer_requests')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    {t('subscriber_phone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.msisdn}
                    onChange={(e) => setFormData((p) => ({ ...p, msisdn: e.target.value }))}
                    placeholder="+213 770 12 34 56"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  {errors.msisdn && <p className="text-red-400 text-[10px] mt-0.5">{errors.msisdn}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    {t('subscriber_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subscriberName}
                    onChange={(e) => setFormData((p) => ({ ...p, subscriberName: e.target.value }))}
                    placeholder="e.g. Sarl Maghreb Logistique"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  {errors.subscriberName && (
                    <p className="text-red-400 text-[10px] mt-0.5">{errors.subscriberName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">{t('customer_tier')}</label>
                  <select
                    value={formData.tier}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, tier: e.target.value as CustomerTier }))
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="CONSUMER">Consumer Prepaid/Postpaid</option>
                    <option value="BUSINESS_PRO">Business Pro (SME)</option>
                    <option value="VIP_CORPORATE">VIP Corporate Key Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">{t('subscription_plan')}</label>
                  <input
                    type="text"
                    value={formData.plan}
                    onChange={(e) => setFormData((p) => ({ ...p, plan: e.target.value }))}
                    placeholder="e.g. Djezzy Hadra Postpayé 2500"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BTS Site and Wilaya Association */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('site_code_label')}
              </label>
              <select
                value={formData.siteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {sites.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteId} - {s.name} ({s.wilaya})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">{t('wilaya_label')}</label>
              <select
                value={formData.wilaya}
                onChange={(e) => setFormData((p) => ({ ...p, wilaya: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {ALGERIA_WILAYAS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('desc_label')}
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder={t('desc_placeholder')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Root cause and resolution notes (if in progress or resolved) */}
          {(formData.Etat === 'RESOLVED' ||
            formData.Etat === 'CLOSE' ||
            formData.Etat === 'IN_PROGRESS') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t('root_cause_label')}
                </label>
                <input
                  type="text"
                  value={formData.rootCause}
                  onChange={(e) => setFormData((p) => ({ ...p, rootCause: e.target.value }))}
                  placeholder="e.g. Microwave dish misaligned by storm wind"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  {t('resolution_label')}
                </label>
                <input
                  type="text"
                  value={formData.resolutionNotes}
                  onChange={(e) => setFormData((p) => ({ ...p, resolutionNotes: e.target.value }))}
                  placeholder="e.g. Replaced DC surge arrester and aligned feeder"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-md transition-colors cursor-pointer"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors shadow-sm shadow-red-900/30 cursor-pointer"
            >
              {ticket ? t('btn_save') : t('btn_dispatch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
