// Scratch diagnostic (S7 slice R rung (c3) follow-up, bounded-worker probe
// session): brute-forces every (eva, evb) coefficient pair in BOTH plausible
// blend-precision domains against the hitsplat's own real oracle pixels, to
// test whether the tip/edge residual (docs/turn9-shake-notes.md §41's own
// "150-380px/tick") is just a wrong eva/evb constant.
//
// Motivation: fresh RAM probing this session (tools/probe/dump-hitsplat-
// attrs.py) found the hitsplat sprite genuinely uses REAL hardware alpha
// blending during its whole RAM-live span (10934-10943) - `objMode=1`
// (semi-transparent OBJ), `BLDCNT=0x3f40` (blend mode=01 alpha, target2=ALL
// of BG0-3+OBJ+BD), `BLDALPHA=0x080c` -> eva=12,evb=8. The CURRENT engine
// code (`drawTurn9Hitsplat`/`drawSpriteSheetAffineStretchBlendedOverFb`)
// doesn't read any of this from RAM - it hardcodes eva=16,evb=16
// unconditionally, a constant that traces back to a stale value on
// `drawSpriteSheetAffineStretchBlendedOverFb`'s own doc comment (written for
// the QUICK_ATTACK afterimage-clone use case, never re-verified for the
// hitsplat's own call site).
//
// Result (see docs/turn9-shake-notes.md's dated append for the full write-
// up): NEITHER domain (blendChannel's own already-validated 8-bit-direct
// convention, nor the true-hardware 5-bit-then-expand convention
// paletteFade.ts already uses elsewhere) reaches a clean fit at ANY eva/evb
// in 0-16 - best is ~62% pixel-exact over three unshifted, hitsplat-live
// ticks. This is a DECISIVE ELIMINATION: the residual is not simply a wrong
// eva/evb constant on top of an otherwise-correct model. The eva=12/evb=8
// RAM fact is still real and worth fixing (the current 16/16 is definitely
// not what hardware uses), but something else - most likely the assumed
// background/target-2 itself - is also wrong, an entangled gap this session
// did not fully unravel.
//
// Usage: node --experimental-strip-types tools/compare/scratch/diag-turn9-hitsplat-blendfit.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
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
const MATRIX = 303; // RAM-confirmed flat throughout the hitsplat's whole life, see dump-endeavor-hitsplat-shake.py re-run this session
const OX = 72 - 16;
const OY = 88 - 16;
const HITSPLAT_BOX = { x0: 56, x1: 88, y0: 72, y1: 104 };
// Render ticks where Onix's own x2 shake is INACTIVE (x2=0, matching BG_TICK's
// own pose) - turn9Ep1OnixShakeX2's own render-offset set is {64,67,68,71,72}
// relative to pressTick, i.e. render {10935,10938,10939,10942,10943} are
// shifted; these three are not.
const BG_TICK = 10934;
const TICKS = [10936, 10937, 10944];

function tileIndexAt(sx: number, sy: number): number | null {
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) return null;
  const tileRow = Math.floor(sy / 8);
  const tileCol = Math.floor(sx / 8);
  const tile = TILESET.tiles[tileRow * TILESET.columns + tileCol];
  return tile ? tile[(sy % 8) * 8 + (sx % 8)]! : null;
}
function sampleFloor(dx: number, dy: number): number | null {
  const rx = dx - HALF_W;
  const ry = dy - HALF_H;
  const sx = ((rx * MATRIX) >> 8) + HALF_W;
  const sy = ((ry * MATRIX) >> 8) + HALF_H;
  return tileIndexAt(sx, sy);
}
function pngToRgba(png: Buffer): Buffer {
  return PNG.sync.read(png).data;
}
function pixelAt(rgba: Buffer, x: number, y: number): [number, number, number] {
  const i = (y * 240 + x) * 4;
  return [rgba[i]!, rgba[i + 1]!, rgba[i + 2]!];
}

