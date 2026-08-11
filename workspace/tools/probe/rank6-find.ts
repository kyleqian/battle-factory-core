// Find pixels of given colors in the oracle frame within a region.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [outDir, frameStr, ...rest] = process.argv.slice(2);
const frame = Number(frameStr);
const pad = String(frame).padStart(5, "0");
const oracle = PNG.sync.read(readFileSync(join(outDir, `oracle-${pad}.png`))).data;
const targets = rest.map((s) => s.split(",").map(Number));
for (const [tr, tg, tb] of targets) {
  const pts: Array<[number, number]> = [];
  for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
    const o = (y * 240 + x) * 4;
    if (oracle[o] === tr && oracle[o + 1] === tg && oracle[o + 2] === tb) pts.push([x, y]);
  }
  // cluster by row
  const rows = new Map<number, number[]>();
  for (const [x, y] of pts) { if (!rows.has(y)) rows.set(y, []); rows.get(y)!.push(x); }
  const runs: string[] = [];
  for (const [y, xs] of [...rows.entries()].sort((p, q) => p[0] - q[0])) {
    let s = `${y}:`;
    let rs = xs[0]!, prev = xs[0]!;
    for (let i = 1; i < xs.length; i++) {
      if (xs[i]! > prev + 1) { s += ` ${rs}-${prev}`; rs = xs[i]!; }
      prev = xs[i]!;
    }
    s += ` ${rs}-${prev}`;
    runs.push(s);
  }
  console.log(`color (${tr},${tg},${tb}): ${pts.length} px\n  ${runs.join("\n  ")}`);
}
