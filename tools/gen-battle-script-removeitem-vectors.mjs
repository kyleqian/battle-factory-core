#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptRemoveitemOpcode.ts.
//
// Expected controls, projected rules/scheduler, events, ordered errors, and
// registration results come only from executing the canonical TypeScript
// handler through the real Battle Script machine. This generator owns
// bounded input construction and Rust literal emission; it must not
// independently implement Cmd_removeitem behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-removeitem-vectors.mjs

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
  "battle_script_removeitem_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRemoveitemOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_REMOVEITEM";
const OPCODE_ID = 0x6a;
const DISPATCHER = "Cmd_removeitem";
const ENTRY_LABEL = "BattleScript_BerryCureParRet";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const SIDES = Object.freeze([0, 1]);
const PARTY_INDEXES = Object.freeze([0, 1, 2, 3, 4, 5]);
const ITEM_VALUES = Object.freeze([0, 1, 139, 0xffff]);
const ITEM_NONE = 0;
const GENERATED_FILE_MAX_BYTES = 4_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-removeitem-vectors: ${message}`);
}

function freezeArray(values) {
  return Object.freeze(values.slice());
}
function battler(value) {
  return `BattleScriptRemoveitemBattler::Battler${value}`;
}
function optionBattler(value) {
  return value === null ? "None" : `Some(${battler(value)})`;
}
function side(value) {
  return value === 0 ? "BattleScriptRemoveitemSide::Player" : "BattleScriptRemoveitemSide::Opponent";
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

// The canonical projection this leaf reads/writes: side/item/partyIndex per
// battler (plus salted ability/marker noise), a party mirror (item + salted
// noise), the attacker role, gBattleScripting.battler, usedHeldItems, and
// lastUsedItem. `targetBattler` is the battler the case's selector should
// resolve to (or null to model an unresolved role); `forceScriptingMissing`
// bypasses the canonical constructor's non-null scriptingBattler requirement
// to model the (production-unreachable, but general-contract) missing-role
// halt the same way every other selector role can be absent.
function makeProjection({
  targetBattler,
  selector,
  targetSide = 0,
  targetPartyIndex = 0,
  targetActiveItem = 0,
  targetUsedHeldItemPrior = 0x2555,
  targetPartyItem = null,
  pending = [],
  lastUsedItem = null,
  forceScriptingMissing = false,
  salt = 0,
}) {
  const battlers = BATTLERS.map((index) => {
    if (index === targetBattler) {
      return projectionBattler(index, salt, targetSide, targetPartyIndex, targetActiveItem);
    }
    const fallback = defaultBattlerSlot(index, salt);
    return projectionBattler(index, salt, fallback.side, fallback.partyIndex, fallback.item);
  });
  const usedHeldItems = BATTLERS.map((index) =>
    index === targetBattler ? targetUsedHeldItemPrior : 1 + index * 3 + (salt % 11));
  const resolvedPartyItem = targetPartyItem === null ? targetActiveItem : targetPartyItem;
  const party = SIDES.map((sideValue) => PARTY_INDEXES.map((index) => {
    const isTargetSlot = targetBattler !== null && sideValue === targetSide && index === targetPartyIndex;
    const item = isTargetSlot
      ? resolvedPartyItem
      : 60 + sideValue * 5 + index * 3 + (salt % 17);
    return projectionPartyMember(sideValue, index, salt, item);
  }));
  const attackerRole = selector === "BS_ATTACKER"
    ? targetBattler
    : ((targetBattler ?? 0) + 1) % 4;
  const scriptingRole = selector === "BS_SCRIPTING"
    ? (forceScriptingMissing ? 0 : targetBattler)
    : ((targetBattler ?? 0) + 2) % 4;
  return Object.freeze({
    battlers: freezeArray(battlers),
    party: freezeArray(party.map(freezeArray)),
    attackerRole,
    scriptingRole,
    forceScriptingMissing,
    selector,
    targetBattler,
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
  const rules = rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(projection.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker: projection.attackerRole, target: 0, effectBattler: 0 }),
    scriptingBattler: projection.scriptingRole,
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
  if (!projection.forceScriptingMissing) return rules;
  // Models the general "selector role may be absent" contract for
  // BS_SCRIPTING even though the production rules-context constructor
  // requires scriptingBattler to be present; resolveRulesBattlerForBattleScript
  // itself performs no such check, so this remains a genuine canonical-code
  // execution, not a reimplementation.
  return Object.freeze({ ...rules, scriptingBattler: null });
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
    scriptingBattler: rules.scriptingBattler,
    usedHeldItems: freezeArray(rules.usedHeldItems),
    lastUsedItem: rules.lastUsedItem,
  });
}

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
assert(canonicalInstructions.length === 13, "canonical removeitem call-site count drifted");
for (const instruction of canonicalInstructions) {
  assert(instruction.opcodeId === OPCODE_ID, "opcode identity drifted");
  assert(instruction.dispatcher === DISPATCHER, "dispatcher drifted");
  assert(
    instruction.operands[0]?.expression === "BS_SCRIPTING" || instruction.operands[0]?.expression === "BS_ATTACKER",
    "selector expression drifted",
  );
}
const SCRIPTING_INSTRUCTIONS = canonicalInstructions.filter((value) => value.operands[0].expression === "BS_SCRIPTING");
const ATTACKER_INSTRUCTIONS = canonicalInstructions.filter((value) => value.operands[0].expression === "BS_ATTACKER");
assert(SCRIPTING_INSTRUCTIONS.length === 8, "expected 8 BS_SCRIPTING call sites");
assert(ATTACKER_INSTRUCTIONS.length === 5, "expected 5 BS_ATTACKER call sites");

const handlers = opcodeModule.createBattleScriptRemoveitemOpcodeHandlers(program, {
  resolveBattlerForBattleScript: rulesModule.resolveRulesBattlerForBattleScript,
});
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical removeitem handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME,
  opcodeId = OPCODE_ID,
  dispatcher = DISPATCHER,
  operandWidths = [1],
  operandExpressions = ["BS_ATTACKER"],
  programCounter = null,
} = {}) {
  return Object.freeze({
    opcodeName,
    opcodeId,
    dispatcher,
    operandWidths: freezeArray(operandWidths),
    operandExpressions: freezeArray(operandExpressions),
    programCounter,
  });
}

function realInstructionSpec(instruction) {
  return freezeInstructionSpec({
    operandWidths: [instruction.operands[0].widthBytes],
    operandExpressions: [instruction.operands[0].expression],
    programCounter: instruction.programCounter,
  });
}

function instructionFromSpec(spec, template) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...template.operands[0],
    widthBytes,
    expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...template,
    opcodeName: spec.opcodeName,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    programCounter: spec.programCounter ?? template.programCounter,
    operands: freezeArray(operands),
  });
}

function vectorInstruction(instruction) {
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher,
    operandWidths: freezeArray(instruction.operands.map((value) => value.widthBytes)),
    operandExpressions: freezeArray(instruction.operands.map((value) => value.expression)),
  });
}

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "halt") return Object.freeze({ kind: "halt", reason: transition.control.reason });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(projection, instruction) {
  const rules = canonicalRules(projection);
  const scheduler = machineModule.createBattleScriptSchedulerState({
    pendingControllerBattlers: freezeArray(projection.pending),
  });
  const { battlerNoiseByIndex, partyNoiseBySideIndex } = noiseTables(projection);
  const before = vectorState(rules, battlerNoiseByIndex, partyNoiseBySideIndex);
  const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x1357_9bdf, scheduler);
  const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter });
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
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const cases = [];
function addCase(label, category, projection, instruction) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instruction);
  const branch = outcome.control.kind === "advance" ? "applied" : "unsupported-branch";
  cases.push(Object.freeze({
    label,
    category,
    branch,
    initial: projection,
    instruction: vectorInstruction(instruction),
    ...outcome,
  }));
}

let salt = 0;

// (A) every one of the 13 real call sites: battler and item value cycle so
// every battler 0..3 and every ITEM_VALUES entry appears via both selectors.
canonicalInstructions.forEach((instruction, index) => {
  const targetBattler = index % 4;
  const selector = instruction.operands[0].expression;
  const projection = makeProjection({
    targetBattler,
    selector,
    targetSide: targetBattler & 1,
    targetPartyIndex: (targetBattler * 2 + salt) % 6,
    targetActiveItem: ITEM_VALUES[index % ITEM_VALUES.length],
    targetUsedHeldItemPrior: 0x2000 + index,
    salt: salt++,
  });
  addCase(`site${index}_${selector.toLowerCase()}_b${targetBattler}`, "call-site-battler-matrix", projection, instruction);
});

// (B) active item value dedicated matrix (each of the four canonical values,
// both selectors), proving the usedHeldItems cell always gets overwritten
// with the OLD active item -- including when that value is ITEM_NONE.
for (const selector of ["BS_ATTACKER", "BS_SCRIPTING"]) {
  const instruction = selector === "BS_ATTACKER" ? ATTACKER_INSTRUCTIONS[0] : SCRIPTING_INSTRUCTIONS[0];
  for (const item of ITEM_VALUES) {
    const projection = makeProjection({
      targetBattler: 1,
      selector,
      targetSide: 1,
      targetPartyIndex: 2,
      targetActiveItem: item,
      targetUsedHeldItemPrior: 0x2be5,
      salt: salt++,
    });
    addCase(`activeitem_${selector.toLowerCase()}_${hex16String(item)}`, "active-item-values", projection, instruction);
  }
}
function hex16String(value) {
  return value.toString(16);
}

// (C) party mirror identity/non-identity across both sides and every
// party index, using one representative real call site per selector.
for (const selector of ["BS_ATTACKER", "BS_SCRIPTING"]) {
  const instruction = selector === "BS_ATTACKER" ? ATTACKER_INSTRUCTIONS[1] : SCRIPTING_INSTRUCTIONS[1];
  for (const targetSide of SIDES) {
    for (const targetPartyIndex of PARTY_INDEXES) {
      for (const identity of [false, true]) {
        const targetActiveItem = 139;
        const projection = makeProjection({
          targetBattler: 0,
          selector,
          targetSide,
          targetPartyIndex,
          targetActiveItem,
          targetPartyItem: identity ? targetActiveItem : 55,
          salt: salt++,
        });
        addCase(
          `party_${selector.toLowerCase()}_s${targetSide}_p${targetPartyIndex}_${identity ? "identity" : "different"}`,
          "party-index-side-identity-matrix",
          projection,
          instruction,
        );
      }
    }
  }
}

// (D) lastUsedItem is never touched, on either selector.
for (const selector of ["BS_ATTACKER", "BS_SCRIPTING"]) {
  const instruction = selector === "BS_ATTACKER" ? ATTACKER_INSTRUCTIONS[2] : SCRIPTING_INSTRUCTIONS[2];
  const projection = makeProjection({
    targetBattler: 2,
    selector,
    targetSide: 1,
    targetPartyIndex: 3,
    targetActiveItem: 0,
    lastUsedItem: 9001,
    salt: salt++,
  });
  addCase(`last_used_item_retained_${selector.toLowerCase()}`, "last-used-item-history", projection, instruction);
}

// (E) scheduler pending-list preservation: empty / already-target / other battlers.
for (const [pendingLabel, pending] of [
  ["empty", []],
  ["already_target", [0]],
  ["other_battlers", [3, 1]],
]) {
  const instruction = ATTACKER_INSTRUCTIONS[3];
  const projection = withPending(
    makeProjection({
      targetBattler: 0, selector: "BS_ATTACKER", targetSide: 0, targetPartyIndex: 0, targetActiveItem: 77,
      salt: salt++,
    }),
    pending,
  );
  addCase(`pending_${pendingLabel}`, "scheduler-pending-preservation", projection, instruction);
}

// (F) unsupported-branch: missing attacker role via BS_ATTACKER, missing
// scriptingBattler role via BS_SCRIPTING -- both real call sites.
{
  const instruction = ATTACKER_INSTRUCTIONS[4];
  const projection = makeProjection({
    targetBattler: null, selector: "BS_ATTACKER", salt: salt++,
  });
  addCase("missing_attacker_role", "unsupported-branch", projection, instruction);
}
{
  const instruction = SCRIPTING_INSTRUCTIONS[3];
  const projection = makeProjection({
    targetBattler: null, selector: "BS_SCRIPTING", forceScriptingMissing: true, salt: salt++,
  });
  addCase("missing_scripting_battler_role", "unsupported-branch", projection, instruction);
}

// Registration corpus.
function sourceRegistration(specs) {
  const template = canonicalInstructions[0];
  const instructions = freezeArray(specs.map((spec) => instructionFromSpec(spec, template)));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptRemoveitemOpcodeHandlers(customProgram, {
      resolveBattlerForBattleScript: rulesModule.resolveRulesBattlerForBattleScript,
    });
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
  const template = canonicalInstructions[0];
  const outcome = sourceRegistration(specs);
  registrationCases.push(Object.freeze({
    label,
    instructions: freezeArray(specs.map((spec) => vectorInstruction(instructionFromSpec(spec, template)))),
    expectedOpcodeId: outcome.opcodeId,
    expectedError: outcome.error,
  }));
}

function realSpecs() {
  return canonicalInstructions.map((instruction) => realInstructionSpec(instruction));
}

addRegistration("all_thirteen", realSpecs());
addRegistration("wrong_cardinality_zero", []);
addRegistration("wrong_cardinality_twelve", realSpecs().slice(0, 12));
addRegistration("wrong_cardinality_fourteen", [...realSpecs(), realInstructionSpec(canonicalInstructions[0])]);
addRegistration("malformed_wrong_dispatcher", [
  ...realSpecs().slice(0, 5),
  freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment", programCounter: 900001 }),
  ...realSpecs().slice(6),
]);
addRegistration("malformed_zero_operands", [
  ...realSpecs().slice(0, 3),
  freezeInstructionSpec({ operandWidths: [], operandExpressions: [], programCounter: 900002 }),
  ...realSpecs().slice(4),
]);
addRegistration("malformed_two_operands", [
  ...realSpecs().slice(0, 7),
  freezeInstructionSpec({ operandWidths: [1, 1], operandExpressions: ["BS_ATTACKER", "BS_ATTACKER"], programCounter: 900003 }),
  ...realSpecs().slice(8),
]);
addRegistration("malformed_four_byte_operand", [
  ...realSpecs().slice(0, 2),
  freezeInstructionSpec({ operandWidths: [4], programCounter: 900004 }),
  ...realSpecs().slice(3),
]);
addRegistration("malformed_disallowed_selector", [
  ...realSpecs().slice(0, 9),
  freezeInstructionSpec({ operandExpressions: ["BS_TARGET"], programCounter: 900005 }),
  ...realSpecs().slice(10),
]);
addRegistration("first_offender_in_program_order", [
  freezeInstructionSpec({ operandExpressions: ["BS_TARGET"], programCounter: 900006 }),
  ...realSpecs().slice(1, 8),
  freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment", programCounter: 900007 }),
  ...realSpecs().slice(9),
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
    : value.expectedError.startsWith("B_SCR_OP_REMOVEITEM requires") ? "wrong-cardinality"
      : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["item-values", ITEM_VALUES.length],
  ["party-sides", SIDES.length],
  ["party-indexes", PARTY_INDEXES.length],
  ["real-call-sites", canonicalInstructions.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustControl(value) {
  return value.kind === "advance" ? "BattleScriptRemoveitemControl::Advance" : null;
}
function rustEvents(values) {
  if (values.length === 0) return "None";
  assert(values.length === 1, "removeitem never emits more than one event");
  const value = values[0];
  assert(value.kind === "set-battler-item", `unexpected event kind ${value.kind}`);
  return `Some(BattleScriptRemoveitemEvent::SetBattlerItem { battler: ${battler(value.battler)}, item: ${hex16(value.item)} })`;
}
function rustBattlerState(value) {
  return `BattleScriptRemoveitemVectorBattlerState { side: ${side(value.side)}, party_index: ${hex8(value.partyIndex)}, item: ${hex16(value.item)}, ability: ${hex8(value.ability)}, marker: ${hex32(value.marker)} }`;
}
function rustPartyMember(value) {
  return `BattleScriptRemoveitemVectorPartyMember { item: ${hex16(value.item)}, noise: ${hex32(value.noise)} }`;
}
function rustState(value) {
  return [
    "BattleScriptRemoveitemVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `party: [[${value.party[0].map(rustPartyMember).join(", ")}], [${value.party[1].map(rustPartyMember).join(", ")}]],`,
    `attacker: ${optionBattler(value.attacker)}, scripting_battler: ${optionBattler(value.scriptingBattler)},`,
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
    `BattleScriptRemoveitemOperand { width_bytes: ${width}, expression: ${rustString(value.operandExpressions[index])} }`);
  return `BattleScriptRemoveitemInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}] }`;
}
function rustReason(reason, instruction) {
  const selectorExpression = instruction.operandExpressions[0] ?? "<missing>";
  return `BattleScriptRemoveitemUnsupportedBranchReason { program_counter: ${reason.programCounter}, opcode_id: ${hex8(reason.opcodeId)}, opcode_name: ${rustString(reason.opcodeName)}, selector_expression: ${rustString(selectorExpression)}, source_file: ${rustString(reason.sourceFile)}, source_line: ${reason.sourceLine} }`;
}
function rustOutcome(value) {
  if (value.control.kind === "advance") {
    return `BattleScriptRemoveitemVectorOutcome::Applied { rules: ${rustState(value.expectedRules)}, pending: ${rustPending(value.expectedPending)}, control: ${rustControl(value.control)}, event: ${rustEvents(value.events)} }`;
  }
  return `BattleScriptRemoveitemVectorOutcome::UnsupportedBranch(${rustReason(value.control.reason, value.instruction)})`;
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
lines.push("// GENERATED by core-rs/tools/gen-battle-script-removeitem-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptRemoveitemOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_removeitem::{");
lines.push("    BattleScriptRemoveitemBattler, BattleScriptRemoveitemControl,");
lines.push("    BattleScriptRemoveitemEvent, BattleScriptRemoveitemInstruction,");
lines.push("    BattleScriptRemoveitemOperand, BattleScriptRemoveitemSide,");
lines.push("    BattleScriptRemoveitemUnsupportedBranchReason,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_REMOVEITEM_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_REMOVEITEM_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_REMOVEITEM_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_REMOVEITEM_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemoveitemVectorBattlerState { pub side: BattleScriptRemoveitemSide, pub party_index: u8, pub item: u16, pub ability: u8, pub marker: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemoveitemVectorPartyMember { pub item: u16, pub noise: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemoveitemVectorState { pub battlers: [BattleScriptRemoveitemVectorBattlerState; 4], pub party: [[BattleScriptRemoveitemVectorPartyMember; 6]; 2], pub attacker: Option<BattleScriptRemoveitemBattler>, pub scripting_battler: Option<BattleScriptRemoveitemBattler>, pub used_held_items: [u16; 4], pub last_used_item: u16 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub enum BattleScriptRemoveitemVectorOutcome<'a> { Applied { rules: BattleScriptRemoveitemVectorState, pending: [Option<BattleScriptRemoveitemBattler>; 4], control: BattleScriptRemoveitemControl, event: Option<BattleScriptRemoveitemEvent> }, UnsupportedBranch(BattleScriptRemoveitemUnsupportedBranchReason<'a>) }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemoveitemVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptRemoveitemVectorState, pub initial_pending: [Option<BattleScriptRemoveitemBattler>; 4], pub instruction: BattleScriptRemoveitemInstruction<'static>, pub outcome: BattleScriptRemoveitemVectorOutcome<'static> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRemoveitemRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptRemoveitemInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_REMOVEITEM_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_REMOVEITEM_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_REMOVEITEM_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_REMOVEITEM_CASES: [BattleScriptRemoveitemVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptRemoveitemVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState({ ...projectRulesLike(value.initial) })},`);
  lines.push(`        initial_pending: ${rustPending(value.initial.pending)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        outcome: ${rustOutcome(value)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_REMOVEITEM_REGISTRATION_CASES: [BattleScriptRemoveitemRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptRemoveitemRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${hex8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

// Re-derive the initial-state vector (battler/party/roles/used-held-items/
// lastUsedItem) from the projection shape used to build canonical input,
// independent of the transition's own output projection helper above.
function projectRulesLike(projection) {
  return Object.freeze({
    battlers: freezeArray(projection.battlers.map((value, index) => Object.freeze({
      side: value.side,
      partyIndex: value.partyIndex,
      item: value.item,
      ability: value.ability,
      marker: value.marker,
    }))),
    party: freezeArray(projection.party.map((members) => freezeArray(members))),
    attacker: projection.attackerRole,
    scriptingBattler: projection.forceScriptingMissing ? null : projection.scriptingRole,
    usedHeldItems: projection.usedHeldItems,
    lastUsedItem: projection.lastUsedItem,
  });
}

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
if (!formatted) throw new Error("gen-battle-script-removeitem-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
