import { readFileSync } from "node:fs";
import { createSceneOnMovePresentation, sceneOnGrassWhistleView } from "../../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";

const stage = createSceneOnMovePresentation({
  move: "GRASS_WHISTLE",
  attacker: {
    species: "ROSELIA",
    geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 } },
  },
  target: {
    species: "ONIX",
    geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } },
  },
  fieldProfile: { playerHp: 147, playerMaxHp: 157, opponentHp: 110, opponentMaxHp: 110, playerGender: "female", opponentGender: "male" },
});
const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 0 } });
const oracle = readFileSync("/tmp/gw-probe/rgb/00216.rgb");
let count = 0; let minX=240,minY=160,maxX=-1,maxY=-1;
for (let p=0;p<240*160;p++){
  const o=p*3, a=p*4;
  if (app[a]===oracle[o]&&app[a+1]===oracle[o+1]&&app[a+2]===oracle[o+2]) continue;
  count++;
  const x=p%240,y=Math.floor(p/240);
  minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  if (count<=5) console.log(`pixel ${x},${y} app=${app[a]},${app[a+1]},${app[a+2]} oracle=${oracle[o]},${oracle[o+1]},${oracle[o+2]}`);
}
console.log(`frame 216 diffs: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
