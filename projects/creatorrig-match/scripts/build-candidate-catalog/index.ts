import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { PRODUCT_CATEGORIES } from '../../packages/domain/src/constants.js';

const COLLECTION_KEYS = [
  'products',
  'interfaces',
  'capabilities',
  'requirements',
  'adapters',
  'recordingModes',
  'evidence',
  'compatibilityEdges',
] as const;

type CollectionKey = (typeof COLLECTION_KEYS)[number];
type JsonRecord = Record<string, unknown>;

export interface CandidateCatalog extends JsonRecord {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly synthetic: false;
  readonly notForProduction: true;
  readonly verificationStatus: 'candidate';
  readonly humanReviewRequired: true;
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
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `${path}.${key}`, 'expected a non-empty string');
  }
  return value;
}

function validateFragment(value: unknown, file: string): JsonRecord {
  if (!isRecord(value)) fail(file, '$', 'expected a JSON object');
  const schemaVersion = requiredString(value, 'schemaVersion', file, '$');
  if (!/^\d+\.\d+\.\d+$/.test(schemaVersion)) {
    fail(file, '$.schemaVersion', 'expected semantic version');
  }
  const generatedAt = requiredString(value, 'generatedAt', file, '$');
  if (!Number.isFinite(Date.parse(generatedAt)))
    fail(file, '$.generatedAt', 'expected an ISO date');
  if (value.verificationStatus !== 'candidate') {
    fail(file, '$.verificationStatus', 'research fragments must remain candidate');
  }
  if (value.humanReviewRequired !== true) {
    fail(file, '$.humanReviewRequired', 'research fragments must require human review');
  }
  if (value.synthetic !== false)
    fail(file, '$.synthetic', 'research fragments must explicitly be non-synthetic');
  if (value.notForProduction !== true)
    fail(file, '$.notForProduction', 'research fragments must remain outside production');
  for (const key of COLLECTION_KEYS) {
    if (value[key] !== undefined && !Array.isArray(value[key])) {
      fail(file, `$.${key}`, 'expected an array');
    }
  }
  return value;
}

export function mergeCandidateFragments(
  inputs: readonly { readonly file: string; readonly value: unknown }[],
): CandidateCatalog {
  if (inputs.length === 0) throw new Error('No candidate fragments found.');
  const fragments = inputs.map(({ file, value }) => ({
    file,
    value: validateFragment(value, file),
  }));
  const versions = new Set(fragments.map(({ value }) => String(value.schemaVersion)));
  if (versions.size !== 1) throw new Error('Candidate fragments use incompatible schema versions.');

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
        if (record.synthetic !== false) {
          fail(file, `${path}.synthetic`, 'candidate records must explicitly be non-synthetic');
        }
        if (record.notForProduction !== true) {
          fail(file, `${path}.notForProduction`, 'candidate records must remain outside production');
        }
        if (key === 'products' && record.officialUrl !== undefined) {
          if (
            typeof record.officialUrl !== 'string' ||
            !record.officialUrl.startsWith('https://')
          ) {
            fail(file, `${path}.officialUrl`, 'product source links must use HTTPS');
          }
        }
        if (
          key === 'products' &&
          !PRODUCT_CATEGORIES.includes(
            requiredString(record, 'category', file, path) as (typeof PRODUCT_CATEGORIES)[number],
          )
        ) {
          fail(file, `${path}.category`, 'expected a canonical product category');
        }
        if (key === 'evidence') {
          if (typeof record.sourceType !== 'string' || !record.sourceType.startsWith('official_')) {
            fail(file, `${path}.sourceType`, 'research catalog evidence must be official');
          }
          if (typeof record.url !== 'string' || !record.url.startsWith('https://')) {
            fail(file, `${path}.url`, 'evidence links must use HTTPS');
          }
        }
        const id = requiredString(record, 'id', file, path);
        const previous = ids.get(id);
        if (previous) fail(file, `${path}.id`, `duplicate id already declared at ${previous}`);
        ids.set(id, `${file}:${path}`);

        if (key === 'compatibilityEdges') {
          if (record.relationType !== 'candidate' || record.verificationStatus !== 'candidate') {
            fail(file, path, 'research relationships must remain unverified candidates');
          }
          if (record.publicationStatus === 'public') {
            fail(file, `${path}.publicationStatus`, 'candidate relationships cannot be public');
          }
        }
        if (
          ['evidence', 'recordingModes'].includes(key) &&
          record.status !== 'candidate' &&
          record.verificationStatus !== 'candidate'
        ) {
          fail(file, path, 'research evidence and recording modes must remain candidates');
        }
        merged[key].push(record);
      });
    }
  }

  const newestGeneratedAt = fragments
    .map(({ value }) => String(value.generatedAt))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  return {
    schemaVersion: String(fragments[0]!.value.schemaVersion),
    generatedAt: newestGeneratedAt!,
    synthetic: false,
    notForProduction: true,
    verificationStatus: 'candidate',
    humanReviewRequired: true,
    sourceFiles: fragments.map(({ file }) => basename(file)).sort(),
    ...merged,
  };
}

export async function buildCandidateCatalog(root = process.cwd()): Promise<string> {
  const inputDirectory = resolve(root, 'data/candidates');
  const names = (await readdir(inputDirectory)).filter((name) => name.endsWith('.json')).sort();
  const inputs = await Promise.all(
    names.map(async (name) => ({
      file: name,
      value: JSON.parse(await readFile(resolve(inputDirectory, name), 'utf8')) as unknown,
    })),
  );
  const output = resolve(root, 'data/generated/candidate-catalog.json');
  const catalog = mergeCandidateFragments(inputs);
  await mkdir(resolve(root, 'data/generated'), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return output;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  buildCandidateCatalog()
    .then((output) => process.stdout.write(`Built private candidate catalog ${output}\n`))
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
