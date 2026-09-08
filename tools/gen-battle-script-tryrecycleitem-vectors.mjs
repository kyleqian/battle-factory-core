#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTryrecycleitemOpcode.ts.
//
// Expected controls, projected rules/scheduler, events, ordered errors, and
// registration results come only from executing the canonical TypeScript
// handler through the real Battle Script machine. This generator owns
// bounded input construction and Rust literal emission; it must not
// independently implement Recycle behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-tryrecycleitem-vectors.mjs

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
  "battle_script_tryrecycleitem_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptTryrecycleitemOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYRECYCLEITEM";
const OPCODE_ID = 0xea;
const DISPATCHER = "Cmd_tryrecycleitem";
const ENTRY_LABEL = "BattleScript_EffectRecycle";
const FAILURE_LABEL = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustTryrecycleitemUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const SIDES = Object.freeze([0, 1]);
const PARTY_INDEXES = Object.freeze([0, 1, 2, 3, 4, 5]);
const ITEM_NONE = 0;
const GENERATED_FILE_MAX_BYTES = 4_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-tryrecycleitem-vectors: ${message}`);
}

function freezeArray(values) {
  return Object.freeze(values.slice());
}
function battler(value) {
  return `BattleScriptTryrecycleitemBattler::Battler${value}`;
}
function optionBattler(value) {
  return value === null ? "None" : `Some(${battler(value)})`;
}
function side(value) {
  return value === 0 ? "BattleScriptTryrecycleitemSide::Player" : "BattleScriptTryrecycleitemSide::Opponent";
}
function hex8(value) {
  return `0x${(value & 0xff).toString(16).padStart(2, "0")}`;
}
function hex16(value) {
  return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`;
}
function hex32(value) {
  return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
}
function rustString(value) {
  return JSON.stringify(value);
}

// The canonical battler-projection schema this leaf reads/writes: side,
// partyIndex, item, plus two salted noise siblings (ability, marker) that
// prove untouched.
function projectionBattler(index, salt, sideValue, partyIndex, item) {
  return Object.freeze({
    side: sideValue,
    partyIndex,
    item,
    ability: (salt * 13 + index * 5) & 0xff,
    marker: (0x2468_0000 ^ ((salt * 0x1111 + index) >>> 0)) >>> 0,
  });
}

function defaultBattlerSlot(index, salt) {
  return Object.freeze({
    side: (index + salt) & 1,
    partyIndex: (index + salt + 2) % 6,
    item: 50 + index * 7 + (salt % 19),
  });
}

function projectionPartyMember(sideValue, index, salt, item) {
  return Object.freeze({
    item,
    noise: (0x7000_0000 ^ (sideValue * 0x1111_1111) ^ (index * 0x0101_0101) ^ salt) >>> 0,
  });
}

function makeProjection({
  attacker,
  attackerSide = 0,
  attackerPartyIndex = 0,
  attackerItem = 0,
  usedItem = 0,
  partyItem = null,
  pending = [],
  lastUsedItem = null,
  salt = 0,
}) {
  const battlers = BATTLERS.map((index) => {
    if (index === attacker) {
      return projectionBattler(index, salt, attackerSide, attackerPartyIndex, attackerItem);
    }
    const fallback = defaultBattlerSlot(index, salt);
    return projectionBattler(index, salt, fallback.side, fallback.partyIndex, fallback.item);
  });
  const usedHeldItems = BATTLERS.map((index) =>
    index === attacker ? usedItem : 1 + index * 3 + (salt % 11));
  const resolvedPartyItem = partyItem === null ? usedItem : partyItem;
  const party = SIDES.map((sideValue) => PARTY_INDEXES.map((index) => {
    const isAttackerSlot = attacker !== null && sideValue === attackerSide && index === attackerPartyIndex;
    const item = isAttackerSlot
      ? resolvedPartyItem
      : 60 + sideValue * 5 + index * 3 + (salt % 17);
    return projectionPartyMember(sideValue, index, salt, item);
  }));
  return Object.freeze({
    battlers: freezeArray(battlers),
    party: freezeArray(party.map(freezeArray)),
    attacker,
    usedHeldItems: freezeArray(usedHeldItems),
    lastUsedItem: lastUsedItem === null ? 4242 + (salt % 97) : lastUsedItem,
    pending: freezeArray(pending),
  });
}

function withPending(projection, pending) {
  return Object.freeze({ ...projection, pending: freezeArray(pending) });
}

function canonicalPartyMember(value) {
  return Object.freeze({ species: 1, isEgg: false, hp: 100, item: value.item });
}

