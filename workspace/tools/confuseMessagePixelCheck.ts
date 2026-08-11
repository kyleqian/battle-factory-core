import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { drawText } from "../src/engine/font.ts";
import { drawTileBg } from "../src/engine/bg.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import fontNormalData from "../src/data/gen/font-normal.json" with { type: "json" };
import charmapData from "../src/data/gen/charmap.json" with { type: "json" };
import battleWindowAsset from "../src/assets/gen/battle-window.json" with { type: "json" };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const font = fontNormalData as unknown as Parameters<typeof drawText>[1];
const charmap = new Map<string, number>(
  (charmapData as { entries: [string, number][] }).entries,
);
const windowPalette = (battleWindowAsset as {
  palette: { r: number; g: number; b: number }[][];
}).palette;
const MESSAGE_PALETTE = windowPalette[0]!;
const MESSAGE_TEXT_COLORS = { fg: 1, bg: 15, shadow: 6 };
const LINE1_ORIGIN = { x: 16, y: 121 };
const LINE2_ORIGIN = { x: 16, y: 137 };

function drawMessageTextLines(
  fb: Uint8Array,
  line1: string,
  line2: string,
  chars: number,
): void {
  if (chars <= 0) return;
  const l1 = line1.slice(0, Math.min(chars, line1.length));
  drawText(fb, font, charmap, l1, LINE1_ORIGIN.x, LINE1_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  if (chars > line1.length) {
    const l2 = line2.slice(0, chars - line1.length);
    drawText(fb, font, charmap, l2, LINE2_ORIGIN.x, LINE2_ORIGIN.y, MESSAGE_PALETTE, MESSAGE_TEXT_COLORS);
  }
}

const frame = Number(process.argv[2] ?? 120);
const line1 = "Foe MURKROW became";
const line2 = "confused!";
const total = line1.length + line2.length;

const oraclePng = PNG.sync.read(readFileSync(`${ROOT}/ref/frame-${String(frame).padStart(5, "0")}.png`));

const base = createFramebuffer();
for (let i = 0; i < oraclePng.data.length; i += 4) {
  base[i] = oraclePng.data[i]!;
  base[i + 1] = oraclePng.data[i + 1]!;
  base[i + 2] = oraclePng.data[i + 2]!;
  base[i + 3] = 255;
}

drawTileBg(base, {
  tileset: (battleWindowAsset as { tileset: unknown }).tileset as never,
  tilemap: (battleWindowAsset as { tilemap: unknown }).tilemap as never,
  subpalettes: windowPalette as never,
});
drawMessageTextLines(base, line1, line2, total);

let diff = 0;
const totalPixels = 240 * 160;
for (let p = 0; p < oraclePng.data.length; p += 4) {
  const or = oraclePng.data[p]!;
  const og = oraclePng.data[p + 1]!;
  const ob = oraclePng.data[p + 2]!;
  if (base[p] !== or || base[p + 1] !== og || base[p + 2] !== ob) diff += 1;
}
console.log(`frame ${frame}: "${line1}\\n${line2}" (${total} chars) -- ${diff}/${totalPixels} px differ after overlaying app battle-window + message text`);
process.exit(diff === 0 ? 0 : 1);
