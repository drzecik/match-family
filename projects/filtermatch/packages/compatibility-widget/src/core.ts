import {
  buildModelSearchIndex,
  searchModelIndex,
  type DeviceSearchInput,
  type ModelSearchResult,
  type SearchAliasInput,
  type StaticModelSearchIndex
} from '@filtermatch/model-search';

export const WIDGET_PUBLIC_STATUSES = [
  'verified_official',
  'verified_multi_source',
  'verified_supplier'
] as const;

export type WidgetVerificationStatus =
  | (typeof WIDGET_PUBLIC_STATUSES)[number]
  | 'candidate'
  | 'conflicting'
  | 'deprecated'
  | 'rejected'
  | 'unknown';

export interface WidgetRecordFlags {
  synthetic?: boolean;
  notForProduction?: boolean;
}

export type WidgetDevice = DeviceSearchInput & WidgetRecordFlags;
export type WidgetAlias = SearchAliasInput & WidgetRecordFlags;

export interface WidgetProduct extends WidgetRecordFlags {
  id: string;
  name: string;
  url: string;
  kind: 'original' | 'replacement';
  category?: string;
  available?: boolean;
}

export interface WidgetCompatibility extends WidgetRecordFlags {
  deviceId: string;
  productId: string;
  status: WidgetVerificationStatus;
  relationType?: 'required' | 'alternative' | 'optional';
  evidenceIds?: string[];
}

export type WidgetEvidenceSourceType =
  | 'official_manual'
  | 'official_compatibility_list'
  | 'official_product_page'
  | 'replacement_manufacturer'
  | 'distributor'
  | 'independent';

export interface WidgetEvidence extends WidgetRecordFlags {
  id: string;
  sourceType: WidgetEvidenceSourceType;
  title: string;
  publisher: string;
  url?: string;
  documentId?: string;
  accessedAt: string;
  evidenceSummary: string;
  reviewer: string;
  reviewerType: 'human' | 'approved_process';
  verifiedAt: string;
  verificationDecision: WidgetVerificationStatus;
}

export interface WidgetCatalog extends WidgetRecordFlags {
  devices: WidgetDevice[];
  aliases: WidgetAlias[];
  products: WidgetProduct[];
  compatibility: WidgetCompatibility[];
  evidence: WidgetEvidence[];
}

export interface WidgetConfig extends WidgetRecordFlags {
  catalog: WidgetCatalog;
  labels?: {
    title?: string;
    intro?: string;
    submit?: string;
    noModel?: string;
    noProducts?: string;
  };
  theme?: {
    color?: string;
    accent?: string;
    background?: string;
    borderRadiusPx?: number;
  };
  privacy?: {
    /**
     * Opt-in. A no-result signal tells the merchant which devices their catalog
     * does not cover, which is useful but is still a record of what a visitor
     * searched for. It stays off unless the merchant turns it on deliberately.
     */
    emitNoResultEvents?: boolean;
    includeNormalizedQueryInEvents?: boolean;
  };
}

export interface PreparedWidgetConfig extends WidgetConfig {
  searchIndex: StaticModelSearchIndex;
  productsById: Map<string, WidgetProduct>;
  compatibilityByDevice: Map<string, WidgetCompatibility[]>;
  evidenceById: Map<string, WidgetEvidence>;
}

export type WidgetResolution =
  | {
      status: 'resolved';
      deviceId: string;
      products: WidgetProduct[];
      edges: WidgetCompatibility[];
      normalizedQuery: string;
    }
  | {
      status: 'ambiguous' | 'candidates' | 'not_found' | 'no_products';
      normalizedQuery: string;
      searchResult: ModelSearchResult;
    };

const PUBLIC_STATUS_SET = new Set<string>(WIDGET_PUBLIC_STATUSES);
const ALL_STATUS_SET = new Set<string>([
  ...WIDGET_PUBLIC_STATUSES,
  'candidate',
  'conflicting',
  'deprecated',
  'rejected',
  'unknown'
]);
const RELATION_TYPE_SET = new Set<string>(['required', 'alternative', 'optional']);
const EVIDENCE_SOURCE_TYPE_SET = new Set<string>([
  'official_manual',
  'official_compatibility_list',
  'official_product_page',
  'replacement_manufacturer',
  'distributor',
  'independent'
]);
const OFFICIAL_SOURCE_TYPE_SET = new Set<WidgetEvidenceSourceType>([
  'official_manual',
  'official_compatibility_list',
  'official_product_page'
]);
const SUPPLIER_SOURCE_TYPE_SET = new Set<WidgetEvidenceSourceType>([
  'replacement_manufacturer',
  'distributor'
]);
const SAFE_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/iu;
const MAX_DEVICES = 50_000;
const MAX_ALIASES = 250_000;
const MAX_PRODUCTS = 100_000;
const MAX_EDGES = 500_000;

