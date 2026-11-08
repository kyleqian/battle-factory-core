/** Dense actual-core comparator for the source-relative Foresight seam. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnForesightView,
  type SceneOnForesightConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");

export function foresightRowsFor(orientation: Orientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/foresight-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "foresight-dense-evidence/v1" || corpus.profile !== "battle-scene-on"
    || corpus.move !== 193 || corpus.frames.length !== 167) throw new Error(`${orientation}: corpus changed`);
  return corpus.frames;
}

export function foresightConfigFor(orientation: Orientation, rows = foresightRowsFor(orientation)): SceneOnForesightConfig {
  const playerBack = orientation === "player-back";
  const first = rows[0]!;
  const mon = rows[4]!.tasks.find((entry: Json) => entry.func?.symbol === "Task_UpdateMonBg")!.data as number[];
  const targetSlot = playerBack ? 8 : 6;
  const target = playerBack
    ? { species: "ONIX" as const, geometry: { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } }
    : { species: "ONIX" as const, geometry: { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } };
  const attacker = playerBack
    ? { species: "MACHOKE" as const, geometry: { side: "player" as const, spriteCorner: { x: 40, y: 57 }, animationCenter: { x: 72, y: 89 }, battlePositionCenter: { x: 72, y: 80 } } }
    : { species: "MACHOKE" as const, geometry: { side: "opponent" as const, spriteCorner: { x: 144, y: 14 }, animationCenter: { x: 176, y: 40 }, battlePositionCenter: { x: 176, y: 40 } } };
  return {
    move: "FORESIGHT", attacker, target,
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "male",
    },
    animationInputs: {
      targetBounds: playerBack
        ? { left: 148, right: 204, top: 10, bottom: 73, rightTop: 11 }
        : { left: 44, right: 100, top: 56, bottom: 119, rightTop: 57 },
      targetPictureOffset: playerBack ? { x: 176, y: 42 } : { x: 72, y: 88 },
      targetSpriteSlot: targetSlot, glassSpriteSlot: 3, blendTaskSlot: 0,
      updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, spriteOrder: first.spriteOrder,
      glassPaletteBank: rows[1]!.paletteTags.indexOf(10258), glassTileSlot: rows[1]!.tileTags.indexOf(10258),
      matrixBitmap: first.resourceAllocators.matrixBitmap,
      monbg: { layer: playerBack ? "bg1" : "bg2", spriteX: mon[1]!, spriteY: mon[2]!, bgX: mon[3]!, bgY: mon[4]!, inBg2: Boolean(mon[5]), battlerId: mon[6] as 0 | 1 },
    },
  };
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < 240 * 160; i += 1) {
    if (app[i * 4] !== oracle[i * 3] || app[i * 4 + 1] !== oracle[i * 3 + 1] || app[i * 4 + 2] !== oracle[i * 3 + 2]) count += 1;
  }
  return count;
}

function compareOrientation(orientation: Orientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = foresightRowsFor(orientation);
  const scratch = createScratchDir(`pokebench-foresight-core-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/foresight-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(foresightConfigFor(orientation, rows));
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnForesightView(state);
    const owned = row.sprites.find((sprite: Json) => sprite.template?.symbol === "gForesightMagnifyingGlassSpriteTemplate");
    const component = view.source.offset === row.scriptOffset && view.source.wait === row.scriptWait
      && view.active === row.animScriptActive
      && view.glass?.slot === owned?.slot;
    if (!component) throw new Error(`${orientation}/age${age}: component/seam drift`);
    componentMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1; else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const base = foresightConfigFor("player-back");
  const altered: SceneOnForesightConfig = {
    ...base,
    attacker: { species: "TORKOAL", geometry: { side: "player", spriteCorner: { x: 36, y: 52 }, animationCenter: { x: 68, y: 84 }, battlePositionCenter: { x: 68, y: 80 } } },
    target: { species: "RELICANTH", geometry: { side: "opponent", spriteCorner: { x: 149, y: 13 }, animationCenter: { x: 181, y: 45 }, battlePositionCenter: { x: 180, y: 40 } } },
    animationInputs: { ...base.animationInputs, targetBounds: { left: 153, right: 213, top: 13, bottom: 76 }, targetPictureOffset: { x: 181, y: 45 }, glassSpriteSlot: 9, glassPaletteBank: 12, glassTileSlot: 15 },
  };
  const digest = (config: SceneOnForesightConfig): string => sha(Buffer.concat(
    [0, 7, 20, 79, 114, 144, 162, 166].map((age) => Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Foresight control did not change framebuffer");
  return { species: ["TORKOAL", "RELICANTH"], geometryChanged: true, allocationChanged: true, canonical, changed };
}

export function foresightActualCoreVerdict(): Json {
  const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
  const stable = { schema: "foresight-actual-core-verdict/v1", oracleProfile: "battle-scene-on", move: "MOVE_FORESIGHT", rows: 334,
    componentMatched: orientations.reduce((n, row) => n + row.componentMatched, 0), framebufferMatched: orientations.reduce((n, row) => n + row.framebufferMatched, 0),
    residualPixels: orientations.reduce((n, row) => n + row.residualPixels, 0), orientations, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(foresightActualCoreVerdict()));
