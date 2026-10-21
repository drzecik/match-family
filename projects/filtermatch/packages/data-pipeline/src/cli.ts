export function parseRequiredArgs(
  argv: readonly string[],
  names: readonly string[],
): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) continue;
    const name = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    parsed[name] = value;
    index += 1;
  }
  for (const name of names) {
    if (!parsed[name]) throw new Error(`Required argument: --${name}`);
  }
  return parsed;
}
