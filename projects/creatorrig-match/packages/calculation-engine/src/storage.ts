import { isFiniteNonNegative, isFinitePositive, result, type CalculationResult } from './result.js';

const BYTES_PER_GIGABYTE = 1_000_000_000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;

export interface StorageCalculationInput {
  /** Decimal megabits per second, as published by camera manufacturers. */
  readonly bitrateMbps?: number;
  readonly plannedDurationSeconds?: number;
  /** Decimal GB, matching media vendor labels. */
  readonly cardCapacityGB?: number;
  readonly safetyMarginPercent?: number;
  readonly supportedCapacitiesGB?: readonly number[];
  readonly cardSustainedWriteMBps?: number;
  readonly cardVideoSpeedClass?: StandardVideoSpeedClass;
}

export type StandardVideoSpeedClass = 'V6' | 'V10' | 'V30' | 'V60' | 'V90';
export type VideoSpeedClass = StandardVideoSpeedClass | 'above_v90';

export interface StorageCalculation {
  readonly bytesPerSecond: number;
  readonly bytesPerMinute: number;
  readonly bytesPerHour: number;
  readonly minimumSustainedWriteMBps: number;
  readonly recommendedSustainedWriteMBps: number;
  readonly minimumVideoSpeedClass: VideoSpeedClass;
  readonly recommendedVideoSpeedClass: VideoSpeedClass;
  readonly safetyMarginPercent: number;
  readonly estimatedBytes?: number;
  readonly requiredBytesWithMargin?: number;
  readonly recordableSeconds?: number;
  readonly cardCapacitySufficientForPlannedDuration?: boolean;
  readonly selectedCapacitySupported?: boolean;
  readonly cardWriteSpeedSufficient?: boolean;
  readonly cardVideoSpeedClassSufficient?: boolean;
}

const VIDEO_SPEED_CLASS_MBPS: Readonly<Record<StandardVideoSpeedClass, number>> = {
  V6: 6,
  V10: 10,
  V30: 30,
  V60: 60,
  V90: 90,
};

function videoSpeedClassFor(requiredMBps: number): VideoSpeedClass {
  if (requiredMBps <= 6) return 'V6';
  if (requiredMBps <= 10) return 'V10';
  if (requiredMBps <= 30) return 'V30';
  if (requiredMBps <= 60) return 'V60';
  if (requiredMBps <= 90) return 'V90';
  return 'above_v90';
}

export function calculateStorage(
  input: StorageCalculationInput,
): CalculationResult<StorageCalculation> {
  const missingData: string[] = [];
  const issues = [];

  if (!isFinitePositive(input.bitrateMbps)) {
    missingData.push('bitrateMbps');
    issues.push({
      code: 'STORAGE_BITRATE_REQUIRED',
      message: 'A positive bitrate is required for storage calculations.',
      severity: 'error' as const,
    });
    return result<StorageCalculation>(undefined, missingData, issues);
  }

  const requestedMargin = input.safetyMarginPercent ?? 20;
  const safetyMarginPercent = isFiniteNonNegative(requestedMargin) ? requestedMargin : 20;
  if (safetyMarginPercent !== requestedMargin) {
    issues.push({
      code: 'STORAGE_INVALID_MARGIN',
      message: 'Invalid safety margin was replaced with the default 20%.',
      severity: 'warning' as const,
    });
  }

  const bytesPerSecond = (input.bitrateMbps * 1_000_000) / 8;
  const minimumSustainedWriteMBps = bytesPerSecond / 1_000_000;
  const marginMultiplier = 1 + safetyMarginPercent / 100;
  const value: { -readonly [K in keyof StorageCalculation]: StorageCalculation[K] } = {
    bytesPerSecond,
    bytesPerMinute: bytesPerSecond * SECONDS_PER_MINUTE,
    bytesPerHour: bytesPerSecond * SECONDS_PER_HOUR,
    minimumSustainedWriteMBps,
    recommendedSustainedWriteMBps: minimumSustainedWriteMBps * marginMultiplier,
    minimumVideoSpeedClass: videoSpeedClassFor(minimumSustainedWriteMBps),
    recommendedVideoSpeedClass: videoSpeedClassFor(minimumSustainedWriteMBps * marginMultiplier),
    safetyMarginPercent,
  };

  if (isFiniteNonNegative(input.plannedDurationSeconds)) {
    value.estimatedBytes = bytesPerSecond * input.plannedDurationSeconds;
    value.requiredBytesWithMargin = value.estimatedBytes * marginMultiplier;
  } else {
    missingData.push('plannedDurationSeconds');
  }

  if (isFinitePositive(input.cardCapacityGB)) {
    value.recordableSeconds = (input.cardCapacityGB * BYTES_PER_GIGABYTE) / bytesPerSecond;

    if (value.requiredBytesWithMargin !== undefined) {
      value.cardCapacitySufficientForPlannedDuration =
        input.cardCapacityGB * BYTES_PER_GIGABYTE >= value.requiredBytesWithMargin;
      if (!value.cardCapacitySufficientForPlannedDuration) {
        issues.push({
          code: 'STORAGE_CAPACITY_TOO_SMALL',
          message: 'The selected card capacity does not cover the planned duration with margin.',
          severity: 'error' as const,
        });
      }
    }

    if (input.supportedCapacitiesGB !== undefined) {
      value.selectedCapacitySupported = input.supportedCapacitiesGB.some(
        (capacity) => capacity === input.cardCapacityGB,
      );
      if (!value.selectedCapacitySupported) {
        issues.push({
          code: 'STORAGE_CAPACITY_UNSUPPORTED',
          message: "The selected capacity is not in the device's verified capacity list.",
          severity: 'error' as const,
        });
      }
    } else {
      missingData.push('supportedCapacitiesGB');
    }
  } else {
    missingData.push('cardCapacityGB');
  }

  if (isFinitePositive(input.cardSustainedWriteMBps)) {
    value.cardWriteSpeedSufficient =
      input.cardSustainedWriteMBps >= value.recommendedSustainedWriteMBps;
    if (!value.cardWriteSpeedSufficient) {
      issues.push({
        code: 'STORAGE_CARD_TOO_SLOW',
        message:
          'The verified sustained write speed is below the recommended rate with safety margin.',
        severity: 'error' as const,
      });
    }
  } else {
    missingData.push('cardSustainedWriteMBps');
  }

  if (input.cardVideoSpeedClass !== undefined) {
    const verifiedClassSpeed = VIDEO_SPEED_CLASS_MBPS[input.cardVideoSpeedClass];
    value.cardVideoSpeedClassSufficient = verifiedClassSpeed >= value.recommendedSustainedWriteMBps;
    if (!value.cardVideoSpeedClassSufficient) {
      issues.push({
        code: 'STORAGE_SPEED_CLASS_TOO_LOW',
        message: "The card's video speed class is below the class required with safety margin.",
        severity: 'error' as const,
      });
    }
  } else {
    missingData.push('cardVideoSpeedClass');
  }

  return result(value, missingData, issues);
}
