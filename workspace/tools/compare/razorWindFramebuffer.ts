/** Hermetic reducer/seam/actual-core diagnostic for both retained Razor Wind bodies. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnRazorWindView,
  type SceneOnPresentationBattler,
  type SceneOnRazorWindConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import type { RazorWindBody, RazorWindEffect } from "../../src/animation/razorWind.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/razor-wind-evidence.json"),
  "utf8",
)) as Record<string, any>;
const sha = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export type RazorWindOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
type Region = "effect" | "battler" | "text-healthbox" | "field";

export interface RazorWindResidualRow {
  readonly body: RazorWindBody;
  readonly age: number;
  readonly frame: number;
  readonly residualPixels: number;
  readonly bounds: readonly [number, number, number, number] | null;
  readonly regions: Readonly<Record<Region, number>>;
  readonly componentMismatches: readonly string[];
}

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Razor Wind RGB ${filename}`);
}

export function razorWindRowsFor(orientation: RazorWindOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  if (rows.length !== 119) throw new Error(`${orientation}: incomplete 119-row corpus`);
  return rows;
}

function battler(
  species: SceneOnPresentationBattler["species"],
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

function gender(value: string): "male" | "female" | "none" {
  return value === "genderless" ? "none" : value as "male" | "female";
}

function bodyRows(rows: readonly Row[], body: RazorWindBody): readonly Row[] {
  return body === "setup" ? rows.slice(0, 46) : rows.slice(46);
}

function ownedSprites(row: Row): readonly Row[] {
  return row.sprites.filter((sprite: Row) =>
    sprite.template?.symbol === "gRazorWindTornadoSpriteTemplate"
    || sprite.template?.symbol === "gAirWaveCrescentSpriteTemplate");
}

export function razorWindConfigFor(
  orientation: RazorWindOrientation,
  body: RazorWindBody,
  rows = razorWindRowsFor(orientation),
): SceneOnRazorWindConfig {
  const first = bodyRows(rows, body)[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const setupSprites = ownedSprites(rows[4]!);
  const unleashSprites = ownedSprites(rows[46 + 18]!);
  if (setupSprites.length !== 3 || unleashSprites.length !== 3) {
    throw new Error(`${orientation}: incomplete allocator evidence`);
  }
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  return {
    move: "RAZOR_WIND",
    body,
    attacker: battler("NUZLEAF", attackerSide, first.battlerSprites.attacker),
    target: battler("ONIX", targetSide, first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender),
      opponentGender: gender(opponent.gender),
    },
    attackerPictureCenter: playerAttacker ? { x: 72, y: 98 } : { x: 176, y: 48 },
    targetPictureCenter: playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
    targetRestOffset: {
      x2: first.battlerSprites.target.x2,
      y2: first.battlerSprites.target.y2,
    },
    animationProfile: {
      tornadoSpriteSlots: setupSprites.map((sprite) => sprite.slot) as [number, number, number],
      tornadoMatrixIds: setupSprites.map((sprite) => sprite.matrixNum) as [number, number, number],
      crescentSpriteSlots: unleashSprites.map((sprite) => sprite.slot) as [number, number, number],
      crescentMatrixIds: [16, 8, 0],
      spriteOrderSeed: [...new Set([...setupSprites, ...unleashSprites]
        .map((sprite) => sprite.slot))],
      effectPriority: 1,
      effectSubpriority: setupSprites[0]!.subpriority,
    },
  };
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sourceFrame(sprite: Row): number {
  return sprite.animCmdIndex as number;
}

function componentMismatches(row: Row, nextRow: Row | undefined, view: RazorWindEffect): string[] {
  const mismatches: string[] = [];
  const source = ownedSprites(row);
  if (source.length !== view.sprites.length) mismatches.push("sprite-count");
  for (const sprite of view.sprites) {
    const actual = source.find((candidate) => candidate.slot === sprite.slot);
    if (!actual) { mismatches.push(`sprite-${sprite.index}-missing`); continue; }
    for (const key of ["x", "y", "x2", "y2", "subpriority"] as const) {
      if (actual[key] !== sprite[key]) mismatches.push(`sprite-${sprite.index}-${key}`);
    }
    if (!same(actual.matrix, sprite.matrix)) mismatches.push(`sprite-${sprite.index}-matrix`);
    if (sourceFrame(actual) !== sprite.frame) mismatches.push(`sprite-${sprite.index}-cell`);
    if (actual.callback?.symbol !== sprite.callback) mismatches.push(`sprite-${sprite.index}-callback`);
    const attr1 = actual.attr[1] as number;
    if (Boolean(attr1 & 0x1000) !== sprite.hFlip) mismatches.push(`sprite-${sprite.index}-hflip`);
    if (Boolean(attr1 & 0x2000) !== sprite.vFlip) mismatches.push(`sprite-${sprite.index}-vflip`);
  }
  const ownerSlots = new Set(view.sprites.map((sprite) => sprite.slot));
  const expectedOrder = row.spriteOrder.slice().reverse()
    .filter((slot: number) => ownerSlots.has(slot));
  const nextOrder = nextRow?.spriteOrder.slice().reverse()
    .filter((slot: number) => ownerSlots.has(slot));
  if (!same(expectedOrder, view.painterOrder) && !same(nextOrder, view.painterOrder)) {
    mismatches.push("painter-order");
  }

  const target = row.battlerSprites.target;
  const targetRest = view.body === "setup" || view.age < 37
    ? view.targetRestOffset : { x2: 0, y2: 0 };
  if (target.x2 - targetRest.x2 !== view.targetOffset.x2
    || target.y2 - targetRest.y2 !== view.targetOffset.y2) {
    mismatches.push("shake-target-offset");
  }
  const taskActive = row.tasks.some((task: Row) => task.func?.symbol === "AnimTask_ShakeMon2_Step");
  if (taskActive !== Boolean(view.shakeTask)) mismatches.push("shake-task");
  const sourceMonbg = Boolean(target.flags & 4);
  if (sourceMonbg !== view.registers.monbg) mismatches.push("monbg");
  const sourceAlpha = row.registers.bldcnt !== 0
    ? [row.registers.bldalpha & 31, (row.registers.bldalpha >> 8) & 31]
    : null;
  if (!same(sourceAlpha, view.registers.alpha)) mismatches.push("alpha");
  const tags = new Set(row.tileTags.slice(0, 64));
  if (tags.has(10009) !== view.resources.gust) mismatches.push("resource-gust");
  if (tags.has(10154) !== view.resources.airWave2) mismatches.push("resource-air-wave-2");
  if (tags.has(10135) !== view.resources.impact) mismatches.push("resource-impact");
  if (view.active !== row.animScriptActive) mismatches.push("script-active");
  return [...new Set(mismatches)];
}

function inRect(x: number, y: number, left: number, top: number, width: number, height: number): boolean {
  return x >= left && x < left + width && y >= top && y < top + height;
}

function regionFor(x: number, y: number, row: Row): Region {
  if (y >= 112 || inRect(x, y, 112, 16, 128, 40) || inRect(x, y, 0, 72, 128, 40)) {
    return "text-healthbox";
  }
  for (const sprite of ownedSprites(row)) {
    const radius = sprite.template.symbol === "gRazorWindTornadoSpriteTemplate" ? 40 : 24;
    if (inRect(x, y, sprite.x + sprite.x2 - radius, sprite.y + sprite.y2 - radius,
      radius * 2, radius * 2)) return "effect";
  }
  for (const sprite of [row.battlerSprites.attacker, row.battlerSprites.target]) {
    if (inRect(x, y, sprite.x + sprite.x2 - 32, sprite.y + sprite.y2 - 32, 64, 64)) {
      return "battler";
    }
  }
  return "field";
}

export function compareRazorWindRows(
  orientation: RazorWindOrientation,
  rows: readonly Row[],
  rgbRoot: string,
): Readonly<{
  zeroRows: number;
  residualPixels: number;
  peakResidualPixels: number;
  componentExactRows: number;
  regions: Readonly<Record<Region, number>>;
  rows: readonly RazorWindResidualRow[];
}> {
  const configs = {
    setup: razorWindConfigFor(orientation, "setup", rows),
    unleash: razorWindConfigFor(orientation, "unleash", rows),
  } as const;
  const stages = {
    setup: createSceneOnMovePresentation(configs.setup),
    unleash: createSceneOnMovePresentation(configs.unleash),
  } as const;
  let zeroRows = 0;
  let residualPixels = 0;
  let peakResidualPixels = 0;
  let componentExactRows = 0;
  const regions: Record<Region, number> = { effect: 0, battler: 0, "text-healthbox": 0, field: 0 };
  const diagnostics: RazorWindResidualRow[] = [];
  for (const [index, row] of rows.entries()) {
    const body: RazorWindBody = index < 46 ? "setup" : "unleash";
    const age = body === "setup" ? index : index - 46;
    const stage = stages[body];
    const seam = sceneOnRazorWindView({ ...stage, age });
    const mismatches = componentMismatches(row, rows[index + 1], seam);
    if (!mismatches.length) componentExactRows += 1;
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(rgbRoot, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${orientation} ${body} age ${age}: raw hash`);
    let residual = 0;
    let minX = 240, minY = 160, maxX = -1, maxY = -1;
    const rowRegions: Record<Region, number> = { effect: 0, battler: 0, "text-healthbox": 0, field: 0 };
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240, y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      const region = regionFor(x, y, row);
      rowRegions[region] += 1; regions[region] += 1;
    }
    if (residual === 0) zeroRows += 1;
    residualPixels += residual;
    peakResidualPixels = Math.max(peakResidualPixels, residual);
    diagnostics.push({ body, age, frame: row.frame, residualPixels: residual,
      bounds: residual ? [minX, minY, maxX, maxY] : null,
      regions: rowRegions, componentMismatches: mismatches });
  }
  return { zeroRows, residualPixels, peakResidualPixels, componentExactRows, regions,
    rows: diagnostics };
}

export function inspectRazorWindFramebuffer(): readonly Readonly<{
  orientation: RazorWindOrientation;
  totalRows: 119;
  zeroRows: number;
  residualPixels: number;
  peakResidualPixels: number;
  componentExactRows: number;
  regions: Readonly<Record<Region, number>>;
  bodies: Readonly<Record<RazorWindBody, Readonly<{
    rows: number; zeroRows: number; residualPixels: number; peakResidualPixels: number;
    componentExactRows: number;
  }>>>;
  failures: readonly RazorWindResidualRow[];
}>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: RGB archive hash`);
    }
    const scratch = createScratchDir(`pokebench-razor-wind-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    const compared = compareRazorWindRows(orientation, razorWindRowsFor(orientation), scratch);
    const body = (name: RazorWindBody) => {
      const rows = compared.rows.filter((row) => row.body === name);
      return { rows: rows.length, zeroRows: rows.filter((row) => row.residualPixels === 0).length,
        residualPixels: rows.reduce((sum, row) => sum + row.residualPixels, 0),
        peakResidualPixels: Math.max(...rows.map((row) => row.residualPixels)),
        componentExactRows: rows.filter((row) => row.componentMismatches.length === 0).length };
    };
    return { orientation, totalRows: 119 as const, zeroRows: compared.zeroRows,
      residualPixels: compared.residualPixels, peakResidualPixels: compared.peakResidualPixels,
      componentExactRows: compared.componentExactRows, regions: compared.regions,
      bodies: { setup: body("setup"), unleash: body("unleash") },
      failures: compared.rows.filter((row) => row.residualPixels || row.componentMismatches.length) };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(inspectRazorWindFramebuffer(), null, 2));
}
