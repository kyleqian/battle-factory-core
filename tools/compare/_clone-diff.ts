import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
for (const age of [2, 5, 8, 21, 22]) {
  const engine: any = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
  const app = render(engine);
  const frame = 210 + age;
  const oracle = readFileSync(`/tmp/minimize-player-rgb/${String(frame).padStart(5,"0")}.rgb`);
  let total=0; const detail=[];
  for (let y=0;y<160;y++){for(let x=0;x<240;x++){const i=(y*240+x)*3;const o=(y*240+x)*4;
    if(app[o]!==oracle[i]||app[o+1]!==oracle[i+1]||app[o+2]!==oracle[i+2]){
      total++;
      if(detail.length<8) detail.push(`(${x},${y}) app=${app[o]},${app[o+1]},${app[o+2]} ora=${oracle[i]},${oracle[i+1]},${oracle[i+2]}`);
    }}}
  console.log(`age ${age}: diff=${total}`);
  for (const d of detail) console.log("   ", d);
}
