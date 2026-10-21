import { z } from "zod";

export const DATA_SCHEMA_VERSION = 2 as const;

export const idSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case identifier");

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const safeUrlSchema = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "Only http and https URLs are allowed");

export const fixtureMarkerShape = {
  synthetic: z.boolean().optional(),
  notForProduction: z.boolean().optional(),
};

export function hasConsistentFixtureMarker(value: {
  synthetic?: boolean;
  notForProduction?: boolean;
}): boolean {
  return value.synthetic === value.notForProduction;
}

export const verificationStatusSchema = z.enum([
  "verified_official",
  "verified_multi_source",
  "verified_supplier",
  "candidate",
  "conflicting",
  "deprecated",
  "rejected",
  "unknown",
]);

export const publicVerificationStatusSchema = z.enum([
  "verified_official",
  "verified_multi_source",
  "verified_supplier",
]);

const formulaPrefixes = new Set(["=", "+", "-", "@"]);

export function hasCsvFormulaPrefix(value: string): boolean {
  let index = 0;
  while (index < value.length && value.charCodeAt(index) <= 32) index += 1;
  return formulaPrefixes.has(value[index] ?? "");
}

export function assertCsvCellIsInert(value: string): string {
  if (hasCsvFormulaPrefix(value)) {
    throw new Error("Potential CSV formula injection detected");
  }
  return value;
}
