/** Portable component/seam/framebuffer acceptance gate for MOVE_RAPID_SPIN. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnRapidSpinView,
  type SceneOnRapidSpinConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

export function rapidSpinRowsFor(orientation: Orientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/rapid-spin-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "rapid-spin-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 229
    || corpus.frames.length !== 131) throw new Error(`${orientation}: corpus changed`);
  return corpus.frames;
}

export function rapidSpinConfigFor(orientation: Orientation, rows = rapidSpinRowsFor(orientation)): SceneOnRapidSpinConfig {
  const playerBack = orientation === "player-back";
  const first = rows[0]!;
  const monbg = rows[7]!.tasks.find((entry: Json) => entry.func?.symbol === "Task_UpdateMonBg")!.data as number[];
  const targetSlot = playerBack ? 8 : 6;
  const targetSprite = first.sprites.find((sprite: Json) => sprite.slot === targetSlot)!;
  const wartortle = {
    species: "WARTORTLE" as const,
    geometry: playerBack
      ? { side: "player" as const, spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent" as const, spriteCorner: { x: 144, y: 16 }, animationCenter: { x: 176, y: 40 }, battlePositionCenter: { x: 176, y: 40 } },
  };
  const onix = {
    species: "ONIX" as const,
    geometry: playerBack
      ? { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } },
  };
  return {
    move: "RAPID_SPIN",
    attacker: wartortle,
    target: onix,
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationInputs: {
      attackerSpriteSlot: monbg[0]!, targetSpriteSlot: targetSlot,
      rapidSpriteSlot: 3, impactSpriteSlot: 3, impactMatrixSlot: 0,
      elevationTaskSlot: 0, shakeTaskSlot: 0, monbgTaskSlot: 1,
      clearTaskSlot: 0, soundTaskSlot: 2,
      spriteOrder: first.spriteOrder,
      paletteBanks: {
        impact: rows[1]!.paletteTags.indexOf(10135),
        rapidSpin: rows[4]!.paletteTags.indexOf(10229),
      },
      tileSlots: {
        impact: rows[1]!.tileTags.indexOf(10135),
        rapidSpin: rows[4]!.tileTags.indexOf(10229),
      },
      baseMatrixBitmap: first.resourceAllocators.matrixBitmap,
      movePower: first.animationMovePower,
      moveDamage: first.animationMoveDamage,
      targetInitialOffset: { x: targetSprite.x2, y: targetSprite.y2 },
      animationRng: first.animationRng,
      monbg: {
        layer: playerBack ? "bg2" : "bg1",
        spriteX: monbg[1]!, spriteY: monbg[2]!, bgX: monbg[3]!, bgY: monbg[4]!,
        inBg2: Boolean(monbg[5]), battlerId: monbg[6] as 0 | 1,
      },
      initialScanlineSrcBuffer: first.scanline.srcBuffer,
      initialScanlineBanks: first.scanlineBuffers,
    },
  };
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

function compareOrientation(orientation: Orientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rapidSpinRowsFor(orientation);
  const scratch = createScratchDir(`pokebench-rapid-spin-core-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/rapid-spin-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(rapidSpinConfigFor(orientation, rows));
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age,
      config: { ...stage.config, animationInputs: { ...stage.config.animationInputs, animationRng: row.animationRng } } };
    const view = sceneOnRapidSpinView(state);
    const owned = row.sprites.filter((sprite: Json) =>
      ["gRapidSpinSpriteTemplate", "gBasicHitSplatSpriteTemplate"].includes(sprite.template?.symbol));
    const component = view.source.offset === row.scriptOffset
      && view.source.wait === row.scriptWait && view.active === row.animScriptActive
      && view.visualTaskCount === row.visualTaskCount
      && view.soundTaskCount === row.soundTaskCount
      && JSON.stringify([view.rapidSpin?.slot, view.impact?.slot])
        === JSON.stringify([
          owned.find((sprite: Json) => sprite.template.symbol === "gRapidSpinSpriteTemplate")?.slot,
          owned.find((sprite: Json) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate")?.slot,
        ]);
    if (!component) throw new Error(`${orientation}/age${age}: component or seam drift`);
    componentMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB drift`);
    const residual = frameDiff(render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const base = rapidSpinConfigFor("player-back");
  const altered: SceneOnRapidSpinConfig = {
    ...base,
    attacker: { species: "TORKOAL", geometry: { side: "player", spriteCorner: { x: 36, y: 52 }, animationCenter: { x: 68, y: 84 }, battlePositionCenter: { x: 68, y: 80 } } },
    target: { species: "RELICANTH", geometry: { side: "opponent", spriteCorner: { x: 149, y: 13 }, animationCenter: { x: 181, y: 45 }, battlePositionCenter: { x: 180, y: 40 } } },
    animationInputs: {
      ...base.animationInputs,
      attackerSpriteSlot: 9, targetSpriteSlot: 11,
      rapidSpriteSlot: 5, impactSpriteSlot: 7, impactMatrixSlot: 4,
      paletteBanks: { impact: 10, rapidSpin: 12 },
      tileSlots: { impact: 15, rapidSpin: 19 },
      movePower: 96, moveDamage: 144, animationRng: 0x89ab_cdef,
      monbg: { layer: "bg2", spriteX: 68, spriteY: 84, bgX: -44, bgY: -52, inBg2: true, battlerId: 0 },
    },
  };
  const digest = (config: SceneOnRapidSpinConfig): string => sha(Buffer.concat(
    [0, 8, 10, 24, 41, 53, 62, 83, 110, 126, 130].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Rapid Spin control did not change framebuffer");
  return { species: ["TORKOAL", "RELICANTH"], geometryChanged: true,
    allocationOrderChanged: true, powerDamageRngChanged: true, canonical, changed };
}

export function rapidSpinActualCoreVerdict(): Json {
  const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
  const stable = {
    schema: "rapid-spin-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_RAPID_SPIN", rows: 262,
    componentMatched: orientations.reduce((n, row) => n + row.componentMatched, 0),
    framebufferMatched: orientations.reduce((n, row) => n + row.framebufferMatched, 0),
    residualPixels: orientations.reduce((n, row) => n + row.residualPixels, 0),
    orientations, alteredLiveControl: alteredControl(),
  };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(rapidSpinActualCoreVerdict()));
}
