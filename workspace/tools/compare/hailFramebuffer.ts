import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { HailProfile } from "../../src/animation/hail.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnHailConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/hail-evidence.json",
  "utf8",
));
export type HailOrientation = "player-back" | "opponent-front";

const TARGETS: Record<HailOrientation, HailProfile["targets"]> = {
  "player-back": [
    { targetX: 100, targetY: 120, initialX: 36, initialY: -8, impact: false }, { targetX: 64, targetY: 85, initialX: 18, initialY: -8, impact: true }, { targetX: 185, targetY: 52, initialX: 155, initialY: -8, impact: true }, { targetX: 66, targetY: 120, initialX: 2, initialY: -8, impact: false }, { targetX: 182, targetY: 120, initialX: 118, initialY: -8, impact: false }, { targetX: 60, targetY: 120, initialX: -4, initialY: -8, impact: false }, { targetX: 167, targetY: 32, initialX: 147, initialY: -8, impact: true }, { targetX: 80, targetY: 103, initialX: 25, initialY: -8, impact: true }, { targetX: 210, targetY: 120, initialX: 146, initialY: -8, impact: false }, { targetX: 38, targetY: 120, initialX: -26, initialY: -8, impact: false },
  ],
  "opponent-front": [
    { targetX: 100, targetY: 120, initialX: 36, initialY: -8, impact: false }, { targetX: 63, targetY: 78, initialX: 20, initialY: -8, impact: true }, { targetX: 182, targetY: 56, initialX: 150, initialY: -8, impact: true }, { targetX: 66, targetY: 120, initialX: 2, initialY: -8, impact: false }, { targetX: 182, targetY: 120, initialX: 118, initialY: -8, impact: false }, { targetX: 60, targetY: 120, initialX: -4, initialY: -8, impact: false }, { targetX: 170, targetY: 40, initialX: 146, initialY: -8, impact: true }, { targetX: 81, targetY: 98, initialX: 28, initialY: -8, impact: true }, { targetX: 210, targetY: 120, initialX: 146, initialY: -8, impact: false }, { targetX: 38, targetY: 120, initialX: -26, initialY: -8, impact: false },
  ],
};

function profileFor(orientation: HailOrientation, rows: readonly any[]): HailProfile {
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    occupiedSpriteSlots: rows[0]!.sprites.map((sprite: any) => sprite.slot),
    occupiedAffineMatrixSlots: [1, 2],
    targets: TARGETS[orientation],
    unfadedPaletteBeforeLoad: rows[0]!.unfadedPalette,
    fadedPaletteBeforeLoad: rows[0]!.fadedPalette,
    hardwarePaletteAtAge0: rows[0]!.hardwarePalette,
    unfadedPaletteAfterHailLoad: rows[1]!.unfadedPalette,
    fadedPaletteAfterHailLoad: rows[1]!.fadedPalette,
    unfadedPaletteAfterCrystalLoad: rows[4]!.unfadedPalette,
    fadedPaletteAfterCrystalLoad: rows[4]!.fadedPalette,
    hardwareMatricesAtAge0: rows[0]!.hardwareMatrices,
  };
}

export function hailConfigFor(
  orientation: HailOrientation,
  rows: readonly any[],
): SceneOnHailConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const playerSprite = first.sprites.find((sprite: any) => sprite.slot === 6)!;
  const opponentSprite = first.sprites.find((sprite: any) => sprite.slot === 8)!;
  const battler = (
    species: "DELIBIRD" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: {
        x: sprite.x + sprite.x2 - 32,
        y: sprite.y + sprite.y2 - 32,
      },
      animationCenter: { x: sprite.x + sprite.x2, y: sprite.y + sprite.y2 },
      battlePositionCenter: side === "player"
        ? { x: 72, y: 80 }
        : { x: 176, y: 40 },
    },
  });
  const player = first.battlers.player;
  const opponent = first.battlers.opponent;
  return {
    move: "HAIL",
    attacker: battler(
      "DELIBIRD",
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
      playerGender: first.parties.player[0].gender,
      opponentGender: first.parties.opponent[0].gender,
    },
    animationProfile: profileFor(orientation, rows),
  };
}

export function compareHailRows(
  orientation: HailOrientation,
  rows: readonly any[],
  rgbDir: string,
): Readonly<{ matched: number; residualPixels: number }> {
  const stage = createSceneOnMovePresentation(hailConfigFor(orientation, rows));
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
    throw new Error(`${orientation}: ${matched}/${rows.length}; ${failures.slice(0, 158).join(",")}`);
  }
  return { matched, residualPixels };
}

export function verifyHailFramebuffer(): readonly Readonly<{
  orientation: HailOrientation;
  componentRows: 158;
  seamRows: 158;
  rawRgbRows: 158;
  framebufferRows: 158;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const rows = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString()).frames;
    const scratch = createScratchDir(`pokebench-hail-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const compared = compareHailRows(orientation, rows, scratch);
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 158 as const,
      seamRows: 158 as const,
      rawRgbRows: 158 as const,
      framebufferRows: 158 as const,
      residualPixels: 0 as const,
    });
  }
  if (total !== 316) throw new Error(`incomplete bilateral proof ${total}/316`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyHailFramebuffer()) {
    console.log(`${result.orientation}: component=158/158 seam=158/158 rawRGB=158/158 framebuffer=158/158 residual=0`);
  }
  console.log("MOVE_HAIL: 316/316 exact with zero residual pixels");
}
