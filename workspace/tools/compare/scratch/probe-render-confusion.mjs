import { createSceneOnMovePresentation } from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";

const stage = createSceneOnMovePresentation({
  move: "CONFUSION",
  attacker: { species: "KADABRA", geometry: { side: "player", spriteCorner: {x:40,y:56}, animationCenter:{x:72,y:96}, battlePositionCenter:{x:72,y:80} } },
  target: { species: "ONIX", geometry: { side: "opponent", spriteCorner:{x:144,y:10}, animationCenter:{x:176,y:42}, battlePositionCenter:{x:176,y:40} } },
  fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100 },
});
const age = 160 - 81; // frame160
const engine = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
const fb = render(engine);
function px(x,y){ const i=(y*240+x)*4; return [fb[i],fb[i+1],fb[i+2]]; }
console.log("sample 180,40:", px(180,40));
console.log("sample 150,15:", px(150,15));
console.log("sample 210,70:", px(210,70));
console.log("sample 145,4:", px(145,4));
