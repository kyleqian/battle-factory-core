// Reuses an already-populated futureSightPortable.ts scratch dir (arg 1) to
// re-check the KADABRA attacker-box residual against the CURRENT
// sceneOnFutureSightView (whatever (scaleLag, tintLag) is hardcoded there
// right now), without re-invoking the oracle. Edit the two lag constants in
// src/engine/sceneOnPresentation.ts between runs to bisect - this script
// just makes each recheck ~1s instead of ~7s (no emulator respawn).
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
} from "../../../src/engine/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";
import { getMonGender } from "../../../src/engine/monGender.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const fixturePath = resolve(root, "tools/compare/fixtures/future-sight-player-kadabra-opponent-onix.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
};

const scratch = process.argv[2]!;
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

function oracleRgbAt(frame: number): Buffer {
  return readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
}

const BOX = { x0: 44, y0: 65, x1: 101, y1: 112 };

function boxDiff(oracle: Buffer, app: Uint8Array): number {
  let diff = 0;
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      const o = (y * 240 + x) * 3;
      const a = (y * 240 + x) * 4;
      if (oracle[o] !== app[a] || oracle[o + 1] !== app[a + 1] || oracle[o + 2] !== app[a + 2]) diff += 1;
    }
  }
  return diff;
}

function fullFrameDiff(oracle: Buffer, app: Uint8Array): number {
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const o = pixel * 3;
    const a = pixel * 4;
    if (oracle[o] !== app[a] || oracle[o + 1] !== app[a + 1] || oracle[o + 2] !== app[a + 2]) diff += 1;
  }
  return diff;
}

const WINDOW = { start: fixture.denseWindow.startFrame, end: fixture.denseWindow.endFrame };
let matches = 0;
const perFrame: { frame: number; boxDiff: number; full: number }[] = [];
for (let frame = WINDOW.start; frame <= WINDOW.end; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - WINDOW.start;
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const oracle = oracleRgbAt(frame);
  const bd = boxDiff(oracle, app);
  const full = fullFrameDiff(oracle, app);
  if (full === 0) matches += 1;
  perFrame.push({ frame, boxDiff: bd, full });
}
console.log(`matches=${matches}/${WINDOW.end - WINDOW.start + 1}`);
const mismatchRows = perFrame.filter((r) => r.full !== 0);
if (mismatchRows.length) {
  console.log(`mismatch frame range: ${mismatchRows[0]!.frame} .. ${mismatchRows[mismatchRows.length - 1]!.frame} (${mismatchRows.length} frames)`);
}
console.log(perFrame.map((r) => `${r.frame}:${r.boxDiff}`).join(" "));
