#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSetsubstituteOpcode.ts.
// Expected complete narrow projections and registration outcomes are made
// only by executing the canonical TypeScript handler. This script owns bounded
// input construction plus Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-setsubstitute-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_setsubstitute_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSetsubstituteOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSourceConstants.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETSUBSTITUTE";
const OPCODE_ID = 0x9c;
const DISPATCHER = "Cmd_setsubstitute";
const ENTRY_LABEL = "BattleScript_EffectSubstitute";
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const I32_MIN = -0x8000_0000;
const I32_MAX = 0x7fff_ffff;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...BATTLER_DOMAIN]);
const STATUS2_SUBSTITUTE = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_SUBSTITUTE;
const STATUS2_WRAPPED_MASK = sourceConstants.BATTLE_SCRIPT_STATUS2_WRAPPED_MASK;
const HITMARKER_IGNORE_SUBSTITUTE = sourceConstants.BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE;
const SET_CHOOSER = opcodeModule.BATTLE_SCRIPT_B_MSG_SET_SUBSTITUTE;
const FAILURE_CHOOSER = opcodeModule.BATTLE_SCRIPT_B_MSG_SUBSTITUTE_FAILED;
const STATUS2_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  STATUS2_SUBSTITUTE,
  STATUS2_WRAPPED_MASK,
  (STATUS2_SUBSTITUTE | STATUS2_WRAPPED_MASK) >>> 0,
  0x40e0_0101,
  0x7fff_1fff,
]);
const HITMARKER_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  U32_MAX,
  0x8000_0000,
  HITMARKER_IGNORE_SUBSTITUTE,
  0x0000_0001,
  0x7fff_fe00,
  0x0100_0100,
  0x4000_0080,
]);
const MAX_HP_EDGE_DOMAIN = Object.freeze([
  0,
  1,
  3,
  4,
  7,
  8,
  9,
  255,
  256,
  1_020,
  1_021,
  U16_MAX,
]);
const PRIOR_DAMAGE_EDGE_DOMAIN = Object.freeze([I32_MIN, -1, 0, 1, I32_MAX]);
const U8_EDGE_DOMAIN = Object.freeze([0, 1, 0x7f, 0xfe, U8_MAX]);
const SUBSTITUTE_HP_EDGE_DOMAIN = Object.freeze([0, 1, U8_MAX, 0x100, 0x3fff, U16_MAX]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-setsubstitute-vectors: " + message);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U8_MAX, label + " must be a u8, got " + value);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX, label + " must be a u16, got " + value);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, label + " must be a u32, got " + value);
}

function assertI32(value, label) {
  assert(Number.isInteger(value) && value >= I32_MIN && value <= I32_MAX, label + " must be an i32, got " + value);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), label + " must be one of 0..3, got " + value);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function u8(salt) {
  return ((salt * 37) ^ (salt >>> 3) ^ 0xa5) & U8_MAX;
}

function u16(salt) {
  return ((salt * 1_009) ^ (salt * 13) ^ 0xa55a) & U16_MAX;
}

function u32(salt) {
  return (((salt * 0x1020_4081) ^ (salt << 17) ^ 0x8100_1001) >>> 0);
}

function i32(salt) {
  return ((u32(salt) | 0));
}

