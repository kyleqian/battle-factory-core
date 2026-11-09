/** Complete retained-RGB production gate for MOVE_BONEMERANG. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnBonemerangView,
  type SceneOnBonemerangConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { bonemerangAtAge } from "../../src/animation/bonemerang.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  bonemerangConfigFor,
  bonemerangInputsFor,
  verifyBonemerangReducer,
  type BonemerangOrientation,
} from "./verifyBonemerangReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: BonemerangOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/bonemerang-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  if (rows.length !== 72) throw new Error(`${orientation}: retained Bonemerang corpus changed`);
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

function compareOrientation(orientation: BonemerangOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-bonemerang-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/bonemerang-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const config = bonemerangConfigFor(orientation, rows);
  const inputs = bonemerangInputsFor(orientation, rows);
  const stage = createSceneOnMovePresentation(config);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const component = bonemerangAtAge(age, inputs);
    const view = sceneOnBonemerangView(state);
    if (component.source.pointerOffset !== row.scriptOffset
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) {
      throw new Error(`${orientation}/age${age}: component drift`);
    }
    componentMatched += 1;
    if (view.source.pointerOffset !== component.source.pointerOffset
      || view.sprites.length !== component.sprites.length
      || view.tasks.length !== component.tasks.length) {
      throw new Error(`${orientation}/age${age}: seam drift`);
    }
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    rawRgbMatched += 1;
    const app = render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
    });
    const residual = frameDiff(app, raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, seamMatched,
    rawRgbMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = bonemerangConfigFor("player-back", rows);
  const inputs = base.animationInputs;
  const altered: SceneOnBonemerangConfig = {
    ...base,
    attacker: { species: "CUBONE", geometry: { side: "opponent",
      spriteCorner: { x: 142, y: 20 }, animationCenter: { x: 174, y: 52 },
      battlePositionCenter: { x: 174, y: 44 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 32, y: 55 }, animationCenter: { x: 64, y: 95 },
      battlePositionCenter: { x: 64, y: 87 } } },
    animationInputs: {
      ...inputs,
      attackerSprite: { slot: 13, x: 174, y: 44, x2: -2, y2: 1,
        subpriority: 42, oamPriority: 2, matrixNum: 5, matrix: [224, 16, -16, 224] },
      targetSprite: { slot: 15, x: 64, y: 87, x2: 2, y2: -1,
        subpriority: 28, oamPriority: 2, matrixNum: 7, matrix: [240, 0, 0, 240] },
      allocations: { boneSpriteSlot: 17, impactSpriteSlot: 18, lungeSpriteSlot: 18,
        shakeTaskSlot: 6, updateMonBgTaskSlot: 7, clearMonBgTaskSlot: 6,
        boneMatrixSlot: 8, impactMatrixSlot: 9 },
      resources: {
        bone: { paletteBank: 12, tileSlot: 21, tileRange: [672, 16] },
        impact: { paletteBank: 13, tileSlot: 22, tileRange: [688, 16] },
      },
      spriteOrder: [...inputs.spriteOrder].reverse(),
      painterSprites: [
        { slot: 13, subpriority: 42, oamPriority: 2, oamY: 44 },
        { slot: 15, subpriority: 28, oamPriority: 2, oamY: 87 },
      ],
      initialMatrixBitmap: inputs.initialMatrixBitmap ^ 0x300,
      monbg: { layer: "bg2", scroll: { x: -32, y: -47 }, targetBgPriority: 2 },
      background: { baseBg1Cnt: 39941, baseBg2Cnt: 24071,
        monbgBg1Cnt: 38919, monbgBg2Cnt: 23045,
        splitBg1Cnt: 38918, splitBg2Cnt: 23046 },
      animationRngSeed: inputs.animationRngSeed ^ 0x51a7c39d,
      gameplayRng: { opaque: "altered-but-still-unconsumed" },
    },
  };
  const digest = (config: SceneOnBonemerangConfig): string => sha256(Buffer.concat(
    [0, 7, 10, 29, 32, 39, 41, 50, 51, 65, 67, 71].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Bonemerang control did not change framebuffer");
  return { species: ["CUBONE", "BLISSEY"], sidesReversed: true,
    geometryAndPictureOriginChanged: true,
    spriteTaskResourceMatrixAllocationAndPainterOrderChanged: true,
    gameplayRngOpaqueAndUnconsumed: true, canonical, changed };
}

verifyBonemerangReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "bonemerang-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_BONEMERANG", rows: 144,
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
