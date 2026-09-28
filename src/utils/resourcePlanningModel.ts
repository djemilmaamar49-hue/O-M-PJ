import { MaintenanceSchedule, HardwareAsset, Ticket } from '../types/telecom';

export interface TechnicianForecast {
  teamId: string;
  teamName: string;
  specialty: string;
  availableTechs: number;
  requiredTechs30Days: number;
  scheduledHours: number;
  predictiveFailureHours: number;
  totalForecastedHours: number;
  utilizationRate: number; // e.g. 115%
  status: 'DEFICIT' | 'OPTIMAL' | 'SURPLUS';
  deficitCount: number; // e.g. -2 techs
  peakRegion: string;
  keyWorkloadDrivers: string[];
}

export interface RegionalTechAllocation {
  region: string;
  availableTechs: number;
  requiredTechs: number;
  activeSites: number;
  scheduledPMs: number;
  predictedOutages: number;
  status: 'SHORTAGE' | 'BALANCED' | 'CAPACITY';
}

export interface SparePartForecast {
  sku: string;
  partName: string;
  category: 'ENERGY' | 'HVAC' | 'TRANSMISSION' | 'RADIO' | 'FIBER';
  warehouseLocation: string;
  currentStock: number;
  scheduledDemand: number;
  predictedFailureDemand: number;
  total30DayDemand: number;
  projectedStockRemaining: number;
  minimumSafetyStock: number;
  daysOfSupply: number;
  reorderStatus: 'CRITICAL_SHORTAGE' | 'LOW_STOCK' | 'SUFFICIENT';
  recommendedReorderQty: number;
  unitCostDZD: number;
  leadTimeDays: number;
}

export interface ResourcePlanningData {
  technicianForecasts: TechnicianForecast[];
  regionalAllocations: RegionalTechAllocation[];
  sparePartsInventory: SparePartForecast[];
  summary: {
    totalAvailableTechs: number;
    totalRequiredTechs: number;
    netStaffingDeficit: number;
    totalForecastedManHours: number;
    criticalPartsShortageCount: number;
    totalEstimatedReorderCostDZD: number;
  };
}

