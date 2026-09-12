#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_PPREDUCE (0x03) opcode.
//
// Expected rules/scheduler/events and registration outcomes come only from
// executing the canonical TypeScript `ppreduceOpcodeHandler`
// (src/engine/battleScriptHitChainOpcode.ts) through the real committed
// Battle Script program. This generator owns bounded input construction and
// Rust literal emission; it must not independently implement pressure
// counting, the deduct gate/clamp, or the transform gate.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-ppreduce-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src", "battle_script_ppreduce_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, hitChainModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-ppreduce-vectors: " + message);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function hex16(value) { return "0x" + (value & 0xffff).toString(16).padStart(4, "0"); }
function hex32(value) { return "0x" + (value >>> 0).toString(16).padStart(8, "0"); }
function rustString(value) { return JSON.stringify(value); }

const OPCODE_NAME = "B_SCR_OP_PPREDUCE";
const OPCODE_ID = 0x03;
const ABILITY_PRESSURE = 46;
const HITMARKER_NO_ATTACKSTRING = 1 << 9;
const HITMARKER_NO_PPDEDUCT = 1 << 11;
const STATUS2_TRANSFORMED = 1 << 21;
const MOVE_SELECTED = 33; // MOVE_TACKLE
const MOVE_FOES_AND_ALLY = 89; // MOVE_EARTHQUAKE
const MOVE_BOTH = 57; // MOVE_SURF
const MOVE_OPPONENTS_FIELD = 191; // MOVE_SPIKES

const stubPorts = Object.freeze({
  isControllerIdle: () => { throw new Error("ppreduce unexpectedly consulted isControllerIdle"); },
  prepareMessage: () => { throw new Error("ppreduce unexpectedly consulted prepareMessage"); },
  resolveBattlerForBattleScript: () => { throw new Error("ppreduce unexpectedly consulted resolveBattlerForBattleScript"); },
});

const program = programModule.loadBattleScriptProgram();
const ppreduceInstructions = program.instructions.filter((i) => i.opcodeName === OPCODE_NAME);
assert(ppreduceInstructions.length === 133, "ppreduce census drifted to " + ppreduceInstructions.length);

const handlers = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, stubPorts);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical ppreduce handler not registered at 0x03");
const canonicalInstruction = ppreduceInstructions[0];
const entryLabel = canonicalInstruction.source.label;
assert(typeof entryLabel === "string" && entryLabel.length > 0, "expected a source label for the first ppreduce site");

// ---------------------------------------------------------------------
// Rules construction
// ---------------------------------------------------------------------

function defaultBattlerSpec(index) {
  return Object.freeze({
    side: index % 2,
    partyIndex: Math.floor(index / 2),
    pp: freezeArray([35, 10, 15, 20]),
    ability: 0,
    status2: 0,
    ppNotAffectedByPressure: 0,
  });
}

