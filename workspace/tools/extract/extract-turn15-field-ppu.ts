// Extract the first visible replacement-field frame as raw indexed PPU state.
//
// Input is the direct VRAM/register probe, never a screenshot.  The emitted
// asset keeps mode-0 character/map blocks, the BGR555 palette, and only the
// hardware OAM entries/OBJ tiles which can touch the 240x160 viewport.
//
// Usage:
//   node --experimental-strip-types tools/extract/extract-turn15-field-ppu.ts \
//     /tmp/turn15-20302-raw.json

import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) throw new Error("usage: extract-turn15-field-ppu.ts <direct-probe.json>");
const row = JSON.parse(readFileSync(input, "utf8")).ticks?.[0];
if (!row || row.tick !== 20302) throw new Error("expected direct probe row for canonical tick 20302");

function n(hex: string): number { return Number.parseInt(hex, 16); }
function dimensions(a0: number, a1: number): [number, number] {
  const shape = (a0 >>> 14) & 3;
  const size = (a1 >>> 14) & 3;
  const table: readonly (readonly [number, number][])[] = [
    [[8, 8], [16, 16], [32, 32], [64, 64]],
    [[16, 8], [32, 8], [32, 16], [64, 32]],
    [[8, 16], [8, 32], [16, 32], [32, 64]],
  ];
  return table[shape]?.[size] ?? [0, 0];
}
function onScreen(a0: number, a1: number): boolean {
  const [w, h] = dimensions(a0, a1);
  const affine = (a0 >>> 8) & 3;
  const x = a1 & 0x1ff;
  const y = a0 & 0xff;
  const left = affine ? x - w / 2 : x;
  const top = affine ? y - h / 2 : y;
  return left < 240 && left + w > 0 && top < 160 && top + h > 0;
}

const display = row.display as { dispcnt: string; bldcnt: string; bldy: string; bg: Array<Record<string, unknown>> };
const obj = Buffer.from(row.objVramB64, "base64");
const oam = (row.hardwareOam as Array<{ a0: string; a1: string; a2: string; matrix: number[] | null }>).filter((entry) => onScreen(n(entry.a0), n(entry.a1)));
const tileIds = new Set<number>();
for (const entry of oam) {
  const a0 = n(entry.a0), a1 = n(entry.a1), a2 = n(entry.a2);
  const [w, h] = dimensions(a0, a1);
  const tile = a2 & 0x3ff;
  for (let ty = 0; ty < h / 8; ty += 1) for (let tx = 0; tx < w / 8; tx += 1) tileIds.add(tile + ty * (w / 8) + tx);
}
const ids = [...tileIds].sort((a, b) => a - b);
const objTiles = Buffer.concat(ids.map((tile) => obj.subarray(tile * 32, tile * 32 + 32)));
const charBases = new Map<number, string>();
const maps = display.bg.map((bg) => {
  const charBase = bg.charBase as number;
  if (!charBases.has(charBase)) charBases.set(charBase, bg.charB64 as string);
  return { control: n(bg.control as string), hofs: bg.hofs, vofs: bg.vofs, mapB64: bg.mapB64 };
});
const asset = {
  _comment: "Direct PPU state at canonical 20302. Indexed character/map/OBJ tiles, BGR555 palette and OAM only; extracted by tools/extract/extract-turn15-field-ppu.ts from tools/probe/dump-turn15-sendout.py, never from a framebuffer.",
  tick: row.tick,
  dispcnt: n(display.dispcnt), bldcnt: n(display.bldcnt), bldy: n(display.bldy),
  bg: maps,
  charBases: Object.fromEntries(charBases),
  // Palette RAM is the actual PPU source; the game-side palette buffers are
  // also present in the probe for fade attribution, but can lag the DMA.
  paletteBgr555: row.palette.hardware,
  // Matrices come from the PPU OAM transfer's interleaved attribute-3
  // words; keeping them alongside the referencing entry preserves affine
  // geometry without inventing a transform from pixels.
  oam: oam.map((entry) => ({ a0: n(entry.a0), a1: n(entry.a1), a2: n(entry.a2), matrix: entry.matrix })),
  objTileIds: ids,
  objTilesB64: objTiles.toString("base64"),
};
writeFileSync("src/assets/gen/turn15-field-ppu-20302.json", `${JSON.stringify(asset)}\n`);
console.log(`wrote indexed field asset: ${maps.length} BG layers, ${oam.length} OAM entries, ${ids.length} OBJ tiles`);
