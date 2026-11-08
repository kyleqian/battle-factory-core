/** Complete retained-RGB production gate for MOVE_SHOCK_WAVE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnShockWaveView,
  type SceneOnShockWaveConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { shockWaveAtAge } from "../../src/animation/shockWave.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  shockWaveConfigFor,
  shockWaveInputsFor,
  verifyShockWaveReducer,
  type ShockWaveOrientation,
} from "./verifyShockWaveReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: ShockWaveOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = (JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/shock-wave-${stem}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
  const expected = orientation === "player-back" ? 267 : 263;
  if (rows.length !== expected) throw new Error(`${orientation}: retained Shock Wave corpus changed`);
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

function compareOrientation(orientation: ShockWaveOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-shock-wave-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/shock-wave-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const config = shockWaveConfigFor(orientation, rows);
  const inputs = shockWaveInputsFor(orientation, rows);
  const stage = createSceneOnMovePresentation(config);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const component = shockWaveAtAge(age, inputs);
    const view = sceneOnShockWaveView(state);
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
  const base = shockWaveConfigFor("player-back", rows);
  const input = base.animationInputs;
  const altered: SceneOnShockWaveConfig = {
    ...base,
    attacker: { species: "CROBAT", geometry: { side: "opponent",
      spriteCorner: { x: 169, y: 11 }, animationCenter: { x: 201, y: 43 },
      battlePositionCenter: { x: 201, y: 43 } } },
    target: { species: "BLISSEY", geometry: { side: "player",
      spriteCorner: { x: 7, y: 85 }, animationCenter: { x: 39, y: 117 },
      battlePositionCenter: { x: 39, y: 85 } } },
    animationInputs: {
      ...input,
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43,
        subpriority: 55, matrixNum: 6, matrix: [192, 16, -16, 192] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 85,
        subpriority: 14, matrixNum: 7, matrix: [224, 0, 0, 224] },
      taskSlots: { charging: 9, progressing: 10, lightning: 11, shake: 12,
        blend: 13, monbg: 14, clear: 15 },
      spriteSlots: { orb: 30, paletteBlend: 31 }, matrixSlots: { orb: 5 },
      resources: {
        circleOfLight: { ...input.resources.circleOfLight, paletteAllocatorSlot: 9, hardwarePaletteBank: 25 },
        electricOrbs: { ...input.resources.electricOrbs, paletteAllocatorSlot: 10, hardwarePaletteBank: 26 },
        spark: { ...input.resources.spark, paletteAllocatorSlot: 11, hardwarePaletteBank: 27 },
        lightning: { ...input.resources.lightning, paletteAllocatorSlot: 12, hardwarePaletteBank: 28 },
      },
      allocator: {
        ...input.allocator,
        initialOccupiedSprites: [...input.allocator.initialOccupiedSprites
          .filter((slot) => slot !== input.attackerSprite.slot && slot !== input.targetSprite.slot), 21, 22],
        initialLiveSprites: [
          ...input.allocator.initialLiveSprites.filter((sprite) =>
            sprite.slot !== input.attackerSprite.slot && sprite.slot !== input.targetSprite.slot),
          { slot: 21, attr: input.attackerSprite.attr, subpriority: 55 },
          { slot: 22, attr: input.targetSprite.attr, subpriority: 14 },
        ],
        spriteOrder: [...input.allocator.spriteOrder].reverse(),
      },
      animationRngSeed: 0x12345678,
    },
  };
  const ages = [0, 14, 31, 45, 77, 105, 159, 195, 230, 262, 266];
  const digest = (config: SceneOnShockWaveConfig): string => sha256(Buffer.concat(
    ages.map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Shock Wave control did not change framebuffer");
  return { species: ["CROBAT", "BLISSEY"], sidesReversed: true,
    geometryAllocationOrderAndPresentationRngChanged: true,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

verifyShockWaveReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "shock-wave-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_SHOCK_WAVE", rows: 530,
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
