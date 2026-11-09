import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnLeechSeedView,
  type SceneOnLeechSeedConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { leechSeedAtAge } from "../../src/animation/leechSeed.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const allocatorProfile = {
  seeds: [3, 4, 5], hitsplat: 3,
  orbs: [3, 4, 5, 7, 9, 10, 11, 12], stars: [3, 4, 5, 3],
  paletteController: 3,
} as const;

const entries: ReadonlyArray<Readonly<{
  id: "player-back" | "opponent-front";
  dense: string;
  rgb: string;
  base: Omit<SceneOnLeechSeedConfig, "body">;
}>> = [
  {
    id: "player-back",
    dense: "tools/compare/evidence/leech-seed-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/leech-seed-player-raw-rgb.tar.gz",
    base: {
      move: "LEECH_SEED",
      attacker: { species: "EXEGGCUTE", geometry: {
        side: "player", spriteCorner: { x: 40, y: 61 },
        animationCenter: { x: 72, y: 93 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      target: { species: "ONIX", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      effectCenter: { x: 72, y: 101 },
      targetRestOffset: { x2: 1, y2: 0 }, allocatorProfile,
      fieldProfile: { playerHp: 145, playerMaxHp: 156, opponentHp: 110,
        opponentMaxHp: 110, playerGender: "male", opponentGender: "male" },
    },
  },
  {
    id: "opponent-front",
    dense: "tools/compare/evidence/leech-seed-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/leech-seed-opponent-raw-rgb.tar.gz",
    base: {
      move: "LEECH_SEED",
      attacker: { species: "EXEGGCUTE", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 15 },
        animationCenter: { x: 176, y: 47 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      target: { species: "ONIX", geometry: {
        side: "player", spriteCorner: { x: 40, y: 48 },
        animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      effectCenter: { x: 176, y: 47 },
      targetRestOffset: { x2: 0, y2: 0 }, allocatorProfile,
      fieldProfile: { playerHp: 110, playerMaxHp: 110, opponentHp: 146,
        opponentMaxHp: 156, playerGender: "male", opponentGender: "male" },
    },
  },
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
let total = 0;
for (const entry of entries) {
  const evidence = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString());
  const scratch = createScratchDir(`pokebench-leech-seed-${entry.id}-`);
  const unpack = spawnSync("tar", ["-xzf", entry.rgb, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${entry.id}: RGB archive unpack failed`);
  for (const body of ["main", "residual"] as const) {
    const config: SceneOnLeechSeedConfig = { ...entry.base, body };
    const stage = createSceneOnMovePresentation(config);
    const rows = evidence.windows[body].frames as Array<Record<string, number>>;
    const failures: string[] = [];
    for (const [age, row] of rows.entries()) {
      const component = leechSeedAtAge(
        body, age, config.attacker.geometry.side, config.effectCenter,
        config.target.geometry.animationCenter,
        config.target.geometry.battlePositionCenter, config.targetRestOffset,
      );
      const seam = sceneOnLeechSeedView({ ...stage, age });
      const seamExact = same(
        { ...seam, age: undefined, attacker: undefined, target: undefined },
        component,
      );
      const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } };
      const app = render(engine);
      const raw = readFileSync(`${scratch}/${body}/${String(row.frame).padStart(5, "0")}.rgb`);
      let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      for (let p = 0; p < 240 * 160; p += 1) {
        if (app[p * 4] === raw[p * 3] && app[p * 4 + 1] === raw[p * 3 + 1]
          && app[p * 4 + 2] === raw[p * 3 + 2]) continue;
        residual += 1;
        const x = p % 240, y = Math.floor(p / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (!seamExact || residual) failures.push(
        `${age}:${residual}:${minX},${minY}-${maxX},${maxY}:${seamExact}`,
      );
    }
    if (failures.length) throw new Error(
      `${entry.id}/${body}: ${failures.length}/${rows.length} failures (${failures.slice(0, 50).join(",")})`,
    );
    total += rows.length;
    console.log(`${entry.id}/${body}: ${rows.length}/${rows.length} component/seam/raw-RGB/framebuffer exact`);
  }
}
if (total !== 696) throw new Error(`incomplete bilateral proof ${total}/696`);
console.log(`MOVE_LEECH_SEED: ${total}/${total} exact with zero residual pixels`);
