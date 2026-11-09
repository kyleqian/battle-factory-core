/** Complete retained-RGB production gate for MOVE_SNORE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSnoreView,
  type SceneOnSnoreConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  snoreConfigFor,
  verifySnoreReducer,
  type SnoreOrientation,
} from "./verifySnoreReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: SnoreOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/snore-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  if (rows.length !== 70) throw new Error(`${orientation}: retained Snore corpus changed`);
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

function compareOrientation(orientation: SnoreOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-snore-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/snore-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(snoreConfigFor(orientation, rows));
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnSnoreView(state);
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
  const base = snoreConfigFor("player-back", rows);
  const input = base.animationInputs;
  const palette = input.resource.palette.map((color, index) =>
    (color ^ (index * 37 + 0x421)) & 0x7fff);
  const altered: SceneOnSnoreConfig = {
    ...base,
    attacker: { species: "WAILORD", geometry: { side: "opponent",
      spriteCorner: { x: 169, y: 13 }, animationCenter: { x: 201, y: 37 },
      battlePositionCenter: { x: 201, y: 45 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 7, y: 81 }, animationCenter: { x: 39, y: 121 },
      battlePositionCenter: { x: 39, y: 113 } } },
    animationInputs: {
      ...input,
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 45,
        attr: [13, 0xc0a9, 0x6d23], subpriority: 55, oamPriority: 3,
        matrixNum: 0, matrix: [256, 0, 0, 256] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 113,
        attr: [81, 0xc007, 0x4123], subpriority: 14, oamPriority: 0 },
      taskSlots: { scale: 5, monbg: 6, targetShake: 7, clearMonbg: 8 },
      scaleMatrixNum: 6,
      effectAllocations: input.effectAllocations.map((entry, call) => ({
        platform: { ...entry.platform, slot: 13 + call, subpriority: 52 - call },
        z: entry.z.map((allocation, index) => ({ ...allocation,
          slot: 10 + index + call * 3,
          attr: [allocation.attr[0], allocation.attr[1], 0x8900 + index],
          subpriority: 50 - index, oamPriority: 2 })),
      })),
      resource: { tag: 10197, tileSlot: 31, paletteAllocatorSlot: 8,
        paletteBank: 24, tileRange: [620, 16], palette },
      allocator: { ...input.allocator, matrixBitmap: 0x95,
        spriteOrder: input.allocator.spriteOrder.slice().reverse() },
      background: { ...input.background,
        values: { ...input.background.values, callerOwnedAxis: 73 },
        registers: { ...input.background.registers, callerOwnedRegister: 0x2468 },
        monbg: { bg: 1, activeCnt: 0x5c02, paletteBank: 7 } },
      animationRngSeed: 0x12345678,
    },
  };
  const renderDigest = (config: SceneOnSnoreConfig): string => sha256(Buffer.concat(
    [0, 4, 7, 9, 16, 31, 39, 41, 48, 63, 65, 69].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const seamDigest = (config: SceneOnSnoreConfig): string => sha256(JSON.stringify(
    [4, 7, 9, 16, 31, 39, 41, 48, 63, 65, 69]
      .map((age) => sceneOnSnoreView({ age, config })),
  ));
  const canonical = renderDigest(base), changed = renderDigest(altered);
  const canonicalSeam = seamDigest(base), changedSeam = seamDigest(altered);
  if (canonical === changed || canonicalSeam === changedSeam) {
    throw new Error("altered Snore live control did not change seam and framebuffer");
  }
  if (altered.animationInputs.gameplayRng !== input.gameplayRng) {
    throw new Error("altered Snore control crossed the gameplay RNG boundary");
  }
  return { species: ["WAILORD", "BLISSEY"], sidesReversed: true,
    geometryAndPictureOriginsChanged: true,
    spriteTaskResourceMatrixAllocationsChanged: true, painterOrderChanged: true,
    palettesRegistersAndAnimationRngChanged: true, seamChanged: true,
    framebufferChanged: true, gameplayRngOpaqueAndUnchanged: true,
    canonical, changed, canonicalSeam, changedSeam };
}

verifySnoreReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "snore-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_SNORE", rows: 140,
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
