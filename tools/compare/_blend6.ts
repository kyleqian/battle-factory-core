import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
// Find the oracle pixel color at (66,86) age5 = 247,221,240. Check what that is:
// It's LIGHTER than the base sprite 198,156,181. This is likely a blend of the base sprite with a WHITE field.
function blend(c:[number,number,number], t:[number,number,number], eva:number, evb:number){
  return [Math.min(255,Math.floor((c[0]*eva+t[0]*evb)/16)), Math.min(255,Math.floor((c[1]*eva+t[1]*evb)/16)), Math.min(255,Math.floor((c[2]*eva+t[2]*evb)/16))];
}
const c:[number,number,number]=[198,156,181];
console.log("blend(c, white, 10,8):", blend(c,[255,255,255],10,8));  // /16
console.log("blend(c, white, 10,8) /18:", [Math.round((198*10+255*8)/18), Math.round((156*10+255*8)/18), Math.round((181*10+255*8)/18)]);
// oracle = 247,221,240
const oracle:[number,number,number]=[247,221,240];
// solve: what is clone c' and target t such that (10c'+8t)/16 = oracle? If t=white:
// 10c' = 16*oracle - 8*255
const c2:[number,number,number]=[(16*oracle[0]-8*255)/10,(16*oracle[1]-8*255)/10,(16*oracle[2]-8*255)/10];
console.log("implied clone c' (t=white,/16):", c2);
