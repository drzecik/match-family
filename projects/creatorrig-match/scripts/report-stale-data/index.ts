import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { reportStaleEvidence, type OperationalData } from '../data-operations.js';

async function main(): Promise<void> {
  const data = JSON.parse(
    await readFile(resolve(process.cwd(), 'data/fixtures/demo-catalog.json'), 'utf8'),
  ) as unknown as OperationalData;
  process.stdout.write(
    `${JSON.stringify({ staleEvidenceIds: reportStaleEvidence(data, new Date().toISOString(), 365) }, null, 2)}\n`,
  );
}

void main();
