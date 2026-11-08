/** Complete retained-RGB production gate for MOVE_DESTINY_BOND. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnDestinyBondView,
  type SceneOnDestinyBondConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  destinyBondConfigFor,
  type DestinyBondOrientation,
} from "./verifyDestinyBondReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: DestinyBondOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/destiny-bond-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "destiny-bond-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 194
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

function compareOrientation(orientation: DestinyBondOrientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-destiny-bond-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/destiny-bond-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const base = destinyBondConfigFor(orientation, rows, rows[0]!.spriteOrder);
  const stage = createSceneOnMovePresentation(base);
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age, config: { ...stage.config,
      animationInputs: { ...stage.config.animationInputs, spriteOrder: row.spriteOrder } } };
    const view = sceneOnDestinyBondView(state);
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
  return { orientation, rows: rows.length, componentMatched,
    framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const rows = rowsFor("player-back");
  const base = destinyBondConfigFor("player-back", rows, rows[43]!.spriteOrder);
  const altered: SceneOnDestinyBondConfig = {
    ...base,
    attacker: { species: "GRUMPIG", geometry: { side: "player",
      spriteCorner: { x: 50, y: 52 }, animationCenter: { x: 82, y: 84 },
      battlePositionCenter: { x: 82, y: 78 } } },
    target: { species: "RELICANTH", geometry: { side: "opponent",
      spriteCorner: { x: 118, y: 24 }, animationCenter: { x: 150, y: 56 },
      battlePositionCenter: { x: 150, y: 56 } } },
    animationInputs: { ...base.animationInputs, attackerBottom: 112, targetBottom: 80,
      attackerSpriteSlot: 2, whiteShadowSpriteSlot: 19, whiteShadowTaskSlot: 4,
      shakeTaskSlot: 5, paletteTaskSlot: 6, fadeTaskSlot: 7, clearMonBgTaskSlot: 8,
      whiteShadowTileSlot: 20, whiteShadowPaletteBank: 9, whiteShadowTileRange: [400, 32],
      matrixBitmap: 10, spriteOrder: [...base.animationInputs.spriteOrder].reverse(),
      whiteShadowOrderIndex: 17, visibleObjPaletteBanks: [16, 17],
      excludedObjPaletteBanks: Array.from({ length: 14 }, (_, index) => index + 18) },
  };
  const digest = (config: SceneOnDestinyBondConfig): string => sha256(Buffer.concat(
    [0, 23, 25, 43, 44, 93, 94, 119, 138, 163, 165, 187].map((age) =>
      Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Destiny Bond control did not change framebuffer");
  return { species: ["GRUMPIG", "RELICANTH"], geometryChanged: true,
    allocationMatrixTaskOrderPaletteBackgroundChanged: true, canonical, changed };
}

const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
const stable = { schema: "destiny-bond-actual-core-verdict/v1",
  oracleProfile: "battle-scene-on", move: "MOVE_DESTINY_BOND", rows: 376,
  componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
  framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
  residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
  orientations, alteredLiveControl: alteredControl() };
const report = { ...stable, digest: sha256(JSON.stringify(stable)) };
console.log(JSON.stringify(report));
if (process.argv.includes("--require-exact") && report.residualPixels !== 0) process.exitCode = 1;
