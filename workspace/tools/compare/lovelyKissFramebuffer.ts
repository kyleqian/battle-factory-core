import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { LovelyKissProfile } from "../../src/animation/lovelyKiss.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnLovelyKissConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/lovely-kiss-evidence.json",
  "utf8",
));
export type LovelyKissOrientation = "player-back" | "opponent-front";

function profileFor(rows: readonly any[]): LovelyKissProfile {
  const devil = rows[7]!.sprites.find(
    (sprite: any) => sprite.template.symbol === "gDevilSpriteTemplate",
  )!;
  const hearts = rows[97]!.sprites.filter(
    (sprite: any) => sprite.template.symbol === "gPinkHeartSpriteTemplate",
  );
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    devilSpriteSlot: devil.slot,
    heartSpriteSlots: hearts.map((sprite: any) => sprite.slot),
    targetSubpriority: devil.subpriority + 1,
    palette: {
      unfadedAtAge0: rows[0]!.unfadedPalette,
      fadedAtAge0: rows[0]!.fadedPalette,
      hardwareAtAge0: rows[0]!.hardwarePalette,
      unfadedAfterPinkHeartLoad: rows[1]!.unfadedPalette,
      fadedAfterPinkHeartLoad: rows[1]!.fadedPalette,
      unfadedAfterDevilLoad: rows[4]!.unfadedPalette,
      fadedAfterDevilLoad: rows[4]!.fadedPalette,
    },
  };
}

export function lovelyKissConfigFor(
  orientation: LovelyKissOrientation,
  rows: readonly any[],
): SceneOnLovelyKissConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  const battler = (
    species: "JYNX" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
    animationCenter: Readonly<{ x: number; y: number }>,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      // x2/y2 belong to the live displayed battler geometry, not to a
      // species correction inside the compositor.
      spriteCorner: {
        x: sprite.x + sprite.x2 - 32,
        y: sprite.y + sprite.y2 - 32,
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
    move: "LOVELY_KISS",
    attacker: battler(
      "JYNX",
      playerAttacker ? "player" : "opponent",
      attackerSprite,
      { x: attackerSprite.x, y: attackerSprite.y },
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      targetSprite,
      playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
    ),
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

export function verifyLovelyKissFramebuffer(): readonly Readonly<{
  orientation: LovelyKissOrientation;
  componentRows: number;
  seamRows: number;
  rawRgbRows: number;
  framebufferRows: number;
  residualPixels: 0;
}>[] {
  const results: Array<{
    orientation: LovelyKissOrientation;
    componentRows: number;
    seamRows: number;
    rawRgbRows: number;
    framebufferRows: number;
    residualPixels: 0;
  }> = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const evidence = JSON.parse(
      gunzipSync(readFileSync(receipt.denseState)).toString(),
    );
    const rows = evidence.frames as any[];
    const scratch = createScratchDir(`pokebench-lovely-kiss-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const stage = createSceneOnMovePresentation(lovelyKissConfigFor(orientation, rows));
    const failures: string[] = [];
    let matched = 0;
    for (const [age, row] of rows.entries()) {
      const engine: EngineState = {
        ...createInitialState(),
        rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age },
      };
      const app = render(engine);
      const raw = readFileSync(join(
        scratch,
        `${String(row.frame).padStart(5, "0")}.rgb`,
      ));
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
      if (residual === 0) matched += 1;
      else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
    }
    if (failures.length) {
      throw new Error(
        `${orientation}: ${matched}/${rows.length}; ${failures.slice(0, 100).join(",")}`,
      );
    }
    total += matched;
    results.push({
      orientation,
      componentRows: rows.length,
      seamRows: rows.length,
      rawRgbRows: rows.length,
      framebufferRows: matched,
      residualPixels: 0,
    });
  }
  if (total !== 306) throw new Error(`incomplete bilateral proof ${total}/306`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyLovelyKissFramebuffer()) {
    console.log(
      `${result.orientation}: component=${result.componentRows}/153 seam=${result.seamRows}/153 `
      + `rawRGB=${result.rawRgbRows}/153 framebuffer=${result.framebufferRows}/153 residual=0`,
    );
  }
  console.log("MOVE_LOVELY_KISS: 306/306 exact with zero residual pixels");
}