function freezeBattler(value, label) {
  assertU8(value.side, label + ".side");
  assertU8(value.ability, label + ".ability");
  assertU16(value.hp, label + ".hp");
  assertU16(value.maxHP, label + ".maxHP");
  assert(Array.isArray(value.moves) && value.moves.length === 4, label + ".moves must have four cells");
  value.moves.forEach((move, index) => assertU16(move, label + ".moves[" + index + "]"));
  assert(Array.isArray(value.pp) && value.pp.length === 4, label + ".pp must have four cells");
  value.pp.forEach((pp, index) => assertU8(pp, label + ".pp[" + index + "]"));
  assertU32(value.status1, label + ".status1");
  assertU32(value.status2, label + ".status2");
  assertU32(value.status3, label + ".status3");
  assertU16(value.substituteHP, label + ".substituteHP");
  for (const field of [
    "rolloutTimer",
    "furyCutterCounter",
    "truantCounter",
    "rechargeTimer",
    "flinchImmobility",
    "usedDisabledMove",
    "tauntTimer",
    "usedTauntedMove",
    "usedImprisonedMove",
    "partyIndex",
  ]) {
    assertU8(value[field], label + "." + field);
  }
  assertU16(value.disabledMove, label + ".disabledMove");
  assertU16(value.item, label + ".item");
  assert(Array.isArray(value.statStages) && value.statStages.length === 8, label + ".statStages must have eight cells");
  value.statStages.forEach((stage, index) => assertU8(stage, label + ".statStages[" + index + "]"));
  assertU16(value.speed, label + ".speed");
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHP: value.maxHP,
    moves: Object.freeze([...value.moves]),
    pp: Object.freeze([...value.pp]),
    status1: value.status1 >>> 0,
    status2: value.status2 >>> 0,
    status3: value.status3 >>> 0,
    substituteHP: value.substituteHP,
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

function makeBattler(salt, { hp, maxHP, status2, substituteHP }) {
  assertU16(hp, "battler hp");
  assertU16(maxHP, "battler maxHP");
  assertU32(status2, "battler status2");
  assertU16(substituteHP, "battler substituteHP");
  return freezeBattler({
    side: salt & 1,
    ability: u8(salt + 1),
    hp,
    maxHP,
    moves: [u16(salt + 2), u16(salt + 3), u16(salt + 4), u16(salt + 5)],
    pp: [u8(salt + 6), u8(salt + 7), u8(salt + 8), u8(salt + 9)],
    status1: u32(salt + 10),
    status2,
    status3: u32(salt + 11),
    substituteHP,
    rolloutTimer: u8(salt + 12),
    furyCutterCounter: u8(salt + 13),
    truantCounter: u8(salt + 14),
    rechargeTimer: u8(salt + 15),
    flinchImmobility: u8(salt + 16),
    disabledMove: u16(salt + 17),
    usedDisabledMove: u8(salt + 18),
    tauntTimer: u8(salt + 19),
    usedTauntedMove: u8(salt + 20),
    usedImprisonedMove: u8(salt + 21),
    item: u16(salt + 22),
    statStages: [u8(salt + 23), u8(salt + 24), u8(salt + 25), u8(salt + 26), u8(salt + 27), u8(salt + 28), u8(salt + 29), u8(salt + 30)],
    partyIndex: u8(salt + 31),
    speed: u16(salt + 32),
  }, "battler");
}

function makeRules({
  salt,
  attacker,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  focusBattler = attacker ?? 0,
  hp,
  maxHP,
  status2 = 0,
  substituteHP = 0,
  battleMoveDamage = -1,
  multistringChooser = 0x7f,
  hitMarker = 0,
}) {
  assertOptionalBattler(attacker, "attacker");
  assertOptionalBattler(target, "target");
  assertOptionalBattler(effectBattler, "effectBattler");
  assertOptionalBattler(fainted, "fainted");
  assertBattler(focusBattler, "focusBattler");
  assertU16(hp, "attacker hp");
  assertU16(maxHP, "attacker maxHP");
  assertU32(status2, "attacker status2");
  assertU16(substituteHP, "attacker substituteHP");
  assertI32(battleMoveDamage, "battleMoveDamage");
  assertU8(multistringChooser, "multistringChooser");
  assertU32(hitMarker, "hitMarker");
  const battlers = BATTLER_DOMAIN.map((battler) => makeBattler(salt + battler * 101, {
    hp: battler === focusBattler ? hp : u16(salt + battler * 7 + 200),
    maxHP: battler === focusBattler ? maxHP : u16(salt + battler * 11 + 300),
    status2: battler === focusBattler ? status2 : u32(salt + battler * 13 + 400),
    substituteHP: battler === focusBattler ? substituteHP : u16(salt + battler * 17 + 500),
  }));
  const frozenBattlers = Object.freeze(battlers);
  const roles = Object.freeze({ attacker, target, effectBattler, fainted });
  const lockedMoves = Object.freeze(BATTLER_DOMAIN.map((battler) => u16(salt + battler * 19 + 600)));
  const bideDmg = Object.freeze(BATTLER_DOMAIN.map((battler) => i32(salt + battler * 23 + 700)));
  return Object.freeze({
    battlers: frozenBattlers,
    selectorRoles: roles,
    battleMoveDamage,
    multistringChooser,
    hitMarker: hitMarker >>> 0,
    scriptingBattler: BATTLER_DOMAIN[(salt + 0) & 3],
    battlerWithAbility: BATTLER_DOMAIN[(salt + 1) & 3],
    atkCancelerTracker: u8(salt + 2),
    battleOutcome: u8(salt + 3),
    currentMove: u16(salt + 4),
    currentMoveEffect: u8(salt + 5),
    currentMovePower: u16(salt + 6),
    currentMovePosition: u8(salt + 7),
    moveResultFlags: u32(salt + 8),
    dmgMultiplier: u8(salt + 9),
    critMultiplier: u8(salt + 10),
    moveEffectByte: u8(salt + 11),
    missType: u8(salt + 12),
    multiHitCounter: u8(salt + 13),
    multiHitStringCounter: u8(salt + 14),
    dynamicBasePower: u16(salt + 15),
    hpDealt: i32(salt + 16),
    lockedMoves,
    bideDmg,
    sideStatuses: Object.freeze([u32(salt + 17), u32(salt + 18)]),
    weather: u32(salt + 19),
    weatherTimer: u8(salt + 20),
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

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattler)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    battleMoveDamage: rules.battleMoveDamage,
    multistringChooser: rules.multistringChooser,
    hitMarker: rules.hitMarker >>> 0,
    siblings: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      battlerWithAbility: rules.battlerWithAbility,
      atkCancelerTracker: rules.atkCancelerTracker,
      battleOutcome: rules.battleOutcome,
      currentMove: rules.currentMove,
      currentMoveEffect: rules.currentMoveEffect,
      currentMovePower: rules.currentMovePower,
      currentMovePosition: rules.currentMovePosition,
      moveResultFlags: rules.moveResultFlags >>> 0,
      dmgMultiplier: rules.dmgMultiplier,
      critMultiplier: rules.critMultiplier,
      moveEffectByte: rules.moveEffectByte,
      missType: rules.missType,
      multiHitCounter: rules.multiHitCounter,
      multiHitStringCounter: rules.multiHitStringCounter,
      dynamicBasePower: rules.dynamicBasePower,
      hpDealt: rules.hpDealt,
      lockedMoves: Object.freeze([...rules.lockedMoves]),
      bideDmg: Object.freeze([...rules.bideDmg]),
      sideStatuses: Object.freeze([...rules.sideStatuses]),
      weather: rules.weather >>> 0,
      weatherTimer: rules.weatherTimer,
    }),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((candidate) => candidate.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, "expected exactly one canonical " + OPCODE_NAME + ", got " + instructions.length);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, "canonical opcode id drifted to " + instruction.opcodeId);
assert(instruction.dispatcher === DISPATCHER, "canonical dispatcher drifted to " + instruction.dispatcher);
assert(instruction.operands.length === 0, "canonical opcode must remain operand-free");
assert(instruction.source.label === ENTRY_LABEL, "canonical entry label drifted to " + instruction.source.label);
assert(instruction.source.invocationMnemonic === "setsubstitute", "canonical invocation mnemonic drifted");
assert(instruction.source.sourceMacro === "setsubstitute", "canonical source macro drifted");
const nextInstruction = program.instructions.find((candidate) => candidate.programCounter > instruction.programCounter);
assert(nextInstruction !== undefined, "canonical instruction needs a following instruction");
assert(
  nextInstruction.programCounter - instruction.programCounter === 1,
  "canonical instruction must remain one byte in the compiled program",
);
const entry = program.labelEntries[ENTRY_LABEL];
assert(entry !== undefined, "missing canonical entry label");
const handlers = opcodeModule.createBattleScriptSetsubstituteOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETSUBSTITUTE handler was not registered");
assert(STATUS2_SUBSTITUTE === 0x0100_0000, "STATUS2_SUBSTITUTE drifted");
assert(STATUS2_WRAPPED_MASK === 0x0000_e000, "STATUS2_WRAPPED mask drifted");
assert(HITMARKER_IGNORE_SUBSTITUTE === 0x0000_0100, "HITMARKER_IGNORE_SUBSTITUTE drifted");
assert(SET_CHOOSER === 0 && FAILURE_CHOOSER === 1, "Substitute chooser table drifted");

function sourceOutcome(initialRules, applications) {
  assert(applications === 1 || applications === 2, "applications must be one or two");
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const schedulerUnchanged = [];
  const rngUnchanged = [];
  const eventCounts = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x7a2d_4f11 + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.control.kind === "advance", "canonical handler did not Advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated input state");
      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      if (currentRules.battlers[attacker].hp <= Math.max(1, Math.floor(currentRules.battlers[attacker].maxHP / 4))) {
        assert(transition.rulesContext.battlers === currentRules.battlers, "failure replaced battlers");
        assert(transition.rulesContext.hitMarker === currentRules.hitMarker, "failure changed hit marker");
      } else {
        for (const battler of BATTLER_DOMAIN) {
          if (battler !== attacker) {
            assert(
              transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
              "success replaced non-attacker battler " + battler,
            );
          }
        }
      }
      assert(
        transition.rulesContext.selectorRoles === currentRules.selectorRoles,
        "canonical handler replaced selector roles",
      );
      assert(transition.rulesContext.lockedMoves === currentRules.lockedMoves, "canonical handler replaced lockedMoves");
      assert(transition.rulesContext.bideDmg === currentRules.bideDmg, "canonical handler replaced bideDmg");
      assert(transition.rulesContext.sideStatuses === currentRules.sideStatuses, "canonical handler replaced sideStatuses");
      controls.push("advance");
      schedulerUnchanged.push(true);
      rngUnchanged.push(true);
      eventCounts.push(0);
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial state");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      schedulerUnchanged: Object.freeze(schedulerUnchanged),
      rngUnchanged: Object.freeze(rngUnchanged),
      eventCounts: Object.freeze(eventCounts),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated initial state");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      schedulerUnchanged: Object.freeze(schedulerUnchanged),
      rngUnchanged: Object.freeze(rngUnchanged),
      eventCounts: Object.freeze(eventCounts),
      error: error.message,
    });
  }
}

