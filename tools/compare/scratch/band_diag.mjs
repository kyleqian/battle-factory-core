// Scratch diagnostic: inspect the ~138px band region x∈[0,42], y∈[17,42]
// at render ticks 1496-1503 (§7.22's masking band).
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const DIR = "tools/compare/out/latest";

for (let tick = 1495; tick <= 1505; tick += 1) {
  const pad = String(tick).padStart(5, "0");
  let app, oracle;
  try {
    app = PNG.sync.read(readFileSync(`${DIR}/app-${pad}.png`));
    oracle = PNG.sync.read(readFileSync(`${DIR}/oracle-${pad}.png`));
  } catch (e) {
    console.log(`tick ${tick}: no capture`);
    continue;
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
  const colorPairs = new Set();
  for (let y = 0; y < 160; y += 1) {
    for (let x = 0; x < 240; x += 1) {
      const i = (y * 240 + x) * 4;
      const ar = app.data[i], ag = app.data[i + 1], ab = app.data[i + 2];
      const or_ = oracle.data[i], og = oracle.data[i + 1], ob = oracle.data[i + 2];
      if (ar !== or_ || ag !== og || ab !== ob) {
        if (x <= 60 && y <= 60) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          count += 1;
          colorPairs.add(`app(${ar},${ag},${ab}) vs oracle(${or_},${og},${ob})`);
        }
      }
    }
  }
  console.log(`tick ${tick}: band region count=${count} x[${minX},${maxX}] y[${minY},${maxY}]`);
  for (const cp of colorPairs) console.log(`  ${cp}`);
}

// Shape dump for tick 1496
{
  const pad = "01496";
  const app = PNG.sync.read(readFileSync(`${DIR}/app-${pad}.png`));
  const oracle = PNG.sync.read(readFileSync(`${DIR}/oracle-${pad}.png`));
  console.log("\nShape at tick 1496 (x=0..10, y=15..45), 'X'=diff, '.'=match:");
  for (let y = 15; y <= 45; y += 1) {
    let row = `y=${String(y).padStart(3)}: `;
    for (let x = 0; x <= 10; x += 1) {
      const i = (y * 240 + x) * 4;
      const diff = app.data[i] !== oracle.data[i] || app.data[i+1] !== oracle.data[i+1] || app.data[i+2] !== oracle.data[i+2];
      row += diff ? "X" : ".";
    }
    console.log(row);
  }
}
