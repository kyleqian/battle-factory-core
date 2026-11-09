/** Hermetic actual-core production gate for MOVE_SUNNY_DAY. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSunnyDayView,
  type SceneOnSunnyDayConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha256 = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex");

function rowsFor(orientation: Orientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(
    root, `tools/compare/evidence/sunny-day-${stem}-dense-state.json.gz`,
  ))).toString("utf8")) as Json;
  if (corpus.schema !== "sunny-day-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 241
    || corpus.frames.length !== 158) {
    throw new Error(`${orientation}: retained Sunny Day corpus changed`);
  }
  return corpus.frames;
}

function configFor(orientation: Orientation, rows = rowsFor(orientation)): SceneOnSunnyDayConfig {
  const first = rows[0]!;
  const playerBack = orientation === "player-back";
  const bellossom = {
    species: "BELLOSSOM" as const,
    geometry: playerBack
      ? { side: "player" as const, spriteCorner: { x: 40, y: 59 }, animationCenter: { x: 72, y: 91 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent" as const, spriteCorner: { x: 144, y: 22 }, animationCenter: { x: 176, y: 54 }, battlePositionCenter: { x: 176, y: 40 } },
  };
  const onix = {
    species: "ONIX" as const,
    geometry: playerBack
      ? { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } },
  };
  return {
    move: "SUNNY_DAY",
    attacker: bellossom,
    target: onix,
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: playerBack ? "female" : "male",
      opponentGender: playerBack ? "male" : "female",
    },
    animationInputs: {
      raySlots: [3, 4, 5, 7],
      spriteOrder: first.spriteOrder,
      paletteBanks: { background: [0, 1, 2, 3], attackerPartner: playerBack ? 17 : 18 },
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
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-sunny-day-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/sunny-day-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(configFor(orientation, rows));
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnSunnyDayView(state);
    const rays = row.sprites.filter((sprite: Json) => sprite.template?.symbol === "gSunlightRaySpriteTemplate");
    const palette = row.tasks.find((task: Json) => task.func?.symbol === "AnimTask_BlendSpriteColor_Step2");
    const componentsMatch = view.source.offset === row.scriptOffset
      && view.source.wait === row.scriptWait && view.active === row.animScriptActive
      && JSON.stringify(view.rays.map((ray) => [ray.allocationSlot, ray.x2, ray.y2, ray.matrix, ray.callback]))
        === JSON.stringify(rays.map((ray: Json) => [ray.slot, ray.x2, ray.y2, ray.matrix, ray.callback.symbol]))
      && JSON.stringify(view.palette.active ? [view.palette.delayCounter, view.palette.coefficient] : null)
        === JSON.stringify(palette ? [palette.data[9], palette.data[10]] : null)
      && view.monbg.update === row.tasks.some((task: Json) => task.func?.symbol === "Task_UpdateMonBg")
      && view.monbg.clear === row.tasks.some((task: Json) => task.func?.symbol === "Task_ClearMonBg")
      && view.visualTaskCount === row.visualTaskCount && view.soundTaskCount === row.soundTaskCount;
    if (!componentsMatch) throw new Error(`${orientation}/age${age}: component or typed-seam drift`);
    componentMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB receipt drift`);
    const residual = frameDiff(render({
      ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: state,
    }), raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched, framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const base = configFor("player-back");
  const remaining = base.animationInputs.spriteOrder.filter((slot) => ![12, 2, 30, 9].includes(slot));
  const altered: SceneOnSunnyDayConfig = {
    ...base,
    attacker: { species: "TORKOAL", geometry: { side: "player", spriteCorner: { x: 37, y: 53 }, animationCenter: { x: 69, y: 85 }, battlePositionCenter: { x: 69, y: 79 } } },
    target: { species: "SURSKIT", geometry: { side: "opponent", spriteCorner: { x: 148, y: 19 }, animationCenter: { x: 180, y: 51 }, battlePositionCenter: { x: 180, y: 41 } } },
    animationInputs: {
      raySlots: [12, 2, 30, 9],
      spriteOrder: [9, 30, ...remaining, 2, 12],
      paletteBanks: { background: [1, 2, 3], attackerPartner: 19 },
    },
  };
  const digest = (config: SceneOnSunnyDayConfig): string => sha256(Buffer.concat(
    [0, 5, 10, 21, 44, 80, 105, 119, 123, 157].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Sunny Day live control did not change framebuffer");
  return { species: ["TORKOAL", "SURSKIT"], geometryChanged: true, allocationOrderChanged: true, canonical, changed };
}

export function sunnyDayActualCoreVerdict(): Json {
  const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
  const stable = {
    schema: "sunny-day-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on",
    move: "MOVE_SUNNY_DAY",
    rows: orientations.reduce((sum, row) => sum + row.rows, 0),
    componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
    framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
    orientations,
    alteredLiveControl: alteredControl(),
  };
  return { ...stable, digest: sha256(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(sunnyDayActualCoreVerdict()));
}
