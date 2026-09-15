/**
 * Dense semantic replay for MOVE_PSYCH_UP's retained Scene-ON root windows.
 *
 * Retained rows are test-only evidence.  The production reducer is supplied
 * only the live root allocation and is compared back to every owned semantic
 * field on every row, twice per orientation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  PSYCH_UP_FIRST_INACTIVE_AGE,
  psychUpAtAge,
  type PsychUpLiveInputs,
  type PsychUpState,
} from "../../src/animation/psychUp.ts";
import {
  sceneOnPsychUpView,
  type SceneOnPsychUpPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type PsychUpOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_PSYCH_UP reducer drift: ${message}`);
}

function rowsFor(orientation: PsychUpOrientation): Json[] {
  const name = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/psych-up-${name}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

function task(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
}

function spiral(row: Json): Json | undefined {
  return row.sprites.find((entry: Json) => entry.template?.symbol === "gPsychUpSpiralSpriteTemplate");
}

function battler(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix, attr: entry.attr,
  };
}

function allocation(row: Json, tag: number) {
  const tileSlot = row.tileTags.indexOf(tag), paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `missing Psych Up resource tag ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing Psych Up tile range ${tag}`);
  return { tag, tileSlot, paletteBank, tileRange: [range[0], range[1]] as const };
}

/** Extract the live Scene-ON input snapshot; the reducer itself never sees evidence rows. */
export function psychUpInputsFor(orientation: PsychUpOrientation, rows = rowsFor(orientation)): PsychUpLiveInputs {
  const row0 = rows[0]!, row1 = rows[1]!, row4 = rows[4]!, row5 = rows[5]!, row7 = rows[7]!, row142 = rows[142]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attacker = row0.battlerSprites.attacker, target = row0.battlerSprites.target;
  const spiralSprite = spiral(row7);
  const monBgTask = task(row4, "Task_UpdateMonBg"), cycle = task(row7, "AnimTask_BlendColorCycleExcludeLoop");
  const loop = task(row7, "Task_LoopAndPlaySE"), sway = task(row7, "AnimTask_SwayMonStep");
  const scale = task(row142, "AnimTask_ScaleMonAndRestore_Step"), attackerPalette = task(row142, "AnimTask_BlendSpriteColor_Step2");
  const clear = task(rows[174]!, "Task_ClearMonBg");
  invariant(spiralSprite && monBgTask && cycle && loop && sway && scale && attackerPalette && clear, `${orientation}: complete live root allocation`);
  const layer = attackerSide === "player" ? "bg2" : "bg1";
  const initialBgCnt = row0.registers[layer === "bg2" ? "bg2cnt" : "bg1cnt"];
  const monBgCnt = row5.registers[layer === "bg2" ? "bg2cnt" : "bg1cnt"];
  const initialHardwareScroll = {
    x: row0.registers[layer === "bg2" ? "bg2hofs" : "bg1hofs"],
    y: row0.registers[layer === "bg2" ? "bg2vofs" : "bg1vofs"],
  };
  return {
    attackerSide, targetSide, attackerSpecies: "JUMPLUFF", targetSpecies: "NINJASK",
    attackerPictureOrigin: { x: spiralSprite.x, y: spiralSprite.y },
    targetPictureOrigin: { x: target.x, y: target.y },
    attackerSprite: battler(attacker), targetSprite: battler(target),
    taskSlots: {
      blendCycle: cycle.slot, updateMonBg: monBgTask.slot, loopSound: loop.slot, sway: sway.slot,
      scale: scale.slot, attackerPalette: attackerPalette.slot, clearMonBg: clear.slot,
    },
    spiral: {
      slot: spiralSprite.slot, matrixSlot: spiralSprite.matrixNum, subpriority: spiralSprite.subpriority,
      attr2: spiralSprite.attr[2], painterInsertionIndex: row7.spriteOrder.indexOf(spiralSprite.slot),
    },
    scaleMatrixSlot: row142.battlerSprites.attacker.matrixNum,
    spriteOrder: row0.spriteOrder,
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    matrixSlots: row0.softwareMatrices,
    resource: allocation(row1, 10196),
    monBg: {
      layer, battlerId: monBgTask.data[6], copyPaletteBank: attackerSide === "player" ? 9 : 8,
      baseScroll: { x: monBgTask.data[3], y: monBgTask.data[4] }, initialBgCnt, monBgCnt, initialHardwareScroll,
    },
    palettes: {
      unfaded: row0.unfadedPalette, faded: row0.fadedPalette, hardware: row0.hardwarePalette,
      backgroundBanks: [1, 2, 3], attackerBank: attackerSide === "player" ? 16 : 17,
      attackerPaletteSelectorHigh: attackerPalette.data[1],
      resourcePalette: row1.fadedPalette.slice((16 + allocation(row1, 10196).paletteBank) * 16, (17 + allocation(row1, 10196).paletteBank) * 16),
    },
    registers: { bldcnt: row0.registers.bldcnt, bldalpha: row0.registers.bldalpha, bldy: row0.registers.bldy },
    animationRngSeed: row0.animationRng, gameplayRng: row0.rawBattleState.gameplayRng,
  };
}

