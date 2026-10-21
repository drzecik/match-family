import { prepareWidgetConfig, type WidgetConfig } from './core.js';

const MAX_STATIC_CONFIG_BYTES = 5 * 1024 * 1024;

export function resolveStaticConfigUrl(
  rawUrl: string,
  pageUrl: string,
  allowCrossOrigin = false
): URL {
  const page = new URL(pageUrl);
  const config = new URL(rawUrl, page);
  if (!['http:', 'https:'].includes(config.protocol) || config.username || config.password) {
    throw new Error('Widget config URL must use HTTP(S) and must not contain credentials');
  }
  if (!allowCrossOrigin && config.origin !== page.origin) {
    throw new Error('Cross-origin widget config requires an explicit opt-in');
  }
  return config;
}

export async function loadStaticWidgetConfig(
  url: URL,
  fetchConfig: typeof fetch = fetch
): Promise<WidgetConfig> {
  const response = await fetchConfig(url, {
    method: 'GET',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    headers: { accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Widget config request failed with status ${response.status}`);
  const declaredSize = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredSize) && declaredSize > MAX_STATIC_CONFIG_BYTES) {
    throw new Error('Widget config exceeds the 5 MB limit');
  }
  const source = await readBoundedResponseText(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    throw new Error('Widget config is not valid JSON');
  }
  const config = parsed as WidgetConfig;
  // This performs all catalog, reference, URL, limit and theme validation
  // before the configuration reaches the custom element.
  prepareWidgetConfig(config);
  return config;
}

async function readBoundedResponseText(response: Response): Promise<string> {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_STATIC_CONFIG_BYTES) throw new Error('Widget config exceeds the 5 MB limit');
    return new TextDecoder().decode(bytes);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_STATIC_CONFIG_BYTES) {
        await reader.cancel('Widget config size limit exceeded');
        throw new Error('Widget config exceeds the 5 MB limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
