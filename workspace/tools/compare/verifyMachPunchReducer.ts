/**
 * Dense semantic replay for MOVE_MACH_PUNCH's retained Scene-ON windows.
 * The dense rows are test/tool evidence only: the reducer receives the live
 * allocation snapshot extracted from the root and is replayed independently
 * for each orientation and pass.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  MACH_PUNCH_HANDS_AND_FEET_TAG,
  MACH_PUNCH_IMPACT_TAG,
  machPunchAtAge,
  machPunchFirstInactiveAge,
  type MachPunchLiveInputs,
  type MachPunchState,
} from "../../src/animation/machPunch.ts";
import {
  sceneOnMachPunchView,
  type SceneOnMachPunchPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type MachPunchOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_MACH_PUNCH reducer drift: ${message}`);
}

function rowsFor(orientation: MachPunchOrientation): Json[] {
  const name = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/mach-punch-${name}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

function task(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
}

function sprite(row: Json, symbol: string, callback?: string): Json | undefined {
  return row.sprites.find((entry: Json) => entry.template?.symbol === symbol && (!callback || entry.callback?.symbol === callback));
}

function allocation(row: Json, tag: number) {
  const tileSlot = row.tileTags.indexOf(tag), paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `missing Mach Punch resource tag ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  return { tileSlot, paletteBank, tileRange: [range[0], range[1]] as const };
}

function battler(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
  };
}

function traceSlots(row: Json): [number, number, number, number, number, number, number, number] {
  const traces = row.sprites
    .filter((entry: Json) => entry.callback?.symbol === "AnimBattlerTrace")
    .sort((left: Json, right: Json) => left.data[2] - right.data[2]);
  invariant(traces.length === 8, "root row must expose all eight trace allocations");
  return traces.map((entry: Json) => entry.slot) as [number, number, number, number, number, number, number, number];
}

/** Extract live presentation inputs from the root allocation rows. */
export function machPunchInputsFor(orientation: MachPunchOrientation, rows = rowsFor(orientation)): MachPunchLiveInputs {
  const row0 = rows[0]!, row1 = rows[1]!, row4 = rows[4]!, row7 = rows[7]!, row10 = rows[10]!, row29 = rows[29]!, row50 = rows[50]!, row58 = rows[58]!, row69 = rows[69]!, row57 = rows[57]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attackerEntry = row0.battlerSprites.attacker;
  const targetEntry = row0.battlerSprites.target;
  const hit = sprite(row58, "gBasicHitSplatSpriteTemplate");
  invariant(hit, `${orientation}: root hit-splat allocation`);
  const monBg = task(row7, "Task_UpdateMonBg"), initialFade = task(row10, "Task_FadeToBg");
  const slidingBg = task(row29, "AnimTask_UpdateSlidingBg"), punch = task(row50, "AnimTask_AttackerPunchWithTrace_Step");
  const shake = task(row58, "AnimTask_ShakeMon_Step"), clearMonBg = task(row69, "Task_ClearMonBg");
  const restoreFade = row69.tasks.find((entry: Json) => entry.func?.symbol === "Task_FadeToBg" && entry.data?.[0] === -1);
  invariant(monBg && initialFade && slidingBg && punch && shake && clearMonBg && restoreFade, `${orientation}: complete task allocation`);
  return {
    attackerSide, targetSide, attackerSpecies: "HITMONCHAN", targetSpecies: "CHANSEY",
    attackerPictureOrigin: { x: attackerEntry.x, y: attackerEntry.y },
    targetPictureOrigin: { x: hit.x, y: hit.y },
    attackerSprite: battler(attackerEntry), targetSprite: battler(targetEntry),
    taskSlots: {
      monBg: monBg.slot, initialFade: initialFade.slot, slidingBg: slidingBg.slot,
      punch: punch.slot, shake: shake.slot, clearMonBg: clearMonBg.slot, restoreFade: restoreFade.slot,
    },
    traceSlots: traceSlots(row57), hitSplatSlot: hit.slot,
    fistSlot: sprite(row58, "gFistFootSpriteTemplate")?.slot ?? 14,
    matrixSlot: hit.matrixNum,
    resources: { impact: allocation(row1, MACH_PUNCH_IMPACT_TAG), handsAndFeet: allocation(row4, MACH_PUNCH_HANDS_AND_FEET_TAG) },
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    matrixSlots: row0.softwareMatrices,
    fistMatrix: hit.matrix,
    spriteOrder: row0.spriteOrder,
    painterSprites: row0.sprites.map((entry: Json) => ({
      slot: entry.slot, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, oamY: entry.attr[0] & 0xff,
    })),
    registers: { bg3hofs: row0.registers.bg3hofs, bldcnt: row0.registers.bldcnt, bldalpha: row0.registers.bldalpha, bldy: row0.registers.bldy },
    animationRngSeed: row0.animationRng, gameplayRng: row0.rawBattleState.gameplayRng,
  };
}

