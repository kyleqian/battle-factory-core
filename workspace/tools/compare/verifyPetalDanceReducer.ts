/**
 * Replay MOVE_PETAL_DANCE's retained component receipts through its pure
 * reducer and typed Scene-ON seam. This is intentionally state-only: it
 * neither opens raw RGB archives nor compares a framebuffer or compositor.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  petalDanceAtAge,
  type PetalDanceLiveInputs,
  type PetalDanceState,
} from "../../src/animation/petalDance.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPetalDanceView,
  type SceneOnPetalDanceConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type PetalDanceOrientation = "player-back" | "opponent-front";

const paths: Record<PetalDanceOrientation, Readonly<{ dense: string; map: string }>> = {
  "player-back": {
    dense: "tools/compare/evidence/petal-dance-player-dense-state.json.gz",
    map: "tools/compare/evidence/petal-dance-changemap-player.json",
  },
  "opponent-front": {
    dense: "tools/compare/evidence/petal-dance-opponent-dense-state.json.gz",
    map: "tools/compare/evidence/petal-dance-changemap-opponent.json",
  },
};

const flowerTemplates = new Set([
  "gPetalDanceBigFlowerSpriteTemplate",
  "gPetalDanceSmallFlowerSpriteTemplate",
]);
const moveTemplates = new Set([
  ...flowerTemplates,
  "gSlideMonToOffsetSpriteTemplate",
  "gSlideMonToOriginalPosSpriteTemplate",
  "gBasicHitSplatSpriteTemplate",
]);

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stable(entry)]),
  );
  return value;
}

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(stable(left)) === JSON.stringify(stable(right));
const fail = (message: string): never => { throw new Error(message); };

function moveSprites(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => moveTemplates.has(sprite.template?.symbol));
}

function reducedSpriteState(row: Json): Json[] {
  return moveSprites(row).map((sprite: Json) => ({
    slot: sprite.slot,
    kind: sprite.template.symbol === "gPetalDanceBigFlowerSpriteTemplate" ? "flower-big"
      : sprite.template.symbol === "gPetalDanceSmallFlowerSpriteTemplate" ? "flower-small"
      : sprite.template.symbol === "gSlideMonToOffsetSpriteTemplate" ? "slide-to-offset"
      : sprite.template.symbol === "gSlideMonToOriginalPosSpriteTemplate" ? "slide-to-original"
      : "hitsplat",
    template: sprite.template.symbol,
    x: sprite.x,
    y: sprite.y,
    x2: sprite.x2,
    y2: sprite.y2,
    subpriority: sprite.subpriority,
    matrixNum: sprite.matrixNum,
    matrix: sprite.matrix,
    visible: !sprite.invisible,
    data: sprite.data,
    callback: sprite.callback.symbol,
  }));
}

function reducedTaskState(row: Json): Json[] {
  return row.tasks.map((task: Json) => ({
    slot: task.slot,
    kind: task.func.symbol === "AnimTask_TranslateMonElliptical_Step" ? "ellipse"
      : task.func.symbol === "AnimTask_ShakeMon_Step" ? "shake"
      : task.func.symbol === "Task_ClearMonBg" ? "clear-monbg" : "update-monbg",
    callback: task.func.symbol,
    data: task.data,
  }));
}

function firstSprite(rows: Json[], template: string): Json {
  const found = rows.flatMap(moveSprites).find((sprite: Json) => sprite.template.symbol === template);
  if (!found) fail(`missing ${template}`);
  return found!;
}

function firstTask(rows: Json[], callback: string): Json {
  const found = rows.flatMap((row) => row.tasks).find((task: Json) => task.func?.symbol === callback);
  if (!found) fail(`missing ${callback}`);
  return found!;
}

function flowersInProgramOrder(rows: Json[]): readonly Json[] {
  const firsts = new Map<number, Readonly<{ age: number; sprite: Json }>>();
  for (const [age, row] of rows.entries()) {
    for (const sprite of moveSprites(row)) {
      if (flowerTemplates.has(sprite.template.symbol) && !firsts.has(sprite.slot)) {
        firsts.set(sprite.slot, { age, sprite });
      }
    }
  }
  return [...firsts.values()]
    .sort((left, right) => left.age - right.age || left.sprite.slot - right.sprite.slot)
    .map(({ sprite }) => sprite);
}

export function petalDanceConfigFor(
  orientation: PetalDanceOrientation,
  rows: Json[],
  spriteOrder: readonly number[],
): SceneOnPetalDanceConfig {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const flowers = flowersInProgramOrder(rows);
  if (flowers.length !== 13) fail(`${orientation}: expected thirteen flower allocations`);
  const firstBig = flowers.find((sprite) => sprite.template.symbol === "gPetalDanceBigFlowerSpriteTemplate")!;
  const firstSmall = flowers.find((sprite) => sprite.template.symbol === "gPetalDanceSmallFlowerSpriteTemplate")!;
  const offset = firstSprite(rows, "gSlideMonToOffsetSpriteTemplate");
  const original = firstSprite(rows, "gSlideMonToOriginalPosSpriteTemplate");
  const splat = firstSprite(rows, "gBasicHitSplatSpriteTemplate");
  const ellipse = firstTask(rows, "AnimTask_TranslateMonElliptical_Step");
  const shake = firstTask(rows, "AnimTask_ShakeMon_Step");
  const update = firstTask(rows, "Task_UpdateMonBg");
  const clear = firstTask(rows, "Task_ClearMonBg");
  const attackerSprite = rows[0]!.battlerSprites.attacker;
  const targetSprite = rows[0]!.battlerSprites.target;
  const attackerBattlePositionCenter = { x: firstBig.x, y: firstBig.y + 24 };
  const attackerPictureOrigin = {
    x: firstSmall.x - (attackerSide === "player" ? 16 : -16),
    y: firstSmall.y + 24,
  };
  const animationInputs: Omit<PetalDanceLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerBattlePositionCenter" | "targetBattlePositionCenter" | "targetSpriteOrigin"> = {
    attackerPictureOrigin,
    flowerFixedPointSteps: flowers.map((sprite) => ({ x: sprite.data[1], y: sprite.data[2] })),
    flowerSpriteSlots: flowers.map((sprite) => sprite.slot),
    flowerMatrixNum: firstBig.matrixNum,
    attackerSpriteSlot: attackerSprite.slot,
    targetSpriteSlot: targetSprite.slot,
    attackerInitialOffset: { x: attackerSprite.x2, y: attackerSprite.y2 },
    targetInitialOffset: { x: targetSprite.x2, y: targetSprite.y2 },
    attackerSubpriority: attackerSprite.subpriority,
    ellipseTaskSlot: ellipse.slot,
    shakeTaskSlot: shake.slot,
    updateMonBgTaskSlot: update.slot,
    clearMonBgTaskSlot: clear.slot,
    offsetSlideSpriteSlot: offset.slot,
    originalSlideSpriteSlot: original.slot,
    hitSplatSpriteSlot: splat.slot,
    hitSplatMatrixSlot: splat.matrixNum,
    dummySpriteOrigin: { x: offset.x, y: offset.y },
    slideSubpriority: offset.subpriority,
    hitSplatSubpriority: splat.subpriority,
    baseMatrixBitmap: rows[0]!.resourceAllocators.matrixBitmap,
    spriteOrder,
    monbg: {
      layer: targetSide === "player" ? "bg2" : "bg1",
      spriteSlot: update.data[0], spriteX: update.data[1], spriteY: update.data[2],
      bgX: update.data[3], bgY: update.data[4], inBg2: Boolean(update.data[5]),
      battlerId: update.data[6],
    },
  };
  return {
    move: "PETAL_DANCE",
    attacker: { species: "GLOOM", geometry: { side: attackerSide,
      spriteCorner: { x: attackerSprite.x - 32, y: attackerSprite.y - 32 },
      animationCenter: { x: attackerSprite.x, y: attackerSprite.y },
      battlePositionCenter: attackerBattlePositionCenter } },
    target: { species: "ONIX", geometry: { side: targetSide,
      spriteCorner: { x: targetSprite.x - 32, y: targetSprite.y - 32 },
      animationCenter: { x: targetSprite.x, y: targetSprite.y },
      battlePositionCenter: { x: targetSprite.x, y: targetSprite.y } } },
    fieldProfile: { playerHp: rows[0]!.battlers.player.hp,
      playerMaxHp: rows[0]!.battlers.player.maxHp,
      opponentHp: rows[0]!.battlers.opponent.hp,
      opponentMaxHp: rows[0]!.battlers.opponent.maxHp,
      playerGender: attackerSide === "player" ? "female" : "male",
      opponentGender: attackerSide === "opponent" ? "female" : "male" },
    animationInputs,
  };
}

function latchExpectation(age: number): PetalDanceState["displayTransfer"] {
  return {
    oam: age === 0 ? "current" : "predecessor",
    matrices: age === 0 ? "current" : "predecessor",
    palette: age === 0 ? "current" : age === 7 ? "same-row-monbg-setup" : "predecessor",
  };
}

function expectedResources(row: Json): PetalDanceState["resources"] {
  return {
    flowerLoaded: row.tileTags.includes(10159),
    impactLoaded: row.tileTags.includes(10135),
    flowerTag: row.tileTags.includes(10159) ? 10159 : null,
    impactTag: row.tileTags.includes(10135) ? 10135 : null,
    matrixBitmap: row.resourceAllocators.matrixBitmap,
  };
}

function verifyOrientation(orientation: PetalDanceOrientation): Json {
  const { dense, map: mapPath } = paths[orientation];
  const archive = JSON.parse(gunzipSync(readFileSync(dense)).toString("utf8")) as Json;
  const rows = archive.frames as Json[];
  const map = JSON.parse(readFileSync(mapPath, "utf8")) as Json;
  if (rows.length !== 244 || map.rows.length !== 244) fail(`${orientation}: retained window shape`);
  let reducerRows = 0;
  let seamRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const mapRow = map.rows[age]!;
    const config = petalDanceConfigFor(orientation, rows, row.spriteOrder);
    const input: PetalDanceLiveInputs = {
      ...config.animationInputs,
      attackerSide: config.attacker.geometry.side,
      targetSide: config.target.geometry.side,
      attackerSpecies: config.attacker.species,
      targetSpecies: config.target.species,
      attackerBattlePositionCenter: config.attacker.geometry.battlePositionCenter,
      targetBattlePositionCenter: config.target.geometry.battlePositionCenter,
      targetSpriteOrigin: config.target.geometry.animationCenter,
    };
    const reduced = petalDanceAtAge(age, input);
    const prefix = `${orientation} age ${age}`;
    if (!same(
      [row.scriptOwner, row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.animScriptActive],
      [reduced.source.owner, reduced.source.pointer, reduced.source.pointerParity, reduced.source.offset, reduced.source.wait, reduced.active],
    )) fail(`${prefix}: source cursor drift`);
    if (!same(reduced.sprites, reducedSpriteState(row))) fail(`${prefix}: sprite reducer drift`);
    if (!same(reduced.tasks, reducedTaskState(row))) fail(`${prefix}: task reducer drift`);
    if (!same(reduced.battlerOffsets, {
      attacker: { x: row.battlerSprites.attacker.x2, y: row.battlerSprites.attacker.y2 },
      target: { x: row.battlerSprites.target.x2, y: row.battlerSprites.target.y2 },
    })) fail(`${prefix}: battler callback drift`);
    if (!same(reduced.resources, expectedResources(row))) fail(`${prefix}: resource reducer drift`);
    const expectedMonbg = {
      sourceActive: age >= 7 && age <= 241,
      displayActive: age >= 8 && age <= 242,
      clearActive: age >= 239 && age <= 241,
      layer: config.animationInputs.monbg.layer,
      registers: {
        bg1hofs: row.registers.bg1hofs, bg1vofs: row.registers.bg1vofs,
        bg2hofs: row.registers.bg2hofs, bg2vofs: row.registers.bg2vofs,
      },
    };
    if (!same(reduced.monbg, expectedMonbg)
      || !same(reduced.registers, { bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha })) {
      fail(`${prefix}: monbg/register drift`);
    }
    const expectedAudio = {
      petalDance: { onset: age === 10, event: "SE_M_PETAL_DANCE",
        pan: orientation === "player-back" ? -64 : 63 },
      impact: { onset: age === 206, event: "SE_M_MEGA_KICK2",
        pan: orientation === "player-back" ? 63 : -63 },
    };
    if (!same(reduced.audio, expectedAudio)) fail(`${prefix}: audio lifecycle drift`);
    if (!same(reduced.painterSlots, row.spriteOrder.filter((slot: number) =>
      moveSprites(row).some((sprite: Json) => sprite.slot === slot)))) {
      fail(`${prefix}: live painter order drift`);
    }
    if (!same(reduced.displayTransfer, latchExpectation(age))) fail(`${prefix}: display transfer contract drift`);
    if (!same(
      [mapRow.frame, mapRow.active, mapRow.scriptPtr, mapRow.scriptPtrParity, mapRow.scriptOffset, mapRow.scriptWait],
      [row.frame, row.animScriptActive, row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait],
    ) || !same(mapRow.battlerAxes, {
      attacker: [row.battlerSprites.attacker.x2, row.battlerSprites.attacker.y2],
      target: [row.battlerSprites.target.x2, row.battlerSprites.target.y2],
    })) fail(`${prefix}: normalized map drift`);
    if (age > 0) {
      const prior = rows[age - 1]!;
      if (!same(row.hardwareOam, prior.softwareOam)
        || !same(row.hardwareMatrices, prior.softwareMatrices)) {
        fail(`${prefix}: OAM/matrix predecessor transfer drift`);
      }
      const paletteExpected = age === 7 ? row.fadedPalette : prior.fadedPalette;
      if (!same(row.hardwarePalette, paletteExpected)) fail(`${prefix}: palette transfer drift`);
    }
    const view = sceneOnPetalDanceView({
      ...createSceneOnMovePresentation(config),
      age,
    });
    const { attacker: _attacker, target: _target, ...seamState } = view;
    if (!same(reduced, seamState)) fail(`${prefix}: typed Scene-ON seam drift`);
    reducerRows += 1;
    seamRows += 1;
  }
  const finalConfig = petalDanceConfigFor(orientation, rows, rows[243]!.spriteOrder);
  const final = petalDanceAtAge(243, {
    ...finalConfig.animationInputs,
    attackerSide: finalConfig.attacker.geometry.side,
    targetSide: finalConfig.target.geometry.side,
    attackerSpecies: finalConfig.attacker.species,
    targetSpecies: finalConfig.target.species,
    attackerBattlePositionCenter: finalConfig.attacker.geometry.battlePositionCenter,
    targetBattlePositionCenter: finalConfig.target.geometry.battlePositionCenter,
    targetSpriteOrigin: finalConfig.target.geometry.animationCenter,
  });
  if (final.active || !final.firstInactiveCleanup || final.sprites.length || final.tasks.length
    || final.resources.flowerLoaded || final.resources.impactLoaded) {
    fail(`${orientation}: first inactive cleanup drift`);
  }
  return {
    reducerRows, seamRows,
    lifecycle: { bigFlowers: 3, smallFlowers: 10, ellipse: "10..199",
      shake: "206..219", slideOffset: "201..206", hitSplat: "206..214",
      slideOriginal: "231..237", monbg: "7..241", clearMonbg: "239..241" },
    latches: { oam: "243/243 predecessor", matrices: "243/243 predecessor",
      palette: "242/243 predecessor; age 7 same-row monbg" },
    cleanup: { age: 243, active: false, framebufferCompared: false },
  };
}

export function verifyPetalDanceReducer(): Record<PetalDanceOrientation, Json> {
  return {
    "player-back": verifyOrientation("player-back"),
    "opponent-front": verifyOrientation("opponent-front"),
  };
}

if (import.meta.main) console.log(JSON.stringify(verifyPetalDanceReducer(), null, 2));
