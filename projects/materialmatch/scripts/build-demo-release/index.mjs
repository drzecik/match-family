import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
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

const root = resolve(import.meta.dirname, '../..');
const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Usage: pnpm build:demo-release <semantic-version>');
}

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
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
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported demo release entry: ${path}`);
  }
  return files;
}

run('pnpm', ['--filter', '@materialmatch/demo-store', 'typecheck']);
run('pnpm', ['--filter', '@materialmatch/demo-store', 'build']);

const demoDist = join(root, 'apps/demo-store/dist');
if (!(await exists(join(demoDist, 'index.html')))) {
  throw new Error('Demo build did not produce index.html.');
}

const stagingRoot = await mkdtemp(join(tmpdir(), 'materialmatch-demo-release-'));
const stagedDemo = join(stagingRoot, 'materialmatch-demo');
const outputDirectory = join(root, 'release');
const outputZip = join(outputDirectory, `materialmatch-demo-${version}.zip`);

try {
  await cp(demoDist, stagedDemo, { recursive: true });
  const files = await walk(stagedDemo);
  const forbidden = /(\.map$|\/tests?\/|\.env|secret|credential|node_modules)/i;
  for (const file of files) {
    const name = relative(stagedDemo, file);
    if (forbidden.test(name)) throw new Error(`Forbidden demo release file: ${name}`);
  }

  await writeFile(
    join(stagedDemo, 'release-manifest.json'),
    `${JSON.stringify({ version, kind: 'fictional-demo-store', files: files.map((file) => relative(stagedDemo, file)) }, null, 2)}\n`,
  );

  const fixedTime = new Date('1980-01-01T00:00:00.000Z');
  for (const file of await walk(stagedDemo)) await utimes(file, fixedTime, fixedTime);

  await mkdir(outputDirectory, { recursive: true });
  await rm(outputZip, { force: true });
  run(
    '/usr/bin/zip',
    ['-X', '-q', outputZip, ...(await walk(stagedDemo)).map((file) => relative(stagingRoot, file))],
    stagingRoot,
  );

  const digest = createHash('sha256')
    .update(await readFile(outputZip))
    .digest('hex');
  await writeFile(`${outputZip}.sha256`, `${digest}  ${basename(outputZip)}\n`);
  console.log(`Built ${outputZip}`);
  console.log(`SHA-256 ${digest}`);
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
