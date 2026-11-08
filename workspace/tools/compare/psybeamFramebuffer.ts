import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
  type SceneOnPsybeamConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/psybeam-evidence.json", "utf8",
));
type Orientation = "player-back" | "opponent-front";

export function psybeamConfigFor(
  orientation: Orientation,
  rows: readonly any[],
): SceneOnPsybeamConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  const attackerSprite = first.battlerSprites.attacker;
  const targetSprite = first.battlerSprites.target;
  const battler = (
    species: "SPINDA" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
    animationCenter: Readonly<{ x: number; y: number }>,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  });
  return {
    move: "PSYBEAM",
    attacker: battler(
      "SPINDA",
      playerAttacker ? "player" : "opponent",
      attackerSprite,
      playerAttacker ? { x: 72, y: 93 } : { x: 176, y: 41 },
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      targetSprite,
      playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
    ),
    targetIdleX2: playerAttacker ? 1 : 0,
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
  };
}

export function verifyPsybeamFramebuffer(): readonly Readonly<{
  orientation: Orientation;
  rows: number;
}>[] {
  const results: { orientation: Orientation; rows: number }[] = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const evidence = JSON.parse(
      gunzipSync(readFileSync(receipt.denseState)).toString(),
    );
    const rows = evidence.frames as any[];
    const scratch = createScratchDir(`pokebench-psybeam-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const stage = createSceneOnMovePresentation(psybeamConfigFor(orientation, rows));
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
        join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`),
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
      else {
        const pixel = minY * 240 + minX;
        failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`
          + `:app=${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
          + `:ref=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`);
      }
    }
    if (failures.length) throw new Error(
      `${orientation}: ${matched}/${rows.length}; ${failures.slice(0, 100).join(",")}`,
    );
    total += matched;
    results.push({ orientation, rows: matched });
  }
  if (total !== 320) throw new Error(`incomplete bilateral proof ${total}/320`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyPsybeamFramebuffer()) {
    console.log(`${result.orientation}: ${result.rows}/${result.rows}`);
  }
  console.log("MOVE_PSYBEAM: 320/320 exact with zero residual pixels");
}
