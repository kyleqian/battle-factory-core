/** Strict hermetic actual-core comparator for Zap Cannon's complete body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnZapCannonView,
  type SceneOnZapCannonConfig, type SceneOnPresentationBattler } from
  "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/zap-cannon-evidence.json"), "utf8")) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export type ZapCannonOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
const symbols = new Set(["gZapCannonBallSpriteTemplate", "gZapCannonSparkSpriteTemplate",
  "gElectricitySpriteTemplate"]);

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Zap Cannon RGB ${filename}`);
}

export function zapCannonRowsFor(orientation: ZapCannonOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  if (rows.length !== 112) throw new Error(`${orientation}: incomplete corpus`);
  return rows;
}

function gender(value: string): "male" | "female" | "none" {
  return value === "genderless" ? "none" : value as "male" | "female";
}
function battler(species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
  sprite: Row): SceneOnPresentationBattler {
  return { species, geometry: { side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
    animationCenter: { x: sprite.x, y: sprite.y },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } } };
}
function allocation(row: Row, symbol: string, slot?: number, fresh = false) {
  const sprite = row.sprites.find((item: Row) => item.template?.symbol === symbol
    && (slot === undefined || item.slot === slot) && (!fresh || item.data[0] === 4));
  if (!sprite) throw new Error(`missing ${symbol} at ${row.frame}`);
  return { slot: sprite.slot, matrixNum: sprite.matrixNum,
    order: row.spriteOrder.indexOf(sprite.slot) };
}

export function zapCannonConfigFor(orientation: ZapCannonOrientation,
  rows = zapCannonRowsFor(orientation)): SceneOnZapCannonConfig {
  const first = rows[0]!, playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  const ballSprite = rows[7]!.sprites.find((s: Row) =>
    s.template?.symbol === "gZapCannonBallSpriteTemplate")!;
  const sparkSlots = [4, 5, 7, 9, 10, 11, 12, 13];
  const starts = orientation === "player-back" ? [7, 7, 7, 7, 7, 7, 8, 8]
    : [7, 7, 7, 7, 7, 7, 7, 8];
  const initialized = orientation === "player-back" ? starts : [7, 7, 7, 7, 7, 7, 8, 8];
  const arcBirths = Array.from({ length: 8 }, (_, index) => 57 + index * 4);
  const targetBattleCenter = targetSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 };
  return { move: "ZAP_CANNON",
    attacker: battler("FORRETRESS", attackerSide, first.battlerSprites.attacker),
    target: battler("SHUCKLE", targetSide, first.battlerSprites.target),
    fieldProfile: { playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender) },
    animationGeometry: {
      attackerPictureCenter: { x: ballSprite.x, y: ballSprite.y },
      targetPictureCenter: { x: ballSprite.data[2], y: ballSprite.data[4] },
      targetBattleCenter,
    },
    animationProfile: {
      ball: allocation(rows[7]!, "gZapCannonBallSpriteTemplate"),
      sparks: sparkSlots.map((slot, index) => ({
        ...allocation(rows[starts[index]!]!, "gZapCannonSparkSpriteTemplate", slot),
        visibleFrom: starts[index],
        initializedFrom: initialized[index],
      })),
      arcs: arcBirths.map((age) => allocation(rows[age]!, "gElectricitySpriteTemplate", undefined, true)),
    } };
}

function sourceTile(sprite: Row): number {
  return sprite.template.symbol === "gZapCannonBallSpriteTemplate"
    ? 0 : Math.trunc(((sprite.attr[2] & 1023) - 309) / 4);
}
function componentMismatches(row: Row, view: ReturnType<typeof sceneOnZapCannonView>): string[] {
  const source = row.sprites.filter((sprite: Row) => symbols.has(sprite.template?.symbol));
  const result: string[] = [];
  if (source.length !== view.sprites.length) result.push("count");
  for (const sprite of view.sprites) {
    const actual = source.find((item: Row) => item.slot === sprite.slot
      && (sprite.kind === "ball" ? item.template.symbol === "gZapCannonBallSpriteTemplate"
        : sprite.kind === "spark" ? item.template.symbol === "gZapCannonSparkSpriteTemplate"
          : item.template.symbol === "gElectricitySpriteTemplate"));
    if (!actual || actual.x !== sprite.x || actual.y !== sprite.y || actual.x2 !== sprite.x2
      || actual.y2 !== sprite.y2 || actual.subpriority !== sprite.subpriority
      || actual.matrixNum !== sprite.matrixNum || actual.invisible !== sprite.hidden
      || sourceTile(actual) !== sprite.tile
      || (sprite.kind === "spark" && JSON.stringify(actual.matrix) !== JSON.stringify(sprite.matrix))) {
      result.push(`${sprite.kind}-${sprite.index}`);
    }
  }
  const target = row.battlerSprites.target;
  if (target.x2 !== view.targetX2) result.push("target-shake");
  return [...new Set(result)];
}

export function inspectZapCannonFramebuffer(): readonly Record<string, unknown>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const rows = zapCannonRowsFor(orientation), config = zapCannonConfigFor(orientation, rows);
    const stage = createSceneOnMovePresentation(config), item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: archive hash`);
    const scratch = createScratchDir(`pokebench-zap-cannon-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const view = sceneOnZapCannonView({ ...stage, age });
      const mismatches = componentMismatches(row, view);
      if (!mismatches.length) componentExactRows += 1;
      const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } };
      const app = render(engine), raw = readFileSync(findRgb(scratch,
        `${String(row.frame).padStart(5, "0")}.rgb`));
      let residual = 0;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (app[pixel * 4] !== raw[pixel * 3] || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) residual += 1;
      }
      if (!residual) zeroRows += 1;
      residualPixels += residual;
      peakResidualPixels = Math.max(peakResidualPixels, residual);
      if (residual || mismatches.length) failures.push({ age, frame: row.frame,
        residualPixels: residual, componentMismatches: mismatches });
    }
    return { orientation, totalRows: rows.length, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, failures };
  });
}

export function inspectZapCannonAlteredControl(): Record<string, unknown> {
  const base = zapCannonConfigFor("player-back");
  const reorder = <T extends { slot: number; matrixNum: number; order: number }>(item: T, index: number): T =>
    ({ ...item, slot: 20 + index, matrixNum: (item.matrixNum + 11) % 32,
      order: 63 - item.order });
  const altered: SceneOnZapCannonConfig = { ...base,
    attacker: { ...base.attacker, species: "GOLDUCK", geometry: { ...base.attacker.geometry,
      side: "opponent", spriteCorner: { x: 143, y: 13 }, animationCenter: { x: 175, y: 45 } } },
    target: { ...base.target, species: "GRAVELER", geometry: { ...base.target.geometry,
      side: "player", spriteCorner: { x: 37, y: 55 }, animationCenter: { x: 69, y: 87 } } },
    animationGeometry: { attackerPictureCenter: { x: 165, y: 45 },
      targetPictureCenter: { x: 69, y: 95 }, targetBattleCenter: { x: 69, y: 79 } },
    animationProfile: { ball: reorder(base.animationProfile.ball, 0),
      sparks: base.animationProfile.sparks.map((item, index) => reorder(item, index + 1)),
      arcs: base.animationProfile.arcs.map((item, index) => reorder(item, index + 9)) } };
  const frame = (config: SceneOnZapCannonConfig) => render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: {
      ...createSceneOnMovePresentation(config), age: 24 } });
  return { species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: altered.animationGeometry,
    allocator: altered.animationProfile,
    palettes: "species-derived GOLDUCK/GRAVELER",
    baseFramebufferSha256: sha(frame(base)), alteredFramebufferSha256: sha(frame(altered)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectZapCannonFramebuffer(),
    alteredControl: inspectZapCannonAlteredControl() }, null, 2));
}
