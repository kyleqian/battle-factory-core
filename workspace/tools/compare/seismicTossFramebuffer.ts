/** Strict component and actual-core comparator for Factory SeismicTossMedium. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnSeismicTossView,
  type SceneOnPresentationBattler, type SceneOnSeismicTossConfig } from
  "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/seismic-toss-evidence.json"), "utf8")) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
type Orientation = "player-back" | "opponent-front";
type Row = Record<string, any>;

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child;
  }
  throw new Error(`missing Seismic Toss RGB ${filename}`);
}
export function seismicTossRowsFor(side: Orientation): Row[] {
  const item = fixture.orientations[side];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${side}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${side}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  if (rows.length !== 228) throw new Error(`${side}: incomplete corpus`);
  return rows;
}

function battler(species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
  sprite: Row): SceneOnPresentationBattler {
  return { species, geometry: { side, spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
    animationCenter: { x: sprite.x, y: sprite.y },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } } };
}
const symbol = (sprite: Row) => sprite.template?.symbol;
function palette(row: Row, sprite: Row) {
  const bank = sprite.attr[2] >>> 12 & 15;
  return row.hardwarePalette.slice(256 + bank * 16, 272 + bank * 16).map((value: number) => ({
    r: (value & 31) << 3 | (value & 31) >>> 2,
    g: (value >>> 5 & 31) << 3 | (value >>> 5 & 31) >>> 2,
    b: (value >>> 10 & 31) << 3 | (value >>> 10 & 31) >>> 2,
  }));
}
export function seismicTossConfigFor(side: Orientation,
  rows = seismicTossRowsFor(side)): SceneOnSeismicTossConfig {
  const first = rows[0]!, playerAttacker = side === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const waves = [152, 168, 184].map((age) => {
    const previous = rows[age - 1]!.sprites as Row[];
    return (rows[age]!.sprites as Row[]).filter((sprite) =>
      symbol(sprite) === "gRockScatterSpriteTemplate"
      && !previous.some((prior) => prior.slot === sprite.slot
        && symbol(prior) === "gRockScatterSpriteTemplate"));
  });
  const hits = [152, 168, 184].map((age) => (rows[age]!.sprites as Row[])
    .find((sprite) => symbol(sprite) === "gBasicHitSplatSpriteTemplate")!);
  if (waves.some((wave) => wave.length !== 4) || hits.some((hit) => !hit)) {
    throw new Error(`${side}: incomplete allocator profile`);
  }
  const targetEffectCenter = { x: hits[0]!.x + (targetSide === "player" ? -10 : 10),
    y: hits[0]!.y + 8 };
  const targetRockCenter = { x: waves[0]![0]!.x + 12, y: waves[0]![0]!.y - 27 };
  return { move: "SEISMIC_TOSS",
    // The retained stage used internal species id 352. In Emerald's internal
    // species table that is GRUMPIG (KECLEON is 317); the old National-Dex
    // interpretation mislabeled the live sprite, healthbox, and message.
    attacker: battler("GRUMPIG", attackerSide, first.battlerSprites.attacker),
    target: battler("ONIX", targetSide, first.battlerSprites.target),
    fieldProfile: { playerHp: first.battlers.player.hp,
      playerMaxHp: first.battlers.player.maxHp, opponentHp: first.battlers.opponent.hp,
      opponentMaxHp: first.battlers.opponent.maxHp, playerGender: "male", opponentGender: "male" },
    animationGeometry: { targetEffectCenter, targetRockCenter,
      attackerRestOffset: { x2: first.battlerSprites.attacker.x2, y2: first.battlerSprites.attacker.y2 },
      targetRestOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 } },
    animationProfile: { rocks: waves.map((wave, waveIndex) => wave.map((sprite) => ({
      slot: sprite.slot, matrixNum: sprite.matrixNum,
      persistentOrder: rows[[152, 168, 184][waveIndex]!]!.spriteOrder.indexOf(sprite.slot),
    }))), hitsplats: hits.map((sprite, index) => ({ slot: sprite.slot,
      matrixNum: sprite.matrixNum,
      persistentOrder: rows[[152, 168, 184][index]!]!.spriteOrder.indexOf(sprite.slot) })),
    attackerSubpriority: first.battlerSprites.attacker.subpriority,
    targetSubpriority: first.battlerSprites.target.subpriority,
    attackerPalette: palette(first, first.battlerSprites.attacker),
    targetPalette: palette(first, first.battlerSprites.target),
    attackerAnimFrame: first.battlerSprites.attacker.animNum ? 1 : 0,
    targetAnimFrame: first.battlerSprites.target.animNum ? 1 : 0 } };
}

function componentMismatches(row: Row, view: ReturnType<typeof sceneOnSeismicTossView>): string[] {
  const errors: string[] = [];
  const source = row.sprites.filter((sprite: Row) =>
    symbol(sprite) === "gRockScatterSpriteTemplate" || symbol(sprite) === "gBasicHitSplatSpriteTemplate");
  if (source.length !== view.rocks.length + view.hitsplats.length) errors.push("sprite-count");
  for (const rock of view.rocks) {
    const actual = source.find((sprite: Row) => symbol(sprite) === "gRockScatterSpriteTemplate"
      && sprite.slot === rock.slot);
    if (!actual || actual.x !== rock.x || actual.y !== rock.y || actual.x2 !== rock.x2
      || actual.y2 !== rock.y2 || actual.animNum !== rock.animation
      || actual.matrixNum !== rock.matrixNum || JSON.stringify(actual.matrix) !== JSON.stringify(rock.matrix)) {
      errors.push(`rock-${rock.wave}-${rock.index}`);
    }
  }
  for (const hit of view.hitsplats) {
    const actual = source.find((sprite: Row) => symbol(sprite) === "gBasicHitSplatSpriteTemplate"
      && sprite.slot === hit.slot);
    if (!actual || actual.x !== hit.x || actual.y !== hit.y
      || JSON.stringify(actual.matrix) !== JSON.stringify(hit.matrix)) errors.push(`hit-${hit.wave}`);
  }
  const target = row.battlerSprites.target;
  if (target.x2 !== view.targetOffset.x2 || target.y2 !== view.targetOffset.y2) errors.push("target-shake");
  if (row.battleBg.gBattle_BG3_Y !== view.bg3Y) errors.push("bg3-y");
  if (row.registers.bldy !== view.bldy) errors.push("bldy");
  if (row.animScriptActive !== view.scriptActive) errors.push("script-active");
  return [...new Set(errors)];
}

export function inspectSeismicTossFramebuffer() {
  return (["player-back", "opponent-front"] as const).map((side) => {
    const rows = seismicTossRowsFor(side), config = seismicTossConfigFor(side, rows);
    const stage = createSceneOnMovePresentation(config), item = fixture.orientations[side];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${side}: RGB archive hash`);
    const scratch = createScratchDir(`pokebench-seismic-toss-${side}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const view = sceneOnSeismicTossView({ ...stage, age });
      const mismatches = componentMismatches(row, view);
      if (!mismatches.length) componentExactRows += 1;
      const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } };
      const app = render(engine);
      const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      const zones = { field: 0, opponent: 0, player: 0, healthboxes: 0, message: 0 };
      const pairs = new Map<string, number>();
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (
        app[pixel * 4] !== raw[pixel * 3] || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) {
        residual += 1; const x = pixel % 240, y = Math.floor(pixel / 240);
        if (age === 0) {
          const key = `${raw[pixel * 3]},${raw[pixel * 3 + 1]},${raw[pixel * 3 + 2]}->${app[pixel * 4]},${app[pixel * 4 + 1]},${app[pixel * 4 + 2]}`;
          pairs.set(key, (pairs.get(key) ?? 0) + 1);
        }
        if (y >= 112) zones.message += 1;
        else if (x >= 128 && y < 76) zones.opponent += 1;
        else if (x < 128 && y >= 44) zones.player += 1;
        else if (x >= 120 || y >= 72) zones.healthboxes += 1;
        else zones.field += 1;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (!residual) zeroRows += 1;
      residualPixels += residual; peakResidualPixels = Math.max(peakResidualPixels, residual);
      if (residual || mismatches.length) failures.push({ age, frame: row.frame,
        residualPixels: residual, bounds: residual ? [minX, minY, maxX, maxY] : null, zones,
        pairs: age === 0 ? [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 12) : undefined,
        componentMismatches: mismatches });
    }
    return { side, totalRows: rows.length, componentExactRows, zeroRows,
      residualPixels, peakResidualPixels, failures };
  });
}

export function inspectSeismicTossAlteredControl() {
  const base = seismicTossConfigFor("player-back");
  const altered: SceneOnSeismicTossConfig = { ...base,
    attacker: { ...base.attacker, species: "MACHOKE", geometry: { ...base.attacker.geometry,
      side: "opponent", spriteCorner: { x: 142, y: 14 }, animationCenter: { x: 174, y: 46 } } },
    target: { ...base.target, species: "GOLEM", geometry: { ...base.target.geometry,
      side: "player", spriteCorner: { x: 38, y: 54 }, animationCenter: { x: 70, y: 86 } } },
    animationGeometry: { targetEffectCenter: { x: 70, y: 86 }, targetRockCenter: { x: 70, y: 80 },
      attackerRestOffset: { x2: 0, y2: 0 }, targetRestOffset: { x2: 0, y2: 0 } },
    animationProfile: { ...base.animationProfile,
      rocks: base.animationProfile.rocks.map((wave, wi) => wave.map((item, i) => ({ ...item,
        slot: item.slot + 20 + wi * 5, matrixNum: item.matrixNum + 11,
        persistentOrder: 60 - wi * 4 - i }))),
      hitsplats: base.animationProfile.hitsplats.map((item, index) => ({ ...item,
        slot: 50 + index, matrixNum: 20 + index, persistentOrder: index })),
      attackerPalette: base.animationProfile.targetPalette,
      targetPalette: base.animationProfile.attackerPalette } };
  const frame = (config: SceneOnSeismicTossConfig) => render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 170 } });
  const alteredView = sceneOnSeismicTossView({ ...createSceneOnMovePresentation(altered), age: 170 });
  return { species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: altered.animationGeometry,
    basePaletteSha256: sha(Buffer.from(JSON.stringify([
      base.animationProfile.attackerPalette, base.animationProfile.targetPalette,
    ]))),
    alteredPaletteSha256: sha(Buffer.from(JSON.stringify([
      altered.animationProfile.attackerPalette, altered.animationProfile.targetPalette,
    ]))),
    allocator: [...alteredView.rocks, ...alteredView.hitsplats].map((item) =>
      [item.slot, item.matrixNum, item.persistentOrder]),
    baseFramebufferSha256: sha(frame(base)), alteredFramebufferSha256: sha(frame(altered)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectSeismicTossFramebuffer(),
    alteredControl: inspectSeismicTossAlteredControl() }, null, 2));
}
