/** speciesAudit3: lag-frame confirmation. For each age, full-frame residual px between live(age) and the retained ROM frame firstFrame+age+delta for delta in -1,0,+1
 *  (a ROM lag frame makes ROM frame f+1 show the animation state live shows at age f). usage: npx vite-node speciesAudit3LagShift.ts <fixture.json> <evidenceRunDir> <firstFrame> <age>... */
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
const [fixturePath, scratch, firstFrame, ...ages] = process.argv.slice(2);
const f = JSON.parse(readFileSync(resolve(fixturePath!), "utf8")) as Fixture;
for (const a of ages.map(Number)) {
  const live = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(live, liveView(f, a));
  const out: string[] = [];
  for (const d of [-1, 0, 1]) {
    let rgb: Buffer; try { rgb = readFileSync(join(scratch!, "rgb", `${String(Number(firstFrame) + a + d).padStart(5, "0")}.rgb`)); } catch { out.push(`${d >= 0 ? "+" : ""}${d}=n/a`); continue; }
    let n = 0; for (let p = 0; p < 240 * 160; p++) if (rgb[p * 3] !== live[p * 4] || rgb[p * 3 + 1] !== live[p * 4 + 1] || rgb[p * 3 + 2] !== live[p * 4 + 2]) n++;
    out.push(`${d >= 0 ? "+" : ""}${d}=${n}`);
  }
  console.log(`age ${a}: ROM frame offset ${out.join(" ")}`);
}
