import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const productionAutoloaderPhp = [
  '<?php',
  'declare(strict_types=1);',
  '',
  'spl_autoload_register(',
  '    static function (string $class): void {',
  "        $wordpressPrefix = 'MaterialMatch\\\\WordPress\\\\';",
  "        $woocommercePrefix = 'MaterialMatch\\\\WooCommerce\\\\';",
  '        if (str_starts_with($class, $wordpressPrefix)) {',
  '            $relative = substr($class, strlen($wordpressPrefix));',
  "            $path = dirname(__DIR__) . '/src/' . str_replace('\\\\', '/', $relative) . '.php';",
  '        } elseif (str_starts_with($class, $woocommercePrefix)) {',
  '            $relative = substr($class, strlen($woocommercePrefix));',
  "            $path = __DIR__ . '/materialmatch/woocommerce-adapter/src/' . str_replace('\\\\', '/', $relative) . '.php';",
  '        } else {',
  '            return;',
  '        }',
  '        if (is_readable($path)) {',
  '            require_once $path;',
  '        }',
  '    },',
  ');',
  '',
].join('\n');

export async function writeProductionAutoloader(pluginDirectory, adapterSourceDirectory) {
  const vendorDirectory = join(pluginDirectory, 'vendor');
  await mkdir(join(vendorDirectory, 'materialmatch', 'woocommerce-adapter'), { recursive: true });
  await cp(
    adapterSourceDirectory,
    join(vendorDirectory, 'materialmatch', 'woocommerce-adapter', 'src'),
    { recursive: true },
  );
  await writeFile(join(vendorDirectory, 'autoload.php'), productionAutoloaderPhp);
}
