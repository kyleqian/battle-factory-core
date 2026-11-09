/** Strict hermetic actual-core comparator for Aurora Beam's complete body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnAuroraBeamView,
  type SceneOnAuroraBeamConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(
  root, "tools/compare/fixtures/aurora-beam-evidence.json",
), "utf8")) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export type AuroraBeamOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Aurora Beam RGB ${filename}`);
}

export function auroraBeamRowsFor(orientation: AuroraBeamOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  if (rows.length !== 216) throw new Error(`${orientation}: incomplete 216-row corpus`);
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
  return { species, geometry: { side,
    spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
    animationCenter: { x: sprite.x, y: sprite.y },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  } };
}

export function auroraBeamConfigFor(
  orientation: AuroraBeamOrientation,
  rows = auroraBeamRowsFor(orientation),
): SceneOnAuroraBeamConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  const births = Array.from({ length: 40 }, (_, index) => {
    const age = 42 + index * 3;
    return rows[age]!.sprites.find((sprite: Row) =>
      sprite.template?.symbol === "gAuroraBeamRingSpriteTemplate" && sprite.data[0] === 15);
  });
  if (births.some((ring) => !ring)) throw new Error(`${orientation}: allocator evidence`);
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  return {
    move: "AURORA_BEAM",
    attacker: battler("SEADRA", attackerSide, first.battlerSprites.attacker),
    target: battler("ONIX", targetSide, first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender),
    },
    animationGeometry: {
      attackerRingOrigin: { x: births[0]!.x, y: births[0]!.y },
      targetPictureCenter: playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 },
      targetRestOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 },
    },
    animationProfile: {
      ringSlots: births.map((ring) => ring!.slot),
      ringMatrixIds: births.map((ring) => ring!.matrixNum),
      ringSubpriority: births[0]!.subpriority,
      spriteOrderSeed: first.spriteOrder,
    },
  };
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function componentMismatches(
  row: Row,
  view: ReturnType<typeof sceneOnAuroraBeamView>,
): string[] {
  const mismatches: string[] = [];
  const sourceRings = row.sprites.filter((sprite: Row) =>
    sprite.template?.symbol === "gAuroraBeamRingSpriteTemplate");
  if (sourceRings.length !== view.rings.length) mismatches.push("ring-count");
  for (const ring of view.rings) {
    const source = sourceRings.find((sprite: Row) => sprite.slot === ring.slot);
    if (!source || source.x + source.x2 !== ring.x || source.y + source.y2 !== ring.y
      || source.matrixNum !== ring.matrixId || !same(source.matrix, ring.matrix)
      || source.animNum !== ring.tileFrame) mismatches.push(`ring-${ring.index}`);
  }
  const target = row.battlerSprites.target;
  const rest = view.age < 54 ? view.target.geometry.side === "opponent" ? 1 : 0 : 0;
  if (target.x2 - rest !== view.targetOffset.x2 || target.y2 !== view.targetOffset.y2) {
    mismatches.push("target-shake");
  }
  const bg = view.age >= 23 && view.age < 195 ? "aurora" : "field";
  if (view.background !== bg) mismatches.push("background");
  if (row.registers.bldy !== view.fadeY) mismatches.push("fade-y");
  if (row.animScriptActive !== view.active) mismatches.push("active");
  return [...new Set(mismatches)];
}

export function inspectAuroraBeamFramebuffer(): readonly Record<string, unknown>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const rows = auroraBeamRowsFor(orientation);
    const config = auroraBeamConfigFor(orientation, rows);
    const stage = createSceneOnMovePresentation(config);
    const item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: RGB archive hash`);
    const scratch = createScratchDir(`pokebench-aurora-beam-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const view = sceneOnAuroraBeamView({ ...stage, age });
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
      if (residual || mismatches.length) failures.push({ age, frame: row.frame,
        residualPixels: residual, bounds: residual ? [minX, minY, maxX, maxY] : null,
        componentMismatches: mismatches });
    }
    return { orientation, totalRows: rows.length, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, failures };
  });
}

export function inspectAuroraBeamAlteredControl(): Record<string, unknown> {
  const base = auroraBeamConfigFor("player-back");
  const altered: SceneOnAuroraBeamConfig = {
    ...base,
    attacker: { ...base.attacker, species: "GOLDUCK", geometry: {
      ...base.attacker.geometry, side: "opponent", spriteCorner: { x: 143, y: 13 },
      animationCenter: { x: 175, y: 45 },
    } },
    target: { ...base.target, species: "GRAVELER", geometry: {
      ...base.target.geometry, side: "player", spriteCorner: { x: 37, y: 55 },
      animationCenter: { x: 69, y: 87 },
    } },
    animationGeometry: { attackerRingOrigin: { x: 155, y: 45 },
      targetPictureCenter: { x: 69, y: 87 }, targetRestOffset: { x2: 0, y2: 0 } },
    animationProfile: { ...base.animationProfile,
      ringSlots: base.animationProfile.ringSlots.map((slot) => slot + 12),
      ringMatrixIds: base.animationProfile.ringMatrixIds.map((matrix) => (matrix + 7) % 32),
      ringSubpriority: 27,
      spriteOrderSeed: [...base.animationProfile.spriteOrderSeed].reverse(),
    },
  };
  const baseStage = createSceneOnMovePresentation(base);
  const alteredStage = createSceneOnMovePresentation(altered);
  const frame = (stage: typeof baseStage) => render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age: 100 } });
  const alteredView = sceneOnAuroraBeamView({ ...alteredStage, age: 100 });
  return { species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: altered.animationGeometry,
    allocator: { slots: alteredView.rings.map((ring) => ring.slot),
      matrices: alteredView.rings.map((ring) => ring.matrixId),
      order: altered.animationProfile.spriteOrderSeed },
    baseFramebufferSha256: sha(frame(baseStage)), alteredFramebufferSha256: sha(frame(alteredStage)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectAuroraBeamFramebuffer(),
    alteredControl: inspectAuroraBeamAlteredControl() }, null, 2));
}
