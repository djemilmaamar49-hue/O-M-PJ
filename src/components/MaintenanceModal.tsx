import React, { useState, useEffect } from 'react';
import {
  MaintenanceSchedule,
  HardwareAsset,
  SiteInfo,
  EquipmentType,
  MaintenanceType,
  Assignee,
  Ticket,
} from '../types/telecom';
import {
  EQUIPMENT_TYPES,
  PM_CHECKLIST_TEMPLATES,
  CM_CHECKLIST_TEMPLATES,
  COMMON_SPARE_PARTS,
  OPTIONS,
  TEAM_LABELS,
} from '../data/telecomConstants';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Wrench,
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Zap,
  Package,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  preselectedTicket?: Ticket | null;
  preselectedAsset?: HardwareAsset | null;
  initialType?: MaintenanceType;
  assets: HardwareAsset[];
  sites: SiteInfo[];
  tickets?: Ticket[];
  onClose: () => void;
  onSave: (schedule: MaintenanceSchedule) => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  preselectedTicket,
  preselectedAsset,
  initialType = 'PREVENTIVE',
  assets,
  sites,
  tickets = [],
  onClose,
  onSave,
}) => {
  const { t, isRTL } = useLanguage();
  const [siteId, setSiteId] = useState('DZ-ALG-014');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('Generator (GE)');
  const [title, setTitle] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(initialType);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [assignedTechnician, setAssignedTechnician] = useState('Youcef Belkacem');
  const [assignedTeam, setAssignedTeam] = useState<Assignee>('O&M_ENV');
  const [estimatedHours, setEstimatedHours] = useState(3.5);
  const [urgencyLevel, setUrgencyLevel] = useState<'CRITICAL' | 'MAJOR' | 'STANDARD'>('MAJOR');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; label: string; completed: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [spareParts, setSpareParts] = useState<string[]>([]);
  const [customSparePart, setCustomSparePart] = useState('');

  // Synchronize initial state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (preselectedTicket) {
      if (preselectedTicket.siteId) {
        setSiteId(preselectedTicket.siteId);
      }
      setSelectedTicketId(preselectedTicket.id);
      setMaintenanceType('CORRECTIVE');
      setTitle(`Maintenance Corrective CM: ${preselectedTicket.Alarme} sur ${preselectedTicket.siteId || 'Site'}`);
      setNotes(`Intervention curative déclenchée suite à l'incident ${preselectedTicket.id} (${preselectedTicket.title}). Rétablissement prioritaire.`);

      if (preselectedTicket.Priorite === 'Critical') {
        setUrgencyLevel('CRITICAL');
        setEstimatedHours(2);
      } else if (preselectedTicket.Priorite === 'Major') {
        setUrgencyLevel('MAJOR');
        setEstimatedHours(3.5);
      } else {
        setUrgencyLevel('STANDARD');
        setEstimatedHours(4);
      }

      // Map alarm to equipment type
      if (preselectedTicket.Alarme === 'Battery') {
        setEquipmentType('Battery Bank');
        setAssignedTeam('O&M_ENV');
      } else if (preselectedTicket.Alarme === 'GE') {
        setEquipmentType('Generator (GE)');
        setAssignedTeam('O&M_ENV');
      } else if (preselectedTicket.Alarme === 'clim') {
        setEquipmentType('HVAC / Clim');
        setAssignedTeam('O&M_ENV');
      } else if (
        preselectedTicket.Alarme === 'Link Down' ||
        preselectedTicket.Alarme === 'BAD RSL' ||
        preselectedTicket.Cat_alarme === 'COMM'
      ) {
        setEquipmentType('Microwave Link');
        setAssignedTeam('ENG_TRANS');
      } else {
        setEquipmentType('BSS Cabinet (BTS/NodeB)');
        setAssignedTeam('ACCES_PROD');
      }
    } else if (preselectedAsset) {
      setSiteId(preselectedAsset.siteId);
      setEquipmentType(preselectedAsset.equipmentType);
      setMaintenanceType('EMERGENCY_REPAIR');
      setTitle(`Intervention d'Urgence CM: ${preselectedAsset.id} (${preselectedAsset.model})`);
      setNotes(`Alerte de dépassement seuil critique télémétrique: Inspection et réparation d'urgence pour ${preselectedAsset.model}. ${preselectedAsset.notes}`);
      setUrgencyLevel('CRITICAL');
      setEstimatedHours(2.5);

      if (preselectedAsset.equipmentType === 'Microwave Link') {
        setAssignedTeam('ENG_TRANS');
      } else if (preselectedAsset.equipmentType === 'BSS Cabinet (BTS/NodeB)') {
        setAssignedTeam('ACCES_PROD');
      } else {
        setAssignedTeam('O&M_ENV');
      }
    } else {
      setMaintenanceType(initialType);
      if (initialType === 'CORRECTIVE') {
        setTitle(`Maintenance Corrective (CM): Rétablissement ${equipmentType}`);
        setNotes('Ordre de travail curatif pour diagnostic et élimination de défaut sur site.');
        setUrgencyLevel('MAJOR');
        setEstimatedHours(3);
      } else {
        setTitle(`Maintenance Préventive Routinière (PM): ${equipmentType}`);
        setNotes('Inspection périodique de conformité et étalonnage des équipements.');
        setUrgencyLevel('STANDARD');
        setEstimatedHours(3.5);
      }
      setSelectedTicketId('');
    }
  }, [isOpen, preselectedTicket, preselectedAsset, initialType]);

  // Load appropriate checklist template (CM vs PM) whenever equipmentType or maintenanceType changes
  useEffect(() => {
    if (!isOpen) return;

    const templates =
      maintenanceType === 'CORRECTIVE' || maintenanceType === 'EMERGENCY_REPAIR'
        ? CM_CHECKLIST_TEMPLATES[equipmentType] || PM_CHECKLIST_TEMPLATES[equipmentType] || []
        : PM_CHECKLIST_TEMPLATES[equipmentType] || [];

    setChecklist(
      templates.map((label, idx) => ({
        id: `chk-${idx}-${Date.now()}`,
        label,
        completed: false,
      }))
    );

    // If not preselected ticket, update title to reflect CM / PM type
    if (!preselectedTicket && !preselectedAsset) {
      if (maintenanceType === 'CORRECTIVE') {
        setTitle(`Maintenance Corrective (CM): Rétablissement ${equipmentType}`);
      } else if (maintenanceType === 'EMERGENCY_REPAIR') {
        setTitle(`Intervention d'Urgence (EM): Réparation Critique ${equipmentType}`);
      } else {
        setTitle(`Maintenance Préventive (PM): Contrôle ${equipmentType}`);
      }
    }
  }, [equipmentType, maintenanceType, isOpen]);

  // When selectedTicketId changes in dropdown, auto-fill site and equipment if applicable
  const handleTicketSelectChange = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    if (!ticketId) return;

    const chosenTicket = tickets.find((t) => t.id === ticketId);
    if (chosenTicket) {
      if (chosenTicket.siteId) {
        setSiteId(chosenTicket.siteId);
      }
      setTitle(`Maintenance Corrective (CM): ${chosenTicket.Alarme} sur ${chosenTicket.siteId || 'Site'}`);
      setNotes(`Ordre de mission CM rattaché au ticket ${chosenTicket.id}: ${chosenTicket.title}`);

      if (chosenTicket.Alarme === 'Battery') {
        setEquipmentType('Battery Bank');
        setAssignedTeam('O&M_ENV');
      } else if (chosenTicket.Alarme === 'GE') {
        setEquipmentType('Generator (GE)');
        setAssignedTeam('O&M_ENV');
      } else if (chosenTicket.Alarme === 'clim') {
        setEquipmentType('HVAC / Clim');
        setAssignedTeam('O&M_ENV');
      } else if (
        chosenTicket.Alarme === 'Link Down' ||
        chosenTicket.Alarme === 'BAD RSL' ||
        chosenTicket.Cat_alarme === 'COMM'
      ) {
        setEquipmentType('Microwave Link');
        setAssignedTeam('ENG_TRANS');
      } else {
        setEquipmentType('BSS Cabinet (BTS/NodeB)');
        setAssignedTeam('ACCES_PROD');
      }
    }
  };

  const handleToggleSparePart = (part: string) => {
    if (spareParts.includes(part)) {
      setSpareParts((prev) => prev.filter((p) => p !== part));
    } else {
      setSpareParts((prev) => [...prev, part]);
    }
  };

  const handleAddCustomSparePart = () => {
    if (!customSparePart.trim()) return;
    const trimmed = customSparePart.trim();
    if (!spareParts.includes(trimmed)) {
      setSpareParts((prev) => [...prev, trimmed]);
    }
    setCustomSparePart('');
  };

  const handleAddCustomTask = () => {
    if (!newChecklistText.trim()) return;
    setChecklist((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: newChecklistText.trim(), completed: false },
    ]);
    setNewChecklistText('');
  };

  const handleRemoveTask = (taskId: string) => {
    setChecklist((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedSite = sites.find((s) => s.siteId === siteId);
    const asset = assets.find((a) => a.siteId === siteId && a.equipmentType === equipmentType);

    // Distinct prefix based on Maintenance Type: CM for Corrective, EM for Emergency, PM for Preventive
    const prefix =
      maintenanceType === 'CORRECTIVE'
        ? 'CM'
        : maintenanceType === 'EMERGENCY_REPAIR'
        ? 'EM'
        : 'PM';

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const scheduleId = `${prefix}-2026-${randomSuffix}`;

    const newSchedule: MaintenanceSchedule = {
      id: scheduleId,
      hardwareAssetId: asset ? asset.id : `HW-${siteId.slice(3, 6)}-${equipmentType.slice(0, 3)}`,
      siteId,
      siteName: selectedSite ? selectedSite.name : 'Djezzy BTS Node',
      wilaya: selectedSite ? selectedSite.wilaya : '16 - Alger',
      equipmentType,
      title: title || `${maintenanceType} sur ${equipmentType}`,
      maintenanceType,
      scheduledDate,
      dueDate,
      status: 'SCHEDULED',
      assignedTechnician: assignedTechnician || 'Équipe Technique Wilaya',
      assignedTeam,
      estimatedHours: Number(estimatedHours) || 3.5,
      tasksChecklist: checklist,
      notes,
      linkedTicketId: selectedTicketId || preselectedTicket?.id,
      sparePartsUsed: spareParts.length > 0 ? spareParts : undefined,
    };

    onSave(newSchedule);
    onClose();
  };

  if (!isOpen) return null;

  const isCM = maintenanceType === 'CORRECTIVE' || maintenanceType === 'EMERGENCY_REPAIR';
  const availableSpares = COMMON_SPARE_PARTS[equipmentType] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isCM ? 'border-amber-500/30 bg-amber-950/30' : 'border-neutral-800 bg-neutral-950/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isCM ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-neutral-800 text-blue-400'
            }`}>
              {isCM ? <Wrench className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {isCM ? t('schedule_cm_modal_title') : t('schedule_pm_modal_title')}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  maintenanceType === 'CORRECTIVE'
                    ? 'bg-amber-500 text-neutral-950'
                    : maintenanceType === 'EMERGENCY_REPAIR'
                    ? 'bg-red-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}>
                  {maintenanceType === 'CORRECTIVE' ? 'CM' : maintenanceType === 'EMERGENCY_REPAIR' ? 'EM' : 'PM'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isCM ? t('schedule_cm_modal_sub') : t('schedule_pm_modal_sub')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Type Switcher Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 text-xs">
          <button
            type="button"
            onClick={() => setMaintenanceType('CORRECTIVE')}
            className={`flex-1 py-2.5 px-4 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              maintenanceType === 'CORRECTIVE'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{t('type_corrective')} (CM)</span>
          </button>
          <button
            type="button"
            onClick={() => setMaintenanceType('PREVENTIVE')}
            className={`flex-1 py-2.5 px-4 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border-b-2 ${
              maintenanceType === 'PREVENTIVE'
                ? 'border-blue-400 text-blue-300 bg-blue-500/10'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('type_preventive')} (PM)</span>
          </button>
          <button
            type="button"
            onClick={() => setMaintenanceType('EMERGENCY_REPAIR')}
            className={`py-2.5 px-4 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
              maintenanceType === 'EMERGENCY_REPAIR'
                ? 'border-red-400 text-red-300 bg-red-500/10'
                : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('type_emergency')}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Preselected Ticket Banner */}
          {preselectedTicket && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-lg text-xs text-neutral-300 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300">{t('linked_ticket_note')}:</span>{' '}
                <span className="font-mono text-white font-bold">{preselectedTicket.id}</span> —{' '}
                <span className="text-neutral-200">{preselectedTicket.title}</span> ({preselectedTicket.Alarme})
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  La validation de cet ordre de travail basculera automatiquement le ticket en <span className="text-amber-300 font-semibold">EN COURS</span>.
                </div>
              </div>
            </div>
          )}

          {/* Link to Open Ticket Dropdown (if not preselected) */}
          {!preselectedTicket && tickets.length > 0 && isCM && (
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-1.5">
              <label className="block text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{t('cm_link_ticket_select')}</span>
              </label>
              <select
                value={selectedTicketId}
                onChange={(e) => handleTicketSelectChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">{t('cm_select_ticket_placeholder')}</option>
                {tickets
                  .filter((t) => t.Etat !== 'CLOSE' && t.Etat !== 'RESOLVED')
                  .map((tkt) => (
                    <option key={tkt.id} value={tkt.id}>
                      [{tkt.id}] {tkt.Priorite} · {tkt.siteId || 'Site'} · {tkt.Alarme} — {tkt.title.slice(0, 50)}...
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Row 1: Site & Equipment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('bts_infra_site')} <span className="text-red-500">*</span>
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {sites.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteId} - {s.name} ({s.wilaya})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('equipment_type')} <span className="text-red-500">*</span>
              </label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {EQUIPMENT_TYPES.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Work Order Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('work_order_title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maintenance Corrective: Remplacement SFP et réalignement antenne"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Row 2: Assigned Team & Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('assigned_label')}
              </label>
              <select
                value={assignedTeam}
                onChange={(e) => setAssignedTeam(e.target.value as Assignee)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {OPTIONS.Assigne_a.map((team) => (
                  <option key={team} value={team}>
                    {team} ({TEAM_LABELS[team]?.label})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('technician_label')}
              </label>
              <input
                type="text"
                value={assignedTechnician}
                onChange={(e) => setAssignedTechnician(e.target.value)}
                placeholder="e.g. Youcef Belkacem"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 3: SLA Urgency Window & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('cm_urgency_label')}</span>
              </label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="CRITICAL">{t('cm_urgency_critical')}</option>
                <option value="MAJOR">{t('cm_urgency_major')}</option>
                <option value="STANDARD">{t('cm_urgency_standard')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('duration_hours')}
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('scheduled_date')}
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                {t('due_date')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Spare Parts Section for CM Orders */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Package className="w-3.5 h-3.5" />
                <span>{t('cm_spare_parts_title')}</span>
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                {spareParts.length} {spareParts.length === 1 ? 'part' : 'parts'}
              </span>
            </div>

            {/* Quick add common parts chips */}
            {availableSpares.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">
                  Catalogue Pièces Courantes ({equipmentType}) :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableSpares.map((part) => {
                    const isSelected = spareParts.includes(part);
                    return (
                      <button
                        key={part}
                        type="button"
                        onClick={() => handleToggleSparePart(part)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs'
                            : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '+'}</span>
                        <span>{part}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom spare part input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customSparePart}
                onChange={(e) => setCustomSparePart(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSparePart();
                  }
                }}
                placeholder={t('cm_spare_parts_placeholder')}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomSparePart}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors cursor-pointer"
              >
                {t('btn_add_item')}
              </button>
            </div>

            {/* Selected parts tags */}
            {spareParts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {spareParts.map((part) => (
                  <span
                    key={part}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-neutral-800 text-neutral-200 border border-neutral-700"
                  >
                    <span>{part}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSparePart(part)}
                      className="text-neutral-400 hover:text-red-400 ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Checklist Customization */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isCM ? 'Protocole Curatif (SOP CM)' : t('standard_checklist')} ({equipmentType})
                </span>
              </span>
              <span className="text-[11px] text-neutral-500 font-normal">
                {checklist.length} étapes
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto p-2 bg-neutral-950 rounded border border-neutral-800">
              {checklist.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 p-1.5 bg-neutral-900 rounded text-xs text-neutral-200"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{task.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(task.id)}
                    className="text-neutral-500 hover:text-red-400 p-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTask();
                  }
                }}
                placeholder={t('add_custom_item')}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTask}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs transition-colors cursor-pointer"
              >
                {t('btn_add_item')}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('field_access_notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clé cadenas disponible auprès du gardien, habilitation travail en hauteur requise..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            <div className="text-[11px] text-neutral-400 font-mono">
              Réf : <span className="font-bold text-white">{isCM ? 'CM-2026-XXX' : 'PM-2026-XXX'}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-xs font-bold rounded transition-colors shadow-md cursor-pointer flex items-center gap-1.5 ${
                  isCM
                    ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-amber-950/50'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{isCM ? t('btn_issue_cm') : t('btn_issue_pm')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
