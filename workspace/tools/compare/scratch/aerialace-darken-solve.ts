// Mission A (worktree PROBE, docs/aerial-ace-notes.md's "darken-plateau
// residual, NOT closed" section): re-run the already-solved overlap-blend
// rule (clone wins outright at true overlap, winner blends against the
// field, eva=12/evb=8, 8-bit domain, saturating 255) at the darken-plateau
// pixels — but this time feed it the ACTUAL RAM-read post-darken palette
// bytes (tools/probe/dump-aerialace-darken-palette.py's own gPlttBufferFaded
// read) instead of a recomputed BlendPalette(plain, BLACK, 10) formula,
// per the brief's own named instrument.
//
// Requires /tmp/aerialace-darken-pal.json to already exist (produced by:
//   /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
//     tools/probe/dump-aerialace-darken-palette.py \
//     tools/compare/traces-groundtruth/battle1-turn10-dense.json \
//     /tmp/aerialace-darken-pal.json 12366 12372
// ), not regenerated here (this script is pixel/RAM-JSON only, no mgba-venv
// python dependency of its own).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import opponentFrontSpritesAsset from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };

type Rgb = { r: number; g: number; b: number };

const ramDump = JSON.parse(readFileSync("/tmp/aerialace-darken-pal.json", "utf8")) as {
  ticks: { tick: number; objFadedRgb: [number, number, number][]; bgFadedRgb: [number, number, number][] }[];
};
const ramByTick = new Map(ramDump.ticks.map((t) => [t.tick, t]));

const trace = JSON.parse(
  readFileSync("tools/compare/traces-groundtruth/battle1-turn10-dense.json", "utf8"),
) as Trace;
trace.captureFrames = [12368, 12369, 12370];
const { captures } = await runOracleTrace(trace);
const byFrame = new Map(captures.map((c) => [c.frame, PNG.sync.read(c.png)]));

function pixelAt(img: PNG, x: number, y: number): Rgb {
  const o = (y * 240 + x) * 4;
  return { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
}
function blend8bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}
function fmt(c: Rgb): string {
  return `(${c.r},${c.g},${c.b})`;
}

const pidgeotto = (opponentFrontSpritesAsset as any).PIDGEOTTO;
function texelIdx(localX: number, localY: number): number | undefined {
  const tx = Math.floor(localX / 8);
  const ty = Math.floor(localY / 8);
  if (tx < 0 || ty < 0 || tx >= pidgeotto.tileset.columns || ty >= pidgeotto.tileset.rows) return undefined;
  const tile = pidgeotto.tileset.tiles[ty * pidgeotto.tileset.columns + tx];
  if (!tile) return 0;
  return tile[(localY % 8) * 8 + (localX % 8)];
}

const REAL_CORNER = { x: 144, y: 19 };
const CLONE7_OFFSET = { x: 24, y: 6 };
const EVA = 12, EVB = 8;

// Same static-field tile lookup as aerialace-blend-solve.ts's own
// staticFieldPixel, but returns the raw tile-local palette INDEX instead of
// resolving a color — the color now comes from the RAM-read bgFadedRgb
// array, not a recomputed BlendPalette darken.
function staticFieldTileIdx(x: number, y: number): number {
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
  if (entry.palette !== 0) throw new Error(`unexpected non-zero local palette ${entry.palette} at (${x},${y})`);
  const tile = bg.static.tileset.tiles[entry.tile];
  const sx = entry.hFlip ? 7 - inTileX : inTileX;
  const sy = entry.vFlip ? 7 - inTileY : inTileY;
  return tile[sy * 8 + sx];
}

const SAMPLE_SETS: Record<number, [number, number][]> = {
  12368: [[181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44]],
  12369: [[181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44]],
  12370: [[181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44]],
};

