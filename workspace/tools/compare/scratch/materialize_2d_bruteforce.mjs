// §7.21: 2D brute force per tick - accumulator (uniform x=y scale) AND a
// separate vertical DESTINATION-center offset (dstCenterY = halfH + yOff),
// searching for an EXACT (0-diff) match against the oracle's silhouette
// within the crop. If a single (accumulator, yOff) pair exists per tick,
// and yOff is CONSTANT across ticks (or accumulator maps cleanly to a
// consistent logical-offset lag), that's mechanism-level. If yOff varies
// unpredictably per tick, that's a curve-fit signal - stop.
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

function renderTintSet(accumulator, yOff) {
  const matrixParam = Math.trunc(0x10000 / accumulator);
  const set = new Set();
  for (let dy = 0; dy < H; dy++) {
    const ry = dy - (halfH + yOff);
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

const ticks = [1481, 1483, 1485, 1487, 1489, 1491, 1492];
for (const R of ticks) {
  const png = oracle(R);
  const oSet = oracleTintSet(png);
  let best = null;
  for (let acc = 1; acc <= 256; acc++) {
    for (let yOff = -20; yOff <= 20; yOff++) {
      const rSet = renderTintSet(acc, yOff);
      const d = diffCount(rSet, oSet);
      if (best === null || d < best.d) best = { acc, yOff, d };
    }
  }
  console.log(`render ${R}: oracleTintPx=${oSet.size} best acc=${best.acc} yOff=${best.yOff} diff=${best.d}`);
}
