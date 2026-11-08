/** Strict shared-production-framebuffer verifier for retained Ingrain evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnIngrainView,
  type SceneOnIngrainConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/ingrain-evidence.json"),
  "utf8",
)) as Record<string, any>;
export type IngrainOrientation = "player-back" | "opponent-front";
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
  throw new Error(`missing Ingrain RGB ${filename}`);
}

export function ingrainRowsFor(orientation: IngrainOrientation): readonly Row[] {
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
  species: "CACTURNE" | "ONIX",
  side: "player" | "opponent",
  sprite: Row,
): SceneOnPresentationBattler {
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

export function ingrainConfigFor(
  orientation: IngrainOrientation,
  rows: readonly Row[],
): SceneOnIngrainConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const attackerSprite = spriteAt(first, first.animationBattlers.spriteIds[playerAttacker ? 0 : 1]);
  const targetSprite = spriteAt(first, first.animationBattlers.spriteIds[playerAttacker ? 1 : 0]);
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  return {
    move: "INGRAIN",
    // The legal set-140 mechanic stage overrides semantic party data to
    // Lileep after the selected Factory battler's already-live Cacturne
    // presentation buffers exist. The typed seam consumes that live visual
    // species; the compositor itself remains species-generic.
    attacker: battler("CACTURNE", attackerSide, attackerSprite),
    target: battler("ONIX", targetSide, targetSprite),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: player.gender === "genderless" ? "none" : player.gender,
      opponentGender: opponent.gender === "genderless" ? "none" : opponent.gender,
    },
    animationProfile: { attackerSubpriority: attackerSprite.subpriority },
  };
}

export function compareIngrainRows(
  orientation: IngrainOrientation,
  rows: readonly Row[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(ingrainConfigFor(orientation, rows));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnIngrainView({ ...stage, age });
    if (seam.sourceOffset !== row.scriptOffset || seam.active !== row.animScriptActive) {
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

export function verifyIngrainFramebuffer(): readonly Readonly<{
  orientation: IngrainOrientation;
  componentRows: 164;
  seamRows: 164;
  rawRgbRows: 164;
  framebufferRows: 164;
  residualPixels: 0;
}>[] {
  const output = [];
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = ingrainRowsFor(orientation);
    if (rows.length !== 164) throw new Error(`${orientation} incomplete window`);
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-ingrain-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    const compared = compareIngrainRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(`${orientation}: ${compared.matched}/164 residual ${compared.residualPixels}; ${compared.failures.slice(0, 24).join(",")}`);
    }
    output.push({
      orientation,
      componentRows: 164 as const,
      seamRows: 164 as const,
      rawRgbRows: 164 as const,
      framebufferRows: 164 as const,
      residualPixels: 0 as const,
    });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifyIngrainFramebuffer()) {
    console.log(`${result.orientation}: 164/164 framebuffer rows, residual=0`);
  }
  console.log("MOVE_INGRAIN: 328/328 exact with zero residual pixels");
}
