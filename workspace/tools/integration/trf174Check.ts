// trf174: render each fixture's window through the PRODUCTION live renderer (liveAdapterFramebuffer.ts liveView ->
// renderBattleResolutionLiveView) against an existing trf174Probe.py run's RGB (no new emulator run). Fast iteration aid; the
// receipts of record come from liveFixtureDriver.ts (2 fresh probe processes).
// usage: node --experimental-strip-types --no-warnings tools/integration/trf174Check.ts <probe-dir> <fixture.json>...
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { inflateSync } from "node:zlib";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const [dir, ...paths] = process.argv.slice(2);
let failed = false;
for (const path of paths) {
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  const name = basename(f.scenario, ".json");
  const rows: number[] = [];
  for (let frame = f.denseWindow!.startFrame; frame <= f.denseWindow!.endFrame; frame++) {
    const rgb = inflateSync(readFileSync(join(dir!, `${name}-r1-rgb`, `${String(frame).padStart(5, "0")}.rgb.z`)));
    const rgba = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(rgba, liveView(f, frame - f.denseWindow!.startFrame));
    let n = 0;
    for (let p = 0; p < 240 * 160; p++) {
      if (rgb[p * 3] !== rgba[p * 4] || rgb[p * 3 + 1] !== rgba[p * 4 + 1] || rgb[p * 3 + 2] !== rgba[p * 4 + 2]) n++;
    }
    rows.push(n);
  }
  const bad = rows.map((n, age) => [age, n]).filter(([, n]) => n > 0);
  if (bad.length) failed = true;
  console.log(`${name}: ${rows.length - bad.length}/${rows.length} rows 0 px, residual ${rows.reduce((a, b) => a + b, 0)}`
    + (bad.length ? ` first ${JSON.stringify(bad.slice(0, 12))}` : ""));
}
if (failed) process.exitCode = 1;
