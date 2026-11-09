import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnHealBellView,
  type SceneOnHealBellConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { healBellAtAge } from "../../src/animation/healBell.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const entries: ReadonlyArray<Readonly<{
  id: "player-back" | "opponent-front";
  dense: string;
  rgb: string;
  config: SceneOnHealBellConfig;
}>> = [
  {
    id: "player-back",
    dense: "tools/compare/evidence/heal-bell-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/heal-bell-player-raw-rgb.tar.gz",
    config: {
      move: "HEAL_BELL",
      attacker: { species: "CHIMECHO", geometry: { side: "player",
        spriteCorner: { x: 40, y: 55 }, animationCenter: { x: 72, y: 95 },
        battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 152, playerMaxHp: 161,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "female", opponentGender: "male" },
    },
  },
  {
    id: "opponent-front",
    dense: "tools/compare/evidence/heal-bell-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/heal-bell-opponent-raw-rgb.tar.gz",
    config: {
      move: "HEAL_BELL",
      attacker: { species: "CHIMECHO", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 2 }, animationCenter: { x: 176, y: 34 },
        battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player",
        spriteCorner: { x: 40, y: 53 }, animationCenter: { x: 72, y: 93 },
        battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 110, playerMaxHp: 110,
        opponentHp: 151, opponentMaxHp: 161,
        playerGender: "male", opponentGender: "female" },
    },
  },
];

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
let total = 0;
for (const entry of entries) {
  const evidence = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString());
  const rows = evidence.frames as Array<Record<string, number>>;
  const scratch = createScratchDir(`pokebench-heal-bell-${entry.id}-`);
  const unpack = spawnSync("tar", ["-xzf", entry.rgb, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${entry.id}: RGB archive unpack failed`);
  const stage = createSceneOnMovePresentation(entry.config);
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = healBellAtAge(
      age,
      entry.config.attacker.geometry.side,
      entry.config.attacker.geometry.animationCenter,
      entry.config.attacker.geometry.battlePositionCenter,
    );
    const seam = sceneOnHealBellView({ ...stage, age });
    const seamExact = same(
      { ...seam, attacker: undefined, target: undefined },
      component,
    );
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    const raw = readFileSync(`${scratch}/${String(row.frame).padStart(5, "0")}.rgb`);
    let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    let first = "";
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (!first) first = `${x},${y}:app(${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]})/raw(${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]})`;
    }
    if (!seamExact || residual !== 0) failures.push(
      `${age}:${residual}:${minX},${minY}-${maxX},${maxY}:${first}:${seamExact}`,
    );
  }
  if (failures.length) throw new Error(
    `${entry.id}: ${failures.length}/${rows.length} failures (${failures.slice(0, 81).join(",")})`,
  );
  total += rows.length;
  console.log(`${entry.id}: ${rows.length}/${rows.length} component/seam/raw-RGB/framebuffer exact`);
}
if (total !== 522) throw new Error(`incomplete bilateral proof ${total}/522`);
console.log(`MOVE_HEAL_BELL: ${total}/${total} exact with zero residual pixels`);
