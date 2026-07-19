import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const front = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).GROVYLE;
const ram = JSON.parse(readFileSync("/tmp/grovyle_stretch.json", "utf8")).ticks;
const ramByTick = new Map(ram.map(t => [t.tick, t]));
const tint = { r: 255, g: 181, b: 247 };

function toS16(u16) { return u16 >= 0x8000 ? u16 - 0x10000 : u16; }
function blend5(src8, tgt8, coeff) {
  const s5 = src8 >> 3, t5 = tgt8 >> 3;
  const b5 = s5 + (((t5 - s5) * coeff) >> 4);
  return (b5 << 3) | (b5 >> 2);
}
function loadOracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}
function render(tileset, palette, d4, d5, y2, coeff) {
  const w = tileset.columns * 8, h = tileset.rows * 8;
  const mx = d4, my = d5;
  const out = new Map();
  for (let dy = 0; dy < h; dy++) {
    const ry = dy - 32;
    const sy = ((ry * my) >> 8) + 32;
    if (sy < 0 || sy >= h) continue;
    const tileRow = Math.floor(sy / 8), inTileY = sy % 8;
    for (let dx = 0; dx < w; dx++) {
      const rx = dx - 32;
      const sx = ((rx * mx) >> 8) + 32;
      if (sx < 0 || sx >= w) continue;
      const tile = tileset.tiles[tileRow * tileset.columns + Math.floor(sx / 8)];
      if (!tile) continue;
      const idx = tile[inTileY * 8 + (sx % 8)];
      if (idx === 0) continue;
      const c = palette[idx];
      if (!c) continue;
      const finalX = dx, finalY = dy + y2;
      const rc = coeff > 0 ? { r: blend5(c.r, tint.r, coeff), g: blend5(c.g, tint.g, coeff), b: blend5(c.b, tint.b, coeff) } : c;
      out.set(`${finalX},${finalY}`, rc);
    }
  }
  return out;
}
function diffAgainstOracle(out, png) {
  let diff = 0, opaque = 0;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const c = out.get(`${x},${y}`);
      const px = CORNER.x + x, py = CORNER.y + y;
      const i = (py * png.width + px) * 4;
      const oPix = [png.data[i], png.data[i + 1], png.data[i + 2]];
      if (!c) continue;
      opaque++;
      if (oPix[0] !== c.r || oPix[1] !== c.g || oPix[2] !== c.b) diff++;
    }
  }
  return { diff, opaque };
}
for (const R of [1515, 1516, 1517, 1518]) {
  const T = R - 1;
  const r = ramByTick.get(T);
  const y2 = toS16(r.y2);
  const png = loadOracle(R);
  let best = null;
  for (let coeff = 0; coeff <= 16; coeff++) {
    const out = render(front.frame2, front.palette, r.d4, r.d5, y2, coeff);
    const { diff, opaque } = diffAgainstOracle(out, png);
    if (!best || diff < best.diff) best = { coeff, diff, opaque };
  }
  console.log(`R=${R} best coeff=${best.coeff} diff=${best.diff}/${best.opaque}`);
}
