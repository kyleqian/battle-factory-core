import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
// age 5 frame 215. Need the app's fb BEFORE clone draws? Instead sample oracle field pixel and app field.
const e: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 5 } };
const app = render(e);
const oracle = readFileSync("/tmp/minimize-player-rgb/00215.rgb");
const px4=(b,x,y)=>{const i=(y*240+x)*4;return [b[i],b[i+1],b[i+2]];};
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
// sample several failing px and compare app/oracle
for (const [x,y] of [[66,86],[67,86],[68,86],[65,87],[66,87],[63,88],[68,93],[69,93],[71,95]]) {
  console.log(`(${x},${y}) app=${px4(app,x,y)} ora=${px3(oracle,x,y)}`);
}
// What is the field pixel there (age0 app)? 
const e0: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 0 } };
const app0 = render(e0);
for (const [x,y] of [[66,86],[63,88],[71,95],[87,111]]) {
  console.log(`age0(${x},${y})=${px4(app0,x,y)}`);
}
