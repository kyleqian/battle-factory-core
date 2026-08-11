// Crop-only diff sweep for the GROVYLE 64x64 box across the send-out window,
// using the REAL integrated renderer (renderAppTrace), not a reimplementation.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8"));
const captures = await renderAppTrace(trace);
const byTick = new Map(captures.map(c => [c.frame, c]));

function oracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

const CORNER = { x: 144, y: 12 };
const [minArg, maxArg] = process.argv.slice(2);
const minTick = minArg ? Number(minArg) : 1462;
const maxTick = maxArg ? Number(maxArg) : 1559;

let matched = 0, total = 0;
for (let tick = minTick; tick <= maxTick; tick++) {
  const cap = byTick.get(tick);
  if (!cap) continue;
  total++;
  const png = oracle(tick);
  let diff = 0;
  const samples = [];
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const i = ((CORNER.y + y) * 240 + (CORNER.x + x)) * 4;
      if (cap.rgba[i] !== png.data[i] || cap.rgba[i + 1] !== png.data[i + 1] || cap.rgba[i + 2] !== png.data[i + 2]) {
        diff++;
        if (samples.length < 4) samples.push([x, y, [cap.rgba[i], cap.rgba[i+1], cap.rgba[i+2]], [png.data[i], png.data[i+1], png.data[i+2]]]);
      }
    }
  }
  if (diff === 0) matched++;
  else console.log(`tick ${tick}: crop diff=${diff}`, JSON.stringify(samples));
}
console.log(`crop matched ${matched}/${total} for ticks ${minTick}-${maxTick}`);
