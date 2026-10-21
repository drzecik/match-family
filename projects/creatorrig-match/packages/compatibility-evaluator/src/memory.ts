import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export interface DeviceMediaSupport {
  readonly format: string;
  readonly maximumCapacityGB?: number;
  readonly filesystems?: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface RecordingModeMediaRequirements {
  readonly mediaFormats: readonly string[];
  readonly minimumSustainedWriteMBps?: number;
  readonly minimumSpeedClassMBps?: number;
  readonly evidenceIds: readonly string[];
}

export interface RecordingModeProfile {
  readonly id: string;
  readonly bitrateMbps?: number;
  readonly mediaRequirements: RecordingModeMediaRequirements;
  readonly evidenceIds: readonly string[];
}

export interface MemoryCardProfile {
  readonly id: string;
  readonly format: string;
  readonly capacityGB: number;
  readonly sustainedWriteMBps?: number;
  readonly guaranteedSpeedClassMBps?: number;
  readonly filesystem?: string;
  readonly evidenceIds: readonly string[];
}

export interface MemoryEvaluationInput {
  readonly deviceMedia: readonly DeviceMediaSupport[];
  readonly mode: RecordingModeProfile;
  readonly card: MemoryCardProfile;
  readonly safetyHeadroom?: number;
  readonly usableCapacityRatio?: number;
}

export interface MemoryCompatibilityEvaluation extends BaseEvaluation {
  readonly requiredSustainedWriteMBps?: number;
  readonly recommendedSustainedWriteMBps?: number;
  readonly estimatedRecordingSeconds?: number;
  readonly estimatedStorageGBPerHour?: number;
  readonly performanceHeadroom: 'insufficient' | 'appropriate' | 'excessive' | 'unknown';
  readonly dimensions: {
    readonly format: EvaluationDimension;
    readonly capacity: EvaluationDimension;
    readonly sustainedWrite: EvaluationDimension;
    readonly speedClass: EvaluationDimension;
    readonly filesystem: EvaluationDimension;
  };
}

export function evaluateMemoryCompatibility(
  input: MemoryEvaluationInput,
): MemoryCompatibilityEvaluation {
  const safetyHeadroom = Math.max(input.safetyHeadroom ?? 1.25, 1);
  const usableCapacityRatio = clamp(input.usableCapacityRatio ?? 0.95, 0.5, 1);
  const { card, mode } = input;
  const deviceSupport = input.deviceMedia.find((item) => item.format === card.format);
  const modeSupportsFormat = mode.mediaRequirements.mediaFormats.includes(card.format);
  const formatWorks = deviceSupport !== undefined && modeSupportsFormat;
  const capacityWorks =
    deviceSupport?.maximumCapacityGB === undefined ||
    card.capacityGB <= deviceSupport.maximumCapacityGB;
  const bitrateWriteMBps = mode.bitrateMbps === undefined ? undefined : mode.bitrateMbps / 8;
  const requiredSustainedWriteMBps = maximumDefined(
    bitrateWriteMBps,
    mode.mediaRequirements.minimumSustainedWriteMBps,
  );
  const recommendedSustainedWriteMBps =
    requiredSustainedWriteMBps === undefined
      ? undefined
      : requiredSustainedWriteMBps * safetyHeadroom;
  const requiredClass = mode.mediaRequirements.minimumSpeedClassMBps;
  const filesystemWorks =
    !card.filesystem ||
    !deviceSupport?.filesystems ||
    deviceSupport.filesystems.includes(card.filesystem);
  const estimatedStorageGBPerHour =
    mode.bitrateMbps === undefined ? undefined : (mode.bitrateMbps * 3_600) / 8_000;
  const estimatedRecordingSeconds =
    mode.bitrateMbps === undefined
      ? undefined
      : (card.capacityGB * usableCapacityRatio * 8_000) / mode.bitrateMbps;

  const warnings: string[] = [];
  if (!formatWorks)
    warnings.push('The card format is not supported by both the device and recording mode.');
  if (!capacityWorks) warnings.push('The card exceeds the documented maximum capacity.');
  if (requiredSustainedWriteMBps === undefined)
    warnings.push('No bitrate or sustained-write requirement is available.');
  if (card.sustainedWriteMBps === undefined)
    warnings.push('The card has no documented sustained write speed.');
  if (requiredClass !== undefined && card.guaranteedSpeedClassMBps === undefined) {
    warnings.push('The card has no documented guaranteed speed class.');
  }
  if (!filesystemWorks)
    warnings.push('The card filesystem is not documented as supported by the device.');

  const format: EvaluationDimension = {
    status: formatWorks ? 'compatible' : 'incompatible',
    explanation: formatWorks
      ? `${card.format} is supported by the device and recording mode.`
      : `${card.format} is not supported by both the device and recording mode.`,
  };
  const capacity: EvaluationDimension = {
    status: capacityWorks ? 'compatible' : 'incompatible',
    explanation: capacityWorks
      ? 'Card capacity is within the documented device limit.'
      : `${card.capacityGB} GB exceeds the ${deviceSupport?.maximumCapacityGB ?? 'unknown'} GB device limit.`,
  };
  const sustainedWrite = sustainedDimension(card.sustainedWriteMBps, recommendedSustainedWriteMBps);
  const speedClass = speedClassDimension(card.guaranteedSpeedClassMBps, requiredClass);
  const filesystem: EvaluationDimension = {
    status: filesystemWorks ? 'compatible' : 'incompatible',
    explanation: filesystemWorks
      ? 'The filesystem is supported or no filesystem constraint is declared.'
      : `Filesystem ${card.filesystem ?? 'unknown'} is not supported.`,
  };
  const evidenced =
    input.deviceMedia.length > 0 &&
    input.deviceMedia.every((support) => support.evidenceIds.length > 0) &&
    mode.evidenceIds.length > 0 &&
    mode.mediaRequirements.evidenceIds.length > 0 &&
    card.evidenceIds.length > 0;
  const status = aggregateEvaluationStatus({
    evidenced,
    dimensions: [format, capacity, sustainedWrite, speedClass, filesystem],
  });
  const performanceHeadroom = determineHeadroom(
    card.sustainedWriteMBps,
    recommendedSustainedWriteMBps,
  );

  return {
    status,
    ...(requiredSustainedWriteMBps === undefined ? {} : { requiredSustainedWriteMBps }),
    ...(recommendedSustainedWriteMBps === undefined ? {} : { recommendedSustainedWriteMBps }),
    ...(estimatedRecordingSeconds === undefined ? {} : { estimatedRecordingSeconds }),
    ...(estimatedStorageGBPerHour === undefined ? {} : { estimatedStorageGBPerHour }),
    performanceHeadroom,
    limitations:
      performanceHeadroom === 'excessive'
        ? [
            'The card offers at least three times the recommended sustained-write performance; a cheaper tier may suffice.',
          ]
        : [],
    warnings,
    evidenceIds: unique([
      ...mode.evidenceIds,
      ...mode.mediaRequirements.evidenceIds,
      ...card.evidenceIds,
      ...(deviceSupport?.evidenceIds ?? []),
    ]),
    dimensions: {
      format,
      capacity,
      sustainedWrite,
      speedClass,
      filesystem,
    },
  };
}

function sustainedDimension(
  actual: number | undefined,
  required: number | undefined,
): EvaluationDimension {
  if (required === undefined)
    return { status: 'unknown', explanation: 'Required sustained write speed is unknown.' };
  if (actual === undefined)
    return { status: 'unknown', explanation: 'Card sustained write speed is unknown.' };
  return actual >= required
    ? {
        status: 'compatible',
        explanation: `${actual} MB/s meets the ${round(required)} MB/s recommendation.`,
      }
    : {
        status: 'incompatible',
        explanation: `${actual} MB/s is below the ${round(required)} MB/s recommendation.`,
      };
}

function speedClassDimension(
  actual: number | undefined,
  required: number | undefined,
): EvaluationDimension {
  if (required === undefined)
    return {
      status: 'not_applicable',
      explanation: 'This mode declares no speed-class requirement.',
    };
  if (actual === undefined)
    return { status: 'unknown', explanation: 'Card guaranteed speed class is unknown.' };
  return actual >= required
    ? {
        status: 'compatible',
        explanation: `${actual} MB/s class meets the ${required} MB/s requirement.`,
      }
    : {
        status: 'incompatible',
        explanation: `${actual} MB/s class is below the ${required} MB/s requirement.`,
      };
}

function determineHeadroom(
  actual: number | undefined,
  recommended: number | undefined,
): MemoryCompatibilityEvaluation['performanceHeadroom'] {
  if (actual === undefined || recommended === undefined) return 'unknown';
  if (actual < recommended) return 'insufficient';
  if (actual >= recommended * 3) return 'excessive';
  return 'appropriate';
}

function maximumDefined(...values: readonly (number | undefined)[]): number | undefined {
  const defined = values.filter((value): value is number => value !== undefined);
  return defined.length === 0 ? undefined : Math.max(...defined);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
