import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
const dir = process.argv[2];
function load(f) {
  const o = PNG.sync.read(readFileSync(`${dir}/oracle-${String(f).padStart(5,"0")}.png`));
  const a = PNG.sync.read(readFileSync(`${dir}/app-${String(f).padStart(5,"0")}.png`));
  return { o, a };
}
function px(png, x, y) {
  const i = (y * png.width + x) * 4;
  return `${png.data[i]},${png.data[i+1]},${png.data[i+2]}`;
}
const f765 = load(765), f771 = load(771), f780 = load(780);
for (const [label, ymin, ymax, xmin, xmax] of [["healthbox", 72, 112, 139, 148], ["back", 70, 112, 49, 96]]) {
  console.log(`=== ${label} === app 765 (settled) vs app 771 vs app 780`);
  for (let y = ymin; y <= ymax; y++) {
    const parts = [];
    for (let x = xmin; x <= xmax; x++) {
      const a0 = px(f765.a, x, y), a1 = px(f771.a, x, y), a7 = px(f780.a, x, y);
      parts.push(`[${x}]${a0}/${a1}${a1===a0?"":`!`}${a7!==a1?`~${a7}`:""}`);
    }
    console.log(`  y=${y} ${parts.join(" ")}`);
  }
}
