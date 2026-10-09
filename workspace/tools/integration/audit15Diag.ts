// Live audit 15 diagnosis: a consumer fixture's production rows vs a probe's RGB frames (prep48Probe.py rgb dir kept by the caller), with
// the residual bbox and the residual at production ages shifted by -1 / +1 (a one-row phase shows 0 at a shift).
//   node --experimental-strip-types --no-warnings tools/integration/audit15Diag.ts <fixture.json> <rgb-dir> <row> [<row> ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";

const [path, rgbDir, ...rowArgs] = process.argv.slice(2) as [string, string, ...string[]];
const f = JSON.parse(readFileSync(path, "utf8")) as Fixture & { denseWindow: { startFrame: number; ageOffset?: number } };
const render = (age: number) => { const rgba = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(rgba, liveView(f, age)); return rgba; };
for (const row of rowArgs.map(Number)) {
  const rgb = readFileSync(join(rgbDir, `${String(f.denseWindow.startFrame + row).padStart(5, "0")}.rgb`));
  const age = row + (f.denseWindow.ageOffset ?? 0);
  const res: Record<string, unknown> = { row, age };
  for (const shift of [0, -1, 1]) {
    const live = render(age + shift);
    let px = 0, x0 = 240, x1 = -1, y0 = 160, y1 = -1;
    const colors = new Map<string, number>();
    for (let p = 0; p < 240 * 160; p++) {
      if (rgb[p * 3] !== live[p * 4] || rgb[p * 3 + 1] !== live[p * 4 + 1] || rgb[p * 3 + 2] !== live[p * 4 + 2]) {
        px++; const x = p % 240, y = Math.floor(p / 240);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        const k = `${[rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]].map((v) => v!.toString(16).padStart(2, "0")).join("")}<-${[live[p * 4], live[p * 4 + 1], live[p * 4 + 2]].map((v) => v!.toString(16).padStart(2, "0")).join("")}`;
        colors.set(k, (colors.get(k) ?? 0) + 1);
      }
    }
    res[`shift${shift}`] = { px, bbox: px ? [x0, x1, y0, y1] : null, colors: [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) };
  }
  console.log(JSON.stringify(res));
}
