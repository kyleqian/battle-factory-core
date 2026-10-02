#!/usr/bin/env node
// Differential corpus for the side-status screen family:
// B_SCR_OP_SETREFLECT (0x7E), B_SCR_OP_SETLIGHTSCREEN (0x92),
// B_SCR_OP_SETMIST (0x99), B_SCR_OP_SETSAFEGUARD (0xB8),
// B_SCR_OP_REMOVELIGHTSCREENREFLECT (0xEE) -- all five from
// src/engine/battleScriptSetSideStatusOpcode.ts, one registration
// convention (registerSingleInstruction).
//
// Expected values come only from executing the canonical TypeScript
// handlers through the real factory against the real committed program
// (custom programs only for registration-failure cases). This generator
// owns bounded input construction and Rust literal emission; it must
// never reimplement requireAttacker or the setter/mist/remove semantics.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-set-side-status-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src",
  "battle_script_set_side_status_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetSideStatusOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const NAMES = {
  setreflect: { name: "B_SCR_OP_SETREFLECT", id: 0x7e, dispatcher: "Cmd_setreflect" },
  setlightscreen: { name: "B_SCR_OP_SETLIGHTSCREEN", id: 0x92, dispatcher: "Cmd_setlightscreen" },
  setmist: { name: "B_SCR_OP_SETMIST", id: 0x99, dispatcher: "Cmd_setmist" },
  setsafeguard: { name: "B_SCR_OP_SETSAFEGUARD", id: 0xb8, dispatcher: "Cmd_setsafeguard" },
  removelightscreenreflect: {
    name: "B_SCR_OP_REMOVELIGHTSCREENREFLECT", id: 0xee, dispatcher: "Cmd_removelightscreenreflect",
  },
};
const CALL_SITE_COUNTS = {
  setreflect: 1, setlightscreen: 1, setmist: 1, setsafeguard: 1, removelightscreenreflect: 1,
};

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-set-side-status-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function rustString(value) { return JSON.stringify(value); }

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60 + index * 3, defense: 60 + index * 2, spAttack: 60 + index, spDefense: 60 + index * 4,
    level: 50, hp: 100, maxHP: 100, status1: 0, status2: 0, status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], flashFireBoosted: 0, helpingHand: 0,
    endured: 0, focusBanded: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side, ability: spec.ability, hp: spec.hp, maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]), pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1, status2: spec.status2, status3: spec.status3,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, item: spec.item, statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()), species: spec.species,
    attack: spec.attack, defense: spec.defense, spAttack: spec.spAttack, spDefense: spec.spDefense,
    speed: 60, level: spec.level, friendship: 70, partyIndex: index,
    flashFireBoosted: spec.flashFireBoosted, helpingHand: spec.helpingHand,
    targetNotAffected: 0, endured: spec.endured,
    specialStatus: Object.freeze({ focusBanded: spec.focusBanded }),
  });
}

function sideTimerInput(overrides = {}) {
  return {
    reflectTimer: 0, reflectBattlerId: 0, lightscreenTimer: 0, lightscreenBattlerId: 0,
    safeguardTimer: 0, safeguardBattlerId: 0, mistBattlerId: 0, ...overrides,
  };
}

