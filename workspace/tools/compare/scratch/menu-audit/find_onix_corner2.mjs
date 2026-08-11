import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
const FRAME_DIR = "/tmp/menu-dense-out";
function loadPng(tick) { return PNG.sync.read(readFileSync(`${FRAME_DIR}/frame-${String(tick).padStart(5, "0")}.png`)); }
const onix = JSON.parse(readFileSync("src/assets/gen/battle-back-sprites.json", "utf8")).ONIX;
const W = onix.tileset.columns * 8, H = onix.tileset.rows * 8;
function bmpPixel(x, y) {
  const tile = onix.tileset.tiles[Math.floor(y / 8) * onix.tileset.columns + Math.floor(x / 8)];
  if (!tile) return null;
  const idx = tile[(y % 8) * 8 + (x % 8)];
  if (idx === 0) return null;
  return onix.palette[idx];
}
function scoreAt(png, ox, oy) {
  let matched = 0, total = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = bmpPixel(x, y);
    if (c === null) continue;
    total++;
    const i = ((oy + y) * png.width + (ox + x)) * 4;
    if (png.data[i]===c.r && png.data[i+1]===c.g && png.data[i+2]===c.b) matched++;
  }
  return { matched, total };
}
for (const tick of [1690,1691,1692,1693,1694,1700,1710,1720,1730,1740]) {
  const png = loadPng(tick);
  let best = { matched: -1 };
  for (let oy = 30; oy <= 70; oy++) {
    const s = scoreAt(png, 40, oy);
    if (s.matched > best.matched) best = { ...s, ox: 40, oy };
  }
  console.log(`tick ${tick}: best ${best.matched}/${best.total} @ y=${best.oy}`);
}

console.log("--- fixed corner (40,48) across 1653-1698 ---");
for (let tick = 1653; tick <= 1698; tick++) {
  const png = loadPng(tick);
  const s = scoreAt(png, 40, 48);
  console.log(`tick ${tick}: ${s.matched}/${s.total}`);
}
