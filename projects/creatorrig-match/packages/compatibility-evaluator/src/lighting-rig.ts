import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';
import type { VerificationStatus } from './media-path.js';

export interface LightProfile {
  readonly id: string;
  readonly standMountInput: string;
  readonly modifierMount: string;
  readonly bodyDiameterMm: number;
  readonly minimumModifierClearApertureMm: number;
  readonly weightGrams: number;
  readonly powerMode: 'self_powered' | 'external_required' | 'unknown';
  readonly inputVoltageV: number;
  readonly requiredPowerWatts: number;
  readonly wirelessProtocols: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface LightModifierProfile {
  readonly id: string;
  readonly mountInput: string;
  readonly mountOutput?: string;
  readonly maximumLightDiameterMm: number;
  readonly clearApertureMm: number;
  readonly weightGrams: number;
  readonly evidenceIds: readonly string[];
}

export interface LightGridProfile {
  readonly id: string;
  readonly mountInput: string;
  readonly weightGrams: number;
  readonly evidenceIds: readonly string[];
}

export interface LightStandProfile {
  readonly id: string;
  readonly mountOutput: string;
  readonly maxPayloadGrams: number;
  readonly evidenceIds: readonly string[];
}

export interface LightPowerSourceProfile {
  readonly id: string;
  readonly outputVoltageV: number;
  readonly maxPowerWatts: number;
  readonly compatibleLightIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface LightingControllerProfile {
  readonly id: string;
  readonly wirelessProtocols: readonly string[];
  readonly compatibleLightIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface LightingRigClaim {
  readonly id: string;
  readonly lightId: string;
  readonly modifierId?: string;
  readonly gridId?: string;
  readonly standId: string;
  readonly powerSourceId?: string;
  readonly controllerId?: string;
  readonly totalMountedWeightGrams: number;
  readonly requiredPayloadMarginPercent: number;
  readonly requiredVoltageV: number;
  readonly requiredPowerWatts: number;
  readonly wirelessProtocol?: string;
  readonly controlRequired: boolean;
  readonly collisionStatus: 'clear' | 'conflict' | 'unknown';
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface LightingRigEvaluationInput {
  readonly light: LightProfile;
  readonly modifier?: LightModifierProfile;
  readonly grid?: LightGridProfile;
  readonly stand: LightStandProfile;
  readonly powerSource?: LightPowerSourceProfile;
  readonly controller?: LightingControllerProfile;
  readonly requiredPayloadMarginPercent: number;
  readonly controlRequired: boolean;
  readonly claim: LightingRigClaim;
}

export interface LightingRigEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly requiredItemIds: readonly string[];
  readonly requiredStandCapacityGrams?: number;
  readonly dimensions: {
    readonly mountChain: EvaluationDimension;
    readonly modifierDiameter: EvaluationDimension;
    readonly standPayload: EvaluationDimension;
    readonly electricalPower: EvaluationDimension;
    readonly wirelessControl: EvaluationDimension;
    readonly evidence: EvaluationDimension;
  };
}

export function evaluateLightingRig(input: LightingRigEvaluationInput): LightingRigEvaluation {
  const evidence = evaluateEvidence(input);
  const evidenced = evidence.status === 'compatible';
  const requiredStandCapacityGrams = validNonNegative(input.requiredPayloadMarginPercent)
    ? input.claim.totalMountedWeightGrams * (1 + input.requiredPayloadMarginPercent / 100)
    : undefined;
  const dimensions = {
    mountChain: evaluateMounts(input, evidenced),
    modifierDiameter: evaluateModifier(input, evidenced),
    standPayload: evaluateStand(input, requiredStandCapacityGrams, evidenced),
    electricalPower: evaluateElectrical(input, evidenced),
    wirelessControl: evaluateControl(input, evidenced),
    evidence,
  };
  const results = Object.values(dimensions);
  const limitations = unique(input.claim.limitations);
  const warnings = unique(
    results
      .filter(({ status }) => status === 'unknown' || status === 'incompatible')
      .map(({ explanation }) => explanation),
  );

  const status = aggregateEvaluationStatus({ evidenced, dimensions: results, limitations });
  const positive = status === 'directly_compatible' || status === 'compatible_with_limitations';

  return {
    status,
    conditions: unique(input.claim.conditions),
    requiredItemIds: positive
      ? [
          input.stand.id,
          ...(input.modifier === undefined ? [] : [input.modifier.id]),
          ...(input.grid === undefined ? [] : [input.grid.id]),
          ...(input.light.powerMode === 'external_required' && input.powerSource !== undefined
            ? [input.powerSource.id]
            : []),
          ...(input.controlRequired && input.controller !== undefined ? [input.controller.id] : []),
        ]
      : [],
    ...(requiredStandCapacityGrams === undefined ? {} : { requiredStandCapacityGrams }),
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenced
      ? unique([
          ...input.light.evidenceIds,
          ...(input.modifier?.evidenceIds ?? []),
          ...(input.grid?.evidenceIds ?? []),
          ...input.stand.evidenceIds,
          ...(input.powerSource?.evidenceIds ?? []),
          ...(input.controller?.evidenceIds ?? []),
          ...input.claim.evidenceIds,
        ])
      : [],
  };
}

function evaluateEvidence(input: LightingRigEvaluationInput): EvaluationDimension {
  const subjects: Array<readonly [string, readonly string[], string]> = [
    [input.light.id, input.light.evidenceIds, 'light'],
    [input.stand.id, input.stand.evidenceIds, 'stand'],
    [input.claim.id, input.claim.evidenceIds, 'exact lighting claim'],
  ];
  if (input.modifier !== undefined) {
    subjects.push([input.modifier.id, input.modifier.evidenceIds, 'modifier']);
  }
  if (input.grid !== undefined) subjects.push([input.grid.id, input.grid.evidenceIds, 'grid']);
  if (input.powerSource !== undefined) {
    subjects.push([input.powerSource.id, input.powerSource.evidenceIds, 'power source']);
  }
  if (input.controller !== undefined) {
    subjects.push([input.controller.id, input.controller.evidenceIds, 'controller']);
  }
  const missing = subjects
    .filter(([id, ids]) => !nonEmpty(id) || !ids.some(nonEmpty))
    .map(([, , label]) => label);
  if (missing.length > 0) return unknown(`Scoped evidence is missing for: ${missing.join(', ')}.`);
  if (input.claim.verificationStatus !== 'verified') {
    return unknown(`Lighting claim status ${input.claim.verificationStatus} is not verified.`);
  }
  if (!claimMatches(input))
    return unknown('Lighting claim does not exactly match the selected rig.');
  return compatible('Every lighting component and exact rig claim carry verified evidence.');
}

function evaluateMounts(
  input: LightingRigEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Lighting mount facts lack verified evidence.');
  const { light, modifier, grid, stand } = input;
  if (![light.standMountInput, stand.mountOutput].every(nonEmpty)) {
    return unknown('A light or stand mount identity is missing.');
  }
  if (stand.mountOutput !== light.standMountInput) {
    return incompatible('Stand output does not match the exact light stand input.');
  }
  if (modifier !== undefined && !nonEmpty(light.modifierMount)) {
    return unknown('The light modifier mount identity is missing.');
  }
  if (modifier !== undefined && modifier.mountInput !== light.modifierMount) {
    return incompatible('Modifier input does not match the exact light modifier mount.');
  }
  if (grid !== undefined) {
    const gridUpstreamMount = modifier?.mountOutput ?? light.modifierMount;
    if (!nonEmpty(gridUpstreamMount)) return unknown('Grid upstream mount identity is missing.');
    if (grid.mountInput !== gridUpstreamMount) {
      return incompatible('Grid input does not match the exact upstream modifier mount.');
    }
  }
  return compatible('Stand, light, modifier, and grid mounts align exactly.');
}

function evaluateModifier(
  input: LightingRigEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (input.modifier === undefined) {
    return { status: 'not_applicable', explanation: 'No light modifier is selected.' };
  }
  if (!evidenced) return unknown('Modifier diameter facts lack verified evidence.');
  const { light, modifier } = input;
  if (
    !validPositive(light.bodyDiameterMm) ||
    !validPositive(light.minimumModifierClearApertureMm) ||
    !validPositive(modifier.maximumLightDiameterMm) ||
    !validPositive(modifier.clearApertureMm)
  ) {
    return unknown('A light-body or modifier clear-aperture diameter is missing.');
  }
  if (
    light.bodyDiameterMm > modifier.maximumLightDiameterMm ||
    modifier.clearApertureMm < light.minimumModifierClearApertureMm
  ) {
    return incompatible(
      'Modifier does not meet the exact light diameter or clear-aperture requirement.',
    );
  }
  if (input.claim.collisionStatus === 'unknown') {
    return unknown('Exact modifier collision clearance is not confirmed.');
  }
  if (input.claim.collisionStatus === 'conflict') {
    return incompatible('Scoped evidence documents a modifier collision in this exact rig.');
  }
  return compatible(
    'Modifier diameter, clear aperture, and exact collision clearance are confirmed.',
  );
}

function evaluateStand(
  input: LightingRigEvaluationInput,
  requiredCapacity: number | undefined,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Stand payload facts lack verified evidence.');
  if (requiredCapacity === undefined || !validPositive(input.stand.maxPayloadGrams)) {
    return unknown('Mounted weight, payload margin, or stand capacity is missing.');
  }
  if (input.stand.maxPayloadGrams < requiredCapacity) {
    return incompatible('Stand capacity is below mounted weight with the required margin.');
  }
  return compatible(`Stand meets the ${input.requiredPayloadMarginPercent}% payload margin.`);
}

function evaluateElectrical(
  input: LightingRigEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!evidenced) return unknown('Electrical facts lack exact verified evidence.');
  const { light, powerSource, claim } = input;
  if (light.powerMode === 'unknown') return unknown('Light power mode is unknown.');
  if (light.powerMode === 'self_powered') {
    return { status: 'not_applicable', explanation: 'Light is explicitly self-powered.' };
  }
  if (powerSource === undefined)
    return incompatible('Light requires an exact external power source.');
  if (
    !validPositive(light.inputVoltageV) ||
    !validPositive(light.requiredPowerWatts) ||
    !validPositive(powerSource.outputVoltageV) ||
    !validPositive(powerSource.maxPowerWatts) ||
    !validPositive(claim.requiredVoltageV) ||
    !validPositive(claim.requiredPowerWatts)
  ) {
    return unknown('An exact voltage or power fact is missing.');
  }
  if (!powerSource.compatibleLightIds.includes(light.id)) {
    return incompatible('Power source is not documented for this exact light.');
  }
  if (
    claim.requiredVoltageV !== light.inputVoltageV ||
    claim.requiredPowerWatts !== light.requiredPowerWatts ||
    powerSource.outputVoltageV !== light.inputVoltageV ||
    powerSource.maxPowerWatts < light.requiredPowerWatts
  ) {
    return incompatible(
      'Exact voltage does not match or documented power capacity is insufficient.',
    );
  }
  return compatible(
    `Exact ${light.inputVoltageV} V / ${light.requiredPowerWatts} W requirement is satisfied.`,
  );
}

function evaluateControl(
  input: LightingRigEvaluationInput,
  evidenced: boolean,
): EvaluationDimension {
  if (!input.controlRequired && input.controller === undefined) {
    return { status: 'not_applicable', explanation: 'Wireless control is not required.' };
  }
  if (!evidenced) return unknown('Wireless-control facts lack verified evidence.');
  const { light, controller, claim } = input;
  if (controller === undefined) return incompatible('Required wireless controller is missing.');
  if (!nonEmpty(claim.wirelessProtocol ?? ''))
    return unknown('Exact wireless protocol is missing.');
  const protocol = claim.wirelessProtocol!;
  if (
    !light.wirelessProtocols.includes(protocol) ||
    !controller.wirelessProtocols.includes(protocol) ||
    !controller.compatibleLightIds.includes(light.id)
  ) {
    return incompatible(
      'Light and controller do not share an exact documented wireless protocol and pairing.',
    );
  }
  return compatible(`Light and controller explicitly support ${protocol}.`);
}

function claimMatches(input: LightingRigEvaluationInput): boolean {
  const { claim } = input;
  return (
    claim.lightId === input.light.id &&
    claim.modifierId === input.modifier?.id &&
    claim.gridId === input.grid?.id &&
    claim.standId === input.stand.id &&
    claim.powerSourceId === input.powerSource?.id &&
    claim.controllerId === input.controller?.id &&
    claim.requiredPayloadMarginPercent === input.requiredPayloadMarginPercent &&
    claim.controlRequired === input.controlRequired &&
    claim.totalMountedWeightGrams === calculatedMountedWeight(input)
  );
}

function calculatedMountedWeight(input: LightingRigEvaluationInput): number {
  return (
    input.light.weightGrams + (input.modifier?.weightGrams ?? 0) + (input.grid?.weightGrams ?? 0)
  );
}

function validPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(nonEmpty))];
}

function compatible(explanation: string): EvaluationDimension {
  return { status: 'compatible', explanation };
}

function incompatible(explanation: string): EvaluationDimension {
  return { status: 'incompatible', explanation };
}

function unknown(explanation: string): EvaluationDimension {
  return { status: 'unknown', explanation };
}
