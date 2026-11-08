import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  type SceneOnBlizzardConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const entries: ReadonlyArray<Readonly<{
  id: "player-back" | "opponent-front";
  dense: string;
  rgb: string;
  config: SceneOnBlizzardConfig;
}>> = [
  {
    id: "player-back",
    dense: "tools/compare/evidence/blizzard-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/blizzard-player-raw-rgb.tar.gz",
    config: {
      move: "BLIZZARD",
      attacker: { species: "PELIPPER", geometry: { side: "player",
        spriteCorner: { x: 40, y: 54 }, animationCenter: { x: 72, y: 86 },
        battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 158, playerMaxHp: 167,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "male", opponentGender: "male" },
      effectGeometry: {
        attackerCenter: { x: 72, y: 94 }, targetCenter: { x: 176, y: 42 },
      },
    },
  },
  {
    id: "opponent-front",
    dense: "tools/compare/evidence/blizzard-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/blizzard-opponent-raw-rgb.tar.gz",
    config: {
      move: "BLIZZARD",
      attacker: { species: "PELIPPER", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 4 }, animationCenter: { x: 176, y: 36 },
        battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player",
        spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 },
        battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 110, playerMaxHp: 110,
        opponentHp: 158, opponentMaxHp: 167,
        playerGender: "male", opponentGender: "male" },
      effectGeometry: {
        attackerCenter: { x: 176, y: 36 }, targetCenter: { x: 72, y: 88 },
      },
    },
  },
];

export interface BlizzardFramebufferResult {
  readonly orientation: "player-back" | "opponent-front";
  readonly rows: number;
}

export function verifyBlizzardFramebuffer(): readonly BlizzardFramebufferResult[] {
  const results: BlizzardFramebufferResult[] = [];
  let total = 0;
  for (const entry of entries) {
  const evidence = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString());
  const rows = evidence.frames as Array<Record<string, any>>;
  const scratch = createScratchDir(`pokebench-blizzard-${entry.id}-`);
  const unpack = spawnSync("tar", ["-xzf", entry.rgb, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${entry.id}: RGB archive unpack failed`);
  const stage = createSceneOnMovePresentation(entry.config);
  const failures: string[] = [];
  let matched = 0;
  for (const [age, row] of rows.entries()) {
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    const raw = readFileSync(`${scratch}/${String(row.frame).padStart(5, "0")}.rgb`);
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
    total += matched;
    if (failures.length) throw new Error(
      `${entry.id}: ${matched}/${rows.length}; residuals ${failures.slice(0, 80).join(",")}`,
    );
    results.push({ orientation: entry.id, rows: matched });
  }
  if (total !== 733) throw new Error(`incomplete bilateral proof ${total}/733`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const results = verifyBlizzardFramebuffer();
  for (const result of results) {
    console.log(`${result.orientation}: ${result.rows}/${result.rows}`);
  }
  console.log("MOVE_BLIZZARD: 733/733 exact with zero residual pixels");
}