function canonicalBattler(spec) {
  return Object.freeze({
    side: spec.side, ability: spec.ability, hp: 100, maxHP: 100,
    moves: freezeArray([33, 45, 98, 57]), pp: freezeArray(spec.pp),
    status1: 0, status2: spec.status2, status3: 0, item: 0,
    statStages: freezeArray([6, 6, 6, 6, 6, 6, 6, 6]),
    types: freezeArray(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1,
    attack: 50, defense: 51, speed: 52, spAttack: 53, spDefense: 54,
    level: 50, friendship: 70, partyIndex: spec.partyIndex,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, ppNotAffectedByPressure: spec.ppNotAffectedByPressure,
  });
}

// Baseline distinct per-slot pp so untouched party members/slots are pinned.
function baselinePartyPp(side, partyIndex) {
  const base = 60 + side * 10 + partyIndex * 5;
  return freezeArray([base, base + 1, base + 2, base + 3]);
}

function makeRules(overrides) {
  const {
    attacker = 0, target = 1, battlersCount = 2,
    battlerSpecs = null, currentMove = MOVE_SELECTED, currentMovePosition = 0, hitMarker = 0,
  } = overrides;
  const specs = [0, 1, 2, 3].map((index) => {
    const custom = battlerSpecs?.[index];
    const base = defaultBattlerSpec(index);
    return custom ? Object.freeze({ ...base, ...custom }) : base;
  });
  const partySlots = [0, 1, 2]; // native corpus only stages 3 members per side
  const party = {
    player: freezeArray(partySlots.map((partyIndex) => {
      const owner = specs.find((s) => s.side === 0 && s.partyIndex === partyIndex);
      return Object.freeze({ pp: owner ? owner.pp : baselinePartyPp(0, partyIndex) });
    }).concat([{ pp: [0, 0, 0, 0] }, { pp: [0, 0, 0, 0] }, { pp: [0, 0, 0, 0] }])),
    opponent: freezeArray(partySlots.map((partyIndex) => {
      const owner = specs.find((s) => s.side === 1 && s.partyIndex === partyIndex);
      return Object.freeze({ pp: owner ? owner.pp : baselinePartyPp(1, partyIndex) });
    }).concat([{ pp: [0, 0, 0, 0] }, { pp: [0, 0, 0, 0] }, { pp: [0, 0, 0, 0] }])),
  };
  return {
    canonical: rulesModule.createBattleScriptRulesContext({
      battlers: freezeArray(specs.map(canonicalBattler)),
      battleTopology: Object.freeze({
        battlersCount,
        battlerPositions: freezeArray([0, 1, 2, 3]),
        battleTypeFlags: battlersCount === 4 ? rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE : 0,
      }),
      selectorRoles: Object.freeze({ attacker, target }),
      scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
      currentMove, currentMovePosition, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
      moveEffectByte: 0, missType: 0, hitMarker, multiHitCounter: 0,
      party: Object.freeze(party),
    }),
    specs,
  };
}

function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map((value) => Object.freeze({
      side: value.side, partyIndex: value.partyIndex, pp: freezeArray(value.pp),
      ability: value.ability, status2: value.status2,
      ppNotAffectedByPressure: value.ppNotAffectedByPressure, notFirstStrike: value.notFirstStrike ?? 0,
    }))),
    party: freezeArray([rules.party.player, rules.party.opponent].map((members) =>
      freezeArray(members.slice(0, 3).map((member) => Object.freeze({ pp: freezeArray(member.pp) }))))),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    currentMove: rules.currentMove,
    currentMovePosition: rules.currentMovePosition,
    hitMarker: rules.hitMarker >>> 0,
    battlersCount: rules.battleTopology.battlersCount,
  });
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

// ---------------------------------------------------------------------
// Behavior cases
// ---------------------------------------------------------------------

const cases = [];
function addCase(label, category, overrides, initialPending = [], postOverride = null) {
  assert(!cases.some((c) => c.label === label), "duplicate label " + label);
  const { canonical: constructed } = makeRules(overrides);
  // `createBattleScriptRulesContext` eagerly resolves currentMove's effect at
  // construction time (a stricter runtime check than the handler itself
  // performs), so an out-of-bounds move id cannot reach the constructor.
  // postOverride applies AFTER construction, on a plain shallow copy, to
  // reach the ppreduceOpcodeHandler's own resolveBattleScriptMoveTarget
  // throw the same way a hand-rolled RulesContext value could.
  const canonical = postOverride ? Object.freeze({ ...constructed, ...postOverride }) : constructed;
  const before = projectRules(canonical);
  const scheduler = machineModule.createBattleScriptSchedulerState({
    pendingControllerBattlers: freezeArray(initialPending),
  });
  const machine = machineModule.createBattleScriptMachine(
    program, entryLabel, canonical, 0x1234_5678, scheduler,
  );
  const state = Object.freeze({ ...machine, programCounter: canonicalInstruction.programCounter });
  const context = Object.freeze({ program, instruction: canonicalInstruction, state });
  let error = null;
  let rulesOut = null;
  let pendingOut = null;
  let eventsOut = null;
  try {
    const transition = handler(context);
    assert(transition.control.kind === "advance", label + ": ppreduce must always advance");
    assert(Object.isFrozen(transition.rulesContext), label + ": output rules must be frozen");
    assert(same(projectRules(canonical), before), label + ": handler mutated input rules");
    rulesOut = projectRules(transition.rulesContext);
    pendingOut = freezeArray(transition.scheduler.pendingControllerBattlers);
    eventsOut = freezeArray(transition.events.map((event) => Object.freeze({
      kind: event.kind, battler: event.battler, movePosition: event.movePosition, pp: event.pp,
    })));
  } catch (caught) {
    assert(caught instanceof Error, label + ": threw non-Error");
    error = caught.message;
  }
  cases.push(Object.freeze({
    label, category, initial: before, initialPending: freezeArray(initialPending),
    error, rules: rulesOut, pending: pendingOut, events: eventsOut,
  }));
}

