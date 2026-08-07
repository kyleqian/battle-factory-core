// Dump white-text pixel clusters in the right-card regions (oracle vs app).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [outDir, frameStr, x0s, y0s, x1s, y1s] = process.argv.slice(2);
const frame = Number(frameStr);
const pad = String(frame).padStart(5, "0");
const x0 = Number(x0s), y0 = Number(y0s), x1 = Number(x1s), y1 = Number(y1s);
function load(name: string): Buffer {
  return PNG.sync.read(readFileSync(join(outDir, name))).data;
}
const a = load(`oracle-${pad}.png`);
const b = load(`app-${pad}.png`);
const clusters = (buf: Buffer) => {
  const out: Array<[number, number]> = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
    const o = (y * 240 + x) * 4;
    if (buf[o] === 255 && buf[o + 1] === 255 && buf[o + 2] === 255) out.push([x, y]);
  }
  return out;
};
const compact = (pts: Array<[number, number]>) => {
  const rows = new Map<number, number[]>();
  for (const [x, y] of pts) {
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push(x);
  }
  const lines: string[] = [];
  for (const [y, xs] of [...rows.entries()].sort((p, q) => p[0] - q[0])) {
    let s = `${y}:`;
    let runStart = xs[0]!, prev = xs[0]!;
    for (let i = 1; i < xs.length; i += 1) {
      if (xs[i]! > prev + 1) {
        s += ` ${runStart}-${prev}`;
        runStart = xs[i]!;
      }
      prev = xs[i]!;
    }
    s += ` ${runStart}-${prev}`;
    lines.push(s);
  }
  return lines.join("\n  ");
};
const ca = clusters(a), cb = clusters(b);
console.log(`region (${x0},${y0})-(${x1},${y1}) white px: oracle ${ca.length} app ${cb.length}`);
console.log("oracle white rows:\n  " + compact(ca));
console.log("app white rows:\n  " + compact(cb));
