import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const COLLECTION_KEYS = [
  'products',
  'interfaces',
  'capabilities',
  'requirements',
  'adapters',
  'gimbalRigProfiles',
  'cageRigProfiles',
  'powerPathProfiles',
  'filterRigProfiles',
  'videoPathProfiles',
  'supportRigProfiles',
  'lightingRigProfiles',
  'storageWorkflowProfiles',
  'podcastMobileWorkflowProfiles',
  'recordingModes',
  'offers',
  'evidence',
  'compatibilityEdges',
  'useCaseTemplates',
  'rigs',
] as const;

type CollectionKey = (typeof COLLECTION_KEYS)[number];
type JsonRecord = Record<string, unknown>;

export interface ProductionFragment extends JsonRecord {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly synthetic: false;
  readonly notForProduction: false;
  readonly verificationStatus: 'verified';
  readonly humanReviewRequired: false;
}

export interface ProductionCatalog extends JsonRecord {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly synthetic: false;
  readonly notForProduction: false;
  readonly verificationStatus: 'verified';
  readonly humanReviewRequired: false;
  readonly sourceFiles: readonly string[];
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(file: string, path: string, message: string): never {
  throw new Error(`${file}:${path}: ${message}`);
}

function requiredString(record: JsonRecord, key: string, file: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '')
    fail(file, `${path}.${key}`, 'expected a non-empty string');
  return value;
}

function requireProductionFlags(record: JsonRecord, file: string, path: string): void {
  if (record.synthetic !== false)
    fail(file, `${path}.synthetic`, 'production records must explicitly set false');
  if (record.notForProduction !== false) {
    fail(file, `${path}.notForProduction`, 'production records must explicitly set false');
  }
}

function evidenceIds(record: JsonRecord): readonly string[] {
  const direct = record.evidenceIds;
  if (Array.isArray(direct))
    return direct.filter((value): value is string => typeof value === 'string');
  const references = record.sourceReferences;
  if (Array.isArray(references))
    return references.filter((value): value is string => typeof value === 'string');
  const specs = record.specs;
  if (isRecord(specs) && Array.isArray(specs.evidenceIds)) {
    return specs.evidenceIds.filter((value): value is string => typeof value === 'string');
  }
  return [];
}

function assertedDimensions(edge: JsonRecord): readonly string[] {
  if (isRecord(edge.dimensions)) {
    return Object.entries(edge.dimensions)
      .filter(([, status]) => status !== 'not_applicable')
      .map(([dimension]) => dimension);
  }
  if (Array.isArray(edge.compatibilityDimensions)) {
    return edge.compatibilityDimensions.flatMap((value) => {
      if (
        !isRecord(value) ||
        value.status === 'not_applicable' ||
        typeof value.dimension !== 'string'
      )
        return [];
      return [value.dimension];
    });
  }
  return [];
}

