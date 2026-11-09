/** Complete retained-RGB production gate for MOVE_FLATTER. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation, sceneOnFlatterDisplayPlan,
  sceneOnFlatterView, type SceneOnFlatterConfig } from "../../src/animation/sceneOnPresentation.ts";
import { flatterAtAge } from "../../src/animation/flatter.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { flatterConfigFor, flatterInputsFor, flatterRowsFor,
  verifyFlatterReducer, type FlatterOrientation } from "./verifyFlatterReducer.ts";

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

function liveConfig(orientation: FlatterOrientation, age: number,
  rows = flatterRowsFor(orientation)): SceneOnFlatterConfig {
  const config = flatterConfigFor(orientation, age,
    flatterInputsFor(orientation, age, rows)) as SceneOnFlatterConfig;
  const playerIsAttacker = orientation === "player-back";
  return { ...config, fieldProfile: {
    playerHp: playerIsAttacker ? 177 : 142,
    playerMaxHp: playerIsAttacker ? 177 : 142,
    playerGender: playerIsAttacker ? "female" : "male",
    opponentHp: playerIsAttacker ? 142 : 177,
    opponentMaxHp: playerIsAttacker ? 142 : 177,
    opponentGender: playerIsAttacker ? "male" : "female",
  } };
}

function compareWindow(orientation: FlatterOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = flatterRowsFor(orientation);
  if (rows.length !== 219) throw new Error(`${orientation}: retained Flatter corpus changed`);
  const scratch = createScratchDir(`pokebench-flatter-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/flatter-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const config = liveConfig(orientation, age, rows);
    const state = { ...createSceneOnMovePresentation(config), age };
    const component = flatterAtAge(age, flatterInputsFor(orientation, age, rows));
    const view = sceneOnFlatterView(state);
    if (component.source.pointer !== row.scriptPtr
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) {
      throw new Error(`${orientation}/age${age}: component drift`);
    }
    componentMatched += 1;
    const plan = sceneOnFlatterDisplayPlan(state);
    if (plan.attacker.attr[2] !== config.animationInputs.attackerArt.attr[2]
      || plan.target.attr[2] !== config.animationInputs.targetArt.attr[2]
      || plan.hardwarePalette.length !== 512
      || view.gameplay !== config.animationInputs.gameplayState) {
      throw new Error(`${orientation}/age${age}: seam/display-plan drift`);
    }
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    sequence.update(raw);
    rawRgbMatched += 1;
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, seamMatched,
    rawRgbMatched, framebufferMatched, residualPixels,
    chronologicalRawRgbSha256: sequence.digest("hex"), failures };
}

function alteredControl(): Json {
  const age = 75;
  const base = liveConfig("player-back", age);
  const input = base.animationInputs;
  const palette = [...input.palette.hardware];
  palette[16 * 16 + 1] = 0x001f;
  palette[17 * 16 + 1] = 0x7c00;
  const hardwareOam = [...input.buffers.hardwareOam].reverse();
  const allocator = input.resources.allocator as Readonly<{ tileRanges?: readonly (readonly [number, number])[] }>;
  const tileRanges = allocator.tileRanges?.map((range) => [...range] as [number, number]);
  if (tileRanges && input.resources.confettiTileSlot !== null) {
    tileRanges[input.resources.confettiTileSlot] = [
      tileRanges[input.resources.confettiTileSlot]![0] + 1,
      tileRanges[input.resources.confettiTileSlot]![1],
    ];
  }
  const altered: SceneOnFlatterConfig = {
    ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 168, y: 10 }, animationCenter: { x: 200, y: 42 },
      battlePositionCenter: { x: 200, y: 42 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 8, y: 82 }, animationCenter: { x: 40, y: 114 },
      battlePositionCenter: { x: 40, y: 122 } } },
    animationInputs: { ...input,
      spriteOrder: [...input.spriteOrder].reverse(),
      buffers: { ...input.buffers, hardwareOam,
        hardwareMatrices: input.buffers.hardwareMatrices.map((matrix, index) =>
          [matrix[0] + index + 1, matrix[1], matrix[2], matrix[3] + index + 1] as const) },
      palette: { ...input.palette, hardware: palette },
      resources: { ...input.resources, allocator: { ...allocator, tileRanges } },
      audio: { current: { altered: true }, attackerPan: 63, targetPan: -64 },
      animationRng: input.animationRng ^ 0x12345678 },
  };
  const digest = (config: SceneOnFlatterConfig): string => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
  }));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Flatter live control did not change framebuffer");
  const canonicalSeam = sceneOnFlatterView({ ...createSceneOnMovePresentation(base), age });
  const alteredSeam = sceneOnFlatterView({ ...createSceneOnMovePresentation(altered), age });
  if (sha256(JSON.stringify(canonicalSeam)) === sha256(JSON.stringify(alteredSeam))) {
    throw new Error("altered Flatter control did not change seam output");
  }
  return { species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
    orderMatricesPalettesResourcesAudioRngChanged: true,
    gameplayStateOpaqueAndUnchanged:
      altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged:
      altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function flatterActualCoreVerdict(): Json {
  verifyFlatterReducer();
  const windows = [compareWindow("player-back"), compareWindow("opponent-front")];
  const stable = { schema: "flatter-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on", move: "MOVE_FLATTER", rows: 438,
    componentMatched: windows.reduce((sum, row) => sum + row.componentMatched, 0),
    seamMatched: windows.reduce((sum, row) => sum + row.seamMatched, 0),
    rawRgbMatched: windows.reduce((sum, row) => sum + row.rawRgbMatched, 0),
    framebufferMatched: windows.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, row) => sum + row.residualPixels, 0),
    windows, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = flatterActualCoreVerdict();
  console.log(JSON.stringify(report));
  if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
}
