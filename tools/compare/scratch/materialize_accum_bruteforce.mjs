// §7.21 investigation: brute-force which accumulator value (0x10000/accumulator
// matrix convention, mechanism 4's own drawSpriteSheetAffineTinted formula)
// makes our renderer's tint-silhouette bit-exact against the oracle's own
// exact-tint pixel set within the GROVYLE_CORNER crop, per render tick -
// independent of the currently-coded affineEmergeAccumulator(logicalOffset)
// mapping. Then checks whether the winning accumulator, across many ticks,
// lines up with a CONSTANT logical-offset shift from what's currently coded
// (a lag fix, mechanism-level) vs a scattered/inconsistent set (curve-fit,
// not landable).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const TINT = [255, 181, 247];
const isTint = (c) => c[0] === TINT[0] && c[1] === TINT[1] && c[2] === TINT[2];

const asset = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8"));
const tileset = asset.GROVYLE.tileset;
const W = tileset.columns * 8;
const H = tileset.rows * 8;
const halfW = W / 2, halfH = H / 2;

function isOpaque(sx, sy) {
  if (sx < 0 || sx >= W || sy < 0 || sy >= H) return false;
  const tile = tileset.tiles[Math.floor(sy / 8) * tileset.columns + Math.floor(sx / 8)];
  if (!tile) return false;
  return tile[(sy % 8) * 8 + (sx % 8)] !== 0;
}

function renderTintSet(accumulator) {
  const matrixParam = Math.trunc(0x10000 / accumulator);
  const set = new Set();
  for (let dy = 0; dy < H; dy++) {
    const ry = dy - halfH;
    const sy = ((ry * matrixParam) >> 8) + halfH;
    if (sy < 0 || sy >= H) continue;
    for (let dx = 0; dx < W; dx++) {
      const rx = dx - halfW;
      const sx = ((rx * matrixParam) >> 8) + halfW;
      if (sx < 0 || sx >= W) continue;
      if (isOpaque(sx, sy)) set.add(dy * W + dx);
    }
  }
  return set;
}

function oracleTintSet(png) {
  const set = new Set();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = ((CORNER.y + y) * 240 + (CORNER.x + x)) * 4;
      const c = [png.data[i], png.data[i + 1], png.data[i + 2]];
      if (isTint(c)) set.add(y * W + x);
    }
  }
  return set;
}

function diffCount(a, b) {
  let d = 0;
  for (const v of a) if (!b.has(v)) d++;
  for (const v of b) if (!a.has(v)) d++;
  return d;
}

function oracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

const handoffTick = 1462;
const START_OFFSET = 19;
const ticks = Array.from({ length: 13 }, (_, i) => 1481 + i); // 1481..1493

for (const R of ticks) {
  const et = R - handoffTick;
  const currentLogicalOffset = et - START_OFFSET;
  const png = oracle(R);
  const oSet = oracleTintSet(png);
  let best = null;
  for (let acc = 1; acc <= 256; acc++) {
    const rSet = renderTintSet(acc);
    const d = diffCount(rSet, oSet);
    if (best === null || d < best.d) best = { acc, d };
    if (d === 0) break;
  }
  console.log(`render ${R}: currentLogicalOffset=${currentLogicalOffset} oracleTintPx=${oSet.size} bestAcc=${best.acc} bestDiff=${best.d}`);
}
