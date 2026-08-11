import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const front = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).GROVYLE;
const ram = JSON.parse(readFileSync("/tmp/grovyle_stretch.json", "utf8")).ticks;
const ramByTick = new Map(ram.map(t => [t.tick, t]));

function renderStretch(tileset, palette, d4, d5, y2) {
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
      out[oy * w + dx] = c;
    }
  }
  return { w, h, out };
}

function loadOracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

const tileset = front.frame2;
for (const k of [1,2,3,4,5]) {
  let total = 0, count = 0, opaqueTotal = 0;
  const perTick = [];
  for (let T = 1524; T <= 1538; T++) {
    const r = ramByTick.get(T);
    if (!r) continue;
    const renderTick = T + k;
    let png;
    try { png = loadOracle(renderTick); } catch { continue; }
    const { w, h, out } = renderStretch(tileset, front.palette, r.d4, r.d5, r.y2);
    let diff = 0, opaque = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = out[y * w + x];
        if (!c) continue;
        opaque++;
        const i = ((CORNER.y + y) * png.width + (CORNER.x + x)) * 4;
        if (png.data[i] !== c.r || png.data[i+1] !== c.g || png.data[i+2] !== c.b) diff++;
      }
    }
    total += diff; opaqueTotal += opaque; count++;
    perTick.push([T, diff]);
  }
  console.log(`k=${k}: diff=${total} / opaque=${opaqueTotal} over ${count} ticks`, JSON.stringify(perTick));
}
