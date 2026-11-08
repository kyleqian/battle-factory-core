/** Strict hermetic actual-core comparator for Thunderbolt's complete body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnThunderboltView,
  type SceneOnThunderboltConfig, type SceneOnPresentationBattler } from
  "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/thunderbolt-evidence.json"), "utf8")) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export type ThunderboltOrientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
const symbols = new Set(["gElectricBoltSegmentSpriteTemplate", "gThunderboltOrbSpriteTemplate",
  "gSparkElectricityFlashingSpriteTemplate", "gElectricitySpriteTemplate"]);

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child;
  }
  throw new Error(`missing Thunderbolt RGB ${filename}`);
}
export function thunderboltRowsFor(orientation: ThunderboltOrientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames as Row[];
  if (rows.length !== 237) throw new Error(`${orientation}: incomplete corpus`);
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
function allocation(row: Row, symbol: string): { slot: number; matrixNum: number; order: number } {
  const sprite = row.sprites.find((item: Row) => item.template?.symbol === symbol
    && (symbol === "gElectricBoltSegmentSpriteTemplate" ? item.data[1] === 1
      : symbol === "gElectricitySpriteTemplate" ? item.data[0] === 4 : true));
  if (!sprite) throw new Error(`missing ${symbol} at ${row.frame}`);
  return { slot: sprite.slot, matrixNum: sprite.matrixNum, order: row.spriteOrder.indexOf(sprite.slot) };
}
export function thunderboltConfigFor(orientation: ThunderboltOrientation,
  rows = thunderboltRowsFor(orientation)): SceneOnThunderboltConfig {
  const first = rows[0]!, playerAttacker = orientation === "player-back";
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  const boltBirths = [28,30,32,34,36,37,39,41,43,45,46,48,50,52,54];
  const flashBirths = [105,105,105,105,105,105,105,106];
  const seen = new Set<number>();
  const flashes = flashBirths.map((age) => {
    const candidates = rows[age]!.sprites.filter((s: Row) =>
      s.template?.symbol === "gSparkElectricityFlashingSpriteTemplate" && !seen.has(s.slot));
    const sprite = candidates[0]!; seen.add(sprite.slot);
    return { slot: sprite.slot, matrixNum: sprite.matrixNum,
      order: rows[age]!.spriteOrder.indexOf(sprite.slot) };
  });
  const orbSprite = rows[105]!.sprites.find((s: Row) => s.template?.symbol === "gThunderboltOrbSpriteTemplate")!;
  const targetPictureCenter = { x: orbSprite.x, y: orbSprite.y };
  return { move: "THUNDERBOLT",
    attacker: battler("DELCATTY", attackerSide, first.battlerSprites.attacker),
    target: battler("SHUCKLE", targetSide, first.battlerSprites.target),
    fieldProfile: { playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender) },
    animationGeometry: { targetBattleCenter: targetSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
      targetPictureCenter },
    animationProfile: {
      bolts: boltBirths.map((age) => allocation(rows[age]!, "gElectricBoltSegmentSpriteTemplate")),
      orb: { slot: orbSprite.slot, matrixNum: orbSprite.matrixNum,
        order: rows[105]!.spriteOrder.indexOf(orbSprite.slot) }, flashes,
      arcs: Array.from({ length: 8 }, (_, index) => allocation(rows[173 + index * 4]!,
        "gElectricitySpriteTemplate")),
    } };
}

function componentMismatches(row: Row, view: ReturnType<typeof sceneOnThunderboltView>): string[] {
  const source = row.sprites.filter((s: Row) => symbols.has(s.template?.symbol));
  const result: string[] = [];
  if (source.length !== view.sprites.length) result.push("count");
  for (const sprite of view.sprites) {
    const actual = source.find((s: Row) => s.slot === sprite.slot);
    if (!actual || actual.x !== sprite.x || actual.y !== sprite.y || actual.x2 !== sprite.x2
      || actual.y2 !== sprite.y2 || actual.subpriority !== sprite.subpriority
      || actual.matrixNum !== sprite.matrixNum || JSON.stringify(actual.matrix) !== JSON.stringify(sprite.matrix)) {
      result.push(`${sprite.kind}-${sprite.index}`);
    }
  }
  return [...new Set(result)];
}

export function inspectThunderboltFramebuffer(): readonly Record<string, unknown>[] {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const rows = thunderboltRowsFor(orientation), config = thunderboltConfigFor(orientation, rows);
    const stage = createSceneOnMovePresentation(config), item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: archive hash`);
    const scratch = createScratchDir(`pokebench-thunderbolt-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const view = sceneOnThunderboltView({ ...stage, age });
      const mismatches = componentMismatches(row, view);
      if (!mismatches.length) componentExactRows += 1;
      const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } };
      const app = render(engine), raw = readFileSync(findRgb(scratch,
        `${String(row.frame).padStart(5, "0")}.rgb`));
      let residual = 0;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1] || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) residual += 1;
      if (!residual) zeroRows += 1;
      residualPixels += residual; peakResidualPixels = Math.max(peakResidualPixels, residual);
      if (residual || mismatches.length) failures.push({ age, frame: row.frame,
        residualPixels: residual, componentMismatches: mismatches });
    }
    return { orientation, totalRows: rows.length, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows, failures };
  });
}

export function inspectThunderboltAlteredControl(): Record<string, unknown> {
  const base = thunderboltConfigFor("player-back");
  const altered: SceneOnThunderboltConfig = { ...base,
    attacker: { ...base.attacker, species: "GOLDUCK", geometry: { ...base.attacker.geometry,
      side: "opponent", spriteCorner: { x: 143, y: 13 }, animationCenter: { x: 175, y: 45 } } },
    target: { ...base.target, species: "GRAVELER", geometry: { ...base.target.geometry,
      side: "player", spriteCorner: { x: 37, y: 55 }, animationCenter: { x: 69, y: 87 } } },
    animationGeometry: { targetBattleCenter: { x: 69, y: 79 }, targetPictureCenter: { x: 69, y: 87 } } };
  const frame = (config: SceneOnThunderboltConfig) => render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 120 } });
  return { species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side],
    geometry: altered.animationGeometry, baseFramebufferSha256: sha(frame(base)),
    alteredFramebufferSha256: sha(frame(altered)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectThunderboltFramebuffer(),
    alteredControl: inspectThunderboltAlteredControl() }, null, 2));
}
