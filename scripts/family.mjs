import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
export const projects = ['filtermatch', 'creatorrig-match', 'materialmatch'];
const usage = `Match Family (macOS, Linux or WSL; Node 24.18+ in the 24.x series)
  node scripts/family.mjs doctor [project|all]
  node scripts/family.mjs install [project|all] [--offline]
  node scripts/family.mjs demo [project|all]
  node scripts/family.mjs check [project|all]

Defaults: doctor, all. No server, deployment or registry publication is started.
MaterialMatch full check additionally needs Composer dependencies; see docs/GETTING_STARTED.md.
`;

export function runCli(args, options = {}) {
  const { root = repositoryRoot, run = spawnSync, nodeVersion = process.versions.node,
    out = console.log, err = console.error } = options;
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { out(usage); return 0; }
  const [command = 'doctor', target = 'all', ...flags] = args;
  if (!['doctor', 'install', 'demo', 'check'].includes(command) ||
      (target !== 'all' && !projects.includes(target)) ||
      flags.some((flag) => flag !== '--offline') || flags.length > 1 ||
      (flags.length > 0 && command !== 'install')) {
    err(usage); return 2;
  }
  const [major, minor] = nodeVersion.split('.').map(Number);
  if (major !== 24 || minor < 18) {
    err(`Use Node 24.18+ (24.x); found ${nodeVersion}. Run nvm use in the repository root.`);
    return 1;
  }
  const selected = target === 'all' ? projects : [target];
  function execute(binary, argv, cwd, capture = false) {
    const result = run(binary, argv, { cwd, stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: false });
    if (result.error || result.signal || result.status !== 0) {
      err(result.error?.code === 'ENOENT'
        ? `${binary} is missing. Install/enable Corepack for this Node runtime; see docs/GETTING_STARTED.md.`
        : `${binary} ${argv.join(' ')} failed: ${result.error?.message ?? result.signal ?? result.status}`);
      if (capture && result.stderr) err(result.stderr.trim());
      return Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
    }
    if (capture) out(`${binary}: ${result.stdout.trim()}`);
    return 0;
  }
  const corepackStatus = execute('corepack', ['--version'], root, true);
  if (corepackStatus) return corepackStatus;
  for (const project of selected) {
    const cwd = resolve(root, 'projects', project);
    const manifest = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'));
    const installed = existsSync(resolve(cwd, 'node_modules', '.modules.yaml'));
    out(`${project}: ${manifest.packageManager}; dependencies ${installed ? 'installed' : 'missing'}`);
    if (command === 'doctor') continue;
    if (command !== 'install' && !installed) {
      err(`Install first: node scripts/family.mjs install ${project}`); return 1;
    }
    if (command === 'check' && project === 'materialmatch' &&
        ['woocommerce-adapter', 'wordpress-materialmatch'].some((name) =>
          !existsSync(resolve(cwd, 'integrations', name, 'vendor', 'bin', 'phpunit')))) {
      err('MaterialMatch PHP dependencies are missing. Follow the two composer install commands in docs/GETTING_STARTED.md.');
      return 1;
    }
    const argv = command === 'install'
      ? ['pnpm', 'install', '--frozen-lockfile', ...flags]
      : ['pnpm', 'run', command === 'demo' ? 'demo:core' : 'check'];
    const status = execute('corepack', argv, cwd);
    if (status) return status;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = runCli(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
