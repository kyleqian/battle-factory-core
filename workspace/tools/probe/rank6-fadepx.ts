// Per-frame counts of key colors + total distinct colors, to track the fade.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [dir, ...frames] = process.argv.slice(2);
const TARGETS = { boxFrame: [74, 74, 99], wash: [132, 198, 222], selWash: [173, 239, 255], white: [255, 255, 255], fieldGreen: [115, 255, 173] };
for (const fs of frames) {
  const f = Number(fs);
  const data = PNG.sync.read(readFileSync(join(dir, `frame-${String(f).padStart(5, "0")}.png`))).data;
  const counts: Record<string, number> = {};
  for (const [k, [tr, tg, tb]] of Object.entries(TARGETS)) counts[k] = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (const [k, [tr, tg, tb]] of Object.entries(TARGETS)) {
      if (Math.abs(r - tr) <= 2 && Math.abs(g - tg) <= 2 && Math.abs(b - tb) <= 2) counts[k]++;
    }
  }
  console.log(`f${f}: boxFrame=${counts.boxFrame} wash=${counts.wash} selWash=${counts.selWash} white=${counts.white} hpGreen=${counts.fieldGreen}`);
}
