import { describe, expect, it } from "vitest";
import {
  appendRegionalVariant,
  baseModel,
  buildModelSearchIndex,
  normalizeModelKey,
  normalizeModelText,
  searchModelIndex,
  type DeviceSearchInput,
  type SearchAliasInput,
} from "../src/index.js";

const generatedAt = "2026-01-02T03:04:05.000Z";

const baseDevices: readonly DeviceSearchInput[] = [
  {
    id: "airpure-ap300-10",
    brand: "AirPure",
    canonicalModel: "AP 300",
    regionalVariant: "10",
    series: "Fresh Air",
    identifiers: { productCode: "AP30010-EU" },
  },
  {
    id: "airpure-ap300-40",
    brand: "AirPure",
    canonicalModel: "AP 300",
    regionalVariant: "/40",
    series: "Fresh Air",
  },
  {
    id: "airpure-ap301-10",
    brand: "AirPure",
    canonicalModel: "AP 301",
    regionalVariant: "10",
  },
  {
    id: "cleanflow-cf20",
    brand: "CleanFlow",
    canonicalModel: "CF-20",
  },
];

const aliases: readonly SearchAliasInput[] = [
  {
    id: "alias-ap30010",
    entityType: "device",
    entityId: "airpure-ap300-10",
    rawAlias: "Air Pure FreshAir AP300 EU",
    approved: true,
  },
  {
    id: "candidate-alias",
    entityType: "device",
    entityId: "airpure-ap301-10",
    rawAlias: "APX magic",
    approved: false,
  },
];

function createIndex() {
  return buildModelSearchIndex(baseDevices, aliases, { generatedAt });
}

describe("model normalization", () => {
  it("uses Unicode NFKC, consistent case, and normalized whitespace", () => {
    expect(normalizeModelText("  ａｐ\u00a0３００  /  １０ ")).toBe("AP 300 / 10");
    expect(normalizeModelKey("  ａｐ\u00a0３００  /  １０ ")).toBe("AP30010");
  });

  it.each(["AP300/10", "AP 300 / 10", "ap-300-10", "AP_300\\10"])(
    "normalizes controlled separator variant %s",
    (variant) => {
      expect(normalizeModelKey(variant)).toBe("AP30010");
    },
  );

  it("preserves the meaningful regional suffix", () => {
    expect(normalizeModelKey("AP300/10")).not.toBe(normalizeModelKey("AP300"));
    expect(normalizeModelKey("AP300/10")).not.toBe(normalizeModelKey("AP300/40"));
  });

  it("does not discard punctuation outside the controlled separator list", () => {
    expect(normalizeModelKey("AP+100")).toBe("AP+100");
    expect(normalizeModelKey("AP+100")).not.toBe(normalizeModelKey("AP100"));
  });

  it("does not append a regional suffix already present in the canonical model", () => {
    expect(appendRegionalVariant("AP300/10", "10")).toBe("AP300/10");
    expect(appendRegionalVariant("AP300", "/10")).toBe("AP300/10");
  });

  it("derives a base model whether the canonical value already includes the suffix", () => {
    expect(baseModel("AP300/10", "10")).toBe("AP300");
    expect(baseModel("AP300", "10")).toBe("AP300");
  });
});

describe("static index construction", () => {
  it("is deterministic when generatedAt is supplied", () => {
    expect(createIndex()).toEqual(createIndex());
    expect(createIndex().generatedAt).toBe(generatedAt);
  });

  it("rejects duplicate device ids", () => {
    expect(() =>
      buildModelSearchIndex([baseDevices[0]!, baseDevices[0]!], [], { generatedAt }),
    ).toThrow("Duplicate device id");
  });

  it("rejects an approved alias for an unknown device", () => {
    expect(() =>
      buildModelSearchIndex(
        [],
        [
          {
            entityType: "device",
            entityId: "missing",
            rawAlias: "MISSING 1",
            approved: true,
          },
        ],
        { generatedAt },
      ),
    ).toThrow("Approved alias references unknown device");
  });

  it("does not place unapproved aliases in the public exact index", () => {
    expect(createIndex().exact[normalizeModelKey("APX magic")]).toBeUndefined();
  });
});

