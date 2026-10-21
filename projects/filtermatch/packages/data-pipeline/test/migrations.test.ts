import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  migrateCollectionV1ToV2,
  rollbackCollectionV2ToV1,
} from "../src/index.js";

const fixtureRoot = fileURLToPath(
  new URL("../../../data/fixtures/migrations/", import.meta.url),
);

async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(`${fixtureRoot}${path}`, "utf8")) as unknown;
}

describe("schema v1 to v2 migration", () => {
  it("matches the committed after-fixture exactly", async () => {
    const before = await json("v1/devices.json");
    const expected = await json("v2/devices.json");
    expect(migrateCollectionV1ToV2(before, "devices")).toEqual(expected);
  });

  it("has a deterministic lossless rollback for existing collection records", async () => {
    const before = await json("v1/devices.json");
    const migrated = migrateCollectionV1ToV2(before, "devices");
    expect(rollbackCollectionV2ToV1(migrated, "devices")).toEqual(before);
  });

  it("is idempotent when the requested v2 envelope is already present", async () => {
    const migrated = await json("v2/devices.json");
    expect(migrateCollectionV1ToV2(migrated, "devices")).toEqual(migrated);
  });

  it("rejects a mismatched collection kind during rollback", async () => {
    const migrated = await json("v2/devices.json");
    expect(() => rollbackCollectionV2ToV1(migrated, "offers")).toThrow(/expected offers/i);
  });
});
