#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptRefreshOpcode.ts.
// Expected controls, complete projected state, scheduler changes, events,
// ordered errors, repetitions, and registration results come from executing
// the canonical TypeScript implementation.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-refresh-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(workspaceRoot, "core-rs", "crates", "factory-core", "src",
  "battle_script_refresh_vectors_gen.rs");
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule, constantsModule] =
  await Promise.all([
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRefreshOpcode.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSourceConstants.ts")).href),
  ]);

const OPCODE_NAME = "B_SCR_OP_CUREIFBURNEDPARALYZEDORPOISONED";
const OPCODE_ID = 0xcd;
const DISPATCHER = "Cmd_cureifburnedparalyzedorpoisoned";
const ENTRY_LABEL = "BattleScript_EffectRefresh";
const FAILURE_LABEL = "BattleScript_ButItFailed";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const SIDES = Object.freeze([0, 1]);
const PARTY_INDEXES = Object.freeze([0, 1, 2, 3, 4, 5]);
const CURE_MASK = constantsModule.BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK >>> 0;
const STATUS_DOMAIN = Object.freeze([
  0,
  1, 2, 3, 4, 5, 6, 7,
  1 << 3, 1 << 4, 1 << 5, 1 << 6, 1 << 7,
  ...Array.from({ length: 24 }, (_, index) => (2 ** (index + 8)) >>> 0),
  CURE_MASK,
  ((1 << 3) | (1 << 5)) >>> 0,
  ((1 << 4) | (1 << 6)) >>> 0,
  ((1 << 7) | (1 << 31)) >>> 0,
  0xffff_ffff,
]);
const MAX_APPLICATIONS = 3;
const GENERATED_FILE_MAX_BYTES = 2_000_000;

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-refresh-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function optionBattler(value) { return value === null ? "None" : `Some(${battler(value)})`; }
function battler(value) { return `BattleScriptRefreshBattler::Battler${value}`; }
function side(value) { return value === 0 ? "BattleScriptRefreshSide::Player" : "BattleScriptRefreshSide::Opponent"; }
function hex8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function hex16(value) { return `0x${value.toString(16).padStart(4, "0")}`; }
function hex32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustString(value) { return JSON.stringify(value); }

function partyMember(sideValue, index, salt, status1) {
  return Object.freeze({
    status1: status1 >>> 0,
    hp: 40 + sideValue * 50 + index + salt % 13,
    species: 1 + sideValue * 100 + index,
    item: 200 + sideValue * 10 + index,
    personality: (0x1020_3040 + sideValue * 0x0101_0101 + index * 0x0010_1010 + salt) >>> 0,
  });
}

function makeProjection({ attacker, attackerSide = 0, partyIndex = 0, status1 = 0,
  pending = [], salt = 0, activeBattler = null }) {
  const battlers = BATTLERS.map((slot) => Object.freeze({
    side: slot === attacker ? attackerSide : ((slot + salt) & 1),
    partyIndex: slot === attacker ? partyIndex : ((slot + salt + 2) % 6),
    status1: slot === attacker ? status1 >>> 0 : (0xa500_0000 ^ (slot * 0x0101_0101) ^ salt) >>> 0,
    status2: (0xb600_0011 ^ (slot * 0x1010_1010) ^ salt) >>> 0,
    status3: (0xc700_0022 ^ (slot * 0x0100_1001) ^ salt) >>> 0,
    hp: 80 + slot + salt % 17,
    item: 100 + slot + salt % 23,
    ability: (slot * 17 + salt) & 0xff,
  }));
  const party = SIDES.map((sideValue) => PARTY_INDEXES.map((index) => {
    const mapped = attacker !== null && sideValue === attackerSide && index === partyIndex;
    return partyMember(sideValue, index, salt, mapped ? status1 :
      (0xd800_0000 ^ (sideValue * 0x1111_1111) ^ (index * 0x0101_0101) ^ salt) >>> 0);
  }));
  return Object.freeze({
    battlers: freezeArray(battlers),
    party: freezeArray(party.map(freezeArray)),
    attacker,
    target: (salt + 1) % 4,
    effectBattler: (salt + 2) % 4,
    fainted: salt % 3 === 0 ? null : (salt + 3) % 4,
    context: Object.freeze({
      scriptingBattler: (salt + 3) % 4,
      currentMove: 287,
      currentMovePosition: salt & 3,
      moveResultFlags: (0x80 ^ salt) & 0xff,
      battleMoveDamage: (salt & 1) === 0 ? -1234567 - salt : 1234567 + salt,
      hitMarker: (0x89ab_cdef ^ salt) >>> 0,
      multiHitCounter: (salt * 7) & 0xff,
      battleOutcome: (salt * 11) & 0xff,
    }),
    scheduler: Object.freeze({
      messageDisplayActive: (salt & 1) !== 0,
      pauseCounterBattle: (0xff00 + salt) & 0xffff,
      activeBattler,
      pendingControllerBattlers: freezeArray(pending),
    }),
    rngValue: (0xdead_beef ^ salt) >>> 0,
    rngCalls: salt >>> 0,
    eventHistory: freezeArray([(0x1111_0000 ^ salt) >>> 0, (0x2222_0000 ^ salt) >>> 0,
      (0x3333_0000 ^ salt) >>> 0]),
  });
}

