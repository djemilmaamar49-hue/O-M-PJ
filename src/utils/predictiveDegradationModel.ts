import { HardwareAsset } from '../types/telecom';

export interface TimelineDataPoint {
  timeLabel: string;
  dayOffset: number; // -30 to +60
  isHistorical: boolean;
  isProjected: boolean;
  // Dynamic fields per asset: [assetId]: healthIndex (0-100) or riskScore (0-100)
  [key: string]: string | number | boolean;
}

export interface AssetFailurePrediction {
  assetId: string;
  model: string;
  siteId: string;
  siteName: string;
  wilaya: string;
  equipmentType: string;
  currentHealth: number; // 0-100
  currentRiskScore: number; // 0-100
  estimatedDaysToFailure: number;
  projectedFailureDate: string;
  failureMode: string;
  failureThresholdNote: string;
  confidenceScore: number; // e.g. 94%
  recommendedAction: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SubsystemRiskProjection {
  subsystem: string;
  risk30Days: number;
  risk60Days: number;
  risk90Days: number;
  activeAssetsCount: number;
  criticalAssetsCount: number;
}

/**
 * Returns time series data points for charts showing degradation over time
 * from -30 days historical to +60 days projected.
 */
export function generateDegradationTimelineData(assets: HardwareAsset[]): {
  timeline: TimelineDataPoint[];
  predictions: AssetFailurePrediction[];
  subsystemRisks: SubsystemRiskProjection[];
} {
  // Key timeline points
  const timeLabels = [
    { label: '-30d (Historical)', dayOffset: -30, isHistorical: true, isProjected: false },
    { label: '-21d', dayOffset: -21, isHistorical: true, isProjected: false },
    { label: '-14d', dayOffset: -14, isHistorical: true, isProjected: false },
    { label: '-7d', dayOffset: -7, isHistorical: true, isProjected: false },
    { label: 'Today (Live)', dayOffset: 0, isHistorical: false, isProjected: false },
    { label: '+7d (Proj)', dayOffset: 7, isHistorical: false, isProjected: true },
    { label: '+14d (Proj)', dayOffset: 14, isHistorical: false, isProjected: true },
    { label: '+21d (Proj)', dayOffset: 21, isHistorical: false, isProjected: true },
    { label: '+30d (Proj)', dayOffset: 30, isHistorical: false, isProjected: true },
    { label: '+45d (Proj)', dayOffset: 45, isHistorical: false, isProjected: true },
    { label: '+60d (Proj)', dayOffset: 60, isHistorical: false, isProjected: true },
  ];

  // Specific degradation curves per known asset
  // Lower healthIndex = higher risk of failure. Critical threshold is < 30%.
  const timeline: TimelineDataPoint[] = timeLabels.map((t) => {
    const point: TimelineDataPoint = {
      timeLabel: t.label,
      dayOffset: t.dayOffset,
      isHistorical: t.isHistorical,
      isProjected: t.isProjected,
      failureThreshold: 30, // Reference line threshold (<30% health = failure)
    };

    // Calculate health index for each asset at this offset
    assets.forEach((asset) => {
      let health = 95;
      const d = t.dayOffset;

      if (asset.id === 'HW-BAT-014') {
        // Rapid drop: -30d: 82% -> 0d: 28% -> +7d: 14% -> +14d: 4%
        if (d <= 0) {
          health = Math.round(28 + Math.pow(Math.abs(d) / 30, 1.2) * 54);
        } else {
          health = Math.max(0, Math.round(28 - (d / 14) * 26));
        }
      } else if (asset.id === 'HW-CLM-105') {
        // HVAC sand clog: -30d: 88% -> 0d: 32% -> +7d: 18% -> +14d: 6%
        if (d <= 0) {
          health = Math.round(32 + Math.pow(Math.abs(d) / 30, 1.1) * 56);
        } else {
          health = Math.max(0, Math.round(32 - (d / 14) * 24));
        }
      } else if (asset.id === 'HW-GE-014') {
        // Generator overdue & fuel depletion: -30d: 86% -> 0d: 42% -> +7d: 22% -> +14d: 5%
        if (d <= 0) {
          health = Math.round(42 + Math.pow(Math.abs(d) / 30, 1.15) * 44);
        } else {
          health = Math.max(0, Math.round(42 - (d / 14) * 32));
        }
      } else if (asset.id === 'HW-MW-045') {
        // Microwave link fade: -30d: 92% -> 0d: 36% -> +7d: 20% -> +14d: 8%
        if (d <= 0) {
          health = Math.round(36 + Math.pow(Math.abs(d) / 30, 1.2) * 56);
        } else {
          health = Math.max(0, Math.round(36 - (d / 14) * 25));
        }
      } else if (asset.health === 'Degraded') {
        // Generic degraded: -30d: 85% -> 0d: 55% -> +30d: 32%
        if (d <= 0) {
          health = Math.round(55 + (Math.abs(d) / 30) * 30);
        } else {
          health = Math.max(0, Math.round(55 - (d / 30) * 25));
        }
      } else {
        // Nominal equipment aging gracefully: -30d: 98% -> 0d: 95% -> +60d: 88%
        if (d <= 0) {
          health = Math.round(95 + (Math.abs(d) / 30) * 3);
        } else {
          health = Math.max(0, Math.round(95 - (d / 60) * 8));
        }
      }

      point[asset.id] = health;
      // Inverted Risk Score (100 - health)
      point[`${asset.id}_risk`] = Math.min(100, Math.max(0, 100 - health));
    });

    return point;
  });

  // Calculate concrete predictions per asset
  const predictions: AssetFailurePrediction[] = [
    {
      assetId: 'HW-BAT-014',
      model: 'Narada 48V 1000Ah AGM Telecom Bank',
      siteId: 'DZ-ALG-014',
      siteName: 'Kouba Plateau Hub',
      wilaya: '16 - Alger',
      equipmentType: 'Battery Bank',
      currentHealth: 28,
      currentRiskScore: 92,
      estimatedDaysToFailure: 3,
      projectedFailureDate: '2026-09-30',
      failureMode: 'Low Voltage Disconnect (LVD ≤ 46.0V) & Cell Imbalance',
      failureThresholdNote: 'Current 46.2V / Autonomy 1.8h (SLA cutoff: 46.5V)',
      confidenceScore: 96,
      recommendedAction: 'Immediate battery string cell bypass or replacement; emergency generator lock-on.',
      urgency: 'CRITICAL',
    },
    {
      assetId: 'HW-CLM-105',
      model: 'Daikin SkyAir Tropical Heavy-Duty 24k BTU',
      siteId: 'DZ-OGL-105',
      siteName: 'Hassi Messaoud Sonatrach Base',
      wilaya: '30 - Ouargla',
      equipmentType: 'HVAC / Clim',
      currentHealth: 31,
      currentRiskScore: 88,
      estimatedDaysToFailure: 5,
      projectedFailureDate: '2026-10-02',
      failureMode: 'Compressor Thermal Trip (Shelter ≥ 40°C)',
      failureThresholdNote: 'Current 37.8°C / Coils desert sand clogged (Max limit: 37.0°C)',
      confidenceScore: 94,
      recommendedAction: 'Dispatch desert HVAC team to flush clogged condensing coils and recharge refrigerant.',
      urgency: 'CRITICAL',
    },
    {
      assetId: 'HW-GE-014',
      model: 'FG Wilson P65-3 Diesel GenSet',
      siteId: 'DZ-ALG-014',
      siteName: 'Kouba Plateau Hub',
      wilaya: '16 - Alger',
      equipmentType: 'Generator (GE)',
      currentHealth: 42,
      currentRiskScore: 84,
      estimatedDaysToFailure: 6,
      projectedFailureDate: '2026-10-03',
      failureMode: 'Fuel Starvation & Injector Pressure Loss',
      failureThresholdNote: 'Current 34% Fuel / 1420h / PM 12 days overdue',
      confidenceScore: 95,
      recommendedAction: 'Dispatch fuel logistics tanker (500L diesel) and replace fuel/oil filters.',
      urgency: 'CRITICAL',
    },
    {
      assetId: 'HW-MW-045',
      model: 'NEC iPASOLINK EX Advanced 80GHz',
      siteId: 'DZ-CST-045',
      siteName: 'Ali Mendjeli Ville Nouvelle',
      wilaya: '25 - Constantine',
      equipmentType: 'Microwave Link',
      currentHealth: 36,
      currentRiskScore: 78,
      estimatedDaysToFailure: 8,
      projectedFailureDate: '2026-10-05',
      failureMode: 'RF Fade Margin Collapse / Bit Error Outage',
      failureThresholdNote: 'Current -68.4 dBm RSL (Fade margin cutoff: -68.0 dBm)',
      confidenceScore: 91,
      recommendedAction: 'Tower climber team for antenna pan/tilt azimuth realignment and waveguide seal verification.',
      urgency: 'HIGH',
    },
    {
      assetId: 'HW-REC-088',
      model: 'Eltek Flatpack2 Modular 48V 300A',
      siteId: 'DZ-ALG-088',
      siteName: 'Hydra Business Center',
      wilaya: '16 - Alger',
      equipmentType: 'Rectifier 48V',
      currentHealth: 96,
      currentRiskScore: 12,
      estimatedDaysToFailure: 180,
      projectedFailureDate: '2027-03-25',
      failureMode: 'Normal Module Thermal Aging',
      failureThresholdNote: 'Current 53.5V / 24°C nominal float voltage',
      confidenceScore: 98,
      recommendedAction: 'Routine quarterly inspection scheduled for next month.',
      urgency: 'LOW',
    },
    {
      assetId: 'HW-BSS-031',
      model: 'Ericsson RBS 6102 Multi-Standard GSM/LTE',
      siteId: 'DZ-BLD-031',
      siteName: 'Chréa Mountain Backbone Relay',
      wilaya: '09 - Blida',
      equipmentType: 'BSS Cabinet (BTS/NodeB)',
      currentHealth: 97,
      currentRiskScore: 10,
      estimatedDaysToFailure: 240,
      projectedFailureDate: '2027-05-20',
      failureMode: 'Nominal Mountain Operating Baseline',
      failureThresholdNote: 'Current 21°C internal cabinet temperature',
      confidenceScore: 97,
      recommendedAction: 'Routine semi-annual inspection.',
      urgency: 'LOW',
    },
  ];

  // Subsystem Risk Projections (30, 60, 90 day compounded failure probability)
  const subsystemRisks: SubsystemRiskProjection[] = [
    {
      subsystem: 'Battery Banks (48V)',
      risk30Days: 85,
      risk60Days: 94,
      risk90Days: 98,
      activeAssetsCount: 4,
      criticalAssetsCount: 2,
    },
    {
      subsystem: 'HVAC / Climate Units',
      risk30Days: 78,
      risk60Days: 89,
      risk90Days: 95,
      activeAssetsCount: 3,
      criticalAssetsCount: 1,
    },
    {
      subsystem: 'Diesel Generators (GE)',
      risk30Days: 72,
      risk60Days: 84,
      risk90Days: 91,
      activeAssetsCount: 4,
      criticalAssetsCount: 1,
    },
    {
      subsystem: 'Microwave Backhaul',
      risk30Days: 64,
      risk60Days: 75,
      risk90Days: 82,
      activeAssetsCount: 3,
      criticalAssetsCount: 1,
    },
    {
      subsystem: 'Power Rectifiers (DC)',
      risk30Days: 14,
      risk60Days: 22,
      risk90Days: 31,
      activeAssetsCount: 3,
      criticalAssetsCount: 0,
    },
    {
      subsystem: 'Base Station (BSS/NodeB)',
      risk30Days: 10,
      risk60Days: 16,
      risk90Days: 25,
      activeAssetsCount: 5,
      criticalAssetsCount: 0,
    },
  ];

  return {
    timeline,
    predictions,
    subsystemRisks,
  };
}
