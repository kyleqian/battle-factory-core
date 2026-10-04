/**
 * Find the first source frame of a start-frame probe's move body: the row whose
 * following frames best match the production live view at ages 0..7.
 * usage: altSpeciesFindStart.ts <live-fixture.json> <probe-dir>
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const live = JSON.parse(readFileSync(resolve(root, process.argv[2]!), "utf8"));
const fixture = { ...JSON.parse(readFileSync(resolve(root, live.sourceFixture), "utf8")), ...live } as Fixture;
const probe = JSON.parse(readFileSync(join(process.argv[3]!, "probe.json"), "utf8"));
const frames: { frame: number }[] = probe.frames ?? probe.rows;
const score: [number, number][] = [];
const views = Array.from({ length: 8 }, (_, age) => { const o = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(o, liveView(fixture, age)); return o; });
for (let i = 0; i + 8 < frames.length; i++) {
  let bad = 0;
  for (let k = 0; k < 8; k++) {
    const rgb = readFileSync(join(process.argv[3]!, "rgb", `${String(frames[i + k]!.frame).padStart(5, "0")}.rgb`));
    for (let p = 0; p < 240 * 112; p++) if (rgb[p * 3] !== views[k]![p * 4] || rgb[p * 3 + 1] !== views[k]![p * 4 + 1] || rgb[p * 3 + 2] !== views[k]![p * 4 + 2]) bad++;
  }
  score.push([frames[i]!.frame, bad]);
}
score.sort((a, b) => a[1] - b[1]);
console.log(JSON.stringify({ best: score[0], next: score.slice(1, 4) }));
