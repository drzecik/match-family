import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import {
  canonicalJson,
  MAX_CONFIGURATION_IMPORT_BYTES,
  MAX_CONFIGURATION_DEPTH,
  measureValueDepth,
  parseVerticalPack,
  sha256Hex,
} from '@materialmatch/configuration-schema';

const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error('Usage: pnpm validate:pack <path-to-pack.json>');
}

const resolvedPath = resolve(inputPath);
if (extname(resolvedPath).toLowerCase() !== '.json') {
  throw new Error('Pack validation accepts JSON data only; executable modules are not loaded.');
}
const bytes = await readFile(resolvedPath);
if (bytes.byteLength === 0 || bytes.byteLength > MAX_CONFIGURATION_IMPORT_BYTES) {
  throw new Error(`Pack must contain 1-${MAX_CONFIGURATION_IMPORT_BYTES} bytes.`);
}
const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
const decoded = JSON.parse(source) as unknown;
if (measureValueDepth(decoded) > MAX_CONFIGURATION_DEPTH) {
  throw new Error(`Pack exceeds the maximum JSON depth of ${MAX_CONFIGURATION_DEPTH}.`);
}
const pack = parseVerticalPack(decoded);
const checksum = await sha256Hex(canonicalJson(pack));
console.log(
  JSON.stringify(
    {
      valid: true,
      packId: pack.id,
      packVersion: pack.version,
      schemaVersion: pack.configuration.version.schemaVersion,
      materialTypes: pack.supportedMaterialTypes,
      accessories: pack.configuration.accessories.length,
      checksum,
    },
    null,
    2,
  ),
);