// --- Pressure ladder: default target branch ---
addCase("default_no_pressure_deducts_one", "pressure-default", {});
addCase("default_target_pressure_adds_one", "pressure-default", {
  battlerSpecs: { 1: { ability: ABILITY_PRESSURE } },
});
addCase("default_self_target_pressure_does_not_add", "pressure-default", {
  target: 0, battlerSpecs: { 0: { ability: ABILITY_PRESSURE } },
});

// --- Pressure ladder: FOES_AND_ALLY (0/1/2/3 other Pressure holders, attacker's own ignored) ---
addCase("foes_and_ally_zero_pressure", "pressure-foes-and-ally", {
  battlersCount: 4, currentMove: MOVE_FOES_AND_ALLY,
});
addCase("foes_and_ally_one_pressure_opponent", "pressure-foes-and-ally", {
  battlersCount: 4, currentMove: MOVE_FOES_AND_ALLY,
  battlerSpecs: { 1: { ability: ABILITY_PRESSURE } },
});
addCase("foes_and_ally_two_pressure_incl_ally", "pressure-foes-and-ally", {
  battlersCount: 4, currentMove: MOVE_FOES_AND_ALLY,
  battlerSpecs: { 1: { ability: ABILITY_PRESSURE }, 2: { ability: ABILITY_PRESSURE } },
});
addCase("foes_and_ally_three_pressure_attacker_ignored", "pressure-foes-and-ally", {
  battlersCount: 4, currentMove: MOVE_FOES_AND_ALLY,
  battlerSpecs: {
    0: { ability: ABILITY_PRESSURE }, 1: { ability: ABILITY_PRESSURE },
    2: { ability: ABILITY_PRESSURE }, 3: { ability: ABILITY_PRESSURE },
  },
});

// --- Pressure ladder: BOTH / OPPONENTS_FIELD (opposing side only, ally excluded) ---
for (const [label, moveId] of [["both", MOVE_BOTH], ["opponents_field", MOVE_OPPONENTS_FIELD]]) {
  addCase(`${label}_counts_opposing_side_only`, "pressure-other-side", {
    battlersCount: 4, currentMove: moveId,
    battlerSpecs: {
      1: { ability: ABILITY_PRESSURE }, 3: { ability: ABILITY_PRESSURE }, // opposing side (side 1)
      2: { ability: ABILITY_PRESSURE }, // ally (side 0) -- must NOT count
    },
  });
}

// --- ppNotAffectedByPressure: skip case (the domain-widening `!== 1` pin
// against a value outside the canonical 0|1 domain is exercised directly by
// the native inline unit test, since createBattleScriptRulesContext itself
// rejects any byte other than 0 or 1). ---
addCase("pp_not_affected_by_pressure_1_skips_ladder", "pressure-guard", {
  battlerSpecs: { 0: { ppNotAffectedByPressure: 1 }, 1: { ability: ABILITY_PRESSURE } },
});

// --- Deduct gating ---
addCase("gate_no_ppdeduct_blocks_but_flag_still_clears", "deduct-gate", {
  hitMarker: HITMARKER_NO_PPDEDUCT,
});
addCase("gate_no_attackstring_blocks", "deduct-gate", {
  hitMarker: HITMARKER_NO_ATTACKSTRING,
});
addCase("gate_zero_pp_blocks", "deduct-gate", {
  battlerSpecs: { 0: { pp: [0, 10, 15, 20] } },
});
addCase("gate_pp_one_deduct_two_clamps_to_zero", "deduct-gate", {
  battlerSpecs: { 0: { pp: [1, 10, 15, 20] }, 1: { ability: ABILITY_PRESSURE } },
});
addCase("gate_pp_five_minus_two_is_three", "deduct-gate", {
  battlerSpecs: { 0: { pp: [5, 10, 15, 20] }, 1: { ability: ABILITY_PRESSURE } },
});
addCase("gate_pp_equal_to_ppToDeduct_clamps_to_zero", "deduct-gate", {
  battlerSpecs: { 0: { pp: [2, 10, 15, 20] }, 1: { ability: ABILITY_PRESSURE } },
});
for (let slot = 0; slot < 4; slot += 1) {
  addCase(`gate_move_position_slot_${slot}_isolated`, "deduct-gate", { currentMovePosition: slot });
}