function canonicalPartyMember(value) {
  return Object.freeze({
    species: value.species, hp: value.hp, maxHP: value.hp + 40, status1: value.status1,
    item: value.item, personality: value.personality, level: 50, friendship: 70,
    moves: Object.freeze([287, 33, 45, 98]), pp: Object.freeze([20, 35, 40, 30]),
  });
}

function canonicalBattler(value) {
  return Object.freeze({
    side: value.side, ability: value.ability, hp: value.hp, maxHP: value.hp + 40,
    moves: Object.freeze([287, 33, 45, 98]), pp: Object.freeze([20, 35, 40, 30]),
    status1: value.status1, status2: value.status2, status3: value.status3,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0,
    rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0,
    tauntTimer: 0, usedTauntedMove: 0, usedImprisonedMove: 0, item: value.item,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1,
    attack: 50, defense: 51, speed: 52, spAttack: 53, spDefense: 54,
    level: 50, friendship: 70, partyIndex: value.partyIndex,
  });
}

function canonicalRules(value) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(value.battlers.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker: value.attacker, target: value.target,
      effectBattler: value.effectBattler, fainted: value.fainted }),
    scriptingBattler: value.context.scriptingBattler,
    atkCancelerTracker: 7,
    battleOutcome: value.context.battleOutcome,
    currentMove: value.context.currentMove,
    currentMovePosition: value.context.currentMovePosition,
    moveResultFlags: value.context.moveResultFlags,
    dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0, missType: 0,
    hitMarker: value.context.hitMarker, multiHitCounter: value.context.multiHitCounter,
    battleMoveDamage: value.context.battleMoveDamage,
    battleTopology: Object.freeze({ battlersCount: 4, battleTypeFlags: 1,
      battlerPositions: Object.freeze([0, 1, 2, 3]) }),
    party: Object.freeze({
      player: freezeArray(value.party[0].map(canonicalPartyMember)),
      opponent: freezeArray(value.party[1].map(canonicalPartyMember)),
    }),
  });
}

function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((value) => Object.freeze({
      side: value.side, partyIndex: value.partyIndex, status1: value.status1 >>> 0,
      status2: value.status2 >>> 0, status3: value.status3 >>> 0, hp: value.hp,
      item: value.item, ability: value.ability,
    }))),
    party: freezeArray([rules.party.player, rules.party.opponent].map((members) =>
      freezeArray(members.map((value) => Object.freeze({
        status1: value.status1 >>> 0, hp: value.hp, species: value.species, item: value.item,
        personality: value.personality >>> 0,
      }))))),
    attacker: rules.selectorRoles.attacker, target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler, fainted: rules.selectorRoles.fainted,
    context: Object.freeze({
      scriptingBattler: rules.scriptingBattler, currentMove: rules.currentMove,
      currentMovePosition: rules.currentMovePosition, moveResultFlags: rules.moveResultFlags,
      battleMoveDamage: rules.battleMoveDamage, hitMarker: rules.hitMarker >>> 0,
      multiHitCounter: rules.multiHitCounter, battleOutcome: rules.battleOutcome,
    }),
  });
}

