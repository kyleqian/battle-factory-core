// Scratch dev-time helper (NOT committed to trace suite) - diffs the app
// engine locally against the already-fetched oracle PNGs in
// tools/compare/out/sendout-baseline, no network round-trip. Usage:
//   node --experimental-strip-types tools/compare/localcheck.ts [minTick] [maxTick]
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "./appTrace.ts";
import type { Trace } from "./oracleClient.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8")) as Trace;
const [minArg, maxArg] = process.argv.slice(2);
const minTick = minArg ? Number(minArg) : 0;
const maxTick = maxArg ? Number(maxArg) : Infinity;

const captures = await renderAppTrace(trace);
let matched = 0;
let total = 0;
for (const cap of captures) {
  if (cap.frame < minTick || cap.frame > maxTick) continue;
  total += 1;
  const pad = String(cap.frame).padStart(5, "0");
  const oraclePng = PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
  let diff = 0;
  let firstXY: [number, number] | null = null;
  for (let i = 0; i < oraclePng.data.length; i += 4) {
    const a = cap.rgba[i]!, b = oraclePng.data[i]!;
    const a1 = cap.rgba[i + 1]!, b1 = oraclePng.data[i + 1]!;
    const a2 = cap.rgba[i + 2]!, b2 = oraclePng.data[i + 2]!;
    if (a !== b || a1 !== b1 || a2 !== b2) {
      diff += 1;
      if (!firstXY) {
        const px = (i / 4) % 240;
        const py = Math.floor(i / 4 / 240);
        firstXY = [px, py];
      }
    }
  }
  if (diff === 0) {
    matched += 1;
  } else {
    console.log(`tick ${cap.frame}: ${diff}px diff, first@${firstXY}`);
  }
}
console.log(`${matched}/${total} matched (local)`);