function quarterInput(maxHP) {
  return Math.max(1, Math.floor(maxHP / 4));
}

function branchFor(initial, outcome) {
  if (outcome.error !== null) {
    assert(outcome.error === "Cmd_setsubstitute requires an attacker role", "unexpected handler error " + outcome.error);
    return "missing-attacker-role";
  }
  const attacker = initial.selectorRoles.attacker;
  assert(attacker !== null, "successful outcome missing attacker");
  const battler = initial.battlers[attacker];
  const failed = battler.hp <= quarterInput(battler.maxHP);
  if (outcome.controls.length === 1) return failed ? "failure-advance" : "success-advance";
  assert(outcome.controls.length === 2, "unexpected successful application count");
  return failed ? "repeated-failure-advance" : "repeated-success-advance";
}

const cases = [];
function addCase(label, category, initial, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate label " + label);
  const outcome = sourceOutcome(initial, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(initial, outcome),
    applications,
    initial: vectorState(initial),
    expected: outcome.expected,
    controls: outcome.controls,
    schedulerUnchanged: outcome.schedulerUnchanged,
    rngUnchanged: outcome.rngUnchanged,
    eventCounts: outcome.eventCounts,
    expectedError: outcome.error,
  }));
}

const selectorAliases = [];
for (const target of OPTIONAL_BATTLER_DOMAIN) {
  for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
    for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
      selectorAliases.push(Object.freeze({ target, effectBattler, fainted }));
    }
  }
}
assert(selectorAliases.length === 125, "selector alias domain must have 125 cells");

// Every concrete attacker is crossed with every other selector-alias state.
// The outcome alternates failure/success, so both handler branches prove that
// untouched aliases survive independent of their values.
for (const attacker of BATTLER_DOMAIN) {
  for (const [aliasIndex, aliases] of selectorAliases.entries()) {
    const maxHP = 101 + ((attacker * 37 + aliasIndex * 19) % 1_000);
    const threshold = quarterInput(maxHP);
    const failure = ((attacker + aliasIndex) & 1) === 0;
    addCase(
      "aliases_a" + attacker + "_t" + (aliases.target ?? "n") + "_e" + (aliases.effectBattler ?? "n") + "_f" + (aliases.fainted ?? "n"),
      "all-attacker-and-selector-alias-combinations",
      makeRules({
        salt: 1_000 + attacker * 500 + aliasIndex,
        attacker,
        ...aliases,
        focusBattler: attacker,
        hp: failure ? threshold : threshold + 1,
        maxHP,
        status2: STATUS2_EDGE_DOMAIN[(attacker + aliasIndex) % STATUS2_EDGE_DOMAIN.length],
        substituteHP: SUBSTITUTE_HP_EDGE_DOMAIN[(attacker * 3 + aliasIndex) % SUBSTITUTE_HP_EDGE_DOMAIN.length],
        battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(attacker + aliasIndex) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
        multistringChooser: U8_EDGE_DOMAIN[(attacker * 2 + aliasIndex) % U8_EDGE_DOMAIN.length],
        hitMarker: HITMARKER_EDGE_DOMAIN[(attacker + aliasIndex) % HITMARKER_EDGE_DOMAIN.length],
      }),
    );
  }
}

// The missing-attacker error must happen before maxHP, HP, status, or any
// target/effect/fainted alias is observed. Keep all 125 alias combinations.
for (const [aliasIndex, aliases] of selectorAliases.entries()) {
  addCase(
    "missing_attacker_t" + (aliases.target ?? "n") + "_e" + (aliases.effectBattler ?? "n") + "_f" + (aliases.fainted ?? "n"),
    "missing-attacker-before-all-state-reads",
    makeRules({
      salt: 8_000 + aliasIndex,
      attacker: null,
      ...aliases,
      focusBattler: aliasIndex & 3,
      hp: U16_MAX,
      maxHP: 0,
      status2: U32_MAX,
      substituteHP: U16_MAX,
      battleMoveDamage: I32_MIN,
      multistringChooser: U8_MAX,
      hitMarker: U32_MAX,
    }),
  );
}

for (const attacker of BATTLER_DOMAIN) {
  for (const [edgeIndex, status2] of STATUS2_EDGE_DOMAIN.entries()) {
    addCase(
      "status2_a" + attacker + "_v" + status2.toString(16).padStart(8, "0"),
      "status2-full-u32-or-and-wrapped-clear",
      makeRules({
        salt: 12_000 + attacker * 100 + edgeIndex,
        attacker,
        focusBattler: attacker,
        hp: 257,
        maxHP: 1_020,
        status2,
        substituteHP: SUBSTITUTE_HP_EDGE_DOMAIN[edgeIndex % SUBSTITUTE_HP_EDGE_DOMAIN.length],
        battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[edgeIndex % PRIOR_DAMAGE_EDGE_DOMAIN.length],
        multistringChooser: U8_EDGE_DOMAIN[edgeIndex % U8_EDGE_DOMAIN.length],
        hitMarker: HITMARKER_EDGE_DOMAIN[edgeIndex % HITMARKER_EDGE_DOMAIN.length],
      }),
    );
  }
  for (const [edgeIndex, hitMarker] of HITMARKER_EDGE_DOMAIN.entries()) {
    addCase(
      "hitmarker_a" + attacker + "_v" + hitMarker.toString(16).padStart(8, "0"),
      "hit-marker-full-u32-or",
      makeRules({
        salt: 13_000 + attacker * 100 + edgeIndex,
        attacker,
        focusBattler: attacker,
        hp: 257,
        maxHP: 1_020,
        status2: STATUS2_EDGE_DOMAIN[edgeIndex % STATUS2_EDGE_DOMAIN.length],
        substituteHP: SUBSTITUTE_HP_EDGE_DOMAIN[(edgeIndex + 1) % SUBSTITUTE_HP_EDGE_DOMAIN.length],
        battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[(edgeIndex + 2) % PRIOR_DAMAGE_EDGE_DOMAIN.length],
        multistringChooser: U8_EDGE_DOMAIN[(edgeIndex + 3) % U8_EDGE_DOMAIN.length],
        hitMarker,
      }),
    );
  }
}

