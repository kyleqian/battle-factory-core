#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptIncrementGameStatOpcode.ts.
// Expected controls, complete projected outputs, observations, ordered errors,
// and registration observations are created only by executing canonical
// TypeScript. Bounded source/decomp/macro/program-site evidence is separately
// read from the pinned reference tree and emitted as Rust metadata.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-incrementgamestat-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_incrementgamestat_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptIncrementGameStatOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_INCREMENTGAMESTAT";
const OPCODE_ID = 0x60;
const DISPATCHER = "Cmd_incrementgamestat";
const MACRO_NAME = "incrementgamestat";
const BATTLE_SLOTS = 4;
const SIDE_DOMAIN = Object.freeze([0, 1]);
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const CANONICAL_BATTLER_SIDES = Object.freeze([0, 1, 0, 1]);
const U8_EDGE_DOMAIN = Object.freeze([0, 1, 0xfe, 0xff]);
const U16_EDGE_DOMAIN = Object.freeze([0, 1, 0xfffe, 0xffff]);
const I32_EDGE_DOMAIN = Object.freeze([-0x8000_0000, -1, 0, 0x7fff_ffff]);
const U32_EDGE_DOMAIN = Object.freeze([0, 1, 0x8000_0000, 0xffff_ffff]);
const GENERATED_FILE_MAX_BYTES = 500_000;

function assert(condition, message) {
  if (!condition) {
    throw new Error("gen-battle-script-incrementgamestat-vectors: " + message);
  }
}

function freezeArray(values) {
  return Object.freeze(values.slice());
}

function assertBattler(value, field) {
  assert(BATTLER_DOMAIN.includes(value), field + " must be a battler 0..3, got " + value);
}

function assertOptionalBattler(value, field) {
  if (value !== null) assertBattler(value, field);
}

function assertSide(value, field) {
  assert(SIDE_DOMAIN.includes(value), field + " must be side 0 or 1, got " + value);
}

function assertU8(value, field) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff,
    field + " must be a u8, got " + value);
}

function assertU16(value, field) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff,
    field + " must be a u16, got " + value);
}

function assertI32(value, field) {
  assert(Number.isInteger(value) && value >= -0x8000_0000 && value <= 0x7fff_ffff,
    field + " must be an i32, got " + value);
}

function assertU32(value, field) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff,
    field + " must be a u32, got " + value);
}

function optionalBattler(salt, offset) {
  const value = (salt + offset) % 5;
  return value === 4 ? null : value;
}

function makeProjection({ attacker, attackerSide, salt }) {
  assertOptionalBattler(attacker, "attacker");
  if (attackerSide !== undefined) assertSide(attackerSide, "attacker side");
  assert(Number.isInteger(salt) && salt >= 0, "salt must be a nonnegative integer");
  const battlers = BATTLER_DOMAIN.map((battler) => Object.freeze({
    side: attacker === battler && attackerSide !== undefined
      ? attackerSide
      : CANONICAL_BATTLER_SIDES[battler],
    ability: U8_EDGE_DOMAIN[(salt + battler) % U8_EDGE_DOMAIN.length],
    hp: U16_EDGE_DOMAIN[(salt + battler + 1) % U16_EDGE_DOMAIN.length],
    item: U16_EDGE_DOMAIN[(salt + battler + 2) % U16_EDGE_DOMAIN.length],
    pp: freezeArray(BATTLER_DOMAIN.map((position) =>
      U8_EDGE_DOMAIN[(salt + battler + position) % U8_EDGE_DOMAIN.length])),
    status1: U32_EDGE_DOMAIN[(salt + battler) % U32_EDGE_DOMAIN.length],
    status2: U32_EDGE_DOMAIN[(salt + battler + 1) % U32_EDGE_DOMAIN.length],
    status3: U32_EDGE_DOMAIN[(salt + battler + 2) % U32_EDGE_DOMAIN.length],
  }));
  return freezeProjection({
    battlers,
    attacker,
    target: optionalBattler(salt, 1),
    effectBattler: optionalBattler(salt, 2),
    fainted: optionalBattler(salt, 3),
    siblings: Object.freeze({
      scriptingBattler: salt % BATTLE_SLOTS,
      currentMove: salt % 2 === 0 ? 150 : 165,
      currentMovePosition: salt % BATTLE_SLOTS,
      moveResultFlags: U8_EDGE_DOMAIN[(salt + 1) % U8_EDGE_DOMAIN.length],
      battleMoveDamage: I32_EDGE_DOMAIN[(salt + 2) % I32_EDGE_DOMAIN.length],
      hitMarker: U32_EDGE_DOMAIN[(salt + 3) % U32_EDGE_DOMAIN.length],
      multiHitCounter: U8_EDGE_DOMAIN[(salt + 2) % U8_EDGE_DOMAIN.length],
      bideDmg: freezeArray(BATTLER_DOMAIN.map((battler) =>
        I32_EDGE_DOMAIN[(salt + battler) % I32_EDGE_DOMAIN.length])),
      lockedMoves: freezeArray(BATTLER_DOMAIN.map((battler) =>
        U16_EDGE_DOMAIN[(salt + battler + 1) % U16_EDGE_DOMAIN.length])),
    }),
  });
}

