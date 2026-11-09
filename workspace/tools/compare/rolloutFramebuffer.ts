import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnPresentationBattler,
  type SceneOnRolloutConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/rollout-evidence.json",
  "utf8",
)) as any;

type Orientation = "player-back" | "opponent-front";

function configFor(
  orientation: Orientation,
  counter: 1 | 2 | 3 | 4 | 5,
  rows: readonly any[],
): SceneOnRolloutConfig {
  const playerAttacker = orientation === "player-back";
  const first = rows[0]!;
  const attackerSprite = first.battlerSprites.attacker;
  const targetSprite = first.battlerSprites.target;
  const battler = (
    species: "VOLTORB" | "ONIX",
    side: "player" | "opponent",
    sprite: any,
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: {
        x: sprite.x,
        y: side === "player" ? 80 : 40,
      },
    },
  });
  return {
    move: "ROLLOUT",
    attacker: battler(
      "VOLTORB",
      playerAttacker ? "player" : "opponent",
      attackerSprite,
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      targetSprite,
    ),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
    },
    counter,
    animationProfile: {
      side: playerAttacker ? "player" : "opponent",
      attackerStart: playerAttacker ? { x: 72, y: 104 } : { x: 176, y: 64 },
      targetEnd: playerAttacker ? { x: 176, y: 64 } : { x: 72, y: 104 },
      attackerSpriteSlot: attackerSprite.slot,
      targetSpriteSlot: targetSprite.slot,
      targetBaseX2: playerAttacker && counter === 1 ? 1 : 0,
      targetBaseY2: 0,
    },
  };
}

export interface RolloutFramebufferReport {
  readonly matched: Readonly<Record<Orientation, number>>;
  readonly residualRows: Readonly<Record<Orientation, number>>;
  readonly residualPixels: number;
}

export function verifyRolloutFramebuffer(): RolloutFramebufferReport {
  const matched = { "player-back": 0, "opponent-front": 0 };
  const residualRows = { "player-back": 0, "opponent-front": 0 };
  let residualPixels = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const evidence = JSON.parse(
      gunzipSync(readFileSync(receipt.denseState)).toString("utf8"),
    );
    const scratch = createScratchDir(`pokebench-rollout-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgb, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    const failures: string[] = [];
    for (const bodyRows of evidence.bodies as any[][]) {
      const counter = bodyRows[0]!.body as 1 | 2 | 3 | 4 | 5;
      const stage = createSceneOnMovePresentation(
        configFor(orientation, counter, bodyRows),
      );
      for (const row of bodyRows) {
        const engine: EngineState = {
          ...createInitialState(),
          rngMode: "frontierBattle",
          sceneOnPresentation: { ...stage, age: row.age },
        };
        const app = render(engine);
        const raw = readFileSync(join(
          scratch,
          `body-${counter}-${String(row.frame).padStart(5, "0")}.rgb`,
        ));
        let residual = 0;
        let minX = 240, minY = 160, maxX = -1, maxY = -1;
        let firstPixel = "";
        for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
          if (app[pixel * 4] === raw[pixel * 3]
            && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
            && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
          residual += 1;
          const x = pixel % 240;
          const y = Math.floor(pixel / 240);
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
          if (firstPixel === "") {
            firstPixel = `${x},${y}:app=${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`
              + `/ref=${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}`;
          }
        }
        if (residual === 0) matched[orientation] += 1;
        else {
          residualRows[orientation] += 1;
          residualPixels += residual;
          failures.push(
            `${counter}:${row.age}:${residual}:${minX},${minY}-${maxX},${maxY}:${firstPixel}`,
          );
        }
      }
    }
    const expectedFailures: string[] = [];
    if (JSON.stringify(failures) !== JSON.stringify(expectedFailures)) {
      throw new Error(`${orientation}: unexpected residuals ${failures.join(",")}`);
    }
  }
  if (matched["player-back"] !== 793 || matched["opponent-front"] !== 793
    || residualPixels !== 0) {
    throw new Error(
      `Rollout checkpoint drift ${JSON.stringify({ matched, residualRows, residualPixels })}`,
    );
  }
  return { matched, residualRows, residualPixels };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const report = verifyRolloutFramebuffer();
  console.log(`player-back: ${report.matched["player-back"]}/793`);
  console.log(`opponent-front: ${report.matched["opponent-front"]}/793`);
  console.log(
    `MOVE_ROLLOUT: 1586/1586 zero-residual rows; ${report.residualPixels} residual pixels; exact`,
  );
}
