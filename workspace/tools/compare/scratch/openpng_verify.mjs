// Throwaway: verify graphics/balls/open.png (gOpenPokeballGfx, DMA'd over
// poke.png's "blank" slot-2 tiles by LoadBallGfx at ball-creation time,
// pokeball.c:1331) is the real content shown at ticks 1485-1490, not blank.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { decodeIndexedPng } from "../../extract/indexedPng.ts";
import { sliceTiles } from "../../extract/tiles.ts";

const ballOpenAsset = JSON.parse(readFileSync("src/assets/gen/battle-anim-ball-open.json", "utf8"));
const palette = ballOpenAsset.palette;

const openImg = decodeIndexedPng("reference/pokeemerald/graphics/balls/open.png");
const { columns, rows, tiles } = sliceTiles(openImg);
console.log("open.png columns", columns, "rows", rows, "tiles", tiles.length);

const BALL_CORNER = { x: 168, y: 56 };

function colorAt(png, x, y) {
  const i = (y * 240 + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

for (const tick of [1485, 1486, 1487, 1488, 1489, 1490]) {
  const pad = String(tick).padStart(5, "0");
  const png = PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
  let matches = 0, mismatches = 0, opaque = 0;
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < columns; tx++) {
      const tile = tiles[ty * columns + tx];
      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const idx = tile.pixels[py * 8 + px];
          if (idx === 0) continue;
          opaque++;
          const c = palette[idx];
          const oc = colorAt(png, BALL_CORNER.x + tx * 8 + px, BALL_CORNER.y + ty * 8 + py);
          if (oc[0] === c.r && oc[1] === c.g && oc[2] === c.b) matches++;
          else mismatches++;
        }
      }
    }
  }
  console.log(`tick ${tick}: ${matches}/${opaque} opaque px match (${mismatches} mismatch)`);
}
