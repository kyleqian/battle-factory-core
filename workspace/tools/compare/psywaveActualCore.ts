/** Complete retained-RGB production gate for MOVE_PSYWAVE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation, sceneOnPsywaveView,
  type SceneOnPsywaveConfig } from "../../src/animation/sceneOnPresentation.ts";
import { psywaveAtAge, psywaveDisplayPlan } from "../../src/animation/psywave.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { psywaveConfigFor, psywaveInputsFor, psywaveRowsFor,
  verifyPsywaveReducer, type PsywaveWindow } from "./verifyPsywaveReducer.ts";

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

function compareWindow(window: PsywaveWindow): Json {
  const stem = window === "player-back" ? "player" : "opponent";
  const rows = psywaveRowsFor(window);
  if (rows.length !== 205) throw new Error(`${window}: retained Psywave corpus changed`);
  const scratch = createScratchDir(`pokebench-psywave-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/psywave-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const config = psywaveConfigFor(window, rows, age);
    const state = { ...createSceneOnMovePresentation(config), age };
    const component = psywaveAtAge(age, psywaveInputsFor(window, rows, age));
    const view = sceneOnPsywaveView(state);
    if (component.source.pointer !== row.scriptPtr
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) {
      throw new Error(`${window}/age${age}: component drift`);
    }
    componentMatched += 1;
    const plan = psywaveDisplayPlan(view);
    if (plan.attacker.attr[2] !== config.animationInputs.attackerArt.attr[2]
      || plan.target.attr[2] !== config.animationInputs.targetArt.attr[2]
      || view.palette.hardware.length !== 512) {
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
  const rows = psywaveRowsFor("player-back");
  const age = 100;
  const base = psywaveConfigFor("player-back", rows, age);
  const input = base.animationInputs;
  const hardwarePalette = [...input.palette.hardware];
  hardwarePalette[16 * 16 + 1] = 0x001f;
  hardwarePalette[17 * 16 + 1] = 0x7c00;
  const altered: SceneOnPsywaveConfig = {
    ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 168, y: 10 }, animationCenter: { x: 200, y: 42 },
      battlePositionCenter: { x: 200, y: 42 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 8, y: 82 }, animationCenter: { x: 40, y: 114 },
      battlePositionCenter: { x: 40, y: 122 } } },
    animationInputs: {
      ...input,
      ringAllocations: input.ringAllocations.map((entry) => ({ ...entry })),
      spriteOrder: [...input.spriteOrder].reverse(),
      buffers: {
        softwareOam: input.buffers.softwareOam.map((entry) => entry),
        hardwareOam: input.buffers.hardwareOam.map((entry) => entry),
        softwareMatrices: input.buffers.softwareMatrices.map((matrix, index) =>
          [matrix[0] + index + 1, matrix[1], matrix[2], matrix[3] + index + 1] as const),
        hardwareMatrices: input.buffers.hardwareMatrices.map((matrix, index) =>
          [matrix[0] + index + 2, matrix[1], matrix[2], matrix[3] + index + 2] as const),
      },
      palette: { ...input.palette, hardware: hardwarePalette },
      registers: { ...input.registers, bldy: 5 },
      resources: { ...input.resources, tileSlot: input.resources.tileSlot + 1,
        allocator: { altered: true } },
      audio: { current: { altered: true }, attackerPan: 63, targetPan: -64 },
      animationRng: input.animationRng ^ 0x12345678,
    },
  };
  const renderConfig = (config: SceneOnPsywaveConfig): string => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
  }));
  const canonical = renderConfig(base), changed = renderConfig(altered);
  if (canonical === changed) throw new Error("altered Psywave control did not change framebuffer");
  const canonicalSeam = sceneOnPsywaveView({ ...createSceneOnMovePresentation(base), age });
  const alteredSeam = sceneOnPsywaveView({ ...createSceneOnMovePresentation(altered), age });
  if (sha256(JSON.stringify(canonicalSeam)) === sha256(JSON.stringify(alteredSeam))) {
    throw new Error("altered Psywave control did not change seam output");
  }
  return { species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
    orderMatricesPalettesResourcesRegistersAudioRngChanged: true,
    resourcesPalettesRegistersAudioChanged: true, animationRngChanged: true,
    gameplayStateOpaqueAndUnchanged:
      altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged:
      altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function psywaveActualCoreVerdict(): Json {
  verifyPsywaveReducer();
  const windows = [compareWindow("player-back"), compareWindow("opponent-front")];
  const stable = { schema: "psywave-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on", move: "MOVE_PSYWAVE", rows: 410,
    componentMatched: windows.reduce((sum, row) => sum + row.componentMatched, 0),
    seamMatched: windows.reduce((sum, row) => sum + row.seamMatched, 0),
    rawRgbMatched: windows.reduce((sum, row) => sum + row.rawRgbMatched, 0),
    framebufferMatched: windows.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, row) => sum + row.residualPixels, 0),
    windows, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = psywaveActualCoreVerdict();
  console.log(JSON.stringify(report));
  if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
}
