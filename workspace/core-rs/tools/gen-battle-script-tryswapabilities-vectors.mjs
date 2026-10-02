#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTryswapabilitiesOpcode.ts.
//
// Expected controls, projected output, ordered errors, and registration are
// produced only by calling the canonical TypeScript handler. This generator
// owns bounded input construction and Rust literal emission; it must not
// independently implement Skill Swap behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-tryswapabilities-vectors.mjs

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
  "battle_script_tryswapabilities_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTryswapabilitiesOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSWAPABILITIES";
const OPCODE_ID = 0xda;
const DISPATCHER = "Cmd_tryswapabilities";
const ENTRY_LABEL = "BattleScript_EffectSkillSwap";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustSkillSwapUnresolved";
const ABILITY_NONE = 0;
const ABILITY_WONDER_GUARD = 25;
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const ABILITIES = Object.freeze([ABILITY_NONE, 1, 12, 46, 77, ABILITY_WONDER_GUARD]);
// MOVE_RESULT_MISSED=1<<0, MOVE_RESULT_DOESNT_AFFECT_FOE=1<<3, MOVE_RESULT_FAILED=1<<5.
const NO_EFFECT_BITS = Object.freeze([1 << 0, 1 << 3, 1 << 5]);
const NO_EFFECT_MASK = NO_EFFECT_BITS.reduce((a, b) => a | b, 0);
const MOVE_RESULT_FLAGS = Object.freeze([0, ...NO_EFFECT_BITS, 1 << 1, NO_EFFECT_MASK]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-tryswapabilities-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(BATTLERS.includes(value), `${label} must be a battler id 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} must be u8`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `${label} must be u32`);
}

const TOPOLOGIES = Object.freeze([
  Object.freeze({
    label: "singles",
    battlersCount: 2,
    battleTypeFlags: 0x8000_0008,
    battlerPositions: Object.freeze([0, 1, 0xfe, 0xff]),
  }),
  Object.freeze({
    label: "doubles",
    battlersCount: 4,
    battleTypeFlags: (1 | 0x0008_0008) >>> 0,
    battlerPositions: Object.freeze([0, 1, 2, 3]),
  }),
]);

function projectionBattlerSalt(index, salt) {
  return Object.freeze({
    status1: (index * 0x101 + salt) >>> 0,
    status2: (0x4000_0000 ^ (index + salt * 7)) >>> 0,
    item: (index * 31 + salt) & 0xffff,
    personality: (0x1357_0000 ^ ((salt * 0x1111 + index) >>> 0)) >>> 0,
  });
}

// Builds one full rules projection: `count` battlers, attacker/target get the
// given abilities, remaining battlers get a salted "noise" ability, proving
// only the two resolved cells ever change.
function makeProjection({ topology, attacker, target, attackerAbility, targetAbility, moveResultFlags, salt }) {
  const count = topology.battlersCount;
  assertOptionalBattler(attacker, "attacker");
  assertOptionalBattler(target, "target");
  const battlers = BATTLERS.map((index) => {
    let ability;
    if (index === attacker) ability = attackerAbility;
    else if (index === target) ability = targetAbility;
    else ability = (11 + index * 13 + salt) & 0xff;
    return Object.freeze({
      ability,
      ...projectionBattlerSalt(index, salt),
    });
  });
  return Object.freeze({
    topology,
    attacker,
    target,
    moveResultFlags,
    battlers: Object.freeze(battlers),
    context: Object.freeze({
      scriptingBattler: (salt + 1) & 3,
      currentMove: 285,
      hitMarker: (0x9000_0001 ^ ((salt * 0x10101) >>> 0)) >>> 0,
    }),
  });
}

function canonicalBattler(projection, index) {
  const hp = 60 + index * 13;
  return Object.freeze({
    side: index & 1,
    ability: projection.battlers[index].ability,
    hp,
    maxHP: hp + 20,
    moves: Object.freeze([33, 0, 0, 0]),
    pp: Object.freeze([10, 0, 0, 0]),
    status1: projection.battlers[index].status1,
    status2: projection.battlers[index].status2,
    status3: 0,
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
    item: projection.battlers[index].item,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    personality: projection.battlers[index].personality,
    attack: 100 + index,
    defense: 110 + index,
    spAttack: 120 + index,
    spDefense: 130 + index,
    speed: 140 + index,
    level: 50,
    friendship: 70,
    partyIndex: index,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(BATTLERS.map((index) => canonicalBattler(projection, index))),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: null,
      fainted: null,
    }),
    scriptingBattler: projection.context.scriptingBattler,
    atkCancelerTracker: 7,
    battleOutcome: 2,
    currentMove: projection.context.currentMove,
    currentMovePosition: 1,
    moveResultFlags: projection.moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: projection.context.hitMarker,
    multiHitCounter: 4,
    party: {
      player: [{}, {}, {}, {}, {}, {}],
      opponent: [{}, {}, {}, {}, {}, {}],
    },
  });
}

