/** Actual-core framebuffer comparator for Factory Frustration_Strongest. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnFrustrationConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Row = Record<string, any>;
export type FrustrationOrientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/frustration-evidence.json"), "utf8"));
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Frustration RGB ${filename}`);
}

export function frustrationRowsFor(orientation: FrustrationOrientation): Row[] {
  const item = fixture.orientations[orientation];
  return JSON.parse(gunzipSync(readFileSync(resolve(root, item.denseState))).toString("utf8")).frames;
}

function battler(species: SceneOnPresentationBattler["species"], side: "player" | "opponent", sprite: Row): SceneOnPresentationBattler {
  return { species, geometry: {
    side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
    animationCenter: { x: sprite.x, y: sprite.y },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  } };
}

export function frustrationConfigFor(orientation: FrustrationOrientation, rows: Row[]): SceneOnFrustrationConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attacker = first.battlerSprites.attacker;
  const target = first.battlerSprites.target;
  return {
    move: "FRUSTRATION",
    attacker: battler("FURRET", playerAttacker ? "player" : "opponent", attacker),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", target),
    fieldProfile: {
      playerHp: first.parties.player[0].hp, playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp, opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender, opponentGender: first.parties.opponent[0].gender,
    },
    attackerEffectCenter: { x: attacker.x, y: attacker.y + (playerAttacker ? 8 : 0) },
    targetEffectCenter: { x: target.x, y: target.y + (playerAttacker ? 0 : 8) },
    targetInitialX2: target.x2,
    animationProfile: {
      angerSlot: 3, angerMatrix: 0, impactSlots: [3, 4], impactMatrices: [0, 3],
      impactOrders: [63, 1], impactSubpriority: playerAttacker ? 27 : 37,
      attackerSubpriority: attacker.subpriority, targetSubpriority: target.subpriority,
    },
  };
}

export function compareFrustrationRows(orientation: FrustrationOrientation, rows: Row[], rgbRoot: string) {
  const stage = createSceneOnMovePresentation(frustrationConfigFor(orientation, rows));
  let matched = 0, residualPixels = 0, peakResidualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const app = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } });
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
    let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3] || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        residual += 1;
        const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    residualPixels += residual;
    peakResidualPixels = Math.max(peakResidualPixels, residual);
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { orientation, rows: rows.length, matched, residualPixels, peakResidualPixels, failures };
}

export function verifyFrustrationFramebuffer() {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-frustration-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    return compareFrustrationRows(orientation, frustrationRowsFor(orientation), scratch);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyFrustrationFramebuffer(), null, 2));
}
