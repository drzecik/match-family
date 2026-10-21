import { aggregateEvaluationStatus } from './aggregate.js';
import type { BaseEvaluation, EvaluationDimension } from './types.js';

export const USB_POWER_DELIVERY_PROTOCOL = 'usb_power_delivery';

export interface UsbPdProfile {
  readonly voltageV: number;
  readonly maxCurrentA: number;
}

export interface UsbPdPowerSource {
  readonly id: string;
  readonly outputConnector: string;
  readonly protocol: string;
  readonly pdProfiles: readonly UsbPdProfile[];
  readonly maximumPowerWatts: number;
  readonly evidenceIds: readonly string[];
}

export interface UsbPdCable {
  readonly id: string;
  readonly inputConnector: string;
  readonly outputConnector: string;
  /** `true` means input-to-output only; `false` explicitly permits either orientation. */
  readonly directional: boolean;
  readonly supportedProtocols: readonly string[];
  readonly maxVoltageV: number;
  readonly maxCurrentA: number;
  readonly maxPowerWatts: number;
  readonly evidenceIds: readonly string[];
}

export interface PowerConsumerRequirement {
  readonly deviceId: string;
  readonly inputConnector: string;
  readonly protocol: string;
  readonly requiredVoltageV: number;
  readonly requiredCurrentA: number;
  readonly requiredPowerWatts: number;
  readonly evidenceIds: readonly string[];
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
}

export interface PowerPathEvaluation extends BaseEvaluation {
  readonly conditions: readonly string[];
  readonly selectedPdProfile?: UsbPdProfile;
  readonly dimensions: {
    readonly connectorDirection: EvaluationDimension;
    readonly protocolProfile: EvaluationDimension;
    readonly voltage: EvaluationDimension;
    readonly capacity: EvaluationDimension;
    readonly electricalEvidence: EvaluationDimension;
    readonly polarity: EvaluationDimension;
  };
}

/**
 * Evaluates a single source -> cable -> consumer power path from exact, sourced facts.
 * It does not infer protocols from USB-C connector shape or generic DC polarity from USB PD.
 */
export function evaluatePowerPath(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
): PowerPathEvaluation {
  const electricalEvidence = evaluateElectricalEvidence(source, cable, consumer);
  const evidenceAvailable = electricalEvidence.status === 'compatible';
  const selectedPdProfile = findExactPdProfile(source, consumer);
  const dimensions = {
    connectorDirection: evaluateConnectorDirection(source, cable, consumer, evidenceAvailable),
    protocolProfile: evaluateProtocolProfile(source, cable, consumer, evidenceAvailable),
    voltage: evaluateVoltage(source, cable, consumer, evidenceAvailable),
    capacity: evaluateCapacity(source, cable, consumer, selectedPdProfile, evidenceAvailable),
    electricalEvidence,
    polarity: evaluatePolarity(source, cable, consumer, evidenceAvailable),
  };
  const results = Object.values(dimensions);
  const limitations = uniqueNonEmpty(consumer.limitations);
  const warnings = uniqueNonEmpty(
    results
      .filter((dimension) => dimension.status === 'unknown' || dimension.status === 'incompatible')
      .map((dimension) => dimension.explanation),
  );

  const status = aggregateEvaluationStatus({
    evidenced: evidenceAvailable,
    dimensions: results,
    limitations,
  });

  return {
    status,
    conditions: uniqueNonEmpty(consumer.conditions),
    ...(selectedPdProfile === undefined ? {} : { selectedPdProfile }),
    dimensions,
    limitations,
    warnings,
    evidenceIds: evidenceAvailable
      ? uniqueNonEmpty([...source.evidenceIds, ...cable.evidenceIds, ...consumer.evidenceIds])
      : [],
  };
}

