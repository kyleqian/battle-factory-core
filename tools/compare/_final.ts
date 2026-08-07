import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const e: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 2 } };
const app = render(e);
const oracle = readFileSync("/tmp/minimize-player-rgb/00212.rgb");
const px4=(b,x,y)=>{const i=(y*240+x)*4;return [b[i],b[i+1],b[i+2]];};
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
for (const [x,y] of [[46,73],[50,80],[60,90],[70,100],[97,111],[55,86]]) {
  console.log(`(${x},${y}) app=${px4(app,x,y)} ora=${px3(oracle,x,y)}`);
}