function vectorBattlerState(battler) {
  return Object.freeze({ ability: battler.ability });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    moveResultFlags: rules.moveResultFlags >>> 0,
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical Skill Swap singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(canonicalInstruction.programCounter === 1785, "canonical program counter drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_POINTER, "canonical pointer drifted");
const resolvedFailure = programModule.resolveBattleScriptLabel(program, FAILURE_POINTER);
assert(resolvedFailure, "failure label must resolve");
assert(resolvedFailure.programCounter === 1434, "canonical failure target program counter drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTryswapabilitiesOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical Skill Swap handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter = 1785,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions = [FAILURE_POINTER],
} = {}) {
  assert(typeof opcodeName === "string", "opcodeName must be a string");
  assertU32(programCounter, "program counter");
  assertU8(opcodeId, "opcode id");
  assert(typeof dispatcher === "string", "dispatcher must be a string");
  assert(Array.isArray(operandWidths) && Array.isArray(operandExpressions), "operands must be arrays");
  assert(operandWidths.length === operandExpressions.length, "operand shapes disagree");
  operandWidths.forEach((width, index) => assertU8(width, `operand width ${index}`));
  operandExpressions.forEach((expression, index) => assert(typeof expression === "string", `operand expression ${index}`));
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
  const instruction = instructionFromSpec(spec);
  const operand = instruction.operands[0];
  const resolved = operand === undefined ? undefined
    : programModule.resolveBattleScriptLabel(program, operand.expression);
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operandWidths: Object.freeze([...spec.operandWidths]),
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedFailureExpression: resolved === undefined ? null : operand.expression,
    resolvedFailureProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(projection, instructionSpec, salt) {
  const initialRules = canonicalRulesFromProjection(projection);
  const inputSnapshot = vectorState(initialRules);
  try {
    const state = Object.freeze({
      ...machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        initialRules,
        (0x1357_9bdf + salt) >>> 0,
      ),
    });
    const transition = handler({
      program,
      instruction: instructionFromSpec(instructionSpec),
      state,
    });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
    assert(transition.rng === state.rng, "canonical handler changed RNG");
    assert(transition.events.length === 0, "canonical handler emitted event(s)");
    assert(same(vectorState(initialRules), inputSnapshot), "canonical handler mutated input");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(Object.isFrozen(transition.rulesContext.selectorRoles), "canonical selector roles must be frozen");
    const control = controlFromTransition(transition);
    return Object.freeze({
      initial: inputSnapshot,
      expected: vectorState(transition.rulesContext),
      control,
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    assert(same(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input");
    return Object.freeze({
      initial: inputSnapshot,
      expected: null,
      control: null,
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.startsWith("invalid B_SCR_OP_TRYSWAPABILITIES shape")) return "invalid-instruction-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.startsWith("Cmd_tryswapabilities: unresolved failure target")) return "unresolved-failure-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec = CANONICAL_INSTRUCTION) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instructionSpec, cases.length + 31);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: outcome.initial,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    control: outcome.control,
    expectedError: outcome.error,
  }));
}

// One representative (attacker, target) role pair per active battler slot
// per topology (attacker = i, target = (i + 1) % count), rather than the
// full attacker-target permutation space -- the fail predicate is symmetric
// in the ability terms and independent of role identity, and role-order
// correctness (which battler's ability ends up where) is separately pinned
// by unit tests in battle_script_tryswapabilities.rs.
function rolePairs(topology) {
  const count = topology.battlersCount;
  return Array.from({ length: count }, (_, attacker) => ({
    attacker,
    target: (attacker + 1) % count,
  }));
}

// Ability x ability matrix (moveResultFlags fixed at 0): covers both-none,
// one-none, either Wonder Guard, and ordinary swaps.
for (const topology of TOPOLOGIES) {
  for (const { attacker, target } of rolePairs(topology)) {
    for (const attackerAbility of ABILITIES) {
      for (const targetAbility of ABILITIES) {
        addCase(
          `ability_matrix_${topology.label}_a${attacker}_t${target}_aa${attackerAbility}_ta${targetAbility}`,
          "dense-ability-matrix",
          makeProjection({
            topology,
            attacker,
            target,
            attackerAbility,
            targetAbility,
            moveResultFlags: 0,
            salt: cases.length + 17,
          }),
        );
      }
    }
  }
}

// moveResultFlags sweep (abilities fixed at an ordinary non-failing pair):
// covers each individual NO_EFFECT component bit, an unrelated bit only,
// and the full mask, independent of the ability-based fail predicates.
for (const topology of TOPOLOGIES) {
  for (const { attacker, target } of rolePairs(topology)) {
    for (const moveResultFlags of MOVE_RESULT_FLAGS) {
      addCase(
        `flags_sweep_${topology.label}_a${attacker}_t${target}_mrf${moveResultFlags}`,
        "dense-move-result-flags-sweep",
        makeProjection({
          topology,
          attacker,
          target,
          attackerAbility: 39,
          targetAbility: 5,
          moveResultFlags,
          salt: cases.length + 4000,
        }),
      );
    }
  }
}

// Missing roles precede the ability/flag evaluation entirely.
addCase("missing_attacker_role", "missing-attacker-role", makeProjection({
  topology: TOPOLOGIES[1],
  attacker: null,
  target: 1,
  attackerAbility: 39,
  targetAbility: 5,
  moveResultFlags: 0,
  salt: cases.length + 5000,
}));
addCase("missing_target_role", "missing-target-role", makeProjection({
  topology: TOPOLOGIES[1],
  attacker: 0,
  target: null,
  attackerAbility: 39,
  targetAbility: 5,
  moveResultFlags: 0,
  salt: cases.length + 5100,
}));
addCase("both_roles_missing", "missing-attacker-role", makeProjection({
  topology: TOPOLOGIES[1],
  attacker: null,
  target: null,
  attackerAbility: 39,
  targetAbility: 5,
  moveResultFlags: 0,
  salt: cases.length + 5200,
}));

// Malformed instruction shapes must fail before the roles are even read.
for (const [label, spec] of [
  ["malformed_opcode_before_roles", freezeInstructionSpec({ opcodeId: 0xd0 })],
  ["malformed_dispatcher_before_roles", freezeInstructionSpec({ dispatcher: "Cmd_other" })],
  ["malformed_no_operand_before_roles", freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands_before_roles", freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })],
  ["malformed_pointer_width_before_roles", freezeInstructionSpec({ operandWidths: [1] })],
]) {
  addCase(label, "malformed-shape-before-roles", makeProjection({
    topology: TOPOLOGIES[1],
    attacker: null,
    target: null,
    attackerAbility: 39,
    targetAbility: 5,
    moveResultFlags: 0,
    salt: cases.length + 6000,
  }), spec);
}

// Late failure-label resolution: a failing case whose failure pointer is
// unresolved must surface the typed error only after the roles are proven
// present and the fail predicate evaluated true.
addCase("unresolved_failure_target_when_both_none", "unresolved-failure-target", makeProjection({
  topology: TOPOLOGIES[1],
  attacker: 0,
  target: 1,
  attackerAbility: ABILITY_NONE,
  targetAbility: ABILITY_NONE,
  moveResultFlags: 0,
  salt: cases.length + 7000,
}), freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));
addCase("unresolved_failure_target_not_reached_on_success", "late-label-resolution", makeProjection({
  topology: TOPOLOGIES[1],
  attacker: 0,
  target: 1,
  attackerAbility: 39,
  targetAbility: 5,
  moveResultFlags: 0,
  salt: cases.length + 7100,
}), freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }));

