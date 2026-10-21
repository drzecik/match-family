const RESERVED_HOSTS = ['example.com', 'example.net', 'example.org'] as const;
const RESERVED_SUFFIXES = ['.example', '.invalid', '.localhost', '.test'] as const;

export function validateProductionSiteUrl(rawUrl: string): URL {
  let site: URL;
  try {
    site = new URL(rawUrl);
  } catch {
    throw new Error('FILTERMATCH_SITE_URL must be a real HTTPS origin');
  }
  const hostname = site.hostname.toLowerCase();
  const hasTrailingDnsDot = hostname.endsWith('.');
  const normalizedHostname = hostname.replace(/\.+$/u, '');
  const isReservedHost = RESERVED_HOSTS.some(
    (reserved) => normalizedHostname === reserved || normalizedHostname.endsWith(`.${reserved}`)
  );
  const isIpLiteral = normalizedHostname.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(normalizedHostname);
  if (
    site.protocol !== 'https:' ||
    site.username ||
    site.password ||
    site.port ||
    site.pathname !== '/' ||
    site.search ||
    site.hash ||
    hasTrailingDnsDot ||
    normalizedHostname === 'localhost' ||
    !normalizedHostname.includes('.') ||
    isIpLiteral ||
    isReservedHost ||
    RESERVED_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix))
  ) {
    throw new Error('FILTERMATCH_SITE_URL must be a real HTTPS origin');
  }
  return site;
}
