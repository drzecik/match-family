import { resolve } from "node:path";
import {
  loadRepositorySnapshot,
  parseRequiredArgs,
  reportStaleCompatibility,
  validateSnapshot,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), [
    "root",
    "output",
    "at",
    "max-age-days",
  ]);
  const at = new Date(args.at!);
  const maxAgeDays = Number(args["max-age-days"]);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  if (!Number.isInteger(maxAgeDays) || maxAgeDays <= 0) {
    throw new Error("--max-age-days must be a positive integer");
  }
  const { report, snapshot } = validateSnapshot(await loadRepositorySnapshot(resolve(args.root!)), at);
  if (!report.valid || !snapshot) throw new Error("Cannot report stale data for invalid data");
  await writeJsonAtomic(
    resolve(args.output!),
    reportStaleCompatibility(snapshot, { now: at, maxAgeDays }),
  );
}

await main();
