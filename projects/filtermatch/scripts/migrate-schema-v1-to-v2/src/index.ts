import { resolve } from "node:path";
import {
  isLegacyCollectionKind,
  migrateCollectionV1ToV2,
  parseRequiredArgs,
  readJsonFile,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["input", "output", "kind"]);
  const kind = args.kind!;
  if (!isLegacyCollectionKind(kind)) throw new Error(`Unsupported legacy collection kind: ${kind}`);
  const migrated = migrateCollectionV1ToV2(await readJsonFile(resolve(args.input!)), kind);
  await writeJsonAtomic(resolve(args.output!), migrated);
}

await main();
