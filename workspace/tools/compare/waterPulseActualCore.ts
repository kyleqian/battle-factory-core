/** Complete retained-RGB production gate for MOVE_WATER_PULSE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnWaterPulseView,
  type SceneOnWaterPulseConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  verifyWaterPulseReducer,
  waterPulseConfigFor,
  type WaterPulseOrientation,
} from "./verifyWaterPulseReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: WaterPulseOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/water-pulse-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "water-pulse-dense-evidence/v1" || corpus.profile !== "battle-scene-on"
    || corpus.move !== 352 || corpus.frames.length !== 160) throw new Error(`${orientation}: retained corpus changed`);
  return corpus.frames;
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== oracle[pixel * 3] || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  }
  return pixels;
}

function compareOrientation(orientation: WaterPulseOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-water-pulse-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/water-pulse-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const base = waterPulseConfigFor(orientation, rows);
  const stage = createSceneOnMovePresentation(base);
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age, config: { ...stage.config, animationInputs: {
      ...stage.config.animationInputs, spriteOrder: row.spriteOrder,
    } } };
    const view = sceneOnWaterPulseView(state);
    if (view.source.pointerOffset !== row.scriptOffset || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive) throw new Error(`${orientation}/age${age}: seam drift`);
    componentMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = waterPulseConfigFor("player-back", rows);
  const altered: SceneOnWaterPulseConfig = {
    ...base,
    attacker: { species: "WOBBUFFET", geometry: { side: "player", spriteCorner: { x: 34, y: 58 },
      animationCenter: { x: 66, y: 90 }, battlePositionCenter: { x: 66, y: 90 } } },
    target: { species: "RELICANTH", geometry: { side: "opponent", spriteCorner: { x: 150, y: 16 },
      animationCenter: { x: 182, y: 48 }, battlePositionCenter: { x: 182, y: 48 } } },
    animationInputs: { ...base.animationInputs,
      targetPictureCenter: { x: 182, y: 48 }, attackerRingOrigin: { x: 66, y: 98 },
      targetRingCenter: { x: 182, y: 48 }, attackerSpriteSlot: 2, targetSpriteSlot: 19,
      simplePaletteSpriteSlot: 20, smallBubbleSlots: [21, 22, 23, 24, 25], ringSlots: [26, 27, 28],
      ringBubbleSlots: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
      ringMatrixSlots: [5, 7, 9], ringBubbleMatrixSlots: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
      smallBubbles: { tileSlot: 12, paletteBank: 10, tileRange: [400, 10] },
      blueRing2: { tileSlot: 13, paletteBank: 11, tileRange: [410, 8] },
      updateMonBgTaskSlot: 4, clearMonBgTaskSlot: 5, shakeTaskSlot: 6,
      monBg: { ...base.animationInputs.monBg, snapshot: { x: 182, y: 48 }, baseScroll: { x: -151, y: -16 },
        activeCnt: base.animationInputs.monBg.activeCnt ^ 2 },
      initialMatrixBitmap: 10, spriteOrder: [...base.animationInputs.spriteOrder].reverse(),
      animationRngSeed: base.animationInputs.animationRngSeed ^ 0x12345678,
    },
  };
  const digest = (config: SceneOnWaterPulseConfig): string => sha256(Buffer.concat(
    [0, 8, 22, 72, 86, 101, 111, 136, 155, 159].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Water Pulse control did not change framebuffer");
  return { species: ["WOBBUFFET", "RELICANTH"], geometryChanged: true,
    allocationMatrixTaskOrderPaletteBackgroundChanged: true, canonical, changed };
}

verifyWaterPulseReducer();
const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = { schema: "water-pulse-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
  move: "MOVE_WATER_PULSE", rows: 320,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations, alteredLiveControl: alteredControl() };
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
