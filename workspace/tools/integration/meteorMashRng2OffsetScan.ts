/** s10a part 0 (d): offline Random2 activation-offset scan for a Meteor Mash fixture against retained RGB probe frames (field rows).
 *  usage: node --experimental-strip-types tools/integration/meteorMashRng2OffsetScan.ts <fixture.json> <retainedRun0Dir> <kFrom> <kTo> <ageFrom> <ageTo> */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { liveView } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
const [path, scratch, k0, k1, a0, a1] = process.argv.slice(2);
const fx = JSON.parse(readFileSync(path!, "utf8"));
const cmp = JSON.parse(readFileSync(join(scratch!, "live-comparison.json"), "utf8"));
const A = 1103515245n, C = 24691n, M = 1n << 32n;
const Ainv = (() => { let t = 0n, nt = 1n, r = M, nr = A; while (nr) { const q = r / nr; [t, nt] = [nt, t - q * nt]; [r, nr] = [nr, r - q * nr]; } return ((t % M) + M) % M; })();
const step = (v: bigint, k: number) => { for (let i = 0; i < Math.abs(k); i++) v = k > 0 ? (A * v + C) % M : (((v - C) % M + M) % M * Ainv) % M; return v; };
const rgbs = new Map<number, Buffer>();
for (const r of cmp.comparisons) if (r.age >= Number(a0) && r.age <= Number(a1)) rgbs.set(r.age, readFileSync(join(scratch!, "rgb", `${String(r.frame).padStart(5, "0")}.rgb`)));
const base = BigInt(fx.presentationRngActivation.value);
const t0 = Date.now();
for (let k = Number(k0); k <= Number(k1); k++) {
  const f = { ...fx, presentationRngActivation: { ...fx.presentationRngActivation, value: Number(step(base, k)) } };
  let px = 0;
  for (const [age, rgb] of rgbs) {
    const rgba = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(rgba, liveView(f, age));
    for (let p = 0; p < 240 * 112; p++) if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) px++;
  }
  console.log(k, px, Date.now() - t0);
}
