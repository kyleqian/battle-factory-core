#!/usr/bin/env node
// Differential corpus for the pure planning prefix of
// submitLiveFactoryAiDecision (src/engine/factoryAiLiveDriver.ts:468-572).
//
// Each expected success value is produced by calling the canonical exported
// driver with a deterministic terminal reducer, then removing only its
// generic `transition` state/events.  This preserves the actual driver order
// instead of re-implementing its leaves in the generator.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-live-planner-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(scriptDir, "../..");
const outPath = path.join(
  workspace,
  "core-rs/crates/factory-core/src/factory_ai_live_planner_vectors_gen.rs",
);

const driver = await import(path.join(workspace, "src/engine/factoryAiLiveDriver.ts"));
const boundary = await import(path.join(workspace, "src/engine/battleDecisionBoundary.ts"));
const rulesModule = await import(path.join(workspace, "src/engine/battleScriptRulesContext.ts"));

const TYPE_IDS = new Map([
  ["TYPE_NORMAL", 0], ["TYPE_FIGHTING", 1], ["TYPE_FLYING", 2], ["TYPE_POISON", 3],
  ["TYPE_GROUND", 4], ["TYPE_ROCK", 5], ["TYPE_BUG", 6], ["TYPE_GHOST", 7],
  ["TYPE_STEEL", 8], ["TYPE_MYSTERY", 9], ["TYPE_FIRE", 10], ["TYPE_WATER", 11],
  ["TYPE_GRASS", 12], ["TYPE_ELECTRIC", 13], ["TYPE_PSYCHIC", 14], ["TYPE_ICE", 15],
  ["TYPE_DRAGON", 16], ["TYPE_DARK", 17],
]);

