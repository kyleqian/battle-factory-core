/** Strict actual-core framebuffer verifier for the retained Rock Blast body. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnRockBlastView,
  type SceneOnPresentationBattler,
  type SceneOnRockBlastConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import {
  readRockBlastBodies,
  readRockBlastRows,
  rockBlastProfileFor,
  type RockBlastEvidenceOrientation,
} from "./rockBlastReducer.ts";

type Json = Record<string, any>;
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/rock-blast-evidence.json"), "utf8")) as Json;
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Rock Blast RGB ${filename}`);
}

function battler(
  species: SceneOnPresentationBattler["species"],
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

export function rockBlastConfigFor(
  orientation: RockBlastEvidenceOrientation,
  rows = readRockBlastRows(orientation),
): SceneOnRockBlastConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const playerMon = first.parties.player[first.battlers.player.partyIndex];
  const opponentMon = first.parties.opponent[first.battlers.opponent.partyIndex];
  const bodies = readRockBlastBodies(orientation);
  return {
    move: "ROCK_BLAST",
    attacker: battler("RHYHORN", playerAttacker ? "player" : "opponent", first.battlerSprites.attacker),
    target: battler("SHUCKLE", playerAttacker ? "opponent" : "player", first.battlerSprites.target),
    bodies: bodies.map((bodyRows, bodyIndex) => {
      const bodyFirst = bodyRows[0]!;
      return {
        moveTextVisible: bodyIndex === 0,
        fieldProfile: {
          playerHp: bodyFirst.battlers.player.hp,
          playerMaxHp: bodyFirst.battlers.player.maxHp,
          opponentHp: bodyFirst.battlers.opponent.hp,
          opponentMaxHp: bodyFirst.battlers.opponent.maxHp,
          playerGender: playerMon.gender === "genderless" ? undefined : playerMon.gender,
          opponentGender: opponentMon.gender === "genderless" ? undefined : opponentMon.gender,
        },
        animationProfile: rockBlastProfileFor(orientation, bodyRows),
      };
    }) as unknown as SceneOnRockBlastConfig["bodies"],
  };
}

export function compareRockBlastRows(
  orientation: RockBlastEvidenceOrientation,
  rows: readonly Json[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(rockBlastConfigFor(orientation, [...rows]));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnRockBlastView({ ...stage, age });
    if (seam.source.offset !== row.scriptOffset || seam.source.active !== row.animScriptActive) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw RGB hash drift`);
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

export function inspectRockBlastFramebuffer(): readonly Readonly<{
  orientation: RockBlastEvidenceOrientation;
  rows: number;
  matched: number;
  residualPixels: number;
  failures: readonly string[];
}>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const item = fixture.orientations[orientation];
    const archivePath = resolve(root, item.rawRgbArchive);
    const archive = readFileSync(archivePath);
    if (sha256(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: raw archive hash drift`);
    const scratch = createScratchDir(`pokebench-rock-blast-${orientation}-`);
    execFileSync("tar", ["-xzf", archivePath, "-C", scratch]);
    const rows = readRockBlastRows(orientation);
    return { orientation, rows: rows.length, ...compareRockBlastRows(orientation, rows, scratch) };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of inspectRockBlastFramebuffer()) {
    console.log(`${result.orientation}: ${result.matched}/${result.rows}, residual=${result.residualPixels}`);
    if (result.failures.length) console.log(result.failures.join(","));
  }
}