// --- Permanence (TRANSFORMED split) ---
addCase("transformed_attacker_no_event_no_pending", "permanence", {
  battlerSpecs: { 0: { status2: STATUS2_TRANSFORMED } },
});
addCase("non_transformed_attacker_event_and_pending", "permanence", {});
addCase("non_transformed_attacker_event_at_nonzero_slot", "permanence", { currentMovePosition: 2 });
addCase("attacker_already_pending_no_duplicate", "permanence", {}, [0]);
addCase("target_already_pending_attacker_still_appended", "permanence", {}, [1]);
addCase("default_target_pressure_with_four_battlers_on_field", "pressure-default", {
  battlersCount: 4, battlerSpecs: { 1: { ability: ABILITY_PRESSURE } },
});

const behaviorCaseCount = cases.length;
assert(behaviorCaseCount >= 26 && behaviorCaseCount <= 34, "behavior case count " + behaviorCaseCount + " outside 26-34 band");

// --- Throws ---
addCase("missing_attacker_role_throws", "throws", { attacker: null });
addCase("missing_target_role_throws", "throws", { target: null });
addCase("unknown_move_target_throws", "throws", {}, [], { currentMove: 60000 });

// ---------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------

const registrationCases = [];
function addRegistration(label, run) {
  let opcodeId = null;
  let error = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, opcodeId, error }));
}
addRegistration("found", () => {
  const found = program.instructions.find((i) => i.opcodeName === OPCODE_NAME);
  assert(found, "expected at least one ppreduce site");
  const registered = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, stubPorts);
  assert(OPCODE_ID in registered, "ppreduce did not register");
  return found.opcodeId;
});
addRegistration("absent_errors_verbatim", () => {
  const filtered = Object.freeze({
    ...program,
    instructions: freezeArray(program.instructions.filter((i) => i.opcodeName !== OPCODE_NAME)),
  });
  hitChainModule.createBattleScriptHitChainOpcodeHandlers(filtered, stubPorts);
  return "unexpectedly-registered";
});

// ---------------------------------------------------------------------
// MOVES-table agreement (native MOVES[id].target vs TS-resolved target)
// ---------------------------------------------------------------------

const corpusMoveIds = freezeArray(
  [...new Set(cases.map((c) => c.initial.currentMove))].filter((id) => id < 355).sort((a, b) => a - b),
);
const moveTargetAgreement = corpusMoveIds.map((moveId) => Object.freeze({
  moveId, tsTarget: rulesModule.resolveBattleScriptMoveTarget(moveId),
}));

// ---------------------------------------------------------------------
// Source/decomp evidence + census
// ---------------------------------------------------------------------

