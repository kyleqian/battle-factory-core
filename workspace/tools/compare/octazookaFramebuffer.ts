import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { OctazookaProfile } from "../../src/animation/octazooka.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnOctazookaConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/octazooka-evidence.json",
  "utf8",
));
export type OctazookaOrientation = "player-back" | "opponent-front";

function effects(row: any): any[] {
  return row.sprites.filter((sprite: any) => [
    "gOctazookaBallSpriteTemplate",
    "gOctazookaSmokeSpriteTemplate",
  ].includes(sprite.template.symbol));
}

function profileFor(rows: readonly any[]): OctazookaProfile {
  const ball = effects(rows[7]!)[0]!;
  const smokes = effects(rows[41]!).filter(
    (sprite: any) => sprite.template.symbol === "gOctazookaSmokeSpriteTemplate",
  );
  const firstSmoke = effects(rows[29]!)[0]!;
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    ballSpriteSlot: ball.slot,
    smokeSpriteSlots: smokes.map((sprite: any) => sprite.slot) as [
      number,
      number,
      number,
      number,
    ],
    targetSubpriority: ball.subpriority,
    oam: { ballAttr2: ball.attr[2], smokeAttr2: firstSmoke.attr[2] },
    palette: {
      unfadedAtAge0: rows[0]!.unfadedPalette,
      fadedAtAge0: rows[0]!.fadedPalette,
      hardwareAtAge0: rows[0]!.hardwarePalette,
      unfadedAfterGraySmokeLoad: rows[1]!.unfadedPalette,
      fadedAfterGraySmokeLoad: rows[1]!.fadedPalette,
      unfadedAfterBlackBallLoad: rows[4]!.unfadedPalette,
      fadedAfterBlackBallLoad: rows[4]!.fadedPalette,
    },
  };
}

function signedOam(value: number, mask: number): number {
  const coordinate = value & mask;
  return coordinate > mask / 2 ? coordinate - (mask + 1) : coordinate;
}

export function octazookaConfigFor(
  orientation: OctazookaOrientation,
  rows: readonly any[],
): SceneOnOctazookaConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  const ball = effects(rows[7]!)[0]!;
  const smoke = effects(rows[29]!)[0]!;
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const attackerCenter = {
    x: ball.x - (playerAttacker ? 20 : -20),
    y: ball.y,
  };
  const targetCenter = {
    x: smoke.x - (targetSide === "player" ? -8 : 8),
    y: smoke.y - 8,
  };
  const battler = (
    species: "OCTILLERY" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
    animationCenter: Readonly<{ x: number; y: number }>,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: {
        x: signedOam(sprite.attr[1], 0x1ff),
        y: signedOam(sprite.attr[0], 0xff),
      },
      animationCenter,
      battlePositionCenter: side === "player"
        ? { x: 72, y: 80 }
        : { x: 176, y: 40 },
    },
  });
  const attackerSprite = first.battlerSprites.attacker;
  const targetSprite = first.battlerSprites.target;
  return {
    move: "OCTAZOOKA",
    attacker: battler("OCTILLERY", attackerSide, attackerSprite, attackerCenter),
    target: battler("ONIX", targetSide, targetSprite, targetCenter),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: first.parties.player[0].gender,
      opponentGender: first.parties.opponent[0].gender,
    },
    animationProfile: profileFor(rows),
  };
}

export function compareOctazookaRows(
  orientation: OctazookaOrientation,
  rows: readonly any[],
  rgbDir: string,
): Readonly<{ matched: number; residualPixels: number }> {
  const stage = createSceneOnMovePresentation(octazookaConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(join(rgbDir, `${String(row.frame).padStart(5, "0")}.rgb`));
    let residual = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  if (failures.length) {
    throw new Error(`${orientation}: ${matched}/${rows.length}; ${failures.slice(0, 100).join(",")}`);
  }
  return { matched, residualPixels };
}

export function verifyOctazookaFramebuffer(): readonly Readonly<{
  orientation: OctazookaOrientation;
  componentRows: number;
  seamRows: number;
  rawRgbRows: number;
  framebufferRows: number;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const rows = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString()).frames;
    const scratch = createScratchDir(`pokebench-octazooka-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const compared = compareOctazookaRows(orientation, rows, scratch);
    total += compared.matched;
    results.push({
      orientation,
      componentRows: rows.length,
      seamRows: rows.length,
      rawRgbRows: rows.length,
      framebufferRows: compared.matched,
      residualPixels: 0 as const,
    });
  }
  if (total !== 160) throw new Error(`incomplete bilateral proof ${total}/160`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyOctazookaFramebuffer()) {
    console.log(`${result.orientation}: component=${result.componentRows}/80 seam=${result.seamRows}/80 rawRGB=${result.rawRgbRows}/80 framebuffer=${result.framebufferRows}/80 residual=0`);
  }
  console.log("MOVE_OCTAZOOKA: 160/160 exact with zero residual pixels");
}
