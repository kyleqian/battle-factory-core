#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTryhealhalfhealthOpcode.ts.
// Expected controls, complete narrow projections, registration results, and
// exact ordered errors are created only by executing the canonical TypeScript
// handler. This script owns bounded input construction, full-u16 normalized
// proof construction, and Rust literal emission; it does not reimplement the
// handler to make expected values.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-tryhealhalfhealth-vectors.mjs

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
  "battle_script_tryhealhalfhealth_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTryhealhalfhealthOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYHEALHALFHEALTH";
const OPCODE_ID = 0x7b;
const DISPATCHER = "Cmd_tryhealhalfhealth";
const RESTORE_LABEL = "BattleScript_EffectRestoreHp";
const SOFTBOILED_LABEL = "BattleScript_EffectSoftboiled";
const FULL_HP_LABEL = "BattleScript_AlreadyAtFullHp";
const BS_ATTACKER = "BS_ATTACKER";
const BS_TARGET = "BS_TARGET";
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const I32_MIN = -0x8000_0000;
const I32_MAX = 0x7fff_ffff;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...BATTLER_DOMAIN]);
const MAX_HP_EDGE_DOMAIN = Object.freeze([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  99, 100, 101, 102, 255, 256, 257, 32_767, 32_768, 65_534, U16_MAX,
]);
const PRIOR_DAMAGE_EDGE_DOMAIN = Object.freeze([
  I32_MIN, -32_768, -1, 0, 1, 32_767, I32_MAX,
]);
const GENERATED_FILE_MAX_BYTES = 20_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-tryhealhalfhealth-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, `${label} must be a u8, got ${value}`);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, `${label} must be a u16, got ${value}`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, `${label} must be a u32, got ${value}`);
}

function assertI32(value, label) {
  assert(Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX, `${label} must be an i32, got ${value}`);
}

function u8(salt) {
  return ((salt * 37) ^ (salt >>> 3) ^ 0xa5) & U8_MAX;
}

function u16(salt) {
  return ((salt * 1_009) ^ (salt * 13) ^ 0xa55a) & U16_MAX;
}

function u32(salt) {
  return ((salt * 0x1020_4081) ^ (salt << 17) ^ 0x8100_1001) >>> 0;
}

function i32(salt) {
  return u32(salt) | 0;
}

function roleLabel(value) {
  return value === null ? "none" : `b${value}`;
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
  value.moves.forEach((entry, index) => assertU16(entry, `${label}.moves[${index}]`));
  value.pp.forEach((entry, index) => assertU8(entry, `${label}.pp[${index}]`));
  value.statStages.forEach((entry, index) => assertU8(entry, `${label}.statStages[${index}]`));
  assertU32(value.status1, `${label}.status1`);
  assertU32(value.status2, `${label}.status2`);
  assertU32(value.status3, `${label}.status3`);
  assertU16(value.substituteHp, `${label}.substituteHp`);
  for (const field of [
    "rolloutTimer", "furyCutterCounter", "truantCounter", "rechargeTimer",
    "flinchImmobility", "usedDisabledMove", "tauntTimer", "usedTauntedMove",
    "usedImprisonedMove", "partyIndex",
  ]) assertU8(value[field], `${label}.${field}`);
  assert(value.partyIndex < 6, `${label}.partyIndex must be a party slot`);
  assertU16(value.disabledMove, `${label}.disabledMove`);
  assertU16(value.item, `${label}.item`);
  assertU16(value.speed, `${label}.speed`);
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
    substituteHp: value.substituteHp,
    rolloutTimer: value.rolloutTimer,
    furyCutterCounter: value.furyCutterCounter,
    truantCounter: value.truantCounter,
    rechargeTimer: value.rechargeTimer,
    flinchImmobility: value.flinchImmobility,
    disabledMove: value.disabledMove,
    usedDisabledMove: value.usedDisabledMove,
    tauntTimer: value.tauntTimer,
    usedTauntedMove: value.usedTauntedMove,
    usedImprisonedMove: value.usedImprisonedMove,
    item: value.item,
    statStages: Object.freeze([...value.statStages]),
    partyIndex: value.partyIndex,
    speed: value.speed,
  });
}

function makeBattler(index, salt, hp, maxHp) {
  assertBattler(index, "battler index");
  assertU16(hp, "generated hp");
  assertU16(maxHp, "generated maxHp");
  return freezeBattler({
    side: (index + salt) & 1,
    ability: u8(salt + index * 3 + 1),
    hp,
    maxHp,
    moves: [u16(salt + index * 11 + 2), u16(salt + index * 13 + 3), u16(salt + index * 17 + 4), u16(salt + index * 19 + 5)],
    pp: [u8(salt + index * 7 + 6), u8(salt + index * 11 + 7), u8(salt + index * 13 + 8), u8(salt + index * 17 + 9)],
    status1: u32(salt + index * 23 + 10),
    status2: u32(salt + index * 29 + 11),
    status3: u32(salt + index * 31 + 12),
    // DisableStruct::substituteHP remains an actual source u8 at the
    // canonical constructor boundary. The Rust projection keeps its wider
    // retained field only to make the leaf's no-write behavior explicit.
    substituteHp: u8(salt + index * 37 + 13),
    rolloutTimer: u8(salt + index * 41 + 14) & 0x0f,
    furyCutterCounter: u8(salt + index * 43 + 15),
    truantCounter: u8(salt + index * 47 + 16) & 1,
    rechargeTimer: u8(salt + index * 53 + 17),
    flinchImmobility: u8(salt + index * 59 + 18) & 1,
    disabledMove: u16(salt + index * 61 + 19),
    usedDisabledMove: u8(salt + index * 67 + 20) & 1,
    tauntTimer: u8(salt + index * 71 + 21) & 0x0f,
    usedTauntedMove: u8(salt + index * 73 + 22) & 1,
    usedImprisonedMove: u8(salt + index * 79 + 23) & 1,
    item: u16(salt + index * 83 + 24),
    statStages: Array.from({ length: 8 }, (_unused, stat) => (salt + index * 5 + stat) % 13),
    partyIndex: (salt + index) % 6,
    speed: u16(salt + index * 89 + 25),
  }, `generated battler ${index}`);
}

function makeSiblings(salt) {
  return Object.freeze({
    scriptingBattler: BATTLER_DOMAIN[(salt + 0) & 3],
    battlerWithAbility: BATTLER_DOMAIN[(salt + 1) & 3],
    atkCancelerTracker: u8(salt + 2),
    battleOutcome: u8(salt + 3),
    currentMove: [105, 135][salt & 1],
    currentMovePosition: salt & 3,
    moveResultFlags: u32(salt + 4),
    dmgMultiplier: u8(salt + 5),
    critMultiplier: u8(salt + 6),
    moveEffectByte: u8(salt + 7),
    missType: u8(salt + 8),
    hitMarker: u32(salt + 9),
    multiHitCounter: u8(salt + 10),
    multiHitStringCounter: u8(salt + 11),
    multistringChooser: u8(salt + 12),
    painSplitHp: i32(salt + 13),
    dynamicBasePower: u16(salt + 14),
    hpDealt: i32(salt + 15),
    bideDmg: Object.freeze(BATTLER_DOMAIN.map((battler) => i32(salt + battler * 17 + 16))),
    lockedMoves: Object.freeze(BATTLER_DOMAIN.map((battler) => u16(salt + battler * 19 + 20))),
    sideStatuses: Object.freeze([u32(salt + 24), u32(salt + 25)]),
    weather: u32(salt + 26),
    weatherTimer: u8(salt + 27),
  });
}

