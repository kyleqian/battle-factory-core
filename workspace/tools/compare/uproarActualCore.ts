/** Hermetic component/seam/framebuffer gate for MOVE_UPROAR. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnUproarView, type SceneOnUproarConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");

function rowsFor(orientation: Orientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const corpus = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/uproar-${stem}-dense-state.json.gz`))).toString("utf8")) as Json;
  if (corpus.schema !== "uproar-dense-evidence/v1" || corpus.profile !== "battle-scene-on"
    || corpus.move !== 253 || corpus.frames.length !== 73) throw new Error(`${orientation}: corpus changed`);
  return corpus.frames;
}

function configFor(orientation: Orientation, rows = rowsFor(orientation)): SceneOnUproarConfig {
  const first = rows[0]!;
  const playerBack = orientation === "player-back";
  const vigoroth = {
    species: "VIGOROTH" as const,
    geometry: playerBack
      ? { side: "player" as const, spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 90 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent" as const, spriteCorner: { x: 144, y: 8 }, animationCenter: { x: 176, y: 40 }, battlePositionCenter: { x: 176, y: 40 } },
  };
  const onix = {
    species: "ONIX" as const,
    geometry: playerBack
      ? { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } },
  };
  return {
    move: "UPROAR", attacker: vigoroth, target: onix,
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "male",
    },
    animationInputs: {
      ringSlots: [3, 3, 3], noteSlots: [4, 5], spriteOrder: first.spriteOrder,
      attackerMatrixSlot: playerBack ? 1 : 2, ringMatrixSlots: [0, 0, 0],
      attackerCenter: playerBack ? { x: 72, y: 98 } : { x: 176, y: 40 },
    },
  };
}

function frameDiff(app: Uint8Array, oracle: Uint8Array): number {
  let pixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== oracle[pixel * 3]
    || app[pixel * 4 + 1] !== oracle[pixel * 3 + 1] || app[pixel * 4 + 2] !== oracle[pixel * 3 + 2]) pixels += 1;
  return pixels;
}

function compareOrientation(orientation: Orientation): Json {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const rows = rowsFor(orientation);
  const scratch = createScratchDir(`pokebench-uproar-core-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/uproar-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  const stage = createSceneOnMovePresentation(configFor(orientation, rows));
  let componentMatched = 0, framebufferMatched = 0, residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const state = { ...stage, age };
    const view = sceneOnUproarView(state);
    const owned = row.sprites.filter((sprite: Json) =>
      ["gUproarRingSpriteTemplate", "gJaggedMusicNoteSpriteTemplate"].includes(sprite.template?.symbol));
    const distortion = row.tasks.find((task: Json) => task.func?.symbol === "AnimTask_UproarDistortion_Step");
    const component = view.source.offset === row.scriptOffset && view.source.wait === row.scriptWait
      && view.active === row.animScriptActive && view.visualTaskCount === row.visualTaskCount
      && JSON.stringify(view.sprites.map((sprite) => [sprite.kind, sprite.slot, sprite.x, sprite.y, sprite.matrix]))
        === JSON.stringify(owned.map((sprite: Json) => [sprite.template.symbol === "gUproarRingSpriteTemplate" ? "ring" : "note", sprite.slot, sprite.x, sprite.y, sprite.template.symbol === "gUproarRingSpriteTemplate" ? sprite.matrix : [256, 0, 0, 256]]))
      && JSON.stringify(view.distortion.active ? view.distortion.matrix : null)
        === JSON.stringify(distortion ? row.battlerSprites.attacker.matrix : null)
      && view.monbg.update === row.tasks.some((task: Json) => task.func?.symbol === "Task_UpdateMonBg")
      && view.monbg.clear === row.tasks.some((task: Json) => task.func?.symbol === "Task_ClearMonBg");
    if (!component) throw new Error(`${orientation}/age${age}: component or seam drift`);
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
  const base = configFor("player-back");
  const remaining = base.animationInputs.spriteOrder.filter((slot) => ![12, 30, 9].includes(slot));
  const altered: SceneOnUproarConfig = {
    ...base,
    attacker: { species: "TORKOAL", geometry: { side: "player", spriteCorner: { x: 37, y: 53 }, animationCenter: { x: 69, y: 91 }, battlePositionCenter: { x: 69, y: 79 } } },
    target: { species: "SURSKIT", geometry: { side: "opponent", spriteCorner: { x: 148, y: 19 }, animationCenter: { x: 180, y: 51 }, battlePositionCenter: { x: 180, y: 41 } } },
    animationInputs: { ringSlots: [12, 12, 12], noteSlots: [30, 9], spriteOrder: [9, 30, ...remaining, 12], attackerMatrixSlot: 7, ringMatrixSlots: [5, 5, 5], attackerCenter: { x: 69, y: 91 } },
  };
  const digest = (config: SceneOnUproarConfig): string => sha(Buffer.concat([0, 7, 10, 12, 28, 46, 63, 72].map((age) =>
    Buffer.from(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } })))));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Uproar control did not change framebuffer");
  return { species: ["TORKOAL", "SURSKIT"], geometryChanged: true, allocationOrderChanged: true, canonical, changed };
}

export function uproarActualCoreVerdict(): Json {
  const orientations = [compareOrientation("player-back"), compareOrientation("opponent-front")];
  const stable = { schema: "uproar-actual-core-verdict/v1", oracleProfile: "battle-scene-on", move: "MOVE_UPROAR",
    rows: 146, componentMatched: orientations.reduce((n, row) => n + row.componentMatched, 0),
    framebufferMatched: orientations.reduce((n, row) => n + row.framebufferMatched, 0),
    residualPixels: orientations.reduce((n, row) => n + row.residualPixels, 0), orientations, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(uproarActualCoreVerdict()));
