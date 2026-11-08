/** Strict actual-core framebuffer verifier for retained MOVE_GRUDGE evidence. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnGrudgeView,
  type SceneOnGrudgeConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Row = Record<string, any>;
export type GrudgeOrientation = "player-back" | "opponent-front";
const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/grudge-evidence.json"), "utf8"));
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child;
  }
  throw new Error(`missing Grudge RGB ${filename}`);
}

export function grudgeRowsFor(orientation: GrudgeOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation} dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation} probe hash`);
  return JSON.parse(json.toString()).frames;
}

function battler(species: "HAUNTER" | "ONIX", side: "player" | "opponent", sprite: Row): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function grudgeConfigFor(orientation: GrudgeOrientation, rows: readonly Row[]): SceneOnGrudgeConfig {
  const first = rows[0]!;
  const playerSprite = first.sprites.find((sprite: Row) => sprite.slot === 6)!;
  const opponentSprite = first.sprites.find((sprite: Row) => sprite.slot === 8)!;
  const playerAttacker = orientation === "player-back";
  const attackerSprite = playerAttacker ? playerSprite : opponentSprite;
  const targetSprite = playerAttacker ? opponentSprite : playerSprite;
  const flameRow = rows[46]!;
  const flames = flameRow.sprites.filter((sprite: Row) => sprite.template?.symbol === "gGrudgeFlameSpriteTemplate");
  if (flames.length !== 6) throw new Error(`${orientation}: incomplete flame allocator row`);
  const slots = flames.map((sprite: Row) => sprite.slot) as [number, number, number, number, number, number];
  const seed = rows[45]!.spriteOrder.filter((slot: number) => slots.includes(slot)) as [number, number, number, number, number, number];
  const task = flameRow.tasks.find((candidate: Row) => candidate.func?.symbol === "AnimTask_GrudgeFlames_Step");
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  return {
    move: "GRUDGE",
    attacker: battler("HAUNTER", playerAttacker ? "player" : "opponent", attackerSprite),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", targetSprite),
    fieldProfile: {
      playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: player.gender === "female" ? "female" : "male",
      opponentGender: opponent.gender === "female" ? "female" : "male",
    },
    animationProfile: {
      flameSlots: slots,
      spriteOrderSeed: seed,
      attackerSubpriority: attackerSprite.subpriority,
      targetSubpriority: targetSprite.subpriority,
      attackerBgPriority: task.data[5],
      attackerWidth: task.data[11] * 2 - 16,
      flameCenter: { x: task.data[9], y: task.data[10] },
      animationRngSeed: first.animationRng,
    },
  };
}

export function compareGrudgeRows(orientation: GrudgeOrientation, rows: readonly Row[], rgbRoot: string) {
  const stage = createSceneOnMovePresentation(grudgeConfigFor(orientation, rows));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnGrudgeView({ ...stage, age });
    if (seam.sourceOffset !== row.scriptOffset || seam.scriptActive !== row.animScriptActive) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
    let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3] && app[pixel * 4 + 1] === raw[pixel * 3 + 1] && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifyGrudgeFramebuffer() {
  const output = [];
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = grudgeRowsFor(orientation);
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-grudge-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    const compared = compareGrudgeRows(orientation, rows, scratch);
    if (compared.failures.length) throw new Error(`${orientation}: ${compared.matched}/209 residual ${compared.residualPixels}; ${compared.failures.slice(0, 30).join(",")}`);
    output.push({ orientation, componentRows: 209, seamRows: 209, rawRgbRows: 209, framebufferRows: 209, residualPixels: 0 });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifyGrudgeFramebuffer()) console.log(`${result.orientation}: 209/209 framebuffer rows, residual=0`);
  console.log("MOVE_GRUDGE: 418/418 exact with zero residual pixels");
}