function evaluateElectricalEvidence(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
): EvaluationDimension {
  const missingSubjects = [
    ...(!nonEmpty(source.id) || !hasEvidence(source.evidenceIds) ? ['source'] : []),
    ...(!nonEmpty(cable.id) || !hasEvidence(cable.evidenceIds) ? ['cable'] : []),
    ...(!nonEmpty(consumer.deviceId) || !hasEvidence(consumer.evidenceIds) ? ['consumer'] : []),
  ];
  if (missingSubjects.length > 0) {
    return {
      status: 'unknown',
      explanation: `Scoped electrical evidence or exact identity is missing for: ${missingSubjects.join(', ')}.`,
    };
  }
  return {
    status: 'compatible',
    explanation: 'Source, cable, and consumer requirements all carry scoped electrical evidence.',
  };
}

function evaluateConnectorDirection(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Connector and direction facts lack scoped evidence.');
  if (
    !nonEmpty(source.outputConnector) ||
    !nonEmpty(cable.inputConnector) ||
    !nonEmpty(cable.outputConnector) ||
    !nonEmpty(consumer.inputConnector) ||
    typeof cable.directional !== 'boolean'
  ) {
    return unknown('A connector or cable direction fact is missing.');
  }

  const forward =
    source.outputConnector === cable.inputConnector &&
    cable.outputConnector === consumer.inputConnector;
  const reverse =
    source.outputConnector === cable.outputConnector &&
    cable.inputConnector === consumer.inputConnector;
  if (forward || (!cable.directional && reverse)) {
    return {
      status: 'compatible',
      explanation: cable.directional
        ? 'Exact source, directional cable, and consumer connectors align input-to-output.'
        : 'Exact source, reversible cable, and consumer connectors align in a documented orientation.',
    };
  }
  return {
    status: 'incompatible',
    explanation:
      'Exact connector identities or the documented cable direction do not align across the path.',
  };
}

