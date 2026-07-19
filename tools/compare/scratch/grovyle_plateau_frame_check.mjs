import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const front = JSON.parse(readFileSync("src/assets/gen/battle-opponent-front-sprites.json", "utf8")).GROVYLE;

function loadOracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

function drawFlat(tileset, palette) {
  const w = tileset.columns * 8, h = tileset.rows * 8;
  const out = new Array(w*h).fill(null);
  for (let ty=0; ty<tileset.rows; ty++) for (let tx=0; tx<tileset.columns; tx++) {
    const tile = tileset.tiles[ty*tileset.columns+tx];
    for (let py=0; py<8; py++) for (let px=0; px<8; px++) {
      const idx = tile[py*8+px];
      if (idx===0) continue;
      const c = palette[idx];
      out[(ty*8+py)*w + tx*8+px] = c;
    }
  }
  return {w,h,out};
}

for (const tick of [1538,1539,1540,1541,1542,1543,1544,1550]) {
  const png = loadOracle(tick);
  for (const [name, tileset] of [["frame1", front.tileset], ["frame2", front.frame2]]) {
    const {w,h,out} = drawFlat(tileset, front.palette);
    let diff=0, opaque=0;
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const c = out[y*w+x];
      if (!c) continue;
      opaque++;
      const i = ((CORNER.y+y)*png.width + (CORNER.x+x))*4;
      if (png.data[i]!==c.r || png.data[i+1]!==c.g || png.data[i+2]!==c.b) diff++;
    }
    console.log(tick, name, 'diff', diff, '/', opaque);
  }
}
