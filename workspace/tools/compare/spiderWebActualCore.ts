/** Dense actual-core compositor gate for MOVE_SPIDER_WEB. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSpiderWebView,
  type SceneOnSpiderWebConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: Orientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/spider-web-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "spider-web-dense-evidence/v1"
    || corpus.profile !== "battle-scene-on" || corpus.move !== 169
    || corpus.frames.length !== 207) throw new Error(`${orientation}: corpus changed`);
  return corpus.frames;
}

function monbgFor(rows: Json[], age: number): number[] {
  const task = rows[age]!.tasks.find((entry: Json) =>
    entry.func?.symbol === "Task_UpdateMonBg");
  if (!task) throw new Error(`missing Task_UpdateMonBg at age ${age}`);
  return task.data as number[];
}

export function spiderWebConfigFor(
  orientation: Orientation,
  rows = rowsFor(orientation),
): SceneOnSpiderWebConfig {
  const playerBack = orientation === "player-back";
  const first = rows[0]!;
  const monbg = monbgFor(rows, 7);
  const threadSlots = [...new Set(rows.flatMap((row: Json) => row.sprites
    .filter((sprite: Json) => sprite.template?.symbol === "gWebThreadSpriteTemplate")
    .map((sprite: Json) => sprite.slot)))] as number[];
  if (threadSlots.length !== 14) throw new Error(`${orientation}: thread allocation changed`);
  const web = rows[121]!.sprites.find((sprite: Json) =>
    sprite.template?.symbol === "gSpiderWebSpriteTemplate");
  const palette = rows[12]!.sprites.find((sprite: Json) =>
    sprite.template?.symbol === "gSimplePaletteBlendSpriteTemplate");
  if (!web || !palette) throw new Error(`${orientation}: effect allocation changed`);
  const target = playerBack
    ? {
        species: "ONIX" as const,
        geometry: {
          side: "opponent" as const,
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      }
    : {
        species: "ONIX" as const,
        geometry: {
          side: "player" as const,
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      };
  const attacker = playerBack
    ? {
        species: "SPINARAK" as const,
        geometry: {
          side: "player" as const,
          spriteCorner: { x: 40, y: 69 },
          animationCenter: { x: 72, y: 101 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      }
    : {
        species: "SPINARAK" as const,
        geometry: {
          side: "opponent" as const,
          spriteCorner: { x: 144, y: 27 },
          animationCenter: { x: 176, y: 59 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      };
  const firstThread = rows[39]!.sprites.find((sprite: Json) =>
    sprite.template?.symbol === "gWebThreadSpriteTemplate");
  if (!firstThread) throw new Error(`${orientation}: missing first thread`);
  return {
    move: "SPIDER_WEB",
    attacker,
    target,
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: playerBack ? "female" : "male",
      opponentGender: playerBack ? "male" : "female",
    },
    animationInputs: {
      threadOrigin: { x: firstThread.x, y: firstThread.y },
      threadSpriteSlots: threadSlots,
      paletteSpriteSlot: palette.slot,
      webSpriteSlot: web.slot,
      webMatrixSlot: web.matrixNum,
      updateMonBgTaskSlot: 1,
      clearMonBgTaskSlot: 0,
      loopSoundTaskSlot: 0,
      spriteOrder: rows[121]!.spriteOrder,
      paletteSubpriority: palette.subpriority,
      threadSubpriority: rows[39]!.sprites.find((sprite: Json) =>
        sprite.template?.symbol === "gWebThreadSpriteTemplate")!.subpriority,
      webSubpriority: web.subpriority,
      baseMatrixBitmap: first.resourceAllocators.matrixBitmap,
      monbg: {
        layer: playerBack ? "bg1" : "bg2",
        spriteSlot: monbg[0]!,
        spriteX: monbg[1]!,
        spriteY: monbg[2]!,
        bgX: monbg[3]!,
        bgY: monbg[4]!,
        inBg2: Boolean(monbg[5]),
        battlerId: monbg[6] as 0 | 1,
      },
    },
  };
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let different = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== oracle[pixel * 3]
      || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) different += 1;
  }
  return different;
}

function compareOrientation(orientation: Orientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-spider-web-core-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/spider-web-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(spiderWebConfigFor(orientation, rows));
  let componentMatched = 0;
  let framebufferMatched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnSpiderWebView(state);
    if (view.source.offset !== row.scriptOffset
      || view.source.wait !== row.scriptWait
      || view.active !== row.animScriptActive
      || view.threads.length !== row.sprites.filter((sprite: Json) =>
        sprite.template?.symbol === "gWebThreadSpriteTemplate").length
      || (view.web?.slot ?? null) !== (row.sprites.find((sprite: Json) =>
        sprite.template?.symbol === "gSpiderWebSpriteTemplate")?.slot ?? null)) {
      throw new Error(`${orientation}/age${age}: component or seam drift`);
    }
    componentMatched += 1;
    const raw = readFileSync(resolve(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation}/age${age}: raw RGB receipt drift`);
    const app = render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: state });
    const residual = frameDiff(app, raw);
    residualPixels += residual;
    if (residual === 0) framebufferMatched += 1;
    else failures.push(`${age}:${residual}`);
  }
  return { orientation, rows: rows.length, componentMatched,
    framebufferMatched, residualPixels, failures };
}

function alteredControl(): Json {
  const base = spiderWebConfigFor("player-back");
  const altered: SceneOnSpiderWebConfig = {
    ...base,
    attacker: {
      species: "SURSKIT",
      geometry: {
        side: "player",
        spriteCorner: { x: 35, y: 66 },
        animationCenter: { x: 67, y: 98 },
        battlePositionCenter: { x: 67, y: 78 },
      },
    },
    target: {
      species: "RELICANTH",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 148, y: 12 },
        animationCenter: { x: 180, y: 44 },
        battlePositionCenter: { x: 180, y: 40 },
      },
    },
    animationInputs: {
      ...base.animationInputs,
      threadOrigin: { x: 88, y: 102 },
      threadSpriteSlots: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
      paletteSpriteSlot: 9,
      webSpriteSlot: 10,
      webMatrixSlot: 4,
      updateMonBgTaskSlot: 3,
      clearMonBgTaskSlot: 4,
      loopSoundTaskSlot: 5,
      spriteOrder: [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
        16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63],
      paletteSubpriority: 24,
      threadSubpriority: 36,
      webSubpriority: 26,
      baseMatrixBitmap: 3,
      monbg: { ...base.animationInputs.monbg, spriteSlot: 8, spriteX: 180,
        spriteY: 44, bgX: -148, bgY: -12 },
    },
  };
  const digest = (config: SceneOnSpiderWebConfig): string => sha(Buffer.concat(
    [0, 7, 15, 39, 80, 121, 140, 170, 198, 206].map((age) => Buffer.from(render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...createSceneOnMovePresentation(config), age },
    }))),
  ));
  const canonical = digest(base);
  const changed = digest(altered);
  if (canonical === changed) throw new Error("altered Spider Web control did not change framebuffer");
  return { species: [altered.attacker.species, altered.target.species],
    geometryChanged: true, allocationMatrixOrderChanged: true, canonical, changed };
}

export function spiderWebActualCoreVerdict(passes = 1): Json {
  if (!Number.isInteger(passes) || passes < 1 || passes > 2) throw new Error("--passes must be 1 or 2");
  const runs = Array.from({ length: passes }, () => [
    compareOrientation("player-back"), compareOrientation("opponent-front"),
  ]);
  const controls = Array.from({ length: passes }, () => alteredControl());
  const deterministic = runs.every((run) => JSON.stringify(run) === JSON.stringify(runs[0]));
  const controlDeterministic = controls.every((run) => JSON.stringify(run) === JSON.stringify(controls[0]));
  const orientations = runs[0]!;
  const stable = {
    schema: "spider-web-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on",
    move: "MOVE_SPIDER_WEB",
    passes,
    rows: orientations.reduce((sum, row) => sum + row.rows, 0),
    deterministic,
    componentMatched: orientations.reduce((sum, row) => sum + row.componentMatched, 0),
    framebufferMatched: orientations.reduce((sum, row) => sum + row.framebufferMatched, 0),
    residualPixels: orientations.reduce((sum, row) => sum + row.residualPixels, 0),
    orientations,
    alteredControl: { passes, deterministic: controlDeterministic, ...controls[0] },
  };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const passes = Number(process.argv.find((arg) => arg.startsWith("--passes="))?.slice(9) ?? 1);
  const report = spiderWebActualCoreVerdict(passes);
  console.log(JSON.stringify(report));
  if (!report.deterministic || !report.alteredControl.deterministic
    || (process.argv.includes("--require-exact") && report.residualPixels !== 0)) process.exitCode = 1;
}