// Cross each independently overwritten prior value across every attacker;
// no accumulated damage, stale chooser, or stale substitute HP can leak.
for (const attacker of BATTLER_DOMAIN) {
  for (const [damageIndex, battleMoveDamage] of PRIOR_DAMAGE_EDGE_DOMAIN.entries()) {
    for (const [chooserIndex, multistringChooser] of U8_EDGE_DOMAIN.entries()) {
      for (const [substituteIndex, substituteHP] of SUBSTITUTE_HP_EDGE_DOMAIN.entries()) {
        addCase(
          "prior_a" + attacker + "_d" + damageIndex + "_c" + chooserIndex + "_s" + substituteIndex,
          "prior-damage-chooser-substitute-overwrite-edges",
          makeRules({
            salt: 20_000 + attacker * 1_000 + damageIndex * 100 + chooserIndex * 10 + substituteIndex,
            attacker,
            focusBattler: attacker,
            hp: 256,
            maxHP: 1_020,
            status2: STATUS2_EDGE_DOMAIN[(damageIndex + chooserIndex + substituteIndex) % STATUS2_EDGE_DOMAIN.length],
            substituteHP,
            battleMoveDamage,
            multistringChooser,
            hitMarker: HITMARKER_EDGE_DOMAIN[(damageIndex + chooserIndex + substituteIndex) % HITMARKER_EDGE_DOMAIN.length],
          }),
        );
      }
    }
  }
}

for (const attacker of BATTLER_DOMAIN) {
  for (const [maxHpIndex, maxHP] of MAX_HP_EDGE_DOMAIN.entries()) {
    const threshold = quarterInput(maxHP);
    for (const [boundary, hp] of [["at", threshold], ["above", threshold + 1]]) {
      addCase(
        "threshold_a" + attacker + "_m" + maxHP + "_" + boundary,
        "quarter-boundary-representative-u16-edges",
        makeRules({
          salt: 30_000 + attacker * 1_000 + maxHpIndex * 10 + (boundary === "at" ? 0 : 1),
          attacker,
          focusBattler: attacker,
          hp,
          maxHP,
          status2: STATUS2_EDGE_DOMAIN[maxHpIndex % STATUS2_EDGE_DOMAIN.length],
          substituteHP: SUBSTITUTE_HP_EDGE_DOMAIN[maxHpIndex % SUBSTITUTE_HP_EDGE_DOMAIN.length],
          battleMoveDamage: PRIOR_DAMAGE_EDGE_DOMAIN[maxHpIndex % PRIOR_DAMAGE_EDGE_DOMAIN.length],
          multistringChooser: U8_EDGE_DOMAIN[maxHpIndex % U8_EDGE_DOMAIN.length],
          hitMarker: HITMARKER_EDGE_DOMAIN[maxHpIndex % HITMARKER_EDGE_DOMAIN.length],
        }),
      );
    }
  }
}

for (const attacker of BATTLER_DOMAIN) {
  addCase(
    "failure_preserves_a" + attacker,
    "failure-preserves-battlers-hitmarker-and-siblings",
    makeRules({
      salt: 40_000 + attacker,
      attacker,
      focusBattler: attacker,
      hp: 255,
      maxHP: 1_020,
      status2: (STATUS2_SUBSTITUTE | STATUS2_WRAPPED_MASK | 0x8000_0001) >>> 0,
      substituteHP: U16_MAX,
      battleMoveDamage: I32_MIN,
      multistringChooser: U8_MAX,
      hitMarker: U32_MAX,
    }),
  );
  addCase(
    "repeated_success_a" + attacker,
    "repeated-success-is-idempotent-and-advances",
    makeRules({
      salt: 41_000 + attacker,
      attacker,
      focusBattler: attacker,
      hp: 2,
      maxHP: 3,
      status2: (STATUS2_WRAPPED_MASK | 0x8000_0001) >>> 0,
      substituteHP: U16_MAX,
      battleMoveDamage: I32_MIN,
      multistringChooser: U8_MAX,
      hitMarker: 0x8000_0001,
    }),
    2,
  );
  addCase(
    "repeated_failure_a" + attacker,
    "repeated-failure-is-idempotent-and-advances",
    makeRules({
      salt: 42_000 + attacker,
      attacker,
      focusBattler: attacker,
      hp: 1,
      maxHP: 3,
      status2: (STATUS2_SUBSTITUTE | STATUS2_WRAPPED_MASK | 0x4000_0001) >>> 0,
      substituteHP: U16_MAX,
      battleMoveDamage: I32_MAX,
      multistringChooser: 0,
      hitMarker: U32_MAX,
    }),
    2,
  );
}

function quarterProofFor(maxHP) {
  const threshold = quarterInput(maxHP);
  const failureInitial = makeRules({
    salt: 50_000,
    attacker: 0,
    focusBattler: 0,
    hp: threshold,
    maxHP,
    status2: (STATUS2_WRAPPED_MASK | 0x8000_0001) >>> 0,
    substituteHP: U16_MAX,
    battleMoveDamage: I32_MIN,
    multistringChooser: U8_MAX,
    hitMarker: U32_MAX,
  });
  const successInitial = makeRules({
    salt: 50_000,
    attacker: 0,
    focusBattler: 0,
    hp: threshold + 1,
    maxHP,
    status2: (STATUS2_WRAPPED_MASK | 0x8000_0001) >>> 0,
    substituteHP: U16_MAX,
    battleMoveDamage: I32_MIN,
    multistringChooser: U8_MAX,
    hitMarker: U32_MAX,
  });
  const failure = sourceOutcome(failureInitial, 1);
  const success = sourceOutcome(successInitial, 1);
  assert(failure.error === null && success.error === null, "quarter proof handler must not error");
  assert(failure.controls[0] === "advance" && success.controls[0] === "advance", "quarter proof must advance");
  assert(failure.expected.battleMoveDamage === 0, "quarter failure must clear move damage");
  assert(failure.expected.multistringChooser === FAILURE_CHOOSER, "quarter failure chooser drifted");
  assert(failure.expected.hitMarker === failureInitial.hitMarker, "quarter failure changed hit marker");
  assert(sameState(failure.expected.battlers, vectorState(failureInitial).battlers), "quarter failure changed battlers");
  assert(success.expected.battleMoveDamage === threshold, "quarter success damage drifted");
  assert(success.expected.multistringChooser === SET_CHOOSER, "quarter success chooser drifted");
  assert(success.expected.battlers[0].substituteHp === threshold, "quarter success substituteHP drifted");
  assert(
    success.expected.battlers[0].status2 === (((STATUS2_WRAPPED_MASK | 0x8000_0001 | STATUS2_SUBSTITUTE) & ~STATUS2_WRAPPED_MASK) >>> 0),
    "quarter success status2 drifted",
  );
  assert(
    success.expected.hitMarker === ((U32_MAX | HITMARKER_IGNORE_SUBSTITUTE) >>> 0),
    "quarter success hit marker drifted",
  );
  return Object.freeze({
    maxHp: maxHP,
    threshold,
    failureHp: threshold,
    successHp: threshold + 1,
    failureBattleMoveDamage: failure.expected.battleMoveDamage,
    failureChooser: failure.expected.multistringChooser,
    failureStatus2: failure.expected.battlers[0].status2,
    failureSubstituteHp: failure.expected.battlers[0].substituteHp,
    failureHitMarker: failure.expected.hitMarker,
    successBattleMoveDamage: success.expected.battleMoveDamage,
    successChooser: success.expected.multistringChooser,
    successStatus2: success.expected.battlers[0].status2,
    successSubstituteHp: success.expected.battlers[0].substituteHp,
    successHitMarker: success.expected.hitMarker,
  });
}

