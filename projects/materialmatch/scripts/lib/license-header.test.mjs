import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { withoutApprovedLicenseUri } from './license-header.mjs';
const url = 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html';
const header = `<?php
/**
 * License URI: ${url}
 */
`;
const scan = /https?:\/\//;

test('approved URI in actual plugin metadata is not an outbound call', () => {
  for (const name of ['materialmatch.php', 'readme.txt']) {
    const content = readFileSync(new URL(`../../integrations/wordpress-materialmatch/${name}`, import.meta.url), 'utf8');
    assert.equal(scan.test(withoutApprovedLicenseUri(name, content)), false);
  }
});

test('the same URI in executable PHP is still blocked', () => {
  const content = header + `file_get_contents('${url}');`;
  assert.equal(scan.test(withoutApprovedLicenseUri('materialmatch.php', content)), true);
});

test('a different or extended license URI is still blocked', () => {
  for (const value of ['https://other.invalid/license', url + '/unexpected', url + "'; eval('x');"]) {
    assert.equal(scan.test(withoutApprovedLicenseUri('materialmatch.php', header.replace(url, value))), true);
  }
});

test('license-looking strings outside the leading PHP docblock are not exempted', () => {
  const outside = `<?php
$x = '
 * License URI: ${url}
';`;
  assert.equal(scan.test(withoutApprovedLicenseUri('materialmatch.php', outside)), true);
  assert.equal(scan.test(withoutApprovedLicenseUri('src/untrusted.php', header)), true);
});

test('only the approved URI is removed, leaving executable patterns visible', () => {
  const content = header + "eval('x'); new Function('x');";
  assert.match(withoutApprovedLicenseUri('materialmatch.php', content), /eval\s*\(/);
  assert.match(withoutApprovedLicenseUri('materialmatch.php', content), /new Function/);
});
