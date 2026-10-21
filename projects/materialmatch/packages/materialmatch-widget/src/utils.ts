export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function parseMetersToMillimeters(rawValue: string): number | null {
  const normalized = rawValue.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  const millimeters = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  return Number.isSafeInteger(millimeters) ? millimeters : null;
}

export function parseSquareMetersToSquareMillimeters(rawValue: string): number | null {
  const normalized = rawValue.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  const squareMillimeters = Number(whole) * 1_000_000 + Number(fraction.padEnd(6, '0'));
  return Number.isSafeInteger(squareMillimeters) ? squareMillimeters : null;
}

export function parseNonNegativeInteger(rawValue: string): number | null {
  const normalized = rawValue.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}

export function squareMillimetersToSquareMeters(value: number): number {
  return value / 1_000_000;
}

export function millimetersToMeterInput(value: number): string {
  const whole = Math.floor(value / 1000);
  const fraction = String(value % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole},${fraction}` : String(whole);
}

export function squareMillimetersToSquareMeterInput(value: number): string {
  const whole = Math.floor(value / 1_000_000);
  const fraction = String(value % 1_000_000)
    .padStart(6, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole},${fraction}` : String(whole);
}
