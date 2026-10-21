import { describe, expect, it } from "vitest";
import type { DataSnapshot, SourceEvidence } from "@filtermatch/domain";
import {
  checkSourceLink,
  checkSourceLinks,
  createNodeLinkRequester,
  isPublicNetworkAddress,
  type LinkRequester,
  type LinkResponse,
} from "../src/index.js";

const evidence: SourceEvidence = {
  id: "evidence-source-link",
  sourceType: "official_product_page",
  title: "Source link test",
  url: "https://manufacturer.example/source?private=redacted#section",
  accessedAt: "2026-07-17T00:00:00.000Z",
  evidenceSummary: "Test-only evidence metadata.",
  reviewer: "test-reviewer",
  verifiedAt: "2026-07-17T00:00:00.000Z",
  verificationDecision: "verified_official",
};

function queuedRequester(responses: LinkResponse[], calls: Array<{ url: string; method: string }>) {
  return (async (url, options) => {
    calls.push({ url: url.toString(), method: options.method });
    const response = responses.shift();
    if (!response) throw new Error("Missing queued response");
    return response;
  }) satisfies LinkRequester;
}

describe("source link checker", () => {
  it("uses a minimal GET Range fallback only when HEAD is unsupported", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const result = await checkSourceLink(evidence, {
      requester: queuedRequester(
        [
          { statusCode: 405, method: "HEAD" },
          { statusCode: 206, method: "GET" },
        ],
        calls,
      ),
    });

    expect(calls.map(({ method }) => method)).toEqual(["HEAD", "GET"]);
    expect(result).toMatchObject({ status: "ok", checkedWith: "GET", requiresReview: false });
    expect(result.url).toBe("https://manufacturer.example/source");
  });

  it("reports a cross-domain redirect without exposing query parameters", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const result = await checkSourceLink(evidence, {
      requester: queuedRequester(
        [
          {
            statusCode: 302,
            location: "https://archive.example/new?token=do-not-report#fragment",
            method: "HEAD",
          },
          { statusCode: 200, method: "HEAD" },
        ],
        calls,
      ),
    });

    expect(result).toMatchObject({
      status: "domain_changed",
      finalUrl: "https://archive.example/new",
      redirectChain: ["https://archive.example/new"],
      requiresReview: true,
    });
  });

  it("retains the domain-change classification when a redirect chain returns to the original host", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const result = await checkSourceLink(evidence, {
      requester: queuedRequester(
        [
          { statusCode: 302, location: "https://archive.example/copy", method: "HEAD" },
          { statusCode: 302, location: "https://manufacturer.example/final", method: "HEAD" },
          { statusCode: 200, method: "HEAD" },
        ],
        calls,
      ),
    });

    expect(result).toMatchObject({
      status: "domain_changed",
      finalUrl: "https://manufacturer.example/final",
      requiresReview: true,
    });
  });

  it.each([
    [410, "permanently_gone", false],
    [503, "temporarily_unavailable", true],
    [403, "access_restricted", false],
  ] as const)("classifies HTTP %i as %s", async (statusCode, status, retryable) => {
    const result = await checkSourceLink(evidence, {
      requester: async (_url, { method }) => ({ statusCode, method }),
    });
    expect(result).toMatchObject({ status, retryable, requiresReview: true });
  });

  it("blocks local and credential-bearing targets before sending a request", async () => {
    const requester = createNodeLinkRequester();
    const local = await checkSourceLink({ ...evidence, url: "http://127.0.0.1/admin" }, { requester });
    const credentials = await checkSourceLink(
      { ...evidence, url: "https://user:secret@openai.com/source" },
      { requester },
    );

    expect(local).toMatchObject({ status: "blocked_target", reason: "non_public_address" });
    expect(credentials).toMatchObject({ status: "blocked_target", reason: "embedded_credentials" });
  });

  it("blocks a redirect to a private address and preserves the original evidence URL", async () => {
    const nodeRequester = createNodeLinkRequester();
    let firstRequest = true;
    const result = await checkSourceLink(evidence, {
      requester: async (url, options) => {
        if (firstRequest) {
          firstRequest = false;
          return { statusCode: 302, location: "http://127.0.0.1/admin?secret=value", method: options.method };
        }
        return nodeRequester(url, options);
      },
    });

    expect(result).toMatchObject({
      status: "blocked_target",
      reason: "non_public_address",
      url: "https://manufacturer.example/source",
      finalUrl: "http://127.0.0.1/admin",
      redirectChain: ["http://127.0.0.1/admin"],
    });
  });

  it("stops at the configured redirect limit", async () => {
    const result = await checkSourceLink(evidence, {
      maxRedirects: 1,
      requester: async (_url, { method }) => ({ statusCode: 302, location: "/again", method }),
    });
    expect(result).toMatchObject({ status: "redirect_limit", reason: "too_many_redirects" });
    expect(result.redirectChain).toEqual(["https://manufacturer.example/again"]);
  });

  it("recognizes representative public and non-public network addresses", () => {
    expect(isPublicNetworkAddress("8.8.8.8")).toBe(true);
    expect(isPublicNetworkAddress("10.0.0.1")).toBe(false);
    expect(isPublicNetworkAddress("169.254.169.254")).toBe(false);
    expect(isPublicNetworkAddress("::1")).toBe(false);
    expect(isPublicNetworkAddress("2001:4860:4860::8888")).toBe(true);
  });

  it("skips synthetic and document-only evidence in the repository report", async () => {
    const snapshot: DataSnapshot = {
      devices: [],
      consumables: [],
      compatibilityEdges: [],
      searchAliases: [],
      offers: [],
      reviewDecisions: [],
      sourceEvidence: [
        evidence,
        {
          ...evidence,
          id: "evidence-synthetic",
          synthetic: true,
          notForProduction: true,
        },
        { ...evidence, id: "evidence-document", url: undefined, documentId: "DOC-1" },
      ],
    };
    const report = await checkSourceLinks(snapshot, {
      now: new Date("2026-07-17T00:00:00.000Z"),
      minHostDelayMs: 0,
      requester: async (_url, { method }) => ({ statusCode: 200, method }),
    });

    expect(report.summary).toMatchObject({
      totalEvidence: 3,
      urlSources: 2,
      checkedUrls: 1,
      skippedSyntheticUrls: 1,
      documentOnlySources: 1,
      requiresReview: 0,
    });
    expect(report.results.map(({ evidenceId: id }) => id)).toEqual([evidence.id]);
  });
});