const scriptSource = fs.readFileSync(path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
const ppreduceSiteCount = (scriptSource.match(/^\tppreduce\s*$/gm) ?? []).length;
assert(ppreduceSiteCount === 133, "ppreduce script census drifted to " + ppreduceSiteCount);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
const categoryCensus = census(cases, "category");
const domainCensus = freezeArray([
  ["committed-sites", ppreduceInstructions.length],
  ["behavior-cases", behaviorCaseCount],
  ["throw-cases", cases.length - behaviorCaseCount],
  ["registration-cases", registrationCases.length],
  ["moves-table-agreement-checks", moveTargetAgreement.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, cases, registrationCases, moveTargetAgreement });
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOptBattler(value) { return value === null || value === undefined ? "None" : `Some(BattleScriptPpreduceBattler::Battler${value})`; }
function rustSide(value) { return value === 0 ? "BattleScriptPpreduceSide::Player" : "BattleScriptPpreduceSide::Opponent"; }
function rustPp(values) { return `[${values.map(hex8).join(", ")}]`; }
function rustOptionStr(value) { return value === null || value === undefined ? "None" : `Some(${rustString(value)})`; }
function rustPending(pending) {
  const cells = [0, 1, 2, 3].map((index) => rustOptBattler(pending[index] ?? null));
  return `[${cells.join(", ")}]`;
}

function rustBattlerState(value) {
  return `PpreduceVectorBattlerState { side: ${rustSide(value.side)}, party_index: ${hex8(value.partyIndex)}, pp: ${rustPp(value.pp)}, ability: ${hex8(value.ability)}, status2: ${hex32(value.status2)}, pp_not_affected_by_pressure: ${hex8(value.ppNotAffectedByPressure)}, not_first_strike: ${hex8(value.notFirstStrike)} }`;
}
function rustPartyMember(value) {
  return `PpreduceVectorPartyMember { pp: ${rustPp(value.pp)} }`;
}
function rustState(value) {
  return [
    "PpreduceVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `party: [[${value.party[0].map(rustPartyMember).join(", ")}], [${value.party[1].map(rustPartyMember).join(", ")}]],`,
    `attacker: ${rustOptBattler(value.attacker)}, target: ${rustOptBattler(value.target)},`,
    `current_move: ${hex16(value.currentMove)}, current_move_position: ${hex8(value.currentMovePosition)},`,
    `hit_marker: ${hex32(value.hitMarker)}, battlers_count: ${hex8(value.battlersCount)},`,
    "}",
  ].join(" ");
}
function rustEvents(values) {
  if (values === null) return "None";
  if (values.length === 0) return "None";
  assert(values.length === 1, "ppreduce emits at most one event");
  const [event] = values;
  assert(event.kind === "set-battler-pp-data", "unexpected event kind " + event.kind);
  return `Some([PpreduceVectorEvent { battler: BattleScriptPpreduceBattler::Battler${event.battler}, move_position: ${hex8(event.movePosition)}, pp: ${hex8(event.pp)} }])`;
}

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-ppreduce-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptHitChainOpcode.ts's");
lines.push("//! ppreduceOpcodeHandler via node --experimental-strip-types.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-ppreduce-vectors.mjs.");
lines.push("");
lines.push("use crate::battle_script_ppreduce::{BattleScriptPpreduceBattler, BattleScriptPpreduceSide};");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceVectorBattlerState {");
lines.push("    pub side: BattleScriptPpreduceSide, pub party_index: u8,");
lines.push("    pub pp: [u8; 4], pub ability: u8, pub status2: u32, pub pp_not_affected_by_pressure: u8,");
lines.push("    pub not_first_strike: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceVectorPartyMember { pub pp: [u8; 4] }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceVectorState {");
lines.push("    pub battlers: [PpreduceVectorBattlerState; 4], pub party: [[PpreduceVectorPartyMember; 3]; 2],");
lines.push("    pub attacker: Option<BattleScriptPpreduceBattler>, pub target: Option<BattleScriptPpreduceBattler>,");
lines.push("    pub current_move: u16, pub current_move_position: u8, pub hit_marker: u32, pub battlers_count: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceVectorEvent { pub battler: BattleScriptPpreduceBattler, pub move_position: u8, pub pp: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub initial: PpreduceVectorState,");
lines.push("    pub initial_pending: [Option<BattleScriptPpreduceBattler>; 4],");
lines.push("    pub expected: Option<PpreduceVectorState>, pub expected_pending: [Option<BattleScriptPpreduceBattler>; 4],");
lines.push("    pub events: Option<[PpreduceVectorEvent; 1]>, pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceRegistrationVectorCase { pub label: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct PpreduceMoveTargetAgreementCase { pub move_id: u16, pub ts_target: u8 }");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_PPREDUCE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_PPREDUCE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_PPREDUCE_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_PPREDUCE_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_PPREDUCE_CASES: [PpreduceVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    PpreduceVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        initial_pending: ${rustPending(value.initialPending)},`);
  lines.push(`        expected: ${value.rules === null ? "None" : `Some(${rustState(value.rules)})`},`);
  lines.push(`        expected_pending: ${value.pending === null ? rustPending(value.initialPending) : rustPending(value.pending)},`);
  lines.push(`        events: ${rustEvents(value.events)},`);
  lines.push(`        expected_error: ${rustOptionStr(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_PPREDUCE_REGISTRATION_CASES: [PpreduceRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    PpreduceRegistrationVectorCase { label: ${rustString(value.label)}, expected_opcode_id: ${value.opcodeId === null ? "None" : `Some(${hex8(value.opcodeId)})`}, expected_error: ${rustOptionStr(value.error)} },`);
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_PPREDUCE_MOVE_TARGET_AGREEMENT: [PpreduceMoveTargetAgreementCase; ${moveTargetAgreement.length}] = [`);
for (const value of moveTargetAgreement) {
  lines.push(`    PpreduceMoveTargetAgreementCase { move_id: ${value.moveId}, ts_target: ${hex8(value.tsTarget)} },`);
}
lines.push("];\n");

fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
const rustupCandidates = [
  path.join(process.env.HOME ?? "", ".cargo", "bin", "rustfmt"),
  path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin", "rustfmt"),
  "rustfmt",
];
let formatted = false;
for (const rustfmt of rustupCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-ppreduce-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`gen-battle-script-ppreduce-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-ppreduce-vectors: ${cases.length} behavior/throw cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-ppreduce-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-ppreduce-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-ppreduce-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