export function calculateResourcePlan(
  schedules: MaintenanceSchedule[],
  assets: HardwareAsset[],
  tickets: Ticket[]
): ResourcePlanningData {
  // 1. Technician Forecasts by Unit
  const technicianForecasts: TechnicianForecast[] = [
    {
      teamId: 'O&M_ENV',
      teamName: 'O&M Énergie & Environnement',
      specialty: 'Generators (GE), Battery Banks 48V, HVAC Clim & Rectifiers',
      availableTechs: 8,
      requiredTechs30Days: 11,
      scheduledHours: 540,
      predictiveFailureHours: 420, // Battery string collapse, desert HVAC flushes, GE fuel/oil overhauls
      totalForecastedHours: 960,
      utilizationRate: 125,
      status: 'DEFICIT',
      deficitCount: 3,
      peakRegion: 'Centre & Sud (Ouargla)',
      keyWorkloadDrivers: [
        'Kouba 48V Battery Bank emergency cell replacement',
        'Hassi Messaoud high-temperature HVAC coil desanding',
        'Quarterly diesel generator fuel filter overhaul cycles',
      ],
    },
    {
      teamId: 'ENG_TRANS',
      teamName: 'Ingénierie Transmission & Faisceaux',
      specialty: 'Microwave 80GHz Links, Tower Rigging & Optical Backbone',
      availableTechs: 6,
      requiredTechs30Days: 7,
      scheduledHours: 320,
      predictiveFailureHours: 240, // High-wind azimuth re-alignments, optical attenuation fixes
      totalForecastedHours: 560,
      utilizationRate: 116,
      status: 'DEFICIT',
      deficitCount: 1,
      peakRegion: 'Est (Constantine)',
      keyWorkloadDrivers: [
        'Constantine Ali Mendjeli 80GHz dish pan/tilt realignment',
        'SDH ring fiber protection verification post-cable cut',
        'Microwave radome seal & waveguide inspection',
      ],
    },
    {
      teamId: 'ACCES_PROD',
      teamName: 'Accès Radio BSS / RAN',
      specialty: '2G/3G/4G/5G Base Station Subsystems, NodeB, RRU & Antennas',
      availableTechs: 9,
      requiredTechs30Days: 8,
      scheduledHours: 410,
      predictiveFailureHours: 190,
      totalForecastedHours: 600,
      utilizationRate: 92,
      status: 'OPTIMAL',
      deficitCount: 0,
      peakRegion: 'Centre & Ouest',
      keyWorkloadDrivers: [
        'Chréa Mountain Backbone RBS semi-annual inspection',
        'NodeB Remote Radio Unit lightning surge reset',
        'Feeder jumper VSWR sweep testing',
      ],
    },
    {
      teamId: 'rollout',
      teamName: 'Déploiement & Travaux Spéciaux',
      specialty: 'Tower Masts, Guy Wires, Civil Infrastructure & Lightning Earthing',
      availableTechs: 5,
      requiredTechs30Days: 4,
      scheduledHours: 260,
      predictiveFailureHours: 70,
      totalForecastedHours: 330,
      utilizationRate: 82,
      status: 'SURPLUS',
      deficitCount: 0,
      peakRegion: 'Ouest (Oran Aéroport)',
      keyWorkloadDrivers: [
        'Oran airport 45m mast guy wire dynamometer tensioning',
        'Grounding earthing pits resistance calibration (<5 Ohms)',
        'Site security fencing & aviation beacon checks',
      ],
    },
  ];

  // 2. Regional Technician Allocation Breakdown
  const regionalAllocations: RegionalTechAllocation[] = [
    {
      region: 'Centre (Alger, Blida)',
      availableTechs: 11,
      requiredTechs: 13,
      activeSites: 3,
      scheduledPMs: 4,
      predictedOutages: 2,
      status: 'SHORTAGE',
    },
    {
      region: 'Est (Constantine, Annaba, Sétif)',
      availableTechs: 7,
      requiredTechs: 8,
      activeSites: 3,
      scheduledPMs: 2,
      predictedOutages: 1,
      status: 'SHORTAGE',
    },
    {
      region: 'Sud (Ouargla, Hassi Messaoud)',
      availableTechs: 4,
      requiredTechs: 6,
      activeSites: 1,
      scheduledPMs: 2,
      predictedOutages: 2,
      status: 'SHORTAGE',
    },
    {
      region: 'Ouest (Oran, Tlemcen)',
      availableTechs: 6,
      requiredTechs: 5,
      activeSites: 1,
      scheduledPMs: 1,
      predictedOutages: 0,
      status: 'CAPACITY',
    },
  ];

  // 3. Spare Parts Inventory & 30-Day Demand Forecast
  const sparePartsInventory: SparePartForecast[] = [
    {
      sku: 'BAT-NAR-12V-250',
      partName: 'Narada 12V 250Ah AGM Telecom Battery Block',
      category: 'ENERGY',
      warehouseLocation: 'Rouiba Central Warehouse (Alger)',
      currentStock: 14,
      scheduledDemand: 8,
      predictedFailureDemand: 16, // Kouba and secondary strings failing
      total30DayDemand: 24,
      projectedStockRemaining: -10, // Deficit!
      minimumSafetyStock: 12,
      daysOfSupply: 9,
      reorderStatus: 'CRITICAL_SHORTAGE',
      recommendedReorderQty: 40,
      unitCostDZD: 42000,
      leadTimeDays: 7,
    },
    {
      sku: 'FLT-GE-FGW-KIT',
      partName: 'FG Wilson Diesel Generator Dual Filter Kit (Oil + Fuel)',
      category: 'ENERGY',
      warehouseLocation: 'Rouiba Central Warehouse (Alger)',
      currentStock: 9,
      scheduledDemand: 6,
      predictedFailureDemand: 8,
      total30DayDemand: 14,
      projectedStockRemaining: -5,
      minimumSafetyStock: 8,
      daysOfSupply: 11,
      reorderStatus: 'CRITICAL_SHORTAGE',
      recommendedReorderQty: 25,
      unitCostDZD: 16500,
      leadTimeDays: 5,
    },
    {
      sku: 'CLM-DKN-MESH-TRP',
      partName: 'Daikin Tropical Anti-Sand Pre-Filter Frame',
      category: 'HVAC',
      warehouseLocation: 'Hassi Messaoud Regional Depot',
      currentStock: 6,
      scheduledDemand: 4,
      predictedFailureDemand: 6,
      total30DayDemand: 10,
      projectedStockRemaining: -4,
      minimumSafetyStock: 6,
      daysOfSupply: 12,
      reorderStatus: 'CRITICAL_SHORTAGE',
      recommendedReorderQty: 20,
      unitCostDZD: 12000,
      leadTimeDays: 4,
    },
    {
      sku: 'MW-NEC-ODU-80G',
      partName: 'NEC iPASOLINK EX 80GHz ODU Transceiver Board',
      category: 'TRANSMISSION',
      warehouseLocation: 'Constantine Regional Depot',
      currentStock: 4,
      scheduledDemand: 1,
      predictedFailureDemand: 2,
      total30DayDemand: 3,
      projectedStockRemaining: 1,
      minimumSafetyStock: 3,
      daysOfSupply: 18,
      reorderStatus: 'LOW_STOCK',
      recommendedReorderQty: 6,
      unitCostDZD: 185000,
      leadTimeDays: 14,
    },
    {
      sku: 'PWR-SPD-48V-40KA',
      partName: 'Type 1+2 DC Power Surge Protection Cartridge (40kA)',
      category: 'ENERGY',
      warehouseLocation: 'Rouiba Central Warehouse (Alger)',
      currentStock: 18,
      scheduledDemand: 4,
      predictedFailureDemand: 6,
      total30DayDemand: 10,
      projectedStockRemaining: 8,
      minimumSafetyStock: 10,
      daysOfSupply: 22,
      reorderStatus: 'LOW_STOCK',
      recommendedReorderQty: 20,
      unitCostDZD: 8500,
      leadTimeDays: 5,
    },
    {
      sku: 'REC-MOD-ELT-48V',
      partName: 'Eltek Flatpack2 48V 3000W High-Efficiency Rectifier Module',
      category: 'ENERGY',
      warehouseLocation: 'Rouiba Central Warehouse (Alger)',
      currentStock: 12,
      scheduledDemand: 2,
      predictedFailureDemand: 2,
      total30DayDemand: 4,
      projectedStockRemaining: 8,
      minimumSafetyStock: 5,
      daysOfSupply: 45,
      reorderStatus: 'SUFFICIENT',
      recommendedReorderQty: 0,
      unitCostDZD: 78000,
      leadTimeDays: 10,
    },
    {
      sku: 'OPT-SFP-10G-LR',
      partName: 'Single-Mode 10Gbps SFP+ Optical Transceiver 1310nm 10km',
      category: 'FIBER',
      warehouseLocation: 'Rouiba Central Warehouse (Alger)',
      currentStock: 35,
      scheduledDemand: 6,
      predictedFailureDemand: 4,
      total30DayDemand: 10,
      projectedStockRemaining: 25,
      minimumSafetyStock: 15,
      daysOfSupply: 52,
      reorderStatus: 'SUFFICIENT',
      recommendedReorderQty: 0,
      unitCostDZD: 14500,
      leadTimeDays: 3,
    },
    {
      sku: 'GAS-R410A-11KG',
      partName: 'Refrigerant R410A Pressurized Tank (11.3 kg Cylinder)',
      category: 'HVAC',
      warehouseLocation: 'Rouiba Central Warehouse (Alger)',
      currentStock: 8,
      scheduledDemand: 2,
      predictedFailureDemand: 4,
      total30DayDemand: 6,
      projectedStockRemaining: 2,
      minimumSafetyStock: 4,
      daysOfSupply: 16,
      reorderStatus: 'LOW_STOCK',
      recommendedReorderQty: 10,
      unitCostDZD: 22000,
      leadTimeDays: 4,
    },
  ];

  // Totals & KPIs
  const totalAvailableTechs = technicianForecasts.reduce((sum, t) => sum + t.availableTechs, 0);
  const totalRequiredTechs = technicianForecasts.reduce((sum, t) => sum + t.requiredTechs30Days, 0);
  const netStaffingDeficit = Math.max(0, totalRequiredTechs - totalAvailableTechs);
  const totalForecastedManHours = technicianForecasts.reduce(
    (sum, t) => sum + t.totalForecastedHours,
    0
  );

  const criticalPartsShortageCount = sparePartsInventory.filter(
    (p) => p.reorderStatus === 'CRITICAL_SHORTAGE'
  ).length;

  const totalEstimatedReorderCostDZD = sparePartsInventory.reduce((sum, p) => {
    return sum + p.recommendedReorderQty * p.unitCostDZD;
  }, 0);

  return {
    technicianForecasts,
    regionalAllocations,
    sparePartsInventory,
    summary: {
      totalAvailableTechs,
      totalRequiredTechs,
      netStaffingDeficit,
      totalForecastedManHours,
      criticalPartsShortageCount,
      totalEstimatedReorderCostDZD,
    },
  };
}
