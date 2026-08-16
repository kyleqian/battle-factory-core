import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnYawnView,
  type SceneOnYawnConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { yawnAtAge } from "../../src/animation/yawn.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

const entries: ReadonlyArray<Readonly<{
  id: "player-back" | "opponent-front";
  dense: string;
  rgb: string;
  config: SceneOnYawnConfig;
}>> = [
  {
    id: "player-back",
    dense: "tools/compare/evidence/yawn-player-dense-state.json.gz",
    rgb: "tools/compare/evidence/yawn-player-raw-rgb.tar.gz",
    config: {
      move: "YAWN",
      attacker: { species: "TOGETIC", geometry: { side: "player",
        spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 },
        battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "GENGAR", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 13 }, animationCenter: { x: 176, y: 45 },
        battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 162, playerMaxHp: 162,
        opponentHp: 156, opponentMaxHp: 156,
        playerGender: "male", opponentGender: "male" },
    },
  },
  {
    id: "opponent-front",
    dense: "tools/compare/evidence/yawn-opponent-dense-state.json.gz",
    rgb: "tools/compare/evidence/yawn-opponent-raw-rgb.tar.gz",
    config: {
      move: "YAWN",
      attacker: { species: "TOGETIC", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 17 }, animationCenter: { x: 176, y: 49 },
        battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "GENGAR", geometry: { side: "player",
        spriteCorner: { x: 40, y: 57 }, animationCenter: { x: 72, y: 89 },
        battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 156, playerMaxHp: 156,
        opponentHp: 162, opponentMaxHp: 162,
        playerGender: "male", opponentGender: "male" },
    },
  },
];

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
let total = 0;
for (const entry of entries) {
  const evidence = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString());
  const rows = evidence.frames as Array<Record<string, number>>;
  const scratch = createScratchDir(`pokebench-yawn-${entry.id}-`);
  const unpack = spawnSync("tar", ["-xzf", entry.rgb, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${entry.id}: RGB archive unpack failed`);
  const stage = createSceneOnMovePresentation(entry.config);
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = yawnAtAge(
      age,
      entry.config.attacker.geometry.side,
      entry.config.attacker.geometry.animationCenter,
      entry.config.target.geometry.animationCenter,
    );
    const seam = sceneOnYawnView({ ...stage, age });
    const seamExact = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      component,
    );
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
    if (!seamExact || residual !== 0) failures.push(
      `${age}:${residual}:${minX},${minY}-${maxX},${maxY}:${seamExact}`,
    );
  }
  if (failures.length) throw new Error(
    `${entry.id}: ${failures.length}/${rows.length} failures (${failures.slice(0, 24).join(",")})`,
  );
  total += rows.length;
  console.log(`${entry.id}: ${rows.length}/${rows.length} reducer/component/seam/raw-RGB/framebuffer exact`);
}
if (total !== 426) throw new Error(`incomplete bilateral proof ${total}/426`);
console.log(`MOVE_YAWN: ${total}/${total} exact with zero residual pixels`);
