/** Strict actual-core framebuffer verifier for retained bilateral Eruption evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnEruptionView,
  type SceneOnEruptionConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  eruptionProfileFor,
  readEruptionRows,
  type EruptionOrientation,
} from "./eruptionReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/eruption-evidence.json"),
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
  throw new Error(`missing Eruption RGB ${filename}`);
}

function battler(
  species: "BARBOACH" | "ONIX",
  side: "player" | "opponent",
  sprite: Json,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function eruptionConfigFor(
  orientation: EruptionOrientation,
  rows = readEruptionRows(orientation),
): SceneOnEruptionConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const playerMon = first.parties.player[first.battlers.player.partyIndex];
  const opponentMon = first.parties.opponent[first.battlers.opponent.partyIndex];
  return {
    move: "ERUPTION",
    // The mechanicLab semantic Camerupt override follows already-live
    // Barboach visual/name/palette buffers, just as the typed seam records.
    attacker: battler("BARBOACH", playerAttacker ? "player" : "opponent", first.battlerSprites.attacker),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: playerMon.gender === "genderless" ? "none" : playerMon.gender,
      opponentGender: opponentMon.gender === "genderless" ? "none" : opponentMon.gender,
    },
    animationProfile: eruptionProfileFor(orientation, rows),
  };
}

export function compareEruptionRows(
  orientation: EruptionOrientation,
  rows: readonly Json[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(eruptionConfigFor(orientation, [...rows]));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnEruptionView({ ...stage, age });
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

export function inspectEruptionFramebuffer(): readonly Readonly<{
  orientation: EruptionOrientation; rows: number; matched: number;
  residualPixels: number; failures: readonly string[];
}>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const receipt = fixture.orientations[orientation];
    const rows = readEruptionRows(orientation);
    const archivePath = resolve(root, receipt.rawRgbArchive);
    const archive = readFileSync(archivePath);
    if (sha256(archive) !== receipt.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: raw archive hash drifted`);
    }
    const scratch = createScratchDir(`pokebench-eruption-${orientation}-`);
    execFileSync("tar", ["-xzf", archivePath, "-C", scratch]);
    return { orientation, rows: rows.length, ...compareEruptionRows(orientation, rows, scratch) };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of inspectEruptionFramebuffer()) {
    console.log(`${result.orientation}: ${result.matched}/${result.rows}, residual=${result.residualPixels}`);
    if (result.failures.length) console.log(result.failures.slice(0, 80).join(","));
  }
}