// Execute the canonical TypeScript handler at both branch boundaries for all
// 65,536 source-u16 maxHP values, then losslessly collapse equal neighboring
// result rows into intervals. The emitted intervals are re-expanded by Rust
// tests, so the compact artifact remains a complete domain proof.
const rawQuarterProofs = [];
for (let maxHP = 0; maxHP <= U16_MAX; maxHP += 1) rawQuarterProofs.push(quarterProofFor(maxHP));
assert(rawQuarterProofs.length === U16_MAX + 1, "full maxHP proof domain drifted");
const rawQuarterProofText = JSON.stringify(rawQuarterProofs);
const rawQuarterProofSha256 = crypto.createHash("sha256").update(rawQuarterProofText).digest("hex");
const quarterProofs = [];
for (const proof of rawQuarterProofs) {
  const previous = quarterProofs.at(-1);
  const comparable = previous && previous.threshold === proof.threshold
    && previous.failureBattleMoveDamage === proof.failureBattleMoveDamage
    && previous.failureChooser === proof.failureChooser
    && previous.failureStatus2 === proof.failureStatus2
    && previous.failureSubstituteHp === proof.failureSubstituteHp
    && previous.failureHitMarker === proof.failureHitMarker
    && previous.successBattleMoveDamage === proof.successBattleMoveDamage
    && previous.successChooser === proof.successChooser
    && previous.successStatus2 === proof.successStatus2
    && previous.successSubstituteHp === proof.successSubstituteHp
    && previous.successHitMarker === proof.successHitMarker;
  if (comparable && previous.maxHpEnd + 1 === proof.maxHp) {
    previous.maxHpEnd = proof.maxHp;
  } else {
    quarterProofs.push({ ...proof, maxHpStart: proof.maxHp, maxHpEnd: proof.maxHp });
  }
}
assert(quarterProofs[0].maxHpStart === 0, "quarter proof must start at zero");
assert(quarterProofs.at(-1).maxHpEnd === U16_MAX, "quarter proof must end at u16 max");
for (const [index, proof] of quarterProofs.entries()) {
  assert(proof.failureHp === proof.threshold, "interval " + index + " missing threshold failure hp");
  assert(proof.successHp === proof.threshold + 1, "interval " + index + " missing threshold success hp");
  if (index > 0) assert(quarterProofs[index - 1].maxHpEnd + 1 === proof.maxHpStart, "quarter intervals have a gap");
}

function instructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = instruction.programCounter,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandCount = 0,
} = {}) {
  assert(typeof opcodeName === "string", "instruction opcode name must be a string");
  assert(Number.isInteger(programCounter) && programCounter >= 0 && programCounter <= U32_MAX, "instruction program counter must be a u32");
  assertU8(opcodeId, "instruction opcode id");
  assert(typeof dispatcher === "string", "instruction dispatcher must be a string");
  assert(Number.isInteger(operandCount) && operandCount >= 0 && operandCount <= 8, "instruction operand count must be 0..8");
  return Object.freeze({ opcodeName, programCounter, opcodeId, dispatcher, operandCount });
}

function materializeInstruction(spec) {
  return Object.freeze({
    ...instruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(Array.from({ length: spec.operandCount }, (_, index) => Object.freeze({
      widthBytes: 4,
      expression: "IgnoredOperand" + index,
      sourceMacro: "ignored",
      sourceMacroLine: 0,
      wrapperPath: Object.freeze([]),
    }))),
  });
}

