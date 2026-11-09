/** Complete retained-RGB production gate for MOVE_SKILL_SWAP. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnSkillSwapView,
  type SceneOnSkillSwapConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { skillSwapConfigFor, verifySkillSwapReducer,
  type SkillSwapOrientation } from "./verifySkillSwapReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: SkillSwapOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/skill-swap-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  const expected = orientation === "player-back" ? 196 : 195;
  if (corpus.schema !== "skill-swap-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 285
    || corpus.frames.length !== expected) throw new Error(`${orientation}: corpus changed`);
  return corpus.frames;
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

function compareOrientation(orientation: SkillSwapOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-skill-swap-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/skill-swap-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...createSceneOnMovePresentation(
      skillSwapConfigFor(orientation, rows, age)), age };
    const view = sceneOnSkillSwapView(state);
    if (view.source.pointerOffset !== row.scriptOffset
      || view.source.wait !== row.scriptWait || view.active !== row.animScriptActive) {
      throw new Error(`${orientation}/age${age}: component/seam drift`);
    }
    componentMatched += 1;
    if (view.palette.hardware.length !== 512 || view.buffers.hardwareOam.length !== 128) {
      throw new Error(`${orientation}/age${age}: live compositor input drift`);
    }
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    rawRgbMatched += 1;
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, seamMatched,
    rawRgbMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = skillSwapConfigFor("player-back", rows, 100);
  const input = base.animationInputs;
  const palette = [...input.palette.hardware];
  palette[16 * 16 + 1] = 0x001f;
  palette[17 * 16 + 1] = 0x7c00;
  const altered: SceneOnSkillSwapConfig = {
    ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 168, y: 10 }, animationCenter: { x: 200, y: 42 },
      battlePositionCenter: { x: 200, y: 42 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 8, y: 82 }, animationCenter: { x: 40, y: 114 },
      battlePositionCenter: { x: 40, y: 82 } } },
    animationInputs: {
      ...input,
      orbAllocations: input.orbAllocations.map((entry, index) => ({ ...entry,
        sourceCreationOrder: entry.sourceCreationOrder + 32 + index })),
      spriteOrder: [...input.spriteOrder].reverse(),
      softwareOam: [{ altered: true }],
      softwareMatrices: input.softwareMatrices.map((matrix, index) =>
        [matrix[0] + index + 1, matrix[1], matrix[2], matrix[3] + index + 1] as const),
      hardwareMatrices: input.hardwareMatrices.map((matrix, index) =>
        [matrix[0] + index + 2, matrix[1], matrix[2], matrix[3] + index + 2] as const),
      palette: { ...input.palette, hardware: palette },
      registers: { ...input.registers, bldy: 5 },
      resources: { ...input.resources, tileSlot: input.resources.tileSlot + 1,
        paletteAllocatorSlot: input.resources.paletteAllocatorSlot + 1,
        allocator: { altered: true } },
      audio: { current: { altered: true }, attackerPan: 63 },
      animationRng: input.animationRng ^ 0x12345678,
    },
  };
  const renderConfig = (config: SceneOnSkillSwapConfig): string => sha256(render({
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 100 },
  }));
  const canonical = renderConfig(base), changed = renderConfig(altered);
  if (canonical === changed) throw new Error("altered Skill Swap control did not change framebuffer");
  const canonicalSeam = sceneOnSkillSwapView({ ...createSceneOnMovePresentation(base), age: 100 });
  const alteredSeam = sceneOnSkillSwapView({ ...createSceneOnMovePresentation(altered), age: 100 });
  if (sha256(JSON.stringify(canonicalSeam)) === sha256(JSON.stringify(alteredSeam))) {
    throw new Error("altered Skill Swap control did not change seam output");
  }
  return { species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
    allocationOrderOamMatricesChanged: true, resourcesPalettesRegistersAudioChanged: true,
    animationRngChanged: true,
    gameplayStateOpaqueAndUnchanged: altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function skillSwapActualCoreVerdict(): Json {
  verifySkillSwapReducer();
  const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
  const stable = { schema: "skill-swap-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on", move: "MOVE_SKILL_SWAP", rows: 391,
    componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
    seamMatched: orientations.reduce((sum, row) => sum + row.seamMatched, 0),
    rawRgbMatched: orientations.reduce((sum, row) => sum + row.rawRgbMatched, 0),
    framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
    orientations, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const report = skillSwapActualCoreVerdict();
  console.log(JSON.stringify(report));
  if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
}