function proofScopes(evidence: JsonRecord): readonly string[] {
  const value = evidence.scope ?? evidence.proofScope;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function validateFragment(input: unknown, file: string): ProductionFragment {
  if (!isRecord(input)) fail(file, '$', 'expected a JSON object');
  const fragment = input;
  const schemaVersion = requiredString(fragment, 'schemaVersion', file, '$');
  if (!/^\d+\.\d+\.\d+$/.test(schemaVersion))
    fail(file, '$.schemaVersion', 'expected semantic version');
  const generatedAt = requiredString(fragment, 'generatedAt', file, '$');
  if (!Number.isFinite(Date.parse(generatedAt)))
    fail(file, '$.generatedAt', 'expected an ISO date');
  requireProductionFlags(fragment, file, '$');
  if (fragment.verificationStatus !== 'verified') {
    fail(
      file,
      '$.verificationStatus',
      'candidate or unknown fragments cannot enter the production catalog',
    );
  }
  if (fragment.humanReviewRequired !== false) {
    fail(file, '$.humanReviewRequired', 'human review must be completed explicitly');
  }
  for (const key of COLLECTION_KEYS) {
    if (fragment[key] !== undefined && !Array.isArray(fragment[key]))
      fail(file, `$.${key}`, 'expected an array');
  }
  return fragment as ProductionFragment;
}

export function mergeProductionFragments(
  inputs: readonly { readonly file: string; readonly value: unknown }[],
): ProductionCatalog {
  if (inputs.length === 0) throw new Error('No verified production fragments found.');
  const fragments = inputs.map(({ file, value }) => ({
    file,
    value: validateFragment(value, file),
  }));
  const schemaVersions = new Set(fragments.map(({ value }) => value.schemaVersion));
  if (schemaVersions.size !== 1)
    throw new Error('Verified fragments use incompatible schema versions.');

  const merged = Object.fromEntries(COLLECTION_KEYS.map((key) => [key, []])) as Record<
    CollectionKey,
    JsonRecord[]
  >;
  const ids = new Map<string, string>();
  for (const { file, value } of fragments) {
    for (const key of COLLECTION_KEYS) {
      const records = (value[key] ?? []) as unknown[];
      records.forEach((record, index) => {
        const path = `$.${key}[${index}]`;
        if (!isRecord(record)) fail(file, path, 'expected an object');
        requireProductionFlags(record, file, path);
        if (
          (record.verificationStatus !== undefined && record.verificationStatus !== 'verified') ||
          record.publicationStatus === 'candidate' ||
          record.relationType === 'candidate'
        ) {
          fail(file, path, 'candidate records cannot enter the production catalog');
        }
        if (record.humanReviewRequired !== undefined && record.humanReviewRequired !== false) {
          fail(file, `${path}.humanReviewRequired`, 'human review must be completed explicitly');
        }
        const id = requiredString(record, 'id', file, path);
        const previous = ids.get(id);
        if (previous) fail(file, `${path}.id`, `duplicate id already declared at ${previous}`);
        ids.set(id, `${file}:${path}`);
        merged[key].push(record);
      });
    }
  }

  const evidenceById = new Map(
    merged.evidence.map((evidence) => [
      requiredString(evidence, 'id', 'merged', '$.evidence'),
      evidence,
    ]),
  );
  for (const [index, evidence] of merged.evidence.entries()) {
    const path = `$.evidence[${index}]`;
    const sourceType = requiredString(evidence, 'sourceType', 'merged', path);
    if (!sourceType.startsWith('official_'))
      fail('merged', `${path}.sourceType`, 'production evidence must be official');
    if (evidence.status !== 'verified' && evidence.verificationStatus !== 'verified') {
      fail('merged', `${path}.status`, 'production evidence must be verified');
    }
    const url = requiredString(evidence, 'url', 'merged', path);
    if (!/^https:\/\//i.test(url))
      fail('merged', `${path}.url`, 'production evidence requires an HTTPS source URL');
    requiredString(evidence, 'verifiedAt', 'merged', path);
    requiredString(evidence, 'verifier', 'merged', path);
    const scope = proofScopes(evidence);
    if (scope.length === 0) {
      fail('merged', `${path}.scope`, 'verified evidence requires a non-empty proof scope');
    }
  }

  const requireOfficialEvidence = (
    record: JsonRecord,
    file: string,
    path: string,
  ): JsonRecord[] => {
    const references = evidenceIds(record);
    if (references.length === 0)
      fail(file, `${path}.evidenceIds`, 'public record requires evidence');
    return references.map((id, index) => {
      const evidence = evidenceById.get(id);
      if (!evidence) fail(file, `${path}.evidenceIds[${index}]`, `unknown evidence ${id}`);
      return evidence;
    });
  };

  const evidenceBearingCollections = [
    'products',
    'interfaces',
    'capabilities',
    'requirements',
    'adapters',
    'gimbalRigProfiles',
    'cageRigProfiles',
    'powerPathProfiles',
    'filterRigProfiles',
    'videoPathProfiles',
    'supportRigProfiles',
    'lightingRigProfiles',
    'storageWorkflowProfiles',
    'podcastMobileWorkflowProfiles',
  ] as const satisfies readonly CollectionKey[];
  for (const key of evidenceBearingCollections) {
    merged[key].forEach((record, index) =>
      requireOfficialEvidence(record, 'merged', `$.${key}[${index}]`),
    );
  }

  const productIds = new Set(merged.products.map((product) => String(product.id)));
  merged.recordingModes.forEach((mode, index) => {
    const path = `$.recordingModes[${index}]`;
    if (!productIds.has(String(mode.deviceId))) {
      fail('merged', `${path}.deviceId`, `unknown product ${String(mode.deviceId)}`);
    }
    const evidence = requireOfficialEvidence(mode, 'merged', path);
    if (!evidence.some((item) => proofScopes(item).includes('memory'))) {
      fail('merged', `${path}.evidenceIds`, 'recording mode requires official memory evidence');
    }
  });
  merged.compatibilityEdges.forEach((edge, index) => {
    const path = `$.compatibilityEdges[${index}]`;
    if (!productIds.has(String(edge.sourceProductId))) {
      fail('merged', `${path}.sourceProductId`, `unknown product ${String(edge.sourceProductId)}`);
    }
    if (!productIds.has(String(edge.targetProductId))) {
      fail('merged', `${path}.targetProductId`, `unknown product ${String(edge.targetProductId)}`);
    }
    if (edge.verificationStatus !== 'verified')
      fail('merged', `${path}.verificationStatus`, 'edge must be verified');
    if (['candidate', 'deprecated'].includes(String(edge.relationType))) {
      fail(
        'merged',
        `${path}.relationType`,
        'candidate and deprecated edges cannot enter the production graph',
      );
    }
    const edgeEvidence = requireOfficialEvidence(edge, 'merged', path);
    const covered = new Set(edgeEvidence.flatMap((item) => proofScopes(item)));
    for (const dimension of assertedDimensions(edge)) {
      if (!covered.has(dimension)) {
        fail(
          'merged',
          `${path}.evidenceIds`,
          `official evidence does not cover asserted dimension ${dimension}`,
        );
      }
    }
  });

  const newestGeneratedAt = fragments
    .map(({ value }) => value.generatedAt)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  return {
    schemaVersion: fragments[0]!.value.schemaVersion,
    generatedAt: newestGeneratedAt!,
    synthetic: false,
    notForProduction: false,
    verificationStatus: 'verified',
    humanReviewRequired: false,
    sourceFiles: fragments.map(({ file }) => basename(file)).sort(),
    ...merged,
  };
}

export async function buildProductionCatalog(root = process.cwd()): Promise<string> {
  const verifiedDirectory = resolve(root, 'data/verified');
  const names = (await readdir(verifiedDirectory)).filter((name) => name.endsWith('.json')).sort();
  const inputs = await Promise.all(
    names.map(async (name) => ({
      file: name,
      value: JSON.parse(await readFile(resolve(verifiedDirectory, name), 'utf8')) as unknown,
    })),
  );
  const output = resolve(root, 'data/generated/production-catalog.json');
  const catalog = mergeProductionFragments(inputs);
  await mkdir(resolve(root, 'data/generated'), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return output;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  buildProductionCatalog()
    .then((output) => process.stdout.write(`Built verified production catalog ${output}\n`))
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
