import { renderBattleScene, TICK0 } from "../../../src/engine/battleScene.ts";

function pixelAtSentOut(t, x, y) {
  const fb = new Uint8Array(240*160*4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380 });
  const o = (y*240+x)*4;
  return [fb[o], fb[o+1], fb[o+2]];
}

console.log("PART1 bleed pixel (1500, 25,26):", pixelAtSentOut(1500,25,26));
console.log("PART1 content pixel (1500, 3,16):", pixelAtSentOut(1500,3,16));

const GX=144, GY=12;
for (const [dx,dy] of [[0,0],[10,0],[20,0],[30,0],[40,0],[0,10],[0,20],[0,30],[0,40],[0,50],[0,60],[20,50],[40,60],[49,0]]) {
  const v = pixelAtSentOut(1503, GX+dx, GY+dy);
  console.log(`1503 @+(${dx},${dy}):`, v);
}

console.log("--- edge-of-bounds probe (et=41, tick 1503) ---");
console.log("dx=0,dy=32:", pixelAtSentOut(1503, GX+0, GY+32));
console.log("dx=1,dy=32:", pixelAtSentOut(1503, GX+1, GY+32));
console.log("dx=2,dy=32:", pixelAtSentOut(1503, GX+2, GY+32));
console.log("--- same coords but tick 1502 (et=40, xScale=260) for comparison ---");
console.log("1502 dx=0,dy=32:", pixelAtSentOut(1502, GX+0, GY+32));
console.log("--- tick 1497 (et=35, first early-table tick, neutral 256) ---");
console.log("1497 dx=0,dy=32:", pixelAtSentOut(1497, GX+0, GY+32));
