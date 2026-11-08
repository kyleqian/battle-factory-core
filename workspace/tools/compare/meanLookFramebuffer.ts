/** Strict shared-production-framebuffer verifier for retained Mean Look evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnMeanLookView,
  type SceneOnMeanLookConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { meanLookAtAge } from "../../src/animation/meanLook.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { verifyMeanLookEvidence } from "./meanLookEvidence.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/mean-look-evidence.json"),
  "utf8",
)) as Readonly<{
  orientations: Readonly<Record<MeanLookOrientation, Readonly<{
    denseState: string;
    denseStateSha256: string;
    rawRgbArchive: string;
    rawRgbArchiveSha256: string;
  }>>>;
}>;

export type MeanLookOrientation = "player-back" | "opponent-front";

type DenseSprite = Readonly<{
  slot: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  matrix: readonly number[];
  subpriority: number;
  invisible: boolean;
  template?: Readonly<{ symbol?: string }>;
}>;

type DenseMon = Readonly<{ hp: number; maxHp: number }>;

type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  scriptOffset: number | null;
  animScriptActive: boolean;
  animationBattlers: Readonly<{ spriteIds: readonly number[] }>;
  battlers: Readonly<{ player: DenseMon; opponent: DenseMon }>;
  sprites: readonly DenseSprite[];
  softwareOam: readonly string[];
  hardwareOam: readonly string[];
  softwareMatrices: readonly (readonly number[])[];
  hardwareMatrices: readonly (readonly number[])[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
}>;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function findRgb(rootPath: string, filename: string): string {
  for (const entry of readdirSync(rootPath)) {
    const path = join(rootPath, entry);
    if (statSync(path).isDirectory()) {
      try { return findRgb(path, filename); } catch { continue; }
    }
    if (entry === filename) return path;
  }
  throw new Error(`missing ${filename} below ${rootPath}`);
}

function spriteAt(row: DenseRow, slot: number): DenseSprite {
  const sprite = row.sprites.find((candidate) => candidate.slot === slot);
  if (!sprite) throw new Error(`missing live battler sprite slot ${slot}`);
  return sprite;
}

function battler(
  species: "MURKROW" | "ONIX",
  side: "player" | "opponent",
  sprite: DenseSprite,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: side === "player" ? { x: 72, y: 88 } : { x: 176, y: 42 },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function meanLookConfigFor(
  orientation: MeanLookOrientation,
  rows: readonly DenseRow[],
): SceneOnMeanLookConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const attacker = spriteAt(first, first.animationBattlers.spriteIds[playerAttacker ? 0 : 1]!);
  const target = spriteAt(first, first.animationBattlers.spriteIds[playerAttacker ? 1 : 0]!);
  return {
    move: "MEAN_LOOK",
    attacker: battler("MURKROW", attackerSide, attacker),
    target: battler("ONIX", targetSide, target),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    // Mean Look creates its eye from ANIM_ATTACKER, so the live attacker's
    // subpriority is the only source geometry needed by the reducer.
    animationProfile: { targetSubpriority: attacker.subpriority },
  };
}

function eye(row: DenseRow): DenseSprite | undefined {
  return row.sprites.find((sprite) =>
    sprite.template?.symbol === "gMeanLookEyeSpriteTemplate");
}

function auditDenseRows(
  orientation: MeanLookOrientation,
  rows: readonly DenseRow[],
): void {
  const config = meanLookConfigFor(orientation, rows);
  let oamLatches = 0;
  let matrixLatches = 0;
  let paletteLatches = 0;
  for (const [age, row] of rows.entries()) {
    const reduced = meanLookAtAge(
      age,
      config.target.geometry.animationCenter,
      config.animationProfile.targetSubpriority,
    );
    const rawEye = eye(row);
    if (reduced.sourceOffset !== row.scriptOffset
      || reduced.active !== row.animScriptActive
      || Boolean(reduced.eye) !== Boolean(rawEye)) {
      throw new Error(`${orientation} age ${age}: source reducer lifecycle mismatch`);
    }
    if (reduced.eye && rawEye) {
      if (reduced.eye.x !== rawEye.x || reduced.eye.y !== rawEye.y
        || reduced.eye.x2 !== rawEye.x2 || reduced.eye.y2 !== rawEye.y2
        || reduced.eye.subpriority !== rawEye.subpriority
        || reduced.eye.invisible !== rawEye.invisible) {
        throw new Error(`${orientation} age ${age}: eye OAM pose mismatch`);
      }
      if (age <= 94
        && (Math.trunc(0x10000 / reduced.eye.xScale) !== rawEye.matrix[0]
          || Math.trunc(0x10000 / reduced.eye.yScale) !== rawEye.matrix[3])) {
        throw new Error(`${orientation} age ${age}: eye affine mismatch`);
      }
    }
    if (age > 0) {
      const previous = rows[age - 1]!;
      if (JSON.stringify(row.hardwareOam) === JSON.stringify(previous.softwareOam)) oamLatches += 1;
      if (JSON.stringify(row.hardwarePalette) === JSON.stringify(previous.fadedPalette)) paletteLatches += 1;
    }
    if (age > 0) {
      const previous = rows[age - 1]!;
      if (JSON.stringify(row.hardwareMatrices) === JSON.stringify(previous.softwareMatrices)) matrixLatches += 1;
    }
  }
  if (oamLatches !== 170 || matrixLatches !== 170 || paletteLatches !== 169
    || rows.at(-1)?.animScriptActive !== false) {
    throw new Error(`${orientation}: incomplete Mean Look transfer/cleanup proof`);
  }
}

export function compareMeanLookRows(
  orientation: MeanLookOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(meanLookConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnMeanLookView({ ...stage, age });
    if (seam.age !== age || seam.sourceOffset !== row.scriptOffset) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(
      rgbRoot,
      `${String(row.frame).padStart(5, "0")}.rgb`,
    ));
    if (sha256(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw RGB hash`);
    let residual = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifyMeanLookFramebuffer(): readonly Readonly<{
  orientation: MeanLookOrientation;
  componentRows: 171;
  seamRows: 171;
  rawRgbRows: 171;
  framebufferRows: 171;
  residualPixels: 0;
}>[] {
  verifyMeanLookEvidence();
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const denseBytes = readFileSync(resolve(root, receipt.denseState));
    const archiveBytes = readFileSync(resolve(root, receipt.rawRgbArchive));
    if (sha256(denseBytes) !== receipt.denseStateSha256
      || sha256(archiveBytes) !== receipt.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: retained archive hash drifted`);
    }
    const rows = JSON.parse(gunzipSync(denseBytes).toString())
      .frames as DenseRow[];
    if (rows.length !== 171) throw new Error(`${orientation}: expected 171 rows`);
    auditDenseRows(orientation, rows);
    const scratch = createScratchDir(`pokebench-mean-look-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, receipt.rawRgbArchive), "-C", scratch]);
    const compared = compareMeanLookRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(
        `${orientation}: ${compared.matched}/171 residual ${compared.residualPixels}; ${compared.failures.join(",")}`,
      );
    }
    total += compared.matched;
    results.push({ orientation, componentRows: 171 as const, seamRows: 171 as const,
      rawRgbRows: 171 as const, framebufferRows: compared.matched as 171,
      residualPixels: compared.residualPixels as 0 });
  }
  if (total !== 342) throw new Error(`incomplete bilateral proof ${total}/342`);
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifyMeanLookFramebuffer()) {
    console.log(`${result.orientation}: component=171/171 seam=171/171 rawRGB=171/171 framebuffer=171/171 residual=0`);
  }
  console.log("MOVE_MEAN_LOOK: 342/342 exact with zero residual pixels");
}
