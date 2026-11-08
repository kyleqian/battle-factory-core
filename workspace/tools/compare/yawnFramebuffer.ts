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
import "../../src/engine/monPicPixelsInstall.ts";
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

function sourceComponentExact(
  row: Record<string, any>,
  component: ReturnType<typeof yawnAtAge>,
  entry: (typeof entries)[number],
): boolean {
  const sourceSprites = row.sprites as Array<Record<string, any>>;
  const sourceMatrix = (sprite: Record<string, any>): ReturnType<typeof yawnAtAge>["attackerTransform"]["matrix"] => ({
    a: sprite.matrix[0],
    b: sprite.matrix[1],
    c: sprite.matrix[2],
    d: sprite.matrix[3],
  });
  const matchesTransform = (
    sprite: Record<string, any> | undefined,
    transform: ReturnType<typeof yawnAtAge>["attackerTransform"],
    center: Readonly<{ x: number; y: number }>,
  ): boolean => sprite?.template?.symbol === "gMultiuseSpriteTemplate"
    && sprite.x === center.x && sprite.y === center.y
    && sprite.x2 === transform.x2 && sprite.y2 === transform.y2
    && (!transform.active || same(sourceMatrix(sprite), transform.matrix));
  const attackerSlot = entry.id === "player-back" ? 6 : 8;
  const targetSlot = entry.id === "player-back" ? 8 : 6;
  const attackerSprite = sourceSprites.find((sprite) => sprite.slot === attackerSlot);
  const targetSprite = sourceSprites.find((sprite) => sprite.slot === targetSlot);
  if (row.animScriptActive !== component.active
    || row.scriptOwner !== "Move_YAWN"
    || row.scriptOffset !== component.scriptOffset
    || !matchesTransform(attackerSprite, component.attackerTransform,
      entry.config.attacker.geometry.animationCenter)
    || !matchesTransform(targetSprite, component.targetTransform,
      entry.config.target.geometry.animationCenter)
    || row.paletteTags.includes(10242) !== component.tagsLoaded
    || row.tileTags.includes(10242) !== component.tagsLoaded) return false;

  const sourceClouds = sourceSprites.filter(
    (sprite) => sprite.template?.symbol === "gYawnCloudSpriteTemplate",
  );
  if (sourceClouds.length !== component.clouds.length
    || !component.clouds.every((cloud) => {
      const sprite = sourceClouds.find((candidate) => candidate.slot === cloud.slot);
      return sprite !== undefined
        && sprite.x === cloud.x && sprite.y === cloud.y
        && sprite.x2 === cloud.x2 && sprite.y2 === cloud.y2
        && Boolean(sprite.invisible) === cloud.invisible
        && same(sourceMatrix(sprite), cloud.matrix);
    })) return false;

  const deepInhaleTasks = (row.tasks as Array<Record<string, any>>).filter(
    (task) => task.func?.symbol === "AnimTask_DeepInhale_Step",
  );
  if (deepInhaleTasks.length !== Number(component.attackerTransform.active)
    + Number(component.targetTransform.active)) return false;

  if (component.sound !== null) {
    const symbol = component.sound === "SE_M_YAWN" ? "se_m_yawn" : "se_m_spit_up";
    const audioPlayers = Object.values(row.audio ?? {}) as Array<Record<string, any> | null>;
    if (!audioPlayers.some((player) => player?.songHeaderIdentity?.symbol === symbol)) return false;
  }
  return true;
}

let total = 0;
for (const entry of entries) {
  const evidence = JSON.parse(gunzipSync(readFileSync(entry.dense)).toString());
  const rows = evidence.frames as Array<Record<string, any>>;
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
    const sourceExact = sourceComponentExact(row, component, entry);
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
    if (!sourceExact || !seamExact || residual !== 0) failures.push(
      `${age}:${residual}:${minX},${minY}-${maxX},${maxY}:${sourceExact}:${seamExact}`,
    );
  }
  if (failures.length) throw new Error(
    `${entry.id}: ${failures.length}/${rows.length} failures (${failures.slice(0, 24).join(",")})`,
  );
  total += rows.length;
  console.log(`${entry.id}: ${rows.length}/${rows.length} reducer/source-component/typed-seam/raw-RGB/framebuffer exact`);
}
if (total !== 426) throw new Error(`incomplete bilateral proof ${total}/426`);
console.log(`MOVE_YAWN: ${total}/${total} exact with zero residual pixels`);
