import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
const FRAME_DIR = "/tmp/menu-dense-out";
function loadPng(tick) { return PNG.sync.read(readFileSync(`${FRAME_DIR}/frame-${String(tick).padStart(5, "0")}.png`)); }
const ballOpen = JSON.parse(readFileSync("src/assets/gen/battle-anim-ball-open.json", "utf8"));
const tileset = ballOpen.tileset;
const CORNER = { x: 64, y: 107 };
const tick = Number(process.argv[2] || 1652);
const png = loadPng(tick);
for (let ty = 0; ty < 2; ty++) {
  for (let py = 0; py < 8; py++) {
    const y = CORNER.y + ty*8 + py;
    let rowStr = "";
    for (let tx = 0; tx < 2; tx++) {
      const tile = tileset.tiles[ty*2+tx];
      for (let px = 0; px < 8; px++) {
        const idx = tile[py*8+px];
        const x = CORNER.x + tx*8 + px;
        const i = (y*png.width+x)*4;
        const oc = [png.data[i],png.data[i+1],png.data[i+2]];
        if (idx === 0) { rowStr += "."; continue; }
        const c = ballOpen.palette[idx];
        const match = c && c.r===oc[0] && c.g===oc[1] && c.b===oc[2];
        rowStr += match ? "#" : "x";
      }
    }
    console.log(`y=${y} tile(${ty}) `, rowStr);
  }
}
