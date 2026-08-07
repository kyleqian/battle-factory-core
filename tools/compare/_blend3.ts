import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const age = 5;
const e0: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 0 } };
const app0 = render(e0);
const oracle0 = readFileSync("/tmp/minimize-player-rgb/00210.rgb");
const px4=(b,x,y)=>{const i=(y*240+x)*4;return [b[i],b[i+1],b[i+2]];};
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
function blend(c:[number,number,number], t:[number,number,number], eva:number, evb:number){
  return [Math.round((eva*c[0]+evb*t[0])/(eva+evb)), Math.round((eva*c[1]+evb*t[1])/(eva+evb)), Math.round((eva*c[2]+evb*t[2])/(eva+evb))];
}
// Field color beneath attacker area: use age0 app pixel where no sprite? find a field-only pixel near (66,86)
// Actually age0 app at (66,86) = 198,156,181 = GRIMER body. The static field behind is what?
// Let me sample a clear field pixel e.g. (20,130)
console.log("field sample app0(10,130):", px4(app0,10,130), "oracle0:", px3(oracle0,10,130));
console.log("app0(66,86) GRIMER body:", px4(app0,66,86));
// oracle at age5 (66,86) = 247,221,240. Try blends of GRIMER body pixel with field:
const c = px4(app0,66,86) as [number,number,number];
const field = px4(app0,10,130) as [number,number,number];
console.log("blend(c,field,10,8):", blend(c,field,10,8));
console.log("blend(c,field,8,10):", blend(c,field,8,10));
console.log("blend(c,white,10,8):", blend(c,[255,255,255],10,8));
console.log("blend(c,white,8,10):", blend(c,[255,255,255],8,10));
