import { useEffect, useMemo, useState } from 'react';
import {
  assessOffer,
  rankOffers,
  safeMerchantAffiliateUrl,
  sponsorshipDisclosure,
  type AffiliateOffer,
  type MerchantUrlPolicy,
} from '@creatorrig/affiliate-offers';
import {
  calculatePower,
  calculatePrice,
  calculateStorage,
  calculateWeight,
} from '@creatorrig/calculation-engine';
import {
  evaluateAudioCompatibility,
  evaluateCageCompatibility,
  evaluateFilterMatteBoxCompatibility,
  evaluateGimbalCompatibility,
  evaluateLightingRig,
  evaluateMediaPath,
  evaluateMemoryCompatibility,
  evaluateOpticsCompatibility,
  evaluatePodcastMobileWorkflow,
  evaluatePowerPath,
  evaluateStorageWorkflow,
  evaluateSupportRig,
  isPositiveStatus,
  type AudioAdapter,
  type AudioCompatibilityEvaluation,
  type AudioConnector,
  type AudioSignal,
  type CageCompatibilityEvaluation,
  type ExactSafetyStatus,
  type FilterMatteBoxEvaluation,
  type GimbalCompatibilityEvaluation,
  type LightingRigEvaluation,
  type MediaPathEvaluation,
  type MediaCapability,
  type MemoryCompatibilityEvaluation,
  type MicrophonePower,
  type OpticsCompatibilityEvaluation,
  type PowerPathEvaluation,
  type PodcastMobileWorkflowEvaluation,
  type StorageTransferDirection,
  type StorageWorkflowEvaluation,
  type SupportRigEvaluation,
  type VerificationStatus,
} from '@creatorrig/compatibility-evaluator';
import { searchProducts } from '@creatorrig/model-search';
import {
  decodeRigFragment,
  encodeRigFragment,
  sanitizePortableRig,
  type PortableRig,
} from '@creatorrig/rig-exchange';
import demoCatalog from '../../../../data/fixtures/demo-catalog.json';
import offerFixture from '../../../../data/offers/synthetic-offers.json';
import {
  dimensionExplanation,
  dimensionLabel,
  dimensionStatusLabel,
  evidenceHeading,
  evidenceSourceLabel,
  formatEvidenceDate,
  localizeCompatibilityMessage,
  localizeTechnicalCopy,
  relationTypeLabel,
  searchMatchLabel,
} from '../lib/polish-labels';

type Product = (typeof demoCatalog.products)[number];
type Edge = (typeof demoCatalog.compatibilityEdges)[number];

const demoOffers = offerFixture.offers as readonly AffiliateOffer[];
const offerAssessmentOptions = {
  now: '2026-07-17T20:00:00.000Z',
  staleAfterDays: 30,
  allowedMerchantHosts: ['creator-supply.synthetic.example', 'rig-outlet.synthetic.example'],
} as const;
const demoMerchantPolicies: readonly MerchantUrlPolicy[] = [
  {
    merchant: 'Creator Supply Demo',
    host: 'creator-supply.synthetic.example',
    allowedPathPrefixes: ['/products/'],
  },
  {
    merchant: 'Rig Outlet Demo',
    host: 'rig-outlet.synthetic.example',
    allowedPathPrefixes: ['/catalog/'],
  },
];

function safeDemoOfferUrl(offer: AffiliateOffer): string | undefined {
  return safeMerchantAffiliateUrl(offer.affiliateUrl, offer.merchant, demoMerchantPolicies);
}

interface DemoGimbalSpecs {
  readonly ratedPayloadGrams?: number;
  readonly payloadSafetyMarginPercent?: number;
  readonly supportedCameraMounts?: readonly string[];
  readonly maximumPackageWidthMm?: number;
  readonly maximumPackageHeightMm?: number;
  readonly maximumPackageDepthMm?: number;
  readonly maximumCenterOfGravityOffsetMm?: number;
  readonly evidenceIds?: readonly string[];
}

interface DemoCageSpecs {
  readonly compatibleDeviceIds?: readonly string[];
  readonly incompatibleDeviceIds?: readonly string[];
  readonly supportedCameraAttachments?: readonly string[];
  readonly accessoryMounts?: readonly string[];
  readonly accessiblePorts?: readonly string[];
  readonly accessibleDoors?: readonly string[];
  readonly evidenceIds?: readonly string[];
}

interface DemoPowerSourceSpecs {
  readonly outputConnector?: string;
  readonly protocol?: string;
  readonly pdProfiles?: readonly { readonly voltageV: number; readonly maxCurrentA: number }[];
  readonly maximumPowerWatts?: number;
  readonly energyWh?: number;
  readonly efficiencyPercent?: number;
  readonly evidenceIds?: readonly string[];
}

interface DemoPowerCableSpecs {
  readonly inputConnector?: string;
  readonly outputConnector?: string;
  readonly directional?: boolean;
  readonly supportedProtocols?: readonly string[];
  readonly maxVoltageV?: number;
  readonly maxCurrentA?: number;
  readonly maximumPowerWatts?: number;
  readonly evidenceIds?: readonly string[];
}

interface DemoOpticalAccessorySpecs {
  readonly sensorDiagonalMm?: number;
  readonly filterThreadMm?: number;
  readonly outerDiameterMm?: number;
  readonly imageCircleMm?: number;
  readonly minimumClearApertureMm?: number;
  readonly inputThreadDiameterMm?: number;
  readonly outputThreadDiameterMm?: number;
  readonly directional?: boolean;
  readonly clearApertureMm?: number;
  readonly clampDiameterMm?: number;
  readonly supportedLensOuterDiameterMm?: number;
  readonly maximumSupportedFilterDiameterMm?: number;
  readonly evidenceIds?: readonly string[];
}

interface DemoM3Specs {
  readonly outputConnector?: string;
  readonly inputConnector?: string;
  readonly direction?: 'output' | 'input' | 'bidirectional' | 'unknown';
  readonly protocolProfile?: string;
  readonly supportedProtocolProfiles?: readonly string[];
  readonly supportedModes?: readonly {
    readonly width: number;
    readonly height: number;
    readonly frameRate: number;
  }[];
  readonly directional?: boolean;
  readonly capabilities?: readonly ('monitor' | 'record' | 'capture' | 'stream')[];
  readonly powerMode?: 'self_powered' | 'usb_bus_powered' | 'external_required' | 'unknown';
  readonly compatiblePowerSourceIds?: readonly string[];
  readonly mountInput?: string;
  readonly mountOutput?: string;
  readonly supportMount?: string;
  readonly plateStandards?: readonly string[];
  readonly maxPayloadGrams?: number;
  readonly maxRigWidthMm?: number;
  readonly modifierMount?: string;
  readonly bodyDiameterMm?: number;
  readonly minimumModifierClearApertureMm?: number;
  readonly clearDiameterMm?: number;
  readonly maximumLightDiameterMm?: number;
  readonly inputVoltageV?: number;
  readonly outputVoltageV?: number;
  readonly requiredPowerWatts?: number;
  readonly maximumPowerWatts?: number;
  readonly wirelessProtocols?: readonly string[];
  readonly compatibleLightIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
}

interface DemoM4Specs {
  readonly outputConnector?: string;
  readonly inputConnector?: string;
  readonly direction?: 'host' | 'device' | 'bidirectional' | 'unknown';
  readonly directional?: boolean;
  readonly powerMode?: 'bus_powered' | 'external_required' | 'self_powered' | 'unknown';
  readonly compatiblePowerSourceIds?: readonly string[];
  readonly requiredPowerWatts?: number;
  readonly maxPowerWatts?: number;
  readonly evidenceIds?: readonly string[];
  readonly supportedBusProfiles?: readonly string[];
  readonly maxSustainedTransferMBps?: number;
  readonly maxBusPowerWatts?: number;
  readonly supportedOsVersions?: readonly string[];
  readonly supportedSoftwareIds?: readonly string[];
  readonly upstreamConnector?: string;
  readonly downstreamConnector?: string;
  readonly downstreamPowerWatts?: number;
  readonly supportedMediaFormats?: readonly string[];
  readonly supportedMediaProtocols?: readonly string[];
  readonly mediaFormat?: string;
  readonly mediaProtocol?: string;
  readonly sustainedReadMBps?: number;
  readonly sustainedWriteMBps?: number;
  readonly compatibleDeviceIds?: readonly string[];
  readonly supportedAudioProtocols?: readonly string[];
  readonly maxSustainedAudioMBps?: number;
  readonly maxInputChannels?: number;
  readonly supportedAppIds?: readonly string[];
  readonly sourceInputConnectors?: readonly string[];
  readonly sourceSignalProtocols?: readonly string[];
  readonly monitoringOutputConnectors?: readonly string[];
  readonly maxSampleRateHz?: number;
  readonly maxBitDepth?: number;
  readonly phantomPowerAvailable?: boolean;
  readonly phantomPowerChannels?: number;
  readonly compatibleInterfaceIds?: readonly string[];
  readonly signalProtocol?: string;
  readonly channelCount?: number;
  readonly requiresPhantomPower?: boolean;
  readonly phantomPowerWatts?: number;
  readonly selfPowered?: boolean;
}

interface DemoCoreSpecs {
  readonly evidenceIds?: readonly string[];
  readonly audioInput?: string;
  readonly audioInputChannels?: number;
  readonly plugInPower?: boolean;
  readonly maxInputChannels?: number;
  readonly maxBusPowerWatts?: number;
  readonly supportedAudioProtocols?: readonly string[];
  readonly audioOutput?: string;
  readonly signal?: string;
  readonly channels?: number;
  readonly requiresPlugInPower?: boolean;
  readonly selfPowered?: boolean;
  readonly busPowered?: boolean;
  readonly input?: string;
  readonly output?: string;
  readonly passesPlugInPower?: boolean;
  readonly lensMount?: string;
  readonly sensorDiagonalMm?: number;
  readonly supportsAutofocus?: boolean;
  readonly supportsElectronicAperture?: boolean;
  readonly supportsStabilization?: boolean;
  readonly supportsExif?: boolean;
  readonly imageCircleMm?: number;
  readonly autofocus?: boolean;
  readonly apertureControl?: boolean;
  readonly stabilization?: boolean;
  readonly exif?: boolean;
  readonly filterThreadMm?: number;
  readonly inputMount?: string;
  readonly outputMount?: string;
  readonly mediaFormats?: readonly string[];
  readonly maxMediaCapacityGb?: number;
  readonly mediaFormat?: string;
  readonly capacityGb?: number;
  readonly sustainedWriteMBps?: number;
  readonly speedClasses?: readonly string[];
  readonly fileSystem?: string;
}

interface RigState {
  deviceId: string;
  audioId: string;
  lensId: string;
  cardId: string;
  cageId: string;
  gimbalId: string;
  powerSourceId: string;
  powerCableId: string;
  filterId: string;
  stepUpRingId: string;
  matteBoxId: string;
  videoCableId: string;
  videoDestinationId: string;
  tripodHeadId: string;
  tripodId: string;
  teleprompterId: string;
  lightId: string;
  lightModifierId: string;
  lightGridId: string;
  lightStandId: string;
  lightPowerSourceId: string;
  lightControllerId: string;
  workflowComputerId: string;
  workflowDockId: string;
  workflowReaderId: string;
  workflowMediaId: string;
  workflowPowerSourceId: string;
  podcastHostId: string;
  podcastInterfaceId: string;
  podcastSourceAId: string;
  podcastSourceBId: string;
  podcastMonitoringId: string;
  podcastPowerSourceId: string;
  modeId: string;
  extraIds: string[];
  ownedIds: string[];
  plannedMinutes: number;
}

const initialState: RigState = {
  deviceId: 'novacam-n7',
  audioId: 'echomic-shot-s',
  lensId: 'clearlens-n23',
  cardId: 'swiftcard-v90-512',
  cageId: 'motionrig-n7-form-cage',
  gimbalId: 'motionrig-flow-pro',
  powerSourceId: 'powerframe-pd-72',
  powerCableId: 'powerframe-usbc-pd-60-cable',
  filterId: 'clearfilter-vnd-67',
  stepUpRingId: 'clearfilter-step-up-49-67',
  matteBoxId: '',
  videoCableId: '',
  videoDestinationId: '',
  tripodHeadId: '',
  tripodId: '',
  teleprompterId: '',
  lightId: '',
  lightModifierId: '',
  lightGridId: '',
  lightStandId: '',
  lightPowerSourceId: '',
  lightControllerId: '',
  workflowComputerId: '',
  workflowDockId: '',
  workflowReaderId: '',
  workflowMediaId: '',
  workflowPowerSourceId: '',
  podcastHostId: '',
  podcastInterfaceId: '',
  podcastSourceAId: '',
  podcastSourceBId: '',
  podcastMonitoringId: '',
  podcastPowerSourceId: '',
  modeId: 'n7-4k60',
  extraIds: [],
  ownedIds: ['novacam-n7'],
  plannedMinutes: 60,
};

const categories = {
  devices: demoCatalog.products.filter((product) => product.category === 'capture_device'),
  audio: demoCatalog.products.filter(
    (product) =>
      product.category === 'audio' &&
      ['wired_microphone', 'audio_receiver'].includes(product.subcategory),
  ),
  lenses: demoCatalog.products.filter((product) => product.subcategory === 'lens'),
  cards: demoCatalog.products.filter((product) =>
    ['sd_card', 'cfexpress_card'].includes(product.subcategory),
  ),
  gimbals: demoCatalog.products.filter((product) => product.subcategory === 'gimbal'),
  cages: demoCatalog.products.filter((product) => product.subcategory === 'cage'),
  powerSources: demoCatalog.products.filter((product) => product.subcategory === 'power_bank'),
  powerCables: demoCatalog.products.filter((product) => product.subcategory === 'usb_c_cable'),
  filters: demoCatalog.products.filter((product) => product.subcategory === 'round_filter'),
  stepUpRings: demoCatalog.products.filter((product) => product.subcategory === 'step_up_ring'),
  matteBoxes: demoCatalog.products.filter((product) => product.subcategory === 'matte_box'),
  videoCables: demoCatalog.products.filter((product) => product.subcategory === 'hdmi_cable'),
  videoDestinations: demoCatalog.products.filter((product) =>
    ['field_monitor', 'external_recorder', 'capture_card', 'streaming_device'].includes(
      product.subcategory,
    ),
  ),
  tripodHeads: demoCatalog.products.filter((product) => product.subcategory === 'tripod_head'),
  tripods: demoCatalog.products.filter((product) => product.subcategory === 'tripod'),
  teleprompters: demoCatalog.products.filter((product) => product.subcategory === 'teleprompter'),
  lights: demoCatalog.products.filter((product) =>
    ['led_panel', 'cob_light'].includes(product.subcategory),
  ),
  lightModifiers: demoCatalog.products.filter((product) => product.subcategory === 'softbox'),
  lightGrids: demoCatalog.products.filter((product) => product.subcategory === 'lighting_grid'),
  lightStands: demoCatalog.products.filter((product) => product.subcategory === 'light_stand'),
  lightPowerSources: demoCatalog.products.filter(
    (product) => product.subcategory === 'ac_power_supply',
  ),
  lightControllers: demoCatalog.products.filter(
    (product) => product.subcategory === 'lighting_controller',
  ),
  computers: demoCatalog.products.filter((product) => product.subcategory === 'computer'),
  workflowDocks: demoCatalog.products.filter((product) => product.subcategory === 'dock'),
  workflowReaders: demoCatalog.products.filter((product) => product.subcategory === 'card_reader'),
  workflowMedia: demoCatalog.products.filter((product) =>
    ['sd_card', 'cfexpress_card', 'ssd'].includes(product.subcategory),
  ),
  workflowPowerSources: demoCatalog.products.filter(
    (product) => product.subcategory === 'workflow_power_supply',
  ),
  storagePowerSources: demoCatalog.products.filter(
    (product) => product.subcategory === 'workflow_power_supply' && product.id.includes('dock'),
  ),
  podcastPowerSources: demoCatalog.products.filter(
    (product) => product.subcategory === 'workflow_power_supply' && product.id.includes('audio'),
  ),
  podcastHosts: demoCatalog.products.filter(
    (product) => product.subcategory === 'computer' || product.subcategory === 'phone',
  ),
  podcastInterfaces: demoCatalog.products.filter(
    (product) => product.subcategory === 'audio_interface',
  ),
  podcastSources: demoCatalog.products.filter(
    (product) => product.subcategory === 'xlr_microphone',
  ),
  podcastMonitoring: demoCatalog.products.filter((product) => product.subcategory === 'headphones'),
};

const productById = new Map(demoCatalog.products.map((product) => [product.id, product]));
const evidenceById = new Map(demoCatalog.evidence.map((evidence) => [evidence.id, evidence]));
const allowedProductIds = new Set(productById.keys());
const allowedRecordingModeIds = new Set(demoCatalog.recordingModes.map((mode) => mode.id));

