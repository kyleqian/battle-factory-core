/** Strict actual-core framebuffer verifier for retained bilateral full-HP Water Spout evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnWaterSpoutView,
  type SceneOnPresentationBattler,
  type SceneOnWaterSpoutConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { readWaterSpoutTierRows } from "./waterSpoutTierEvidence.ts";

type Json = Record<string, any>;
export type WaterSpoutOrientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/water-spout-evidence.json"), "utf8")) as Json;
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export function readWaterSpoutRows(orientation: WaterSpoutOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/water-spout-${side}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Water Spout RGB ${filename}`);
}

function battler(species: "NOSEPASS" | "SHUCKLE", side: "player" | "opponent", sprite: Json): SceneOnPresentationBattler {
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

function healthboxStatus(status: Json): "none" | "sleep" | "poison" | "burn" | "freeze" | "paralysis" {
  return status.kind === "toxic" ? "poison" : status.kind;
}

export function waterSpoutConfigFor(
  orientation: WaterSpoutOrientation,
  rows = readWaterSpoutRows(orientation),
): SceneOnWaterSpoutConfig {
  const first = rows[0]!;
  const freeSpriteSlots = first.spriteFlags.flatMap((flags: number, slot: number) => (flags & 1) === 0 ? [slot] : []);
  const playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const playerMon = first.parties.player[first.battlers.player.partyIndex];
  const opponentMon = first.parties.opponent[first.battlers.opponent.partyIndex];
  const impactAffineSlots = [...new Set(rows.flatMap((row: Json) => row.sprites
    .filter((sprite: Json) => sprite.template?.symbol === "gWaterHitSplatSpriteTemplate")
    .map((sprite: Json) => sprite.matrixNum)))] as number[];
  return {
    move: "WATER_SPOUT",
    // mechanicLab replaces the semantic party after the already-live Factory
    // visual/name buffers were loaded; this evidence therefore carries the
    // source Nosepass field art while the legal attacker data is Wailmer.
    attacker: battler("NOSEPASS", attackerSide, first.battlerSprites.attacker),
    target: battler("SHUCKLE", playerAttacker ? "opponent" : "player", first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: playerMon.gender === "genderless" ? "none" : playerMon.gender,
      opponentGender: opponentMon.gender === "genderless" ? "none" : opponentMon.gender,
      playerStatus: healthboxStatus(first.battlers.player.status),
      opponentStatus: healthboxStatus(first.battlers.opponent.status),
    },
    animationInputs: {
      attackerSide,
      attackerHp: first.battlers[attackerSide].hp,
      attackerMaxHp: first.battlers[attackerSide].maxHp,
      attackerEffectCenter: playerAttacker ? { x: 72, y: 100 } : { x: 176, y: 52 },
      attackerSubpriority: first.battlerSprites.attacker.subpriority,
      launchTaskSlot: 0,
      // CreateSprite scans every free source slot.  Full HP happened to need
      // only the first 20; lower tiers reuse those slots while impacts can
      // overlap the smaller launch allocation and legitimately scan farther.
      launchSpriteSlots: freeSpriteSlots,
      impactAffineSlots,
      attackerSourceHeight: 40,
      animationRng: rows[55]!.animationRng,
      spriteOrderSeed: first.spriteOrder,
    },
  };
}

export function compareWaterSpoutRows(orientation: WaterSpoutOrientation, rows: Json[], rgbRoot: string) {
  const stage = createSceneOnMovePresentation(waterSpoutConfigFor(orientation, rows));
  let matched = 0; let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnWaterSpoutView({ ...stage, age });
    if (seam.source.offset !== row.scriptOffset || seam.active !== row.animScriptActive) throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw RGB hash`);
    let residual = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3] || app[pixel * 4 + 1] !== raw[pixel * 3 + 1] || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) residual += 1;
    }
    residualPixels += residual;
    if (residual === 0) matched += 1; else failures.push(`${age}:${residual}`);
  }
  return { matched, residualPixels, failures };
}

export function inspectWaterSpoutFramebuffer() {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const receipt = fixture.orientations[orientation];
    const rows = readWaterSpoutRows(orientation);
    const archivePath = resolve(root, receipt.rawRgbArchive);
    if (sha256(readFileSync(archivePath)) !== receipt.rawRgbArchiveSha256) throw new Error(`${orientation}: raw archive hash drifted`);
    const scratch = createScratchDir(`pokebench-water-spout-${orientation}-`);
    execFileSync("tar", ["-xzf", archivePath, "-C", scratch]);
    return { orientation, rows: rows.length, ...compareWaterSpoutRows(orientation, rows, scratch) };
  });
}

export function inspectWaterSpoutTierFramebuffer() {
  return (["player-back", "opponent-front"] as const).flatMap((orientation) => {
    const side = orientation === "player-back" ? "player" : "opponent";
    const archive = resolve(root, `tools/compare/evidence/water-spout-lower-${side}-raw-rgb.tar.gz`);
    const scratch = createScratchDir(`pokebench-water-spout-lower-${side}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    const tiers = readWaterSpoutTierRows(orientation);
    return ([2, 1, 0] as const).map((tier) => ({ orientation, tier, rows: tiers[tier].length,
      ...compareWaterSpoutRows(orientation, tiers[tier], scratch) }));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of inspectWaterSpoutFramebuffer()) {
    console.log(`${result.orientation}: ${result.matched}/${result.rows}, residual=${result.residualPixels}`);
    if (result.failures.length) console.log(result.failures.slice(0, 80).join(","));
  }
  for (const result of inspectWaterSpoutTierFramebuffer()) {
    console.log(`${result.orientation} tier ${result.tier}: ${result.matched}/${result.rows}, residual=${result.residualPixels}`);
  }
}
