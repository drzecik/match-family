import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from '@playwright/test';
import { runCLI } from '@wp-playground/cli';
import { writeProductionAutoloader } from '../lib/production-autoloader.mjs';
import { withoutApprovedLicenseUri } from '../lib/license-header.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WORDPRESS_VERSION = '7.0.1';
const WOOCOMMERCE_VERSION = '10.9.4';
const WOOCOMMERCE_SHA256 = '6e58fc3ba9b18d1c9aee6b0227d3c3c09e4fe2c1332823bd2e0ac54ffcff64a9';
const PHP_VERSION = '8.3';
const suppliedPluginZip = process.env.MATERIALMATCH_PLUGIN_ZIP
  ? resolve(root, process.env.MATERIALMATCH_PLUGIN_ZIP)
  : null;
const expectedMaterialMatchVersion =
  process.env.MATERIALMATCH_EXPECTED_VERSION ?? (suppliedPluginZip ? null : '0.1.0-dev');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) {
    throw new Error(
      `${command} is required for the WordPress integration gate: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function isCommandAvailable(command) {
  const result = spawnSync(command, ['--version'], { encoding: 'utf8' });
  return result.error === undefined && result.status === 0;
}

async function walk(directory) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.isFile()) {
      files.push(path);
    } else {
      throw new Error(`Unsupported release-test entry: ${path}`);
    }
  }
  return files;
}

async function prepareInstallablePlugin(temporaryRoot) {
  const copiedIntegrations = join(temporaryRoot, 'build', 'integrations');
  const copiedPlugin = join(copiedIntegrations, 'wordpress-materialmatch');
  const copiedAdapter = join(copiedIntegrations, 'woocommerce-adapter');
  const sourcePlugin = join(root, 'integrations', 'wordpress-materialmatch');
  const sourceAdapter = join(root, 'integrations', 'woocommerce-adapter');

  // The storefront is shipped as a framework-free custom element. Build the
  // exact production asset that will be copied into the installable plugin so
  // this gate catches an absent or stale widget bundle.
  run('pnpm', ['--filter', '@materialmatch/materialmatch-widget', 'build']);

  await mkdir(copiedPlugin, { recursive: true });
  await mkdir(copiedAdapter, { recursive: true });
  for (const name of [
    'composer.json',
    'composer.lock',
    'LICENSE',
    'LICENSE-SCOPE.md',
    'materialmatch.php',
    'src',
    'assets',
    'examples',
  ]) {
    await cp(join(sourcePlugin, name), join(copiedPlugin, name), { recursive: true });
  }
  for (const name of ['composer.json', 'composer.lock', 'src']) {
    await cp(join(sourceAdapter, name), join(copiedAdapter, name), { recursive: true });
  }

  if (isCommandAvailable('composer')) {
    run(
      'composer',
      [
        'install',
        '--no-dev',
        '--classmap-authoritative',
        '--no-interaction',
        '--prefer-dist',
        '--no-progress',
      ],
      copiedPlugin,
    );
  } else {
    process.stdout.write(
      'Composer is unavailable; using the same deterministic production autoloader layout as the release builder.\n',
    );
    await writeProductionAutoloader(copiedPlugin, join(copiedAdapter, 'src'));
  }

  const archiveRoot = join(temporaryRoot, 'archive');
  const stagedPlugin = join(archiveRoot, 'materialmatch');
  await mkdir(stagedPlugin, { recursive: true });
  for (const name of ['materialmatch.php', 'LICENSE', 'LICENSE-SCOPE.md', 'src', 'assets', 'examples', 'vendor']) {
    await cp(join(copiedPlugin, name), join(stagedPlugin, name), { recursive: true });
  }
  await mkdir(join(stagedPlugin, 'assets', 'widget'), { recursive: true });
  await cp(
    join(root, 'packages', 'materialmatch-widget', 'dist', 'materialmatch-widget.js'),
    join(stagedPlugin, 'assets', 'widget', 'materialmatch-widget.js'),
  );

  const stagedFiles = await walk(stagedPlugin);
  const forbiddenPath = /(^|\/)(tests?|node_modules|\.phpunit\.cache)(\/|$)|\.map$/i;
  const executableOrRemotePattern = /\beval\s*\(|\bnew\s+Function\s*\(|https?:\/\//;
  for (const file of stagedFiles) {
    const name = relative(stagedPlugin, file);
    if (forbiddenPath.test(name)) {
      throw new Error(`Forbidden file in installable integration ZIP: ${name}`);
    }
    const isMaterialMatchCode =
      name === 'materialmatch.php' ||
      name.startsWith('src/') ||
      name.startsWith('vendor/materialmatch/woocommerce-adapter/src/');
    if (isMaterialMatchCode && executableOrRemotePattern.test(withoutApprovedLicenseUri(name, await readFile(file, 'utf8')))) {
      throw new Error(`Forbidden executable or outbound pattern in integration ZIP: ${name}`);
    }
  }
  assert(stagedFiles.some((file) => relative(stagedPlugin, file) === 'LICENSE'));
  assert(stagedFiles.some((file) => relative(stagedPlugin, file) === 'vendor/autoload.php'));
  assert(
    stagedFiles.some(
      (file) =>
        relative(stagedPlugin, file) ===
        'vendor/materialmatch/woocommerce-adapter/src/Service/AddBundleToCart.php',
    ),
  );
  assert(
    stagedFiles.some(
      (file) => relative(stagedPlugin, file) === 'assets/materialmatch-wordpress.js',
    ),
  );
  assert(
    stagedFiles.some(
      (file) => relative(stagedPlugin, file) === 'assets/widget/materialmatch-widget.js',
    ),
  );
  assert(
    stagedFiles.some((file) => relative(stagedPlugin, file) === 'examples/product-metadata.csv'),
  );

  const pluginZip = join(temporaryRoot, 'materialmatch-integration.zip');
  run('/usr/bin/zip', ['-X', '-q', '-r', pluginZip, 'materialmatch'], archiveRoot);
  return pluginZip;
}

async function prepareBlueprintBundle(temporaryRoot, pluginZip) {
  const bundle = join(temporaryRoot, 'blueprint');
  await mkdir(bundle, { recursive: true });
  await cp(pluginZip, join(bundle, 'materialmatch.zip'));
  const wooCommerceResponse = await fetch(
    `https://downloads.wordpress.org/plugin/woocommerce.${WOOCOMMERCE_VERSION}.zip`,
  );
  if (!wooCommerceResponse.ok) {
    throw new Error(`WooCommerce download failed with HTTP ${wooCommerceResponse.status}`);
  }
  const wooCommerceArchive = Buffer.from(await wooCommerceResponse.arrayBuffer());
  const wooCommerceChecksum = createHash('sha256').update(wooCommerceArchive).digest('hex');
  assert.equal(wooCommerceChecksum, WOOCOMMERCE_SHA256, 'WooCommerce ZIP checksum mismatch');
  await writeFile(join(bundle, 'woocommerce.zip'), wooCommerceArchive);
  const setupCode = await readFile(
    join(root, 'scripts', 'test-wordpress-integration', 'setup-products.php'),
    'utf8',
  );
  const configurationEnvelope = JSON.parse(
    await readFile(join(root, 'examples', 'generated', 'flooring-configuration.json'), 'utf8'),
  );
  const configuration = configurationEnvelope.configuration;
  configuration.accessories = configuration.accessories.filter(({ id }) =>
    ['underlay', 'skirting'].includes(id),
  );
  configuration.accessoryRules = configuration.accessoryRules.filter(({ accessoryProductId }) =>
    ['underlay', 'skirting'].includes(accessoryProductId),
  );
  configuration.compatibilityRules = configuration.compatibilityRules.filter(
    ({ targetProductId }) =>
      targetProductId === undefined || ['underlay', 'skirting'].includes(targetProductId),
  );
  const configurationBase64 = Buffer.from(JSON.stringify(configuration), 'utf8').toString('base64');
  const blueprint = {
    $schema: 'https://playground.wordpress.net/blueprint-schema.json',
    preferredVersions: { php: PHP_VERSION, wp: WORDPRESS_VERSION },
    steps: [
      {
        step: 'installPlugin',
        pluginData: { resource: 'bundled', path: 'woocommerce.zip' },
        options: { activate: true },
      },
      {
        step: 'installPlugin',
        pluginData: { resource: 'bundled', path: 'materialmatch.zip' },
        options: { activate: true },
      },
      {
        step: 'runPHP',
        code: `${setupCode}\nmaterialmatch_activate_test_configuration('${configurationBase64}');`,
      },
    ],
  };
  await writeFile(join(bundle, 'blueprint.json'), `${JSON.stringify(blueprint, null, 2)}\n`);
  return bundle;
}

