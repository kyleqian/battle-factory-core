/** Strict hermetic actual-core comparator for Hyper Beam's complete body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation, sceneOnHyperBeamView,
  type SceneOnHyperBeamConfig, type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/hyper-beam-evidence.json"), "utf8")) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export type HyperBeamOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Hyper Beam RGB ${filename}`);
}
export function hyperBeamRowsFor(orientation: HyperBeamOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  if (rows.length !== 280) throw new Error(`${orientation}: incomplete 280-row corpus`);
  return rows;
}

function gender(value: string): "male" | "female" | "none" {
  return value === "genderless" ? "none" : value as "male" | "female";
}

function battler(species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
  sprite: Row): SceneOnPresentationBattler {
  return { species, geometry: { side,
    spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
    animationCenter: { x: sprite.x, y: sprite.y },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  } };
}

function inferSpeed(sprite: Row, target: Readonly<{ x: number; y: number }>): number {
  for (let speed = 64; speed <= 95; speed += 1) {
    const dx = target.x - sprite.x, dy = target.y - sprite.y;
    const duration = Math.trunc((Math.abs(dx) << 4) / speed);
    let stepX = Math.trunc((Math.abs(dx) << 4) / duration);
    let stepY = Math.trunc((Math.abs(dy) << 4) / duration);
    stepX = dx < 0 ? stepX | 1 : stepX & ~1;
    stepY = dy < 0 ? stepY | 1 : stepY & ~1;
    if (sprite.data[0] === duration - 2 && sprite.data[1] === stepX
      && sprite.data[2] === stepY && sprite.data[3] === stepX * 2
      && sprite.data[4] === stepY * 2) return speed;
  }
  throw new Error(`cannot infer Hyper Beam speed for slot ${sprite.slot}`);
}

export function hyperBeamConfigFor(
  orientation: HyperBeamOrientation,
  rows = hyperBeamRowsFor(orientation),
): SceneOnHyperBeamConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  const targetPictureCenter = targetSide === "player"
    ? { x: first.battlerSprites.target.x, y: first.battlerSprites.target.y + 8 }
    : { x: first.battlerSprites.target.x, y: first.battlerSprites.target.y };
  const births: Row[] = [];
  for (let group = 0; group < 26; group += 1) {
    const age = 110 + group * 3;
    const previous = rows[age - 1]!.sprites as Row[];
    births.push(...rows[age]!.sprites.filter((sprite: Row) =>
      sprite.template?.symbol === "gHyperBeamOrbSpriteTemplate"
      && !previous.some((prior) => prior.slot === sprite.slot
        && prior.template?.symbol === sprite.template.symbol)));
  }
  if (births.length !== 52) throw new Error(`${orientation}: allocator evidence`);
  const attackerPictureCenter = {
    x: births[0]!.x + (attackerSide === "player" ? -20 : 20), y: births[0]!.y,
  };
  return {
    move: "HYPER_BEAM",
    attacker: battler("AERODACTYL", attackerSide, first.battlerSprites.attacker),
    target: battler("ONIX", targetSide, first.battlerSprites.target),
    fieldProfile: {
      playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender),
    },
    animationGeometry: {
      attackerPictureCenter, targetPictureCenter,
      attackerRestOffset: { x2: first.battlerSprites.attacker.x2,
        y2: first.battlerSprites.attacker.y2 },
      targetRestOffset: { x2: first.battlerSprites.target.x2,
        y2: first.battlerSprites.target.y2 },
    },
    animationProfile: {
      orbs: births.map((sprite) => ({
        animation: sprite.animNum, speed: inferSpeed(sprite, targetPictureCenter),
        phase: sprite.data[5] - 48 & 0xff, slot: sprite.slot,
        persistentOrder: rows[110 + Math.floor(births.indexOf(sprite) / 2) * 3]!
          .spriteOrder.indexOf(sprite.slot),
      })),
      attackerSubpriority: first.battlerSprites.attacker.subpriority,
      targetSubpriority: first.battlerSprites.target.subpriority,
      spriteOrderSeed: rows[109]!.spriteOrder,
    },
  };
}

function componentMismatches(row: Row, view: ReturnType<typeof sceneOnHyperBeamView>): string[] {
  const mismatches: string[] = [];
  const sourceOrbs = row.sprites.filter((sprite: Row) =>
    sprite.template?.symbol === "gHyperBeamOrbSpriteTemplate");
  if (sourceOrbs.length !== view.orbs.length) mismatches.push("orb-count");
  for (const orb of view.orbs) {
    const source = sourceOrbs.find((sprite: Row) => sprite.slot === orb.slot);
    if (!source || source.x !== orb.x || source.y !== orb.y || source.x2 !== orb.x2
      || source.y2 !== orb.y2 || source.animNum !== orb.animation
      || source.subpriority !== orb.subpriority
      || JSON.stringify(source.matrix) !== JSON.stringify(orb.matrix)) {
      mismatches.push(`orb-${orb.index}`);
    }
  }
  const attacker = row.battlerSprites.attacker, target = row.battlerSprites.target;
  const attackerRest = view.age < 71 ? view.attacker.geometry.side === "opponent" ? 0 : 0 : 0;
  if (attacker.x2 - attackerRest !== view.attackerOffset.x2
    || attacker.y2 !== view.attackerOffset.y2) mismatches.push("attacker-shake");
  const targetRest = view.age < 125 ? view.target.geometry.side === "opponent" ? 1 : 0 : 0;
  if (target.x2 - targetRest !== view.targetOffset.x2 || target.y2 !== view.targetOffset.y2) {
    mismatches.push("target-shake");
  }
  if (row.animScriptActive !== view.active) mismatches.push("active");
  return [...new Set(mismatches)];
}

export function inspectHyperBeamFramebuffer(): readonly Record<string, unknown>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const rows = hyperBeamRowsFor(orientation), config = hyperBeamConfigFor(orientation, rows);
    const stage = createSceneOnMovePresentation(config), item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: RGB archive hash`);
    const scratch = createScratchDir(`pokebench-hyper-beam-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const view = sceneOnHyperBeamView({ ...stage, age });
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
        residual += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (!residual) zeroRows += 1;
      residualPixels += residual; peakResidualPixels = Math.max(peakResidualPixels, residual);
      if (residual || mismatches.length) failures.push({ age, frame: row.frame,
        residualPixels: residual, bounds: residual ? [minX, minY, maxX, maxY] : null,
        componentMismatches: mismatches });
    }
    return { orientation, totalRows: rows.length, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, failures };
  });
}

export function inspectHyperBeamAlteredControl(): Record<string, unknown> {
  const base = hyperBeamConfigFor("player-back");
  const altered: SceneOnHyperBeamConfig = { ...base,
    attacker: { ...base.attacker, species: "GOLDUCK", geometry: { ...base.attacker.geometry,
      side: "opponent", spriteCorner: { x: 143, y: 13 }, animationCenter: { x: 175, y: 45 } } },
    target: { ...base.target, species: "GRAVELER", geometry: { ...base.target.geometry,
      side: "player", spriteCorner: { x: 37, y: 55 }, animationCenter: { x: 69, y: 87 } } },
    animationGeometry: { attackerPictureCenter: { x: 175, y: 45 },
      targetPictureCenter: { x: 69, y: 87 }, attackerRestOffset: { x2: 0, y2: 0 },
      targetRestOffset: { x2: 0, y2: 0 } },
    animationProfile: { ...base.animationProfile,
      orbs: base.animationProfile.orbs.map((orb, index) => ({ ...orb,
        slot: orb.slot + 20, persistentOrder: 51 - index })),
      spriteOrderSeed: [...base.animationProfile.spriteOrderSeed].reverse() },
  };
  const frame = (config: SceneOnHyperBeamConfig) => render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 150 } });
  const alteredView = sceneOnHyperBeamView({ ...createSceneOnMovePresentation(altered), age: 150 });
  return { species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: altered.animationGeometry,
    allocator: alteredView.orbs.map((orb) => [orb.slot, orb.persistentOrder]),
    baseFramebufferSha256: sha(frame(base)), alteredFramebufferSha256: sha(frame(altered)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectHyperBeamFramebuffer(),
    alteredControl: inspectHyperBeamAlteredControl() }, null, 2));
}
