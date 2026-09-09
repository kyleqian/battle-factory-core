/**
 * State-only replay of Sky Uppercut's retained Scene-ON component rows.
 *
 * This development verifier reads dense state receipts to validate the pure
 * reducer and typed seam. It never opens the raw-RGB archives or compares a
 * framebuffer/compositor; production code imports none of these receipts.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  skyUppercutAtAge,
  type SkyUppercutLiveInputs,
  type SkyUppercutState,
} from "../../src/animation/skyUppercut.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSkyUppercutView,
  type SceneOnSkyUppercutConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SkyUppercutOrientation = "player-back" | "opponent-front";

const paths: Record<SkyUppercutOrientation, string> = {
  "player-back": "tools/compare/evidence/sky-uppercut-player-dense-state.json.gz",
  "opponent-front": "tools/compare/evidence/sky-uppercut-opponent-dense-state.json.gz",
};
const spriteTemplates = new Set([
  "gSlideMonToOffsetSpriteTemplate",
  "gBasicHitSplatSpriteTemplate",
  "gSlideMonToOriginalPosSpriteTemplate",
]);
const taskCallbacks = new Set([
  "Task_UpdateMonBg",
  "Task_FadeToBg",
  "AnimTask_MoveSkyUppercutBg",
  "AnimTask_ShakeMon2_Step",
  "AnimTask_ShakeMonInPlace_Step",
  "Task_ClearMonBg",
]);
const impactAges = [91, 94, 97, 100, 103] as const;

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
  return row.sprites.filter((sprite: Json) => spriteTemplates.has(sprite.template?.symbol));
}

function reducedSpriteState(row: Json): Json[] {
  return moveSprites(row).map((sprite: Json) => ({
    slot: sprite.slot,
    kind: sprite.template.symbol === "gSlideMonToOffsetSpriteTemplate" ? "slide-to-offset"
      : sprite.template.symbol === "gSlideMonToOriginalPosSpriteTemplate" ? "slide-to-original" : "hitsplat",
    template: sprite.template.symbol,
    callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    subpriority: sprite.subpriority, matrixNum: sprite.matrixNum, matrix: sprite.matrix,
    visible: !sprite.invisible, data: sprite.data,
  }));
}

function reducedTaskState(row: Json): Json[] {
  return row.tasks.filter((task: Json) => taskCallbacks.has(task.func?.symbol)).map((task: Json) => ({
    slot: task.slot,
    kind: task.func.symbol === "Task_UpdateMonBg" ? "update-monbg"
      : task.func.symbol === "Task_FadeToBg" ? "fade-to-bg"
      : task.func.symbol === "AnimTask_MoveSkyUppercutBg" ? "sky-uppercut-bg"
      : task.func.symbol === "AnimTask_ShakeMon2_Step" ? "shake-mon2"
      : task.func.symbol === "AnimTask_ShakeMonInPlace_Step" ? "shake-mon-in-place"
      : "clear-monbg",
    callback: task.func.symbol,
    data: task.data,
  }));
}

function task(row: Json, callback: string, predicate?: (entry: Json) => boolean): Json {
  const found = row.tasks.find((entry: Json) => entry.func?.symbol === callback
    && (!predicate || predicate(entry)));
  if (!found) fail(`missing ${callback}`);
  return found;
}

function sprite(row: Json, template: string, predicate?: (entry: Json) => boolean): Json {
  const found = row.sprites.find((entry: Json) => entry.template?.symbol === template
    && (!predicate || predicate(entry)));
  if (!found) fail(`missing ${template}`);
  return found;
}

function impactAtBirth(rows: Json[], age: number): Json {
  const priorSlots = new Set(age === 0 ? [] : moveSprites(rows[age - 1]!)
    .filter((entry) => entry.template.symbol === "gBasicHitSplatSpriteTemplate")
    .map((entry) => entry.slot));
  const born = moveSprites(rows[age]!).filter((entry) =>
    entry.template.symbol === "gBasicHitSplatSpriteTemplate" && !priorSlots.has(entry.slot));
  if (born.length !== 1) fail(`age ${age}: one new IMPACT allocation required`);
  return born[0]!;
}

/** Build a seam config from live allocator facts in one retained orientation. */
export function skyUppercutConfigFor(
  orientation: SkyUppercutOrientation,
  rows: Json[],
  spriteOrder: readonly number[],
): SceneOnSkyUppercutConfig {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const firstOffset = sprite(rows[85]!, "gSlideMonToOffsetSpriteTemplate");
  const targetOffset = sprite(rows[103]!, "gSlideMonToOffsetSpriteTemplate");
  const attackerReturn = sprite(rows[141]!, "gSlideMonToOriginalPosSpriteTemplate");
  const targetReturn = sprite(rows[147]!, "gSlideMonToOriginalPosSpriteTemplate");
  const impacts = impactAges.map((age) => impactAtBirth(rows, age));
  const update = task(rows[4]!, "Task_UpdateMonBg");
  const fadeIn = task(rows[7]!, "Task_FadeToBg", (entry) => entry.data[0] === 17);
  const background = task(rows[26]!, "AnimTask_MoveSkyUppercutBg");
  const shake2 = task(rows[91]!, "AnimTask_ShakeMon2_Step");
  const shakeInPlace = task(rows[109]!, "AnimTask_ShakeMonInPlace_Step");
  const clear = task(rows[147]!, "Task_ClearMonBg");
  const restore = task(rows[147]!, "Task_FadeToBg", (entry) => entry.data[0] === -1);
  const attackerSprite = rows[0]!.battlerSprites.attacker;
  const targetSprite = rows[0]!.battlerSprites.target;
  const allocators = rows[1]!.resourceAllocators;
  const impactPaletteBank = allocators.paletteTags.indexOf(10135);
  const impactTileSlot = allocators.tileTags.indexOf(10135);
  if (impactPaletteBank < 0 || impactTileSlot < 0) fail(`${orientation}: IMPACT allocation missing`);
  const animationInputs: Omit<SkyUppercutLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter"> = {
    targetPictureOrigin: { x: firstOffset.x, y: firstOffset.y },
    attackerSpriteSlot: attackerSprite.slot,
    targetSpriteSlot: targetSprite.slot,
    attackerInitialOffset: { x: attackerSprite.x2, y: attackerSprite.y2 },
    targetInitialOffset: { x: targetSprite.x2, y: targetSprite.y2 },
    slideSpriteSlots: [firstOffset.slot, targetOffset.slot, attackerReturn.slot, targetReturn.slot],
    impactSpriteSlots: [impacts[0]!.slot, impacts[1]!.slot, impacts[2]!.slot,
      impacts[3]!.slot, impacts[4]!.slot],
    impactMatrixSlots: [impacts[0]!.matrixNum, impacts[1]!.matrixNum, impacts[2]!.matrixNum,
      impacts[3]!.matrixNum, impacts[4]!.matrixNum],
    updateMonBgTaskSlot: update.slot, fadeInTaskSlot: fadeIn.slot, backgroundTaskSlot: background.slot,
    shakeMon2TaskSlot: shake2.slot, shakeMonInPlaceTaskSlot: shakeInPlace.slot,
    clearMonBgTaskSlot: clear.slot, restoreFadeTaskSlot: restore.slot,
    slideSubpriority: firstOffset.subpriority, impactSubpriority: impacts[0]!.subpriority,
    impactPaletteBank, impactTileSlot, baseMatrixBitmap: rows[0]!.resourceAllocators.matrixBitmap,
    spriteOrder,
    monbg: {
      layer: targetSide === "player" ? "bg2" : "bg1",
      spriteSlot: update.data[0], spriteX: update.data[1], spriteY: update.data[2],
      bgX: update.data[3], bgY: update.data[4], inBg2: Boolean(update.data[5]),
      battlerId: update.data[6],
    },
    initialBg3Offset: {
      x: rows[0]!.battleBg.gBattle_BG3_X,
      y: rows[0]!.battleBg.gBattle_BG3_Y,
    },
  };
  return {
    move: "SKY_UPPERCUT",
    attacker: { species: "HITMONCHAN", geometry: { side: attackerSide,
      spriteCorner: { x: attackerSprite.x - 32, y: attackerSprite.y - 32 },
      animationCenter: { x: attackerSprite.x, y: attackerSprite.y },
      battlePositionCenter: { x: attackerSprite.x, y: attackerSprite.y } } },
    target: { species: "ONIX", geometry: { side: targetSide,
      spriteCorner: { x: targetSprite.x - 32, y: targetSprite.y - 32 },
      animationCenter: { x: targetSprite.x, y: targetSprite.y },
      battlePositionCenter: { x: targetSprite.x, y: targetSprite.y } } },
    fieldProfile: { playerHp: rows[0]!.battlers.player.hp,
      playerMaxHp: rows[0]!.battlers.player.maxHp,
      opponentHp: rows[0]!.battlers.opponent.hp,
      opponentMaxHp: rows[0]!.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "male" },
    animationInputs,
  };
}