export function prepareWidgetConfig(config: WidgetConfig): PreparedWidgetConfig {
  assertWidgetConfigShape(config);
  validateCollectionSize('devices', config.catalog.devices.length, MAX_DEVICES);
  validateCollectionSize('aliases', config.catalog.aliases.length, MAX_ALIASES);
  validateCollectionSize('products', config.catalog.products.length, MAX_PRODUCTS);
  validateCollectionSize('compatibility', config.catalog.compatibility.length, MAX_EDGES);
  validateCollectionSize('evidence', config.catalog.evidence.length, MAX_EDGES);
  validateTheme(config);
  validateFixtureFlags(config, 'config');
  validateFixtureFlags(config.catalog, 'catalog');

  const deviceIds = uniqueIds(config.catalog.devices, 'device');
  for (const device of config.catalog.devices) {
    validateFixtureFlags(device, `device ${device.id}`);
    validateText(device.brand, 'device brand', 120);
    validateText(device.canonicalModel, 'canonical model', 120);
    if (device.regionalVariant != null) validateText(device.regionalVariant, 'regional variant', 80);
  }
  const productsById = new Map<string, WidgetProduct>();
  for (const product of config.catalog.products) {
    validateFixtureFlags(product, `product ${product.id}`);
    validateId(product.id, 'product');
    if (productsById.has(product.id)) throw new Error(`Duplicate widget product id: ${product.id}`);
    validateText(product.name, 'product name', 180);
    if (!['original', 'replacement'].includes(product.kind)) throw new Error(`Invalid widget product kind: ${product.id}`);
    if (product.available !== undefined && typeof product.available !== 'boolean') throw new Error(`Invalid widget product availability: ${product.id}`);
    if (product.category !== undefined) validateText(product.category, 'product category', 120);
    validatePublicUrl(product.url, `product ${product.id}`);
    productsById.set(product.id, product);
  }

  for (const alias of config.catalog.aliases) {
    validateFixtureFlags(alias, `alias ${alias.rawAlias}`);
    if (!deviceIds.has(alias.entityId)) throw new Error(`Widget alias references an unknown device: ${alias.entityId}`);
    validateText(alias.rawAlias, 'alias', 200);
    if (alias.entityType !== 'device') throw new Error('Widget supports device aliases only');
    if (typeof alias.approved !== 'boolean' || !alias.approved) throw new Error('Widget aliases must be explicitly approved');
  }

  const evidenceById = new Map<string, WidgetEvidence>();
  for (const evidence of config.catalog.evidence) {
    validateFixtureFlags(evidence, `evidence ${evidence.id}`);
    validateId(evidence.id, 'evidence');
    if (evidenceById.has(evidence.id)) throw new Error(`Duplicate widget evidence id: ${evidence.id}`);
    if (!EVIDENCE_SOURCE_TYPE_SET.has(evidence.sourceType)) throw new Error(`Invalid widget evidence source type: ${evidence.id}`);
    validateText(evidence.title, 'evidence title', 240);
    validateText(evidence.publisher, 'evidence publisher', 180);
    validateText(evidence.evidenceSummary, 'evidence summary', 600);
    validateText(evidence.reviewer, 'evidence reviewer', 160);
    if (!['human', 'approved_process'].includes(evidence.reviewerType)) throw new Error(`Invalid widget evidence reviewer type: ${evidence.id}`);
    if (!ALL_STATUS_SET.has(evidence.verificationDecision)) throw new Error(`Invalid widget evidence decision: ${evidence.id}`);
    validateIsoDate(evidence.accessedAt, `evidence accessedAt ${evidence.id}`);
    validateIsoDate(evidence.verifiedAt, `evidence verifiedAt ${evidence.id}`);
    if (evidence.url !== undefined) validatePublicUrl(evidence.url, `evidence ${evidence.id}`);
    if (evidence.documentId !== undefined) validateText(evidence.documentId, 'evidence document id', 180);
    if (evidence.url === undefined && evidence.documentId === undefined) {
      throw new Error(`Widget evidence needs a URL or document id: ${evidence.id}`);
    }
    evidenceById.set(evidence.id, evidence);
  }

  const compatibilityByDevice = new Map<string, WidgetCompatibility[]>();
  for (const edge of config.catalog.compatibility) {
    validateFixtureFlags(edge, `compatibility ${edge.deviceId}/${edge.productId}`);
    if (!deviceIds.has(edge.deviceId)) throw new Error(`Widget compatibility references an unknown device: ${edge.deviceId}`);
    if (!productsById.has(edge.productId)) throw new Error(`Widget compatibility references an unknown product: ${edge.productId}`);
    if (!ALL_STATUS_SET.has(edge.status)) throw new Error(`Invalid widget compatibility status: ${edge.status}`);
    if (edge.relationType !== undefined && !RELATION_TYPE_SET.has(edge.relationType)) {
      throw new Error(`Invalid widget compatibility relation type: ${edge.relationType}`);
    }
    validateCompatibilityEvidence(edge, evidenceById);
    const edges = compatibilityByDevice.get(edge.deviceId) ?? [];
    if (edges.some(({ productId }) => productId === edge.productId)) {
      throw new Error(`Duplicate widget compatibility: ${edge.deviceId}/${edge.productId}`);
    }
    edges.push(edge);
    compatibilityByDevice.set(edge.deviceId, edges);
  }

  for (const [key, value] of Object.entries(config.labels ?? {})) {
    if (value !== undefined) validateText(value, `label ${key}`, 300);
  }
  if (config.privacy?.emitNoResultEvents !== undefined && typeof config.privacy.emitNoResultEvents !== 'boolean') {
    throw new Error('Widget emitNoResultEvents must be boolean');
  }
  if (config.privacy?.includeNormalizedQueryInEvents !== undefined && typeof config.privacy.includeNormalizedQueryInEvents !== 'boolean') {
    throw new Error('Widget includeNormalizedQueryInEvents must be boolean');
  }

  return {
    ...config,
    searchIndex: buildModelSearchIndex(config.catalog.devices, config.catalog.aliases, {
      generatedAt: '2026-07-17T00:00:00.000Z'
    }),
    productsById,
    compatibilityByDevice,
    evidenceById
  };
}

