// Parser for reference/pokeemerald's charmap.txt (`'X' = HEX` lines mapping
// display characters to the game's internal glyph codes).

import { readFileSync } from "node:fs";

export function parseCharmap(text: string): Map<string, number> {
  const map = new Map<string, number>();
  const lineRe = /^'(.)'\s*=\s*([0-9A-Fa-f]+)\s*$/;
  for (const line of text.split(/\r?\n/)) {
    const match = lineRe.exec(line);
    if (!match) continue;
    map.set(match[1]!, Number.parseInt(match[2]!, 16));
  }
  return map;
}

export function loadCharmap(path: string): Map<string, number> {
  return parseCharmap(readFileSync(path, "utf8"));
}