function freezeProjection(value) {
  assert(Array.isArray(value.battlers) && value.battlers.length === BATTLE_SLOTS,
    "projection must have four battlers");
  value.battlers.forEach((battler, index) => {
    assertSide(battler.side, "battlers[" + index + "].side");
    assertU8(battler.ability, "battlers[" + index + "].ability");
    assertU16(battler.hp, "battlers[" + index + "].hp");
    assertU16(battler.item, "battlers[" + index + "].item");
    assert(Array.isArray(battler.pp) && battler.pp.length === 4,
      "battlers[" + index + "].pp must have four slots");
    battler.pp.forEach((pp, position) => assertU8(pp,
      "battlers[" + index + "].pp[" + position + "]"));
    assertU32(battler.status1, "battlers[" + index + "].status1");
    assertU32(battler.status2, "battlers[" + index + "].status2");
    assertU32(battler.status3, "battlers[" + index + "].status3");
  });
  assertOptionalBattler(value.attacker, "attacker");
  assertOptionalBattler(value.target, "target");
  assertOptionalBattler(value.effectBattler, "effectBattler");
  assertOptionalBattler(value.fainted, "fainted");
  assertBattler(value.siblings.scriptingBattler, "scriptingBattler");
  assertU16(value.siblings.currentMove, "currentMove");
  assertU8(value.siblings.currentMovePosition, "currentMovePosition");
  assertU8(value.siblings.moveResultFlags, "moveResultFlags");
  assertI32(value.siblings.battleMoveDamage, "battleMoveDamage");
  assertU32(value.siblings.hitMarker, "hitMarker");
  assertU8(value.siblings.multiHitCounter, "multiHitCounter");
  assert(Array.isArray(value.siblings.bideDmg) && value.siblings.bideDmg.length === BATTLE_SLOTS,
    "bideDmg must have four cells");
  value.siblings.bideDmg.forEach((damage, index) => assertI32(damage,
    "bideDmg[" + index + "]"));
  assert(Array.isArray(value.siblings.lockedMoves)
    && value.siblings.lockedMoves.length === BATTLE_SLOTS,
  "lockedMoves must have four cells");
  value.siblings.lockedMoves.forEach((move, index) => assertU16(move,
    "lockedMoves[" + index + "]"));
  return Object.freeze({
    battlers: freezeArray(value.battlers.map((battler) => Object.freeze({
      side: battler.side,
      ability: battler.ability,
      hp: battler.hp,
      item: battler.item,
      pp: freezeArray(battler.pp),
      status1: battler.status1,
      status2: battler.status2,
      status3: battler.status3,
    }))),
    attacker: value.attacker,
    target: value.target,
    effectBattler: value.effectBattler,
    fainted: value.fainted,
    siblings: Object.freeze({
      scriptingBattler: value.siblings.scriptingBattler,
      currentMove: value.siblings.currentMove,
      currentMovePosition: value.siblings.currentMovePosition,
      moveResultFlags: value.siblings.moveResultFlags,
      battleMoveDamage: value.siblings.battleMoveDamage,
      hitMarker: value.siblings.hitMarker,
      multiHitCounter: value.siblings.multiHitCounter,
      bideDmg: freezeArray(value.siblings.bideDmg),
      lockedMoves: freezeArray(value.siblings.lockedMoves),
    }),
  });
}

function canonicalBattler(value) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: value.hp,
    maxHP: 0xffff,
    item: value.item,
    moves: Object.freeze([150, 165, 0, 0]),
    pp: value.pp,
    status1: value.status1,
    status2: value.status2,
    status3: value.status3,
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
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 0,
    attack: 50,
    defense: 50,
    spAttack: 50,
    spDefense: 50,
    level: 50,
    friendship: 0,
    partyIndex: 0,
  });
}

function canonicalRulesFromProjection(value) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(value.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: value.attacker,
      target: value.target,
      effectBattler: value.effectBattler,
      fainted: value.fainted,
    }),
    scriptingBattler: value.siblings.scriptingBattler,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: value.siblings.currentMove,
    currentMovePosition: value.siblings.currentMovePosition,
    moveResultFlags: value.siblings.moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: value.siblings.hitMarker,
    multiHitCounter: value.siblings.multiHitCounter,
    battleMoveDamage: value.siblings.battleMoveDamage,
    bideDmg: value.siblings.bideDmg,
    lockedMoves: value.siblings.lockedMoves,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((battler) => Object.freeze({
      side: battler.side,
      ability: battler.ability,
      hp: battler.hp,
      item: battler.item,
      pp: freezeArray(battler.pp),
      status1: battler.status1,
      status2: battler.status2,
      status3: battler.status3,
    }))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    siblings: Object.freeze({
      scriptingBattler: rules.scriptingBattler,
      currentMove: rules.currentMove,
      currentMovePosition: rules.currentMovePosition,
      moveResultFlags: rules.moveResultFlags,
      battleMoveDamage: rules.battleMoveDamage,
      hitMarker: rules.hitMarker,
      multiHitCounter: rules.multiHitCounter,
      bideDmg: freezeArray(rules.bideDmg),
      lockedMoves: freezeArray(rules.lockedMoves),
    }),
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function vectorGameStat(value) {
  assert(value !== null && typeof value === "object", "event game stat must be an object");
  assert(Number.isInteger(value.index) && value.index >= 0 && value.index <= 0xff,
    "event game stat index must be raw u8");
  assert(typeof value.symbol === "string", "event game stat symbol must be string");
  return Object.freeze({ index: value.index, symbol: value.symbol });
}

function observationsFromTransition(transition) {
  assert(transition.events.length <= 1, "canonical handler emitted more than one event");
  if (transition.events.length === 0) return null;
  const event = transition.events[0];
  assert(event.kind === "game-stat-increment",
    "canonical handler emitted " + event.kind + " rather than game-stat-increment");
  return vectorGameStat(event.gameStat);
}

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 2, "expected exactly two canonical starts, got " + instructions.length);
assert(instructions.every((instruction) => instruction.opcodeId === OPCODE_ID),
  "canonical starts disagree on opcode id");
assert(instructions.every((instruction) => instruction.dispatcher === DISPATCHER),
  "canonical starts disagree on dispatcher");
