import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
const dir = process.argv[2];
function load(f) { const o = PNG.sync.read(readFileSync(`${dir}/oracle-${String(f).padStart(5,"0")}.png`)); const a = PNG.sync.read(readFileSync(`${dir}/app-${String(f).padStart(5,"0")}.png`)); return { o, a }; }
function px(png, x, y) { const i = (y * png.width + x) * 4; return `${png.data[i]},${png.data[i+1]},${png.data[i+2]}`; }
for (const f of [765, 766, 768, 770, 771]) {
  const { o, a } = load(f);
  console.log(`=== frame ${f} ===`);
  for (const [x,y] of [[127,108],[128,108],[127,109],[128,109],[132,104],[131,105],[136,76],[227,92],[229,92]]) {
    console.log(`  (${x},${y}) oracle=${px(o,x,y)} app=${px(a,x,y)}`);
  }
}
