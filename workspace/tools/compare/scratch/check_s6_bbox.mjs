import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const frames = [40, 120, 192, 1496];
for (const f of frames) {
  const pad = String(f).padStart(5, "0");
  const app = PNG.sync.read(readFileSync(`tools/compare/out/latest/app-${pad}.png`));
  const oracle = PNG.sync.read(readFileSync(`tools/compare/out/latest/oracle-${pad}.png`));
  let minX = 999, maxX = -1, minY = 999, maxY = -1, count = 0;
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 240; x++) {
      const i = (y * 240 + x) * 4;
      if (app.data[i] !== oracle.data[i] || app.data[i + 1] !== oracle.data[i + 1] || app.data[i + 2] !== oracle.data[i + 2]) {
        count++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  console.log(`frame ${f}: ${count}px, bbox x[${minX},${maxX}] y[${minY},${maxY}]`);
}
