import { describe, expect, it } from "vitest";
import { isAmbiguousSearchResult, searchProducts, type SearchableProduct } from "../src/index.js";

const products: SearchableProduct[] = [
  { id: "n7", brand: "NovaCam", canonicalName: "NovaCam N7", model: "N7", aliases: ["N-7", "Nova Seven"], region: ["global"] },
  { id: "n7m", brand: "NovaCam", canonicalName: "NovaCam N7 Mini", model: "N7 Mini", aliases: ["N-7M"], region: ["global"] },
  { id: "pocket-eu", brand: "NovaCam", canonicalName: "NovaCam Pocket C", model: "Pocket C", variant: "EU", aliases: ["Pocket USB-C"], region: ["EU"] },
  { id: "pocket-us", brand: "NovaCam", canonicalName: "NovaCam Pocket C", model: "Pocket C", variant: "US", aliases: ["Pocket USB-C"], region: ["US"] }
];

describe("product search", () => {
  it("finds model aliases", () => expect(searchProducts(products, "N-7")[0]?.product.id).toBe("n7"));
  it("keeps similar models visible", () => expect(searchProducts(products, "N7").map((hit) => hit.product.id)).toEqual(["n7", "n7m"]));
  it("matches a regional variant", () => expect(searchProducts(products, "EU")[0]?.product.id).toBe("pocket-eu"));
  it("reports ambiguous variants", () => expect(isAmbiguousSearchResult(searchProducts(products, "Pocket C"))).toBe(true));
  it("returns no fabricated fallback", () => expect(searchProducts(products, "does-not-exist")).toEqual([]));
});
