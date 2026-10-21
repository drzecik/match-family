import { lookup } from "node:dns/promises";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { isIP } from "node:net";
import type { DataSnapshot, SourceEvidence } from "@filtermatch/domain";
import { operationalReportMetadata } from "./reports.js";

export type SourceLinkStatus =
  | "ok"
  | "redirected"
  | "domain_changed"
  | "temporarily_unavailable"
  | "permanently_gone"
  | "access_restricted"
  | "http_error"
  | "blocked_target"
  | "redirect_limit";

export interface LinkResponse {
  statusCode: number;
  location?: string;
  method: "HEAD" | "GET";
}

export type LinkRequester = (
  url: URL,
  options: { method: "HEAD" | "GET"; timeoutMs: number },
) => Promise<LinkResponse>;

export interface SourceLinkResult {
  evidenceId: string;
  title: string;
  sourceType: SourceEvidence["sourceType"];
  url: string;
  finalUrl: string;
  status: SourceLinkStatus;
  httpStatus: number | null;
  redirectChain: string[];
  checkedWith: "HEAD" | "GET" | null;
  retryable: boolean;
  requiresReview: boolean;
  reason: string;
}

export interface SourceLinkCheckOptions {
  now?: Date;
  timeoutMs?: number;
  maxRedirects?: number;
  minHostDelayMs?: number;
  requester?: LinkRequester;
}

class BlockedTargetError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "BlockedTargetError";
  }
}

const BLOCKED_HOST_SUFFIXES = [
  ".example",
  ".invalid",
  ".localhost",
  ".local",
  ".test",
  ".internal",
  ".home.arpa",
];

function hasBlockedHostnameSuffix(hostname: string): boolean {
  return BLOCKED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
  );
}

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 8],
  [0x0a000000, 8],
  [0x64400000, 10],
  [0x7f000000, 8],
  [0xa9fe0000, 16],
  [0xac100000, 12],
  [0xc0000000, 24],
  [0xc0000200, 24],
  [0xc0a80000, 16],
  [0xc6120000, 15],
  [0xc6336400, 24],
  [0xcb007100, 24],
  [0xe0000000, 4],
  [0xf0000000, 4],
];

function ipv4Number(address: string): number {
  return address
    .split(".")
    .map(Number)
    .reduce((value, octet) => ((value << 8) | octet) >>> 0, 0);
}

function isBlockedIpv4(address: string): boolean {
  const value = ipv4Number(address);
  return BLOCKED_IPV4_RANGES.some(([network, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) >>> 0 === (network & mask) >>> 0;
  });
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0] ?? address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) === 4 ? isBlockedIpv4(mapped) : true;
  }
  return (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") ||
    normalized === "2001:db8::"
  );
}

export function isPublicNetworkAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !isBlockedIpv4(address);
  if (family === 6) return !isBlockedIpv6(address);
  return false;
}

function normalizedHostname(url: URL): string {
  return url.hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
}

function assertAllowedUrl(url: URL, allowPrivateNetwork: boolean): void {
  if (url.toString().length > 2_048) throw new BlockedTargetError("url_too_long");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedTargetError("unsupported_protocol");
  }
  if (url.username || url.password) throw new BlockedTargetError("embedded_credentials");

  const hostname = normalizedHostname(url);
  if (!hostname || hostname === "localhost") throw new BlockedTargetError("local_hostname");
  if (!allowPrivateNetwork && hasBlockedHostnameSuffix(hostname)) {
    throw new BlockedTargetError("reserved_hostname");
  }
  if (!allowPrivateNetwork && isIP(hostname) !== 0 && !isPublicNetworkAddress(hostname)) {
    throw new BlockedTargetError("non_public_address");
  }
}

async function resolveRequestAddress(
  hostname: string,
  allowPrivateNetwork: boolean,
): Promise<{ address: string; family: number }> {
  if (isIP(hostname) !== 0) return { address: hostname, family: isIP(hostname) as 4 | 6 };
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("dns_lookup_failed");
  }
  if (addresses.length === 0) throw new Error("dns_no_addresses");
  if (!allowPrivateNetwork && addresses.some(({ address }) => !isPublicNetworkAddress(address))) {
    throw new BlockedTargetError("dns_resolved_to_non_public_address");
  }
  return addresses[0]!;
}

