// Scratch diagnostic (S7 slice R rung (c3) follow-up, bounded-worker probe
// session): pins the hitsplat's own remaining tip/edge residual (docs/
// turn9-shake-notes.md §41's own "150-380px/tick, tips/edges only" gap) by
// replicating `drawSpriteSheetAffineStretchBlendedOverFb`'s exact affine
// sampling formula standalone (the function itself is not exported; this is
// a read-only reimplementation for diagnosis, no src/ change), then testing
// whether a rounding variant (round-to-nearest instead of `>>8` truncation)
// of the same formula reproduces the oracle's own observed pixels at known-
// mismatched destination coordinates - backing out the live background from
// the ALREADY-COMMITTED app's own rendered pixel (same eva=16/evb=16 forced
// additive blend, invertible since `min(255,c+bg)` is exact whenever the
// result is below 255).
//
// Usage: node --experimental-strip-types tools/compare/scratch/diag-turn9-hitsplat-tips.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import { renderAppTrace } from "../appTrace.ts";
import battleAnimHitsplatAsset from "../../../src/assets/gen/battle-anim-hitsplat.json" with { type: "json" };

const asset = battleAnimHitsplatAsset as {
  tileset: { columns: number; rows: number; tiles: number[][] };
  palette: { r: number; g: number; b: number }[];
};

const TILESET = asset.tileset;
const PALETTE = asset.palette;
const W = TILESET.columns * 8;
const H = TILESET.rows * 8;
const HALF_W = W / 2;
const HALF_H = H / 2;
const MATRIX = 303;
const OX = 72 - 16;
const OY = 88 - 16;
// RAM-confirmed (dump-hitsplat-attrs.py, fresh this session): BLDALPHA=0x080c
// during the hitsplat's whole RAM-live span (10934-10943) -> eva=12,evb=8,
// NOT the current code's eva=16/evb=16 (that constant traces back to a stale
// doc-comment value never actually re-verified against BLDALPHA for THIS
// sprite - see dossier). Toggle to 16/16 to reproduce the CURRENT (wrong) engine behavior.
const EVA = Number(process.env.EVA ?? 12);
const EVB = Number(process.env.EVB ?? 8);
const BLEND_5BIT = process.env.BLEND_5BIT === "1";

function blendChannel(tgt1: number, tgt2: number, eva: number, evb: number): number {
  return Math.min(255, Math.floor((tgt1 * eva + tgt2 * evb) / 16));
}

// GBATEK real-hardware alpha blend: computed in 5-bit palette-color space
// (I = MIN(31, I1*EVA + I2*EVB) >> 4), THEN expanded to 8-bit for display -
// NOT the same domain as `blendChannel` above (which runs directly on
// already-8-bit-expanded components; that convention is separately oracle-
// validated for `drawSlideScene`'s own CPU-side blend, per battleScene.ts's
// own doc comment on `blendChannel` - a DIFFERENT mechanism from a genuine
// raster-time BLDCNT/BLDALPHA OBJ blend like this hitsplat's own (RAM-
// confirmed objMode=1, BLDCNT mode=01 alpha, BLDALPHA=eva12/evb8 - see
// dump-hitsplat-attrs.py). This function mirrors `paletteFade.ts`'s own
// already-oracle-validated 5-bit convention instead.
function blendChannel5bit(tgt1_8: number, tgt2_8: number, eva: number, evb: number): number {
  const c1 = tgt1_8 >> 3;
  const c2 = tgt2_8 >> 3;
  const blended5 = Math.min(31, Math.floor((c1 * eva + c2 * evb) / 16));
  return (blended5 << 3) | (blended5 >> 2);
}

function tileIndexAt(sx: number, sy: number): number | null {
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) return null;
  const tileRow = Math.floor(sy / 8);
  const tileCol = Math.floor(sx / 8);
  const tile = TILESET.tiles[tileRow * TILESET.columns + tileCol];
  if (!tile) return null;
  return tile[(sy % 8) * 8 + (sx % 8)]!;
}

// Current engine formula: floor via `>>8` (arithmetic shift, floors toward -inf).
function sampleFloor(dx: number, dy: number): number | null {
  const rx = dx - HALF_W;
  const ry = dy - HALF_H;
  const sx = ((rx * MATRIX) >> 8) + HALF_W;
  const sy = ((ry * MATRIX) >> 8) + HALF_H;
  return tileIndexAt(sx, sy);
}

// Candidate: round-to-nearest instead of floor.
function sampleRound(dx: number, dy: number): number | null {
  const rx = dx - HALF_W;
  const ry = dy - HALF_H;
  const sx = Math.round((rx * MATRIX) / 256) + HALF_W;
  const sy = Math.round((ry * MATRIX) / 256) + HALF_H;
  return tileIndexAt(sx, sy);
}

