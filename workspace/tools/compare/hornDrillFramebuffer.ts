/** Strict hermetic actual-core comparator for the complete Horn Drill body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnHornDrillView,
  type SceneOnHornDrillConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/horn-drill-evidence.json"), "utf8",
)) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export type HornDrillOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Horn Drill RGB ${filename}`);
}

export function hornDrillRowsFor(orientation: HornDrillOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  const expected = orientation === "player-back" ? 193 : 192;
  if (rows.length !== expected) throw new Error(`${orientation}: incomplete ${expected}-row corpus`);
  return rows;
}

function gender(value: string): "male" | "female" | "none" {
  return value === "genderless" ? "none" : value as "male" | "female";
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

export function hornDrillConfigFor(
  orientation: HornDrillOrientation,
  rows = hornDrillRowsFor(orientation),
): SceneOnHornDrillConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  const horn = rows[62]!.sprites.find((sprite: Row) =>
    sprite.template?.symbol === "gHornHitSpriteTemplate");
  const impacts = Array.from({ length: 11 }, (_, index) => {
    const row = rows[74 + index * 6]!;
    const args = [[0, 0], [0, 2], [-4, 3], [-8, -5], [4, -12], [16, 0],
      [5, 18], [-17, 12], [-21, -15], [8, -27], [32, 0]][index]!;
    const sign = playerAttacker ? 1 : -1;
    const center = playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 };
    return row.sprites.find((sprite: Row) =>
      sprite.template?.symbol === "gFlashingHitSplatSpriteTemplate"
      && sprite.x === center.x + args[0] * sign && sprite.y === center.y + args[1]);
  });
  if (!horn || impacts.some((impact) => !impact)) throw new Error(`${orientation}: allocator evidence`);
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  return {
    move: "HORN_DRILL",
    attacker: battler("SEAKING", attackerSide, first.battlerSprites.attacker),
    target: battler("ONIX", targetSide, first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender),
    },
    animationGeometry: {
      attackerCenter: { x: first.battlerSprites.attacker.x, y: first.battlerSprites.attacker.y },
      targetPictureCenter: playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
      attackerRestOffset: { x2: first.battlerSprites.attacker.x2, y2: first.battlerSprites.attacker.y2 },
      targetRestOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 },
    },
    animationProfile: {
      hornSlot: horn.slot, hornMatrixId: horn.matrixNum,
      impactSlots: impacts.map((impact) => impact!.slot),
      impactMatrixIds: impacts.map((impact) => impact!.matrixNum),
      spriteOrderSeed: [3, 4, 5], effectSubpriority: impacts[0]!.subpriority,
    },
  };
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function componentMismatches(row: Row, view: ReturnType<typeof sceneOnHornDrillView>): string[] {
  const mismatches: string[] = [];
  const attacker = row.battlerSprites.attacker;
  const target = row.battlerSprites.target;
  const ag = view.attacker.geometry;
  const tg = view.target.geometry;
  const config = view;
  if (attacker.x2 - (view.age < 74 ? 0 : 0) !== config.attackerOffset.x2) mismatches.push("attacker-x2");
  if (attacker.y2 !== config.attackerOffset.y2) mismatches.push("attacker-y2");
  if (!same(attacker.matrix, config.attackerMatrix)) mismatches.push("attacker-matrix");
  const targetRest = view.target.species === "ONIX" && tg.side === "opponent" ? 1 : 0;
  if (target.x2 - targetRest !== config.targetOffset.x2) mismatches.push("target-x2");
  const horn = row.sprites.find((sprite: Row) => sprite.template?.symbol === "gHornHitSpriteTemplate");
  if (Boolean(horn) !== Boolean(config.horn)) mismatches.push("horn-count");
  if (horn && config.horn && (horn.x !== config.horn.x || horn.y !== config.horn.y
    || horn.slot !== config.horn.slot)) mismatches.push("horn-state");
  const sourceImpacts = row.sprites.filter((sprite: Row) =>
    sprite.template?.symbol === "gFlashingHitSplatSpriteTemplate");
  if (sourceImpacts.length !== config.impacts.length) mismatches.push("impact-count");
  for (const impact of config.impacts) {
    const source = sourceImpacts.find((sprite: Row) => sprite.slot === impact.slot);
    if (!source || source.x !== impact.x || source.y !== impact.y
      || source.invisible !== impact.invisible || !same(source.matrix, impact.matrix)) {
      mismatches.push(`impact-${impact.index}`);
    }
  }
  const scrollAge = view.age >= 27 && view.age <= 172 ? view.age - 26 : 0;
  const scrollSign = view.attacker.geometry.side === "player" ? -1 : 1;
  const expectedHofs = scrollAge ? (scrollSign * 9 * scrollAge) & 0x1ff : 0;
  const expectedVofs = scrollAge ? (-scrollSign * 3 * scrollAge) & 0x1ff : 0;
  if (row.registers.bg3hofs !== expectedHofs
    || row.registers.bg3vofs !== expectedVofs) mismatches.push("bg-scroll");
  if (row.animScriptActive !== config.active) mismatches.push("active");
  void ag;
  return [...new Set(mismatches)];
}

export function inspectHornDrillFramebuffer(): readonly Record<string, unknown>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const rows = hornDrillRowsFor(orientation);
    const config = hornDrillConfigFor(orientation, rows);
    const stage = createSceneOnMovePresentation(config);
    const item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: RGB archive hash`);
    const scratch = createScratchDir(`pokebench-horn-drill-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const view = sceneOnHornDrillView({ ...stage, age });
      const mismatches = componentMismatches(row, view);
      if (!mismatches.length) componentExactRows += 1;
      const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } };
      const app = render(engine);
      const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
      let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (app[pixel * 4] === raw[pixel * 3] && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
          && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
        residual += 1;
        const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (!residual) zeroRows += 1;
      residualPixels += residual;
      peakResidualPixels = Math.max(peakResidualPixels, residual);
      if (residual || mismatches.length) failures.push({ age, frame: row.frame, residualPixels: residual,
        bounds: residual ? [minX, minY, maxX, maxY] : null, componentMismatches: mismatches });
    }
    return { orientation, totalRows: rows.length, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, failures };
  });
}

export function inspectHornDrillAlteredControl(): Record<string, unknown> {
  const base = hornDrillConfigFor("player-back");
  const altered: SceneOnHornDrillConfig = {
    ...base,
    attacker: { ...base.attacker, species: "GOLDUCK",
      geometry: { ...base.attacker.geometry, spriteCorner: { x: 29, y: 61 },
        animationCenter: { x: 61, y: 93 } } },
    target: { ...base.target, species: "GRAVELER",
      geometry: { ...base.target.geometry, spriteCorner: { x: 151, y: 7 },
        animationCenter: { x: 183, y: 39 } } },
    animationGeometry: { ...base.animationGeometry, attackerCenter: { x: 61, y: 93 },
      targetPictureCenter: { x: 183, y: 39 } },
    animationProfile: { ...base.animationProfile, hornSlot: 11, hornMatrixId: 7,
      impactSlots: base.animationProfile.impactSlots.map((slot) => slot + 12),
      impactMatrixIds: base.animationProfile.impactMatrixIds.map((matrix) => (matrix + 5) % 32),
      spriteOrderSeed: [17, 15, 16] },
  };
  const baseStage = createSceneOnMovePresentation(base);
  const alteredStage = createSceneOnMovePresentation(altered);
  const frame = (stage: typeof baseStage) => render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 80 } });
  const alteredView = sceneOnHornDrillView({ ...alteredStage, age: 80 });
  return {
    species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: altered.animationGeometry,
    allocator: { hornSlot: alteredView.horn?.slot ?? altered.animationProfile.hornSlot,
      impactSlots: alteredView.impacts.map((impact) => impact.slot),
      impactMatrixIds: alteredView.impacts.map((impact) => impact.matrixId),
      order: altered.animationProfile.spriteOrderSeed },
    baseFramebufferSha256: sha(frame(baseStage)),
    alteredFramebufferSha256: sha(frame(alteredStage)),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectHornDrillFramebuffer(),
    alteredControl: inspectHornDrillAlteredControl() }, null, 2));
}