function isSupportCoreProduct(product: Product | undefined): boolean {
  return Boolean(
    product &&
    (product.category === 'capture_device' ||
      product.category === 'audio' ||
      product.category === 'memory_and_transfer' ||
      ['lens', 'lens_mount_adapter'].includes(product.subcategory)),
  );
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function coreSpecs(product: Product | undefined): DemoCoreSpecs {
  return product?.specs ?? {};
}

function audioConnector(value: string | undefined): AudioConnector | undefined {
  switch (value) {
    case 'trs_3_5':
      return 'TRS_3_5';
    case 'trrs_ctia_3_5':
      return 'TRRS_3_5';
    case 'usb_c_audio':
    case 'usb_c':
      return 'USB_C';
    case 'lightning':
      return 'LIGHTNING';
    case 'xlr_3pin':
      return 'XLR_3';
    default:
      return undefined;
  }
}

function audioSignal(value: string | undefined): AudioSignal | undefined {
  if (value === 'analog_audio') return 'analog_mic';
  if (value === 'usb_audio') return 'digital';
  return undefined;
}

function audioProtocols(signal: AudioSignal | undefined): readonly string[] {
  if (signal === 'analog_mic') return ['analog_unbalanced_audio'];
  if (signal === 'digital') return ['usb_audio_2_0'];
  return [];
}

function microphonePower(specs: DemoCoreSpecs): MicrophonePower {
  if (specs.requiresPlugInPower) return 'plug_in_power';
  if (specs.busPowered) return 'usb_bus_power';
  if (specs.selfPowered) return 'self_powered';
  return 'unknown';
}

function speedClassMBps(values: readonly string[] | undefined): number | undefined {
  const speedClass = values?.find((value) => /^V\d+$/.test(value));
  return speedClass ? Number(speedClass.slice(1)) : undefined;
}

function requiredSpeedClassMBps(value: string): number | undefined {
  return /^V\d+$/.test(value) ? Number(value.slice(1)) : undefined;
}

const gimbalDimensionLabel: Record<keyof GimbalCompatibilityEvaluation['dimensions'], string> = {
  payload: 'Udźwig',
  mounting: 'Mocowanie',
  clearance: 'Gabaryty i prześwit',
  balance: 'Środek ciężkości',
};

const cageDimensionLabel: Record<keyof CageCompatibilityEvaluation['dimensions'], string> = {
  enclosureFit: 'Dopasowanie korpusu',
  cameraAttachment: 'Mocowanie aparatu',
  accessoryMounting: 'Mocowania akcesoriów',
  accessClearance: 'Dostęp do portów i klapek',
};

const powerDimensionLabel: Record<keyof PowerPathEvaluation['dimensions'], string> = {
  connectorDirection: 'Złącza i kierunek',
  protocolProfile: 'Protokół i profil PD',
  voltage: 'Napięcie',
  capacity: 'Prąd i moc',
  electricalEvidence: 'Dowody elektryczne',
  polarity: 'Polaryzacja',
};

const filterDimensionLabel: Record<keyof FilterMatteBoxEvaluation['dimensions'], string> = {
  threadDiameter: 'Gwint i średnica',
  adapterDirection: 'Kierunek pierścienia',
  coverageClearAperture: 'Pokrycie i prześwit',
  matteBoxMount: 'Mocowanie kompendium',
  collisionVignetting: 'Kolizje i winietowanie',
  evidence: 'Dowody konfiguracji',
};

function exactSafetyStatus(value: string): ExactSafetyStatus {
  if (value === 'clear' || value === 'conflict') return value;
  return 'unknown';
}

function verificationStatus(value: string): VerificationStatus {
  return value === 'verified' || value === 'candidate' || value === 'deprecated'
    ? value
    : 'unknown';
}

function mediaCapability(value: string): MediaCapability | undefined {
  return value === 'monitor' || value === 'record' || value === 'capture' || value === 'stream'
    ? value
    : undefined;
}

function storageTransferDirection(value: string): StorageTransferDirection | undefined {
  return value === 'read_from_media' || value === 'write_to_media' ? value : undefined;
}

function explainGimbalDimension(
  dimension: keyof GimbalCompatibilityEvaluation['dimensions'],
  evaluation: GimbalCompatibilityEvaluation,
): string {
  const status = evaluation.dimensions[dimension].status;
  if (dimension === 'payload') {
    if (status === 'compatible') return 'Masa zestawu mieści się w zalecanym limicie z zapasem.';
    if (status === 'compatible_with_limitations')
      return 'Masa zestawu mieści się w limicie znamionowym, ale przekracza zalecany próg bezpieczeństwa.';
    if (status === 'incompatible')
      return 'Masa zestawu przekracza znamionowy udźwig stabilizatora.';
    return 'Nie można obliczyć obciążenia z powodu brakującej masy lub limitu.';
  }
  if (dimension === 'mounting') {
    if (status === 'compatible')
      return 'Standard mocowania zestawu znajduje się na zweryfikowanej liście stabilizatora.';
    if (status === 'incompatible')
      return 'Standard mocowania zestawu nie jest obsługiwany przez stabilizator.';
    return 'Nie można potwierdzić standardu mocowania.';
  }
  if (dimension === 'clearance') {
    if (status === 'compatible')
      return 'Szerokość, wysokość i głębokość mieszczą się w potwierdzonym zakresie.';
    if (status === 'incompatible')
      return 'Co najmniej jeden wymiar przekracza potwierdzoną przestrzeń roboczą.';
    return 'Brakuje wymiaru zestawu albo limitu przestrzeni roboczej.';
  }
  if (status === 'compatible')
    return 'Środek ciężkości mieści się w potwierdzonym zakresie wyważenia.';
  if (status === 'incompatible')
    return 'Środek ciężkości przekracza potwierdzony zakres wyważenia.';
  return 'Brakuje danych o środku ciężkości lub zakresie wyważenia.';
}

function explainCageDimension(
  dimension: keyof CageCompatibilityEvaluation['dimensions'],
  evaluation: CageCompatibilityEvaluation,
): string {
  const status = evaluation.dimensions[dimension].status;
  if (dimension === 'enclosureFit') {
    if (status === 'compatible')
      return 'Dokładny model korpusu znajduje się na potwierdzonej liście.';
    if (status === 'incompatible') return 'Klatka jest przeznaczona do innego korpusu.';
    return 'Brakuje potwierdzenia dla dokładnego modelu i wariantu korpusu.';
  }
  if (dimension === 'cameraAttachment') {
    if (status === 'compatible')
      return 'Standard mocowania aparatu jest potwierdzony po obu stronach.';
    if (status === 'incompatible')
      return 'Standard mocowania aparatu nie jest obsługiwany przez klatkę.';
    return 'Nie można potwierdzić standardu mocowania aparatu.';
  }
  if (dimension === 'accessoryMounting') {
    if (status === 'compatible')
      return 'Klatka zapewnia wszystkie mocowania wymagane przez ten zestaw.';
    if (status === 'incompatible')
      return 'Brakuje co najmniej jednego wymaganego mocowania akcesoriów.';
    return 'Brakuje danych o wymaganych lub dostępnych mocowaniach.';
  }
  if (status === 'compatible') return 'Wymagane porty i klapki pozostają dostępne.';
  if (status === 'incompatible') return 'Klatka blokuje wymagany port albo klapkę.';
  return 'Nie można potwierdzić dostępu do wszystkich wymaganych portów i klapek.';
}

function explainPowerDimension(
  dimension: keyof PowerPathEvaluation['dimensions'],
  evaluation: PowerPathEvaluation,
): string {
  const status = evaluation.dimensions[dimension].status;
  if (dimension === 'connectorDirection') {
    if (status === 'compatible')
      return 'Dokładne złącza i kierunek źródło → przewód → aparat są zgodne.';
    if (status === 'incompatible')
      return 'Co najmniej jedno złącze albo kierunek toru jest niezgodny.';
    return 'Nie można potwierdzić wszystkich złączy i kierunku przepływu energii.';
  }
  if (dimension === 'protocolProfile') {
    if (status === 'compatible')
      return 'Źródło, przewód i aparat potwierdzają dokładny profil USB PD.';
    if (status === 'incompatible')
      return 'Kształt USB-C nie zapewnia wymaganego protokołu lub profilu PD.';
    return 'Brakuje dokładnych danych protokołu albo profilu USB PD.';
  }
  if (dimension === 'voltage') {
    if (status === 'compatible')
      return 'Negocjowane napięcie mieści się w potwierdzonych parametrach toru.';
    if (status === 'incompatible') return 'Źródło lub przewód nie zapewnia wymaganego napięcia.';
    return 'Napięcie nie ma kompletnego potwierdzenia.';
  }
  if (dimension === 'capacity') {
    if (status === 'compatible') return 'Źródło i przewód zapewniają wymagany prąd oraz moc.';
    if (status === 'incompatible')
      return 'Znamionowy prąd albo moc jednego z elementów są niewystarczające.';
    return 'Brakuje dokładnej wartości prądu lub mocy.';
  }
  if (dimension === 'electricalEvidence') {
    return status === 'compatible'
      ? 'Źródło, przewód i wymaganie aparatu mają osobne dowody elektryczne.'
      : 'Brakuje oficjalnego dowodu dla co najmniej jednego elementu toru.';
  }
  return status === 'not_applicable'
    ? 'Osobna polaryzacja DC nie dotyczy dokładnie potwierdzonego, negocjowanego toru USB PD.'
    : 'Nie wolno pominąć polaryzacji bez potwierdzenia dokładnego protokołu USB PD.';
}

function findPublishedEdge(sourceId: string, targetId: string): Edge | undefined {
  return demoCatalog.compatibilityEdges.find(
    (edge) =>
      edge.sourceProductId === sourceId &&
      edge.targetProductId === targetId &&
      edge.verificationStatus === 'verified' &&
      edge.relationType !== 'candidate',
  );
}

function formatMoney(valueMinor: number): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
    valueMinor / 100,
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function ProductSelect({
  label,
  value,
  products,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  products: Product[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.canonicalName}
          </option>
        ))}
      </select>
    </label>
  );
}

function OptionalProductSelect({
  label,
  emptyLabel,
  value,
  products,
  onChange,
  disabled = false,
}: {
  label: string;
  emptyLabel: string;
  value: string;
  products: Product[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.canonicalName}
          </option>
        ))}
      </select>
    </label>
  );
}

function CoreStatusCard({
  title,
  evaluation,
  requiredProductIds,
  state,
  onAdd,
}: {
  title: string;
  evaluation:
    | AudioCompatibilityEvaluation
    | OpticsCompatibilityEvaluation
    | MemoryCompatibilityEvaluation
    | undefined;
  requiredProductIds: readonly string[];
  state: RigState;
  onAdd: (id: string) => void;
}) {
  if (!evaluation || evaluation.status === 'unknown') {
    return (
      <article className="status-card status-unknown">
        <div>
          <span className="status-dot">?</span>
          <h3>{title}</h3>
        </div>
        <strong>Brak potwierdzonej relacji</strong>
        <p>
          System nie zamienia relacji oczekującej na weryfikację ani braku danych w rekomendację.
        </p>
      </article>
    );
  }
  const missing = requiredProductIds.filter((id) => !state.extraIds.includes(id));
  const isError = evaluation.status === 'incompatible';
  return (
    <article
      className={`status-card ${isError ? 'status-error' : missing.length > 0 ? 'status-warning' : 'status-ok'}`}
    >
      <div>
        <span className="status-dot">{isError ? '×' : missing.length > 0 ? '!' : '✓'}</span>
        <h3>{title}</h3>
      </div>
      <strong>{relationTypeLabel(evaluation.status)}</strong>
      {evaluation.limitations.map((limitation) => (
        <p key={limitation}>{localizeCompatibilityMessage(limitation)}</p>
      ))}
      {evaluation.warnings.map((warning) => (
        <p key={warning}>{localizeCompatibilityMessage(warning)}</p>
      ))}
      {missing.map((id) => {
        const product = productById.get(id);
        return product ? (
          <button className="add-required" key={id} onClick={() => onAdd(id)}>
            + Dodaj wymagane: {product.canonicalName}
          </button>
        ) : null;
      })}
      <details>
        <summary>Wymiary i dowody</summary>
        <ul className="dimension-list">
          {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
            <li key={dimension}>
              <span>{dimensionLabel(dimension)}</span>
              <b>{dimensionStatusLabel(result.status)}</b>
              <small>{dimensionExplanation(dimension, result.status)}</small>
            </li>
          ))}
        </ul>
        <ul className="evidence-list">
          {evaluation.evidenceIds.map((id) => {
            const evidence = evidenceById.get(id);
            return evidence ? (
              <li key={id}>
                <span>{evidenceHeading(evidence.sourceType)}</span>
                <small>
                  {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                  {formatEvidenceDate(evidence.verifiedAt)}
                </small>
              </li>
            ) : null;
          })}
        </ul>
      </details>
    </article>
  );
}

function GimbalStatusCard({
  evaluation,
}: {
  evaluation: GimbalCompatibilityEvaluation | undefined;
}) {
  if (!evaluation || evaluation.status === 'unknown') {
    return (
      <article className="status-card status-unknown">
        <div>
          <span className="status-dot">?</span>
          <h3>Zestaw → stabilizator gimbalowy</h3>
        </div>
        <strong>Nie można potwierdzić stabilizatora</strong>
        <p>
          Brakuje dokładnego, dowodowego profilu gabarytów, środka ciężkości albo limitów
          stabilizatora.
        </p>
        <p>
          Brak potwierdzenia nie jest rekomendacją i zwiększa licznik relacji niepotwierdzonych.
        </p>
      </article>
    );
  }
  const isError = evaluation.status === 'incompatible';
  const isLimited = evaluation.status === 'compatible_with_limitations';
  const headline =
    evaluation.dimensions.payload.status === 'incompatible'
      ? 'Przekroczony udźwig stabilizatora'
      : evaluation.dimensions.mounting.status === 'incompatible'
        ? 'Niezgodne mocowanie stabilizatora'
        : evaluation.dimensions.clearance.status === 'incompatible'
          ? 'Zestaw nie mieści się w przestrzeni roboczej'
          : evaluation.dimensions.balance.status === 'incompatible'
            ? 'Nie można wyważyć zestawu w potwierdzonym zakresie'
            : isLimited
              ? 'Zgodne z ograniczonym zapasem udźwigu'
              : 'Udźwig i gabaryty potwierdzone';
  return (
    <article
      className={`status-card ${isError ? 'status-error' : isLimited ? 'status-warning' : 'status-ok'}`}
    >
      <div>
        <span className="status-dot">{isError ? '×' : isLimited ? '!' : '✓'}</span>
        <h3>Zestaw → stabilizator gimbalowy</h3>
      </div>
      <strong>{headline}</strong>
      <p>
        Masa zestawu: {evaluation.payloadWeightGrams ?? '—'} g · zalecane maksimum:{' '}
        {evaluation.recommendedMaximumPayloadGrams ?? '—'} g · limit znamionowy:{' '}
        {evaluation.ratedPayloadGrams ?? '—'} g.
      </p>
      {evaluation.conditions.map((condition) => (
        <p key={condition}>Warunek profilu: {localizeTechnicalCopy(condition)}</p>
      ))}
      <details>
        <summary>Mechanika i dowody</summary>
        <ul className="dimension-list">
          {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
            <li key={dimension}>
              <span>
                {
                  gimbalDimensionLabel[
                    dimension as keyof GimbalCompatibilityEvaluation['dimensions']
                  ]
                }
                :{' '}
                {explainGimbalDimension(
                  dimension as keyof GimbalCompatibilityEvaluation['dimensions'],
                  evaluation,
                )}
              </span>
              <b>{dimensionStatusLabel(result.status)}</b>
            </li>
          ))}
        </ul>
        <ul className="evidence-list">
          {evaluation.evidenceIds.map((id) => {
            const evidence = evidenceById.get(id);
            return evidence ? (
              <li key={id}>
                <span>{evidenceHeading(evidence.sourceType)}</span>
                <small>
                  {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                  {formatEvidenceDate(evidence.verifiedAt)}
                </small>
              </li>
            ) : null;
          })}
        </ul>
      </details>
    </article>
  );
}

function CageStatusCard({ evaluation }: { evaluation: CageCompatibilityEvaluation | undefined }) {
  if (!evaluation || evaluation.status === 'unknown') {
    return (
      <article className="status-card status-unknown">
        <div>
          <span className="status-dot">?</span>
          <h3>Zestaw → klatka i mocowania</h3>
        </div>
        <strong>Nie można potwierdzić klatki</strong>
        <p>
          Brakuje dokładnego profilu korpusu, wymagań mocowań albo potwierdzonego dostępu do portów
          i klapek.
        </p>
        <p>Brak potwierdzenia nie jest rekomendacją.</p>
      </article>
    );
  }
  const isError = evaluation.status === 'incompatible';
  const isLimited = evaluation.status === 'compatible_with_limitations';
  const headline =
    evaluation.dimensions.enclosureFit.status === 'incompatible'
      ? 'Klatka nie pasuje do tego korpusu'
      : evaluation.dimensions.cameraAttachment.status === 'incompatible'
        ? 'Niezgodne mocowanie aparatu'
        : evaluation.dimensions.accessoryMounting.status === 'incompatible'
          ? 'Brakuje wymaganego mocowania akcesoriów'
          : evaluation.dimensions.accessClearance.status === 'incompatible'
            ? 'Klatka blokuje wymagany dostęp'
            : isLimited
              ? 'Klatka zgodna z ograniczeniami'
              : 'Klatka i mocowania potwierdzone';
  return (
    <article
      className={`status-card ${isError ? 'status-error' : isLimited ? 'status-warning' : 'status-ok'}`}
    >
      <div>
        <span className="status-dot">{isError ? '×' : isLimited ? '!' : '✓'}</span>
        <h3>Zestaw → klatka i mocowania</h3>
      </div>
      <strong>{headline}</strong>
      {evaluation.conditions.map((condition) => (
        <p key={condition}>Warunek profilu: {localizeTechnicalCopy(condition)}</p>
      ))}
      <details>
        <summary>Mechanika i dowody</summary>
        <ul className="dimension-list">
          {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
            <li key={dimension}>
              <span>
                {cageDimensionLabel[dimension as keyof CageCompatibilityEvaluation['dimensions']]}:{' '}
                {explainCageDimension(
                  dimension as keyof CageCompatibilityEvaluation['dimensions'],
                  evaluation,
                )}
              </span>
              <b>{dimensionStatusLabel(result.status)}</b>
            </li>
          ))}
        </ul>
        <ul className="evidence-list">
          {evaluation.evidenceIds.map((id) => {
            const evidence = evidenceById.get(id);
            return evidence ? (
              <li key={id}>
                <span>{evidenceHeading(evidence.sourceType)}</span>
                <small>
                  {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                  {formatEvidenceDate(evidence.verifiedAt)}
                </small>
              </li>
            ) : null;
          })}
        </ul>
      </details>
    </article>
  );
}