export function machPunchConfigFor(orientation: MachPunchOrientation, rows = rowsFor(orientation)): SceneOnMachPunchPresentationState["config"] {
  const input = machPunchInputsFor(orientation, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, ...animationInputs } = input;
  return {
    move: "MACH_PUNCH",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: input.attackerPictureOrigin, battlePositionCenter: { x: input.attackerSprite.x, y: input.attackerSprite.y } } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: input.targetPictureOrigin, battlePositionCenter: { x: input.targetSprite.x, y: input.targetSprite.y } } },
    fieldProfile: {
      playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp,
      opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp,
      playerGender: "male", opponentGender: "female",
    },
    animationInputs,
  };
}

function ownedRows(row: Json): Json[] {
  return row.sprites.filter((entry: Json) =>
    (entry.template?.symbol === "gMultiuseSpriteTemplate" && entry.callback?.symbol === "AnimBattlerTrace")
    || entry.template?.symbol === "gBasicHitSplatSpriteTemplate"
    || entry.template?.symbol === "gFistFootSpriteTemplate").sort((left: Json, right: Json) => left.slot - right.slot);
}

function ownedState(state: MachPunchState): Json[] {
  return state.sprites.map((entry) => ({ ...entry })).sort((left, right) => left.slot - right.slot);
}

function compareSprites(orientation: MachPunchOrientation, age: number, row: Json, state: MachPunchState): void {
  const expected = ownedRows(row), actual = ownedState(state);
  invariant(expected.length === actual.length, `${orientation}/${age}: trace/hitsplat/fist count`);
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index]!, right = actual[index]!;
    invariant(left.slot === right.slot && left.template.symbol === right.template && left.callback.symbol === right.callback,
      `${orientation}/${age}: sprite ${index} identity`);
    for (const key of ["x", "y", "x2", "y2", "subpriority", "matrixNum"] as const) invariant(left[key] === right[key], `${orientation}/${age}: sprite ${left.slot} ${key}`);
    invariant(same(left.matrix, right.matrix), `${orientation}/${age}: sprite ${left.slot} matrix`);
    invariant(same(left.data.slice(0, right.data.length), right.data), `${orientation}/${age}: sprite ${left.slot} callback data`);
  }
}

function compareTasks(orientation: MachPunchOrientation, age: number, row: Json, state: MachPunchState): void {
  const symbols = new Set(["Task_UpdateMonBg", "Task_FadeToBg", "AnimTask_UpdateSlidingBg", "AnimTask_AttackerPunchWithTrace_Step", "AnimTask_ShakeMon_Step", "Task_ClearMonBg"]);
  const expected = row.tasks.filter((entry: Json) => symbols.has(entry.func?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot);
  const actual = state.tasks.slice().sort((left, right) => left.slot - right.slot);
  invariant(expected.length === actual.length, `${orientation}/${age}: source task count`);
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index]!, right = actual[index]!;
    invariant(left.slot === right.slot && left.func.symbol === right.callback, `${orientation}/${age}: task ${index} identity`);
    invariant(same(left.data.slice(0, right.data.length), right.data), `${orientation}/${age}: task ${right.slot} data`);
  }
}

