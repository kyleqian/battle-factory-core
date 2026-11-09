/**
 * Hermetic actual-core comparator for the retained MOVE_SOLAR_BEAM corpus.
 *
 * Development-only evidence is unpacked into a fresh scratch directory. The
 * production renderer receives only relative body age plus live battler and
 * field inputs; it never imports the retained state or RGB archives.
 */
import { spawnSync } from "node:child_process";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnSolarBeamConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Orientation = "player-back" | "opponent-front";
type Body = "setup" | "unleash";

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly battlers: Readonly<Record<"player" | "opponent", {
    readonly hp: number;
    readonly maxHp: number;
  }>>;
}

interface Probe {
  readonly schema: "solar-beam-dense-evidence/v1";
  readonly profile: "battle-scene-on";
  readonly move: 76;
  readonly bodyWindows: readonly [
    Readonly<{ bodyIndex: 0; startFrame: number; endFrame: number; frameCount: 108 }>,
    Readonly<{ bodyIndex: 1; startFrame: number; endFrame: number; frameCount: 160 }>,
  ];
  readonly frames: readonly ProbeFrame[];
}

interface RowResidual {
  readonly orientation: Orientation;
  readonly body: Body;
  readonly age: number;
  readonly frame: number;
  readonly differentPixels: number;
  readonly maxChannelDelta: number;
  readonly bounds: Readonly<{ x0: number; y0: number; x1: number; y1: number }> | null;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const passesArg = process.argv.find((arg) => arg.startsWith("--passes="));
const passes = Number(passesArg?.slice("--passes=".length) ?? 1);
const requireExact = process.argv.includes("--require-exact");
if (!Number.isInteger(passes) || passes < 1 || passes > 2) {
  throw new Error("--passes must be 1 or 2");
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function configFor(orientation: Orientation, frame: ProbeFrame, body: Body): SceneOnSolarBeamConfig {
  const playerBack = orientation === "player-back";
  return {
    move: "SOLAR_BEAM",
    body,
    attacker: playerBack
      ? {
          species: "GLOOM",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 58 },
            animationCenter: { x: 72, y: 88 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        }
      : {
          species: "GLOOM",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 144, y: 18 },
            animationCenter: { x: 176, y: 40 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        },
    target: playerBack
      ? {
          species: "CHANSEY",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 144, y: 17 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        }
      : {
          species: "CHANSEY",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 59 },
            animationCenter: { x: 72, y: 88 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        },
    fieldProfile: {
      playerHp: frame.battlers.player.hp,
      playerMaxHp: frame.battlers.player.maxHp,
      opponentHp: frame.battlers.opponent.hp,
      opponentMaxHp: frame.battlers.opponent.maxHp,
      playerGender: "female",
      opponentGender: "female",
    },
  };
}

function compareFrame(app: Uint8Array, oracle: Uint8Array): Omit<RowResidual, "orientation" | "body" | "age" | "frame"> {
  if (app.length !== 240 * 160 * 4 || oracle.length !== 240 * 160 * 3) {
    throw new Error("Solar Beam framebuffer shape changed");
  }
  let differentPixels = 0;
  let maxChannelDelta = 0;
  let x0 = 240;
  let y0 = 160;
  let x1 = -1;
  let y1 = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    let different = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(app[pixel * 4 + channel]! - oracle[pixel * 3 + channel]!);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      different ||= delta !== 0;
    }
    if (!different) continue;
    differentPixels += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return {
    differentPixels,
    maxChannelDelta,
    bounds: differentPixels === 0 ? null : { x0, y0, x1, y1 },
  };
}

function compareOrientation(orientation: Orientation): readonly RowResidual[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const probe = JSON.parse(gunzipSync(readFileSync(join(
    root, `tools/compare/evidence/solar-beam-${stem}-dense-state.json.gz`,
  ))).toString("utf8")) as Probe;
  if (probe.schema !== "solar-beam-dense-evidence/v1" || probe.profile !== "battle-scene-on"
    || probe.move !== 76 || probe.frames.length !== 268
    || probe.bodyWindows[0]?.frameCount !== 108 || probe.bodyWindows[1]?.frameCount !== 160) {
    throw new Error(`${orientation}: retained Solar Beam corpus contract changed`);
  }
  const scratch = createScratchDir(`pokebench-solar-beam-${stem}-rgb-`);
  const archive = join(root, `tools/compare/evidence/solar-beam-${stem}-raw-rgb.tar.gz`);
  const unpack = spawnSync("tar", ["-xzf", archive, "-C", scratch], { cwd: root, encoding: "utf8" });
  if (unpack.status !== 0) throw new Error(`${orientation}: raw RGB archive failed: ${unpack.stderr}`);
  const rgbDir = join(scratch, `${stem}-rgb`);
  const rows: RowResidual[] = [];
  for (const [bodyIndex, window] of probe.bodyWindows.entries()) {
    const body: Body = bodyIndex === 0 ? "setup" : "unleash";
    const frames = probe.frames.filter((frame) => frame.frame >= window.startFrame && frame.frame <= window.endFrame);
    if (frames.length !== window.frameCount) throw new Error(`${orientation}/${body}: incomplete retained body`);
    for (const [age, frame] of frames.entries()) {
      const oracle = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
      if (sha256(oracle) !== frame.sha256) throw new Error(`${orientation}/${body}/age${age}: raw RGB receipt drift`);
      const stage = createSceneOnMovePresentation(configFor(orientation, frame, body));
      const app = new Uint8Array(240 * 160 * 4);
      renderSceneOnMovePresentation(app, { ...stage, age });
      rows.push({ orientation, body, age, frame: frame.frame, ...compareFrame(app, oracle) });
    }
  }
  return rows;
}

function summarize(rows: readonly RowResidual[]) {
  const residuals = rows.filter((row) => row.differentPixels !== 0);
  const histogram = new Map<number, number>();
  for (const row of residuals) histogram.set(row.differentPixels, (histogram.get(row.differentPixels) ?? 0) + 1);
  const maximum = residuals.reduce<RowResidual | null>(
    (current, row) => current === null || row.differentPixels > current.differentPixels ? row : current,
    null,
  );
  return {
    totalRows: rows.length,
    exactRows: rows.length - residuals.length,
    residualRows: residuals.length,
    firstResidual: residuals[0] ?? null,
    lastResidual: residuals.at(-1) ?? null,
    maximumResidual: maximum,
    histogram: Object.fromEntries([...histogram].sort(([left], [right]) => left - right)),
    rows,
  };
}

function inspectAlteredControl() {
  const frame: ProbeFrame = {
    frame: -1,
    sha256: "",
    battlers: {
      player: { hp: 120, maxHp: 135 },
      opponent: { hp: 160, maxHp: 160 },
    },
  };
  const base = configFor("player-back", frame, "unleash");
  const altered: SceneOnSolarBeamConfig = {
    ...base,
    attacker: {
      species: "VILEPLUME",
      geometry: {
        side: "player",
        spriteCorner: { x: 37, y: 54 },
        animationCenter: { x: 69, y: 84 },
        battlePositionCenter: { x: 69, y: 78 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent",
        spriteCorner: { x: 147, y: 14 },
        animationCenter: { x: 179, y: 39 },
        battlePositionCenter: { x: 179, y: 38 },
      },
    },
  };
  const ages: readonly Readonly<{ body: Body; age: number }>[] = [
    { body: "setup", age: 7 },
    { body: "setup", age: 50 },
    { body: "setup", age: 106 },
    { body: "unleash", age: 4 },
    { body: "unleash", age: 23 },
    { body: "unleash", age: 50 },
    { body: "unleash", age: 150 },
    { body: "unleash", age: 151 },
    { body: "unleash", age: 159 },
  ];
  const digest = (config: SceneOnSolarBeamConfig): string => sha256(Buffer.concat(
    ages.map(({ body, age }) => {
      const stage = createSceneOnMovePresentation({ ...config, body });
      const output = new Uint8Array(240 * 160 * 4);
      renderSceneOnMovePresentation(output, { ...stage, age });
      return Buffer.from(output);
    }),
  ));
  return {
    species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: {
      attacker: altered.attacker.geometry,
      target: altered.target.geometry,
    },
    ages,
    baseFramebufferSequenceSha256: digest(base),
    alteredFramebufferSequenceSha256: digest(altered),
  };
}

const runs = Array.from({ length: passes }, () => [
  ...compareOrientation("player-back"),
  ...compareOrientation("opponent-front"),
]);
const deterministic = runs.every((rows) => JSON.stringify(rows) === JSON.stringify(runs[0]));
const controlRuns = Array.from({ length: passes }, inspectAlteredControl);
const controlDeterministic = controlRuns.every(
  (control) => JSON.stringify(control) === JSON.stringify(controlRuns[0]),
);
const report = {
  schema: "solar-beam-actual-core-residual/v1",
  oracleProfile: "battle-scene-on",
  move: "MOVE_SOLAR_BEAM",
  passes,
  deterministic,
  alteredControl: {
    passes,
    deterministic: controlDeterministic,
    ...controlRuns[0],
  },
  rowsSha256: sha256(Buffer.from(JSON.stringify(runs[0]))),
  ...summarize(runs[0]!),
};
console.log(JSON.stringify(report));
if (!deterministic || !controlDeterministic
  || controlRuns[0]!.baseFramebufferSequenceSha256 === controlRuns[0]!.alteredFramebufferSequenceSha256
  || (requireExact && report.residualRows !== 0)) process.exitCode = 1;
