// Ad-hoc pixel scanner for ISSUES #62 E-2/D-2 discriminating probe.
// Samples a horizontal row of a healthbox HP-bar region in both app-*.png
// and oracle-*.png captures from a `npm run compare` output directory, and
// reports the filled/track color run-lengths so the rendered fraction can
// be back-computed exactly (not eyeballed).
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";

const [, , runDir, frameArg, rowArg, xStartArg, xEndArg] = process.argv;
const frame = frameArg.padStart(5, "0");
const row = Number(rowArg);
const xStart = Number(xStartArg);
const xEnd = Number(xEndArg);

function loadPng(path) {
  return PNG.sync.read(readFileSync(path));
}

function sampleRow(png, row, xStart, xEnd) {
  const pixels = [];
  for (let x = xStart; x <= xEnd; x += 1) {
    const idx = (png.width * row + x) * 4;
    pixels.push([png.data[idx], png.data[idx + 1], png.data[idx + 2]]);
  }
  return pixels;
}

function runLength(pixels) {
  // Collapse consecutive identical colors into runs for compact printing.
  const runs = [];
  let cur = null;
  for (const p of pixels) {
    const key = p.join(",");
    if (cur && cur.key === key) {
      cur.len += 1;
    } else {
      cur = { key, len: 1 };
      runs.push(cur);
    }
  }
  return runs;
}

for (const side of ["app", "oracle"]) {
  const path = `${runDir}/${side}-${frame}.png`;
  const png = loadPng(path);
  const pixels = sampleRow(png, row, xStart, xEnd);
  const runs = runLength(pixels);
  console.log(`${side} frame=${frameArg} row=${row} x=${xStart}..${xEnd}`);
  console.log(
    "  " + runs.map((r) => `${r.key}${r.len > 1 ? `x${r.len}` : ""}`).join(" | "),
  );
}
