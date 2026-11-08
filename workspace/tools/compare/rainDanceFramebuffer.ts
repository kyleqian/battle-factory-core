import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
  type SceneOnRainDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import type { RainDanceProfile } from "../../src/animation/rainDance.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/rain-dance-evidence.json", "utf8",
));
export type RainDanceOrientation = "player-back" | "opponent-front";

function profileFor(rows: readonly any[]): RainDanceProfile {
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    occupiedSpriteSlots: rows[0]!.sprites.map((sprite: any) => sprite.slot),
    unfadedPaletteBeforeLoad: rows[0]!.unfadedPalette,
    fadedPaletteBeforeLoad: rows[0]!.fadedPalette,
    hardwarePaletteAtAge0: rows[0]!.hardwarePalette,
    unfadedPaletteAfterLoad: rows[1]!.unfadedPalette,
    fadedPaletteAfterLoad: rows[1]!.fadedPalette,
  };
}

export function rainDanceConfigFor(
  orientation: RainDanceOrientation,
  rows: readonly any[],
): SceneOnRainDanceConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  const playerSprite = first.sprites.find((sprite: any) => sprite.slot === 6)!;
  const opponentSprite = first.sprites.find((sprite: any) => sprite.slot === 8)!;
  const battler = (
    species: "WOOPER" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      // The renderer consumes this source OAM geometry directly. `x2`/`y2`
      // are part of the displayed battler position, so this captures the
      // observed opponent-front ONIX +1 without a production species branch.
      spriteCorner: {
        x: sprite.x + sprite.x2 - 32,
        y: sprite.y + sprite.y2 - 32,
      },
      animationCenter: side === "player" ? { x: 72, y: 88 } : { x: 176, y: 42 },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  });
  const player = first.battlers.player;
  const opponent = first.battlers.opponent;
  return {
    move: "RAIN_DANCE",
    attacker: battler(
      "WOOPER",
      playerAttacker ? "player" : "opponent",
      playerAttacker ? playerSprite : opponentSprite,
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      playerAttacker ? opponentSprite : playerSprite,
    ),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationProfile: profileFor(rows),
  };
}

export function compareRainDanceRows(
  orientation: RainDanceOrientation,
  rows: readonly any[],
  rawDir: string,
): number {
  const stage = createSceneOnMovePresentation(
    rainDanceConfigFor(orientation, rows),
  );
  const failures: string[] = [];
  let matched = 0;
  for (const [age, row] of rows.entries()) {
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(
      join(rawDir, `${String(row.frame).padStart(5, "0")}.rgb`),
    );
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
  return matched;
}

export function verifyRainDanceFramebuffer(): readonly Readonly<{
  orientation: RainDanceOrientation;
  rows: number;
  framebufferCompared: true;
}>[] {
  const results: Array<{
    orientation: RainDanceOrientation;
    rows: number;
    framebufferCompared: true;
  }> = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const evidence = JSON.parse(
      gunzipSync(readFileSync(receipt.denseState)).toString(),
    );
    const scratch = createScratchDir(`pokebench-rain-dance-${orientation}-`);
    const unpack = spawnSync(
      "tar",
      ["-xzf", receipt.rawRgbArchive, "-C", scratch],
    );
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const rows = compareRainDanceRows(
      orientation,
      evidence.frames,
      join(scratch, orientation === "player-back" ? "player-rgb" : "opponent-rgb"),
    );
    total += rows;
    results.push({ orientation, rows, framebufferCompared: true });
  }
  if (total !== 374) throw new Error(`incomplete bilateral proof ${total}/374`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyRainDanceFramebuffer()) {
    console.log(`${result.orientation}: ${result.rows}/${result.rows}; framebufferCompared=true`);
  }
  console.log("MOVE_RAIN_DANCE: 374/374 exact with zero residual pixels");
}
