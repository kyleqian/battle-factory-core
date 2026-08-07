import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation, sceneOnMinimizeView } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const age = 5;
const engine: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const app = render(engine);
const oracle = readFileSync("/tmp/minimize-player-rgb/00215.rgb");
const px=(b,x,y)=>{const i=(y*240+x)*4;return [b[i],b[i+1],b[i+2]];};
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
// field color (static): what is at (66,86) with no attacker? use white field approx
console.log("app(66,86):", px(app,66,86), "oracle(66,86):", px3(oracle,66,86));
console.log("app(67,86):", px(app,67,86), "oracle(67,86):", px3(oracle,67,86));
// What does the attacker sprite look like at that region (scale 456 y2 9)? sample clone-free frame 210
const e0: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 0 } };
const app0 = render(e0);
console.log("age0 app(66,86):", px(app0,66,86), "oracle age0(66,86):", px3(readFileSync("/tmp/minimize-player-rgb/00210.rgb"),66,86));
// blend functions
function blend(c:[number,number,number], t:[number,number,number], eva:number, evb:number){
  return [Math.round((eva*c[0]+evb*t[0])/(eva+evb)), Math.round((eva*c[1]+evb*t[1])/(eva+evb)), Math.round((eva*c[2]+evb*t[2])/(eva+evb))];
}
