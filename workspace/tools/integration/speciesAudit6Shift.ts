/** speciesAudit6: best integer (dx,dy) shift of the live sprite box onto the ROM frame, per age (idle-offset / sprite-phase probe). usage: npx vite-node speciesAudit6Shift.ts <fixture.json> <evidenceRunDir> <firstFrame> <x0> <y0> <x1> <y1> <age>... */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fp, scratch, first, X0, Y0, X1, Y1, ...ages] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fp!), "utf8")) as Fixture; const [x0, y0, x1, y1] = [X0, Y0, X1, Y1].map(Number) as [number, number, number, number];
for (const a of ages.map(Number)) {
  const live = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(live, liveView(f, a));
  const rgb = readFileSync(join(scratch!, "rgb", `${String(Number(first) + a).padStart(5, "0")}.rgb`));
  const res: [number, number, number][] = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const lx = x - dx, ly = y - dy; if (lx < 0 || ly < 0 || lx > 239 || ly > 159) continue;
      const p = y * 240 + x, q = ly * 240 + lx; if (rgb[p*3] !== live[q*4] || rgb[p*3+1] !== live[q*4+1] || rgb[p*3+2] !== live[q*4+2]) n++; }
    res.push([n, dx, dy]); }
  res.sort((a, b) => a[0] - b[0]); console.log(`age ${a}: best (dx,dy)=(${res[0]![1]},${res[0]![2]}) ${res[0]![0]}px; zero-shift ${res.find(r => r[1] === 0 && r[2] === 0)![0]}px`);
}
