import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const engine: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 1 } };
const app = render(engine);
const oracle = readFileSync("/tmp/minimize-player-rgb/00211.rgb");
// Which regions match? Build a per-row mismatch count but only over oracle-visible differences
let total=0; const rows=new Map();
for (let y=0;y<160;y++){let c=0;for(let x=0;x<240;x++){const i=(y*240+x)*3;if(app[i]!==oracle[i]||app[i+1]!==oracle[i+1]||app[i+2]!==oracle[i+2]){c++;total++;}}if(c)rows.set(y,c);}
console.log("total:",total);
const ranges=[...rows.entries()];
// group contiguous row ranges
let out=[];let start=null,prev=null;
for(const [y,c] of ranges){if(start===null){start=y;}if(prev!==null&&y===prev+1){}else if(prev!==null){out.push([start,prev]);start=y;}prev=y;}
if(start!==null)out.push([start,prev]);
console.log("diff row ranges:", JSON.stringify(out));
// sample oracle bg colors
const px=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
console.log("oracle:", px(oracle,0,0), px(oracle,120,80), px(oracle,40,60), px(oracle,144,10));
console.log("app   :", px(app,0,0), px(app,120,80), px(app,40,60), px(app,144,10));
