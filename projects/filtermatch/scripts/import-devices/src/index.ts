import { resolve } from "node:path";
import {
  importDeviceCandidates,
  parseRequiredArgs,
  readJsonFile,
  writeVersionedCollection,
  writeJsonAtomic,
} from "../../../packages/data-pipeline/src/index.js";
import {
  dataCollectionEnvelopeSchema,
  deviceSchema,
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
        if (envelope.kind !== "devices") throw new Error(`Expected devices, got ${envelope.kind}`);
        return envelope.records.map((record) => deviceSchema.parse(record));
      })();
  const result = importDeviceCandidates(input, existing);
  await writeVersionedCollection(resolve(args.output!), "devices", result.records);
  await writeJsonAtomic(resolve(args.report!), result.report);
  if (result.report.rejected > 0) process.exitCode = 1;
}

await main();
