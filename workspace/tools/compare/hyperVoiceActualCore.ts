/** Complete retained-RGB production gate for MOVE_HYPER_VOICE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnHyperVoiceView,
  type SceneOnHyperVoiceConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  hyperVoiceConfigFor,
  verifyHyperVoiceReducer,
  type HyperVoiceOrientation,
} from "./verifyHyperVoiceReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: HyperVoiceOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/hyper-voice-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  if (rows.length !== 105) throw new Error(`${orientation}: retained Hyper Voice corpus changed`);
  return rows;
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

function compareOrientation(orientation: HyperVoiceOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-hyper-voice-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/hyper-voice-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(hyperVoiceConfigFor(orientation, rows));
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnHyperVoiceView(state);
    if (view.source.pointerOffset !== row.scriptOffset || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive
      || JSON.stringify(view.palette.hardware) !== JSON.stringify(row.hardwarePalette)) {
      throw new Error(`${orientation}/age${age}: component/seam drift`);
    }
    componentMatched += 1;
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
  const base = hyperVoiceConfigFor("player-back", rows);
  const input = base.animationInputs;
  const altered: SceneOnHyperVoiceConfig = {
    ...base,
    attacker: { species: "CROBAT", geometry: { side: "opponent",
      spriteCorner: { x: 133, y: 11 }, animationCenter: { x: 165, y: 43 },
      battlePositionCenter: { x: 165, y: 43 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 35, y: 54 }, animationCenter: { x: 67, y: 86 },
      battlePositionCenter: { x: 67, y: 82 } } },
    animationInputs: {
      ...input,
      attackerCrySpecies: 169,
      attackerSprite: { ...input.attackerSprite, slot: 13, x: 165, y: 43,
        subpriority: 46, oamPriority: 2, matrixNum: 6,
        matrix: [220, 24, -24, 220], attr: [11, 0xc0a5, 0x1a71] },
      targetSprite: { ...input.targetSprite, slot: 11, x: 67, y: 82,
        subpriority: 31, oamPriority: 2, matrixNum: 7,
        matrix: [240, 0, 0, 240], attr: [50, 0xc043, 0x0971] },
      taskSlots: { cry: 6, scale: 7, targetShake: 8, platform: 9,
        waitForCry: 10, duckBgm: 11 },
      spriteSlots: { paletteBlend: 17, ring: 18 },
      paletteBlendSubpriority: 44,
      matrixSlots: { ring: 5, attackerScale: 6 },
      resource: { ...input.resource, paletteBank: 11, tileSlot: 31,
        tileRange: [800, 64] },
      spriteOrder: [...input.spriteOrder].reverse(),
      painter: { shadowSlot: 11, ringInsertionBefore: 13 },
      palettes: { ...input.palettes, attackerBank: 17, targetBank: 16,
        thinRingBank: 27 },
      matrixBitmap: input.matrixBitmap ^ 0x60,
      animationRngSeed: 0x12345678,
    },
  };
  const renderDigest = (config: SceneOnHyperVoiceConfig): string => sha256(Buffer.concat(
    [0, 4, 6, 13, 29, 47, 59, 61, 68, 84, 102, 104].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const seamDigest = (config: SceneOnHyperVoiceConfig): string => sha256(JSON.stringify(
    [4, 6, 13, 47, 59, 61, 84, 102, 104].map((age) => sceneOnHyperVoiceView({ age, config })),
  ));
  const canonical = renderDigest(base), changed = renderDigest(altered);
  const canonicalSeam = seamDigest(base), changedSeam = seamDigest(altered);
  if (canonical === changed || canonicalSeam === changedSeam) {
    throw new Error("altered Hyper Voice live control did not change seam and framebuffer");
  }
  if (altered.animationInputs.gameplayRng !== input.gameplayRng) {
    throw new Error("altered Hyper Voice control crossed the gameplay RNG boundary");
  }
  return { species: ["CROBAT", "BLISSEY"], sidesReversed: true,
    geometryAndPictureOriginsChanged: true,
    spriteTaskResourceMatrixAllocationsChanged: true, painterOrderChanged: true,
    palettesAndAudioChanged: true, seamChanged: true, framebufferChanged: true,
    gameplayRngOpaqueAndUnchanged: true,
    canonical, changed, canonicalSeam, changedSeam };
}

verifyHyperVoiceReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "hyper-voice-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_HYPER_VOICE", rows: 210,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  seamMatched: orientations.reduce((sum, row) => sum + row.seamMatched, 0),
  rawRgbMatched: orientations.reduce((sum, row) => sum + row.rawRgbMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations, alteredLiveControl: alteredControl(),
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
