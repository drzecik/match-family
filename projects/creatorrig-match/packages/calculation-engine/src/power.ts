import { isFinitePositive, result, type CalculationResult } from './result.js';

export type ElectricalSafetyStatus = 'compatible' | 'incompatible' | 'unknown';

export interface VoltageRange {
  readonly min: number;
  readonly max: number;
}

export interface PowerLoad {
  readonly id: string;
  readonly selfPowered?: boolean;
  readonly powerWatts?: number;
  readonly acceptedVoltage?: VoltageRange;
  readonly requiredPdProfile?: string;
}

export interface PowerSource {
  readonly id: string;
  readonly outputVoltage?: number;
  readonly maxOutputWatts?: number;
  readonly energyWh?: number;
  readonly supportedPdProfiles?: readonly string[];
  readonly efficiencyPercent?: number;
}

export interface PowerCalculationInput {
  readonly loads: readonly PowerLoad[];
  readonly source?: PowerSource;
}

export interface PowerCalculation {
  readonly knownDemandWatts: number;
  readonly poweredLoadIds: readonly string[];
  readonly selfPoweredLoadIds: readonly string[];
  readonly safetyStatus: ElectricalSafetyStatus;
  readonly estimatedRuntimeHours?: number;
  readonly powerHeadroomWatts?: number;
}

function isValidVoltageRange(range: VoltageRange): boolean {
  return isFinitePositive(range.min) && isFinitePositive(range.max) && range.min <= range.max;
}

export function calculatePower(input: PowerCalculationInput): CalculationResult<PowerCalculation> {
  const missingData: string[] = [];
  const issues = [];
  const poweredLoads = input.loads.filter((load) => !load.selfPowered);
  const selfPoweredLoadIds = input.loads.filter((load) => load.selfPowered).map((load) => load.id);
  let knownDemandWatts = 0;
  let safetyStatus: ElectricalSafetyStatus = 'compatible';

  for (const load of poweredLoads) {
    if (isFinitePositive(load.powerWatts)) {
      knownDemandWatts += load.powerWatts;
    } else {
      missingData.push(`loads.${load.id}.powerWatts`);
      safetyStatus = 'unknown';
    }
  }

  const source = input.source;
  if (poweredLoads.length === 0) {
    // A rig containing only self-powered devices has no external power-path requirement.
  } else if (source === undefined) {
    missingData.push('source');
    safetyStatus = 'unknown';
  } else {
    for (const load of poweredLoads) {
      if (load.acceptedVoltage === undefined) {
        missingData.push(`loads.${load.id}.acceptedVoltage`);
        safetyStatus = 'unknown';
      } else if (!isValidVoltageRange(load.acceptedVoltage)) {
        missingData.push(`loads.${load.id}.acceptedVoltage`);
        safetyStatus = 'unknown';
        issues.push({
          code: 'POWER_INVALID_ACCEPTED_VOLTAGE',
          message: "The load's accepted voltage range is invalid and cannot establish safety.",
          severity: 'error' as const,
          subjectId: load.id,
        });
      } else if (!isFinitePositive(source.outputVoltage)) {
        missingData.push('source.outputVoltage');
        safetyStatus = 'unknown';
      } else if (
        source.outputVoltage < load.acceptedVoltage.min ||
        source.outputVoltage > load.acceptedVoltage.max
      ) {
        safetyStatus = 'incompatible';
        issues.push({
          code: 'POWER_VOLTAGE_MISMATCH',
          message: "Source voltage is outside the load's verified accepted range.",
          severity: 'error' as const,
          subjectId: load.id,
        });
      }

      if (load.requiredPdProfile !== undefined) {
        if (source.supportedPdProfiles === undefined) {
          missingData.push('source.supportedPdProfiles');
          if (safetyStatus !== 'incompatible') safetyStatus = 'unknown';
        } else if (!source.supportedPdProfiles.includes(load.requiredPdProfile)) {
          safetyStatus = 'incompatible';
          issues.push({
            code: 'POWER_PD_PROFILE_MISMATCH',
            message: "The power source does not advertise the load's required USB PD profile.",
            severity: 'error' as const,
            subjectId: load.id,
          });
        }
      }
    }

    if (isFinitePositive(source.maxOutputWatts)) {
      if (missingData.every((field) => !field.endsWith('powerWatts'))) {
        if (knownDemandWatts > source.maxOutputWatts) {
          safetyStatus = 'incompatible';
          issues.push({
            code: 'POWER_SOURCE_OVERLOADED',
            message: "Combined known demand exceeds the source's verified output power.",
            severity: 'error' as const,
          });
        }
      }
    } else {
      missingData.push('source.maxOutputWatts');
      if (safetyStatus !== 'incompatible') safetyStatus = 'unknown';
    }
  }

  const value: { -readonly [K in keyof PowerCalculation]: PowerCalculation[K] } = {
    knownDemandWatts,
    poweredLoadIds: poweredLoads.map((load) => load.id),
    selfPoweredLoadIds,
    safetyStatus,
  };

  if (source !== undefined && isFinitePositive(source.maxOutputWatts)) {
    value.powerHeadroomWatts = source.maxOutputWatts - knownDemandWatts;
  }
  if (source !== undefined && isFinitePositive(source.energyWh) && knownDemandWatts > 0) {
    if (isFinitePositive(source.efficiencyPercent) && source.efficiencyPercent <= 100) {
      value.estimatedRuntimeHours =
        (source.energyWh * source.efficiencyPercent) / 100 / knownDemandWatts;
    } else {
      missingData.push('source.efficiencyPercent');
    }
  } else if (poweredLoads.length > 0) {
    missingData.push('source.energyWh');
  }

  return result(value, [...new Set(missingData)], issues);
}