function canonicalBattler(value, index) {
  return Object.freeze({
    side: value.side,
    ability: value.ability,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([278, 33, 45, 98]),
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
    item: value.item,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: index + 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: value.partyIndex,
  });
}

function canonicalRules(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker: projection.attacker, target: 0, effectBattler: 0 }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 278,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedItem: projection.lastUsedItem,
    usedHeldItems: projection.usedHeldItems,
    party: Object.freeze({
      player: freezeArray(projection.party[0].map(canonicalPartyMember)),
      opponent: freezeArray(projection.party[1].map(canonicalPartyMember)),
    }),
  });
}

function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((value) => Object.freeze({
      side: value.side,
      partyIndex: value.partyIndex,
      item: value.item,
      ability: value.ability,
      marker: 0,
    }))),
    party: freezeArray([rules.party.player, rules.party.opponent].map((members) =>
      freezeArray(members.map((value) => Object.freeze({ item: value.item, noise: 0 }))))),
    attacker: rules.selectorRoles.attacker,
    usedHeldItems: freezeArray(rules.usedHeldItems),
    lastUsedItem: rules.lastUsedItem,
  });
}

// `ability`/`marker`/`noise` are opaque siblings that createBattleScriptRulesContext
// does not round-trip identically (ability/marker collapse into canonical fields,
// noise is not modeled at all), so vector-state comparisons key on the fields this
// leaf actually reads/writes; the Rust-side struct keeps the original salted values
// fixed across before/after so untouched-sibling assertions still have teeth.
function vectorState(rules, battlerNoiseByIndex, partyNoiseBySideIndex) {
  const projected = projectRules(rules);
  return Object.freeze({
    ...projected,
    battlers: freezeArray(projected.battlers.map((value, index) => Object.freeze({
      ...value,
      ability: battlerNoiseByIndex[index].ability,
      marker: battlerNoiseByIndex[index].marker,
    }))),
    party: freezeArray(projected.party.map((members, sideValue) => freezeArray(
      members.map((value, index) => Object.freeze({
        ...value,
        noise: partyNoiseBySideIndex[sideValue][index],
      })),
    ))),
  });
}

