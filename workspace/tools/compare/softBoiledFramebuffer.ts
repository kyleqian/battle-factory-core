import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSoftBoiledView,
  type SceneOnPresentationBattler,
  type SceneOnSoftBoiledConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { softBoiledAtAge, type SoftBoiledSide } from "../../src/animation/softBoiled.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Json = Record<string, any>;
const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/soft-boiled-evidence.json", "utf8",
)) as Json;
const sha = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function battler(side: SoftBoiledSide, sprite: Json): SceneOnPresentationBattler {
  return {
    species: "CHANSEY",
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y + (side === "player" ? 5 : 7) },
      battlePositionCenter: { x: sprite.x, y: sprite.y },
    },
  };
}

function configFor(side: SoftBoiledSide, probe: Json): SceneOnSoftBoiledConfig {
  const first = probe.frames[0] as Json;
  const attackerSprite = probe.frames[13].battlerSprites.attacker as Json;
  const attacker = battler(side, attackerSprite);
  return {
    move: "SOFT_BOILED",
    attacker,
    target: attacker,
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
    },
    healingCenter: {
      x: attackerSprite.x,
      y: attackerSprite.y + (side === "player" ? 8 : 0),
    },
  };
}

let total = 0;
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation] as Json;
  const compressed = readFileSync(receipt.denseState);
  const json = gunzipSync(compressed);
  if (sha(compressed) !== receipt.denseStateSha256
    || sha(json) !== receipt.probeJsonSha256
    || receipt.probeJsonSha256 !== receipt.repeatProbeJsonSha256) {
    throw new Error(`${orientation}: twice-fresh dense receipt drift`);
  }
  const probe = JSON.parse(json.toString("utf8")) as Json;
  const rows = probe.frames as Json[];
  const side: SoftBoiledSide = orientation === "player-back" ? "player" : "opponent";
  const config = configFor(side, probe);
  const stage = createSceneOnMovePresentation(config);
  const scratch = createScratchDir(`pokebench-soft-boiled-${orientation}-`);
  const unpack = spawnSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
  if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);

  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const component = softBoiledAtAge(age, side, {
      attackerCenter: config.attacker.geometry.animationCenter,
      targetCenter: config.healingCenter,
      battlePositionCenter: config.attacker.geometry.battlePositionCenter,
    });
    const seam = sceneOnSoftBoiledView({ ...stage, age });
    const seamExact = same(
      { ...seam, attacker: undefined, target: undefined },
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
    let first = "";
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const appOffset = pixel * 4;
      const rawOffset = pixel * 3;
      if (app[appOffset] === raw[rawOffset]
        && app[appOffset + 1] === raw[rawOffset + 1]
        && app[appOffset + 2] === raw[rawOffset + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      if (!first) first = `${x},${y}:app(${app[appOffset]},${app[appOffset + 1]},${app[appOffset + 2]})/raw(${raw[rawOffset]},${raw[rawOffset + 1]},${raw[rawOffset + 2]})`;
    }
    if (!seamExact || residual !== 0) failures.push(
      `${age}:${residual}:${minX},${minY}-${maxX},${maxY}:${first}:${seamExact}`,
    );
  }
  if (failures.length) throw new Error(
    `${orientation}: ${failures.length}/${rows.length} failures (${failures.slice(0, 100).join(",")})`,
  );
  total += rows.length;
  console.log(`${orientation}: ${rows.length}/${rows.length} component/seam/raw-RGB/framebuffer exact`);
}
if (total !== 544) throw new Error(`incomplete bilateral proof ${total}/544`);
console.log(`MOVE_SOFT_BOILED: ${total}/${total} exact with zero residual pixels`);
