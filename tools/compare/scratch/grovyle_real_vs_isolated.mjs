import { readFileSync } from "node:fs";
import { renderAppTrace } from "../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8"));
const captures = await renderAppTrace(trace);
const byTick = new Map(captures.map(c => [c.frame, c]));

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

const CORNER = { x: 144, y: 12 };
const R = Number(process.argv[2] ?? 1516);
const cap = byTick.get(R);
const T = R - 1;
const r = ramByTick.get(T);
const y2 = toS16(r.y2);
const coeff = Math.max(0, 15 - (R - 1504));

for (const [label, tileset] of [["F0/tileset", front.tileset], ["F1/frame2", front.frame2]]) {
  const out = render(tileset, front.palette, r.d4, r.d5, y2, coeff);
  let diff = 0, opaque = 0;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const c = out.get(`${x},${y}`);
      const i = ((CORNER.y+y)*240 + (CORNER.x+x))*4;
      const real = [cap.rgba[i], cap.rgba[i+1], cap.rgba[i+2]];
      if (!c) continue;
      opaque++;
      if (real[0]!==c.r||real[1]!==c.g||real[2]!==c.b) diff++;
    }
  }
  console.log(`R=${R} isolated-${label} vs REAL-APP-CAPTURE: diff=${diff}/${opaque}`);
}
