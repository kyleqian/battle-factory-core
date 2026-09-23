/**
 * Hermetic retained-row verifier for MOVE_OUTRAGE's source-relative reducer.
 *
 * The dense maps are confined to this verifier.  Production receives one
 * live allocator/palette/geometry snapshot and is replayed over the complete
 * 120-row bilateral contract; it never consumes a frame, row, or screenshot.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  OUTRAGE_FIRST_INACTIVE_AGE,
  OUTRAGE_RESOURCE_TAGS,
  outrageAtAge,
  type OutrageLiveInputs,
  type OutrageState,
} from "../../src/animation/outrage.ts";
import {
  sceneOnOutrageView,
  type SceneOnOutragePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type OutrageOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_OUTRAGE reducer drift: ${message}`);
}
function rowsFor(orientation: OutrageOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  const path = resolve(root, `tools/compare/evidence/outrage-${side}-dense-state.json.gz`);
  return (JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")) as Json).frames;
}
function battler(entry: Json): OutrageLiveInputs["attackerSprite"] {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    attr: [entry.attr[0], entry.attr[1], entry.attr[2]],
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum,
    matrix: [entry.matrix[0], entry.matrix[1], entry.matrix[2], entry.matrix[3]],
    flags: entry.flags,
  };
}
function firstSprite(row: Json, symbol: string): Json {
  const result = row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
  invariant(result, `missing ${symbol}`);
  return result;
}
function spriteBornAt(rows: Json[], age: number, symbol: string): Json {
  const current = rows[age]!.sprites.filter((entry: Json) => entry.template?.symbol === symbol);
  const previousSlots = new Set((rows[age - 1]?.sprites ?? [])
    .filter((entry: Json) => entry.template?.symbol === symbol)
    .map((entry: Json) => entry.slot));
  const result = current.find((entry: Json) => !previousSlots.has(entry.slot));
  invariant(result, `missing ${symbol} birth at ${age}`);
  return result;
}
function resource(rows: Json[], age: number, tag: number): OutrageLiveInputs["resources"]["smallEmber"] {
  const row = rows[age]!;
  const tileSlot = row.tileTags.indexOf(tag), paletteAllocatorSlot = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteAllocatorSlot >= 0, `missing resource allocation ${tag} at ${age}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  const hardwarePaletteBank = 16 + paletteAllocatorSlot;
  return {
    tag, tileSlot, paletteAllocatorSlot, hardwarePaletteBank,
    tileRange: [range[0], range[1]],
    palette: row.unfadedPalette.slice(hardwarePaletteBank * 16, hardwarePaletteBank * 16 + 16),
  };
}

/** Extract one live Scene-ON allocation from the retained setup row. */
export function outrageInputsFor(
  orientation: OutrageOrientation,
  rows = rowsFor(orientation),
): OutrageLiveInputs {
  const row0 = rows[0]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const firstFlame = firstSprite(rows[6]!, "gOutrageFlameSpriteTemplate");
  const taskAt = (age: number, symbol: string): Json => {
    const task = rows[age]!.tasks.find((entry: Json) => entry.func?.symbol === symbol);
    invariant(task, `${orientation}: missing ${symbol} task at ${age}`);
    return task;
  };
  const loopSe = taskAt(4, "Task_LoopAndPlaySE");
  const blendColorCycle = taskAt(4, "AnimTask_BlendColorCycleLoop");
  const translateMonElliptical = taskAt(4, "AnimTask_TranslateMonElliptical_Step");
  const shakeMon2 = taskAt(14, "AnimTask_ShakeMon2_Step");
  // Birth rows provide the complete allocation without baking their age into
  // production; later flames have already died by the end of the body.
  const births = [6, 8, 10, 12, 14, 16, 18, 20, 22, 27, 29, 31, 33, 35, 37, 39, 44, 46, 48, 50, 52, 54, 56];
  const slots = births.map((age) => spriteBornAt(rows, age, "gOutrageFlameSpriteTemplate").slot);
  invariant(slots.length === 23, `${orientation}: complete flame slot allocation`);
  const initialOccupiedSprites = [...new Set([
    ...row0.sprites.map((entry: Json) => entry.slot),
    row0.battlerSprites.attacker.slot, row0.battlerSprites.target.slot,
  ])];
  return {
    attackerSide, targetSide,
    attackerSpecies: "DRAGONITE", targetSpecies: "ONIX",
    attackerPictureOrigin: { x: firstFlame.x, y: firstFlame.y },
    targetPictureOrigin: { x: row0.battlerSprites.target.x, y: row0.battlerSprites.target.y },
    attackerSprite: battler(row0.battlerSprites.attacker),
    targetSprite: battler(row0.battlerSprites.target),
    taskSlots: {
      loopSe: loopSe.slot, blendColorCycle: blendColorCycle.slot,
      translateMonElliptical: translateMonElliptical.slot, shakeMon2: shakeMon2.slot,
    },
    spriteSlots: { flames: slots },
    resources: { smallEmber: resource(rows, 1, OUTRAGE_RESOURCE_TAGS.smallEmber) },
    allocator: {
      initialOccupiedSprites,
      initialMatrixBitmap: row0.resourceAllocators.matrixBitmap,
      spriteOrder: row0.spriteOrder,
      initialLiveSprites: row0.sprites.map((entry: Json) => ({
        slot: entry.slot, attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority,
      })),
    },
    oam: { flame: [firstFlame.attr[0], firstFlame.attr[1], firstFlame.attr[2]] },
    palettes: {
      unfaded: row0.unfadedPalette, faded: row0.fadedPalette, hardware: row0.hardwarePalette,
    },
    registers: row0.registers,
    animationRngSeed: row0.animationRng,
    gameplayRng: row0.rawBattleState.gameplayRng,
    gameplayState: row0.immutableState,
  };
}

