import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  createConfigurationImportEnvelope,
  parseVerticalPack,
  validateCsvImport,
} from '@materialmatch/configuration-schema';
import {
  referenceFlooringConfiguration,
  referenceFlooringExpected,
  referenceFlooringProject,
  referenceFlooringVerticalPack,
} from '@materialmatch/test-fixtures';

const outputDirectory = resolve(process.argv[2] ?? 'examples/generated');
const notice = 'FICTIONAL DEMONSTRATION DATA — NOT A REAL BRAND OR PRODUCT CATALOGUE';
const envelope = await createConfigurationImportEnvelope(referenceFlooringConfiguration);
const referencePayload = {
  notice,
  project: referenceFlooringProject,
  expected: referenceFlooringExpected,
};
const productMetadataCsv = [
  'kod_produktu;aktywny;typ_materialu;rodzina_produktowa;grubosc_mm;sposob_montazu;tagi_kompatybilnosci;powierzchnia_opakowania_m2;elementy_w_opakowaniu;minimalna_liczba_opakowan;wielokrotnosc_zamowienia;sprzedaz_otwartych_opakowan;domyslny_zapas_procent;minimalny_zapas_procent;maksymalny_zapas_procent',
  'FICTIONAL-MM-PANEL-NATURAL;tak;floor_panel;fictional_flooring_system;8;click;click_system;2,2;8;1;1;nie;8;0;20',
  'FICTIONAL-MM-UNDERLAY;tak;underlay;fictional_flooring_system;3;floating;flooring_compatible;10;1;0;1;nie;0;0;0',
  '',
].join('\n');
parseVerticalPack(referenceFlooringVerticalPack);
await validateCsvImport(productMetadataCsv, {
  delimiter: ';',
  allowedHeaders: [
    'kod_produktu',
    'aktywny',
    'typ_materialu',
    'rodzina_produktowa',
    'grubosc_mm',
    'sposob_montazu',
    'tagi_kompatybilnosci',
    'powierzchnia_opakowania_m2',
    'elementy_w_opakowaniu',
    'minimalna_liczba_opakowan',
    'wielokrotnosc_zamowienia',
    'sprzedaz_otwartych_opakowan',
    'domyslny_zapas_procent',
    'minimalny_zapas_procent',
    'maksymalny_zapas_procent',
  ],
  requiredHeaders: ['kod_produktu'],
  uniqueKey: 'kod_produktu',
});
const manifest = {
  notice: 'FICTIONAL DEMONSTRATION DATA — NOT A REAL BRAND OR PRODUCT CATALOGUE',
  formatVersion: 1,
  files: [
    'flooring-configuration.json',
    'flooring-reference-scenario.json',
    'flooring-vertical-pack.json',
    'product-metadata.csv',
  ],
};

await mkdir(outputDirectory, { recursive: true });
const files: Readonly<Record<string, string>> = {
  'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
  'flooring-configuration.json': `${JSON.stringify(envelope, null, 2)}\n`,
  'flooring-reference-scenario.json': `${JSON.stringify(referencePayload, null, 2)}\n`,
  'flooring-vertical-pack.json': `${JSON.stringify(referenceFlooringVerticalPack, null, 2)}\n`,
  'product-metadata.csv': productMetadataCsv,
};
for (const [filename, contents] of Object.entries(files)) {
  await writeFile(join(outputDirectory, filename), contents, { encoding: 'utf8', flag: 'w' });
}
console.log(`Wrote ${Object.keys(files).length} fictional demo-data files to ${outputDirectory}`);
