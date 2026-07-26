// Diagnostic: futureSightPortable.ts's own mismatch report only computes a
// bbox for the FIRST mismatched frame in a dense window - this script reuses
// an already-populated scratch dir to print the ACTUAL per-frame mismatch
// bbox for a chosen frame list, to check whether a residual named from the
// first diff frame alone (e.g. "confined to the attacker box") still holds
// at LATER frames in the same window. Usage:
//   npx tsx tools/compare/scratch/future-sight-per-frame-bbox.ts <scratchDir> <frame> [<frame> ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
} from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";
import { getMonGender } from "../../../src/engine/monGender.ts";

const scratch = process.argv[2]!;
const frameArgs = process.argv.slice(3).map(Number);
const fixture = JSON.parse(
  readFileSync("tools/compare/fixtures/future-sight-player-kadabra-opponent-onix.json", "utf8"),
) as {
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
};
const probe = JSON.parse(readFileSync(join(scratch, "probe.json"), "utf8")) as {
  frames: { frame: number; player: { hp: number; maxHp: number }; opponent: { hp: number; maxHp: number }; playerPersonality: number; opponentPersonality: number }[];
};
const framesByNum = new Map(probe.frames.map((f) => [f.frame, f]));
const GENDER_RATIO: Record<string, number> = { KADABRA: 63, ONIX: 127 };
const startOracle = framesByNum.get(fixture.denseWindow.startFrame)!;
const playerGender = getMonGender(GENDER_RATIO.KADABRA!, startOracle.playerPersonality);
const opponentGender = getMonGender(GENDER_RATIO.ONIX!, startOracle.opponentPersonality);
const stage = createSceneOnMovePresentation({
  move: "FUTURE_SIGHT",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: {
    playerHp: startOracle.player.hp,
    playerMaxHp: startOracle.player.maxHp,
    opponentHp: startOracle.opponent.hp,
    opponentMaxHp: startOracle.opponent.maxHp,
    playerGender: playerGender === "genderless" ? undefined : playerGender,
    opponentGender: opponentGender === "genderless" ? undefined : opponentGender,
  },
});

for (const frame of frameArgs) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  const samples: string[] = [];
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const o = pixel * 3;
    const a = pixel * 4;
    if (app[a] === oracleRgb[o] && app[a + 1] === oracleRgb[o + 1] && app[a + 2] === oracleRgb[o + 2]) continue;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (samples.length < 6) {
      samples.push(`${x},${y}: app=${app[a]},${app[a + 1]},${app[a + 2]} oracle=${oracleRgb[o]},${oracleRgb[o + 1]},${oracleRgb[o + 2]}`);
    }
  }
  console.log(`frame${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  console.log(samples.join("\n"));
}