function sourceRegistration(specs) {
  const instructions = Object.freeze(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTryswapabilitiesOpcodeHandlers(customProgram);
    const keys = Object.keys(registered);
    assert(keys.length === 1, "canonical registration emitted more than one key");
    return Object.freeze({ opcodeId: Number(keys[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, specs) {
  const outcome = sourceRegistration(specs);
  registrationCases.push(Object.freeze({
    label,
    instructions: Object.freeze(specs.map(vectorInstruction)),
    expectedOpcodeId: outcome.opcodeId,
    expectedError: outcome.error,
  }));
}

const noise = freezeInstructionSpec({ opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [], operandExpressions: [] });
addRegistration("canonical_singleton", [CANONICAL_INSTRUCTION]);
addRegistration("canonical_singleton_ignores_noise", [noise, CANONICAL_INSTRUCTION, noise]);
addRegistration("wrong_cardinality_none", [noise]);
addRegistration("wrong_cardinality_two_selected", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]);
addRegistration("wrong_cardinality_three_selected", [CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION, CANONICAL_INSTRUCTION]);
addRegistration("invalid_shape_opcode", [freezeInstructionSpec({ opcodeId: 0xd0 })]);
addRegistration("invalid_shape_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_wrong" })]);
addRegistration("invalid_shape_no_operands", [freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })]);
addRegistration("invalid_shape_two_operands", [freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_POINTER, FAILURE_POINTER] })]);
addRegistration("invalid_shape_pointer_width", [freezeInstructionSpec({ operandWidths: [1] })]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered" : value.expectedError.startsWith("B_SCR_OP_TRYSWAPABILITIES requires")
    ? "wrong-cardinality" : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["topology-variants", TOPOLOGIES.length],
  ["ability-values", ABILITIES.length],
  ["move-result-flag-values", MOVE_RESULT_FLAGS.length],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  topologyVariants: TOPOLOGIES,
  abilities: ABILITIES,
  moveResultFlags: MOVE_RESULT_FLAGS,
  domainCensus,
  categoryCensus,
  branchCensus,
  registrationBranchCensus,
  cases,
  registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generator = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generator).digest("hex");

