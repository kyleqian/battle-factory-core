/** Hermetic retained-RGB production gate for MOVE_DRAGON_DANCE. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, type SceneOnDragonDanceConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Orientation = "player-back" | "opponent-front";
interface Frame { readonly frame: number; readonly sha256: string; readonly battlers: Readonly<Record<"player" | "opponent", { readonly hp: number; readonly maxHp: number }>> }
interface Probe { readonly profile: "battle-scene-on"; readonly move: 349; readonly frames: readonly Frame[] }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const requireExact = process.argv.includes("--require-exact");
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

function configFor(orientation: Orientation, frame: Frame): SceneOnDragonDanceConfig {
  const playerBack = orientation === "player-back";
  const dragonair = {
    species: "DRAGONAIR" as const,
    geometry: playerBack
      ? { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent" as const, spriteCorner: { x: 144, y: 14 }, animationCenter: { x: 176, y: 46 }, battlePositionCenter: { x: 176, y: 40 } },
  };
  const onix = {
    species: "ONIX" as const,
    geometry: playerBack
      ? { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } },
  };
  return {
    move: "DRAGON_DANCE", attacker: dragonair, target: onix,
    animationProfile: { pictureSize: { width: 64, height: 64 }, allocationSlots: [3, 4, 5, 7, 9, 10], allocationOrder: [0, 1, 2, 3, 4, 5] },
    fieldProfile: {
      playerHp: frame.battlers.player.hp, playerMaxHp: frame.battlers.player.maxHp,
      opponentHp: frame.battlers.opponent.hp, opponentMaxHp: frame.battlers.opponent.maxHp,
      playerGender: playerBack ? "female" : "male",
      opponentGender: playerBack ? "male" : "female",
    },
  };
}

function diff(app: Uint8Array, oracle: Uint8Array) {
  let differentPixels = 0, maxChannelDelta = 0, x0 = 240, y0 = 160, x1 = -1, y1 = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    let different = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(app[pixel * 4 + channel]! - oracle[pixel * 3 + channel]!);
      maxChannelDelta = Math.max(maxChannelDelta, delta); different ||= delta !== 0;
    }
    if (!different) continue;
    differentPixels += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { differentPixels, maxChannelDelta, bounds: differentPixels ? { x0, y0, x1, y1 } : null };
}

function compare(orientation: Orientation) {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const probe = JSON.parse(gunzipSync(readFileSync(join(root, `tools/compare/evidence/dragon-dance-${stem}-dense-state.json.gz`))).toString()) as Probe;
  if (probe.profile !== "battle-scene-on" || probe.move !== 349 || probe.frames.length !== 142) throw new Error(`${orientation}: evidence drift`);
  const scratch = createScratchDir(`pokebench-dragon-dance-${stem}-`);
  const unpack = spawnSync("tar", ["-xzf", join(root, `tools/compare/evidence/dragon-dance-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${orientation}: RGB unpack failed`);
  return probe.frames.map((frame, age) => {
    const oracle = readFileSync(join(scratch, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha(oracle) !== frame.sha256) throw new Error(`${orientation}/age${age}: RGB receipt drift`);
    const sceneOnPresentation = { ...createSceneOnMovePresentation(configFor(orientation, frame)), age };
    return { orientation, age, frame: frame.frame, ...diff(render({ ...createInitialState(), sceneOnPresentation }), oracle) };
  });
}

function alteredControl() {
  const frame: Frame = { frame: -1, sha256: "", battlers: { player: { hp: 99, maxHp: 130 }, opponent: { hp: 88, maxHp: 145 } } };
  const base = configFor("player-back", frame);
  const altered: SceneOnDragonDanceConfig = {
    ...base,
    attacker: { species: "ALTARIA", geometry: { side: "player", spriteCorner: { x: 35, y: 51 }, animationCenter: { x: 69, y: 91 }, battlePositionCenter: { x: 69, y: 81 } } },
    target: { ...base.target, geometry: { side: "opponent", spriteCorner: { x: 148, y: 11 }, animationCenter: { x: 180, y: 43 }, battlePositionCenter: { x: 180, y: 39 } } },
    animationProfile: { pictureSize: { width: 56, height: 48 }, allocationSlots: [4, 6, 8, 9, 11, 12], allocationOrder: [5, 3, 1, 4, 2, 0] },
  };
  const digest = (config: SceneOnDragonDanceConfig) => sha(Buffer.concat([5, 11, 21, 44, 84, 102, 109, 141].map((age) => Buffer.from(render({ ...createInitialState(), sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } })))));
  return { base: digest(base), altered: digest(altered), species: altered.attacker.species, allocationSlots: altered.animationProfile.allocationSlots };
}

const rows = [...compare("player-back"), ...compare("opponent-front")];
const residual = rows.filter((row) => row.differentPixels !== 0);
const control = alteredControl();
const report = {
  schema: "dragon-dance-actual-core-residual/v1", oracleProfile: "battle-scene-on", move: "MOVE_DRAGON_DANCE",
  totalRows: rows.length, exactRows: rows.length - residual.length, residualRows: residual.length,
  firstResidual: residual[0] ?? null, lastResidual: residual.at(-1) ?? null,
  maximumResidual: residual.reduce<typeof residual[number] | null>((best, row) => !best || row.differentPixels > best.differentPixels ? row : best, null),
  rowsSha256: sha(JSON.stringify(rows)), alteredControl: { ...control, differs: control.base !== control.altered }, rows,
};
console.log(JSON.stringify(report));
if (!control.base || control.base === control.altered || (requireExact && residual.length)) process.exitCode = 1;