function freezeProjection(value) {
  assert(Array.isArray(value.battlers) && value.battlers.length === BATTLE_SLOTS, "battlers must have four cells");
  value.battlers.forEach((battler, index) => freezeBattler(battler, `battlers[${index}]`));
  assertOptionalBattler(value.attacker, "attacker role");
  assertOptionalBattler(value.target, "target role");
  assertOptionalBattler(value.effectBattler, "effectBattler role");
  assertOptionalBattler(value.fainted, "fainted role");
  assertI32(value.battleMoveDamage, "battleMoveDamage");
  return Object.freeze({
    battlers: Object.freeze(value.battlers.map((battler, index) => freezeBattler(battler, `battlers[${index}]`))),
    attacker: value.attacker,
    target: value.target,
    effectBattler: value.effectBattler,
    fainted: value.fainted,
    battleMoveDamage: value.battleMoveDamage,
    siblings: value.siblings,
  });
}

function makeProjection({
  salt,
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  focusBattler = attacker ?? target ?? 0,
  hp = 40,
  maxHp = 101,
  battleMoveDamage = -1,
}) {
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  assertBattler(focusBattler, "focus battler");
  assertU16(hp, "focus hp");
  assertU16(maxHp, "focus maxHp");
  assertI32(battleMoveDamage, "incoming battleMoveDamage");
  const battlers = BATTLER_DOMAIN.map((battler) => makeBattler(
    battler,
    salt,
    battler === focusBattler ? hp : u16(salt + battler * 97 + 30),
    battler === focusBattler ? maxHp : u16(salt + battler * 101 + 31),
  ));
  return freezeProjection({
    battlers,
    attacker,
    target,
    effectBattler,
    fainted,
    battleMoveDamage,
    siblings: makeSiblings(salt),
  });
}

function canonicalBattler(value, index) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHP: value.maxHp,
    moves: value.moves,
    pp: value.pp,
    status1: value.status1,
    status2: value.status2,
    status3: value.status3,
    substituteHP: value.substituteHp,
    rolloutTimer: value.rolloutTimer,
    furyCutterCounter: value.furyCutterCounter,
    truantCounter: value.truantCounter,
    rechargeTimer: value.rechargeTimer,
    flinchImmobility: value.flinchImmobility,
    disabledMove: value.disabledMove,
    usedDisabledMove: value.usedDisabledMove,
    tauntTimer: value.tauntTimer,
    usedTauntedMove: value.usedTauntedMove,
    usedImprisonedMove: value.usedImprisonedMove,
    item: value.item,
    statStages: value.statStages,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: value.speed,
    level: 50,
    friendship: 70,
    partyIndex: value.partyIndex,
    isFirstTurn: 0,
  });
}

function canonicalRulesFromProjection(value) {
  const siblings = value.siblings;
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(value.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: value.attacker,
      target: value.target,
      effectBattler: value.effectBattler,
      fainted: value.fainted,
    }),
    scriptingBattler: siblings.scriptingBattler,
    battlerWithAbility: siblings.battlerWithAbility,
    atkCancelerTracker: siblings.atkCancelerTracker,
    battleOutcome: siblings.battleOutcome,
    currentMove: siblings.currentMove,
    currentMovePosition: siblings.currentMovePosition,
    moveResultFlags: siblings.moveResultFlags & U8_MAX,
    dmgMultiplier: siblings.dmgMultiplier,
    critMultiplier: siblings.critMultiplier,
    moveEffectByte: siblings.moveEffectByte,
    missType: siblings.missType,
    hitMarker: siblings.hitMarker,
    multiHitCounter: siblings.multiHitCounter,
    multiHitStringCounter: siblings.multiHitStringCounter,
    multistringChooser: siblings.multistringChooser,
    battleMoveDamage: value.battleMoveDamage,
    painSplitHp: siblings.painSplitHp,
    dynamicBasePower: siblings.dynamicBasePower,
    hpDealt: siblings.hpDealt,
    bideDmg: siblings.bideDmg,
    lockedMoves: siblings.lockedMoves,
    sideStatuses: siblings.sideStatuses,
    weather: siblings.weather,
    weatherTimer: siblings.weatherTimer,
  });
}

function vectorBattler(value) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHp: value.maxHP,
    moves: Object.freeze([...value.moves]),
    pp: Object.freeze([...value.pp]),
    status1: value.status1 >>> 0,
    status2: value.status2 >>> 0,
    status3: value.status3 >>> 0,
    substituteHp: value.substituteHP,
    rolloutTimer: value.rolloutTimer,
    furyCutterCounter: value.furyCutterCounter,
    truantCounter: value.truantCounter,
    rechargeTimer: value.rechargeTimer,
    flinchImmobility: value.flinchImmobility,
    disabledMove: value.disabledMove,
    usedDisabledMove: value.usedDisabledMove,
    tauntTimer: value.tauntTimer,
    usedTauntedMove: value.usedTauntedMove,
    usedImprisonedMove: value.usedImprisonedMove,
    item: value.item,
    statStages: Object.freeze([...value.statStages]),
    partyIndex: value.partyIndex,
    speed: value.speed,
  });
}