export function outrageConfigFor(
  orientation: OutrageOrientation,
  rows = rowsFor(orientation),
): SceneOnOutragePresentationState["config"] {
  const input = outrageInputsFor(orientation, rows);
  const {
    attackerSide, targetSide, attackerSpecies, targetSpecies,
    attackerPictureOrigin, targetPictureOrigin, ...animationInputs
  } = input;
  const shadow = rows[0]!.sprites.find(
    (entry: Json) => entry.template?.symbol === "gSpriteTemplate_EnemyShadow",
  );
  invariant(shadow, `${orientation}: enemy shadow setup sprite`);
  const opponentBattlePositionCenter = { x: shadow.x, y: shadow.y - 29 };
  return {
    move: "OUTRAGE",
    attacker: {
      species: attackerSpecies as "DRAGONITE",
      geometry: {
        side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 },
        animationCenter: attackerPictureOrigin,
        battlePositionCenter: attackerSide === "opponent"
          ? opponentBattlePositionCenter : attackerPictureOrigin,
      },
    },
    target: {
      species: targetSpecies as "ONIX",
      geometry: {
        side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 },
        animationCenter: targetPictureOrigin,
        battlePositionCenter: targetSide === "opponent"
          ? opponentBattlePositionCenter : targetPictureOrigin,
      },
    },
    fieldProfile: {
      playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp,
      opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp,
      playerGender: rows[0]!.parties.player[0].gender, opponentGender: rows[0]!.parties.opponent[0].gender,
    },
    animationInputs,
  };
}

