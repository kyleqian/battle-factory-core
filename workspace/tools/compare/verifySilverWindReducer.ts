/**
 * Hermetic retained-row verifier for MOVE_SILVER_WIND's reducer/seam.
 *
 * Evidence is decoded here only to obtain one live Scene-ON allocation per
 * orientation.  The production reducer receives no retained row, RGB frame,
 * carrier identity, or absolute battle tick.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SILVER_WIND_FIRST_INACTIVE_AGE,
  SILVER_WIND_SPARKLE_TAG,
  silverWindAtAge,
  type SilverWindLiveInputs,
  type SilverWindState,
} from "../../src/animation/silverWind.ts";
import {
  sceneOnSilverWindView,
  type SceneOnSilverWindPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SilverWindOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SILVER_WIND reducer drift: ${message}`);
}
function rowsFor(orientation: SilverWindOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/silver-wind-${side}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}
function battler(entry: Json): SilverWindLiveInputs["attackerSprite"] {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    attr: [entry.attr[0], entry.attr[1], entry.attr[2]], subpriority: entry.subpriority,
    oamPriority: (entry.attr[2] >>> 10) & 3, matrixNum: entry.matrixNum,
    matrix: [entry.matrix[0], entry.matrix[1], entry.matrix[2], entry.matrix[3]], flags: entry.flags,
  };
}
const OWNED_TEMPLATES = new Set([
  "gSilverWindBigSparkSpriteTemplate",
  "gSilverWindMediumSparkSpriteTemplate",
  "gSilverWindSmallSparkSpriteTemplate",
]);
function ownedSprites(row: Json): Json[] {
  return row.sprites.filter((entry: Json) => OWNED_TEMPLATES.has(entry.template?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot);
}
function task(row: Json, symbol: string): Json {
  const found = row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
  invariant(found, `missing ${symbol}`);
  return found;
}
function bornSparkles(rows: Json[]): Json[] {
  const births: Json[] = [];
  for (const age of [49, 51, 53, 61, 63, 65]) {
    const previous = new Set(ownedSprites(rows[age - 1]!).map((entry) => entry.slot));
    births.push(...ownedSprites(rows[age]!).filter((entry) => !previous.has(entry.slot)));
  }
  invariant(births.length === 18, `expected 18 Sparkle6 allocations, got ${births.length}`);
  return births;
}
function resource(rows: Json[]): SilverWindLiveInputs["resources"]["sparkle6"] {
  const row = rows[1]!, tileSlot = row.tileTags.indexOf(SILVER_WIND_SPARKLE_TAG), paletteAllocatorSlot = row.paletteTags.indexOf(SILVER_WIND_SPARKLE_TAG);
  invariant(tileSlot >= 0 && paletteAllocatorSlot >= 0, "missing Sparkle6 resource allocation");
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, "missing Sparkle6 tile range");
  const paletteBank = 16 + paletteAllocatorSlot;
  return {
    tag: SILVER_WIND_SPARKLE_TAG, tileSlot, paletteAllocatorSlot, paletteBank,
    tileRange: [range[0], range[1]], palette: row.unfadedPalette.slice(paletteBank * 16, paletteBank * 16 + 16),
  };
}

/** One source-legal scene allocation; retained maps never cross this boundary. */
export function silverWindInputsFor(
  orientation: SilverWindOrientation,
  rows = rowsFor(orientation),
): SilverWindLiveInputs {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const row0 = rows[0]!, monbgAge = rows[7]!, splitAge = rows[9]!;
  const clearStart = attackerSide === "player" ? 142 : 145;
  const restoreStart = clearStart + 4;
  const slideEnd = attackerSide === "player" ? 165 : 168;
  const births = bornSparkles(rows);
  const initialSprites = row0.sprites.map((entry: Json) => ({
    slot: entry.slot, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, oamY: entry.attr[0] & 0xff,
  }));
  const initialSlots = new Set(initialSprites.map((entry: { slot: number }) => entry.slot));
  const monbg = attackerSide === "player"
    ? { bg: 1 as const, paletteBank: 8, activeCnt: monbgAge.registers.bg1cnt, splitBg1Cnt: splitAge.registers.bg1cnt, splitBg2Cnt: splitAge.registers.bg2cnt }
    : { bg: 2 as const, paletteBank: 9, activeCnt: monbgAge.registers.bg2cnt, splitBg1Cnt: splitAge.registers.bg1cnt, splitBg2Cnt: splitAge.registers.bg2cnt };
  return {
    attackerSide, targetSide,
    attackerSpecies: attackerSide === "player" ? "BUTTERFREE" : "BUTTERFREE",
    targetSpecies: targetSide === "player" ? "ONIX" : "ONIX",
    attackerPictureOrigin: { x: row0.battlerSprites.attacker.x, y: row0.battlerSprites.attacker.y },
    // BATTLER_COORD_Y_PIC_OFFSET is scene geometry, not raw sprite y for a
    // player-back target. Recover that one live picture origin from the
    // first source-created Sparkle6 (its source y argument is -32).
    targetPictureOrigin: { x: row0.battlerSprites.target.x, y: births[0]!.y + 32 },
    attackerSprite: battler(row0.battlerSprites.attacker), targetSprite: battler(row0.battlerSprites.target),
    taskSlots: {
      pan: task(rows[4]!, "Task_PanFromInitialToTarget").slot,
      monbg: task(rows[6]!, "Task_UpdateMonBg").slot,
      firstExclude: task(rows[11]!, "AnimTask_BlendSpriteColor_Step2").slot,
      firstFade: task(rows[11]!, "Task_FadeToBg").slot,
      slidingBg: task(rows[30]!, "AnimTask_UpdateSlidingBg").slot,
      clearMonbg: task(rows[clearStart]!, "Task_ClearMonBg").slot,
      restoreFade: task(rows[restoreStart]!, "Task_FadeToBg").slot,
      secondExclude: task(rows[slideEnd]!, "AnimTask_BlendSpriteColor_Step2").slot,
    },
    sparkleSlots: births.map((entry) => ({
      slot: entry.slot, matrixNum: entry.matrixNum, attr: [entry.attr[0], entry.attr[1], entry.attr[2]],
      subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    })),
    resources: { sparkle6: resource(rows) },
    allocator: {
      initialMatrixBitmap: row0.resourceAllocators.matrixBitmap,
      // Keep only currently allocated scene sprites.  The scene owns the
      // remaining persistent order carrier slots outside this move reducer.
      spriteOrder: row0.spriteOrder.filter((slot: number) => initialSlots.has(slot)),
      initialSprites,
    },
    palettes: { unfaded: row0.unfadedPalette, faded: row0.fadedPalette, hardware: row0.hardwarePalette },
    background: {
      values: row0.battleBg, registers: row0.registers, monbg,
      bugBackground: { player: "BG_BUG_PLAYER", opponent: "BG_BUG_OPPONENT" },
      bugBackgroundTaskId: { player: task(rows[11]!, "Task_FadeToBg").data[0], opponent: task(rowsFor("opponent-front")[11]!, "Task_FadeToBg").data[0] },
    },
    animationRngSeed: row0.animationRng, gameplayRng: row0.rawBattleState.gameplayRng, gameplayState: row0.immutableState,
  };
}

