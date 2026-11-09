/** Complete retained-RGB production gate for MOVE_OVERHEAT's legal body. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnOverheatView, type SceneOnOverheatConfig } from "../../src/animation/sceneOnPresentation.ts";
import { overheatAtAge } from "../../src/animation/overheat.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { overheatConfigFor, overheatInputsFor, verifyOverheatReducer, type OverheatOrientation } from "./verifyOverheatReducer.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha256 = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: OverheatOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/overheat-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.profile !== "battle-scene-on" || corpus.move !== 315 || corpus.frames.length !== 230) throw new Error(`${orientation}: retained Overheat corpus changed`);
  return corpus.frames;
}
function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== oracle[pixel * 3] || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1] || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  return pixels;
}
function compareOrientation(orientation: OverheatOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent", rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-overheat-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/overheat-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  let componentMatched = 0, seamMatched = 0, rawRgbMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = overheatAtAge(age, overheatInputsFor(orientation, rows));
    const state = { ...createSceneOnMovePresentation(overheatConfigFor(orientation, rows)), age };
    const view = sceneOnOverheatView(state);
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
  const rows = rowsFor("player-back"), base = overheatConfigFor("player-back", rows), input = base.animationInputs;
  const palette = [...input.palettes.hardware]; palette[16 * 16 + 1] = palette[16 * 16 + 2]!;
  const altered: SceneOnOverheatConfig = {
    ...base,
    attacker: { species: "CROBAT", geometry: { side: "opponent", spriteCorner: { x: 169, y: 11 }, animationCenter: { x: 201, y: 43 }, battlePositionCenter: { x: 201, y: 43 } } },
    target: { species: "BLISSEY", geometry: { side: "player", spriteCorner: { x: 7, y: 85 }, animationCenter: { x: 39, y: 117 }, battlePositionCenter: { x: 39, y: 85 } } },
    animationInputs: { ...input,
      attackerSprite: { ...input.attackerSprite, slot: 21, x: 201, y: 43, subpriority: 55, attr: [11, 32969, 2417] },
      targetSprite: { ...input.targetSprite, slot: 22, x: 39, y: 117, subpriority: 14, attr: [85, 32775, 6617] },
      taskSlots: { monbg: 9, firstAttackerShake: 10, targetShake: 11, lastAttackerShake: 12, clearMonbg: 13 },
      spriteSlots: { flames: input.spriteSlots.flames.map((slot) => slot + 29 & 63), hitsplats: [30, 31, 32, 33], paletteBlends: [34, 35, 36, 37, 38] },
      matrixSlots: { hitsplats: [9, 10, 11, 12] },
      allocator: { ...input.allocator, spriteOrder: [...input.allocator.spriteOrder].reverse(), initialMatrixBitmap: input.allocator.initialMatrixBitmap ^ 0x40 },
      palettes: { ...input.palettes, hardware: palette }, animationRngSeed: 0x12345678,
    },
  };
  const ages = [0, 7, 10, 35, 64, 80, 107, 138, 186, 205, 229];
  const digest = (config: SceneOnOverheatConfig): string => sha256(Buffer.concat(ages.map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } })))));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Overheat control did not change framebuffer");
  if (sha256(JSON.stringify(sceneOnOverheatView({ ...createSceneOnMovePresentation(base), age: 80 }))) === sha256(JSON.stringify(sceneOnOverheatView({ ...createSceneOnMovePresentation(altered), age: 80 })))) throw new Error("altered Overheat control did not change seam output");
  return { species: ["CROBAT", "BLISSEY"], sidesReversed: true, geometryAllocationOrderPaletteAndPresentationRngChanged: true, gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng, canonical, changed };
}

verifyOverheatReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = { schema: "overheat-actual-core-verdict/v1", oracleProfile: "battle-scene-on", move: "MOVE_OVERHEAT", rows: 460,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0), seamMatched: orientations.reduce((sum, row) => sum + row.seamMatched, 0), rawRgbMatched: orientations.reduce((sum, row) => sum + row.rawRgbMatched, 0), framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0), residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0), orientations, alteredLiveControl: alteredControl(), componentTrackFulfilled: false };
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
