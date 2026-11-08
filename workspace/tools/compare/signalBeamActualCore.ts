/** Complete retained-RGB production gate for MOVE_SIGNAL_BEAM. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSignalBeamView,
  type SceneOnSignalBeamConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { signalBeamAtAge } from "../../src/animation/signalBeam.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  signalBeamConfigFor,
  signalBeamInputsFor,
  verifySignalBeamReducer,
  type SignalBeamOrientation,
} from "./verifySignalBeamReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: SignalBeamOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/signal-beam-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  const expected = orientation === "player-back" ? 146 : 145;
  if (rows.length !== expected) throw new Error(`${orientation}: retained Signal Beam corpus changed`);
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

function compareOrientation(orientation: SignalBeamOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-signal-beam-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/signal-beam-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const config = signalBeamConfigFor(orientation, rows);
  const inputs = signalBeamInputsFor(orientation, rows);
  const stage = createSceneOnMovePresentation(config);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const component = signalBeamAtAge(age, inputs);
    const view = sceneOnSignalBeamView(state);
    if (component.source.pointerOffset !== row.scriptOffset
      || component.source.wait !== row.scriptWait
      || component.active !== row.animScriptActive) throw new Error(`${orientation}/age${age}: component drift`);
    componentMatched += 1;
    if (view.source.pointerOffset !== component.source.pointerOffset
      || view.sprites.length !== component.sprites.length
      || view.tasks.length !== component.tasks.length) throw new Error(`${orientation}/age${age}: seam drift`);
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    rawRgbMatched += 1;
    const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state });
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
  const base = signalBeamConfigFor("player-back", rows);
  const input = base.animationInputs;
  const altered: SceneOnSignalBeamConfig = {
    ...base,
    attacker: { species: "CUBONE", geometry: { side: "opponent",
      spriteCorner: { x: 142, y: 20 }, animationCenter: { x: 174, y: 52 },
      battlePositionCenter: { x: 174, y: 44 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 32, y: 55 }, animationCenter: { x: 64, y: 95 },
      battlePositionCenter: { x: 64, y: 87 } } },
    animationInputs: {
      ...input,
      attackerPictureOrigin: { x: 174, y: 52 },
      targetPictureOrigin: { x: 64, y: 95 },
      attackerSprite: { slot: 13, x: 174, y: 44, x2: -2, y2: 1,
        subpriority: 42, oamPriority: 2, matrixNum: 5, matrix: [224, 16, -16, 224] },
      targetSprite: { slot: 15, x: 64, y: 87, x2: 2, y2: -1,
        subpriority: 28, oamPriority: 2, matrixNum: 7, matrix: [240, 0, 0, 240] },
      orbPairs: input.orbPairs.map((pair, index) => ({
        redSlot: (pair.redSlot + index + 5) % 64,
        greenSlot: (pair.greenSlot + index + 11) % 64,
      })),
      taskSlots: { attackerShake: 6, pan: 7, sinTimer: 8, targetShake: 9 },
      paletteBlendSpriteSlot: 21,
      resources: {
        duck: { paletteBank: 12, tileSlot: 20, tileRange: [640, 12] },
        redOrb: { paletteBank: 13, tileSlot: 21, tileRange: [652, 1] },
        greenOrb: { paletteBank: 14, tileSlot: 22, tileRange: [653, 1] },
      },
      matrixBitmap: input.matrixBitmap ^ 0x30,
      matrixSlots: input.matrixSlots.map((matrix, index) => index === 5 ? [224, 16, -16, 224] : matrix),
      spriteOrder: [...input.spriteOrder].reverse(),
      painterSprites: [
        { slot: 13, subpriority: 42, oamPriority: 2, oamY: 44 },
        { slot: 15, subpriority: 28, oamPriority: 2, oamY: 87 },
      ],
      targetPalette: { bank: 30, unfaded: input.targetPalette.unfaded.map((color, index) => index === 0 ? color : color ^ 0x421) },
      registers: { win0h: 0x1111, win0v: 0x2222 },
      animationRngSeed: input.animationRngSeed ^ 0x51a7c39d,
      gameplayRng: input.gameplayRng,
    },
  };
  const ages = [0, 7, 10, 18, 35, 36, 57, 83, 90, 112, 116, 144];
  const framebufferDigest = (config: SceneOnSignalBeamConfig): string => sha256(Buffer.concat(
    ages.map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const seamDigest = (config: SceneOnSignalBeamConfig): string => sha256(JSON.stringify(
    ages.map((age) => sceneOnSignalBeamView({ ...createSceneOnMovePresentation(config), age })),
  ));
  const canonicalFramebuffer = framebufferDigest(base), changedFramebuffer = framebufferDigest(altered);
  const canonicalSeam = seamDigest(base), changedSeam = seamDigest(altered);
  if (canonicalFramebuffer === changedFramebuffer || canonicalSeam === changedSeam) {
    throw new Error("altered Signal Beam live control did not change seam and framebuffer");
  }
  if (altered.animationInputs.gameplayRng !== input.gameplayRng) throw new Error("altered control changed opaque gameplay RNG");
  return { species: ["CUBONE", "BLISSEY"], sidesReversed: true,
    identitySpeciesGeometryOriginsChanged: true,
    spriteTaskResourceMatrixAllocationAndPainterOrderChanged: true,
    targetPaletteRegistersAndPresentationRngChanged: true,
    gameplayStateAndRngOpaqueUnchanged: true,
    canonicalSeam, changedSeam, canonicalFramebuffer, changedFramebuffer };
}

verifySignalBeamReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "signal-beam-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_SIGNAL_BEAM", rows: 291,
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
