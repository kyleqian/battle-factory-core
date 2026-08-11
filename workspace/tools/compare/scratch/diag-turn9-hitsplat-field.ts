// Mission B (worktree PROBE, ISSUES #31): tests the SAME winner/blend rule
// Mission A solved for AERIAL_ACE's clone-over-real overlap, applied to the
// turn9 QUICK_ATTACK hitsplat: RAM-confirmed (tools/probe/
// dump-quickattack-hitsplat-oam.py, this session) the hitsplat (slot 7)
// sits at final gMain.oamBuffer index 9, Onix's own real mon sprite (slot 6)
// at index 10 - LOWER index wins, i.e. the hitsplat wins EVERY tie with
// Onix's sprite for its entire RAM-live span (10934-10943), unconditionally.
// So target2 (the blend's "bottom" color) should be the field BENEATH THE
// ENTIRE OBJ LAYER wherever the hitsplat's own texel is opaque - Onix's own
// sprite should NEVER show through there, regardless of shake offset -
// computed straight from the static battle-bg asset (same trap Mission A
// named: a "clean" oracle baseline is contaminated by Onix's own sprite
// already sitting there, per docs/turn9-shake-notes.md's own citation of
// this exact trap already suspected: "whether trueBg... is itself a valid
// stand-in... once affine edge rounding is accounted for").
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import battleAnimHitsplatAsset from "../../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };

const hitsplat = battleAnimHitsplatAsset as {
  tileset: { columns: number; rows: number; tiles: (number[] | null)[] };
  palette: { r: number; g: number; b: number }[];
};
const W = hitsplat.tileset.columns * 8;
const H = hitsplat.tileset.rows * 8;
const HALF_W = W / 2;
const HALF_H = H / 2;
const MATRIX = 303;
const OX = 72 - 16;
const OY = 88 - 16;

function tileIndexAt(sx: number, sy: number): number | null {
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) return null;
  const tileRow = Math.floor(sy / 8);
  const tileCol = Math.floor(sx / 8);
  const tile = hitsplat.tileset.tiles[tileRow * hitsplat.tileset.columns + tileCol];
  if (!tile) return null;
  return tile[(sy % 8) * 8 + (sx % 8)]!;
}
function hitsplatIdxAt(x: number, y: number): number | null {
  const dx = x - OX;
  const dy = y - OY;
  const rx = dx - HALF_W;
  const ry = dy - HALF_H;
  const sx = ((rx * MATRIX) >> 8) + HALF_W;
  const sy = ((ry * MATRIX) >> 8) + HALF_H;
  return tileIndexAt(sx, sy);
}

type Rgb = { r: number; g: number; b: number };
function staticFieldPixel(x: number, y: number): Rgb {
  const bg = battleBgAsset as any;
  const tilemap = bg.static.tilemap;
  const inTileY = ((y % 8) + 8) % 8;
  const blockWidth = tilemap.width * 8;
  const period = blockWidth * 2;
  const wrappedX = ((x % period) + period) % period;
  const block = wrappedX >= blockWidth ? 1 : 0;
  const localX = wrappedX % blockWidth;
  const tileRow = Math.floor(y / 8) + block * 32;
  const tileCol = Math.floor(localX / 8);
  const inTileX = localX % 8;
  const entry = tilemap.entries[tileRow * tilemap.width + tileCol];
  const tile = bg.static.tileset.tiles[entry.tile];
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  const idx = tile[sy * 8 + sx];
  return bg.palette[entry.palette][idx];
}

function blend8bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}
function blend5bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const d = (t8: number, b8: number) => {
    const t5 = t8 >> 3, b5 = b8 >> 3;
    const out5 = Math.min(31, Math.floor((t5 * eva + b5 * evb) / 16));
    return (out5 << 3) | (out5 >> 2);
  };
  return { r: d(top.r, bottom.r), g: d(top.g, bottom.g), b: d(top.b, bottom.b) };
}

const HITSPLAT_BOX = { x0: 56, x1: 88, y0: 72, y1: 104 };
const TICKS = [10935, 10936, 10937, 10938, 10939, 10940, 10941, 10942, 10943, 10944]; // the hitsplat's FULL RAM-live+1 render span

async function main() {
  const trace = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-turn9-dense.json", "utf8")) as Trace;
  trace.captureFrames = TICKS;
  const { captures } = await runOracleTrace(trace);
  const byFrame = new Map(captures.map((c) => [c.frame, PNG.sync.read(c.png)]));

  const COMBOS: { label: string; eva: number; evb: number; fn: typeof blend8bit }[] = [
    { label: "8bit-eva16-evb16", eva: 16, evb: 16, fn: blend8bit },
    { label: "8bit-eva12-evb8", eva: 12, evb: 8, fn: blend8bit },
    { label: "5bit-eva16-evb16", eva: 16, evb: 16, fn: blend5bit },
    { label: "5bit-eva12-evb8", eva: 12, evb: 8, fn: blend5bit },
  ];

  for (const t of TICKS) {
    const img = byFrame.get(t)!;
    console.log(`\n=== tick ${t} ===`);
    const totals = new Map(COMBOS.map((c) => [c.label, 0]));
    let opaqueCount = 0;
    const mismatchExamples: Record<string, string[]> = {};
    for (const c of COMBOS) mismatchExamples[c.label] = [];
    for (let y = HITSPLAT_BOX.y0; y < HITSPLAT_BOX.y1; y++) {
      for (let x = HITSPLAT_BOX.x0; x < HITSPLAT_BOX.x1; x++) {
        const idx = hitsplatIdxAt(x, y);
        if (idx === null || idx === 0) continue; // transparent -> field shows through untouched, not this rule's claim
        opaqueCount++;
        const texel = hitsplat.palette[idx]!;
        const field = staticFieldPixel(x, y);
        const o = (y * 240 + x) * 4;
        const oracle = { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
        for (const c of COMBOS) {
          const predicted = c.fn(texel, field, c.eva, c.evb);
          const ok = predicted.r === oracle.r && predicted.g === oracle.g && predicted.b === oracle.b;
          if (!ok) {
            totals.set(c.label, totals.get(c.label)! + 1);
            if (mismatchExamples[c.label]!.length < 3) {
              mismatchExamples[c.label]!.push(`(${x},${y}) idx=${idx} texel=(${texel.r},${texel.g},${texel.b}) field=(${field.r},${field.g},${field.b}) predicted=(${predicted.r},${predicted.g},${predicted.b}) oracle=(${oracle.r},${oracle.g},${oracle.b})`);
            }
          }
        }
      }
    }
    console.log(`opaque hitsplat pixels this tick: ${opaqueCount}`);
    for (const c of COMBOS) {
      console.log(`  ${c.label}: ${totals.get(c.label)} mismatches`);
      if (totals.get(c.label)! > 0) for (const e of mismatchExamples[c.label]!) console.log(`      ${e}`);
    }
  }
}

main();
