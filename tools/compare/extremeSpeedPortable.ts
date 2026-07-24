import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createSceneOnMovePresentation } from "../../src/engine/sceneOnPresentation.ts";

interface Fixture {
  scenario: string;
  probe: string;
  appStage: { presentationAge: number };
  denseWindow: { startFrame: number; endFrame: number };
  orientation: "opponent-to-player" | "player-to-opponent";
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-extreme-speed-"));
const rgbDir = join(scratch, "rgb");
const probeOutput = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"),
  probeOutput,
  "--",
  join(vendor, "mgba-venv/bin/python"),
  resolve(root, fixture.probe),
  resolve(root, fixture.scenario),
  probeOutput,
  rgbDir,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const playerToOpponent = fixture.orientation === "player-to-opponent";
let state: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: createSceneOnMovePresentation({
    move: "EXTREME_SPEED",
    attacker: playerToOpponent
      ? {
          species: "ARCANINE",
          geometry: {
            side: "player", spriteCorner: { x: 40, y: 54 },
            animationCenter: { x: 72, y: 86 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        }
      : {
          species: "ARCANINE",
          geometry: {
            side: "opponent", spriteCorner: { x: 144, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        },
    target: playerToOpponent
      ? {
          species: "DUGTRIO",
          geometry: {
            side: "opponent", spriteCorner: { x: 144, y: 21 },
            animationCenter: { x: 176, y: 53 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        }
      : {
          species: "DUGTRIO",
          geometry: {
            side: "player", spriteCorner: { x: 40, y: 59 },
            animationCenter: { x: 72, y: 91 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        },
    fieldProfile: playerToOpponent
      ? { playerHp: 156, opponentHp: 101, playerStatus: "none", playerGender: "male", opponentGender: "female" }
      : { playerHp: 101, opponentHp: 156, playerStatus: "none", playerGender: "male", opponentGender: "male" },
    animationAgeOffset: playerToOpponent ? 4 : 0,
  }),
};
state = {
  ...state,
  sceneOnPresentation: {
    ...state.sceneOnPresentation!,
    age: fixture.appStage.presentationAge,
  },
};

let matching = 0;
let diffPixels = 0;
const mismatches: string[] = [];
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const oracle = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  const rgba = render(state);
  let frameDiff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const oi = pixel * 3;
    const ai = pixel * 4;
    if (oracle[oi] !== rgba[ai] || oracle[oi + 1] !== rgba[ai + 1] || oracle[oi + 2] !== rgba[ai + 2]) frameDiff += 1;
  }
  if (frameDiff === 0) matching += 1;
  else if (mismatches.length < 16) mismatches.push(`${frame}:${frameDiff}`);
  diffPixels += frameDiff;
  state = {
    ...state,
    sceneOnPresentation: {
      ...state.sceneOnPresentation!,
      age: state.sceneOnPresentation!.age + 1,
    },
  };
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`${matching}/${total} frames matched; ${diffPixels} aggregate differing pixels`);
if (mismatches.length) console.log(`first mismatches: ${mismatches.join(", ")}`);
process.exit(matching === total ? 0 : 1);