function directInput(config: SceneOnSkyUppercutConfig): SkyUppercutLiveInputs {
  return {
    ...config.animationInputs,
    attackerSide: config.attacker.geometry.side,
    targetSide: config.target.geometry.side,
    attackerSpecies: config.attacker.species,
    targetSpecies: config.target.species,
    attackerCenter: config.attacker.geometry.animationCenter,
    targetCenter: config.target.geometry.animationCenter,
  };
}

function expectedResources(row: Json, input: SkyUppercutLiveInputs): SkyUppercutState["resources"] {
  const loaded = row.tileTags.includes(10135);
  return {
    impactLoaded: loaded,
    impactTag: loaded ? 10135 : null,
    impactPaletteBank: loaded ? input.impactPaletteBank : null,
    impactTileSlot: loaded ? input.impactTileSlot : null,
    matrixBitmap: row.resourceAllocators.matrixBitmap,
  };
}

function expectedLatch(age: number): SkyUppercutState["displayTransfer"] {
  return {
    oam: age === 0 ? "current" : "predecessor",
    matrices: age === 0 ? "current" : "predecessor",
    palette: age === 0 ? "current" : age === 4 ? "same-row-monbg-setup" : "predecessor",
  };
}

function assertRetainedLatches(rows: Json[], orientation: SkyUppercutOrientation): void {
  for (let age = 1; age < rows.length; age += 1) {
    const row = rows[age]!;
    const predecessor = rows[age - 1]!;
    if (!same(row.hardwareOam, predecessor.softwareOam)) fail(`${orientation} age ${age}: OAM latch drift`);
    if (!same(row.hardwareMatrices, predecessor.softwareMatrices)) fail(`${orientation} age ${age}: matrix latch drift`);
    if (age === 4) {
      if (same(row.hardwarePalette, predecessor.fadedPalette)
        || !same(row.hardwarePalette, row.fadedPalette)) {
        fail(`${orientation} age 4: same-row monbg palette exception drift`);
      }
    } else if (!same(row.hardwarePalette, predecessor.fadedPalette)) {
      fail(`${orientation} age ${age}: palette latch drift`);
    }
  }
}