export function silverWindConfigFor(
  orientation: SilverWindOrientation,
  rows = rowsFor(orientation),
): SceneOnSilverWindPresentationState["config"] {
  const input = silverWindInputsFor(orientation, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureOrigin, targetPictureOrigin, ...animationInputs } = input;
  const row = rows[0]!;
  return {
    move: "SILVER_WIND",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: attackerPictureOrigin, battlePositionCenter: attackerPictureOrigin } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: targetPictureOrigin, battlePositionCenter: targetPictureOrigin } },
    fieldProfile: { playerHp: row.parties.player[0].hp, playerMaxHp: row.parties.player[0].maxHp, opponentHp: row.parties.opponent[0].hp, opponentMaxHp: row.parties.opponent[0].maxHp, playerGender: row.parties.player[0].gender, opponentGender: row.parties.opponent[0].gender },
    animationInputs,
  };
}

function compactRowSparkle(sprite: Json): unknown {
  return {
    slot: sprite.slot, template: sprite.template.symbol, callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    subpriority: sprite.subpriority, oamPriority: (sprite.attr[2] >>> 10) & 3,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, flags: sprite.flags, data: sprite.data,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter,
  };
}
function compactStateSparkle(sprite: SilverWindState["sprites"][number]): unknown {
  return {
    slot: sprite.slot, template: sprite.template, callback: sprite.callback,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2, attr: sprite.attr,
    subpriority: sprite.subpriority, oamPriority: sprite.oamPriority,
    matrixNum: sprite.matrixNum, matrix: sprite.matrix, flags: sprite.flags, data: sprite.data,
    animNum: sprite.animNum, animCmdIndex: sprite.animCmdIndex, animDelayCounter: sprite.animDelayCounter,
  };
}
const OWNED_TASKS = new Set([
  "Task_PanFromInitialToTarget", "Task_UpdateMonBg", "AnimTask_BlendSpriteColor_Step2",
  "Task_FadeToBg", "AnimTask_UpdateSlidingBg", "Task_ClearMonBg",
]);
function compactTask(task: Json): unknown { return { slot: task.slot, callback: task.func.symbol, data: task.data }; }
function compactReducerTask(task: SilverWindState["tasks"][number]): unknown { return { slot: task.slot, callback: task.callback, data: task.data }; }

