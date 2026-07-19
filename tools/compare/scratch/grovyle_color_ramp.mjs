import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
// sample a handful of candidate body pixels (relative to corner)
const SAMPLES = [ [32,32], [30,40], [35,45], [28,35] ];

for (let tick = 1493; tick <= 1550; tick++) {
  const pad = String(tick).padStart(5, "0");
  const png = PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
  const vals = SAMPLES.map(([sx,sy]) => {
    const i = ((CORNER.y+sy)*png.width + (CORNER.x+sx))*4;
    return `(${png.data[i]},${png.data[i+1]},${png.data[i+2]})`;
  });
  console.log(tick, vals.join(" "));
}
