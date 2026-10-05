/** Part A: residual pixel colors/bbox of ages from an existing prep11LeafDense scratch dir (source rgb vs production render). */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fixturePath, scratch, firstFrame, ...ages] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fixturePath!), "utf8")) as Fixture;
const hex = (r: number, g: number, b: number) => [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
for (const a of ages.map(Number)) {
  const frame = Number(firstFrame) + a;
  const rgb = readFileSync(join(scratch!, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
  const live = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(live, liveView(f, a));
  const pairs = new Map<string, number>(); let n = 0, x0 = 999, y0 = 999, x1 = -1, y1 = -1;
  for (let p = 0; p < 240 * 160; p++) {
    const s = hex(rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!), l = hex(live[p * 4]!, live[p * 4 + 1]!, live[p * 4 + 2]!);
    if (s === l) continue; n++;
    const x = p % 240, y = (p / 240) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    pairs.set(`${s}<-live ${l}`, (pairs.get(`${s}<-live ${l}`) ?? 0) + 1);
  }
  console.log(`age ${a} frame ${frame}: ${n} px bbox x${x0}-${x1} y${y0}-${y1}`);
  console.log([...pairs].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `   ${v} ${k}`).join("\n"));
  const ppm = (buf: Uint8Array, stride: number) => { const o = Buffer.alloc(240 * 160 * 3); for (let p = 0; p < 240 * 160; p++) for (let c = 0; c < 3; c++) o[p * 3 + c] = buf[p * stride + c]!; return Buffer.concat([Buffer.from("P6 240 160 255\n"), o]); };
  if (process.env.PPM) { writeFileSync(`${process.env.PPM}-src-${a}.ppm`, ppm(rgb, 3)); writeFileSync(`${process.env.PPM}-live-${a}.ppm`, ppm(live, 4)); }
}
