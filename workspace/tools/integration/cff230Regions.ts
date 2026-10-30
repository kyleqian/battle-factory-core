// cff230: per-frame change points of screen regions in a directory of oracle PNGs (text box, player sprite box, whole field).
//   node --experimental-strip-types --no-warnings tools/integration/cff230Regions.ts <dir> <from> <to> [x,y,w,h ...]
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
const [dir, a, b, ...regs] = process.argv.slice(2);
const regions = (regs.length ? regs : ["0,112,240,48", "0,48,108,64", "108,0,132,72"]).map((r) => r.split(",").map(Number) as [number, number, number, number]);
const prev: string[] = [];
let last = -1;
for (let f = Number(a); f <= Number(b); f++) {
  const p = `${dir}/frame-${String(f).padStart(5, "0")}.png`; if (!existsSync(p)) continue;
  const png = PNG.sync.read(readFileSync(p));
  const hs = regions.map(([x, y, w, h]) => {
    const hh = createHash("md5");
    for (let yy = y; yy < y + h; yy++) hh.update(png.data.subarray((yy * 240 + x) * 4, (yy * 240 + x + w) * 4));
    return hh.digest("hex").slice(0, 6);
  });
  const changed = hs.map((h, i) => (h !== prev[i] ? i : -1)).filter((i) => i >= 0);
  if (changed.length) console.log(`${f}: changed regions ${changed.join(",")} ${hs.join(" ")}`);
  hs.forEach((h, i) => (prev[i] = h)); last = f;
}
