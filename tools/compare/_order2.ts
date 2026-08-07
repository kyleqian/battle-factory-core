import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
// simulate clone-in-front + live by checking the blend math directly
// oracle (65,79) = 247,221,240. GRIMER light body = 231,189,222. blend toward white?
function blend(c,t,eva,evb){return [Math.min(255,Math.floor((c*eva+t*evb)/16))];}
// try: clone body 231 over field 247? 
console.log("blend(231,247,10,8):", blend(231,247,10,8));
console.log("blend(231,255,10,8):", blend(231,255,10,8));
console.log("blend(247,231,10,8):", blend(247,231,10,8));  // swap: field 247 over body 231
// oracle is 247,221,240; is this field(247,247,255) blended with body? 
