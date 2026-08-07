import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { createSceneOnMovePresentation, sceneOnMinimizeView } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
// frame 211, age 1
const age = 211 - 210;
const engine: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const app = render(engine);
const oracle = readFileSync(resolve(root, "/tmp/minimize-player-rgb/00211.rgb"));
// group diffs by region: bg field top, sprite boxes, message text
let total = 0;
const rows = new Map<number, number>();
for (let y = 0; y < 160; y++) {
  let count = 0;
  for (let x = 0; x < 240; x++) {
    const o = (y*240+x)*3;
    if (app[o] !== oracle[o] || app[o+1] !== oracle[o+1] || app[o+2] !== oracle[o+2]) { count++; total++; }
  }
  if (count) rows.set(y, count);
}
console.log("total diff px:", total);
for (const [y, c] of [...rows.entries()].slice(0, 40)) console.log(`y=${y}: ${c}px`);