export function createNodeLinkRequester(
  options: {
    allowPrivateNetwork?: boolean;
    userAgent?: string;
    resolveAddress?: (
      hostname: string,
      allowPrivateNetwork: boolean,
    ) => Promise<{ address: string; family: number }>;
  } = {},
): LinkRequester {
  const allowPrivateNetwork = options.allowPrivateNetwork ?? false;
  const userAgent = options.userAgent ?? "FilterMatch-SourceLinkChecker/0.1";
  const resolveAddress = options.resolveAddress ?? resolveRequestAddress;

  return async (url, requestOptions) => {
    assertAllowedUrl(url, allowPrivateNetwork);
    const hostname = normalizedHostname(url);
    const resolved = await resolveAddress(hostname, allowPrivateNetwork);
    const request = url.protocol === "https:" ? requestHttps : requestHttp;

    return new Promise<LinkResponse>((resolve, reject) => {
      const headers: Record<string, string> = {
        "User-Agent": userAgent,
        Accept: "*/*",
      };
      if (requestOptions.method === "GET") headers.Range = "bytes=0-0";

      const clientRequest = request(
        url,
        {
          method: requestOptions.method,
          agent: false,
          headers,
          lookup: (_hostname, _lookupOptions, callback) => {
            // Node 20+ may set `all: true` internally for connection racing.
            // Returning the legacy single-address callback shape in that case
            // produces ERR_INVALID_IP_ADDRESS and makes every hostname look
            // unavailable. Keep the request pinned while honoring both shapes.
            if (_lookupOptions.all) {
              callback(null, [resolved]);
            } else {
              callback(null, resolved.address, resolved.family);
            }
          },
        },
        (response) => {
          const location = response.headers.location;
          const result: LinkResponse = {
            statusCode: response.statusCode ?? 0,
            method: requestOptions.method,
            ...(location ? { location } : {}),
          };
          response.destroy();
          resolve(result);
        },
      );
      clientRequest.setTimeout(requestOptions.timeoutMs, () => {
        clientRequest.destroy(new Error("request_timeout"));
      });
      clientRequest.once("error", () => reject(new Error("network_request_failed")));
      clientRequest.end();
    });
  };
}

function reportUrl(url: URL): string {
  const sanitized = new URL(url);
  sanitized.username = "";
  sanitized.password = "";
  sanitized.search = "";
  sanitized.hash = "";
  return sanitized.toString();
}

function errorResult(
  evidence: SourceEvidence,
  url: URL,
  status: SourceLinkStatus,
  reason: string,
  retryable: boolean,
): SourceLinkResult {
  return {
    evidenceId: evidence.id,
    title: evidence.title,
    sourceType: evidence.sourceType,
    url: reportUrl(url),
    finalUrl: reportUrl(url),
    status,
    httpStatus: null,
    redirectChain: [],
    checkedWith: null,
    retryable,
    requiresReview: true,
    reason,
  };
}

