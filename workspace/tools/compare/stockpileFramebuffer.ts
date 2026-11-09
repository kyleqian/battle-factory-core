/** Strict source-component and actual-core framebuffer verifier for Stockpile. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnStockpileView,
  type SceneOnPresentationBattler,
  type SceneOnStockpileConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/stockpile-evidence.json"),
  "utf8",
)) as Record<string, any>;

export type StockpileOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Stockpile RGB ${filename}`);
}

export function stockpileRowsFor(orientation: StockpileOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation} dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation} probe hash`);
  return JSON.parse(json.toString("utf8")).frames;
}

function spriteAt(row: Row, slot: number): Row {
  const sprite = row.sprites.find((candidate: Row) => candidate.slot === slot);
  if (!sprite) throw new Error(`missing Stockpile sprite ${slot}`);
  return sprite;
}

function battler(species: "PELIPPER" | "DELCATTY", side: "player" | "opponent", sprite: Row): SceneOnPresentationBattler {
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

export function stockpileConfigFor(
  orientation: StockpileOrientation,
  rows: readonly Row[],
): SceneOnStockpileConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attacker = spriteAt(first, playerAttacker ? 6 : 8);
  const target = spriteAt(first, playerAttacker ? 8 : 6);
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  return {
    move: "STOCKPILE",
    attacker: battler("PELIPPER", playerAttacker ? "player" : "opponent", attacker),
    target: battler("DELCATTY", playerAttacker ? "opponent" : "player", target),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: player.gender === "genderless" ? "none" : player.gender,
      opponentGender: opponent.gender === "genderless" ? "none" : opponent.gender,
    },
    attackerPictureCenter: playerAttacker ? { x: 72, y: 94 } : { x: 176, y: 36 },
    attackerPictureYOffset: playerAttacker ? 6 : 4,
    animationProfile: {
      orbSlotPool: [3, 4, 5, 7, 9],
      orbMatrixPool: [0, 3, 4, 5, 6],
      spriteOrderSeed: [3, 4, 5, 9, 7],
      attackerSubpriority: attacker.subpriority,
    },
    attackerShadowAtEntry: !playerAttacker,
  };
}

function blendBgr555(color: number, coefficient: number): number {
  const r = color & 31;
  const g = (color >> 5) & 31;
  const b = (color >> 10) & 31;
  return (r + Math.floor((31 - r) * coefficient / 16))
    | ((g + Math.floor((31 - g) * coefficient / 16)) << 5)
    | ((b + Math.floor((31 - b) * coefficient / 16)) << 10);
}

function assertComponentRow(
  orientation: StockpileOrientation,
  age: number,
  row: Row,
  config: SceneOnStockpileConfig,
): void {
  const stage = createSceneOnMovePresentation(config);
  const seam = sceneOnStockpileView({ ...stage, age });
  if (seam.sourceOffset !== row.scriptOffset || seam.sourceWait !== row.scriptWait
    || seam.scriptActive !== row.animScriptActive) {
    throw new Error(`${orientation} age ${age}: script seam mismatch`);
  }
  const attackerSlot = orientation === "player-back" ? 6 : 8;
  const attacker = spriteAt(row, attackerSlot);
  if (JSON.stringify(seam.attackerMatrix) !== JSON.stringify(attacker.matrix)
    || seam.attackerY2 !== attacker.y2) {
    throw new Error(`${orientation} age ${age}: deform mismatch`);
  }
  const sourceOrbs = row.sprites.filter((sprite: Row) =>
    sprite.template?.symbol === "gStockpileAbsorptionOrbSpriteTemplate");
  if (sourceOrbs.length !== seam.orbs.length) throw new Error(`${orientation} age ${age}: orb count`);
  for (const orb of seam.orbs) {
    const source = sourceOrbs.find((candidate: Row) => candidate.slot === orb.slot);
    if (!source || source.x !== orb.x || source.y !== orb.y || source.x2 !== orb.x2
      || source.y2 !== orb.y2 || source.subpriority !== orb.subpriority
      || source.matrixNum !== orb.matrixNum || JSON.stringify(source.matrix) !== JSON.stringify(orb.matrix)
      || JSON.stringify(source.data) !== JSON.stringify(orb.data)) {
      throw new Error(`${orientation} age ${age}: orb ${orb.index} mismatch`);
    }
  }
  const ownerBySlot = new Map(seam.orbs.map((orb) => [orb.slot, orb.index]));
  const expectedOrder = row.spriteOrder.slice().reverse()
    .map((slot: number) => ownerBySlot.get(slot)).filter((owner: number | undefined) => owner !== undefined);
  if (JSON.stringify(expectedOrder) !== JSON.stringify(seam.orbPainterOrder)) {
    throw new Error(`${orientation} age ${age}: order mismatch`);
  }
  const paletteNum = attacker.attr[2] >> 12;
  const start = 256 + paletteNum * 16;
  for (let index = start; index < start + 16; index += 1) {
    if (row.fadedPalette[index] !== blendBgr555(row.unfadedPalette[index], seam.attackerPaletteY)) {
      throw new Error(`${orientation} age ${age}: palette coefficient mismatch`);
    }
  }
}

export function compareStockpileRows(
  orientation: StockpileOrientation,
  rows: readonly Row[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const config = stockpileConfigFor(orientation, rows);
  const stage = createSceneOnMovePresentation(config);
  let matched = 0;
  let residualPixels = 0;
  const failures: string[] = [];
  for (const [age, row] of rows.entries()) {
    assertComponentRow(orientation, age, row, config);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
    let residual = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3] && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifyStockpileFramebuffer(): readonly Readonly<{
  orientation: StockpileOrientation; componentRows: 99; seamRows: 99;
  rawRgbRows: 99; framebufferRows: 99; residualPixels: 0;
}>[] {
  const output = [];
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = stockpileRowsFor(orientation);
    if (rows.length !== 99) throw new Error(`${orientation} incomplete window`);
    const item = fixture.orientations[orientation];
    const archive = readFileSync(resolve(root, item.rawRgbArchive));
    if (sha(archive) !== item.rawRgbArchiveSha256) throw new Error(`${orientation} RGB archive hash`);
    const scratch = createScratchDir(`pokebench-stockpile-${orientation}-`);
    execFileSync("tar", ["-xzf", resolve(root, item.rawRgbArchive), "-C", scratch]);
    const compared = compareStockpileRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(`${orientation}: ${compared.matched}/99 residual ${compared.residualPixels}; `
        + compared.failures.slice(0, 30).join(","));
    }
    output.push({ orientation, componentRows: 99 as const, seamRows: 99 as const,
      rawRgbRows: 99 as const, framebufferRows: 99 as const, residualPixels: 0 as const });
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyStockpileFramebuffer(), null, 2));
}
