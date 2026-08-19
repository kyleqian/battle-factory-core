/**
 * Ad hoc, uncommitted-style sampler for the four ISSUES #97 single-frame
 * residual groups (resolve-off-c 6763, resolve-off-d 6850/6996,
 * confirm-off-a 5959-5961/5968, confirm-off-b 6184). Dumps every mismatched
 * pixel inside the reported bbox for app vs oracle so the exact byte-level
 * delta can be read directly, same discipline as the family's other
 * analyze-*.ts probes.
 */
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readPng(runDir: string, name: string) {
  return PNG.sync.read(readFileSync(join(runDir, name)));
}

function px(png: ReturnType<typeof readPng>, x: number, y: number) {
  const idx = (png.width * y + x) << 2;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

function dumpTick(runDir: string, tick: number, bbox: [number, number, number, number]) {
  const tickStr = String(tick).padStart(5, "0");
  const app = readPng(runDir, `app-${tickStr}.png`);
  const oracle = readPng(runDir, `oracle-${tickStr}.png`);
  const [x0, y0, x1, y1] = bbox;
  console.log(`\n=== tick ${tick} bbox=${x0},${y0}-${x1},${y1} ===`);
  let diffs = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const a = px(app, x, y);
      const o = px(oracle, x, y);
      if (a[0] !== o[0] || a[1] !== o[1] || a[2] !== o[2]) {
        diffs++;
        console.log(`  (${x},${y}) app=(${a[0]},${a[1]},${a[2]}) oracle=(${o[0]},${o[1]},${o[2]})`);
      }
    }
  }
  console.log(`  total diffs in bbox: ${diffs}`);
}

const [, , runDir, tickArg, bboxArg] = process.argv;
const tick = Number(tickArg);
const bbox = bboxArg.split(",").map(Number) as [number, number, number, number];
dumpTick(runDir, tick, bbox);
