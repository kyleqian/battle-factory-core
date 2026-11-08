/** Complete retained-RGB production gate for MOVE_MACH_PUNCH. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnMachPunchView,
  type SceneOnMachPunchConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { machPunchAtAge } from "../../src/animation/machPunch.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  machPunchConfigFor,
  machPunchInputsFor,
  verifyMachPunchReducer,
  type MachPunchOrientation,
} from "./verifyMachPunchReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: MachPunchOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/mach-punch-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  const expected = orientation === "player-back" ? 111 : 110;
  if (rows.length !== expected) throw new Error(`${orientation}: retained Mach Punch corpus changed`);
  return rows;
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  const samples: unknown[] = [];
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== oracle[pixel * 3]
      || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) {
      pixels += 1;
      if (process.env.MACH_PUNCH_DEBUG === "1" && samples.length < 20) samples.push({
        x: pixel % 240, y: Math.floor(pixel / 240),
        app: [app[pixel * 4], app[pixel * 4 + 1], app[pixel * 4 + 2]],
        oracle: [oracle[pixel * 3], oracle[pixel * 3 + 1], oracle[pixel * 3 + 2]],
      });
    }
  }
  if (process.env.MACH_PUNCH_DEBUG === "1" && pixels > 0) console.error(JSON.stringify(samples));
  return pixels;
}

function compareOrientation(orientation: MachPunchOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-mach-punch-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/mach-punch-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const config = machPunchConfigFor(orientation, rows);
  const inputs = machPunchInputsFor(orientation, rows);
  const stage = createSceneOnMovePresentation(config);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const component = machPunchAtAge(age, inputs);
    const view = sceneOnMachPunchView(state);
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
  const base = machPunchConfigFor("player-back", rows);
  const input = base.animationInputs;
  const altered: SceneOnMachPunchConfig = {
    ...base,
    attacker: { species: "MACHOKE", geometry: { side: "opponent",
      spriteCorner: { x: 140, y: 16 }, animationCenter: { x: 172, y: 48 },
      battlePositionCenter: { x: 172, y: 44 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 34, y: 56 }, animationCenter: { x: 66, y: 96 },
      battlePositionCenter: { x: 66, y: 88 } } },
    animationInputs: {
      ...input,
      attackerPictureOrigin: { x: 172, y: 48 }, targetPictureOrigin: { x: 66, y: 96 },
      attackerSprite: { slot: 18, x: 172, y: 48, x2: -2, y2: 1,
        subpriority: 44, oamPriority: 2, matrixNum: 5, matrix: [224, 16, -16, 224] },
      targetSprite: { slot: 20, x: 66, y: 88, x2: 2, y2: -1,
        subpriority: 26, oamPriority: 2, matrixNum: 7, matrix: [240, 0, 0, 240] },
      taskSlots: { monBg: 3, initialFade: 4, slidingBg: 5, punch: 6,
        shake: 7, clearMonBg: 8, restoreFade: 9 },
      traceSlots: [21, 22, 23, 24, 25, 26, 27, 28], hitSplatSlot: 29,
      fistSlot: 30, matrixSlot: 5,
      resources: {
        impact: { paletteBank: 12, tileSlot: 20, tileRange: [640, 16] },
        handsAndFeet: { paletteBank: 13, tileSlot: 21, tileRange: [656, 16] },
      },
      tracePalette: {
        bank: (input.tracePalette.bank + 2) & 15,
        bgr555: input.tracePalette.bgr555.map((color, index) =>
          index === 0 ? color : color ^ 0x421),
      },
      matrixBitmap: input.matrixBitmap ^ 0x20,
      matrixSlots: input.matrixSlots.map((matrix, index) => index === 5 ? [224, 16, -16, 224] : matrix),
      fistMatrix: [224, 16, -16, 224],
      spriteOrder: [...input.spriteOrder].reverse(),
      painterSprites: [
        { slot: 18, subpriority: 44, oamPriority: 2, oamY: 48 },
        { slot: 20, subpriority: 26, oamPriority: 2, oamY: 88 },
      ],
      registers: { bg3hofs: 37, bldcnt: 0, bldalpha: 0, bldy: 0 },
      animationRngSeed: input.animationRngSeed ^ 0x183cafe,
      gameplayRng: input.gameplayRng,
    },
  };
  const ages = [0, 7, 11, 28, 29, 46, 50, 57, 58, 66, 69, 89, 90, 109];
  const framebufferDigest = (config: SceneOnMachPunchConfig): string => sha256(Buffer.concat(
    ages.map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const seamDigest = (config: SceneOnMachPunchConfig): string => sha256(JSON.stringify(
    ages.map((age) => sceneOnMachPunchView({ ...createSceneOnMovePresentation(config), age })),
  ));
  const canonicalFramebuffer = framebufferDigest(base), changedFramebuffer = framebufferDigest(altered);
  const canonicalSeam = seamDigest(base), changedSeam = seamDigest(altered);
  if (canonicalFramebuffer === changedFramebuffer || canonicalSeam === changedSeam) {
    throw new Error("altered Mach Punch live control did not change seam and framebuffer");
  }
  if (altered.animationInputs.gameplayRng !== input.gameplayRng) throw new Error("altered control changed opaque gameplay RNG");
  return { species: ["MACHOKE", "BLISSEY"], sidesReversed: true,
    identitySpeciesGeometryOriginsChanged: true,
    spriteTaskResourceMatrixAllocationAndPainterOrderChanged: true,
    registersAndPresentationRngChanged: true,
    gameplayStateAndRngOpaqueUnchanged: true,
    canonicalSeam, changedSeam, canonicalFramebuffer, changedFramebuffer };
}

verifyMachPunchReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "mach-punch-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_MACH_PUNCH", rows: 221,
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