function assertWidgetConfigShape(config: WidgetConfig): void {
  const input = config as unknown;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Widget config must be an object');
  const catalog = (input as { catalog?: unknown }).catalog;
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) throw new Error('Widget config needs a catalog');
  const value = catalog as Record<string, unknown>;
  for (const key of ['devices', 'aliases', 'products', 'compatibility', 'evidence']) {
    if (!Array.isArray(value[key])) throw new Error(`Widget catalog ${key} must be an array`);
  }
}

export function resolveWidgetQuery(config: PreparedWidgetConfig, query: string): WidgetResolution {
  const searchResult = searchModelIndex(config.searchIndex, query);
  if (searchResult.status !== 'resolved') {
    return {
      status: searchResult.status,
      normalizedQuery: searchResult.normalizedQuery,
      searchResult
    };
  }

  const publicEdges = (config.compatibilityByDevice.get(searchResult.deviceId) ?? []).filter((edge) =>
    isPublishableWidgetEdge(edge, config.evidenceById)
  );
  const products: WidgetProduct[] = [];
  for (const edge of publicEdges) {
    const product = config.productsById.get(edge.productId);
    if (product && product.available !== false) products.push(product);
  }
  if (products.length === 0) {
    return {
      status: 'no_products',
      normalizedQuery: searchResult.normalizedQuery,
      searchResult
    };
  }
  return {
    status: 'resolved',
    deviceId: searchResult.deviceId,
    products,
    edges: publicEdges.filter((edge) => products.some(({ id }) => id === edge.productId)),
    normalizedQuery: searchResult.normalizedQuery
  };
}

/**
 * Detail for the optional no-result event, or null when the merchant has not
 * enabled it. Returning null is the signal not to emit at all: the widget must
 * not report an empty search unless reporting was switched on.
 */
