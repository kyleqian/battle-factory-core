#!/usr/bin/env node
// Full-result differential corpus for the native-only Factory-swap mutation
// leaf. Expected outcomes come exclusively from executing the canonical
// src/engine/factorySwap.ts exports; this file owns only deterministic staged
// inputs and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-swap-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "factory_swap_vectors_gen.rs",
);
const canonicalSwap = await import(pathToFileURL(path.join(
  workspaceRoot,
  "src",
  "engine",
  "factorySwap.ts",
)).href);

const PARTY_SIZE = 3;
const RENTAL_ROSTER_SIZE = 6;
const VALID_PHASES = new Set([
  "playerPicker", "playerOptions", "summaryFade", "summaryReturn",
  "playerPickerReturn", "enemySwitch", "playerSwitch", "enemyPicker",
  "acceptPrompt", "acceptReturn", "acceptExit", "quitPrompt", "quitReturn",
  "quitExit", "duplicateSpecies", "duplicateReturn", "complete",
]);
const VALID_STATUSES = new Set([
  "none", "sleep", "poison", "burn", "freeze", "paralysis", "toxic",
]);
const VALID_RESULTS = new Set(["accepted", "keptParty"]);
const VALID_QUIT_RETURN_PHASES = new Set(["playerPicker", "enemyPicker"]);
const OP_ALREADY_HAS_SPECIES = "already-has-species";
const OP_APPLY_MUTATION = "apply-mutation";
const OP_COMMIT_MUTATION = "commit-mutation";
const OP_ROUND_DECISION = "round-decision";
const VALID_OPERATIONS = new Set([
  OP_ALREADY_HAS_SPECIES,
  OP_APPLY_MUTATION,
  OP_COMMIT_MUTATION,
  OP_ROUND_DECISION,
]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-factory-swap-vectors: ${message}`);
}

function assertU8(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `${label} must be a u8`);
}

function assertU32(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `${label} must be a u32`);
}

function cloneMon(value) {
  return { ...value };
}

function cloneRental(value) {
  return { ...value };
}

function cloneState(value) {
  return {
    ...value,
    playerParty: value.playerParty.map(cloneMon),
    enemyParty: value.enemyParty.map(cloneMon),
    rentalMons: value.rentalMons.map(cloneRental),
  };
}

function mon(id, species, personality, abilityNum, friendship, overrides = {}) {
  return {
    id,
    species,
    maxHp: 100 + (personality % 17),
    hp: 20 + (personality % 71),
    status: "none",
    personality,
    abilityNum,
    friendship,
    ...overrides,
  };
}

function rental(monId, personality, ivs, abilityNum) {
  // This property order is intentionally the canonical initial-record order.
  // applyFactorySwapMutation produces a replacement record in a different
  // insertion order, so vector comparison is structural rather than a JSON
  // key-order comparison.
  return { monId, personality, ivs, abilityNum };
}

function state(overrides = {}) {
  const base = {
    phase: "enemyPicker",
    playerParty: [
      mon("player-0", "SPECIES_TREECKO", 0x0102_0304, 0, 70, { status: "sleep" }),
      mon("player-1", "SPECIES_TORCHIC", 0x1112_1314, 1, 71, { status: "burn" }),
      mon("player-2", "SPECIES_MUDKIP", 0x2122_2324, 0, 72, { status: "poison" }),
    ],
    enemyParty: [
      mon("enemy-0", "SPECIES_RALTS", 0x3132_3334, 1, 255, { status: "paralysis" }),
      mon("enemy-1", "SPECIES_SLUGMA", 0x4142_4344, 0, 254, { status: "freeze" }),
      mon("enemy-2", "SPECIES_SWABLU", 0x5152_5354, 1, 253, { status: "toxic" }),
    ],
    rentalMons: [
      rental(100, 0x1000_0001, 3, 0),
      rental(101, 0x1000_0002, 4, 1),
      rental(102, 0x1000_0003, 5, 0),
      rental(200, 0x2000_0001, 13, 1),
      rental(201, 0x2000_0002, 14, 0),
      rental(202, 0x2000_0003, 15, 1),
    ],
    cursor: 0,
    infoCursor: 1,
    displayCursor: 2,
    arrowCursor: 3,
    cursorCopyPending: true,
    actionsCount: 5,
    playerOptionCursor: 2,
    playerOptionDisplayCursor: 1,
    playerOptionCursorCopyPending: true,
    yesNoCursor: 1,
    playerMonId: 1,
    enemyMonId: 2,
    quitReturnPhase: null,
    playerSwitchCompleted: true,
    inputReady: true,
    scriptResult: false,
    mutationCommitted: false,
    result: null,
  };
  const merged = {
    ...base,
    ...overrides,
    playerParty: overrides.playerParty ?? base.playerParty,
    enemyParty: overrides.enemyParty ?? base.enemyParty,
    rentalMons: overrides.rentalMons ?? base.rentalMons,
  };
  assertState(merged, "state");
  return cloneState(merged);
}

function assertMon(value, label) {
  assert(value !== null && typeof value === "object", `${label} must be an object`);
  assert(typeof value.id === "string" && value.id.length > 0, `${label}.id must be nonempty`);
  assert(typeof value.species === "string" && value.species.length > 0, `${label}.species must be nonempty`);
  assertU32(value.maxHp, `${label}.maxHp`);
  assertU32(value.hp, `${label}.hp`);
  assert(VALID_STATUSES.has(value.status), `${label}.status is invalid`);
  assertU32(value.personality, `${label}.personality`);
  assertU8(value.abilityNum, `${label}.abilityNum`);
  assertU8(value.friendship, `${label}.friendship`);
}

function assertRental(value, label) {
  assert(value !== null && typeof value === "object", `${label} must be an object`);
  assertU32(value.monId, `${label}.monId`);
  assertU32(value.personality, `${label}.personality`);
  assertU32(value.ivs, `${label}.ivs`);
  assertU8(value.abilityNum, `${label}.abilityNum`);
}

function assertPartyIndex(value, label) {
  assert(value === null || (Number.isInteger(value) && value >= 0 && value < PARTY_SIZE),
    `${label} must be null or 0..2`);
}

function assertState(value, label) {
  assert(value !== null && typeof value === "object", `${label} must be an object`);
  assert(VALID_PHASES.has(value.phase), `${label}.phase is invalid`);
  for (const [field, expectedLength, checker] of [
    ["playerParty", PARTY_SIZE, assertMon],
    ["enemyParty", PARTY_SIZE, assertMon],
    ["rentalMons", RENTAL_ROSTER_SIZE, assertRental],
  ]) {
    assert(Array.isArray(value[field]) && value[field].length === expectedLength,
      `${label}.${field} must contain ${expectedLength} entries`);
    value[field].forEach((entry, index) => checker(entry, `${label}.${field}[${index}]`));
  }
  for (const field of [
    "cursor", "infoCursor", "displayCursor", "arrowCursor", "actionsCount",
    "playerOptionCursor", "playerOptionDisplayCursor", "yesNoCursor",
  ]) assertU8(value[field], `${label}.${field}`);
  for (const field of [
    "cursorCopyPending", "playerOptionCursorCopyPending", "playerSwitchCompleted",
    "inputReady", "mutationCommitted",
  ]) assert(typeof value[field] === "boolean", `${label}.${field} must be boolean`);
  assertPartyIndex(value.playerMonId, `${label}.playerMonId`);
  assertPartyIndex(value.enemyMonId, `${label}.enemyMonId`);
  assert(value.quitReturnPhase === null || VALID_QUIT_RETURN_PHASES.has(value.quitReturnPhase),
    `${label}.quitReturnPhase is invalid`);
  assert(value.scriptResult === null || typeof value.scriptResult === "boolean",
    `${label}.scriptResult must be boolean/null`);
  assert(value.result === null || VALID_RESULTS.has(value.result), `${label}.result is invalid`);
}

const cases = [];
const labels = new Set();

function canonicalOutcome(operation, input, enemyMonId) {
  try {
    let result;
    if (operation === OP_ALREADY_HAS_SPECIES) {
      result = enemyMonId === null
        ? canonicalSwap.factorySwapAlreadyHasSpecies(input)
        : canonicalSwap.factorySwapAlreadyHasSpecies(input, enemyMonId);
    } else if (operation === OP_APPLY_MUTATION) {
      result = canonicalSwap.applyFactorySwapMutation(input);
    } else if (operation === OP_COMMIT_MUTATION) {
      result = canonicalSwap.commitFactorySwapMutation(input);
    } else if (operation === OP_ROUND_DECISION) {
      result = canonicalSwap.factorySwapRoundDecision(input);
    } else {
      throw new Error(`unknown operation ${operation}`);
    }
    return { kind: "ok", value: result };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

function addCase({ label, category, operation, state: input, enemyMonId = null }) {
  assert(/^[a-z0-9_]+$/.test(label) && !labels.has(label), `invalid or duplicate label ${label}`);
  assert(typeof category === "string" && category.length > 0, `${label} category is required`);
  assert(VALID_OPERATIONS.has(operation), `${label} operation is invalid`);
  assertState(input, `${label}.state`);
  assert(operation === OP_ALREADY_HAS_SPECIES || enemyMonId === null,
    `${label} may only carry enemyMonId for duplicate detection`);
  assertPartyIndex(enemyMonId, `${label}.enemyMonId`);
  const expected = canonicalOutcome(operation, cloneState(input), enemyMonId);
  if (expected.kind === "ok") {
    if (operation === OP_ALREADY_HAS_SPECIES) {
      assert(typeof expected.value === "boolean", `${label} must produce boolean`);
    } else if (operation === OP_ROUND_DECISION) {
      assert(expected.value === null || (expected.value !== null && typeof expected.value === "object"),
        `${label} must produce a decision/null`);
    } else {
      assertState(expected.value, `${label} output`);
    }
  }
  labels.add(label);
  cases.push(Object.freeze({
    label,
    category,
    operation,
    state: cloneState(input),
    enemyMonId,
    expected,
  }));
}

// Source default/null selection behavior and the selected-player exclusion.
addCase({
  label: "already_has_species_without_player_selection",
  category: "duplicate-species",
  operation: OP_ALREADY_HAS_SPECIES,
  state: state({ playerMonId: null, enemyMonId: 1 }),
  enemyMonId: 1,
});
{
  const input = state({ playerMonId: 1, enemyMonId: 2 });
  input.enemyParty[2] = mon("enemy-selected-match", input.playerParty[1].species, 0x6162_6364, 1, 8);
  addCase({
    label: "already_has_species_excludes_selected_player_slot",
    category: "duplicate-species",
    operation: OP_ALREADY_HAS_SPECIES,
    state: input,
    enemyMonId: 2,
  });
}
{
  const input = state({ playerMonId: 0, enemyMonId: 1 });
  input.enemyParty[1] = mon("enemy-other-match", input.playerParty[2].species, 0x7172_7374, 0, 9);
  addCase({
    label: "already_has_species_detects_another_player_slot",
    category: "duplicate-species",
    operation: OP_ALREADY_HAS_SPECIES,
    state: input,
    enemyMonId: 1,
  });
}
{
  const input = state({ playerMonId: 2, enemyMonId: 0, cursor: 0 });
  input.enemyParty[0] = mon("enemy-default-match", input.playerParty[1].species, 0x8182_8384, 1, 10);
  addCase({
    label: "already_has_species_uses_cursor_default",
    category: "duplicate-species",
    operation: OP_ALREADY_HAS_SPECIES,
    state: input,
  });
}

// Accepted copies cover every player row and all three enemy-record offsets.
addCase({
  label: "apply_player_zero_from_enemy_two",
  category: "accepted-mutation",
  operation: OP_APPLY_MUTATION,
  state: state({
    phase: "acceptPrompt",
    playerMonId: 0,
    enemyMonId: 2,
    scriptResult: true,
  }),
});
addCase({
  label: "apply_player_one_from_enemy_zero_preserves_irrelevant_fields",
  category: "irrelevant-preservation",
  operation: OP_APPLY_MUTATION,
  state: state({
    phase: "quitReturn",
    playerMonId: 1,
    enemyMonId: 0,
    cursor: 4,
    infoCursor: 3,
    displayCursor: 1,
    arrowCursor: 0,
    cursorCopyPending: false,
    actionsCount: 4,
    playerOptionCursor: 0,
    playerOptionDisplayCursor: 2,
    playerOptionCursorCopyPending: false,
    yesNoCursor: 0,
    quitReturnPhase: "enemyPicker",
    playerSwitchCompleted: false,
    inputReady: true,
    scriptResult: true,
  }),
});
addCase({
  label: "apply_player_two_from_enemy_one",
  category: "accepted-mutation",
  operation: OP_APPLY_MUTATION,
  state: state({
    phase: "enemyPicker",
    playerMonId: 2,
    enemyMonId: 1,
    scriptResult: false,
  }),
});
addCase({
  label: "commit_keeps_accept_exit_after_atomic_copy",
  category: "commit-phase",
  operation: OP_COMMIT_MUTATION,
  state: state({
    phase: "acceptExit",
    playerMonId: 1,
    enemyMonId: 2,
    inputReady: true,
  }),
});

// Every source throw is obtained from the canonical helper, then exercised as
// a typed Result error in Rust rather than a JavaScript exception.
addCase({
  label: "apply_missing_player_selection",
  category: "missing-selection",
  operation: OP_APPLY_MUTATION,
  state: state({ playerMonId: null, enemyMonId: 0 }),
});
addCase({
  label: "apply_missing_enemy_selection",
  category: "missing-selection",
  operation: OP_APPLY_MUTATION,
  state: state({ playerMonId: 2, enemyMonId: null }),
});
addCase({
  label: "commit_missing_both_selections",
  category: "missing-selection",
  operation: OP_COMMIT_MUTATION,
  state: state({ playerMonId: null, enemyMonId: null }),
});

// The round seam deliberately distinguishes immediate accepted availability
// from the later decline handoff, plus every null guard.
addCase({
  label: "round_accept_is_ready_during_accept_exit",
  category: "round-decision",
  operation: OP_ROUND_DECISION,
  state: state({
    phase: "acceptExit",
    playerMonId: 2,
    enemyMonId: 0,
    mutationCommitted: true,
    result: "accepted",
  }),
});
addCase({
  label: "round_accept_remains_ready_at_complete",
  category: "round-decision",
  operation: OP_ROUND_DECISION,
  state: state({
    phase: "complete",
    playerMonId: 0,
    enemyMonId: 1,
    mutationCommitted: true,
    result: "accepted",
  }),
});
addCase({
  label: "round_decline_is_ready_only_at_complete",
  category: "round-decision",
  operation: OP_ROUND_DECISION,
  state: state({
    phase: "complete",
    playerMonId: null,
    enemyMonId: null,
    mutationCommitted: false,
    result: "keptParty",
  }),
});
addCase({
  label: "round_decline_waits_during_accept_exit",
  category: "round-decision",
  operation: OP_ROUND_DECISION,
  state: state({
    phase: "acceptExit",
    playerMonId: null,
    enemyMonId: null,
    mutationCommitted: false,
    result: "keptParty",
  }),
});
addCase({
  label: "round_accepted_result_without_committed_copy_is_null",
  category: "round-decision",
  operation: OP_ROUND_DECISION,
  state: state({
    phase: "acceptExit",
    playerMonId: 1,
    enemyMonId: 2,
    mutationCommitted: false,
    result: "accepted",
  }),
});
addCase({
  label: "round_committed_accept_without_enemy_selection_is_null",
  category: "round-decision",
  operation: OP_ROUND_DECISION,
  state: state({
    phase: "acceptExit",
    playerMonId: 1,
    enemyMonId: null,
    mutationCommitted: true,
    result: "accepted",
  }),
});

assert(cases.length === 17, `expected 17 cases, got ${cases.length}`);
const categoryCounts = new Map();
for (const vector of cases) {
  categoryCounts.set(vector.category, (categoryCounts.get(vector.category) ?? 0) + 1);
}

function rustString(value) {
  assert(typeof value === "string" && /^[\x20-\x7e]*$/.test(value),
    `only ASCII static strings are supported: ${JSON.stringify(value)}`);
  return JSON.stringify(value);
}

function rustU8(value) {
  assertU8(value, "Rust u8 value");
  return `${value}`;
}

function rustU32(value) {
  assertU32(value, "Rust u32 value");
  return `${value}`;
}

const phaseNames = new Map([
  ["playerPicker", "PlayerPicker"], ["playerOptions", "PlayerOptions"],
  ["summaryFade", "SummaryFade"], ["summaryReturn", "SummaryReturn"],
  ["playerPickerReturn", "PlayerPickerReturn"], ["enemySwitch", "EnemySwitch"],
  ["playerSwitch", "PlayerSwitch"], ["enemyPicker", "EnemyPicker"],
  ["acceptPrompt", "AcceptPrompt"], ["acceptReturn", "AcceptReturn"],
  ["acceptExit", "AcceptExit"], ["quitPrompt", "QuitPrompt"],
  ["quitReturn", "QuitReturn"], ["quitExit", "QuitExit"],
  ["duplicateSpecies", "DuplicateSpecies"], ["duplicateReturn", "DuplicateReturn"],
  ["complete", "Complete"],
]);
const statusNames = new Map([
  ["none", "None"], ["sleep", "Sleep"], ["poison", "Poison"], ["burn", "Burn"],
  ["freeze", "Freeze"], ["paralysis", "Paralysis"], ["toxic", "Toxic"],
]);
const resultNames = new Map([["accepted", "Accepted"], ["keptParty", "KeptParty"]]);
const quitReturnPhaseNames = new Map([
  ["playerPicker", "PlayerPicker"], ["enemyPicker", "EnemyPicker"],
]);

function rustMon(value) {
  return `FactorySwapVectorMon {
            id: ${rustString(value.id)},
            species: ${rustString(value.species)},
            max_hp: ${rustU32(value.maxHp)},
            hp: ${rustU32(value.hp)},
            status: FactorySwapBattleStatus::${statusNames.get(value.status)},
            personality: ${rustU32(value.personality)},
            ability_num: ${rustU8(value.abilityNum)},
            friendship: ${rustU8(value.friendship)},
        }`;
}

function rustRental(value) {
  return `FactorySwapVectorRentalMon {
            mon_id: ${rustU32(value.monId)},
            personality: ${rustU32(value.personality)},
            ivs: ${rustU32(value.ivs)},
            ability_num: ${rustU8(value.abilityNum)},
        }`;
}

function rustOptionU8(value) {
  return value === null ? "None" : `Some(${rustU8(value)})`;
}

function rustOptionBool(value) {
  return value === null ? "None" : `Some(${value})`;
}

function rustState(value) {
  return `FactorySwapVectorState {
        phase: FactorySwapPhase::${phaseNames.get(value.phase)},
        player_party: [
${value.playerParty.map((entry) => `            ${rustMon(entry)},`).join("\n")}
        ],
        enemy_party: [
${value.enemyParty.map((entry) => `            ${rustMon(entry)},`).join("\n")}
        ],
        rental_mons: [
${value.rentalMons.map((entry) => `            ${rustRental(entry)},`).join("\n")}
        ],
        cursor: ${rustU8(value.cursor)},
        info_cursor: ${rustU8(value.infoCursor)},
        display_cursor: ${rustU8(value.displayCursor)},
        arrow_cursor: ${rustU8(value.arrowCursor)},
        cursor_copy_pending: ${value.cursorCopyPending},
        actions_count: ${rustU8(value.actionsCount)},
        player_option_cursor: ${rustU8(value.playerOptionCursor)},
        player_option_display_cursor: ${rustU8(value.playerOptionDisplayCursor)},
        player_option_cursor_copy_pending: ${value.playerOptionCursorCopyPending},
        yes_no_cursor: ${rustU8(value.yesNoCursor)},
        player_mon_id: ${rustOptionU8(value.playerMonId)},
        enemy_mon_id: ${rustOptionU8(value.enemyMonId)},
        quit_return_phase: ${value.quitReturnPhase === null
          ? "None"
          : `Some(FactorySwapQuitReturnPhase::${quitReturnPhaseNames.get(value.quitReturnPhase)})`},
        player_switch_completed: ${value.playerSwitchCompleted},
        input_ready: ${value.inputReady},
        script_result: ${rustOptionBool(value.scriptResult)},
        mutation_committed: ${value.mutationCommitted},
        result: ${value.result === null ? "None" : `Some(FactorySwapResult::${resultNames.get(value.result)})`},
    }`;
}

function rustOperation(value) {
  return new Map([
    [OP_ALREADY_HAS_SPECIES, "AlreadyHasSpecies"],
    [OP_APPLY_MUTATION, "ApplyMutation"],
    [OP_COMMIT_MUTATION, "CommitMutation"],
    [OP_ROUND_DECISION, "RoundDecision"],
  ]).get(value);
}

function rustDecision(value) {
  if (value === null) return "None";
  if (value.type === "decline") return "Some(FactorySwapRoundDecision::Decline)";
  assert(value.type === "accept", `unknown decision type ${value.type}`);
  assertPartyIndex(value.playerPartyIndex, "decision playerPartyIndex");
  assertPartyIndex(value.opponentPartyIndex, "decision opponentPartyIndex");
  return `Some(FactorySwapRoundDecision::Accept {
            player_party_index: FactorySwapPartyIndex::Slot${value.playerPartyIndex},
            opponent_party_index: FactorySwapPartyIndex::Slot${value.opponentPartyIndex},
        })`;
}

function rustExpected(vector) {
  if (vector.expected.kind === "error") {
    return `FactorySwapVectorExpected::Error(${rustString(vector.expected.message)})`;
  }
  if (vector.operation === OP_ALREADY_HAS_SPECIES) {
    return `FactorySwapVectorExpected::Bool(${vector.expected.value})`;
  }
  if (vector.operation === OP_ROUND_DECISION) {
    return `FactorySwapVectorExpected::Decision(${rustDecision(vector.expected.value)})`;
  }
  return `FactorySwapVectorExpected::State(${rustState(vector.expected.value)})`;
}

const categoryLines = [...categoryCounts]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`)
  .join("\n");
