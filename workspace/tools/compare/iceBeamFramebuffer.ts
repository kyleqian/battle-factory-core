/** Strict actual-core framebuffer verifier for retained bilateral Ice Beam evidence. */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { iceBeamProfileFor, type IceBeamOrientation } from "../../src/animation/iceBeam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnIceBeamView,
  type SceneOnIceBeamConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/ice-beam-evidence.json"),
  "utf8",
)) as Json;
const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Ice Beam RGB ${filename}`);
}

export function readIceBeamRows(orientation: IceBeamOrientation): Json[] {
  return JSON.parse(gunzipSync(readFileSync(
    resolve(root, fixture.orientations[orientation].denseState),
  )).toString()).frames;
}

function battler(
  species: "NINCADA" | "SHUCKLE",
  side: "player" | "opponent",
  sprite: Json,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x + sprite.x2 - 32, y: sprite.y + sprite.y2 - 32 },
      animationCenter: { x: sprite.x + sprite.x2, y: sprite.y + sprite.y2 },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function iceBeamConfigFor(
  orientation: IceBeamOrientation,
  rows = readIceBeamRows(orientation),
): SceneOnIceBeamConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const player = first.battlers.player;
  const opponent = first.battlers.opponent;
  return {
    move: "ICE_BEAM",
    attacker: battler(
      // The semantic Delcatty override follows the already-live Nincada
      // picture/name/palette buffers retained by mechanicLab.
      "NINCADA",
      playerAttacker ? "player" : "opponent",
      first.battlerSprites.attacker,
    ),
    target: battler(
      "SHUCKLE",
      playerAttacker ? "opponent" : "player",
      first.battlerSprites.target,
    ),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: first.parties.player[player.partyIndex].gender,
      opponentGender: first.parties.opponent[opponent.partyIndex].gender,
    },
    animationProfile: iceBeamProfileFor(orientation, {
      gameplayRng: first.immutableState.rngValue,
      immutableGameplayState: first.immutableState,
    }),
  };
}

export function compareIceBeamRows(
  orientation: IceBeamOrientation,
  rows: readonly Json[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(iceBeamConfigFor(orientation, [...rows]));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnIceBeamView({ ...stage, age });
    if (seam.source.offset !== row.scriptOffset || seam.active !== row.animScriptActive) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw RGB hash`);
    let residual = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function inspectIceBeamFramebuffer(): readonly Readonly<{
  orientation: IceBeamOrientation;
  rows: 203;
  matched: number;
  residualPixels: number;
  failures: readonly string[];
}>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const receipt = fixture.orientations[orientation];
    const rows = readIceBeamRows(orientation);
    const archivePath = resolve(root, receipt.rawRgbArchive);
    if (sha256(readFileSync(archivePath)) !== receipt.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: raw RGB archive hash drifted`);
    }
    const scratch = createScratchDir(`pokebench-ice-beam-${orientation}-`);
    execFileSync("tar", ["-xzf", archivePath, "-C", scratch]);
    return {
      orientation,
      rows: 203 as const,
      ...compareIceBeamRows(orientation, rows, scratch),
    };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of inspectIceBeamFramebuffer()) {
    console.log(`${result.orientation}: ${result.matched}/${result.rows}, residual=${result.residualPixels}`);
    if (result.failures.length) console.log(result.failures.slice(0, 203).join(","));
  }
}
