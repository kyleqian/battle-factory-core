#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrymementoOpcode.ts.
//
// Expected controls, projected rules/scheduler, events, ordered errors, and
// registration results come only from executing the canonical TypeScript
// handler through the real Battle Script machine. This generator owns
// bounded input construction and Rust literal emission; it must not
// independently implement Memento behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trymemento-vectors.mjs

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
  "battle_script_trymemento_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptTrymementoOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYMEMENTO";
const OPCODE_ID = 0xc9;
const DISPATCHER = "Cmd_trymemento";
const ENTRY_LABEL_A = "BattleScript_EffectMemento";
const ENTRY_LABEL_B = "BattleScript_MementoTargetProtect";
const FAILURE_A = "BattleScript_ButItFailed";
const FAILURE_B = "BattleScript_MementoTargetProtectEnd";
const UNRESOLVED_POINTER = "BattleScript_RustMementoUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const B_MSG_PROTECTED = 1;
const GENERATED_FILE_MAX_BYTES = 4_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trymemento-vectors: ${message}`);
}

function freezeArray(values) {
  return Object.freeze(values.slice());
}
function battler(value) {
  return `BattleScriptTrymementoBattler::Battler${value}`;
}
function optionBattler(value) {
  return value === null ? "None" : `Some(${battler(value)})`;
}
function hex8(value) {
  return `0x${(value & 0xff).toString(16).padStart(2, "0")}`;
}
function hex16(value) {
  return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`;
}
function rustString(value) {
  return JSON.stringify(value);
}

// The canonical battler-projection schema this leaf reads/writes: hp and
// stat_stages, plus two salted noise siblings (ability, marker/personality)
// that prove untouched.
function projectionBattler(index, salt, hp, statStages) {
  return Object.freeze({
    hp,
    statStages: freezeArray(statStages),
    ability: (salt * 13 + index * 5) & 0xff,
    marker: (0x2468_0000 ^ ((salt * 0x1111 + index) >>> 0)) >>> 0,
  });
}

function fullStatStages(atk, spatk, salt) {
  // Non-offensive slots [HP,DEF,SPEED,SPDEF,ACC,EVASION] are salted non-zero
  // to prove Cmd_trymemento ignores everything except ATK(1)/SPATK(4).
  const stages = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ((seed * 3 + salt) % 13));
  stages[1] = atk;
  stages[4] = spatk;
  return stages;
}

function makeProjection({ attacker, target, missType = 0, attackerHp = 100, salt = 0 }) {
  const battlers = BATTLERS.map((index) => {
    if (index === attacker) {
      return projectionBattler(index, salt, attackerHp, fullStatStages(6, 6, salt + index));
    }
    if (index === target) {
      // caller overrides target stat stages below
      return projectionBattler(index, salt, 30 + index, fullStatStages(6, 6, salt + index));
    }
    return projectionBattler(index, salt, 0, fullStatStages(6, 6, salt + index));
  });
  return Object.freeze({
    battlers: freezeArray(battlers),
    attacker,
    target,
    effectBattler: (salt + 1) % 4,
    fainted: salt % 3 === 0 ? null : (salt + 2) % 4,
    missType,
    battleMoveDamage: (salt & 1) === 0 ? -1234 - salt : 1234 + salt,
    pending: [],
  });
}

function withTargetStatStages(projection, atk, spatk) {
  const battlers = projection.battlers.map((value, index) =>
    index === projection.target
      ? Object.freeze({ ...value, statStages: freezeArray(fullStatStages(atk, spatk, 17 + index)) })
      : value);
  return Object.freeze({ ...projection, battlers: freezeArray(battlers) });
}

function withPending(projection, pending) {
  return Object.freeze({ ...projection, pending: freezeArray(pending) });
}

function canonicalBattler(value, index) {
  return Object.freeze({
    side: index & 1,
    ability: value.ability,
    hp: value.hp,
    maxHP: Math.min(value.hp + 50, 0xffff),
    moves: Object.freeze([262, 33, 45, 98]),
    pp: Object.freeze([10, 20, 15, 25]),
    status1: 0,
    status2: 0,
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
    item: index,
    statStages: freezeArray(value.statStages),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: index,
  });
}

