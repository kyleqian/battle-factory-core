import { readFileSync } from "node:fs";
import { renderAppTrace } from "../appTrace.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/sendout.json", "utf8"));
const captures = await renderAppTrace(trace);
const byTick = new Map(captures.map(c => [c.frame, c]));

function loadOracle(tick) {
  const { PNG } = require("pngjs");
}
import { PNG } from "pngjs";
function oracle(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

const CORNER = { x: 144, y: 12 };
for (const tick of [1525, 1530]) {
  const cap = byTick.get(tick);
  const png = oracle(tick);
  let diff = 0;
  const samples = [];
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const i = ((CORNER.y+y)*240 + (CORNER.x+x))*4;
      if (cap.rgba[i] !== png.data[i] || cap.rgba[i+1] !== png.data[i+1] || cap.rgba[i+2] !== png.data[i+2]) {
        diff++;
        if (samples.length < 5) samples.push([x,y,[cap.rgba[i],cap.rgba[i+1],cap.rgba[i+2]],[png.data[i],png.data[i+1],png.data[i+2]]]);
      }
    }
  }
  console.log("tick", tick, "grovyle-crop diff:", diff, JSON.stringify(samples));
}
