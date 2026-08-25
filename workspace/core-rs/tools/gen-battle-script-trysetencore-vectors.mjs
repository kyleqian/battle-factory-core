#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetencoreOpcode.ts.
// Expected narrow state/machine projections, controls, errors, repetitions,
// and registration results are created only by executing the canonical TS
// handler. This script owns bounded input construction and Rust literal
// emission; it must not duplicate Encore behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetencore-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_trysetencore_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTrysetencoreOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETENCORE";
const OPCODE_ID = 0xa4;
const DISPATCHER = "Cmd_trysetencore";
const ENTRY_LABEL = "BattleScript_EffectEncore";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const UNRESOLVED_FAILURE_POINTER = "BattleScript_RustEncoreUnresolved";
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3, null]);
const MOVE_SLOT_DOMAIN = Object.freeze([0, 1, 2, 3]);
const PP_EDGE_DOMAIN = Object.freeze([0, 1, 0x80, 0xff]);
const ENCORED_MOVE_EDGE_DOMAIN = Object.freeze([0, 1, 165, 0xffff]);
const LAST_MOVE_EDGE_DOMAIN = Object.freeze([
  0, 1, 118, 119, 120, 164, 165, 166, 226, 227, 228, 0xffff,
]);
const FORBIDDEN_MOVES = Object.freeze([119, 165, 227]);
const U32_MAX = 0xffff_ffff;
const INVALID_SHAPE_PREFIX = "invalid B_SCR_OP_TRYSETENCORE shape at program counter ";
const MISSING_TARGET_ERROR = "Battle Script hit-chain command requires a target role";
const UNRESOLVED_TARGET_PREFIX = "Cmd_trysetencore unresolved failure target ";

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetencore-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be a battler id 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} must be u8, got ${value}`);
}

function assertI8(value, label) {
  assert(Number.isInteger(value) && value >= -128 && value <= 127, `${label} must be i8, got ${value}`);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff, `${label} must be u16, got ${value}`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, `${label} must be u32, got ${value}`);
}

function freezeBattler(value, label) {
  assertU8(value.side, `${label}.side`);
  assert(value.side <= 1, `${label}.side must be 0 or 1`);
  assertU8(value.ability, `${label}.ability`);
  assertU16(value.hp, `${label}.hp`);
  assertU16(value.maxHp, `${label}.maxHp`);
  assert(Array.isArray(value.moves) && value.moves.length === 4, `${label}.moves must have four cells`);
  assert(Array.isArray(value.pp) && value.pp.length === 4, `${label}.pp must have four cells`);
  assert(Array.isArray(value.statStages) && value.statStages.length === 8, `${label}.statStages must have eight cells`);
  value.moves.forEach((move, index) => assertU16(move, `${label}.moves[${index}]`));
  value.pp.forEach((pp, index) => assertU8(pp, `${label}.pp[${index}]`));
  value.statStages.forEach((stage, index) => assertI8(stage, `${label}.statStages[${index}]`));
  assertU32(value.status1, `${label}.status1`);
  assertU32(value.status2, `${label}.status2`);
  assertU32(value.status3, `${label}.status3`);
  assertU16(value.item, `${label}.item`);
  assertU8(value.partyIndex, `${label}.partyIndex`);
  assert(value.partyIndex < 6, `${label}.partyIndex must be a party slot`);
  assertU16(value.encoredMove, `${label}.encoredMove`);
  assertU8(value.encoredMovePos, `${label}.encoredMovePos`);
  assert(value.encoredMovePos <= 3, `${label}.encoredMovePos must be 0..3`);
  assertU8(value.encoreTimer, `${label}.encoreTimer`);
  assert(value.encoreTimer <= 0x0f, `${label}.encoreTimer must be four-bit`);
  assertU8(value.encoreTimerStartValue, `${label}.encoreTimerStartValue`);
  assert(value.encoreTimerStartValue <= 0x0f, `${label}.encoreTimerStartValue must be four-bit`);
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHp: value.maxHp,
    moves: Object.freeze([...value.moves]),
    pp: Object.freeze([...value.pp]),
    status1: value.status1 >>> 0,
    status2: value.status2 >>> 0,
    status3: value.status3 >>> 0,
    item: value.item,
    statStages: Object.freeze([...value.statStages]),
    partyIndex: value.partyIndex,
    encoredMove: value.encoredMove,
    encoredMovePos: value.encoredMovePos,
    encoreTimer: value.encoreTimer,
    encoreTimerStartValue: value.encoreTimerStartValue,
  });
}

function makeBattler(index, salt, overrides = {}) {
  assertBattler(index, "generated battler index");
  const hp = 40 + ((salt * 17 + index * 31) % 400);
  return freezeBattler({
    side: (salt + index) & 1,
    ability: (salt * 13 + index * 37 + 3) & 0xff,
    hp,
    maxHp: hp + 17 + ((salt + index) % 31),
    moves: [
      (33 + salt + index) & 0xffff,
      (45 + salt * 3 + index) & 0xffff,
      (98 + salt * 5 + index) & 0xffff,
      (259 + salt * 7 + index) & 0xffff,
    ],
    pp: [
      (1 + salt + index) & 0xff,
      (15 + salt * 3 + index) & 0xff,
      (35 + salt * 5 + index) & 0xff,
      (40 + salt * 7 + index) & 0xff,
    ],
    status1: (0x0000_0001 ^ ((salt * 0x0101 + index) >>> 0)) >>> 0,
    status2: (0x4000_0001 ^ ((salt * 0x1001 + index) >>> 0)) >>> 0,
    status3: (0x8000_0001 ^ ((salt * 0x0011 + index) >>> 0)) >>> 0,
    item: (186 + salt * 19 + index) & 0xffff,
    statStages: Array.from({ length: 8 }, (_unused, stat) => ((salt + index * 3 + stat) % 13) - 6),
    partyIndex: (salt + index) % 6,
    encoredMove: (salt + index) & 1 ? 0 : 1,
    encoredMovePos: (salt + index) & 3,
    encoreTimer: (salt + index) & 0x0f,
    encoreTimerStartValue: (salt * 3 + index) & 0x0f,
    ...overrides,
  }, `generated battler ${index}`);
}

function freezeHistory(value) {
  for (const [key, maximum] of [
    ["lastPrintedMoves", 0xffff], ["lastMoves", 0xffff], ["lastResultingMoves", 0xffff],
    ["lastLandedMoves", 0xffff], ["lastHitByType", 0xffff], ["lastHitBy", 0xff],
  ]) {
    assert(Array.isArray(value[key]) && value[key].length === 4, `history.${key} must have four cells`);
    value[key].forEach((entry, index) => {
      assert(Number.isInteger(entry) && entry >= 0 && entry <= maximum,
        `history.${key}[${index}] is outside its source domain`);
    });
  }
  return Object.freeze({
    lastPrintedMoves: Object.freeze([...value.lastPrintedMoves]),
    lastMoves: Object.freeze([...value.lastMoves]),
    lastResultingMoves: Object.freeze([...value.lastResultingMoves]),
    lastLandedMoves: Object.freeze([...value.lastLandedMoves]),
    lastHitByType: Object.freeze([...value.lastHitByType]),
    lastHitBy: Object.freeze([...value.lastHitBy]),
  });
}

function makeHistory(salt, lastMoves) {
  assert(Array.isArray(lastMoves) && lastMoves.length === 4, "lastMoves must have four cells");
  return freezeHistory({
    lastPrintedMoves: BATTLER_DOMAIN.map((index) => (0x1000 + salt * 11 + index) & 0xffff),
    lastMoves,
    lastResultingMoves: BATTLER_DOMAIN.map((index) => (0x2000 + salt * 13 + index) & 0xffff),
    lastLandedMoves: BATTLER_DOMAIN.map((index) => (0x3000 + salt * 17 + index) & 0xffff),
    lastHitByType: BATTLER_DOMAIN.map((index) => (0x4000 + salt * 19 + index) & 0xffff),
    lastHitBy: BATTLER_DOMAIN.map((index) => (salt * 23 + index) & 0xff),
  });
}

function freezeProjection(value) {
  assert(Array.isArray(value.battlers) && value.battlers.length === 4, "battlers must have four cells");
  value.battlers.forEach((battler, index) => freezeBattler(battler, `battlers[${index}]`));
  assertOptionalBattler(value.attacker, "attacker role");
  assertOptionalBattler(value.target, "target role");
  assertOptionalBattler(value.effectBattler, "effectBattler role");
  assertOptionalBattler(value.fainted, "fainted role");
  assertBattler(value.contextState.scriptingBattler, "scriptingBattler");
  assertU8(value.contextState.atkCancelerTracker, "atkCancelerTracker");
  assertU8(value.contextState.battleOutcome, "battleOutcome");
  assertU16(value.contextState.currentMove, "currentMove");
  assertU8(value.contextState.currentMovePosition, "currentMovePosition");
  assertU8(value.contextState.moveResultFlags, "moveResultFlags");
  assertU32(value.contextState.hitMarker, "hitMarker");
  assertU8(value.contextState.multiHitCounter, "multiHitCounter");
  return Object.freeze({
    battlers: Object.freeze(value.battlers.map((battler, index) => freezeBattler(battler, `battlers[${index}]`))),
    attacker: value.attacker,
    target: value.target,
    effectBattler: value.effectBattler,
    fainted: value.fainted,
    moveHistory: freezeHistory(value.moveHistory),
    contextState: Object.freeze({
      scriptingBattler: value.contextState.scriptingBattler,
      atkCancelerTracker: value.contextState.atkCancelerTracker,
      battleOutcome: value.contextState.battleOutcome,
      currentMove: value.contextState.currentMove,
      currentMovePosition: value.contextState.currentMovePosition,
      moveResultFlags: value.contextState.moveResultFlags,
      hitMarker: value.contextState.hitMarker >>> 0,
      multiHitCounter: value.contextState.multiHitCounter,
    }),
  });
}

function makeProjection({
  salt = 0,
  target = 1,
  attacker = 0,
  effectBattler = 2,
  fainted = 3,
  targetMoves = [33, 45, 98, 259],
  targetPp = [35, 25, 20, 15],
  targetEncoredMove = 0,
  targetEncoredMovePos = 0,
  targetEncoreTimer = 0,
  targetEncoreTimerStartValue = 0,
  targetLastMove = 45,
} = {}) {
  assertOptionalBattler(target, "target role");
  const focusBattler = target ?? 2;
  const battlers = BATTLER_DOMAIN.map((battler) => makeBattler(battler, salt, battler === focusBattler ? {
    moves: targetMoves,
    pp: targetPp,
    encoredMove: targetEncoredMove,
    encoredMovePos: targetEncoredMovePos,
    encoreTimer: targetEncoreTimer,
    encoreTimerStartValue: targetEncoreTimerStartValue,
  } : {}));
  const lastMoves = BATTLER_DOMAIN.map((battler) => (
    battler === focusBattler ? targetLastMove : (0x5000 + salt * 7 + battler) & 0xffff
  ));
  return freezeProjection({
    battlers,
    attacker,
    target,
    effectBattler,
    fainted,
    moveHistory: makeHistory(salt, lastMoves),
    contextState: {
      scriptingBattler: BATTLER_DOMAIN[(salt + 3) % BATTLER_DOMAIN.length],
      atkCancelerTracker: (salt * 11 + 7) & 0xff,
      battleOutcome: (salt * 13 + 2) & 0xff,
      currentMove: 227,
      currentMovePosition: salt & 3,
      moveResultFlags: (salt * 23) & 0xff,
      hitMarker: (0x8000_0001 ^ ((salt * 0x0101_0101) >>> 0)) >>> 0,
      multiHitCounter: (salt * 29 + 4) & 0xff,
    },
  });
}

function canonicalBattler(battler, index) {
  return Object.freeze({
    side: battler.side,
    ability: battler.ability,
    hp: battler.hp,
    maxHP: battler.maxHp,
    moves: battler.moves,
    pp: battler.pp,
    status1: battler.status1,
    status2: battler.status2,
    status3: battler.status3,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    encoreTimer: battler.encoreTimer,
    encoredMove: battler.encoredMove,
    encoredMovePos: battler.encoredMovePos,
    encoreTimerStartValue: battler.encoreTimerStartValue,
    item: battler.item,
    statStages: battler.statStages,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: (0x1234_0000 + index) >>> 0,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: battler.partyIndex,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    moveHistory: Object.freeze({
      lastPrintedMoves: projection.moveHistory.lastPrintedMoves,
      lastMoves: projection.moveHistory.lastMoves,
      lastResultingMoves: projection.moveHistory.lastResultingMoves,
      lastLandedMoves: projection.moveHistory.lastLandedMoves,
      lastHitByType: projection.moveHistory.lastHitByType,
      lastHitBy: projection.moveHistory.lastHitBy,
    }),
    scriptingBattler: projection.contextState.scriptingBattler,
    atkCancelerTracker: projection.contextState.atkCancelerTracker,
    battleOutcome: projection.contextState.battleOutcome,
    currentMove: projection.contextState.currentMove,
    currentMovePosition: projection.contextState.currentMovePosition,
    moveResultFlags: projection.contextState.moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.contextState.hitMarker,
    multiHitCounter: projection.contextState.multiHitCounter,
    battleTopology: Object.freeze({
      battlersCount: 2,
      battleTypeFlags: 0,
      battlerPositions: Object.freeze([0, 1, 0xff, 0xff]),
    }),
  });
}

function vectorBattler(battler) {
  return Object.freeze({
    side: battler.side,
    ability: battler.ability,
    hp: battler.hp,
    maxHp: battler.maxHP,
    moves: Object.freeze([...battler.moves]),
    pp: Object.freeze([...battler.pp]),
    status1: battler.status1 >>> 0,
    status2: battler.status2 >>> 0,
    status3: battler.status3 >>> 0,
    item: battler.item,
    statStages: Object.freeze([...battler.statStages]),
    partyIndex: battler.partyIndex,
    encoredMove: battler.encoredMove,
    encoredMovePos: battler.encoredMovePos,
    encoreTimer: battler.encoreTimer,
    encoreTimerStartValue: battler.encoreTimerStartValue,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattler)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    moveHistory: Object.freeze({
      lastPrintedMoves: Object.freeze([...rules.moveHistory.lastPrintedMoves]),
      lastMoves: Object.freeze([...rules.moveHistory.lastMoves]),
      lastResultingMoves: Object.freeze([...rules.moveHistory.lastResultingMoves]),
      lastLandedMoves: Object.freeze([...rules.moveHistory.lastLandedMoves]),
      lastHitByType: Object.freeze([...rules.moveHistory.lastHitByType]),
      lastHitBy: Object.freeze([...rules.moveHistory.lastHitBy]),
    }),
    contextState: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      atkCancelerTracker: rules.atkCancelerTracker,
      battleOutcome: rules.battleOutcome,
      currentMove: rules.currentMove,
      currentMovePosition: rules.currentMovePosition,
      moveResultFlags: rules.moveResultFlags,
      hitMarker: rules.hitMarker >>> 0,
      multiHitCounter: rules.multiHitCounter,
    }),
  });
}

function schedulerForSalt(salt) {
  const pending = salt % 4 === 0
    ? []
    : salt % 4 === 1
      ? [1]
      : salt % 4 === 2
        ? [3, 0]
        : [2, 1, 3];
  return machineModule.createBattleScriptSchedulerState({
    messageDisplayActive: (salt & 1) === 0,
    pauseCounterBattle: (salt * 97 + 11) & 0xffff,
    activeBattler: salt % 3 === 0 ? null : (salt + 2) & 3,
    pendingControllerBattlers: pending,
  });
}

function stateWithMachineSiblings(rules, rngValue, salt) {
  const state = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, rngValue);
  return Object.freeze({ ...state, scheduler: schedulerForSalt(salt) });
}

function vectorMachine(state) {
  return Object.freeze({
    scheduler: Object.freeze({
      messageDisplayActive: state.scheduler.messageDisplayActive,
      pauseCounterBattle: state.scheduler.pauseCounterBattle,
      activeBattler: state.scheduler.activeBattler,
      pendingControllerBattlers: Object.freeze([...state.scheduler.pendingControllerBattlers]),
    }),
    rngValue: state.rng.value >>> 0,
    rngCalls: state.rng.calls,
  });
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, `expected exactly one ${OPCODE_NAME}, got ${canonicalInstructions.length}`);
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, `opcode drifted to ${canonicalInstruction.opcodeId}`);
assert(canonicalInstruction.dispatcher === DISPATCHER, `dispatcher drifted to ${canonicalInstruction.dispatcher}`);
assert(canonicalInstruction.source.label === ENTRY_LABEL, `entry label drifted to ${canonicalInstruction.source.label}`);
assert(canonicalInstruction.programCounter === 774, `instruction PC drifted to ${canonicalInstruction.programCounter}`);
assert(canonicalInstruction.operands.length === 1, "canonical Encore shape must have one pointer");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical Encore pointer must be four bytes");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_POINTER, "canonical Encore failure pointer drifted");
assert(programModule.resolveBattleScriptLabel(program, FAILURE_POINTER), "canonical failure pointer must resolve");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_FAILURE_POINTER), "unresolved Encore pointer unexpectedly resolves");
const handlers = opcodeModule.createBattleScriptTrysetencoreOpcodeHandlers(program);
const handler = handlers[canonicalInstruction.opcodeId];
assert(typeof handler === "function", "canonical Encore handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = canonicalInstruction.programCounter,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions = [FAILURE_POINTER],
} = {}) {
  assert(typeof opcodeName === "string", "opcodeName must be a string");
  assertU32(programCounter, "instruction programCounter");
  assertU8(opcodeId, "instruction opcodeId");
  assert(typeof dispatcher === "string", "instruction dispatcher must be a string");
  assert(Array.isArray(operandWidths) && Array.isArray(operandExpressions), "instruction operands must be arrays");
  assert(operandWidths.length === operandExpressions.length, "operand width/expression counts must agree");
  operandWidths.forEach((width, index) => assertU8(width, `operandWidths[${index}]`));
  operandExpressions.forEach((expression, index) => assert(typeof expression === "string", `operandExpressions[${index}] must be string`));
  return Object.freeze({
    opcodeName,
    programCounter,
    opcodeId,
    dispatcher,
    operandWidths: Object.freeze([...operandWidths]),
    operandExpressions: Object.freeze([...operandExpressions]),
  });
}

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...canonicalInstruction.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...canonicalInstruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(operands),
  });
}

function vectorInstruction(spec) {
  const sourceInstruction = instructionFromSpec(spec);
  const operand = sourceInstruction.operands[0];
  const resolved = operand === undefined ? undefined
    : programModule.resolveBattleScriptLabel(program, operand.expression);
  return Object.freeze({
    opcodeName: sourceInstruction.opcodeName,
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedFailureExpression: resolved === undefined ? null : operand.expression,
    resolvedFailureProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();

function isForbiddenMove(moveId) {
  return FORBIDDEN_MOVES.includes(moveId);
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump", programCounter: transition.control.programCounter,
  });
  throw new Error(`canonical Encore handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalTransition(currentRules, state, sourceInstruction, transition) {
  const target = currentRules.selectorRoles.target;
  assert(target !== null, "successful canonical Encore handler had no target");
  const targetState = currentRules.battlers[target];
  const lastMove = currentRules.moveHistory.lastMoves[target];
  const slot = targetState.moves.findIndex((move) => move === lastMove);
  const eligible = targetState.encoredMove === 0
    && slot !== -1
    && targetState.pp[slot] !== 0
    && !isForbiddenMove(lastMove);
  const control = controlFromTransition(transition);
  assert(transition.scheduler === state.scheduler, "canonical Encore handler changed scheduler");
  assert(transition.events.length === 0, "canonical Encore handler emitted an event");
  if (!eligible) {
    assert(control.kind === "jump", "ineligible Encore must jump");
    assert(transition.rulesContext === currentRules, "ineligible Encore changed rules state");
    assert(transition.rng === state.rng, "ineligible Encore consumed RNG");
    return control;
  }

  assert(control.kind === "advance", "eligible Encore must advance");
  assert(transition.rulesContext !== currentRules, "successful Encore reused rules context");
  assert(transition.rulesContext.selectorRoles === currentRules.selectorRoles, "successful Encore changed selector roles");
  assert(transition.rulesContext.moveHistory === currentRules.moveHistory, "successful Encore changed move history");
  assert(transition.rng !== state.rng, "successful Encore did not replace RNG state");
  assert(transition.rng.calls === state.rng.calls + 1, "successful Encore did not take exactly one draw");
  assert(transition.rng.ledger.length === state.rng.ledger.length + 1, "successful Encore ledger count");
  const draw = transition.rng.ledger.at(-1);
  assert(draw?.reason === "Encore duration ((Random() & 3) + 3)", "Encore draw reason drifted");
  assert(draw?.before === state.rng.value, "Encore draw before value drifted");
  assert(draw?.after === transition.rng.value, "Encore draw after value drifted");
  assert(draw?.randomValue === ((transition.rng.value >>> 16) & 0xffff), "Encore Random result drifted");
  for (const battler of BATTLER_DOMAIN) {
    if (battler === target) {
      const nextTarget = transition.rulesContext.battlers[battler];
      assert(nextTarget !== targetState, "successful Encore did not replace target battler");
      assert(nextTarget.encoredMove === targetState.moves[slot], "Encore move write drifted");
      assert(nextTarget.encoredMovePos === slot, "Encore slot write drifted");
      const duration = (draw.randomValue & 3) + 3;
      assert(nextTarget.encoreTimer === duration, "Encore timer write drifted");
      assert(nextTarget.encoreTimerStartValue === duration, "Encore timer start write drifted");
    } else {
      assert(transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
        `successful Encore replaced sibling battler ${battler}`);
    }
  }
  return control;
}