function canonicalRules({
  battlerSpecs, attacker, sideStatuses = [0, 0], sideTimers = [sideTimerInput(), sideTimerInput()],
  mistTimers = [0, 0],
}) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target: null, effectBattler: attacker ?? 0 }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    lastLandedMoves: Object.freeze([0, 0, 0, 0]),
    lastHitByType: Object.freeze([0, 0, 0, 0]),
    aiObservedAbilityIds: Object.freeze([0, 0, 0, 0]),
    aiObservedItemEffects: Object.freeze([0, 0, 0, 0]),
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
    }),
    battleTopology: Object.freeze({
      battlersCount: 2, battleTypeFlags: 0,
      battlerPositions: Object.freeze([0, 1, 0xff, 0xff]),
    }),
    absentBattlerFlags: 0,
    sideStatuses: Object.freeze(sideStatuses),
    mistTimers: Object.freeze(mistTimers),
    sideTimers: Object.freeze(sideTimers.map((value) => Object.freeze(value))),
    futureSightCounter: Object.freeze([0, 0, 0, 0]),
    futureSightMove: Object.freeze([0, 0, 0, 0]),
    futureSightAttacker: Object.freeze([0, 0, 0, 0]),
    futureSightDmg: Object.freeze([0, 0, 0, 0]),
    multistringChooser: 0xff,
    dynamicBasePower: 0,
    dynamicMoveType: 0,
    weather: 0,
    enigmaBerryHoldEffects: Object.freeze([0, 0, 0, 0]),
    enigmaBerryHoldEffectParams: Object.freeze([0, 0, 0, 0]),
    animTurn: 0xff,
    animTargetsHit: 0xff,
    battleMoveDamage: 0,
  });
}

function baseSpec(overrides = {}) {
  const battlerSpecs = [0, 1, 2, 3].map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, ...overrides };
}

