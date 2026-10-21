// Exempt only the approved static GPL metadata, never URLs in executable PHP.
const approvedUri = 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html';
export function withoutApprovedLicenseUri(name, content) {
  if (name === 'readme.txt') {
    return content.split('\n').map((line) =>
      line.trimEnd() === `License URI: ${approvedUri}` ? 'License URI: [GPL-2.0-or-later]' : line,
    ).join('\n');
  }
  if (name !== 'materialmatch.php') return content;
  const header = content.match(/^<\?php\s*\/\*\*[\s\S]*?\*\//)?.[0];
  if (!header) return content;
  const cleaned = header.split('\n').map((line) =>
    line.trimEnd() === ` * License URI: ${approvedUri}` ? ' * License URI: [GPL-2.0-or-later]' : line,
  ).join('\n');
  return cleaned + content.slice(header.length);
}
