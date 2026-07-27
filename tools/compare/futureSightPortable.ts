import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnFutureSightView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { getMonGender } from "../../src/engine/monGender.ts";

// KADABRA/ONIX genderRatio, direct from reference/pokeemerald/src/data/
// pokemon/species_info.h (`.genderRatio = PERCENT_FEMALE(25)` / `(50)`,
// `PERCENT_FEMALE(percent) = min(254, (percent*255)/100)` truncated to u8).
const GENDER_RATIO: Record<string, number> = { KADABRA: 63, ONIX: 127 };

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
}

interface ProbeFrame {
  readonly frame: number;
  readonly player: { readonly hp: number; readonly maxHp: number };
  readonly opponent: { readonly hp: number; readonly maxHp: number };
  readonly playerPersonality: number;
  readonly opponentPersonality: number;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = resolve(process.argv[2]!);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const scratch = mkdtempSync(join(tmpdir(), "pokebench-future-sight-compare-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync(
  "python3",
  [
    join(root, "tools/run-mgba-probe.py"),
    output,
    "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe),
    resolve(root, fixture.scenario),
    output,
    rgbDir,
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));

const startOracle = frames.get(fixture.denseWindow.startFrame);
if (!startOracle) throw new Error(`probe omitted start frame ${fixture.denseWindow.startFrame}`);
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

let framebufferMatches = 0;
const mismatches: string[] = [];
let firstFramebufferDiff: string | null = null;

for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age =
    fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const state = { ...stage, age };
  // sceneOnFutureSightView is invoked indirectly via battleScene.ts's
  // render dispatch (state.config.move === "FUTURE_SIGHT"); called here
  // only to fail fast if the view itself throws for this fixture's pair.
  sceneOnFutureSightView(state);
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: state,
  };
  const appRgba = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      appRgba[pixel * 4] !== oracleRgb[pixel * 3]
      || appRgba[pixel * 4 + 1] !== oracleRgb[pixel * 3 + 1]
      || appRgba[pixel * 4 + 2] !== oracleRgb[pixel * 3 + 2]
    ) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else {
    mismatches.push(`frame ${frame}`);
    if (firstFramebufferDiff === null) {
      let count = 0;
      let minX = 240;
      let minY = 160;
      let maxX = -1;
      let maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        const offset = pixel * 3;
        if (
          appRgba[pixel * 4] === oracleRgb[offset]
          && appRgba[pixel * 4 + 1] === oracleRgb[offset + 1]
          && appRgba[pixel * 4 + 2] === oracleRgb[offset + 2]
        ) continue;
        count += 1;
        const x = pixel % 240;
        const y = Math.floor(pixel / 240);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      firstFramebufferDiff =
        `first framebuffer diff at frame ${frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
    }
  }
}

const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`FUTURE_SIGHT framebuffer ${framebufferMatches}/${total}`);
if (mismatches.length) {
  if (firstFramebufferDiff) console.error(firstFramebufferDiff);
  console.error(`${mismatches.length} mismatched frames: ${mismatches.slice(0, 20).join(", ")}${mismatches.length > 20 ? "..." : ""}`);
  process.exit(1);
}