assert(instructions.every((instruction) => instruction.operands.length === 1
  && instruction.operands[0]?.widthBytes === 1),
"canonical starts must have one raw-u8 operand");
assert(instructions[0].operands[0].expression === "GAME_STAT_USED_STRUGGLE",
  "first canonical start must be Struggle");
assert(instructions[1].operands[0].expression === "GAME_STAT_USED_SPLASH",
  "second canonical start must be Splash");

const handlers = opcodeModule.createBattleScriptIncrementGameStatOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical opcode handler was not registered");

function sourceOutcome(instruction, projection, applications) {
  assert(applications === 1 || applications === 2,
    "applications must be one or two");
  const initialRules = canonicalRulesFromProjection(projection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  let expectedObservation = undefined;
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        instruction.source.label,
        currentRules,
        (0x7164_0000 + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.control.kind === "advance", "canonical handler did not advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.rulesContext === currentRules,
        "canonical handler replaced no-write rules context");
      assert(sameState(vectorState(currentRules), currentSnapshot),
        "canonical handler mutated current rules");
      const observation = observationsFromTransition(transition);
      if (expectedObservation === undefined) {
        expectedObservation = observation;
      } else {
        assert(JSON.stringify(observation) === JSON.stringify(expectedObservation),
          "repeated canonical handler observation drifted");
      }
      controls.push("advance");
      currentRules = transition.rulesContext;
    }
    assert(currentRules === initialRules, "canonical no-write leaf replaced initial rules");
    assert(sameState(vectorState(initialRules), inputSnapshot),
      "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: freezeArray(controls),
      observation: expectedObservation ?? null,
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated initial rules");
    return Object.freeze({
      expected: null,
      controls: freezeArray(controls),
      observation: null,
      error: error.message,
    });
  }
}

const canonicalGameStatsByExpression = new Map();
let statSalt = 100;
for (const instruction of instructions) {
  const outcome = sourceOutcome(
    instruction,
    makeProjection({ attacker: 0, attackerSide: 0, salt: statSalt++ }),
    1,
  );
  assert(outcome.error === null && outcome.observation !== null,
    "player-side canonical instruction did not emit its stat observation");
  canonicalGameStatsByExpression.set(instruction.operands[0].expression, outcome.observation);
}
assert(canonicalGameStatsByExpression.get("GAME_STAT_USED_SPLASH")?.index === 26,
  "canonical Splash event index drifted");
assert(canonicalGameStatsByExpression.get("GAME_STAT_USED_STRUGGLE")?.index === 27,
  "canonical Struggle event index drifted");

function branchFor(outcome) {
  if (outcome.error !== null) {
    if (outcome.error === "Battle Script hit-chain command requires a attacker role") {
      return "missing-attacker-role";
    }
    throw new Error("unknown canonical handler error " + outcome.error);
  }
  const actor = outcome.observation === null ? "opponent" : "player";
  return actor + "-" + outcome.controls.join("-then-" + actor + "-");
}

function expressionToken(instruction) {
  const expression = instruction.operands[0].expression;
  if (expression === "GAME_STAT_USED_SPLASH") return "splash";
  if (expression === "GAME_STAT_USED_STRUGGLE") return "struggle";
  throw new Error("unexpected canonical expression " + expression);
}

const cases = [];
function addCase(label, category, instruction, projection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid label " + label);
  assert(!cases.some((entry) => entry.label === label), "duplicate case " + label);
  const gameStat = canonicalGameStatsByExpression.get(instruction.operands[0].expression);
  assert(gameStat !== undefined, "missing canonical game stat for " + label);
  const outcome = sourceOutcome(instruction, projection, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    gameStat,
    initial: vectorState(canonicalRulesFromProjection(projection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedObservation: outcome.observation,
    expectedError: outcome.error,
  }));
}

let salt = 1;
for (const instruction of instructions) {
  for (const attacker of BATTLER_DOMAIN) {
    addCase(
      expressionToken(instruction) + "_canonical_slot_a" + attacker,
      "canonical-attacker-slot-side-mapping",
      instruction,
      makeProjection({ attacker, salt: salt++ }),
    );
  }
}

for (const instruction of instructions) {
  for (const attacker of BATTLER_DOMAIN) {
    for (const attackerSide of SIDE_DOMAIN) {
      addCase(
        expressionToken(instruction) + "_resolved_side_a" + attacker + "_s" + attackerSide,
        "resolved-attacker-side-gate",
        instruction,
        makeProjection({ attacker, attackerSide, salt: salt++ }),
      );
    }
  }
}

for (const instruction of instructions) {
  for (const attackerSide of SIDE_DOMAIN) {
    addCase(
      expressionToken(instruction) + "_sibling_edges_s" + attackerSide,
      "integer-edge-and-sibling-preservation",
      instruction,
      makeProjection({ attacker: 3, attackerSide, salt: salt++ }),
    );
  }
}

addCase(
  "struggle_player_repeated",
  "repeated-application-idempotence",
  instructions[0],
  makeProjection({ attacker: 0, attackerSide: 0, salt: salt++ }),
  2,
);
addCase(
  "splash_player_repeated",
  "repeated-application-idempotence",
  instructions[1],
  makeProjection({ attacker: 2, attackerSide: 0, salt: salt++ }),
  2,
);
addCase(
  "struggle_opponent_repeated",
  "repeated-application-idempotence",
  instructions[0],
  makeProjection({ attacker: 1, attackerSide: 1, salt: salt++ }),
  2,
);

for (const instruction of instructions) {
  addCase(
    expressionToken(instruction) + "_missing_attacker",
    "missing-attacker-role",
    instruction,
    makeProjection({ attacker: null, salt: salt++ }),
  );
}

