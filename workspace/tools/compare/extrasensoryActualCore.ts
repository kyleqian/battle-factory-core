/** Complete retained-RGB actual-core gate for MOVE_EXTRASENSORY. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation, sceneOnExtrasensoryView,
  type SceneOnExtrasensoryConfig } from "../../src/animation/sceneOnPresentation.ts";
import { extrasensoryAtAge, extrasensoryDisplayPlan } from "../../src/animation/extrasensory.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { extrasensoryConfigFor, extrasensoryInputsFor, extrasensoryRowsFor,
  verifyExtrasensoryReducer, type ExtrasensoryWindow } from "./verifyExtrasensoryReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");
function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== oracle[pixel * 3]
      || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  }
  return pixels;
}

function compareWindow(window: ExtrasensoryWindow): Json {
  const stem = window === "player-back" ? "player" : "opponent";
  const rows = extrasensoryRowsFor(window);
  const scratch = createScratchDir(`pokebench-extrasensory-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/extrasensory-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [], sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const config = extrasensoryConfigFor(window, rows, age);
    const state = { ...createSceneOnMovePresentation(config), age };
    const component = extrasensoryAtAge(age, extrasensoryInputsFor(window, rows, age));
    if (component.source.pointer !== row.scriptPtr || component.active !== row.animScriptActive) {
      throw new Error(`${window}/${age}: component drift`);
    }
    componentMatched += 1;
    const view = sceneOnExtrasensoryView(state), plan = extrasensoryDisplayPlan(view);
    if (plan.attacker.attr[2] !== config.animationInputs.attackerArt.attr[2]
      || plan.target.attr[2] !== config.animationInputs.targetArt.attr[2]
      || view.palette.hardware.length !== 512) throw new Error(`${window}/${age}: seam drift`);
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${window}/${age}: raw RGB drift`);
    rawRgbMatched += 1; sequence.update(raw);
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { window, rows: rows.length, componentMatched, seamMatched, rawRgbMatched,
    framebufferMatched, residualPixels, chronologicalRawRgbSha256: sequence.digest("hex"), failures };
}

function alteredControl(): Json {
  const rows = extrasensoryRowsFor("player-back"), age = 100;
  const base = extrasensoryConfigFor("player-back", rows, age);
  const input = base.animationInputs;
  const altered: SceneOnExtrasensoryConfig = { ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 168, y: 10 }, animationCenter: { x: 200, y: 42 },
      battlePositionCenter: { x: 200, y: 42 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 8, y: 82 }, animationCenter: { x: 40, y: 114 },
      battlePositionCenter: { x: 40, y: 122 } } },
    animationInputs: { ...input, spriteOrder: [...input.spriteOrder].reverse(),
      registers: { ...input.registers, bldy: 7 }, allocator: { altered: true },
      audio: { altered: true }, animationRng: input.animationRng ^ 0x12345678 },
  };
  const digest = (config: SceneOnExtrasensoryConfig) => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
  }));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Extrasensory control did not change framebuffer");
  return { species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
    allocationOrderRegistersAudioRngChanged: true,
    gameplayStateOpaqueAndUnchanged: altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function extrasensoryActualCoreVerdict(): Json {
  verifyExtrasensoryReducer();
  const windows = [compareWindow("player-back"), compareWindow("opponent-front")];
  const stable = { schema: "extrasensory-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on", move: "MOVE_EXTRASENSORY", rows: 322,
    componentMatched: windows.reduce((sum, row) => sum + row.componentMatched, 0),
    seamMatched: windows.reduce((sum, row) => sum + row.seamMatched, 0),
    rawRgbMatched: windows.reduce((sum, row) => sum + row.rawRgbMatched, 0),
    framebufferMatched: windows.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, row) => sum + row.residualPixels, 0),
    windows, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = extrasensoryActualCoreVerdict();
  console.log(JSON.stringify(report));
  if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
}
