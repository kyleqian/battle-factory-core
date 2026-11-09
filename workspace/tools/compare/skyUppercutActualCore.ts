/** Complete retained-RGB production gate for MOVE_SKY_UPPERCUT. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSkyUppercutView,
  type SceneOnSkyUppercutConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  skyUppercutConfigFor,
  type SkyUppercutOrientation,
} from "./verifySkyUppercutReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: SkyUppercutOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/sky-uppercut-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "sky-uppercut-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 327
    || corpus.frames.length !== 188) throw new Error(`${orientation}: retained corpus changed`);
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

function compareOrientation(orientation: SkyUppercutOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-sky-uppercut-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/sky-uppercut-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const rgbRoot = scratch;
  const base = skyUppercutConfigFor(orientation, rows, rows[0]!.spriteOrder);
  const stage = createSceneOnMovePresentation(base);
  let componentMatched = 0;
  let framebufferMatched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = {
      ...stage,
      age,
      config: {
        ...stage.config,
        animationInputs: { ...stage.config.animationInputs, spriteOrder: row.spriteOrder },
      },
    };
    const view = sceneOnSkyUppercutView(state);
    if (view.source.offset !== row.scriptOffset || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive) {
      throw new Error(`${orientation}/age${age}: component or seam drift`);
    }
    componentMatched += 1;
    const raw = readFileSync(resolve(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    const residual = frameDiff(render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
    }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched,
    framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = skyUppercutConfigFor("player-back", rows, rows[91]!.spriteOrder);
  const allSlots = Array.from({ length: 64 }, (_, slot) => slot);
  const altered: SceneOnSkyUppercutConfig = {
    ...base,
    attacker: { species: "IVYSAUR", geometry: { side: "player",
      spriteCorner: { x: 52, y: 54 }, animationCenter: { x: 84, y: 86 },
      battlePositionCenter: { x: 84, y: 76 } } },
    target: { species: "RELICANTH", geometry: { side: "opponent",
      spriteCorner: { x: 116, y: 22 }, animationCenter: { x: 148, y: 54 },
      battlePositionCenter: { x: 148, y: 54 } } },
    animationInputs: {
      ...base.animationInputs,
      targetPictureOrigin: { x: 148, y: 66 },
      attackerSpriteSlot: 2,
      targetSpriteSlot: 18,
      attackerInitialOffset: { x: 2, y: 1 },
      targetInitialOffset: { x: 3, y: -1 },
      slideSpriteSlots: [19, 20, 19, 21],
      impactSpriteSlots: [22, 23, 24, 25, 22],
      impactMatrixSlots: [4, 5, 6, 7, 4],
      updateMonBgTaskSlot: 5,
      fadeInTaskSlot: 4,
      backgroundTaskSlot: 6,
      shakeMon2TaskSlot: 3,
      shakeMonInPlaceTaskSlot: 3,
      clearMonBgTaskSlot: 3,
      restoreFadeTaskSlot: 7,
      slideSubpriority: 24,
      impactSubpriority: 29,
      impactPaletteBank: 10,
      impactTileSlot: 24,
      baseMatrixBitmap: 2,
      spriteOrder: [...allSlots].reverse(),
      monbg: { layer: "bg1", spriteSlot: 18, spriteX: 151, spriteY: 53,
        bgX: -96, bgY: -24, inBg2: false, battlerId: 1 },
      initialBg3Offset: { x: 13, y: -7 },
    },
  };
  const digest = (config: SceneOnSkyUppercutConfig): string => sha256(Buffer.concat(
    [0, 4, 26, 85, 91, 103, 109, 147, 150, 167, 187].map((age) =>
      Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base);
  const changed = digest(altered);
  if (canonical === changed) throw new Error("altered Sky Uppercut control did not change framebuffer");
  return {
    species: ["IVYSAUR", "RELICANTH"],
    geometryPictureOriginChanged: true,
    allocationMatrixTaskOrderMonbgBgChanged: true,
    canonical,
    changed,
  };
}

const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "sky-uppercut-actual-core-verdict/v1",
  oracleProfile: "battle-scene-on",
  move: "MOVE_SKY_UPPERCUT",
  rows: 376,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations,
  alteredLiveControl: alteredControl(),
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