export function psychUpConfigFor(orientation: PsychUpOrientation, rows = rowsFor(orientation)): SceneOnPsychUpPresentationState["config"] {
  const input = psychUpInputsFor(orientation, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, ...animationInputs } = input;
  return {
    move: "PSYCH_UP",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: input.attackerPictureOrigin, battlePositionCenter: attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: input.targetPictureOrigin, battlePositionCenter: targetSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 } } },
    fieldProfile: {
      playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp,
      opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
    animationInputs,
  };
}

function expectedTaskRows(row: Json): Json[] {
  const names = new Set([
    "AnimTask_BlendColorCycleExcludeLoop", "Task_UpdateMonBg", "Task_LoopAndPlaySE", "AnimTask_SwayMonStep",
    "AnimTask_ScaleMonAndRestore_Step", "AnimTask_BlendSpriteColor_Step2", "Task_ClearMonBg",
  ]);
  return row.tasks.filter((entry: Json) => names.has(entry.func?.symbol)).sort((left: Json, right: Json) => left.slot - right.slot || left.func.symbol.localeCompare(right.func.symbol));
}

function compareTasks(orientation: PsychUpOrientation, age: number, row: Json, state: PsychUpState): void {
  const expected = expectedTaskRows(row), actual = state.tasks.slice().sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
  invariant(expected.length === actual.length, `${orientation}/${age}: owned task count`);
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index]!, right = actual[index]!;
    invariant(left.slot === right.slot && left.func.symbol === right.callback && left.data.length === 16 && right.data.length === 16 && same(left.data, right.data), `${orientation}/${age}: ${left.func.symbol} full 16-word task data/lifetime`);
  }
}

function compareSpiral(orientation: PsychUpOrientation, age: number, row: Json, state: PsychUpState): void {
  const expected = spiral(row), actual = state.spiral;
  if (!expected) {
    invariant(actual === null, `${orientation}/${age}: spiral cleanup`);
    return;
  }
  invariant(actual !== null, `${orientation}/${age}: spiral live`);
  invariant(expected.slot === actual.slot && expected.template.symbol === actual.template && expected.callback.symbol === actual.callback
    && actual.affine === "gSpriteAffineAnimTable_PsychUpSpiral" && actual.cell === 0 && same(expected.attr, actual.oam), `${orientation}/${age}: spiral template/callback/cell/affine/OAM`);
  for (const key of ["x", "y", "x2", "y2", "animNum", "animCmdIndex", "animDelayCounter", "subpriority", "matrixNum"] as const) invariant(expected[key] === actual[key], `${orientation}/${age}: spiral ${key}`);
  invariant(((expected.attr[2] >>> 10) & 3) === actual.oamPriority && same(expected.matrix, actual.matrix) && same(expected.data, actual.data), `${orientation}/${age}: spiral geometry/subpriority/matrix/data`);
}

function selectedRegisters(row: Json, input: PsychUpLiveInputs) {
  const bg = input.monBg.layer === "bg2" ? "bg2" : "bg1";
  return {
    hofs: row.registers[`${bg}hofs`], vofs: row.registers[`${bg}vofs`], cnt: row.registers[`${bg}cnt`],
  };
}

