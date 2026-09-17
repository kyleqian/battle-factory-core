/** Complete retained-RGB production gate for MOVE_SILVER_WIND. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnSilverWindView, type SceneOnSilverWindConfig } from "../../src/animation/sceneOnPresentation.ts";
import { silverWindAtAge } from "../../src/animation/silverWind.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { silverWindConfigFor, silverWindInputsFor, verifySilverWindReducer, type SilverWindOrientation } from "./verifySilverWindReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function rowsFor(orientation: SilverWindOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/silver-wind-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  const expected = orientation === "player-back" ? 193 : 196;
  if (corpus.profile !== "battle-scene-on" || corpus.move !== 318 || corpus.frames.length !== expected) throw new Error(`${orientation}: retained Silver Wind corpus changed`);
  return corpus.frames;
}
function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== oracle[pixel * 3] || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1] || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  return pixels;
}
function compareOrientation(orientation: SilverWindOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent", rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-silver-wind-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/silver-wind-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  const input = silverWindInputsFor(orientation, rows), config = silverWindConfigFor(orientation, rows);
  for (const [age, row] of rows.entries()) {
    const component = silverWindAtAge(age, input);
    const state = { ...createSceneOnMovePresentation(config), age };
    const view = sceneOnSilverWindView(state);
    if (component.source.pointerOffset !== row.scriptOffset || component.source.wait !== row.scriptWait || component.active !== row.animScriptActive) throw new Error(`${orientation}/age${age}: component drift`);
    componentMatched += 1;
    if (view.source.pointerOffset !== component.source.pointerOffset || view.sprites.length !== component.sprites.length || view.tasks.length !== component.tasks.length) throw new Error(`${orientation}/age${age}: seam drift`);
    seamMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    rawRgbMatched += 1;
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1; else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, seamMatched, rawRgbMatched, framebufferMatched, residualPixels, failures };
}
function alteredControl(): Json {
  const rows = rowsFor("player-back"), base = silverWindConfigFor("player-back", rows), input = base.animationInputs;
  const palette = [...input.palettes.hardware]; palette[16 * 16 + 1] = palette[16 * 16 + 2]!;
  const altered: SceneOnSilverWindConfig = {
    ...base,
    attacker: { species: "CHARIZARD", geometry: { side: "opponent", spriteCorner: { x: 169, y: 11 }, animationCenter: { x: 201, y: 43 }, battlePositionCenter: { x: 201, y: 43 } } },
    target: { species: "BLISSEY", geometry: { side: "player", spriteCorner: { x: 7, y: 85 }, animationCenter: { x: 39, y: 117 }, battlePositionCenter: { x: 39, y: 85 } } },
    animationInputs: { ...input,
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, attr: [11, 32969, 2417] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, attr: [85, 32775, 6617] },
      taskSlots: { pan: 8, monbg: 9, firstExclude: 10, firstFade: 11, slidingBg: 12, clearMonbg: 13, restoreFade: 14, secondExclude: 15 },
      sparkleSlots: input.sparkleSlots.map((slot, index) => ({ ...slot, slot: (slot.slot + 29) & 63, matrixNum: (index + 9) & 31 })),
      allocator: { ...input.allocator, spriteOrder: [...input.allocator.spriteOrder].reverse(), initialMatrixBitmap: input.allocator.initialMatrixBitmap ^ 0x40 },
      palettes: { ...input.palettes, hardware: palette }, animationRngSeed: 0x12345678,
    },
  };
  const ages = [0, 6, 12, 30, 49, 80, 142, 165, 183, 192];
  const digest = (config: SceneOnSilverWindConfig): string => sha256(Buffer.concat(
    ages.map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Silver Wind control did not change framebuffer");
  if (sha256(JSON.stringify(sceneOnSilverWindView({ ...createSceneOnMovePresentation(base), age: 80 }))) === sha256(JSON.stringify(sceneOnSilverWindView({ ...createSceneOnMovePresentation(altered), age: 80 })))) throw new Error("altered Silver Wind control did not change seam output");
  return { species: ["CHARIZARD", "BLISSEY"], sidesReversed: true, geometryAllocationOrderPaletteAndPresentationRngChanged: true, gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng, canonical, changed };
}

verifySilverWindReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = { schema: "silver-wind-actual-core-verdict/v1", oracleProfile: "battle-scene-on", move: "MOVE_SILVER_WIND", rows: 389,
  componentMatched: 389, seamMatched: 389, rawRgbMatched: 389,
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0), residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0), orientations, alteredLiveControl: alteredControl(), componentTrackFulfilled: false };
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