function registrationOutcome(specs) {
  const registrationProgram = Object.freeze({
    ...program,
    instructions: Object.freeze(specs.map(materializeInstruction)),
  });
  try {
    const registrationHandlers = opcodeModule.createBattleScriptSetsubstituteOpcodeHandlers(registrationProgram);
    const bindings = Object.keys(registrationHandlers).map(Number).sort((left, right) => left - right);
    assert(bindings.length === 1, "successful registration must have exactly one map key");
    assert(typeof registrationHandlers[bindings[0]] === "function", "registered map entry must be a function");
    return Object.freeze({ bindings: Object.freeze(bindings), error: null });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error " + String(error));
    return Object.freeze({ bindings: Object.freeze([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid registration label " + label);
  assert(!registrationCases.some((value) => value.label === label), "duplicate registration label " + label);
  const instructionsForCase = Object.freeze(specs.map((spec) => instructionSpec(spec)));
  const outcome = registrationOutcome(instructionsForCase);
  registrationCases.push(Object.freeze({
    label,
    instructions: instructionsForCase,
    expectedBindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

const CANONICAL_SPEC = instructionSpec();
addRegistrationCase("canonical", [CANONICAL_SPEC]);
addRegistrationCase("missing_matching_opcode_name", [instructionSpec({ opcodeName: "B_SCR_OP_NOP", operandCount: 7 })]);
addRegistrationCase("duplicate_matching_opcode_name", [CANONICAL_SPEC, instructionSpec({ programCounter: 0xfade, opcodeId: 0 })]);
addRegistrationCase(
  "id_dispatcher_and_operands_are_not_factory_predicates",
  [instructionSpec({ opcodeId: 0, dispatcher: "Cmd_not_checked", operandCount: 7 })],
);
addRegistrationCase(
  "unrelated_malformed_instruction_is_invisible",
  [
    instructionSpec({ opcodeName: "B_SCR_OP_NOP", opcodeId: 0x83, dispatcher: "Cmd_nop", operandCount: 8 }),
    CANONICAL_SPEC,
    instructionSpec({ opcodeName: "B_SCR_OP_NOP", opcodeId: 0x83, dispatcher: "Cmd_nop", operandCount: 1 }),
  ],
);
addRegistrationCase(
  "alternate_high_dynamic_opcode_key",
  [instructionSpec({ opcodeId: U8_MAX, dispatcher: "anything", operandCount: 3 })],
);
assert(registrationCases.length === 6, "registration case count drifted");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

function registrationBranch(value) {
  if (value.expectedError === null) return "registered";
  if (value.expectedError.startsWith("committed Battle Script program must emit one")) return "name-cardinality";
  throw new Error("unexpected registration error " + value.expectedError);
}

const identity = Object.freeze({
  opcodeName: instruction.opcodeName,
  opcodeId: instruction.opcodeId,
  dispatcher: instruction.dispatcher,
  operandCount: instruction.operands.length,
  entryLabel: instruction.source.label,
  entryProgramCounter: entry.programCounter,
  instructionProgramCounter: instruction.programCounter,
  statementLine: instruction.source.statementLine,
  invocationMnemonic: instruction.source.invocationMnemonic,
  macroLine: instruction.source.sourceMacroLine,
  sourceMacro: instruction.source.sourceMacro,
  encodedWidthBytes: nextInstruction.programCounter - instruction.programCounter,
});
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, registrationBranch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["optional-selector-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["attacker-selector-alias-cross-product", BATTLER_DOMAIN.length * selectorAliases.length],
  ["source-u16-max-hp-values", U16_MAX + 1],
  ["quarter-boundary-handler-applications", rawQuarterProofs.length * 2],
  ["quarter-normalized-contiguous-intervals", quarterProofs.length],
  ["status2-u32-values", U32_MAX + 1],
  ["hit-marker-u32-values", U32_MAX + 1],
  ["prior-battle-move-damage-i32-values", 4_294_967_296],
  ["prior-multistring-chooser-u8-values", U8_MAX + 1],
  ["prior-substitute-hp-u16-values", U16_MAX + 1],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  identity,
  status2EdgeDomain: STATUS2_EDGE_DOMAIN,
  hitMarkerEdgeDomain: HITMARKER_EDGE_DOMAIN,
  maxHpEdgeDomain: MAX_HP_EDGE_DOMAIN,
  priorDamageEdgeDomain: PRIOR_DAMAGE_EDGE_DOMAIN,
  u8EdgeDomain: U8_EDGE_DOMAIN,
  substituteHpEdgeDomain: SUBSTITUTE_HP_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  rawQuarterProofSha256,
  rawQuarterProofBytes: Buffer.byteLength(rawQuarterProofText),
  quarterProofs,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustU16(value) {
  return "0x" + value.toString(16).padStart(4, "0");
}

function rustU32(value) {
  return "0x" + value.toString(16).padStart(8, "0");
}

function rustI32(value) {
  return String(value);
}

function rustBattler(value) {
  return "BattleScriptSetsubstituteBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustBattlerState(value) {
  return "BattleScriptSetsubstituteVectorBattlerState {"
    + " side: " + rustU8(value.side) + ","
    + " ability: " + rustU8(value.ability) + ","
    + " hp: " + rustU16(value.hp) + ","
    + " max_hp: " + rustU16(value.maxHp) + ","
    + " moves: [" + value.moves.map(rustU16).join(", ") + "],"
    + " pp: [" + value.pp.map(rustU8).join(", ") + "],"
    + " status1: " + rustU32(value.status1) + ","
    + " status2: " + rustU32(value.status2) + ","
    + " status3: " + rustU32(value.status3) + ","
    + " substitute_hp: " + rustU16(value.substituteHp) + ","
    + " rollout_timer: " + rustU8(value.rolloutTimer) + ","
    + " fury_cutter_counter: " + rustU8(value.furyCutterCounter) + ","
    + " truant_counter: " + rustU8(value.truantCounter) + ","
    + " recharge_timer: " + rustU8(value.rechargeTimer) + ","
    + " flinch_immobility: " + rustU8(value.flinchImmobility) + ","
    + " disabled_move: " + rustU16(value.disabledMove) + ","
    + " used_disabled_move: " + rustU8(value.usedDisabledMove) + ","
    + " taunt_timer: " + rustU8(value.tauntTimer) + ","
    + " used_taunted_move: " + rustU8(value.usedTauntedMove) + ","
    + " used_imprisoned_move: " + rustU8(value.usedImprisonedMove) + ","
    + " item: " + rustU16(value.item) + ","
    + " stat_stages: [" + value.statStages.map(rustU8).join(", ") + "],"
    + " party_index: " + rustU8(value.partyIndex) + ","
    + " speed: " + rustU16(value.speed) + ","
    + " }";
}

function rustSiblings(value) {
  return "BattleScriptSetsubstituteVectorSiblings {"
    + " scripting_battler: " + rustBattler(value.scriptingBattler) + ","
    + " battler_with_ability: " + rustBattler(value.battlerWithAbility) + ","
    + " atk_canceler_tracker: " + rustU8(value.atkCancelerTracker) + ","
    + " battle_outcome: " + rustU8(value.battleOutcome) + ","
    + " current_move: " + rustU16(value.currentMove) + ","
    + " current_move_effect: " + rustU8(value.currentMoveEffect) + ","
    + " current_move_power: " + rustU16(value.currentMovePower) + ","
    + " current_move_position: " + rustU8(value.currentMovePosition) + ","
    + " move_result_flags: " + rustU32(value.moveResultFlags) + ","
    + " dmg_multiplier: " + rustU8(value.dmgMultiplier) + ","
    + " crit_multiplier: " + rustU8(value.critMultiplier) + ","
    + " move_effect_byte: " + rustU8(value.moveEffectByte) + ","
    + " miss_type: " + rustU8(value.missType) + ","
    + " multi_hit_counter: " + rustU8(value.multiHitCounter) + ","
    + " multi_hit_string_counter: " + rustU8(value.multiHitStringCounter) + ","
    + " dynamic_base_power: " + rustU16(value.dynamicBasePower) + ","
    + " hp_dealt: " + rustI32(value.hpDealt) + ","
    + " locked_moves: [" + value.lockedMoves.map(rustU16).join(", ") + "],"
    + " bide_dmg: [" + value.bideDmg.map(rustI32).join(", ") + "],"
    + " side_statuses: [" + value.sideStatuses.map(rustU32).join(", ") + "],"
    + " weather: " + rustU32(value.weather) + ","
    + " weather_timer: " + rustU8(value.weatherTimer) + ","
    + " }";
}

function rustState(value) {
  return "BattleScriptSetsubstituteVectorState {"
    + " battlers: [" + value.battlers.map(rustBattlerState).join(", ") + "],"
    + " attacker: " + rustOptionalBattler(value.attacker) + ","
    + " target: " + rustOptionalBattler(value.target) + ","
    + " effect_battler: " + rustOptionalBattler(value.effectBattler) + ","
    + " fainted: " + rustOptionalBattler(value.fainted) + ","
    + " battle_move_damage: " + rustI32(value.battleMoveDamage) + ","
    + " multistring_chooser: " + rustU8(value.multistringChooser) + ","
    + " hit_marker: " + rustU32(value.hitMarker) + ","
    + " siblings: " + rustSiblings(value.siblings) + ","
    + " }";
}

function rustOptionalState(value) {
  return value === null ? "None" : "Some(" + rustState(value) + ")";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptSetsubstituteControl::Advance").join(", ") + "]";
}

function rustBools(values) {
  return "&[" + values.map((value) => value ? "true" : "false").join(", ") + "]";
}

function rustU8Slice(values) {
  return "&[" + values.map(rustU8).join(", ") + "]";
}

function rustInstruction(value) {
  return "BattleScriptSetsubstituteVectorInstruction {"
    + " opcode_name: " + rustString(value.opcodeName) + ","
    + " program_counter: " + rustU32(value.programCounter) + ","
    + " opcode_id: " + rustU8(value.opcodeId) + ","
    + " dispatcher: " + rustString(value.dispatcher) + ","
    + " operand_count: " + value.operandCount + ","
    + " }";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-setsubstitute-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetsubstituteOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_setsubstitute::{");
lines.push("    BattleScriptSetsubstituteBattler, BattleScriptSetsubstituteControl,");
lines.push("};");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_VECTOR_CORPUS_SHA256: &str = " + rustString(corpusHash) + ";");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_VECTOR_CORPUS_BYTES: usize = " + Buffer.byteLength(corpusText) + ";");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_RAW_SHA256: &str = " + rustString(rawQuarterProofSha256) + ";");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_RAW_BYTES: usize = " + Buffer.byteLength(rawQuarterProofText) + ";");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_STATUS2_EDGE_DOMAIN: [u32; " + STATUS2_EDGE_DOMAIN.length + "] = [" + STATUS2_EDGE_DOMAIN.map(rustU32).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_HIT_MARKER_EDGE_DOMAIN: [u32; " + HITMARKER_EDGE_DOMAIN.length + "] = [" + HITMARKER_EDGE_DOMAIN.map(rustU32).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_MAX_HP_EDGE_DOMAIN: [u16; " + MAX_HP_EDGE_DOMAIN.length + "] = [" + MAX_HP_EDGE_DOMAIN.map(rustU16).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_PRIOR_DAMAGE_EDGE_DOMAIN: [i32; " + PRIOR_DAMAGE_EDGE_DOMAIN.length + "] = [" + PRIOR_DAMAGE_EDGE_DOMAIN.map(rustI32).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_U8_EDGE_DOMAIN: [u8; " + U8_EDGE_DOMAIN.length + "] = [" + U8_EDGE_DOMAIN.map(rustU8).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_SUBSTITUTE_HP_EDGE_DOMAIN: [u16; " + SUBSTITUTE_HP_EDGE_DOMAIN.length + "] = [" + SUBSTITUTE_HP_EDGE_DOMAIN.map(rustU16).join(", ") + "];");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteVectorBattlerState {");
lines.push("    pub side: u8,");
lines.push("    pub ability: u8,");
lines.push("    pub hp: u16,");
lines.push("    pub max_hp: u16,");
lines.push("    pub moves: [u16; 4],");
lines.push("    pub pp: [u8; 4],");
lines.push("    pub status1: u32,");
lines.push("    pub status2: u32,");
lines.push("    pub status3: u32,");
lines.push("    pub substitute_hp: u16,");
lines.push("    pub rollout_timer: u8,");
lines.push("    pub fury_cutter_counter: u8,");
lines.push("    pub truant_counter: u8,");
lines.push("    pub recharge_timer: u8,");
lines.push("    pub flinch_immobility: u8,");
lines.push("    pub disabled_move: u16,");
lines.push("    pub used_disabled_move: u8,");
lines.push("    pub taunt_timer: u8,");
lines.push("    pub used_taunted_move: u8,");
lines.push("    pub used_imprisoned_move: u8,");
lines.push("    pub item: u16,");
lines.push("    pub stat_stages: [u8; 8],");
lines.push("    pub party_index: u8,");
lines.push("    pub speed: u16,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteVectorSiblings {");
lines.push("    pub scripting_battler: BattleScriptSetsubstituteBattler,");
lines.push("    pub battler_with_ability: BattleScriptSetsubstituteBattler,");
lines.push("    pub atk_canceler_tracker: u8,");
lines.push("    pub battle_outcome: u8,");
lines.push("    pub current_move: u16,");
lines.push("    pub current_move_effect: u8,");
lines.push("    pub current_move_power: u16,");
lines.push("    pub current_move_position: u8,");
lines.push("    pub move_result_flags: u32,");
lines.push("    pub dmg_multiplier: u8,");
lines.push("    pub crit_multiplier: u8,");
lines.push("    pub move_effect_byte: u8,");
lines.push("    pub miss_type: u8,");
lines.push("    pub multi_hit_counter: u8,");
lines.push("    pub multi_hit_string_counter: u8,");
lines.push("    pub dynamic_base_power: u16,");
lines.push("    pub hp_dealt: i32,");
lines.push("    pub locked_moves: [u16; 4],");
lines.push("    pub bide_dmg: [i32; 4],");
lines.push("    pub side_statuses: [u32; 2],");
lines.push("    pub weather: u32,");
lines.push("    pub weather_timer: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteVectorState {");
lines.push("    pub battlers: [BattleScriptSetsubstituteVectorBattlerState; 4],");
lines.push("    pub attacker: Option<BattleScriptSetsubstituteBattler>,");
lines.push("    pub target: Option<BattleScriptSetsubstituteBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptSetsubstituteBattler>,");
lines.push("    pub fainted: Option<BattleScriptSetsubstituteBattler>,");
lines.push("    pub battle_move_damage: i32,");
lines.push("    pub multistring_chooser: u8,");
lines.push("    pub hit_marker: u32,");
lines.push("    pub siblings: BattleScriptSetsubstituteVectorSiblings,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSetsubstituteVectorState,");
lines.push("    pub expected: Option<BattleScriptSetsubstituteVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSetsubstituteControl],");
lines.push("    pub scheduler_unchanged: &'static [bool],");
lines.push("    pub rng_unchanged: &'static [bool],");
lines.push("    pub event_counts: &'static [u8],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteQuarterProof {");
lines.push("    pub max_hp_start: u16,");
lines.push("    pub max_hp_end: u16,");
lines.push("    pub threshold: u16,");
lines.push("    pub failure_hp: u16,");
lines.push("    pub success_hp: u16,");
lines.push("    pub failure_battle_move_damage: i32,");
lines.push("    pub failure_chooser: u8,");
lines.push("    pub failure_status2: u32,");
lines.push("    pub failure_substitute_hp: u16,");
lines.push("    pub failure_hit_marker: u32,");
lines.push("    pub success_battle_move_damage: i32,");
lines.push("    pub success_chooser: u8,");
lines.push("    pub success_status2: u32,");
lines.push("    pub success_substitute_hp: u16,");
lines.push("    pub success_hit_marker: u32,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteCanonicalIdentity {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_count: usize,");
lines.push("    pub entry_label: &'static str,");
lines.push("    pub entry_program_counter: u32,");
lines.push("    pub instruction_program_counter: u32,");
lines.push("    pub statement_line: u32,");
lines.push("    pub invocation_mnemonic: &'static str,");
lines.push("    pub macro_line: u32,");
lines.push("    pub source_macro: &'static str,");
lines.push("    pub encoded_width_bytes: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteVectorInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_count: usize,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetsubstituteRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptSetsubstituteVectorInstruction],");
lines.push("    pub expected_bindings: &'static [u8],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_DOMAIN_CENSUS: [(&str, u64); " + domainCensus.length + "] = [");
for (const [name, count] of domainCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_CATEGORY_CENSUS: [(&str, usize); " + categoryCensus.length + "] = [");
for (const [name, count] of categoryCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_BRANCH_CENSUS: [(&str, usize); " + branchCensus.length + "] = [");
for (const [name, count] of branchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_BRANCH_CENSUS: [(&str, usize); " + registrationBranchCensus.length + "] = [");
for (const [name, count] of registrationBranchCensus) lines.push("    (" + rustString(name) + ", " + count + "),");
lines.push("];");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_SETSUBSTITUTE_CANONICAL_IDENTITY: BattleScriptSetsubstituteCanonicalIdentity = BattleScriptSetsubstituteCanonicalIdentity {");
lines.push("    opcode_name: " + rustString(identity.opcodeName) + ",");
lines.push("    opcode_id: " + rustU8(identity.opcodeId) + ",");
lines.push("    dispatcher: " + rustString(identity.dispatcher) + ",");
lines.push("    operand_count: " + identity.operandCount + ",");
lines.push("    entry_label: " + rustString(identity.entryLabel) + ",");
lines.push("    entry_program_counter: " + rustU32(identity.entryProgramCounter) + ",");
lines.push("    instruction_program_counter: " + rustU32(identity.instructionProgramCounter) + ",");
lines.push("    statement_line: " + identity.statementLine + ",");
lines.push("    invocation_mnemonic: " + rustString(identity.invocationMnemonic) + ",");
lines.push("    macro_line: " + identity.macroLine + ",");
lines.push("    source_macro: " + rustString(identity.sourceMacro) + ",");
lines.push("    encoded_width_bytes: " + rustU8(identity.encodedWidthBytes) + ",");
lines.push("};");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_SETSUBSTITUTE_QUARTER_PROOFS: [BattleScriptSetsubstituteQuarterProof; " + quarterProofs.length + "] = [");
for (const proof of quarterProofs) {
  lines.push("    BattleScriptSetsubstituteQuarterProof {");
  lines.push("        max_hp_start: " + rustU16(proof.maxHpStart) + ",");
  lines.push("        max_hp_end: " + rustU16(proof.maxHpEnd) + ",");
  lines.push("        threshold: " + rustU16(proof.threshold) + ",");
  lines.push("        failure_hp: " + rustU16(proof.failureHp) + ",");
  lines.push("        success_hp: " + rustU16(proof.successHp) + ",");
  lines.push("        failure_battle_move_damage: " + rustI32(proof.failureBattleMoveDamage) + ",");
  lines.push("        failure_chooser: " + rustU8(proof.failureChooser) + ",");
  lines.push("        failure_status2: " + rustU32(proof.failureStatus2) + ",");
  lines.push("        failure_substitute_hp: " + rustU16(proof.failureSubstituteHp) + ",");
  lines.push("        failure_hit_marker: " + rustU32(proof.failureHitMarker) + ",");
  lines.push("        success_battle_move_damage: " + rustI32(proof.successBattleMoveDamage) + ",");
  lines.push("        success_chooser: " + rustU8(proof.successChooser) + ",");
  lines.push("        success_status2: " + rustU32(proof.successStatus2) + ",");
  lines.push("        success_substitute_hp: " + rustU16(proof.successSubstituteHp) + ",");
  lines.push("        success_hit_marker: " + rustU32(proof.successHitMarker) + ",");
  lines.push("    },");
}
lines.push("];\n");
lines.push("pub static BATTLE_SCRIPT_SETSUBSTITUTE_CASES: [BattleScriptSetsubstituteVectorCase; " + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptSetsubstituteVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + value.applications + ",");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + rustOptionalState(value.expected) + ",");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("        scheduler_unchanged: " + rustBools(value.schedulerUnchanged) + ",");
  lines.push("        rng_unchanged: " + rustBools(value.rngUnchanged) + ",");
  lines.push("        event_counts: " + rustU8Slice(value.eventCounts) + ",");
  lines.push("        expected_error: " + (value.expectedError === null ? "None" : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];\n");
lines.push("pub static BATTLE_SCRIPT_SETSUBSTITUTE_REGISTRATION_CASES: [BattleScriptSetsubstituteRegistrationCase; " + registrationCases.length + "] = [");
for (const value of registrationCases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptSetsubstituteRegistrationCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        instructions: &[" + value.instructions.map(rustInstruction).join(", ") + "],");
  lines.push("        expected_bindings: &[" + value.expectedBindings.map(rustU8).join(", ") + "],");
  lines.push("        expected_error: " + (value.expectedError === null ? "None" : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
const rustupBin = path.join(
  process.env.HOME ?? "",
  ".rustup",
  "toolchains",
  "stable-aarch64-apple-darwin",
  "bin",
);
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
if (!formatted) throw new Error("gen-battle-script-setsubstitute-vectors: could not find rustfmt");

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
const generatedBytes = fs.statSync(outPath).size;
console.log("gen-battle-script-setsubstitute-vectors: wrote " + path.relative(workspaceRoot, outPath));
console.log("gen-battle-script-setsubstitute-vectors: " + cases.length + " complete cases");
console.log("gen-battle-script-setsubstitute-vectors: " + rawQuarterProofs.length + " full-u16 maxHP rows -> " + quarterProofs.length + " intervals");
console.log("gen-battle-script-setsubstitute-vectors: identity " + JSON.stringify(identity));
console.log("gen-battle-script-setsubstitute-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-setsubstitute-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-setsubstitute-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-setsubstitute-vectors: registration branch census " + JSON.stringify(registrationBranchCensus));
console.log("gen-battle-script-setsubstitute-vectors: quarter raw sha256 " + rawQuarterProofSha256);
console.log("gen-battle-script-setsubstitute-vectors: corpus sha256 " + corpusHash);
console.log("gen-battle-script-setsubstitute-vectors: corpus bytes " + Buffer.byteLength(corpusText));
console.log("gen-battle-script-setsubstitute-vectors: generated sha256 " + generatedHash);
console.log("gen-battle-script-setsubstitute-vectors: generated bytes " + generatedBytes);