let allOk = true;
for (const [tickStr, pixels] of Object.entries(SAMPLE_SETS)) {
  const renderTick = Number(tickStr);
  // The +1 lag this session discovered: gPlttBufferFaded's software write at
  // RAM tick T becomes visible in hardware PALRAM (and thus pixels) at
  // render tick T+1 — so render tick `renderTick`'s palette source is the
  // RAM dump's tick `renderTick - 1`, NOT the same-numbered tick (see the
  // dossier update for the two-buffer discrepancy that revealed this).
  const ramTick = renderTick - 1;
  const ramRow = ramByTick.get(ramTick);
  if (!ramRow) throw new Error(`missing RAM tick ${ramTick} in dump`);
  const img = byFrame.get(renderTick)!;
  console.log(`\n=== render ${renderTick} (palette source = RAM tick ${ramTick}) ===`);
  for (const [x, y] of pixels) {
    const realLocal = { x: x - REAL_CORNER.x, y: y - REAL_CORNER.y };
    const cloneLocal = { x: realLocal.x - CLONE7_OFFSET.x, y: realLocal.y - CLONE7_OFFSET.y };
    const cloneIdx = texelIdx(cloneLocal.x, cloneLocal.y);
    if (!cloneIdx) {
      console.log(`  (${x},${y}) clone texel transparent — not a blend case, skipping`);
      continue;
    }
    const winnerTexel = ramRow.objFadedRgb[cloneIdx]!;
    const winnerTexelRgb: Rgb = { r: winnerTexel[0], g: winnerTexel[1], b: winnerTexel[2] };
    const tileIdx = staticFieldTileIdx(x, y);
    const target2Raw = ramRow.bgFadedRgb[tileIdx]!;
    const target2: Rgb = { r: target2Raw[0], g: target2Raw[1], b: target2Raw[2] };
    const predicted = blend8bit(winnerTexelRgb, target2, EVA, EVB);
    const oracle = pixelAt(img, x, y);
    const ok = predicted.r === oracle.r && predicted.g === oracle.g && predicted.b === oracle.b;
    if (!ok) allOk = false;
    console.log(
      `  (${x},${y}) cloneIdx=${cloneIdx} winnerTexel(RAM)=${fmt(winnerTexelRgb)} tileIdx=${tileIdx} target2(RAM)=${fmt(target2)} ` +
        `predicted=${fmt(predicted)} oracle=${fmt(oracle)} ${ok ? "MATCH" : "MISMATCH"}`,
    );
  }
}
console.log(`\n${allOk ? "ALL SAMPLE PIXELS MATCH EXACTLY" : "SOME MISMATCHES"}`);

// --- Formula-only cross-check (no RAM dump needed): the root cause of the
// prior session's failed brute-force wasn't the coefficient (10, already
// correct) — it's the BIT DOMAIN. BlendPalette operates on the raw 5-bit
// BGR555 palette components (hardware natively 5 bits/channel), not on the
// already-8-bit-expanded asset colors. Since every asset color here is an
// EXACT expansion of a real 5-bit source (`(v5<<3)|(v5>>2)`), inverting via
// `>>3` recovers the original 5-bit value losslessly (the low 3 bits an
// expansion adds are always < 8, so integer-dividing by 8 discards exactly
// them) — letting this be verified from committed asset JSON alone, no RAM.
function to5bit(v8: number): number {
  return v8 >> 3;
}
function from5bit(v5: number): number {
  return (v5 << 3) | (v5 >> 2);
}
function darken5(c: Rgb, coeff: number): Rgb {
  const d = (ch: number) => {
    const v5 = to5bit(ch);
    const out5 = v5 + (((0 - v5) * coeff) >> 4);
    return from5bit(out5);
  };
  return { r: d(c.r), g: d(c.g), b: d(c.b) };
}

console.log("\n=== formula-only cross-check (asset data + corrected 5-bit-domain darken, NO RAM dump) ===");
let formulaOk = true;
const pidgeottoPalette: Rgb[] = pidgeotto.palette;
for (const [tickStr, pixels] of Object.entries(SAMPLE_SETS)) {
  const renderTick = Number(tickStr);
  const img = byFrame.get(renderTick)!;
  for (const [x, y] of pixels) {
    const realLocal = { x: x - REAL_CORNER.x, y: y - REAL_CORNER.y };
    const cloneLocal = { x: realLocal.x - CLONE7_OFFSET.x, y: realLocal.y - CLONE7_OFFSET.y };
    const cloneIdx = texelIdx(cloneLocal.x, cloneLocal.y);
    if (!cloneIdx) continue;
    const winnerTexel = darken5(pidgeottoPalette[cloneIdx]!, 10);
    const tileIdx = staticFieldTileIdx(x, y);
    const bg = battleBgAsset as any;
    const plainField: Rgb = bg.palette[0][tileIdx];
    const target2 = darken5(plainField, 10);
    const predicted = blend8bit(winnerTexel, target2, EVA, EVB);
    const oracle = pixelAt(img, x, y);
    const ok = predicted.r === oracle.r && predicted.g === oracle.g && predicted.b === oracle.b;
    if (!ok) formulaOk = false;
    console.log(`  render ${renderTick} (${x},${y}) predicted=${fmt(predicted)} oracle=${fmt(oracle)} ${ok ? "MATCH" : "MISMATCH"}`);
  }
}
console.log(`\n${formulaOk ? "FORMULA-ONLY (5-bit-domain darken) MATCHES EXACTLY, NO RAM NEEDED" : "formula-only cross-check has mismatches"}`);
process.exit(allOk && formulaOk ? 0 : 1);