async function writeEphemeralEndpoint(playground, name, body) {
  const path = `/wordpress/${name}`;
  await playground.writeFile(
    path,
    `<?php\ndeclare(strict_types=1);\nrequire_once '/wordpress/wp-load.php';\n${body}\n@unlink(__FILE__);\n`,
  );
  return `/${name}`;
}

async function createNonce(server) {
  const endpoint = await writeEphemeralEndpoint(
    server.playground,
    'materialmatch-test-nonce.php',
    "echo wp_create_nonce('materialmatch_add_bundle_to_cart');",
  );
  const response = await fetch(new URL(endpoint, server.serverUrl));
  assert.equal(response.status, 200);
  const nonce = await response.text();
  assert.match(nonce, /^[a-zA-Z0-9]+$/);
  return nonce;
}

async function inspectEnvironment(server) {
  const endpoint = await writeEphemeralEndpoint(
    server.playground,
    'materialmatch-test-environment.php',
    `require_once ABSPATH . 'wp-admin/includes/plugin.php';
header('Content-Type: application/json; charset=utf-8');
echo wp_json_encode([
    'wordpress' => get_bloginfo('version'),
    'woocommerce' => defined('WC_VERSION') ? WC_VERSION : null,
    'materialmatch' => defined('MATERIALMATCH_PLUGIN_VERSION') ? MATERIALMATCH_PLUGIN_VERSION : null,
    'woocommerceActive' => is_plugin_active('woocommerce/woocommerce.php'),
    'materialmatchActive' => is_plugin_active('materialmatch/materialmatch.php'),
    'configurationChecksum' => (new MaterialMatch\\WordPress\\Configuration\\ConfigurationManager(
        new MaterialMatch\\WordPress\\Infrastructure\\WordPressOptionConfigurationStateStore(),
    ))->current()?->checksum,
]);`,
  );
  const response = await fetch(new URL(endpoint, server.serverUrl));
  assert.equal(response.status, 200);
  return response.json();
}

