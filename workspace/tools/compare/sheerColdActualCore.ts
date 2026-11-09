/** Complete retained-RGB production gate for MOVE_SHEER_COLD. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSheerColdView,
  type SceneOnSheerColdConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  sheerColdConfigFor,
  verifySheerColdReducer,
  type SheerColdOrientation,
} from "./verifySheerColdReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: SheerColdOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/sheer-cold-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  const expected = orientation === "player-back" ? 192 : 191;
  if (rows.length !== expected) throw new Error(`${orientation}: retained Sheer Cold corpus changed`);
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

function compareOrientation(orientation: SheerColdOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-sheer-cold-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/sheer-cold-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(sheerColdConfigFor(orientation, rows));
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnSheerColdView(state);
    if (view.source.pointerOffset !== row.scriptOffset || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive) throw new Error(`${orientation}/age${age}: seam drift`);
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
  const base = sheerColdConfigFor("player-back", rows);
  const inputs = base.animationInputs;
  const altered: SceneOnSheerColdConfig = {
    ...base,
    attacker: { species: "CROBAT", geometry: { side: "opponent",
      spriteCorner: { x: 133, y: 18 }, animationCenter: { x: 165, y: 50 },
      battlePositionCenter: { x: 165, y: 43 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 35, y: 56 }, animationCenter: { x: 67, y: 88 },
      battlePositionCenter: { x: 67, y: 82 } } },
    animationInputs: {
      ...inputs,
      attackerSprite: { slot: 13, subpriority: 46, matrixNum: 6, matrix: [220, 24, -24, 220] },
      targetSprite: { slot: 11, subpriority: 31, matrixNum: 7, matrix: [240, 0, 0, 240] },
      cubeSpriteSlot: 17,
      taskSlots: { fadeToBg: 6, cube: 7, updateMonBg: 8, sound: 9, clearMonBg: 10, restoreBg: 11 },
      resources: { iceCube: { paletteBank: 12, tileSlot: 23, tileRange: [704, 144] } },
      matrixBitmap: inputs.matrixBitmap ^ 0xc0,
      spriteOrder: [...inputs.spriteOrder].reverse(),
      painterSprites: [
        { slot: 13, subpriority: 46, oamPriority: 2, y: 50 },
        { slot: 11, subpriority: 31, oamPriority: 2, y: 88 },
      ],
      monbg: { layer: "bg2", scroll: { x: -37, y: -58 } },
      background: { bg1Cnt: 39941, bg2Cnt: 24071 },
      restoreFadeEndAge: 191,
    },
  };
  const digest = (config: SceneOnSheerColdConfig): string => sha256(Buffer.concat(
    [0, 20, 42, 46, 71, 100, 148, 150, 171, 189].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Sheer Cold control did not change framebuffer");
  return { species: ["CROBAT", "BLISSEY"], sidesReversed: true, geometryChanged: true,
    spriteTaskResourceMatrixAllocationOrderMonbgChanged: true, canonical, changed };
}

verifySheerColdReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "sheer-cold-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_SHEER_COLD", rows: 383,
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
