import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { createHash } from "node:crypto";

const CORNER = { x: 144, y: 12 };
const SIZE = 64;

for (let tick = 1478; tick <= 1556; tick++) {
  const pad = String(tick).padStart(5, "0");
  const png = PNG.sync.read(readFileSync(`tools/compare/out/sendout-baseline/oracle-${pad}.png`));
  const buf = Buffer.alloc(SIZE * SIZE * 3);
  let o = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = ((CORNER.y + y) * png.width + (CORNER.x + x)) * 4;
      buf[o++] = png.data[i];
      buf[o++] = png.data[i + 1];
      buf[o++] = png.data[i + 2];
    }
  }
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 10);
  console.log(tick, hash);
}