function compareLatches(orientation: SilverWindOrientation, age: number, rows: Json[], state: SilverWindState): void {
  const row = rows[age]!;
  if (age > 0) {
    invariant(same(row.hardwareOam, rows[age - 1]!.softwareOam), `${orientation}/${age}: whole OAM RAM+1`);
    invariant(same(row.hardwareMatrices, rows[age - 1]!.softwareMatrices), `${orientation}/${age}: whole matrix RAM+1`);
    invariant(same(row.hardwarePalette, age === 6 ? row.fadedPalette : rows[age - 1]!.fadedPalette), `${orientation}/${age}: palette RAM+1`);
  }
  invariant(state.latches.oamAndMatrices === (age === 0 ? "initial" : "preceding-software"), `${orientation}/${age}: reducer OAM/matrix latch`);
  invariant(state.latches.palette === (age === 0 ? "initial" : age === 6 ? "same-row-monbg" : "preceding-faded"), `${orientation}/${age}: reducer palette latch`);
}
function compareRow(orientation: SilverWindOrientation, age: number, rows: Json[], input: SilverWindLiveInputs): void {
  const row = rows[age]!, state = silverWindAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait, `${orientation}/${age}: complete source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: source args`);
  invariant(same(state.sprites.map(compactStateSparkle), ownedSprites(row).map(compactRowSparkle)), `${orientation}/${age}: all 18 Sparkle6 callbacks/OAM/matrices/data`);
  invariant(same(state.tasks.map(compactReducerTask), row.tasks.filter((entry: Json) => OWNED_TASKS.has(entry.func?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot).map(compactTask)), `${orientation}/${age}: source task lives/data`);
  const tagPresent = row.tileTags.includes(SILVER_WIND_SPARKLE_TAG) && row.paletteTags.includes(SILVER_WIND_SPARKLE_TAG);
  invariant(state.resources.sparkle6.loaded === tagPresent && state.resources.sparkle6.tag === (tagPresent ? SILVER_WIND_SPARKLE_TAG : null), `${orientation}/${age}: Sparkle6 lifetime`);
  if (tagPresent) invariant(row.tileTags[state.resources.sparkle6.allocation!.tileSlot] === SILVER_WIND_SPARKLE_TAG && row.paletteTags[state.resources.sparkle6.allocation!.paletteAllocatorSlot] === SILVER_WIND_SPARKLE_TAG, `${orientation}/${age}: Sparkle6 allocation`);
  const selectedBg = input.background.monbg.bg;
  invariant(state.background.values[`gBattle_BG${selectedBg}_X`] === row.battleBg[`gBattle_BG${selectedBg}_X`] && state.background.values[`gBattle_BG${selectedBg}_Y`] === row.battleBg[`gBattle_BG${selectedBg}_Y`], `${orientation}/${age}: target monbg source values`);
  invariant(state.background.values.gBattle_BG3_X === row.battleBg.gBattle_BG3_X, `${orientation}/${age}: side-specific sliding BG software`);
  invariant(state.registers[`bg${selectedBg}hofs`] === row.registers[`bg${selectedBg}hofs`] && state.registers.bg3hofs === row.registers.bg3hofs, `${orientation}/${age}: monbg/sliding hardware registers`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng) && same(state.rng.gameplayState, row.immutableState), `${orientation}/${age}: presentation RNG/gameplay opacity`);
  invariant(state.cleanup.firstInactive === !row.animScriptActive && state.cleanup.resourcesReleased === !row.animScriptActive, `${orientation}/${age}: first inactive cleanup declaration`);
  if (!row.animScriptActive) invariant(row.visualTaskCount === 0 && row.soundTaskCount === 0 && row.tasks.length === 0 && ownedSprites(row).length === 0 && state.tasks.length === 0 && state.sprites.length === 0, `${orientation}/${age}: first inactive task/audio/sprite cleanup`);
  compareLatches(orientation, age, rows, state);
}

function replayOrientation(orientation: SilverWindOrientation) {
  const rows = rowsFor(orientation), input = silverWindInputsFor(orientation, rows), config = silverWindConfigFor(orientation, rows);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  invariant(rows.length === SILVER_WIND_FIRST_INACTIVE_AGE[attackerSide] + 1, `${orientation}: complete retained window`);
  for (let pass = 0; pass < 2; pass += 1) for (const [age] of rows.entries()) {
    compareRow(orientation, age, rows, input);
    const reduced = silverWindAtAge(age, input);
    const seam = sceneOnSilverWindView({ age, config } as SceneOnSilverWindPresentationState);
    const { attacker, target, ...seamState } = seam;
    invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: typed Scene-ON seam`);
  }
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: SILVER_WIND_FIRST_INACTIVE_AGE[attackerSide] };
}

/** Replay all 389 bilateral retained rows twice, with no framebuffer credit. */
export function verifySilverWindReducer() {
  const player = replayOrientation("player-back"), opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifySilverWindReducer(), null, 2));