function compareDisplayLatches(orientation: PsychUpOrientation, age: number, row: Json, rows: Json[], state: PsychUpState, input: PsychUpLiveInputs): void {
  if (age === 0) {
    invariant(same(state.displayTransfer, { oam: "initial", matrices: "initial", palette: "initial", selectedBgScroll: "initial" }), `${orientation}/${age}: initial latches`);
    return;
  }
  const previous = rows[age - 1]!;
  invariant(state.displayTransfer.oam === "preceding-software" && same(row.hardwareOam, previous.softwareOam), `${orientation}/${age}: OAM RAM+1`);
  if (age >= 144 && age <= 162) {
    invariant(state.displayTransfer.matrices === "two-source-rows-scale" && same(row.hardwareMatrices[input.scaleMatrixSlot], rows[age - 2]!.softwareMatrices[input.scaleMatrixSlot]), `${orientation}/${age}: ScaleMonAndRestore matrix RAM+2`);
  } else if (age === 143) {
    invariant(state.displayTransfer.matrices === "scale-start-hold" && same(row.hardwareMatrices[input.scaleMatrixSlot], rows[age - 2]!.softwareMatrices[input.scaleMatrixSlot]), `${orientation}/${age}: ScaleMonAndRestore start hold`);
  } else invariant(state.displayTransfer.matrices === "preceding-software" && same(row.hardwareMatrices, previous.softwareMatrices), `${orientation}/${age}: ordinary matrix RAM+1`);
  if (age === 4) invariant(state.displayTransfer.palette === "same-row-monbg-setup" && same(row.hardwarePalette, row.fadedPalette), `${orientation}/${age}: monbg same-row palette setup`);
  else invariant(state.displayTransfer.palette === "preceding-faded" && same(row.hardwarePalette, previous.fadedPalette), `${orientation}/${age}: palette RAM+1`);
  const actualBg = selectedRegisters(row, input);
  const previousSourceX = input.monBg.layer === "bg2" ? previous.battleBg.gBattle_BG2_X : previous.battleBg.gBattle_BG1_X;
  const previousSourceY = input.monBg.layer === "bg2" ? previous.battleBg.gBattle_BG2_Y : previous.battleBg.gBattle_BG1_Y;
  invariant(state.displayTransfer.selectedBgScroll === "preceding-software"
    && actualBg.hofs === ((previousSourceX % 512) + 512) % 512 && actualBg.vofs === ((previousSourceY % 512) + 512) % 512,
  `${orientation}/${age}: selected BG/SwayMon RAM+1`);
}

