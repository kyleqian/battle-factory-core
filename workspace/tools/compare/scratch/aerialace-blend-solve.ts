// Mission A2 (worktree PROBE follow-up, docs/aerial-ace-notes.md): with the
// OAM-index winner now RAM-pinned (tools/probe/dump-aerialace-oam.py: slot 7
// — the clone at offset (24,6) — sits at final OAM index 10, the real
// sprite (slot 5) at 11/12, STABLE across renders 12367-12373, clone always
// wins), solve the blend numerically: predicted = floor((winnerTexel_8bit *
// eva + target2_8bit * evb) / 16), target2 = the BG-only pixel color (the
// real sprite, having LOST the OBJ contest, contributes nothing — GBA OBJ
// hardware outputs exactly one color per pixel into the blend unit, so a
// losing same-layer OBJ can never be blend target 2).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";
import opponentFrontSpritesAsset from "../../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import battleBgAsset from "../../../src/assets/gen/battle-bg.json" with { type: "json" };

const trace = JSON.parse(
  readFileSync("tools/compare/traces-groundtruth/battle1-turn10-dense.json", "utf8"),
) as Trace;
trace.captureFrames = [12368, 12369, 12370, 12371, 12372, 12373];

const { captures } = await runOracleTrace(trace);
const byFrame = new Map(captures.map((c) => [c.frame, PNG.sync.read(c.png)]));

type Rgb = { r: number; g: number; b: number };
function pixelAt(img: PNG, x: number, y: number): Rgb {
  const o = (y * 240 + x) * 4;
  return { r: img.data[o]!, g: img.data[o + 1]!, b: img.data[o + 2]! };
}
function blendPaletteFormula(c: Rgb, target: Rgb, coeff: number): Rgb {
  const b = (v: number, t: number) => v + (((t - v) * coeff) >> 4);
  return { r: b(c.r, target.r), g: b(c.g, target.g), b: b(c.b, target.b) };
}
const BLACK: Rgb = { r: 0, g: 0, b: 0 };
// floor((top*eva + bottom*evb)/16), the 8-bit-domain formula pinned in
// docs/battle-scene-notes.md PROGRESS.md #68 (§2, "the exact same formula
// run on the already-8-bit-expanded source colors directly... hits all
// three channels exactly").
function blend8bit(top: Rgb, bottom: Rgb, eva: number, evb: number): Rgb {
  const b = (t: number, btm: number) => Math.min(255, Math.floor((t * eva + btm * evb) / 16));
  return { r: b(top.r, bottom.r), g: b(top.g, bottom.g), b: b(top.b, bottom.b) };
}
function rgbEq(a: Rgb, b: Rgb): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}
function fmt(c: Rgb): string {
  return `(${c.r},${c.g},${c.b})`;
}

const pidgeotto = (opponentFrontSpritesAsset as any).PIDGEOTTO;
const pidgeottoPalette: Rgb[] = pidgeotto.palette;
const pidgeottoPaletteDark: Rgb[] = pidgeottoPalette.map((c: Rgb) => (c ? blendPaletteFormula(c, BLACK, 10) : c));

function texelIdx(localX: number, localY: number): number | undefined {
  const tx = Math.floor(localX / 8);
  const ty = Math.floor(localY / 8);
  if (tx < 0 || ty < 0 || tx >= pidgeotto.tileset.columns || ty >= pidgeotto.tileset.rows) return undefined;
  const tile = pidgeotto.tileset.tiles[ty * pidgeotto.tileset.columns + tx];
  if (!tile) return 0;
  return tile[(localY % 8) * 8 + (localX % 8)];
}

const REAL_CORNER = { x: 144, y: 19 }; // slot 5, offset (0,0) throughout this window
const CLONE7_OFFSET = { x: 24, y: 6 }; // slot 7 relative to slot 5

const EVA = 12, EVB = 8; // BLDALPHA=0x080c, RAM-confirmed

// eva=12,evb=8 sum to 20, so the formula's own natural ceiling if bottom==top
// is >255 for some channels - Math.min(255,...) saturation is expected to
// engage exactly on the saturated-red-channel case the doc flagged.

// Darken plateau is RAM/render 12368-12370 (0 lag, per the doc's own dated
// section) - confirmed pixel-side too: oracle's own (181,41) color is
// IDENTICAL at 12368/12369/12370, only changing at 12371.
const DARKEN_TICKS = new Set([12368, 12369, 12370]);

