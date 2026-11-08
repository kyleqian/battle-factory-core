/** Complete retained-RGB production gate for all MOVE_RETURN selector branches. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation, sceneOnReturnDisplayPlan, sceneOnReturnView,
  type SceneOnReturnConfig } from "../../src/animation/sceneOnPresentation.ts";
import { returnAtAge } from "../../src/animation/return.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { returnConfigFor, returnInputsFor, returnRowsFor, verifyReturnReducer,
  type ReturnBranch, type ReturnOrientation } from "./verifyReturnReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const branches: readonly ReturnBranch[] = ["weak", "medium", "strong", "strongest"];
const orientations: readonly ReturnOrientation[] = ["player-back", "opponent-front"];
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function stem(branch: ReturnBranch, orientation: ReturnOrientation): string {
  const side = orientation === "player-back" ? "player" : "opponent";
  return branch === "strongest" ? `return-${side}` : `return-${branch}-${side}`;
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

function namedConfig(config: SceneOnReturnConfig): SceneOnReturnConfig {
  const speciesName = (species: unknown): string => {
    if (species === 148 || species === "148") return "DRAGONAIR";
    if (species === 95 || species === "95") return "ONIX";
    throw new Error(`unexpected retained Return species ${String(species)}`);
  };
  const attacker = speciesName(config.attacker.species);
  const target = speciesName(config.target.species);
  return { ...config,
    attacker: { ...config.attacker, species: attacker as never },
    target: { ...config.target, species: target as never },
    animationInputs: { ...config.animationInputs,
      attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: attacker },
      targetArt: { ...config.animationInputs.targetArt, displaySpecies: target } } };
}

function compareWindow(branch: ReturnBranch, orientation: ReturnOrientation): Json {
  const rows = returnRowsFor(branch, orientation);
  const scratch = createScratchDir(`pokebench-return-${branch}-${orientation}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/${stem(branch, orientation)}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const config = namedConfig(returnConfigFor(branch, orientation, rows, age));
    const state = { ...createSceneOnMovePresentation(config), age };
    const component = returnAtAge(age, returnInputsFor(branch, orientation, rows, age));
    const view = sceneOnReturnView(state);
    if (component.source.pointer !== row.scriptPtr
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) throw new Error(`${branch}/${orientation}/${age}: component drift`);
    componentMatched += 1;
    const plan = sceneOnReturnDisplayPlan(state);
    if (plan.attacker.attr[2] !== config.animationInputs.attackerArt.attr[2]
      || plan.hardwarePalette.length !== 512
      || view.selector.branch !== branch) throw new Error(`${branch}/${orientation}/${age}: seam/display-plan drift`);
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${branch}/${orientation}/${age}: raw RGB drift`);
    sequence.update(raw);
    rawRgbMatched += 1;
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { branch, orientation, rows: rows.length, componentMatched, seamMatched,
    rawRgbMatched, framebufferMatched, residualPixels,
    chronologicalRawRgbSha256: sequence.digest("hex"), failures };
}

function alteredControl(): Json {
  const rows = returnRowsFor("strongest", "player-back");
  const age = 157;
  const base = namedConfig(returnConfigFor("strongest", "player-back", rows, age));
  const input = base.animationInputs;
  const palette = [...input.palette.hardware];
  palette[16 * 16 + 1] = 0x001f;
  palette[17 * 16 + 1] = 0x7c00;
  const altered: SceneOnReturnConfig = {
    ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 170, y: 14 }, animationCenter: { x: 202, y: 46 },
      battlePositionCenter: { x: 202, y: 46 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 5, y: 84 }, animationCenter: { x: 37, y: 116 },
      battlePositionCenter: { x: 37, y: 116 } } },
    animationInputs: { ...input, palette: { ...input.palette, hardware: palette },
      animationRng: input.animationRng ^ 0x12345678 },
  };
  const digest = (config: SceneOnReturnConfig): string => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
  }));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Return live control did not change framebuffer");
  return { species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
    paletteAndAnimationRngChanged: true,
    gameplayStateOpaqueAndUnchanged:
      altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged:
      altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function returnActualCoreVerdict(): Json {
  verifyReturnReducer();
  const windows = branches.flatMap((branch) => orientations.map((orientation) =>
    compareWindow(branch, orientation)));
  const stable = { schema: "return-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on", move: "MOVE_RETURN", rows: 1190,
    componentMatched: windows.reduce((sum, row) => sum + row.componentMatched, 0),
    seamMatched: windows.reduce((sum, row) => sum + row.seamMatched, 0),
    rawRgbMatched: windows.reduce((sum, row) => sum + row.rawRgbMatched, 0),
    framebufferMatched: windows.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, row) => sum + row.residualPixels, 0),
    windows, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = returnActualCoreVerdict();
  console.log(JSON.stringify(report));
  if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
}
