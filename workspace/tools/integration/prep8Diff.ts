// Debug helper: mismatch bounding boxes of a retained live-adapter run. usage: prep8Diff.ts <fixture.json> <run-dir> <age>...
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const [fixturePath, dir, ...ages] = process.argv.slice(2);
const fixture = JSON.parse(readFileSync(resolve(fixturePath!), "utf8")) as Fixture;
const comparison = JSON.parse(readFileSync(join(dir!, "live-comparison.json"), "utf8"));
for (const a of ages) {
  const age = Number(a), row = comparison.comparisons.find((r: { age: number }) => r.age === age);
  const rgb = readFileSync(join(dir!, "rgb", `${String(row.frame).padStart(5, "0")}.rgb`));
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, liveView(fixture, age));
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1, n = 0; const sample: string[] = [];
  for (let p = 0; p < 240 * 160; p++) {
    if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) {
      const x = p % 240, y = Math.floor(p / 240); n++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (sample.length < 4) sample.push(`(${x},${y}) rom ${rgb[p * 3]},${rgb[p * 3 + 1]},${rgb[p * 3 + 2]} live ${rgba[p * 4]},${rgba[p * 4 + 1]},${rgba[p * 4 + 2]}`);
    }
  }
  console.log(`age ${age} frame ${row.frame}: ${n} px bbox x ${x0}..${x1} y ${y0}..${y1}`, sample.join(" | "));
}