const TRAINER_FACTORY =
  rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_TRAINER
  | rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_FACTORY;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-factory-ai-live-planner-vectors: ${message}`);
}

function cloneArray(values) { return [...values]; }

function battler(overrides = {}) {
  const base = {
    side: 0,
    species: 105,
    ability: 69,
    moves: [70, 0, 0, 0],
    types: ["TYPE_GROUND", "TYPE_GROUND"],
    attack: 130,
    defense: 130,
    spAttack: 55,
    spDefense: 70,
    speed: 65,
    hp: 135,
    maxHP: 135,
    partyIndex: 0,
    pp: [10, 10, 10, 10],
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
    level: 50,
    statStages: NEUTRAL_STAGES,
    isFirstTurn: 2,
    perishSongTimer: 0,
  };
  return {
    ...base,
    ...overrides,
    moves: cloneArray(overrides.moves ?? base.moves),
    types: cloneArray(overrides.types ?? base.types),
    pp: cloneArray(overrides.pp ?? base.pp),
    statStages: cloneArray(overrides.statStages ?? base.statStages),
  };
}

function target(overrides = {}) { return battler(overrides); }
function attacker(overrides = {}) {
  return battler({
    side: 1,
    species: 65,
    ability: 0,
    moves: [57, 157, 34, 85],
    types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
    attack: 55,
    defense: 65,
    spAttack: 135,
    spDefense: 105,
    speed: 140,
    hp: 135,
    maxHP: 135,
    partyIndex: 0,
    ...overrides,
  });
}
function empty(side) {
  return battler({
    side,
    species: 0,
    ability: 0,
    moves: [0, 0, 0, 0],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
    hp: 0,
    maxHP: 0,
    partyIndex: side === 0 ? 0 : 1,
  });
}

function partyMember(overrides = {}) {
  const base = { species: 0, isEgg: false, abilityNum: 0, hp: 0, maxHP: 0, moves: [0, 0, 0, 0] };
  return { ...base, ...overrides, moves: cloneArray(overrides.moves ?? base.moves) };
}

function history(overrides = {}) {
  const base = {
    usedMoves: [[], [], [], []],
    knownAbilities: [null, null, null, null],
    knownItemEffects: [0, 0, 0, 0],
    partyIndexes: [0, 0, 2, 3],
  };
  const value = { ...base, ...overrides };
  return {
    usedMoves: value.usedMoves.map((row) => cloneArray(row)),
    knownAbilities: cloneArray(value.knownAbilities),
    knownItemEffects: cloneArray(value.knownItemEffects),
    partyIndexes: cloneArray(value.partyIndexes),
  };
}

function defaultDecisions() {
  return [0, 1, 2, 3].map((moveSlot) => ({ kind: "use-move", moveSlot, targetBattler: 0 }));
}

function contextFor(spec) {
  const targetBattler = target(spec.target);
  const attackerBattler = attacker(spec.attacker);
  const battlers = spec.battlers ?? [targetBattler, attackerBattler, empty(0), empty(1)];
  const opponentParty = new Array(6).fill(undefined).map((_, index) => {
    if (spec.opponentParty?.[index] !== undefined) return partyMember(spec.opponentParty[index]);
    if (index === attackerBattler.partyIndex) {
      return partyMember({
        species: attackerBattler.species,
        hp: attackerBattler.hp,
        maxHP: attackerBattler.maxHP,
        moves: attackerBattler.moves,
      });
    }
    return partyMember();
  });
  const playerParty = new Array(6).fill(undefined).map((_, index) => index === targetBattler.partyIndex
    ? partyMember({
      species: targetBattler.species,
      hp: targetBattler.hp,
      maxHP: targetBattler.maxHP,
      moves: targetBattler.moves,
    })
    : partyMember());
  return rulesModule.createBattleScriptRulesContext({
    battlers,
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: TRAINER_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    aiObservedAbilityIds: spec.observedAbilityIds ?? [0, 0, 0, 0],
    aiObservedItemEffects: spec.observedItemEffects ?? [0, 0, 0, 0],
    moveHistory: {
      lastMoves: spec.lastMoves ?? [0, 0, 0, 0],
      lastLandedMoves: [0, spec.lastLandedMove ?? 0, 0, 0],
      lastHitBy: [0xff, spec.lastHitBy ?? 0xff, 0xff, 0xff],
    },
    monToSwitchIntoId: spec.monToSwitchIntoId ?? [6, 6, 6, 6],
    party: { player: playerParty, opponent: opponentParty },
    sideStatuses: spec.sideStatuses ?? [0, 0],
    weather: spec.weather ?? 0,
    randomTurnNumber: spec.randomTurnNumber ?? 0,
  });
}

function requestFor(spec) {
  const legalDecisions = spec.legalDecisions ?? defaultDecisions();
  const request = {
    kind: spec.requestKind ?? "command",
    requestId: spec.requestId ?? 91,
    side: spec.side ?? "trainer",
    battler: spec.battler ?? 1,
  };
  if (request.kind === "forced-switch") {
    return boundary.createBattleForcedSwitchRequest({
      ...request,
      faintedPartyIndex: 0,
      legalPartyIndexes: [1],
    });
  }
  return boundary.createBattleCommandRequest({ ...request, legalDecisions });
}

function stagedReducer(context) {
  return Object.freeze({
    rules: context.rules,
    events: Object.freeze([]),
    boundary: Object.freeze({ kind: "terminal", outcome: "player-win" }),
  });
}

function projectPlan(result) {
  // The generic transition contains the reducer's opaque rules/event state.
  // M8i owns every other field returned by the canonical driver.
  const { transition: _transition, ...plan } = result;
  return plan;
}

function canonicalOutcome(spec, rules, sourceHistory) {
  const request = requestFor(spec);
  const initial = boundary.createBattleState({
    rules: { rulesContext: rules },
    rngSeed: spec.seed ?? 0,
    rngCalls: spec.calls ?? 0,
    request,
  });
  const state = spec.boundary === "not-decision"
    ? Object.freeze({ ...initial, boundary: Object.freeze({ kind: "terminal", outcome: "player-win" }) })
    : initial;
  const challenge = {
    factoryWinStreak: spec.factoryWinStreak ?? 28,
    trainerOpponentId: spec.trainerOpponentId ?? 222,
    ...(spec.battleTurnCountPresent ? { battleTurnCount: spec.battleTurnCount ?? 0 } : {}),
  };
  try {
    const result = driver.submitLiveFactoryAiDecision(state, sourceHistory, challenge, stagedReducer);
    return { expectedJson: JSON.stringify(projectPlan(result)), expectedError: null };
  } catch (error) {
    return {
      expectedJson: null,
      expectedError: error instanceof Error ? error.message : String(error),
    };
  }
}

function liveBattlerFrom(rulesBattler) {
  return {
    types: cloneArray(rulesBattler.types),
    attack: rulesBattler.attack,
    defense: rulesBattler.defense,
    spAttack: rulesBattler.spAttack,
    spDefense: rulesBattler.spDefense,
    speed: rulesBattler.speed,
    level: rulesBattler.level,
    statStages: cloneArray(rulesBattler.statStages),
    isFirstTurn: rulesBattler.isFirstTurn,
    hp: rulesBattler.hp,
    maxHP: rulesBattler.maxHP,
    ability: rulesBattler.ability,
    status1: rulesBattler.status1,
    status2: rulesBattler.status2,
    status3: rulesBattler.status3,
    protectUses: rulesBattler.protectUses,
    tauntTimer: rulesBattler.tauntTimer,
    species: rulesBattler.species,
    moves: cloneArray(rulesBattler.moves),
  };
}

function typeId(symbol) {
  const value = TYPE_IDS.get(symbol);
  assert(value !== undefined, `unknown type symbol ${symbol}`);
  return value;
}

function switchRulesFrom(rules) {
  return {
    battlers: rules.battlers.map((value) => ({
      species: value.species,
      ability: value.ability,
      types: value.types.map(typeId),
      hp: value.hp,
      maxHp: value.maxHP,
      moves: cloneArray(value.moves),
      status1: value.status1,
      status2: value.status2,
      status3: value.status3,
      statStages: cloneArray(value.statStages),
      partyIndex: value.partyIndex,
      perishSongTimer: value.perishSongTimer,
    })),
    opponentParty: rules.party.opponent.map((value) => ({
      species: value.species,
      isEgg: value.isEgg,
      abilityNum: value.abilityNum,
      hp: value.hp,
      moves: cloneArray(value.moves),
    })),
    lastLandedMove: rules.moveHistory.lastLandedMoves[1],
    lastHitBy: rules.moveHistory.lastHitBy[1],
    reservedPartyIndex: rules.monToSwitchIntoId[1],
    absentBattlerFlags: rules.absentBattlerFlags,
    battlersCount: rules.battleTopology.battlersCount,
    battleTypeFlags: rules.battleTopology.battleTypeFlags,
  };
}

const cases = [];
const labels = new Set();
function addCase(spec) {
  assert(/^[a-z0-9_]+$/.test(spec.label), `invalid label ${spec.label}`);
  assert(!labels.has(spec.label), `duplicate label ${spec.label}`);
  labels.add(spec.label);
  const rules = contextFor(spec);
  const sourceHistory = history(spec.history);
  const expected = canonicalOutcome(spec, rules, sourceHistory);
  cases.push({
    ...spec,
    rules,
    sourceHistory,
    liveBattlers: rules.battlers.map(liveBattlerFrom),
    switchRules: switchRulesFrom(rules),
    expected,
  });
}

// `battle_ai_switch_items.c` enters the switch policy before the Factory
// mask chooser; this is the exact selected-switch scenario from the canonical
// driver's own focused test, reduced to a switch-only legal request.
addCase({
  label: "selected_switch_bypasses_switch_only_request",
  category: "switch-selected",
  factoryWinStreak: 28,
  seed: 3,
  attacker: { moves: [34, 0, 0, 0] },
  lastLandedMove: 57,
  lastHitBy: 0,
  opponentParty: [
    { species: 65, hp: 135, maxHP: 135, moves: [34, 0, 0, 0] },
    { species: 134, hp: 100, maxHP: 100, moves: [57, 0, 0, 0] },
  ],
  legalDecisions: [{ kind: "switch", partyIndex: 1 }],
});

// Mask 0: a no-bench switch decline reaches the five-draw move chooser.
addCase({
  label: "mask_zero_declined_switch_no_draws",
  category: "move-mask-0",
  factoryWinStreak: 0,
  seed: 0,
  attacker: { moves: [33, 0, 0, 0] },
  legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }],
});

// The active Surf and a live bench exercise the policy's no-switch RNG
// prefix before mask 1 takes ownership of the cursor. Seed 0 is the lower
// u32 cursor edge.
addCase({
  label: "mask_one_no_switch_draw_prefix_seed_zero",
  category: "move-mask-1",
  factoryWinStreak: 14,
  seed: 0,
  randomTurnNumber: 0,
  opponentParty: [
    { species: 65, hp: 135, maxHP: 135, moves: [57, 157, 34, 85] },
    { species: 132, hp: 100, maxHP: 100, moves: [34, 0, 0, 0] },
  ],
});

// The upper u32 seed edge stays a normal source cursor; call count remains
// zero so no typed u32 call-counter widening is implied by this M8i surface.
addCase({
  label: "mask_one_u32_max_seed",
  category: "u32-rng-edge",
  factoryWinStreak: 14,
  seed: 0xffff_ffff,
  randomTurnNumber: 1,
  attacker: { moves: [33, 0, 0, 0] },
  legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }],
});

addCase({
  label: "mask_seven_turn_boundary_owner_zero",
  category: "move-mask-7-turn-owner",
  factoryWinStreak: 28,
  seed: 0x7654_3210,
  randomTurnNumber: 0,
  battleTurnCountPresent: true,
  battleTurnCount: 7,
  opponentParty: [
    { species: 65, hp: 135, maxHP: 135, moves: [57, 157, 34, 85] },
    { species: 132, hp: 100, maxHP: 100, moves: [34, 0, 0, 0] },
  ],
});

addCase({
  label: "mask_seven_turn_boundary_owner_u16_max",
  category: "move-mask-7-turn-owner",
  factoryWinStreak: 28,
  seed: 0xffff_ffff,
  randomTurnNumber: 0xffff,
  battleTurnCountPresent: true,
  battleTurnCount: 19,
  attacker: { moves: [57, 157, 34, 85], status3: 1 << 10 },
  legalDecisions: [
    { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    { kind: "use-move", moveSlot: 2, targetBattler: 1 },
  ],
});

// M8a runs before M8d: party change clears move/ability facts, target last
// move is then appended, and observed facts overlay the synchronized history.
addCase({
  label: "history_party_change_last_move_and_observations",
  category: "history-sync",
  factoryWinStreak: 28,
  seed: 0x1020_3040,
  randomTurnNumber: 0x4321,
  target: { partyIndex: 1 },
  lastMoves: [33, 0, 0, 0],
  observedAbilityIds: [9, 0, 0, 0],
  observedItemEffects: [44, 0, 0, 0],
  history: {
    usedMoves: [[70, 89], [57], [], []],
    knownAbilities: ["ABILITY_ROCK_HEAD", null, null, null],
    knownItemEffects: [29, 0, 0, 0],
    partyIndexes: [0, 0, 2, 3],
  },
  attacker: { moves: [57, 157, 34, 85] },
  legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }],
});

// A mixed request proves filtering happens only after the switch precheck;
// the selected move retains the request's authoritative self target.
addCase({
  label: "declined_switch_filters_mixed_authoritative_request",
  category: "move-request-filter",
  factoryWinStreak: 14,
  seed: 0x3141_5926,
  attacker: { moves: [33, 0, 0, 0] },
  legalDecisions: [
    { kind: "switch", partyIndex: 1 },
    { kind: "use-move", moveSlot: 0, targetBattler: 1 },
  ],
});

addCase({
  label: "declined_switch_only_request_has_no_legal_move",
  category: "declined-switch-no-move",
  factoryWinStreak: 28,
  seed: 0xfeed_face,
  legalDecisions: [{ kind: "switch", partyIndex: 1 }],
});

// The source boundary guard is strictly first, even when a later sync would
// throw for this unknown observation.
addCase({
  label: "boundary_guard_precedes_history_sync",
  category: "boundary-guard",
  boundary: "not-decision",
  observedAbilityIds: [79, 0, 0, 0],
});

// M8a's unknown observation must beat M8d's attacker ability lookup.
addCase({
  label: "history_ability_error_precedes_live_view",
  category: "ability-order",
  observedAbilityIds: [79, 0, 0, 0],
  attacker: { ability: 78 },
});

// Within M8d, the attacker object literal resolves its ability before the
// target object literal's ability.
addCase({
  label: "attacker_ability_error_precedes_target",
  category: "ability-order",
  attacker: { ability: 78 },
  target: { ability: 79 },
});

const EXPECTED_CATEGORY_COUNTS = new Map([
  ["switch-selected", 1],
  ["move-mask-0", 1],
  ["move-mask-1", 1],
  ["u32-rng-edge", 1],
  ["move-mask-7-turn-owner", 2],
  ["history-sync", 1],
  ["move-request-filter", 1],
  ["declined-switch-no-move", 1],
  ["boundary-guard", 1],
  ["ability-order", 2],
]);
const categoryCounts = new Map();
for (const value of cases) categoryCounts.set(value.category, (categoryCounts.get(value.category) ?? 0) + 1);
for (const [category, count] of EXPECTED_CATEGORY_COUNTS) {
  assert(categoryCounts.get(category) === count, `category census changed for ${category}`);
}

function rs(value) { return JSON.stringify(value); }
function rn(value) {
  if (Number.isNaN(value)) return "f64::NAN";
  if (value === Infinity) return "f64::INFINITY";
  if (value === -Infinity) return "f64::NEG_INFINITY";
  if (Object.is(value, -0)) return "-0.0";
  return Number.isInteger(value) ? `${value}.0` : String(value);
}
function rb(value) { return value ? "true" : "false"; }
function rnums(values) { return values.map(rn).join(", "); }
function ru8(value) { assert(Number.isInteger(value) && value >= 0 && value <= 0xff, `not u8 ${value}`); return String(value); }
function ru16(value) { assert(Number.isInteger(value) && value >= 0 && value <= 0xffff, `not u16 ${value}`); return String(value); }
function ru32(value) { assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, `not u32 ${value}`); return String(value); }
function ri32(value) { assert(Number.isInteger(value) && value >= -0x8000_0000 && value <= 0x7fff_ffff, `not i32 ${value}`); return String(value); }

function liveBattlerRs(value) {
  return `FactoryAiLivePlannerBattlerVector {
    types: [${value.types.map(rs).join(", ")}], attack: ${rn(value.attack)}, defense: ${rn(value.defense)},
    sp_attack: ${rn(value.spAttack)}, sp_defense: ${rn(value.spDefense)}, speed: ${rn(value.speed)}, level: ${rn(value.level)},
    stat_stages: [${rnums(value.statStages)}], is_first_turn: ${rn(value.isFirstTurn)}, hp: ${rn(value.hp)}, max_hp: ${rn(value.maxHP)},
    ability: ${rn(value.ability)}, status1: ${rn(value.status1)}, status2: ${rn(value.status2)}, status3: ${rn(value.status3)},
    protect_uses: ${rn(value.protectUses)}, taunt_timer: ${rn(value.tauntTimer)}, species: ${rn(value.species)}, moves: [${rnums(value.moves)}],
  }`;
}
function historyRs(value) {
  return `FactoryAiLivePlannerHistoryVector {
    used_moves: [${value.usedMoves.map((row) => `&[${rnums(row)}]`).join(", ")}],
    known_abilities: [${value.knownAbilities.map((entry) => entry === null ? "None" : `Some(${rs(entry)})`).join(", ")}],
    known_item_effects: [${rnums(value.knownItemEffects)}], party_indexes: [${rnums(value.partyIndexes)}],
  }`;
}
function switchBattlerRs(value) {
  return `FactoryAiSwitchBattler {
    species: ${ru16(value.species)}, ability: ${ru16(value.ability)}, types: [${value.types.map(ru8).join(", ")}],
    hp: ${ri32(value.hp)}, max_hp: ${ri32(value.maxHp)}, moves: [${value.moves.map(ru16).join(", ")}],
    status1: ${ru32(value.status1)}, status2: ${ru32(value.status2)}, status3: ${ru32(value.status3)},
    stat_stages: [${value.statStages.map(ri32).join(", ")}], party_index: ${ru8(value.partyIndex)}, perish_song_timer: ${ru8(value.perishSongTimer)},
  }`;
}
function switchPartyRs(value) {
  return `FactoryAiSwitchPartyMember { species: ${ru16(value.species)}, is_egg: ${rb(value.isEgg)}, ability_num: ${ru8(value.abilityNum)}, hp: ${ri32(value.hp)}, moves: [${value.moves.map(ru16).join(", ")}] }`;
}
function switchRulesRs(value) {
  return `FactoryAiSwitchRules {
    battlers: [${value.battlers.map(switchBattlerRs).join(", ")}],
    opponent_party: [${value.opponentParty.map(switchPartyRs).join(", ")}],
    last_landed_move: ${ru16(value.lastLandedMove)}, last_hit_by: ${ru8(value.lastHitBy)},
    reserved_party_index: ${ru8(value.reservedPartyIndex)}, absent_battler_flags: ${ru8(value.absentBattlerFlags)},
    battlers_count: ${ru8(value.battlersCount)}, battle_type_flags: ${ru32(value.battleTypeFlags)},
  }`;
}
function decisionRs(value) {
  if (value.kind === "use-move") {
    return `FactoryAiLivePlannerLegalDecisionVector::UseMove { move_slot: ${ru8(value.moveSlot)}, target_battler: ${ru8(value.targetBattler)} }`;
  }
  assert(value.kind === "switch", `unknown decision ${JSON.stringify(value)}`);
  return `FactoryAiLivePlannerLegalDecisionVector::Switch { party_index: ${ru8(value.partyIndex)} }`;
}

const rust = `// GENERATED by core-rs/tools/gen-factory-ai-live-planner-vectors.mjs.
// Expected values/errors come only from submitLiveFactoryAiDecision in
// src/engine/factoryAiLiveDriver.ts with its generic transition projected out.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-ai-live-planner-vectors.mjs
// Deterministic fixed corpus; do not hand-edit.