function PowerStatusCard({
  evaluation,
  estimatedRuntimeHours,
}: {
  evaluation: PowerPathEvaluation | undefined;
  estimatedRuntimeHours: number | undefined;
}) {
  if (!evaluation || evaluation.status === 'unknown') {
    return (
      <article className="status-card status-unknown">
        <div>
          <span className="status-dot">?</span>
          <h3>Źródło → przewód → zasilanie aparatu</h3>
        </div>
        <strong>Nie można potwierdzić toru zasilania</strong>
        <p>
          Brakuje dokładnego profilu USB PD, parametrów przewodu albo oficjalnego dowodu
          elektrycznego. Brak potwierdzenia nie jest rekomendacją.
        </p>
      </article>
    );
  }
  const isError = evaluation.status === 'incompatible';
  const isLimited = evaluation.status === 'compatible_with_limitations';
  const headline =
    evaluation.dimensions.connectorDirection.status === 'incompatible'
      ? 'Niezgodne złącze lub kierunek zasilania'
      : evaluation.dimensions.protocolProfile.status === 'incompatible'
        ? 'Brak wymaganego profilu USB Power Delivery'
        : evaluation.dimensions.voltage.status === 'incompatible'
          ? 'Niezgodne napięcie toru zasilania'
          : evaluation.dimensions.capacity.status === 'incompatible'
            ? 'Niewystarczający prąd lub moc'
            : isLimited
              ? 'Zgodne tylko jako zasilanie stacjonarne'
              : 'Tor zasilania USB PD potwierdzony';
  return (
    <article
      className={`status-card ${isError ? 'status-error' : isLimited ? 'status-warning' : 'status-ok'}`}
    >
      <div>
        <span className="status-dot">{isError ? '×' : isLimited ? '!' : '✓'}</span>
        <h3>Źródło → przewód → zasilanie aparatu</h3>
      </div>
      <strong>{headline}</strong>
      {evaluation.selectedPdProfile && (
        <p>
          Profil: {evaluation.selectedPdProfile.voltageV} V ·{' '}
          {evaluation.selectedPdProfile.maxCurrentA} A. Szacowany czas pracy:{' '}
          {estimatedRuntimeHours === undefined
            ? 'brak kompletnych danych'
            : formatDuration(estimatedRuntimeHours * 3600)}
          .
        </p>
      )}
      {evaluation.conditions.map((condition) => (
        <p key={condition}>Warunek: {localizeTechnicalCopy(condition)}</p>
      ))}
      {evaluation.limitations.map((limitation) => (
        <p key={limitation}>Ograniczenie: {localizeTechnicalCopy(limitation)}</p>
      ))}
      <details>
        <summary>Elektryka i dowody</summary>
        <ul className="dimension-list">
          {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
            <li key={dimension}>
              <span>
                {powerDimensionLabel[dimension as keyof PowerPathEvaluation['dimensions']]}:{' '}
                {explainPowerDimension(
                  dimension as keyof PowerPathEvaluation['dimensions'],
                  evaluation,
                )}
              </span>
              <b>{dimensionStatusLabel(result.status)}</b>
            </li>
          ))}
        </ul>
        <ul className="evidence-list">
          {evaluation.evidenceIds.map((id) => {
            const evidence = evidenceById.get(id);
            return evidence ? (
              <li key={id}>
                <span>{evidenceHeading(evidence.sourceType)}</span>
                <small>
                  {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                  {formatEvidenceDate(evidence.verifiedAt)}
                </small>
              </li>
            ) : null;
          })}
        </ul>
      </details>
    </article>
  );
}

function FilterMatteBoxStatusCard({
  evaluation,
}: {
  evaluation: FilterMatteBoxEvaluation | undefined;
}) {
  if (!evaluation || evaluation.status === 'unknown') {
    return (
      <article className="status-card status-unknown">
        <div>
          <span className="status-dot">?</span>
          <h3>Obiektyw → filtr → kompendium</h3>
        </div>
        <strong>Nie można potwierdzić toru optycznych akcesoriów</strong>
        <p>
          Brakuje dokładnego profilu urządzenia, obiektywu i wybranych akcesoriów albo pomiaru
          kolizji i winietowania. Brak potwierdzenia nie jest rekomendacją.
        </p>
      </article>
    );
  }
  const isError = evaluation.status === 'incompatible';
  const isLimited = evaluation.status === 'compatible_with_limitations';
  const headline = isError
    ? evaluation.dimensions.collisionVignetting.status === 'incompatible'
      ? 'Konflikt mechaniczny albo winietowanie'
      : 'Niezgodny gwint, prześwit albo obejma'
    : evaluation.requiredAdapterIds.length > 0
      ? isLimited
        ? 'Zgodne przez dokładny pierścień zwiększający średnicę, z ograniczeniami'
        : 'Zgodne przez dokładny pierścień zwiększający średnicę'
      : isLimited
        ? 'Zgodne z ograniczeniami konfiguracji'
        : 'Filtr i kompendium potwierdzone';
  return (
    <article
      className={`status-card ${isError ? 'status-error' : isLimited ? 'status-warning' : 'status-ok'}`}
    >
      <div>
        <span className="status-dot">{isError ? '×' : isLimited ? '!' : '✓'}</span>
        <h3>Obiektyw → filtr → kompendium</h3>
      </div>
      <strong>{headline}</strong>
      {evaluation.requiredAdapterIds.length > 0 && (
        <p>
          Wymagany element pośredni:{' '}
          {evaluation.requiredAdapterIds
            .map((id) => productById.get(id)?.canonicalName ?? id)
            .join(', ')}
          .
        </p>
      )}
      {evaluation.conditions.map((condition) => (
        <p key={condition}>Warunek: {localizeTechnicalCopy(condition)}</p>
      ))}
      {evaluation.limitations.map((limitation) => (
        <p key={limitation}>Ograniczenie: {localizeTechnicalCopy(limitation)}</p>
      ))}
      <details>
        <summary>Optyka, mechanika i dowody</summary>
        <ul className="dimension-list">
          {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
            <li key={dimension}>
              <span>
                {filterDimensionLabel[dimension as keyof FilterMatteBoxEvaluation['dimensions']]}:{' '}
                {dimensionExplanation(dimension, result.status)}
              </span>
              <b>{dimensionStatusLabel(result.status)}</b>
            </li>
          ))}
        </ul>
        <ul className="evidence-list">
          {evaluation.evidenceIds.map((id) => {
            const evidence = evidenceById.get(id);
            return evidence ? (
              <li key={id}>
                <span>{evidenceHeading(evidence.sourceType)}</span>
                <small>
                  {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                  {formatEvidenceDate(evidence.verifiedAt)}
                </small>
              </li>
            ) : null;
          })}
        </ul>
      </details>
    </article>
  );
}

type DetailedEvaluation =
  | MediaPathEvaluation
  | SupportRigEvaluation
  | LightingRigEvaluation
  | StorageWorkflowEvaluation
  | PodcastMobileWorkflowEvaluation;

function M3StatusCard({
  title,
  evaluation,
}: {
  title: string;
  evaluation: DetailedEvaluation | undefined;
}) {
  const unknown = !evaluation || evaluation.status === 'unknown';
  const incompatible = evaluation?.status === 'incompatible';
  const limited = evaluation?.status === 'compatible_with_limitations';
  return (
    <article
      className={`status-card ${unknown ? 'status-unknown' : incompatible ? 'status-error' : limited ? 'status-warning' : 'status-ok'}`}
    >
      <div>
        <span className="status-dot">
          {unknown ? '?' : incompatible ? '×' : limited ? '!' : '✓'}
        </span>
        <h3>{title}</h3>
      </div>
      <strong>
        {unknown
          ? 'Brak dokładnie zweryfikowanego profilu'
          : incompatible
            ? 'Konfiguracja niezgodna'
            : limited
              ? 'Zgodne z jawnymi ograniczeniami'
              : 'Konfiguracja potwierdzona'}
      </strong>
      {unknown && <p>Relacja oczekująca na weryfikację ani podobne złącze nie są rekomendacją.</p>}
      {evaluation?.conditions.map((condition) => (
        <p key={condition}>Warunek: {localizeTechnicalCopy(condition)}</p>
      ))}
      {evaluation?.limitations.map((limitation) => (
        <p key={limitation}>Ograniczenie: {localizeTechnicalCopy(limitation)}</p>
      ))}
      {evaluation && (
        <details>
          <summary>Wymiary i dowody</summary>
          <ul className="dimension-list">
            {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
              <li key={dimension}>
                <span>
                  {dimensionLabel(dimension)}: {dimensionExplanation(dimension, result.status)}
                </span>
                <b>{dimensionStatusLabel(result.status)}</b>
              </li>
            ))}
          </ul>
          <ul className="evidence-list">
            {evaluation.evidenceIds.map((id) => {
              const evidence = evidenceById.get(id);
              return evidence ? (
                <li key={id}>
                  <span>{evidenceHeading(evidence.sourceType)}</span>
                  <small>
                    {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                    {formatEvidenceDate(evidence.verifiedAt)}
                  </small>
                </li>
              ) : null;
            })}
          </ul>
        </details>
      )}
    </article>
  );
}

function hydrateState(value: unknown): RigState {
  if (!value || typeof value !== 'object') return initialState;
  const saved = value as Partial<RigState>;
  const allowedId = (candidate: unknown, products: readonly Product[], fallback: string): string =>
    typeof candidate === 'string' && products.some((product) => product.id === candidate)
      ? candidate
      : fallback;
  const deviceId =
    saved.deviceId === ''
      ? ''
      : allowedId(saved.deviceId, categories.devices, initialState.deviceId);
  const hydratedDevice = productById.get(deviceId);
  const legacyCageId =
    deviceId === 'novacam-n7'
      ? 'motionrig-n7-form-cage'
      : deviceId === 'novacam-x1'
        ? 'motionrig-x1-form-cage'
        : '';
  const deviceModes = demoCatalog.recordingModes.filter((mode) => mode.deviceId === deviceId);
  const modeId =
    typeof saved.modeId === 'string' && deviceModes.some((mode) => mode.id === saved.modeId)
      ? saved.modeId
      : (deviceModes[0]?.id ?? '');
  const cageId = saved.cageId === '' ? '' : allowedId(saved.cageId, categories.cages, legacyCageId);
  const legacyPowerSourceId = deviceId === 'novacam-n7' ? initialState.powerSourceId : '';
  const legacyPowerCableId = deviceId === 'novacam-n7' ? initialState.powerCableId : '';
  const powerSourceId =
    saved.powerSourceId === ''
      ? ''
      : allowedId(saved.powerSourceId, categories.powerSources, legacyPowerSourceId);
  const powerCableId =
    saved.powerCableId === ''
      ? ''
      : allowedId(saved.powerCableId, categories.powerCables, legacyPowerCableId);
  const legacyFilterId = deviceId === 'novacam-n7' ? initialState.filterId : '';
  const legacyStepUpRingId = deviceId === 'novacam-n7' ? initialState.stepUpRingId : '';
  const filterId =
    saved.filterId === '' ? '' : allowedId(saved.filterId, categories.filters, legacyFilterId);
  const stepUpRingId =
    saved.stepUpRingId === ''
      ? ''
      : allowedId(saved.stepUpRingId, categories.stepUpRings, legacyStepUpRingId);
  const matteBoxId =
    saved.matteBoxId === '' ? '' : allowedId(saved.matteBoxId, categories.matteBoxes, '');
  const optionalId = (candidate: unknown, products: readonly Product[]): string =>
    typeof candidate === 'string' && products.some((product) => product.id === candidate)
      ? candidate
      : '';
  const selectedProductIds = (candidate: unknown, fallback: readonly string[]): string[] =>
    Array.isArray(candidate)
      ? [
          ...new Set(
            candidate.filter((id): id is string => typeof id === 'string' && productById.has(id)),
          ),
        ]
      : [...fallback];
  const plannedMinutes = Number(saved.plannedMinutes);
  return {
    deviceId,
    audioId:
      !deviceId || saved.audioId === ''
        ? ''
        : allowedId(saved.audioId, categories.audio, initialState.audioId),
    lensId:
      hydratedDevice?.subcategory !== 'camera'
        ? ''
        : allowedId(saved.lensId, categories.lenses, initialState.lensId),
    cardId:
      deviceModes.length === 0
        ? ''
        : allowedId(saved.cardId, categories.cards, initialState.cardId),
    cageId,
    gimbalId:
      saved.gimbalId === ''
        ? ''
        : allowedId(saved.gimbalId, categories.gimbals, initialState.gimbalId),
    powerSourceId,
    powerCableId,
    filterId,
    stepUpRingId,
    matteBoxId,
    videoCableId: optionalId(saved.videoCableId, categories.videoCables),
    videoDestinationId: optionalId(saved.videoDestinationId, categories.videoDestinations),
    tripodHeadId: optionalId(saved.tripodHeadId, categories.tripodHeads),
    tripodId: optionalId(saved.tripodId, categories.tripods),
    teleprompterId: optionalId(saved.teleprompterId, categories.teleprompters),
    lightId: optionalId(saved.lightId, categories.lights),
    lightModifierId: optionalId(saved.lightModifierId, categories.lightModifiers),
    lightGridId: optionalId(saved.lightGridId, categories.lightGrids),
    lightStandId: optionalId(saved.lightStandId, categories.lightStands),
    lightPowerSourceId: optionalId(saved.lightPowerSourceId, categories.lightPowerSources),
    lightControllerId: optionalId(saved.lightControllerId, categories.lightControllers),
    workflowComputerId: optionalId(saved.workflowComputerId, categories.computers),
    workflowDockId: optionalId(saved.workflowDockId, categories.workflowDocks),
    workflowReaderId: optionalId(saved.workflowReaderId, categories.workflowReaders),
    workflowMediaId: optionalId(saved.workflowMediaId, categories.workflowMedia),
    workflowPowerSourceId: optionalId(saved.workflowPowerSourceId, categories.storagePowerSources),
    podcastHostId: optionalId(saved.podcastHostId, categories.podcastHosts),
    podcastInterfaceId: optionalId(saved.podcastInterfaceId, categories.podcastInterfaces),
    podcastSourceAId: optionalId(saved.podcastSourceAId, categories.podcastSources),
    podcastSourceBId: optionalId(saved.podcastSourceBId, categories.podcastSources),
    podcastMonitoringId: optionalId(saved.podcastMonitoringId, categories.podcastMonitoring),
    podcastPowerSourceId: optionalId(saved.podcastPowerSourceId, categories.podcastPowerSources),
    modeId,
    extraIds: selectedProductIds(saved.extraIds, initialState.extraIds),
    ownedIds: selectedProductIds(saved.ownedIds, initialState.ownedIds),
    plannedMinutes:
      Number.isFinite(plannedMinutes) && plannedMinutes >= 1 && plannedMinutes <= 1440
        ? plannedMinutes
        : initialState.plannedMinutes,
  };
}

function portableRigToState(rig: PortableRig): RigState {
  const selected = new Set(rig.selectedProductIds);
  const firstSelected = (products: readonly Product[]): string =>
    products.find((product) => selected.has(product.id))?.id ?? '';
  const captureDeviceId = firstSelected(categories.devices);
  const primaryIds = new Set([
    rig.deviceId,
    firstSelected(categories.audio),
    firstSelected(categories.lenses),
    firstSelected(categories.cards),
    firstSelected(categories.cages),
    firstSelected(categories.gimbals),
    firstSelected(categories.powerSources),
    firstSelected(categories.powerCables),
    firstSelected(categories.filters),
    firstSelected(categories.stepUpRings),
    firstSelected(categories.matteBoxes),
    firstSelected(categories.videoCables),
    firstSelected(categories.videoDestinations),
    firstSelected(categories.tripodHeads),
    firstSelected(categories.tripods),
    firstSelected(categories.teleprompters),
    firstSelected(categories.lights),
    firstSelected(categories.lightModifiers),
    firstSelected(categories.lightGrids),
    firstSelected(categories.lightStands),
    firstSelected(categories.lightPowerSources),
    firstSelected(categories.lightControllers),
    firstSelected(categories.computers),
    firstSelected(categories.workflowDocks),
    firstSelected(categories.workflowReaders),
    firstSelected(categories.workflowMedia),
    firstSelected(categories.storagePowerSources),
    firstSelected(categories.podcastInterfaces),
    ...categories.podcastSources
      .filter((product) => selected.has(product.id))
      .map((product) => product.id),
    firstSelected(categories.podcastMonitoring),
    firstSelected(categories.podcastPowerSources),
  ]);
  return hydrateState({
    deviceId: captureDeviceId,
    audioId: firstSelected(categories.audio),
    lensId: firstSelected(categories.lenses),
    cardId: firstSelected(categories.cards),
    cageId: firstSelected(categories.cages),
    gimbalId: firstSelected(categories.gimbals),
    powerSourceId: firstSelected(categories.powerSources),
    powerCableId: firstSelected(categories.powerCables),
    filterId: firstSelected(categories.filters),
    stepUpRingId: firstSelected(categories.stepUpRings),
    matteBoxId: firstSelected(categories.matteBoxes),
    videoCableId: firstSelected(categories.videoCables),
    videoDestinationId: firstSelected(categories.videoDestinations),
    tripodHeadId: firstSelected(categories.tripodHeads),
    tripodId: firstSelected(categories.tripods),
    teleprompterId: firstSelected(categories.teleprompters),
    lightId: firstSelected(categories.lights),
    lightModifierId: firstSelected(categories.lightModifiers),
    lightGridId: firstSelected(categories.lightGrids),
    lightStandId: firstSelected(categories.lightStands),
    lightPowerSourceId: firstSelected(categories.lightPowerSources),
    lightControllerId: firstSelected(categories.lightControllers),
    workflowComputerId: firstSelected(categories.workflowReaders)
      ? firstSelected(categories.computers)
      : '',
    workflowDockId: firstSelected(categories.workflowReaders)
      ? firstSelected(categories.workflowDocks)
      : '',
    workflowReaderId: firstSelected(categories.workflowReaders),
    workflowMediaId: firstSelected(categories.workflowReaders)
      ? firstSelected(categories.workflowMedia)
      : '',
    workflowPowerSourceId: firstSelected(categories.workflowReaders)
      ? firstSelected(categories.storagePowerSources)
      : '',
    podcastHostId: firstSelected(categories.podcastInterfaces)
      ? firstSelected(categories.podcastHosts)
      : '',
    podcastInterfaceId: firstSelected(categories.podcastInterfaces),
    podcastSourceAId:
      categories.podcastSources.find((product) => selected.has(product.id))?.id ?? '',
    podcastSourceBId:
      categories.podcastSources.filter((product) => selected.has(product.id))[1]?.id ?? '',
    podcastMonitoringId: firstSelected(categories.podcastMonitoring),
    podcastPowerSourceId: firstSelected(categories.podcastPowerSources),
    modeId: rig.recordingModeId ?? '',
    extraIds: rig.selectedProductIds.filter((id) => !primaryIds.has(id)),
    ownedIds: rig.ownedProductIds,
    plannedMinutes: rig.plannedMinutes,
  });
}