function rustString(value) { return JSON.stringify(value); }
function rustU8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function rustU32(value) { return `0x${value.toString(16).padStart(8, "0")}`; }
function rustBattler(value) { return `BattleScriptTryswapabilitiesBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptTryswapabilitiesControl::Advance"
    : `BattleScriptTryswapabilitiesControl::Jump { program_counter: ${value.programCounter} }`;
}
function rustBattlerState(value) {
  return `BattleScriptTryswapabilitiesVectorBattlerState { ability: ${rustU8(value.ability)} }`;
}
function rustState(value) {
  return [
    "BattleScriptTryswapabilitiesVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `move_result_flags: ${rustU32(value.moveResultFlags)},`,
    "}",
  ].join(" ");
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTryswapabilitiesOperand { width_bytes: ${rustU8(width)}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptTryswapabilitiesResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptTryswapabilitiesInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${rustU8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalControl(value) { return value === null ? "None" : `Some(${rustControl(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-tryswapabilities-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTryswapabilitiesOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_tryswapabilities::{");
lines.push("    BattleScriptTryswapabilitiesBattler, BattleScriptTryswapabilitiesControl,");
lines.push("    BattleScriptTryswapabilitiesInstruction, BattleScriptTryswapabilitiesOperand,");
lines.push("    BattleScriptTryswapabilitiesResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSWAPABILITIES_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryswapabilitiesVectorBattlerState { pub ability: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryswapabilitiesVectorState { pub battlers: [BattleScriptTryswapabilitiesVectorBattlerState; 4], pub attacker: Option<BattleScriptTryswapabilitiesBattler>, pub target: Option<BattleScriptTryswapabilitiesBattler>, pub move_result_flags: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryswapabilitiesVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTryswapabilitiesVectorState, pub instruction: BattleScriptTryswapabilitiesInstruction<'static>, pub expected: Option<BattleScriptTryswapabilitiesVectorState>, pub control: Option<BattleScriptTryswapabilitiesControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryswapabilitiesRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTryswapabilitiesInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSWAPABILITIES_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSWAPABILITIES_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSWAPABILITIES_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSWAPABILITIES_CASES: [BattleScriptTryswapabilitiesVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryswapabilitiesVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustOptionalControl(value.control)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYSWAPABILITIES_REGISTRATION_CASES: [BattleScriptTryswapabilitiesRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryswapabilitiesRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${rustU8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
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
if (!formatted) throw new Error("gen-battle-script-tryswapabilities-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