function pngToRgba(png: Buffer): Buffer {
  return PNG.sync.read(png).data;
}

function pixelAt(rgba: Buffer, x: number, y: number): [number, number, number] {
  const i = (y * 240 + x) * 4;
  return [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!];
}

const HITSPLAT_BOX = { x0: 56, x1: 88, y0: 72, y1: 104 };

async function main() {
  const trace = JSON.parse(readFileSync("tools/compare/traces/turn9-quickattack-b.json", "utf8")) as Trace;
  const BG_TICK = 10934; // last pre-hitsplat tick, already 0-diff, x2=0 pose
  // Onix's own x2 shake is active (x2=5) at render 10935/10938/10939/10942/10943
  // (turn9Ep1OnixShakeX2's own render-offset set) - restrict to UNSHIFTED ticks
  // (x2=0, matching BG_TICK's own pose) so `trueBg` is a valid stand-in.
  const TICKS = [10936, 10937, 10944];
  trace.captureFrames = [BG_TICK, ...TICKS];

  const [oracleResult, appCaptures] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
  const oracleByFrame = new Map(oracleResult.captures.map((c) => [c.frame, pngToRgba(c.png)]));
  const appByFrame = new Map(appCaptures.map((c) => [c.frame, c.rgba]));
  const trueBg = oracleByFrame.get(BG_TICK)!; // ground truth, pre-hitsplat, x2=0 pose

  for (const t of TICKS) {
    const oracleRgba = oracleByFrame.get(t)!;
    const appRgba = appByFrame.get(t)!;
    console.log(`\n=== tick ${t} ===`);
    let mismatchCount = 0; // app (current eva=16/evb=16 engine) vs oracle
    let newFormulaMismatchCount = 0; // this script's own candidate formula (EVA/EVB above) vs oracle, EVERY box pixel
    let roundFixes = 0;
    let floorFixes = 0;
    let neitherMatches = 0;
    const examples: string[] = [];
    for (let y = HITSPLAT_BOX.y0; y < HITSPLAT_BOX.y1; y++) {
      for (let x = HITSPLAT_BOX.x0; x < HITSPLAT_BOX.x1; x++) {
        const oc = pixelAt(oracleRgba, x, y);
        const ac = pixelAt(appRgba as unknown as Buffer, x, y);
        const appMismatch = !(oc[0] === ac[0] && oc[1] === ac[1] && oc[2] === ac[2]);
        if (appMismatch) mismatchCount++;

        const dx = x - OX;
        const dy = y - OY;
        const floorIdx = sampleFloor(dx, dy);
        const roundIdx = sampleRound(dx, dy);
        const bg = pixelAt(trueBg, x, y); // ground-truth pre-hitsplat pixel (ORACLE, not back-solved)

        const predict = (idx: number | null): [number, number, number] | null => {
          if (idx === null || idx === 0) return bg; // out-of-bounds or transparent -> falls through untouched (matches engine's `continue`)
          const c = PALETTE[idx];
          if (!c) return null;
          const blend = BLEND_5BIT ? blendChannel5bit : blendChannel;
          return [blend(c.r, bg[0], EVA, EVB), blend(c.g, bg[1], EVA, EVB), blend(c.b, bg[2], EVA, EVB)];
        };
        const eq = (a: [number, number, number] | null, b: [number, number, number]) =>
          !!a && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

        const floorPred = predict(floorIdx);
        const roundPred = predict(roundIdx);
        const floorMatchesOracle = eq(floorPred, oc);
        const roundMatchesOracle = eq(roundPred, oc);
        if (!floorMatchesOracle) newFormulaMismatchCount++;
        if (appMismatch) {
          if (roundMatchesOracle) roundFixes++;
          if (floorMatchesOracle) floorFixes++;
          if (!roundMatchesOracle && !floorMatchesOracle) neitherMatches++;
        }
        if (!floorMatchesOracle && examples.length < 16) {
          examples.push(
            `(${x},${y}) dx=${dx},dy=${dy} oracle=${oc} app=${ac} bg=${bg} floorIdx=${floorIdx}(newPred=${floorPred},matchesOracle=${floorMatchesOracle})`,
          );
        }
      }
    }
    console.log(
      `OLD(app,eva=16/evb=16) mismatches=${mismatchCount} | NEW(eva=${EVA}/evb=${EVB}) mismatches=${newFormulaMismatchCount} ` +
        `| of the OLD mismatches: floorIdx+newEva/evb now matches oracle=${floorFixes}, round+newEva/evb matches=${roundFixes}, neither=${neitherMatches}`,
    );
    for (const e of examples) console.log("  " + e);
  }
}

main();
