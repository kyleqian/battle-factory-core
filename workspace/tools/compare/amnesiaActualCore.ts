/** Hermetic retained-RGB gate for MOVE_AMNESIA through the real app core. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnAmnesiaConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Orientation = "player-back" | "opponent-front";
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly battlers: Readonly<Record<"player" | "opponent", { readonly hp: number; readonly maxHp: number }>>;
}
interface Probe { readonly profile: "battle-scene-on"; readonly move: 133; readonly frames: readonly Frame[] }
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const requireExact = process.argv.includes("--require-exact");
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

function configFor(orientation: Orientation, frame: Frame): SceneOnAmnesiaConfig {
  const playerBack = orientation === "player-back";
  const torkoal = {
    species: "TORKOAL" as const,
    geometry: playerBack
      ? { side: "player" as const, spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 98 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 48 }, battlePositionCenter: { x: 176, y: 40 } },
  };
  const onix = {
    species: "ONIX" as const,
    geometry: playerBack
      ? { side: "opponent" as const, spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } },
  };
  return {
    move: "AMNESIA",
    attacker: torkoal,
    target: onix,
    attackerPictureSize: playerBack ? { width: 64, height: 48 } : { width: 64, height: 64 },
    fieldProfile: {
      playerHp: frame.battlers.player.hp, playerMaxHp: frame.battlers.player.maxHp,
      opponentHp: frame.battlers.opponent.hp, opponentMaxHp: frame.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "male",
    },
  };
}

function diff(app: Uint8Array, oracle: Uint8Array) {
  let differentPixels = 0, maxChannelDelta = 0;
  let x0 = 240, y0 = 160, x1 = -1, y1 = -1;
  for (let p = 0; p < 240 * 160; p += 1) {
    let different = false;
    for (let c = 0; c < 3; c += 1) {
      const delta = Math.abs(app[p * 4 + c]! - oracle[p * 3 + c]!);
      maxChannelDelta = Math.max(maxChannelDelta, delta); different ||= delta !== 0;
    }
    if (!different) continue;
    differentPixels += 1;
    const x = p % 240, y = Math.floor(p / 240);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { differentPixels, maxChannelDelta, bounds: differentPixels ? { x0, y0, x1, y1 } : null };
}

function compare(orientation: Orientation) {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const probe = JSON.parse(gunzipSync(readFileSync(join(root, `tools/compare/evidence/amnesia-${stem}-dense-state.json.gz`))).toString()) as Probe;
  if (probe.profile !== "battle-scene-on" || probe.move !== 133 || probe.frames.length !== 216) throw new Error(`${orientation}: evidence drift`);
  const scratch = createScratchDir(`pokebench-amnesia-${stem}-`);
  const unpack = spawnSync("tar", ["-xzf", join(root, `tools/compare/evidence/amnesia-${stem}-raw-rgb.tar.gz`), "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${orientation}: RGB unpack failed`);
  return probe.frames.map((frame, age) => {
    const oracle = readFileSync(join(scratch, "rgb", `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha(oracle) !== frame.sha256) throw new Error(`${orientation}/age${age}: RGB receipt drift`);
    const sceneOnPresentation = { ...createSceneOnMovePresentation(configFor(orientation, frame)), age };
    const app = render({ ...createInitialState(), sceneOnPresentation });
    return { orientation, age, frame: frame.frame, ...diff(app, oracle) };
  });
}

function alteredControl() {
  const frame: Frame = { frame: -1, sha256: "", battlers: { player: { hp: 100, maxHp: 130 }, opponent: { hp: 90, maxHp: 145 } } };
  const base = configFor("player-back", frame);
  const altered: SceneOnAmnesiaConfig = {
    ...base,
    attacker: { species: "RELICANTH", geometry: { side: "player", spriteCorner: { x: 36, y: 54 }, animationCenter: { x: 69, y: 94 }, battlePositionCenter: { x: 69, y: 78 } } },
    target: { ...base.target, geometry: { side: "opponent", spriteCorner: { x: 148, y: 11 }, animationCenter: { x: 180, y: 39 }, battlePositionCenter: { x: 180, y: 38 } } },
    attackerPictureSize: { width: 56, height: 56 },
  };
  const digest = (config: SceneOnAmnesiaConfig) => sha(Buffer.concat([24, 53, 110, 160, 196, 215].map((age) => {
    const sceneOnPresentation = { ...createSceneOnMovePresentation(config), age };
    return Buffer.from(render({ ...createInitialState(), sceneOnPresentation }));
  })));
  return { base: digest(base), altered: digest(altered), species: altered.attacker.species, geometry: altered.attacker.geometry };
}

const rows = [...compare("player-back"), ...compare("opponent-front")];
const residual = rows.filter((row) => row.differentPixels !== 0);
const control = alteredControl();
const report = {
  schema: "amnesia-actual-core-residual/v1", oracleProfile: "battle-scene-on", move: "MOVE_AMNESIA",
  totalRows: rows.length, exactRows: rows.length - residual.length, residualRows: residual.length,
  firstResidual: residual[0] ?? null, lastResidual: residual.at(-1) ?? null,
  maximumResidual: residual.reduce<typeof residual[number] | null>((best, row) => !best || row.differentPixels > best.differentPixels ? row : best, null),
  rowsSha256: sha(JSON.stringify(rows)), alteredControl: { ...control, differs: control.base !== control.altered }, rows,
};
console.log(JSON.stringify(report));
if (!control.base || control.base === control.altered || (requireExact && residual.length)) process.exitCode = 1;
