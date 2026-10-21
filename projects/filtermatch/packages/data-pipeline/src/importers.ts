import { deviceSchema, consumableSchema } from "@filtermatch/data-schema";
import type { Consumable, Device } from "@filtermatch/domain";

export interface ImportReport {
  imported: number;
  rejected: number;
  duplicateIds: string[];
  errors: Array<{ index: number; message: string }>;
  policy: "candidate_only";
}

export function importDeviceCandidates(
  input: unknown,
  existing: readonly Device[] = [],
): { records: Device[]; report: ImportReport } {
  return importCandidates(input, existing, (raw) => {
    const object = asRecord(raw);
    return deviceSchema.parse({
      ...object,
      verificationStatus: "candidate",
      sourceReferences: Array.isArray(object.sourceReferences) ? object.sourceReferences : [],
      synthetic: object.synthetic,
      notForProduction: object.notForProduction,
    }) as Device;
  });
}

export function importConsumableCandidates(
  input: unknown,
  existing: readonly Consumable[] = [],
): { records: Consumable[]; report: ImportReport } {
  return importCandidates(input, existing, (raw) => consumableSchema.parse(raw) as Consumable);
}

function importCandidates<T extends { id: string }>(
  input: unknown,
  existing: readonly T[],
  parse: (input: unknown) => T,
): { records: T[]; report: ImportReport } {
  if (!Array.isArray(input)) throw new Error("Import input must be a JSON array");
  const byId = new Map(existing.map((record) => [record.id, record]));
  const duplicateIds = new Set<string>();
  const errors: ImportReport["errors"] = [];
  let imported = 0;
  input.forEach((raw, index) => {
    try {
      const candidate = parse(raw);
      if (byId.has(candidate.id)) {
        duplicateIds.add(candidate.id);
        return;
      }
      byId.set(candidate.id, candidate);
      imported += 1;
    } catch (error) {
      errors.push({ index, message: (error as Error).message });
    }
  });
  return {
    records: [...byId.values()],
    report: {
      imported,
      rejected: errors.length,
      duplicateIds: [...duplicateIds].sort(),
      errors,
      policy: "candidate_only",
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object");
  }
  return value as Record<string, unknown>;
}