function canonicalRules(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 262,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: projection.missType,
    hitMarker: 0,
    multiHitCounter: 0,
    battleMoveDamage: projection.battleMoveDamage,
  });
}

function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((value) => Object.freeze({
      hp: value.hp,
      statStages: freezeArray(value.statStages),
      ability: value.ability,
      marker: 0,
    }))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    missType: rules.missType,
    battleMoveDamage: rules.battleMoveDamage,
  });
}

// `marker` is opaque noise that createBattleScriptRulesContext does not
// round-trip (it is not a canonical rules-context field), so vector-state
// comparisons key on hp/statStages/ability only; marker stays fixed at the
// original projection value in the Rust-side struct.
function vectorState(rules, markerByIndex) {
  const projected = projectRules(rules);
  return Object.freeze({
    ...projected,
    battlers: freezeArray(projected.battlers.map((value, index) => Object.freeze({
      ...value,
      marker: markerByIndex[index],
    }))),
  });
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((value) => value.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 2, "canonical trymemento pair drifted");
const instructionA = canonicalInstructions[0];
const instructionB = canonicalInstructions[1];
assert(instructionA.opcodeId === OPCODE_ID && instructionB.opcodeId === OPCODE_ID, "opcode identity drifted");
assert(instructionA.dispatcher === DISPATCHER && instructionB.dispatcher === DISPATCHER, "dispatcher drifted");
assert(instructionA.programCounter === 1553, "instruction A program counter drifted");
assert(instructionB.programCounter === 1579, "instruction B program counter drifted");
assert(instructionA.operands[0]?.expression === FAILURE_A, "instruction A failure label drifted");
assert(instructionB.operands[0]?.expression === FAILURE_B, "instruction B failure label drifted");
assert(programModule.resolveBattleScriptLabel(program, FAILURE_A)?.programCounter === 1434, "failure A resolution drifted");
assert(programModule.resolveBattleScriptLabel(program, FAILURE_B)?.programCounter === 1580, "failure B resolution drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTrymementoOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical trymemento handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  programCounter,
  entryLabel,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions,
} = {}) {
  return Object.freeze({
    opcodeName,
    programCounter,
    entryLabel,
    opcodeId,
    dispatcher,
    operandWidths: freezeArray(operandWidths),
    operandExpressions: freezeArray(operandExpressions),
  });
}

const TOPOLOGY_A = freezeInstructionSpec({
  programCounter: 1553,
  entryLabel: ENTRY_LABEL_A,
  operandExpressions: [FAILURE_A],
});
const TOPOLOGY_B = freezeInstructionSpec({
  programCounter: 1579,
  entryLabel: ENTRY_LABEL_B,
  operandExpressions: [FAILURE_B],
});

function instructionFromSpec(spec) {
  const source = spec.programCounter === instructionB.programCounter ? instructionB : instructionA;
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...source.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...source,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands: freezeArray(operands),
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
    operandWidths: freezeArray(spec.operandWidths),
    operandExpressions: freezeArray(spec.operandExpressions),
    resolvedFailureExpression: resolved === undefined ? null : operand.expression,
    resolvedFailureProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(projection, instructionSpec) {
  const rules = canonicalRules(projection);
  const scheduler = machineModule.createBattleScriptSchedulerState({
    pendingControllerBattlers: freezeArray(projection.pending),
  });
  const markerByIndex = projection.battlers.map((value) => value.marker >>> 0);
  const before = vectorState(rules, markerByIndex);
  const instruction = instructionFromSpec(instructionSpec);
  try {
    // The Memento entry labels resolve to preceding opcodes (attackcanceler,
    // jumpifbyte, ...), not to the trymemento instruction itself, so build a
    // scaffold machine state from any valid entry and override programCounter
    // to the instruction under test -- the handler is invoked directly with
    // that instruction, so only the error-message pc needs to match.
    const scaffold = machineModule.createBattleScriptMachine(
      program, ENTRY_LABEL_A, rules, 0x1357_9bdf, scheduler,
    );
    const state = Object.freeze({ ...scaffold, programCounter: instructionSpec.programCounter });
    const transition = handler({ program, instruction, state });
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(same(vectorState(rules, markerByIndex), before), "canonical handler mutated input rules");
    const control = controlFromTransition(transition);
    const events = transition.events.map((event) => Object.freeze({
      kind: event.kind,
      battler: event.battler,
      healthValue: event.healthValue,
    }));
    return Object.freeze({
      expectedRules: vectorState(transition.rulesContext, markerByIndex),
      expectedPending: freezeArray(transition.scheduler.pendingControllerBattlers),
      control,
      events: freezeArray(events),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      expectedRules: null,
      expectedPending: freezeArray(projection.pending),
      control: null,
      events: freezeArray([]),
      error: error.message,
    });
  }
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.startsWith("invalid B_SCR_OP_TRYMEMENTO shape")) return "invalid-instruction-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.startsWith("Cmd_trymemento: unresolved failure target")) return "unresolved-failure-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instructionSpec);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: projection,
    instruction: vectorInstruction(instructionSpec),
    ...outcome,
  }));
}