function compareImmutable(row: Json, first: Json, orientation: MachPunchOrientation, age: number): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    if (key in row.rawBattleState && key in first.rawBattleState) invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${orientation}/${age}: immutable gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState), `${orientation}/${age}: immutable semantic state`);
}

function compareRow(orientation: MachPunchOrientation, age: number, row: Json, first: Json, input: MachPunchLiveInputs): void {
  const state = machPunchAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
    `${orientation}/${age}: source cursor/wait/active`);
  invariant(state.background.scrollX === row.battleBg.gBattle_BG3_X, `${orientation}/${age}: BG3 sliding scroll`);
  invariant(state.registers.bg3hofs === row.registers.bg3hofs, `${orientation}/${age}: predecessor-latched BG3HOFS`);
  invariant(state.registers.bldcnt === row.registers.bldcnt && state.registers.bldalpha === row.registers.bldalpha && state.registers.bldy === row.registers.bldy,
    `${orientation}/${age}: blend/fade registers`);
  invariant(state.battlers.attacker.sprite.x2 === row.battlerSprites.attacker.x2 && state.battlers.target.sprite.x2 === row.battlerSprites.target.x2,
    `${orientation}/${age}: live battler geometry/shake`);
  compareTasks(orientation, age, row, state);
  compareSprites(orientation, age, row, state);
  const impactLoaded = row.tileTags.includes(MACH_PUNCH_IMPACT_TAG), handsLoaded = row.tileTags.includes(MACH_PUNCH_HANDS_AND_FEET_TAG);
  invariant(state.resources.impact.loaded === impactLoaded && state.resources.handsAndFeet.loaded === handsLoaded, `${orientation}/${age}: resource lifetime`);
  invariant(state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap, `${orientation}/${age}: affine allocator bitmap`);
  if (age === 50 || age === 58) {
    const track = row.audio.SE1.tracks.find((entry: Json) => entry.flags & 0x80);
    invariant(track && state.audio.length === 1 && state.audio[0]!.pan === track.panX, `${orientation}/${age}: audio/pan`);
  } else invariant(state.audio.length === 0, `${orientation}/${age}: unexpected audio event`);
  if (age === 7) invariant(state.displayTransfer.palette === "same-row-monbg", `${orientation}/${age}: monbg palette latch exception`);
  if (age === 0) invariant(state.displayTransfer.oam === "initial" && state.displayTransfer.matrices === "initial", `${orientation}/${age}: initial display transfer`);
  const inactive = machPunchFirstInactiveAge(input);
  invariant(state.cleanup.firstInactive === (age === inactive) && state.cleanup.resourcesReleased === (age >= inactive), `${orientation}/${age}: teardown`);
  compareImmutable(row, first, orientation, age);
}

function replayOrientation(orientation: MachPunchOrientation): { readonly retainedRows: number; readonly reducerRows: number; readonly seamRows: number; readonly cleanup: number } {
  const rows = rowsFor(orientation), input = machPunchInputsFor(orientation, rows), config = machPunchConfigFor(orientation, rows);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [age, row] of rows.entries()) {
      compareRow(orientation, age, row!, rows[0]!, input);
      const seam = sceneOnMachPunchView({ age, config } as SceneOnMachPunchPresentationState);
      const reduced = machPunchAtAge(age, input);
      invariant(same(seam.sprites, reduced.sprites) && same(seam.tasks, reduced.tasks), `${orientation}/${age}: typed seam divergence`);
    }
  }
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: rows.length - 1 };
}

export function verifyMachPunchReducer() {
  const player = replayOrientation("player-back"), opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false },
  } as const;
}
