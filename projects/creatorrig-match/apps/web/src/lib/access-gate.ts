const ACCESS_COOKIE = 'creatorrig_access';
const TOKEN_PREFIX = 'creatorrig-match-access-v1:';

export function accessCookieName(): string {
  return ACCESS_COOKIE;
}

export async function createAccessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${TOKEN_PREFIX}${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator < 0) continue;
    const key = entry.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(entry.slice(separator + 1).trim());
  }
  return undefined;
}

export function timingSafeEqual(left: string | undefined, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < right.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function accessCookie(token: string): string {
  return `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}
