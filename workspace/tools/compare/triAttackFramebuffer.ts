/** Strict hermetic actual-core comparator for Tri Attack's complete body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation, sceneOnTriAttackView,
  type SceneOnPresentationBattler, type SceneOnTriAttackConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root,
  "tools/compare/fixtures/tri-attack-evidence.json"), "utf8")) as Record<string, any>;
const sha = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
type Orientation = "player-back" | "opponent-front";
type Row = Record<string, any>;
const OWNED = new Set(["gTriAttackTriangleSpriteTemplate", "gLargeFlameScatterSpriteTemplate",
  "gLightningSpriteTemplate", "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate"]);

function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child;
  }
  throw new Error(`missing Tri Attack RGB ${filename}`);
}
export function triAttackRowsFor(orientation: Orientation): readonly Row[] {
  const item = fixture.orientations[orientation];
  const compressed = readFileSync(resolve(root, item.denseState));
  if (sha(compressed) !== item.denseStateSha256) throw new Error(`${orientation}: dense hash`);
  const json = gunzipSync(compressed);
  if (sha(json) !== item.probeJsonSha256) throw new Error(`${orientation}: probe hash`);
  const rows = JSON.parse(json.toString("utf8")).frames;
  if (rows.length !== 284) throw new Error(`${orientation}: incomplete rows`);
  return rows;
}
function gender(value: string): "male" | "female" | "none" {
  if (value === "male" || value === "female") return value;
  return "none";
}
function battler(species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
  sprite: Row): SceneOnPresentationBattler {
  return { species, geometry: { side,
    spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
    animationCenter: { x: sprite.x, y: sprite.y },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  } };
}
export function triAttackConfigFor(orientation: Orientation,
  rows = triAttackRowsFor(orientation)): SceneOnTriAttackConfig {
  const first = rows[0]!, playerAttacker = orientation === "player-back";
  const player = first.parties.player[first.battlers.player.partyIndex];
  const opponent = first.parties.opponent[first.battlers.opponent.partyIndex];
  const findBirth = (age: number, template: string) => rows[age]!.sprites.find((sprite: Row) =>
    sprite.template?.symbol === template && !rows[Math.max(0, age - 1)]!.sprites.some((prior: Row) =>
      prior.slot === sprite.slot && prior.template?.symbol === template));
  const triangle = findBirth(4, "gTriAttackTriangleSpriteTemplate");
  const fire = [107, 107, 110, 113, 116, 119, 122, 125].map((age, index) =>
    rows[age]!.sprites.filter((s: Row) => s.template?.symbol === "gLargeFlameScatterSpriteTemplate")
      .find((s: Row) => index < 2 ? !rows[106]!.sprites.some((p: Row) => p.slot === s.slot)
        && s.slot === [4, 5][index] : !rows[age - 1]!.sprites.some((p: Row) => p.slot === s.slot)));
  const lightning = [158, 161, 164].map((age) => findBirth(age, "gLightningSpriteTemplate"));
  const iceTemplates = ["gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate",
    "gIceCrystalHitLargeSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate",
    "gIceCrystalHitSmallSpriteTemplate", "gIceCrystalHitSmallSpriteTemplate",
    "gIceCrystalHitLargeSpriteTemplate"];
  const ice = [208, 214, 220, 226, 232, 238, 244].map((age, index) => findBirth(age, iceTemplates[index]!));
  if (!triangle || [...fire, ...lightning, ...ice].some((item) => !item)) throw new Error(`${orientation}: allocator evidence`);
  const attackerSide = playerAttacker ? "player" : "opponent";
  const targetSide = playerAttacker ? "opponent" : "player";
  return { move: "TRI_ATTACK",
    attacker: battler("PORYGON", attackerSide, first.battlerSprites.attacker),
    target: battler("SHUCKLE", targetSide, first.battlerSprites.target),
    fieldProfile: { playerHp: first.battlers.player.hp, playerMaxHp: first.battlers.player.maxHp,
      opponentHp: first.battlers.opponent.hp, opponentMaxHp: first.battlers.opponent.maxHp,
      playerGender: gender(player.gender), opponentGender: gender(opponent.gender) },
    animationGeometry: { attackerPositionCenter: attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
      // GetBattlerSpriteCoord(..., Y_PIC_OFFSET) includes the source-defined
      // player-back +8 picture anchor; it is not the sprite OAM center.
      targetPictureCenter: { x: first.battlerSprites.target.x,
        y: first.battlerSprites.target.y + (targetSide === "player" ? 8 : 0) },
      targetRestOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 } },
    animationProfile: { triangleSlot: triangle.slot, triangleMatrixId: triangle.matrixNum,
      fireSlots: fire.map((s) => s!.slot), lightningSlots: lightning.map((s) => s!.slot),
      iceSlots: ice.map((s) => s!.slot), iceMatrixIds: ice.map((s) => s!.matrixNum),
      paletteSlots: [3, 12], effectSubpriority: triangle.subpriority,
      spriteOrderSeed: first.spriteOrder },
  };
}
function componentMismatches(row: Row, view: ReturnType<typeof sceneOnTriAttackView>): string[] {
  const expected = row.sprites.filter((sprite: Row) => OWNED.has(sprite.template?.symbol));
  const mismatches: string[] = [];
  if (expected.length !== view.sprites.length) mismatches.push("sprite-count");
  for (const sprite of view.sprites) {
    const source = expected.find((item: Row) => item.slot === sprite.slot
      && (sprite.kind !== "ice" || item.template.symbol === (sprite.frame === 0
        ? "gIceCrystalHitLargeSpriteTemplate" : "gIceCrystalHitSmallSpriteTemplate")));
    if (!source || source.x !== sprite.x || source.y !== sprite.y || source.x2 !== sprite.x2
      || source.y2 !== sprite.y2 || source.matrixNum !== sprite.matrixId
      || JSON.stringify(source.matrix) !== JSON.stringify(sprite.matrix)
      || source.invisible !== sprite.invisible) mismatches.push(`${sprite.kind}-${sprite.index}`);
  }
  if (row.animScriptActive !== view.active) mismatches.push("active");
  if (row.battlerSprites.target.x2 !== view.targetOffset.x2
    || row.battlerSprites.target.y2 !== view.targetOffset.y2) mismatches.push("target-offset");
  return [...new Set(mismatches)];
}
export function inspectTriAttackFramebuffer() {
  return (["player-back", "opponent-front"] as const).map((orientation) => {
    const rows = triAttackRowsFor(orientation), config = triAttackConfigFor(orientation, rows);
    const stage = createSceneOnMovePresentation(config), item = fixture.orientations[orientation];
    const archive = resolve(root, item.rawRgbArchive);
    if (sha(readFileSync(archive)) !== item.rawRgbArchiveSha256) throw new Error(`${orientation}: RGB hash`);
    const scratch = createScratchDir(`pokebench-tri-attack-${orientation}-`);
    execFileSync("tar", ["-xzf", archive, "-C", scratch]);
    let zeroRows = 0, residualPixels = 0, peakResidualPixels = 0, componentExactRows = 0;
    const failures: Record<string, unknown>[] = [];
    for (const [age, row] of rows.entries()) {
      const mismatches = componentMismatches(row, sceneOnTriAttackView({ ...stage, age }));
      if (!mismatches.length) componentExactRows += 1;
      const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } };
      const app = render(engine), raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
      if (sha(raw) !== row.sha256) throw new Error(`${orientation} age ${age}: raw hash`);
      let residual = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        if (app[pixel * 4] === raw[pixel * 3] && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
          && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
        residual++; const x = pixel % 240, y = Math.floor(pixel / 240);
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (!residual) zeroRows++; residualPixels += residual; peakResidualPixels = Math.max(peakResidualPixels, residual);
      if (residual || mismatches.length) failures.push({ age, frame: row.frame, residualPixels: residual,
        bounds: residual ? [minX, minY, maxX, maxY] : null, componentMismatches: mismatches });
    }
    return { orientation, totalRows: rows.length, zeroRows, residualPixels, peakResidualPixels,
      componentExactRows, failures };
  });
}
export function inspectTriAttackAlteredControl() {
  const base = triAttackConfigFor("player-back");
  const altered: SceneOnTriAttackConfig = { ...base,
    attacker: { ...base.attacker, species: "MAGBY", geometry: { ...base.attacker.geometry,
      side: "opponent", spriteCorner: { x: 142, y: 12 }, animationCenter: { x: 174, y: 44 } } },
    target: { ...base.target, species: "ONIX", geometry: { ...base.target.geometry,
      side: "player", spriteCorner: { x: 38, y: 57 }, animationCenter: { x: 70, y: 89 } } },
    animationGeometry: { attackerPositionCenter: { x: 174, y: 44 },
      targetPictureCenter: { x: 70, y: 89 }, targetRestOffset: { x2: 0, y2: 0 } },
    animationProfile: { ...base.animationProfile, triangleSlot: 15, triangleMatrixId: 11,
      fireSlots: base.animationProfile.fireSlots.map((slot) => slot + 12),
      lightningSlots: base.animationProfile.lightningSlots.map((slot) => slot + 12),
      iceSlots: base.animationProfile.iceSlots.map((slot) => slot + 12),
      iceMatrixIds: base.animationProfile.iceMatrixIds.map((id) => (id + 11) % 32),
      effectSubpriority: 26, spriteOrderSeed: [...base.animationProfile.spriteOrderSeed].reverse() } };
  const frame = (config: SceneOnTriAttackConfig) => render({ ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...createSceneOnMovePresentation(config), age: 70 } });
  return { species: [altered.attacker.species, altered.target.species],
    sides: [altered.attacker.geometry.side, altered.target.geometry.side], geometry: altered.animationGeometry,
    allocator: altered.animationProfile, baseFramebufferSha256: sha(frame(base)),
    alteredFramebufferSha256: sha(frame(altered)) };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify({ comparisons: inspectTriAttackFramebuffer(),
    alteredControl: inspectTriAttackAlteredControl() }, null, 2));
}
