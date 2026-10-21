import type { CalculationConfiguration } from '@materialmatch/domain';
import { migrateCalculationConfiguration } from './index.js';

export const MAX_CONFIGURATION_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_CONFIGURATION_DEPTH = 64;
export const MAX_CSV_IMPORT_BYTES = 1024 * 1024;
export const MAX_CSV_ROWS = 5_000;
export const MAX_CSV_COLUMNS = 32;
export const MAX_CSV_CELL_BYTES = 4_096;

export type ImportValidationErrorCode =
  | 'IMPORT_EMPTY'
  | 'IMPORT_TOO_LARGE'
  | 'IMPORT_INVALID_UTF8'
  | 'IMPORT_INVALID_JSON'
  | 'IMPORT_TOO_DEEP'
  | 'IMPORT_INVALID_ENVELOPE'
  | 'IMPORT_CHECKSUM_MISMATCH'
  | 'CSV_INVALID_DELIMITER'
  | 'CSV_INVALID_QUOTE'
  | 'CSV_INVALID_CHARACTER'
  | 'CSV_UNTERMINATED_QUOTE'
  | 'CSV_TOO_MANY_ROWS'
  | 'CSV_TOO_MANY_COLUMNS'
  | 'CSV_CELL_TOO_LARGE'
  | 'CSV_COLUMN_COUNT_MISMATCH'
  | 'CSV_UNKNOWN_HEADER'
  | 'CSV_MISSING_HEADER'
  | 'CSV_DUPLICATE_HEADER'
  | 'CSV_DUPLICATE_KEY'
  | 'CSV_MISSING_KEY'
  | 'CSV_FORMULA_INJECTION'
  | 'INVALID_MEASUREMENT';

