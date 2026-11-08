/** Complete retained-RGB production gate for MOVE_NIGHTMARE's legal body. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnNightmareView,
  type SceneOnNightmareConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { nightmareAtAge } from "../../src/animation/nightmare.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  nightmareConfigFor,
  nightmareInputsFor,
  verifyNightmareReducer,
  type NightmareOrientation,
} from "./verifyNightmareReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: NightmareOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/nightmare-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.profile !== "battle-scene-on" || corpus.move !== 171
    || corpus.frames.length !== 169) {
    throw new Error(`${orientation}: retained Nightmare corpus changed`);
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

function compareOrientation(orientation: NightmareOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-nightmare-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/nightmare-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0;
  let framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = nightmareAtAge(age, nightmareInputsFor(orientation, rows, age));
    const state = { ...createSceneOnMovePresentation(
      nightmareConfigFor(orientation, rows, age)), age };
    const view = sceneOnNightmareView(state);
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
  const base = nightmareConfigFor("player-back", rows, 43);
  const input = base.animationInputs;
  const shiftedPalette = [...input.palettes.hardware];
  shiftedPalette[16 * 16 + 1] = shiftedPalette[16 * 16 + 2]!;
  shiftedPalette[17 * 16 + 1] = shiftedPalette[17 * 16 + 3]!;
  const altered: SceneOnNightmareConfig = {
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
        subpriority: 55, attr: [11, 32969, 2417] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117,
        subpriority: 14, attr: [85, 32775, 6617] },
      clone: { ...input.clone, slot: 30, subpriority: 14,
        sourceCreationOrder: 37 },
      tasks: { fadeToGhost: 9, clone: 10, shake: 11, fadeRestore: 12 },
      monBg: { ...input.monBg, updateTaskSlot: 13, clearTaskSlot: 14,
        selected: "BG2", backgroundOrigin: { x: 469, y: 459 }, inBg2: 1,
        battler: 0 },
      painterOrder: [...input.painterOrder].reverse(),
      resources: { alteredAllocator: true }, matrixBitmap: input.matrixBitmap ^ 0x40,
      palettes: { ...input.palettes, hardware: shiftedPalette },
      animationRngSeed: 0x12345678,
    },
  };
  const ages = [0, 20, 22, 40, 43, 44, 46, 80, 120, 123, 127, 148, 150, 168];
  const digest = (config: SceneOnNightmareConfig): string => sha256(Buffer.concat(
    ages.map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Nightmare control did not change framebuffer");
  const canonicalSeam = sceneOnNightmareView({ ...createSceneOnMovePresentation(base), age: 43 });
  const alteredSeam = sceneOnNightmareView({ ...createSceneOnMovePresentation(altered), age: 43 });
  if (sha256(JSON.stringify(canonicalSeam)) === sha256(JSON.stringify(alteredSeam))) {
    throw new Error("altered Nightmare control did not change seam output");
  }
  return { species: ["CROBAT", "BLISSEY"], sidesReversed: true,
    geometryAllocationOrderPaletteAndPresentationRngChanged: true,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

verifyNightmareReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "nightmare-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_NIGHTMARE", rows: 338,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  seamMatched: orientations.reduce((sum, row) => sum + row.seamMatched, 0),
  rawRgbMatched: orientations.reduce((sum, row) => sum + row.rawRgbMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations, alteredLiveControl: alteredControl(),
  contestArmExecuted: false, componentTrackFulfilled: false,
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
