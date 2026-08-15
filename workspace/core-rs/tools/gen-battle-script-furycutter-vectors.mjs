#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptFuryCutterOpcode.ts.
// Expected complete narrow projections, controls, registration errors, and
// handler-order errors are created only by executing the canonical TypeScript
// module. This script owns bounded input construction and Rust literal
// emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-furycutter-vectors.mjs

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
  "battle_script_furycutter_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptFuryCutterOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_FURYCUTTERCALC";
const OPCODE_ID = 0xb5;
const DISPATCHER = "Cmd_furycuttercalc";
const ENTRY_LABEL = "BattleScript_FuryCutterHit";
const MISSED_PAUSE_LABEL = "BattleScript_MoveMissedPause";
const BATTLE_SLOTS = 4;
const U8_MAX = 0xff;
const U16_MAX = 0xffff;
const U32_MAX = 0xffff_ffff;
const FURY_CUTTER_MOVE = 210;
const FURY_CUTTER_SOURCE_POWER = 10;
const FURY_CUTTER_COUNTER_FIXED_POINT = 5;
const MOVE_RESULT_NO_EFFECT = rulesModule.BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3, null]);
const SELECTOR_COMBINATIONS = Object.freeze(
  OPTIONAL_BATTLER_DOMAIN.flatMap((target) => OPTIONAL_BATTLER_DOMAIN.flatMap((effectBattler) => (
    OPTIONAL_BATTLER_DOMAIN.map((fainted) => Object.freeze({ target, effectBattler, fainted }))
  ))),
);
const CURRENT_MOVE_POWER_EDGE_DOMAIN = Object.freeze([
  0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0007, 0x0008, 0x000f,
  0x0010, 0x001f, 0x0020, 0x003f, 0x0040, 0x007f, 0x0080, 0x00ff,
  0x0100, 0x7fff, 0x8000, 0xfffe, 0xffff,
]);
const PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN = CURRENT_MOVE_POWER_EDGE_DOMAIN;
const RELEVANT_COUNTER_DOMAIN = Object.freeze([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 31, 127, 254, 255,
]);
const MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN = Object.freeze([
  0x0000_0000,
  0x0000_0001,
  0x0000_0002,
  0x0000_0007,
  0x0000_0008,
  0x0000_0009,
  0x0000_001f,
  0x0000_0020,
  0x0000_0021,
  0x0000_0028,
  0x0000_0029,
  0x0000_002a,
  0x0000_003f,
  0x0000_0040,
  0x0000_0080,
  0x0000_00d6,
  0x0000_00d7,
  0x7fff_ffd6,
  0x7fff_ffff,
  0x8000_0000,
  0x8000_0001,
  0x8000_0008,
  0x8000_0020,
  0xffff_ffd6,
  0xffff_ffd7,
  0xffff_ffff,
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-furycutter-vectors: ${message}`);
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
  value.moves.forEach((move, index) => assertU16(move, `${label}.moves[${index}]`));
  value.pp.forEach((pp, index) => assertU8(pp, `${label}.pp[${index}]`));
  value.statStages.forEach((stage, index) => assertU8(stage, `${label}.statStages[${index}]`));
  assertU32(value.status1, `${label}.status1`);
  assertU32(value.status2, `${label}.status2`);
  assertU32(value.status3, `${label}.status3`);
  assertU16(value.item, `${label}.item`);
  assertU8(value.partyIndex, `${label}.partyIndex`);
  assert(value.partyIndex < 6, `${label}.partyIndex must be a party slot`);
  assertU8(value.furyCutterCounter, `${label}.furyCutterCounter`);
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
    furyCutterCounter: value.furyCutterCounter,
  });
}

function makeBattler(index, salt, furyCutterCounter) {
  assertBattler(index, "battler index");
  assertU8(furyCutterCounter, "generated furyCutterCounter");
  const hp = 70 + ((salt * 29 + index * 31) % 300);
  return freezeBattler({
    side: (index + salt) & 1,
    ability: (salt * 37 + index * 13) & U8_MAX,
    hp,
    maxHp: hp + 17 + ((salt + index) % 31),
    moves: [
      FURY_CUTTER_MOVE,
      (45 + salt * 3 + index) & U16_MAX,
      (98 + salt * 5 + index) & U16_MAX,
      (259 + salt * 7 + index) & U16_MAX,
    ],
    pp: [
      (15 + salt + index) & U8_MAX,
      (35 + salt * 3 + index) & U8_MAX,
      (40 + salt * 5 + index) & U8_MAX,
      (30 + salt * 7 + index) & U8_MAX,
    ],
    status1: (0x0000_0040 ^ ((salt + index) << 3)) >>> 0,
    status2: (0x4000_0001 ^ ((salt * 0x0101 + index) >>> 0)) >>> 0,
    status3: (0x0100_0001 ^ ((salt * 0x101 + index) >>> 0)) >>> 0,
    item: (186 + salt * 17 + index) & U16_MAX,
    statStages: Array.from({ length: 8 }, (_unused, stat) => (salt + index * 3 + stat) % 13),
    partyIndex: (salt + index) % 6,
    furyCutterCounter,
  });
}

function freezeProjection(value) {
  assert(Array.isArray(value.battlers) && value.battlers.length === BATTLE_SLOTS, "battlers must have four cells");
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
  assertU32(value.contextState.hitMarker, "hitMarker");
  assertU8(value.contextState.multiHitCounter, "multiHitCounter");
  assertU32(value.moveResultFlags, "moveResultFlags");
  assertU16(value.currentMovePower, "currentMovePower");
  assertU16(value.dynamicBasePower, "dynamicBasePower");
  return Object.freeze({
    battlers: Object.freeze(value.battlers.map((battler, index) => freezeBattler(battler, `battlers[${index}]`))),
    attacker: value.attacker,
    target: value.target,
    effectBattler: value.effectBattler,
    fainted: value.fainted,
    contextState: Object.freeze({
      scriptingBattler: value.contextState.scriptingBattler,
      atkCancelerTracker: value.contextState.atkCancelerTracker,
      battleOutcome: value.contextState.battleOutcome,
      currentMove: value.contextState.currentMove,
      currentMovePosition: value.contextState.currentMovePosition,
      hitMarker: value.contextState.hitMarker >>> 0,
      multiHitCounter: value.contextState.multiHitCounter,
    }),
    moveResultFlags: value.moveResultFlags >>> 0,
    currentMovePower: value.currentMovePower,
    dynamicBasePower: value.dynamicBasePower,
  });
}

function makeProjection({
  salt = 0,
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  focusBattler = attacker ?? 0,
  focusCounter = 0,
  moveResultFlags = 0,
  currentMovePower = FURY_CUTTER_SOURCE_POWER,
  dynamicBasePower = 0,
} = {}) {
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  assertBattler(focusBattler, "focus battler");
  assertU8(focusCounter, "focus counter");
  assertU32(moveResultFlags, "move result flags");
  assertU16(currentMovePower, "current move power");
  assertU16(dynamicBasePower, "dynamic base power");
  const unrelatedCounters = [0x00, 0x01, 0x05, 0x06];
  return freezeProjection({
    battlers: BATTLER_DOMAIN.map((battler) => makeBattler(
      battler,
      salt,
      battler === focusBattler ? focusCounter : unrelatedCounters[(salt + battler) % unrelatedCounters.length],
    )),
    attacker,
    target,
    effectBattler,
    fainted,
    contextState: {
      scriptingBattler: BATTLER_DOMAIN[(salt + 3) % BATTLER_DOMAIN.length],
      atkCancelerTracker: (salt * 11 + 7) & U8_MAX,
      battleOutcome: (salt * 13 + 2) & U8_MAX,
      currentMove: FURY_CUTTER_MOVE,
      currentMovePosition: salt & 3,
      hitMarker: (0x8000_0001 ^ ((salt * 0x0101_0101) >>> 0)) >>> 0,
      multiHitCounter: (salt * 29 + 4) & U8_MAX,
    },
    moveResultFlags,
    currentMovePower,
    dynamicBasePower,
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
    furyCutterCounter: battler.furyCutterCounter,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: battler.item,
    statStages: battler.statStages,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 1 + index,
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
  const sourceRules = rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    scriptingBattler: projection.contextState.scriptingBattler,
    atkCancelerTracker: projection.contextState.atkCancelerTracker,
    battleOutcome: projection.contextState.battleOutcome,
    currentMove: projection.contextState.currentMove,
    currentMovePosition: projection.contextState.currentMovePosition,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.contextState.hitMarker,
    multiHitCounter: projection.contextState.multiHitCounter,
    dynamicBasePower: projection.dynamicBasePower,
    battleTopology: Object.freeze({
      battlersCount: 2,
      battleTypeFlags: 0,
      battlerPositions: Object.freeze([0, 1, 0xff, 0xff]),
    }),
  });
  assert(sourceRules.currentMovePower === FURY_CUTTER_SOURCE_POWER, "MOVE_FURY_CUTTER source power drifted");
  // The context constructor owns source-valid construction. The handler itself
  // accepts complete numbers, so direct handler vectors retain exact u32
  // bitwise behavior and source-u16 power arithmetic without claiming those
  // are all reachable from one move-table row.
  return Object.freeze({
    ...sourceRules,
    moveResultFlags: projection.moveResultFlags,
    currentMovePower: projection.currentMovePower,
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
    furyCutterCounter: battler.furyCutterCounter,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattler)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    contextState: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      atkCancelerTracker: rules.atkCancelerTracker,
      battleOutcome: rules.battleOutcome,
      currentMove: rules.currentMove,
      currentMovePosition: rules.currentMovePosition,
      hitMarker: rules.hitMarker >>> 0,
      multiHitCounter: rules.multiHitCounter,
    }),
    moveResultFlags: rules.moveResultFlags >>> 0,
    currentMovePower: rules.currentMovePower,
    dynamicBasePower: rules.dynamicBasePower,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.operands.length === 0, "canonical Fury Cutter opcode must have no operands");
assert(instruction.source.label === ENTRY_LABEL, `expected entry label ${ENTRY_LABEL}, got ${instruction.source.label}`);
assert(instruction.source.statementLine === 1637, "Fury Cutter opcode moved from source statement 1637");
assert(instruction.source.invocationMnemonic === "furycuttercalc", "Fury Cutter macro invocation drifted");
assert(instruction.source.sourceMacro === "furycuttercalc", "Fury Cutter macro source drifted");
assert(instruction.source.sourceMacroLine === 948, "Fury Cutter opcode emission moved");
assert(MOVE_RESULT_NO_EFFECT === 0x29, `MOVE_RESULT_NO_EFFECT drifted to ${MOVE_RESULT_NO_EFFECT}`);
const missedPause = programModule.resolveBattleScriptLabel(program, MISSED_PAUSE_LABEL);
assert(missedPause, `${MISSED_PAUSE_LABEL} must resolve in the canonical program`);
const entry = programModule.resolveBattleScriptLabel(program, ENTRY_LABEL);
assert(entry, `${ENTRY_LABEL} must resolve in the canonical program`);
assert(entry.programCounter === instruction.programCounter, "Fury Cutter handler must start at its concrete opcode");
const programWithoutMissedPause = Object.freeze({
  ...program,
  labelEntries: Object.freeze(Object.fromEntries(
    Object.entries(program.labelEntries).filter(([label]) => label !== MISSED_PAUSE_LABEL),
  )),
});
assert(
  !programModule.resolveBattleScriptLabel(programWithoutMissedPause, MISSED_PAUSE_LABEL),
  "synthetic unresolved MoveMissedPause label unexpectedly resolves",
);
const handlers = opcodeModule.createBattleScriptFuryCutterOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical FURYCUTTER handler was not registered");

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") {
    assert(
      transition.control.programCounter === missedPause.programCounter,
      `Fury Cutter jump must target ${MISSED_PAUSE_LABEL}`,
    );
    return "move-missed-pause-jump";
  }
  throw new Error(`unexpected Fury Cutter control ${JSON.stringify(transition.control)}`);
}

function sourceOutcome(initialProjection, applications, moveMissedPauseResolved) {
  const inputRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(inputRules);
  let currentRules = inputRules;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x5e7d_1b0d + application) >>> 0,
      );
      const transition = handler({
        program: moveMissedPauseResolved ? program : programWithoutMissedPause,
        instruction,
        state,
      });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
      assert(transition.rulesContext !== currentRules, "canonical handler reused complete rules state");
      assert(
        transition.rulesContext.battlers !== currentRules.battlers,
        "canonical handler reused its battler array after withBattler",
      );

      const attacker = currentRules.selectorRoles.attacker;
      assert(attacker !== null, "successful canonical handler had no attacker");
      const noEffect = (currentRules.moveResultFlags & MOVE_RESULT_NO_EFFECT) !== 0;
      const control = controlFromTransition(transition);
      if (noEffect) {
        assert(control === "move-missed-pause-jump", "no-effect Fury Cutter must jump");
        assert(
          transition.rulesContext.battlers[attacker].furyCutterCounter === 0,
          "no-effect Fury Cutter must reset its attacker counter",
        );
        assert(
          transition.rulesContext.dynamicBasePower === currentRules.dynamicBasePower,
          "no-effect Fury Cutter must retain prior dynamic power",
        );
      } else {
        assert(control === "advance", "effective Fury Cutter must advance");
        const priorCounter = currentRules.battlers[attacker].furyCutterCounter;
        const counter = priorCounter === FURY_CUTTER_COUNTER_FIXED_POINT
          ? priorCounter
          : (priorCounter + 1) & U8_MAX;
        let expectedPower = currentRules.currentMovePower & U16_MAX;
        for (let index = 1; index < counter; index += 1) {
          expectedPower = (expectedPower * 2) & U16_MAX;
        }
        assert(
          transition.rulesContext.battlers[attacker].furyCutterCounter === counter,
          "effective Fury Cutter counter transition drifted",
        );
        assert(
          transition.rulesContext.dynamicBasePower === expectedPower,
          "effective Fury Cutter power assignment/doubling drifted",
        );
      }
      controls.push(control);
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(inputRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(inputRules), inputSnapshot), "throwing canonical handler mutated initial rules");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === "Battle Script hit-chain command requires a attacker role") {
    return "missing-attacker-role";
  }
  if (outcome.error === `Cmd_furycuttercalc requires ${MISSED_PAUSE_LABEL}`) {
    return "unresolved-move-missed-pause";
  }
  if (outcome.error !== null) throw new Error(`unexpected canonical error ${outcome.error}`);
  if (outcome.controls.every((control) => control === "advance")) {
    return outcome.controls.length === 1 ? "advance" : "repeated-advance";
  }
  if (outcome.controls.every((control) => control === "move-missed-pause-jump")) {
    return outcome.controls.length === 1 ? "move-missed-pause-jump" : "repeated-move-missed-pause-jump";
  }
  throw new Error(`unexpected Fury Cutter control sequence ${outcome.controls.join(",")}`);
}

const cases = [];
function addCase(
  label,
  category,
  initial,
  { applications = 1, moveMissedPauseResolved = true } = {},
) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(Number.isInteger(applications) && applications >= 1 && applications <= 6, `${label}: bad applications`);
  const outcome = sourceOutcome(initial, applications, moveMissedPauseResolved);
  const branch = branchFor(outcome);
  if (initial.attacker === null) {
    assert(branch === "missing-attacker-role", `${label}: missing attacker must fail first`);
    assert(outcome.controls.length === 0, `${label}: missing attacker unexpectedly controlled`);
  }
  cases.push(Object.freeze({
    label,
    category,
    branch,
    applications,
    moveMissedPauseResolved,
    initial: vectorState(canonicalRulesFromProjection(initial)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

// Orthogonal exhaustive sweep: every source-u8 counter for every possible
// attacker alias. The label is intentionally absent; success must never ask
// for it. Current power and immutable selector aliases rotate independently.
for (const attacker of BATTLER_DOMAIN) {
  for (let counter = 0; counter <= U8_MAX; counter += 1) {
    const roles = SELECTOR_COMBINATIONS[
      (counter * 17 + attacker * 29) % SELECTOR_COMBINATIONS.length
    ];
    addCase(
      `counter_u8_a${attacker}_c${counter}`,
      "every-source-u8-counter-for-every-attacker",
      makeProjection({
        salt: counter + attacker * 1_000,
        attacker,
        ...roles,
        focusBattler: attacker,
        focusCounter: counter,
        moveResultFlags: 0,
        currentMovePower: CURRENT_MOVE_POWER_EDGE_DOMAIN[
          (counter + attacker * 7) % CURRENT_MOVE_POWER_EDGE_DOMAIN.length
        ],
        dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (counter * 3 + attacker) % PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
      }),
      { moveMissedPauseResolved: false },
    );
  }
}

// Boundary matrix for JavaScript's complete u32 bitwise mask behavior. Every
// no-effect cell receives a real label; every non-mask cell deliberately does
// not, proving resolution happens only on the miss branch.
for (const attacker of BATTLER_DOMAIN) {
  for (const [flagsIndex, moveResultFlags] of MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN.entries()) {
    const noEffect = (moveResultFlags & MOVE_RESULT_NO_EFFECT) !== 0;
    addCase(
      `mask_u32_a${attacker}_v${moveResultFlags.toString(16).padStart(8, "0")}`,
      "move-result-no-effect-full-u32-mask-boundaries",
      makeProjection({
        salt: 10_000 + attacker * 100 + flagsIndex,
        attacker,
        target: BATTLER_DOMAIN[(attacker + 1) & 3],
        effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
        fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
        focusBattler: attacker,
        focusCounter: RELEVANT_COUNTER_DOMAIN[
          (flagsIndex + attacker * 3) % RELEVANT_COUNTER_DOMAIN.length
        ],
        moveResultFlags,
        currentMovePower: CURRENT_MOVE_POWER_EDGE_DOMAIN[
          (flagsIndex + attacker) % CURRENT_MOVE_POWER_EDGE_DOMAIN.length
        ],
        dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (flagsIndex * 5 + attacker) % PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
      }),
      { moveMissedPauseResolved: noEffect },
    );
  }
}

// Every attacker is crossed with all nullable independent selector aliases.
for (const attacker of BATTLER_DOMAIN) {
  for (const [rolesIndex, roles] of SELECTOR_COMBINATIONS.entries()) {
    addCase(
      `selectors_a${attacker}_t${roleLabel(roles.target)}_e${roleLabel(roles.effectBattler)}_f${roleLabel(roles.fainted)}`,
      "all-attacker-and-selector-alias-combinations",
      makeProjection({
        salt: 20_000 + attacker * SELECTOR_COMBINATIONS.length + rolesIndex,
        attacker,
        ...roles,
        focusBattler: attacker,
        focusCounter: RELEVANT_COUNTER_DOMAIN[
          (rolesIndex + attacker * 11) % RELEVANT_COUNTER_DOMAIN.length
        ],
        moveResultFlags: 0,
        currentMovePower: CURRENT_MOVE_POWER_EDGE_DOMAIN[
          (rolesIndex * 3 + attacker) % CURRENT_MOVE_POWER_EDGE_DOMAIN.length
        ],
        dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (rolesIndex + attacker * 5) % PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
      }),
      { moveMissedPauseResolved: false },
    );
  }
}

// Every notable prior dynamic-power edge must be overwritten by source move
// power after the source counter calculation; it is not an accumulator.
for (const attacker of BATTLER_DOMAIN) {
  for (const [priorIndex, dynamicBasePower] of PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.entries()) {
    addCase(
      `prior_dynamic_a${attacker}_v${dynamicBasePower}`,
      "prior-dynamic-base-power-overwrite-edges",
      makeProjection({
        salt: 30_000 + attacker * 100 + priorIndex,
        attacker,
        target: BATTLER_DOMAIN[(attacker + 1) & 3],
        effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
        fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
        focusBattler: attacker,
        focusCounter: RELEVANT_COUNTER_DOMAIN[
          (priorIndex + attacker * 3) % RELEVANT_COUNTER_DOMAIN.length
        ],
        moveResultFlags: 0,
        currentMovePower: CURRENT_MOVE_POWER_EDGE_DOMAIN[
          (priorIndex * 7 + attacker) % CURRENT_MOVE_POWER_EDGE_DOMAIN.length
        ],
        dynamicBasePower,
      }),
      { moveMissedPauseResolved: false },
    );
  }
}

// Cross every source-u16 boundary value with every counter class that has a
// distinct increment, fixed-point, wrapping, or u16-overflow consequence.
// Attackers rotate through all four cells without creating a 4x cartesian
// blow-up already covered by the exhaustive counter sweep above.
for (const [counterIndex, counter] of RELEVANT_COUNTER_DOMAIN.entries()) {
  for (const [powerIndex, currentMovePower] of CURRENT_MOVE_POWER_EDGE_DOMAIN.entries()) {
    const attacker = (counterIndex + powerIndex) % BATTLE_SLOTS;
    addCase(
      `power_u16_c${counter}_v${currentMovePower}`,
      "current-move-power-u16-assignment-and-wrapping-doublings",
      makeProjection({
        salt: 40_000 + counterIndex * 100 + powerIndex,
        attacker,
        target: BATTLER_DOMAIN[(attacker + 1) & 3],
        effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
        fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
        focusBattler: attacker,
        focusCounter: counter,
        moveResultFlags: 0x8000_0000,
        currentMovePower,
        dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (counterIndex * 3 + powerIndex) % PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
      }),
      { moveMissedPauseResolved: false },
    );
  }
}

// A no-effect result must reset exactly one attacker counter and preserve the
// entire remainder of the state, including dynamic power.
for (const attacker of BATTLER_DOMAIN) {
  for (const [counterIndex, counter] of RELEVANT_COUNTER_DOMAIN.entries()) {
    addCase(
      `miss_reset_a${attacker}_c${counter}`,
      "miss-resets-only-attacker-and-jumps",
      makeProjection({
        salt: 50_000 + attacker * 100 + counterIndex,
        attacker,
        target: BATTLER_DOMAIN[(attacker + 1) & 3],
        effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
        fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
        focusBattler: attacker,
        focusCounter: counter,
        moveResultFlags: (MOVE_RESULT_NO_EFFECT | 0x8000_0000) >>> 0,
        currentMovePower: CURRENT_MOVE_POWER_EDGE_DOMAIN[
          (counterIndex + attacker) % CURRENT_MOVE_POWER_EDGE_DOMAIN.length
        ],
        dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (counterIndex * 5 + attacker) % PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
      }),
      { moveMissedPauseResolved: true },
    );
  }
}

// The label lookup is genuinely observable only after an attacker exists and
// the no-effect branch has been selected. Each constituent source mask bit
// gets one unresolved direct-handler vector.
for (const attacker of BATTLER_DOMAIN) {
  const moveResultFlags = [0x01, 0x08, 0x20, MOVE_RESULT_NO_EFFECT][attacker];
  addCase(
    `unresolved_miss_label_a${attacker}`,
    "unresolved-label-on-miss-branch-only",
    makeProjection({
      salt: 55_000 + attacker,
      attacker,
      target: BATTLER_DOMAIN[(attacker + 1) & 3],
      effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
      fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
      focusBattler: attacker,
      focusCounter: RELEVANT_COUNTER_DOMAIN[attacker + 4],
      moveResultFlags,
      currentMovePower: CURRENT_MOVE_POWER_EDGE_DOMAIN[attacker + 1],
      dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[attacker + 2],
    }),
    { moveMissedPauseResolved: false },
  );
}

// Missing attacker is earlier than both the full mask check and unresolved
// label lookup, while all 125 retained target/effect/fainted alias states are
// still present in the projection.
for (const [rolesIndex, roles] of SELECTOR_COMBINATIONS.entries()) {
  addCase(
    `missing_attacker_t${roleLabel(roles.target)}_e${roleLabel(roles.effectBattler)}_f${roleLabel(roles.fainted)}`,
    "missing-attacker-before-mask-and-label-resolution",
    makeProjection({
      salt: 60_000 + rolesIndex,
      attacker: null,
      ...roles,
      focusBattler: rolesIndex % BATTLE_SLOTS,
      focusCounter: U8_MAX,
      moveResultFlags: MOVE_RESULT_NO_EFFECT,
      currentMovePower: U16_MAX,
      dynamicBasePower: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN[
        rolesIndex % PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
      ],
    }),
    { moveMissedPauseResolved: false },
  );
}

// Repeat paths execute the canonical handler repeatedly over its own frozen
// output: fixed point, corrupt wrapping sequence, and repeated no-effect
// reset/jump are all intentionally distinct.
for (const attacker of BATTLER_DOMAIN) {
  addCase(
    `fixed_point_a${attacker}`,
    "repeated-success-to-fixed-point",
    makeProjection({
      salt: 70_000 + attacker,
      attacker,
      target: BATTLER_DOMAIN[(attacker + 1) & 3],
      effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
      fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
      focusBattler: attacker,
      focusCounter: 0,
      moveResultFlags: 0,
      currentMovePower: 10,
      dynamicBasePower: U16_MAX,
    }),
    { applications: 6, moveMissedPauseResolved: false },
  );
  addCase(
    `wrapping_success_a${attacker}`,
    "repeated-success-through-u8-wrap",
    makeProjection({
      salt: 71_000 + attacker,
      attacker,
      target: BATTLER_DOMAIN[(attacker + 1) & 3],
      effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
      fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
      focusBattler: attacker,
      focusCounter: 253,
      moveResultFlags: 0,
      currentMovePower: 0x8001,
      dynamicBasePower: 0,
    }),
    { applications: 3, moveMissedPauseResolved: false },
  );
  addCase(
    `repeated_miss_a${attacker}`,
    "repeated-miss-reset-and-jump",
    makeProjection({
      salt: 72_000 + attacker,
      attacker,
      target: BATTLER_DOMAIN[(attacker + 1) & 3],
      effectBattler: BATTLER_DOMAIN[(attacker + 2) & 3],
      fainted: BATTLER_DOMAIN[(attacker + 3) & 3],
      focusBattler: attacker,
      focusCounter: U8_MAX,
      moveResultFlags: MOVE_RESULT_NO_EFFECT,
      currentMovePower: 0xffff,
      dynamicBasePower: 0x1234,
    }),
    { applications: 3, moveMissedPauseResolved: true },
  );
}

assert(cases.length === 2_278, `case count drifted: ${cases.length}`);
for (const attacker of BATTLER_DOMAIN) {
  for (let counter = 0; counter <= U8_MAX; counter += 1) {
    assert(
      cases.some((value) => value.category === "every-source-u8-counter-for-every-attacker"
        && value.initial.attacker === attacker
        && value.initial.battlers[attacker].furyCutterCounter === counter),
      `exhaustive counter sweep misses attacker ${attacker} counter ${counter}`,
    );
  }
  for (const roles of SELECTOR_COMBINATIONS) {
    assert(
      cases.some((value) => value.category === "all-attacker-and-selector-alias-combinations"
        && value.initial.attacker === attacker
        && value.initial.target === roles.target
        && value.initial.effectBattler === roles.effectBattler
        && value.initial.fainted === roles.fainted),
      `selector sweep misses attacker ${attacker} roles ${JSON.stringify(roles)}`,
    );
  }
}
for (const flags of MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN) {
  assert(
    cases.some((value) => value.category === "move-result-no-effect-full-u32-mask-boundaries"
      && value.initial.moveResultFlags === flags),
    `u32 mask edge ${flags} is missing`,
  );
}
for (const counter of RELEVANT_COUNTER_DOMAIN) {
  for (const power of CURRENT_MOVE_POWER_EDGE_DOMAIN) {
    assert(
      cases.some((value) => value.category === "current-move-power-u16-assignment-and-wrapping-doublings"
        && value.initial.battlers[value.initial.attacker].furyCutterCounter === counter
        && value.initial.currentMovePower === power),
      `power/counter matrix misses counter ${counter} power ${power}`,
    );
  }
}

function instructionSpec(sourceInstruction) {
  return Object.freeze({
    opcodeName: sourceInstruction.opcodeName,
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandCount: sourceInstruction.operands.length,
  });
}

function materializeInstruction(spec) {
  return Object.freeze({
    ...instruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(Array.from({ length: spec.operandCount }, (_unused, index) => Object.freeze({
      widthBytes: 1,
      expression: String(index),
      sourceMacro: "generated-invalid-shape",
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
    const registrationHandlers = opcodeModule.createBattleScriptFuryCutterOpcodeHandlers(registrationProgram);
    const candidates = registrationProgram.instructions.filter((candidate) => candidate.opcodeName === OPCODE_NAME);
    assert(candidates.length === 1, "successful registration must select one concrete start");
    const registered = registrationHandlers[candidates[0].opcodeId];
    assert(typeof registered === "function", "valid registration did not return canonical handler");
    return Object.freeze({ expected: instructionSpec(candidates[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ expected: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid registration label ${label}`);
  const normalizedSpecs = Object.freeze(specs.map(instructionSpec));
  const outcome = registrationOutcome(normalizedSpecs);
  registrationCases.push(Object.freeze({
    label,
    instructions: normalizedSpecs,
    expected: outcome.expected,
    expectedError: outcome.error,
  }));
}

