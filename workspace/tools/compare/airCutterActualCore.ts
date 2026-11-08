/** Complete retained-RGB production gate for MOVE_AIR_CUTTER. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnAirCutterView,
  type SceneOnAirCutterConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  airCutterConfigFor,
  verifyAirCutterReducer,
  type AirCutterOrientation,
} from "./verifyAirCutterReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: AirCutterOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/air-cutter-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "air-cutter-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 314
    || corpus.frames.length !== 112) {
    throw new Error(`${orientation}: retained Air Cutter corpus changed`);
  }
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

function compareOrientation(orientation: AirCutterOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-air-cutter-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/air-cutter-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(airCutterConfigFor(orientation, rows));
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnAirCutterView(state);
    if (view.source.pointerOffset !== row.scriptOffset || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive) {
      throw new Error(`${orientation}/age${age}: seam drift`);
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
  const base = airCutterConfigFor("player-back", rows);
  const inputs = base.animationInputs;
  const altered: SceneOnAirCutterConfig = {
    ...base,
    attacker: { species: "CROBAT", geometry: { side: "player",
      spriteCorner: { x: 27, y: 57 }, animationCenter: { x: 59, y: 89 },
      battlePositionCenter: { x: 59, y: 85 } } },
    target: { species: "BLISSEY", geometry: { side: "opponent",
      spriteCorner: { x: 149, y: 12 }, animationCenter: { x: 181, y: 44 },
      battlePositionCenter: { x: 181, y: 37 } } },
    animationInputs: {
      ...inputs,
      attackerSprite: { slot: 11, subpriority: 53, matrixNum: 6, matrix: [220, 24, -24, 220] },
      targetSprite: { slot: 13, subpriority: 47, matrixNum: 7, matrix: [240, 0, 0, 240] },
      waveSpriteSlots: [14, 15, 16], sliceSpriteSlot: 17,
      taskSlots: { projectile: 4, targetShake: 5, partnerShake: 6, updateMonBg: 7, clearMonBg: 8 },
      resources: {
        airWave: { paletteBank: 10, tileSlot: 21, tileRange: [601, 8] },
        cut: { paletteBank: 11, tileSlot: 22, tileRange: [609, 64] },
        impact: { paletteBank: 12, tileSlot: 23, tileRange: [673, 16] },
      },
      matrixBitmap: inputs.matrixBitmap ^ 0x80,
      spriteOrder: [...inputs.spriteOrder].reverse(),
      monbg: { layer: "bg2", center: { x: 181, y: 44 }, bgX: -35, bgY: -61 },
    },
  };
  const digest = (config: SceneOnAirCutterConfig): string => sha256(Buffer.concat(
    [0, 12, 19, 23, 50, 76, 77, 85, 96, 104, 111].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Air Cutter control did not change framebuffer");
  return { species: ["CROBAT", "BLISSEY"], geometryChanged: true,
    allocationMatrixTaskResourceOrderMonbgChanged: true, canonical, changed };
}

verifyAirCutterReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "air-cutter-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_AIR_CUTTER", rows: 224,
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
