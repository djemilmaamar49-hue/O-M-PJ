import { HardwareAsset, HardwareTelemetry, EquipmentType } from '../types/telecom';

export type RiskLevel = 'nominal' | 'moderate' | 'high' | 'critical';

export interface RiskFactor {
  parameter: string;
  value: string;
  threshold: string;
  severity: 'warning' | 'critical';
  description: string;
}

export interface AssetRiskAssessment {
  assetId: string;
  asset: HardwareAsset;
  score: number; // 0 to 100
  level: RiskLevel;
  isNearingCritical: boolean;
  factors: RiskFactor[];
  primaryThreat: string;
  recommendedAction: string;
  urgencyHours: number;
}

/**
 * Calculates a quantitative 'Risk Score' (0 - 100) for a hardware asset
 * based on live telemetry readings, equipment type thresholds, and maintenance cadence.
 */
export function calculateAssetRiskScore(
  asset: HardwareAsset,
  referenceDateStr: string = '2026-09-27'
): AssetRiskAssessment {
  let score = 0;
  const factors: RiskFactor[] = [];
  const telemetry = asset.telemetry || {};

  // 1. Base score from declared equipment health state
  if (asset.health === 'Critical') {
    score += 25;
  } else if (asset.health === 'Degraded') {
    score += 15;
  }

  // 2. Maintenance cadence & overdue calculation
  const refDate = new Date(referenceDateStr).getTime();
  const nextPmDate = new Date(asset.nextMaintenanceDate).getTime();
  const daysOverdue = Math.round((refDate - nextPmDate) / (1000 * 60 * 60 * 24));

  if (daysOverdue > 0) {
    if (daysOverdue >= 14) {
      score += 25;
      factors.push({
        parameter: 'PM Cadence',
        value: `${daysOverdue} days overdue`,
        threshold: 'SLA target: 0 days',
        severity: 'critical',
        description: `Routine inspection is ${daysOverdue} days past schedule, elevating wear and failure probability.`,
      });
    } else {
      score += 15;
      factors.push({
        parameter: 'PM Cadence',
        value: `${daysOverdue} days overdue`,
        threshold: 'SLA target: 0 days',
        severity: 'warning',
        description: `Preventive maintenance cycle exceeded by ${daysOverdue} days.`,
      });
    }
  }

  // 3. Equipment-specific telemetry thresholds
  switch (asset.equipmentType) {
    case 'Generator (GE)': {
      // Fuel Level Telemetry
      if (telemetry.fuelLevelPercent !== undefined) {
        if (telemetry.fuelLevelPercent <= 15) {
          score += 45;
          factors.push({
            parameter: 'Fuel Reserve',
            value: `${telemetry.fuelLevelPercent}%`,
            threshold: 'Critical cutoff: ≤ 15%',
            severity: 'critical',
            description: 'Critical fuel starvation risk. Engine cutoff imminent on grid failover.',
          });
        } else if (telemetry.fuelLevelPercent <= 30) {
          score += 25;
          factors.push({
            parameter: 'Fuel Reserve',
            value: `${telemetry.fuelLevelPercent}%`,
            threshold: 'Low reserve: ≤ 30%',
            severity: 'warning',
            description: 'Fuel level is in low reserve band. Tank refuel dispatch needed.',
          });
        } else if (telemetry.fuelLevelPercent <= 40) {
          score += 10;
        }
      }

      // Run Hours
      if (telemetry.runHours !== undefined) {
        if (telemetry.runHours >= 3500) {
          score += 25;
          factors.push({
            parameter: 'Engine Run Hours',
            value: `${telemetry.runHours} hrs`,
            threshold: 'Overhaul threshold: ≥ 3000 hrs',
            severity: 'warning',
            description: 'High engine accumulated runtime requires major service and oil replacement.',
          });
        } else if (telemetry.runHours >= 2000) {
          score += 15;
        }
      }

      // Generator Temperature
      if (telemetry.temperatureCelsius !== undefined) {
        if (telemetry.temperatureCelsius >= 85) {
          score += 40;
          factors.push({
            parameter: 'Coolant Temperature',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Overheat limit: ≥ 85°C',
            severity: 'critical',
            description: 'Engine coolant temperature dangerously high; cooling circuit blockage suspected.',
          });
        } else if (telemetry.temperatureCelsius >= 80) {
          score += 20;
          factors.push({
            parameter: 'Operating Temperature',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Warning: ≥ 80°C',
            severity: 'warning',
            description: 'Generator running hot near upper thermal threshold.',
          });
        }
      }
      break;
    }

    case 'Battery Bank': {
      // 48V Battery String Voltage
      if (telemetry.batteryVoltage !== undefined) {
        if (telemetry.batteryVoltage <= 46.5) {
          score += 55;
          factors.push({
            parameter: 'String Voltage',
            value: `${telemetry.batteryVoltage}V`,
            threshold: 'Low Voltage Disconnect (LVD): ≤ 46.5V',
            severity: 'critical',
            description: 'Cell collapse / deep discharge imminent. Site total power loss imminent.',
          });
        } else if (telemetry.batteryVoltage <= 48.0) {
          score += 35;
          factors.push({
            parameter: 'String Voltage',
            value: `${telemetry.batteryVoltage}V`,
            threshold: 'Discharge warning: ≤ 48.0V',
            severity: 'warning',
            description: 'Battery string discharging below nominal 48V float level.',
          });
        } else if (telemetry.batteryVoltage <= 50.0) {
          score += 15;
        }
      }

      // Autonomy Hours Estimated
      if (telemetry.autonomyHoursEstimated !== undefined) {
        if (telemetry.autonomyHoursEstimated <= 2.0) {
          score += 45;
          factors.push({
            parameter: 'Autonomy Backup',
            value: `${telemetry.autonomyHoursEstimated} hrs`,
            threshold: 'Critical minimum: ≤ 2.0 hrs',
            severity: 'critical',
            description: 'Backup reserve reduced below critical margin of 2 hours.',
          });
        } else if (telemetry.autonomyHoursEstimated <= 3.5) {
          score += 25;
          factors.push({
            parameter: 'Autonomy Backup',
            value: `${telemetry.autonomyHoursEstimated} hrs`,
            threshold: 'Warning: ≤ 3.5 hrs',
            severity: 'warning',
            description: 'Battery autonomy degraded below 4-hour SLA standard.',
          });
        }
      }

      // Battery Temperature
      if (telemetry.temperatureCelsius !== undefined) {
        if (telemetry.temperatureCelsius >= 35) {
          score += 30;
          factors.push({
            parameter: 'Battery Room Temp',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Thermal runaway threshold: ≥ 35°C',
            severity: 'warning',
            description: 'High ambient temperature drastically reduces battery life and risks thermal runaway.',
          });
        }
      }
      break;
    }

    case 'HVAC / Clim': {
      // Shelter Temperature
      if (telemetry.temperatureCelsius !== undefined) {
        if (telemetry.temperatureCelsius >= 37.0) {
          score += 55;
          factors.push({
            parameter: 'Shelter Temperature',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Thermal trip limit: ≥ 37.0°C',
            severity: 'critical',
            description: 'Clim compressor failure causing severe overheating; active BTS cards risk thermal shutdown.',
          });
        } else if (telemetry.temperatureCelsius >= 32.0) {
          score += 30;
          factors.push({
            parameter: 'Shelter Temperature',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Warning: ≥ 32.0°C',
            severity: 'warning',
            description: 'Air conditioning efficiency compromised; cooling coils or filter blocked.',
          });
        } else if (telemetry.temperatureCelsius >= 28.0) {
          score += 15;
        }
      }
      break;
    }

    case 'Microwave Link': {
      // Received Signal Level (RSL dBm)
      if (telemetry.rslDbm !== undefined) {
        if (telemetry.rslDbm <= -68.0) {
          score += 55;
          factors.push({
            parameter: 'Microwave RSL',
            value: `${telemetry.rslDbm} dBm`,
            threshold: 'Fade margin limit: ≤ -68.0 dBm',
            severity: 'critical',
            description: 'Severe microwave attenuation; link sync loss and BER frame drops imminent.',
          });
        } else if (telemetry.rslDbm <= -64.0) {
          score += 30;
          factors.push({
            parameter: 'Microwave RSL',
            value: `${telemetry.rslDbm} dBm`,
            threshold: 'Degraded band: ≤ -64.0 dBm',
            severity: 'warning',
            description: 'Received signal level degraded below link planning threshold.',
          });
        } else if (telemetry.rslDbm <= -60.0) {
          score += 15;
        }
      }
      break;
    }

    case 'Rectifier 48V': {
      if (telemetry.batteryVoltage !== undefined) {
        if (telemetry.batteryVoltage <= 47.0 || telemetry.batteryVoltage >= 57.0) {
          score += 45;
          factors.push({
            parameter: 'DC Bus Output',
            value: `${telemetry.batteryVoltage}V`,
            threshold: 'Normal window: 52V - 54.5V',
            severity: 'critical',
            description: 'Rectifier module DC output voltage abnormal; power conversion fault.',
          });
        }
      }
      if (telemetry.temperatureCelsius !== undefined && telemetry.temperatureCelsius >= 35) {
        score += 25;
        factors.push({
          parameter: 'Module Temp',
          value: `${telemetry.temperatureCelsius}°C`,
          threshold: 'Max: 35°C',
          severity: 'warning',
          description: 'Power rectifier internal temperature approaching overload trip.',
        });
      }
      break;
    }

    case 'BSS Cabinet (BTS/NodeB)': {
      if (telemetry.temperatureCelsius !== undefined) {
        if (telemetry.temperatureCelsius >= 35) {
          score += 45;
          factors.push({
            parameter: 'Cabinet Internal Temp',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Max: ≥ 35°C',
            severity: 'critical',
            description: 'Digital baseband unit thermal protection threshold approached.',
          });
        } else if (telemetry.temperatureCelsius >= 30) {
          score += 20;
          factors.push({
            parameter: 'Cabinet Internal Temp',
            value: `${telemetry.temperatureCelsius}°C`,
            threshold: 'Warning: ≥ 30°C',
            severity: 'warning',
            description: 'Base station cabinet fans running at max RPM due to high heat.',
          });
        }
      }
      break;
    }

    default: {
      if (telemetry.temperatureCelsius !== undefined && telemetry.temperatureCelsius >= 40) {
        score += 35;
        factors.push({
          parameter: 'Equipment Temperature',
          value: `${telemetry.temperatureCelsius}°C`,
          threshold: 'Max: ≥ 40°C',
          severity: 'warning',
          description: 'High equipment operating temperature detected.',
        });
      }
      break;
    }
  }

  // Cap score between 0 and 100
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Categorize Risk Level
  let level: RiskLevel = 'nominal';
  if (normalizedScore >= 80) {
    level = 'critical';
  } else if (normalizedScore >= 65) {
    level = 'high';
  } else if (normalizedScore >= 40) {
    level = 'moderate';
  }

  // An asset is nearing critical failure if:
  // - Risk Score >= 65, OR
  // - Has at least one 'critical' telemetry violation
  const isNearingCritical =
    normalizedScore >= 65 || factors.some((f) => f.severity === 'critical');

  // Estimate failure window / urgency
  let urgencyHours = 720; // 30 days default
  if (normalizedScore >= 85) {
    urgencyHours = 12;
  } else if (normalizedScore >= 70) {
    urgencyHours = 36;
  } else if (normalizedScore >= 50) {
    urgencyHours = 96;
  } else if (normalizedScore >= 35) {
    urgencyHours = 240;
  }

  // Determine Primary Threat and Actionable Recommendation
  let primaryThreat = 'Operating within safe parameters';
  let recommendedAction = 'Continue standard routine monitoring';

  if (factors.length > 0) {
    const worstFactor = factors.find((f) => f.severity === 'critical') || factors[0];
    primaryThreat = `${worstFactor.parameter}: ${worstFactor.description}`;
    
    switch (asset.equipmentType) {
      case 'Battery Bank':
        recommendedAction = 'Dispatch field power technician to check individual cell impedance and verify rectifier charger output.';
        break;
      case 'Generator (GE)':
        recommendedAction = 'Dispatch emergency fuel logistics tanker and inspect diesel radiator cooling circuit.';
        break;
      case 'HVAC / Clim':
        recommendedAction = 'Dispatch AC technician to replace clogged air filters and inspect compressor refrigerant levels.';
        break;
      case 'Microwave Link':
        recommendedAction = 'Perform emergency antenna azimuth re-alignment and verify waveguide/coaxial connectors.';
        break;
      case 'Rectifier 48V':
        recommendedAction = 'Hot-swap faulty rectifier modules and verify AC mains supply balancing.';
        break;
      default:
        recommendedAction = 'Schedule priority preventive maintenance inspection immediately.';
        break;
    }
  }

  return {
    assetId: asset.id,
    asset,
    score: normalizedScore,
    level,
    isNearingCritical,
    factors,
    primaryThreat,
    recommendedAction,
    urgencyHours,
  };
}

/**
 * Filter and sort assets nearing critical failure thresholds (highest risk score first).
 */
export function getAssetsNearingFailure(
  assets: HardwareAsset[],
  thresholdScore: number = 65,
  referenceDateStr?: string
): AssetRiskAssessment[] {
  return assets
    .map((asset) => calculateAssetRiskScore(asset, referenceDateStr))
    .filter((assessment) => assessment.isNearingCritical || assessment.score >= thresholdScore)
    .sort((a, b) => b.score - a.score);
}
