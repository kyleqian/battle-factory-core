import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const asset = JSON.parse(readFileSync("src/assets/gen/battle-anim-item-heal.json", "utf8"));
const { tileset, palette, grantingStarsAnim } = asset.sparkle;

function diffAt(png, cx, cy, frameTileOffset) {
  let diff = 0, opaque = 0;
  // frame is a 4x4 tile (32x32px) block starting at tile index frameTileOffset
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const tileIdx = frameTileOffset + ty * tileset.columns + tx;
      const tile = tileset.tiles[tileIdx];
      if (!tile) continue;
      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const idx = tile[py * 8 + px];
          if (idx === 0) continue;
          const c = palette[idx];
          opaque++;
          const x = cx + tx * 8 + px, y = cy + ty * 8 + py;
          if (x < 0 || x >= png.width || y < 0 || y >= png.height) { diff++; continue; }
          const i = (y * png.width + x) * 4;
          if (png.data[i] !== c.r || png.data[i + 1] !== c.g || png.data[i + 2] !== c.b) diff++;
        }
      }
    }
  }
  return { diff, opaque };
}

const dir = process.argv[2];
const ticks = [];
for (let t = 6968; t <= 7072; t++) ticks.push(t);

let best = null;
for (const t of ticks) {
  let png;
  try {
    png = PNG.sync.read(readFileSync(`${dir}/frame-${String(t).padStart(5, "0")}.png`));
  } catch {
    continue;
  }
  for (const frame of grantingStarsAnim) {
    for (let cy = 60; cy <= 100; cy++) {
      for (let cx = 20; cx <= 110; cx++) {
        const { diff, opaque } = diffAt(png, cx, cy, frame.tile);
        if (opaque === 0) continue;
        if (!best || diff < best.diff || (diff === best.diff && opaque > best.opaque)) {
          best = { t, cx, cy, tile: frame.tile, diff, opaque };
        }
      }
    }
  }
}
console.log(best);
