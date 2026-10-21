import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importOffersCsv } from '@filtermatch/affiliate-offers';

const input = process.argv[2];
if (!input) throw new Error('Usage: pnpm --dir scripts/import-offers import <offers.csv>');

const csv = await readFile(resolve(input), 'utf8');
const report = importOffersCsv(csv);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.rejected.length > 0) process.exitCode = 1;