describe("safe model search", () => {
  it.each(["AP300/10", "AP 300 10", "airpure ap-300/10"])(
    "resolves an exact separator variant: %s",
    (query) => {
      expect(searchModelIndex(createIndex(), query)).toMatchObject({
        status: "resolved",
        deviceId: "airpure-ap300-10",
        matchKind: "exact",
      });
    },
  );

  it("resolves an approved alias and reports its provenance as alias matching", () => {
    expect(searchModelIndex(createIndex(), "air pure freshair ap300 eu")).toMatchObject({
      status: "resolved",
      deviceId: "airpure-ap300-10",
      matchKind: "approved_alias",
    });
  });

  it("prefers exact provenance when a canonical key is also an approved alias", () => {
    const oneDevice = baseDevices[3]!;
    const index = buildModelSearchIndex(
      [oneDevice],
      [
        {
          entityType: "device",
          entityId: oneDevice.id,
          rawAlias: "CF20",
          approved: true,
        },
      ],
      { generatedAt },
    );
    expect(searchModelIndex(index, "CF-20")).toMatchObject({
      status: "resolved",
      deviceId: "cleanflow-cf20",
      matchKind: "exact",
    });
  });

  it("resolves an exact product identifier", () => {
    expect(searchModelIndex(createIndex(), "AP30010 EU")).toMatchObject({
      status: "resolved",
      deviceId: "airpure-ap300-10",
      matchKind: "exact",
    });
  });

  it("keeps a bare base model ambiguous when regional variants exist", () => {
    const result = searchModelIndex(createIndex(), "AirPure AP 300");
    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") throw new Error("Expected ambiguity");
    expect(result.reason).toBe("regional_variants");
    expect(result.candidates.map((candidate) => candidate.deviceId)).toEqual([
      "airpure-ap300-10",
      "airpure-ap300-40",
    ]);
  });

  it("does not auto-match a neighboring model that differs by one digit", () => {
    const result = searchModelIndex(createIndex(), "AP302/10");
    expect(result.status).toBe("candidates");
    if (result.status !== "candidates") throw new Error("Expected candidates only");
    expect(result.candidates.some((candidate) => candidate.deviceId === "airpure-ap301-10")).toBe(
      true,
    );
    expect(result.candidates.every((candidate) => candidate.numericMismatch)).toBe(true);
  });

  it("returns typo matches only as candidates, never as a resolution", () => {
    const result = searchModelIndex(createIndex(), "CleanFlo CF20");
    expect(result).toMatchObject({ status: "candidates" });
    if (result.status !== "candidates") throw new Error("Expected fuzzy candidates");
    expect(result.candidates[0]?.deviceId).toBe("cleanflow-cf20");
    expect(result.candidates[0]?.label).toBe("CleanFlow CF-20");
  });

  it("returns no result for an unrelated or too-short query", () => {
    expect(searchModelIndex(createIndex(), "ZZZ999999")).toEqual({
      status: "not_found",
      query: "ZZZ999999",
      normalizedQuery: "ZZZ999999",
      candidates: [],
    });
    expect(searchModelIndex(createIndex(), "AP").status).toBe("not_found");
  });

  it("does not suggest an unrelated long label because of bounded distance", () => {
    expect(
      searchModelIndex(createIndex(), "TOTALLYDIFFERENTBUTVERYLONGDEVICEIDENTIFIER").status,
    ).toBe("not_found");
  });

  it("reports approved alias collisions as ambiguous", () => {
    const collisionAliases: readonly SearchAliasInput[] = [
      {
        entityType: "device",
        entityId: "airpure-ap300-10",
        rawAlias: "AP common",
        approved: true,
      },
      {
        entityType: "device",
        entityId: "airpure-ap301-10",
        rawAlias: "AP common",
        approved: true,
      },
    ];
    const index = buildModelSearchIndex(baseDevices, collisionAliases, { generatedAt });
    expect(searchModelIndex(index, "AP common")).toMatchObject({
      status: "ambiguous",
      reason: "key_collision",
    });
  });

  it("does not permit callers to lower the conservative fuzzy threshold", () => {
    expect(() => searchModelIndex(createIndex(), "AP302/10", { fuzzyThreshold: 0.5 })).toThrow(
      "fuzzyThreshold must be between",
    );
  });
});