function projectScheduler(scheduler) {
  return Object.freeze({
    messageDisplayActive: scheduler.messageDisplayActive,
    pauseCounterBattle: scheduler.pauseCounterBattle,
    activeBattler: scheduler.activeBattler,
    pendingControllerBattlers: freezeArray(scheduler.pendingControllerBattlers),
  });
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((value) => value.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical singleton instruction drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "opcode identity drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "dispatcher identity drifted");
assert(canonicalInstruction.programCounter === 1803, "program counter drifted");
assert(canonicalInstruction.operands.length === 1 && canonicalInstruction.operands[0].widthBytes === 4,
  "canonical pointer shape drifted");
assert(canonicalInstruction.operands[0].expression === FAILURE_LABEL, "failure label drifted");
assert(CURE_MASK === 0x0000_00d8, "complete Refresh cure mask drifted");

function instruction(overrides = {}) {
  const operandMode = overrides.operandMode ?? "canonical";
  const operands = operandMode === "missing" ? [] : operandMode === "double"
    ? [canonicalInstruction.operands[0], canonicalInstruction.operands[0]]
    : [Object.freeze({ ...canonicalInstruction.operands[0],
      widthBytes: overrides.pointerWidth ?? 4,
      expression: overrides.failureExpression ?? FAILURE_LABEL })];
  return Object.freeze({ ...canonicalInstruction, opcodeId: overrides.opcodeId ?? OPCODE_ID,
    dispatcher: overrides.dispatcher ?? DISPATCHER, operands: freezeArray(operands) });
}

function execute(initial, instructionValue = canonicalInstruction, applications = 1) {
  let rules = canonicalRules(initial);
  let scheduler = machineModule.createBattleScriptSchedulerState(initial.scheduler);
  const controls = [];
  const events = [];
  let expectedError = null;
  for (let application = 0; application < applications; application += 1) {
    const state = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules,
      initial.rngValue, scheduler);
    const handlerProgram = instructionValue.operands[0]?.expression === FAILURE_LABEL
      ? program
      : Object.freeze({ ...program });
    let transition;
    try {
      const handlers = opcodeModule.createBattleScriptRefreshOpcodeHandlers(program);
      transition = handlers[OPCODE_ID]({ program: handlerProgram, instruction: instructionValue, state });
    } catch (error) {
      assert(error instanceof Error, "canonical handler threw non-Error");
      expectedError = error.message;
      break;
    }
    controls.push(transition.control.kind === "advance" ? "Advance" : "FailJump");
    assert(transition.events.length <= 1, "Refresh emitted more than one event");
    events.push(transition.events.length === 0 ? null : transition.events[0]);
    rules = transition.rulesContext;
    scheduler = transition.scheduler;
  }
  return Object.freeze({
    expectedRules: expectedError === null ? projectRules(rules) : null,
    expectedScheduler: expectedError === null ? projectScheduler(scheduler) : null,
    controls: freezeArray(controls), events: freezeArray(events), expectedError,
  });
}

const cases = [];
function addCase(label, category, initial, instructionValue = canonicalInstruction, applications = 1) {
  const result = execute(initial, instructionValue, applications);
  cases.push(Object.freeze({ label, category, applications, instruction: instructionValue,
    initial, ...result }));
}

let salt = 0;
for (const attacker of BATTLERS) {
  for (const attackerSide of SIDES) {
    for (const partyIndex of PARTY_INDEXES) {
      addCase(`mapping-a${attacker}-s${attackerSide}-p${partyIndex}`,
        "attacker-side-party-index-mapping",
        makeProjection({ attacker, attackerSide, partyIndex,
          status1: [8, 16, 64, 128][attacker], salt: salt++ }));
    }
  }
}
for (const status1 of STATUS_DOMAIN) {
  addCase(`status-${hex32(status1)}`, "complete-u32-mask-boundaries",
    makeProjection({ attacker: salt % 4, attackerSide: (salt >>> 1) & 1,
      partyIndex: salt % 6, status1, salt: salt++ }));
}
for (const pending of [[], [0], [1], [3, 1], [2, 0, 3], [3, 2, 1, 0]]) {
  const attacker = pending.length === 4 ? 2 : (pending.includes(2) ? 2 : 2);
  addCase(`scheduler-${pending.join("") || "empty"}`, "scheduler-pending-preservation",
    makeProjection({ attacker, attackerSide: 1, partyIndex: 5, status1: 0x8000_0010,
      pending, activeBattler: pending.length % 2 === 0 ? null : 3, salt: salt++ }));
}
addCase("missing-attacker", "ordered-errors",
  makeProjection({ attacker: null, status1: 8, salt: salt++ }));
for (const [label, malformed] of [
  ["wrong-opcode", instruction({ opcodeId: 0xcc })],
  ["wrong-dispatcher", instruction({ dispatcher: "Cmd_settorment" })],
  ["missing-operand", instruction({ operandMode: "missing" })],
  ["double-operand", instruction({ operandMode: "double" })],
  ["wrong-pointer-width", instruction({ pointerWidth: 2 })],
]) {
  addCase(label, "malformed-before-attacker",
    makeProjection({ attacker: null, status1: 8, salt: salt++ }), malformed);
}
addCase("unresolved-failure", "late-label-resolution",
  makeProjection({ attacker: 1, attackerSide: 1, partyIndex: 4, status1: 0, salt: salt++ }),
  instruction({ failureExpression: "MissingRefreshFailure" }));
addCase("unresolved-success", "late-label-resolution",
  makeProjection({ attacker: 3, attackerSide: 0, partyIndex: 2, status1: 0x40, salt: salt++ }),
  instruction({ failureExpression: "MissingRefreshFailure" }));
addCase("repeat-success-then-failure", "repetitions",
  makeProjection({ attacker: 0, attackerSide: 0, partyIndex: 0, status1: 0xffff_ffff,
    pending: [3], salt: salt++ }), canonicalInstruction, 3);
addCase("repeat-unresolved-after-success", "repetitions",
  makeProjection({ attacker: 2, attackerSide: 1, partyIndex: 5, status1: 8,
    pending: [0, 1], salt: salt++ }), instruction({ failureExpression: "MissingRefreshFailure" }), 2);

function registrationProgram(instructions) {
  return Object.freeze({ ...program, instructions: freezeArray(instructions) });
}
function registration(label, instructions) {
  let opcodeId = null;
  let expectedError = null;
  try {
    const handlers = opcodeModule.createBattleScriptRefreshOpcodeHandlers(registrationProgram(instructions));
    opcodeId = Number(Object.keys(handlers)[0]);
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error");
    expectedError = error.message;
  }
  return Object.freeze({ label, instructions: freezeArray(instructions), opcodeId, expectedError });
}
const noise = Object.freeze({ ...canonicalInstruction, opcodeName: "B_SCR_OP_SETTORMENT",
  opcodeId: 0xce, dispatcher: "Cmd_settorment" });
const registrationCases = Object.freeze([
  registration("singleton", [canonicalInstruction]),
  registration("noise-before", [noise, canonicalInstruction]),
  registration("noise-after", [canonicalInstruction, noise]),
  registration("missing", [noise]),
  registration("empty", []),
  registration("duplicate-adjacent", [canonicalInstruction, canonicalInstruction]),
  registration("duplicate-separated", [canonicalInstruction, noise, canonicalInstruction]),
  registration("singleton-wrong-opcode", [instruction({ opcodeId: 0xcc })]),
  registration("singleton-wrong-dispatcher", [instruction({ dispatcher: "Cmd_settorment" })]),
  registration("singleton-missing-operand", [instruction({ operandMode: "missing" })]),
  registration("singleton-double-operand", [instruction({ operandMode: "double" })]),
  registration("singleton-wrong-width", [instruction({ pointerWidth: 1 })]),
]);

function rustPartyMember(value) {
  return `BattleScriptRefreshPartyMember { status1: ${hex32(value.status1)}, hp: ${hex16(value.hp)}, species: ${hex16(value.species)}, item: ${hex16(value.item)}, personality: ${hex32(value.personality)} }`;
}
function rustBattlerState(value) {
  return `BattleScriptRefreshBattlerState { side: ${side(value.side)}, party_index: ${hex8(value.partyIndex)}, status1: ${hex32(value.status1)}, status2: ${hex32(value.status2)}, status3: ${hex32(value.status3)}, hp: ${hex16(value.hp)}, item: ${hex16(value.item)}, ability: ${hex8(value.ability)} }`;
}
function rustRules(value) {
  return `BattleScriptRefreshRules { battlers: [${value.battlers.map(rustBattlerState).join(", ")}], party: [[${value.party[0].map(rustPartyMember).join(", ")}], [${value.party[1].map(rustPartyMember).join(", ")}]], selector_roles: BattleScriptRefreshRoles { attacker: ${optionBattler(value.attacker)}, target: ${optionBattler(value.target)}, effect_battler: ${optionBattler(value.effectBattler)}, fainted: ${optionBattler(value.fainted)} }, context_state: BattleScriptRefreshContextState { scripting_battler: ${battler(value.context.scriptingBattler)}, current_move: ${hex16(value.context.currentMove)}, current_move_position: ${hex8(value.context.currentMovePosition)}, move_result_flags: ${hex8(value.context.moveResultFlags)}, battle_move_damage: ${value.context.battleMoveDamage}, hit_marker: ${hex32(value.context.hitMarker)}, multi_hit_counter: ${hex8(value.context.multiHitCounter)}, battle_outcome: ${hex8(value.context.battleOutcome)} } }`;
}
function rustScheduler(value) {
  const pending = [...value.pendingControllerBattlers.map((item) => `Some(${battler(item)})`)];
  while (pending.length < 4) pending.push("None");
  return `BattleScriptRefreshScheduler { message_display_active: ${value.messageDisplayActive}, pause_counter_battle: ${hex16(value.pauseCounterBattle)}, active_battler: ${optionBattler(value.activeBattler)}, pending_controller_battlers: [${pending.join(", ")}], pending_count: ${value.pendingControllerBattlers.length} }`;
}
function rustMachine(value, scheduler = value.scheduler) {
  return `BattleScriptRefreshMachineSiblings { scheduler: ${rustScheduler(scheduler)}, rng_value: ${hex32(value.rngValue)}, rng_calls: ${hex32(value.rngCalls)}, event_history: [${value.eventHistory.map(hex32).join(", ")}] }`;
}
function rustOperand(value) {
  return `BattleScriptRefreshOperand { width_bytes: ${value.widthBytes}, expression: ${rustString(value.expression)} }`;
}
function rustInstruction(value) {
  const resolved = value.operands[0]?.expression === FAILURE_LABEL
    ? `Some(${rustString(FAILURE_LABEL)})` : "None";
  return `BattleScriptRefreshVectorInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${value.operands.map(rustOperand).join(", ")}], resolved_failure_target: ${resolved} }`;
}
function rustControl(value) { return `Some(BattleScriptRefreshControl::${value})`; }
function rustEvent(value) {
  return value === null ? "None" : `Some(BattleScriptRefreshEvent::SetBattlerStatusData { battler: ${battler(value.battler)}, status1: ${hex32(value.status1)} })`;
}
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionalRules(value) { return value === null ? "None" : `Some(${rustRules(value)})`; }
function rustOptionalScheduler(value) { return value === null ? "None" : `Some(${rustScheduler(value)})`; }

const corpusText = JSON.stringify({ cases, registrationCases });
const corpusHash = crypto.createHash("sha256").update(corpusText).digest("hex");
const categoryCounts = [...new Set(cases.map((value) => value.category))]
  .map((category) => [category, cases.filter((value) => value.category === category).length]);
const statusSuccess = STATUS_DOMAIN.filter((value) => (value & CURE_MASK) !== 0).length;
const statusFailure = STATUS_DOMAIN.length - statusSuccess;

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-refresh-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptRefreshOpcode.ts via Node.");
lines.push("//! Regenerate from any cwd with: node --experimental-strip-types core-rs/tools/gen-battle-script-refresh-vectors.mjs.");
lines.push("");
lines.push("use crate::battle_script_refresh::*;");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRefreshVectorInstruction {");
lines.push("    pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str, pub operands: &'static [BattleScriptRefreshOperand<'static>],");
lines.push("    pub resolved_failure_target: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRefreshVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub applications: u8,");
lines.push("    pub instruction: BattleScriptRefreshVectorInstruction,");
lines.push("    pub initial_rules: BattleScriptRefreshRules,");
lines.push("    pub initial_machine: BattleScriptRefreshMachineSiblings,");
lines.push("    pub expected_rules: Option<BattleScriptRefreshRules>,");
lines.push("    pub expected_scheduler: Option<BattleScriptRefreshScheduler>,");
lines.push(`    pub controls: [Option<BattleScriptRefreshControl>; ${MAX_APPLICATIONS}],`);
lines.push(`    pub events: [Option<BattleScriptRefreshEvent>; ${MAX_APPLICATIONS}],`);
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptRefreshRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub instructions: &'static [BattleScriptRefreshVectorInstruction],");
lines.push("    pub opcode_id: Option<u8>, pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_REFRESH_STATUS_DOMAIN: [u32; ${STATUS_DOMAIN.length}] = [${STATUS_DOMAIN.map(hex32).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_REFRESH_STATUS_BRANCH_COUNTS: [(&str, usize); 2] = [("success", ${statusSuccess}), ("failure", ${statusFailure})];`);
lines.push(`pub const BATTLE_SCRIPT_REFRESH_CATEGORY_CENSUS: [(&str, usize); ${categoryCounts.length}] = [`);
for (const [category, count] of categoryCounts) lines.push(`    (${rustString(category)}, ${count}),`);
lines.push("];" );
lines.push(`pub const BATTLE_SCRIPT_REFRESH_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_REFRESH_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub static BATTLE_SCRIPT_REFRESH_CASES: [BattleScriptRefreshVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  const controls = [...value.controls.map(rustControl)]; while (controls.length < MAX_APPLICATIONS) controls.push("None");
  const events = [...value.events.map(rustEvent)]; while (events.length < MAX_APPLICATIONS) events.push("None");
  lines.push("BattleScriptRefreshVectorCase {");
  lines.push(`label: ${rustString(value.label)}, category: ${rustString(value.category)}, applications: ${value.applications},`);
  lines.push(`instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`initial_rules: ${rustRules(projectRules(canonicalRules(value.initial)))},`);
  lines.push(`initial_machine: ${rustMachine(value.initial)},`);
  lines.push(`expected_rules: ${rustOptionalRules(value.expectedRules)},`);
  lines.push(`expected_scheduler: ${rustOptionalScheduler(value.expectedScheduler)},`);
  lines.push(`controls: [${controls.join(", ")}], events: [${events.join(", ")}],`);
  lines.push(`expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("},");
}
lines.push("];" );
lines.push(`pub static BATTLE_SCRIPT_REFRESH_REGISTRATION_CASES: [BattleScriptRefreshRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`BattleScriptRefreshRegistrationVectorCase { label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}], opcode_id: ${value.opcodeId === null ? "None" : `Some(${hex8(value.opcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)} },`);
}
lines.push("];" );

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains",
  "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath],
      { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-refresh-vectors: could not find rustfmt");
const generatedBytes = fs.readFileSync(outPath);
assert(generatedBytes.length <= GENERATED_FILE_MAX_BYTES,
  `generated file ${generatedBytes.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`gen-battle-script-refresh-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-refresh-vectors: ${cases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-refresh-vectors: corpus sha256 ${corpusHash} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-refresh-vectors: generated sha256 ${crypto.createHash("sha256").update(generatedBytes).digest("hex")} bytes ${generatedBytes.length}`);
console.log(`gen-battle-script-refresh-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
