import { resolve, join } from "node:path";
import { DATA_SCHEMA_VERSION } from "../../../packages/data-schema/src/index.js";
import {
  buildPublicSnapshot,
  loadRepositorySnapshot,
  parseRequiredArgs,
  validateSnapshot,
  writeGeneratedSnapshot,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["root", "at"]);
  const root = resolve(args.root!);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  const input = await loadRepositorySnapshot(root);
  const { report, snapshot } = validateSnapshot(input, at);
  await writeJsonAtomic(join(root, "data", "generated", "validation-report.json"), report);
  if (!report.valid || !snapshot) {
    process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  await writeGeneratedSnapshot(root, snapshot, at);
  await writeJsonAtomic(
    join(root, "data", "generated", "public-snapshot.json"),
    {
      schemaVersion: DATA_SCHEMA_VERSION,
      generatedAt: at.toISOString(),
      data: buildPublicSnapshot(snapshot, at),
    },
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();
