import { resolve } from "node:path";
import {
  loadRepositorySnapshot,
  parseRequiredArgs,
  prepareCompatibilityReview,
  validateSnapshot,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["root", "edge-id", "output", "at"]);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  const { report, snapshot } = validateSnapshot(
    await loadRepositorySnapshot(resolve(args.root!)),
    at,
  );
  if (!report.valid || !snapshot) throw new Error("Cannot prepare review for invalid data");
  await writeJsonAtomic(
    resolve(args.output!),
    prepareCompatibilityReview(snapshot, args["edge-id"]!, at),
  );
}

await main();