async function inspectCart(server, context) {
  const endpoint = await writeEphemeralEndpoint(
    server.playground,
    `materialmatch-test-cart-${Date.now()}-${Math.random().toString(16).slice(2)}.php`,
    `wc_load_cart();
$lines = [];
foreach (WC()->cart->get_cart() as $item) {
    $product = $item['data'];
    $lines[(string) $product->get_sku()] = (int) $item['quantity'];
}
ksort($lines, SORT_STRING);
header('Content-Type: application/json; charset=utf-8');
echo wp_json_encode($lines === [] ? new stdClass() : $lines);`,
  );
  const response = await context.get(endpoint);
  assert.equal(response.status(), 200);
  return response.json();
}

async function inspectStorefrontEmbed(server) {
  const endpoint = await writeEphemeralEndpoint(
    server.playground,
    'materialmatch-test-storefront.php',
    `$productId = (int) wc_get_product_id_by_sku('FICTIONAL-MM-PANEL-NATURAL');
$markup = do_shortcode('[materialmatch product_id="' . $productId . '"]');
header('Content-Type: application/json; charset=utf-8');
echo wp_json_encode([
    'markup' => $markup,
    'widgetEnqueued' => wp_script_is('materialmatch-widget', 'enqueued'),
    'bridgeEnqueued' => wp_script_is('materialmatch-wordpress-bridge', 'enqueued'),
]);`,
  );
  const response = await fetch(new URL(endpoint, server.serverUrl));
  assert.equal(response.status, 200);
  return response.json();
}

