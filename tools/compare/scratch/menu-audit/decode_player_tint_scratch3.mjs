import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
const FRAME_DIR = "/tmp/menu-dense-baseline";
function loadPng(tick, prefix) { return PNG.sync.read(readFileSync(`${FRAME_DIR}/${prefix}-${String(tick).padStart(5, "0")}.png`)); }

const onix = JSON.parse(readFileSync("src/assets/gen/battle-back-sprites.json", "utf8")).ONIX;
const tileset = onix.tileset;
const palette = onix.palette;
const W = tileset.columns * 8, H = tileset.rows * 8;
const CORNER = { x: 40, y: 48 };
const TINT = { r: 255, g: 181, b: 247 };

function blendComponentToward(c8, t8, coeff) {
  const c5 = c8 >> 3, t5 = t8 >> 3;
  const b5 = c5 + (((t5 - c5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

function texel(tx, ty) {
  const tile = tileset.tiles[Math.floor(ty / 8) * tileset.columns + Math.floor(tx / 8)];
  if (!tile) return null;
  const idx = tile[(ty % 8) * 8 + (tx % 8)];
  if (idx === 0) return null;
  return palette[idx];
}

for (let R = 1663; R <= 1702; R++) {
  const png = loadPng(R, "oracle");
  let best = null;
  for (let y2 = -5; y2 <= 15; y2++) {
    for (let coeff = 0; coeff <= 16; coeff++) {
      let matched = 0, total = 0;
      for (let ty = 0; ty < H; ty++) {
        for (let tx = 0; tx < W; tx++) {
          const c = texel(tx, ty);
          if (!c) continue;
          const px = CORNER.x + tx, py = CORNER.y + ty + y2;
          if (px < 0 || px >= 240 || py < 0 || py >= 160) continue;
          total++;
          const i = (py * 240 + px) * 4;
          const or_ = png.data[i], og = png.data[i+1], ob = png.data[i+2];
          const r = blendComponentToward(c.r, TINT.r, coeff);
          const g = blendComponentToward(c.g, TINT.g, coeff);
          const b = blendComponentToward(c.b, TINT.b, coeff);
          if (r === or_ && g === og && b === ob) matched++;
        }
      }
      if (best === null || matched > best.matched) best = { y2, coeff, matched, total };
    }
  }
  console.log(`render ${R}: y2=${best.y2} coeff=${best.coeff} matched=${best.matched}/${best.total}`);
}
