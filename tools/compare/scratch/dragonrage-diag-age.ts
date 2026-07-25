// Per-pixel diff dump for one render age against a cached probe/rgb dir
// (produced by dragonrage-lag-bisect.ts or dragonrage-dense-cached.ts's own
// oracle run) - usage: dragonrage-diag-age.ts <age> <scratchDir>.
import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation } from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";

const age = Number(process.argv[2] ?? 80);
const scratch = process.argv[3];
if (!scratch) throw new Error("usage: dragonrage-diag-age.ts <age> <scratchDir>");
const fixture = JSON.parse(readFileSync("tools/compare/fixtures/dragon-rage-player-charmeleon-opponent-onix.json", "utf8"));
const stage = createSceneOnMovePresentation({ move: "DRAGON_RAGE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile });
const engine = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const rgba = render(engine);
const oracle = readFileSync(scratch + "/rgb/" + String(age + 89).padStart(5, "0") + ".rgb");
const diffs: any[] = [];
for (let y = 0; y < 160; y++) {
  for (let x = 0; x < 240; x++) {
    const o = (y * 240 + x) * 3, a = (y * 240 + x) * 4;
    if (oracle[o] !== rgba[a] || oracle[o + 1] !== rgba[a + 1] || oracle[o + 2] !== rgba[a + 2]) {
      diffs.push([x, y, oracle[o], oracle[o + 1], oracle[o + 2], rgba[a], rgba[a + 1], rgba[a + 2]]);
    }
  }
}
console.log("total diff px", diffs.length);
console.log(diffs.slice(0, 10));
console.log(diffs.slice(-10));
