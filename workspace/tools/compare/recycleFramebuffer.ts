/** Strict shared-production-framebuffer verifier for retained Recycle evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnRecycleView,
  type SceneOnPresentationBattler,
  type SceneOnRecycleConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/recycle-evidence.json"),
  "utf8",
)) as Record<string, any>;
export type RecycleOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
const sha = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Recycle RGB ${filename}`);
}

export function recycleRowsFor(orientation: RecycleOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation} dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation} probe hash`);
  return JSON.parse(json.toString("utf8")).frames;
}

function spriteAt(row: Row, slot: number): Row {
  const sprite = row.sprites.find((candidate: Row) => candidate.slot === slot);
  if (!sprite) throw new Error(`missing battler sprite ${slot}`);
  return sprite;
}

function battler(
  species: "PORYGON" | "GYARADOS",
  side: "player" | "opponent",
  sprite: Row,
  animationCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

function arrow(row: Row): Row | undefined {
  return row.sprites.find((sprite: Row) =>
    sprite.template?.symbol === "gRecycleSpriteTemplate");
}

export function recycleConfigFor(
  orientation: RecycleOrientation,
  rows: readonly Row[],
): SceneOnRecycleConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const attackerSprite = spriteAt(first, first.animationBattlers.spriteIds[playerAttacker ? 0 : 1]);
  const targetSprite = spriteAt(first, first.animationBattlers.spriteIds[playerAttacker ? 1 : 0]);
  const firstArrow = arrow(rows[10]!)!;
  const blend = rows[149]!.tasks.find((task: Row) =>
    task.func?.symbol === "AnimTask_BlendMonInAndOut_Step");
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  return {
    move: "RECYCLE",
    attacker: battler("PORYGON", attackerSide, attackerSprite, {
      x: firstArrow.x,
      y: firstArrow.y,
    }),
    target: battler("GYARADOS", targetSide, targetSprite, {
      x: targetSprite.x,
      y: targetSprite.y,
    }),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: player.gender === "genderless" ? "none" : player.gender,
      opponentGender: opponent.gender === "genderless" ? "none" : opponent.gender,
    },
    animationProfile: {
      attackerTop: firstArrow.y,
      attackerSubpriority: firstArrow.subpriority + 2,
      spriteSlot: firstArrow.slot,
      matrixNum: firstArrow.matrixNum,
      attackerPaletteIdPlusOne: blend.data[0],
    },
  };
}

export function compareRecycleRows(
  orientation: RecycleOrientation,
  rows: readonly Row[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(recycleConfigFor(orientation, rows));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnRecycleView({ ...stage, age });
    if (seam.source.offset !== row.scriptOffset || seam.active !== row.animScriptActive) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
    let residual = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240; const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifyRecycleFramebuffer(): readonly Readonly<{
  orientation: RecycleOrientation;
  componentRows: 203;
  seamRows: 203;
  rawRgbRows: 203;
  framebufferRows: 203;
  residualPixels: 0;
}>[] {
  const output = [];
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = recycleRowsFor(orientation);
    if (rows.length !== 203) throw new Error(`${orientation} incomplete window`);
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-recycle-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    const compared = compareRecycleRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(`${orientation}: ${compared.matched}/203 residual ${compared.residualPixels}; ${compared.failures.slice(0, 24).join(",")}`);
    }
    output.push({
      orientation,
      componentRows: 203 as const,
      seamRows: 203 as const,
      rawRgbRows: 203 as const,
      framebufferRows: 203 as const,
      residualPixels: 0 as const,
    });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifyRecycleFramebuffer()) {
    console.log(`${result.orientation}: 203/203 framebuffer rows, residual=0`);
  }
  console.log("MOVE_RECYCLE: 406/406 exact with zero residual pixels");
}
