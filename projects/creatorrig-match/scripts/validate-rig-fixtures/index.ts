import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateDemoData, type DemoData } from '../validate-data.js';

async function main(): Promise<void> {
  const data = JSON.parse(
    await readFile(resolve(process.cwd(), 'data/fixtures/demo-catalog.json'), 'utf8'),
  ) as unknown as DemoData;
  const errors = validateDemoData(data);
  if (errors.length > 0) throw new Error(`Rig fixture validation failed:\n${errors.join('\n')}`);
  process.stdout.write(`Validated ${data.rigs.length} rig fixtures.\n`);
}

void main();
