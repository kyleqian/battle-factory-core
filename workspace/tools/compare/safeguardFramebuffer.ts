/** Strict shared-production-framebuffer verifier for retained Safeguard evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSafeguardView,
  type SceneOnPresentationBattler,
  type SceneOnSafeguardConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/safeguard-evidence.json"),
  "utf8",
)) as Record<string, any>;

export type SafeguardOrientation = "player-back" | "opponent-front";
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
  throw new Error(`missing Safeguard RGB ${filename}`);
}

export function safeguardRowsFor(orientation: SafeguardOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation} dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation} probe hash`);
  return JSON.parse(json.toString("utf8")).frames;
}

function spriteAt(row: Row, slot: number): Row {
  const sprite = row.sprites.find((candidate: Row) => candidate.slot === slot);
  if (!sprite) throw new Error(`missing Safeguard battler sprite ${slot}`);
  return sprite;
}

function battler(
  species: "BAYLEEF" | "ONIX",
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

function guardRings(row: Row): readonly Row[] {
  return row.sprites.filter((sprite: Row) =>
    sprite.template?.symbol === "gGuardRingSpriteTemplate");
}

export function safeguardConfigFor(
  orientation: SafeguardOrientation,
  rows: readonly Row[],
): SceneOnSafeguardConfig {
  const first = rows[0]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = spriteAt(first, attackerSide === "player" ? 6 : 8);
  const target = spriteAt(first, targetSide === "player" ? 6 : 8);
  const rings = guardRings(rows[20]!);
  if (rings.length !== 3) throw new Error(`${orientation} Guard Ring allocator evidence incomplete`);
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  return {
    move: "SAFEGUARD",
    attacker: battler("BAYLEEF", attackerSide, attacker),
    target: battler("ONIX", targetSide, target),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: player.gender === "genderless" ? "none" : player.gender,
      opponentGender: opponent.gender === "genderless" ? "none" : opponent.gender,
    },
    animationProfile: {
      ringSlots: [rings[0]!.slot, rings[1]!.slot, rings[2]!.slot],
      ringSubpriority: attacker.subpriority - 2,
    },
  };
}

export function compareSafeguardRows(
  orientation: SafeguardOrientation,
  rows: readonly Row[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(safeguardConfigFor(orientation, rows));
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnSafeguardView({ ...stage, age });
    if (seam.sourceOffset !== row.scriptOffset || seam.scriptActive !== row.animScriptActive) {
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
    let residual = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifySafeguardFramebuffer(): readonly Readonly<{
  orientation: SafeguardOrientation;
  componentRows: 71;
  seamRows: 71;
  rawRgbRows: 71;
  framebufferRows: 71;
  residualPixels: 0;
}>[] {
  const output = [];
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = safeguardRowsFor(orientation);
    if (rows.length !== 71) throw new Error(`${orientation} incomplete window`);
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-safeguard-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    const compared = compareSafeguardRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(
        `${orientation}: ${compared.matched}/71 residual ${compared.residualPixels}; `
        + compared.failures.slice(0, 24).join(","),
      );
    }
    output.push({
      orientation,
      componentRows: 71 as const,
      seamRows: 71 as const,
      rawRgbRows: 71 as const,
      framebufferRows: 71 as const,
      residualPixels: 0 as const,
    });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifySafeguardFramebuffer()) {
    console.log(`${result.orientation}: 71/71 framebuffer rows, residual=0`);
  }
  console.log("MOVE_SAFEGUARD: 142/142 exact with zero residual pixels");
}