function evaluateProtocolProfile(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Protocol and PD profile facts lack scoped evidence.');
  if (
    !nonEmpty(source.protocol) ||
    !nonEmpty(consumer.protocol) ||
    !Array.isArray(cable.supportedProtocols) ||
    cable.supportedProtocols.length === 0
  ) {
    return unknown('A source, cable, or consumer protocol fact is missing.');
  }
  if (
    source.protocol !== consumer.protocol ||
    !cable.supportedProtocols.includes(consumer.protocol)
  ) {
    return {
      status: 'incompatible',
      explanation:
        'The source, cable, and consumer do not explicitly support the same exact power protocol.',
    };
  }
  if (consumer.protocol !== USB_POWER_DELIVERY_PROTOCOL) {
    return unknown(
      'The exact protocol is not USB Power Delivery; connector shape does not establish a PD profile.',
    );
  }
  if (!isFinitePositive(consumer.requiredVoltageV) || !Array.isArray(source.pdProfiles)) {
    return unknown('The required voltage or source PD profile list is missing.');
  }
  if (source.pdProfiles.length === 0) return unknown('The source PD profile list is empty.');
  if (findExactPdProfile(source, consumer) === undefined) {
    return {
      status: 'incompatible',
      explanation: `The source does not advertise the exact required ${consumer.requiredVoltageV} V PD profile.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Source, cable, and consumer explicitly support USB PD with an exact ${consumer.requiredVoltageV} V profile.`,
  };
}

function evaluateVoltage(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Voltage facts lack scoped evidence.');
  if (!hasExactUsbPdSemantics(source, cable, consumer)) {
    return unknown(
      'Exact USB PD semantics are required before negotiated voltage can be evaluated.',
    );
  }
  if (!isFinitePositive(consumer.requiredVoltageV) || !Array.isArray(source.pdProfiles)) {
    return unknown('The consumer voltage requirement or source PD voltage profiles are missing.');
  }
  if (!isFinitePositive(cable.maxVoltageV)) {
    return unknown('The cable voltage rating is missing.');
  }
  if (cable.maxVoltageV < consumer.requiredVoltageV) {
    return {
      status: 'incompatible',
      explanation: `The cable rating is below the required ${consumer.requiredVoltageV} V PD profile.`,
    };
  }
  if (source.pdProfiles.length === 0)
    return unknown('The source PD voltage profile list is empty.');
  if (findExactPdProfile(source, consumer) === undefined) {
    return {
      status: 'incompatible',
      explanation: `No verified source profile provides exactly ${consumer.requiredVoltageV} V.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `The verified PD source profile provides exactly ${consumer.requiredVoltageV} V.`,
  };
}

function evaluateCapacity(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
  selectedProfile: UsbPdProfile | undefined,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Current and power capacity facts lack scoped evidence.');
  if (!hasExactUsbPdSemantics(source, cable, consumer)) {
    return unknown('Exact USB PD semantics are required before capacity can be evaluated.');
  }
  if (
    selectedProfile === undefined ||
    !isFinitePositive(selectedProfile.maxCurrentA) ||
    !isFinitePositive(source.maximumPowerWatts) ||
    !isFinitePositive(cable.maxCurrentA) ||
    !isFinitePositive(cable.maxPowerWatts) ||
    !isFinitePositive(consumer.requiredCurrentA) ||
    !isFinitePositive(consumer.requiredPowerWatts)
  ) {
    return unknown('A required current, power, or exact-profile capacity fact is missing.');
  }

  const profilePowerWatts = selectedProfile.voltageV * selectedProfile.maxCurrentA;
  const insufficient: string[] = [];
  if (selectedProfile.maxCurrentA < consumer.requiredCurrentA)
    insufficient.push('source profile current');
  if (profilePowerWatts < consumer.requiredPowerWatts) insufficient.push('source profile power');
  if (source.maximumPowerWatts < consumer.requiredPowerWatts)
    insufficient.push('source total power');
  if (cable.maxCurrentA < consumer.requiredCurrentA) insufficient.push('cable current');
  if (cable.maxPowerWatts < consumer.requiredPowerWatts) insufficient.push('cable power');
  if (insufficient.length > 0) {
    return {
      status: 'incompatible',
      explanation: `Verified capacity is insufficient for: ${insufficient.join(', ')}.`,
    };
  }
  return {
    status: 'compatible',
    explanation: `Source profile and cable meet ${consumer.requiredCurrentA} A and ${consumer.requiredPowerWatts} W requirements.`,
  };
}

function evaluatePolarity(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
  evidenceAvailable: boolean,
): EvaluationDimension {
  if (!evidenceAvailable) return unknown('Polarity semantics lack scoped evidence.');
  if (hasExactUsbPdSemantics(source, cable, consumer)) {
    return {
      status: 'not_applicable',
      explanation:
        'Discrete DC polarity is not applicable because every path element explicitly uses USB Power Delivery semantics.',
    };
  }
  return unknown(
    'Polarity cannot be inferred for generic DC or from a USB-C-shaped connector without exact USB PD semantics.',
  );
}

function findExactPdProfile(
  source: UsbPdPowerSource,
  consumer: PowerConsumerRequirement,
): UsbPdProfile | undefined {
  if (!isFinitePositive(consumer.requiredVoltageV)) {
    return undefined;
  }
  return source.pdProfiles.find(
    (profile) =>
      isFinitePositive(profile.voltageV) && profile.voltageV === consumer.requiredVoltageV,
  );
}

function hasExactUsbPdSemantics(
  source: UsbPdPowerSource,
  cable: UsbPdCable,
  consumer: PowerConsumerRequirement,
): boolean {
  return (
    source.protocol === USB_POWER_DELIVERY_PROTOCOL &&
    consumer.protocol === USB_POWER_DELIVERY_PROTOCOL &&
    cable.supportedProtocols.includes(USB_POWER_DELIVERY_PROTOCOL)
  );
}

function hasEvidence(evidenceIds: readonly string[]): boolean {
  return Array.isArray(evidenceIds) && evidenceIds.some(nonEmpty);
}

function nonEmpty(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFinitePositive(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function uniqueNonEmpty(values: readonly string[]): string[] {
  return [...new Set(values.filter(nonEmpty))];
}

function unknown(explanation: string): EvaluationDimension {
  return { status: 'unknown', explanation };
}
