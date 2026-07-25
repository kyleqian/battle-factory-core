import { readFileSync } from "node:fs";
import {
  createSceneOnMovePresentation,
} from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render } from "../../../src/engine/core.ts";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/shadow-punch-player-haunter-opponent-onix.json", "utf8"));
const stage = createSceneOnMovePresentation({
  move: "SHADOW_PUNCH",
  attacker: fixture.attacker,
  target: fixture.target,
  attackerSpriteId: fixture.attackerSpriteId,
  attackerMoveSpeed: fixture.attackerMoveSpeed,
  attackerSubpriority: fixture.attackerSubpriority,
  fieldProfile: fixture.fieldProfile,
});

function renderAtAge(age: number): Uint8Array {
  const engine = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
  return render(engine);
}

function compareToOracle(frame: number, lag: number): number {
  const oracleRgb = readFileSync(`/tmp/spunch-probe/rgb/${String(frame).padStart(5,"0")}.rgb`);
  const age = frame - 85 - lag;
  const rgba = renderAtAge(age);
  let diff = 0;
  for (let p = 0; p < 240*160; p++) {
    if (oracleRgb[p*3] !== rgba[p*4] || oracleRgb[p*3+1] !== rgba[p*4+1] || oracleRgb[p*3+2] !== rgba[p*4+2]) diff++;
  }
  return diff;
}

for (const lag of [-2,-1,0,1,2]) {
  const results = [];
  for (const frame of [123,126,130,134,140,150,160]) {
    results.push(`${frame}:${compareToOracle(frame, lag)}`);
  }
  console.log(`lag=${lag}`, results.join(" "));
}