function freezeInstructionSpec(value = {}) {
  const operands = value.operands ?? [{
    widthBytes: 1,
    expression: "GAME_STAT_USED_STRUGGLE",
  }];
  assert(Array.isArray(operands), "registration operands must be an array");
  return Object.freeze({
    opcodeName: value.opcodeName ?? OPCODE_NAME,
    programCounter: value.programCounter ?? instructions[0].programCounter,
    opcodeId: value.opcodeId ?? OPCODE_ID,
    dispatcher: value.dispatcher ?? DISPATCHER,
    operands: freezeArray(operands.map((operand) => Object.freeze({
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
  });
}

function registrationProgram(specs) {
  const sourceInstruction = instructions[0];
  const syntheticInstructions = specs.map((spec) => Object.freeze({
    ...sourceInstruction,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    opcodeName: spec.opcodeName,
    dispatcher: spec.dispatcher,
    operands: freezeArray(spec.operands.map((operand, index) => Object.freeze({
      ...(sourceInstruction.operands[index] ?? sourceInstruction.operands[0]),
      widthBytes: operand.widthBytes,
      expression: operand.expression,
    }))),
  }));
  return Object.freeze({
    ...program,
    instructions: freezeArray(syntheticInstructions),
  });
}

function registrationOutcome(specs) {
  try {
    const registration = opcodeModule.createBattleScriptIncrementGameStatOpcodeHandlers(
      registrationProgram(specs),
    );
    return Object.freeze({
      bindings: freezeArray(Object.keys(registration).map(Number).sort((left, right) => left - right)),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error " + String(error));
    return Object.freeze({ bindings: freezeArray([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid registration label " + label);
  assert(!registrationCases.some((entry) => entry.label === label),
    "duplicate registration case " + label);
  const instructionsForCase = freezeArray(specs.map(freezeInstructionSpec));
  const outcome = registrationOutcome(instructionsForCase);
  registrationCases.push(Object.freeze({
    label,
    instructions: instructionsForCase,
    expectedBindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

const struggleSpec = freezeInstructionSpec({
  programCounter: instructions[0].programCounter,
  operands: [{ widthBytes: 1, expression: "GAME_STAT_USED_STRUGGLE" }],
});
const splashSpec = freezeInstructionSpec({
  programCounter: instructions[1].programCounter,
  operands: [{ widthBytes: 1, expression: "GAME_STAT_USED_SPLASH" }],
});
addRegistrationCase("canonical", [struggleSpec, splashSpec]);
addRegistrationCase("canonical_reversed", [splashSpec, struggleSpec]);
addRegistrationCase("valid_non_source_program_counters", [
  freezeInstructionSpec({ programCounter: 0, operands: struggleSpec.operands }),
  freezeInstructionSpec({ programCounter: 0xffff_ffff, operands: splashSpec.operands }),
]);
addRegistrationCase("no_concrete_starts", []);
addRegistrationCase("foreign_opcode_name_is_not_a_start", [
  freezeInstructionSpec({ opcodeName: "B_SCR_OP_SETTAUNT" }),
]);
addRegistrationCase("only_one_concrete_start", [struggleSpec]);
addRegistrationCase("three_concrete_starts", [struggleSpec, splashSpec, struggleSpec]);
addRegistrationCase("foreign_plus_one_concrete_start", [
  freezeInstructionSpec({ opcodeName: "B_SCR_OP_SETTAUNT" }),
  struggleSpec,
]);
addRegistrationCase("wrong_opcode_id_first", [
  freezeInstructionSpec({ opcodeId: 0x5f }),
  splashSpec,
]);
addRegistrationCase("wrong_dispatcher_first", [
  freezeInstructionSpec({ dispatcher: "Cmd_settaunt" }),
  splashSpec,
]);
addRegistrationCase("missing_operand_first", [
  freezeInstructionSpec({ operands: [] }),
  splashSpec,
]);
addRegistrationCase("extra_operand_first", [
  freezeInstructionSpec({ operands: [
    { widthBytes: 1, expression: "GAME_STAT_USED_STRUGGLE" },
    { widthBytes: 1, expression: "GAME_STAT_USED_SPLASH" },
  ] }),
  splashSpec,
]);
addRegistrationCase("zero_width_operand_first", [
  freezeInstructionSpec({ operands: [{ widthBytes: 0, expression: "GAME_STAT_USED_STRUGGLE" }] }),
  splashSpec,
]);
addRegistrationCase("two_byte_operand_first", [
  freezeInstructionSpec({ operands: [{ widthBytes: 2, expression: "GAME_STAT_USED_STRUGGLE" }] }),
  splashSpec,
]);
addRegistrationCase("unknown_expression_first", [
  freezeInstructionSpec({ operands: [{ widthBytes: 1, expression: "GAME_STAT_POKEMON_CAPTURES" }] }),
  splashSpec,
]);
addRegistrationCase("ordered_malformed_before_unknown", [
  freezeInstructionSpec({
    programCounter: 0x1111,
    operands: [{ widthBytes: 2, expression: "GAME_STAT_USED_STRUGGLE" }],
  }),
  freezeInstructionSpec({
    programCounter: 0x2222,
    operands: [{ widthBytes: 1, expression: "GAME_STAT_POKEMON_CAPTURES" }],
  }),
]);
addRegistrationCase("ordered_unknown_before_malformed", [
  freezeInstructionSpec({
    programCounter: 0x3333,
    operands: [{ widthBytes: 1, expression: "GAME_STAT_POKEMON_CAPTURES" }],
  }),
  freezeInstructionSpec({
    programCounter: 0x4444,
    operands: [{ widthBytes: 2, expression: "GAME_STAT_USED_SPLASH" }],
  }),
]);
addRegistrationCase("second_shape_failure_after_valid_first", [
  struggleSpec,
  freezeInstructionSpec({
    programCounter: 0x5555,
    operands: [{ widthBytes: 2, expression: "GAME_STAT_USED_SPLASH" }],
  }),
]);

function lineAt(source, line) {
  const value = source.split("\n")[line - 1];
  assert(value !== undefined, "missing source line " + line);
  return value;
}

const commandSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c"),
  "utf8",
);
const macroSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "asm", "macros", "battle_script.inc"),
  "utf8",
);
const scriptSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"),
  "utf8",
);
const gameStatSource = fs.readFileSync(
  path.join(workspaceRoot, "reference", "pokeemerald", "include", "constants", "game_stat.h"),
  "utf8",
);
assert(lineAt(commandSource, 427).includes(
  "[B_SCR_OP_INCREMENTGAMESTAT]               = Cmd_incrementgamestat",
), "dispatch evidence drifted");
assert(lineAt(commandSource, 5689) === "static void Cmd_incrementgamestat(void)",
  "handler declaration drifted");
assert(lineAt(commandSource, 5691).trim()
  === "if (GetBattlerSide(gBattlerAttacker) == B_SIDE_PLAYER)",
"attacker side gate drifted");
assert(lineAt(commandSource, 5692).trim()
  === "IncrementGameStat(gBattlescriptCurrInstr[1]);",
"raw-u8 stat read drifted");
assert(lineAt(commandSource, 5694).trim() === "gBattlescriptCurrInstr += 2;",
  "two-byte advance drifted");
assert(lineAt(macroSource, 557).trim() === ".macro incrementgamestat stat:req",
  "macro declaration drifted");
assert(lineAt(macroSource, 558).trim() === ".byte B_SCR_OP_INCREMENTGAMESTAT",
  "macro opcode drifted");
assert(lineAt(macroSource, 559).trim() === ".byte \\stat",
  "macro raw-u8 operand drifted");
assert(lineAt(scriptSource, 897) === "BattleScript_EffectRecoil::",
  "Struggle entry label drifted");
assert(lineAt(scriptSource, 900).trim()
  === "incrementgamestat GAME_STAT_USED_STRUGGLE",
"Struggle call site drifted");
assert(lineAt(scriptSource, 1172) === "BattleScript_EffectSplash::",
  "Splash entry label drifted");
assert(lineAt(scriptSource, 1178).trim()
  === "incrementgamestat GAME_STAT_USED_SPLASH",
"Splash call site drifted");
assert((scriptSource.match(/^\tincrementgamestat /gm) ?? []).length === 2,
  "expected exactly two committed macro invocations");
assert(lineAt(gameStatSource, 30).trim()
  === "#define GAME_STAT_USED_SPLASH                 26",
"Splash stat constant drifted");
assert(lineAt(gameStatSource, 31).trim()
  === "#define GAME_STAT_USED_STRUGGLE               27",
"Struggle stat constant drifted");

const decompDispatchEvidence = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  dispatchLine: 427,
  handlerLine: 5689,
  sideGateLine: 5691,
  rawOperandReadLine: 5692,
  advanceLine: 5694,
});
const macroEvidence = Object.freeze({
  macroName: MACRO_NAME,
  declarationLine: 557,
  opcodeLine: 558,
  operandLine: 559,
  operandWidthBytes: 1,
  encodedWidthBytes: 2,
});
const callSiteEvidence = freezeArray(instructions.map((instruction) => {
  const operand = instruction.operands[0];
  const gameStat = canonicalGameStatsByExpression.get(operand.expression);
  const label = programModule.resolveBattleScriptLabel(program, instruction.source.label);
  assert(label !== undefined, "canonical source label does not resolve");
  assert(gameStat !== undefined, "missing game stat for source site");
  return Object.freeze({
    entryLabel: instruction.source.label,
    entryLabelLine: instruction.source.labelLine,
    entryProgramCounter: label.programCounter,
    statementLine: instruction.source.statementLine,
    invocationMnemonic: instruction.source.invocationMnemonic,
    invocationMacroLine: instruction.source.invocationMacroLine,
    sourceMacro: instruction.source.sourceMacro,
    opcodeMacroLine: instruction.source.sourceMacroLine,
    operandMacroLine: operand.sourceMacroLine,
    gameStatExpression: operand.expression,
    gameStatIndex: gameStat.index,
    instructionProgramCounter: instruction.programCounter,
    encodedWidthBytes: 1 + operand.widthBytes,
  });
}));

function censusBy(values, property) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value[property], (counts.get(value[property]) ?? 0) + 1);
  }
  return freezeArray([...counts.entries()]);
}

function registrationBranch(entry) {
  if (entry.expectedError === null) return "registered";
  if (entry.expectedError.startsWith("B_SCR_OP_INCREMENTGAMESTAT requires exactly")) {
    return "wrong-cardinality";
  }
  if (entry.expectedError.startsWith("invalid B_SCR_OP_INCREMENTGAMESTAT shape")) {
    return "invalid-shape";
  }
  if (entry.expectedError.startsWith("unresolved B_SCR_OP_INCREMENTGAMESTAT raw-u8 operand")) {
    return "unknown-expression";
  }
  throw new Error("unknown registration error " + entry.expectedError);
}

const domainCensus = freezeArray([
  ["battler-slots", BATTLE_SLOTS],
  ["source-sides", SIDE_DOMAIN.length],
  ["canonical-attacker-slots", BATTLER_DOMAIN.length],
  ["attacker-side-combinations", BATTLER_DOMAIN.length * SIDE_DOMAIN.length],
  ["typed-game-stat-expressions", canonicalGameStatsByExpression.size],
  ["concrete-game-stat-starts", instructions.length],
  ["u8-edge-values", U8_EDGE_DOMAIN.length],
  ["u16-edge-values", U16_EDGE_DOMAIN.length],
  ["i32-edge-values", I32_EDGE_DOMAIN.length],
  ["u32-edge-values", U32_EDGE_DOMAIN.length],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const categoryCensus = censusBy(cases, "category");
const branchCensus = censusBy(cases, "branch");
const registrationBranchCensus = censusBy(
  registrationCases.map((entry) => Object.freeze({ branch: registrationBranch(entry) })),
  "branch",
);
assert(cases.length === 33, "bounded handler corpus drifted to " + cases.length);
assert(registrationCases.length === 18,
  "registration corpus drifted to " + registrationCases.length);
for (const attacker of BATTLER_DOMAIN) {
  for (const side of SIDE_DOMAIN) {
    for (const instruction of instructions) {
      assert(cases.some((entry) => entry.category === "resolved-attacker-side-gate"
        && entry.initial.attacker === attacker
        && entry.initial.battlers[attacker].side === side
        && entry.gameStat.symbol === canonicalGameStatsByExpression
          .get(instruction.operands[0].expression).symbol),
      "side matrix missing attacker " + attacker + " side " + side);
    }
  }
}

const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  decompDispatchEvidence,
  macroEvidence,
  callSiteEvidence,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU8(value) {
  assertU8(value, "Rust u8 literal");
  return "0x" + value.toString(16).padStart(2, "0");
}

function rustU16(value) {
  assertU16(value, "Rust u16 literal");
  return "0x" + value.toString(16).padStart(4, "0");
}

function rustI32(value) {
  assertI32(value, "Rust i32 literal");
  if (value === -0x8000_0000) return "i32::MIN";
  if (value === 0x7fff_ffff) return "i32::MAX";
  return String(value);
}

function rustU32(value) {
  assertU32(value, "Rust u32 literal");
  return "0x" + value.toString(16).padStart(8, "0");
}

function rustBattler(value) {
  assertBattler(value, "Rust battler");
  return "BattleScriptIncrementGameStatBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustSide(value) {
  assertSide(value, "Rust side");
  return value === 0
    ? "BattleScriptIncrementGameStatSide::Player"
    : "BattleScriptIncrementGameStatSide::Opponent";
}

function rustGameStat(value) {
  if (value.symbol === "GAME_STAT_USED_SPLASH" && value.index === 26) {
    return "BattleScriptIncrementGameStat::UsedSplash";
  }
  if (value.symbol === "GAME_STAT_USED_STRUGGLE" && value.index === 27) {
    return "BattleScriptIncrementGameStat::UsedStruggle";
  }
  throw new Error("unknown canonical game stat " + JSON.stringify(value));
}

function rustBattlerState(value) {
  return "BattleScriptIncrementGameStatVectorBattlerState { side: " + rustSide(value.side)
    + ", ability: " + rustU8(value.ability)
    + ", hp: " + rustU16(value.hp)
    + ", item: " + rustU16(value.item)
    + ", pp: [" + value.pp.map(rustU8).join(", ") + "]"
    + ", status1: " + rustU32(value.status1)
    + ", status2: " + rustU32(value.status2)
    + ", status3: " + rustU32(value.status3) + " }";
}

function rustSiblings(value) {
  return "BattleScriptIncrementGameStatVectorSiblings { scripting_battler: "
    + rustBattler(value.scriptingBattler)
    + ", current_move: " + rustU16(value.currentMove)
    + ", current_move_position: " + rustU8(value.currentMovePosition)
    + ", move_result_flags: " + rustU8(value.moveResultFlags)
    + ", battle_move_damage: " + rustI32(value.battleMoveDamage)
    + ", hit_marker: " + rustU32(value.hitMarker)
    + ", multi_hit_counter: " + rustU8(value.multiHitCounter)
    + ", bide_dmg: [" + value.bideDmg.map(rustI32).join(", ") + "]"
    + ", locked_moves: [" + value.lockedMoves.map(rustU16).join(", ") + "] }";
}

function rustState(value) {
  return "BattleScriptIncrementGameStatVectorState { battlers: ["
    + value.battlers.map(rustBattlerState).join(", ")
    + "], attacker: " + rustOptionalBattler(value.attacker)
    + ", target: " + rustOptionalBattler(value.target)
    + ", effect_battler: " + rustOptionalBattler(value.effectBattler)
    + ", fainted: " + rustOptionalBattler(value.fainted)
    + ", siblings: " + rustSiblings(value.siblings) + " }";
}

function rustControls(values) {
  return "&[" + values.map((value) => {
    assert(value === "advance", "unknown control " + value);
    return "BattleScriptIncrementGameStatControl::Advance";
  }).join(", ") + "]";
}

function rustRegistrationInstruction(value) {
  return "BattleScriptIncrementGameStatVectorRegistrationInstruction { opcode_name: "
    + rustString(value.opcodeName)
    + ", program_counter: " + value.programCounter
    + ", opcode_id: " + rustU8(value.opcodeId)
    + ", dispatcher: " + rustString(value.dispatcher)
    + ", operand_widths: &[" + value.operands.map((operand) => rustU8(operand.widthBytes)).join(", ") + "]"
    + ", operand_expressions: &[" + value.operands.map((operand) => rustString(operand.expression)).join(", ") + "] }";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-incrementgamestat-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptIncrementGameStatOpcode.ts via node.");
lines.push("// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-incrementgamestat-vectors.mjs.");
lines.push("// Do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_incrementgamestat::{");
lines.push("    BattleScriptIncrementGameStat, BattleScriptIncrementGameStatBattler,");
lines.push("    BattleScriptIncrementGameStatControl, BattleScriptIncrementGameStatSide,");
lines.push("};");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_VECTOR_CORPUS_SHA256: &str =");
lines.push("    " + rustString(corpusSha256) + ";");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_VECTOR_CORPUS_BYTES: usize = "
  + Buffer.byteLength(corpusText) + ";");
lines.push("");
for (const [name, fields] of [
  ["BattleScriptIncrementGameStatVectorBattlerState", [
    "side: BattleScriptIncrementGameStatSide", "ability: u8", "hp: u16", "item: u16",
    "pp: [u8; 4]", "status1: u32", "status2: u32", "status3: u32",
  ]],
  ["BattleScriptIncrementGameStatVectorSiblings", [
    "scripting_battler: BattleScriptIncrementGameStatBattler", "current_move: u16",
    "current_move_position: u8", "move_result_flags: u8", "battle_move_damage: i32",
    "hit_marker: u32", "multi_hit_counter: u8", "bide_dmg: [i32; 4]",
    "locked_moves: [u16; 4]",
  ]],
  ["BattleScriptIncrementGameStatVectorState", [
    "battlers: [BattleScriptIncrementGameStatVectorBattlerState; 4]",
    "attacker: Option<BattleScriptIncrementGameStatBattler>",
    "target: Option<BattleScriptIncrementGameStatBattler>",
    "effect_battler: Option<BattleScriptIncrementGameStatBattler>",
    "fainted: Option<BattleScriptIncrementGameStatBattler>",
    "siblings: BattleScriptIncrementGameStatVectorSiblings",
  ]],
  ["BattleScriptIncrementGameStatVectorCase", [
    "label: &'static str", "category: &'static str", "branch: &'static str",
    "applications: u8", "game_stat: BattleScriptIncrementGameStat",
    "initial: BattleScriptIncrementGameStatVectorState",
    "expected: Option<BattleScriptIncrementGameStatVectorState>",
    "controls: &'static [BattleScriptIncrementGameStatControl]",
    "expected_observation: Option<BattleScriptIncrementGameStat>",
    "expected_error: Option<&'static str>",
  ]],
  ["BattleScriptIncrementGameStatVectorRegistrationInstruction", [
    "opcode_name: &'static str", "program_counter: u32", "opcode_id: u8",
    "dispatcher: &'static str", "operand_widths: &'static [u8]",
    "operand_expressions: &'static [&'static str]",
  ]],
  ["BattleScriptIncrementGameStatRegistrationCase", [
    "label: &'static str",
    "instructions: &'static [BattleScriptIncrementGameStatVectorRegistrationInstruction]",
    "expected_bindings: &'static [u8]", "expected_error: Option<&'static str>",
  ]],
  ["BattleScriptIncrementGameStatDecompDispatchEvidence", [
    "opcode_name: &'static str", "opcode_id: u8", "dispatcher: &'static str",
    "dispatch_line: u32", "handler_line: u32", "side_gate_line: u32",
    "raw_operand_read_line: u32", "advance_line: u32",
  ]],
  ["BattleScriptIncrementGameStatMacroEvidence", [
    "macro_name: &'static str", "declaration_line: u32", "opcode_line: u32",
    "operand_line: u32", "operand_width_bytes: u8", "encoded_width_bytes: u8",
  ]],
  ["BattleScriptIncrementGameStatCallSiteEvidence", [
    "entry_label: &'static str", "entry_label_line: u32", "entry_program_counter: u32",
    "statement_line: u32", "invocation_mnemonic: &'static str",
    "invocation_macro_line: u32", "source_macro: &'static str",
    "opcode_macro_line: u32", "operand_macro_line: u32",
    "game_stat_expression: &'static str", "game_stat_index: u8",
    "instruction_program_counter: u32", "encoded_width_bytes: u8",
  ]],
]) {
  lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
  lines.push("pub struct " + name + " {");
  for (const field of fields) lines.push("    pub " + field + ",");
  lines.push("}");
  lines.push("");
}
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_CANONICAL_DECOMP_DISPATCH_EVIDENCE:");
lines.push("    BattleScriptIncrementGameStatDecompDispatchEvidence =");
lines.push("    BattleScriptIncrementGameStatDecompDispatchEvidence {");
lines.push("        opcode_name: " + rustString(decompDispatchEvidence.opcodeName) + ",");
lines.push("        opcode_id: " + rustU8(decompDispatchEvidence.opcodeId) + ",");
lines.push("        dispatcher: " + rustString(decompDispatchEvidence.dispatcher) + ",");
lines.push("        dispatch_line: " + decompDispatchEvidence.dispatchLine + ",");
lines.push("        handler_line: " + decompDispatchEvidence.handlerLine + ",");
lines.push("        side_gate_line: " + decompDispatchEvidence.sideGateLine + ",");
lines.push("        raw_operand_read_line: " + decompDispatchEvidence.rawOperandReadLine + ",");
lines.push("        advance_line: " + decompDispatchEvidence.advanceLine + ",");
lines.push("    };");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_MACRO_EVIDENCE:");
lines.push("    BattleScriptIncrementGameStatMacroEvidence =");
lines.push("    BattleScriptIncrementGameStatMacroEvidence {");
lines.push("        macro_name: " + rustString(macroEvidence.macroName) + ",");
lines.push("        declaration_line: " + macroEvidence.declarationLine + ",");
lines.push("        opcode_line: " + macroEvidence.opcodeLine + ",");
lines.push("        operand_line: " + macroEvidence.operandLine + ",");
lines.push("        operand_width_bytes: " + rustU8(macroEvidence.operandWidthBytes) + ",");
lines.push("        encoded_width_bytes: " + rustU8(macroEvidence.encodedWidthBytes) + ",");
lines.push("    };");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_CALL_SITE_EVIDENCE:");
lines.push("    [BattleScriptIncrementGameStatCallSiteEvidence; " + callSiteEvidence.length + "] = [");
for (const value of callSiteEvidence) {
  lines.push("    BattleScriptIncrementGameStatCallSiteEvidence {");
  lines.push("        entry_label: " + rustString(value.entryLabel) + ",");
  lines.push("        entry_label_line: " + value.entryLabelLine + ",");
  lines.push("        entry_program_counter: " + value.entryProgramCounter + ",");
  lines.push("        statement_line: " + value.statementLine + ",");
  lines.push("        invocation_mnemonic: " + rustString(value.invocationMnemonic) + ",");
  lines.push("        invocation_macro_line: " + value.invocationMacroLine + ",");
  lines.push("        source_macro: " + rustString(value.sourceMacro) + ",");
  lines.push("        opcode_macro_line: " + value.opcodeMacroLine + ",");
  lines.push("        operand_macro_line: " + value.operandMacroLine + ",");
  lines.push("        game_stat_expression: " + rustString(value.gameStatExpression) + ",");
  lines.push("        game_stat_index: " + rustU8(value.gameStatIndex) + ",");
  lines.push("        instruction_program_counter: " + value.instructionProgramCounter + ",");
  lines.push("        encoded_width_bytes: " + rustU8(value.encodedWidthBytes) + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");
for (const [constant, values, type] of [
  ["BATTLE_SCRIPT_INCREMENT_GAME_STAT_DOMAIN_CENSUS", domainCensus, "u64"],
  ["BATTLE_SCRIPT_INCREMENT_GAME_STAT_CATEGORY_CENSUS", categoryCensus, "usize"],
  ["BATTLE_SCRIPT_INCREMENT_GAME_STAT_BRANCH_CENSUS", branchCensus, "usize"],
  ["BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_BRANCH_CENSUS",
    registrationBranchCensus, "usize"],
]) {
  lines.push("pub const " + constant + ": [(&str, " + type + "); " + values.length + "] = [");
  for (const value of values) {
    lines.push("    (" + rustString(value[0]) + ", " + value[1] + "),");
  }
  lines.push("];");
  lines.push("");
}
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_U8_EDGE_DOMAIN: [u8; "
  + U8_EDGE_DOMAIN.length + "] = [" + U8_EDGE_DOMAIN.map(rustU8).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_U16_EDGE_DOMAIN: [u16; "
  + U16_EDGE_DOMAIN.length + "] = [" + U16_EDGE_DOMAIN.map(rustU16).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_I32_EDGE_DOMAIN: [i32; "
  + I32_EDGE_DOMAIN.length + "] = [" + I32_EDGE_DOMAIN.map(rustI32).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_INCREMENT_GAME_STAT_U32_EDGE_DOMAIN: [u32; "
  + U32_EDGE_DOMAIN.length + "] = [" + U32_EDGE_DOMAIN.map(rustU32).join(", ") + "];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_INCREMENT_GAME_STAT_CASES: [BattleScriptIncrementGameStatVectorCase; "
  + cases.length + "] = [");
for (const value of cases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptIncrementGameStatVectorCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        category: " + rustString(value.category) + ",");
  lines.push("        branch: " + rustString(value.branch) + ",");
  lines.push("        applications: " + rustU8(value.applications) + ",");
  lines.push("        game_stat: " + rustGameStat(value.gameStat) + ",");
  lines.push("        initial: " + rustState(value.initial) + ",");
  lines.push("        expected: " + (value.expected === null
    ? "None" : "Some(" + rustState(value.expected) + ")") + ",");
  lines.push("        controls: " + rustControls(value.controls) + ",");
  lines.push("        expected_observation: " + (value.expectedObservation === null
    ? "None" : "Some(" + rustGameStat(value.expectedObservation) + ")") + ",");
  lines.push("        expected_error: " + (value.expectedError === null
    ? "None" : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_INCREMENT_GAME_STAT_REGISTRATION_CASES:");
lines.push("    [BattleScriptIncrementGameStatRegistrationCase; " + registrationCases.length + "] = [");
for (const value of registrationCases) {
  lines.push("    // " + value.label);
  lines.push("    BattleScriptIncrementGameStatRegistrationCase {");
  lines.push("        label: " + rustString(value.label) + ",");
  lines.push("        instructions: &[" + value.instructions.map(rustRegistrationInstruction).join(", ") + "],");
  lines.push("        expected_bindings: &[" + value.expectedBindings.map(rustU8).join(", ") + "],");
  lines.push("        expected_error: " + (value.expectedError === null
    ? "None" : "Some(" + rustString(value.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
execFileSync("rustfmt", [outputPath], { stdio: "inherit" });
const generated = fs.readFileSync(outputPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES,
  "generated file is too large: " + generated.length);
const generatedSha256 = crypto.createHash("sha256").update(generated).digest("hex");
const generator = fs.readFileSync(scriptPath);
const generatorSha256 = crypto.createHash("sha256").update(generator).digest("hex");
console.log("gen-battle-script-incrementgamestat-vectors: wrote "
  + path.relative(workspaceRoot, outputPath));
console.log("gen-battle-script-incrementgamestat-vectors: " + cases.length + " complete cases");
console.log("gen-battle-script-incrementgamestat-vectors: " + registrationCases.length
  + " registration cases");
console.log("gen-battle-script-incrementgamestat-vectors: domain census "
  + JSON.stringify(domainCensus));
console.log("gen-battle-script-incrementgamestat-vectors: category census "
  + JSON.stringify(categoryCensus));
console.log("gen-battle-script-incrementgamestat-vectors: branch census "
  + JSON.stringify(branchCensus));
console.log("gen-battle-script-incrementgamestat-vectors: registration branch census "
  + JSON.stringify(registrationBranchCensus));
console.log("gen-battle-script-incrementgamestat-vectors: corpus sha256 " + corpusSha256
  + " bytes " + Buffer.byteLength(corpusText));
console.log("gen-battle-script-incrementgamestat-vectors: generated sha256 " + generatedSha256
  + " bytes " + generated.length);
console.log("gen-battle-script-incrementgamestat-vectors: generator sha256 " + generatorSha256
  + " bytes " + generator.length);