function referenceCalculationInput() {
  return {
    project: {
      id: 'playground-reference-project',
      wasteBasisPoints: 800,
      rooms: [
        {
          id: 'reference-room',
          name: 'Fikcyjne pomieszczenie',
          geometry: {
            kind: 'rectangle',
            lengthMillimeters: 5000,
            widthMillimeters: 4000,
          },
          excludedAreas: [],
          doors: [{ id: 'reference-door', widthMillimeters: 900 }],
        },
      ],
    },
    variantId: 'fictional-panel-natural',
    selectedOptionalAccessoryIds: [],
  };
}

async function addBundle(
  context,
  nonce,
  configurationChecksum,
  lines,
  allowPartial = false,
  calculationInput = referenceCalculationInput(),
) {
  return context.post('/wp-admin/admin-ajax.php', {
    form: {
      action: 'materialmatch_add_bundle',
      nonce,
      configuration_checksum: configurationChecksum,
      calculation_input: JSON.stringify(calculationInput),
      lines: JSON.stringify(lines),
      allow_partial: allowPartial ? '1' : '0',
    },
  });
}

async function runAcceptance(server) {
  const environment = await inspectEnvironment(server);
  assert.deepEqual(
    {
      wordpress: environment.wordpress,
      woocommerce: environment.woocommerce,
      materialmatch: environment.materialmatch,
      woocommerceActive: environment.woocommerceActive,
      materialmatchActive: environment.materialmatchActive,
    },
    {
      wordpress: WORDPRESS_VERSION,
      woocommerce: WOOCOMMERCE_VERSION,
      materialmatch: expectedMaterialMatchVersion,
      woocommerceActive: true,
      materialmatchActive: true,
    },
  );
  assert.match(environment.configurationChecksum, /^[a-f0-9]{64}$/);
  const storefront = await inspectStorefrontEmbed(server);
  assert.match(storefront.markup, /<material-match data-materialmatch-wordpress/);
  assert.match(storefront.markup, /data-configuration-checksum="[a-f0-9]{64}"/);
  assert.match(storefront.markup, /data-ajax-action="materialmatch_add_bundle"/);
  assert.equal(storefront.widgetEnqueued, true);
  assert.equal(storefront.bridgeEnqueued, true);
  const nonce = await createNonce(server);

  const exactContext = await request.newContext({ baseURL: server.serverUrl });
  try {
    const response = await addBundle(exactContext, nonce, environment.configurationChecksum, [
      { sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 10 },
      { sku: 'FICTIONAL-MM-UNDERLAY', quantity: 3 },
      { sku: 'FICTIONAL-MM-SKIRTING', quantity: 8 },
    ]);
    assert.equal(response.status(), 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.deepEqual(
      payload.data.added.map(({ sku, quantity }) => ({ sku, quantity })),
      [
        { sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 10 },
        { sku: 'FICTIONAL-MM-UNDERLAY', quantity: 3 },
        { sku: 'FICTIONAL-MM-SKIRTING', quantity: 8 },
      ],
    );
    assert.deepEqual(await inspectCart(server, exactContext), {
      'FICTIONAL-MM-PANEL-NATURAL': 10,
      'FICTIONAL-MM-SKIRTING': 8,
      'FICTIONAL-MM-UNDERLAY': 3,
    });
  } finally {
    await exactContext.dispose();
  }

  const strictContext = await request.newContext({ baseURL: server.serverUrl });
  try {
    const response = await addBundle(strictContext, nonce, environment.configurationChecksum, [
      { sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 2 },
      { sku: 'FICTIONAL-MM-MISSING', quantity: 1 },
    ]);
    assert.equal(response.status(), 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.data.code, 'invalid_payload');
    assert.deepEqual(await inspectCart(server, strictContext), {});
  } finally {
    await strictContext.dispose();
  }

  const nonceContext = await request.newContext({ baseURL: server.serverUrl });
  try {
    const response = await addBundle(
      nonceContext,
      'invalid-nonce',
      environment.configurationChecksum,
      [{ sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 1 }],
      false,
    );
    assert.equal(response.status(), 403);
    assert.deepEqual(await inspectCart(server, nonceContext), {});
  } finally {
    await nonceContext.dispose();
  }

  const boundaryContext = await request.newContext({ baseURL: server.serverUrl });
  try {
    for (const quantity of [0, -1, 100_001, '2,5']) {
      const response = await addBundle(
        boundaryContext,
        nonce,
        environment.configurationChecksum,
        [{ sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity }],
        false,
      );
      assert.equal(response.status(), 400);
      const payload = await response.json();
      assert.equal(payload.success, false);
      assert.equal(payload.data.code, 'invalid_payload');
    }
    assert.deepEqual(await inspectCart(server, boundaryContext), {});
  } finally {
    await boundaryContext.dispose();
  }

  const staleConfigurationContext = await request.newContext({ baseURL: server.serverUrl });
  try {
    const response = await addBundle(staleConfigurationContext, nonce, '0'.repeat(64), [
      { sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 1 },
    ]);
    assert.equal(response.status(), 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.data.code, 'invalid_payload');
    assert.deepEqual(await inspectCart(server, staleConfigurationContext), {});
  } finally {
    await staleConfigurationContext.dispose();
  }

  const tamperedQuantityContext = await request.newContext({ baseURL: server.serverUrl });
  try {
    const response = await addBundle(
      tamperedQuantityContext,
      nonce,
      environment.configurationChecksum,
      [
        { sku: 'FICTIONAL-MM-PANEL-NATURAL', quantity: 1 },
        { sku: 'FICTIONAL-MM-UNDERLAY', quantity: 3 },
        { sku: 'FICTIONAL-MM-SKIRTING', quantity: 8 },
      ],
    );
    assert.equal(response.status(), 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
    assert.equal(payload.data.code, 'invalid_payload');
    assert.deepEqual(await inspectCart(server, tamperedQuantityContext), {});
  } finally {
    await tamperedQuantityContext.dispose();
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'materialmatch-wordpress-integration-'));
let server;
try {
  if (suppliedPluginZip !== null && expectedMaterialMatchVersion === null) {
    throw new Error('MATERIALMATCH_EXPECTED_VERSION is required with MATERIALMATCH_PLUGIN_ZIP.');
  }
  const pluginZip = suppliedPluginZip ?? (await prepareInstallablePlugin(temporaryRoot));
  const blueprintBundle = await prepareBlueprintBundle(temporaryRoot, pluginZip);
  server = await runCLI({
    command: 'server',
    blueprint: blueprintBundle,
    php: PHP_VERSION,
    wp: WORDPRESS_VERSION,
    skipBrowser: true,
    autoMount: false,
    quiet: true,
    'blueprint-may-read-adjacent-files': true,
  });
  process.stdout.write('Running MaterialMatch Playground acceptance assertions…\n');
  await runAcceptance(server);
  process.stdout.write(
    `${JSON.stringify(
      {
        passed: true,
        wordpress: WORDPRESS_VERSION,
        woocommerce: WOOCOMMERCE_VERSION,
        php: PHP_VERSION,
        assertions: [
          'clean ZIP activation',
          'storefront shortcode rendering with production widget assets',
          'exact simple and variation quantities',
          'unexpected SKU rejection before cart mutation',
          'invalid nonce rejection',
          'zero, negative, oversized, and decimal-string quantity rejection',
          'stale configuration checksum rejection',
          'tampered calculated quantity rejection',
        ],
      },
      null,
      2,
    )}\n`,
  );
} finally {
  if (server) {
    await server[Symbol.asyncDispose]();
  }
  await rm(temporaryRoot, { recursive: true, force: true });
}
