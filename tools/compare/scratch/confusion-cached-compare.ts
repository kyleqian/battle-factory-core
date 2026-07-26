// Disposable: re-run the CONFUSION dense comparator against an
// already-populated scratch dir (no re-invoking mgba) - for fast lag
// iteration. Usage:
//   npx tsx tools/compare/scratch/confusion-cached-compare.ts <scratchDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnConfusionView,
  type SceneOnPresentationBattler,
} from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";
import { getMonGender } from "../../../src/engine/monGender.ts";

const scratch = process.argv[2]!;
const fixture = JSON.parse(
  readFileSync("tools/compare/fixtures/confusion-player-kadabra-opponent-onix.json", "utf8"),
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
  move: "CONFUSION",
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

let matches = 0;
const mismatchCounts: [number, number][] = [];
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const oracleRgb = readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
  let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const o = pixel * 3;
    const a = pixel * 4;
    if (app[a] !== oracleRgb[o] || app[a + 1] !== oracleRgb[o + 1] || app[a + 2] !== oracleRgb[o + 2]) {
      count += 1;
    }
  }
  if (count === 0) matches += 1;
  else mismatchCounts.push([frame, count]);
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`CONFUSION framebuffer ${matches}/${total}`);
console.log(mismatchCounts.map(([f, c]) => `${f}:${c}`).join(" "));
