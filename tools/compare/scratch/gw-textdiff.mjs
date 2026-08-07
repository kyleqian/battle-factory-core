import { createSceneOnMovePresentation } from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";
import { readFileSync } from "node:fs";
const stage = createSceneOnMovePresentation({
  move: "GRASS_WHISTLE",
  attacker: { species: "ROSELIA", geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 } } },
  target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
  fieldProfile: { playerHp: 147, playerMaxHp: 157, opponentHp: 110, opponentMaxHp: 110, playerGender: "female", opponentGender: "male" },
});
const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 0 } });
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
// compare rows 139-149, cols 30-110 char by char
for (let y=139;y<150;y++){
  let oline="", aline="";
  for (let x=30;x<110;x++){
    const oo=(y*240+x)*3, aa=(y*240+x)*4;
    oline += (oracle[oo]===255&&oracle[oo+1]===255&&oracle[oo+2]===255)?"#":((oracle[oo]===107&&oracle[oo+1]===90&&oracle[oo+2]===115)?".":" ");
    aline += (app[aa]===255&&app[aa+1]===255&&app[aa+2]===255)?"#":((app[aa]===107&&app[aa+1]===90&&app[aa+2]===115)?".":" ");
  }
  const mark = oline===aline ? "" : "  <<< DIFF";
  console.log(`${y} O|${oline}|${mark}`);
  if (oline!==aline) console.log(`  A|${aline}|`);
}
