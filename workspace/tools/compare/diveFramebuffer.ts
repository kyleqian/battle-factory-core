/** Actual-core framebuffer comparator for both source-selected Dive bodies. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnDiveConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import type {
  DiveAllocation,
  DiveBubbleProfile,
  DiveDropletProfile,
  DiveImpactProfile,
  DiveProfile,
} from "../../src/animation/dive.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Row = Record<string, any>;
export type DiveOrientation = "player-back" | "opponent-front";
export type DiveFramebufferBody = "setup" | "attack";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/dive-evidence.json"), "utf8"));
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const symbol = (sprite: Row): string | null => sprite.template?.symbol ?? null;

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Dive RGB ${filename}`);
}

export function diveRowsFor(orientation: DiveOrientation, body: DiveFramebufferBody): Row[] {
  const item = fixture.orientations[orientation];
  const frames = JSON.parse(gunzipSync(readFileSync(resolve(root, item.denseState)))
    .toString("utf8")).frames as Row[];
  const setupCount = item.bodyWindows[0].frameCount as number;
  return body === "setup" ? frames.slice(0, setupCount) : frames.slice(setupCount);
}

function allocation(row: Row, sprite: Row): DiveAllocation {
  return { slot: sprite.slot, matrixNum: sprite.matrixNum,
    persistentOrder: row.spriteOrder.indexOf(sprite.slot) };
}

function newSprites(rows: Row[], age: number, template: string): Row[] {
  const previous = age ? rows[age - 1]!.sprites as Row[] : [];
  return (rows[age]!.sprites as Row[]).filter((sprite) => symbol(sprite) === template
    && !previous.some((prior) => prior.slot === sprite.slot && symbol(prior) === template));
}

function profileFor(rows: Row[], body: DiveFramebufferBody): DiveProfile {
  const first = rows[0]!, last = rows.length - 1;
  const splashBirth = body === "setup" ? last - 50 : 16;
  const splash = newSprites(rows, splashBirth, "gDiveWaterSplashSpriteTemplate")[0]!;
  const droplets = newSprites(rows, splashBirth, "gSprayWaterDropletSpriteTemplate");
  const ball = body === "setup" ? newSprites(rows, 10, "gDiveBallSpriteTemplate")[0]! : splash;
  const impacts: DiveImpactProfile[] = body === "attack" ? Array.from({ length: 9 }, (_, index) => {
    const age = 30 + index * 4;
    const hit = newSprites(rows, age, "gWaterHitSplatSpriteTemplate")[0]!;
    const bubbles = newSprites(rows, age, "gSmallDriftingBubblesSpriteTemplate");
    return { ...allocation(rows[age]!, hit), bubbles: bubbles.map((bubble): DiveBubbleProfile => ({
      ...allocation(rows[age]!, bubble), velocityX: bubble.data[1], velocityY: bubble.data[2],
    })) as [DiveBubbleProfile, DiveBubbleProfile] };
  }) : [];
  const dropletsProfile = droplets.map((sprite): DiveDropletProfile => ({
    ...allocation(rows[splashBirth]!, sprite), velocityX: sprite.data[0],
    velocityY: sprite.data[1] + 32, direction: sprite.data[2],
  }));
  const slots = [...new Set([...(body === "setup" ? [ball.slot] : []), splash.slot,
    ...dropletsProfile.map((sprite) => sprite.slot),
    ...impacts.flatMap((impact) => [impact.slot, ...impact.bubbles.map((bubble) => bubble.slot)])])];
  const seedAge = body === "setup" ? 9 : 15;
  return { firstInactiveAge: last, attackerSubpriority: first.battlerSprites.attacker.subpriority,
    targetSubpriority: first.battlerSprites.target.subpriority,
    ball: allocation(rows[body === "setup" ? 10 : splashBirth]!, ball),
    splash: allocation(rows[splashBirth]!, splash),
    droplets: dropletsProfile, impacts,
    spriteOrderSeed: rows[seedAge]!.spriteOrder.filter((slot: number) => slots.includes(slot)) };
}

export function diveConfigFor(orientation: DiveOrientation, body: DiveFramebufferBody,
  rows: Row[]): SceneOnDiveConfig {
  const first = rows[0]!, playerAttacker = orientation === "player-back";
  const battler = (species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
    sprite: Row): SceneOnPresentationBattler => ({ species, geometry: {
      side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    } });
  const attacker = first.battlerSprites.attacker, target = first.battlerSprites.target;
  return {
    move: "DIVE", body,
    attacker: battler("CHINCHOU", playerAttacker ? "player" : "opponent", attacker),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", target),
    fieldProfile: {
      playerHp: first.parties.player[0].hp, playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp, opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender, opponentGender: first.parties.opponent[0].gender,
    },
    animationGeometry: {
      attackerCenter: { x: attacker.x, y: attacker.y }, targetCenter: { x: target.x, y: target.y },
      attackerPictureOffset: playerAttacker ? { x: 72, y: 80 } : { x: 176, y: 40 },
      targetPictureOffset: playerAttacker ? { x: 176, y: 40 } : { x: 72, y: 80 },
      attackerRestOffset: { x2: attacker.x2, y2: attacker.y2 },
      targetRestOffset: { x2: target.x2, y2: target.y2 },
    },
    animationProfile: profileFor(rows, body),
  };
}

function compareBody(orientation: DiveOrientation, body: DiveFramebufferBody,
  rows: Row[], rgbRoot: string) {
  const stage = createSceneOnMovePresentation(diveConfigFor(orientation, body, rows));
  let matched = 0, residualPixels = 0, peakResidualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const app = render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } });
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} ${body} age ${age}: raw hash`);
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
  return { orientation, body, rows: rows.length, matched, residualPixels,
    peakResidualPixels, failures };
}

export function verifyDiveFramebuffer() {
  return (["player-back", "opponent-front"] as const).flatMap((orientation) => {
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-dive-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    return (["setup", "attack"] as const).map((body) =>
      compareBody(orientation, body, diveRowsFor(orientation, body), scratch));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyDiveFramebuffer(), null, 2));
}