function vectorSiblings(value) {
  return Object.freeze({
    scriptingBattler: value.scriptingBattler,
    battlerWithAbility: value.battlerWithAbility,
    atkCancelerTracker: value.atkCancelerTracker,
    battleOutcome: value.battleOutcome,
    currentMove: value.currentMove,
    currentMoveEffect: value.currentMoveEffect,
    currentMovePosition: value.currentMovePosition,
    moveResultFlags: value.moveResultFlags >>> 0,
    dmgMultiplier: value.dmgMultiplier,
    critMultiplier: value.critMultiplier,
    moveEffectByte: value.moveEffectByte,
    missType: value.missType,
    hitMarker: value.hitMarker >>> 0,
    multiHitCounter: value.multiHitCounter,
    multiHitStringCounter: value.multiHitStringCounter,
    multistringChooser: value.multistringChooser,
    painSplitHp: value.painSplitHp,
    dynamicBasePower: value.dynamicBasePower,
    hpDealt: value.hpDealt,
    bideDmg: Object.freeze([...value.bideDmg]),
    lockedMoves: Object.freeze([...value.lockedMoves]),
    sideStatuses: Object.freeze([...value.sideStatuses]),
    weather: value.weather >>> 0,
    weatherTimer: value.weatherTimer,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattler)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    battleMoveDamage: rules.battleMoveDamage,
    siblings: vectorSiblings(rules),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 2, `expected two ${OPCODE_NAME} instructions, got ${canonicalInstructions.length}`);
const [restoreInstruction, softboiledInstruction] = canonicalInstructions;
assert(restoreInstruction.opcodeId === OPCODE_ID, `Restore HP opcode drifted to ${restoreInstruction.opcodeId}`);
assert(softboiledInstruction.opcodeId === OPCODE_ID, `Softboiled opcode drifted to ${softboiledInstruction.opcodeId}`);
assert(restoreInstruction.dispatcher === DISPATCHER, `Restore HP dispatcher drifted to ${restoreInstruction.dispatcher}`);
assert(softboiledInstruction.dispatcher === DISPATCHER, `Softboiled dispatcher drifted to ${softboiledInstruction.dispatcher}`);
assert(restoreInstruction.source.label === RESTORE_LABEL, `Restore HP source label drifted to ${restoreInstruction.source.label}`);
assert(softboiledInstruction.source.label === SOFTBOILED_LABEL, `Softboiled source label drifted to ${softboiledInstruction.source.label}`);
for (const [name, instruction, battlerExpression, statementLine] of [
  ["Restore HP", restoreInstruction, BS_ATTACKER, 676],
  ["Softboiled", softboiledInstruction, BS_TARGET, 2031],
]) {
  assert(instruction.operands.length === 2, `${name} must have pointer and battler operands`);
  assert(instruction.operands[0]?.widthBytes === 4, `${name} failure pointer width drifted`);
  assert(instruction.operands[0]?.expression === FULL_HP_LABEL, `${name} failure expression drifted`);
  assert(instruction.operands[1]?.widthBytes === 1, `${name} battler operand width drifted`);
  assert(instruction.operands[1]?.expression === battlerExpression, `${name} battler expression drifted`);
  assert(instruction.source.statementLine === statementLine, `${name} source statement drifted`);
  assert(instruction.source.invocationMnemonic === "tryhealhalfhealth", `${name} macro invocation drifted`);
  assert(instruction.source.invocationMacroLine === 684, `${name} macro declaration line drifted`);
  assert(instruction.operands[0]?.sourceMacroLine === 686, `${name} pointer macro line drifted`);
  assert(instruction.operands[1]?.sourceMacroLine === 687, `${name} battler macro line drifted`);
}
const fullHpEntry = programModule.resolveBattleScriptLabel(program, FULL_HP_LABEL);
assert(fullHpEntry, `${FULL_HP_LABEL} must resolve`);
assert(fullHpEntry.programCounter === 1424, `${FULL_HP_LABEL} program counter drifted`);
const handlers = opcodeModule.createBattleScriptTryhealhalfhealthOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical TRYHEALHALFHEALTH handler was not registered");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = restoreInstruction.programCounter,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4, 1],
  operandExpressions = [FULL_HP_LABEL, BS_ATTACKER],
} = {}) {
  assert(typeof opcodeName === "string", "instruction opcodeName must be a string");
  assertU32(programCounter, "instruction programCounter");
  assertU8(opcodeId, "instruction opcodeId");
  assert(typeof dispatcher === "string", "instruction dispatcher must be a string");
  assert(Array.isArray(operandWidths), "instruction operandWidths must be an array");
  assert(Array.isArray(operandExpressions), "instruction operandExpressions must be an array");
  assert(operandWidths.length === operandExpressions.length, "instruction width/expression lengths differ");
  operandWidths.forEach((width, index) => assertU8(width, `instruction operand width ${index}`));
  operandExpressions.forEach((expression, index) => assert(typeof expression === "string", `instruction operand expression ${index}`));
  return Object.freeze({
    opcodeName,
    programCounter,
    opcodeId,
    dispatcher,
    operandWidths: Object.freeze([...operandWidths]),
    operandExpressions: Object.freeze([...operandExpressions]),
  });
}

function sourceInstructionFromSpec(spec) {
  const operands = spec.operandExpressions.map((expression, index) => Object.freeze({
    widthBytes: spec.operandWidths[index],
    expression,
    sourceMacro: "synthetic-tryhealhalfhealth-vector",
    sourceMacroLine: index,
    wrapperPath: Object.freeze([]),
  }));
  return Object.freeze({
    ...restoreInstruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(operands),
  });
}

function vectorInstruction(sourceInstruction) {
  const failure = sourceInstruction.operands[0];
  const label = failure === undefined
    ? undefined
    : programModule.resolveBattleScriptLabel(program, failure.expression);
  return Object.freeze({
    opcodeName: sourceInstruction.opcodeName,
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandWidths: Object.freeze(sourceInstruction.operands.map((operand) => operand.widthBytes)),
    operandExpressions: Object.freeze(sourceInstruction.operands.map((operand) => operand.expression)),
    resolvedFailureTarget: label === undefined ? null : failure.expression,
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalTransition(currentRules, sourceInstruction, transition) {
  const operand = sourceInstruction.operands[1]?.expression;
  const control = controlFromTransition(transition);
  const nextRules = transition.rulesContext;
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(nextRules !== currentRules, "canonical handler must return its base copied rules context");
  assert(nextRules.battlers === currentRules.battlers, "canonical handler replaced untouched battlers");
  assert(nextRules.battleMoveDamage <= -1 && nextRules.battleMoveDamage >= -32_767, "canonical damage escaped source half range");
  let target;
  if (operand === BS_ATTACKER) {
    const attacker = currentRules.selectorRoles.attacker;
    assert(attacker !== null, "successful BS_ATTACKER handler had no attacker");
    target = attacker;
    assert(nextRules.selectorRoles !== currentRules.selectorRoles, "BS_ATTACKER must replace selector object");
    assert(nextRules.selectorRoles.target === attacker, "BS_ATTACKER did not rebind target");
    assert(nextRules.selectorRoles.attacker === currentRules.selectorRoles.attacker, "BS_ATTACKER changed attacker");
    assert(nextRules.selectorRoles.effectBattler === currentRules.selectorRoles.effectBattler, "BS_ATTACKER changed effectBattler");
    assert(nextRules.selectorRoles.fainted === currentRules.selectorRoles.fainted, "BS_ATTACKER changed fainted");
  } else if (operand === BS_TARGET) {
    target = currentRules.selectorRoles.target;
    assert(target !== null, "successful BS_TARGET handler had no target");
    assert(nextRules.selectorRoles === currentRules.selectorRoles, "BS_TARGET must retain selector object");
  } else {
    throw new Error(`successful handler had unexpected operand ${String(operand)}`);
  }
  const targetState = currentRules.battlers[target];
  const half = Math.max(1, Math.floor(targetState.maxHP / 2));
  assert(nextRules.battleMoveDamage === -half, "canonical handler did not write negative half max HP");
  if (targetState.hp === targetState.maxHP) {
    assert(control === "fail-jump", "full HP must jump");
    const failureExpression = sourceInstruction.operands[0]?.expression;
    const label = failureExpression === undefined
      ? undefined
      : programModule.resolveBattleScriptLabel(program, failureExpression);
    assert(label, "successful full HP jump used unresolved pointer");
    assert(transition.control.programCounter === label.programCounter, "full HP jump did not use its own pointer expression");
  } else {
    assert(control === "advance", "non-full HP must advance");
  }
  return control;
}

function sourceOutcome(initialProjection, instructionSpec, applications = 1) {
  const sourceInstruction = sourceInstructionFromSpec(instructionSpec);
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const priorSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        RESTORE_LABEL,
        currentRules,
        (0x5e7d_1b0d + application) >>> 0,
      );
      const transition = handler({ program, instruction: sourceInstruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), priorSnapshot), "canonical handler mutated current rules");
      controls.push(assertCanonicalTransition(currentRules, sourceInstruction, transition));
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
      instruction: vectorInstruction(sourceInstruction),
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      error: error.message,
      instruction: vectorInstruction(sourceInstruction),
    });
  }
}

