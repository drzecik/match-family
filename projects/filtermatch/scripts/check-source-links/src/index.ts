import { resolve } from "node:path";
import {
  checkSourceLinks,
  loadRepositorySnapshot,
  parseRequiredArgs,
  validateSnapshot,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

function boundedInteger(value: string | undefined, name: string, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`--${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), [
    "root",
    "output",
    "at",
    "timeout-ms",
    "max-redirects",
    "min-host-delay-ms",
  ]);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  const timeoutMs = boundedInteger(args["timeout-ms"], "timeout-ms", 250, 30_000);
  const maxRedirects = boundedInteger(args["max-redirects"], "max-redirects", 0, 10);
  const minHostDelayMs = boundedInteger(
    args["min-host-delay-ms"],
    "min-host-delay-ms",
    0,
    10_000,
  );

  const { report, snapshot } = validateSnapshot(
    await loadRepositorySnapshot(resolve(args.root!)),
    at,
  );
  if (!report.valid || !snapshot) throw new Error("Cannot check source links for invalid data");
  const linkReport = await checkSourceLinks(snapshot, {
    now: at,
    timeoutMs,
    maxRedirects,
    minHostDelayMs,
  });
  await writeJsonAtomic(resolve(args.output!), linkReport);
}

await main();
