import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnFireBlastConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/fire-blast-evidence.json", "utf8",
));

export interface FireBlastFramebufferResult {
  readonly orientation: "player-back" | "opponent-front";
  readonly rows: number;
}

function configFor(
  orientation: "player-back" | "opponent-front",
  rows: readonly any[],
): SceneOnFireBlastConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  const attackerSprite = rows[4]!.battlerSprites.attacker;
  const targetSprite = rows[4]!.battlerSprites.target;
  const battler = (
    species: "OCTILLERY" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: { x: sprite.x, y: sprite.y },
    },
  });
  return {
    move: "FIRE_BLAST",
    attacker: battler("OCTILLERY", playerAttacker ? "player" : "opponent", attackerSprite),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", targetSprite),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationProfile: {
      attackerPictureCenter: playerAttacker ? { x: 72, y: 98 } : { x: 176, y: 50 },
      targetPictureCenter: playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
      targetSpriteSlot: targetSprite.slot,
    },
  };
}

export function verifyFireBlastFramebuffer(): readonly FireBlastFramebufferResult[] {
  const results: FireBlastFramebufferResult[] = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const evidence = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString());
    const rows = evidence.frames as any[];
    const scratch = createScratchDir(`pokebench-fire-blast-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const stage = createSceneOnMovePresentation(configFor(orientation, rows));
    const failures: string[] = [];
    let matched = 0;
    for (const [age, row] of rows.entries()) {
      const engine: EngineState = {
        ...createInitialState(),
        rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age },
      };
      const app = render(engine);
      const raw = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (app[pixel * 4] === raw[pixel * 3]
          && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
          && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
        residual += 1;
        const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (residual === 0) matched += 1;
      else {
        const pixel = minY * 240 + minX;
        failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`
          + `:app=${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
          + `:ref=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`);
      }
    }
    if (failures.length) throw new Error(
      `${orientation}: ${matched}/${rows.length}; ${failures.slice(0, 80).join(",")}`,
    );
    total += matched;
    results.push({ orientation, rows: matched });
  }
  if (total !== 394) throw new Error(`incomplete bilateral proof ${total}/394`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyFireBlastFramebuffer()) {
    console.log(`${result.orientation}: ${result.rows}/${result.rows}`);
  }
  console.log("MOVE_FIRE_BLAST: 394/394 exact with zero residual pixels");
}
