import { resolve } from "node:path";
import {
  applyCompatibilityReviewDecision,
  loadRepositorySnapshot,
  parseRequiredArgs,
  readJsonFile,
  validateSnapshot,
  writeJsonAtomic,
  writeRepositoryReviewState,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), [
    "root",
    "decision",
    "report",
    "at",
    "confirm-authorized-human-review",
  ]);
  if (args["confirm-authorized-human-review"] !== "YES") {
    throw new Error("--confirm-authorized-human-review must equal YES");
  }
  const root = resolve(args.root!);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  const validated = validateSnapshot(await loadRepositorySnapshot(root), at);
  if (!validated.report.valid || !validated.snapshot) {
    throw new Error("Cannot apply review to invalid data");
  }
  const applied = applyCompatibilityReviewDecision(
    validated.snapshot,
    await readJsonFile(resolve(args.decision!)),
    at,
  );
  const finalValidation = validateSnapshot(applied.snapshot, at);
  if (!finalValidation.report.valid || !finalValidation.snapshot) {
    throw new Error(`Review result is invalid: ${JSON.stringify(finalValidation.report.issues)}`);
  }
  await writeRepositoryReviewState(root, finalValidation.snapshot);
  await writeJsonAtomic(resolve(args.report!), applied.report);
}

await main();
