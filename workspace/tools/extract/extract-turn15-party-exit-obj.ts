// Extract the forced-party-menu SEND OUT exit's persistent OBJ layers from
// direct PPU state.  This is deliberately not a framebuffer asset: it keeps
// 4bpp OBJ tiles, BGR555 palette RAM, and exact transferred OAM attributes.
//
// Usage:
//   node --experimental-strip-types tools/extract/extract-turn15-party-exit-obj.ts \
//     /tmp/turn15-rung1-exit-ppu.json

import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) throw new Error("usage: extract-turn15-party-exit-obj.ts <direct-probe.json>");
const row = JSON.parse(readFileSync(input, "utf8")).ticks?.find((entry: { tick: number }) => entry.tick === 20247);
if (!row) throw new Error("expected direct PPU row for canonical exit tick 20247");

type RawOam = { index: number; a0: string; a1: string; a2: string; matrix: number[] | null };
function n(hex: string): number { return Number.parseInt(hex, 16); }
function dimensions(a0: number, a1: number): [number, number] {
  const shape = (a0 >>> 14) & 3, size = (a1 >>> 14) & 3;
  return ([[[8, 8], [16, 16], [32, 32], [64, 64]], [[16, 8], [32, 8], [32, 16], [64, 32]], [[8, 16], [8, 32], [16, 32], [32, 64]]][shape]?.[size] ?? [0, 0]) as [number, number];
}

const requested = { status: [1, 2], balls: [6, 7, 8, 9] } as const;
const allOam = row.hardwareOam as RawOam[];
const picked = Object.fromEntries(Object.entries(requested).map(([name, indices]) => {
  const entries = indices.map((index) => {
    const entry = allOam.find((candidate) => candidate.index === index);
    if (!entry) throw new Error(`missing OAM entry ${index} at tick 20247`);
    return { index, a0: n(entry.a0), a1: n(entry.a1), a2: n(entry.a2), matrix: entry.matrix };
  });
  return [name, entries];
}));
const ids = [...new Set(Object.values(picked).flat().flatMap((entry) => {
  const [w, h] = dimensions(entry.a0, entry.a1), tile = entry.a2 & 0x3ff;
  return Array.from({ length: (w / 8) * (h / 8) }, (_, i) => tile + Math.floor(i / (w / 8)) * (w / 8) + (i % (w / 8)));
}))].sort((a, b) => a - b);
const vram = Buffer.from(row.objVramB64, "base64");
const tiles = Buffer.concat(ids.map((id) => vram.subarray(id * 32, id * 32 + 32)));

const asset = {
  _comment: "Direct PPU state at canonical 20247: party-menu exit balls (OAM 6-9) and status (OAM 1-2). Indexed OBJ tiles, BGR555 palette RAM and original OAM order only; never a framebuffer.",
  tick: row.tick,
  paletteBgr555: row.palette.hardware,
  oam: picked,
  objTileIds: ids,
  objTilesB64: tiles.toString("base64"),
};
writeFileSync("src/assets/gen/turn15-party-exit-obj.json", `${JSON.stringify(asset)}\n`);
console.log(`wrote indexed party exit OBJ asset: ${ids.length} tiles; status 1/2, balls 6-9`);