use crate::factory_ai_switch_policy::{
    FactoryAiSwitchBattler, FactoryAiSwitchPartyMember, FactoryAiSwitchRules,
};

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLivePlannerBattlerVector {
    pub types: [&'static str; 2],
    pub attack: f64,
    pub defense: f64,
    pub sp_attack: f64,
    pub sp_defense: f64,
    pub speed: f64,
    pub level: f64,
    pub stat_stages: [f64; 8],
    pub is_first_turn: f64,
    pub hp: f64,
    pub max_hp: f64,
    pub ability: f64,
    pub status1: f64,
    pub status2: f64,
    pub status3: f64,
    pub protect_uses: f64,
    pub taunt_timer: f64,
    pub species: f64,
    pub moves: [f64; 4],
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLivePlannerHistoryVector {
    pub used_moves: [&'static [f64]; 4],
    pub known_abilities: [Option<&'static str>; 4],
    pub known_item_effects: [f64; 4],
    pub party_indexes: [f64; 4],
}

#[derive(Debug, Clone, Copy)]
pub enum FactoryAiLivePlannerLegalDecisionVector {
    UseMove { move_slot: u8, target_battler: u8 },
    Switch { party_index: u8 },
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLivePlannerCase {
    pub label: &'static str,
    pub category: &'static str,
    pub live_battlers: [FactoryAiLivePlannerBattlerVector; 4],
    pub weather: f64,
    pub side_statuses: [f64; 2],
    pub last_moves: [f64; 4],
    pub observed_ability_ids: [f64; 4],
    pub observed_item_effects: [f64; 4],
    pub switch_rules: FactoryAiSwitchRules,
    pub random_turn_number: u16,
    pub history: FactoryAiLivePlannerHistoryVector,
    pub factory_win_streak: f64,
    pub trainer_opponent_id: f64,
    pub battle_turn_count_present: bool,
    pub battle_turn_count: f64,
    /// 0 = decision-required, 1 = a generic non-decision boundary.
    pub boundary_kind: u8,
    /// 0 = command, 1 = forced-switch.  The latter exists only to ratchet
    /// the source driver's initial trainer-command guard.
    pub request_kind: u8,
    pub request_id: u32,
    /// 0 = player, 1 = trainer.
    pub side: u8,
    pub battler: u8,
    pub legal_decisions: &'static [FactoryAiLivePlannerLegalDecisionVector],
    pub rng_value: u32,
    pub rng_calls: u32,
    pub expected_json: Option<&'static str>,
    pub expected_error: Option<&'static str>,
}

pub const FACTORY_AI_LIVE_PLANNER_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${EXPECTED_CATEGORY_COUNTS.size}] = [
${[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `    (${rs(category)}, ${count}),`).join("\n")}
];

pub static FACTORY_AI_LIVE_PLANNER_CASES: [FactoryAiLivePlannerCase; ${cases.length}] = [
${cases.map((value) => `    FactoryAiLivePlannerCase {
        label: ${rs(value.label)}, category: ${rs(value.category)},
        live_battlers: [${value.liveBattlers.map(liveBattlerRs).join(",")}],
        weather: ${rn(value.rules.weather)}, side_statuses: [${rnums(value.rules.sideStatuses)}], last_moves: [${rnums(value.rules.moveHistory.lastMoves)}],
        observed_ability_ids: [${rnums(value.rules.aiObservedAbilityIds)}], observed_item_effects: [${rnums(value.rules.aiObservedItemEffects)}],
        switch_rules: ${switchRulesRs(value.switchRules)}, random_turn_number: ${ru16(value.rules.randomTurnNumber)},
        history: ${historyRs(value.sourceHistory)}, factory_win_streak: ${rn(value.factoryWinStreak ?? 28)}, trainer_opponent_id: ${rn(value.trainerOpponentId ?? 222)},
        battle_turn_count_present: ${rb(Boolean(value.battleTurnCountPresent))}, battle_turn_count: ${rn(value.battleTurnCount ?? 0)},
        boundary_kind: ${value.boundary === "not-decision" ? 1 : 0}, request_kind: ${value.requestKind === "forced-switch" ? 1 : 0},
        request_id: ${ru32(value.requestId ?? 91)}, side: ${value.side === "player" ? 0 : 1}, battler: ${ru8(value.battler ?? 1)},
        legal_decisions: &[${(value.legalDecisions ?? defaultDecisions()).map(decisionRs).join(", ")}],
        rng_value: ${ru32(value.seed ?? 0)}, rng_calls: ${ru32(value.calls ?? 0)},
        expected_json: ${value.expected.expectedJson === null ? "None" : `Some(${rs(value.expected.expectedJson)})`},
        expected_error: ${value.expected.expectedError === null ? "None" : `Some(${rs(value.expected.expectedError)})`},
    },`).join("\n")}
];
`;

fs.writeFileSync(outPath, rust, "utf8");
const rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-ai-live-planner-vectors: wrote ${path.relative(workspace, outPath)}`);
console.log(`gen-factory-ai-live-planner-vectors: ${cases.length} cases; ${[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-ai-live-planner-vectors: sha256 ${digest}`);
