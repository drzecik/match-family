import { resolve } from "node:path";
import { parseRequiredArgs } from "./cli.js";
import { loadRepositorySnapshot } from "./repository.js";
import {
  buildPublicSnapshot,
  productionReadinessIssues,
  validateSnapshot,
} from "./validation.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["root", "at"]);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  const { report, snapshot } = validateSnapshot(
    await loadRepositorySnapshot(resolve(args.root!)),
    at,
  );
  if (!report.valid || !snapshot) throw new Error("Cannot check production readiness for invalid data");
  const issues = productionReadinessIssues(buildPublicSnapshot(snapshot, at));
  process.stdout.write(`${JSON.stringify({ ready: issues.length === 0, issues }, null, 2)}\n`);
  if (issues.length > 0) process.exitCode = 1;
}

await main();