// `blendChannel`'s own already-validated convention (battleScene.ts): runs
// directly on already-8-bit-expanded components.
function blend8bit(tgt1: number, tgt2: number, eva: number, evb: number): number {
  return Math.min(255, Math.floor((tgt1 * eva + tgt2 * evb) / 16));
}
// True-hardware GBATEK convention (paletteFade.ts's own already-validated
// shape elsewhere): blend in 5-bit palette-color space, then expand.
function blend5bit(tgt1_8: number, tgt2_8: number, eva: number, evb: number): number {
  const c1 = tgt1_8 >> 3;
  const c2 = tgt2_8 >> 3;
  const blended5 = Math.min(31, Math.floor((c1 * eva + c2 * evb) / 16));
  return (blended5 << 3) | (blended5 >> 2);
}

async function main() {
  const trace = JSON.parse(readFileSync("tools/compare/traces/turn9-quickattack-b.json", "utf8")) as Trace;
  trace.captureFrames = [BG_TICK, ...TICKS];
  const oracleResult = await runOracleTrace(trace);
  const oracleByFrame = new Map(oracleResult.captures.map((c) => [c.frame, pngToRgba(c.png)]));
  const trueBg = oracleByFrame.get(BG_TICK)!; // ground truth, pre-hitsplat, x2=0 pose, already-0-diff frame

  const samples: { idx: number; bg: [number, number, number]; oc: [number, number, number] }[] = [];
  for (const t of TICKS) {
    const oracleRgba = oracleByFrame.get(t)!;
    for (let y = HITSPLAT_BOX.y0; y < HITSPLAT_BOX.y1; y++) {
      for (let x = HITSPLAT_BOX.x0; x < HITSPLAT_BOX.x1; x++) {
        const idx = sampleFloor(x - OX, y - OY);
        if (idx === null || idx === 0) continue; // transparent/out-of-bounds, no blend to test
        samples.push({ idx, bg: pixelAt(trueBg, x, y), oc: pixelAt(oracleRgba, x, y) });
      }
    }
  }
  console.log(`opaque samples across ${TICKS.length} unshifted hitsplat-live ticks: ${samples.length}`);

  const results: { domain: "8bit" | "5bit"; eva: number; evb: number; matches: number }[] = [];
  for (const domain of ["8bit", "5bit"] as const) {
    const blend = domain === "8bit" ? blend8bit : blend5bit;
    for (let eva = 0; eva <= 16; eva++) {
      for (let evb = 0; evb <= 16; evb++) {
        let matches = 0;
        for (const s of samples) {
          const c = PALETTE[s.idx]!;
          const pred: [number, number, number] = [blend(c.r, s.bg[0], eva, evb), blend(c.g, s.bg[1], eva, evb), blend(c.b, s.bg[2], eva, evb)];
          if (pred[0] === s.oc[0] && pred[1] === s.oc[1] && pred[2] === s.oc[2]) matches++;
        }
        results.push({ domain, eva, evb, matches });
      }
    }
  }
  results.sort((a, b) => b.matches - a.matches);
  console.log(`best fit: ${JSON.stringify(results[0])} / ${samples.length} (${((100 * results[0]!.matches) / samples.length).toFixed(1)}%)`);
  console.log("top 15:", results.slice(0, 15));
  console.log(`\nRAM-confirmed real value (dump-hitsplat-attrs.py): domain=8bit-or-5bit(untested-by-hardware-directly) eva=12 evb=8`);
  const ramConfirmed = results.find((r) => r.eva === 12 && r.evb === 8 && r.domain === "8bit");
  const ramConfirmed5 = results.find((r) => r.eva === 12 && r.evb === 8 && r.domain === "5bit");
  console.log(`  8bit domain @ eva=12/evb=8: ${JSON.stringify(ramConfirmed)}`);
  console.log(`  5bit domain @ eva=12/evb=8: ${JSON.stringify(ramConfirmed5)}`);
}

main();
