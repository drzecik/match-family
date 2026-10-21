import { resolve } from "node:path";
import {
  importConsumableCandidates,
  parseRequiredArgs,
  readJsonFile,
  writeVersionedCollection,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";
import {
  consumableSchema,
  dataCollectionEnvelopeSchema,
} from "../../../packages/data-schema/src/index.js";

async function readExisting(path: string): Promise<unknown> {
  try {
    return await readJsonFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function main() {
  const args = parseRequiredArgs(process.argv.slice(2), ["input", "output", "report"]);
  const input = await readJsonFile(resolve(args.input!));
  const existingRaw = await readExisting(resolve(args.output!));
  const existing = existingRaw === undefined
    ? []
    : (() => {
        const envelope = dataCollectionEnvelopeSchema.parse(existingRaw);
        if (envelope.kind !== "consumables") {
          throw new Error(`Expected consumables, got ${envelope.kind}`);
        }
        return envelope.records.map((record) => consumableSchema.parse(record));
      })();
  const result = importConsumableCandidates(input, existing);
  await writeVersionedCollection(resolve(args.output!), "consumables", result.records);
  await writeJsonAtomic(resolve(args.report!), result.report);
  if (result.report.rejected > 0) process.exitCode = 1;
}

await main();
