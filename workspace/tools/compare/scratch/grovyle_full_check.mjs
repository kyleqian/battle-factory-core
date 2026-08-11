import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const front = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).GROVYLE;
const ram = JSON.parse(readFileSync("/tmp/grovyle_stretch.json", "utf8")).ticks;
const ramByTick = new Map(ram.map(t => [t.tick, t]));
const tint = { r: 255, g: 181, b: 247 };

function blend5(src8, tgt8, coeff) {
  const s5 = src8 >> 3, t5 = tgt8 >> 3;
  const b5 = s5 + (((t5 - s5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}

function renderStretch(tileset, palette, d4, d5, y2, coeff) {
  const w = tileset.columns * 8, h = tileset.rows * 8;
  const halfW = w / 2, halfH = h / 2;
  const mx = Math.trunc(0x10000 / d4);
  const my = Math.trunc(0x10000 / d5);
  const out = new Array(w * h).fill(null);
  for (let dy = 0; dy < h; dy++) {
    const ry = dy - halfH;
    const sy = ((ry * my) >> 8) + halfH;
    if (sy < 0 || sy >= h) continue;
    const tileRow = Math.floor(sy / 8), inTileY = sy % 8;
    for (let dx = 0; dx < w; dx++) {
      const rx = dx - halfW;
      const sx = ((rx * mx) >> 8) + halfW;
      if (sx < 0 || sx >= w) continue;
      const tile = tileset.tiles[tileRow * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[inTileY * 8 + (sx % 8)];
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      const oy = dy + y2;
      if (oy < 0 || oy >= h) continue;
      const rc = coeff > 0 ? { r: blend5(c.r, tint.r, coeff), g: blend5(c.g, tint.g, coeff), b: blend5(c.b, tint.b, coeff) } : c;
      out[oy * w + dx] = rc;
    }
  }
  return { w, h, out };
}

function loadOracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

function coeffFor(R) {
  if (R <= 1503) return 16;
  if (R <= 1518) return 1519 - R;
  return 0;
}

let totalDiff = 0;
for (let R = 1504; R <= 1543; R++) {
  const T = R - 1; // RAM tick, lag +1
  const r = ramByTick.get(T) ?? ramByTick.get(1538); // clamp tail
  const coeff = coeffFor(R);
  const png = loadOracle(R);
  const { w, h, out } = renderStretch(front.frame2, front.palette, r.d4, r.d5, r.y2, coeff);
  let diff = 0, opaque = 0;
  const firstDiffs = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = out[y * w + x];
      if (!c) continue;
      opaque++;
      const i = ((CORNER.y + y) * png.width + (CORNER.x + x)) * 4;
      if (png.data[i] !== c.r || png.data[i+1] !== c.g || png.data[i+2] !== c.b) {
        diff++;
        if (firstDiffs.length < 3) firstDiffs.push([x,y, [png.data[i],png.data[i+1],png.data[i+2]], [c.r,c.g,c.b]]);
      }
    }
  }
  totalDiff += diff;
  if (diff > 0) console.log(`R=${R} RAM=${T} coeff=${coeff}: diff=${diff}/${opaque}`, JSON.stringify(firstDiffs));
}
console.log("TOTAL DIFF:", totalDiff);
