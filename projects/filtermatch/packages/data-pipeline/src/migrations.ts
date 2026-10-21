import {
  DATA_SCHEMA_VERSION,
  collectionRecordSchemas,
  dataCollectionEnvelopeSchema,
  type DataCollectionKind,
} from "@filtermatch/data-schema";

export type LegacyCollectionKind = Exclude<DataCollectionKind, "reviewDecisions">;

const legacyKinds = new Set<LegacyCollectionKind>([
  "devices",
  "consumables",
  "compatibilityEdges",
  "sourceEvidence",
  "searchAliases",
  "offers",
]);

export function isLegacyCollectionKind(value: string): value is LegacyCollectionKind {
  return legacyKinds.has(value as LegacyCollectionKind);
}

export function migrateCollectionV1ToV2(input: unknown, kind: LegacyCollectionKind) {
  const existing = dataCollectionEnvelopeSchema.safeParse(input);
  if (existing.success) {
    if (existing.data.kind !== kind) {
      throw new Error(`Expected ${kind}, got ${existing.data.kind}`);
    }
    const records = collectionRecordSchemas[kind].array().parse(existing.data.records);
    return { ...existing.data, records };
  }
  if (!Array.isArray(input)) throw new Error("Schema v1 collection must be a JSON array");
  const records = collectionRecordSchemas[kind].array().parse(input);
  return dataCollectionEnvelopeSchema.parse({
    schemaVersion: DATA_SCHEMA_VERSION,
    kind,
    records,
  });
}

export function rollbackCollectionV2ToV1(input: unknown, expectedKind: LegacyCollectionKind) {
  const envelope = dataCollectionEnvelopeSchema.parse(input);
  if (envelope.kind !== expectedKind) {
    throw new Error(`Expected ${expectedKind}, got ${envelope.kind}`);
  }
  return collectionRecordSchemas[expectedKind].array().parse(envelope.records);
}
