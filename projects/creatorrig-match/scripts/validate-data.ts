import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

interface FlaggedRecord {
  readonly id: string;
  readonly synthetic?: boolean;
  readonly notForProduction?: boolean;
}
interface Evidence extends FlaggedRecord {
  readonly sourceType: string;
  readonly status: string;
  readonly url: string;
  readonly scope: readonly string[];
}
interface Product extends FlaggedRecord {
  readonly weightGrams: number;
  readonly category: string;
  readonly subcategory: string;
  readonly specs?: {
    readonly ratedPayloadGrams?: number;
    readonly payloadSafetyMarginPercent?: number;
    readonly supportedCameraMounts?: readonly string[];
    readonly maximumPackageWidthMm?: number;
    readonly maximumPackageHeightMm?: number;
    readonly maximumPackageDepthMm?: number;
    readonly maximumCenterOfGravityOffsetMm?: number;
    readonly compatibleDeviceIds?: readonly string[];
    readonly incompatibleDeviceIds?: readonly string[];
    readonly supportedCameraAttachments?: readonly string[];
    readonly accessoryMounts?: readonly string[];
    readonly accessiblePorts?: readonly string[];
    readonly accessibleDoors?: readonly string[];
    readonly outputConnector?: string;
    readonly protocol?: string;
    readonly pdProfiles?: readonly {
      readonly voltageV: number;
      readonly maxCurrentA: number;
    }[];
    readonly maximumPowerWatts?: number;
    readonly energyWh?: number;
    readonly efficiencyPercent?: number;
    readonly inputConnector?: string;
    readonly directional?: boolean;
    readonly supportedProtocols?: readonly string[];
    readonly maxVoltageV?: number;
    readonly maxCurrentA?: number;
    readonly filterThreadMm?: number;
    readonly sensorDiagonalMm?: number;
    readonly imageCircleMm?: number;
    readonly outerDiameterMm?: number;
    readonly minimumClearApertureMm?: number;
    readonly clearApertureMm?: number;
    readonly inputThreadDiameterMm?: number;
    readonly outputThreadDiameterMm?: number;
    readonly clampDiameterMm?: number;
    readonly supportedLensOuterDiameterMm?: number;
    readonly maximumSupportedFilterDiameterMm?: number;
    readonly outputVoltageV?: number;
    readonly maxPowerWatts?: number;
    readonly compatibleLightIds?: readonly string[];
    readonly mountInput?: string;
    readonly mountOutput?: string;
    readonly modifierMount?: string;
    readonly bodyDiameterMm?: number;
    readonly minimumModifierClearApertureMm?: number;
    readonly maxLightDiameterMm?: number;
    readonly inputVoltageV?: number;
    readonly requiredPowerWatts?: number;
    readonly wirelessProtocols?: readonly string[];
    readonly compatibleModifierIds?: readonly string[];
    readonly clearDiameterMm?: number;
    readonly maximumPayloadGrams?: number;
    readonly maxPayloadGrams?: number;
    readonly plateStandards?: readonly string[];
    readonly maxRigWidthMm?: number;
    readonly capabilities?: readonly string[];
    readonly powerMode?: string;
    readonly compatiblePowerSourceIds?: readonly string[];
    readonly direction?: string;
    readonly protocolProfile?: string;
    readonly supportedProtocolProfiles?: readonly string[];
    readonly supportedModes?: readonly {
      readonly width: number;
      readonly height: number;
      readonly frameRate: number;
    }[];
    readonly maximumVideoWidth?: number;
    readonly maximumVideoHeight?: number;
    readonly maximumVideoFrameRate?: number;
    readonly supportMount?: string;
    readonly upstreamConnector?: string;
    readonly downstreamConnector?: string;
    readonly supportedBusProfiles?: readonly string[];
    readonly maxSustainedTransferMBps?: number;
    readonly maxBusPowerWatts?: number;
    readonly supportedOsVersions?: readonly string[];
    readonly supportedSoftwareIds?: readonly string[];
    readonly supportedAudioProtocols?: readonly string[];
    readonly maxSustainedAudioMBps?: number;
    readonly maxInputChannels?: number;
    readonly supportedAppIds?: readonly string[];
    readonly downstreamPowerWatts?: number;
    readonly supportedMediaFormats?: readonly string[];
    readonly supportedMediaProtocols?: readonly string[];
    readonly mediaFormat?: string;
    readonly mediaProtocol?: string;
    readonly capacityGb?: number;
    readonly sustainedReadMBps?: number;
    readonly sustainedWriteMBps?: number;
    readonly compatibleInterfaceIds?: readonly string[];
    readonly sourceInputConnectors?: readonly string[];
    readonly sourceSignalProtocols?: readonly string[];
    readonly monitoringOutputConnectors?: readonly string[];
    readonly maxSampleRateHz?: number;
    readonly maxBitDepth?: number;
    readonly phantomPowerAvailable?: boolean;
    readonly phantomPowerChannels?: number;
    readonly signalProtocol?: string;
    readonly channelCount?: number;
    readonly requiresPhantomPower?: boolean;
    readonly phantomPowerWatts?: number;
    readonly selfPowered?: boolean;
    readonly audioInput?: string;
    readonly audioInputChannels?: number;
    readonly plugInPower?: boolean;
    readonly audioOutput?: string;
    readonly signal?: string;
    readonly channels?: number;
    readonly requiresPlugInPower?: boolean;
    readonly busPowered?: boolean;
    readonly input?: string;
    readonly output?: string;
    readonly passesPlugInPower?: boolean;
    readonly lensMount?: string;
    readonly supportsAutofocus?: boolean;
    readonly supportsElectronicAperture?: boolean;
    readonly supportsStabilization?: boolean;
    readonly supportsExif?: boolean;
    readonly autofocus?: boolean;
    readonly apertureControl?: boolean;
    readonly stabilization?: boolean;
    readonly exif?: boolean;
    readonly inputMount?: string;
    readonly outputMount?: string;
    readonly mediaFormats?: readonly string[];
    readonly maxMediaCapacityGb?: number;
    readonly speedClasses?: readonly string[];
    readonly fileSystem?: string;
    readonly evidenceIds?: readonly string[];
  };
}
interface GimbalRigProfile extends FlaggedRecord {
  readonly deviceId: string;
  readonly lensId?: string;
  readonly audioId: string;
  readonly mediaId?: string;
  readonly cageId?: string;
  readonly filterId?: string;
  readonly stepUpRingId?: string;
  readonly matteBoxId?: string;
  readonly cameraMount: string;
  readonly packageWidthMm: number;
  readonly packageHeightMm: number;
  readonly packageDepthMm: number;
  readonly centerOfGravityOffsetMm: number;
  readonly conditions: readonly string[];
  readonly evidenceIds: readonly string[];
}
export interface CageRigProfile extends FlaggedRecord {
  readonly deviceId: string;
  readonly lensId?: string;
  readonly audioId: string;
  readonly mediaId?: string;
  readonly cameraAttachment: string;
  readonly requiredAccessoryMounts: readonly string[];
  readonly requiredAccessiblePorts: readonly string[];
  readonly requiredAccessibleDoors: readonly string[];
  readonly conditions: readonly string[];
  readonly evidenceIds: readonly string[];
}
export interface PowerPathProfile extends FlaggedRecord {
  readonly deviceId: string;
  readonly powerSourceId: string;
  readonly cableId: string;
  readonly requiredConnector: string;
  readonly requiredProtocol: string;
  readonly requiredVoltageV: number;
  readonly requiredCurrentA: number;
  readonly requiredPowerWatts: number;
  readonly deviceTypicalPowerWatts: number;
  readonly expectedStatus: 'compatible_with_limitations' | 'incompatible';
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
export interface FilterRigProfile extends FlaggedRecord {
  readonly deviceId: string;
  readonly lensId: string;
  readonly sensorDiagonalMm: number;
  readonly filterId?: string;
  readonly stepUpRingId?: string;
  readonly matteBoxId?: string;
  readonly expectedStatus:
    | 'directly_compatible'
    | 'compatible_with_adapter'
    | 'compatible_with_limitations'
    | 'incompatible'
    | 'unknown';
  readonly publicationStatus: 'verified' | 'candidate';
  readonly collisionStatus: 'clear' | 'conflict' | 'unknown';
  readonly vignettingStatus: 'clear' | 'conflict' | 'unknown';
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
type PublishedStatus =
  'directly_compatible' | 'compatible_with_limitations' | 'incompatible' | 'unknown';
type VerificationStatus = 'verified' | 'candidate' | 'unknown';
type CheckStatus = 'clear' | 'conflict' | 'unknown';
interface VideoPathProfile extends FlaggedRecord {
  readonly deviceId: string;
  readonly cableId: string;
  readonly destinationId: string;
  readonly powerSourceId?: string;
  readonly protocolProfile: string;
  readonly mode: { readonly width: number; readonly height: number; readonly frameRate: number };
  readonly requestedCapability: 'monitor' | 'record' | 'capture' | 'stream';
  readonly expectedStatus: PublishedStatus;
  readonly verificationStatus: VerificationStatus;
  readonly connectorStatus: CheckStatus;
  readonly signalStatus: CheckStatus;
  readonly capabilityStatus: CheckStatus;
  readonly powerStatus: CheckStatus;
  readonly safetyStatus: CheckStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
interface SupportRigProfile extends FlaggedRecord {
  readonly deviceId: string;
  readonly rigProductIds: readonly string[];
  readonly headId: string;
  readonly tripodId: string;
  readonly teleprompterId?: string;
  readonly totalPayloadGrams: number;
  readonly rigWidthMm: number;
  readonly requiredPayloadMarginPercent: number;
  readonly expectedStatus: PublishedStatus;
  readonly verificationStatus: VerificationStatus;
  readonly mountStatus: CheckStatus;
  readonly payloadStatus: CheckStatus;
  readonly collisionStatus: CheckStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
interface LightingRigProfile extends FlaggedRecord {
  readonly lightId: string;
  readonly modifierId?: string;
  readonly gridId?: string;
  readonly standId: string;
  readonly powerSourceId?: string;
  readonly controllerId?: string;
  readonly requiredVoltageV: number;
  readonly requiredPowerWatts: number;
  readonly wirelessProtocol?: string;
  readonly totalMountedWeightGrams: number;
  readonly requiredPayloadMarginPercent: number;
  readonly expectedStatus: PublishedStatus;
  readonly verificationStatus: VerificationStatus;
  readonly mountStatus: CheckStatus;
  readonly payloadStatus: CheckStatus;
  readonly electricalStatus: CheckStatus;
  readonly controlStatus: CheckStatus;
  readonly collisionStatus: CheckStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
interface StorageWorkflowProfile extends FlaggedRecord {
  readonly computerId: string;
  readonly dockId?: string;
  readonly readerId: string;
  readonly mediaId: string;
  readonly powerSourceId?: string;
  readonly busProfile: string;
  readonly mediaProtocol: string;
  readonly transferDirection: 'read_from_media' | 'write_to_media';
  readonly requiredSustainedTransferMBps: number;
  readonly osVersion: string;
  readonly softwareId?: string;
  readonly expectedStatus: PublishedStatus;
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
interface PodcastMobileWorkflowProfile extends FlaggedRecord {
  readonly hostId: string;
  readonly interfaceId: string;
  readonly sourceIds: readonly string[];
  readonly monitoringId?: string;
  readonly powerSourceId?: string;
  readonly requiredCableIds: readonly string[];
  readonly busProfile: string;
  readonly audioProtocol: string;
  readonly sampleRateHz: number;
  readonly bitDepth: number;
  readonly channelCount: number;
  readonly osVersion: string;
  readonly appId: string;
  readonly expectedStatus: PublishedStatus;
  readonly verificationStatus: VerificationStatus;
  readonly conditions: readonly string[];
  readonly limitations: readonly string[];
  readonly evidenceIds: readonly string[];
}
interface Edge extends FlaggedRecord {
  readonly relationType: string;
  readonly verificationStatus: string;
  readonly evidenceIds: readonly string[];
  readonly sourceProductId: string;
  readonly targetProductId: string;
  readonly requiredProductIds: readonly string[];
}
interface DemoRecordingMode extends FlaggedRecord {
  readonly deviceId: string;
  readonly bitrateMbps: number;
  readonly mediaFormats: readonly string[];
  readonly minimumSustainedWriteMBps: number;
  readonly minimumSpeedClass: string;
  readonly safetyMarginPercent: number;
  readonly evidenceIds: readonly string[];
}
interface DemoRig extends FlaggedRecord {
  readonly useCaseTemplateId?: string;
  readonly selectedProductIds: readonly string[];
  readonly recordingModeId?: string;
  readonly plannedDurationMinutes?: number;
}
export interface DemoData {
  readonly synthetic: boolean;
  readonly notForProduction: boolean;
  readonly products: readonly Product[];
  readonly gimbalRigProfiles: readonly GimbalRigProfile[];
  readonly cageRigProfiles: readonly CageRigProfile[];
  readonly powerPathProfiles: readonly PowerPathProfile[];
  readonly filterRigProfiles: readonly FilterRigProfile[];
  readonly videoPathProfiles: readonly VideoPathProfile[];
  readonly supportRigProfiles: readonly SupportRigProfile[];
  readonly lightingRigProfiles: readonly LightingRigProfile[];
  readonly storageWorkflowProfiles: readonly StorageWorkflowProfile[];
  readonly podcastMobileWorkflowProfiles: readonly PodcastMobileWorkflowProfile[];
  readonly recordingModes: readonly DemoRecordingMode[];
  readonly evidence: readonly Evidence[];
  readonly compatibilityEdges: readonly Edge[];
  readonly useCaseTemplates: readonly (FlaggedRecord & {
    readonly useCase: string;
    readonly defaultProductIds: readonly string[];
  })[];
  readonly rigs: readonly DemoRig[];
}

function isFinitePositive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function hasVerifiedOfficialElectricalEvidence(
  referencedIds: readonly string[] | undefined,
  evidenceById: ReadonlyMap<string, Evidence>,
): boolean {
  return (
    referencedIds !== undefined &&
    referencedIds.length > 0 &&
    referencedIds.every((id) => {
      const evidence = evidenceById.get(id);
      return (
        evidence !== undefined &&
        evidence.status === 'verified' &&
        evidence.sourceType.startsWith('official_') &&
        evidence.scope.includes('electrical')
      );
    })
  );
}

function hasVerifiedOfficialFilterEvidence(
  referencedIds: readonly string[] | undefined,
  evidenceById: ReadonlyMap<string, Evidence>,
): boolean {
  return (
    referencedIds !== undefined &&
    referencedIds.length > 0 &&
    referencedIds.every((id) => {
      const evidence = evidenceById.get(id);
      return (
        evidence !== undefined &&
        evidence.status === 'verified' &&
        evidence.sourceType.startsWith('official_') &&
        evidence.scope.includes('mechanical') &&
        evidence.scope.includes('optical')
      );
    })
  );
}

function hasVerifiedOfficialEvidenceCovering(
  referencedIds: readonly string[] | undefined,
  evidenceById: ReadonlyMap<string, Evidence>,
  requiredScopes: readonly string[],
): boolean {
  if (!referencedIds?.length) return false;
  const referenced = referencedIds.map((id) => evidenceById.get(id));
  if (
    referenced.some(
      (item) =>
        item === undefined ||
        item.status !== 'verified' ||
        !item.sourceType.startsWith('official_'),
    )
  ) {
    return false;
  }
  const coveredScopes = new Set(referenced.flatMap((item) => item?.scope ?? []));
  return requiredScopes.every((scope) => coveredScopes.has(scope));
}

export function validateDemoData(data: DemoData): readonly string[] {
  const errors: string[] = [];
  const powerPathProfiles: readonly PowerPathProfile[] = Array.isArray(data.powerPathProfiles)
    ? (data.powerPathProfiles as readonly PowerPathProfile[])
    : [];
  if (!Array.isArray(data.powerPathProfiles)) {
    errors.push('Demo dataset powerPathProfiles must be an array.');
  }
  const filterRigProfiles: readonly FilterRigProfile[] = Array.isArray(data.filterRigProfiles)
    ? (data.filterRigProfiles as readonly FilterRigProfile[])
    : [];
  if (!Array.isArray(data.filterRigProfiles)) {
    errors.push('Demo dataset filterRigProfiles must be an array.');
  }
  const videoPathProfiles: readonly VideoPathProfile[] = Array.isArray(data.videoPathProfiles)
    ? (data.videoPathProfiles as readonly VideoPathProfile[])
    : [];
  const supportRigProfiles: readonly SupportRigProfile[] = Array.isArray(data.supportRigProfiles)
    ? (data.supportRigProfiles as readonly SupportRigProfile[])
    : [];
  const lightingRigProfiles: readonly LightingRigProfile[] = Array.isArray(data.lightingRigProfiles)
    ? (data.lightingRigProfiles as readonly LightingRigProfile[])
    : [];
  const storageWorkflowProfiles: readonly StorageWorkflowProfile[] = Array.isArray(
    data.storageWorkflowProfiles,
  )
    ? (data.storageWorkflowProfiles as readonly StorageWorkflowProfile[])
    : [];
  const podcastMobileWorkflowProfiles: readonly PodcastMobileWorkflowProfile[] = Array.isArray(
    data.podcastMobileWorkflowProfiles,
  )
    ? (data.podcastMobileWorkflowProfiles as readonly PodcastMobileWorkflowProfile[])
    : [];
  if (!Array.isArray(data.videoPathProfiles))
    errors.push('Demo dataset videoPathProfiles must be an array.');
  if (!Array.isArray(data.supportRigProfiles))
    errors.push('Demo dataset supportRigProfiles must be an array.');
  if (!Array.isArray(data.lightingRigProfiles))
    errors.push('Demo dataset lightingRigProfiles must be an array.');
  if (!Array.isArray(data.storageWorkflowProfiles))
    errors.push('Demo dataset storageWorkflowProfiles must be an array.');
  if (!Array.isArray(data.podcastMobileWorkflowProfiles))
    errors.push('Demo dataset podcastMobileWorkflowProfiles must be an array.');
  if (!data.synthetic || !data.notForProduction)
    errors.push('Demo dataset must be synthetic and non-production.');
  const all = [
    ...data.products,
    ...data.gimbalRigProfiles,
    ...data.cageRigProfiles,
    ...powerPathProfiles,
    ...filterRigProfiles,
    ...videoPathProfiles,
    ...supportRigProfiles,
    ...lightingRigProfiles,
    ...storageWorkflowProfiles,
    ...podcastMobileWorkflowProfiles,
    ...data.recordingModes,
    ...data.evidence,
    ...data.compatibilityEdges,
    ...data.useCaseTemplates,
    ...data.rigs,
  ];
  const ids = new Set<string>();
  for (const record of all) {
    if (ids.has(record.id)) errors.push(`Duplicate id: ${record.id}`);
    ids.add(record.id);
    if (!record.synthetic || !record.notForProduction)
      errors.push(`Synthetic flags missing: ${record.id}`);
  }

  const productIds = new Set(data.products.map((product) => product.id));
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const evidenceIds = new Set(data.evidence.map((evidence) => evidence.id));
  const evidenceById = new Map(data.evidence.map((evidence) => [evidence.id, evidence]));
  for (const product of data.products.filter((item) =>
    ['camera', 'phone'].includes(item.subcategory),
  )) {
    const specs = product.specs;
    const channelCount = specs?.audioInputChannels ?? specs?.maxInputChannels;
    if (!specs?.audioInput || !isFinitePositive(channelCount)) {
      errors.push(`Capture device has incomplete audio-input facts: ${product.id}`);
    }
    if (
      !hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, [
        'signal',
        'electrical',
      ])
    ) {
      errors.push(`Capture device lacks verified audio evidence: ${product.id}`);
    }
    if (product.subcategory === 'camera') {
      if (
        !specs?.lensMount ||
        !isFinitePositive(specs.sensorDiagonalMm) ||
        [
          specs.supportsAutofocus,
          specs.supportsElectronicAperture,
          specs.supportsStabilization,
          specs.supportsExif,
        ].some((value) => typeof value !== 'boolean')
      ) {
        errors.push(`Camera has incomplete optical facts: ${product.id}`);
      }
      if (
        !hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, [
          'mechanical',
          'optical',
        ])
      ) {
        errors.push(`Camera lacks verified optical evidence: ${product.id}`);
      }
    }
    if ((specs?.mediaFormats?.length ?? 0) > 0) {
      if (!isFinitePositive(specs?.maxMediaCapacityGb)) {
        errors.push(`Capture device has invalid media capacity limit: ${product.id}`);
      }
      if (!hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, ['memory'])) {
        errors.push(`Capture device lacks verified memory evidence: ${product.id}`);
      }
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'lens')) {
    const specs = product.specs;
    if (
      !specs?.lensMount ||
      !isFinitePositive(specs.imageCircleMm) ||
      [specs.autofocus, specs.apertureControl, specs.stabilization, specs.exif].some(
        (value) => typeof value !== 'boolean',
      )
    ) {
      errors.push(`Lens has incomplete optical or electronic facts: ${product.id}`);
    }
    if (
      !hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, [
        'mechanical',
        'optical',
      ])
    ) {
      errors.push(`Lens lacks verified scoped evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'lens_mount_adapter')) {
    const specs = product.specs;
    if (
      !specs?.inputMount ||
      !specs.outputMount ||
      specs.directional !== true ||
      [specs.autofocus, specs.apertureControl, specs.stabilization, specs.exif].some(
        (value) => typeof value !== 'boolean',
      )
    ) {
      errors.push(`Lens adapter has incomplete directional capability facts: ${product.id}`);
    }
    if (
      !hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, [
        'mechanical',
        'optical',
      ])
    ) {
      errors.push(`Lens adapter lacks verified scoped evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) =>
    ['wired_microphone', 'audio_receiver'].includes(item.subcategory),
  )) {
    const specs = product.specs;
    const powerFactCount = [
      specs?.requiresPlugInPower,
      specs?.selfPowered,
      specs?.busPowered,
    ].filter((value) => value === true).length;
    if (
      !specs?.audioOutput ||
      !specs.signal ||
      !isFinitePositive(specs.channels) ||
      powerFactCount !== 1
    ) {
      errors.push(`M1 audio source has incomplete signal or power facts: ${product.id}`);
    }
    if (
      !hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, [
        'signal',
        'electrical',
      ])
    ) {
      errors.push(`M1 audio source lacks verified scoped evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'trs_trrs_adapter')) {
    const specs = product.specs;
    if (
      !specs?.input ||
      !specs.output ||
      !specs.signal ||
      specs.directional !== true ||
      typeof specs.passesPlugInPower !== 'boolean'
    ) {
      errors.push(`Audio adapter has incomplete directional power facts: ${product.id}`);
    }
    if (
      !hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, [
        'signal',
        'electrical',
      ])
    ) {
      errors.push(`Audio adapter lacks verified scoped evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) =>
    ['sd_card', 'cfexpress_card'].includes(item.subcategory),
  )) {
    const specs = product.specs;
    if (
      !specs?.mediaFormat ||
      !isFinitePositive(specs.capacityGb) ||
      !isFinitePositive(specs.sustainedWriteMBps)
    ) {
      errors.push(`Recording card has incomplete capacity or sustained-write facts: ${product.id}`);
    }
    if (!hasVerifiedOfficialEvidenceCovering(specs?.evidenceIds, evidenceById, ['memory'])) {
      errors.push(`Recording card lacks verified memory evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'gimbal')) {
    const specs = product.specs;
    const positiveNumbers = [
      specs?.ratedPayloadGrams,
      specs?.maximumPackageWidthMm,
      specs?.maximumPackageHeightMm,
      specs?.maximumPackageDepthMm,
      specs?.maximumCenterOfGravityOffsetMm,
    ];
    if (
      positiveNumbers.some((value) => value === undefined || !Number.isFinite(value) || value <= 0)
    ) {
      errors.push(`Gimbal has invalid mechanical limits: ${product.id}`);
    }
    if (
      specs?.payloadSafetyMarginPercent === undefined ||
      !Number.isFinite(specs.payloadSafetyMarginPercent) ||
      specs.payloadSafetyMarginPercent < 0 ||
      specs.payloadSafetyMarginPercent >= 100
    ) {
      errors.push(`Gimbal has invalid payload safety margin: ${product.id}`);
    }
    if (!specs?.supportedCameraMounts?.length)
      errors.push(`Gimbal lacks mounting standards: ${product.id}`);
    if (
      !specs?.evidenceIds?.length ||
      specs.evidenceIds.some((id) => {
        const evidence = evidenceById.get(id);
        return (
          !evidence || evidence.status !== 'verified' || !evidence.scope.includes('mechanical')
        );
      })
    ) {
      errors.push(`Gimbal lacks verified mechanical evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'cage')) {
    const specs = product.specs;
    if (
      !specs?.compatibleDeviceIds?.length ||
      specs.compatibleDeviceIds.some((id) => !productIds.has(id))
    ) {
      errors.push(`Cage lacks exact compatible devices: ${product.id}`);
    }
    if (
      !specs?.incompatibleDeviceIds ||
      specs.incompatibleDeviceIds.some((id) => !productIds.has(id))
    ) {
      errors.push(`Cage lacks explicit incompatible device declarations: ${product.id}`);
    } else if (specs.compatibleDeviceIds?.some((id) => specs.incompatibleDeviceIds?.includes(id))) {
      errors.push(`Cage device declarations overlap: ${product.id}`);
    }
    if (!specs?.supportedCameraAttachments?.length) {
      errors.push(`Cage lacks camera attachments: ${product.id}`);
    }
    if (!specs?.accessoryMounts?.length) {
      errors.push(`Cage lacks accessory mounts: ${product.id}`);
    }
    if (!specs?.accessiblePorts || !specs.accessibleDoors) {
      errors.push(`Cage lacks explicit access declarations: ${product.id}`);
    }
    if (
      !specs?.evidenceIds?.length ||
      specs.evidenceIds.some((id) => {
        const evidence = evidenceById.get(id);
        return (
          !evidence || evidence.status !== 'verified' || !evidence.scope.includes('mechanical')
        );
      })
    ) {
      errors.push(`Cage lacks verified mechanical evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'power_bank')) {
    const specs = product.specs;
    const pdProfiles:
      readonly { readonly voltageV: number; readonly maxCurrentA: number }[] | undefined =
      Array.isArray(specs?.pdProfiles)
        ? (specs.pdProfiles as readonly {
            readonly voltageV: number;
            readonly maxCurrentA: number;
          }[])
        : undefined;
    if (
      !specs?.outputConnector ||
      !specs.protocol ||
      pdProfiles === undefined ||
      pdProfiles.some(
        (profile) => !isFinitePositive(profile.voltageV) || !isFinitePositive(profile.maxCurrentA),
      ) ||
      !isFinitePositive(specs.maximumPowerWatts)
    ) {
      errors.push(`Power source has incomplete electrical output facts: ${product.id}`);
    }
    if (!isFinitePositive(specs?.energyWh)) {
      errors.push(`Power source has invalid energy capacity: ${product.id}`);
    }
    if (
      !isFinitePositive(specs?.efficiencyPercent) ||
      (specs.efficiencyPercent ?? Number.POSITIVE_INFINITY) > 100
    ) {
      errors.push(`Power source has invalid efficiency: ${product.id}`);
    }
    if (
      !specs?.incompatibleDeviceIds ||
      specs.incompatibleDeviceIds.some((id) => !productIds.has(id))
    ) {
      errors.push(`Power source lacks exact incompatible device declarations: ${product.id}`);
    }
    if (!hasVerifiedOfficialElectricalEvidence(specs?.evidenceIds, evidenceById)) {
      errors.push(`Power source lacks verified official electrical evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'usb_c_cable')) {
    const specs = product.specs;
    if (
      !specs?.inputConnector ||
      !specs.outputConnector ||
      specs.directional === undefined ||
      !specs.supportedProtocols?.length ||
      !isFinitePositive(specs.maxVoltageV) ||
      !isFinitePositive(specs.maxCurrentA) ||
      !isFinitePositive(specs.maximumPowerWatts)
    ) {
      errors.push(`Power cable has incomplete connector or rating facts: ${product.id}`);
    }
    if (!hasVerifiedOfficialElectricalEvidence(specs?.evidenceIds, evidenceById)) {
      errors.push(`Power cable lacks verified official electrical evidence: ${product.id}`);
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'round_filter')) {
    const specs = product.specs;
    if (
      !isFinitePositive(specs?.filterThreadMm) ||
      !isFinitePositive(specs?.clearApertureMm) ||
      (specs.clearApertureMm ?? Number.POSITIVE_INFINITY) >
        (specs.filterThreadMm ?? Number.NEGATIVE_INFINITY)
    ) {
      errors.push(`Round filter has invalid thread or clear aperture: ${product.id}`);
    }
    if (!hasVerifiedOfficialFilterEvidence(specs?.evidenceIds, evidenceById)) {
      errors.push(
        `Round filter lacks verified official mechanical and optical evidence: ${product.id}`,
      );
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'step_up_ring')) {
    const specs = product.specs;
    if (
      !isFinitePositive(specs?.inputThreadDiameterMm) ||
      !isFinitePositive(specs?.outputThreadDiameterMm) ||
      (specs.outputThreadDiameterMm ?? Number.NEGATIVE_INFINITY) <=
        (specs.inputThreadDiameterMm ?? Number.POSITIVE_INFINITY) ||
      specs.directional !== true ||
      !isFinitePositive(specs.clearApertureMm)
    ) {
      errors.push(`Step-up ring has invalid directional dimensions: ${product.id}`);
    }
    if (!hasVerifiedOfficialFilterEvidence(specs?.evidenceIds, evidenceById)) {
      errors.push(
        `Step-up ring lacks verified official mechanical and optical evidence: ${product.id}`,
      );
    }
  }
  for (const product of data.products.filter((item) => item.subcategory === 'matte_box')) {
    const specs = product.specs;
    if (
      !isFinitePositive(specs?.clampDiameterMm) ||
      !isFinitePositive(specs?.supportedLensOuterDiameterMm) ||
      specs.clampDiameterMm !== specs.supportedLensOuterDiameterMm ||
      !isFinitePositive(specs.clearApertureMm) ||
      !isFinitePositive(specs.maximumSupportedFilterDiameterMm)
    ) {
      errors.push(`Matte box has invalid clamp or clear-aperture facts: ${product.id}`);
    }
    if (!hasVerifiedOfficialFilterEvidence(specs?.evidenceIds, evidenceById)) {
      errors.push(
        `Matte box lacks verified official mechanical and optical evidence: ${product.id}`,
      );
    }
  }
  const m3ProductScopes = new Map<string, readonly string[]>([
    ['led_panel', ['mechanical', 'electrical', 'signal']],
    ['cob_light', ['mechanical', 'electrical', 'signal']],
    ['softbox', ['mechanical', 'optical']],
    ['lighting_grid', ['mechanical', 'optical']],
    ['light_stand', ['mechanical']],
    ['ac_power_supply', ['electrical']],
    ['lighting_controller', ['signal', 'software']],
    ['field_monitor', ['signal', 'electrical']],
    ['external_recorder', ['signal', 'electrical']],
    ['hdmi_cable', ['mechanical', 'signal']],
    ['capture_card', ['signal', 'electrical']],
    ['streaming_device', ['signal', 'electrical']],
    ['tripod', ['mechanical']],
    ['tripod_head', ['mechanical']],
    ['teleprompter', ['mechanical', 'optical']],
    ['computer', ['signal', 'electrical', 'software']],
    ['dock', ['signal', 'electrical', 'software']],
    ['card_reader', ['signal', 'electrical', 'memory']],
    ['ssd', ['memory']],
    ['workflow_power_supply', ['electrical']],
    ['audio_interface', ['signal', 'electrical', 'software']],
    ['xlr_microphone', ['signal', 'electrical']],
    ['headphones', ['signal']],
    ['xlr_cable', ['mechanical', 'signal']],
    ['usb_audio_cable', ['mechanical', 'signal']],
  ]);
  for (const product of data.products) {
    const scopes = m3ProductScopes.get(product.subcategory);
    if (
      scopes &&
      !hasVerifiedOfficialEvidenceCovering(product.specs?.evidenceIds, evidenceById, scopes)
    ) {
      errors.push(`M3 product lacks verified official scoped evidence: ${product.id}`);
    }
  }
  for (const profile of data.gimbalRigProfiles) {
    if (
      !productIds.has(profile.deviceId) ||
      !productIds.has(profile.audioId) ||
      (profile.lensId && !productIds.has(profile.lensId)) ||
      (profile.mediaId && !productIds.has(profile.mediaId)) ||
      (profile.cageId && !productIds.has(profile.cageId)) ||
      (profile.filterId && productById.get(profile.filterId)?.subcategory !== 'round_filter') ||
      (profile.stepUpRingId &&
        productById.get(profile.stepUpRingId)?.subcategory !== 'step_up_ring') ||
      (profile.matteBoxId && productById.get(profile.matteBoxId)?.subcategory !== 'matte_box')
    ) {
      errors.push(`Gimbal rig profile references unknown product: ${profile.id}`);
    }
    if (
      [profile.packageWidthMm, profile.packageHeightMm, profile.packageDepthMm].some(
        (value) => !Number.isFinite(value) || value <= 0,
      ) ||
      !Number.isFinite(profile.centerOfGravityOffsetMm) ||
      profile.centerOfGravityOffsetMm < 0
    ) {
      errors.push(`Gimbal rig profile has invalid geometry: ${profile.id}`);
    }
    if (
      profile.evidenceIds.length === 0 ||
      profile.evidenceIds.some((id) => {
        const evidence = evidenceById.get(id);
        return (
          !evidence || evidence.status !== 'verified' || !evidence.scope.includes('mechanical')
        );
      })
    ) {
      errors.push(`Gimbal rig profile lacks verified mechanical evidence: ${profile.id}`);
    }
    if (profile.cageId) {
      const cage = productById.get(profile.cageId);
      if (cage?.subcategory !== 'cage') {
        errors.push(`Gimbal rig profile references non-cage product: ${profile.id}`);
      } else if (!cage.specs?.compatibleDeviceIds?.includes(profile.deviceId)) {
        errors.push(`Gimbal rig profile cage does not fit device: ${profile.id}`);
      }
    }
  }
  const exactCageProfileKeys = new Set<string>();
  for (const profile of data.cageRigProfiles) {
    if (
      !productIds.has(profile.deviceId) ||
      !productIds.has(profile.audioId) ||
      (profile.lensId && !productIds.has(profile.lensId)) ||
      (profile.mediaId && !productIds.has(profile.mediaId))
    ) {
      errors.push(`Cage rig profile references unknown product: ${profile.id}`);
    }
    if (
      !profile.cameraAttachment ||
      !Array.isArray(profile.requiredAccessoryMounts) ||
      !Array.isArray(profile.requiredAccessiblePorts) ||
      !Array.isArray(profile.requiredAccessibleDoors)
    ) {
      errors.push(`Cage rig profile has incomplete exact requirements: ${profile.id}`);
    }
    if (profile.conditions.length === 0) {
      errors.push(`Cage rig profile lacks scoped conditions: ${profile.id}`);
    }
    if (
      profile.evidenceIds.length === 0 ||
      profile.evidenceIds.some((id) => {
        const evidence = evidenceById.get(id);
        return (
          !evidence || evidence.status !== 'verified' || !evidence.scope.includes('mechanical')
        );
      })
    ) {
      errors.push(`Cage rig profile lacks verified mechanical evidence: ${profile.id}`);
    }
    const exactKey = [
      profile.deviceId,
      profile.lensId ?? '',
      profile.audioId,
      profile.mediaId ?? '',
    ].join('|');
    if (exactCageProfileKeys.has(exactKey)) {
      errors.push(`Duplicate exact cage rig profile: ${profile.id}`);
    }
    exactCageProfileKeys.add(exactKey);
  }
  const exactPowerProfileKeys = new Set<string>();
  for (const profile of powerPathProfiles) {
    const device = productById.get(profile.deviceId);
    const source = productById.get(profile.powerSourceId);
    const cable = productById.get(profile.cableId);
    if (
      device?.category !== 'capture_device' ||
      source?.subcategory !== 'power_bank' ||
      cable?.subcategory !== 'usb_c_cable'
    ) {
      errors.push(`Power path profile references wrong or unknown products: ${profile.id}`);
    }
    const numericRequirements = [
      profile.requiredVoltageV,
      profile.requiredCurrentA,
      profile.requiredPowerWatts,
      profile.deviceTypicalPowerWatts,
    ];
    if (
      !profile.requiredConnector ||
      !profile.requiredProtocol ||
      numericRequirements.some((value) => !isFinitePositive(value))
    ) {
      errors.push(`Power path profile has invalid electrical requirements: ${profile.id}`);
    }
    if (
      !Array.isArray(profile.conditions) ||
      !Array.isArray(profile.limitations) ||
      profile.conditions.length === 0 ||
      profile.limitations.length === 0
    ) {
      errors.push(`Power path profile lacks explicit conditions or limitations: ${profile.id}`);
    }
    if (!hasVerifiedOfficialElectricalEvidence(profile.evidenceIds, evidenceById)) {
      errors.push(`Power path profile lacks verified official electrical evidence: ${profile.id}`);
    }

    const sourceSpecs = source?.specs;
    const cableSpecs = cable?.specs;
    const exactPdProfile = sourceSpecs?.pdProfiles?.some(
      (candidate) =>
        candidate.voltageV === profile.requiredVoltageV &&
        candidate.maxCurrentA >= profile.requiredCurrentA,
    );
    const satisfiesExactPath =
      sourceSpecs !== undefined &&
      cableSpecs !== undefined &&
      sourceSpecs.outputConnector === profile.requiredConnector &&
      sourceSpecs.protocol === profile.requiredProtocol &&
      exactPdProfile === true &&
      isFinitePositive(sourceSpecs.maximumPowerWatts) &&
      sourceSpecs.maximumPowerWatts >= profile.requiredPowerWatts &&
      cableSpecs.inputConnector === profile.requiredConnector &&
      cableSpecs.outputConnector === profile.requiredConnector &&
      cableSpecs.supportedProtocols?.includes(profile.requiredProtocol) === true &&
      isFinitePositive(cableSpecs.maxVoltageV) &&
      cableSpecs.maxVoltageV >= profile.requiredVoltageV &&
      isFinitePositive(cableSpecs.maxCurrentA) &&
      cableSpecs.maxCurrentA >= profile.requiredCurrentA &&
      isFinitePositive(cableSpecs.maximumPowerWatts) &&
      cableSpecs.maximumPowerWatts >= profile.requiredPowerWatts;

    if (profile.expectedStatus === 'compatible_with_limitations' && !satisfiesExactPath) {
      errors.push(`Confirmed power path does not satisfy exact requirements: ${profile.id}`);
    }
    if (
      profile.expectedStatus === 'compatible_with_limitations' &&
      sourceSpecs?.incompatibleDeviceIds?.includes(profile.deviceId)
    ) {
      errors.push(`Confirmed power path uses an explicitly incompatible source: ${profile.id}`);
    }
    if (
      profile.expectedStatus === 'incompatible' &&
      satisfiesExactPath &&
      !sourceSpecs?.incompatibleDeviceIds?.includes(profile.deviceId)
    ) {
      errors.push(`Incompatible power path lacks an exact documented conflict: ${profile.id}`);
    }
    if (
      profile.expectedStatus === 'incompatible' &&
      !sourceSpecs?.incompatibleDeviceIds?.includes(profile.deviceId)
    ) {
      errors.push(`Incompatible power path lacks an exact device declaration: ${profile.id}`);
    }

    const exactKey = [profile.deviceId, profile.powerSourceId, profile.cableId].join('|');
    if (exactPowerProfileKeys.has(exactKey)) {
      errors.push(`Duplicate exact power path profile: ${profile.id}`);
    }
    exactPowerProfileKeys.add(exactKey);
  }
  const exactFilterProfileKeys = new Set<string>();
  for (const profile of filterRigProfiles) {
    const device = productById.get(profile.deviceId);
    const lens = productById.get(profile.lensId);
    const filter = profile.filterId ? productById.get(profile.filterId) : undefined;
    const ring = profile.stepUpRingId ? productById.get(profile.stepUpRingId) : undefined;
    const matteBox = profile.matteBoxId ? productById.get(profile.matteBoxId) : undefined;
    if (
      device?.category !== 'capture_device' ||
      lens?.subcategory !== 'lens' ||
      (profile.filterId !== undefined && filter?.subcategory !== 'round_filter') ||
      (profile.stepUpRingId !== undefined && ring?.subcategory !== 'step_up_ring') ||
      (profile.matteBoxId !== undefined && matteBox?.subcategory !== 'matte_box') ||
      (!filter && !matteBox)
    ) {
      errors.push(`Filter rig profile references wrong or unknown products: ${profile.id}`);
    }
    if (!Array.isArray(profile.conditions) || profile.conditions.length === 0) {
      errors.push(`Filter rig profile lacks exact conditions: ${profile.id}`);
    }

    const lensSpecs = lens?.specs;
    const deviceSpecs = device?.specs;
    const filterSpecs = filter?.specs;
    const ringSpecs = ring?.specs;
    const matteSpecs = matteBox?.specs;
    const directThreadFits =
      filterSpecs !== undefined &&
      lensSpecs?.filterThreadMm === filterSpecs.filterThreadMm &&
      ring === undefined &&
      matteBox === undefined;
    const stepUpFits =
      filterSpecs !== undefined &&
      ringSpecs !== undefined &&
      matteBox === undefined &&
      ringSpecs.directional === true &&
      lensSpecs?.filterThreadMm === ringSpecs.inputThreadDiameterMm &&
      ringSpecs.outputThreadDiameterMm === filterSpecs.filterThreadMm;
    const matteClampFits =
      matteSpecs !== undefined &&
      ring === undefined &&
      lensSpecs?.outerDiameterMm === matteSpecs.clampDiameterMm &&
      matteSpecs.supportedLensOuterDiameterMm === lensSpecs.outerDiameterMm;
    const mechanicalFit = directThreadFits || stepUpFits || matteClampFits;
    const clearApertures = [
      filterSpecs?.clearApertureMm,
      ringSpecs?.clearApertureMm,
      matteSpecs?.clearApertureMm,
    ].filter(isFinitePositive);
    const availableClearApertureMm =
      clearApertures.length > 0 ? Math.min(...clearApertures) : undefined;
    const apertureIsClear =
      isFinitePositive(lensSpecs?.minimumClearApertureMm) &&
      isFinitePositive(availableClearApertureMm) &&
      availableClearApertureMm >= lensSpecs.minimumClearApertureMm;
    const sensorScopeIsExact =
      isFinitePositive(profile.sensorDiagonalMm) &&
      deviceSpecs?.sensorDiagonalMm === profile.sensorDiagonalMm &&
      isFinitePositive(lensSpecs?.imageCircleMm) &&
      lensSpecs.imageCircleMm >= profile.sensorDiagonalMm;
    if (!sensorScopeIsExact) {
      errors.push(`Filter rig profile has invalid sensor or image-circle scope: ${profile.id}`);
    }
    const positiveStatus =
      profile.expectedStatus === 'directly_compatible' ||
      profile.expectedStatus === 'compatible_with_adapter' ||
      profile.expectedStatus === 'compatible_with_limitations';
    const actualConflict = !mechanicalFit || !apertureIsClear;
    const reportedConflict =
      profile.collisionStatus === 'conflict' || profile.vignettingStatus === 'conflict';

    if (profile.publicationStatus === 'verified') {
      if (!hasVerifiedOfficialFilterEvidence(deviceSpecs?.evidenceIds, evidenceById)) {
        errors.push(`Verified filter rig profile lacks device optical evidence: ${profile.id}`);
      }
      if (!hasVerifiedOfficialFilterEvidence(profile.evidenceIds, evidenceById)) {
        errors.push(`Verified filter rig profile lacks official scoped evidence: ${profile.id}`);
      }
      if (profile.expectedStatus === 'unknown') {
        errors.push(`Unknown filter rig profile cannot be verified: ${profile.id}`);
      }
    }
    if (profile.publicationStatus === 'candidate') {
      if (
        profile.expectedStatus !== 'unknown' ||
        profile.collisionStatus !== 'unknown' ||
        profile.vignettingStatus !== 'unknown'
      ) {
        errors.push(
          `Filter candidate must remain wholly unknown and non-publishable: ${profile.id}`,
        );
      }
    }
    if (
      positiveStatus &&
      (profile.publicationStatus !== 'verified' ||
        profile.collisionStatus !== 'clear' ||
        profile.vignettingStatus !== 'clear' ||
        !sensorScopeIsExact ||
        actualConflict)
    ) {
      errors.push(`Filter rig false-positive compatibility: ${profile.id}`);
    }
    if (profile.expectedStatus === 'directly_compatible' && !directThreadFits && !matteClampFits) {
      errors.push(`Direct filter rig requires an exact direct mount: ${profile.id}`);
    }
    if (profile.expectedStatus === 'compatible_with_adapter' && !stepUpFits) {
      errors.push(`Adapter filter rig requires an exact directional ring path: ${profile.id}`);
    }
    if (
      profile.expectedStatus === 'incompatible' &&
      (!actualConflict || !reportedConflict || profile.limitations.length === 0)
    ) {
      errors.push(`Incompatible filter rig lacks an exact documented conflict: ${profile.id}`);
    }

    const exactKey = [
      profile.deviceId,
      profile.lensId,
      profile.filterId ?? '',
      profile.stepUpRingId ?? '',
      profile.matteBoxId ?? '',
    ].join('|');
    if (exactFilterProfileKeys.has(exactKey)) {
      errors.push(`Duplicate exact filter rig profile: ${profile.id}`);
    }
    exactFilterProfileKeys.add(exactKey);
  }
  const isPositive = (status: PublishedStatus): boolean =>
    status === 'directly_compatible' || status === 'compatible_with_limitations';
  const exactVideoKeys = new Set<string>();
  for (const profile of videoPathProfiles) {
    const device = productById.get(profile.deviceId);
    const cable = productById.get(profile.cableId);
    const destination = productById.get(profile.destinationId);
    const deviceSpecs = device?.specs;
    const cableSpecs = cable?.specs;
    const destinationSpecs = destination?.specs;
    if (
      device?.category !== 'capture_device' ||
      cable?.subcategory !== 'hdmi_cable' ||
      !['field_monitor', 'external_recorder', 'capture_card', 'streaming_device'].includes(
        destination?.subcategory ?? '',
      ) ||
      (profile.powerSourceId && !productIds.has(profile.powerSourceId))
    ) {
      errors.push(`Video path profile references wrong or unknown products: ${profile.id}`);
    }
    const connectorsFit =
      deviceSpecs?.outputConnector === cableSpecs?.inputConnector &&
      cableSpecs?.outputConnector === destinationSpecs?.inputConnector;
    const protocolFits =
      deviceSpecs?.supportedProtocolProfiles?.includes(profile.protocolProfile) === true &&
      cableSpecs?.supportedProtocolProfiles?.includes(profile.protocolProfile) === true &&
      destinationSpecs?.supportedProtocolProfiles?.includes(profile.protocolProfile) === true;
    const modeFits = (specs: Product['specs']): boolean =>
      specs?.supportedModes?.some(
        (mode) =>
          mode.width === profile.mode.width &&
          mode.height === profile.mode.height &&
          mode.frameRate === profile.mode.frameRate,
      ) === true;
    const allModesFit = modeFits(deviceSpecs) && modeFits(cableSpecs) && modeFits(destinationSpecs);
    const capabilityFits =
      destinationSpecs?.capabilities?.includes(profile.requestedCapability) === true;
    const actualConflict = !connectorsFit || !protocolFits || !allModesFit || !capabilityFits;
    const checks = [
      profile.connectorStatus,
      profile.signalStatus,
      profile.capabilityStatus,
      profile.powerStatus,
      profile.safetyStatus,
    ];
    if (profile.verificationStatus === 'verified') {
      if (
        !hasVerifiedOfficialEvidenceCovering(profile.evidenceIds, evidenceById, [
          'signal',
          'electrical',
        ])
      )
        errors.push(`Verified video path lacks official scoped evidence: ${profile.id}`);
      if (profile.expectedStatus === 'unknown')
        errors.push(`Unknown video path cannot be verified: ${profile.id}`);
    } else if (
      profile.expectedStatus !== 'unknown' ||
      checks.some((status) => status !== 'unknown')
    ) {
      errors.push(`Video candidate must remain wholly unknown and non-publishable: ${profile.id}`);
    }
    if (
      isPositive(profile.expectedStatus) &&
      (profile.verificationStatus !== 'verified' ||
        actualConflict ||
        checks.some((s) => s !== 'clear'))
    ) {
      errors.push(`Video path false-positive compatibility: ${profile.id}`);
    }
    if (
      profile.expectedStatus === 'incompatible' &&
      (!actualConflict || !checks.includes('conflict') || profile.limitations.length === 0)
    ) {
      errors.push(`Incompatible video path lacks an exact documented conflict: ${profile.id}`);
    }
    const key = [
      profile.deviceId,
      profile.cableId,
      profile.destinationId,
      profile.requestedCapability,
      profile.mode.width,
      profile.mode.height,
      profile.mode.frameRate,
    ].join('|');
    if (exactVideoKeys.has(key)) errors.push(`Duplicate exact video path profile: ${profile.id}`);
    exactVideoKeys.add(key);
  }

  const exactSupportKeys = new Set<string>();
  for (const profile of supportRigProfiles) {
    const device = productById.get(profile.deviceId);
    const head = productById.get(profile.headId);
    const tripod = productById.get(profile.tripodId);
    const teleprompter = profile.teleprompterId
      ? productById.get(profile.teleprompterId)
      : undefined;
    if (
      device?.category !== 'capture_device' ||
      head?.subcategory !== 'tripod_head' ||
      tripod?.subcategory !== 'tripod' ||
      (profile.teleprompterId && teleprompter?.subcategory !== 'teleprompter') ||
      profile.rigProductIds.some((id) => !productIds.has(id)) ||
      !profile.rigProductIds.includes(profile.deviceId)
    ) {
      errors.push(`Support rig profile references wrong or unknown products: ${profile.id}`);
    }
    const rigWeight = profile.rigProductIds.reduce(
      (total, id) => total + (productById.get(id)?.weightGrams ?? Number.NaN),
      0,
    );
    const calculatedPayload = rigWeight + (teleprompter?.weightGrams ?? 0);
    if (calculatedPayload !== profile.totalPayloadGrams)
      errors.push(`Support rig profile has an incorrect exact payload: ${profile.id}`);
    const mountFits =
      tripod?.specs?.mountOutput === head?.specs?.mountInput &&
      head?.specs?.plateStandards?.includes(device?.specs?.supportMount ?? '') === true &&
      (!teleprompter ||
        (teleprompter.specs?.mountInput === head.specs?.mountOutput &&
          teleprompter.specs?.plateStandards?.includes(head.specs?.mountOutput ?? '') === true));
    const safeFactor = 1 - profile.requiredPayloadMarginPercent / 100;
    const payloadFits =
      isFinitePositive(head?.specs?.maxPayloadGrams) &&
      isFinitePositive(tripod?.specs?.maxPayloadGrams) &&
      profile.totalPayloadGrams <= head.specs.maxPayloadGrams * safeFactor &&
      profile.totalPayloadGrams <= tripod.specs.maxPayloadGrams * safeFactor &&
      (!teleprompter || rigWeight <= (teleprompter.specs?.maxPayloadGrams ?? -1));
    const clearanceFits =
      !teleprompter || profile.rigWidthMm <= (teleprompter.specs?.maxRigWidthMm ?? -1);
    const actualConflict = !mountFits || !payloadFits || !clearanceFits;
    const checks = [profile.mountStatus, profile.payloadStatus, profile.collisionStatus];
    const requiredScopes = teleprompter ? ['mechanical', 'optical'] : ['mechanical'];
    if (profile.verificationStatus === 'verified') {
      if (!hasVerifiedOfficialEvidenceCovering(profile.evidenceIds, evidenceById, requiredScopes))
        errors.push(`Verified support rig lacks official scoped evidence: ${profile.id}`);
      if (profile.expectedStatus === 'unknown')
        errors.push(`Unknown support rig cannot be verified: ${profile.id}`);
    } else if (
      profile.expectedStatus !== 'unknown' ||
      checks.some((status) => status !== 'unknown')
    ) {
      errors.push(
        `Support candidate must remain wholly unknown and non-publishable: ${profile.id}`,
      );
    }
    if (
      isPositive(profile.expectedStatus) &&
      (profile.verificationStatus !== 'verified' ||
        actualConflict ||
        checks.some((s) => s !== 'clear'))
    )
      errors.push(`Support rig false-positive compatibility: ${profile.id}`);
    if (
      profile.expectedStatus === 'incompatible' &&
      (!actualConflict || !checks.includes('conflict') || profile.limitations.length === 0)
    )
      errors.push(`Incompatible support rig lacks an exact documented conflict: ${profile.id}`);
    const key = [
      profile.deviceId,
      ...profile.rigProductIds,
      profile.headId,
      profile.tripodId,
      profile.teleprompterId ?? '',
    ].join('|');
    if (exactSupportKeys.has(key))
      errors.push(`Duplicate exact support rig profile: ${profile.id}`);
    exactSupportKeys.add(key);
  }

  const exactLightingKeys = new Set<string>();
  for (const profile of lightingRigProfiles) {
    const light = productById.get(profile.lightId);
    const modifier = profile.modifierId ? productById.get(profile.modifierId) : undefined;
    const grid = profile.gridId ? productById.get(profile.gridId) : undefined;
    const stand = productById.get(profile.standId);
    const source = profile.powerSourceId ? productById.get(profile.powerSourceId) : undefined;
    const controller = profile.controllerId ? productById.get(profile.controllerId) : undefined;
    if (
      !['led_panel', 'cob_light'].includes(light?.subcategory ?? '') ||
      (profile.modifierId && modifier?.subcategory !== 'softbox') ||
      (profile.gridId && grid?.subcategory !== 'lighting_grid') ||
      stand?.subcategory !== 'light_stand' ||
      (profile.powerSourceId && source?.subcategory !== 'ac_power_supply') ||
      (profile.controllerId && controller?.subcategory !== 'lighting_controller')
    )
      errors.push(`Lighting rig profile references wrong or unknown products: ${profile.id}`);
    const mountedWeight =
      (light?.weightGrams ?? Number.NaN) + (modifier?.weightGrams ?? 0) + (grid?.weightGrams ?? 0);
    if (mountedWeight !== profile.totalMountedWeightGrams)
      errors.push(`Lighting rig profile has an incorrect mounted payload: ${profile.id}`);
    const mountFits =
      stand?.specs?.mountOutput === light?.specs?.mountInput &&
      (light?.specs?.bodyDiameterMm ?? Number.POSITIVE_INFINITY) <=
        (stand?.specs?.maxLightDiameterMm ?? Number.NEGATIVE_INFINITY) &&
      (!modifier || modifier.specs?.mountInput === light.specs?.modifierMount) &&
      (!grid || grid.specs?.mountInput === modifier?.specs?.mountOutput);
    const opticalFits =
      !modifier ||
      (modifier.specs?.clearDiameterMm ?? Number.NEGATIVE_INFINITY) >=
        (light?.specs?.minimumModifierClearApertureMm ?? Number.POSITIVE_INFINITY);
    const safePayload =
      (stand?.specs?.maxPayloadGrams ?? -1) * (1 - profile.requiredPayloadMarginPercent / 100);
    const payloadFits = mountedWeight <= safePayload;
    const electricalFits =
      source?.specs?.outputVoltageV === profile.requiredVoltageV &&
      light?.specs?.inputVoltageV === profile.requiredVoltageV &&
      (source?.specs?.maxPowerWatts ?? -1) >= profile.requiredPowerWatts &&
      light?.specs?.requiredPowerWatts === profile.requiredPowerWatts &&
      source?.specs?.compatibleLightIds?.includes(profile.lightId) === true &&
      source?.specs?.outputConnector === light?.specs?.inputConnector;
    const controlFits =
      !controller ||
      (controller.specs?.wirelessProtocols?.includes(profile.wirelessProtocol ?? '') === true &&
        light?.specs?.wirelessProtocols?.includes(profile.wirelessProtocol ?? '') === true &&
        controller.specs?.compatibleLightIds?.includes(profile.lightId) === true);
    const actualConflict =
      !mountFits || !opticalFits || !payloadFits || !electricalFits || !controlFits;
    const checks = [
      profile.mountStatus,
      profile.payloadStatus,
      profile.electricalStatus,
      profile.controlStatus,
      profile.collisionStatus,
    ];
    if (profile.verificationStatus === 'verified') {
      if (
        !hasVerifiedOfficialEvidenceCovering(profile.evidenceIds, evidenceById, [
          'mechanical',
          'electrical',
          'signal',
        ])
      )
        errors.push(`Verified lighting rig lacks official scoped evidence: ${profile.id}`);
      if (profile.expectedStatus === 'unknown')
        errors.push(`Unknown lighting rig cannot be verified: ${profile.id}`);
    } else if (
      profile.expectedStatus !== 'unknown' ||
      checks.some((status) => status !== 'unknown')
    ) {
      errors.push(
        `Lighting candidate must remain wholly unknown and non-publishable: ${profile.id}`,
      );
    }
    if (
      isPositive(profile.expectedStatus) &&
      (profile.verificationStatus !== 'verified' ||
        actualConflict ||
        checks.some((s) => s !== 'clear'))
    )
      errors.push(`Lighting rig false-positive compatibility: ${profile.id}`);
    if (
      profile.expectedStatus === 'incompatible' &&
      (!actualConflict || !checks.includes('conflict') || profile.limitations.length === 0)
    )
      errors.push(`Incompatible lighting rig lacks an exact documented conflict: ${profile.id}`);
    const key = [
      profile.lightId,
      profile.modifierId ?? '',
      profile.gridId ?? '',
      profile.standId,
      profile.powerSourceId ?? '',
      profile.controllerId ?? '',
    ].join('|');
    if (exactLightingKeys.has(key))
      errors.push(`Duplicate exact lighting rig profile: ${profile.id}`);
    exactLightingKeys.add(key);
  }
  const exactStorageKeys = new Set<string>();
  for (const profile of storageWorkflowProfiles) {
    const computer = productById.get(profile.computerId);
    const dock = profile.dockId ? productById.get(profile.dockId) : undefined;
    const reader = productById.get(profile.readerId);
    const media = productById.get(profile.mediaId);
    const source = profile.powerSourceId ? productById.get(profile.powerSourceId) : undefined;
    if (
      computer?.subcategory !== 'computer' ||
      (profile.dockId && dock?.subcategory !== 'dock') ||
      reader?.subcategory !== 'card_reader' ||
      !['sd_card', 'cfexpress_card', 'ssd'].includes(media?.subcategory ?? '') ||
      (profile.powerSourceId && source?.subcategory !== 'workflow_power_supply')
    )
      errors.push(`Storage workflow references wrong or unknown products: ${profile.id}`);
    if (!hasVerifiedOfficialEvidenceCovering(media?.specs?.evidenceIds, evidenceById, ['memory']))
      errors.push(`Storage workflow media lacks verified memory evidence: ${profile.id}`);
    const connectorsFit = dock
      ? computer?.specs?.outputConnector === dock.specs?.upstreamConnector &&
        dock.specs?.downstreamConnector === reader?.specs?.inputConnector &&
        dock.specs?.directional === true
      : computer?.specs?.outputConnector === reader?.specs?.inputConnector;
    const busFits =
      computer?.specs?.supportedBusProfiles?.includes(profile.busProfile) === true &&
      (!dock || dock.specs?.supportedBusProfiles?.includes(profile.busProfile) === true) &&
      reader?.specs?.supportedBusProfiles?.includes(profile.busProfile) === true;
    const mediaFits =
      reader?.specs?.supportedMediaFormats?.includes(media?.specs?.mediaFormat ?? '') === true &&
      reader.specs?.supportedMediaProtocols?.includes(profile.mediaProtocol) === true &&
      media?.specs?.mediaProtocol === profile.mediaProtocol;
    const mediaRate =
      profile.transferDirection === 'read_from_media'
        ? media?.specs?.sustainedReadMBps
        : media?.specs?.sustainedWriteMBps;
    const limits = [
      computer?.specs?.maxSustainedTransferMBps,
      ...(dock ? [dock.specs?.maxSustainedTransferMBps] : []),
      reader?.specs?.maxSustainedTransferMBps,
      mediaRate,
    ];
    const effective = limits.every(isFinitePositive) ? Math.min(...limits) : undefined;
    const transferFits =
      effective !== undefined && effective >= profile.requiredSustainedTransferMBps;
    const powerFits = dock
      ? dock.specs?.powerMode === 'external_required'
        ? source?.specs?.compatibleDeviceIds?.includes(dock.id) === true &&
          dock.specs?.compatiblePowerSourceIds?.includes(source.id) === true &&
          (source.specs?.maxPowerWatts ?? -1) >=
            (dock.specs?.requiredPowerWatts ?? Number.POSITIVE_INFINITY) +
              (reader?.specs?.requiredPowerWatts ?? Number.POSITIVE_INFINITY)
        : (computer?.specs?.maxBusPowerWatts ?? -1) >=
          (dock.specs?.requiredPowerWatts ?? Number.POSITIVE_INFINITY) +
            (reader?.specs?.requiredPowerWatts ?? Number.POSITIVE_INFINITY)
      : (computer?.specs?.maxBusPowerWatts ?? -1) >=
        (reader?.specs?.requiredPowerWatts ?? Number.POSITIVE_INFINITY);
    const osSoftwareFits =
      computer?.specs?.supportedOsVersions?.includes(profile.osVersion) === true &&
      (!dock || dock.specs?.supportedOsVersions?.includes(profile.osVersion) === true) &&
      reader?.specs?.supportedOsVersions?.includes(profile.osVersion) === true &&
      (!profile.softwareId ||
        computer.specs?.supportedSoftwareIds?.includes(profile.softwareId) === true);
    const actualConflict =
      !connectorsFit || !busFits || !mediaFits || !transferFits || !powerFits || !osSoftwareFits;
    if (profile.verificationStatus === 'verified') {
      if (
        !hasVerifiedOfficialEvidenceCovering(profile.evidenceIds, evidenceById, [
          'signal',
          'electrical',
          'software',
          'memory',
        ])
      )
        errors.push(`Verified storage workflow lacks official scoped evidence: ${profile.id}`);
      if (profile.expectedStatus === 'unknown')
        errors.push(`Unknown storage workflow cannot be verified: ${profile.id}`);
    } else if (profile.expectedStatus !== 'unknown') {
      errors.push(`Storage candidate must remain unknown and non-publishable: ${profile.id}`);
    }
    if (
      isPositive(profile.expectedStatus) &&
      (profile.verificationStatus !== 'verified' || actualConflict)
    )
      errors.push(`Storage workflow false-positive compatibility: ${profile.id}`);
    if (
      profile.expectedStatus === 'incompatible' &&
      (!actualConflict || profile.limitations.length === 0)
    )
      errors.push(`Incompatible storage workflow lacks an exact conflict: ${profile.id}`);
    const key = [
      profile.computerId,
      profile.dockId ?? '',
      profile.readerId,
      profile.mediaId,
      profile.powerSourceId ?? '',
      profile.busProfile,
      profile.transferDirection,
    ].join('|');
    if (exactStorageKeys.has(key)) errors.push(`Duplicate exact storage workflow: ${profile.id}`);
    exactStorageKeys.add(key);
  }

  const exactPodcastKeys = new Set<string>();
  for (const profile of podcastMobileWorkflowProfiles) {
    const host = productById.get(profile.hostId);
    const audioInterface = productById.get(profile.interfaceId);
    const sources = profile.sourceIds.map((id) => productById.get(id));
    const monitoring = profile.monitoringId ? productById.get(profile.monitoringId) : undefined;
    const powerSource = profile.powerSourceId ? productById.get(profile.powerSourceId) : undefined;
    const cables = profile.requiredCableIds.map((id) => productById.get(id));
    if (
      !['computer', 'phone'].includes(host?.subcategory ?? '') ||
      audioInterface?.subcategory !== 'audio_interface' ||
      sources.length === 0 ||
      sources.some((source) => source?.subcategory !== 'xlr_microphone') ||
      (profile.monitoringId && monitoring?.subcategory !== 'headphones') ||
      (profile.powerSourceId && powerSource?.subcategory !== 'workflow_power_supply') ||
      cables.some((cable) => !['xlr_cable', 'usb_audio_cable'].includes(cable?.subcategory ?? ''))
    )
      errors.push(`Podcast workflow references wrong or unknown products: ${profile.id}`);
    const usbCables = cables.filter((cable) => cable?.subcategory === 'usb_audio_cable');
    const xlrCables = cables.filter((cable) => cable?.subcategory === 'xlr_cable');
    const connectorsFit =
      host?.specs?.outputConnector === audioInterface?.specs?.upstreamConnector &&
      usbCables.length === 1 &&
      xlrCables.length === sources.length &&
      sources.every((source) =>
        audioInterface?.specs?.sourceInputConnectors?.includes(
          source?.specs?.outputConnector ?? '',
        ),
      ) &&
      (!monitoring ||
        audioInterface?.specs?.monitoringOutputConnectors?.includes(
          monitoring.specs?.inputConnector ?? '',
        ) === true);
    const busFits =
      host?.specs?.supportedBusProfiles?.includes(profile.busProfile) === true &&
      audioInterface?.specs?.supportedBusProfiles?.includes(profile.busProfile) === true &&
      host.specs?.supportedAudioProtocols?.includes(profile.audioProtocol) === true &&
      audioInterface.specs?.supportedAudioProtocols?.includes(profile.audioProtocol) === true;
    const sourceChannels = sources.reduce(
      (sum, source) => sum + (source?.specs?.channelCount ?? 0),
      0,
    );
    const channelsFit =
      sourceChannels === profile.channelCount &&
      profile.channelCount <= (host?.specs?.maxInputChannels ?? -1) &&
      profile.channelCount <= (audioInterface?.specs?.maxInputChannels ?? -1) &&
      sources.every((source) =>
        audioInterface?.specs?.sourceSignalProtocols?.includes(source?.specs?.signalProtocol ?? ''),
      );
    const requiredAudioMBps =
      (profile.sampleRateHz * profile.bitDepth * profile.channelCount) / 8 / 1_000_000;
    const formatFits =
      profile.sampleRateHz <= (audioInterface?.specs?.maxSampleRateHz ?? -1) &&
      profile.bitDepth <= (audioInterface?.specs?.maxBitDepth ?? -1) &&
      requiredAudioMBps <= (host?.specs?.maxSustainedAudioMBps ?? -1) &&
      requiredAudioMBps <= (audioInterface?.specs?.maxSustainedAudioMBps ?? -1);
    const phantomSources = sources.filter((source) => source?.specs?.requiresPhantomPower);
    const phantomWatts = phantomSources.reduce(
      (sum, source) => sum + (source?.specs?.phantomPowerWatts ?? 0),
      0,
    );
    const requiredPower =
      (audioInterface?.specs?.requiredPowerWatts ?? Number.POSITIVE_INFINITY) + phantomWatts;
    const powerFits =
      phantomSources.length <= (audioInterface?.specs?.phantomPowerChannels ?? -1) &&
      (phantomSources.length === 0 || audioInterface?.specs?.phantomPowerAvailable === true) &&
      (audioInterface?.specs?.powerMode === 'bus_powered'
        ? (host?.specs?.maxBusPowerWatts ?? -1) >= requiredPower
        : audioInterface?.specs?.powerMode === 'external_required'
          ? powerSource?.specs?.compatibleInterfaceIds?.includes(audioInterface.id) === true &&
            audioInterface.specs?.compatiblePowerSourceIds?.includes(powerSource.id) === true &&
            (powerSource.specs?.maxPowerWatts ?? -1) >= requiredPower
          : false);
    const osAppFits =
      host?.specs?.supportedOsVersions?.includes(profile.osVersion) === true &&
      audioInterface?.specs?.supportedOsVersions?.includes(profile.osVersion) === true &&
      host.specs?.supportedAppIds?.includes(profile.appId) === true;
    const actualConflict =
      !connectorsFit || !busFits || !channelsFit || !formatFits || !powerFits || !osAppFits;
    if (profile.verificationStatus === 'verified') {
      if (
        !hasVerifiedOfficialEvidenceCovering(profile.evidenceIds, evidenceById, [
          'signal',
          'electrical',
          'software',
        ])
      )
        errors.push(`Verified podcast workflow lacks official scoped evidence: ${profile.id}`);
      if (profile.expectedStatus === 'unknown')
        errors.push(`Unknown podcast workflow cannot be verified: ${profile.id}`);
    } else if (profile.expectedStatus !== 'unknown') {
      errors.push(`Podcast candidate must remain unknown and non-publishable: ${profile.id}`);
    }
    if (
      isPositive(profile.expectedStatus) &&
      (profile.verificationStatus !== 'verified' || actualConflict)
    )
      errors.push(`Podcast workflow false-positive compatibility: ${profile.id}`);
    if (
      profile.expectedStatus === 'incompatible' &&
      (!actualConflict || profile.limitations.length === 0)
    )
      errors.push(`Incompatible podcast workflow lacks an exact conflict: ${profile.id}`);
    const key = [
      profile.hostId,
      profile.interfaceId,
      ...profile.sourceIds,
      profile.monitoringId ?? '',
      profile.powerSourceId ?? '',
      profile.busProfile,
      profile.channelCount,
    ].join('|');
    if (exactPodcastKeys.has(key)) errors.push(`Duplicate exact podcast workflow: ${profile.id}`);
    exactPodcastKeys.add(key);
  }
  for (const edge of data.compatibilityEdges) {
    if (!productIds.has(edge.sourceProductId) || !productIds.has(edge.targetProductId))
      errors.push(`Dangling edge: ${edge.id}`);
    if (edge.verificationStatus === 'verified' && edge.relationType === 'candidate')
      errors.push(`Candidate marked verified: ${edge.id}`);
    if (edge.verificationStatus === 'verified' && edge.evidenceIds.length === 0)
      errors.push(`Verified edge without evidence: ${edge.id}`);
    if (
      edge.verificationStatus === 'verified' &&
      edge.evidenceIds.some((id) => !evidenceIds.has(id))
    )
      errors.push(`Unknown evidence on edge: ${edge.id}`);
    if (edge.requiredProductIds.some((id) => !productIds.has(id)))
      errors.push(`Unknown required product on edge: ${edge.id}`);
  }
  for (const mode of data.recordingModes) {
    if (mode.evidenceIds.length === 0 || mode.evidenceIds.some((id) => !evidenceIds.has(id)))
      errors.push(`Recording mode lacks evidence: ${mode.id}`);
    if (
      !productIds.has(mode.deviceId) ||
      !isFinitePositive(mode.bitrateMbps) ||
      !mode.mediaFormats.length ||
      !isFinitePositive(mode.minimumSustainedWriteMBps) ||
      !Number.isFinite(mode.safetyMarginPercent) ||
      mode.safetyMarginPercent < 0 ||
      (mode.minimumSpeedClass !== 'brak klasy SD' && !/^V\d+$/.test(mode.minimumSpeedClass))
    ) {
      errors.push(`Recording mode has incomplete deterministic media requirements: ${mode.id}`);
    }
    if (!hasVerifiedOfficialEvidenceCovering(mode.evidenceIds, evidenceById, ['memory'])) {
      errors.push(`Recording mode lacks verified memory evidence: ${mode.id}`);
    }
  }
  if (data.useCaseTemplates.length !== 10)
    errors.push('Demo dataset must contain exactly 10 use-case templates.');
  const useCases = new Set(data.useCaseTemplates.map((template) => template.useCase));
  if (useCases.size !== data.useCaseTemplates.length)
    errors.push('Demo use-case templates must have unique useCase identifiers.');
  const m4CompleteTemplateIds = new Set([
    'vlog-demo',
    'two-person-interview-demo',
    'podcast-demo',
    'event-recording-demo',
  ]);
  for (const template of data.useCaseTemplates) {
    if (template.defaultProductIds.some((id) => !productIds.has(id))) {
      errors.push(`Use-case template references unknown product: ${template.id}`);
    }
    if (m4CompleteTemplateIds.has(template.id)) {
      const exactRig = data.rigs.find((rig) => rig.useCaseTemplateId === template.id);
      if (
        !exactRig ||
        exactRig.selectedProductIds.length !== template.defaultProductIds.length ||
        exactRig.selectedProductIds.some((id) => !template.defaultProductIds.includes(id))
      )
        errors.push(`M4 use-case template lacks one exact complete rig: ${template.id}`);
    }
  }
  for (const rig of data.rigs) {
    if (rig.selectedProductIds.some((id) => !productIds.has(id)))
      errors.push(`Rig references unknown product: ${rig.id}`);
    const selectedIds = new Set(rig.selectedProductIds);
    const selectedBySubcategory = (subcategories: readonly string[]): readonly string[] =>
      rig.selectedProductIds.filter((id) =>
        subcategories.includes(productById.get(id)?.subcategory ?? ''),
      );
    const selectedComputers = selectedBySubcategory(['computer']);
    const selectedDocks = selectedBySubcategory(['dock']);
    const selectedReaders = selectedBySubcategory(['card_reader']);
    const selectedStorageMedia = selectedBySubcategory(['sd_card', 'cfexpress_card', 'ssd']);
    if (rig.recordingModeId) {
      const mode = data.recordingModes.find((candidate) => candidate.id === rig.recordingModeId);
      const captureDeviceIds = selectedBySubcategory(['camera', 'phone', 'camcorder']);
      const recordingMedia = selectedStorageMedia
        .map((id) => productById.get(id))
        .filter((product) => mode?.mediaFormats.includes(product?.specs?.mediaFormat ?? ''));
      if (!mode || !captureDeviceIds.includes(mode.deviceId) || recordingMedia.length !== 1) {
        errors.push(`Rig recording mode lacks one exact device and medium: ${rig.id}`);
      } else if (!isFinitePositive(rig.plannedDurationMinutes)) {
        errors.push(`Rig recording plan lacks a positive duration: ${rig.id}`);
      } else {
        const medium = recordingMedia[0];
        const requiredBytes =
          (mode.bitrateMbps *
            1_000_000 *
            rig.plannedDurationMinutes *
            60 *
            (1 + mode.safetyMarginPercent / 100)) /
          8;
        const availableBytes = (medium?.specs?.capacityGb ?? 0) * 1_000_000_000;
        if (availableBytes < requiredBytes) {
          errors.push(`Rig media capacity does not cover planned duration with margin: ${rig.id}`);
        }
        if (
          (medium?.specs?.sustainedWriteMBps ?? 0) <
          mode.minimumSustainedWriteMBps * (1 + mode.safetyMarginPercent / 100)
        ) {
          errors.push(`Rig media cannot sustain recording mode with margin: ${rig.id}`);
        }
      }
    }
    const selectedWorkflowPower = selectedBySubcategory(['workflow_power_supply']);
    if (selectedComputers.length > 0 && (selectedReaders.length > 0 || selectedDocks.length > 0)) {
      const exactStorage = storageWorkflowProfiles.some(
        (profile) =>
          profile.verificationStatus === 'verified' &&
          isPositive(profile.expectedStatus) &&
          selectedComputers.length === 1 &&
          selectedComputers[0] === profile.computerId &&
          selectedReaders.length === 1 &&
          selectedReaders[0] === profile.readerId &&
          selectedStorageMedia.includes(profile.mediaId) &&
          (profile.dockId
            ? selectedDocks.length === 1 && selectedDocks[0] === profile.dockId
            : selectedDocks.length === 0) &&
          (profile.powerSourceId ? selectedWorkflowPower.includes(profile.powerSourceId) : true),
      );
      if (!exactStorage)
        errors.push(`Rig storage workflow lacks one exact verified profile: ${rig.id}`);
    }
    const selectedInterfaces = selectedBySubcategory(['audio_interface']);
    if (selectedInterfaces.length > 0) {
      const selectedPodcastSources = selectedBySubcategory(['xlr_microphone']);
      const selectedMonitoring = selectedBySubcategory(['headphones']);
      const selectedPodcastCables = selectedBySubcategory(['xlr_cable', 'usb_audio_cable']);
      const exactPodcast = podcastMobileWorkflowProfiles.some(
        (profile) =>
          profile.verificationStatus === 'verified' &&
          isPositive(profile.expectedStatus) &&
          selectedInterfaces.length === 1 &&
          selectedInterfaces[0] === profile.interfaceId &&
          selectedIds.has(profile.hostId) &&
          selectedPodcastSources.length === profile.sourceIds.length &&
          profile.sourceIds.every((id) => selectedPodcastSources.includes(id)) &&
          (profile.monitoringId
            ? selectedMonitoring.length === 1 && selectedMonitoring[0] === profile.monitoringId
            : selectedMonitoring.length === 0) &&
          (profile.powerSourceId ? selectedWorkflowPower.includes(profile.powerSourceId) : true) &&
          selectedPodcastCables.length === profile.requiredCableIds.length &&
          profile.requiredCableIds.every((id) => selectedPodcastCables.includes(id)),
      );
      if (!exactPodcast)
        errors.push(`Rig podcast workflow lacks one exact verified profile: ${rig.id}`);
    }
    const selectedVideoCableIds = selectedBySubcategory(['hdmi_cable']);
    const selectedVideoDestinationIds = selectedBySubcategory([
      'field_monitor',
      'external_recorder',
      'capture_card',
      'streaming_device',
    ]);
    if (selectedVideoCableIds.length > 0 || selectedVideoDestinationIds.length > 0) {
      const exactVideo = videoPathProfiles.some(
        (profile) =>
          profile.verificationStatus === 'verified' &&
          isPositive(profile.expectedStatus) &&
          selectedVideoCableIds.length === 1 &&
          selectedVideoCableIds[0] === profile.cableId &&
          selectedVideoDestinationIds.length === 1 &&
          selectedVideoDestinationIds[0] === profile.destinationId &&
          selectedIds.has(profile.deviceId),
      );
      if (!exactVideo) errors.push(`Rig video path lacks one exact verified profile: ${rig.id}`);
    }
    const selectedHeads = selectedBySubcategory(['tripod_head']);
    const selectedTripods = selectedBySubcategory(['tripod']);
    const selectedPrompters = selectedBySubcategory(['teleprompter']);
    if (selectedHeads.length || selectedTripods.length || selectedPrompters.length) {
      const exactSupport = supportRigProfiles.some(
        (profile) =>
          profile.verificationStatus === 'verified' &&
          isPositive(profile.expectedStatus) &&
          selectedHeads.length === 1 &&
          selectedHeads[0] === profile.headId &&
          selectedTripods.length === 1 &&
          selectedTripods[0] === profile.tripodId &&
          (profile.teleprompterId
            ? selectedPrompters.length === 1 && selectedPrompters[0] === profile.teleprompterId
            : selectedPrompters.length === 0) &&
          profile.rigProductIds.every((id) => selectedIds.has(id)),
      );
      if (!exactSupport) errors.push(`Rig support lacks one exact verified profile: ${rig.id}`);
    }
    const selectedLights = selectedBySubcategory(['led_panel', 'cob_light']);
    const selectedModifiers = selectedBySubcategory(['softbox']);
    const selectedGrids = selectedBySubcategory(['lighting_grid']);
    const selectedStands = selectedBySubcategory(['light_stand']);
    const selectedAcSources = selectedBySubcategory(['ac_power_supply']);
    const selectedControllers = selectedBySubcategory(['lighting_controller']);
    if (selectedLights.length || selectedStands.length || selectedAcSources.length) {
      const exactLighting = lightingRigProfiles.some(
        (profile) =>
          profile.verificationStatus === 'verified' &&
          isPositive(profile.expectedStatus) &&
          selectedLights.length === 1 &&
          selectedLights[0] === profile.lightId &&
          selectedStands.length === 1 &&
          selectedStands[0] === profile.standId &&
          (profile.modifierId
            ? selectedModifiers.length === 1 && selectedModifiers[0] === profile.modifierId
            : selectedModifiers.length === 0) &&
          (profile.gridId
            ? selectedGrids.length === 1 && selectedGrids[0] === profile.gridId
            : selectedGrids.length === 0) &&
          (profile.powerSourceId
            ? selectedAcSources.length === 1 && selectedAcSources[0] === profile.powerSourceId
            : selectedAcSources.length === 0) &&
          (profile.controllerId
            ? selectedControllers.length === 1 && selectedControllers[0] === profile.controllerId
            : selectedControllers.length === 0),
      );
      if (!exactLighting) errors.push(`Rig lighting lacks one exact verified profile: ${rig.id}`);
    }
    const selectedDeviceIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.category === 'capture_device',
    );
    const selectedPowerSourceIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'power_bank',
    );
    const selectedPowerCableIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'usb_c_cable',
    );
    if (selectedPowerSourceIds.length > 0 || selectedPowerCableIds.length > 0) {
      const confirmedExactPath = powerPathProfiles.some(
        (profile) =>
          profile.expectedStatus === 'compatible_with_limitations' &&
          selectedDeviceIds.includes(profile.deviceId) &&
          selectedPowerSourceIds.includes(profile.powerSourceId) &&
          selectedPowerCableIds.includes(profile.cableId),
      );
      if (
        selectedDeviceIds.length !== 1 ||
        selectedPowerSourceIds.length !== 1 ||
        selectedPowerCableIds.length !== 1 ||
        !confirmedExactPath
      ) {
        errors.push(`Rig power recommendation lacks one exact confirmed path: ${rig.id}`);
      }
    }
    const selectedCageIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'cage',
    );
    const selectedFilterIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'round_filter',
    );
    const selectedStepUpRingIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'step_up_ring',
    );
    const selectedMatteBoxIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'matte_box',
    );
    const selectedLensIds = rig.selectedProductIds.filter(
      (id) => productById.get(id)?.subcategory === 'lens',
    );
    if (
      selectedFilterIds.length > 0 ||
      selectedStepUpRingIds.length > 0 ||
      selectedMatteBoxIds.length > 0
    ) {
      const confirmedExactFilterProfile = filterRigProfiles.some(
        (profile) =>
          profile.publicationStatus === 'verified' &&
          profile.expectedStatus !== 'unknown' &&
          profile.expectedStatus !== 'incompatible' &&
          selectedDeviceIds.length === 1 &&
          selectedDeviceIds[0] === profile.deviceId &&
          selectedLensIds.length === 1 &&
          selectedLensIds[0] === profile.lensId &&
          (profile.filterId
            ? selectedFilterIds.length === 1 && selectedFilterIds.includes(profile.filterId)
            : selectedFilterIds.length === 0) &&
          (profile.stepUpRingId
            ? selectedStepUpRingIds.length === 1 &&
              selectedStepUpRingIds.includes(profile.stepUpRingId)
            : selectedStepUpRingIds.length === 0) &&
          (profile.matteBoxId
            ? selectedMatteBoxIds.length === 1 && selectedMatteBoxIds.includes(profile.matteBoxId)
            : selectedMatteBoxIds.length === 0),
      );
      if (!confirmedExactFilterProfile) {
        errors.push(`Rig filter recommendation lacks one exact verified profile: ${rig.id}`);
      }
    }
    if (selectedCageIds.length > 0) {
      const exactGimbalProfiles = data.gimbalRigProfiles.filter(
        (profile) =>
          selectedIds.has(profile.deviceId) &&
          selectedIds.has(profile.audioId) &&
          (!profile.lensId || selectedIds.has(profile.lensId)) &&
          (!profile.mediaId || selectedIds.has(profile.mediaId)) &&
          (profile.filterId
            ? selectedFilterIds.length === 1 && selectedFilterIds.includes(profile.filterId)
            : selectedFilterIds.length === 0) &&
          (profile.stepUpRingId
            ? selectedStepUpRingIds.length === 1 &&
              selectedStepUpRingIds.includes(profile.stepUpRingId)
            : selectedStepUpRingIds.length === 0) &&
          (profile.matteBoxId
            ? selectedMatteBoxIds.length === 1 && selectedMatteBoxIds.includes(profile.matteBoxId)
            : selectedMatteBoxIds.length === 0),
      );
      if (
        exactGimbalProfiles.length === 0 ||
        exactGimbalProfiles.every(
          (profile) => !profile.cageId || !selectedCageIds.includes(profile.cageId),
        )
      ) {
        errors.push(`Rig with cage lacks cage-bound gimbal geometry: ${rig.id}`);
      }
    }
  }
  return errors;
}

async function main(): Promise<void> {
  const path = fileURLToPath(new URL('../data/fixtures/demo-catalog.json', import.meta.url));
  const data = JSON.parse(await readFile(path, 'utf8')) as DemoData;
  const errors = validateDemoData(data);
  if (errors.length > 0) throw new Error(`Data validation failed:\n${errors.join('\n')}`);
  process.stdout.write(
    `Validated ${data.products.length} products, ${data.gimbalRigProfiles.length} gimbal rig profiles, ${data.cageRigProfiles.length} cage rig profiles, ${data.powerPathProfiles.length} power path profiles, ${data.filterRigProfiles.length} filter rig profiles, ${data.videoPathProfiles.length} video path profiles, ${data.supportRigProfiles.length} support rig profiles, ${data.lightingRigProfiles.length} lighting rig profiles, ${data.storageWorkflowProfiles.length} storage workflows, ${data.podcastMobileWorkflowProfiles.length} podcast/mobile workflows, ${data.useCaseTemplates.length} use-case templates, ${data.compatibilityEdges.length} edges, and ${data.evidence.length} evidence records.\n`,
  );
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
