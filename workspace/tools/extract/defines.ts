// Parser for simple C `#define NAME <int>` constant tables (species/move/
// nature/frontier-mon/item ids etc.) - the many include/constants/*.h files
// that are just sequential integer enums spelled as #defines.

export function parseIntDefines(text: string, prefix: string): Map<string, number> {
  const map = new Map<string, number>();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lineRe = new RegExp(`^#define\\s+(${escaped}[A-Za-z0-9_]+)\\s+(\\d+)\\s*$`, "gm");
  for (const match of text.matchAll(lineRe)) {
    map.set(match[1]!, Number(match[2]));
  }
  return map;
}

/** Parser for `#define NAME (1 << N)` bit-flag tables. */
export function parseShiftDefines(text: string, prefix: string): Map<string, number> {
  const map = new Map<string, number>();
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lineRe = new RegExp(`^#define\\s+(${escaped}[A-Za-z0-9_]+)\\s+\\(1\\s*<<\\s*(\\d+)\\)\\s*$`, "gm");
  for (const match of text.matchAll(lineRe)) {
    map.set(match[1]!, 1 << Number(match[2]));
  }
  return map;
}

/** Reverses a name->int map into int->name; throws on duplicate values. */
export function invert(map: Map<string, number>): Map<number, string> {
  const inverted = new Map<number, string>();
  for (const [name, value] of map) {
    if (inverted.has(value)) {
      throw new Error(`duplicate value ${value} for ${name} and ${inverted.get(value)}`);
    }
    inverted.set(value, name);
  }
  return inverted;
}