export function noResultEventDetail(
  config: PreparedWidgetConfig,
  resolution: WidgetResolution
): Record<string, unknown> | null {
  if (resolution.status === 'resolved') return null;
  if (config.privacy?.emitNoResultEvents !== true) return null;
  return {
    reason: resolution.status,
    ...(config.privacy?.includeNormalizedQueryInEvents
      ? { normalizedQuery: resolution.normalizedQuery }
      : {})
  };
}

function uniqueIds(devices: DeviceSearchInput[], label: string): Set<string> {
  const ids = new Set<string>();
  for (const device of devices) {
    validateId(device.id, label);
    if (ids.has(device.id)) throw new Error(`Duplicate widget ${label} id: ${device.id}`);
    ids.add(device.id);
  }
  return ids;
}

function validateId(value: string, label: string): void {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,119}$/u.test(value)) throw new Error(`Invalid widget ${label} id`);
}

function validateText(value: string, label: string, maxLength: number): void {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) throw new Error(`Invalid widget ${label}`);
}

function validatePublicUrl(value: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Unsafe widget URL for ${label}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error(`Unsafe widget URL for ${label}`);
  }
}

function validateCollectionSize(label: string, value: number, limit: number): void {
  if (value > limit) throw new Error(`Widget ${label} exceeds the limit of ${limit}`);
}

function validateCompatibilityEvidence(
  edge: WidgetCompatibility,
  evidenceById: Map<string, WidgetEvidence>
): void {
  const evidenceIds = edge.evidenceIds ?? [];
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new Error(`Duplicate widget evidence reference: ${edge.deviceId}/${edge.productId}`);
  }
  for (const evidenceId of evidenceIds) {
    if (!evidenceById.has(evidenceId)) throw new Error(`Widget compatibility references unknown evidence: ${evidenceId}`);
  }
  if (PUBLIC_STATUS_SET.has(edge.status) && !isPublishableWidgetEdge(edge, evidenceById)) {
    throw new Error(`Verified widget compatibility lacks qualifying evidence: ${edge.deviceId}/${edge.productId}`);
  }
}

function isPublishableWidgetEdge(
  edge: WidgetCompatibility,
  evidenceById: Map<string, WidgetEvidence>
): boolean {
  if (!PUBLIC_STATUS_SET.has(edge.status)) return false;
  const evidence = (edge.evidenceIds ?? [])
    .map((id) => evidenceById.get(id))
    .filter((item): item is WidgetEvidence => item !== undefined && item.verificationDecision === edge.status);
  if (edge.status === 'verified_official') {
    return evidence.some((item) => OFFICIAL_SOURCE_TYPE_SET.has(item.sourceType));
  }
  if (edge.status === 'verified_supplier') {
    return evidence.some((item) => SUPPLIER_SOURCE_TYPE_SET.has(item.sourceType));
  }
  const independentSources = new Set(evidence.map((item) => item.url ?? `document:${item.documentId}`));
  const independentPublishers = new Set(evidence.map((item) => item.publisher.trim().toLocaleLowerCase('en-US')));
  return evidence.length >= 2 && independentSources.size >= 2 && independentPublishers.size >= 2;
}

function validateFixtureFlags(record: WidgetRecordFlags, label: string): void {
  if (record.synthetic !== undefined && typeof record.synthetic !== 'boolean') throw new Error(`Invalid synthetic flag: ${label}`);
  if (record.notForProduction !== undefined && typeof record.notForProduction !== 'boolean') throw new Error(`Invalid notForProduction flag: ${label}`);
  if (record.synthetic !== record.notForProduction) {
    throw new Error(`Synthetic widget records require both fixture flags: ${label}`);
  }
}

function validateIsoDate(value: string, label: string): void {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/u.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid widget ${label}`);
  }
}

function validateTheme(config: WidgetConfig): void {
  for (const [key, value] of Object.entries({
    color: config.theme?.color,
    accent: config.theme?.accent,
    background: config.theme?.background
  })) {
    if (value !== undefined && !SAFE_COLOR.test(value)) throw new Error(`Invalid widget theme ${key}`);
  }
  const radius = config.theme?.borderRadiusPx;
  if (radius !== undefined && (!Number.isInteger(radius) || radius < 0 || radius > 48)) {
    throw new Error('Widget borderRadiusPx must be an integer from 0 to 48');
  }
}
