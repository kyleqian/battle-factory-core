import { renderBattleScene, TICK0 } from "../../../src/engine/battleScene.ts";

function pixelAtSentOut(t, x, y) {
  const fb = new Uint8Array(240*160*4);
  renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380 });
  const o = (y*240+x)*4;
  return [fb[o], fb[o+1], fb[o+2]];
}

const GX=144, GY=12;
for (const tick of [1499, 1500, 1501, 1502, 1503]) {
  // Find boundary pixels: opaque (tint) neighbors adjacent to transparent, scanning the box
  let edges = [];
  for (let dy = 0; dy < 64; dy++) {
    for (let dx = 0; dx < 64; dx++) {
      const c = pixelAtSentOut(tick, GX+dx, GY+dy);
      const isTint = c[0]===255 && c[1]===181 && c[2]===247;
      if (dx > 0) {
        const cL = pixelAtSentOut(tick, GX+dx-1, GY+dy);
        const isTintL = cL[0]===255 && cL[1]===181 && cL[2]===247;
        if (isTint !== isTintL) edges.push([dx,dy,'x']);
      }
    }
  }
  console.log(`tick ${tick}: ${edges.length} x-edges, first 5:`, edges.slice(0,5));
}

console.log("--- exact boundary check ---");
console.log("1503 (48,2):", pixelAtSentOut(1503, GX+48, GY+2));
console.log("1503 (49,2):", pixelAtSentOut(1503, GX+49, GY+2));
console.log("1499 (56,4):", pixelAtSentOut(1499, GX+56, GY+4));
console.log("1499 (57,4):", pixelAtSentOut(1499, GX+57, GY+4));

console.log("1499 (48,4):", pixelAtSentOut(1499, GX+48, GY+4));
console.log("1499 (49,4):", pixelAtSentOut(1499, GX+49, GY+4));