function projectRules(rules) {
  return Object.freeze({
    sides: freezeArray(rules.battlers.map((b) => b.side)),
    sideStatuses: freezeArray(rules.sideStatuses),
    sideTimers: freezeArray(rules.sideTimers.map((timer) => Object.freeze({
      reflectTimer: timer.reflectTimer, reflectBattlerId: timer.reflectBattlerId,
      lightscreenTimer: timer.lightscreenTimer, lightscreenBattlerId: timer.lightscreenBattlerId,
      safeguardTimer: timer.safeguardTimer, safeguardBattlerId: timer.safeguardBattlerId,
      mistBattlerId: timer.mistBattlerId,
    }))),
    mistTimers: freezeArray(rules.mistTimers),
    moveResultFlags: rules.moveResultFlags,
    multistringChooser: rules.multistringChooser,
    animTurn: rules.animTurn,
    animTargetsHit: rules.animTargetsHit,
    attacker: rules.selectorRoles.attacker,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();
const instructionsByOpcode = {};
for (const key of Object.keys(NAMES)) {
  const found = program.instructions.filter((value) => value.opcodeName === NAMES[key].name);
  assert(found.length === CALL_SITE_COUNTS[key], `${key} concrete call-site count drifted: ${found.length}`);
  instructionsByOpcode[key] = found;
}

const handlers = opcodeModule.createBattleScriptSetSideStatusOpcodeHandlers(program);
const handlerByOpcode = {};
for (const key of Object.keys(NAMES)) {
  handlerByOpcode[key] = handlers[NAMES[key].id];
  assert(typeof handlerByOpcode[key] === "function", `${key} handler did not register`);
}

const ENTRY_LABEL = "BattleScript_EffectStockpile"; // any valid label; programCounter is overridden.

function sourceOutcome(key, rulesSpec) {
  const handler = handlerByOpcode[key];
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const instruction = instructionsByOpcode[key][0];
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter });
    const transition = handler({ program, instruction, state });
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "must never emit events");
    assert(transition.control.kind === "advance", `unexpected control kind ${transition.control.kind}`);
    const outRules = transition.rulesContext ?? rules;
    return Object.freeze({ expected: projectRules(outRules), error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({ expected: null, error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error !== null) {
    assert(outcome.error === "Cmd_set<sidestatus> requires an attacker role", `unknown canonical error: ${outcome.error}`);
    return "missing-attacker-role";
  }
  return "advance";
}

const cases = [];
function addCase(label, category, key, rulesSpec) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(key, rulesSpec);
  cases.push(Object.freeze({
    label, category, opcode: key, branch: branchFor(outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    ...outcome,
  }));
}

// --- setreflect --------------------------------------------------------------
addCase("setreflect_success_clean", "setreflect", "setreflect", baseSpec());
addCase(
  "setreflect_success_other_screens_preserved", "setreflect", "setreflect",
  baseSpec({ sideStatuses: [0x22, 0] }), // LIGHTSCREEN | MIST already up on side 0
);
addCase(
  "setreflect_fail_already_active", "setreflect", "setreflect",
  baseSpec({ sideStatuses: [0x1, 0] }),
);
addCase(
  "setreflect_attacker_side0", "setreflect", "setreflect",
  baseSpec({ attacker: 0 }),
);
addCase(
  "setreflect_attacker_side1", "setreflect", "setreflect",
  baseSpec({ attacker: 1 }),
);
addCase(
  "setreflect_missing_attacker_role", "setreflect", "setreflect",
  baseSpec({ attacker: null }),
);

// --- setlightscreen ------------------------------------------------------------
addCase("setlightscreen_success_clean", "setlightscreen", "setlightscreen", baseSpec());
addCase(
  "setlightscreen_success_other_screens_preserved", "setlightscreen", "setlightscreen",
  baseSpec({ sideStatuses: [0x21, 0] }), // REFLECT | SAFEGUARD already up on side 0
);
addCase(
  "setlightscreen_fail_already_active", "setlightscreen", "setlightscreen",
  baseSpec({ sideStatuses: [0x2, 0] }),
);
addCase(
  "setlightscreen_attacker_side0", "setlightscreen", "setlightscreen",
  baseSpec({ attacker: 0 }),
);
addCase(
  "setlightscreen_attacker_side1", "setlightscreen", "setlightscreen",
  baseSpec({ attacker: 3 }),
);
addCase(
  "setlightscreen_missing_attacker_role", "setlightscreen", "setlightscreen",
  baseSpec({ attacker: null }),
);

// --- setsafeguard --------------------------------------------------------------
addCase("setsafeguard_success_clean", "setsafeguard", "setsafeguard", baseSpec());
addCase(
  "setsafeguard_success_other_screens_preserved", "setsafeguard", "setsafeguard",
  baseSpec({ sideStatuses: [0x3, 0] }), // REFLECT | LIGHTSCREEN already up on side 0
);
addCase(
  "setsafeguard_fail_already_active", "setsafeguard", "setsafeguard",
  baseSpec({ sideStatuses: [0x20, 0] }),
);
addCase(
  "setsafeguard_attacker_side0", "setsafeguard", "setsafeguard",
  baseSpec({ attacker: 0 }),
);
addCase(
  "setsafeguard_attacker_side1", "setsafeguard", "setsafeguard",
  baseSpec({ attacker: 1 }),
);
addCase(
  "setsafeguard_missing_attacker_role", "setsafeguard", "setsafeguard",
  baseSpec({ attacker: null }),
);

// --- setmist ---------------------------------------------------------------
addCase("setmist_success_clean", "setmist", "setmist", baseSpec());
addCase(
  "setmist_fail_timer_nonzero", "setmist", "setmist",
  baseSpec({ mistTimers: [3, 0] }),
);
addCase(
  // Pinned edge: SIDE_STATUS_MIST bit already set but the raw timer is 0 --
  // the guard reads the timer, not the bit, so this still SUCCEEDS.
  "setmist_success_bit_set_timer_zero_edge", "setmist", "setmist",
  baseSpec({ sideStatuses: [0x100, 0] }),
);
addCase(
  "setmist_attacker_side1", "setmist", "setmist",
  baseSpec({ attacker: 1 }),
);
addCase(
  "setmist_missing_attacker_role", "setmist", "setmist",
  baseSpec({ attacker: null }),
);

// --- removelightscreenreflect -------------------------------------------------
addCase("removelightscreenreflect_no_screens_noop", "removelightscreenreflect", "removelightscreenreflect", baseSpec());
addCase(
  "removelightscreenreflect_reflect_only", "removelightscreenreflect", "removelightscreenreflect",
  baseSpec({
    sideStatuses: [0, 0x1],
    sideTimers: [sideTimerInput(), sideTimerInput({ reflectTimer: 3 })],
  }),
);
addCase(
  "removelightscreenreflect_lightscreen_only", "removelightscreenreflect", "removelightscreenreflect",
  baseSpec({
    sideStatuses: [0, 0x2],
    sideTimers: [sideTimerInput(), sideTimerInput({ lightscreenTimer: 4 })],
  }),
);
addCase(
  "removelightscreenreflect_both_up", "removelightscreenreflect", "removelightscreenreflect",
  baseSpec({
    sideStatuses: [0x20, 0x3], // own side (safeguard) untouched, opposing both cleared
    sideTimers: [sideTimerInput(), sideTimerInput({ reflectTimer: 5, lightscreenTimer: 5 })],
  }),
);
addCase(
  "removelightscreenreflect_attacker_side0", "removelightscreenreflect", "removelightscreenreflect",
  baseSpec({
    attacker: 0,
    sideStatuses: [0, 0x3],
    sideTimers: [sideTimerInput(), sideTimerInput({ reflectTimer: 5, lightscreenTimer: 5 })],
  }),
);
addCase(
  "removelightscreenreflect_attacker_side1", "removelightscreenreflect", "removelightscreenreflect",
  baseSpec({
    attacker: 1,
    sideStatuses: [0x3, 0],
    sideTimers: [sideTimerInput({ reflectTimer: 5, lightscreenTimer: 5 }), sideTimerInput()],
  }),
);
addCase(
  "removelightscreenreflect_missing_attacker_role", "removelightscreenreflect", "removelightscreenreflect",
  baseSpec({ attacker: null }),
);

const uniqueLabels = new Set(cases.map((value) => value.label));
assert(uniqueLabels.size === cases.length, "duplicate case labels");

// === Registration ============================================================
function sourceRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = opcodeModule.createBattleScriptSetSideStatusOpcodeHandlers(customProgram);
    for (const key of Object.keys(NAMES)) {
      assert(typeof registered[NAMES[key].id] === "function", `${key} handler missing after successful registration`);
    }
    return Object.freeze({ registered: true, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registered: false, error: error.message });
  }
}

const dedupedInstructions = [];
{
  const seenNames = new Set();
  for (const instruction of program.instructions) {
    if (!seenNames.has(instruction.opcodeName)) {
      seenNames.add(instruction.opcodeName);
      dedupedInstructions.push(instruction);
    }
  }
}

const registrationCases = [];
function addRegistration(label, instructions) {
  const outcome = sourceRegistration(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions: freezeArray(instructions.map((value) => Object.freeze({
      opcodeName: value.opcodeName, opcodeId: value.opcodeId, programCounter: value.programCounter,
      operandCount: value.operands.length,
    }))),
    expectedRegistered: outcome.registered, expectedError: outcome.error,
  }));
}

