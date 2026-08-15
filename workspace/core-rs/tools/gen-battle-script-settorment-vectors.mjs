#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSettormentOpcode.ts.
// Expected controls, full narrow projections, instruction/error ordering, and
// immutable input behavior are created only by executing the canonical
// TypeScript handler; this script owns bounded input construction and Rust
// literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-settorment-vectors.mjs

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
  "battle_script_settorment_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule, sourceConstants] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSettormentOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSourceConstants.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_SETTORMENT";
const OPCODE_ID = 0xce;
const DISPATCHER = "Cmd_settorment";
const ENTRY_LABEL = "BattleScript_EffectTorment";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const UNRESOLVED_FAILURE_POINTER = "BattleScript_RustTormentUnresolved";
const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3, null]);
const U32_MAX = 0xffff_ffff;
const STATUS2_TORMENT = sourceConstants.BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_TORMENT;
const TORMENT_INPUTS = Object.freeze([0x0000_0000, STATUS2_TORMENT]);
const STATUS2_EDGE_VALUES = Object.freeze([
  0x0000_0000,
  0x0000_0001,
  0x4000_0000,
  0x4000_0001,
  0x7fff_fffe,
  0x7fff_ffff,
  0x8000_0000,
  0x8000_0001,
  0xc000_0000,
  U32_MAX,
]);
const STATUS1_VALUES = Object.freeze([0x0000_0000, 0x0000_0040, 0x0000_0088, 0x0000_0007]);
const STATUS3_VALUES = Object.freeze([0x0000_0000, 0x0000_4000, 0x8000_0001, 0x0100_0001]);
const INVALID_SHAPE_PREFIX = "invalid B_SCR_OP_SETTORMENT shape at program counter ";
const MISSING_TARGET_ERROR = "Battle Script hit-chain command requires a target role";
const UNRESOLVED_TARGET_PREFIX = "Cmd_settorment: unresolved failure target ";

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-settorment-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} must be a u8, got ${value}`);
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff, `${label} must be a u16, got ${value}`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U32_MAX, `${label} must be a u32, got ${value}`);
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
  });
}

function makeBattler(index, salt, status2) {
  assertBattler(index, "battler index");
  assertU32(status2, "generated status2");
  const hp = 70 + ((salt * 29 + index * 31) % 300);
  return freezeBattler({
    side: (index + salt) & 1,
    ability: (salt * 37 + index * 13) & 0xff,
    hp,
    maxHp: hp + 17 + ((salt + index) % 31),
    moves: [
      (33 + salt + index) & 0xffff,
      (45 + salt * 3 + index) & 0xffff,
      (98 + salt * 5 + index) & 0xffff,
      (259 + salt * 7 + index) & 0xffff,
    ],
    pp: [
      (15 + salt + index) & 0xff,
      (35 + salt * 3 + index) & 0xff,
      (40 + salt * 5 + index) & 0xff,
      (30 + salt * 7 + index) & 0xff,
    ],
    status1: STATUS1_VALUES[(salt + index) % STATUS1_VALUES.length],
    status2,
    status3: STATUS3_VALUES[(salt * 3 + index) % STATUS3_VALUES.length],
    item: (186 + salt * 17 + index) & 0xffff,
    statStages: Array.from({ length: 8 }, (_unused, stat) => (salt + index * 3 + stat) % 13),
    partyIndex: (salt + index) % 6,
  }, `generated battler ${index}`);
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
  assertU8(value.contextState.moveResultFlags, "moveResultFlags");
  assertU32(value.contextState.hitMarker, "hitMarker");
  assertU8(value.contextState.multiHitCounter, "multiHitCounter");
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
  focusBattler = target ?? 2,
  focusStatus2 = 0,
} = {}) {
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  assertBattler(focusBattler, "focus battler");
  assertU32(focusStatus2, "focus status2");
  const unrelatedStatus2 = [0x0100_0001, 0x0400_0002, 0x4000_0004, 0x7fff_0008];
  const battlers = BATTLER_DOMAIN.map((battler) => makeBattler(
    battler,
    salt,
    battler === focusBattler ? focusStatus2 : unrelatedStatus2[(salt + battler) % unrelatedStatus2.length],
  ));
  return freezeProjection({
    battlers,
    attacker,
    target,
    effectBattler,
    fainted,
    contextState: {
      scriptingBattler: BATTLER_DOMAIN[(salt + 3) % BATTLER_DOMAIN.length],
      atkCancelerTracker: (salt * 11 + 7) & 0xff,
      battleOutcome: (salt * 13 + 2) & 0xff,
      // The context constructor derives `currentMoveEffect` from the
      // source move table, so retain Torment's concrete legal move id while
      // varying every independent context field around it.
      currentMove: 259,
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
  return rulesModule.createBattleScriptRulesContext({
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
      moveResultFlags: rules.moveResultFlags,
      hitMarker: rules.hitMarker >>> 0,
      multiHitCounter: rules.multiHitCounter,
    }),
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
assert(instruction.source.label === ENTRY_LABEL, `expected entry label ${ENTRY_LABEL}, got ${instruction.source.label}`);
assert(instruction.operands.length === 1, "canonical opcode must have one failure pointer");
assert(instruction.operands[0]?.widthBytes === 4, "canonical failure pointer must be four bytes");
assert(instruction.operands[0]?.expression === FAILURE_POINTER, "canonical failure pointer drifted");
assert(STATUS2_TORMENT === 0x8000_0000, `STATUS2_TORMENT drifted to ${STATUS2_TORMENT}`);
assert(programModule.resolveBattleScriptLabel(program, FAILURE_POINTER), "canonical failure pointer must resolve");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_FAILURE_POINTER), "unresolved pointer unexpectedly resolves");

const handlers = opcodeModule.createBattleScriptSettormentOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SETTORMENT handler was not registered");

function freezeInstructionSpec({
  programCounter = instruction.programCounter,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions = [FAILURE_POINTER],
} = {}) {
  assertU32(programCounter, "instruction programCounter");
  assertU8(opcodeId, "instruction opcodeId");
  assert(typeof dispatcher === "string", "instruction dispatcher must be a string");
  assert(Array.isArray(operandWidths), "instruction operandWidths must be an array");
  assert(Array.isArray(operandExpressions), "instruction operandExpressions must be an array");
  assert(operandWidths.length === operandExpressions.length, "operand width/expression counts must match");
  operandWidths.forEach((width, index) => assertU8(width, `operandWidths[${index}]`));
  operandExpressions.forEach((expression, index) => assert(typeof expression === "string", `operandExpressions[${index}] must be a string`));
  return Object.freeze({
    programCounter,
    opcodeId,
    dispatcher,
    operandWidths: Object.freeze([...operandWidths]),
    operandExpressions: Object.freeze([...operandExpressions]),
  });
}

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...instruction.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...instruction,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: Object.freeze(operands),
  });
}

function vectorInstruction(spec) {
  const sourceInstruction = instructionFromSpec(spec);
  const first = sourceInstruction.operands[0];
  const entry = first === undefined
    ? undefined
    : programModule.resolveBattleScriptLabel(program, first.expression);
  return Object.freeze({
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    // The native leaf deliberately stays independent of absolute machine
    // cursors, while this expression proves the exact operand's lookup was
    // successful (including a source-label alias, if one is used later).
    resolvedFailureTarget: entry === undefined ? null : first.expression,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return "advance";
  if (transition.control.kind === "jump") return "fail-jump";
  throw new Error(`canonical handler returned unsupported control ${transition.control.kind}`);
}

function assertCanonicalTransition(currentRules, sourceInstruction, transition) {
  const target = currentRules.selectorRoles.target;
  assert(target !== null, "successful canonical handler had no target");
  assert(sourceInstruction.opcodeId === OPCODE_ID, "successful handler had wrong opcode id");
  assert(sourceInstruction.dispatcher === DISPATCHER, "successful handler had wrong dispatcher");
  assert(sourceInstruction.operands.length === 1, "successful handler had malformed operand count");
  assert(sourceInstruction.operands[0]?.widthBytes === 4, "successful handler had malformed pointer width");
  const control = controlFromTransition(transition);
  const targetStatus2 = currentRules.battlers[target].status2;

  assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
  if ((targetStatus2 & STATUS2_TORMENT) !== 0) {
    assert(control === "fail-jump", "already-Tormented branch did not jump");
    assert(transition.rulesContext === currentRules, "already-Tormented branch changed narrow state");
    return control;
  }

  assert(control === "advance", "clear target did not advance");
  assert(transition.rulesContext !== currentRules, "success reused complete rules context");
  assert(transition.rulesContext.selectorRoles === currentRules.selectorRoles, "success replaced selector roles");
  assert(transition.rulesContext.battlers !== currentRules.battlers, "success did not replace battler collection");
  for (const battler of BATTLER_DOMAIN) {
    if (battler === target) {
      assert(transition.rulesContext.battlers[battler] !== currentRules.battlers[battler], "success did not replace target battler");
      assert(
        transition.rulesContext.battlers[battler].status2
          === ((currentRules.battlers[battler].status2 | STATUS2_TORMENT) >>> 0),
        "success did not OR STATUS2_TORMENT into target status2",
      );
    } else {
      assert(
        transition.rulesContext.battlers[battler] === currentRules.battlers[battler],
        `success replaced sibling battler ${battler}`,
      );
    }
  }
  return control;
}

function sourceOutcome(initialProjection, instructionSpec, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const sourceInstruction = instructionFromSpec(instructionSpec);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
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
      const transition = handler({ program, instruction: sourceInstruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      controls.push(assertCanonicalTransition(currentRules, sourceInstruction, transition));
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated initial rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated initial rules");
    return Object.freeze({ expected: null, controls: Object.freeze(controls), error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.controls.join("-then-");
  if (outcome.error.startsWith(INVALID_SHAPE_PREFIX)) return "invalid-instruction-shape";
  if (outcome.error === MISSING_TARGET_ERROR) return "missing-target-role";
  if (outcome.error.startsWith(UNRESOLVED_TARGET_PREFIX)) return "unresolved-failure-target";
  throw new Error(`unexpected canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, initialProjection, {
  applications = 1,
  instructionSpec = CANONICAL_INSTRUCTION,
} = {}) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(Number.isInteger(applications) && applications >= 1 && applications <= 2, `${label}: applications must be 1 or 2`);
  const outcome = sourceOutcome(initialProjection, instructionSpec, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    instruction: vectorInstruction(instructionSpec),
    initial: vectorState(canonicalRulesFromProjection(initialProjection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

for (const target of BATTLER_DOMAIN) {
  for (const [inputIndex, status2] of TORMENT_INPUTS.entries()) {
    addCase(
      `target_t${target}_torment_${inputIndex === 0 ? "clear" : "set"}`,
      "target-torment-clear-set-matrix",
      makeProjection({
        salt: target * TORMENT_INPUTS.length + inputIndex,
        target,
        focusBattler: target,
        focusStatus2: status2,
      }),
    );
  }
}

const status2EdgeLabels = [
  "zero",
  "low_bit",
  "neighbor_below",
  "neighbor_below_plus_low",
  "all_below_except_low",
  "all_below",
  "torment_only",
  "torment_plus_low",
  "torment_plus_neighbor_below",
  "max",
];
for (const target of BATTLER_DOMAIN) {
  for (const [edgeIndex, status2] of STATUS2_EDGE_VALUES.entries()) {
    addCase(
      `status2_edge_t${target}_${status2EdgeLabels[edgeIndex]}`,
      "status2-u32-torment-edge-matrix",
      makeProjection({
        salt: 100 + target * STATUS2_EDGE_VALUES.length + edgeIndex,
        target,
        focusBattler: target,
        focusStatus2: status2,
      }),
    );
  }
}

for (const target of BATTLER_DOMAIN) {
  for (const attacker of OPTIONAL_BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        const salt = 1_000
          + target * 125
          + (attacker ?? 4) * 25
          + (effectBattler ?? 4) * 5
          + (fainted ?? 4);
        addCase(
          `selectors_t${target}_a${attacker ?? "n"}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
          "complete-target-attacker-effect-fainted-selector-matrix",
          makeProjection({
            salt,
            target,
            attacker,
            effectBattler,
            fainted,
            focusBattler: target,
            focusStatus2: 0x4000_0001,
          }),
        );
      }
    }
  }
}

addCase(
  "target_only_mutation_preserves_all_battler_role_and_context_siblings",
  "target-only-full-state-preservation",
  makeProjection({
    salt: 3_000,
    target: 2,
    attacker: 1,
    effectBattler: 3,
    fainted: 0,
    focusBattler: 2,
    focusStatus2: 0x4000_0101,
  }),
);

addCase(
  "already_tormented_fail_jump_preserves_full_state",
  "already-tormented-fail-jump-preservation",
  makeProjection({
    salt: 3_001,
    target: 1,
    attacker: 3,
    effectBattler: 0,
    fainted: 2,
    focusBattler: 1,
    focusStatus2: 0xc000_0101,
  }),
);

addCase(
  "success_skips_unresolved_failure_label",
  "success-skips-label-resolution",
  makeProjection({
    salt: 3_002,
    target: 0,
    focusBattler: 0,
    focusStatus2: 0x4000_0001,
  }),
  {
    instructionSpec: freezeInstructionSpec({ operandExpressions: [UNRESOLVED_FAILURE_POINTER] }),
  },
);

addCase(
  "missing_target_role_precedes_status2_read_and_label_resolution",
  "missing-target-role",
  makeProjection({
    salt: 3_003,
    target: null,
    focusBattler: 2,
    focusStatus2: U32_MAX,
  }),
  {
    instructionSpec: freezeInstructionSpec({ operandExpressions: [UNRESOLVED_FAILURE_POINTER] }),
  },
);

for (const [index, specification] of [
  ["invalid_opcode", freezeInstructionSpec({ programCounter: 61_001, opcodeId: 0xcd })],
  ["invalid_dispatcher", freezeInstructionSpec({ programCounter: 61_002, dispatcher: "Cmd_settaunt" })],
  ["missing_operand", freezeInstructionSpec({ programCounter: 61_003, operandWidths: [], operandExpressions: [] })],
  ["extra_operand", freezeInstructionSpec({ programCounter: 61_004, operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })],
  ["wrong_width", freezeInstructionSpec({ programCounter: 61_005, operandWidths: [2] })],
]) {
  addCase(
    `${index}_precedes_target_role`,
    "invalid-instruction-shape-before-target-role",
    makeProjection({
      salt: 3_100 + specification.programCounter,
      target: null,
      focusBattler: 2,
      focusStatus2: U32_MAX,
    }),
    { instructionSpec: specification },
  );
}

addCase(
  "unresolved_failure_target_after_target_status2_read",
  "unresolved-failure-target",
  makeProjection({
    salt: 3_200,
    target: 3,
    focusBattler: 3,
    focusStatus2: (STATUS2_TORMENT | 0x4000_0001) >>> 0,
  }),
  {
    instructionSpec: freezeInstructionSpec({ operandExpressions: [UNRESOLVED_FAILURE_POINTER] }),
  },
);

addCase(
  "repeated_clear_target_advances_then_fail_jumps",
  "repeated-application",
  makeProjection({
    salt: 3_300,
    target: 3,
    focusBattler: 3,
    focusStatus2: 0x4000_0101,
  }),
  { applications: 2 },
);

addCase(
  "repeated_tormented_target_fail_jumps_idempotently",
  "repeated-application",
  makeProjection({
    salt: 3_301,
    target: 0,
    focusBattler: 0,
    focusStatus2: 0x8000_0101,
  }),
  { applications: 2 },
);

assert(cases.length === 560, `case count drifted: ${cases.length}`);
for (const target of BATTLER_DOMAIN) {
  for (const status2 of TORMENT_INPUTS) {
    assert(
      cases.some((value) =>
        value.category === "target-torment-clear-set-matrix"
        && value.initial.target === target
        && value.initial.battlers[target].status2 === status2
      ),
      `target matrix omits target ${target} status2 ${status2}`,
    );
  }
  for (const status2 of STATUS2_EDGE_VALUES) {
    assert(
      cases.some((value) =>
        value.category === "status2-u32-torment-edge-matrix"
        && value.initial.target === target
        && value.initial.battlers[target].status2 === status2
      ),
      `status2 edge matrix omits target ${target} status2 ${status2}`,
    );
  }
}
for (const target of BATTLER_DOMAIN) {
  for (const attacker of OPTIONAL_BATTLER_DOMAIN) {
    for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
      for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
        assert(
          cases.some((value) =>
            value.category === "complete-target-attacker-effect-fainted-selector-matrix"
            && value.initial.target === target
            && value.initial.attacker === attacker
            && value.initial.effectBattler === effectBattler
            && value.initial.fainted === fainted
          ),
          `selector matrix omits t${target}/a${attacker}/e${effectBattler}/f${fainted}`,
        );
      }
    }
  }
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-selector-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["selector-role-combinations-with-concrete-target", BATTLER_DOMAIN.length * OPTIONAL_BATTLER_DOMAIN.length ** 3],
  ["status2-u32-values", U32_MAX + 1],
  ["status2-torment-clear-set-inputs", TORMENT_INPUTS.length],
  ["status2-torment-edge-values", STATUS2_EDGE_VALUES.length],
  ["instruction-shape-variants", 6],
  ["failure-pointer-width-bytes", 4],
  ["control-branch-values", 2],
  ["application-count-values", 2],
  ["typed-missing-target-combinations", 1],
]);
const corpus = Object.freeze({
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  entryLabel: ENTRY_LABEL,
  failurePointer: FAILURE_POINTER,
  targetDomain: BATTLER_DOMAIN,
  optionalSelectorDomain: OPTIONAL_BATTLER_DOMAIN,
  status2TormentMask: STATUS2_TORMENT,
  tormentInputDomain: TORMENT_INPUTS,
  status2EdgeDomain: STATUS2_EDGE_VALUES,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
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
  return `BattleScriptSettormentBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustControl(value) {
  return value === "advance"
    ? "BattleScriptSettormentControl::Advance"
    : "BattleScriptSettormentControl::FailJump";
}

function rustControls(values) {
  return `&[${values.map(rustControl).join(", ")}]`;
}

function rustBattlerState(value) {
  return [
    "BattleScriptSettormentVectorBattlerState {",
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
    "}",
  ].join(" ");
}

function rustContextState(value) {
  return [
    "BattleScriptSettormentVectorContextState {",
    `scripting_battler: ${rustBattler(value.scriptingBattler)},`,
    `atk_canceler_tracker: ${rustU8(value.atkCancelerTracker)},`,
    `battle_outcome: ${rustU8(value.battleOutcome)},`,
    `current_move: ${rustU16(value.currentMove)},`,
    `current_move_position: ${rustU8(value.currentMovePosition)},`,
    `move_result_flags: ${rustU8(value.moveResultFlags)},`,
    `hit_marker: ${rustU32(value.hitMarker)},`,
    `multi_hit_counter: ${rustU8(value.multiHitCounter)},`,
    "}",
  ].join(" ");
}

function rustState(value) {
  return [
    "BattleScriptSettormentVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    `context_state: ${rustContextState(value.contextState)},`,
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
    "BattleScriptSettormentVectorInstruction {",
    `program_counter: ${value.programCounter},`,
    `opcode_id: ${rustU8(value.opcodeId)},`,
    `dispatcher: ${rustString(value.dispatcher)},`,
    `operand_widths: &[${value.operandWidths.map(rustU8).join(", ")}],`,
    `operand_expressions: &[${value.operandExpressions.map(rustString).join(", ")}],`,
    `resolved_failure_target: ${value.resolvedFailureTarget === null ? "None" : `Some(${rustString(value.resolvedFailureTarget)})`},`,
    "}",
  ].join(" ");
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-settorment-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSettormentOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_settorment::{BattleScriptSettormentBattler, BattleScriptSettormentControl};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_TARGET_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = [${BATTLER_DOMAIN.join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_STATUS2_TORMENT_INPUT_DOMAIN: [u32; ${TORMENT_INPUTS.length}] = [${TORMENT_INPUTS.map(rustU32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_STATUS2_EDGE_DOMAIN: [u32; ${STATUS2_EDGE_VALUES.length}] = [${STATUS2_EDGE_VALUES.map(rustU32).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettormentVectorBattlerState {");
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
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettormentVectorContextState {");
lines.push("    pub scripting_battler: BattleScriptSettormentBattler,");
lines.push("    pub atk_canceler_tracker: u8,");
lines.push("    pub battle_outcome: u8,");
lines.push("    pub current_move: u16,");
lines.push("    pub current_move_position: u8,");
lines.push("    pub move_result_flags: u8,");
lines.push("    pub hit_marker: u32,");
lines.push("    pub multi_hit_counter: u8,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettormentVectorState {");
lines.push("    pub battlers: [BattleScriptSettormentVectorBattlerState; 4],");
lines.push("    pub attacker: Option<BattleScriptSettormentBattler>,");
lines.push("    pub target: Option<BattleScriptSettormentBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptSettormentBattler>,");
lines.push("    pub fainted: Option<BattleScriptSettormentBattler>,");
lines.push("    pub context_state: BattleScriptSettormentVectorContextState,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettormentVectorInstruction {");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_widths: &'static [u8],");
lines.push("    pub operand_expressions: &'static [&'static str],");
lines.push("    pub resolved_failure_target: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSettormentVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub instruction: BattleScriptSettormentVectorInstruction,");
lines.push("    pub initial: BattleScriptSettormentVectorState,");
lines.push("    pub expected: Option<BattleScriptSettormentVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSettormentControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SETTORMENT_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];" );
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SETTORMENT_CASES: [BattleScriptSettormentVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSettormentVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];" );

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
if (!formatted) throw new Error("gen-battle-script-settorment-vectors: could not find rustfmt");

const generatedBytes = fs.readFileSync(outPath);
const generatedHash = crypto.createHash("sha256").update(generatedBytes).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");
console.log(`gen-battle-script-settorment-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-settorment-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-settorment-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-settorment-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-settorment-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-settorment-vectors: corpus sha256 ${corpusHash} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-settorment-vectors: generated sha256 ${generatedHash} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-settorment-vectors: generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
