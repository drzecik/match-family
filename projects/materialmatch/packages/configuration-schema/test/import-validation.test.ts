import { describe, expect, it } from 'vitest';
import { referenceFlooringConfiguration } from '@materialmatch/test-fixtures';
import {
  createConfigurationImportEnvelope,
  ImportValidationError,
  MAX_CONFIGURATION_IMPORT_BYTES,
  parseMetricInputToBaseInteger,
  validateConfigurationImport,
  validateCsvImport,
} from '../src/index.js';

const csvOptions = {
  delimiter: ';' as const,
  allowedHeaders: ['sku', 'coverage_area_m2', 'default_waste_percent'],
  requiredHeaders: ['sku'],
  uniqueKey: 'sku',
};

async function importErrorCode(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    return error instanceof ImportValidationError ? error.code : 'SCHEMA_REJECTION';
  }
}

describe('configuration import validation', () => {
  it('validates a bare document and detects an identical repeated import by canonical checksum', async () => {
    const first = await validateConfigurationImport(JSON.stringify(referenceFlooringConfiguration));
    const reordered = JSON.stringify(
      Object.fromEntries(Object.entries(referenceFlooringConfiguration).reverse()),
    );
    const second = await validateConfigurationImport(reordered, new Set([first.checksum]));
    expect(second.checksum).toBe(first.checksum);
    expect(second.duplicate).toBe(true);
    expect(second.sourceFormat).toBe('bare');
  });

  it('accepts an exact export envelope and rejects tampering and extra envelope fields', async () => {
    const envelope = await createConfigurationImportEnvelope(referenceFlooringConfiguration);
    await expect(validateConfigurationImport(JSON.stringify(envelope))).resolves.toMatchObject({
      checksum: envelope.checksum,
      sourceFormat: 'envelope',
    });
    await expect(
      validateConfigurationImport(
        JSON.stringify({
          ...envelope,
          configuration: { ...envelope.configuration, locale: 'en-US' },
        }),
      ),
    ).rejects.toMatchObject({
      code: 'IMPORT_CHECKSUM_MISMATCH',
    });
    await expect(
      validateConfigurationImport(JSON.stringify({ ...envelope, debug: true })),
    ).rejects.toMatchObject({
      code: 'IMPORT_INVALID_ENVELOPE',
    });
  });

  it('rejects oversized, deeply nested, malformed UTF-8 and future-schema documents', async () => {
    await expect(
      validateConfigurationImport(new Uint8Array(MAX_CONFIGURATION_IMPORT_BYTES + 1)),
    ).rejects.toMatchObject({ code: 'IMPORT_TOO_LARGE' });
    await expect(validateConfigurationImport(new Uint8Array([0xc3, 0x28]))).rejects.toMatchObject({
      code: 'IMPORT_INVALID_UTF8',
    });
    let deeplyNested: unknown = 1;
    for (let index = 0; index < 65; index += 1) deeplyNested = { child: deeplyNested };
    await expect(validateConfigurationImport(JSON.stringify(deeplyNested))).rejects.toMatchObject({
      code: 'IMPORT_TOO_DEEP',
    });
    const future = {
      ...referenceFlooringConfiguration,
      version: { ...referenceFlooringConfiguration.version, schemaVersion: 2 },
    };
    expect(await importErrorCode(() => validateConfigurationImport(JSON.stringify(future)))).toBe(
      'SCHEMA_REJECTION',
    );
  });

  it('rejects prototype and executable escape-hatch fields through the strict schema', async () => {
    const hostile = JSON.parse(JSON.stringify(referenceFlooringConfiguration)) as Record<
      string,
      unknown
    >;
    hostile.__proto_payload = { polluted: true };
    hostile.javascript = 'globalThis.fetch("https://attacker.invalid")';
    expect(await importErrorCode(() => validateConfigurationImport(JSON.stringify(hostile)))).toBe(
      'SCHEMA_REJECTION',
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

describe('CSV import validation', () => {
  it('parses quoted cells and reports an identical repeated import without duplicating rows', async () => {
    const source = 'sku;coverage_area_m2;default_waste_percent\r\n"FICTIONAL-1";"2,2";8\r\n';
    const first = await validateCsvImport(source, csvOptions);
    const second = await validateCsvImport(source, csvOptions, new Set([first.checksum]));
    expect(first.rows).toEqual([
      { sku: 'FICTIONAL-1', coverage_area_m2: '2,2', default_waste_percent: '8' },
    ]);
    expect(second).toMatchObject({ checksum: first.checksum, duplicate: true });
  });

  it.each(['=1+1', '+cmd', '-2+3', '@SUM(A1)', '\t=1', '  =1'])(
    'rejects formula-like cell %j',
    async (cell) => {
      await expect(
        validateCsvImport(`sku\n${cell}\n`, {
          ...csvOptions,
          delimiter: ',',
          allowedHeaders: ['sku'],
        }),
      ).rejects.toMatchObject({
        code: 'CSV_FORMULA_INJECTION',
      });
    },
  );

  it('rejects duplicate keys, duplicate headers, unknown headers and malformed rows', async () => {
    await expect(
      validateCsvImport('sku\nA\nA\n', { ...csvOptions, delimiter: ',', allowedHeaders: ['sku'] }),
    ).rejects.toMatchObject({ code: 'CSV_DUPLICATE_KEY' });
    await expect(
      validateCsvImport('sku;sku\nA;B\n', { ...csvOptions, allowedHeaders: ['sku'] }),
    ).rejects.toMatchObject({ code: 'CSV_DUPLICATE_HEADER' });
    await expect(
      validateCsvImport('sku;evil\nA;B\n', { ...csvOptions, allowedHeaders: ['sku'] }),
    ).rejects.toMatchObject({ code: 'CSV_UNKNOWN_HEADER' });
    await expect(validateCsvImport('sku;coverage_area_m2\nA\n', csvOptions)).rejects.toMatchObject({
      code: 'CSV_COLUMN_COUNT_MISMATCH',
    });
    await expect(
      validateCsvImport('sku\n"unterminated', {
        ...csvOptions,
        delimiter: ',',
        allowedHeaders: ['sku'],
      }),
    ).rejects.toMatchObject({ code: 'CSV_UNTERMINATED_QUOTE' });
    await expect(
      validateCsvImport('sku\n"A"tail\n', {
        ...csvOptions,
        delimiter: ',',
        allowedHeaders: ['sku'],
      }),
    ).rejects.toMatchObject({ code: 'CSV_INVALID_QUOTE' });
    await expect(
      validateCsvImport('sku\nA"B\n', { ...csvOptions, delimiter: ',', allowedHeaders: ['sku'] }),
    ).rejects.toMatchObject({ code: 'CSV_INVALID_QUOTE' });
    await expect(
      validateCsvImport('sku\n\u0000\n', {
        ...csvOptions,
        delimiter: ',',
        allowedHeaders: ['sku'],
      }),
    ).rejects.toMatchObject({ code: 'CSV_INVALID_CHARACTER' });
    await expect(validateCsvImport('sku;coverage_area_m2\n;1\n', csvOptions)).rejects.toMatchObject(
      { code: 'CSV_MISSING_KEY' },
    );
    await expect(
      validateCsvImport('sku\n\n', { ...csvOptions, delimiter: ',', allowedHeaders: ['sku'] }),
    ).resolves.toMatchObject({ rows: [] });
  });
});

describe('metric import normalization', () => {
  it.each([
    ['4', 'meter', '.', 4_000],
    ['4.125', 'meter', '.', 4_125],
    ['4,125', 'meter', ',', 4_125],
    ['20', 'squareMeter', '.', 20_000_000],
    ['2,2', 'squareMeter', ',', 2_200_000],
    ['17.1', 'centimeter', '.', 171],
  ] as const)('normalizes %s %s exactly', (value, unit, separator, expected) => {
    expect(parseMetricInputToBaseInteger(value, unit, separator)).toBe(expected);
  });

  it.each([
    ['2,2', 'squareMeter', '.'],
    ['2.2', 'squareMeter', ','],
    ['0.1', 'millimeter', '.'],
    ['-1', 'meter', '.'],
    ['1e3', 'millimeter', '.'],
    [' 1', 'meter', '.'],
  ] as const)('rejects ambiguous or non-representable measurement %s', (value, unit, separator) => {
    expect(() => parseMetricInputToBaseInteger(value, unit, separator)).toThrowError(
      expect.objectContaining<Partial<ImportValidationError>>({ code: 'INVALID_MEASUREMENT' }),
    );
  });
});