addRegistrationCase("canonical", [instruction]);
addRegistrationCase("no_concrete_start", []);
addRegistrationCase("two_concrete_starts", [instruction, instruction]);
addRegistrationCase("wrong_opcode", [{ ...instruction, opcodeId: 0xb4 }]);
addRegistrationCase("wrong_dispatcher", [{ ...instruction, dispatcher: "Cmd_friendshiptodamagecalculation" }]);
addRegistrationCase("unexpected_operand", [{ ...instruction, operands: [{}] }]);
assert(registrationCases.length === 6, "registration corpus must retain six shape cases");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered" : value.expectedError.startsWith(`${OPCODE_NAME} requires`)
    ? "concrete-start-cardinality"
    : "invalid-instruction-shape"
));
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", BATTLER_DOMAIN.length],
  ["optional-selector-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["attacker-selector-cross-product", BATTLER_DOMAIN.length * SELECTOR_COMBINATIONS.length],
  ["counter-source-u8-values", U8_MAX + 1],
  ["counter-relevant-edge-values", RELEVANT_COUNTER_DOMAIN.length],
  ["counter-fixed-point-value", FURY_CUTTER_COUNTER_FIXED_POINT],
  ["current-move-power-source-u16-values", U16_MAX + 1],
  ["current-move-power-edge-values", CURRENT_MOVE_POWER_EDGE_DOMAIN.length],
  ["prior-dynamic-base-power-edge-values", PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
  ["move-result-flags-u32-values", U32_MAX + 1],
  ["move-result-no-effect-mask-edge-values", MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN.length],
  ["move-result-no-effect-mask", MOVE_RESULT_NO_EFFECT],
  ["application-count-values", 3],
  ["registration-shape-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  entryLabel: ENTRY_LABEL,
  entryProgramCounter: entry.programCounter,
  missedPauseLabel: MISSED_PAUSE_LABEL,
  missedPauseProgramCounter: missedPause.programCounter,
  sourceFuryCutterMove: FURY_CUTTER_MOVE,
  sourceFuryCutterMovePower: FURY_CUTTER_SOURCE_POWER,
  counterFixedPoint: FURY_CUTTER_COUNTER_FIXED_POINT,
  moveResultNoEffectMask: MOVE_RESULT_NO_EFFECT,
  battlerDomain: BATTLER_DOMAIN,
  optionalSelectorDomain: OPTIONAL_BATTLER_DOMAIN,
  relevantCounterDomain: RELEVANT_COUNTER_DOMAIN,
  currentMovePowerEdgeDomain: CURRENT_MOVE_POWER_EDGE_DOMAIN,
  priorDynamicBasePowerEdgeDomain: PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN,
  moveResultFlagsU32EdgeDomain: MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusText).digest("hex");

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

function rustBattler(value) {
  return `BattleScriptFurycutterBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustControl(value) {
  return value === "advance"
    ? "BattleScriptFurycutterControl::Advance"
    : "BattleScriptFurycutterControl::MoveMissedPauseJump";
}

function rustControls(values) {
  return `&[${values.map(rustControl).join(", ")}]`;
}

function rustBattlerState(value) {
  return [
    "BattleScriptFurycutterVectorBattlerState {",
    `side: ${rustU8(value.side)},`,
    `ability: ${rustU8(value.ability)},`,
    `hp: ${rustU16(value.hp)},`,
    `max_hp: ${rustU16(value.maxHp)},`,
    `moves: [${value.moves.map(rustU16).join(", ")}],`,
    `pp: [${value.pp.map(rustU8).join(", ")}],`,
    `status1: ${rustU32(value.status1)},`,
    `status2: ${rustU32(value.status2)},`,
    `status3: ${rustU32(value.status3)},`,
    `item: ${rustU16(value.item)},`,
    `stat_stages: [${value.statStages.map(rustU8).join(", ")}],`,
    `party_index: ${rustU8(value.partyIndex)},`,
    `fury_cutter_counter: ${rustU8(value.furyCutterCounter)},`,
    "}",
  ].join(" ");
}

function rustContextState(value) {
  return [
    "BattleScriptFurycutterVectorContextState {",
    `scripting_battler: ${rustBattler(value.scriptingBattler)},`,
    `atk_canceler_tracker: ${rustU8(value.atkCancelerTracker)},`,
    `battle_outcome: ${rustU8(value.battleOutcome)},`,
    `current_move: ${rustU16(value.currentMove)},`,
    `current_move_position: ${rustU8(value.currentMovePosition)},`,
    `hit_marker: ${rustU32(value.hitMarker)},`,
    `multi_hit_counter: ${rustU8(value.multiHitCounter)},`,
    "}",
  ].join(" ");
}

function rustState(value) {
  return [
    "BattleScriptFurycutterVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    `context_state: ${rustContextState(value.contextState)},`,
    `move_result_flags: ${rustU32(value.moveResultFlags)},`,
    `current_move_power: ${rustU16(value.currentMovePower)},`,
    `dynamic_base_power: ${rustU16(value.dynamicBasePower)},`,
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}

function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustInstruction(value) {
  return [
    "BattleScriptFurycutterVectorInstruction {",
    `opcode_name: ${rustString(value.opcodeName)},`,
    `program_counter: ${value.programCounter},`,
    `opcode_id: ${rustU8(value.opcodeId)},`,
    `dispatcher: ${rustString(value.dispatcher)},`,
    `operand_count: ${value.operandCount},`,
    "}",
  ].join(" ");
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-furycutter-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptFuryCutterOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_furycutter::{BattleScriptFurycutterBattler, BattleScriptFurycutterControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_OPCODE: u8 = ${rustU8(OPCODE_ID)};`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_MOVE_RESULT_NO_EFFECT: u32 = ${rustU32(MOVE_RESULT_NO_EFFECT)};`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_COUNTER_FIXED_POINT: u8 = ${rustU8(FURY_CUTTER_COUNTER_FIXED_POINT)};`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_OPTIONAL_BATTLER_DOMAIN: [Option<u8>; ${OPTIONAL_BATTLER_DOMAIN.length}] = [${OPTIONAL_BATTLER_DOMAIN.map((value) => value === null ? "None" : `Some(${value})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_RELEVANT_COUNTER_DOMAIN: [u8; ${RELEVANT_COUNTER_DOMAIN.length}] = [${RELEVANT_COUNTER_DOMAIN.map(rustU8).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_CURRENT_MOVE_POWER_EDGE_DOMAIN: [u16; ${CURRENT_MOVE_POWER_EDGE_DOMAIN.length}] = [${CURRENT_MOVE_POWER_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN: [u16; ${PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.length}] = [${PRIOR_DYNAMIC_BASE_POWER_EDGE_DOMAIN.map(rustU16).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN: [u32; ${MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN.length}] = [${MOVE_RESULT_FLAGS_U32_EDGE_DOMAIN.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFurycutterVectorBattlerState {");
lines.push("    pub side: u8,");
lines.push("    pub ability: u8,");
lines.push("    pub hp: u16,");
lines.push("    pub max_hp: u16,");
lines.push("    pub moves: [u16; 4],");
lines.push("    pub pp: [u8; 4],");
lines.push("    pub status1: u32,");
lines.push("    pub status2: u32,");
lines.push("    pub status3: u32,");
lines.push("    pub item: u16,");
lines.push("    pub stat_stages: [u8; 8],");
lines.push("    pub party_index: u8,");
lines.push("    pub fury_cutter_counter: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFurycutterVectorContextState {");
lines.push("    pub scripting_battler: BattleScriptFurycutterBattler,");
lines.push("    pub atk_canceler_tracker: u8,");
lines.push("    pub battle_outcome: u8,");
lines.push("    pub current_move: u16,");
lines.push("    pub current_move_position: u8,");
lines.push("    pub hit_marker: u32,");
lines.push("    pub multi_hit_counter: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFurycutterVectorState {");
lines.push("    pub battlers: [BattleScriptFurycutterVectorBattlerState; 4],");
lines.push("    pub attacker: Option<BattleScriptFurycutterBattler>,");
lines.push("    pub target: Option<BattleScriptFurycutterBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptFurycutterBattler>,");
lines.push("    pub fainted: Option<BattleScriptFurycutterBattler>,");
lines.push("    pub context_state: BattleScriptFurycutterVectorContextState,");
lines.push("    pub move_result_flags: u32,");
lines.push("    pub current_move_power: u16,");
lines.push("    pub dynamic_base_power: u16,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFurycutterVectorInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_count: usize,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFurycutterVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub move_missed_pause_resolved: bool,");
lines.push("    pub initial: BattleScriptFurycutterVectorState,");
lines.push("    pub expected: Option<BattleScriptFurycutterVectorState>,");
lines.push("    pub controls: &'static [BattleScriptFurycutterControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFurycutterRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptFurycutterVectorInstruction],");
lines.push("    pub expected: Option<BattleScriptFurycutterVectorInstruction>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [`);
for (const [name, count] of registrationBranchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_FURYCUTTER_CASES: [BattleScriptFurycutterVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptFurycutterVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        move_missed_pause_resolved: ${value.moveMissedPauseResolved},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_FURYCUTTER_REGISTRATION_CASES: [BattleScriptFurycutterRegistrationCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptFurycutterRegistrationCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected: ${value.expected === null ? "None" : `Some(${rustInstruction(value.expected)})`},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
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
if (!formatted) throw new Error("gen-battle-script-furycutter-vectors: could not find rustfmt");

const generatedBytes = fs.readFileSync(outPath);
const generatedHash = crypto.createHash("sha256").update(generatedBytes).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");
console.log(`gen-battle-script-furycutter-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-furycutter-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-furycutter-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-furycutter-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-furycutter-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-furycutter-vectors: registration branch census ${JSON.stringify(registrationBranchCensus)}`);
console.log(`gen-battle-script-furycutter-vectors: corpus sha256 ${corpusHash} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-furycutter-vectors: generated sha256 ${generatedHash} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-furycutter-vectors: generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