function branchFor(outcome) {
  if (outcome.error !== null) {
    if (outcome.error.startsWith("Cmd_tryhealhalfhealth: unexpected battler operand ")) return "unexpected-battler-operand";
    if (outcome.error === "Cmd_tryhealhalfhealth requires a attacker role") return "missing-attacker-role";
    if (outcome.error === "Cmd_tryhealhalfhealth requires a target role") return "missing-target-role";
    if (outcome.error.startsWith("Cmd_tryhealhalfhealth: unresolved jump target ")) return "unresolved-jump-target";
    throw new Error(`unexpected canonical error ${outcome.error}`);
  }
  return outcome.controls.join("-then-");
}

const cases = [];
function addCase(label, category, instructionSpec, initialProjection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be one or two`);
  const outcome = sourceOutcome(initialProjection, instructionSpec, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    instruction: outcome.instruction,
    initial: vectorState(canonicalRulesFromProjection(initialProjection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

const RESTORE_SPEC = freezeInstructionSpec({
  programCounter: restoreInstruction.programCounter,
  operandExpressions: [FULL_HP_LABEL, BS_ATTACKER],
});
const SOFTBOILED_SPEC = freezeInstructionSpec({
  programCounter: softboiledInstruction.programCounter,
  operandExpressions: [FULL_HP_LABEL, BS_TARGET],
});

// Every attacker and every target/effect/fainted alias is exercised with the
// Restore HP instruction. Its incoming target may be null or unrelated; the
// handler must still bind it to attacker and advance on a lower HP state.
const THREE_ALIAS_COMBINATIONS = Object.freeze(
  OPTIONAL_BATTLER_DOMAIN.flatMap((target) => OPTIONAL_BATTLER_DOMAIN.flatMap((effectBattler) => (
    OPTIONAL_BATTLER_DOMAIN.map((fainted) => Object.freeze({ target, effectBattler, fainted }))
  ))),
);
for (const attacker of BATTLER_DOMAIN) {
  for (const [index, aliases] of THREE_ALIAS_COMBINATIONS.entries()) {
    addCase(
      `restore_selectors_a${attacker}_t${roleLabel(aliases.target)}_e${roleLabel(aliases.effectBattler)}_f${roleLabel(aliases.fainted)}`,
      "restore-all-attacker-and-selector-alias-combinations",
      RESTORE_SPEC,
      makeProjection({
        salt: 1_000 + attacker * THREE_ALIAS_COMBINATIONS.length + index,
        attacker,
        target: aliases.target,
        effectBattler: aliases.effectBattler,
        fainted: aliases.fainted,
        focusBattler: attacker,
        hp: 40,
        maxHp: 101,
        battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(attacker + index) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
      }),
    );
  }
}

// Softboiled consumes target, not attacker. Cross every target with all
// nullable attacker/effect/fainted aliases and retain the original selector
// object shape through a lower-HP advance.
for (const target of BATTLER_DOMAIN) {
  for (const [index, aliases] of THREE_ALIAS_COMBINATIONS.entries()) {
    addCase(
      `softboiled_selectors_t${target}_a${roleLabel(aliases.target)}_e${roleLabel(aliases.effectBattler)}_f${roleLabel(aliases.fainted)}`,
      "softboiled-all-target-and-selector-alias-combinations",
      SOFTBOILED_SPEC,
      makeProjection({
        salt: 3_000 + target * THREE_ALIAS_COMBINATIONS.length + index,
        attacker: aliases.target,
        target,
        effectBattler: aliases.effectBattler,
        fainted: aliases.fainted,
        focusBattler: target,
        hp: 40,
        maxHp: 101,
        battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(target + index + 2) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
      }),
    );
  }
}

// At each salient source-u16 edge and every concrete selected battler, execute
// equality, lower, and corrupt-higher HP states for both operand forms.
for (const [maxIndex, maxHp] of MAX_HP_EDGE_DOMAIN.entries()) {
  for (const [operandIndex, [instructionSpec, operand]] of [
    [RESTORE_SPEC, BS_ATTACKER],
    [SOFTBOILED_SPEC, BS_TARGET],
  ].entries()) {
    for (const selected of BATTLER_DOMAIN) {
      const roles = operand === BS_ATTACKER
        ? Object.freeze({ attacker: selected, target: (selected + 1) & 3 })
        : Object.freeze({ attacker: (selected + 1) & 3, target: selected });
      addCase(
        `hp_full_${operandIndex}_m${maxHp}_b${selected}`,
        "source-u16-full-lower-higher-boundary-probes",
        instructionSpec,
        makeProjection({
          salt: 5_000 + maxIndex * 100 + operandIndex * 10 + selected,
          ...roles,
          focusBattler: selected,
          hp: maxHp,
          maxHp,
          battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(maxIndex + selected) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
        }),
      );
      if (maxHp > 0) {
        addCase(
          `hp_lower_${operandIndex}_m${maxHp}_b${selected}`,
          "source-u16-full-lower-higher-boundary-probes",
          instructionSpec,
          makeProjection({
            salt: 8_000 + maxIndex * 100 + operandIndex * 10 + selected,
            ...roles,
            focusBattler: selected,
            hp: maxHp - 1,
            maxHp,
            battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(maxIndex + selected + 1) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
          }),
        );
      }
      if (maxHp < U16_MAX) {
        addCase(
          `hp_higher_${operandIndex}_m${maxHp}_b${selected}`,
          "source-u16-full-lower-higher-boundary-probes",
          instructionSpec,
          makeProjection({
            salt: 11_000 + maxIndex * 100 + operandIndex * 10 + selected,
            ...roles,
            focusBattler: selected,
            hp: maxHp + 1,
            maxHp,
            battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(maxIndex + selected + 2) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
          }),
        );
      }
    }
  }
}

// Every notable signed source prior damage is overwritten on both controls and
// both operand forms. The selected role rotates through all four battlers.
for (const [damageIndex, battleMoveDamage] of PRIOR_DAMAGE_EDGE_DOMAIN.entries()) {
  for (const [operandIndex, [instructionSpec, operand]] of [
    [RESTORE_SPEC, BS_ATTACKER],
    [SOFTBOILED_SPEC, BS_TARGET],
  ].entries()) {
    const selected = (damageIndex + operandIndex) & 3;
    const roles = operand === BS_ATTACKER
      ? Object.freeze({ attacker: selected, target: (selected + 2) & 3 })
      : Object.freeze({ attacker: (selected + 2) & 3, target: selected });
    for (const [state, hp] of [["advance", 50], ["failure", 100]]) {
      addCase(
        `prior_damage_${state}_${operandIndex}_i${damageIndex}`,
        "prior-signed-battle-move-damage-overwrite",
        instructionSpec,
        makeProjection({
          salt: 14_000 + damageIndex * 20 + operandIndex * 2 + (state === "failure" ? 1 : 0),
          ...roles,
          focusBattler: selected,
          hp,
          maxHp: 100,
          battleMoveDamage,
        }),
      );
    }
  }
}

// The direct handler validates expression one before it reads either role or
// touches label resolution. Each input deliberately leaves both relevant roles
// absent to make that ordering observable from canonical TypeScript.
for (const [index, operandExpressions] of [
  [FULL_HP_LABEL],
  [FULL_HP_LABEL, "BS_EFFECT_BATTLER"],
  [FULL_HP_LABEL, "BS_SCRIPTING"],
  [FULL_HP_LABEL, "NOT_A_BATTLER_SELECTOR"],
].entries()) {
  addCase(
    `unexpected_or_missing_operand_${index}`,
    "operand-expression-before-role-lookup",
    freezeInstructionSpec({ operandExpressions, operandWidths: operandExpressions.map((_unused, i) => (i === 0 ? 4 : 1)) }),
    makeProjection({
      salt: 17_000 + index,
      attacker: null,
      target: null,
      effectBattler: null,
      fainted: null,
      focusBattler: index & 3,
      hp: U16_MAX,
      maxHp: 0,
      battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[index],
    }),
  );
}

// Missing selected roles retain every combination of all other aliases. The
// focused source data rotates through all battlers, proving a role error wins
// before HP/maxHP reads, damage writes, and any full-HP label lookup.
for (const [index, aliases] of THREE_ALIAS_COMBINATIONS.entries()) {
  addCase(
    `missing_attacker_t${roleLabel(aliases.target)}_e${roleLabel(aliases.effectBattler)}_f${roleLabel(aliases.fainted)}`,
    "missing-attacker-before-state-and-label-reads",
    RESTORE_SPEC,
    makeProjection({
      salt: 18_000 + index,
      attacker: null,
      target: aliases.target,
      effectBattler: aliases.effectBattler,
      fainted: aliases.fainted,
      focusBattler: index & 3,
      hp: U16_MAX,
      maxHp: U16_MAX,
      battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[index % PRIOR_DAMAGE_EDGE_DOMAIN.length],
    }),
  );
  addCase(
    `missing_target_a${roleLabel(aliases.target)}_e${roleLabel(aliases.effectBattler)}_f${roleLabel(aliases.fainted)}`,
    "missing-target-before-state-and-label-reads",
    SOFTBOILED_SPEC,
    makeProjection({
      salt: 20_000 + index,
      attacker: aliases.target,
      target: null,
      effectBattler: aliases.effectBattler,
      fainted: aliases.fainted,
      focusBattler: index & 3,
      hp: U16_MAX,
      maxHp: U16_MAX,
      battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(index + 1) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
    }),
  );
}

// Full HP reaches the pointer lookup only after damage is computed. A known
// different label proves it resolves this instruction's expression, while an
// unknown label errors only on the full branch. The lower and corrupt-higher
// rows intentionally use that same unresolved pointer and must advance.
for (const [index, [instructionSpec, operand, selected]] of [
  [RESTORE_SPEC, BS_ATTACKER, 0],
  [SOFTBOILED_SPEC, BS_TARGET, 1],
].entries()) {
  const roles = operand === BS_ATTACKER
    ? Object.freeze({ attacker: selected, target: (selected + 1) & 3 })
    : Object.freeze({ attacker: (selected + 1) & 3, target: selected });
  for (const expression of [RESTORE_LABEL, SOFTBOILED_LABEL]) {
    addCase(
      `late_known_own_pointer_${index}_${expression === RESTORE_LABEL ? "restore" : "softboiled"}`,
      "full-hp-resolves-own-failure-expression-late",
      freezeInstructionSpec({
        programCounter: instructionSpec.programCounter,
        operandExpressions: [expression, operand],
      }),
      makeProjection({
        salt: 22_000 + index,
        ...roles,
        focusBattler: selected,
        hp: 100,
        maxHp: 100,
        battleMoveDamage: I32_MIN,
      }),
    );
  }
  const unresolved = freezeInstructionSpec({
    programCounter: instructionSpec.programCounter,
    operandExpressions: ["BattleScript_RustTryhealUnresolved", operand],
  });
  addCase(
    `late_unresolved_full_${index}`,
    "full-hp-resolves-own-failure-expression-late",
    unresolved,
    makeProjection({
      salt: 23_000 + index,
      ...roles,
      focusBattler: selected,
      hp: 100,
      maxHp: 100,
      battleMoveDamage: I32_MAX,
    }),
  );
  addCase(
    `late_unresolved_lower_${index}`,
    "nonfull-skips-failure-label-resolution",
    unresolved,
    makeProjection({
      salt: 24_000 + index,
      ...roles,
      focusBattler: selected,
      hp: 99,
      maxHp: 100,
      battleMoveDamage: I32_MIN,
    }),
  );
  addCase(
    `late_unresolved_higher_${index}`,
    "nonfull-skips-failure-label-resolution",
    unresolved,
    makeProjection({
      salt: 25_000 + index,
      ...roles,
      focusBattler: selected,
      hp: 101,
      maxHp: 100,
      battleMoveDamage: I32_MAX,
    }),
  );
}

// Missing roles still precede unresolved failure pointers, and repeated
// applications preserve the completed state for both advance and fail-jump.
for (const [index, [instructionSpec, operand, selected]] of [
  [RESTORE_SPEC, BS_ATTACKER, 2],
  [SOFTBOILED_SPEC, BS_TARGET, 3],
].entries()) {
  const unresolved = freezeInstructionSpec({
    programCounter: instructionSpec.programCounter,
    operandExpressions: ["BattleScript_RustTryhealUnresolved", operand],
  });
  const missingRoles = operand === BS_ATTACKER
    ? Object.freeze({ attacker: null, target: selected })
    : Object.freeze({ attacker: selected, target: null });
  addCase(
    `missing_role_precedes_unresolved_${index}`,
    "missing-role-before-unresolved-label",
    unresolved,
    makeProjection({
      salt: 26_000 + index,
      ...missingRoles,
      focusBattler: selected,
      hp: 100,
      maxHp: 100,
      battleMoveDamage: I32_MIN,
    }),
  );
  const validRoles = operand === BS_ATTACKER
    ? Object.freeze({ attacker: selected, target: (selected + 1) & 3 })
    : Object.freeze({ attacker: (selected + 1) & 3, target: selected });
  addCase(
    `repeat_advance_${index}`,
    "repeated-advance-is-idempotent",
    instructionSpec,
    makeProjection({
      salt: 27_000 + index,
      ...validRoles,
      focusBattler: selected,
      hp: 1,
      maxHp: 3,
      battleMoveDamage: I32_MIN,
    }),
    2,
  );
  addCase(
    `repeat_failure_${index}`,
    "repeated-failure-is-idempotent",
    instructionSpec,
    makeProjection({
      salt: 28_000 + index,
      ...validRoles,
      focusBattler: selected,
      hp: 3,
      maxHp: 3,
      battleMoveDamage: I32_MAX,
    }),
    2,
  );
}

// Execute the canonical TypeScript handler at full, lower (when representable)
// and corrupt-higher (when representable) HP for every source u16 maxHP.
// Equal consecutive rows are losslessly normalized into intervals; Rust tests
// re-expand every source maxHP and every applicable branch boundary.
function proofTransition(hp, maxHp) {
  const projection = makeProjection({
    salt: 30_000,
    attacker: 0,
    target: 1,
    effectBattler: 2,
    fainted: 3,
    focusBattler: 0,
    hp,
    maxHp,
    battleMoveDamage: I32_MIN,
  });
  const outcome = sourceOutcome(projection, RESTORE_SPEC, 1);
  assert(outcome.error === null, `full-u16 proof unexpectedly errored for hp=${hp} maxHp=${maxHp}: ${outcome.error}`);
  assert(outcome.expected !== null, "full-u16 proof omitted expected state");
  assert(outcome.controls.length === 1, "full-u16 proof omitted control");
  return Object.freeze({
    control: outcome.controls[0],
    battleMoveDamage: outcome.expected.battleMoveDamage,
    target: outcome.expected.target,
  });
}

const rawHalfProofs = [];
for (let maxHp = 0; maxHp <= U16_MAX; maxHp += 1) {
  const full = proofTransition(maxHp, maxHp);
  assert(full.control === "fail-jump", `maxHp ${maxHp}: equal HP must jump`);
  assert(full.target === 0, `maxHp ${maxHp}: Restore HP must rebind target to attacker`);
  const lower = maxHp === 0 ? null : proofTransition(maxHp - 1, maxHp);
  const higher = maxHp === U16_MAX ? null : proofTransition(maxHp + 1, maxHp);
  if (lower !== null) assert(lower.control === "advance", `maxHp ${maxHp}: lower HP must advance`);
  if (higher !== null) assert(higher.control === "advance", `maxHp ${maxHp}: corrupt-higher HP must advance`);
  const expectedDamage = -Math.max(1, Math.floor(maxHp / 2));
  assert(full.battleMoveDamage === expectedDamage, `maxHp ${maxHp}: full damage drifted`);
  if (lower !== null) assert(lower.battleMoveDamage === expectedDamage, `maxHp ${maxHp}: lower damage drifted`);
  if (higher !== null) assert(higher.battleMoveDamage === expectedDamage, `maxHp ${maxHp}: higher damage drifted`);
  rawHalfProofs.push(Object.freeze({
    maxHp,
    battleMoveDamage: full.battleMoveDamage,
    hasLower: lower !== null,
    hasHigher: higher !== null,
  }));
}
assert(rawHalfProofs.length === U16_MAX + 1, "full-u16 proof domain drifted");
const rawHalfProofText = JSON.stringify(rawHalfProofs);
const rawHalfProofSha256 = crypto.createHash("sha256").update(rawHalfProofText).digest("hex");
const halfProofIntervals = [];
for (const proof of rawHalfProofs) {
  const previous = halfProofIntervals.at(-1);
  if (previous
    && previous.maxHpEnd + 1 === proof.maxHp
    && previous.battleMoveDamage === proof.battleMoveDamage
    && previous.hasLower === proof.hasLower
    && previous.hasHigher === proof.hasHigher) {
    previous.maxHpEnd = proof.maxHp;
  } else {
    halfProofIntervals.push({
      maxHpStart: proof.maxHp,
      maxHpEnd: proof.maxHp,
      battleMoveDamage: proof.battleMoveDamage,
      hasLower: proof.hasLower,
      hasHigher: proof.hasHigher,
    });
  }
}
assert(halfProofIntervals[0]?.maxHpStart === 0, "half proof must start at zero");
assert(halfProofIntervals.at(-1)?.maxHpEnd === U16_MAX, "half proof must end at u16 max");
for (const [index, proof] of halfProofIntervals.entries()) {
  assert(proof.maxHpStart <= proof.maxHpEnd, `half interval ${index} is empty`);
  if (index > 0) assert(halfProofIntervals[index - 1].maxHpEnd + 1 === proof.maxHpStart, `half interval ${index} has a gap`);
}

function registrationOutcome(specs) {
  const registrationProgram = Object.freeze({
    ...program,
    instructions: Object.freeze(specs.map(sourceInstructionFromSpec)),
  });
  try {
    const registered = opcodeModule.createBattleScriptTryhealhalfhealthOpcodeHandlers(registrationProgram);
    const bindings = Object.keys(registered).map(Number).sort((left, right) => left - right);
    assert(bindings.length === 1, "successful first-match registration must have one map key");
    assert(typeof registered[bindings[0]] === "function", "registered map value must be a handler");
    return Object.freeze({ bindings: Object.freeze(bindings), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ bindings: Object.freeze([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid registration label ${label}`);
  assert(!registrationCases.some((value) => value.label === label), `duplicate registration label ${label}`);
  const instructions = Object.freeze(specs.map((spec) => freezeInstructionSpec(spec)));
  const outcome = registrationOutcome(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions,
    expectedBindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

addRegistrationCase("canonical_first_restore", [RESTORE_SPEC, SOFTBOILED_SPEC]);
addRegistrationCase("missing_opcode_name", [freezeInstructionSpec({ opcodeName: "B_SCR_OP_NOP", opcodeId: 0, dispatcher: "Cmd_nop", operandWidths: [] , operandExpressions: [] })]);
addRegistrationCase(
  "first_match_wins_over_later_canonical_shape",
  [
    freezeInstructionSpec({ opcodeId: 0, dispatcher: "Cmd_not_checked", operandWidths: [7, 6, 5], operandExpressions: ["X", "Y", "Z"] }),
    SOFTBOILED_SPEC,
  ],
);
addRegistrationCase(
  "id_dispatcher_and_operand_shape_are_not_predicates",
  [freezeInstructionSpec({ opcodeId: U8_MAX, dispatcher: "anything", operandWidths: [], operandExpressions: [] })],
);
addRegistrationCase(
  "unrelated_malformed_instructions_are_invisible",
  [
    freezeInstructionSpec({ opcodeName: "B_SCR_OP_NOP", opcodeId: 0, dispatcher: "x", operandWidths: [0], operandExpressions: ["ignored"] }),
    SOFTBOILED_SPEC,
    freezeInstructionSpec({ opcodeName: "B_SCR_OP_NOP", opcodeId: U8_MAX, dispatcher: "y", operandWidths: [255, 254], operandExpressions: ["ignored", "ignored"] }),
  ],
);
assert(registrationCases.length === 5, "registration case count drifted");

function canonicalShape(instruction) {
  const entry = programModule.resolveBattleScriptLabel(program, instruction.source.label);
  const failure = instruction.operands[0];
  const battler = instruction.operands[1];
  const failureTarget = programModule.resolveBattleScriptLabel(program, failure.expression);
  assert(entry && failureTarget, "canonical shape labels must resolve");
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    entryLabel: instruction.source.label,
    entryProgramCounter: entry.programCounter,
    instructionProgramCounter: instruction.programCounter,
    statementLine: instruction.source.statementLine,
    invocationMnemonic: instruction.source.invocationMnemonic,
    invocationMacroLine: instruction.source.invocationMacroLine,
    sourceMacro: instruction.source.sourceMacro,
    sourceMacroLine: instruction.source.sourceMacroLine,
    failureExpression: failure.expression,
    failureWidthBytes: failure.widthBytes,
    failureMacroLine: failure.sourceMacroLine,
    battlerExpression: battler.expression,
    battlerWidthBytes: battler.widthBytes,
    battlerMacroLine: battler.sourceMacroLine,
    encodedWidthBytes: 1 + failure.widthBytes + battler.widthBytes,
    failureTargetProgramCounter: failureTarget.programCounter,
  });
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

