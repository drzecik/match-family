import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { projects, runCli } from './family.mjs';

function setup(t, installed = true) {
  const root = mkdtempSync(join(tmpdir(), 'match-family-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const project of projects) {
    const cwd = join(root, 'projects', project);
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ packageManager: 'pnpm@test' }));
    if (installed) {
      mkdirSync(join(cwd, 'node_modules'), { recursive: true });
      writeFileSync(join(cwd, 'node_modules', '.modules.yaml'), '');
    }
  }
  const calls = [], errors = [];
  const options = { root, nodeVersion: '24.18.0', out() {}, err: (text) => errors.push(text),
    run: (binary, argv, config) => { calls.push({ binary, argv, config }); return { status: 0, stdout: '0.0.0' }; } };
  return { root, calls, errors, options };
}

test('invalid project, flags and traversal never execute a command', (t) => {
  const { options, calls } = setup(t);
  for (const args of [['install', '../../private'], ['demo', 'all', '--offline'], ['publish'], ['check', 'all', '--extra']]) {
    assert.equal(runCli(args, options), 2);
  }
  assert.equal(calls.length, 0);
});

test('old Node version fails with an actionable error before spawning', (t) => {
  const { options, calls, errors } = setup(t);
  assert.equal(runCli(['demo'], { ...options, nodeVersion: '20.20.2' }), 1);
  assert.match(errors.join(' '), /nvm use/);
  assert.equal(calls.length, 0);
});

test('doctor only probes Corepack and never resolves or downloads pnpm', (t) => {
  const { options, calls } = setup(t, false);
  assert.equal(runCli([], options), 0);
  assert.deepEqual(calls.map((call) => call.argv), [['--version']]);
});

test('offline installation keeps every independent frozen lockfile', (t) => {
  const { options, calls } = setup(t, false);
  assert.equal(runCli(['install', 'all', '--offline'], options), 0);
  assert.deepEqual(calls.slice(1).map((call) => call.argv), projects.map(() => ['pnpm', 'install', '--frozen-lockfile', '--offline']));
  assert.deepEqual(calls.slice(1).map((call) => call.config.cwd), projects.map((name) => join(options.root, 'projects', name)));
  assert.ok(calls.every((call) => call.config.shell === false));
});

test('failure of a workspace stops the run and preserves its exit code', (t) => {
  const { options, calls } = setup(t);
  const run = (binary, argv, config) => {
    const result = options.run(binary, argv, config);
    return argv.includes('demo:core') ? { status: 17 } : result;
  };
  assert.equal(runCli(['demo'], { ...options, run }), 17);
  assert.equal(calls.length, 2);
});

test('missing dependencies fail before a demo is run', (t) => {
  const { options, calls, errors } = setup(t, false);
  assert.equal(runCli(['demo', 'filtermatch'], options), 1);
  assert.equal(calls.length, 1);
  assert.match(errors.join(' '), /install filtermatch/);
});

test('missing Corepack and interrupted child processes fail visibly', (t) => {
  const { options, errors } = setup(t);
  assert.equal(runCli(['doctor'], { ...options, run: () => ({ error: { code: 'ENOENT' } }) }), 1);
  assert.match(errors.join(' '), /Corepack/);
  assert.equal(runCli(['doctor'], { ...options, run: () => ({ status: null, signal: 'SIGTERM' }) }), 1);
});

test('full MaterialMatch checks do not silently skip missing PHP contracts', (t) => {
  const { options, calls, errors } = setup(t);
  assert.equal(runCli(['check', 'materialmatch'], options), 1);
  assert.equal(calls.length, 1);
  assert.match(errors.join(' '), /composer install/);
});
