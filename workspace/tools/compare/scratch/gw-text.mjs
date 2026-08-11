import { createSceneOnMovePresentation } from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";
const stage = createSceneOnMovePresentation({
  move: "GRASS_WHISTLE",
  attacker: { species: "ROSELIA", geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 } } },
  target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
  fieldProfile: { playerHp: 147, playerMaxHp: 157, opponentHp: 110, opponentMaxHp: 110, playerGender: "female", opponentGender: "male" },
});
const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 0 } });
console.log("app rows 128-150 text map (cols 40-160):");
for (let y=128;y<151;y++){
  let line="";
  for (let x=40;x<160;x++){
    const off=(y*240+x)*4;
    const r=app[off],g=app[off+1],b=app[off+2];
    if (r===255&&g===255&&b===255) line+="#";
    else if (r===107&&g===90&&b===115) line+=".";
    else line+=" ";
  }
  console.log(`${y} ${line}`);
}