function compareImmutable(orientation: PsychUpOrientation, age: number, row: Json, first: Json, state: PsychUpState): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${orientation}/${age}: immutable gameplay ${key}`);
  invariant(same(row.immutableState, first.immutableState), `${orientation}/${age}: immutable semantic state`);
  invariant(same(state.rng.gameplay, row.rawBattleState.gameplayRng) && state.rng.gameplayUnchanged, `${orientation}/${age}: opaque gameplay RNG boundary`);
}

function loopEventAges(): readonly number[] { return [7, 12, 18, 24, 30, 36, 42, 48, 54, 60]; }

function compareRow(orientation: PsychUpOrientation, age: number, row: Json, rows: Json[], input: PsychUpLiveInputs): void {
  const first = rows[0]!, state = psychUpAtAge(age, input);
  invariant(state.age === age && state.active === row.animScriptActive && state.source.active === row.animScriptActive
    && state.source.owner === row.scriptOwner && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
  `${orientation}/${age}: root cursor/wait/active`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: complete anim args`);
  invariant(state.battlers.attacker.side === input.attackerSide && state.battlers.attacker.species === input.attackerSpecies
    && state.battlers.target.side === input.targetSide && state.battlers.target.species === input.targetSpecies, `${orientation}/${age}: live identity`);
  const expectedAttacker = row.battlerSprites.attacker, actualAttacker = state.battlers.attacker.sprite;
  for (const key of ["slot", "x", "y", "x2", "y2", "subpriority", "matrixNum"] as const) invariant(expectedAttacker[key] === actualAttacker[key], `${orientation}/${age}: live attacker ${key}`);
  invariant(same(expectedAttacker.matrix, actualAttacker.matrix) && expectedAttacker.invisible === (age >= 4 && age < 142), `${orientation}/${age}: live attacker geometry/matrix/monbg`);
  compareTasks(orientation, age, row, state);
  compareSpiral(orientation, age, row, state);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: complete painter order`);
  const selected = selectedRegisters(row, input);
  const sourceBg = input.monBg.layer === "bg2" ? row.battleBg.gBattle_BG2_X : row.battleBg.gBattle_BG1_X;
  const sourceBgY = input.monBg.layer === "bg2" ? row.battleBg.gBattle_BG2_Y : row.battleBg.gBattle_BG1_Y;
  invariant(state.background.monBgActive === (age >= 4 && age <= 176) && state.background.softwareScroll.x === sourceBg && state.background.softwareScroll.y === sourceBgY
    && state.background.hardwareScroll.x === selected.hofs && state.background.hardwareScroll.y === selected.vofs && state.background.bgCnt === selected.cnt,
  `${orientation}/${age}: monbg membership/copy/BG scroll/registers`);
  const expectedVram = age < 5 ? "initial" : age < 176 ? "copied" : age < 178 ? "cleared" : "released";
  invariant(state.background.vram === expectedVram, `${orientation}/${age}: monbg VRAM lifecycle`);
  invariant(state.registers.bldcnt === row.registers.bldcnt && state.registers.bldalpha === row.registers.bldalpha && state.registers.bldy === row.registers.bldy
    && state.registers.blendOff === (age >= 174), `${orientation}/${age}: BLDCNT/BLDALPHA/blendoff`);
  invariant(same(state.palettes.faded, row.fadedPalette) && same(state.palettes.hardware, row.hardwarePalette), `${orientation}/${age}: both palette programs/masks/banks`);
  const loaded = row.tileTags.includes(input.resource.tag) && row.paletteTags.includes(input.resource.tag);
  invariant(state.resources.spiral.loaded === loaded && state.resources.spiral.tag === (loaded ? input.resource.tag : null)
    && same(state.resources.spiral.allocation, loaded ? input.resource : null) && state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap
    && same(state.resources.allocator.matrixSlots, row.softwareMatrices), `${orientation}/${age}: resource/tag/allocator lifecycle`);
  const loopTask = task(row, "Task_LoopAndPlaySE");
  invariant(same(state.audio.looping?.task ?? null, loopTask?.data ?? null), `${orientation}/${age}: looping audio task/pan schedule`);
  const expectedEvents = [
    ...(loopEventAges().includes(age) ? [{ sound: "SE_M_PSYBEAM2", pan: input.attackerSide === "player" ? -64 : 63 }] : []),
    ...(age === 142 ? [{ sound: "SE_M_PSYBEAM", pan: input.attackerSide === "player" ? -64 : 63 }] : []),
  ];
  invariant(same(state.audio.events, expectedEvents), `${orientation}/${age}: both audio schedules/pans`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedSprites === (spiral(row) ? 1 : 0) && state.cleanup.firstInactive === (age === PSYCH_UP_FIRST_INACTIVE_AGE)
    && state.cleanup.resourcesReleased === (age >= PSYCH_UP_FIRST_INACTIVE_AGE), `${orientation}/${age}: visual/sound counts and cleanup`);
  const expectedDraws = rows.slice(1, age + 1).filter((entry, index) => entry.animationRng !== rows[index]!.animationRng).length;
  invariant(state.rng.animation === row.animationRng && state.rng.sourceDraws === expectedDraws, `${orientation}/${age}: presentation RNG fit`);
  compareDisplayLatches(orientation, age, row, rows, state, input);
  compareImmutable(orientation, age, row, first, state);
}

function replayOrientation(orientation: PsychUpOrientation): { readonly retainedRows: number; readonly reducerRows: number; readonly seamRows: number; readonly cleanup: number } {
  const rows = rowsFor(orientation), input = psychUpInputsFor(orientation, rows), config = psychUpConfigFor(orientation, rows);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [age, row] of rows.entries()) {
      compareRow(orientation, age, row!, rows, input);
      const seam = sceneOnPsychUpView({ age, config } as SceneOnPsychUpPresentationState);
      const reduced = psychUpAtAge(age, input);
      const { attacker, target, ...seamState } = seam;
      invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: complete typed Scene-ON seam divergence`);
    }
  }
  invariant(psychUpAtAge(PSYCH_UP_FIRST_INACTIVE_AGE, input).rng.sourceDraws === 176, `${orientation}: exactly 176 presentation source draws`);
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: PSYCH_UP_FIRST_INACTIVE_AGE };
}

export function verifyPsychUpReducer() {
  const player = replayOrientation("player-back"), opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: { retainedRows: player.retainedRows + opponent.retainedRows, passes: 2, reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows, framebufferCompared: false, coverageCredit: false },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyPsychUpReducer(), null, 2));