function noiseTables(projection) {
  const battlerNoiseByIndex = projection.battlers.map((value) => ({
    ability: value.ability,
    marker: value.marker,
  }));
  const partyNoiseBySideIndex = projection.party.map((members) => members.map((value) => value.noise));
  return { battlerNoiseByIndex, partyNoiseBySideIndex };
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((value) => value.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical tryrecycleitem singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "opcode identity drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "dispatcher drifted");
assert(canonicalInstruction.programCounter === 1708, "instruction program counter drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_LABEL, "failure label drifted");
assert(
  programModule.resolveBattleScriptLabel(program, FAILURE_LABEL)?.programCounter === 1434,
  "failure resolution drifted",
);
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTryrecycleitemOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical tryrecycleitem handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [4],
  operandExpressions = [FAILURE_LABEL],
} = {}) {
  return Object.freeze({
    opcodeName,
    opcodeId,
    dispatcher,
    operandWidths: freezeArray(operandWidths),
    operandExpressions: freezeArray(operandExpressions),
  });
}

const CANONICAL_SPEC = freezeInstructionSpec();

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...canonicalInstruction.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...canonicalInstruction,
    opcodeName: spec.opcodeName,
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
  const { battlerNoiseByIndex, partyNoiseBySideIndex } = noiseTables(projection);
  const before = vectorState(rules, battlerNoiseByIndex, partyNoiseBySideIndex);
  const instruction = instructionFromSpec(instructionSpec);
  try {
    const scaffold = machineModule.createBattleScriptMachine(
      program, ENTRY_LABEL, rules, 0x2468_ace1, scheduler,
    );
    const state = Object.freeze({ ...scaffold, programCounter: canonicalInstruction.programCounter });
    const transition = handler({ program, instruction, state });
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(
      same(vectorState(rules, battlerNoiseByIndex, partyNoiseBySideIndex), before),
      "canonical handler mutated input rules",
    );
    const control = controlFromTransition(transition);
    const events = transition.events.map((event) => Object.freeze({
      kind: event.kind,
      battler: event.battler,
      item: event.item,
    }));
    return Object.freeze({
      expectedRules: vectorState(transition.rulesContext, battlerNoiseByIndex, partyNoiseBySideIndex),
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
  if (outcome.error.startsWith("invalid B_SCR_OP_TRYRECYCLEITEM shape")) return "invalid-instruction-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.startsWith("Cmd_tryrecycleitem: unresolved failure target")) return "unresolved-failure-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec = CANONICAL_SPEC) {
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

const USED_ITEM_VALUES = Object.freeze([0, 1, 139, 0xffff]);
const ATTACKER_ITEM_VALUES = Object.freeze([0, 1, 139]);

let salt = 0;
for (const attacker of BATTLERS) {
  for (const usedItem of USED_ITEM_VALUES) {
    for (const attackerItem of ATTACKER_ITEM_VALUES) {
      const projection = makeProjection({
        attacker,
        attackerSide: attacker & 1,
        attackerPartyIndex: (attacker * 2 + salt) % 6,
        attackerItem,
        usedItem,
        salt: salt++,
      });
      addCase(`a${attacker}_used${usedItem}_item${attackerItem}`, "attacker-useditem-item-matrix", projection);
    }
  }
}

addCase("missing_attacker", "attacker-useditem-item-matrix", makeProjection({
  attacker: null, usedItem: 139, attackerItem: 0, salt: salt++,
}));

for (const attackerSide of SIDES) {
  for (const attackerPartyIndex of PARTY_INDEXES) {
    for (const identity of [false, true]) {
      const usedItem = 139;
      const projection = makeProjection({
        attacker: 0,
        attackerSide,
        attackerPartyIndex,
        attackerItem: 0,
        usedItem,
        partyItem: identity ? usedItem : 55,
        salt: salt++,
      });
      addCase(
        `party_s${attackerSide}_p${attackerPartyIndex}_${identity ? "identity" : "different"}`,
        "party-index-side-identity-matrix",
        projection,
      );
    }
  }
}

addCase("prior_last_used_item_overwritten", "last-used-item-history", makeProjection({
  attacker: 2, attackerSide: 1, attackerPartyIndex: 3, attackerItem: 0, usedItem: 200,
  lastUsedItem: 9001, salt: salt++,
}));
addCase("prior_last_used_item_preserved_on_fail", "last-used-item-history", makeProjection({
  attacker: 2, attackerSide: 1, attackerPartyIndex: 3, attackerItem: 7, usedItem: 200,
  lastUsedItem: 9001, salt: salt++,
}));

for (const [pendingLabel, pending] of [
  ["empty", []],
  ["already_attacker", [0]],
  ["other_battlers", [3, 1]],
]) {
  const projection = withPending(
    makeProjection({
      attacker: 0, attackerSide: 0, attackerPartyIndex: 0, attackerItem: 0, usedItem: 77, salt: salt++,
    }),
    pending,
  );
  addCase(`pending_${pendingLabel}`, "scheduler-pending-preservation", projection);
}

for (const [label, spec] of [
  ["malformed_opcode", freezeInstructionSpec({ opcodeId: 0xeb })],
  ["malformed_dispatcher", freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment" })],
  ["malformed_no_operand", freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands", freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_LABEL, FAILURE_LABEL] })],
  ["malformed_pointer_width", freezeInstructionSpec({ operandWidths: [1] })],
]) {
  const projection = makeProjection({
    attacker: 0, attackerSide: 0, attackerPartyIndex: 0, attackerItem: 0, usedItem: 139, salt: salt++,
  });
  addCase(label, "malformed-shape-precedes-role", projection, spec);
}

{
  const failSpec = freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] });
  const failProjection = makeProjection({
    attacker: 0, attackerSide: 0, attackerPartyIndex: 0, attackerItem: 5, usedItem: 139, salt: salt++,
  });
  addCase("unresolved_label_on_fail_branch", "late-label-resolution", failProjection, failSpec);

  const successProjection = makeProjection({
    attacker: 0, attackerSide: 0, attackerPartyIndex: 0, attackerItem: 0, usedItem: 139, salt: salt++,
  });
  addCase("unresolved_label_on_success_branch_is_lazy", "late-label-resolution", successProjection, failSpec);
}

function sourceRegistration(specs) {
  const instructions = freezeArray(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTryrecycleitemOpcodeHandlers(customProgram);
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
  opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [], operandExpressions: [],
});
addRegistration("one_start", [CANONICAL_SPEC]);
addRegistration("one_start_ignores_noise", [noise, CANONICAL_SPEC, noise]);
addRegistration("wrong_cardinality_zero", []);
addRegistration("wrong_cardinality_two", [CANONICAL_SPEC, CANONICAL_SPEC]);
addRegistration("malformed_wrong_opcode", [freezeInstructionSpec({ opcodeId: 0xeb })]);
addRegistration("malformed_wrong_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment" })]);
addRegistration("malformed_zero_operands", [freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })]);
addRegistration("malformed_one_byte_operand", [freezeInstructionSpec({ operandWidths: [1] })]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered"
    : value.expectedError.startsWith("B_SCR_OP_TRYRECYCLEITEM requires") ? "wrong-cardinality"
      : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["used-item-values", USED_ITEM_VALUES.length],
  ["attacker-item-values", ATTACKER_ITEM_VALUES.length],
  ["party-sides", SIDES.length],
  ["party-indexes", PARTY_INDEXES.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance" ? "Some(BattleScriptTryrecycleitemControl::Advance)"
    : `Some(BattleScriptTryrecycleitemControl::Jump { program_counter: ${value.programCounter} })`;
}
function rustEvents(values) {
  if (values.length === 0) return "None";
  assert(values.length === 1, "tryrecycleitem never emits more than one event");
  const value = values[0];
  assert(value.kind === "set-battler-item", `unexpected event kind ${value.kind}`);
  return `Some(BattleScriptTryrecycleitemEvent::SetBattlerItem { battler: ${battler(value.battler)}, item: ${hex16(value.item)} })`;
}
function rustBattlerState(value) {
  return `BattleScriptTryrecycleitemVectorBattlerState { side: ${side(value.side)}, party_index: ${hex8(value.partyIndex)}, item: ${hex16(value.item)}, ability: ${hex8(value.ability)}, marker: ${hex32(value.marker)} }`;
}
function rustPartyMember(value) {
  return `BattleScriptTryrecycleitemVectorPartyMember { item: ${hex16(value.item)}, noise: ${hex32(value.noise)} }`;
}
function rustState(value) {
  return [
    "BattleScriptTryrecycleitemVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `party: [[${value.party[0].map(rustPartyMember).join(", ")}], [${value.party[1].map(rustPartyMember).join(", ")}]],`,
    `attacker: ${optionBattler(value.attacker)},`,
    `used_held_items: [${value.usedHeldItems.map(hex16).join(", ")}], last_used_item: ${hex16(value.lastUsedItem)},`,
    "}",
  ].join(" ");
}
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => optionBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTryrecycleitemOperand { width_bytes: ${width}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedFailureExpression === null ? "None"
    : `Some(BattleScriptTryrecycleitemResolvedLabel { expression: ${rustString(value.resolvedFailureExpression)}, program_counter: ${value.resolvedFailureProgramCounter} })`;
  return `BattleScriptTryrecycleitemInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}
function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-tryrecycleitem-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTryrecycleitemOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_tryrecycleitem::{");
lines.push("    BattleScriptTryrecycleitemBattler, BattleScriptTryrecycleitemControl,");
lines.push("    BattleScriptTryrecycleitemEvent, BattleScriptTryrecycleitemInstruction,");
lines.push("    BattleScriptTryrecycleitemOperand, BattleScriptTryrecycleitemResolvedLabel,");
lines.push("    BattleScriptTryrecycleitemSide,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYRECYCLEITEM_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryrecycleitemVectorBattlerState { pub side: BattleScriptTryrecycleitemSide, pub party_index: u8, pub item: u16, pub ability: u8, pub marker: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryrecycleitemVectorPartyMember { pub item: u16, pub noise: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryrecycleitemVectorState { pub battlers: [BattleScriptTryrecycleitemVectorBattlerState; 4], pub party: [[BattleScriptTryrecycleitemVectorPartyMember; 6]; 2], pub attacker: Option<BattleScriptTryrecycleitemBattler>, pub used_held_items: [u16; 4], pub last_used_item: u16 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryrecycleitemVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTryrecycleitemVectorState, pub initial_pending: [Option<BattleScriptTryrecycleitemBattler>; 4], pub instruction: BattleScriptTryrecycleitemInstruction<'static>, pub expected: Option<BattleScriptTryrecycleitemVectorState>, pub expected_pending: [Option<BattleScriptTryrecycleitemBattler>; 4], pub control: Option<BattleScriptTryrecycleitemControl>, pub event: Option<BattleScriptTryrecycleitemEvent>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryrecycleitemRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTryrecycleitemInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYRECYCLEITEM_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYRECYCLEITEM_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYRECYCLEITEM_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYRECYCLEITEM_CASES: [BattleScriptTryrecycleitemVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryrecycleitemVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        initial_pending: ${rustPending(value.initial.pending)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expectedRules)},`);
  lines.push(`        expected_pending: ${rustPending(value.expectedPending)},`);
  lines.push(`        control: ${rustControl(value.control)}, event: ${rustEvents(value.events)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYRECYCLEITEM_REGISTRATION_CASES: [BattleScriptTryrecycleitemRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryrecycleitemRegistrationVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-tryrecycleitem-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
