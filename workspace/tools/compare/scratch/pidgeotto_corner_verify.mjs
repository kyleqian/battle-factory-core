import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const front = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).PIDGEOTTO;
const png = PNG.sync.read(readFileSync(process.argv[2]));
const { tileset, palette } = front;
const w = tileset.columns * 8, h = tileset.rows * 8;

function diffAt(cx, cy) {
  let diff = 0, opaque = 0;
  for (let y = 0; y < h; y++) {
    const tileRow = Math.floor(y / 8), inTileY = y % 8;
    for (let x = 0; x < w; x++) {
      const tileCol = Math.floor(x / 8), inTileX = x % 8;
      const tile = tileset.tiles[tileRow * tileset.columns + tileCol];
      const idx = tile[inTileY * 8 + inTileX];
      if (idx === 0) continue;
      const c = palette[idx];
      opaque++;
      const px = cx + x, py = cy + y;
      if (px < 0 || px >= png.width || py < 0 || py >= png.height) { diff++; continue; }
      const i = (py * png.width + px) * 4;
      if (png.data[i] !== c.r || png.data[i+1] !== c.g || png.data[i+2] !== c.b) diff++;
    }
  }
  return { diff, opaque };
}

let best = null;
for (let cy = 0; cy <= 40; cy++) {
  for (let cx = 100; cx <= 190; cx++) {
    const { diff, opaque } = diffAt(cx, cy);
    if (!best || diff < best.diff) best = { cx, cy, diff, opaque };
  }
}
console.log(best);
