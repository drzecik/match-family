#!/usr/bin/env node

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildModelSearchIndex,
  type DeviceSearchInput,
  type SearchAliasInput,
} from "../../packages/model-search/src/index.js";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

interface CliOptions {
  readonly devicesPath: string;
  readonly aliasesPath: string;
  readonly outputPath: string;
  readonly generatedAt?: string;
}

function usage(): string {
  return [
    "Build FilterMatch's static device-model search index.",
    "",
    "Usage:",
    "  tsx scripts/build-search-index/index.ts [options]",
    "",
    "Options:",
    "  --devices <path>      Device JSON (default: data/verified/devices.json)",
    "  --aliases <path>      SearchAlias JSON (default: data/verified/search-aliases.json)",
    "  --output <path>       Generated index (default: data/generated/model-search-index.json)",
    "  --generated-at <ISO>  Deterministic build timestamp",
  ].join("\n");
}

function requiredValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value == null || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return value;
}

function parseArgs(args: readonly string[]): CliOptions {
  let devicesPath = resolve(REPOSITORY_ROOT, "data/verified/devices.json");
  let aliasesPath = resolve(REPOSITORY_ROOT, "data/verified/search-aliases.json");
  let outputPath = resolve(REPOSITORY_ROOT, "data/generated/model-search-index.json");
  let generatedAt: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
    if (arg === "--devices") devicesPath = requiredValue(args, index++, arg);
    else if (arg === "--aliases") aliasesPath = requiredValue(args, index++, arg);
    else if (arg === "--output") outputPath = requiredValue(args, index++, arg);
    else if (arg === "--generated-at") generatedAt = requiredValue(args, index++, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    devicesPath: resolve(devicesPath),
    aliasesPath: resolve(aliasesPath),
    outputPath: resolve(outputPath),
    ...(generatedAt == null ? {} : { generatedAt }),
  };
}

async function readJson(path: string): Promise<unknown> {
  const file = await stat(path);
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`Input exceeds ${MAX_INPUT_BYTES} bytes: ${path}`);
  }
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`Cannot parse JSON input ${path}`, { cause: error });
  }
}

function collection(
  value: unknown,
  property: string,
  expectedKind: "devices" | "searchAliases",
  path: string,
): readonly unknown[] {
  if (typeof value === "object" && value != null) {
    const record = value as Record<string, unknown>;
    if (record.schemaVersion === 2 && record.kind === expectedKind && Array.isArray(record.records)) {
      return record.records;
    }
    if (property in record && Array.isArray(record[property])) {
      throw new Error(`${path} uses an unversioned legacy object; run the v1-to-v2 migration`);
    }
  }
  throw new Error(`${path} must be a schema v2 ${expectedKind} collection envelope`);
}

function requiredString(record: Record<string, unknown>, field: string, context: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${context}.${field} must be a non-empty string`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function parseDevices(value: unknown, path: string): readonly DeviceSearchInput[] {
  return collection(value, "devices", "devices", path).map((item, index) => {
    if (typeof item !== "object" || item == null || Array.isArray(item)) {
      throw new Error(`${path}[${index}] must be an object`);
    }
    const record = item as Record<string, unknown>;
    const regionalVariant = optionalString(record, "regionalVariant");
    const series = optionalString(record, "series");
    const identifiersValue = record.identifiers;
    let identifiers: Record<string, string> | undefined;
    if (identifiersValue != null) {
      if (typeof identifiersValue !== "object" || Array.isArray(identifiersValue)) {
        throw new Error(`${path}[${index}].identifiers must be an object`);
      }
      identifiers = {};
      for (const [key, identifier] of Object.entries(identifiersValue)) {
        if (typeof identifier !== "string") {
          throw new Error(`${path}[${index}].identifiers.${key} must be a string`);
        }
        identifiers[key] = identifier;
      }
    }

    return {
      id: requiredString(record, "id", `${path}[${index}]`),
      brand: requiredString(record, "brand", `${path}[${index}]`),
      canonicalModel: requiredString(record, "canonicalModel", `${path}[${index}]`),
      ...(regionalVariant == null ? {} : { regionalVariant }),
      ...(series == null ? {} : { series }),
      ...(identifiers == null ? {} : { identifiers }),
    };
  });
}

function parseAliases(value: unknown, path: string): readonly SearchAliasInput[] {
  return collection(value, "searchAliases", "searchAliases", path).map((item, index) => {
    if (typeof item !== "object" || item == null || Array.isArray(item)) {
      throw new Error(`${path}[${index}] must be an object`);
    }
    const record = item as Record<string, unknown>;
    if (typeof record.approved !== "boolean") {
      throw new Error(`${path}[${index}].approved must be a boolean`);
    }
    const id = optionalString(record, "id");
    const normalizedAlias = optionalString(record, "normalizedAlias");
    const aliasType = optionalString(record, "aliasType");
    const source = optionalString(record, "source");
    return {
      entityType: requiredString(record, "entityType", `${path}[${index}]`),
      entityId: requiredString(record, "entityId", `${path}[${index}]`),
      rawAlias: requiredString(record, "rawAlias", `${path}[${index}]`),
      approved: record.approved,
      ...(id == null ? {} : { id }),
      ...(normalizedAlias == null ? {} : { normalizedAlias }),
      ...(aliasType == null ? {} : { aliasType }),
      ...(source == null ? {} : { source }),
    };
  });
}

function inferredGeneratedAt(deviceJson: unknown): string {
  const timestamps = collection(deviceJson, "devices", "devices", "devices input")
    .flatMap((item) => {
      if (typeof item !== "object" || item == null || Array.isArray(item)) return [];
      const value = (item as Record<string, unknown>).lastVerifiedAt;
      return typeof value === "string" && Number.isFinite(Date.parse(value)) ? [value] : [];
    })
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return timestamps[0] ?? "1970-01-01T00:00:00.000Z";
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o644,
  });
  await rename(temporaryPath, path);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const [deviceJson, aliasJson] = await Promise.all([
    readJson(options.devicesPath),
    readJson(options.aliasesPath),
  ]);
  const devices = parseDevices(deviceJson, options.devicesPath);
  const aliases = parseAliases(aliasJson, options.aliasesPath);
  const index = buildModelSearchIndex(devices, aliases, {
    generatedAt: options.generatedAt ?? inferredGeneratedAt(deviceJson),
  });
  await writeJsonAtomically(options.outputPath, index);

  const approvedAliases = aliases.filter(
    (alias) => alias.entityType === "device" && alias.approved,
  ).length;
  process.stdout.write(
    `${JSON.stringify({
      output: options.outputPath,
      devices: Object.keys(index.entries).length,
      exactKeys: Object.keys(index.exact).length,
      ambiguousBaseKeys: Object.values(index.baseModels).filter((ids) => ids.length > 1).length,
      approvedAliases,
      skippedAliases: aliases.length - approvedAliases,
      normalizerVersion: index.normalizerVersion,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`build-search-index: ${message}\n`);
  process.exitCode = 1;
});