function sourceOutcome(initialProjection, instructionSpec, applications, rngValue, salt) {
  const sourceInstruction = instructionFromSpec(instructionSpec);
  const initialRules = canonicalRulesFromProjection(initialProjection);
  let currentRules = initialRules;
  let currentState = stateWithMachineSiblings(initialRules, rngValue, salt);
  const inputSnapshot = vectorState(initialRules);
  const inputMachine = vectorMachine(currentState);
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const rulesBefore = vectorState(currentRules);
      const machineBefore = vectorMachine(currentState);
      const transition = handler({ program, instruction: sourceInstruction, state: currentState });
      assert(sameValue(vectorState(currentRules), rulesBefore), "canonical Encore handler mutated current rules");
      assert(sameValue(vectorMachine(currentState), machineBefore), "canonical Encore handler mutated current machine");
      controls.push(assertCanonicalTransition(currentRules, currentState, sourceInstruction, transition));
      currentRules = transition.rulesContext;
      currentState = Object.freeze({ ...currentState, rulesContext: transition.rulesContext, rng: transition.rng });
    }
    assert(sameValue(vectorState(initialRules), inputSnapshot), "canonical Encore handler mutated initial rules");
    assert(sameValue(vectorMachine(stateWithMachineSiblings(initialRules, rngValue, salt)), inputMachine),
      "canonical Encore handler mutated initial machine");
    return Object.freeze({
      expected: vectorState(currentRules),
      expectedMachine: vectorMachine(currentState),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical Encore handler threw non-Error ${String(error)}`);
    assert(sameValue(vectorState(initialRules), inputSnapshot), "throwing Encore handler mutated initial rules");
    return Object.freeze({ expected: null, expectedMachine: null, controls: Object.freeze(controls), error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.controls.map((control) => control.kind).join("-then-");
  if (outcome.error.startsWith(INVALID_SHAPE_PREFIX)) return "invalid-instruction-shape";
  if (outcome.error === MISSING_TARGET_ERROR) return "missing-target-role";
  if (outcome.error.startsWith(UNRESOLVED_TARGET_PREFIX)) return "unresolved-failure-target";
  throw new Error(`unexpected canonical Encore error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, initialProjection, {
  applications = 1,
  instructionSpec = CANONICAL_INSTRUCTION,
  rngValue = 0,
  salt = 0,
} = {}) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(Number.isInteger(applications) && applications >= 1 && applications <= 2,
    `${label}: applications must be one or two`);
  assertU32(rngValue, `${label}: rngValue`);
  const outcome = sourceOutcome(initialProjection, instructionSpec, applications, rngValue, salt);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    instruction: vectorInstruction(instructionSpec),
    initial: vectorState(canonicalRulesFromProjection(initialProjection)),
    initialMachine: vectorMachine(stateWithMachineSiblings(canonicalRulesFromProjection(initialProjection), rngValue, salt)),
    expected: outcome.expected,
    expectedMachine: outcome.expectedMachine,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

function advanceRngValue(value) {
  return (Math.imul(value, 1103515245) + 24691) >>> 0;
}

function seedForDuration(duration) {
  for (let seed = 0; seed <= 0xffff; seed += 1) {
    const randomValue = advanceRngValue(seed) >>> 16;
    if ((randomValue & 3) + 3 === duration) return seed;
  }
  throw new Error(`could not find a seed for Encore duration ${duration}`);
}

const RNG_SEEDS_BY_DURATION = Object.freeze([3, 4, 5, 6].map((duration) =>
  Object.freeze({ duration, seed: seedForDuration(duration) }),
));

let salt = 0;
for (const target of BATTLER_DOMAIN) {
  for (const slot of MOVE_SLOT_DOMAIN) {
    for (const { duration, seed } of RNG_SEEDS_BY_DURATION) {
      const move = 300 + target * 20 + slot;
      const moves = [501, 502, 503, 504];
      const pp = [9, 10, 11, 12];
      moves[slot] = move;
      addCase(`target_t${target}_slot_${slot}_duration_${duration}`,
        "target-slot-rng-duration-matrix",
        makeProjection({ salt, target, targetMoves: moves, targetPp: pp, targetLastMove: move }),
        { rngValue: seed, salt: salt++ });
    }
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const attacker of OPTIONAL_BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        const move = 700 + target;
        addCase(`selectors_t${target}_a${attacker ?? "n"}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
          "complete-target-attacker-effect-fainted-selector-matrix",
          makeProjection({
            salt,
            target,
            attacker,
            effectBattler,
            fainted,
            targetMoves: [move, 45, 98, 259],
            targetPp: [15, 25, 35, 40],
            targetLastMove: move,
          }),
          { rngValue: RNG_SEEDS_BY_DURATION[salt & 3].seed, salt: salt++ });
      }
    }
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const [edgeIndex, lastMove] of LAST_MOVE_EDGE_DOMAIN.entries()) {
    addCase(`last_move_edge_t${target}_${edgeIndex}`,
      "u16-last-move-forbidden-and-boundary-matrix",
      makeProjection({
        salt,
        target,
        targetMoves: [lastMove, 45, 98, 259],
        targetPp: [0xff, 25, 35, 40],
        targetLastMove: lastMove,
      }),
      { rngValue: RNG_SEEDS_BY_DURATION[edgeIndex & 3].seed, salt: salt++ });
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const slot of MOVE_SLOT_DOMAIN) {
    for (const ppValue of PP_EDGE_DOMAIN) {
      const move = 900 + target * 16 + slot;
      const moves = [801, 802, 803, 804];
      const pp = [19, 20, 21, 22];
      moves[slot] = move;
      pp[slot] = ppValue;
      addCase(`pp_t${target}_slot_${slot}_value_${ppValue}`,
        "pp-u8-edge-per-target-slot-matrix",
        makeProjection({ salt, target, targetMoves: moves, targetPp: pp, targetLastMove: move }),
        { rngValue: RNG_SEEDS_BY_DURATION[slot].seed, salt: salt++ });
    }
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const encoredMove of ENCORED_MOVE_EDGE_DOMAIN) {
    const move = 1000 + target;
    addCase(`existing_encore_t${target}_value_${encoredMove}`,
      "existing-encore-gate-u16-edge-matrix",
      makeProjection({
        salt,
        target,
        targetMoves: [41, move, 43, 44],
        targetPp: [20, 21, 22, 23],
        targetLastMove: move,
        targetEncoredMove: encoredMove,
        targetEncoredMovePos: 3,
        targetEncoreTimer: 15,
        targetEncoreTimerStartValue: 14,
      }),
      { rngValue: RNG_SEEDS_BY_DURATION[target].seed, salt: salt++ });
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const firstSlot of MOVE_SLOT_DOMAIN) {
    const duplicateMove = 1100 + target * 4 + firstSlot;
    const secondSlot = (firstSlot + 1) & 3;
    for (const firstPp of [0, 17]) {
      const moves = [71, 72, 73, 74];
      const pp = [9, 10, 11, 12];
      moves[firstSlot] = duplicateMove;
      moves[secondSlot] = duplicateMove;
      pp[firstSlot] = firstPp;
      pp[secondSlot] = firstPp === 0 ? 0xff : 0;
      addCase(`duplicate_t${target}_first_${firstSlot}_pp_${firstPp}`,
        "first-matching-duplicate-slot-pp-precedence",
        makeProjection({ salt, target, targetMoves: moves, targetPp: pp, targetLastMove: duplicateMove }),
        { rngValue: RNG_SEEDS_BY_DURATION[firstSlot].seed, salt: salt++ });
    }
  }
}

for (const target of BATTLER_DOMAIN) {
  addCase(`no_matching_move_t${target}`,
    "no-matching-slot-fail-jump",
    makeProjection({
      salt,
      target,
      targetMoves: [1201, 1202, 1203, 1204],
      targetPp: [0xff, 0xff, 0xff, 0xff],
      targetLastMove: 1205,
    }),
    { rngValue: RNG_SEEDS_BY_DURATION[target].seed, salt: salt++ });
}

addCase("eligible_target_skips_unresolved_failure_label", "late-label-resolution-success",
  makeProjection({ salt, target: 2, targetMoves: [1301, 1302, 1303, 1304], targetPp: [1, 2, 3, 4], targetLastMove: 1303 }),
  { instructionSpec: freezeInstructionSpec({ operandExpressions: [UNRESOLVED_FAILURE_POINTER] }),
    rngValue: RNG_SEEDS_BY_DURATION[3].seed, salt: salt++ });
addCase("ineligible_target_resolves_unresolved_failure_label_late", "late-label-resolution-failure",
  makeProjection({ salt, target: 1, targetMoves: [1401, 1402, 1403, 1404], targetPp: [1, 2, 3, 4], targetLastMove: 1402, targetEncoredMove: 7 }),
  { instructionSpec: freezeInstructionSpec({ operandExpressions: [UNRESOLVED_FAILURE_POINTER] }), salt: salt++ });
addCase("missing_target_precedes_move_history_and_failure_label", "missing-target-role",
  makeProjection({ salt, target: null, targetLastMove: 0xffff }),
  { instructionSpec: freezeInstructionSpec({ operandExpressions: [UNRESOLVED_FAILURE_POINTER] }), salt: salt++ });

for (const [label, instructionSpec] of [
  ["invalid_opcode", freezeInstructionSpec({ programCounter: 61_001, opcodeId: 0xa3 })],
  ["invalid_dispatcher", freezeInstructionSpec({ programCounter: 61_002, dispatcher: "Cmd_settorment" })],
  ["missing_operand", freezeInstructionSpec({ programCounter: 61_003, operandWidths: [], operandExpressions: [] })],
  ["extra_operand", freezeInstructionSpec({ programCounter: 61_004, operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })],
  ["wrong_width", freezeInstructionSpec({ programCounter: 61_005, operandWidths: [2] })],
]) {
  addCase(`${label}_precedes_target_role`, "invalid-instruction-shape-before-target-role",
    makeProjection({ salt, target: null, targetLastMove: 0xffff }), { instructionSpec, salt: salt++ });
}

addCase("repeated_success_then_existing_encore_jump", "repeated-application",
  makeProjection({ salt, target: 3, targetMoves: [1501, 1502, 1503, 1504], targetPp: [1, 2, 3, 4], targetLastMove: 1504 }),
  { applications: 2, rngValue: RNG_SEEDS_BY_DURATION[2].seed, salt: salt++ });
addCase("repeated_missing_slot_jumps_without_rng", "repeated-application",
  makeProjection({ salt, target: 0, targetMoves: [1601, 1602, 1603, 1604], targetPp: [1, 2, 3, 4], targetLastMove: 1605 }),
  { applications: 2, salt: salt++ });
addCase("repeated_forbidden_move_jumps_without_rng", "repeated-application",
  makeProjection({ salt, target: 2, targetMoves: [165, 41, 42, 43], targetPp: [0xff, 1, 1, 1], targetLastMove: 165 }),
  { applications: 2, salt: salt++ });

function registrationProgram(instructions) {
  return Object.freeze({ ...program, instructions: Object.freeze(instructions) });
}

function registration(label, specs) {
  const instructions = specs.map(instructionFromSpec);
  try {
    const handlersForProgram = opcodeModule.createBattleScriptTrysetencoreOpcodeHandlers(
      registrationProgram(instructions),
    );
    return Object.freeze({
      label,
      instructions: Object.freeze(specs),
      expectedBindings: Object.freeze(Object.keys(handlersForProgram).map(Number)),
      expectedError: null,
    });
  } catch (error) {
    assert(error instanceof Error, `registration ${label} threw non-Error`);
    return Object.freeze({
      label,
      instructions: Object.freeze(specs),
      expectedBindings: Object.freeze([]),
      expectedError: error.message,
    });
  }
}

const noise = freezeInstructionSpec({
  opcodeName: "B_SCR_OP_SETTORMENT",
  opcodeId: 0xce,
  dispatcher: "Cmd_settorment",
});
const registrationCases = Object.freeze([
  registration("singleton", [CANONICAL_INSTRUCTION]),
  registration("noise_before", [noise, CANONICAL_INSTRUCTION]),
  registration("noise_after", [CANONICAL_INSTRUCTION, noise]),
  registration("missing", [noise]),
  registration("empty", []),
  registration("duplicate_adjacent", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]),
  registration("duplicate_separated", [CANONICAL_INSTRUCTION, noise, CANONICAL_INSTRUCTION]),
  registration("singleton_wrong_opcode", [freezeInstructionSpec({ opcodeId: 0xa3 })]),
  registration("singleton_wrong_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_settorment" })]),
  registration("singleton_missing_operand", [freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })]),
  registration("singleton_extra_operand", [freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })]),
  registration("singleton_wrong_width", [freezeInstructionSpec({ operandWidths: [1] })]),
]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => {
  if (value.expectedError === null) return "registered";
  if (value.expectedError.startsWith("B_SCR_OP_TRYSETENCORE requires exactly")) return "wrong-cardinality";
  if (value.expectedError.startsWith(INVALID_SHAPE_PREFIX)) return "invalid-shape";
  throw new Error(`unexpected registration error ${value.expectedError}`);
});
const domainCensus = Object.freeze([
  ["battler-slots", BATTLER_DOMAIN.length],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-selector-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["selector-role-combinations-with-concrete-target", BATTLER_DOMAIN.length * OPTIONAL_BATTLER_DOMAIN.length ** 3],
  ["move-slots", MOVE_SLOT_DOMAIN.length],
  ["pp-u8-edge-values", PP_EDGE_DOMAIN.length],
  ["encored-move-u16-edge-values", ENCORED_MOVE_EDGE_DOMAIN.length],
  ["last-move-u16-edge-values", LAST_MOVE_EDGE_DOMAIN.length],
  ["forbidden-move-values", FORBIDDEN_MOVES.length],
  ["rng-duration-values", RNG_SEEDS_BY_DURATION.length],
  ["instruction-shape-variants", 6],
  ["control-branch-values", 2],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  entryLabel: ENTRY_LABEL,
  failurePointer: FAILURE_POINTER,
  targetDomain: BATTLER_DOMAIN,
  optionalSelectorDomain: OPTIONAL_BATTLER_DOMAIN,
  moveSlotDomain: MOVE_SLOT_DOMAIN,
  ppEdgeDomain: PP_EDGE_DOMAIN,
  encoredMoveEdgeDomain: ENCORED_MOVE_EDGE_DOMAIN,
  lastMoveEdgeDomain: LAST_MOVE_EDGE_DOMAIN,
  forbiddenMoves: FORBIDDEN_MOVES,
  rngSeedsByDuration: RNG_SEEDS_BY_DURATION,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) { return JSON.stringify(value); }
function rustU8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function rustI8(value) { return `${value}i8`; }
function rustU16(value) { return `0x${value.toString(16).padStart(4, "0")}`; }
function rustU32(value) { return `0x${value.toString(16).padStart(8, "0")}`; }
function rustBattler(value) { return `BattleScriptTrysetencoreBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionalU32(value) { return value === null ? "None" : `Some(${rustU32(value)})`; }
function rustControl(value) {
  return value.kind === "advance"
    ? "BattleScriptTrysetencoreControl::Advance"
    : `BattleScriptTrysetencoreControl::Jump { program_counter: ${rustU32(value.programCounter)} }`;
}
function rustControls(values) { return `&[${values.map(rustControl).join(", ")}]`; }
function rustBattlerState(value) {
  return [
    "BattleScriptTrysetencoreVectorBattlerState {",
    `side: ${rustU8(value.side)},`, `ability: ${rustU8(value.ability)},`,
    `hp: ${rustU16(value.hp)},`, `max_hp: ${rustU16(value.maxHp)},`,
    `moves: [${value.moves.map(rustU16).join(", ")}],`, `pp: [${value.pp.map(rustU8).join(", ")}],`,
    `status1: ${rustU32(value.status1)},`, `status2: ${rustU32(value.status2)},`,
    `status3: ${rustU32(value.status3)},`, `item: ${rustU16(value.item)},`,
    `stat_stages: [${value.statStages.map(rustI8).join(", ")}],`,
    `party_index: ${rustU8(value.partyIndex)},`, `encored_move: ${rustU16(value.encoredMove)},`,
    `encored_move_pos: ${rustU8(value.encoredMovePos)},`, `encore_timer: ${rustU8(value.encoreTimer)},`,
    `encore_timer_start_value: ${rustU8(value.encoreTimerStartValue)},`, "}",
  ].join(" ");
}
function rustMoveHistory(value) {
  return [
    "BattleScriptTrysetencoreVectorMoveHistory {",
    `last_printed_moves: [${value.lastPrintedMoves.map(rustU16).join(", ")}],`,
    `last_moves: [${value.lastMoves.map(rustU16).join(", ")}],`,
    `last_resulting_moves: [${value.lastResultingMoves.map(rustU16).join(", ")}],`,
    `last_landed_moves: [${value.lastLandedMoves.map(rustU16).join(", ")}],`,
    `last_hit_by_type: [${value.lastHitByType.map(rustU16).join(", ")}],`,
    `last_hit_by: [${value.lastHitBy.map(rustU8).join(", ")}],`, "}",
  ].join(" ");
}
function rustContextState(value) {
  return [
    "BattleScriptTrysetencoreVectorContextState {",
    `scripting_battler: ${rustBattler(value.scriptingBattler)},`,
    `atk_canceler_tracker: ${rustU8(value.atkCancelerTracker)},`,
    `battle_outcome: ${rustU8(value.battleOutcome)},`, `current_move: ${rustU16(value.currentMove)},`,
    `current_move_position: ${rustU8(value.currentMovePosition)},`,
    `move_result_flags: ${rustU8(value.moveResultFlags)},`, `hit_marker: ${rustU32(value.hitMarker)},`,
    `multi_hit_counter: ${rustU8(value.multiHitCounter)},`, "}",
  ].join(" ");
}
function rustState(value) {
  return [
    "BattleScriptTrysetencoreVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`, `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`, `fainted: ${rustOptionalBattler(value.fainted)},`,
    `move_history: ${rustMoveHistory(value.moveHistory)},`, `context_state: ${rustContextState(value.contextState)},`, "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustScheduler(value) {
  const pending = value.pendingControllerBattlers.map((battler) => `Some(${rustBattler(battler)})`);
  while (pending.length < 4) pending.push("None");
  return [
    "BattleScriptTrysetencoreVectorScheduler {",
    `message_display_active: ${value.messageDisplayActive},`,
    `pause_counter_battle: ${rustU16(value.pauseCounterBattle)},`,
    `active_battler: ${rustOptionalBattler(value.activeBattler)},`,
    `pending_controller_battlers: [${pending.join(", ")}],`,
    `pending_count: ${rustU8(value.pendingControllerBattlers.length)},`, "}",
  ].join(" ");
}
function rustMachine(value) {
  return ["BattleScriptTrysetencoreVectorMachine {", `scheduler: ${rustScheduler(value.scheduler)},`,
    `rng_value: ${rustU32(value.rngValue)},`, `rng_calls: ${rustU32(value.rngCalls)},`, "}"].join(" ");
}
function rustOptionalMachine(value) { return value === null ? "None" : `Some(${rustMachine(value)})`; }
function rustInstruction(value) {
  return [
    "BattleScriptTrysetencoreVectorInstruction {",
    `opcode_name: ${rustString(value.opcodeName)},`, `program_counter: ${rustU32(value.programCounter)},`,
    `opcode_id: ${rustU8(value.opcodeId)},`, `dispatcher: ${rustString(value.dispatcher)},`,
    `operand_widths: &[${value.operandWidths.map(rustU8).join(", ")}],`,
    `operand_expressions: &[${value.operandExpressions.map(rustString).join(", ")}],`,
    `resolved_failure_expression: ${rustOptionalString(value.resolvedFailureExpression)},`,
    `resolved_failure_program_counter: ${rustOptionalU32(value.resolvedFailureProgramCounter)},`, "}",
  ].join(" ");
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetencore-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetencoreOpcode.ts via node.");
lines.push("// Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetencore::{BattleScriptTrysetencoreBattler, BattleScriptTrysetencoreControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_PP_EDGE_DOMAIN: [u8; ${PP_EDGE_DOMAIN.length}] = [${PP_EDGE_DOMAIN.map(rustU8).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_ENCORED_MOVE_EDGE_DOMAIN: [u16; ${ENCORED_MOVE_EDGE_DOMAIN.length}] = [${ENCORED_MOVE_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_LAST_MOVE_EDGE_DOMAIN: [u16; ${LAST_MOVE_EDGE_DOMAIN.length}] = [${LAST_MOVE_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_RNG_DURATION_DOMAIN: [u8; ${RNG_SEEDS_BY_DURATION.length}] = [${RNG_SEEDS_BY_DURATION.map(({ duration }) => rustU8(duration)).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorBattlerState {");
lines.push("    pub side: u8, pub ability: u8, pub hp: u16, pub max_hp: u16,");
lines.push("    pub moves: [u16; 4], pub pp: [u8; 4], pub status1: u32, pub status2: u32, pub status3: u32,");
lines.push("    pub item: u16, pub stat_stages: [i8; 8], pub party_index: u8,");
lines.push("    pub encored_move: u16, pub encored_move_pos: u8, pub encore_timer: u8, pub encore_timer_start_value: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorMoveHistory {");
lines.push("    pub last_printed_moves: [u16; 4], pub last_moves: [u16; 4], pub last_resulting_moves: [u16; 4],");
lines.push("    pub last_landed_moves: [u16; 4], pub last_hit_by_type: [u16; 4], pub last_hit_by: [u8; 4],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorContextState {");
lines.push("    pub scripting_battler: BattleScriptTrysetencoreBattler, pub atk_canceler_tracker: u8, pub battle_outcome: u8,");
lines.push("    pub current_move: u16, pub current_move_position: u8, pub move_result_flags: u8, pub hit_marker: u32, pub multi_hit_counter: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorState {");
lines.push("    pub battlers: [BattleScriptTrysetencoreVectorBattlerState; 4],");
lines.push("    pub attacker: Option<BattleScriptTrysetencoreBattler>, pub target: Option<BattleScriptTrysetencoreBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptTrysetencoreBattler>, pub fainted: Option<BattleScriptTrysetencoreBattler>,");
lines.push("    pub move_history: BattleScriptTrysetencoreVectorMoveHistory, pub context_state: BattleScriptTrysetencoreVectorContextState,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorScheduler {");
lines.push("    pub message_display_active: bool, pub pause_counter_battle: u16, pub active_battler: Option<BattleScriptTrysetencoreBattler>,");
lines.push("    pub pending_controller_battlers: [Option<BattleScriptTrysetencoreBattler>; 4], pub pending_count: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorMachine { pub scheduler: BattleScriptTrysetencoreVectorScheduler, pub rng_value: u32, pub rng_calls: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorInstruction {");
lines.push("    pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8, pub dispatcher: &'static str,");
lines.push("    pub operand_widths: &'static [u8], pub operand_expressions: &'static [&'static str],");
lines.push("    pub resolved_failure_expression: Option<&'static str>, pub resolved_failure_program_counter: Option<u32>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8,");
lines.push("    pub instruction: BattleScriptTrysetencoreVectorInstruction, pub initial: BattleScriptTrysetencoreVectorState,");
lines.push("    pub initial_machine: BattleScriptTrysetencoreVectorMachine, pub expected: Option<BattleScriptTrysetencoreVectorState>,");
lines.push("    pub expected_machine: Option<BattleScriptTrysetencoreVectorMachine>, pub controls: &'static [BattleScriptTrysetencoreControl], pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetencoreRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub instructions: &'static [BattleScriptTrysetencoreVectorInstruction], pub expected_bindings: &'static [u8], pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push(`pub const BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [`);
for (const [name, count] of registrationBranchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETENCORE_CASES: [BattleScriptTrysetencoreVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetencoreVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)}, applications: ${value.applications},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        initial: ${rustState(value.initial)}, initial_machine: ${rustMachine(value.initialMachine)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)}, expected_machine: ${rustOptionalMachine(value.expectedMachine)},`);
  lines.push(`        controls: ${rustControls(value.controls)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];" );
lines.push(`pub static BATTLE_SCRIPT_TRYSETENCORE_REGISTRATION_CASES: [BattleScriptTrysetencoreRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push("    BattleScriptTrysetencoreRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map((spec) => rustInstruction(vectorInstruction(spec))).join(", ")}],`);
  lines.push(`        expected_bindings: &[${value.expectedBindings.map(rustU8).join(", ")}], expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];" );

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
const rustupBin = path.join("/Users/kyle", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-trysetencore-vectors: could not find rustfmt");
const generatedBytes = fs.readFileSync(outPath);
const generatorBytes = fs.readFileSync(scriptPath);
console.log(`gen-battle-script-trysetencore-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-trysetencore-vectors: ${cases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-trysetencore-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-trysetencore-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-trysetencore-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-trysetencore-vectors: registration branch census ${JSON.stringify(registrationBranchCensus)}`);
console.log(`gen-battle-script-trysetencore-vectors: corpus sha256 ${corpusHash} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-trysetencore-vectors: generated sha256 ${crypto.createHash("sha256").update(generatedBytes).digest("hex")} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-trysetencore-vectors: generator sha256 ${crypto.createHash("sha256").update(generatorBytes).digest("hex")} bytes ${generatorBytes.length}`);