const STAT_PAIRS = Object.freeze([
  [0, 0], [0, 1], [1, 0], [6, 6], [12, 0], [0, 12],
]);
const MISS_TYPES = Object.freeze([0, 1, 2, 255]);
const ATTACKER_HPS = Object.freeze([0, 1, 140, 65535]);

let salt = 0;
for (const topology of [TOPOLOGY_A, TOPOLOGY_B]) {
  for (const [atk, spatk] of STAT_PAIRS) {
    for (const missType of MISS_TYPES) {
      const projection = withTargetStatStages(
        makeProjection({ attacker: 0, target: 1, missType, attackerHp: 100, salt: salt++ }),
        atk,
        spatk,
      );
      addCase(
        `topo${topology === TOPOLOGY_A ? "a" : "b"}_atk${atk}_spatk${spatk}_miss${missType}`,
        "stat-stage-and-misstype-matrix",
        projection,
        topology,
      );
    }
  }
}

for (const attackerHp of ATTACKER_HPS) {
  const projection = withTargetStatStages(
    makeProjection({ attacker: 2, target: 3, missType: 0, attackerHp, salt: salt++ }),
    6,
    6,
  );
  addCase(`attacker_hp_${attackerHp}`, "attacker-hp-damage-mapping", projection, TOPOLOGY_A);
}

for (const [pendingLabel, pending] of [
  ["empty", []],
  ["already_attacker", [0]],
  ["other_battlers", [3, 1]],
]) {
  const projection = withPending(
    withTargetStatStages(makeProjection({ attacker: 0, target: 1, missType: 0, attackerHp: 77, salt: salt++ }), 6, 6),
    pending,
  );
  addCase(`pending_${pendingLabel}`, "scheduler-pending-preservation", projection, TOPOLOGY_A);
}

for (const attacker of BATTLERS) {
  for (const target of BATTLERS) {
    if (attacker === target) continue;
    const projection = withTargetStatStages(
      makeProjection({ attacker, target, missType: 0, attackerHp: 90, salt: salt++ }),
      0,
      0,
    );
    addCase(`pair_a${attacker}_t${target}`, "attacker-target-pair-matrix", projection, TOPOLOGY_A);
  }
}
for (const attacker of BATTLERS) {
  const projection = withTargetStatStages(
    makeProjection({ attacker, target: null, missType: 0, attackerHp: 90, salt: salt++ }),
    0,
    0,
  );
  addCase(`missing_target_a${attacker}`, "attacker-target-pair-matrix", projection, TOPOLOGY_A);
}
{
  const projection = withTargetStatStages(
    makeProjection({ attacker: null, target: 1, missType: 0, attackerHp: 90, salt: salt++ }),
    0,
    0,
  );
  addCase("missing_attacker_precedes_target", "attacker-target-pair-matrix", projection, TOPOLOGY_A);
}
{
  const projection = withTargetStatStages(
    makeProjection({ attacker: null, target: null, missType: 0, attackerHp: 90, salt: salt++ }),
    0,
    0,
  );
  addCase("missing_both_reports_attacker_first", "attacker-target-pair-matrix", projection, TOPOLOGY_A);
}

