import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { SourceEvidence } from "@filtermatch/domain";
import { checkSourceLink, createNodeLinkRequester } from "../src/index.js";

let server: Server | undefined;

afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

function evidence(url: string): SourceEvidence {
  return {
    id: "evidence-network-integration",
    sourceType: "official_product_page",
    title: "Local network integration source",
    url,
    accessedAt: "2026-07-17T00:00:00.000Z",
    evidenceSummary: "Local integration-test evidence.",
    reviewer: "test-reviewer",
    verifiedAt: "2026-07-17T00:00:00.000Z",
    verificationDecision: "verified_official",
  };
}

describe("source link checker network integration", () => {
  it("follows a relative redirect and never reads a response body", async () => {
    server = createServer((request, response) => {
      if (request.url === "/redirect") {
        response.writeHead(302, { Location: "/ok" });
        response.end();
        return;
      }
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("body-that-must-not-be-consumed");
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const result = await checkSourceLink(
      evidence(`http://127.0.0.1:${address.port}/redirect`),
      { requester: createNodeLinkRequester({ allowPrivateNetwork: true }) },
    );

    expect(result).toMatchObject({
      status: "redirected",
      httpStatus: 200,
      checkedWith: "HEAD",
    });
    expect(result.redirectChain).toEqual([`http://127.0.0.1:${address.port}/ok`]);
  });

  it("sends Range bytes=0-0 for the GET fallback", async () => {
    const methods: string[] = [];
    const ranges: Array<string | undefined> = [];
    server = createServer((request, response) => {
      methods.push(request.method ?? "");
      ranges.push(request.headers.range);
      if (request.method === "HEAD") {
        response.writeHead(405);
        response.end();
        return;
      }
      response.writeHead(206, { "Content-Range": "bytes 0-0/1" });
      response.end("x");
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const result = await checkSourceLink(
      evidence(`http://127.0.0.1:${address.port}/head-fallback`),
      { requester: createNodeLinkRequester({ allowPrivateNetwork: true }) },
    );

    expect(result).toMatchObject({ status: "ok", httpStatus: 206, checkedWith: "GET" });
    expect(methods).toEqual(["HEAD", "GET"]);
    expect(ranges).toEqual([undefined, "bytes=0-0"]);
  });

  it("keeps a resolved hostname pinned with the Node all-address lookup shape", async () => {
    server = createServer((_request, response) => {
      response.writeHead(200);
      response.end();
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected a TCP server address");

    const result = await checkSourceLink(
      evidence(`http://filtermatch.test:${address.port}/hostname`),
      {
        requester: createNodeLinkRequester({
          allowPrivateNetwork: true,
          resolveAddress: async () => ({ address: "127.0.0.1", family: 4 }),
        }),
      },
    );

    expect(result).toMatchObject({ status: "ok", httpStatus: 200 });
  });
});
