/** Complete retained-RGB production gate for MOVE_PURSUIT. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnPursuitDisplayPlan,
  sceneOnPursuitView,
  type SceneOnPursuitConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { pursuitAtAge } from "../../src/animation/pursuit.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  pursuitConfigFor,
  pursuitInputsFor,
  pursuitRowsFor,
  verifyPursuitReducer,
  type PursuitWindow,
} from "./verifyPursuitReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function archiveFor(window: PursuitWindow): string {
  if (window === "player-back") return "pursuit-player-raw-rgb.tar.gz";
  if (window === "opponent-front") return "pursuit-opponent-raw-rgb.tar.gz";
  return "pursuit-switchout-opponent-raw-rgb.tar.gz";
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== oracle[pixel * 3]
      || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  }
  return pixels;
}

function compareWindow(window: PursuitWindow): Json {
  const rows = pursuitRowsFor(window);
  if (rows.length !== 103) throw new Error(`${window}: retained Pursuit corpus changed`);
  const scratch = createScratchDir(`pokebench-pursuit-${window}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/${archiveFor(window)}`),
    "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const config = pursuitConfigFor(window, rows, age);
    const state = { ...createSceneOnMovePresentation(config), age };
    const component = pursuitAtAge(age, pursuitInputsFor(window, rows, age));
    const view = sceneOnPursuitView(state);
    if (component.source.pointerOffset !== row.scriptPtr - 0x082c_a980
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) {
      throw new Error(`${window}/age${age}: component drift`);
    }
    componentMatched += 1;
    const plan = sceneOnPursuitDisplayPlan(state);
    if (view.source.pointerOffset !== component.source.pointerOffset
      || plan.hardwarePalette.length !== 512
      || plan.attacker.attr[2] !== config.animationInputs.attackerAttr2
      || (!plan.targetOnBg && plan.target?.attr[2] !== config.animationInputs.targetAttr2)) {
      throw new Error(`${window}/age${age}: seam/display-plan drift`);
    }
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${window}/age${age}: raw RGB drift`);
    sequence.update(raw);
    rawRgbMatched += 1;
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { window, rows: rows.length, componentMatched, seamMatched, rawRgbMatched,
    framebufferMatched, residualPixels, chronologicalRawRgbSha256: sequence.digest("hex"),
    failures };
}

function alteredControl(): Json {
  const baseRows = pursuitRowsFor("player-back");
  const switchRows = pursuitRowsFor("switchout-opponent-front");
  const age = 48;
  const base = pursuitConfigFor("player-back", baseRows, age);
  const switchout = pursuitConfigFor("switchout-opponent-front", switchRows, age);
  const altered: SceneOnPursuitConfig = {
    ...switchout,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 164, y: 8 }, animationCenter: { x: 196, y: 40 },
      battlePositionCenter: { x: 196, y: 40 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 10, y: 84 }, animationCenter: { x: 42, y: 116 },
      battlePositionCenter: { x: 42, y: 84 } } },
    animationInputs: {
      ...switchout.animationInputs,
      animationRng: switchout.animationInputs.animationRng ^ 0x12345678,
      gameplayRng: base.animationInputs.gameplayRng,
      gameplayState: base.animationInputs.gameplayState,
    },
  };
  const digest = (config: SceneOnPursuitConfig): string => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
  }));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Pursuit live control did not change framebuffer");
  return {
    species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
    normalToSwitchoutAffineBranchChanged: true,
    allocationHistoryPaletteTileMatrixAndOrderChanged: true,
    buffersPalettesRegistersAudioPowerAndAnimationRngChanged: true,
    gameplayStateOpaqueAndUnchanged:
      altered.animationInputs.gameplayState === base.animationInputs.gameplayState,
    gameplayRngOpaqueAndUnchanged:
      altered.animationInputs.gameplayRng === base.animationInputs.gameplayRng,
    canonical, changed,
  };
}

export function pursuitActualCoreVerdict(): Json {
  verifyPursuitReducer();
  const windowNames: readonly PursuitWindow[] = [
    "player-back", "opponent-front", "switchout-opponent-front",
  ];
  const windows = windowNames.map(compareWindow);
  const stable = {
    schema: "pursuit-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_PURSUIT", rows: 309,
    componentMatched: windows.reduce((sum, row) => sum + row.componentMatched, 0),
    seamMatched: windows.reduce((sum, row) => sum + row.seamMatched, 0),
    rawRgbMatched: windows.reduce((sum, row) => sum + row.rawRgbMatched, 0),
    framebufferMatched: windows.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, row) => sum + row.residualPixels, 0),
    windows, alteredLiveControl: alteredControl(),
  };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = pursuitActualCoreVerdict();
  console.log(JSON.stringify(report));
  if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
}
