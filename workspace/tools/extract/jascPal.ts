// Parser for JASC-PAL text palette files (as used throughout reference/pokeemerald's graphics/).

import { readFileSync } from "node:fs";
import { gbaRoundTrip } from "./gbaColor.ts";

export interface PalColor {
  r: number;
  g: number;
  b: number;
}

export function parseJascPal(text: string): PalColor[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines[0]?.trim() !== "JASC-PAL") {
    throw new Error("not a JASC-PAL file");
  }
  const count = Number.parseInt(lines[2] ?? "0", 10);
  const colors: PalColor[] = [];
  for (let i = 0; i < count; i += 1) {
    const line = lines[3 + i];
    if (!line) throw new Error(`JASC-PAL: expected ${count} colors, ran out at ${i}`);
    const [r, g, b] = line.trim().split(/\s+/).map(Number);
    colors.push({ r: gbaRoundTrip(r!), g: gbaRoundTrip(g!), b: gbaRoundTrip(b!) });
  }
  return colors;
}

export function loadJascPal(path: string): PalColor[] {
  return parseJascPal(readFileSync(path, "utf8"));
}
