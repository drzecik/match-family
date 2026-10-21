import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeProductionAutoloader } from '../lib/production-autoloader.mjs';
import { withoutApprovedLicenseUri } from '../lib/license-header.mjs';

const root = resolve(import.meta.dirname, '../..');
const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Usage: pnpm build:wordpress-release <semantic-version>');
}

function run(command, args, cwd = root, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
}

function output(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
  return result.stdout.trim();
}

async function verifyReleaseCandidate() {
  const status = output('git', ['status', '--porcelain=v1']);
  if (status !== '') {
    throw new Error(
      'Release candidate worktree must be clean. Commit or discard unrelated changes first.',
    );
  }
  const commit = output('git', ['rev-parse', '--verify', 'HEAD']);
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (packageJson.version !== version) {
    throw new Error(
      `Release version ${version} does not match package.json (${packageJson.version}).`,
    );
  }
  const changelog = await readFile(join(root, 'CHANGELOG.md'), 'utf8');
  if (
    !new RegExp(`^## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'm').test(changelog)
  ) {
    throw new Error(`CHANGELOG.md must contain an approved ## [${version}] entry.`);
  }
  return commit;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile()) files.push(full);
    else throw new Error(`Release staging contains unsupported entry: ${full}`);
  }
  return files;
}

const commit = await verifyReleaseCandidate();

run('pnpm', ['check']);
run('pnpm', ['test:php']);

const plugin = join(root, 'integrations/wordpress-materialmatch');
const widgetDist = join(root, 'packages/materialmatch-widget/dist');
for (const required of [
  join(plugin, 'materialmatch.php'),
  join(plugin, 'src'),
  join(plugin, 'assets'),
  join(plugin, 'examples', 'product-metadata.csv'),
  join(plugin, 'readme.txt'),
  widgetDist,
]) {
  if (!(await exists(required))) throw new Error(`Required release input missing: ${required}`);
}

const stagingRoot = await mkdtemp(join(tmpdir(), 'materialmatch-release-'));
const stagedPlugin = join(stagingRoot, 'materialmatch');
const outputDirectory = join(root, 'release');
const outputZip = join(outputDirectory, `materialmatch-${version}.zip`);
try {
  await mkdir(stagedPlugin, { recursive: true });
  const pluginBootstrap = await readFile(join(plugin, 'materialmatch.php'), 'utf8');
  const versionedBootstrap = pluginBootstrap
    .replace(/^(\s*\* Version:\s*)[^\r\n]+/m, `$1${version}`)
    .replace(
      /define\('MATERIALMATCH_PLUGIN_VERSION',\s*'[^']+'\);/,
      `define('MATERIALMATCH_PLUGIN_VERSION', '${version}');`,
    );
  if (
    versionedBootstrap === pluginBootstrap ||
    !versionedBootstrap.includes(`Version: ${version}`)
  ) {
    throw new Error('Plugin bootstrap version markers could not be updated safely');
  }
  await writeFile(join(stagedPlugin, 'materialmatch.php'), versionedBootstrap);
  await cp(join(plugin, 'src'), join(stagedPlugin, 'src'), { recursive: true });
  await cp(join(plugin, 'assets'), join(stagedPlugin, 'assets'), { recursive: true });
  await cp(join(plugin, 'examples'), join(stagedPlugin, 'examples'), { recursive: true });
  await cp(join(plugin, 'readme.txt'), join(stagedPlugin, 'readme.txt'));
  await cp(join(plugin, 'LICENSE'), join(stagedPlugin, 'LICENSE'));
  await cp(join(plugin, 'LICENSE-SCOPE.md'), join(stagedPlugin, 'LICENSE-SCOPE.md'));
  await writeProductionAutoloader(stagedPlugin, join(root, 'integrations/woocommerce-adapter/src'));
  await mkdir(join(stagedPlugin, 'assets/widget'), { recursive: true });
  await cp(
    join(widgetDist, 'materialmatch-widget.js'),
    join(stagedPlugin, 'assets/widget/materialmatch-widget.js'),
  );

  const files = await walk(stagedPlugin);
  const forbidden = /(\.map$|\/tests?\/|\.env|secret|credential|node_modules)/i;
  const executableScan = /(\beval\s*\(|\bnew\s+Function\s*\()/;
  const outboundUrlScan = /https?:\/\//;
  const networkApiScan =
    /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/;
  for (const file of files) {
    const name = relative(stagedPlugin, file);
    if (forbidden.test(name)) throw new Error(`Forbidden release file: ${name}`);
    const isFirstParty =
      !name.startsWith('vendor/') || name.startsWith('vendor/materialmatch/woocommerce-adapter/');
    if (isFirstParty && /\.(?:php|js|mjs|json|css|html|txt)$/i.test(file)) {
      const content = await readFile(file, 'utf8');
      if (executableScan.test(content)) {
        throw new Error(`Forbidden executable pattern in ${name}`);
      }
      if (name === 'assets/widget/materialmatch-widget.js') {
        if (networkApiScan.test(content)) throw new Error(`Forbidden network API in ${name}`);
      } else if (outboundUrlScan.test(withoutApprovedLicenseUri(name, content))) {
        throw new Error(`Forbidden outbound URL in ${name}`);
      }
    }
  }

  const manifest = [];
  for (const file of files) {
    manifest.push({
      path: relative(stagingRoot, file),
      sha256: createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
      bytes: (await stat(file)).size,
    });
  }
  await writeFile(
    join(stagedPlugin, 'release-manifest.json'),
    `${JSON.stringify({ formatVersion: 1, version, files: manifest }, null, 2)}\n`,
  );
  const fixedTime = new Date('1980-01-01T00:00:00.000Z');
  for (const file of await walk(stagedPlugin)) await utimes(file, fixedTime, fixedTime);

  await mkdir(outputDirectory, { recursive: true });
  await rm(outputZip, { force: true });
  run(
    '/usr/bin/zip',
    [
      '-X',
      '-q',
      outputZip,
      ...(await walk(stagedPlugin)).map((file) => relative(stagingRoot, file)),
    ],
    stagingRoot,
  );
  const digest = createHash('sha256')
    .update(await readFile(outputZip))
    .digest('hex');
  await writeFile(`${outputZip}.sha256`, `${digest}  ${basename(outputZip)}\n`);
  run('pnpm', ['test:wordpress:integration'], root, {
    ...process.env,
    MATERIALMATCH_PLUGIN_ZIP: relative(root, outputZip),
    MATERIALMATCH_EXPECTED_VERSION: version,
  });
  const schemaDocument = JSON.parse(
    await readFile(join(root, 'examples', 'generated', 'flooring-configuration.json'), 'utf8'),
  );
  const schemaVersion = schemaDocument?.configuration?.version?.schemaVersion;
  if (!Number.isInteger(schemaVersion)) {
    throw new Error('Generated configuration schema evidence is unavailable.');
  }
  await writeFile(
    `${outputZip}.metadata.json`,
    `${JSON.stringify(
      {
        formatVersion: 1,
        version,
        commit,
        schemaVersion,
        archive: basename(outputZip),
        archiveSha256: digest,
        manifest: 'release-manifest.json',
        verification: [
          'pnpm check',
          'pnpm test:wordpress:integration (exact release archive)',
          'pnpm test:php (woocommerce-adapter)',
          'pnpm test:php (wordpress-materialmatch)',
        ],
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Built ${outputZip}`);
  console.log(`SHA-256 ${digest}`);
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
