import { resolve } from "node:path";
import {
  loadRepositorySnapshot,
  parseRequiredArgs,
  reportAliasCollisions,
  validateSnapshot,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["root", "output", "at"]);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");

  const { report, snapshot } = validateSnapshot(
    await loadRepositorySnapshot(resolve(args.root!)),
    at,
  );
  if (!snapshot) throw new Error("Cannot report alias collisions for schema-invalid data");
  await writeJsonAtomic(resolve(args.output!), reportAliasCollisions(snapshot, at));
  if (!report.valid) {
    process.stderr.write("Alias report generated for data with validation errors.\n");
    process.exitCode = 1;
  }
}

await main();
