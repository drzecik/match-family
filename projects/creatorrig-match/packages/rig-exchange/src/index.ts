export const RIG_EXCHANGE_VERSION = '1.0.0';
export const MAX_RIG_FRAGMENT_LENGTH = 12_000;

export interface PortableRig {
  readonly schemaVersion: typeof RIG_EXCHANGE_VERSION;
  readonly synthetic: boolean;
  readonly notForProduction: boolean;
  readonly deviceId: string;
  readonly selectedProductIds: readonly string[];
  readonly ownedProductIds: readonly string[];
  readonly recordingModeId?: string;
  readonly plannedMinutes: number;
  readonly useCase?: string;
  readonly exportedAt: string;
}

export interface RigImportResult {
  readonly rig?: PortableRig;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export function sanitizePortableRig(
  value: unknown,
  options: {
    readonly allowedProductIds: ReadonlySet<string>;
    readonly allowedRecordingModeIds: ReadonlySet<string>;
    readonly now: string;
  },
): RigImportResult {
  if (!isRecord(value)) return { warnings: [], errors: ['rig_not_an_object'] };
  const source = isRecord(value.state) ? value.state : value;
  const deviceId = safeId(source.deviceId, options.allowedProductIds);
  if (!deviceId) return { warnings: [], errors: ['unknown_or_missing_device'] };

  const warnings: string[] = [];
  const selectedProductIds = safeIds(
    source.selectedProductIds ?? deriveLegacySelectedIds(source),
    options.allowedProductIds,
  );
  if (!selectedProductIds.includes(deviceId)) selectedProductIds.unshift(deviceId);
  const ownedProductIds = safeIds(
    source.ownedProductIds ?? source.ownedIds,
    options.allowedProductIds,
  );
  const planned = Number(source.plannedMinutes);
  const plannedMinutes =
    Number.isFinite(planned) && planned >= 1 && planned <= 1440 ? Math.round(planned) : 60;
  if (plannedMinutes !== planned) warnings.push('planned_minutes_defaulted');
  const recordingModeCandidate =
    typeof source.recordingModeId === 'string'
      ? source.recordingModeId
      : typeof source.modeId === 'string'
        ? source.modeId
        : undefined;
  const recordingModeId =
    recordingModeCandidate && options.allowedRecordingModeIds.has(recordingModeCandidate)
      ? recordingModeCandidate
      : undefined;
  if (recordingModeCandidate && !recordingModeId) warnings.push('unknown_recording_mode_removed');
  const useCase = safeText(source.useCase, 80);

  return {
    rig: {
      schemaVersion: RIG_EXCHANGE_VERSION,
      synthetic: true,
      notForProduction: true,
      deviceId,
      selectedProductIds,
      ownedProductIds,
      ...(recordingModeId ? { recordingModeId } : {}),
      plannedMinutes,
      ...(useCase ? { useCase } : {}),
      exportedAt: options.now,
    },
    warnings,
    errors: [],
  };
}

export function encodeRigFragment(rig: PortableRig): string {
  const encoded = encodeURIComponent(toBase64Url(JSON.stringify(rig)));
  if (encoded.length > MAX_RIG_FRAGMENT_LENGTH) throw new Error('rig_fragment_too_large');
  return encoded;
}

export function decodeRigFragment(
  fragment: string,
  options: Parameters<typeof sanitizePortableRig>[1],
): RigImportResult {
  if (!fragment || fragment.length > MAX_RIG_FRAGMENT_LENGTH)
    return { warnings: [], errors: ['invalid_fragment_length'] };
  try {
    const json = fromBase64Url(decodeURIComponent(fragment));
    return sanitizePortableRig(JSON.parse(json) as unknown, options);
  } catch {
    return { warnings: [], errors: ['invalid_fragment_encoding'] };
  }
}

function deriveLegacySelectedIds(source: Record<string, unknown>): unknown[] {
  const extras: readonly unknown[] = Array.isArray(source.extraIds)
    ? (source.extraIds as readonly unknown[])
    : [];
  return [
    source.deviceId,
    source.audioId,
    source.lensId,
    source.cardId,
    source.cageId,
    source.gimbalId,
    source.powerSourceId,
    source.powerCableId,
    source.filterId,
    source.stepUpRingId,
    source.matteBoxId,
    ...extras,
  ];
}

function safeIds(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (candidate): candidate is string => typeof candidate === 'string' && allowed.has(candidate),
      ),
    ),
  ].slice(0, 100);
}

function safeId(value: unknown, allowed: ReadonlySet<string>): string | undefined {
  return typeof value === 'string' && allowed.has(value) ? value : undefined;
}

function safeText(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength ? normalized : undefined;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