function registrationBranch(value) {
  if (value.expectedError === null) return "registered";
  if (value.expectedError === "committed Battle Script program does not emit B_SCR_OP_TRYHEALHALFHEALTH") return "missing-opcode-name";
  throw new Error(`unexpected registration error ${value.expectedError}`);
}

assert(cases.length > 1_700 && cases.length < 2_500, `case corpus must remain bounded, got ${cases.length}`);
assert(halfProofIntervals.length > 30_000 && halfProofIntervals.length < 40_000, `normalized half proof interval count drifted to ${halfProofIntervals.length}`);
const canonicalShapes = Object.freeze([canonicalShape(restoreInstruction), canonicalShape(softboiledInstruction)]);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-selector-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["restore-selector-alias-cross-product", BATTLER_DOMAIN.length * THREE_ALIAS_COMBINATIONS.length],
  ["softboiled-selector-alias-cross-product", BATTLER_DOMAIN.length * THREE_ALIAS_COMBINATIONS.length],
  ["source-u16-max-hp-values", U16_MAX + 1],
  ["full-u16-handler-applications", rawHalfProofs.length * 3 - 2],
  ["half-normalized-contiguous-intervals", halfProofIntervals.length],
  ["prior-battle-move-damage-i32-values", 4_294_967_296],
  ["canonical-concrete-call-sites", canonicalShapes.length],
  ["registration-cases", registrationCases.length],
]);
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, registrationBranch);
const corpus = Object.freeze({
  canonicalShapes,
  maxHpEdgeDomain: MAX_HP_EDGE_DOMAIN,
  priorDamageEdgeDomain: PRIOR_DAMAGE_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  rawHalfProofSha256,
  rawHalfProofBytes: Buffer.byteLength(rawHalfProofText),
  halfProofIntervals,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return `0x${value.toString(16).padStart(2, "0")}`;
}

function rustU16(value) {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

function rustU32(value) {
  return `0x${value.toString(16).padStart(8, "0")}`;
}

function rustI32(value) {
  if (value === I32_MIN) return "i32::MIN";
  if (value === I32_MAX) return "i32::MAX";
  return String(value);
}

function rustBattler(value) {
  return `BattleScriptTryhealhalfhealthBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustBattlerState(value) {
  return "BattleScriptTryhealhalfhealthVectorBattlerState {"
    + ` side: ${rustU8(value.side)}, ability: ${rustU8(value.ability)}, hp: ${rustU16(value.hp)}, max_hp: ${rustU16(value.maxHp)},`
    + ` moves: [${value.moves.map(rustU16).join(", ")}], pp: [${value.pp.map(rustU8).join(", ")}],`
    + ` status1: ${rustU32(value.status1)}, status2: ${rustU32(value.status2)}, status3: ${rustU32(value.status3)},`
    + ` substitute_hp: ${rustU16(value.substituteHp)}, rollout_timer: ${rustU8(value.rolloutTimer)}, fury_cutter_counter: ${rustU8(value.furyCutterCounter)},`
    + ` truant_counter: ${rustU8(value.truantCounter)}, recharge_timer: ${rustU8(value.rechargeTimer)}, flinch_immobility: ${rustU8(value.flinchImmobility)},`
    + ` disabled_move: ${rustU16(value.disabledMove)}, used_disabled_move: ${rustU8(value.usedDisabledMove)}, taunt_timer: ${rustU8(value.tauntTimer)},`
    + ` used_taunted_move: ${rustU8(value.usedTauntedMove)}, used_imprisoned_move: ${rustU8(value.usedImprisonedMove)}, item: ${rustU16(value.item)},`
    + ` stat_stages: [${value.statStages.map(rustU8).join(", ")}], party_index: ${rustU8(value.partyIndex)}, speed: ${rustU16(value.speed)} }`;
}

function rustSiblings(value) {
  return "BattleScriptTryhealhalfhealthVectorSiblings {"
    + ` scripting_battler: ${rustBattler(value.scriptingBattler)}, battler_with_ability: ${rustBattler(value.battlerWithAbility)},`
    + ` atk_canceler_tracker: ${rustU8(value.atkCancelerTracker)}, battle_outcome: ${rustU8(value.battleOutcome)}, current_move: ${rustU16(value.currentMove)},`
    + ` current_move_effect: ${rustU8(value.currentMoveEffect)}, current_move_position: ${rustU8(value.currentMovePosition)}, move_result_flags: ${rustU32(value.moveResultFlags)},`
    + ` dmg_multiplier: ${rustU8(value.dmgMultiplier)}, crit_multiplier: ${rustU8(value.critMultiplier)}, move_effect_byte: ${rustU8(value.moveEffectByte)}, miss_type: ${rustU8(value.missType)},`
    + ` hit_marker: ${rustU32(value.hitMarker)}, multi_hit_counter: ${rustU8(value.multiHitCounter)}, multi_hit_string_counter: ${rustU8(value.multiHitStringCounter)}, multistring_chooser: ${rustU8(value.multistringChooser)},`
    + ` pain_split_hp: ${rustI32(value.painSplitHp)}, dynamic_base_power: ${rustU16(value.dynamicBasePower)}, hp_dealt: ${rustI32(value.hpDealt)},`
    + ` bide_dmg: [${value.bideDmg.map(rustI32).join(", ")}], locked_moves: [${value.lockedMoves.map(rustU16).join(", ")}],`
    + ` side_statuses: [${value.sideStatuses.map(rustU32).join(", ")}], weather: ${rustU32(value.weather)}, weather_timer: ${rustU8(value.weatherTimer)} }`;
}

function rustState(value) {
  return "BattleScriptTryhealhalfhealthVectorState {"
    + ` battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`
    + ` attacker: ${rustOptionalBattler(value.attacker)}, target: ${rustOptionalBattler(value.target)}, effect_battler: ${rustOptionalBattler(value.effectBattler)}, fainted: ${rustOptionalBattler(value.fainted)},`
    + ` battle_move_damage: ${rustI32(value.battleMoveDamage)}, siblings: ${rustSiblings(value.siblings)} }`;
}

function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}

function rustControls(values) {
  return `&[${values.map((value) => value === "advance"
    ? "BattleScriptTryhealhalfhealthControl::Advance"
    : "BattleScriptTryhealhalfhealthControl::FailJump").join(", ")}]`;
}

function rustInstruction(value) {
  return "BattleScriptTryhealhalfhealthVectorInstruction {"
    + ` opcode_name: ${rustString(value.opcodeName)}, program_counter: ${rustU32(value.programCounter)}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)},`
    + ` operand_widths: &[${value.operandWidths.map(rustU8).join(", ")}], operand_expressions: &[${value.operandExpressions.map(rustString).join(", ")}],`
    + ` resolved_failure_target: ${value.resolvedFailureTarget === null ? "None" : `Some(${rustString(value.resolvedFailureTarget)})`} }`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-tryhealhalfhealth-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTryhealhalfhealthOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_tryhealhalfhealth::{");
lines.push("    BattleScriptTryhealhalfhealthBattler, BattleScriptTryhealhalfhealthControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_RAW_SHA256: &str = ${rustString(rawHalfProofSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_RAW_BYTES: usize = ${Buffer.byteLength(rawHalfProofText)};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthVectorBattlerState {");
for (const field of [
  "side: u8", "ability: u8", "hp: u16", "max_hp: u16", "moves: [u16; 4]", "pp: [u8; 4]",
  "status1: u32", "status2: u32", "status3: u32", "substitute_hp: u16", "rollout_timer: u8",
  "fury_cutter_counter: u8", "truant_counter: u8", "recharge_timer: u8", "flinch_immobility: u8",
  "disabled_move: u16", "used_disabled_move: u8", "taunt_timer: u8", "used_taunted_move: u8",
  "used_imprisoned_move: u8", "item: u16", "stat_stages: [u8; 8]", "party_index: u8", "speed: u16",
]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthVectorSiblings {");
for (const field of [
  "scripting_battler: BattleScriptTryhealhalfhealthBattler", "battler_with_ability: BattleScriptTryhealhalfhealthBattler",
  "atk_canceler_tracker: u8", "battle_outcome: u8", "current_move: u16", "current_move_effect: u8",
  "current_move_position: u8", "move_result_flags: u32", "dmg_multiplier: u8", "crit_multiplier: u8",
  "move_effect_byte: u8", "miss_type: u8", "hit_marker: u32", "multi_hit_counter: u8",
  "multi_hit_string_counter: u8", "multistring_chooser: u8", "pain_split_hp: i32", "dynamic_base_power: u16",
  "hp_dealt: i32", "bide_dmg: [i32; 4]", "locked_moves: [u16; 4]", "side_statuses: [u32; 2]",
  "weather: u32", "weather_timer: u8",
]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthVectorState {");
lines.push("    pub battlers: [BattleScriptTryhealhalfhealthVectorBattlerState; 4],");
lines.push("    pub attacker: Option<BattleScriptTryhealhalfhealthBattler>,");
lines.push("    pub target: Option<BattleScriptTryhealhalfhealthBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptTryhealhalfhealthBattler>,");
lines.push("    pub fainted: Option<BattleScriptTryhealhalfhealthBattler>,");
lines.push("    pub battle_move_damage: i32,");
lines.push("    pub siblings: BattleScriptTryhealhalfhealthVectorSiblings,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthVectorInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_widths: &'static [u8],");
lines.push("    pub operand_expressions: &'static [&'static str],");
lines.push("    pub resolved_failure_target: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub instruction: BattleScriptTryhealhalfhealthVectorInstruction,");
lines.push("    pub initial: BattleScriptTryhealhalfhealthVectorState,");
lines.push("    pub expected: Option<BattleScriptTryhealhalfhealthVectorState>,");
lines.push("    pub controls: &'static [BattleScriptTryhealhalfhealthControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthCanonicalShape {");
for (const field of [
  "opcode_name: &'static str", "opcode_id: u8", "dispatcher: &'static str", "entry_label: &'static str",
  "entry_program_counter: u32", "instruction_program_counter: u32", "statement_line: u32",
  "invocation_mnemonic: &'static str", "invocation_macro_line: u32", "source_macro: &'static str",
  "source_macro_line: u32", "failure_expression: &'static str", "failure_width_bytes: u8",
  "failure_macro_line: u32", "battler_expression: &'static str", "battler_width_bytes: u8",
  "battler_macro_line: u32", "encoded_width_bytes: u8", "failure_target_program_counter: u32",
]) lines.push(`    pub ${field},`);
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryhealhalfhealthRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptTryhealhalfhealthVectorInstruction],");
lines.push("    pub expected_bindings: &'static [u8],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [`);
for (const [name, count] of registrationBranchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_MAX_HP_EDGE_DOMAIN: [u16; ${MAX_HP_EDGE_DOMAIN.length}] = [${MAX_HP_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_TRYHEALHALFHEALTH_PRIOR_DAMAGE_EDGE_DOMAIN: [i32; ${PRIOR_DAMAGE_EDGE_DOMAIN.length}] = [${PRIOR_DAMAGE_EDGE_DOMAIN.map(rustI32).join(", ")}];`);
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYHEALHALFHEALTH_CANONICAL_SHAPES: [BattleScriptTryhealhalfhealthCanonicalShape; ${canonicalShapes.length}] = [`);
for (const value of canonicalShapes) {
  lines.push("    BattleScriptTryhealhalfhealthCanonicalShape {");
  lines.push(`        opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)},`);
  lines.push(`        entry_label: ${rustString(value.entryLabel)}, entry_program_counter: ${rustU32(value.entryProgramCounter)}, instruction_program_counter: ${rustU32(value.instructionProgramCounter)}, statement_line: ${value.statementLine},`);
  lines.push(`        invocation_mnemonic: ${rustString(value.invocationMnemonic)}, invocation_macro_line: ${value.invocationMacroLine}, source_macro: ${rustString(value.sourceMacro)}, source_macro_line: ${value.sourceMacroLine},`);
  lines.push(`        failure_expression: ${rustString(value.failureExpression)}, failure_width_bytes: ${rustU8(value.failureWidthBytes)}, failure_macro_line: ${value.failureMacroLine},`);
  lines.push(`        battler_expression: ${rustString(value.battlerExpression)}, battler_width_bytes: ${rustU8(value.battlerWidthBytes)}, battler_macro_line: ${value.battlerMacroLine},`);
  lines.push(`        encoded_width_bytes: ${rustU8(value.encodedWidthBytes)}, failure_target_program_counter: ${rustU32(value.failureTargetProgramCounter)},`);
  lines.push("    },");
}
lines.push("];" );
lines.push("");
lines.push("// (start, end, expected negative damage, flags: bit0 lower, bit1 higher)");
lines.push(`pub static BATTLE_SCRIPT_TRYHEALHALFHEALTH_HALF_PROOFS: [(u16, u16, i32, u8); ${halfProofIntervals.length}] = [`);
for (const proof of halfProofIntervals) {
  const flags = (proof.hasLower ? 1 : 0) | (proof.hasHigher ? 2 : 0);
  lines.push(`    (${rustU16(proof.maxHpStart)}, ${rustU16(proof.maxHpEnd)}, ${rustI32(proof.battleMoveDamage)}, ${rustU8(flags)}),`);
}
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYHEALHALFHEALTH_CASES: [BattleScriptTryhealhalfhealthVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryhealhalfhealthVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)}, applications: ${value.applications},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        expected_error: ${value.expectedError === null ? "None" : `Some(${rustString(value.expectedError)})`},`);
  lines.push("    },");
}
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYHEALHALFHEALTH_REGISTRATION_CASES: [BattleScriptTryhealhalfhealthRegistrationCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryhealhalfhealthRegistrationCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map((spec) => rustInstruction(vectorInstruction(sourceInstructionFromSpec(spec)))).join(", ")}],`);
  lines.push(`        expected_bindings: &[${value.expectedBindings.map(rustU8).join(", ")}],`);
  lines.push(`        expected_error: ${value.expectedError === null ? "None" : `Some(${rustString(value.expectedError)})`},`);
  lines.push("    },");
}
lines.push("];" );

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
const rustupBin = "/Users/kyle/.rustup/toolchains/stable-aarch64-apple-darwin/bin";
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
if (!formatted) throw new Error("gen-battle-script-tryhealhalfhealth-vectors: could not find rustfmt");

const generatedBytes = fs.readFileSync(outPath);
const generatedSha256 = crypto.createHash("sha256").update(generatedBytes).digest("hex");
assert(generatedBytes.length <= GENERATED_FILE_MAX_BYTES, `generated file is too large: ${generatedBytes.length} bytes`);
const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha256 = crypto.createHash("sha256").update(generatorBytes).digest("hex");
console.log(`gen-battle-script-tryhealhalfhealth-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: ${cases.length} complete cases`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: ${rawHalfProofs.length} source-u16 rows x full/lower/higher -> ${halfProofIntervals.length} intervals`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: canonical shapes ${JSON.stringify(canonicalShapes)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: registration branch census ${JSON.stringify(registrationBranchCensus)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: half raw sha256 ${rawHalfProofSha256} bytes ${Buffer.byteLength(rawHalfProofText)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: generated sha256 ${generatedSha256} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-tryhealhalfhealth-vectors: generator sha256 ${generatorSha256} bytes ${generatorBytes.length}`);
