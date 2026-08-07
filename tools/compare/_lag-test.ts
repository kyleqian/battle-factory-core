import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const oracle = readFileSync("/tmp/minimize-player-rgb/00212.rgb");
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
console.log("oracle(60,80) frame212:", px3(oracle,60,80));
console.log("oracle(50,70) frame212:", px3(oracle,50,70));
// compare against app at age2 with lag1 vs lag2 (scale 296 vs 256)
for (const lag of [1,2]) {
  const e: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 2 } };
  // patch age for affine via age-1 or age-2: we render full app; instead measure the drawn attacker size indirectly
  // sample app pixel
  const app = render(e);
  const px4=(b,x,y)=>{const i=(y*240+x)*4;return [b[i],b[i+1],b[i+2]];};
  console.log(`lag applied? app(60,80) age2 (unlagged):`, px4(app,60,80), "oracle:", px3(oracle,60,80));
}
