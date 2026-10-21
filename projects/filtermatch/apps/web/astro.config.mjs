import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { validateProductionSiteUrl } from './src/lib/production-site.ts';

const snapshotEnvelope = JSON.parse(
  readFileSync(new URL('../../data/generated/public-snapshot.json', import.meta.url), 'utf8')
);
if (snapshotEnvelope.schemaVersion !== 2 || !snapshotEnvelope.data) {
  throw new Error('Unsupported or missing public data schema envelope');
}
const snapshot = snapshotEnvelope.data;
const indexableDeviceIds = new Set(snapshot.compatibilityEdges.map((edge) => edge.deviceId));
const buildProfile = process.env.FILTERMATCH_BUILD_PROFILE ?? 'demo';
const siteUrl = process.env.FILTERMATCH_SITE_URL ?? 'https://filtermatch.example';
if (!['demo', 'private-review', 'production'].includes(buildProfile)) {
  throw new Error('FILTERMATCH_BUILD_PROFILE must be demo, private-review or production');
}
if (buildProfile === 'private-review' || buildProfile === 'production') {
  validateProductionSiteUrl(siteUrl);
}
if (buildProfile === 'production') {
  const publicRecords = Object.values(snapshot).flat();
  if (publicRecords.some((record) => record?.synthetic || record?.notForProduction)) {
    throw new Error('Production build rejected: public data contains synthetic/notForProduction records');
  }
  if (snapshot.compatibilityEdges.length === 0) {
    throw new Error('Production build rejected: no publishable compatibility relations');
  }
}

export default defineConfig({
  site: siteUrl,
  output: 'static',
  integrations: [
    react(),
    ...(buildProfile === 'private-review' ? [] : [sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        if (path.startsWith('/przeglad-danych/')) return false;
        if (path === '/404.html' || path.startsWith('/szukaj/')) return false;
        const deviceMatch = path.match(/^\/urzadzenia\/([^/]+)\/$/u);
        return deviceMatch ? indexableDeviceIds.has(deviceMatch[1]) : true;
      }
    })])
  ],
  build: { format: 'directory' }
});
