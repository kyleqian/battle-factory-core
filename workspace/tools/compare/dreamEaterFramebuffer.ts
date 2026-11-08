import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnDreamEaterView,
  type SceneOnDreamEaterConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { dreamEaterAtAge } from "../../src/animation/dreamEater.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const allocatorProfile = {
  orbs: [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 3, 20, 21, 4, 7, 9, 5, 11, 13],
  stars: [3, 4, 5, 3],
  orderSeed: [4, 3, 16, 15, 14, 13, 12, 11, 10, 9, 7, 5, 21, 20, 19, 18, 17],
} as const;

const configurations: ReadonlyArray<Readonly<{
  id: "player-back" | "opponent-front";
  dense: string;
  rgb: string;
  config: SceneOnDreamEaterConfig;
}>> = [
  {
    id: "player-back",
    dense: "tools/compare/evidence/dream-eater-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/dream-eater-player-raw-rgb.tar.gz",
    config: {
      move: "DREAM_EATER",
      attacker: { species: "WIGGLYTUFF", geometry: {
        side: "player", spriteCorner: { x: 40, y: 56 },
        animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      target: { species: "ONIX", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      healingCenter: { x: 72, y: 96 },
      absorptionCenter: { x: 72, y: 96 },
      targetRestOffset: { x2: 1, y2: 0 },
      allocatorProfile,
      fieldProfile: {
        playerHp: 205, playerMaxHp: 215, opponentHp: 110, opponentMaxHp: 110,
        playerGender: "female", opponentGender: "male",
      },
    },
  },
  {
    id: "opponent-front",
    dense: "tools/compare/evidence/dream-eater-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/dream-eater-opponent-raw-rgb.tar.gz",
    config: {
      move: "DREAM_EATER",
      attacker: { species: "WIGGLYTUFF", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 16 },
        animationCenter: { x: 176, y: 48 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      target: { species: "ONIX", geometry: {
        side: "player", spriteCorner: { x: 40, y: 48 },
        animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      healingCenter: { x: 176, y: 48 },
      absorptionCenter: { x: 176, y: 48 },
      targetRestOffset: { x2: 0, y2: 0 },
      allocatorProfile,
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110, opponentHp: 195, opponentMaxHp: 215,
        playerGender: "male", opponentGender: "female",
      },
    },
  },
];

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

let total = 0;
for (const entry of configurations) {
  const rows = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString())
    .frames as Array<Record<string, number>>;
  const scratch = createScratchDir(`pokebench-dream-eater-${entry.id}-`);
  const unpack = spawnSync("tar", ["-xzf", entry.rgb, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${entry.id}: RGB archive unpack failed`);
  const stage = createSceneOnMovePresentation(entry.config);
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = dreamEaterAtAge(
      age,
      entry.config.target.geometry.animationCenter,
      entry.config.absorptionCenter,
      entry.config.attacker.geometry.side,
      entry.config.healingCenter,
      entry.config.targetRestOffset,
    );
    const seam = sceneOnDreamEaterView({ ...stage, age });
    const seamExact = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(`${scratch}/${String(row.frame).padStart(5, "0")}.rgb`);
    let residual = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (!seamExact || residual !== 0) {
      failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}:${seamExact}`);
    }
  }
  if (failures.length) {
    throw new Error(`${entry.id}: ${failures.length}/${rows.length} failures (${failures.slice(0, 40).join(",")})`);
  }
  total += rows.length;
  console.log(`${entry.id}: ${rows.length}/${rows.length} component/seam/raw-RGB/production framebuffer rows exact`);
}
if (total !== 533) throw new Error(`incomplete bilateral framebuffer proof ${total}/533`);
console.log(`MOVE_DREAM_EATER: ${total}/${total} rows exact with zero residual pixels`);
