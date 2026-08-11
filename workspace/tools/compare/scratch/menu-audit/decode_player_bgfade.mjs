import { readFileSync } from "node:fs";
import { runOracleTrace } from "../../oracleClient.ts";

const groundTruth = JSON.parse(readFileSync("tools/compare/traces-groundtruth/battle1-menu-dense.json", "utf8"));
const segments = groundTruth.segments;

const MIN = Number(process.argv[2] ?? 1600);
const MAX = Number(process.argv[3] ?? 1740);
const captureFrames = [];
for (let t = MIN; t <= MAX; t++) captureFrames.push(t);

const trace = { segments, captureFrames };
const result = await runOracleTrace(trace);
const byTick = new Map(result.captures.map((c) => [c.frame, c]));

const SWATCH = { x: Number(process.argv[4] ?? 150), y: Number(process.argv[5] ?? 60) };
function sample(tick) {
  const cap = byTick.get(tick);
  const i = (SWATCH.y * 240 + SWATCH.x) * 4;
  return [cap.rgba[i], cap.rgba[i + 1], cap.rgba[i + 2]];
}

// baseline unfaded value, sampled well before the fade starts
const unfaded = sample(Number(process.argv[6] ?? 1600));
console.log("unfaded @ (10,3):", unfaded);

function blendComponentToWhite(component8, y) {
  const c5 = component8 >> 3;
  const faded5 = c5 + (((31 - c5) * y) >> 4);
  return (faded5 << 3) | (faded5 >> 2);
}

function decodeY(component8, unfadedComponent8) {
  for (let y = 0; y <= 16; y++) {
    if (blendComponentToWhite(unfadedComponent8, y) === component8) return y;
  }
  return null;
}

for (let t = MIN; t <= MAX; t++) {
  const [r, g, b] = sample(t);
  const yr = decodeY(r, unfaded[0]);
  const yg = decodeY(g, unfaded[1]);
  const yb = decodeY(b, unfaded[2]);
  const consistent = yr === yg && yg === yb;
  console.log(`t=${t}: rgb=(${r},${g},${b}) y=(${yr},${yg},${yb}) consistent=${consistent}`);
}
