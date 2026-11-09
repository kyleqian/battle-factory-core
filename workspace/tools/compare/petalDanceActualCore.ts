/** Complete retained-RGB production gate for MOVE_PETAL_DANCE. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnPetalDanceView,
  type SceneOnPetalDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  petalDanceConfigFor,
  type PetalDanceOrientation,
} from "./verifyPetalDanceReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: PetalDanceOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/petal-dance-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "petal-dance-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 80
    || corpus.frames.length !== 244) throw new Error(`${orientation}: retained corpus changed`);
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

function compareOrientation(orientation: PetalDanceOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-petal-dance-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/petal-dance-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const rgbRoot = resolve(scratch,
    orientation === "player-back" ? "player-rgb" : "opponent-first-rgb");
  const base = petalDanceConfigFor(orientation, rows, rows[0]!.spriteOrder);
  const stage = createSceneOnMovePresentation(base);
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
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
    const view = sceneOnPetalDanceView(state);
    const owned = row.sprites.filter((sprite: Json) => sprite.template?.symbol
      && ["gPetalDanceBigFlowerSpriteTemplate", "gPetalDanceSmallFlowerSpriteTemplate",
        "gSlideMonToOffsetSpriteTemplate", "gBasicHitSplatSpriteTemplate",
        "gSlideMonToOriginalPosSpriteTemplate"].includes(sprite.template.symbol));
    if (view.source.offset !== row.scriptOffset || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive || view.sprites.length !== owned.length
      || view.painterSlots.length !== owned.length) {
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
  const base = petalDanceConfigFor("player-back", rows, rows[10]!.spriteOrder);
  const alteredSlots = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
  const allSlots = Array.from({ length: 64 }, (_, slot) => slot);
  const altered: SceneOnPetalDanceConfig = {
    ...base,
    attacker: { species: "IVYSAUR", geometry: { side: "player",
      spriteCorner: { x: 52, y: 54 }, animationCenter: { x: 84, y: 86 },
      battlePositionCenter: { x: 84, y: 76 } } },
    target: { species: "RELICANTH", geometry: { side: "opponent",
      spriteCorner: { x: 116, y: 22 }, animationCenter: { x: 148, y: 54 },
      battlePositionCenter: { x: 148, y: 54 } } },
    animationInputs: {
      ...base.animationInputs,
      attackerPictureOrigin: { x: 84, y: 94 },
      flowerSpriteSlots: alteredSlots,
      flowerMatrixNum: 4,
      attackerSpriteSlot: 2,
      targetSpriteSlot: 18,
      attackerInitialOffset: { x: 2, y: 1 },
      targetInitialOffset: { x: 3, y: 0 },
      attackerSubpriority: 34,
      ellipseTaskSlot: 4,
      shakeTaskSlot: 3,
      updateMonBgTaskSlot: 5,
      clearMonBgTaskSlot: 2,
      offsetSlideSpriteSlot: 32,
      originalSlideSpriteSlot: 32,
      hitSplatSpriteSlot: 33,
      hitSplatMatrixSlot: 4,
      dummySpriteOrigin: { x: 148, y: 54 },
      slideSubpriority: 24,
      hitSplatSubpriority: 23,
      baseMatrixBitmap: 2,
      spriteOrder: [...alteredSlots].reverse().concat(allSlots.filter((slot) =>
        !alteredSlots.includes(slot))),
      monbg: { layer: "bg1", spriteSlot: 18, spriteX: 148, spriteY: 54,
        bgX: -96, bgY: -24, inBg2: false, battlerId: 1 },
    },
  };
  const digest = (config: SceneOnPetalDanceConfig): string => sha256(Buffer.concat(
    [0, 7, 10, 44, 108, 149, 199, 206, 214, 231, 241, 243].map((age) =>
      Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Petal Dance control did not change framebuffer");
  return { species: ["IVYSAUR", "RELICANTH"], geometryChanged: true,
    allocationMatrixOrderChanged: true, canonical, changed };
}

const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = {
  schema: "petal-dance-actual-core-verdict/v1",
  oracleProfile: "battle-scene-on",
  move: "MOVE_PETAL_DANCE",
  rows: 488,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations,
  alteredLiveControl: alteredControl(),
};
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
