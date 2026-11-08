/** Complete retained-RGB production gate for MOVE_SMOG. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSmogView,
  type SceneOnSmogConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { smogAtAge } from "../../src/animation/smog.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  smogConfigFor,
  smogInputsFor,
  verifySmogReducer,
  type SmogOrientation,
} from "./verifySmogReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: SmogOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/smog-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  if (rows.length !== 306) throw new Error(`${orientation}: retained Smog corpus changed`);
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

function compareOrientation(orientation: SmogOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-smog-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/smog-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const config = smogConfigFor(orientation, rows);
  const inputs = smogInputsFor(orientation, rows);
  const stage = createSceneOnMovePresentation(config);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const component = smogAtAge(age, inputs);
    const view = sceneOnSmogView(state);
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
    const residual = frameDiff(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: state,
    }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, seamMatched,
    rawRgbMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = smogConfigFor("player-back", rows);
  const inputs = base.animationInputs;
  const altered: SceneOnSmogConfig = {
    ...base,
    attacker: { species: "CROBAT", geometry: { side: "opponent",
      spriteCorner: { x: 134, y: 17 }, animationCenter: { x: 166, y: 49 },
      battlePositionCenter: { x: 166, y: 43 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 34, y: 55 }, animationCenter: { x: 66, y: 87 },
      battlePositionCenter: { x: 66, y: 82 } } },
    animationInputs: {
      ...inputs,
      targetPictureOrigin: { x: 66, y: 87 },
      targetBgPriority: 2,
      attackerSprite: { slot: 13, x: 166, y: 49, x2: -1, y2: 1,
        subpriority: 43, oamPriority: 2, matrixNum: 6, matrix: [220, 24, -24, 220] },
      targetSprite: { slot: 15, x: 66, y: 87, x2: 2, y2: -1,
        subpriority: 27, oamPriority: 2, matrixNum: 7, matrix: [240, 0, 0, 240] },
      cloudSpriteSlots: [17, 18, 19, 20, 21, 22, 23],
      taskSlots: { updateMonBg: 6, mistSound: 7, blendColorCycle: 8,
        shakeMon2: 9, toxicSound: 10, clearMonBg: 11 },
      resources: { purpleGasCloud: { paletteBank: 12, tileSlot: 23, tileRange: [704, 16] } },
      matrixBitmap: inputs.matrixBitmap ^ 0xc0,
      spriteOrder: [...inputs.spriteOrder].reverse(),
      painterSprites: [
        { slot: 13, subpriority: 43, oamPriority: 2, oamY: 49 },
        { slot: 15, subpriority: 27, oamPriority: 2, oamY: 87 },
      ],
      monbg: { layer: "bg2", scroll: { x: -32, y: -47 } },
      background: {
        baseBg1Cnt: 39941, baseBg2Cnt: 24071,
        monbgBg1Cnt: 38919, monbgBg2Cnt: 23045,
        splitBg1Cnt: 38918, splitBg2Cnt: 23046,
      },
      targetPaletteBank: 25,
      animationRngSeed: inputs.animationRngSeed ^ 0x51a7c39d,
      gameplayRng: { opaque: "altered-but-still-unconsumed" },
    },
  };
  const digest = (config: SceneOnSmogConfig): string => sha256(Buffer.concat(
    [0, 5, 8, 61, 100, 196, 205, 232, 250, 300, 305].map((age) => Buffer.from(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Smog control did not change framebuffer");
  return {
    species: ["CROBAT", "BLISSEY"], sidesReversed: true,
    geometryAndPictureOriginChanged: true,
    spriteTaskResourceMatrixAllocationOrderMonbgBgPaletteAndPresentationRngChanged: true,
    gameplayRngOpaqueAndUnconsumed: true,
    canonical, changed,
  };
}

verifySmogReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "smog-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_SMOG", rows: 612,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  seamMatched: orientations.reduce((sum, row) => sum + row.seamMatched, 0),
  rawRgbMatched: orientations.reduce((sum, row) => sum + row.rawRgbMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations,
  alteredLiveControl: alteredControl(),
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
