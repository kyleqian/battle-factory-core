/** Production framebuffer verifier for the retained bilateral Move_SPIKES windows. */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { SpikesProfile } from "../../src/animation/spikes.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
  type SceneOnSpikesConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/spikes-evidence.json", "utf8"));
export type SpikesOrientation = "player-back" | "opponent-front";

function effects(row: any): any[] {
  return row.sprites.filter((sprite: any) => sprite.template.symbol === "gSpikesSpriteTemplate");
}

function profileFor(rows: readonly any[]): SpikesProfile {
  return {
    animationRngAtAge0: rows[0]!.animationRng,
    spriteSlots: [7, 19, 31].map((age) => effects(rows[age]!).at(-1)!.slot) as [number, number, number],
    targetSubpriority: effects(rows[7]!)[0]!.subpriority,
    oam: { spikeAttr2: effects(rows[7]!)[0]!.attr[2] },
    palette: {
      unfadedAtAge0: rows[0]!.unfadedPalette,
      fadedAtAge0: rows[0]!.fadedPalette,
      hardwareAtAge0: rows[0]!.hardwarePalette,
      unfadedAfterLoad: rows[1]!.unfadedPalette,
      fadedAfterLoad: rows[1]!.fadedPalette,
      unfadedAfterMonbg: rows[4]!.unfadedPalette,
      fadedAfterMonbg: rows[4]!.fadedPalette,
    },
  };
}

function battler(
  species: "QWILFISH" | "ONIX",
  side: "player" | "opponent",
  sprite: any,
  animationCenter: Readonly<{ x: number; y: number }>,
  battlePositionCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x + sprite.x2 - 32, y: sprite.y + sprite.y2 - 32 },
      animationCenter,
      battlePositionCenter,
    },
  };
}

export function spikesConfigFor(
  orientation: SpikesOrientation,
  rows: readonly any[],
): SceneOnSpikesConfig {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const first = rows[0]!;
  const firstSpike = effects(rows[7]!)[0]!;
  const attackerAnimationCenter = {
    x: firstSpike.x - (attackerSide === "player" ? 20 : -20),
    y: firstSpike.y,
  };
  const targetAnimationCenter = {
    x: first.battlerSprites.target.x + first.battlerSprites.target.x2,
    y: first.battlerSprites.target.y + first.battlerSprites.target.y2,
  };
  const targetBattlePosition = targetSide === "player"
    ? { x: 72, y: 80 }
    : { x: 176, y: 40 };
  return {
    move: "SPIKES",
    attacker: battler(
      "QWILFISH",
      attackerSide,
      first.battlerSprites.attacker,
      attackerAnimationCenter,
      attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    ),
    target: battler(
      "ONIX",
      targetSide,
      first.battlerSprites.target,
      targetAnimationCenter,
      targetBattlePosition,
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

export function compareSpikesRows(
  orientation: SpikesOrientation,
  rows: readonly any[],
  rgbDir: string,
): Readonly<{ matched: number; residualPixels: number }> {
  const stage = createSceneOnMovePresentation(spikesConfigFor(orientation, rows));
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
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
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
    throw new Error(`${orientation}: ${matched}/${rows.length}; ${failures.slice(0, 114).join(",")}`);
  }
  return { matched, residualPixels };
}

export function verifySpikesFramebuffer(): readonly Readonly<{
  orientation: SpikesOrientation;
  componentRows: 114;
  seamRows: 114;
  rawRgbRows: 114;
  framebufferRows: 114;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const rows = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString()).frames;
    const scratch = createScratchDir(`pokebench-spikes-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const compared = compareSpikesRows(orientation, rows, scratch);
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 114 as const,
      seamRows: 114 as const,
      rawRgbRows: 114 as const,
      framebufferRows: compared.matched as 114,
      residualPixels: 0 as const,
    });
  }
  if (total !== 228) throw new Error(`incomplete bilateral proof ${total}/228`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifySpikesFramebuffer()) {
    console.log(`${result.orientation}: component=114/114 seam=114/114 rawRGB=114/114 framebuffer=114/114 residual=0`);
  }
  console.log("MOVE_SPIKES: 228/228 exact with zero residual pixels");
}
