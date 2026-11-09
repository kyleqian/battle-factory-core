/** Strict shared-production-framebuffer verifier for retained Defense Curl evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import monPicCoordsData from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };
import { defenseCurlAtAge } from "../../src/animation/defenseCurl.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDefenseCurlView,
  type SceneOnDefenseCurlConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/defense-curl-evidence.json",
  "utf8",
));

export type DefenseCurlOrientation = "player-back" | "opponent-front";

type DenseSprite = Readonly<{
  slot: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  matrix: readonly number[];
  subpriority: number;
  animCmdIndex: number;
  attr: readonly number[];
  template?: Readonly<{ symbol?: string }>;
}>;

type DenseMon = Readonly<{ species: number; hp: number; maxHp: number }>;

type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  scriptOffset: number | null;
  visualTaskCount: number;
  soundTaskCount: number;
  animScriptActive: boolean;
  animationBattlers: Readonly<{ attacker: number; spriteIds: readonly number[] }>;
  battlerSprites: Readonly<{ attacker: DenseSprite; target: DenseSprite }>;
  battlers: Readonly<{ player: DenseMon; opponent: DenseMon }>;
  sprites: readonly DenseSprite[];
  tasks: readonly Readonly<{ func?: Readonly<{ symbol?: string }> }> [];
  softwareOam: readonly string[];
  hardwareOam: readonly string[];
  softwareMatrices: readonly (readonly number[])[];
  hardwareMatrices: readonly (readonly number[])[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
}>;

type MonPicCoordsAsset = Readonly<{
  back: Readonly<Record<string, Readonly<{ yOffset: number }>>>;
  front: Readonly<Record<string, Readonly<{ yOffset: number }>>>;
}>;

const monPicCoords = monPicCoordsData as MonPicCoordsAsset;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function findRgb(root: string, filename: string): string {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      try {
        return findRgb(path, filename);
      } catch {
        continue;
      }
    }
    if (entry === filename) return path;
  }
  throw new Error(`missing ${filename} below ${root}`);
}

function battler(
  species: "PHANPY" | "ONIX",
  side: "player" | "opponent",
  sprite: DenseSprite,
  animationCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      // `x2/y2` remain distinct OAM state. The source OBJ canvas itself is
      // anchored by x/y minus its fixed 32px center, exactly like the normal
      // live battle-field draw path.
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

function spriteAt(row: DenseRow, slot: number): DenseSprite {
  const sprite = row.sprites.find((candidate) => candidate.slot === slot);
  if (!sprite) throw new Error(`missing live battler sprite slot ${slot}`);
  return sprite;
}

function sourceOrbCenter(side: "player" | "opponent"): Readonly<{ x: number; y: number }> {
  // `AnimSpriteOnMonPos` starts at the normal picture coordinate and consumes
  // Move_DEFENSE_CURL's literal argv `(0, 6, 0, 1)`.
  return side === "player" ? { x: 72, y: 86 } : { x: 176, y: 46 };
}

function picYOffset(species: "PHANPY" | "ONIX", side: "player" | "opponent"): number {
  const coords = side === "player" ? monPicCoords.back : monPicCoords.front;
  const value = coords[species]?.yOffset;
  if (value === undefined) throw new Error(`missing ${side} ${species} picture coordinates`);
  return value;
}

export function defenseCurlConfigFor(
  orientation: DefenseCurlOrientation,
  rows: readonly DenseRow[],
): SceneOnDefenseCurlConfig {
  const first = rows[0]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attackerIndex = attackerSide === "player" ? 0 : 1;
  const attacker = spriteAt(first, first.animationBattlers.spriteIds[attackerIndex]!);
  const target = spriteAt(first, first.animationBattlers.spriteIds[1 - attackerIndex]!);
  return {
    move: "DEFENSE_CURL",
    attacker: battler("PHANPY", attackerSide, attacker, sourceOrbCenter(attackerSide)),
    target: battler("ONIX", targetSide, target, sourceOrbCenter(targetSide)),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationProfile: {
      attackerPicYOffset: picYOffset("PHANPY", attackerSide),
      attackerSubpriority: attacker.subpriority,
    },
  };
}

function namedTask(row: DenseRow): boolean {
  return row.tasks.some((task) => task.func?.symbol === "AnimTask_DefenseCurlDeformMon");
}

function orb(row: DenseRow): DenseSprite | undefined {
  return row.sprites.find((sprite) => sprite.template?.symbol === "gEclipsingOrbSpriteTemplate");
}

function auditDenseRows(
  orientation: DefenseCurlOrientation,
  rows: readonly DenseRow[],
): void {
  const config = defenseCurlConfigFor(orientation, rows);
  let oamLatches = 0;
  let paletteLatches = 0;
  let matrixLatches = 0;
  for (const [age, row] of rows.entries()) {
    const body = defenseCurlAtAge(
      age,
      config.attacker.geometry.animationCenter,
      config.animationProfile,
    );
    const rawOrb = orb(row);
    if (body.sourceOffset !== row.scriptOffset
      || body.visualTaskCount !== row.visualTaskCount
      || body.soundTaskActive !== (row.soundTaskCount > 0)
      || body.deformation.active !== namedTask(row)
      || Boolean(body.orb) !== Boolean(rawOrb)) {
      throw new Error(`${orientation} age ${age}: source reducer lifecycle mismatch`);
    }
    if (body.deformation.active) {
      const attacker = row.battlerSprites.attacker;
      if (attacker.matrix[0] !== body.deformation.xScale
        || attacker.matrix[3] !== body.deformation.yScale
        || attacker.y2 !== body.deformation.y2) {
        throw new Error(`${orientation} age ${age}: source affine mismatch`);
      }
    }
    if (body.orb && rawOrb) {
      const hFlip = (rawOrb.attr[1]! & 0x1000) !== 0;
      if (rawOrb.slot !== body.orb.slot || rawOrb.x !== body.orb.x || rawOrb.y !== body.orb.y
        || rawOrb.subpriority !== body.orb.subpriority || hFlip !== body.orb.hFlip) {
        throw new Error(`${orientation} age ${age}: orb source state mismatch`);
      }
    }
    if (age > 0) {
      const previous = rows[age - 1]!;
      if (JSON.stringify(row.hardwareOam) === JSON.stringify(previous.softwareOam)) oamLatches += 1;
      if (JSON.stringify(row.hardwarePalette) === JSON.stringify(previous.fadedPalette)) paletteLatches += 1;
    }
    if (age > 1) {
      const priorMatrix = rows[age - 2]!;
      if (JSON.stringify(row.hardwareMatrices) === JSON.stringify(priorMatrix.softwareMatrices)) matrixLatches += 1;
    }
  }
  if (oamLatches !== 99 || paletteLatches !== 99 || matrixLatches !== 98
    || rows.at(-1)?.animScriptActive !== false) {
    throw new Error(`${orientation}: incomplete transfer/cleanup proof`);
  }
}

export function compareDefenseCurlRows(
  orientation: DefenseCurlOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(defenseCurlConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnDefenseCurlView({ ...stage, age });
    if (seam.age !== age || seam.visualTaskCount !== row.visualTaskCount) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
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

export function verifyDefenseCurlFramebuffer(): readonly Readonly<{
  orientation: DefenseCurlOrientation;
  componentRows: 100;
  seamRows: 100;
  rawRgbRows: 100;
  framebufferRows: 100;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const denseBytes = readFileSync(receipt.denseState);
    if (sha256(denseBytes) !== receipt.denseStateSha256
      || sha256(readFileSync(receipt.rawRgbArchive)) !== receipt.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: retained archive hash drifted`);
    }
    const rows = JSON.parse(gunzipSync(denseBytes).toString()).frames as DenseRow[];
    if (rows.length !== 100) throw new Error(`${orientation}: expected 100 rows`);
    auditDenseRows(orientation, rows);
    const scratch = createScratchDir(`pokebench-defense-curl-${orientation}-`);
    execFileSync("tar", ["-xzf", receipt.rawRgbArchive, "-C", scratch]);
    const compared = compareDefenseCurlRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(
        `${orientation}: ${compared.matched}/100 residual ${compared.residualPixels}; ${compared.failures.join(",")}`,
      );
    }
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 100 as const,
      seamRows: 100 as const,
      rawRgbRows: 100 as const,
      framebufferRows: compared.matched as 100,
      residualPixels: compared.residualPixels as 0,
    });
  }
  if (total !== 200) throw new Error(`incomplete bilateral proof ${total}/200`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyDefenseCurlFramebuffer()) {
    console.log(`${result.orientation}: component=100/100 seam=100/100 rawRGB=100/100 framebuffer=100/100 residual=0`);
  }
  console.log("MOVE_DEFENSE_CURL: 200/200 exact with zero residual pixels");
}