const caseLines = cases.map((vector) => `    FactorySwapVectorCase {
        label: ${rustString(vector.label)},
        category: ${rustString(vector.category)},
        operation: FactorySwapVectorOperation::${rustOperation(vector.operation)},
        state: ${rustState(vector.state)},
        enemy_mon_id: ${rustOptionU8(vector.enemyMonId)},
        expected: ${rustExpected(vector)},
    },`).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-swap-vectors.mjs.
// Expected values/errors come only from executing the four canonical
// src/engine/factorySwap.ts mutation boundaries.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-swap-vectors.mjs
// Deterministic fixed corpus; do not hand-edit.

use crate::factory_swap::{
    FactorySwapBattleStatus, FactorySwapPartyIndex, FactorySwapPhase,
    FactorySwapQuitReturnPhase, FactorySwapResult, FactorySwapRoundDecision,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactorySwapVectorMon {
    pub id: &'static str,
    pub species: &'static str,
    pub max_hp: u32,
    pub hp: u32,
    pub status: FactorySwapBattleStatus,
    pub personality: u32,
    pub ability_num: u8,
    pub friendship: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactorySwapVectorRentalMon {
    pub mon_id: u32,
    pub personality: u32,
    pub ivs: u32,
    pub ability_num: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactorySwapVectorState {
    pub phase: FactorySwapPhase,
    pub player_party: [FactorySwapVectorMon; 3],
    pub enemy_party: [FactorySwapVectorMon; 3],
    pub rental_mons: [FactorySwapVectorRentalMon; 6],
    pub cursor: u8,
    pub info_cursor: u8,
    pub display_cursor: u8,
    pub arrow_cursor: u8,
    pub cursor_copy_pending: bool,
    pub actions_count: u8,
    pub player_option_cursor: u8,
    pub player_option_display_cursor: u8,
    pub player_option_cursor_copy_pending: bool,
    pub yes_no_cursor: u8,
    pub player_mon_id: Option<u8>,
    pub enemy_mon_id: Option<u8>,
    pub quit_return_phase: Option<FactorySwapQuitReturnPhase>,
    pub player_switch_completed: bool,
    pub input_ready: bool,
    pub script_result: Option<bool>,
    pub mutation_committed: bool,
    pub result: Option<FactorySwapResult>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapVectorOperation {
    AlreadyHasSpecies,
    ApplyMutation,
    CommitMutation,
    RoundDecision,
}

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactorySwapVectorExpected {
    Bool(bool),
    State(FactorySwapVectorState),
    Decision(Option<FactorySwapRoundDecision>),
    Error(&'static str),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactorySwapVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub operation: FactorySwapVectorOperation,
    pub state: FactorySwapVectorState,
    /// None means invoke the TypeScript boundary's default state.cursor.
    pub enemy_mon_id: Option<u8>,
    pub expected: FactorySwapVectorExpected,
}

pub const FACTORY_SWAP_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${categoryCounts.size}] = [
${categoryLines}
];

pub static FACTORY_SWAP_CASES: [FactorySwapVectorCase; ${cases.length}] = [
${caseLines}
];
`;

fs.writeFileSync(outPath, rust, "utf8");
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
if (!formatted) throw new Error("gen-factory-swap-vectors: could not find rustfmt");
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-swap-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-factory-swap-vectors: ${cases.length} cases; ${[...categoryCounts].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-swap-vectors: sha256 ${digest}`);