export async function checkSourceLink(
  evidence: SourceEvidence,
  options: Pick<SourceLinkCheckOptions, "timeoutMs" | "maxRedirects" | "requester"> = {},
): Promise<SourceLinkResult> {
  if (!evidence.url) throw new Error(`Evidence ${evidence.id} does not have a URL`);
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxRedirects = options.maxRedirects ?? 5;
  const requester = options.requester ?? createNodeLinkRequester();
  const original = new URL(evidence.url);
  let current = original;
  let method: "HEAD" | "GET" = "HEAD";
  let crossedDomain = false;
  const redirectChain: string[] = [];

  for (;;) {
    let response: LinkResponse;
    try {
      response = await requester(current, { method, timeoutMs });
      if ((response.statusCode === 405 || response.statusCode === 501) && method === "HEAD") {
        method = "GET";
        response = await requester(current, { method, timeoutMs });
      }
    } catch (error) {
      if (error instanceof BlockedTargetError) {
        return {
          ...errorResult(evidence, original, "blocked_target", error.reason, false),
          finalUrl: reportUrl(current),
          redirectChain,
        };
      }
      return {
        ...errorResult(evidence, original, "temporarily_unavailable", "network_error", true),
        finalUrl: reportUrl(current),
        redirectChain,
      };
    }

    const statusCode = response.statusCode;
    if (statusCode >= 300 && statusCode < 400) {
      if (!response.location) {
        return {
          ...errorResult(evidence, original, "http_error", "redirect_without_location", false),
          finalUrl: reportUrl(current),
          httpStatus: statusCode,
          checkedWith: response.method,
          redirectChain,
        };
      }
      if (redirectChain.length >= maxRedirects) {
        return {
          ...errorResult(evidence, original, "redirect_limit", "too_many_redirects", false),
          finalUrl: reportUrl(current),
          httpStatus: statusCode,
          checkedWith: response.method,
          redirectChain,
        };
      }
      let target: URL;
      try {
        target = new URL(response.location, current);
      } catch {
        return {
          ...errorResult(evidence, original, "http_error", "invalid_redirect_location", false),
          finalUrl: reportUrl(current),
          httpStatus: statusCode,
          checkedWith: response.method,
          redirectChain,
        };
      }
      if (normalizedHostname(target) !== normalizedHostname(original)) crossedDomain = true;
      redirectChain.push(reportUrl(target));
      current = target;
      method = "HEAD";
      continue;
    }

    const base = {
      evidenceId: evidence.id,
      title: evidence.title,
      sourceType: evidence.sourceType,
      url: reportUrl(original),
      finalUrl: reportUrl(current),
      httpStatus: statusCode,
      redirectChain,
      checkedWith: response.method,
    };
    if (statusCode >= 200 && statusCode < 300) {
      const status: SourceLinkStatus = crossedDomain
        ? "domain_changed"
        : redirectChain.length > 0
          ? "redirected"
          : "ok";
      return {
        ...base,
        status,
        retryable: false,
        requiresReview: status !== "ok",
        reason: status,
      };
    }
    if (statusCode === 404 || statusCode === 410) {
      return { ...base, status: "permanently_gone", retryable: false, requiresReview: true, reason: `http_${statusCode}` };
    }
    if ([408, 425, 429].includes(statusCode) || statusCode >= 500) {
      return { ...base, status: "temporarily_unavailable", retryable: true, requiresReview: true, reason: `http_${statusCode}` };
    }
    if (statusCode === 401 || statusCode === 403) {
      return { ...base, status: "access_restricted", retryable: false, requiresReview: true, reason: `http_${statusCode}` };
    }
    return { ...base, status: "http_error", retryable: false, requiresReview: true, reason: `http_${statusCode}` };
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function checkSourceLinks(
  snapshot: DataSnapshot,
  options: SourceLinkCheckOptions = {},
) {
  const now = options.now ?? new Date();
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxRedirects = options.maxRedirects ?? 5;
  const minHostDelayMs = options.minHostDelayMs ?? 250;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 30_000) {
    throw new Error("timeoutMs must be an integer between 250 and 30000");
  }
  if (!Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 10) {
    throw new Error("maxRedirects must be an integer between 0 and 10");
  }
  if (!Number.isInteger(minHostDelayMs) || minHostDelayMs < 0 || minHostDelayMs > 10_000) {
    throw new Error("minHostDelayMs must be an integer between 0 and 10000");
  }

  const candidates = snapshot.sourceEvidence
    .filter((item) => item.url && !item.synthetic && !item.notForProduction)
    .sort((left, right) => left.id.localeCompare(right.id));
  const baseRequester = options.requester ?? createNodeLinkRequester();
  let previousRequestStartedAt = 0;
  const throttledRequester: LinkRequester = async (url, requestOptions) => {
    const remainingDelay = minHostDelayMs - (Date.now() - previousRequestStartedAt);
    if (previousRequestStartedAt > 0 && remainingDelay > 0) await sleep(remainingDelay);
    previousRequestStartedAt = Date.now();
    return baseRequester(url, requestOptions);
  };
  const results: SourceLinkResult[] = [];
  for (const evidence of candidates) {
    results.push(await checkSourceLink(evidence, {
      timeoutMs,
      maxRedirects,
      requester: throttledRequester,
    }));
  }

  const statusCounts = Object.fromEntries(
    [...new Set<SourceLinkStatus>([
      "ok",
      "redirected",
      "domain_changed",
      "temporarily_unavailable",
      "permanently_gone",
      "access_restricted",
      "http_error",
      "blocked_target",
      "redirect_limit",
    ])].map((status) => [status, results.filter((item) => item.status === status).length]),
  ) as Record<SourceLinkStatus, number>;

  return {
    ...operationalReportMetadata(snapshot, now),
    policy: {
      method: "HEAD with GET Range fallback for 405/501",
      timeoutMs,
      maxRedirects,
      minHostDelayMs,
      responseBodyRead: false,
      syntheticEvidenceSkipped: true,
    },
    summary: {
      totalEvidence: snapshot.sourceEvidence.length,
      urlSources: snapshot.sourceEvidence.filter((item) => item.url).length,
      checkedUrls: results.length,
      skippedSyntheticUrls: snapshot.sourceEvidence.filter(
        (item) => item.url && (item.synthetic || item.notForProduction),
      ).length,
      documentOnlySources: snapshot.sourceEvidence.filter((item) => !item.url).length,
      requiresReview: results.filter((item) => item.requiresReview).length,
      statusCounts,
    },
    results,
  };
}
