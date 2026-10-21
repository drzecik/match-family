import { resolve } from "node:path";
import {
  loadRepositorySnapshot,
  parseCatalogCoverageMatrix,
  parseRequiredArgs,
  readJsonFile,
  reportCatalogCoverage,
  validateSnapshot,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["root", "matrix", "output", "at"]);
  const at = new Date(args.at!);
  if (Number.isNaN(at.getTime())) throw new Error("--at must be an ISO date-time");
  const { report, snapshot } = validateSnapshot(await loadRepositorySnapshot(resolve(args.root!)), at);
  if (!report.valid || !snapshot) throw new Error("Cannot report catalog coverage for invalid data");
  const matrix = parseCatalogCoverageMatrix(await readJsonFile(resolve(args.matrix!)));
  const coverage = reportCatalogCoverage(snapshot, matrix, at);
  await writeJsonAtomic(resolve(args.output!), coverage);
  if (!coverage.summary.complete) {
    throw new Error(`Catalog coverage is incomplete: ${coverage.summary.issues} issue(s)`);
  }
}

await main();