export class ImportValidationError extends Error {
  public constructor(
    public readonly code: ImportValidationErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

const textEncoder = new TextEncoder();

function decodeUtf8(
  input: string | Uint8Array,
  maximumBytes: number,
): { text: string; bytes: Uint8Array } {
  const bytes = typeof input === 'string' ? textEncoder.encode(input) : input;
  if (bytes.byteLength === 0) throw new ImportValidationError('IMPORT_EMPTY', 'Import is empty');
  if (bytes.byteLength > maximumBytes) {
    throw new ImportValidationError('IMPORT_TOO_LARGE', 'Import exceeds the byte limit', {
      actualBytes: bytes.byteLength,
      maximumBytes,
    });
  }
  try {
    const text =
      typeof input === 'string' ? input : new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text: text.replace(/^\uFEFF/, ''), bytes };
  } catch {
    throw new ImportValidationError('IMPORT_INVALID_UTF8', 'Import must be valid UTF-8');
  }
}

export function measureValueDepth(input: unknown): number {
  let maximum = 0;
  const pending: { value: unknown; depth: number }[] = [{ value: input, depth: 1 }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    maximum = Math.max(maximum, current.depth);
    if (maximum > MAX_CONFIGURATION_DEPTH) return maximum;
    if (Array.isArray(current.value)) {
      for (const value of current.value) pending.push({ value, depth: current.depth + 1 });
    } else if (typeof current.value === 'object' && current.value !== null) {
      for (const value of Object.values(current.value))
        pending.push({ value, depth: current.depth + 1 });
    }
  }
  return maximum;
}

export function canonicalJson(input: unknown): string {
  if (input === null || typeof input === 'boolean' || typeof input === 'string')
    return JSON.stringify(input);
  if (typeof input === 'number') {
    if (!Number.isFinite(input))
      throw new ImportValidationError(
        'IMPORT_INVALID_JSON',
        'Canonical JSON only supports finite numbers',
      );
    return JSON.stringify(input);
  }
  if (Array.isArray(input)) return `[${input.map((value) => canonicalJson(value)).join(',')}]`;
  if (typeof input === 'object') {
    const record = input as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new ImportValidationError(
    'IMPORT_INVALID_JSON',
    'Canonical JSON does not support this value',
  );
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', textEncoder.encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export interface ConfigurationImportEnvelope {
  readonly formatVersion: 1;
  readonly checksum: string;
  readonly configuration: CalculationConfiguration;
}

export interface ValidatedConfigurationImport {
  readonly configuration: CalculationConfiguration;
  readonly checksum: string;
  readonly duplicate: boolean;
  readonly sourceFormat: 'bare' | 'envelope';
  readonly migrated: boolean;
}

export async function createConfigurationImportEnvelope(
  configuration: CalculationConfiguration,
): Promise<ConfigurationImportEnvelope> {
  const migrated = migrateCalculationConfiguration(configuration);
  return {
    formatVersion: 1,
    checksum: await sha256Hex(canonicalJson(migrated)),
    configuration: migrated,
  };
}

export async function validateConfigurationImport(
  input: string | Uint8Array,
  previouslyImportedChecksums: ReadonlySet<string> = new Set(),
): Promise<ValidatedConfigurationImport> {
  const { text } = decodeUtf8(input, MAX_CONFIGURATION_IMPORT_BYTES);
  let decoded: unknown;
  try {
    decoded = JSON.parse(text) as unknown;
  } catch {
    throw new ImportValidationError('IMPORT_INVALID_JSON', 'Import is not valid JSON');
  }
  const depth = measureValueDepth(decoded);
  if (depth > MAX_CONFIGURATION_DEPTH) {
    throw new ImportValidationError('IMPORT_TOO_DEEP', 'Import exceeds the nesting depth limit', {
      depth,
    });
  }

  let sourceFormat: 'bare' | 'envelope' = 'bare';
  let providedChecksum: string | undefined;
  let configurationInput = decoded;
  if (typeof decoded === 'object' && decoded !== null && 'formatVersion' in decoded) {
    sourceFormat = 'envelope';
    const envelope = decoded as Readonly<Record<string, unknown>>;
    const keys = Object.keys(envelope).sort();
    if (
      keys.join(',') !== 'checksum,configuration,formatVersion' ||
      envelope.formatVersion !== 1 ||
      typeof envelope.checksum !== 'string' ||
      !/^[a-f0-9]{64}$/.test(envelope.checksum)
    ) {
      throw new ImportValidationError('IMPORT_INVALID_ENVELOPE', 'Import envelope is invalid');
    }
    providedChecksum = envelope.checksum;
    configurationInput = envelope.configuration;
  }

  const originalVersion =
    typeof configurationInput === 'object' && configurationInput !== null
      ? (configurationInput as { version?: { schemaVersion?: unknown } }).version?.schemaVersion
      : undefined;
  const configuration = migrateCalculationConfiguration(configurationInput);
  const checksum = await sha256Hex(canonicalJson(configuration));
  if (providedChecksum && !constantTimeEqual(providedChecksum, checksum)) {
    throw new ImportValidationError(
      'IMPORT_CHECKSUM_MISMATCH',
      'Import checksum does not match its configuration',
    );
  }
  return {
    configuration,
    checksum,
    duplicate: previouslyImportedChecksums.has(checksum),
    sourceFormat,
    migrated: originalVersion !== configuration.version.schemaVersion,
  };
}

export interface CsvImportOptions {
  readonly delimiter: ',' | ';';
  readonly allowedHeaders: readonly string[];
  readonly requiredHeaders: readonly string[];
  readonly uniqueKey?: string;
}

export interface ValidatedCsvImport {
  readonly headers: readonly string[];
  readonly rows: readonly Readonly<Record<string, string>>[];
  readonly checksum: string;
  readonly duplicate: boolean;
}

function parseCsv(text: string, delimiter: ',' | ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let quoteClosed = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        cell += character;
      }
    } else if (quoteClosed && character !== delimiter && character !== '\n' && character !== '\r') {
      throw new ImportValidationError(
        'CSV_INVALID_QUOTE',
        'CSV has characters after a closing quote',
      );
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === '"') {
      throw new ImportValidationError(
        'CSV_INVALID_QUOTE',
        'CSV has a quote inside an unquoted cell',
      );
    } else if (character === delimiter) {
      row.push(cell);
      cell = '';
      quoteClosed = false;
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      quoteClosed = false;
    } else {
      cell += character;
    }
  }
  if (quoted)
    throw new ImportValidationError(
      'CSV_UNTERMINATED_QUOTE',
      'CSV contains an unterminated quoted cell',
    );
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function assertSafeCsvCell(cell: string, row: number, column: number): void {
  if (textEncoder.encode(cell).byteLength > MAX_CSV_CELL_BYTES) {
    throw new ImportValidationError('CSV_CELL_TOO_LARGE', 'CSV cell exceeds the byte limit', {
      row,
      column,
    });
  }
  if ([...cell].some((character) => [0, 11, 12].includes(character.charCodeAt(0)))) {
    throw new ImportValidationError(
      'CSV_INVALID_CHARACTER',
      'CSV cell contains a forbidden control character',
      { row, column },
    );
  }
  if (/^[\t\r\n ]*[=+\-@]/.test(cell)) {
    throw new ImportValidationError('CSV_FORMULA_INJECTION', 'CSV contains a formula-like cell', {
      row,
      column,
    });
  }
}

