// cff230: ROM receipts + PNG strips of the Scene ON CASTFORM_CHANGE morph, one per class. For each class the ROM lab frames (oracle PNGs
// in `rom`, from /tmp/cff lab runs: tools/integration/cff230Compare.ts documents the pairing) cropped to the Castform box are hashed per
// frame beside our census-route frames of the same rows; the JSON keeps the ROM hashes (tests/cff230CastformForms.test.ts replays the
// production renderer against them), the PNG strip shows ROM (top) over ours (bottom) at every 6th row.
//   node --experimental-strip-types --no-warnings tools/integration/cff230Fixtures.ts
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { cff230Route } from "./cff230Route.ts";

export type Cff230Class = { name: string; seed: number; command: number; rom: string; romStart: number; rows: number; box: [number, number, number, number]; note: string };
export const CFF230_CLASSES: readonly Cff230Class[] = [
  { name: "player-ice-after-hail", seed: 950, command: 11, rom: "/tmp/cff/Bf", romStart: 553, rows: 150, box: [0, 40, 110, 70],
    note: "battle-scene-on mechanicLab: opponent SLAKOTH uses Hail, the player's CASTFORM turns ICE (back sprite)" },
  { name: "opponent-water-after-rain-dance", seed: 651, command: 8, rom: "/tmp/cff/Cr2", romStart: 346, rows: 134, box: [130, 0, 110, 76],
    note: "battle-scene-on mechanicLab: the player's MANTINE uses Rain Dance, the foe CASTFORM turns WATER (front sprite, shadow)" },
  { name: "player-water-send-in", seed: 603, command: 4, rom: "/tmp/cff/D2d", romStart: 1540, rows: 180, box: [0, 40, 110, 70],
    note: "battle-scene-on mechanicLab: CASTFORM sent in during rain (after the ball / send-in rows)" },
];

export const boxHash = (rgba: ArrayLike<number>, [bx, by, bw, bh]: [number, number, number, number]) => {
  const h = createHash("md5");
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) for (let c = 0; c < 3; c++) h.update(Uint8Array.of(rgba[(y * 240 + x) * 4 + c]!));
  return h.digest("hex").slice(0, 12);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const c of CFF230_CLASSES) {
    const seg = cff230Route(c.seed, true, 1).segments[0]!;
    const first = seg.frames.findIndex((f) => f.command === c.command);
    const rom: string[] = []; const ours: string[] = []; const strip: { r: Uint8Array; o: Uint8Array }[] = [];
    for (let k = 0; k < c.rows; k++) {
      const png = PNG.sync.read(readFileSync(`${c.rom}/frame-${String(c.romStart + k).padStart(5, "0")}.png`));
      rom.push(boxHash(png.data, c.box)); ours.push(boxHash(seg.frames[first + k]!.rgba, c.box));
      if (k % 6 === 0) strip.push({ r: png.data, o: seg.frames[first + k]!.rgba });
    }
    const mismatched = rom.filter((h, k) => h !== ours[k]).length;
    const [bx, by, bw, bh] = c.box; const cols = 12;
    const out = new PNG({ width: cols * bw, height: Math.ceil(strip.length / cols) * bh * 2 });
    out.data.fill(255);
    strip.forEach((f, k) => {
      const ox = (k % cols) * bw, oy = Math.floor(k / cols) * bh * 2;
      for (const [row, data] of [[0, f.r], [1, f.o]] as const) for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) for (let ch = 0; ch < 4; ch++)
        out.data[((oy + row * bh + y) * out.width + ox + x) * 4 + ch] = data[((by + y) * 240 + bx + x) * 4 + ch]!;
    });
    writeFileSync(`tools/integration/fixtures/castform-forms/${c.name}.png`, PNG.sync.write(out));
    writeFileSync(`tools/integration/fixtures/castform-forms/${c.name}.json`, JSON.stringify({ ...c, rom: undefined, romFrames: `oracle battle-scene-on lab frames ${c.romStart}..${c.romStart + c.rows - 1}`, mismatchedRows: mismatched, romBoxHashes: rom }, null, 1) + "\n");
    console.log(c.name, "rows", c.rows, "mismatched", mismatched);
  }
}
