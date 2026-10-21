import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildPublicGraphArtifact, type OperationalData } from '../data-operations.js';

async function main(): Promise<void> {
  const root = process.cwd();
  const data = JSON.parse(
    await readFile(resolve(root, 'data/fixtures/demo-catalog.json'), 'utf8'),
  ) as unknown as OperationalData;
  const output = resolve(root, 'data/generated/compatibility-graph.json');
  await mkdir(resolve(root, 'data/generated'), { recursive: true });
  await writeFile(output, `${JSON.stringify(buildPublicGraphArtifact(data), null, 2)}\n`, 'utf8');
  process.stdout.write(`Built ${output}\n`);
}

void main();
