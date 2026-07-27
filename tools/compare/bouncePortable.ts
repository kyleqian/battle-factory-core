import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createInitialState,
  render,
  type EngineState,
} from "../../src/engine/core.ts";
import {
  createSceneOnMovePresentation,
  PLAYER_SPOINK_TO_OPPONENT_ONIX_BOUNCE_PRESENTATION,
  SPOINK_TO_ONIX_BOUNCE_PRESENTATION,
  type SceneOnBounceConfig,
  type SceneOnFaintAttackFieldProfile,
} from "../../src/animation/sceneOnPresentation.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: "opponent-to-player" | "player-to-opponent";
  readonly turn: SceneOnBounceConfig["turn"];
  readonly appStage: {
    readonly presentationAge: number;
    readonly animationAgeOffset: number;
  };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly excludedFrames?: readonly number[];
  };
  readonly fieldProfile: SceneOnFaintAttackFieldProfile;
  readonly controllerProfile: SceneOnBounceConfig["controllerProfile"];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, "tools/compare/fixtures/bounce-spoink-onix-charge.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const geometry = fixture.orientation === "player-to-opponent"
  ? PLAYER_SPOINK_TO_OPPONENT_ONIX_BOUNCE_PRESENTATION
  : SPOINK_TO_ONIX_BOUNCE_PRESENTATION;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-bounce-compare-"));
const rgbDir = join(scratch, "rgb");
const probeOutput = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"),
    probeOutput,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    probeOutput,
    rgbDir,
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

let state: EngineState = {
  ...createInitialState(),
  rngMode: "frontierBattle",
  sceneOnPresentation: createSceneOnMovePresentation({
    move: "BOUNCE",
    turn: fixture.turn,
    ...geometry,
    fieldProfile: fixture.fieldProfile,
    controllerProfile: fixture.controllerProfile,
    animationAgeOffset: fixture.appStage.animationAgeOffset,
    strikeEffectDelay:
      fixture.orientation === "player-to-opponent" ? 4 : 0,
    strikeAttackerRestoreAge:
      fixture.orientation === "player-to-opponent" ? 20 : undefined,
  }),
};
state = {
  ...state,
  sceneOnPresentation: {
    ...state.sceneOnPresentation!,
    age: fixture.appStage.presentationAge,
  },
};

const exclusions = new Set(fixture.denseWindow.excludedFrames ?? []);
let matching = 0;
let compared = 0;
let diffPixels = 0;
const mismatches: Array<{
  frame: number;
  pixels: number;
  box: string;
}> = [];
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  if (!exclusions.has(frame)) {
    compared += 1;
    const oracle = readFileSync(
      join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
    );
    const rgba = render(state);
    let frameDiff = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const oi = pixel * 3;
      const ai = pixel * 4;
      if (
        oracle[oi] !== rgba[ai]
        || oracle[oi + 1] !== rgba[ai + 1]
        || oracle[oi + 2] !== rgba[ai + 2]
      ) {
        frameDiff += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (frameDiff === 0) matching += 1;
    else {
      mismatches.push({
        frame,
        pixels: frameDiff,
        box: `${minX},${minY}-${maxX},${maxY}`,
      });
    }
    diffPixels += frameDiff;
  }
  state = {
    ...state,
    sceneOnPresentation: {
      ...state.sceneOnPresentation!,
      age: state.sceneOnPresentation!.age + 1,
    },
  };
}

console.log(
  `${matching}/${compared} compared frames matched; `
  + `${exclusions.size} explicitly excluded; `
  + `${diffPixels} aggregate differing pixels`,
);
if (mismatches.length) {
  const format = ({ frame, pixels, box }: typeof mismatches[number]) =>
    `${frame}:${pixels}@${box}`;
  console.log(
    `first mismatches: ${mismatches.slice(0, 20).map(format).join(", ")}`,
  );
  console.log(
    `last mismatches: ${mismatches.slice(-20).map(format).join(", ")}`,
  );
}
process.exit(matching === compared ? 0 : 1);