function verifyOrientation(orientation: SkyUppercutOrientation): Json {
  const archive = JSON.parse(gunzipSync(readFileSync(paths[orientation])).toString("utf8")) as Json;
  const rows = archive.frames as Json[];
  if (rows.length !== 188) fail(`${orientation}: retained window length`);
  assertRetainedLatches(rows, orientation);
  let reducerRows = 0;
  let seamRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const config = skyUppercutConfigFor(orientation, rows, row.spriteOrder);
    const input = directInput(config);
    const reduced = skyUppercutAtAge(age, input);
    const seamState = createSceneOnMovePresentation(config);
    const seam = sceneOnSkyUppercutView({ ...seamState, age });
    const { attacker: _attacker, target: _target, ...seamReduced } = seam;
    const prefix = `${orientation} age ${age}`;
    if (!same(reduced, seamReduced)) fail(`${prefix}: typed seam drift`);
    if (!same(
      [row.scriptOwner, row.scriptPtr, row.scriptPtrParity, row.scriptOffset, row.scriptWait, row.animScriptActive],
      [reduced.source.owner, reduced.source.pointer, reduced.source.pointerParity,
        reduced.source.offset, reduced.source.wait, reduced.active],
    )) fail(`${prefix}: source cursor drift`);
    if (!same(reduced.sprites, reducedSpriteState(row))) fail(`${prefix}: sprite callback drift`);
    if (!same(reduced.tasks, reducedTaskState(row))) fail(`${prefix}: task callback drift`);
    if (!same(reduced.battlerOffsets, {
      attacker: { x: row.battlerSprites.attacker.x2, y: row.battlerSprites.attacker.y2 },
      target: { x: row.battlerSprites.target.x2, y: row.battlerSprites.target.y2 },
    })) fail(`${prefix}: battler offset drift`);
    if (!same(reduced.resources, expectedResources(row, input))) fail(`${prefix}: resource allocation drift`);
    const sourceOffsets = input.monbg.layer === "bg1"
      ? { x: row.battleBg.gBattle_BG1_X, y: row.battleBg.gBattle_BG1_Y }
      : { x: row.battleBg.gBattle_BG2_X, y: row.battleBg.gBattle_BG2_Y };
    if (!same(reduced.monbg.sourceOffsets, sourceOffsets)) fail(`${prefix}: monbg source offsets drift`);
    if (!same(reduced.background.bg3, {
      x: row.battleBg.gBattle_BG3_X, y: row.battleBg.gBattle_BG3_Y,
    })) fail(`${prefix}: BG3 source callback drift`);
    if (!same(reduced.registers, {
      bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha, bldy: row.registers.bldy,
    })) fail(`${prefix}: blend register drift`);
    const expectedPainter = row.spriteOrder.filter((slot: number) =>
      reducedSpriteState(row).some((entry) => entry.slot === slot));
    if (!same(reduced.painterSlots, expectedPainter)) fail(`${prefix}: painter order drift`);
    if (!same(reduced.displayTransfer, expectedLatch(age))) fail(`${prefix}: transfer latch contract drift`);
    if (reduced.firstInactiveCleanup !== (age === 187)) fail(`${prefix}: cleanup boundary drift`);
    reducerRows += 1;
    seamRows += 1;
  }
  return {
    reducerRows, seamRows,
    lifecycle: {
      updateMonBg: "4..149", backgroundTask: "26..167", shakeMon2: "91..100",
      shakeMonInPlace: "109..117", firstInactiveCleanup: 187,
    },
    latches: {
      oam: "187/187 predecessor", matrices: "187/187 predecessor",
      palette: "186/187 predecessor; age 4 same-row monbg setup",
    },
    cleanup: { age: 187, active: false, framebufferCompared: false },
  };
}

/** Replays both orientations. Call twice in the Tier-1 test for determinism. */
export function verifySkyUppercutReducer(): Json {
  return {
    "player-back": verifyOrientation("player-back"),
    "opponent-front": verifyOrientation("opponent-front"),
  };
}
