import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadNodeRuntime, createNodeFsMountHandler } from '@php-wasm/node';
import { PHP } from '@php-wasm/universal';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const suites = ['integrations/woocommerce-adapter', 'integrations/wordpress-materialmatch'];

const decodeStream = async (stream) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return output + decoder.decode();
    output += decoder.decode(value, { stream: true });
  }
};

for (let index = 0; index < suites.length; index += 1) {
  const relativeDirectory = suites[index];
  const hostDirectory = resolve(repositoryRoot, relativeDirectory);
  await access(resolve(hostDirectory, 'vendor/bin/phpunit'));

  const php = new PHP(
    await loadNodeRuntime('8.3', {
      emscriptenOptions: { processId: index + 1 },
    }),
  );
  php.mkdir('/workspace');
  await php.mount('/workspace', createNodeFsMountHandler(repositoryRoot));

  process.stdout.write(`\nPHP 8.3 WASM · ${relativeDirectory}\n`);
  const response = await php.cli(
    [
      'php',
      `/workspace/${relativeDirectory}/vendor/bin/phpunit`,
      '--configuration',
      `/workspace/${relativeDirectory}/phpunit.xml.dist`,
    ],
    { cwd: `/workspace/${relativeDirectory}` },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    decodeStream(response.stdout),
    decodeStream(response.stderr),
    response.exitCode,
  ]);
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  php[Symbol.dispose]();
  if (exitCode !== 0) process.exit(exitCode);
}
