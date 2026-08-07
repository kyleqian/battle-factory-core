import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/minimize-player-grimer-opponent-onix.json"), "utf8"));
const stage = createSceneOnMovePresentation({ move: "MINIMIZE", attacker: fixture.attacker, target: fixture.target, fieldProfile: fixture.fieldProfile, battlerHeight: 40 } as never);
const oracle = readFileSync("/tmp/minimize-player-rgb/00212.rgb");
const px3=(b,x,y)=>{const i=(y*240+x)*3;return [b[i],b[i+1],b[i+2]];};
// attacker corners in oracle: sample row y=75 across x to find sprite extent
const row: Record<number, number[]> = {};
for (let x=40;x<100;x++){ row[x] = px3(oracle,x,75); }
// print distinct colors
const seen = new Set<string>();
for (let x=40;x<100;x++){ const c = row[x]!.join(","); if(!seen.has(c)){seen.add(c); console.log(`oracle x=${x} y=75:`, row[x]);} }
