import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const CORNER = { x: 144, y: 12 };
const SIZE = 64;

function load(tick) {
  const pad = String(tick).padStart(5, "0");
  return PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
}

const a = load(1540);
const b = load(1550);
let diff = 0;
const samples = [];
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = ((CORNER.y + y) * a.width + (CORNER.x + x)) * 4;
    if (a.data[i] !== b.data[i] || a.data[i+1] !== b.data[i+1] || a.data[i+2] !== b.data[i+2]) {
      diff++;
      if (samples.length < 20) samples.push({x,y, a:[a.data[i],a.data[i+1],a.data[i+2]], b:[b.data[i],b.data[i+1],b.data[i+2]]});
    }
  }
}
console.log("diff pixels:", diff, "/", SIZE*SIZE);
console.log(samples);
