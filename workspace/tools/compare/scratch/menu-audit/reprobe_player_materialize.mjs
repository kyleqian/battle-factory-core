import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
// Re-derivation with the FULL current stack in place (BG fade #99 + particle
// burst #101 both already landed) - #98's original local+2 accumulator lead
// was brute-forced BEFORE those existed, so its diff signal could have been
// contaminated. Re-run the same oracle-exact-tint-pixel-SET brute force
// (§7.21/§7.20-precedent method) against freshly captured oracle PNGs.
const FRAME_DIR = "/tmp/menu-dense-baseline";
function loadPng(tick) { return PNG.sync.read(readFileSync(`${FRAME_DIR}/oracle-${String(tick).padStart(5, "0")}.png`)); }

const CORNER = { x: 40, y: 48 };
const TINT = [255, 181, 247];
const isTint = (r,g,b) => r === TINT[0] && g === TINT[1] && b === TINT[2];

const onix = JSON.parse(readFileSync("src/assets/gen/battle-back-sprites.json", "utf8")).ONIX;
const tileset = onix.tileset;
const W = tileset.columns * 8, H = tileset.rows * 8;
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
    const ry = dy - halfH;
    const sy = ((ry * matrixParam) >> 8) + halfH;
    if (sy < 0 || sy >= H) continue;
    for (let dx = 0; dx < W; dx++) {
      const rx = dx - halfW;
      const sx = ((rx * matrixParam) >> 8) + halfW;
      if (sx < 0 || sx >= W) continue;
      if (isOpaque(sx, sy)) set.add((dy + yOff) * 1000 + dx);
    }
  }
  return set;
}

function oracleTintSet(png) {
  const set = new Set();
  for (let y = 0; y < H + 30; y++) {
    for (let x = 0; x < W; x++) {
      const i = ((CORNER.y + y) * 240 + (CORNER.x + x)) * 4;
      if (isTint(png.data[i], png.data[i+1], png.data[i+2])) set.add(y * 1000 + x);
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

const ticks = [1653,1654,1655,1656,1657,1658,1659,1660,1661,1662,1663,1664,1665];
for (const R of ticks) {
  const png = loadPng(R);
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
