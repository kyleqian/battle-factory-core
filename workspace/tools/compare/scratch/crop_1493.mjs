import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const ticks = [1491, 1492, 1493, 1494, 1495, 1496, 1497];
const X0 = 158, X1 = 172, Y0 = 38, Y1 = 46;

function colorKey(r, g, b) {
  return `${r},${g},${b}`;
}

for (const tick of ticks) {
  const pad = String(tick).padStart(5, "0");
  const oracle = PNG.sync.read(readFileSync(`tools/compare/out/latest/oracle-${pad}.png`));
  const app = PNG.sync.read(readFileSync(`tools/compare/out/latest/app-${pad}.png`));
  console.log(`\n=== tick ${tick} ORACLE (x${X0}-${X1 - 1}, y${Y0}-${Y1 - 1}) ===`);
  const palette = new Map();
  for (let y = Y0; y < Y1; y++) {
    let line = "";
    for (let x = X0; x < X1; x++) {
      const i = (y * 240 + x) * 4;
      const key = colorKey(oracle.data[i], oracle.data[i + 1], oracle.data[i + 2]);
      if (!palette.has(key)) palette.set(key, String.fromCharCode(65 + palette.size));
      line += palette.get(key);
    }
    console.log(`  y${y}: ${line}`);
  }
  console.log("  palette:", [...palette.entries()].map(([k, v]) => `${v}=${k}`).join(" "));

  console.log(`  --- APP ---`);
  const palette2 = new Map();
  for (let y = Y0; y < Y1; y++) {
    let line = "";
    for (let x = X0; x < X1; x++) {
      const i = (y * 240 + x) * 4;
      const key = colorKey(app.data[i], app.data[i + 1], app.data[i + 2]);
      if (!palette2.has(key)) palette2.set(key, String.fromCharCode(97 + palette2.size));
      line += palette2.get(key);
    }
    console.log(`  y${y}: ${line}`);
  }
  console.log("  palette:", [...palette2.entries()].map(([k, v]) => `${v}=${k}`).join(" "));
}