// target2 = the CLEAN FIELD pixel (shiftY=0, fadeY=0 by turn 10 — both
// rockSlideBg3Y/turn5BgFadeY have long settled back to their tables'
// out-of-range default of 0 — so `staticBgPixel`'s own formula in
// battleScene.ts:1205 reduces to a direct tilemap lookup at (screenX,
// screenY) verbatim). Reimplemented here read-only from the same asset
// JSON (no src/ import — battleScene.ts doesn't export the internal
// helper, and this worktree lane may not touch src/). NOT sampled from an
// oracle frame — every candidate "clean" tick in this trace already has
// Pidgeotto's own settled sprite sitting exactly on top of this bbox, so
// there is no oracle frame where these pixels are BG-only.
function staticFieldPixel(x: number, y: number, dark: boolean): Rgb {
  const bg = battleBgAsset as any;
  const tilemap = bg.static.tilemap;
  const inTileY = ((y % 8) + 8) % 8;
  const blockWidth = tilemap.width * 8;
  const period = blockWidth * 2; // BG_PERIOD: static's own 2 side-by-side 32x32 blocks (512px)
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
  const plain = bg.palette[entry.palette][idx];
  return dark ? blendPaletteFormula(plain, BLACK, 10) : plain;
}

const SAMPLE_SETS: Record<number, [number, number][]> = {
  12370: [[181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44]],
  12371: [[181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44]],
  12372: [[181, 41], [182, 41], [180, 42], [183, 44], [186, 44], [187, 44]],
  12373: [[181, 41], [182, 41], [180, 42]],
  12368: [[181, 41], [182, 41], [183, 44], [186, 44]],
  12369: [[181, 41], [182, 41], [183, 44], [186, 44]],
};

let allOk = true;
for (const [tickStr, pixels] of Object.entries(SAMPLE_SETS)) {
  const tick = Number(tickStr);
  const img = byFrame.get(tick)!;
  const darken = DARKEN_TICKS.has(tick);
  console.log(`\n=== render ${tick} (darken=${darken}) ===`);
  for (const [x, y] of pixels) {
    const realLocal = { x: x - REAL_CORNER.x, y: y - REAL_CORNER.y };
    const cloneLocal = { x: realLocal.x - CLONE7_OFFSET.x, y: realLocal.y - CLONE7_OFFSET.y };
    const cloneIdx = texelIdx(cloneLocal.x, cloneLocal.y);
    const realIdx = texelIdx(realLocal.x, realLocal.y);
    if (!cloneIdx) {
      console.log(`  (${x},${y}) clone texel transparent (idx=${cloneIdx}) — real should win outright here, not a blend case; skipping`);
      continue;
    }
    const palette = darken ? pidgeottoPaletteDark : pidgeottoPalette;
    const winnerTexel = palette[cloneIdx]!;
    // target2: the field-only pixel underneath — the real sprite LOST the
    // OBJ-layer contest outright (GBA/mGBA's OBJ layer outputs exactly one
    // color per pixel, so a losing same-layer sprite can never be blend
    // target 2), so target2 is whatever's below the whole OBJ layer: the
    // static field background, computed straight from the asset (see
    // staticFieldPixel's own doc comment — no clean oracle frame exists
    // for these pixels, Pidgeotto's own settled sprite covers them in
    // every candidate baseline tick too).
    const target2 = staticFieldPixel(x, y, darken);
    const predicted = blend8bit(winnerTexel, target2, EVA, EVB);
    const oracle = pixelAt(img, x, y);
    const ok = rgbEq(predicted, oracle);
    if (!ok) allOk = false;
    console.log(
      `  (${x},${y}) real#${realIdx} clone#${cloneIdx} winnerTexel=${fmt(winnerTexel)} target2=${fmt(target2)} ` +
        `predicted=${fmt(predicted)} oracle=${fmt(oracle)} ${ok ? "MATCH" : "MISMATCH"}`,
    );
  }
}
console.log(`\n${allOk ? "ALL SAMPLE PIXELS MATCH EXACTLY" : "SOME MISMATCHES — rule not fully solved"}`);
process.exit(allOk ? 0 : 1);
