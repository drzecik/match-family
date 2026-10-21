import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  DATA_SCHEMA_VERSION,
  dataCollectionEnvelopeSchema,
  dataSnapshotEnvelopeSchema,
  type DataCollectionKind,
} from "@filtermatch/data-schema";
import type { DataSnapshot, VerificationStatus } from "@filtermatch/domain";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export async function readJsonFile(path: string, maxBytes = MAX_INPUT_BYTES): Promise<unknown> {
  const metadata = await stat(path);
  if (metadata.size > maxBytes) {
    throw new Error(`Input exceeds ${maxBytes} bytes: ${path}`);
  }
  const source = await readFile(path, "utf8");
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${(error as Error).message}`);
  }
}

export function versionedCollection(kind: DataCollectionKind, records: readonly unknown[]) {
  return { schemaVersion: DATA_SCHEMA_VERSION, kind, records };
}

async function readCollection(path: string, expectedKind: DataCollectionKind): Promise<unknown[]> {
  const parsed = dataCollectionEnvelopeSchema.safeParse(await readJsonFile(path));
  if (!parsed.success) {
    throw new Error(`Expected a schema v${DATA_SCHEMA_VERSION} collection envelope in ${path}`);
  }
  if (parsed.data.kind !== expectedKind) {
    throw new Error(`Expected collection kind ${expectedKind} in ${path}, got ${parsed.data.kind}`);
  }
  return parsed.data.records;
}

export async function loadRepositorySnapshot(repositoryRoot: string): Promise<unknown> {
  const verified = join(repositoryRoot, "data", "verified");
  const candidates = join(repositoryRoot, "data", "candidates");
  const researchedCandidates = await loadResearchedCandidateCatalogs(
    join(candidates, "catalogs"),
  );
  return {
    devices: [
      ...(await readCollection(join(verified, "devices.json"), "devices")),
      ...researchedCandidates.flatMap(({ data }) => data.devices),
    ],
    consumables: [
      ...(await readCollection(join(verified, "consumables.json"), "consumables")),
      ...researchedCandidates.flatMap(({ data }) => data.consumables),
    ],
    compatibilityEdges: [
      ...(await readCollection(
        join(verified, "compatibility-edges.json"),
        "compatibilityEdges",
      )),
      ...(await readCollection(
        join(candidates, "compatibility-edges.json"),
        "compatibilityEdges",
      )),
      ...researchedCandidates.flatMap(({ data }) => data.compatibilityEdges),
    ],
    sourceEvidence: [
      ...(await readCollection(
        join(verified, "source-evidence.json"),
        "sourceEvidence",
      )),
      ...researchedCandidates.flatMap(({ data }) => data.sourceEvidence),
    ],
    searchAliases: [
      ...(await readCollection(
        join(verified, "search-aliases.json"),
        "searchAliases",
      )),
      ...researchedCandidates.flatMap(({ data }) => data.searchAliases),
    ],
    offers: [
      ...(await readCollection(
        join(repositoryRoot, "data", "offers", "offers.json"),
        "offers",
      )),
      ...researchedCandidates.flatMap(({ data }) => data.offers),
    ],
    reviewDecisions: [
      ...(await readCollection(
        join(verified, "review-decisions.json"),
        "reviewDecisions",
      )),
      ...researchedCandidates.flatMap(({ data }) => data.reviewDecisions),
    ],
  };
}

async function loadResearchedCandidateCatalogs(directory: string) {
  let fileNames: string[];
  try {
    fileNames = (await readdir(directory))
      .filter((name) => name.endsWith(".json"))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  return Promise.all(
    fileNames.map(async (fileName) => {
      const path = join(directory, fileName);
      const parsed = dataSnapshotEnvelopeSchema.safeParse(await readJsonFile(path));
      if (!parsed.success) {
        throw new Error(
          `Expected a schema v${DATA_SCHEMA_VERSION} candidate snapshot envelope in ${path}`,
        );
      }
      const catalog = parsed.data.data;
      const catalogRecords = [
        ...catalog.devices,
        ...catalog.consumables,
        ...catalog.compatibilityEdges,
        ...catalog.sourceEvidence,
        ...catalog.searchAliases,
        ...catalog.offers,
        ...catalog.reviewDecisions,
      ];
      if (catalogRecords.some(({ synthetic, notForProduction }) => synthetic || notForProduction)) {
        throw new Error(`Researched catalog ${path} may not contain fixture records`);
      }
      const nonCandidateDevice = catalog.devices.find(
        ({ verificationStatus }) =>
          verificationStatus !== "candidate" && verificationStatus !== "conflicting",
      );
      const nonCandidateEdge = catalog.compatibilityEdges.find(
        ({ verificationStatus }) =>
          verificationStatus !== "candidate" && verificationStatus !== "conflicting",
      );
      const nonCandidateEvidence = catalog.sourceEvidence.find(
        ({ verificationDecision }) =>
          verificationDecision !== "candidate" && verificationDecision !== "conflicting",
      );
      if (nonCandidateDevice || nonCandidateEdge || nonCandidateEvidence) {
        throw new Error(
          `Researched catalog ${path} may contain candidate or conflicting records only`,
        );
      }
      if (catalog.searchAliases.some(({ approved }) => approved)) {
        throw new Error(`Researched catalog ${path} may not approve aliases`);
      }
      if (catalog.reviewDecisions.length > 0) {
        throw new Error(`Researched catalog ${path} may not contain review decisions`);
      }
      const deviceIds = new Set(catalog.devices.map(({ id }) => id));
      const consumableIds = new Set(catalog.consumables.map(({ id }) => id));
      const evidenceIds = new Set(catalog.sourceEvidence.map(({ id }) => id));
      const localReferencesAreComplete =
        catalog.devices.every(({ sourceReferences }) =>
          sourceReferences.every((id) => evidenceIds.has(id))) &&
        catalog.consumables.every(({ sourceReferences }) =>
          sourceReferences.every((id) => evidenceIds.has(id))) &&
        catalog.compatibilityEdges.every((edge) =>
          deviceIds.has(edge.deviceId) &&
          consumableIds.has(edge.consumableId) &&
          edge.evidenceIds.every((id) => evidenceIds.has(id))) &&
        catalog.searchAliases.every((alias) =>
          alias.entityType === "device"
            ? deviceIds.has(alias.entityId)
            : consumableIds.has(alias.entityId));
      if (!localReferencesAreComplete) {
        throw new Error(
          `Researched catalog ${path} must be self-contained and may not reference fixtures or external collections`,
        );
      }
      return parsed.data;
    }),
  );
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

export async function writeGeneratedSnapshot(
  repositoryRoot: string,
  snapshot: DataSnapshot,
  generatedAt: Date,
): Promise<string> {
  const output = join(repositoryRoot, "data", "generated", "snapshot.json");
  await writeJsonAtomic(output, {
    schemaVersion: DATA_SCHEMA_VERSION,
    generatedAt: generatedAt.toISOString(),
    data: snapshot,
  });
  return output;
}

export async function writeVersionedCollection(
  path: string,
  kind: DataCollectionKind,
  records: readonly unknown[],
): Promise<void> {
  await writeJsonAtomic(path, versionedCollection(kind, records));
}

const publicStatuses = new Set<VerificationStatus>([
  "verified_official",
  "verified_multi_source",
  "verified_supplier",
]);

export async function writeRepositoryReviewState(
  repositoryRoot: string,
  snapshot: DataSnapshot,
): Promise<void> {
  const verifiedEdges = snapshot.compatibilityEdges.filter((edge) =>
    publicStatuses.has(edge.verificationStatus),
  );
  const nonPublicEdges = snapshot.compatibilityEdges.filter(
    (edge) => !publicStatuses.has(edge.verificationStatus),
  );
  await writeVersionedCollection(
    join(repositoryRoot, "data", "verified", "compatibility-edges.json"),
    "compatibilityEdges",
    verifiedEdges,
  );
  await writeVersionedCollection(
    join(repositoryRoot, "data", "candidates", "compatibility-edges.json"),
    "compatibilityEdges",
    nonPublicEdges,
  );
  await writeVersionedCollection(
    join(repositoryRoot, "data", "verified", "review-decisions.json"),
    "reviewDecisions",
    snapshot.reviewDecisions,
  );
}
