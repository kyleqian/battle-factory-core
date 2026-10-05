/** speciesAudit2: best integer shift (dx,dy) that aligns the LIVE render to the source frame inside a residual bbox (mismatch count per shift).
 *  usage: npx vite-node tools/integration/speciesAudit2ShiftFit.ts <fixture.json> <evidenceRunDir> <firstFrame> <x0> <y0> <x1> <y1> <age>... */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fixturePath, scratch, firstFrame, bx0, by0, bx1, by1, ...ages] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fixturePath!), "utf8")) as Fixture;
const [x0, y0, x1, y1] = [bx0, by0, bx1, by1].map(Number) as [number, number, number, number];
for (const a of ages.map(Number)) {
  const rgb = readFileSync(join(scratch!, "rgb", `${String(Number(firstFrame) + a).padStart(5, "0")}.rgb`));
  const live = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(live, liveView(f, a));
  const res: [number, number, number][] = [];
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sx = x - dx, sy = y - dy; // source pixel (x,y) vs live pixel shifted by (dx,dy)
      if (sx < 0 || sy < 0 || sx >= 240 || sy >= 160) { n++; continue; }
      const p = y * 240 + x, q = sy * 240 + sx;
      if (rgb[p * 3] !== live[q * 4] || rgb[p * 3 + 1] !== live[q * 4 + 1] || rgb[p * 3 + 2] !== live[q * 4 + 2]) n++;
    }
    res.push([n, dx, dy]);
  }
  res.sort((p, q) => p[0] - q[0]);
  const zero = res.find(r => r[1] === 0 && r[2] === 0)!;
  console.log(`age ${a}: unshifted ${zero[0]} px; best ${res.slice(0, 3).map(r => `(${r[1]},${r[2]})=${r[0]}`).join(" ")}  [live moved by (dx,dy) matches source]`);
}