for (const [label, spec] of [
  ["malformed_opcode", freezeInstructionSpec({ programCounter: 1553, entryLabel: ENTRY_LABEL_A, opcodeId: 0xca, operandExpressions: [FAILURE_A] })],
  ["malformed_dispatcher", freezeInstructionSpec({ programCounter: 1553, entryLabel: ENTRY_LABEL_A, dispatcher: "Cmd_setforcedtarget", operandExpressions: [FAILURE_A] })],
  ["malformed_no_operand", freezeInstructionSpec({ programCounter: 1553, entryLabel: ENTRY_LABEL_A, operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands", freezeInstructionSpec({ programCounter: 1553, entryLabel: ENTRY_LABEL_A, operandWidths: [4, 4], operandExpressions: [FAILURE_A, FAILURE_A] })],
  ["malformed_pointer_width", freezeInstructionSpec({ programCounter: 1553, entryLabel: ENTRY_LABEL_A, operandWidths: [1], operandExpressions: [FAILURE_A] })],
]) {
  const projection = withTargetStatStages(
    makeProjection({ attacker: 0, target: 1, missType: 0, attackerHp: 90, salt: salt++ }),
    0,
    0,
  );
  addCase(label, "malformed-shape-precedes-roles", projection, spec);
}

{
  const failSpec = freezeInstructionSpec({
    programCounter: 1553, entryLabel: ENTRY_LABEL_A, operandExpressions: [UNRESOLVED_POINTER],
  });
  const failProjection = withTargetStatStages(
    makeProjection({ attacker: 0, target: 1, missType: 0, attackerHp: 90, salt: salt++ }),
    0,
    0,
  );
  addCase("unresolved_label_on_fail_branch", "late-label-resolution", failProjection, failSpec);

  const successProjection = withTargetStatStages(
    makeProjection({ attacker: 0, target: 1, missType: 0, attackerHp: 90, salt: salt++ }),
    6,
    6,
  );
  addCase("unresolved_label_on_success_branch_is_lazy", "late-label-resolution", successProjection, failSpec);
}

function sourceRegistration(specs) {
  const instructions = freezeArray(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTrymementoOpcodeHandlers(customProgram);
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
    instructions: freezeArray(specs.map(vectorInstruction)),
    expectedOpcodeId: outcome.opcodeId,
    expectedError: outcome.error,
  }));
}

const noise = freezeInstructionSpec({
  opcodeName: "B_SCR_OP_RUST_NOISE", programCounter: 0, entryLabel: ENTRY_LABEL_A,
  opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [], operandExpressions: [],
});
addRegistration("canonical_pair", [TOPOLOGY_A, TOPOLOGY_B]);
addRegistration("canonical_pair_ignores_noise", [noise, TOPOLOGY_A, noise, TOPOLOGY_B, noise]);
addRegistration("wrong_cardinality_zero", []);
addRegistration("wrong_cardinality_one", [TOPOLOGY_A]);
addRegistration("wrong_cardinality_three", [TOPOLOGY_A, TOPOLOGY_B, TOPOLOGY_A]);
addRegistration("second_offender_wrong_opcode", [
  TOPOLOGY_A,
  freezeInstructionSpec({ programCounter: 1579, entryLabel: ENTRY_LABEL_B, opcodeId: 0xca, operandExpressions: [FAILURE_B] }),
]);
addRegistration("second_offender_wrong_dispatcher", [
  TOPOLOGY_A,
  freezeInstructionSpec({ programCounter: 1579, entryLabel: ENTRY_LABEL_B, dispatcher: "Cmd_setforcedtarget", operandExpressions: [FAILURE_B] }),
]);
addRegistration("second_offender_zero_operands", [
  TOPOLOGY_A,
  freezeInstructionSpec({ programCounter: 1579, entryLabel: ENTRY_LABEL_B, operandWidths: [], operandExpressions: [] }),
]);
addRegistration("second_offender_one_byte_operand", [
  TOPOLOGY_A,
  freezeInstructionSpec({ programCounter: 1579, entryLabel: ENTRY_LABEL_B, operandWidths: [1], operandExpressions: [FAILURE_B] }),
]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered"
    : value.expectedError.startsWith("B_SCR_OP_TRYMEMENTO requires") ? "wrong-cardinality"
      : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["call-site-topologies", 2],
  ["stat-stage-pairs", STAT_PAIRS.length],
  ["miss-type-values", MISS_TYPES.length],
  ["attacker-hp-values", ATTACKER_HPS.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance" ? "Some(BattleScriptTrymementoControl::Advance)"
    : `Some(BattleScriptTrymementoControl::Jump { program_counter: ${value.programCounter} })`;
}
function rustEvents(values) {
  if (values.length === 0) return "None";
  assert(values.length === 1, "trymemento never emits more than one event");
  const value = values[0];
  assert(value.kind === "health-bar-update", `unexpected event kind ${value.kind}`);
  return `Some(BattleScriptTrymementoEvent::HealthBarUpdate { battler: ${battler(value.battler)}, health_value: ${hex16(value.healthValue)} })`;
}
function rustBattlerState(value) {
  return `BattleScriptTrymementoVectorBattlerState { hp: ${hex16(value.hp)}, stat_stages: [${value.statStages.map(hex8).join(", ")}], ability: ${hex8(value.ability)}, marker: 0x${(value.marker >>> 0).toString(16).padStart(8, "0")} }`;
}
function rustState(value) {
  return [
    "BattleScriptTrymementoVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${optionBattler(value.attacker)}, target: ${optionBattler(value.target)},`,
    `effect_battler: ${optionBattler(value.effectBattler)}, fainted: ${optionBattler(value.fainted)},`,
    `miss_type: ${hex8(value.missType)}, battle_move_damage: ${value.battleMoveDamage},`,
    "}",
  ].join(" ");
}
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => optionBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTrymementoOperand { width_bytes: ${width}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptTrymementoResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptTrymementoInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}
function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}
function projectionToVectorState(projection) {
  return Object.freeze({
    battlers: freezeArray(projection.battlers.map((value) => Object.freeze({
      hp: value.hp,
      statStages: freezeArray(value.statStages),
      ability: value.ability,
      marker: value.marker >>> 0,
    }))),
    attacker: projection.attacker,
    target: projection.target,
    effectBattler: projection.effectBattler,
    fainted: projection.fainted,
    missType: projection.missType,
    battleMoveDamage: projection.battleMoveDamage,
  });
}

function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trymemento-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrymementoOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trymemento::{");
lines.push("    BattleScriptTrymementoBattler, BattleScriptTrymementoControl,");
lines.push("    BattleScriptTrymementoEvent, BattleScriptTrymementoInstruction,");
lines.push("    BattleScriptTrymementoOperand, BattleScriptTrymementoResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYMEMENTO_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYMEMENTO_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYMEMENTO_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYMEMENTO_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrymementoVectorBattlerState { pub hp: u16, pub stat_stages: [u8; 8], pub ability: u8, pub marker: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrymementoVectorState { pub battlers: [BattleScriptTrymementoVectorBattlerState; 4], pub attacker: Option<BattleScriptTrymementoBattler>, pub target: Option<BattleScriptTrymementoBattler>, pub effect_battler: Option<BattleScriptTrymementoBattler>, pub fainted: Option<BattleScriptTrymementoBattler>, pub miss_type: u8, pub battle_move_damage: i32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrymementoVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTrymementoVectorState, pub initial_pending: [Option<BattleScriptTrymementoBattler>; 4], pub instruction: BattleScriptTrymementoInstruction<'static>, pub expected: Option<BattleScriptTrymementoVectorState>, pub expected_pending: [Option<BattleScriptTrymementoBattler>; 4], pub control: Option<BattleScriptTrymementoControl>, pub event: Option<BattleScriptTrymementoEvent>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrymementoRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTrymementoInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYMEMENTO_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYMEMENTO_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYMEMENTO_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYMEMENTO_CASES: [BattleScriptTrymementoVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrymementoVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(projectionToVectorState(value.initial))},`);
  lines.push(`        initial_pending: ${rustPending(value.initial.pending)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expectedRules)},`);
  lines.push(`        expected_pending: ${rustPending(value.expectedPending)},`);
  lines.push(`        control: ${rustControl(value.control)}, event: ${rustEvents(value.events)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYMEMENTO_REGISTRATION_CASES: [BattleScriptTrymementoRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrymementoRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${hex8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-trymemento-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