export async function validateCsvImport(
  input: string | Uint8Array,
  options: CsvImportOptions,
  previouslyImportedChecksums: ReadonlySet<string> = new Set(),
): Promise<ValidatedCsvImport> {
  if (options.delimiter !== ',' && options.delimiter !== ';') {
    throw new ImportValidationError(
      'CSV_INVALID_DELIMITER',
      'CSV delimiter must be comma or semicolon',
    );
  }
  const { text } = decodeUtf8(input, MAX_CSV_IMPORT_BYTES);
  const parsedRows = parseCsv(text, options.delimiter);
  if (parsedRows.length === 0) throw new ImportValidationError('IMPORT_EMPTY', 'CSV has no header');
  if (parsedRows.length - 1 > MAX_CSV_ROWS)
    throw new ImportValidationError('CSV_TOO_MANY_ROWS', 'CSV has too many rows');
  const headers = parsedRows[0] ?? [];
  if (headers.length > MAX_CSV_COLUMNS)
    throw new ImportValidationError('CSV_TOO_MANY_COLUMNS', 'CSV has too many columns');
  const duplicateHeader = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeader)
    throw new ImportValidationError(
      'CSV_DUPLICATE_HEADER',
      `Duplicate CSV header: ${duplicateHeader}`,
    );
  for (const required of options.requiredHeaders) {
    if (!headers.includes(required))
      throw new ImportValidationError('CSV_MISSING_HEADER', `Missing CSV header: ${required}`);
  }
  for (const [index, header] of headers.entries()) {
    assertSafeCsvCell(header, 1, index + 1);
    if (!options.allowedHeaders.includes(header))
      throw new ImportValidationError('CSV_UNKNOWN_HEADER', `Unknown CSV header: ${header}`);
  }
  if (options.uniqueKey && !headers.includes(options.uniqueKey)) {
    throw new ImportValidationError(
      'CSV_MISSING_HEADER',
      `Missing unique key header: ${options.uniqueKey}`,
    );
  }

  const rows: Readonly<Record<string, string>>[] = [];
  const uniqueValues = new Set<string>();
  for (const [rowIndex, values] of parsedRows.slice(1).entries()) {
    if (values.length === 1 && values[0] === '') continue;
    if (values.length !== headers.length) {
      throw new ImportValidationError(
        'CSV_COLUMN_COUNT_MISMATCH',
        'CSV row has a different column count',
        { row: rowIndex + 2 },
      );
    }
    const record: Record<string, string> = {};
    for (const [columnIndex, header] of headers.entries()) {
      const value = values[columnIndex] ?? '';
      assertSafeCsvCell(value, rowIndex + 2, columnIndex + 1);
      record[header] = value;
    }
    if (options.uniqueKey) {
      const value = record[options.uniqueKey] ?? '';
      if (value === '')
        throw new ImportValidationError(
          'CSV_MISSING_KEY',
          `CSV key is empty: ${options.uniqueKey}`,
          { row: rowIndex + 2 },
        );
      if (uniqueValues.has(value))
        throw new ImportValidationError('CSV_DUPLICATE_KEY', `Duplicate CSV key: ${value}`, {
          row: rowIndex + 2,
        });
      uniqueValues.add(value);
    }
    rows.push(record);
  }
  const checksum = await sha256Hex(canonicalJson({ headers, rows }));
  return { headers, rows, checksum, duplicate: previouslyImportedChecksums.has(checksum) };
}

export type MetricInputUnit =
  'millimeter' | 'centimeter' | 'meter' | 'squareMillimeter' | 'squareCentimeter' | 'squareMeter';

const UNIT_SCALES: Readonly<Record<MetricInputUnit, bigint>> = {
  millimeter: 1n,
  centimeter: 10n,
  meter: 1_000n,
  squareMillimeter: 1n,
  squareCentimeter: 100n,
  squareMeter: 1_000_000n,
};

export function parseMetricInputToBaseInteger(
  value: string,
  unit: MetricInputUnit,
  decimalSeparator: '.' | ',',
): number {
  if (value.trim() !== value || value.length > 64)
    throw new ImportValidationError(
      'INVALID_MEASUREMENT',
      'Measurement has invalid whitespace or length',
    );
  const escapedSeparator = decimalSeparator === '.' ? '\\.' : ',';
  const match = new RegExp(`^(0|[1-9]\\d*)(?:${escapedSeparator}(\\d+))?$`).exec(value);
  if (!match)
    throw new ImportValidationError(
      'INVALID_MEASUREMENT',
      'Measurement format or decimal separator is invalid',
    );
  const scale = UNIT_SCALES[unit];
  const fractionalDigits = match[2] ?? '';
  const denominator = 10n ** BigInt(fractionalDigits.length);
  const numerator = BigInt(match[1] ?? '0') * denominator + BigInt(fractionalDigits || '0');
  const scaled = numerator * scale;
  if (scaled % denominator !== 0n)
    throw new ImportValidationError(
      'INVALID_MEASUREMENT',
      'Measurement cannot be represented in the integer base unit',
    );
  const result = scaled / denominator;
  if (result <= 0n || result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new ImportValidationError(
      'INVALID_MEASUREMENT',
      'Measurement is outside the supported range',
    );
  return Number(result);
}
