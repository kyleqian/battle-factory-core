import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const e: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 3 } };
const app = render(e);
const oracle = readFileSync("/tmp/minimize-player-rgb/00213.rgb");
const px4=(b,x,y)=>{const i=(y*240+x)*4;return [b[i],b[i+1],b[i+2]];};
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
let n=0;
for (let y=79;y<112;y++)for(let x=50;x<94;x++){ const a=px4(app,x,y),o=px3(oracle,x,y);
  if(a[0]!==o[0]||a[1]!==o[1]||a[2]!==o[2]){ n++; if(n<=12) console.log(`(${x},${y}) app=${a} ora=${o}`); } }
console.log("diffs:", n);