function loadSharedState(): RigState {
  if (typeof window === 'undefined') return initialState;
  try {
    const versionedHash = window.location.hash.startsWith('#rigv1=')
      ? window.location.hash.slice(7)
      : '';
    if (versionedHash) {
      const imported = decodeRigFragment(versionedHash, {
        allowedProductIds,
        allowedRecordingModeIds,
        now: new Date().toISOString(),
      });
      if (imported.rig) return portableRigToState(imported.rig);
    }
    const hash = window.location.hash.startsWith('#rig=') ? window.location.hash.slice(5) : '';
    if (hash.length > 0 && hash.length < 8000)
      return hydrateState(JSON.parse(atob(decodeURIComponent(hash))));
    const saved = window.localStorage.getItem('creatorrig-demo');
    return saved ? hydrateState(JSON.parse(saved)) : initialState;
  } catch {
    return initialState;
  }
}

export default function RigBuilder() {
  const [state, setState] = useState<RigState>(initialState);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    setState(loadSharedState());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) window.localStorage.setItem('creatorrig-demo', JSON.stringify(state));
  }, [state, ready]);

  const device = productById.get(state.deviceId);
  const isCamera = device?.subcategory === 'camera';
  const modes = demoCatalog.recordingModes.filter((mode) => mode.deviceId === state.deviceId);
  const selectedMode = modes.find((mode) => mode.id === state.modeId) ?? modes[0];
  const audioEdge = findPublishedEdge(state.deviceId, state.audioId);
  const lensEdge = isCamera ? findPublishedEdge(state.deviceId, state.lensId) : undefined;
  const selectedAudio = productById.get(state.audioId);
  const selectedLens = productById.get(state.lensId);
  const selectedCard = productById.get(state.cardId);
  const deviceCoreSpecs = coreSpecs(device);
  const audioCoreSpecs = coreSpecs(selectedAudio);
  const lensCoreSpecs = coreSpecs(selectedLens);
  const audioClaimEvidence = audioEdge?.evidenceIds ?? [];
  const hostAudioConnector = audioConnector(deviceCoreSpecs.audioInput);
  const sourceAudioConnector = audioConnector(audioCoreSpecs.audioOutput);
  const sourceAudioSignal = audioSignal(audioCoreSpecs.signal);
  const audioAdapters: AudioAdapter[] = (audioEdge?.requiredProductIds ?? []).flatMap((id) => {
    const product = productById.get(id);
    if (product?.subcategory !== 'trs_trrs_adapter') return [];
    const specs = coreSpecs(product);
    const fromConnector = audioConnector(specs.input);
    const toConnector = audioConnector(specs.output);
    const signal = audioSignal(specs.signal);
    if (!fromConnector || !toConnector || !signal) return [];
    return [
      {
        id,
        fromConnector,
        toConnector,
        fromSignal: signal,
        toSignal: signal,
        protocols: audioProtocols(signal),
        verified: true,
        evidenceIds: audioClaimEvidence,
        ...(specs.passesPlugInPower === undefined
          ? {}
          : { passesPlugInPower: specs.passesPlugInPower }),
        limitations: audioEdge?.limitations ?? [],
      },
    ];
  });
  const audioEvaluation =
    device && selectedAudio && hostAudioConnector && sourceAudioConnector && sourceAudioSignal
      ? evaluateAudioCompatibility({
          host: {
            id: device.id,
            inputs: [
              {
                id: `${device.id}:${deviceCoreSpecs.audioInput ?? 'unknown'}`,
                connector: hostAudioConnector,
                signal: hostAudioConnector === 'USB_C' ? 'digital' : 'analog_mic',
                protocols:
                  deviceCoreSpecs.supportedAudioProtocols ??
                  audioProtocols(hostAudioConnector === 'USB_C' ? 'digital' : 'analog_mic'),
                channels:
                  deviceCoreSpecs.audioInputChannels ?? deviceCoreSpecs.maxInputChannels ?? 1,
                ...(deviceCoreSpecs.plugInPower === undefined
                  ? {}
                  : { plugInPower: deviceCoreSpecs.plugInPower }),
                busPower: (deviceCoreSpecs.maxBusPowerWatts ?? 0) > 0,
                evidenceIds: audioClaimEvidence,
              },
            ],
            evidenceIds: audioClaimEvidence,
          },
          source: {
            id: selectedAudio.id,
            output: {
              id: `${selectedAudio.id}:${audioCoreSpecs.audioOutput ?? 'unknown'}`,
              connector: sourceAudioConnector,
              signal: sourceAudioSignal,
              protocols: audioProtocols(sourceAudioSignal),
              channels: audioCoreSpecs.channels ?? 1,
              evidenceIds: audioClaimEvidence,
            },
            requiredPower: microphonePower(audioCoreSpecs),
            evidenceIds: audioClaimEvidence,
          },
          adapters: audioAdapters,
          limitations: [
            ...(('conditions' in (audioEdge ?? {}) ? audioEdge?.conditions : []) ?? []).map(
              (condition) => `Warunek: ${condition}`,
            ),
            ...(audioEdge?.limitations ?? []),
          ],
        })
      : undefined;

  const opticsClaimEvidence = lensEdge?.evidenceIds ?? [];
  const opticsAdapterProduct = lensEdge?.requiredProductIds
    .map((id) => productById.get(id))
    .find((product) => product?.subcategory === 'lens_mount_adapter');
  const opticsAdapterSpecs = coreSpecs(opticsAdapterProduct);
  const opticsEvaluation =
    device && selectedLens
      ? evaluateOpticsCompatibility({
          camera: {
            id: device.id,
            mount: deviceCoreSpecs.lensMount ?? '',
            sensorDiagonalMm: deviceCoreSpecs.sensorDiagonalMm ?? Number.NaN,
            ...(deviceCoreSpecs.supportsAutofocus === undefined
              ? {}
              : { supportsAutofocus: deviceCoreSpecs.supportsAutofocus }),
            ...(deviceCoreSpecs.supportsElectronicAperture === undefined
              ? {}
              : { supportsElectronicAperture: deviceCoreSpecs.supportsElectronicAperture }),
            ...(deviceCoreSpecs.supportsStabilization === undefined
              ? {}
              : { supportsStabilization: deviceCoreSpecs.supportsStabilization }),
            ...(deviceCoreSpecs.supportsExif === undefined
              ? {}
              : { supportsExif: deviceCoreSpecs.supportsExif }),
            evidenceIds: opticsClaimEvidence,
          },
          lens: {
            id: selectedLens.id,
            mount: lensCoreSpecs.lensMount ?? '',
            imageCircleMm: lensCoreSpecs.imageCircleMm ?? Number.NaN,
            ...(lensCoreSpecs.autofocus === undefined
              ? {}
              : { autofocus: lensCoreSpecs.autofocus }),
            ...(lensCoreSpecs.apertureControl === undefined
              ? {}
              : { electronicAperture: lensCoreSpecs.apertureControl }),
            ...(lensCoreSpecs.stabilization === undefined
              ? {}
              : { stabilization: lensCoreSpecs.stabilization }),
            ...(lensCoreSpecs.exif === undefined ? {} : { exif: lensCoreSpecs.exif }),
            ...(lensCoreSpecs.filterThreadMm === undefined
              ? {}
              : { filterThreadMm: lensCoreSpecs.filterThreadMm }),
            weightGrams: selectedLens.weightGrams,
            evidenceIds: opticsClaimEvidence,
          },
          ...(opticsAdapterProduct
            ? {
                adapter: {
                  id: opticsAdapterProduct.id,
                  lensMount: opticsAdapterSpecs.outputMount ?? '',
                  cameraMount: opticsAdapterSpecs.inputMount ?? '',
                  verified: true,
                  evidenceIds: opticsClaimEvidence,
                  ...(opticsAdapterSpecs.autofocus === undefined
                    ? {}
                    : { autofocus: opticsAdapterSpecs.autofocus }),
                  ...(opticsAdapterSpecs.apertureControl === undefined
                    ? {}
                    : { apertureControl: opticsAdapterSpecs.apertureControl }),
                  ...(opticsAdapterSpecs.stabilization === undefined
                    ? {}
                    : { stabilization: opticsAdapterSpecs.stabilization }),
                  ...(opticsAdapterSpecs.exif === undefined
                    ? {}
                    : { exif: opticsAdapterSpecs.exif }),
                  limitations: lensEdge?.limitations ?? [],
                },
              }
            : {}),
        })
      : undefined;

  const cardCoreSpecs = coreSpecs(selectedCard);
  const selectedRequiredSpeedClass = selectedMode
    ? requiredSpeedClassMBps(selectedMode.minimumSpeedClass)
    : undefined;
  const selectedCardSpeedClass = speedClassMBps(cardCoreSpecs.speedClasses);
  const memoryEvaluation =
    selectedMode && selectedCard
      ? evaluateMemoryCompatibility({
          deviceMedia: (deviceCoreSpecs.mediaFormats ?? []).map((format) => ({
            format,
            ...(deviceCoreSpecs.maxMediaCapacityGb === undefined
              ? {}
              : { maximumCapacityGB: deviceCoreSpecs.maxMediaCapacityGb }),
            evidenceIds: selectedMode.evidenceIds,
          })),
          mode: {
            id: selectedMode.id,
            bitrateMbps: selectedMode.bitrateMbps,
            mediaRequirements: {
              mediaFormats: selectedMode.mediaFormats,
              minimumSustainedWriteMBps: selectedMode.minimumSustainedWriteMBps,
              ...(selectedRequiredSpeedClass === undefined
                ? {}
                : { minimumSpeedClassMBps: selectedRequiredSpeedClass }),
              evidenceIds: selectedMode.evidenceIds,
            },
            evidenceIds: selectedMode.evidenceIds,
          },
          card: {
            id: selectedCard.id,
            format: cardCoreSpecs.mediaFormat ?? '',
            capacityGB: cardCoreSpecs.capacityGb ?? Number.NaN,
            ...(cardCoreSpecs.sustainedWriteMBps === undefined
              ? {}
              : { sustainedWriteMBps: cardCoreSpecs.sustainedWriteMBps }),
            ...(selectedCardSpeedClass === undefined
              ? {}
              : { guaranteedSpeedClassMBps: selectedCardSpeedClass }),
            ...(cardCoreSpecs.fileSystem === undefined
              ? {}
              : { filesystem: cardCoreSpecs.fileSystem }),
            evidenceIds: cardCoreSpecs.evidenceIds ?? [],
          },
          safetyHeadroom: 1 + selectedMode.safetyMarginPercent / 100,
        })
      : undefined;
  const selectedCage = productById.get(state.cageId);
  const selectedGimbal = productById.get(state.gimbalId);
  const selectedPowerSource = productById.get(state.powerSourceId);
  const selectedPowerCable = productById.get(state.powerCableId);
  const selectedFilter = productById.get(state.filterId);
  const selectedStepUpRing = productById.get(state.stepUpRingId);
  const selectedMatteBox = productById.get(state.matteBoxId);
  const rigMechanicalProfile = demoCatalog.gimbalRigProfiles.find(
    (profile) =>
      profile.deviceId === state.deviceId &&
      profile.audioId === state.audioId &&
      ('lensId' in profile ? profile.lensId === state.lensId : !isCamera) &&
      ('mediaId' in profile ? profile.mediaId === state.cardId : !selectedMode) &&
      ('cageId' in profile ? profile.cageId === state.cageId : !state.cageId) &&
      ('filterId' in profile ? profile.filterId === state.filterId : !state.filterId) &&
      ('stepUpRingId' in profile
        ? profile.stepUpRingId === state.stepUpRingId
        : !state.stepUpRingId) &&
      ('matteBoxId' in profile ? profile.matteBoxId === state.matteBoxId : !state.matteBoxId),
  );
  const cageRigProfile = demoCatalog.cageRigProfiles.find(
    (profile) =>
      profile.deviceId === state.deviceId &&
      profile.audioId === state.audioId &&
      ('lensId' in profile ? profile.lensId === state.lensId : !isCamera) &&
      ('mediaId' in profile ? profile.mediaId === state.cardId : !selectedMode),
  );
  const powerPathProfile = demoCatalog.powerPathProfiles.find(
    (profile) =>
      profile.deviceId === state.deviceId &&
      profile.powerSourceId === state.powerSourceId &&
      profile.cableId === state.powerCableId,
  );
  const filterRigProfile = demoCatalog.filterRigProfiles.find(
    (profile) =>
      profile.deviceId === state.deviceId &&
      profile.lensId === state.lensId &&
      ('filterId' in profile ? profile.filterId === state.filterId : !state.filterId) &&
      ('stepUpRingId' in profile
        ? profile.stepUpRingId === state.stepUpRingId
        : !state.stepUpRingId) &&
      ('matteBoxId' in profile ? profile.matteBoxId === state.matteBoxId : !state.matteBoxId),
  );
  const videoPathProfile = demoCatalog.videoPathProfiles.find(
    (profile) =>
      profile.deviceId === state.deviceId &&
      profile.cableId === state.videoCableId &&
      profile.destinationId === state.videoDestinationId,
  );
  const currentSupportCoreIds = [
    state.deviceId,
    state.audioId,
    ...(isCamera ? [state.lensId] : []),
    ...(selectedMode ? [state.cardId] : []),
    ...state.extraIds.filter((id) => isSupportCoreProduct(productById.get(id))),
  ].filter(Boolean);
  const supportRigProfile = demoCatalog.supportRigProfiles.find(
    (profile) =>
      profile.deviceId === state.deviceId &&
      profile.headId === state.tripodHeadId &&
      profile.tripodId === state.tripodId &&
      sameIds(profile.rigProductIds, currentSupportCoreIds) &&
      ('teleprompterId' in profile
        ? profile.teleprompterId === state.teleprompterId
        : !state.teleprompterId),
  );
  const lightingRigProfile = demoCatalog.lightingRigProfiles.find(
    (profile) =>
      profile.lightId === state.lightId &&
      profile.standId === state.lightStandId &&
      ('modifierId' in profile
        ? profile.modifierId === state.lightModifierId
        : !state.lightModifierId) &&
      ('gridId' in profile ? profile.gridId === state.lightGridId : !state.lightGridId) &&
      ('powerSourceId' in profile
        ? profile.powerSourceId === state.lightPowerSourceId
        : !state.lightPowerSourceId) &&
      ('controllerId' in profile
        ? profile.controllerId === state.lightControllerId
        : !state.lightControllerId),
  );
  const storageWorkflowProfile = demoCatalog.storageWorkflowProfiles.find(
    (profile) =>
      profile.computerId === state.workflowComputerId &&
      profile.readerId === state.workflowReaderId &&
      profile.mediaId === state.workflowMediaId &&
      ('dockId' in profile ? profile.dockId === state.workflowDockId : !state.workflowDockId) &&
      ('powerSourceId' in profile
        ? profile.powerSourceId === state.workflowPowerSourceId
        : !state.workflowPowerSourceId),
  );
  const podcastSourceIds = [state.podcastSourceAId, state.podcastSourceBId].filter(Boolean);
  const podcastWorkflowProfile = demoCatalog.podcastMobileWorkflowProfiles.find(
    (profile) =>
      profile.hostId === state.podcastHostId &&
      profile.interfaceId === state.podcastInterfaceId &&
      sameIds(profile.sourceIds, podcastSourceIds) &&
      ('monitoringId' in profile
        ? profile.monitoringId === state.podcastMonitoringId
        : !state.podcastMonitoringId) &&
      ('powerSourceId' in profile
        ? profile.powerSourceId === state.podcastPowerSourceId
        : !state.podcastPowerSourceId),
  );

  const selectedIds = useMemo(
    () => [
      ...new Set(
        [
          ...(state.deviceId ? [state.deviceId] : []),
          ...(state.audioId ? [state.audioId] : []),
          ...(isCamera ? [state.lensId] : []),
          ...(selectedMode ? [state.cardId] : []),
          ...(state.cageId ? [state.cageId] : []),
          state.gimbalId,
          ...(state.powerSourceId ? [state.powerSourceId] : []),
          ...(state.powerCableId ? [state.powerCableId] : []),
          ...(state.filterId ? [state.filterId] : []),
          ...(state.stepUpRingId ? [state.stepUpRingId] : []),
          ...(state.matteBoxId ? [state.matteBoxId] : []),
          ...(state.videoCableId ? [state.videoCableId] : []),
          ...(state.videoDestinationId ? [state.videoDestinationId] : []),
          ...(state.tripodHeadId ? [state.tripodHeadId] : []),
          ...(state.tripodId ? [state.tripodId] : []),
          ...(state.teleprompterId ? [state.teleprompterId] : []),
          ...(state.lightId ? [state.lightId] : []),
          ...(state.lightModifierId ? [state.lightModifierId] : []),
          ...(state.lightGridId ? [state.lightGridId] : []),
          ...(state.lightStandId ? [state.lightStandId] : []),
          ...(state.lightPowerSourceId ? [state.lightPowerSourceId] : []),
          ...(state.lightControllerId ? [state.lightControllerId] : []),
          ...(state.workflowComputerId ? [state.workflowComputerId] : []),
          ...(state.workflowDockId ? [state.workflowDockId] : []),
          ...(state.workflowReaderId ? [state.workflowReaderId] : []),
          ...(state.workflowMediaId ? [state.workflowMediaId] : []),
          ...(state.workflowPowerSourceId ? [state.workflowPowerSourceId] : []),
          ...(state.podcastHostId ? [state.podcastHostId] : []),
          ...(state.podcastInterfaceId ? [state.podcastInterfaceId] : []),
          ...(state.podcastSourceAId ? [state.podcastSourceAId] : []),
          ...(state.podcastSourceBId ? [state.podcastSourceBId] : []),
          ...(state.podcastMonitoringId ? [state.podcastMonitoringId] : []),
          ...(state.podcastPowerSourceId ? [state.podcastPowerSourceId] : []),
          ...state.extraIds,
        ].filter(Boolean),
      ),
    ],
    [state, isCamera, selectedMode],
  );
  const selectedProducts = selectedIds
    .map((id) => productById.get(id))
    .filter((product): product is Product => product !== undefined);
  const gimbalSpecs = selectedGimbal?.specs as DemoGimbalSpecs | undefined;
  const cageSpecs = selectedCage?.specs as DemoCageSpecs | undefined;
  const powerSourceSpecs = selectedPowerSource?.specs as DemoPowerSourceSpecs | undefined;
  const powerCableSpecs = selectedPowerCable?.specs as DemoPowerCableSpecs | undefined;
  const deviceOpticalSpecs = device?.specs as DemoOpticalAccessorySpecs | undefined;
  const lensOpticalSpecs = productById.get(state.lensId)?.specs as
    DemoOpticalAccessorySpecs | undefined;
  const filterSpecs = selectedFilter?.specs as DemoOpticalAccessorySpecs | undefined;
  const stepUpRingSpecs = selectedStepUpRing?.specs as DemoOpticalAccessorySpecs | undefined;
  const matteBoxSpecs = selectedMatteBox?.specs as DemoOpticalAccessorySpecs | undefined;
  const filterEvaluation =
    isCamera &&
    filterRigProfile &&
    deviceOpticalSpecs &&
    lensOpticalSpecs &&
    (selectedFilter || selectedMatteBox)
      ? evaluateFilterMatteBoxCompatibility({
          deviceId: state.deviceId,
          sensorDiagonalMm: deviceOpticalSpecs.sensorDiagonalMm ?? Number.NaN,
          deviceEvidenceIds: deviceOpticalSpecs.evidenceIds ?? [],
          lens: {
            id: state.lensId,
            ...(lensOpticalSpecs.filterThreadMm === undefined
              ? {}
              : { filterThreadMm: lensOpticalSpecs.filterThreadMm }),
            ...(lensOpticalSpecs.outerDiameterMm === undefined
              ? {}
              : { outerDiameterMm: lensOpticalSpecs.outerDiameterMm }),
            imageCircleMm: lensOpticalSpecs.imageCircleMm ?? Number.NaN,
            minimumClearApertureMm: lensOpticalSpecs.minimumClearApertureMm ?? Number.NaN,
            evidenceIds: lensOpticalSpecs.evidenceIds ?? [],
          },
          ...(selectedStepUpRing && stepUpRingSpecs
            ? {
                stepUpRing: {
                  id: selectedStepUpRing.id,
                  inputThreadDiameterMm: stepUpRingSpecs.inputThreadDiameterMm ?? Number.NaN,
                  outputThreadDiameterMm: stepUpRingSpecs.outputThreadDiameterMm ?? Number.NaN,
                  directional: stepUpRingSpecs.directional ?? false,
                  clearApertureMm: stepUpRingSpecs.clearApertureMm ?? Number.NaN,
                  evidenceIds: stepUpRingSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          ...(selectedFilter && filterSpecs
            ? {
                filter: {
                  id: selectedFilter.id,
                  filterThreadMm: filterSpecs.filterThreadMm ?? Number.NaN,
                  clearApertureMm: filterSpecs.clearApertureMm ?? Number.NaN,
                  evidenceIds: filterSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          ...(selectedMatteBox && matteBoxSpecs
            ? {
                matteBox: {
                  id: selectedMatteBox.id,
                  clampDiameterMm: matteBoxSpecs.clampDiameterMm ?? Number.NaN,
                  supportedLensOuterDiameterMm:
                    matteBoxSpecs.supportedLensOuterDiameterMm ?? Number.NaN,
                  clearApertureMm: matteBoxSpecs.clearApertureMm ?? Number.NaN,
                  maximumSupportedFilterDiameterMm:
                    matteBoxSpecs.maximumSupportedFilterDiameterMm ?? Number.NaN,
                  evidenceIds: matteBoxSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          configuration: {
            id: filterRigProfile.id,
            deviceId: filterRigProfile.deviceId,
            lensId: filterRigProfile.lensId,
            ...('stepUpRingId' in filterRigProfile
              ? { stepUpRingId: filterRigProfile.stepUpRingId }
              : {}),
            ...('filterId' in filterRigProfile ? { filterId: filterRigProfile.filterId } : {}),
            ...('matteBoxId' in filterRigProfile
              ? { matteBoxId: filterRigProfile.matteBoxId }
              : {}),
            sensorDiagonalMm: filterRigProfile.sensorDiagonalMm,
            collisionStatus: exactSafetyStatus(filterRigProfile.collisionStatus),
            vignettingStatus: exactSafetyStatus(filterRigProfile.vignettingStatus),
            conditions: filterRigProfile.conditions,
            limitations: filterRigProfile.limitations,
            evidenceIds: filterRigProfile.evidenceIds,
          },
        })
      : undefined;
  const m3Specs = (id: string): DemoM3Specs | undefined =>
    productById.get(id)?.specs as DemoM3Specs | undefined;
  const videoCable = productById.get(state.videoCableId);
  const videoDestination = productById.get(state.videoDestinationId);
  const cameraVideoSpecs = m3Specs(state.deviceId);
  const videoCableSpecs = m3Specs(state.videoCableId);
  const videoDestinationSpecs = m3Specs(state.videoDestinationId);
  const requestedMediaCapability = videoPathProfile
    ? mediaCapability(videoPathProfile.requestedCapability)
    : undefined;
  const mediaEvaluation =
    videoPathProfile &&
    videoCable &&
    videoDestination &&
    requestedMediaCapability &&
    cameraVideoSpecs &&
    videoCableSpecs &&
    videoDestinationSpecs
      ? evaluateMediaPath({
          camera: {
            id: state.deviceId,
            outputConnector: cameraVideoSpecs.outputConnector ?? '',
            direction: cameraVideoSpecs.direction ?? 'unknown',
            protocolProfile: cameraVideoSpecs.supportedProtocolProfiles?.includes(
              videoPathProfile.protocolProfile,
            )
              ? videoPathProfile.protocolProfile
              : (cameraVideoSpecs.protocolProfile ?? ''),
            supportedModes: cameraVideoSpecs.supportedModes ?? [],
            evidenceIds: cameraVideoSpecs.evidenceIds ?? [],
          },
          cable: {
            id: videoCable.id,
            inputConnector: videoCableSpecs.inputConnector ?? '',
            outputConnector: videoCableSpecs.outputConnector ?? '',
            directional: videoCableSpecs.directional ?? true,
            supportedProtocolProfiles: videoCableSpecs.supportedProtocolProfiles ?? [],
            supportedModes: videoCableSpecs.supportedModes ?? [],
            evidenceIds: videoCableSpecs.evidenceIds ?? [],
          },
          destination: {
            id: videoDestination.id,
            inputConnector: videoDestinationSpecs.inputConnector ?? '',
            supportedProtocolProfiles: videoDestinationSpecs.supportedProtocolProfiles ?? [],
            supportedModes: videoDestinationSpecs.supportedModes ?? [],
            capabilities: videoDestinationSpecs.capabilities ?? [],
            powerMode: videoDestinationSpecs.powerMode ?? 'unknown',
            compatiblePowerSourceIds: videoDestinationSpecs.compatiblePowerSourceIds ?? [],
            evidenceIds: videoDestinationSpecs.evidenceIds ?? [],
          },
          requestedMode: videoPathProfile.mode,
          requestedCapability: requestedMediaCapability,
          claim: {
            id: videoPathProfile.id,
            deviceId: videoPathProfile.deviceId,
            cableId: videoPathProfile.cableId,
            destinationId: videoPathProfile.destinationId,
            protocolProfile: videoPathProfile.protocolProfile,
            mode: videoPathProfile.mode,
            requestedCapability: requestedMediaCapability,
            verificationStatus: verificationStatus(videoPathProfile.verificationStatus),
            conditions: videoPathProfile.conditions,
            limitations: videoPathProfile.limitations,
            evidenceIds: videoPathProfile.evidenceIds,
          },
        })
      : undefined;

  const tripodHead = productById.get(state.tripodHeadId);
  const tripod = productById.get(state.tripodId);
  const teleprompter = productById.get(state.teleprompterId);
  const headSpecs = m3Specs(state.tripodHeadId);
  const tripodSpecs = m3Specs(state.tripodId);
  const teleprompterSpecs = m3Specs(state.teleprompterId);
  const supportEvaluation =
    supportRigProfile && tripodHead && tripod && headSpecs && tripodSpecs
      ? evaluateSupportRig({
          rig: {
            deviceId: supportRigProfile.deviceId,
            productIds: supportRigProfile.rigProductIds,
            mountOutput: headSpecs.mountOutput ?? '',
            plateStandard: headSpecs.plateStandards?.[0] ?? '',
            accessoryMounts: ['quarter_20'],
            totalPayloadGrams: supportRigProfile.totalPayloadGrams,
            widthMm: supportRigProfile.rigWidthMm,
            evidenceIds: supportRigProfile.evidenceIds,
          },
          head: {
            id: tripodHead.id,
            mountInput: headSpecs.mountOutput ?? '',
            mountOutput: headSpecs.mountInput ?? '',
            plateStandards: headSpecs.plateStandards ?? [],
            maxPayloadGrams: headSpecs.maxPayloadGrams ?? Number.NaN,
            weightGrams: tripodHead.weightGrams,
            evidenceIds: headSpecs.evidenceIds ?? [],
          },
          tripod: {
            id: tripod.id,
            mountInput: tripodSpecs.mountOutput ?? '',
            maxPayloadGrams: tripodSpecs.maxPayloadGrams ?? Number.NaN,
            evidenceIds: tripodSpecs.evidenceIds ?? [],
          },
          ...(teleprompter && teleprompterSpecs
            ? {
                teleprompter: {
                  id: teleprompter.id,
                  mountInput: teleprompterSpecs.mountInput ?? '',
                  supportedPlateStandards: teleprompterSpecs.plateStandards ?? [],
                  maxPayloadGrams: teleprompterSpecs.maxPayloadGrams ?? Number.NaN,
                  maxRigWidthMm: teleprompterSpecs.maxRigWidthMm ?? Number.NaN,
                  evidenceIds: teleprompterSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          requiredPayloadMarginPercent: supportRigProfile.requiredPayloadMarginPercent,
          claim: {
            id: supportRigProfile.id,
            deviceId: supportRigProfile.deviceId,
            rigProductIds: supportRigProfile.rigProductIds,
            headId: supportRigProfile.headId,
            tripodId: supportRigProfile.tripodId,
            ...('teleprompterId' in supportRigProfile
              ? { teleprompterId: supportRigProfile.teleprompterId }
              : {}),
            totalPayloadGrams: supportRigProfile.totalPayloadGrams,
            requiredPayloadMarginPercent: supportRigProfile.requiredPayloadMarginPercent,
            collisionStatus: exactSafetyStatus(supportRigProfile.collisionStatus),
            verificationStatus: verificationStatus(supportRigProfile.verificationStatus),
            conditions: supportRigProfile.conditions,
            limitations: supportRigProfile.limitations,
            evidenceIds: supportRigProfile.evidenceIds,
          },
        })
      : undefined;

  const light = productById.get(state.lightId);
  const lightModifier = productById.get(state.lightModifierId);
  const lightGrid = productById.get(state.lightGridId);
  const lightStand = productById.get(state.lightStandId);
  const lightPowerSource = productById.get(state.lightPowerSourceId);
  const lightController = productById.get(state.lightControllerId);
  const lightSpecs = m3Specs(state.lightId);
  const modifierSpecs = m3Specs(state.lightModifierId);
  const gridSpecs = m3Specs(state.lightGridId);
  const standSpecs = m3Specs(state.lightStandId);
  const lightPowerSpecs = m3Specs(state.lightPowerSourceId);
  const controllerSpecs = m3Specs(state.lightControllerId);
  const lightingEvaluation =
    lightingRigProfile && light && lightStand && lightSpecs && standSpecs
      ? evaluateLightingRig({
          light: {
            id: light.id,
            standMountInput: lightSpecs.mountInput ?? '',
            modifierMount: lightSpecs.modifierMount ?? '',
            bodyDiameterMm: lightSpecs.bodyDiameterMm ?? Number.NaN,
            minimumModifierClearApertureMm: lightSpecs.minimumModifierClearApertureMm ?? Number.NaN,
            weightGrams: light.weightGrams,
            powerMode: lightSpecs.inputVoltageV === undefined ? 'unknown' : 'external_required',
            inputVoltageV: lightSpecs.inputVoltageV ?? Number.NaN,
            requiredPowerWatts: lightSpecs.requiredPowerWatts ?? Number.NaN,
            wirelessProtocols: lightSpecs.wirelessProtocols ?? [],
            evidenceIds: lightSpecs.evidenceIds ?? [],
          },
          ...(lightModifier && modifierSpecs
            ? {
                modifier: {
                  id: lightModifier.id,
                  mountInput: modifierSpecs.mountInput ?? '',
                  ...(modifierSpecs.mountOutput ? { mountOutput: modifierSpecs.mountOutput } : {}),
                  maximumLightDiameterMm:
                    modifierSpecs.maximumLightDiameterMm ??
                    modifierSpecs.clearDiameterMm ??
                    Number.NaN,
                  clearApertureMm: modifierSpecs.clearDiameterMm ?? Number.NaN,
                  weightGrams: lightModifier.weightGrams,
                  evidenceIds: modifierSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          ...(lightGrid && gridSpecs
            ? {
                grid: {
                  id: lightGrid.id,
                  mountInput: gridSpecs.mountInput ?? '',
                  weightGrams: lightGrid.weightGrams,
                  evidenceIds: gridSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          stand: {
            id: lightStand.id,
            mountOutput: standSpecs.mountOutput ?? '',
            maxPayloadGrams: standSpecs.maxPayloadGrams ?? Number.NaN,
            evidenceIds: standSpecs.evidenceIds ?? [],
          },
          ...(lightPowerSource && lightPowerSpecs
            ? {
                powerSource: {
                  id: lightPowerSource.id,
                  outputVoltageV: lightPowerSpecs.outputVoltageV ?? Number.NaN,
                  maxPowerWatts: lightPowerSpecs.maximumPowerWatts ?? Number.NaN,
                  compatibleLightIds: lightPowerSpecs.compatibleLightIds ?? [],
                  evidenceIds: lightPowerSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          ...(lightController && controllerSpecs
            ? {
                controller: {
                  id: lightController.id,
                  wirelessProtocols: controllerSpecs.wirelessProtocols ?? [],
                  compatibleLightIds: controllerSpecs.compatibleLightIds ?? [],
                  evidenceIds: controllerSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          requiredPayloadMarginPercent: lightingRigProfile.requiredPayloadMarginPercent,
          controlRequired: 'controllerId' in lightingRigProfile,
          claim: {
            id: lightingRigProfile.id,
            lightId: lightingRigProfile.lightId,
            ...('modifierId' in lightingRigProfile
              ? { modifierId: lightingRigProfile.modifierId }
              : {}),
            ...('gridId' in lightingRigProfile ? { gridId: lightingRigProfile.gridId } : {}),
            standId: lightingRigProfile.standId,
            ...('powerSourceId' in lightingRigProfile
              ? { powerSourceId: lightingRigProfile.powerSourceId }
              : {}),
            ...('controllerId' in lightingRigProfile
              ? { controllerId: lightingRigProfile.controllerId }
              : {}),
            totalMountedWeightGrams: lightingRigProfile.totalMountedWeightGrams,
            requiredPayloadMarginPercent: lightingRigProfile.requiredPayloadMarginPercent,
            requiredVoltageV: lightingRigProfile.requiredVoltageV,
            requiredPowerWatts: lightingRigProfile.requiredPowerWatts,
            ...('wirelessProtocol' in lightingRigProfile
              ? { wirelessProtocol: lightingRigProfile.wirelessProtocol }
              : {}),
            controlRequired: 'controllerId' in lightingRigProfile,
            collisionStatus: exactSafetyStatus(lightingRigProfile.collisionStatus),
            verificationStatus: verificationStatus(lightingRigProfile.verificationStatus),
            conditions: lightingRigProfile.conditions,
            limitations: lightingRigProfile.limitations,
            evidenceIds: lightingRigProfile.evidenceIds,
          },
        })
      : undefined;
  const m4Specs = (id: string): DemoM4Specs | undefined =>
    productById.get(id)?.specs as DemoM4Specs | undefined;
  const workflowComputer = productById.get(state.workflowComputerId);
  const workflowDock = productById.get(state.workflowDockId);
  const workflowReader = productById.get(state.workflowReaderId);
  const workflowMedia = productById.get(state.workflowMediaId);
  const workflowPowerSource = productById.get(state.workflowPowerSourceId);
  const workflowComputerSpecs = m4Specs(state.workflowComputerId);
  const workflowDockSpecs = m4Specs(state.workflowDockId);
  const workflowReaderSpecs = m4Specs(state.workflowReaderId);
  const workflowMediaSpecs = m4Specs(state.workflowMediaId);
  const workflowPowerSpecs = m4Specs(state.workflowPowerSourceId);
  const transferDirection = storageWorkflowProfile
    ? storageTransferDirection(storageWorkflowProfile.transferDirection)
    : undefined;
  const storageWorkflowEvaluation =
    storageWorkflowProfile &&
    transferDirection &&
    workflowComputer &&
    workflowReader &&
    workflowMedia &&
    workflowComputerSpecs &&
    workflowReaderSpecs &&
    workflowMediaSpecs
      ? evaluateStorageWorkflow({
          computer: {
            id: workflowComputer.id,
            outputConnector: workflowComputerSpecs.outputConnector ?? '',
            direction: workflowComputerSpecs.direction ?? 'unknown',
            supportedBusProfiles: workflowComputerSpecs.supportedBusProfiles ?? [],
            maxSustainedTransferMBps: workflowComputerSpecs.maxSustainedTransferMBps ?? Number.NaN,
            maxBusPowerWatts: workflowComputerSpecs.maxBusPowerWatts ?? Number.NaN,
            supportedOsVersions: workflowComputerSpecs.supportedOsVersions ?? [],
            supportedSoftwareIds: workflowComputerSpecs.supportedSoftwareIds ?? [],
            evidenceIds: workflowComputerSpecs.evidenceIds ?? [],
          },
          ...(workflowDock && workflowDockSpecs
            ? {
                dock: {
                  id: workflowDock.id,
                  upstreamConnector: workflowDockSpecs.upstreamConnector ?? '',
                  downstreamConnector: workflowDockSpecs.downstreamConnector ?? '',
                  directional: workflowDockSpecs.directional ?? true,
                  supportedBusProfiles: workflowDockSpecs.supportedBusProfiles ?? [],
                  maxSustainedTransferMBps:
                    workflowDockSpecs.maxSustainedTransferMBps ?? Number.NaN,
                  powerMode: workflowDockSpecs.powerMode ?? 'unknown',
                  requiredPowerWatts: workflowDockSpecs.requiredPowerWatts ?? Number.NaN,
                  downstreamPowerWatts: workflowDockSpecs.downstreamPowerWatts ?? Number.NaN,
                  compatiblePowerSourceIds: workflowDockSpecs.compatiblePowerSourceIds ?? [],
                  supportedOsVersions: workflowDockSpecs.supportedOsVersions ?? [],
                  evidenceIds: workflowDockSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          reader: {
            id: workflowReader.id,
            inputConnector: workflowReaderSpecs.inputConnector ?? '',
            supportedBusProfiles: workflowReaderSpecs.supportedBusProfiles ?? [],
            supportedMediaFormats: workflowReaderSpecs.supportedMediaFormats ?? [],
            supportedMediaProtocols: workflowReaderSpecs.supportedMediaProtocols ?? [],
            maxSustainedTransferMBps: workflowReaderSpecs.maxSustainedTransferMBps ?? Number.NaN,
            requiredPowerWatts: workflowReaderSpecs.requiredPowerWatts ?? Number.NaN,
            supportedOsVersions: workflowReaderSpecs.supportedOsVersions ?? [],
            evidenceIds: workflowReaderSpecs.evidenceIds ?? [],
          },
          media: {
            id: workflowMedia.id,
            mediaFormat: workflowMediaSpecs.mediaFormat ?? '',
            mediaProtocol: workflowMediaSpecs.mediaProtocol ?? '',
            sustainedReadMBps:
              workflowMediaSpecs.sustainedReadMBps ??
              Number(workflowMedia.specs.sustainedReadMBps ?? 0),
            sustainedWriteMBps:
              workflowMediaSpecs.sustainedWriteMBps ??
              Number(workflowMedia.specs.sustainedWriteMBps ?? 0),
            evidenceIds: workflowMediaSpecs.evidenceIds ?? [],
          },
          ...(workflowPowerSource && workflowPowerSpecs
            ? {
                powerSource: {
                  id: workflowPowerSource.id,
                  compatibleDeviceIds: workflowPowerSpecs.compatibleDeviceIds ?? [],
                  maxPowerWatts: workflowPowerSpecs.maxPowerWatts ?? Number.NaN,
                  evidenceIds: workflowPowerSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          busProfile: storageWorkflowProfile.busProfile,
          transferDirection,
          requiredSustainedTransferMBps: storageWorkflowProfile.requiredSustainedTransferMBps,
          osVersion: storageWorkflowProfile.osVersion,
          ...('softwareId' in storageWorkflowProfile
            ? { softwareId: storageWorkflowProfile.softwareId }
            : {}),
          claim: {
            id: storageWorkflowProfile.id,
            computerId: storageWorkflowProfile.computerId,
            ...('dockId' in storageWorkflowProfile
              ? { dockId: storageWorkflowProfile.dockId }
              : {}),
            readerId: storageWorkflowProfile.readerId,
            mediaId: storageWorkflowProfile.mediaId,
            ...('powerSourceId' in storageWorkflowProfile
              ? { powerSourceId: storageWorkflowProfile.powerSourceId }
              : {}),
            busProfile: storageWorkflowProfile.busProfile,
            mediaProtocol: storageWorkflowProfile.mediaProtocol,
            transferDirection,
            requiredSustainedTransferMBps: storageWorkflowProfile.requiredSustainedTransferMBps,
            osVersion: storageWorkflowProfile.osVersion,
            ...('softwareId' in storageWorkflowProfile
              ? { softwareId: storageWorkflowProfile.softwareId }
              : {}),
            verificationStatus: verificationStatus(storageWorkflowProfile.verificationStatus),
            conditions: storageWorkflowProfile.conditions,
            limitations: storageWorkflowProfile.limitations,
            evidenceIds: storageWorkflowProfile.evidenceIds,
          },
        })
      : undefined;

  const podcastHost = productById.get(state.podcastHostId);
  const podcastInterface = productById.get(state.podcastInterfaceId);
  const podcastSources = podcastSourceIds
    .map((id) => productById.get(id))
    .filter((product): product is Product => product !== undefined);
  const podcastMonitoring = productById.get(state.podcastMonitoringId);
  const podcastPowerSource = productById.get(state.podcastPowerSourceId);
  const podcastHostSpecs = m4Specs(state.podcastHostId);
  const podcastInterfaceSpecs = m4Specs(state.podcastInterfaceId);
  const podcastMonitoringSpecs = m4Specs(state.podcastMonitoringId);
  const podcastPowerSpecs = m4Specs(state.podcastPowerSourceId);
  const podcastEvaluation =
    podcastWorkflowProfile &&
    podcastHost &&
    podcastInterface &&
    podcastHostSpecs &&
    podcastInterfaceSpecs &&
    podcastSources.length === podcastSourceIds.length
      ? evaluatePodcastMobileWorkflow({
          host: {
            id: podcastHost.id,
            outputConnector: podcastHostSpecs.outputConnector ?? '',
            direction: podcastHostSpecs.direction ?? 'unknown',
            supportedBusProfiles: podcastHostSpecs.supportedBusProfiles ?? [],
            supportedAudioProtocols: podcastHostSpecs.supportedAudioProtocols ?? [],
            maxSustainedAudioMBps: podcastHostSpecs.maxSustainedAudioMBps ?? Number.NaN,
            maxInputChannels: podcastHostSpecs.maxInputChannels ?? Number.NaN,
            maxBusPowerWatts: podcastHostSpecs.maxBusPowerWatts ?? Number.NaN,
            supportedOsVersions: podcastHostSpecs.supportedOsVersions ?? [],
            supportedAppIds: podcastHostSpecs.supportedAppIds ?? [],
            evidenceIds: podcastHostSpecs.evidenceIds ?? [],
          },
          audioInterface: {
            id: podcastInterface.id,
            upstreamConnector: podcastInterfaceSpecs.upstreamConnector ?? '',
            direction: podcastInterfaceSpecs.direction ?? 'unknown',
            supportedBusProfiles: podcastInterfaceSpecs.supportedBusProfiles ?? [],
            supportedAudioProtocols: podcastInterfaceSpecs.supportedAudioProtocols ?? [],
            sourceInputConnectors: podcastInterfaceSpecs.sourceInputConnectors ?? [],
            sourceSignalProtocols: podcastInterfaceSpecs.sourceSignalProtocols ?? [],
            monitoringOutputConnectors: podcastInterfaceSpecs.monitoringOutputConnectors ?? [],
            maxSampleRateHz: podcastInterfaceSpecs.maxSampleRateHz ?? Number.NaN,
            maxBitDepth: podcastInterfaceSpecs.maxBitDepth ?? Number.NaN,
            maxInputChannels: podcastInterfaceSpecs.maxInputChannels ?? Number.NaN,
            maxSustainedAudioMBps: podcastInterfaceSpecs.maxSustainedAudioMBps ?? Number.NaN,
            powerMode: podcastInterfaceSpecs.powerMode ?? 'unknown',
            requiredPowerWatts: podcastInterfaceSpecs.requiredPowerWatts ?? Number.NaN,
            phantomPowerAvailable: podcastInterfaceSpecs.phantomPowerAvailable ?? false,
            phantomPowerChannels: podcastInterfaceSpecs.phantomPowerChannels ?? 0,
            compatiblePowerSourceIds: podcastInterfaceSpecs.compatiblePowerSourceIds ?? [],
            supportedOsVersions: podcastInterfaceSpecs.supportedOsVersions ?? [],
            evidenceIds: podcastInterfaceSpecs.evidenceIds ?? [],
          },
          sources: podcastSources.map((source) => {
            const specs = m4Specs(source.id);
            return {
              id: source.id,
              outputConnector: specs?.outputConnector ?? '',
              signalProtocol: specs?.signalProtocol ?? '',
              channelCount: specs?.channelCount ?? Number.NaN,
              requiresPhantomPower: specs?.requiresPhantomPower ?? false,
              phantomPowerWatts: specs?.phantomPowerWatts ?? Number.NaN,
              selfPowered: specs?.selfPowered ?? false,
              evidenceIds: specs?.evidenceIds ?? [],
            };
          }),
          ...(podcastMonitoring && podcastMonitoringSpecs
            ? {
                monitoring: {
                  id: podcastMonitoring.id,
                  inputConnector: podcastMonitoringSpecs.inputConnector ?? '',
                  evidenceIds: podcastMonitoringSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          ...(podcastPowerSource && podcastPowerSpecs
            ? {
                powerSource: {
                  id: podcastPowerSource.id,
                  compatibleInterfaceIds: podcastPowerSpecs.compatibleInterfaceIds ?? [],
                  maxPowerWatts: podcastPowerSpecs.maxPowerWatts ?? Number.NaN,
                  evidenceIds: podcastPowerSpecs.evidenceIds ?? [],
                },
              }
            : {}),
          busProfile: podcastWorkflowProfile.busProfile,
          audioProtocol: podcastWorkflowProfile.audioProtocol,
          sampleRateHz: podcastWorkflowProfile.sampleRateHz,
          bitDepth: podcastWorkflowProfile.bitDepth,
          channelCount: podcastWorkflowProfile.channelCount,
          osVersion: podcastWorkflowProfile.osVersion,
          appId: podcastWorkflowProfile.appId,
          claim: {
            id: podcastWorkflowProfile.id,
            hostId: podcastWorkflowProfile.hostId,
            interfaceId: podcastWorkflowProfile.interfaceId,
            sourceIds: podcastWorkflowProfile.sourceIds,
            ...('monitoringId' in podcastWorkflowProfile
              ? { monitoringId: podcastWorkflowProfile.monitoringId }
              : {}),
            ...('powerSourceId' in podcastWorkflowProfile
              ? { powerSourceId: podcastWorkflowProfile.powerSourceId }
              : {}),
            busProfile: podcastWorkflowProfile.busProfile,
            audioProtocol: podcastWorkflowProfile.audioProtocol,
            sampleRateHz: podcastWorkflowProfile.sampleRateHz,
            bitDepth: podcastWorkflowProfile.bitDepth,
            channelCount: podcastWorkflowProfile.channelCount,
            osVersion: podcastWorkflowProfile.osVersion,
            appId: podcastWorkflowProfile.appId,
            verificationStatus: verificationStatus(podcastWorkflowProfile.verificationStatus),
            conditions: podcastWorkflowProfile.conditions,
            limitations: podcastWorkflowProfile.limitations,
            evidenceIds: podcastWorkflowProfile.evidenceIds,
          },
        })
      : undefined;
  const powerEvaluation =
    selectedPowerSource &&
    selectedPowerCable &&
    powerSourceSpecs &&
    powerCableSpecs &&
    powerPathProfile
      ? evaluatePowerPath(
          {
            id: selectedPowerSource.id,
            outputConnector: powerSourceSpecs.outputConnector ?? '',
            protocol: powerSourceSpecs.protocol ?? '',
            pdProfiles: powerSourceSpecs.pdProfiles ?? [],
            maximumPowerWatts: powerSourceSpecs.maximumPowerWatts ?? Number.NaN,
            evidenceIds: powerSourceSpecs.evidenceIds ?? [],
          },
          {
            id: selectedPowerCable.id,
            inputConnector: powerCableSpecs.inputConnector ?? '',
            outputConnector: powerCableSpecs.outputConnector ?? '',
            directional: powerCableSpecs.directional ?? true,
            supportedProtocols: powerCableSpecs.supportedProtocols ?? [],
            maxVoltageV: powerCableSpecs.maxVoltageV ?? Number.NaN,
            maxCurrentA: powerCableSpecs.maxCurrentA ?? Number.NaN,
            maxPowerWatts: powerCableSpecs.maximumPowerWatts ?? Number.NaN,
            evidenceIds: powerCableSpecs.evidenceIds ?? [],
          },
          {
            deviceId: powerPathProfile.deviceId,
            inputConnector: powerPathProfile.requiredConnector,
            protocol: powerPathProfile.requiredProtocol,
            requiredVoltageV: powerPathProfile.requiredVoltageV,
            requiredCurrentA: powerPathProfile.requiredCurrentA,
            requiredPowerWatts: powerPathProfile.requiredPowerWatts,
            evidenceIds: powerPathProfile.evidenceIds,
            conditions: powerPathProfile.conditions,
            limitations: powerPathProfile.limitations,
          },
        )
      : undefined;
  const hasSelectedPowerPath = Boolean(state.powerSourceId || state.powerCableId);
  const hasSelectedM3Path = Boolean(
    state.videoCableId ||
    state.videoDestinationId ||
    state.tripodHeadId ||
    state.tripodId ||
    state.teleprompterId ||
    state.lightId ||
    state.lightModifierId ||
    state.lightGridId ||
    state.lightStandId ||
    state.lightPowerSourceId ||
    state.lightControllerId,
  );
  const externalStationaryPowerIds =
    powerEvaluation?.status === 'compatible_with_limitations'
      ? new Set([state.powerSourceId, state.powerCableId])
      : new Set<string>();
  const payloadProducts = selectedProducts.filter(
    (product) => product.id !== state.gimbalId && !externalStationaryPowerIds.has(product.id),
  );
  const gimbalEvaluation =
    selectedGimbal &&
    gimbalSpecs &&
    rigMechanicalProfile &&
    !hasSelectedM3Path &&
    (!hasSelectedPowerPath || powerEvaluation?.status === 'compatible_with_limitations')
      ? evaluateGimbalCompatibility({
          gimbal: {
            id: selectedGimbal.id,
            payloadSafetyMarginPercent: gimbalSpecs.payloadSafetyMarginPercent ?? Number.NaN,
            supportedCameraMounts: gimbalSpecs.supportedCameraMounts ?? [],
            evidenceIds: gimbalSpecs.evidenceIds ?? [],
            ...(gimbalSpecs.ratedPayloadGrams === undefined
              ? {}
              : { ratedPayloadGrams: gimbalSpecs.ratedPayloadGrams }),
            ...(gimbalSpecs.maximumPackageWidthMm === undefined
              ? {}
              : { maximumPackageWidthMm: gimbalSpecs.maximumPackageWidthMm }),
            ...(gimbalSpecs.maximumPackageHeightMm === undefined
              ? {}
              : { maximumPackageHeightMm: gimbalSpecs.maximumPackageHeightMm }),
            ...(gimbalSpecs.maximumPackageDepthMm === undefined
              ? {}
              : { maximumPackageDepthMm: gimbalSpecs.maximumPackageDepthMm }),
            ...(gimbalSpecs.maximumCenterOfGravityOffsetMm === undefined
              ? {}
              : {
                  maximumCenterOfGravityOffsetMm: gimbalSpecs.maximumCenterOfGravityOffsetMm,
                }),
          },
          rig: {
            id: rigMechanicalProfile.id,
            cameraMount: rigMechanicalProfile.cameraMount,
            packageWidthMm: rigMechanicalProfile.packageWidthMm,
            packageHeightMm: rigMechanicalProfile.packageHeightMm,
            packageDepthMm: rigMechanicalProfile.packageDepthMm,
            centerOfGravityOffsetMm: rigMechanicalProfile.centerOfGravityOffsetMm,
            conditions: rigMechanicalProfile.conditions,
            evidenceIds: rigMechanicalProfile.evidenceIds,
          },
          payloadComponents: payloadProducts.map((product) => ({
            id: product.id,
            weightGrams: product.weightGrams,
          })),
        })
      : undefined;
  const cageEvaluation =
    selectedCage && cageSpecs && cageRigProfile
      ? evaluateCageCompatibility(
          {
            id: selectedCage.id,
            compatibleDeviceIds: cageSpecs.compatibleDeviceIds ?? [],
            incompatibleDeviceIds: cageSpecs.incompatibleDeviceIds ?? [],
            supportedCameraAttachments: cageSpecs.supportedCameraAttachments ?? [],
            accessoryMounts: cageSpecs.accessoryMounts ?? [],
            accessiblePorts: cageSpecs.accessiblePorts ?? [],
            accessibleDoors: cageSpecs.accessibleDoors ?? [],
            evidenceIds: cageSpecs.evidenceIds ?? [],
          },
          {
            deviceId: cageRigProfile.deviceId,
            cameraAttachment: cageRigProfile.cameraAttachment,
            requiredAccessoryMounts: cageRigProfile.requiredAccessoryMounts,
            requiredAccessiblePorts: cageRigProfile.requiredAccessiblePorts,
            requiredAccessibleDoors: cageRigProfile.requiredAccessibleDoors,
            conditions: cageRigProfile.conditions,
            evidenceIds: cageRigProfile.evidenceIds,
          },
        )
      : undefined;
  const powerCalculation =
    powerEvaluation &&
    powerEvaluation.status !== 'unknown' &&
    powerEvaluation.status !== 'incompatible' &&
    powerPathProfile &&
    selectedPowerSource &&
    powerSourceSpecs &&
    powerSourceSpecs.maximumPowerWatts !== undefined &&
    powerSourceSpecs.energyWh !== undefined &&
    powerSourceSpecs.efficiencyPercent !== undefined &&
    powerSourceSpecs.pdProfiles !== undefined
      ? calculatePower({
          loads: [
            {
              id: powerPathProfile.deviceId,
              powerWatts: powerPathProfile.deviceTypicalPowerWatts,
              acceptedVoltage: {
                min: powerPathProfile.requiredVoltageV,
                max: powerPathProfile.requiredVoltageV,
              },
              requiredPdProfile: `${powerPathProfile.requiredVoltageV}V/${powerPathProfile.requiredCurrentA}A`,
            },
          ],
          source: {
            id: selectedPowerSource.id,
            outputVoltage: powerPathProfile.requiredVoltageV,
            maxOutputWatts: powerSourceSpecs.maximumPowerWatts,
            energyWh: powerSourceSpecs.energyWh,
            efficiencyPercent: powerSourceSpecs.efficiencyPercent,
            supportedPdProfiles: powerSourceSpecs.pdProfiles?.map(
              (profile) => `${profile.voltageV}V/${profile.maxCurrentA}A`,
            ),
          },
        })
      : undefined;
  const estimatedPowerRuntimeHours = powerCalculation?.value?.estimatedRuntimeHours;

  const weight = calculateWeight({
    components: selectedProducts.map((product) => ({
      id: product.id,
      weightGrams: product.weightGrams,
    })),
  });
  const price = calculatePrice({
    components: selectedProducts.map((product) => ({
      productId: product.id,
      owned: state.ownedIds.includes(product.id),
      offers: rankOffers(demoOffers.filter((offer) => offer.productId === product.id))
        .filter(
          (offer) =>
            assessOffer(offer, offerAssessmentOptions).publishable &&
            safeDemoOfferUrl(offer) !== undefined,
        )
        .flatMap((offer) =>
          offer.priceMinor === undefined
            ? []
            : [
                {
                  id: offer.id,
                  priceMinor: offer.priceMinor,
                  currency: offer.currency,
                  updatedAt: offer.updatedAt,
                  available: offer.availability === 'in_stock' || offer.availability === 'preorder',
                  sponsored: offer.sponsored,
                },
              ],
        ),
    })),
    currency: 'PLN',
    asOf: offerAssessmentOptions.now,
    staleAfterDays: 30,
  });
  const bestOfferByProductId = new Map(
    selectedProducts.map((product) => {
      const offer = rankOffers(
        demoOffers.filter((candidate) => candidate.productId === product.id),
      ).find(
        (candidate) =>
          assessOffer(candidate, offerAssessmentOptions).publishable &&
          safeDemoOfferUrl(candidate) !== undefined,
      );
      return [product.id, offer] as const;
    }),
  );
  const storage =
    selectedMode && selectedCard
      ? calculateStorage({
          bitrateMbps: selectedMode.bitrateMbps,
          plannedDurationSeconds: state.plannedMinutes * 60,
          cardCapacityGB: Number(selectedCard.specs.capacityGb ?? 0),
          cardSustainedWriteMBps: Number(selectedCard.specs.sustainedWriteMBps ?? 0),
          supportedCapacitiesGB: [64, 128, 256, 512, 1024],
          safetyMarginPercent: selectedMode.safetyMarginPercent,
        })
      : undefined;

  const cardFormatOk = memoryEvaluation?.dimensions.format.status === 'compatible';
  const cardSpeedOk =
    memoryEvaluation?.dimensions.sustainedWrite.status === 'compatible' &&
    ['compatible', 'not_applicable'].includes(memoryEvaluation.dimensions.speedClass.status);
  const cardCapacityOk = storage?.value?.cardCapacitySufficientForPlannedDuration ?? false;
  const cardStatus = !selectedMode
    ? 'Brak trybu dla urządzenia'
    : !memoryEvaluation || memoryEvaluation.status === 'unknown'
      ? 'Nie można potwierdzić wymagań karty'
      : !cardFormatOk
        ? 'Nieobsługiwany format karty'
        : !cardSpeedOk
          ? 'Karta jest zbyt wolna'
          : !cardCapacityOk
            ? 'Karta jest za mała na planowany czas'
            : 'Karta spełnia wymagania';
  const missingRequiredIds = [
    ...new Set([
      ...(audioEdge?.requiredProductIds ?? []),
      ...(lensEdge?.requiredProductIds ?? []),
      ...(podcastWorkflowProfile?.requiredCableIds ?? []),
    ]),
  ].filter((id) => !state.extraIds.includes(id));
  const hasSelectedStorageWorkflow = Boolean(
    state.workflowComputerId ||
    state.workflowDockId ||
    state.workflowReaderId ||
    state.workflowMediaId,
  );
  const hasSelectedPodcastWorkflow = Boolean(
    state.podcastHostId || state.podcastInterfaceId || podcastSourceIds.length,
  );
  const criticalConflicts =
    [audioEvaluation, opticsEvaluation].filter(
      (evaluation) => evaluation?.status === 'incompatible',
    ).length +
    (selectedMode &&
    (memoryEvaluation?.status === 'incompatible' ||
      (memoryEvaluation !== undefined && memoryEvaluation.status !== 'unknown' && !cardCapacityOk))
      ? 1
      : 0) +
    (gimbalEvaluation?.status === 'incompatible' ? 1 : 0) +
    (cageEvaluation?.status === 'incompatible' ? 1 : 0) +
    (powerEvaluation?.status === 'incompatible' ? 1 : 0) +
    (filterEvaluation?.status === 'incompatible' ? 1 : 0) +
    (mediaEvaluation?.status === 'incompatible' ? 1 : 0) +
    (supportEvaluation?.status === 'incompatible' ? 1 : 0) +
    (lightingEvaluation?.status === 'incompatible' ? 1 : 0) +
    (storageWorkflowEvaluation?.status === 'incompatible' ? 1 : 0) +
    (podcastEvaluation?.status === 'incompatible' ? 1 : 0);
  const hasSelectedOpticalAccessories = Boolean(
    state.filterId || state.stepUpRingId || state.matteBoxId,
  );
  const unknownRelations =
    (state.deviceId && state.audioId && (!audioEvaluation || audioEvaluation.status === 'unknown')
      ? 1
      : 0) +
    (isCamera && (!opticsEvaluation || opticsEvaluation.status === 'unknown') ? 1 : 0) +
    (selectedMode && (!memoryEvaluation || memoryEvaluation.status === 'unknown') ? 1 : 0) +
    (state.gimbalId && (!gimbalEvaluation || gimbalEvaluation.status === 'unknown') ? 1 : 0) +
    (state.cageId && (!cageEvaluation || cageEvaluation.status === 'unknown') ? 1 : 0) +
    (hasSelectedPowerPath && (!powerEvaluation || powerEvaluation.status === 'unknown') ? 1 : 0) +
    (hasSelectedOpticalAccessories && (!filterEvaluation || filterEvaluation.status === 'unknown')
      ? 1
      : 0) +
    ((state.videoCableId || state.videoDestinationId) &&
    (!mediaEvaluation || mediaEvaluation.status === 'unknown')
      ? 1
      : 0) +
    ((state.tripodHeadId || state.tripodId || state.teleprompterId) &&
    (!supportEvaluation || supportEvaluation.status === 'unknown')
      ? 1
      : 0) +
    ((state.lightId || state.lightStandId || state.lightPowerSourceId) &&
    (!lightingEvaluation || lightingEvaluation.status === 'unknown')
      ? 1
      : 0) +
    (hasSelectedStorageWorkflow &&
    (!storageWorkflowEvaluation || storageWorkflowEvaluation.status === 'unknown')
      ? 1
      : 0) +
    (hasSelectedPodcastWorkflow && (!podcastEvaluation || podcastEvaluation.status === 'unknown')
      ? 1
      : 0);
  const complete =
    Boolean(state.deviceId || hasSelectedStorageWorkflow || hasSelectedPodcastWorkflow) &&
    criticalConflicts === 0 &&
    unknownRelations === 0 &&
    missingRequiredIds.length === 0 &&
    (!state.audioId ||
      (audioEvaluation !== undefined && isPositiveStatus(audioEvaluation.status))) &&
    (!isCamera || (opticsEvaluation !== undefined && isPositiveStatus(opticsEvaluation.status))) &&
    (!selectedMode ||
      (memoryEvaluation !== undefined &&
        isPositiveStatus(memoryEvaluation.status) &&
        cardCapacityOk));
  const hits = query.trim() ? searchProducts(demoCatalog.products, query, 5) : [];

  function update(patch: Partial<RigState>): void {
    setState((current) => ({ ...current, ...patch }));
  }
  function addExtra(id: string): void {
    update({ extraIds: [...new Set([...state.extraIds, id])] });
  }
  function selectDevice(id: string): void {
    const availableModes = demoCatalog.recordingModes.filter((mode) => mode.deviceId === id);
    update({
      deviceId: id,
      audioId: id ? state.audioId || initialState.audioId : '',
      lensId:
        id && productById.get(id)?.subcategory === 'camera'
          ? state.lensId || initialState.lensId
          : '',
      cardId: availableModes.length > 0 ? state.cardId || initialState.cardId : '',
      gimbalId: id ? state.gimbalId : '',
      modeId: availableModes[0]?.id ?? '',
      cageId:
        id === 'novacam-n7'
          ? 'motionrig-n7-form-cage'
          : id === 'novacam-x1'
            ? 'motionrig-x1-form-cage'
            : '',
      powerSourceId: id === 'novacam-n7' ? initialState.powerSourceId : '',
      powerCableId: id === 'novacam-n7' ? initialState.powerCableId : '',
      filterId: id === 'novacam-n7' ? initialState.filterId : '',
      stepUpRingId: id === 'novacam-n7' ? initialState.stepUpRingId : '',
      matteBoxId: '',
      videoCableId: '',
      videoDestinationId: '',
      tripodHeadId: '',
      tripodId: '',
      teleprompterId: '',
      lightId: '',
      lightModifierId: '',
      lightGridId: '',
      lightStandId: '',
      lightPowerSourceId: '',
      lightControllerId: '',
      extraIds: [],
    });
  }
  function loadTemplate(id: string): void {
    const template = demoCatalog.useCaseTemplates.find((item) => item.id === id);
    if (!template) return;
    const completeRig = demoCatalog.rigs.find((rig) => rig.useCaseTemplateId === template.id);
    const selected = new Set(template.defaultProductIds);
    const pick = (products: readonly Product[]): string =>
      products.find((product) => selected.has(product.id))?.id ?? '';
    const deviceId = pick(categories.devices);
    const modesForDevice = demoCatalog.recordingModes.filter((mode) => mode.deviceId === deviceId);
    const primary = [
      deviceId,
      pick(categories.audio),
      pick(categories.lenses),
      pick(categories.cards),
      pick(categories.cages),
      pick(categories.gimbals),
      pick(categories.powerSources),
      pick(categories.powerCables),
      pick(categories.filters),
      pick(categories.stepUpRings),
      pick(categories.matteBoxes),
      pick(categories.videoCables),
      pick(categories.videoDestinations),
      pick(categories.tripodHeads),
      pick(categories.tripods),
      pick(categories.teleprompters),
      pick(categories.lights),
      pick(categories.lightModifiers),
      pick(categories.lightGrids),
      pick(categories.lightStands),
      pick(categories.lightPowerSources),
      pick(categories.lightControllers),
      pick(categories.computers),
      pick(categories.workflowDocks),
      pick(categories.workflowReaders),
      pick(categories.workflowMedia),
      pick(categories.storagePowerSources),
      pick(categories.podcastInterfaces),
      ...categories.podcastSources
        .filter((product) => selected.has(product.id))
        .map((product) => product.id),
      pick(categories.podcastMonitoring),
      pick(categories.podcastPowerSources),
    ];
    setState(
      hydrateState({
        deviceId,
        audioId: pick(categories.audio),
        lensId: pick(categories.lenses),
        cardId: pick(categories.cards),
        cageId: pick(categories.cages),
        gimbalId: pick(categories.gimbals),
        powerSourceId: pick(categories.powerSources),
        powerCableId: pick(categories.powerCables),
        filterId: pick(categories.filters),
        stepUpRingId: pick(categories.stepUpRings),
        matteBoxId: pick(categories.matteBoxes),
        videoCableId: pick(categories.videoCables),
        videoDestinationId: pick(categories.videoDestinations),
        tripodHeadId: pick(categories.tripodHeads),
        tripodId: pick(categories.tripods),
        teleprompterId: pick(categories.teleprompters),
        lightId: pick(categories.lights),
        lightModifierId: pick(categories.lightModifiers),
        lightGridId: pick(categories.lightGrids),
        lightStandId: pick(categories.lightStands),
        lightPowerSourceId: pick(categories.lightPowerSources),
        lightControllerId: pick(categories.lightControllers),
        workflowComputerId: pick(categories.workflowReaders) ? pick(categories.computers) : '',
        workflowDockId: pick(categories.workflowReaders) ? pick(categories.workflowDocks) : '',
        workflowReaderId: pick(categories.workflowReaders),
        workflowMediaId: pick(categories.workflowReaders) ? pick(categories.workflowMedia) : '',
        workflowPowerSourceId: pick(categories.workflowReaders)
          ? pick(categories.storagePowerSources)
          : '',
        podcastHostId: pick(categories.podcastInterfaces) ? pick(categories.podcastHosts) : '',
        podcastInterfaceId: pick(categories.podcastInterfaces),
        podcastSourceAId:
          categories.podcastSources.find((product) => selected.has(product.id))?.id ?? '',
        podcastSourceBId:
          categories.podcastSources.filter((product) => selected.has(product.id))[1]?.id ?? '',
        podcastMonitoringId: pick(categories.podcastMonitoring),
        podcastPowerSourceId: pick(categories.podcastPowerSources),
        modeId: completeRig?.recordingModeId ?? modesForDevice[0]?.id ?? '',
        extraIds: template.defaultProductIds.filter((productId) => !primary.includes(productId)),
        ownedIds: completeRig?.ownedProductIds ?? (deviceId ? [deviceId] : []),
        plannedMinutes: completeRig?.plannedDurationMinutes ?? state.plannedMinutes,
      }),
    );
  }
  function portableRig(): PortableRig {
    return {
      schemaVersion: '1.0.0',
      synthetic: true,
      notForProduction: true,
      deviceId: state.deviceId || state.workflowComputerId || state.podcastHostId,
      selectedProductIds: selectedIds,
      ownedProductIds: state.ownedIds,
      ...(selectedMode ? { recordingModeId: selectedMode.id } : {}),
      plannedMinutes: state.plannedMinutes,
      exportedAt: new Date().toISOString(),
    };
  }
  async function share(): Promise<void> {
    window.location.hash = `rigv1=${encodeRigFragment(portableRig())}`;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('Link skopiowany');
    } catch {
      setShareStatus('Link gotowy w pasku adresu');
    }
  }
  function exportRig(): void {
    const blob = new Blob([JSON.stringify(portableRig(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'creatorrig-rig-v1.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function importRig(file: File | undefined): Promise<void> {
    if (!file || file.size > 256_000) {
      setShareStatus('Plik jest pusty albo zbyt duży');
      return;
    }
    try {
      const imported = sanitizePortableRig(JSON.parse(await file.text()) as unknown, {
        allowedProductIds,
        allowedRecordingModeIds,
        now: new Date().toISOString(),
      });
      if (!imported.rig) {
        setShareStatus(
          'Nie udało się zaimportować zestawu: plik zawiera nieznane albo brakujące urządzenie.',
        );
        return;
      }
      setState(portableRigToState(imported.rig));
      setShareStatus(
        imported.warnings.length > 0
          ? 'Zestaw zaimportowano, ale część nieznanych pól została pominięta.'
          : 'Zestaw został zaimportowany',
      );
    } catch {
      setShareStatus('Nie udało się zaimportować zestawu: plik nie zawiera prawidłowych danych.');
    }
  }

  return (
    <div className="rig-builder" aria-busy={!ready}>
      <div className="demo-warning">
        <b>DEMO / DANE SYNTETYCZNE</b>
        <span>Nie używaj tych danych do realnych decyzji zakupowych ani elektrycznych.</span>
      </div>
      <div className="template-row" aria-label="Szablony demonstracyjne">
        <span>Zacznij od szablonu:</span>
        {demoCatalog.useCaseTemplates.map((template) => (
          <button key={template.id} disabled={!ready} onClick={() => loadTemplate(template.id)}>
            {template.name}
          </button>
        ))}
      </div>
      <div className="search-box">
        <label htmlFor="gear-search">Szukaj modelu lub aliasu</label>
        <input
          id="gear-search"
          disabled={!ready}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="np. N-7, Pocket USB-C, V90…"
        />
        {hits.length > 0 && (
          <ul>
            {hits.map((hit) => (
              <li key={hit.product.id}>
                <button onClick={() => setQuery(hit.product.canonicalName)}>
                  <b>{hit.product.canonicalName}</b>
                  <small>
                    dopasowanie: {searchMatchLabel(hit.matchedBy)} · wynik {hit.score}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && hits.length === 0 && <p>Brak wyniku — nie tworzymy domyślnej rekomendacji.</p>}
      </div>

      <div className="builder-grid">
        <section className="configuration-panel" aria-labelledby="configuration-title">
          <div className="panel-title">
            <span>01</span>
            <div>
              <h3 id="configuration-title">Konfiguracja</h3>
              <p>Wybierz główne elementy zestawu.</p>
            </div>
          </div>
          <OptionalProductSelect
            label="Urządzenie główne"
            emptyLabel="Praca bez aparatu lub telefonu"
            value={state.deviceId}
            products={categories.devices}
            onChange={selectDevice}
            disabled={!ready}
          />
          {state.deviceId && (
            <ProductSelect
              label="Mikrofon / odbiornik"
              value={state.audioId}
              products={categories.audio}
              onChange={(audioId) => update({ audioId, extraIds: [] })}
              disabled={!ready}
            />
          )}
          {isCamera && (
            <ProductSelect
              label="Obiektyw"
              value={state.lensId}
              products={categories.lenses}
              onChange={(lensId) =>
                update({
                  lensId,
                  filterId: '',
                  stepUpRingId: '',
                  matteBoxId: '',
                  extraIds: state.extraIds.filter((id) => id !== 'clearlens-x-l-adapter'),
                })
              }
              disabled={!ready}
            />
          )}
          {isCamera && (
            <OptionalProductSelect
              label="Filtr okrągły"
              emptyLabel="Bez filtra"
              value={state.filterId}
              products={categories.filters}
              onChange={(filterId) =>
                update({
                  filterId,
                  ...(filterId ? {} : { stepUpRingId: '' }),
                })
              }
              disabled={!ready}
            />
          )}
          {isCamera && state.filterId && (
            <OptionalProductSelect
              label="Pierścień zwiększający średnicę"
              emptyLabel="Bez pierścienia"
              value={state.stepUpRingId}
              products={categories.stepUpRings}
              onChange={(stepUpRingId) => update({ stepUpRingId })}
              disabled={!ready}
            />
          )}
          {isCamera && (
            <OptionalProductSelect
              label="Kompendium"
              emptyLabel="Bez kompendium"
              value={state.matteBoxId}
              products={categories.matteBoxes}
              onChange={(matteBoxId) => update({ matteBoxId })}
              disabled={!ready}
            />
          )}
          {modes.length > 0 && (
            <ProductSelect
              label="Tryb nagrywania"
              value={selectedMode?.id ?? ''}
              products={modes.map((mode) => ({
                ...categories.devices[0]!,
                id: mode.id,
                canonicalName: mode.label,
              }))}
              onChange={(modeId) => update({ modeId })}
              disabled={!ready}
            />
          )}
          {modes.length > 0 && (
            <ProductSelect
              label="Karta pamięci"
              value={state.cardId}
              products={categories.cards}
              onChange={(cardId) => update({ cardId })}
              disabled={!ready}
            />
          )}
          {isCamera && (
            <OptionalProductSelect
              label="Klatka"
              emptyLabel="Bez klatki"
              value={state.cageId}
              products={categories.cages}
              onChange={(cageId) => update({ cageId })}
              disabled={!ready}
            />
          )}
          <OptionalProductSelect
            label="Stabilizator gimbalowy"
            emptyLabel="Bez stabilizatora"
            value={state.gimbalId}
            products={categories.gimbals}
            onChange={(gimbalId) => update({ gimbalId })}
            disabled={!ready}
          />
          {isCamera && (
            <OptionalProductSelect
              label="Źródło zasilania"
              emptyLabel="Bez zasilania zewnętrznego"
              value={state.powerSourceId}
              products={categories.powerSources}
              onChange={(powerSourceId) =>
                update({
                  powerSourceId,
                  ...(powerSourceId ? {} : { powerCableId: '' }),
                })
              }
              disabled={!ready}
            />
          )}
          {isCamera && state.powerSourceId && (
            <OptionalProductSelect
              label="Przewód zasilający"
              emptyLabel="Brak przewodu"
              value={state.powerCableId}
              products={categories.powerCables}
              onChange={(powerCableId) => update({ powerCableId })}
              disabled={!ready}
            />
          )}
          <OptionalProductSelect
            label="Przewód obrazu"
            emptyLabel="Bez toru obrazu"
            value={state.videoCableId}
            products={categories.videoCables}
            onChange={(videoCableId) =>
              update({ videoCableId, ...(videoCableId ? {} : { videoDestinationId: '' }) })
            }
            disabled={!ready}
          />
          {state.videoCableId && (
            <OptionalProductSelect
              label="Monitor, rejestrator lub urządzenie do transmisji"
              emptyLabel="Brak urządzenia docelowego"
              value={state.videoDestinationId}
              products={categories.videoDestinations}
              onChange={(videoDestinationId) => update({ videoDestinationId })}
              disabled={!ready}
            />
          )}
          <OptionalProductSelect
            label="Głowica statywowa"
            emptyLabel="Bez podparcia statywowego"
            value={state.tripodHeadId}
            products={categories.tripodHeads}
            onChange={(tripodHeadId) =>
              update({
                tripodHeadId,
                ...(tripodHeadId ? {} : { tripodId: '', teleprompterId: '' }),
              })
            }
            disabled={!ready}
          />
          {state.tripodHeadId && (
            <OptionalProductSelect
              label="Statyw"
              emptyLabel="Brak statywu"
              value={state.tripodId}
              products={categories.tripods}
              onChange={(tripodId) => update({ tripodId })}
              disabled={!ready}
            />
          )}
          {state.tripodHeadId && (
            <OptionalProductSelect
              label="Teleprompter"
              emptyLabel="Bez telepromptera"
              value={state.teleprompterId}
              products={categories.teleprompters}
              onChange={(teleprompterId) => update({ teleprompterId })}
              disabled={!ready}
            />
          )}
          <OptionalProductSelect
            label="Lampa"
            emptyLabel="Bez oświetlenia"
            value={state.lightId}
            products={categories.lights}
            onChange={(lightId) =>
              update({
                lightId,
                ...(lightId
                  ? {}
                  : {
                      lightModifierId: '',
                      lightGridId: '',
                      lightStandId: '',
                      lightPowerSourceId: '',
                      lightControllerId: '',
                    }),
              })
            }
            disabled={!ready}
          />
          {state.lightId && (
            <>
              <OptionalProductSelect
                label="Modyfikator światła"
                emptyLabel="Bez modyfikatora"
                value={state.lightModifierId}
                products={categories.lightModifiers}
                onChange={(lightModifierId) =>
                  update({ lightModifierId, ...(lightModifierId ? {} : { lightGridId: '' }) })
                }
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Plaster miodu"
                emptyLabel="Bez plastra miodu"
                value={state.lightGridId}
                products={categories.lightGrids}
                onChange={(lightGridId) => update({ lightGridId })}
                disabled={!ready || !state.lightModifierId}
              />
              <OptionalProductSelect
                label="Statyw oświetleniowy"
                emptyLabel="Brak statywu"
                value={state.lightStandId}
                products={categories.lightStands}
                onChange={(lightStandId) => update({ lightStandId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Zasilacz lampy"
                emptyLabel="Brak zasilacza"
                value={state.lightPowerSourceId}
                products={categories.lightPowerSources}
                onChange={(lightPowerSourceId) => update({ lightPowerSourceId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Sterownik światła"
                emptyLabel="Bez sterownika"
                value={state.lightControllerId}
                products={categories.lightControllers}
                onChange={(lightControllerId) => update({ lightControllerId })}
                disabled={!ready}
              />
            </>
          )}
          <OptionalProductSelect
            label="Komputer do zgrywania materiału"
            emptyLabel="Bez ścieżki zgrywania"
            value={state.workflowComputerId}
            products={categories.computers}
            onChange={(workflowComputerId) =>
              update({
                workflowComputerId,
                ...(workflowComputerId
                  ? {}
                  : {
                      workflowDockId: '',
                      workflowReaderId: '',
                      workflowMediaId: '',
                      workflowPowerSourceId: '',
                    }),
              })
            }
            disabled={!ready}
          />
          {state.workflowComputerId && (
            <>
              <OptionalProductSelect
                label="Stacja dokująca"
                emptyLabel="Połączenie bezpośrednie"
                value={state.workflowDockId}
                products={categories.workflowDocks}
                onChange={(workflowDockId) =>
                  update({
                    workflowDockId,
                    ...(workflowDockId ? {} : { workflowPowerSourceId: '' }),
                  })
                }
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Czytnik lub obudowa dysku"
                emptyLabel="Brak czytnika"
                value={state.workflowReaderId}
                products={categories.workflowReaders}
                onChange={(workflowReaderId) => update({ workflowReaderId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Nośnik docelowy"
                emptyLabel="Brak nośnika"
                value={state.workflowMediaId}
                products={categories.workflowMedia}
                onChange={(workflowMediaId) => update({ workflowMediaId })}
                disabled={!ready}
              />
              {state.workflowDockId && (
                <OptionalProductSelect
                  label="Zasilacz stacji dokującej"
                  emptyLabel="Bez zasilacza"
                  value={state.workflowPowerSourceId}
                  products={categories.storagePowerSources}
                  onChange={(workflowPowerSourceId) => update({ workflowPowerSourceId })}
                  disabled={!ready}
                />
              )}
            </>
          )}
          <OptionalProductSelect
            label="Urządzenie nagrywające podcast"
            emptyLabel="Bez toru podcastowego"
            value={state.podcastHostId}
            products={categories.podcastHosts}
            onChange={(podcastHostId) =>
              update({
                podcastHostId,
                ...(podcastHostId
                  ? {}
                  : {
                      podcastInterfaceId: '',
                      podcastSourceAId: '',
                      podcastSourceBId: '',
                      podcastMonitoringId: '',
                      podcastPowerSourceId: '',
                    }),
              })
            }
            disabled={!ready}
          />
          {state.podcastHostId && (
            <>
              <OptionalProductSelect
                label="Interfejs audio"
                emptyLabel="Brak interfejsu"
                value={state.podcastInterfaceId}
                products={categories.podcastInterfaces}
                onChange={(podcastInterfaceId) => update({ podcastInterfaceId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Mikrofon podcastowy 1"
                emptyLabel="Brak mikrofonu"
                value={state.podcastSourceAId}
                products={categories.podcastSources}
                onChange={(podcastSourceAId) => update({ podcastSourceAId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Mikrofon podcastowy 2"
                emptyLabel="Jedno źródło"
                value={state.podcastSourceBId}
                products={categories.podcastSources.filter(
                  (product) => product.id !== state.podcastSourceAId,
                )}
                onChange={(podcastSourceBId) => update({ podcastSourceBId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Słuchawki do odsłuchu"
                emptyLabel="Bez słuchawek"
                value={state.podcastMonitoringId}
                products={categories.podcastMonitoring}
                onChange={(podcastMonitoringId) => update({ podcastMonitoringId })}
                disabled={!ready}
              />
              <OptionalProductSelect
                label="Zasilacz interfejsu"
                emptyLabel="Zasilanie z hosta"
                value={state.podcastPowerSourceId}
                products={categories.podcastPowerSources}
                onChange={(podcastPowerSourceId) => update({ podcastPowerSourceId })}
                disabled={!ready}
              />
            </>
          )}
          {modes.length > 0 && (
            <label className="field">
              <span>Planowany czas nagrania</span>
              <div className="number-field">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  disabled={!ready}
                  value={state.plannedMinutes}
                  onChange={(event) =>
                    update({ plannedMinutes: Math.max(1, Number(event.target.value)) })
                  }
                />
                <i>min</i>
              </div>
            </label>
          )}
          <fieldset className="owned-list">
            <legend>Sprzęt już posiadany</legend>
            {selectedProducts.map((product) => (
              <label key={product.id}>
                <input
                  type="checkbox"
                  checked={state.ownedIds.includes(product.id)}
                  onChange={(event) =>
                    update({
                      ownedIds: event.target.checked
                        ? [...new Set([...state.ownedIds, product.id])]
                        : state.ownedIds.filter((id) => id !== product.id),
                    })
                  }
                />
                {product.canonicalName}
              </label>
            ))}
          </fieldset>
        </section>

        <section className="validation-panel" aria-labelledby="validation-title">
          <div className="panel-title">
            <span>02</span>
            <div>
              <h3 id="validation-title">Walidacja</h3>
              <p>Każdy wymiar jest oceniany osobno.</p>
            </div>
          </div>
          {state.deviceId && state.audioId && (
            <CoreStatusCard
              title="Urządzenie → audio"
              evaluation={audioEvaluation}
              requiredProductIds={audioEdge?.requiredProductIds ?? []}
              state={state}
              onAdd={addExtra}
            />
          )}
          {isCamera && (
            <CoreStatusCard
              title="Aparat → obiektyw"
              evaluation={opticsEvaluation}
              requiredProductIds={lensEdge?.requiredProductIds ?? []}
              state={state}
              onAdd={addExtra}
            />
          )}
          {hasSelectedOpticalAccessories && (
            <FilterMatteBoxStatusCard evaluation={filterEvaluation} />
          )}
          {state.cageId && <CageStatusCard evaluation={cageEvaluation} />}
          {state.gimbalId && <GimbalStatusCard evaluation={gimbalEvaluation} />}
          {hasSelectedPowerPath && (
            <PowerStatusCard
              evaluation={powerEvaluation}
              estimatedRuntimeHours={estimatedPowerRuntimeHours}
            />
          )}
          {selectedMode && (
            <article
              className={`status-card ${
                memoryEvaluation?.status === 'unknown'
                  ? 'status-unknown'
                  : memoryEvaluation?.status === 'incompatible' || !cardCapacityOk
                    ? 'status-error'
                    : 'status-ok'
              }`}
            >
              <div>
                <span className="status-dot">
                  {memoryEvaluation?.status === 'unknown'
                    ? '?'
                    : memoryEvaluation?.status === 'incompatible' || !cardCapacityOk
                      ? '×'
                      : '✓'}
                </span>
                <h3>Tryb → karta</h3>
              </div>
              <strong>{cardStatus}</strong>
              <p>
                Minimum: {selectedMode.minimumSustainedWriteMBps} MB/s ·{' '}
                {selectedMode.minimumSpeedClass}. Z zapasem:{' '}
                {storage?.value?.recommendedSustainedWriteMBps.toFixed(1) ?? '—'} MB/s.
              </p>
              <details>
                <summary>Obliczenia i dowody</summary>
                <ul className="dimension-list">
                  {memoryEvaluation &&
                    Object.entries(memoryEvaluation.dimensions).map(([dimension, result]) => (
                      <li key={dimension}>
                        <span>{dimensionLabel(dimension)}</span>
                        <b>{dimensionStatusLabel(result.status)}</b>
                        <small>{dimensionExplanation(dimension, result.status)}</small>
                      </li>
                    ))}
                </ul>
                <ul className="evidence-list">
                  {memoryEvaluation?.evidenceIds.map((id) => {
                    const evidence = evidenceById.get(id);
                    return evidence ? (
                      <li key={id}>
                        <span>{evidenceHeading(evidence.sourceType)}</span>
                        <small>
                          {evidenceSourceLabel(evidence.sourceType)} · sprawdzono{' '}
                          {formatEvidenceDate(evidence.verifiedAt)}
                        </small>
                      </li>
                    ) : null;
                  })}
                </ul>
                <p>
                  Przepływność danych: {selectedMode.bitrateMbps} Mb/s. Kalkulator używa
                  dziesiętnych GB i 20–25% zapasu.
                </p>
              </details>
            </article>
          )}
          {(state.videoCableId || state.videoDestinationId) && (
            <M3StatusCard title="Aparat → przewód → obraz" evaluation={mediaEvaluation} />
          )}
          {(state.tripodHeadId || state.tripodId || state.teleprompterId) && (
            <M3StatusCard
              title="Zestaw → głowica → statyw lub teleprompter"
              evaluation={supportEvaluation}
            />
          )}
          {(state.lightId || state.lightStandId || state.lightPowerSourceId) && (
            <M3StatusCard
              title="Lampa → modyfikator → statyw → zasilanie"
              evaluation={lightingEvaluation}
            />
          )}
          {hasSelectedStorageWorkflow && (
            <M3StatusCard
              title="Komputer → stacja dokująca → czytnik → nośnik"
              evaluation={storageWorkflowEvaluation}
            />
          )}
          {hasSelectedPodcastWorkflow && (
            <M3StatusCard
              title="Urządzenie nagrywające → interfejs → mikrofony"
              evaluation={podcastEvaluation}
            />
          )}
        </section>
      </div>

      <section
        className={`rig-summary ${complete ? 'summary-ok' : 'summary-warning'}`}
        aria-live="polite"
      >
        <div className="summary-head">
          <div>
            <p className="eyebrow">03 · wynik zestawu</p>
            <h3>
              {complete
                ? 'Zestaw jest kompletny'
                : criticalConflicts > 0
                  ? 'Zestaw ma konflikt krytyczny'
                  : 'Zestaw wymaga uzupełnienia'}
            </h3>
          </div>
          <span>{complete ? 'GOTOWY' : 'SPRAWDŹ'}</span>
        </div>
        <div className="metrics">
          <div>
            <small>Waga całego ekwipunku</small>
            <strong>{weight.value?.knownWeightGrams ?? 0} g</strong>
          </div>
          <div>
            <small>Do zakupu</small>
            <strong>{formatMoney(price.value?.recommendedTotalMinor ?? 0)}</strong>
            {(price.value?.missingProductIds.length ?? 0) > 0 && (
              <small>Brak cen: {price.value?.missingProductIds.length}</small>
            )}
          </div>
          <div>
            <small>Czas na karcie</small>
            <strong>
              {storage?.value?.recordableSeconds
                ? formatDuration(storage.value.recordableSeconds)
                : '—'}
            </strong>
          </div>
          <div>
            <small>Potrzebne miejsce</small>
            <strong>
              {storage?.value?.requiredBytesWithMargin
                ? `${(storage.value.requiredBytesWithMargin / 1_000_000_000).toFixed(1)} GB`
                : '—'}
            </strong>
          </div>
        </div>
        <div className="summary-lists">
          <div>
            <h4>Lista zakupowa</h4>
            <ul>
              {selectedProducts
                .filter((product) => !state.ownedIds.includes(product.id))
                .map((product) => {
                  const offer = bestOfferByProductId.get(product.id);
                  const assessment = offer ? assessOffer(offer, offerAssessmentOptions) : undefined;
                  const safeUrl = offer ? safeDemoOfferUrl(offer) : undefined;
                  return (
                    <li key={product.id}>
                      <span>
                        {product.canonicalName}
                        {offer && <small> · {offer.merchant}</small>}
                        {offer && sponsorshipDisclosure(offer) && (
                          <small> · {sponsorshipDisclosure(offer)}</small>
                        )}
                        {assessment && !assessment.fresh && <small> · cena nieaktualna</small>}
                      </span>
                      {offer?.priceMinor === undefined ? (
                        <b>Brak aktualnej ceny</b>
                      ) : safeUrl ? (
                        <a href={safeUrl} rel="nofollow sponsored noopener noreferrer">
                          {formatMoney(offer.priceMinor)}
                        </a>
                      ) : (
                        <b>Oferta zablokowana</b>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
          <div>
            <h4>Kontrola kompletności</h4>
            <ul>
              <li>
                <span>Konflikty krytyczne</span>
                <b>{criticalConflicts}</b>
              </li>
              <li>
                <span>Brakujące elementy</span>
                <b>{missingRequiredIds.length}</b>
              </li>
              <li>
                <span>Relacje niepotwierdzone</span>
                <b>{unknownRelations}</b>
              </li>
            </ul>
          </div>
        </div>
        <div className="summary-actions">
          <button onClick={() => void share()}>Udostępnij link</button>
          <button onClick={exportRig}>Eksportuj JSON</button>
          <input
            className="import-input"
            aria-label="Importuj JSON"
            type="file"
            accept="application/json,.json"
            disabled={!ready}
            onChange={(event) => void importRig(event.currentTarget.files?.[0])}
          />
          <span>{shareStatus}</span>
        </div>
      </section>
    </div>
  );
}
