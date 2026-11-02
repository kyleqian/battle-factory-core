// Parser for reference/pokeemerald's charmap.txt (`'X' = HEX` lines mapping
// display characters to the game's internal glyph codes).

import { readFileSync } from "node:fs";

export function parseCharmap(text: string): Map<string, number> {
  const map = new Map<string, number>();
  const lineRe = /^'(.)'\s*=\s*([0-9A-Fa-f]+)\s*$/;
  // charmap.txt:88 spells the ASCII apostrophe as an escaped quote (`'\''  = B4`, the same glyph as `’`); species_names.h
  // and the move / item names use that apostrophe (FARFETCH'D, KING'S ROCK), so it has to map like any other character (spn242).
  const escapedQuoteRe = /^'\\''\s*=\s*([0-9A-Fa-f]+)\s*$/;
  for (const line of text.split(/\r?\n/)) {
    const match = lineRe.exec(line);
    if (match) {
      map.set(match[1]!, Number.parseInt(match[2]!, 16));
      continue;
    }
    const escaped = escapedQuoteRe.exec(line);
    if (escaped) map.set("'", Number.parseInt(escaped[1]!, 16));
  }
  return map;
}

export function loadCharmap(path: string): Map<string, number> {
  return parseCharmap(readFileSync(path, "utf8"));
}
