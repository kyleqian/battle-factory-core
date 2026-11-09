/** issue151: mid-frame (late VBlank) upload test. For each age, the full-frame residual of ROM frame start+age against the composite
 *  [live(age-1) scanlines 0..N-1] + [live(age) scanlines N..159] for every N in 0..160; prints the N values that give 0 px (N=0 is the plain row compare).
 *  usage: npx vite-node issue151Tear.ts <fixture.json> <evidenceRunDir> <startFrame> <age>... */
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fp, scratch, first, ...ages] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fp!), "utf8")) as Fixture;
const render = (a: number) => { const b = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(b, liveView(f, a)); return b; };
for (const a of ages.map(Number)) {
  const prev = render(a - 1), cur = render(a);
  const rom = readFileSync(join(scratch!, "rgb", `${String(Number(first) + a).padStart(5, "0")}.rgb`));
  const linePx = (src: Uint8Array, y: number) => { let n = 0; for (let x = 0; x < 240; x++) { const p = y * 240 + x;
    if (rom[p * 3] !== src[p * 4] || rom[p * 3 + 1] !== src[p * 4 + 1] || rom[p * 3 + 2] !== src[p * 4 + 2]) n++; } return n; };
  const prevPx = Array.from({ length: 160 }, (_, y) => linePx(prev, y)), curPx = Array.from({ length: 160 }, (_, y) => linePx(cur, y));
  const zero: number[] = [];
  for (let n = 0; n <= 160; n++) { let s = 0; for (let y = 0; y < 160; y++) s += y < n ? prevPx[y]! : curPx[y]!; if (s === 0) zero.push(n); }
  const prevLines = prevPx.flatMap((v, y) => v === 0 ? [y] : []), curBad = curPx.flatMap((v, y) => v > 0 ? [y] : []);
  console.log(`age ${a}: plain residual ${curPx.reduce((s, v) => s + v, 0)} px on scanlines [${curBad.join(",")}]; composite live(${a - 1})|live(${a}) 0 px for N in ${zero.length ? `${zero[0]}..${zero[zero.length - 1]}` : "none"}; scanlines where ROM == live(${a - 1}): ${prevLines.length === 160 ? "all" : `${prevLines.filter(y => y < 40).join(",")}${prevLines.some(y => y >= 40) ? ",..." : ""}`}`);
}
