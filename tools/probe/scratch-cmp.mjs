import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
const dir = process.argv[2];
function load(f) { const o = PNG.sync.read(readFileSync(`${dir}/oracle-${String(f).padStart(5,"0")}.png`)); const a = PNG.sync.read(readFileSync(`${dir}/app-${String(f).padStart(5,"0")}.png`)); return { o, a }; }
function px(png, x, y) { const i = (y * png.width + x) * 4; return `${png.data[i]},${png.data[i+1]},${png.data[i+2]}`; }
const f765 = load(765), f771 = load(771), f779 = load(779);
console.log("Floor right of healthbox, x230-235, rows 72-78:");
for (let y = 72; y <= 78; y++) {
  const p = [];
  for (let x = 230; x <= 235; x++) p.push(`${x}:765O=${px(f765.o,x,y)} 771O=${px(f771.o,x,y)} 771A=${px(f771.a,x,y)}`);
  console.log(` y=${y}  ${p.join("  ")}`);
}
console.log("Healthbox bottom rows 108-113, x127-133:");
for (let y = 108; y <= 113; y++) {
  const p = [];
  for (let x = 127; x <= 133; x++) p.push(`${x}:765O=${px(f765.o,x,y)} 771O=${px(f771.o,x,y)} 771A=${px(f771.a,x,y)}`);
  console.log(` y=${y}  ${p.join("  ")}`);
}
console.log("Back sprite rows 108-114, x49-56 (frame 779 vs 765):");
for (let y = 108; y <= 114; y++) {
  const p = [];
  for (let x = 49; x <= 56; x++) p.push(`${x}:765O=${px(f765.o,x,y)} 779O=${px(f779.o,x,y)} 779A=${px(f779.a,x,y)}`);
  console.log(` y=${y}  ${p.join("  ")}`);
}
