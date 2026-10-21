import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const dist = resolve('apps/web/dist');
const buildProfile = process.env.FILTERMATCH_BUILD_PROFILE ?? 'demo';
const reviewPath = resolve(dist, 'przeglad-danych');

if (buildProfile !== 'private-review') {
  try {
    await access(reviewPath);
    throw new Error(`${buildProfile} build contains the private review route`);
  } catch (error) {
    if ((error).code !== 'ENOENT') throw error;
  }
  for (const sitemapFile of ['sitemap-index.xml', 'sitemap-0.xml']) {
    try {
      const sitemap = await readFile(resolve(dist, sitemapFile), 'utf8');
      if (sitemap.includes('/przeglad-danych/')) {
        throw new Error(`${buildProfile} sitemap advertises the private review route`);
      }
    } catch (error) {
      if ((error).code !== 'ENOENT') throw error;
    }
  }
  process.stdout.write(`${buildProfile} build boundary: valid\n`);
  process.exit(0);
}

const requiredFiles = [
  'index.html',
  'przeglad-danych/index.html',
  'metodologia/index.html',
  'prywatnosc/index.html',
  'robots.txt'
];
const forbiddenPaths = [
  'sitemap-index.xml',
  'sitemap-0.xml',
  'afiliacja',
  'katalog',
  'korekty',
  'szukaj',
  'urzadzenia',
  'materialy'
];

for (const path of requiredFiles) {
  await access(resolve(dist, path));
}
for (const path of forbiddenPaths) {
  try {
    await access(resolve(dist, path));
    throw new Error(`Private build contains forbidden path: ${path}`);
  } catch (error) {
    if ((error).code !== 'ENOENT') throw error;
  }
}

async function artifactTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return artifactTextFiles(path);
    return /\.(?:css|html|js|json|txt|xml)$/u.test(entry.name) || entry.name === '_headers'
      ? [path]
      : [];
  }));
  return files.flat();
}

const privateArtifactText = (await Promise.all(
  (await artifactTextFiles(dist)).map((path) => readFile(path, 'utf8'))
)).join('\n');
for (const marker of ['AirPure', 'HomeBreeze', 'CleanFlow', 'CANDIDATE-', 'Candidate only']) {
  if (privateArtifactText.includes(marker)) throw new Error(`Private build leaks marker: ${marker}`);
}
const robots = await readFile(resolve(dist, 'robots.txt'), 'utf8');
if (robots !== 'User-agent: *\nDisallow: /\n') {
  throw new Error('Private robots.txt must disallow the entire site');
}

process.stdout.write('Private build boundary: valid\n');
