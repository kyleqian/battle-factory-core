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

function expectedBattler(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
  };
}

function compareSprites(orientation: MachPunchOrientation, age: number, row: Json, state: MachPunchState, input: MachPunchLiveInputs): void {
  const expected = ownedRows(row), actual = ownedState(state);
  invariant(expected.length === actual.length, `${orientation}/${age}: trace/hitsplat/fist count`);
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index]!, right = actual[index]!;
    invariant(left.slot === right.slot && left.template.symbol === right.template && left.callback.symbol === right.callback,
      `${orientation}/${age}: sprite ${index} identity`);
    for (const key of ["x", "y", "x2", "y2", "subpriority"] as const) invariant(left[key] === right[key], `${orientation}/${age}: sprite ${left.slot} ${key}`);
    invariant(((left.attr[2] >>> 10) & 3) === right.oamPriority, `${orientation}/${age}: sprite ${left.slot} OAM priority`);
    if (right.kind !== "fist") {
      invariant(left.matrixNum === right.matrixNum, `${orientation}/${age}: sprite ${left.slot} matrix slot`);
      invariant(same(left.matrix, right.matrix), `${orientation}/${age}: sprite ${left.slot} matrix`);
    }
    invariant(same(left.data, right.data), `${orientation}/${age}: sprite ${left.slot} callback data`);
    const creation = right.kind === "trace" ? input.traceSlots.indexOf(right.slot) : right.kind === "hitsplat" ? 8 : 9;
    invariant(right.sourceCreationOrder === creation, `${orientation}/${age}: sprite ${left.slot} source creation order`);
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
    const role = left.func.symbol === "Task_UpdateMonBg" ? "monbg"
      : left.func.symbol === "AnimTask_UpdateSlidingBg" ? "sliding-bg"
        : left.func.symbol === "AnimTask_AttackerPunchWithTrace_Step" ? "punch"
          : left.func.symbol === "AnimTask_ShakeMon_Step" ? "shake"
            : left.func.symbol === "Task_ClearMonBg" ? "clear-monbg"
              : left.data[0] === -1 ? "fade-restore" : "fade-initial";
    invariant(right.role === role, `${orientation}/${age}: task ${right.slot} role`);
    invariant(same(left.data, right.data), `${orientation}/${age}: task ${right.slot} data`);
  }
}

