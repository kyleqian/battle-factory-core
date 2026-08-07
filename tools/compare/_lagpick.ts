import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const oracle = readFileSync("/tmp/minimize-player-rgb/00212.rgb");
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
// attacker RAM scale at frame 212 = 336 (task data). Check oracle attacker edge
// frame 212 row y=75: oracle shows purple from x=40..? find where GRIMER body (198,156,181) starts
for (let x=40;x<70;x++) console.log(`oracle x=${x} y=75:`, px3(oracle,x,75));
