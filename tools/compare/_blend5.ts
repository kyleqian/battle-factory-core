import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
// At age 5, what's the static field pixel at (66,86)? render field only by drawing attacker away
// Instead compute the GRIMER back sprite tile at the location the clone samples.
const asset = JSON.parse(readFileSync(resolve(root, "src/assets/gen/battle-back-sprites.json"), "utf8"))["GRIMER"];
const tileset = asset.tileset;
const palette = asset.palette;
const w = tileset.columns*8, h = tileset.rows*8, halfW=w/2, halfH=h/2;
// clone matrix 376, y2 6. At screen (66,86): dx=26, dy=86-60-6=20
const clone = { matrix: 376, y2: 6 };
const ox=40, oy=60;
function sample(matrix:number, y2:number, dx:number, dy:number): [number,number,number]|null {
  const ry = dy - halfH, rx = dx - halfW;
  const sy = ((ry*matrix)>>8)+halfH, sx = ((rx*matrix)>>8)+halfW;
  if (sy<0||sy>=h||sx<0||sx>=w) return null;
  const tile = tileset.tiles[Math.floor(sy/8)*tileset.columns + Math.floor(sx/8)];
  const idx = tile[(sy%8)*8 + (sx%8)];
  if (idx===0) return null;
  const c = palette[idx];
  return [c.r,c.g,c.b];
}
// the failing pixel is (66,86) at age 5. But which clone covers it? clone0 m256 y2 0 and clone1 m376 y2 6.
for (const cl of [{matrix:256,y2:0},{matrix:376,y2:6}]) {
  const c = sample(cl.matrix, cl.y2, 66-ox, 86-oy-cl.y2);
  console.log(`clone m=${cl.matrix} samples at (66,86):`, c);
}
// static field at (66,86): use the drawTileBg - approximate by reading the app at a NON-attacker field pixel
// Actually read staticBgPixel equivalent: use app at age 0 minus attacker? skip. try both white and a field sample.
function blend(c:[number,number,number], t:[number,number,number], eva:number, evb:number){
  return [Math.min(255,Math.floor((c[0]*eva+t[0]*evb)/16)), Math.min(255,Math.floor((c[1]*eva+t[1]*evb)/16)), Math.min(255,Math.floor((c[2]*eva+t[2]*evb)/16))];
}