addRegistration("full_program_registers_all_five", dedupedInstructions);

const reflectInstruction = instructionsByOpcode.setreflect[0];
addRegistration(
  "setreflect_duplicate_two_instructions",
  dedupedInstructions.filter((v) => v.opcodeName !== NAMES.setreflect.name).concat([reflectInstruction, reflectInstruction]),
);
addRegistration(
  "setreflect_nonzero_operands",
  dedupedInstructions.filter((v) => v.opcodeName !== NAMES.setreflect.name).concat([
    Object.freeze({ ...reflectInstruction, operands: Object.freeze([Object.freeze({ width: 1, expression: "0" })]) }),
  ]),
);
addRegistration(
  "setreflect_missing_entirely",
  dedupedInstructions.filter((v) => v.opcodeName !== NAMES.setreflect.name),
);

const mistInstruction = instructionsByOpcode.setmist[0];
addRegistration(
  "setmist_duplicate_two_instructions",
  dedupedInstructions.filter((v) => v.opcodeName !== NAMES.setmist.name).concat([mistInstruction, mistInstruction]),
);
addRegistration(
  "setmist_nonzero_operands",
  dedupedInstructions.filter((v) => v.opcodeName !== NAMES.setmist.name).concat([
    Object.freeze({ ...mistInstruction, operands: Object.freeze([Object.freeze({ width: 1, expression: "0" })]) }),
  ]),
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const opcodeCensus = census(cases, (value) => value.opcode);
const registrationBranchCensus = census(registrationCases, (value) => (value.expectedError === null ? "registered" : "not-registered"));

const corpus = Object.freeze({
  categoryCensus, branchCensus, opcodeCensus, registrationBranchCensus,
  cases, registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustBattlerId(value) { return `${value}u8`; }
function rustArr4u8(values) { return `[${values.map(rustBattlerId).join(", ")}]`; }
function rustTimer(value) {
  return `BattleScriptSetSideStatusVectorSideTimer { reflect_timer: ${value.reflectTimer}u8, reflect_battler_id: ${value.reflectBattlerId}u8, lightscreen_timer: ${value.lightscreenTimer}u8, lightscreen_battler_id: ${value.lightscreenBattlerId}u8, safeguard_timer: ${value.safeguardTimer}u8, safeguard_battler_id: ${value.safeguardBattlerId}u8, mist_battler_id: ${value.mistBattlerId}u8 }`;
}
function rustState(value) {
  return `BattleScriptSetSideStatusVectorRules { sides: ${rustArr4u8(value.sides)}, side_statuses: [${value.sideStatuses[0]}u32, ${value.sideStatuses[1]}u32], side_timers: [${rustTimer(value.sideTimers[0])}, ${rustTimer(value.sideTimers[1])}], mist_timers: [${value.mistTimers[0]}u8, ${value.mistTimers[1]}u8], move_result_flags: ${value.moveResultFlags}u32, multistring_chooser: ${value.multistringChooser}u8, anim_turn: ${value.animTurn}u8, anim_targets_hit: ${value.animTargetsHit}u8, attacker: ${value.attacker === null ? "None" : `Some(${value.attacker}u8)`} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustInstruction(value) {
  return `BattleScriptSetSideStatusVectorInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter}, operand_count: ${value.operandCount}usize }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-set-side-status-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSetSideStatusOpcode.ts via");
lines.push("// node --experimental-strip-types. Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SET_SIDE_STATUS_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetSideStatusVectorSideTimer { pub reflect_timer: u8, pub reflect_battler_id: u8, pub lightscreen_timer: u8, pub lightscreen_battler_id: u8, pub safeguard_timer: u8, pub safeguard_battler_id: u8, pub mist_battler_id: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetSideStatusVectorRules { pub sides: [u8; 4], pub side_statuses: [u32; 2], pub side_timers: [BattleScriptSetSideStatusVectorSideTimer; 2], pub mist_timers: [u8; 2], pub move_result_flags: u32, pub multistring_chooser: u8, pub anim_turn: u8, pub anim_targets_hit: u8, pub attacker: Option<u8> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetSideStatusVectorInstruction { pub opcode_name: &'static str, pub opcode_id: u8, pub program_counter: u32, pub operand_count: usize }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetSideStatusVectorCase { pub label: &'static str, pub category: &'static str, pub opcode: &'static str, pub branch: &'static str, pub initial: BattleScriptSetSideStatusVectorRules, pub expected: Option<BattleScriptSetSideStatusVectorRules>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSetSideStatusRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptSetSideStatusVectorInstruction], pub expected_registered: bool, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_SET_SIDE_STATUS_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_SET_SIDE_STATUS_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_SET_SIDE_STATUS_OPCODE_CENSUS", opcodeCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_SET_SIDE_STATUS_CASES: [BattleScriptSetSideStatusVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetSideStatusVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, opcode: ${rustString(value.opcode)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_SET_SIDE_STATUS_REGISTRATION_CASES: [BattleScriptSetSideStatusRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSetSideStatusRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_registered: ${value.expectedRegistered}, expected_error: ${rustOptionalString(value.expectedError)},`);
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
if (!formatted) throw new Error("gen-battle-script-set-side-status-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
