// §7.21: verify the RAM-probed fix (accumulator logicalOffset+1, plus a
// literal y2 table) reproduces the oracle's exact-tint silhouette set
// bit-for-bit across the whole 1481-1492 ramp window.
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

function renderTintSet(accumulator, y2) {
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
      if (isOpaque(sx, sy)) set.add((dy + y2) * W + dx);
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

// RAM-probed pairs, RAM tick (render-1) -> (accumulator, y2)
const RAM = {
  1480: { acc: 58, y2: 14 },
  1481: { acc: 76, y2: 13 },
  1482: { acc: 94, y2: 12 },
  1483: { acc: 112, y2: 11 },
  1484: { acc: 130, y2: 10 },
  1485: { acc: 148, y2: 9 },
  1486: { acc: 166, y2: 8 },
  1487: { acc: 184, y2: 7 },
  1488: { acc: 202, y2: 5 },
  1489: { acc: 220, y2: 4 },
  1490: { acc: 238, y2: 3 },
  1491: { acc: 256, y2: 2 },
  1492: { acc: 256, y2: 0 },
};

for (const [ramTickStr, { acc, y2 }] of Object.entries(RAM)) {
  const R = Number(ramTickStr) + 1;
  const png = oracle(R);
  const oSet = oracleTintSet(png);
  const rSet = renderTintSet(acc, y2);
  const d = diffCount(rSet, oSet);
  console.log(`render ${R}: RAM(acc=${acc},y2=${y2}) oracleTintPx=${oSet.size} ourTintPx=${rSet.size} diff=${d}`);
}