function compareImmutable(row: Json, first: Json, orientation: MachPunchOrientation, age: number): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    if (key in row.rawBattleState && key in first.rawBattleState) invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${orientation}/${age}: immutable gameplay ${key}`);
  }
  for (const key of ["parties", "battlers", "engine"] as const) invariant(same(row[key], first[key]), `${orientation}/${age}: immutable retained ${key}`);
  invariant(same(row.immutableState, first.immutableState), `${orientation}/${age}: immutable semantic state`);
}

function compareRow(orientation: MachPunchOrientation, age: number, row: Json, rows: Json[], input: MachPunchLiveInputs): void {
  const first = rows[0]!;
  const state = machPunchAtAge(age, input);
  invariant(state.age === age && state.active === row.animScriptActive && state.source.active === row.animScriptActive
    && state.source.owner === row.scriptOwner && state.source.pointer === row.scriptPtr
    && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
    `${orientation}/${age}: source cursor/wait/active`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: complete animation arguments`);
  invariant(state.battlers.attacker.side === input.attackerSide && state.battlers.attacker.species === input.attackerSpecies
    && state.battlers.target.side === input.targetSide && state.battlers.target.species === input.targetSpecies,
  `${orientation}/${age}: live battler identity`);
  invariant(same(state.battlers.attacker.sprite, expectedBattler(row.battlerSprites.attacker))
    && same(state.battlers.target.sprite, expectedBattler(row.battlerSprites.target)),
  `${orientation}/${age}: complete live battler geometry/matrix`);
  const expectedId = input.targetSide === "opponent" ? "BG_HIGHSPEED_OPPONENT" : "BG_HIGHSPEED_PLAYER";
  invariant(state.background.id === expectedId && state.background.branch === input.targetSide
    && state.background.highSpeed === (age >= 29 && age < 90), `${orientation}/${age}: high-speed BG branch/lifetime`);
  invariant(state.background.scrollX === row.battleBg.gBattle_BG3_X, `${orientation}/${age}: BG3 sliding scroll`);
  invariant(state.registers.bg3hofs === row.registers.bg3hofs, `${orientation}/${age}: predecessor-latched BG3HOFS`);
  invariant(state.registers.bldcnt === row.registers.bldcnt && state.registers.bldalpha === row.registers.bldalpha && state.registers.bldy === row.registers.bldy,
    `${orientation}/${age}: blend/fade registers`);
  invariant(state.attackerOnMonBg === row.battlerSprites.attacker.invisible && !row.battlerSprites.target.invisible,
    `${orientation}/${age}: attacker monbg membership`);
  const expectedAlpha = row.registers.bldcnt === 16192 && row.registers.bldalpha === 2057 ? { eva: 9, evb: 8 } : null;
  invariant(same(state.alpha, expectedAlpha), `${orientation}/${age}: target alpha schedule`);
  compareTasks(orientation, age, row, state);
  compareSprites(orientation, age, row, state, input);
  const impactLoaded = row.tileTags.includes(MACH_PUNCH_IMPACT_TAG), handsLoaded = row.tileTags.includes(MACH_PUNCH_HANDS_AND_FEET_TAG);
  invariant(state.resources.impact.loaded === impactLoaded && state.resources.impact.tag === (impactLoaded ? MACH_PUNCH_IMPACT_TAG : null)
    && same(state.resources.impact.allocation, impactLoaded ? allocation(row, MACH_PUNCH_IMPACT_TAG) : null), `${orientation}/${age}: IMPACT resource tag/allocation/lifetime`);
  invariant(state.resources.handsAndFeet.loaded === handsLoaded && state.resources.handsAndFeet.tag === (handsLoaded ? MACH_PUNCH_HANDS_AND_FEET_TAG : null)
    && same(state.resources.handsAndFeet.allocation, handsLoaded ? allocation(row, MACH_PUNCH_HANDS_AND_FEET_TAG) : null), `${orientation}/${age}: HANDS_AND_FEET resource tag/allocation/lifetime`);
  invariant(state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap
    && same(state.resources.allocator.matrixSlots, row.softwareMatrices)
    && state.resources.allocator.affineAllocated === (age >= 58 && age < 68), `${orientation}/${age}: affine allocator bitmap/matrix slots/lifetime`);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: complete sprite painter order`);
  if (age === 50 || age === 58) {
    const track = row.audio.SE1.tracks.find((entry: Json) => entry.flags & 0x80);
    const sound = age === 50 ? "SE_M_JUMP_KICK" : "SE_M_COMET_PUNCH";
    const sourcePan = age === 50 ? "SOUND_PAN_ATTACKER" : "SOUND_PAN_TARGET";
    invariant(track && state.audio.length === 1 && state.audio[0]!.channel === "SE1"
      && state.audio[0]!.sound === sound && state.audio[0]!.sourcePan === sourcePan
      && state.audio[0]!.pan === track.panX, `${orientation}/${age}: audio identity/pan`);
  } else invariant(state.audio.length === 0, `${orientation}/${age}: unexpected audio event`);
  if (age === 0) {
    invariant(same(state.displayTransfer, { oam: "initial", matrices: "initial", palette: "initial", bg3Scroll: "initial" }), `${orientation}/${age}: initial display transfer labels`);
  } else {
    const previous = rows[age - 1]!;
    invariant(state.displayTransfer.oam === "preceding-software" && same(row.hardwareOam, previous.softwareOam), `${orientation}/${age}: OAM RAM+1 transfer`);
    invariant(state.displayTransfer.matrices === "preceding-software" && same(row.hardwareMatrices, previous.softwareMatrices), `${orientation}/${age}: matrix RAM+1 transfer`);
    if (age === 7) invariant(state.displayTransfer.palette === "same-row-monbg" && same(row.hardwarePalette, row.fadedPalette), `${orientation}/${age}: same-row monbg palette transfer`);
    else invariant(state.displayTransfer.palette === "preceding-faded" && same(row.hardwarePalette, previous.fadedPalette), `${orientation}/${age}: palette RAM+1 transfer`);
    invariant(state.displayTransfer.bg3Scroll === "preceding-software"
      && state.registers.bg3hofs === ((previous.battleBg.gBattle_BG3_X % 512) + 512) % 512, `${orientation}/${age}: BG3 scroll RAM+1 transfer`);
  }
  const expectedDraws = rows.slice(1, age + 1).filter((entry, index) => entry.animationRng !== rows[index]!.animationRng).length;
  invariant(state.rng.animation === row.animationRng && state.rng.sourceDraws === expectedDraws
    && same(state.rng.gameplay, row.rawBattleState.gameplayRng) && state.rng.gameplayUnchanged,
  `${orientation}/${age}: presentation RNG/source draws and opaque gameplay RNG`);
  const inactive = machPunchFirstInactiveAge(input);
  invariant(state.cleanup.firstInactive === (age === inactive)
    && state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedSprites === ownedRows(row).length
    && state.cleanup.resourcesReleased === (!impactLoaded && !handsLoaded && age >= inactive), `${orientation}/${age}: task/sprite/resource teardown`);
  compareImmutable(row, first, orientation, age);
}

function replayOrientation(orientation: MachPunchOrientation): { readonly retainedRows: number; readonly reducerRows: number; readonly seamRows: number; readonly cleanup: number } {
  const rows = rowsFor(orientation), input = machPunchInputsFor(orientation, rows), config = machPunchConfigFor(orientation, rows);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [age, row] of rows.entries()) {
      compareRow(orientation, age, row!, rows, input);
      const seam = sceneOnMachPunchView({ age, config } as SceneOnMachPunchPresentationState);
      const reduced = machPunchAtAge(age, input);
      const { attacker, target, ...seamState } = seam;
      invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: complete typed seam divergence`);
    }
  }
  invariant(machPunchAtAge(rows.length - 1, input).rng.sourceDraws === 107, `${orientation}: exactly 107 presentation source draws`);
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
