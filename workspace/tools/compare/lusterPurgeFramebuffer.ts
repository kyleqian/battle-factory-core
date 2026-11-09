import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnLusterPurgeView,
  type SceneOnLusterPurgeConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { lusterPurgeAtAge } from "../../src/animation/lusterPurge.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const visualRandom = {
  hitsplats: [
    { x: 10, y: 8 }, { x: 20, y: 3 }, { x: 35, y: 7 },
    { x: 22, y: 7 }, { x: 6, y: 23 }, { x: 16, y: 5 },
  ],
} as const;

const configurations: ReadonlyArray<Readonly<{
  id: "player-back" | "opponent-front";
  dense: string;
  rgb: string;
  config: SceneOnLusterPurgeConfig;
}>> = [
  {
    id: "player-back",
    dense: "tools/compare/evidence/luster-purge-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/luster-purge-player-raw-rgb.tar.gz",
    config: {
      move: "LUSTER_PURGE",
      attacker: { species: "LATIOS", geometry: {
        side: "player", spriteCorner: { x: 40, y: 51 },
        animationCenter: { x: 72, y: 83 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      target: { species: "ONIX", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 177, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      fieldProfile: { playerHp: 176, playerMaxHp: 176, opponentHp: 110, opponentMaxHp: 110, playerGender: "male", opponentGender: "male" },
      attackerBattlerId: 0, attackerSpriteSlot: 6, targetSpriteSlot: 8,
      targetInitialX2: 1, circleCenter: { x: 72, y: 91 },
      monbgCenter: { x: 72, y: 83 }, monbgPosition: { x: -40, y: -51 },
      hitsplatCenter: { x: 177, y: 42 }, visualRandom,
    },
  },
  {
    id: "opponent-front",
    dense: "tools/compare/evidence/luster-purge-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/luster-purge-opponent-raw-rgb.tar.gz",
    config: {
      move: "LUSTER_PURGE",
      attacker: { species: "LATIOS", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 4 },
        animationCenter: { x: 176, y: 36 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      target: { species: "ONIX", geometry: {
        side: "player", spriteCorner: { x: 40, y: 48 },
        animationCenter: { x: 71, y: 82 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      fieldProfile: { playerHp: 110, playerMaxHp: 110, opponentHp: 176, opponentMaxHp: 176, playerGender: "male", opponentGender: "male" },
      attackerBattlerId: 1, attackerSpriteSlot: 8, targetSpriteSlot: 6,
      targetInitialX2: 0, circleCenter: { x: 176, y: 36 },
      monbgCenter: { x: 176, y: 36 }, monbgPosition: { x: -144, y: -4 },
      hitsplatCenter: { x: 71, y: 82 }, visualRandom,
    },
  },
];

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

let total = 0;
for (const entry of configurations) {
  const rows = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString())
    .frames as Array<Record<string, any>>;
  const scratch = createScratchDir(`pokebench-luster-purge-${entry.id}-`);
  const unpack = spawnSync("tar", ["-xzf", entry.rgb, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${entry.id}: RGB archive unpack failed`);
  const stage = createSceneOnMovePresentation(entry.config);
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = lusterPurgeAtAge(age, {
      attackerSide: entry.config.attacker.geometry.side,
      attackerBattlerId: entry.config.attackerBattlerId,
      attackerSpriteSlot: entry.config.attackerSpriteSlot,
      targetSpriteSlot: entry.config.targetSpriteSlot,
      targetInitialX2: entry.config.targetInitialX2,
      circleCenter: entry.config.circleCenter,
      monbgCenter: entry.config.monbgCenter,
      monbgPosition: entry.config.monbgPosition,
      targetCenter: entry.config.hitsplatCenter,
      visualRandom: entry.config.visualRandom,
    });
    const seam = sceneOnLusterPurgeView({ ...stage, age });
    const seamExact = same(
      { ...seam, attacker: undefined, target: undefined },
      component,
    );
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(
      `${scratch}/${String(row.frame).padStart(5, "0")}.rgb`,
    );
    let residual = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        residual += 1;
      }
    }
    if (!seamExact || residual !== 0) failures.push(`${age}:${residual}:${seamExact}`);
  }
  if (failures.length) {
    throw new Error(`${entry.id}: ${failures.length} failures (${failures.slice(0, 30).join(",")})`);
  }
  total += rows.length;
  console.log(`${entry.id}: ${rows.length}/${rows.length} seam/component/raw-RGB/production framebuffer rows exact`);
}
if (total !== 666) throw new Error(`incomplete bilateral framebuffer proof ${total}/666`);
console.log(`MOVE_LUSTER_PURGE: ${total}/${total} rows exact with zero residual pixels`);