const ownedTemplates = new Set(["gOutrageFlameSpriteTemplate"]);
const ownedCallbacks = new Set([
  "Task_LoopAndPlaySE", "AnimTask_BlendColorCycleLoop",
  "AnimTask_TranslateMonElliptical_Step", "AnimTask_ShakeMon2_Step",
]);
function ownedRows(row: Json): Json[] {
  return row.sprites.filter((entry: Json) => ownedTemplates.has(entry.template?.symbol))
    .sort((left: Json, right: Json) => left.slot - right.slot);
}
function ownedTasks(row: Json): Json[] {
  return row.tasks.filter((entry: Json) => ownedCallbacks.has(entry.func?.symbol))
    .sort((left: Json, right: Json) => left.slot - right.slot || left.func.symbol.localeCompare(right.func.symbol));
}
function compactRowSprite(sprite: Json): unknown {
  return {
    slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    subpriority: sprite.subpriority, oamPriority: (sprite.attr[2] >>> 10) & 3,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, flags: sprite.flags,
    data: sprite.data, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex,
    animDelayCounter: sprite.animDelayCounter,
  };
}
function compactStateSprite(sprite: OutrageState["sprites"][number]): unknown {
  return {
    slot: sprite.slot, template: sprite.template, callback: sprite.callback,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    subpriority: sprite.subpriority, oamPriority: sprite.oamPriority,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, flags: sprite.flags,
    data: sprite.data, animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex,
    animDelayCounter: sprite.animDelayCounter,
  };
}
function compareRow(
  orientation: OutrageOrientation,
  age: number,
  rows: Json[],
  input: OutrageLiveInputs,
): void {
  const row = rows[age]!, state = outrageAtAge(age, input);
  invariant(state.active === row.animScriptActive
    && state.source.pointer === row.scriptPtr
    && state.source.pointerOffset === row.scriptOffset
    && state.source.pointerParity === row.scriptPtrParity
    && state.source.wait === row.scriptWait,
  `${orientation}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: source args`);
  invariant(same(state.tasks.map((task) => ({ slot: task.slot, func: task.callback, data: task.data })), ownedTasks(row).map((task) => ({ slot: task.slot, func: task.func.symbol, data: task.data }))), `${orientation}/${age}: task identities/data`);
  invariant(same(state.sprites.map(compactStateSprite), ownedRows(row).map(compactRowSprite)), `${orientation}/${age}: flame geometry/OAM/matrix/data`);
  invariant(state.resources.matrixBitmap === row.resourceAllocators.matrixBitmap, `${orientation}/${age}: matrix bitmap`);
  const resource = state.resources.tags.smallEmber;
  const loaded = row.tileTags.includes(OUTRAGE_RESOURCE_TAGS.smallEmber)
    && row.paletteTags.includes(OUTRAGE_RESOURCE_TAGS.smallEmber);
  invariant(resource.loaded === loaded, `${orientation}/${age}: Small Ember lifetime`);
  if (loaded) {
    invariant(row.tileTags[resource.tileSlot] === OUTRAGE_RESOURCE_TAGS.smallEmber
      && row.paletteTags[resource.paletteAllocatorSlot] === OUTRAGE_RESOURCE_TAGS.smallEmber
      && same(row.resourceAllocators.tileRanges[resource.tileSlot], resource.tileRange),
    `${orientation}/${age}: Small Ember allocation bounds`);
  }
  invariant(same(state.palette.unfaded, row.unfadedPalette)
    && same(state.palette.faded, row.fadedPalette)
    && same(state.palette.hardware, row.hardwarePalette), `${orientation}/${age}: all palette banks`);
  invariant(same(state.registers, row.registers), `${orientation}/${age}: source registers`);
  if (age < OUTRAGE_FIRST_INACTIVE_AGE) {
    invariant(state.battlers.attacker.sprite.x2 === row.battlerSprites.attacker.x2
      && state.battlers.attacker.sprite.y2 === row.battlerSprites.attacker.y2
      && same(state.battlers.attacker.sprite.attr, row.battlerSprites.attacker.attr)
      && state.battlers.target.sprite.x2 === row.battlerSprites.target.x2
      && state.battlers.target.sprite.y2 === row.battlerSprites.target.y2
      && same(state.battlers.target.sprite.attr, row.battlerSprites.target.attr), `${orientation}/${age}: battler OAM/axes`);
  }
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: painter order`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount
    && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedSprites === ownedRows(row).length
    && state.cleanup.ownedTasks === ownedTasks(row).length
    && state.cleanup.firstInactive === (age === OUTRAGE_FIRST_INACTIVE_AGE)
    && state.cleanup.resourcesReleased === (age === OUTRAGE_FIRST_INACTIVE_AGE), `${orientation}/${age}: cleanup counts`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged
    && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.rng.gameplayState, row.immutableState)
    && same(row.immutableState, rows[0]!.immutableState), `${orientation}/${age}: RNG/state split`);
  if (state.audio.length > 0) {
    invariant(age === 4 && row.audio.SE1.songHeaderIdentity.symbol === "se_m_dragon_rage"
      && row.audio.SE1.tracks.some((track: Json) => track.panX === state.audio[0]!.pan), `${orientation}/${age}: Dragon Rage audio`);
  }
  if (age > 0) {
    invariant(same(row.hardwareOam, rows[age - 1]!.softwareOam), `${orientation}/${age}: full OAM predecessor latch`);
    invariant(same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), `${orientation}/${age}: full matrix predecessor latch`);
    invariant(same(row.hardwarePalette, rows[age - 1]!.fadedPalette), `${orientation}/${age}: full palette predecessor latch`);
  }
}

function replayOrientation(orientation: OutrageOrientation) {
  const rows = rowsFor(orientation), input = outrageInputsFor(orientation, rows), config = outrageConfigFor(orientation, rows);
  invariant(rows.length === OUTRAGE_FIRST_INACTIVE_AGE + 1, `${orientation}: complete 120-row retained body`);
  for (let pass = 0; pass < 2; pass += 1) for (const [age] of rows.entries()) {
    compareRow(orientation, age, rows, input);
    const reduced = outrageAtAge(age, input);
    const seam = sceneOnOutrageView({ age, config } as SceneOnOutragePresentationState);
    const { attacker, target, ...seamState } = seam;
    invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: typed presentation seam`);
  }
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: OUTRAGE_FIRST_INACTIVE_AGE } as const;
}

/** Replay both retained Scene-ON orientations twice; framebuffer credit is separate. */
export function verifyOutrageReducer() {
  const player = replayOrientation("player-back");
  const opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyOutrageReducer(), null, 2));
}
