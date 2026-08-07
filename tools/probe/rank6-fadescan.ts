// Scan consecutive-frame pixel diffs to locate the party-menu fade windows.
// Usage: node --experimental-strip-types tools/probe/rank6-fadescan.ts <dir> <prefix-a> <prefix-b> <start> <end>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
const [dir, startS, endS] = process.argv.slice(2);
const start = Number(startS), end = Number(endS);
const load = (f: number) => PNG.sync.read(readFileSync(join(dir, `frame-${String(f).padStart(5, "0")}.png`))).data;
let prev = load(start);
for (let f = start + 1; f <= end; f++) {
  const cur = load(f);
  let diff = 0;
  for (let i = 0; i < cur.length; i += 4) {
    if (cur[i] !== prev[i] || cur[i + 1] !== prev[i + 1] || cur[i + 2] !== prev[i + 2]) diff++;
  }
  if (diff > 0) console.log(`f${f}: +${diff}px`);
  prev = cur;
}
