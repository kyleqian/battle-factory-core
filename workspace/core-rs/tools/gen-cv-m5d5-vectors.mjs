#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_viability_m5d5_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckViability.ts's `runCheckViability` (read-only
// import, node --experimental-strip-types -- the gen-cv-m5d1/m5d2/m5d3/
// m5d4-vectors.mjs precedent, which this script mirrors in structure).
// No value in the emitted file is hand-computed. Deterministic: a fixed
// directed case list plus small seeded sweeps per handler, not
// Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5d-5 only (docs/rust-m5d-checkviability-batching.md §2) -- the
// LAST batch, 28 effects: remaining singles, the MudSport/WaterSport
// same-function pair, and the 2 fully-vestigial handlers
// (runCvAccuracyUp/runCvSpAtkDown, called DIRECTLY -- no real move carries
// either effect, so runCheckViability can never dispatch to them).
//
// Move ids are looked up DYNAMICALLY (first move in MOVES_BY_ID with the
// wanted effect), not hand-derived from the test file, so this script has
// zero risk of citing a stale/guessed move id.
//
// Usage: node core-rs/tools/gen-cv-m5d5-vectors.mjs   (from any cwd)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", ".."); // two dirs up
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_check_viability_m5d5_vectors_gen.rs",
);

const cv = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckViability.ts"));
const { runCheckViability, runCvAccuracyUp, runCvSpAtkDown, AI_CHECK_VIABILITY_TABLE_EFFECTS } = cv;
const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { MOVES_BY_ID } = cbm;

if (AI_CHECK_VIABILITY_TABLE_EFFECTS.size !== 122) {
  throw new Error(
    `gen-cv-m5d5-vectors: expected AI_CHECK_VIABILITY_TABLE_EFFECTS to have 122 entries, found ${AI_CHECK_VIABILITY_TABLE_EFFECTS.size} ` +
      "(this script's whole premise for treating TS's scored output as ground truth)",
  );
}

// The 28 effects this batch covers (batching doc §2 "M5d-5"), TS dispatch
// source order (factoryAiCheckViability.ts:6750-7201) -- mirrors Rust's
// CV_HANDLED_EFFECTS_M5D5 exactly (factory_ai_check_viability.rs).
const M5D5_EFFECT_NAMES = new Set([
  "EFFECT_TRICK",
  "EFFECT_SNATCH",
  "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN_2",
  "EFFECT_MIRROR_MOVE",
  "EFFECT_RECYCLE",
  "EFFECT_SPIT_UP",
  "EFFECT_THIEF",
  "EFFECT_HAZE",
  "EFFECT_SMELLINGSALT",
  "EFFECT_MUD_SPORT",
  "EFFECT_WATER_SPORT",
  "EFFECT_POISON",
  "EFFECT_LOCK_ON",
  "EFFECT_BIDE",
  "EFFECT_IMPRISON",
  "EFFECT_CONVERSION",
  "EFFECT_PAIN_SPLIT",
  "EFFECT_BELLY_DRUM",
  "EFFECT_REFRESH",
  "EFFECT_ERUPTION",
  "EFFECT_FLATTER",
  "EFFECT_DISABLE",
  "EFFECT_ACCURACY_UP", "EFFECT_ACCURACY_UP_2",
  "EFFECT_SNORE",
  "EFFECT_SKILL_SWAP", "EFFECT_ROLE_PLAY",
]);
if (M5D5_EFFECT_NAMES.size !== 28) {
  throw new Error(`gen-cv-m5d5-vectors: expected exactly 28 M5d-5 effect names, got ${M5D5_EFFECT_NAMES.size}`);
}
for (const name of M5D5_EFFECT_NAMES) {
  if (!AI_CHECK_VIABILITY_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cv-m5d5-vectors: ${name} is not a real AI_CheckViability table effect`);
  }
}
// EFFECT_ACCURACY_UP/_2 and EFFECT_SPECIAL_ATTACK_DOWN/_2 are fully
// vestigial (batching doc §2/§4) -- live-verify that here too, the same
// premise the direct-call vestigial cases below rely on.
for (const name of ["EFFECT_ACCURACY_UP", "EFFECT_ACCURACY_UP_2", "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN_2"]) {
  if (firstMoveIdWithEffectLocal(name) !== undefined) {
    throw new Error(`gen-cv-m5d5-vectors: ${name} was expected to be vestigial (no move), but found one`);
  }
}
function firstMoveIdWithEffectLocal(effectName) {
  for (const [id, m] of MOVES_BY_ID) {
    if (m.effect === effectName) return id;
  }
  return undefined;
}
function firstMoveId(effectName) {
  const id = firstMoveIdWithEffectLocal(effectName);
  if (id === undefined) throw new Error(`gen-cv-m5d5-vectors: no move with effect ${effectName}`);
  return id;
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use (identical to
// gen-cv-m5d1..4-vectors.mjs's own TYPE_IDS). ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};
const AI_WEATHER_SUN = 0;
const AI_WEATHER_RAIN = 1;
const AI_WEATHER_SANDSTORM = 2;
const AI_WEATHER_HAIL = 3;

// --- draw site indices, one per M5d-5 draw kind (main dispatch cases). ---
const SITE_BY_KIND = {
  "target-faster-tie": 0,
  "trick-roll": 1,
  "get-ability": 2,
  "change-self-ability-roll": 3,
  "disable-roll": 4,
  "flatter-roll": 5,
  "confuse-roll": 6, // Flatter's own cross-batch delegation into run_cv_confuse
  "lock-on-roll": 7,
  "imprison-roll": 8,
  "conversion-roll": 9,
  "thief-roll": 10,
  "haze-roll-1": 11,
  "haze-roll-2": 12,
  "haze-roll-3": 13,
  "recycle-roll": 14,
  "spit-up-roll": 15,
  "mirror-move-roll-1": 16,
  "mirror-move-roll-2": 17,
  "snatch-roll-1": 18,
  "snatch-roll-2": 19,
  "snatch-roll-3": 20,
  "snatch-roll-4": 21,
  "snatch-roll-5": 22,
  // Vestigial handlers' own draw kinds, distinct range (100+) since these
  // never reach the main dispatcher.
  "accuracy-up-roll": 100,
  "sp-atk-down-roll-1": 101,
  "sp-atk-down-roll-2": 102,
};

const ABILITY_NAME_TO_ID = {
  "ABILITY_NONE": 0,
  "ABILITY_SPEED_BOOST": 3,
  "ABILITY_BATTLE_ARMOR": 4,
  "ABILITY_SAND_VEIL": 8,
  "ABILITY_STATIC": 9,
  "ABILITY_SHIELD_DUST": 19,
  "ABILITY_FLASH_FIRE": 18,
  "ABILITY_EFFECT_SPORE": 27,
  "ABILITY_SHADOW_TAG": 23,
  "ABILITY_WONDER_GUARD": 25,
  "ABILITY_SWIFT_SWIM": 33,
  "ABILITY_CHLOROPHYLL": 34,
  "ABILITY_HUGE_POWER": 37,
  "ABILITY_MAGNET_PULL": 42,
  "ABILITY_RAIN_DISH": 44,
  "ABILITY_CUTE_CHARM": 56,
  "ABILITY_SHED_SKIN": 61,
  "ABILITY_MARVEL_SCALE": 63,
  "ABILITY_PURE_POWER": 74,
  "ABILITY_ARENA_TRAP": 71,
};
function abilityId(name) {
  if (name === null || name === undefined) return null;
  if (!(name in ABILITY_NAME_TO_ID)) throw new Error(`gen-cv-m5d5-vectors: unmapped ability name ${name}`);
  return ABILITY_NAME_TO_ID[name];
}

function drawFlag(d) {
  if (d.kind === "target-faster-tie") return d.strikesFirst;
  if (d.kind === "get-ability") return abilityId(d.guessedAbility) & 0xff;
  if ("succeeded" in d) return d.succeeded ? 1 : 0;
  if ("jumped" in d) return d.jumped ? 1 : 0;
  throw new Error(`gen-cv-m5d5-vectors: unrecognized draw shape for kind ${d.kind}`);
}

const NEUTRAL_BATTLER = Object.freeze({
  speed: 100,
  speedStage: 6,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"],
  isFirstTurn: 0,
  evasionStage: 6,
  accStage: 6,
  atkStage: 6,
  defStage: 6,
  spDefStage: 6,
  hp: 100,
  maxHp: 100,
});

const cases = [];

function pushCase(label, moveId, rngValue, attackerOverrides, targetOverrides, fallback) {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) throw new Error(`gen-cv-m5d5-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5D5_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cv-m5d5-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5d-5 batch`,
    );
  }
  const attacker = { ...NEUTRAL_BATTLER, ...attackerOverrides };
  const target = { ...NEUTRAL_BATTLER, ...targetOverrides };
  const result = runCheckViability({
    rng: { value: rngValue, calls: 0 },
    moveId,
    attacker,
    target,
    staleFuncResultFallback: fallback,
    drawOrdinalStart: 1,
    reasonPrefix: "vec",
  });
  if (result.kind !== "scored") {
    throw new Error(`gen-cv-m5d5-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 8) {
    throw new Error(`gen-cv-m5d5-vectors: case ${label} produced ${result.draws.length} draws, expected <=8`);
  }

  const draws = result.draws.map((d) => {
    const site = SITE_BY_KIND[d.kind];
    if (site === undefined) throw new Error(`gen-cv-m5d5-vectors: case ${label} unrecognized draw kind ${d.kind}`);
    return {
      site,
      ordinal: d.ordinal,
      beforeValue: d.before.value,
      beforeCalls: d.before.calls,
      afterValue: d.after.value,
      afterCalls: d.after.calls,
      rawRngValue: d.rawRngValue,
      randomValue: d.randomValue,
      flag: drawFlag(d),
    };
  });
  while (draws.length < 8) {
    draws.push({
      site: 0, ordinal: 0, beforeValue: 0, beforeCalls: 0, afterValue: 0, afterCalls: 0,
      rawRngValue: 0, randomValue: 0, flag: 0,
    });
  }

  cases.push({
    label,
    moveId,
    rngValue,
    attackerSpeed: attacker.speed,
    attackerSpeedStage: attacker.speedStage,
    attackerTypes: [TYPE_IDS[attacker.types[0]], TYPE_IDS[attacker.types[1]]],
    attackerHp: attacker.hp,
    attackerMaxHp: attacker.maxHp,
    attackerAtkStage: attacker.atkStage,
    attackerDefStage: attacker.defStage,
    attackerSpDefStage: attacker.spDefStage,
    attackerSpAtkStage: attacker.spAtkStage ?? null,
    attackerEvasionStage: attacker.evasionStage,
    attackerAccStage: attacker.accStage,
    attackerIsFirstTurn: attacker.isFirstTurn,
    attackerMoves: attacker.moves ?? [0, 0, 0, 0],
    attackerAbility: attacker.ability ?? null,
    attackerHoldEffect: attacker.holdEffect ?? null,
    attackerUsedHeldItemId: attacker.usedHeldItemId ?? null,
    attackerStockpileCount: attacker.stockpileCount ?? null,
    attackerBattleTurnCount: attacker.battleTurnCount ?? null,
    targetSpeed: target.speed,
    targetSpeedStage: target.speedStage,
    targetTypes: [TYPE_IDS[target.types[0]], TYPE_IDS[target.types[1]]],
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    targetAtkStage: target.atkStage,
    targetDefStage: target.defStage,
    targetSpDefStage: target.spDefStage,
    targetSpAtkStage: target.spAtkStage ?? null,
    targetEvasionStage: target.evasionStage,
    targetAccStage: target.accStage,
    targetIsParalyzed: target.isParalyzed ?? null,
    targetLastUsedMoveId: target.lastUsedMoveId ?? null,
    targetKnownMoves: target.knownMoves ?? [0, 0, 0, 0],
    targetHoldEffect: target.holdEffect ?? null,
    targetAbility: target.ability ?? null,
    targetKnownAbility: target.knownAbility ?? null,
    targetSpeciesAbilities: target.speciesAbilities ?? null,
    fallback: fallback ?? null,
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedScoreDelta: result.scoreDelta,
    expectedFuncResultAfter: result.funcResultAfter ?? null,
    expectedDrawCount: result.draws.length,
    draws,
  });
}

const RNG_SEED = 249_678_687; // tests/factoryAiCheckViability.test.ts's own convention.

// === EFFECT_TRICK (test:6808-6860) ===========================================

const MOVE_TRICK = firstMoveId("EFFECT_TRICK");

pushCase("trick_choice_band_both_minus3", MOVE_TRICK, RNG_SEED, { holdEffect: 29 }, { holdEffect: 29 }, undefined);
pushCase("trick_choice_band_target_other_plus5", MOVE_TRICK, RNG_SEED, { holdEffect: 29 }, { holdEffect: 0 }, undefined);
pushCase("trick_broad_encourage_both_minus3", MOVE_TRICK, RNG_SEED, { holdEffect: 10 }, { holdEffect: 24 }, AI_WEATHER_RAIN);
pushCase("trick_broad_encourage_roll_jump", MOVE_TRICK, 4, { holdEffect: 10 }, { holdEffect: 0 }, undefined);
pushCase("trick_broad_encourage_roll_no_jump", MOVE_TRICK, 1, { holdEffect: 10 }, { holdEffect: 0 }, undefined);
pushCase("trick_user_holds_neither_minus3", MOVE_TRICK, RNG_SEED, { holdEffect: 0 }, { holdEffect: 29 }, undefined);

// === EFFECT_SNATCH (test:7775-7822) ==========================================

const MOVE_SNATCH = firstMoveId("EFFECT_SNATCH");
const MOVE_RESTORE_HP = firstMoveId("EFFECT_RESTORE_HP");
const MOVE_HIT = firstMoveId("EFFECT_HIT");

pushCase("snatch_first_turn_roll_jump", MOVE_SNATCH, 4, { isFirstTurn: 1 }, {}, undefined);
pushCase("snatch_first_turn_roll_no_jump", MOVE_SNATCH, 1, { isFirstTurn: 1 }, {}, undefined);
pushCase("snatch_initial_roll_jump_ends", MOVE_SNATCH, 4, { isFirstTurn: 0 }, {}, undefined);
pushCase("snatch_target_faster_high_hp_snatch5", MOVE_SNATCH, RNG_SEED,
  { isFirstTurn: 0, speed: 50 }, { speed: 150, hp: 26, maxHp: 100 }, undefined);
pushCase("snatch_target_faster_low_hp_history_snatch3", MOVE_SNATCH, RNG_SEED,
  { isFirstTurn: 0, speed: 50, moves: [1, 0, 0, 0] },
  { speed: 150, hp: 25, maxHp: 100, knownMoves: [MOVE_RESTORE_HP, 0, 0, 0] }, undefined);
pushCase("snatch_target_faster_low_hp_no_history_snatch4_fallthrough_plus1", MOVE_SNATCH, RNG_SEED,
  { isFirstTurn: 0, speed: 50, moves: [1, 0, 0, 0] },
  { speed: 150, hp: 25, maxHp: 100, knownMoves: [MOVE_HIT, 0, 0, 0] }, undefined);
pushCase("snatch_user_faster_full_hp_high_target_snatch2_roll_jump", MOVE_SNATCH, RNG_SEED,
  { isFirstTurn: 0, speed: 150, hp: 100, maxHp: 100 }, { speed: 50, hp: 70, maxHp: 100 }, undefined);
pushCase("snatch_user_faster_not_full_hp_snatch5", MOVE_SNATCH, RNG_SEED,
  { isFirstTurn: 0, speed: 150, hp: 99, maxHp: 100 }, { speed: 50, hp: 70, maxHp: 100 }, undefined);
for (let i = 0; i < 6; i += 1) {
  pushCase(`snatch_sweep_${i}`, MOVE_SNATCH, 50_000 + i * 4111,
    { isFirstTurn: i % 3, speed: i % 2 === 0 ? 150 : 50, hp: 10 + i * 15, maxHp: 100, moves: [1, 0, 0, 0] },
    { speed: i % 2 === 0 ? 50 : 150, hp: 5 + i * 12, maxHp: 100, knownMoves: [i % 2 === 0 ? MOVE_RESTORE_HP : MOVE_HIT, 0, 0, 0] },
    undefined);
}

// === EFFECT_MIRROR_MOVE (test:7666-7718) =====================================

const MOVE_MIRROR_MOVE = firstMoveId("EFFECT_MIRROR_MOVE");
const MIRROR_MOVE_ENCOURAGED = 79;
const MIRROR_MOVE_NOT_ENCOURAGED = 1;

pushCase("mirror_move_target_faster", MOVE_MIRROR_MOVE, RNG_SEED,
  { speed: 50 }, { speed: 150, lastUsedMoveId: MIRROR_MOVE_ENCOURAGED }, undefined);
pushCase("mirror_move_not_faster_encouraged_roll_jump", MOVE_MIRROR_MOVE, 4,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MIRROR_MOVE_ENCOURAGED }, undefined);
pushCase("mirror_move_not_faster_encouraged_roll_no_jump", MOVE_MIRROR_MOVE, 1,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MIRROR_MOVE_ENCOURAGED }, undefined);
pushCase("mirror_move_not_faster_unencouraged_roll_no_jump", MOVE_MIRROR_MOVE, RNG_SEED,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MIRROR_MOVE_NOT_ENCOURAGED }, undefined);
pushCase("mirror_move_tie", MOVE_MIRROR_MOVE, RNG_SEED,
  { speed: 100 }, { speed: 100, lastUsedMoveId: MIRROR_MOVE_ENCOURAGED }, undefined);

// === EFFECT_RECYCLE (test:7588-7629) =========================================

const MOVE_RECYCLE = firstMoveId("EFFECT_RECYCLE");

pushCase("recycle_item_not_encouraged_minus2", MOVE_RECYCLE, RNG_SEED, { usedHeldItemId: 0 }, {}, undefined);
pushCase("recycle_item_encouraged_roll_jump", MOVE_RECYCLE, 4, { usedHeldItemId: 134 }, {}, undefined);
pushCase("recycle_item_encouraged_roll_no_jump", MOVE_RECYCLE, 1, { usedHeldItemId: 134 }, {}, undefined);

// === EFFECT_SPIT_UP (test:7630-7665) =========================================

const MOVE_SPIT_UP = firstMoveId("EFFECT_SPIT_UP");

pushCase("spit_up_low_count_zero", MOVE_SPIT_UP, RNG_SEED, { stockpileCount: 1 }, {}, undefined);
pushCase("spit_up_high_count_roll_jump", MOVE_SPIT_UP, 4, { stockpileCount: 3 }, {}, undefined);
pushCase("spit_up_high_count_roll_no_jump", MOVE_SPIT_UP, 1, { stockpileCount: 2 }, {}, undefined);

// === EFFECT_THIEF (test:7493-7528) ===========================================

const MOVE_THIEF = firstMoveId("EFFECT_THIEF");

pushCase("thief_not_in_steal_list_minus2", MOVE_THIEF, RNG_SEED, {}, { holdEffect: 5 }, undefined);
pushCase("thief_in_steal_list_roll_jump", MOVE_THIEF, 4, {}, { holdEffect: 43 }, undefined);
pushCase("thief_in_steal_list_roll_no_jump", MOVE_THIEF, 1, {}, { holdEffect: 43 }, undefined);

// === EFFECT_HAZE (test:7529-7587) ============================================

const MOVE_HAZE = firstMoveId("EFFECT_HAZE");

pushCase("haze_neutral_block2_else_roll_jump", MOVE_HAZE, 4, {}, {}, undefined);
pushCase("haze_neutral_block2_else_roll_no_jump", MOVE_HAZE, 1, {}, {}, undefined);
pushCase("haze_user_raised_and_target_raised_both_blocks", MOVE_HAZE, 4, { atkStage: 9 }, { atkStage: 9 }, undefined);
pushCase("haze_target_lowered_and_user_lowered_both_blocks", MOVE_HAZE, 1, { atkStage: 3 }, { atkStage: 3 }, undefined);

// === EFFECT_SMELLINGSALT (test:7251-7277) ====================================

const MOVE_SMELLINGSALT = firstMoveId("EFFECT_SMELLINGSALT");

pushCase("smelling_salt_paralyzed_plus1", MOVE_SMELLINGSALT, RNG_SEED, {}, { isParalyzed: true }, undefined);
pushCase("smelling_salt_not_paralyzed_zero", MOVE_SMELLINGSALT, RNG_SEED, {}, { isParalyzed: false }, undefined);

// === EFFECT_MUD_SPORT / EFFECT_WATER_SPORT (test:7278-7326) =================

const MOVE_MUD_SPORT = firstMoveId("EFFECT_MUD_SPORT");
const MOVE_WATER_SPORT = firstMoveId("EFFECT_WATER_SPORT");

pushCase("mud_sport_low_hp_minus1", MOVE_MUD_SPORT, RNG_SEED, { hp: 49 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("mud_sport_type_match_plus1", MOVE_MUD_SPORT, RNG_SEED, { hp: 100 }, { types: ["TYPE_ELECTRIC", "TYPE_NORMAL"] }, undefined);
pushCase("mud_sport_type_match_type2_plus1", MOVE_MUD_SPORT, RNG_SEED, { hp: 100 }, { types: ["TYPE_NORMAL", "TYPE_ELECTRIC"] }, undefined);
pushCase("mud_sport_no_match_minus1", MOVE_MUD_SPORT, RNG_SEED, { hp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("water_sport_low_hp_minus1", MOVE_WATER_SPORT, RNG_SEED, { hp: 49 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("water_sport_type_match_plus1", MOVE_WATER_SPORT, RNG_SEED, { hp: 100 }, { types: ["TYPE_FIRE", "TYPE_NORMAL"] }, undefined);
pushCase("water_sport_no_match_minus1", MOVE_WATER_SPORT, RNG_SEED, { hp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);

// === EFFECT_POISON (test:7327-7359) ==========================================

const MOVE_POISON = firstMoveId("EFFECT_POISON");

pushCase("poison_low_user_hp_minus1", MOVE_POISON, RNG_SEED, { hp: 49 }, { hp: 100 }, undefined);
pushCase("poison_high_target_hp_zero", MOVE_POISON, RNG_SEED, { hp: 100 }, { hp: 60 }, undefined);
pushCase("poison_low_target_hp_minus1", MOVE_POISON, RNG_SEED, { hp: 100 }, { hp: 50 }, undefined);

// === EFFECT_LOCK_ON (test:7360-7386) =========================================

const MOVE_LOCK_ON = firstMoveId("EFFECT_LOCK_ON");

pushCase("lock_on_roll_jump", MOVE_LOCK_ON, 4, {}, {}, undefined);
pushCase("lock_on_roll_no_jump", MOVE_LOCK_ON, 1, {}, {}, undefined);

// === EFFECT_BIDE (test:7387-7413) ============================================

const MOVE_BIDE = firstMoveId("EFFECT_BIDE");

pushCase("bide_high_hp_zero", MOVE_BIDE, RNG_SEED, { hp: 91 }, {}, undefined);
pushCase("bide_low_hp_minus2", MOVE_BIDE, RNG_SEED, { hp: 90 }, {}, undefined);

// === EFFECT_IMPRISON (test:7414-7449) ========================================

const MOVE_IMPRISON = firstMoveId("EFFECT_IMPRISON");

pushCase("imprison_nonzero_first_turn_zero", MOVE_IMPRISON, RNG_SEED, { isFirstTurn: 1 }, {}, undefined);
pushCase("imprison_zero_first_turn_roll_jump", MOVE_IMPRISON, 4, { isFirstTurn: 0 }, {}, undefined);
pushCase("imprison_zero_first_turn_roll_no_jump", MOVE_IMPRISON, 1, { isFirstTurn: 0 }, {}, undefined);

// === EFFECT_CONVERSION (test:7450-7492) ======================================

const MOVE_CONVERSION = firstMoveId("EFFECT_CONVERSION");

pushCase("conversion_high_hp_zero_turn_zero", MOVE_CONVERSION, RNG_SEED, { hp: 91, battleTurnCount: 0 }, {}, undefined);
pushCase("conversion_low_hp_nonzero_turn_roll_jump", MOVE_CONVERSION, 4, { hp: 90, battleTurnCount: 5 }, {}, undefined);
pushCase("conversion_low_hp_nonzero_turn_roll_no_jump", MOVE_CONVERSION, 1, { hp: 90, battleTurnCount: 2 }, {}, undefined);

// === EFFECT_PAIN_SPLIT (test:7055-7099) ======================================

const MOVE_PAIN_SPLIT = firstMoveId("EFFECT_PAIN_SPLIT");

pushCase("pain_split_low_target_hp_minus1", MOVE_PAIN_SPLIT, RNG_SEED, {}, { hp: 79 }, undefined);
pushCase("pain_split_not_faster_high_user_hp_minus1", MOVE_PAIN_SPLIT, RNG_SEED, { speed: 150, hp: 41 }, { speed: 50, hp: 100 }, undefined);
pushCase("pain_split_not_faster_low_user_hp_plus1", MOVE_PAIN_SPLIT, RNG_SEED, { speed: 150, hp: 40 }, { speed: 50, hp: 100 }, undefined);
pushCase("pain_split_faster_high_user_hp_minus1", MOVE_PAIN_SPLIT, RNG_SEED, { speed: 50, hp: 61 }, { speed: 150, hp: 100 }, undefined);
pushCase("pain_split_faster_low_user_hp_plus1", MOVE_PAIN_SPLIT, RNG_SEED, { speed: 50, hp: 60 }, { speed: 150, hp: 100 }, undefined);

// === EFFECT_BELLY_DRUM (test:7100-7126) ======================================

const MOVE_BELLY_DRUM = firstMoveId("EFFECT_BELLY_DRUM");

pushCase("belly_drum_low_hp_minus2", MOVE_BELLY_DRUM, RNG_SEED, { hp: 89 }, {}, undefined);
pushCase("belly_drum_high_hp_zero", MOVE_BELLY_DRUM, RNG_SEED, { hp: 90 }, {}, undefined);

// === EFFECT_REFRESH (test:7127-7153) =========================================

const MOVE_REFRESH = firstMoveId("EFFECT_REFRESH");

pushCase("refresh_low_target_hp_minus1", MOVE_REFRESH, RNG_SEED, {}, { hp: 49 }, undefined);
pushCase("refresh_high_target_hp_zero", MOVE_REFRESH, RNG_SEED, {}, { hp: 50 }, undefined);

// === EFFECT_ERUPTION (test:7154-7207) ========================================

const MOVE_ERUPTION = firstMoveId("EFFECT_ERUPTION");

pushCase("eruption_weak_effectiveness_minus1", MOVE_ERUPTION, RNG_SEED,
  { types: ["TYPE_GRASS", "TYPE_GRASS"] }, { types: ["TYPE_FIRE", "TYPE_FIRE"] }, undefined);
pushCase("eruption_not_faster_high_target_hp_zero", MOVE_ERUPTION, RNG_SEED,
  { speed: 150, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, { speed: 50, hp: 51, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("eruption_not_faster_low_target_hp_minus1", MOVE_ERUPTION, RNG_SEED,
  { speed: 150, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, { speed: 50, hp: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("eruption_faster_high_target_hp_zero", MOVE_ERUPTION, RNG_SEED,
  { speed: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, { speed: 150, hp: 71, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("eruption_faster_low_target_hp_minus1", MOVE_ERUPTION, RNG_SEED,
  { speed: 50, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, { speed: 150, hp: 70, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);

// === EFFECT_FLATTER (test:7208-7250) =========================================

const MOVE_FLATTER = firstMoveId("EFFECT_FLATTER");

pushCase("flatter_roll_jump_high_hp", MOVE_FLATTER, 4, {}, { hp: 100 }, undefined);
pushCase("flatter_roll_no_jump_high_hp", MOVE_FLATTER, 1, {}, { hp: 100 }, undefined);
pushCase("flatter_low_target_hp_delegates_confuse", MOVE_FLATTER, RNG_SEED, {}, { hp: 20 }, undefined);

// === EFFECT_DISABLE (test:6995-7054) =========================================

const MOVE_DISABLE = firstMoveId("EFFECT_DISABLE");
const MOVE_TACKLE_DISABLE = firstMoveId("EFFECT_HIT");

pushCase("disable_target_faster_carry", MOVE_DISABLE, RNG_SEED, { speed: 50 }, { speed: 150 }, AI_WEATHER_HAIL);
pushCase("disable_nonzero_power_plus1", MOVE_DISABLE, RNG_SEED,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TACKLE_DISABLE }, undefined);
pushCase("disable_zero_power_roll_jump", MOVE_DISABLE, 4, { speed: 150 }, { speed: 50, lastUsedMoveId: null }, undefined);
pushCase("disable_zero_power_roll_no_jump", MOVE_DISABLE, 1, { speed: 150 }, { speed: 50, lastUsedMoveId: null }, undefined);

// === EFFECT_SKILL_SWAP / EFFECT_ROLE_PLAY (test:6861-6923) ==================

const MOVE_SKILL_SWAP = firstMoveId("EFFECT_SKILL_SWAP");
const MOVE_ROLE_PLAY = firstMoveId("EFFECT_ROLE_PLAY");

pushCase("skill_swap_user_ability_encouraged_minus1", MOVE_SKILL_SWAP, RNG_SEED,
  { ability: "ABILITY_SPEED_BOOST" }, {}, undefined);
pushCase("skill_swap_target_known_ability_encouraged_roll_jump", MOVE_SKILL_SWAP, 4,
  { ability: "ABILITY_NONE" }, { knownAbility: "ABILITY_STATIC" }, undefined);
pushCase("skill_swap_target_known_ability_encouraged_roll_no_jump", MOVE_SKILL_SWAP, 1,
  { ability: "ABILITY_NONE" }, { knownAbility: "ABILITY_STATIC" }, undefined);
pushCase("skill_swap_target_ability_outside_table_minus1", MOVE_SKILL_SWAP, RNG_SEED,
  { ability: "ABILITY_NONE" }, { knownAbility: "ABILITY_NONE", ability: "ABILITY_SHADOW_TAG" }, undefined);
pushCase("role_play_two_ability_species_guess_low_seed", MOVE_ROLE_PLAY, 1,
  { ability: "ABILITY_NONE" },
  { knownAbility: null, speciesAbilities: ["ABILITY_STATIC", "ABILITY_SAND_VEIL"] }, undefined);
pushCase("role_play_two_ability_species_guess_high_seed", MOVE_ROLE_PLAY, 4,
  { ability: "ABILITY_NONE" },
  { knownAbility: null, speciesAbilities: ["ABILITY_STATIC", "ABILITY_SAND_VEIL"] }, undefined);

// === EFFECT_SNORE (test:6924-6946) ===========================================

const MOVE_SNORE = firstMoveId("EFFECT_SNORE");

pushCase("snore_deterministic_plus2", MOVE_SNORE, RNG_SEED, {}, {}, AI_WEATHER_SANDSTORM);

// === emit Rust source ========================================================

function opt(hasValue, value) {
  return hasValue !== null && hasValue !== undefined ? `Some(${value})` : "None";
}
function optBool(v) {
  return v === null || v === undefined ? "None" : v ? "Some(true)" : "Some(false)";
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cv-m5d5-vectors.mjs — regenerate: node core-rs/tools/gen-cv-m5d5-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckViability.ts's runCheckViability");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One draw's generic (site, ordinal, rng, flag) snapshot -- same shape as");
lines.push("/// `CvM5d4Draw`. `site` is a 0-based M5d-5 draw-kind index (this generator's");
lines.push("/// own `SITE_BY_KIND` map, sites 100+ reserved for the 2 vestigial handlers'");
lines.push("/// own draw kinds); `flag` is `succeeded`/`jumped` as 0/1, `strikesFirst` for");
lines.push("/// the shared tie draw (already 0/1/2), or the guessed ability id truncated");
lines.push("/// to a byte for `get-ability`.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CvM5d5Draw {");
lines.push("    pub site: u8,");
lines.push("    pub ordinal: u32,");
lines.push("    pub before_value: u32,");
lines.push("    pub before_calls: u32,");
lines.push("    pub after_value: u32,");
lines.push("    pub after_calls: u32,");
lines.push("    pub raw_rng_value: u32,");
lines.push("    pub random_value: u16,");
lines.push("    pub flag: u8,");
lines.push("}");
lines.push("");

lines.push("/// One M5d-5 `run_check_viability` case (batching doc §2 \"M5d-5\"). Only");
lines.push("/// the battler fields this batch's handlers actually read are carried;");
lines.push("/// every other `FactoryAiCheckViabilityBattler` field stays at the test");
lines.push("/// file's own neutral default.");
lines.push("#[derive(Debug, Clone, Copy)]");
lines.push("pub struct CvM5d5Case {");
lines.push("    pub label: &'static str,");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub attacker_speed: u32,");
lines.push("    pub attacker_speed_stage: u8,");
lines.push("    pub attacker_types: [u8; 2],");
lines.push("    pub attacker_hp: i32,");
lines.push("    pub attacker_max_hp: i32,");
lines.push("    pub attacker_atk_stage: u8,");
lines.push("    pub attacker_def_stage: u8,");
lines.push("    pub attacker_sp_def_stage: u8,");
lines.push("    pub attacker_sp_atk_stage: Option<u8>,");
lines.push("    pub attacker_evasion_stage: u8,");
lines.push("    pub attacker_acc_stage: u8,");
lines.push("    pub attacker_is_first_turn: u8,");
lines.push("    pub attacker_moves: [u16; 4],");
lines.push("    pub attacker_ability: Option<u16>,");
lines.push("    pub attacker_hold_effect: Option<u16>,");
lines.push("    pub attacker_used_held_item_id: Option<u16>,");
lines.push("    pub attacker_stockpile_count: Option<u8>,");
lines.push("    pub attacker_battle_turn_count: Option<u32>,");
lines.push("    pub target_speed: u32,");
lines.push("    pub target_speed_stage: u8,");
lines.push("    pub target_types: [u8; 2],");
lines.push("    pub target_hp: i32,");
lines.push("    pub target_max_hp: i32,");
lines.push("    pub target_atk_stage: u8,");
lines.push("    pub target_def_stage: u8,");
lines.push("    pub target_sp_def_stage: u8,");
lines.push("    pub target_sp_atk_stage: Option<u8>,");
lines.push("    pub target_evasion_stage: u8,");
lines.push("    pub target_acc_stage: u8,");
lines.push("    pub target_is_paralyzed: Option<bool>,");
lines.push("    pub target_last_used_move_id: Option<u16>,");
lines.push("    pub target_known_moves: [u16; 4],");
lines.push("    pub target_hold_effect: Option<u16>,");
lines.push("    pub target_ability: Option<u16>,");
lines.push("    pub target_known_ability: Option<u16>,");
lines.push("    pub target_species_abilities: Option<[u16; 2]>,");
lines.push("    pub fallback: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CvM5d5Draw; 8],");
lines.push("}");

lines.push(`pub static CV_M5D5_CASES: [CvM5d5Case; ${cases.length}] = [`);
for (const c of cases) {
  const drawsStr = c.draws
    .map(
      (d) =>
        `CvM5d5Draw { site: ${d.site}, ordinal: ${d.ordinal}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, flag: ${d.flag} }`,
    )
    .join(", ");
  lines.push(`    // ${c.label}`);
  lines.push(
    `    CvM5d5Case { label: ${JSON.stringify(c.label)}, move_id: ${c.moveId}, rng_value: ${c.rngValue}, ` +
      `attacker_speed: ${c.attackerSpeed}, attacker_speed_stage: ${c.attackerSpeedStage}, ` +
      `attacker_types: [${c.attackerTypes[0]}, ${c.attackerTypes[1]}], ` +
      `attacker_hp: ${c.attackerHp}, attacker_max_hp: ${c.attackerMaxHp}, ` +
      `attacker_atk_stage: ${c.attackerAtkStage}, attacker_def_stage: ${c.attackerDefStage}, ` +
      `attacker_sp_def_stage: ${c.attackerSpDefStage}, ` +
      `attacker_sp_atk_stage: ${opt(c.attackerSpAtkStage, c.attackerSpAtkStage)}, ` +
      `attacker_evasion_stage: ${c.attackerEvasionStage}, attacker_acc_stage: ${c.attackerAccStage}, ` +
      `attacker_is_first_turn: ${c.attackerIsFirstTurn}, ` +
      `attacker_moves: [${c.attackerMoves.join(", ")}], ` +
      `attacker_ability: ${opt(abilityId(c.attackerAbility), abilityId(c.attackerAbility))}, ` +
      `attacker_hold_effect: ${opt(c.attackerHoldEffect, c.attackerHoldEffect)}, ` +
      `attacker_used_held_item_id: ${opt(c.attackerUsedHeldItemId, c.attackerUsedHeldItemId)}, ` +
      `attacker_stockpile_count: ${opt(c.attackerStockpileCount, c.attackerStockpileCount)}, ` +
      `attacker_battle_turn_count: ${opt(c.attackerBattleTurnCount, c.attackerBattleTurnCount)}, ` +
      `target_speed: ${c.targetSpeed}, target_speed_stage: ${c.targetSpeedStage}, ` +
      `target_types: [${c.targetTypes[0]}, ${c.targetTypes[1]}], ` +
      `target_hp: ${c.targetHp}, target_max_hp: ${c.targetMaxHp}, ` +
      `target_atk_stage: ${c.targetAtkStage}, target_def_stage: ${c.targetDefStage}, ` +
      `target_sp_def_stage: ${c.targetSpDefStage}, ` +
      `target_sp_atk_stage: ${opt(c.targetSpAtkStage, c.targetSpAtkStage)}, ` +
      `target_evasion_stage: ${c.targetEvasionStage}, target_acc_stage: ${c.targetAccStage}, ` +
      `target_is_paralyzed: ${optBool(c.targetIsParalyzed)}, ` +
      `target_last_used_move_id: ${opt(c.targetLastUsedMoveId, c.targetLastUsedMoveId)}, ` +
      `target_known_moves: [${c.targetKnownMoves.join(", ")}], ` +
      `target_hold_effect: ${opt(c.targetHoldEffect, c.targetHoldEffect)}, ` +
      `target_ability: ${opt(abilityId(c.targetAbility), abilityId(c.targetAbility))}, ` +
      `target_known_ability: ${opt(abilityId(c.targetKnownAbility), abilityId(c.targetKnownAbility))}, ` +
      `target_species_abilities: ${
        c.targetSpeciesAbilities
          ? `Some([${abilityId(c.targetSpeciesAbilities[0])}, ${abilityId(c.targetSpeciesAbilities[1])}])`
          : "None"
      }, ` +
      `fallback: ${opt(c.fallback, c.fallback)}, ` +
      `expected_rng_value: ${c.expectedRngValue}, expected_rng_calls: ${c.expectedRngCalls}, ` +
      `expected_score_delta: ${c.expectedScoreDelta}, expected_func_result_after: ${opt(c.expectedFuncResultAfter, c.expectedFuncResultAfter)}, ` +
      `expected_draw_count: ${c.expectedDrawCount}, draws: [${drawsStr}] },`,
  );
}
lines.push("];");
lines.push("");

// === vestigial handlers: runCvAccuracyUp / runCvSpAtkDown, called DIRECTLY ===

const vestigialCases = [];

function pushAccuracyUpCase(label, rngValue, overrides) {
  const input = {
    rng: { value: rngValue, calls: 0 },
    attackerAccStage: 6,
    attackerHp: 100,
    attackerMaxHp: 100,
    drawOrdinalStart: 1,
    reasonPrefix: "vec",
    ...overrides,
  };
  const result = runCvAccuracyUp(input);
  if (result.draws.length > 2) throw new Error(`gen-cv-m5d5-vectors: accuracy-up case ${label} produced >2 draws`);
  const draws = result.draws.map((d) => ({
    site: SITE_BY_KIND[d.kind],
    ordinal: d.ordinal,
    beforeValue: d.before.value,
    beforeCalls: d.before.calls,
    afterValue: d.after.value,
    afterCalls: d.after.calls,
    rawRngValue: d.rawRngValue,
    randomValue: d.randomValue,
    flag: drawFlag(d),
  }));
  while (draws.length < 2) draws.push({ site: 0, ordinal: 0, beforeValue: 0, beforeCalls: 0, afterValue: 0, afterCalls: 0, rawRngValue: 0, randomValue: 0, flag: 0 });
  vestigialCases.push({
    label,
    handler: 0,
    rngValue,
    attackerAccStage: input.attackerAccStage,
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    targetAtkStage: 6,
    targetSpAtkStage: 6,
    targetHp: 100,
    targetMaxHp: 100,
    targetTypes: [TYPE_IDS.TYPE_NORMAL, TYPE_IDS.TYPE_NORMAL],
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedScoreDelta: result.scoreDelta,
    expectedFuncResultAfter: null,
    expectedDrawCount: result.draws.length,
    draws,
  });
}

function pushSpAtkDownCase(label, rngValue, targetOverrides, attackerOverrides) {
  const input = {
    rng: { value: rngValue, calls: 0 },
    attackerHp: 100,
    attackerMaxHp: 100,
    targetAtkStage: 6,
    targetSpAtkStage: 6,
    targetHp: 100,
    targetMaxHp: 100,
    targetTypes: ["TYPE_FIRE", "TYPE_NORMAL"],
    drawOrdinalStart: 1,
    reasonPrefix: "vec",
    ...attackerOverrides,
    ...targetOverrides,
  };
  const result = runCvSpAtkDown(input);
  if (result.draws.length > 2) throw new Error(`gen-cv-m5d5-vectors: sp-atk-down case ${label} produced >2 draws`);
  const draws = result.draws.map((d) => ({
    site: SITE_BY_KIND[d.kind],
    ordinal: d.ordinal,
    beforeValue: d.before.value,
    beforeCalls: d.before.calls,
    afterValue: d.after.value,
    afterCalls: d.after.calls,
    rawRngValue: d.rawRngValue,
    randomValue: d.randomValue,
    flag: drawFlag(d),
  }));
  while (draws.length < 2) draws.push({ site: 0, ordinal: 0, beforeValue: 0, beforeCalls: 0, afterValue: 0, afterCalls: 0, rawRngValue: 0, randomValue: 0, flag: 0 });
  vestigialCases.push({
    label,
    handler: 1,
    rngValue,
    attackerAccStage: 6,
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    targetAtkStage: input.targetAtkStage,
    targetSpAtkStage: input.targetSpAtkStage,
    targetHp: input.targetHp,
    targetMaxHp: input.targetMaxHp,
    targetTypes: [TYPE_IDS[input.targetTypes[0]], TYPE_IDS[input.targetTypes[1]]],
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedScoreDelta: result.scoreDelta,
    expectedFuncResultAfter: result.funcResultAfter ?? null,
    expectedDrawCount: result.draws.length,
    draws,
  });
}

pushAccuracyUpCase("accuracy_up_low_stage_high_hp_zero", 1, { attackerAccStage: 6, attackerHp: 100 });
pushAccuracyUpCase("accuracy_up_low_stage_low_hp_minus2", 1, { attackerAccStage: 6, attackerHp: 60 });
pushAccuracyUpCase("accuracy_up_high_stage_roll_jump", 4, { attackerAccStage: 9, attackerHp: 100 });
pushAccuracyUpCase("accuracy_up_high_stage_roll_no_jump_low_hp", 1, { attackerAccStage: 9, attackerHp: 60 });

pushSpAtkDownCase("sp_atk_down_default_special_type_zero", 1, {}, {});
pushSpAtkDownCase("sp_atk_down_nondefault_low_spatk_roll1", 4, { targetAtkStage: 5, targetSpAtkStage: 2, targetHp: 100 }, {});
pushSpAtkDownCase("sp_atk_down_nondefault_low_spatk_low_targethp", 1, { targetAtkStage: 5, targetSpAtkStage: 2, targetHp: 70 }, {});
pushSpAtkDownCase("sp_atk_down_nonspecial_type_roll2", 1, { targetTypes: ["TYPE_NORMAL", "TYPE_NORMAL"] }, {});
pushSpAtkDownCase("sp_atk_down_nonspecial_type_roll2_jump", 4, { targetTypes: ["TYPE_NORMAL", "TYPE_NORMAL"] }, {});

lines.push("/// One direct-call case for the 2 fully-vestigial handlers");
lines.push("/// (`run_cv_accuracy_up`/`run_cv_sp_atk_down`, batching doc §2/§4) --");
lines.push("/// `handler` selects which: 0 = `run_cv_accuracy_up` (only the `attacker_*`");
lines.push("/// fields matter), 1 = `run_cv_sp_atk_down` (both `attacker_hp`/`_max_hp`");
lines.push("/// and every `target_*` field matter). Never reachable through");
lines.push("/// `run_check_viability` -- no real move carries either effect.");
lines.push("#[derive(Debug, Clone, Copy)]");
lines.push("pub struct CvM5d5VestigialCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub handler: u8,");
lines.push("    pub rng_value: u32,");
lines.push("    pub attacker_acc_stage: u8,");
lines.push("    pub attacker_hp: i32,");
lines.push("    pub attacker_max_hp: i32,");
lines.push("    pub target_atk_stage: u8,");
lines.push("    pub target_sp_atk_stage: u8,");
lines.push("    pub target_hp: i32,");
lines.push("    pub target_max_hp: i32,");
lines.push("    pub target_types: [u8; 2],");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CvM5d5Draw; 2],");
lines.push("}");
lines.push(`pub static CV_M5D5_VESTIGIAL_CASES: [CvM5d5VestigialCase; ${vestigialCases.length}] = [`);
for (const c of vestigialCases) {
  const drawsStr = c.draws
    .map(
      (d) =>
        `CvM5d5Draw { site: ${d.site}, ordinal: ${d.ordinal}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, flag: ${d.flag} }`,
    )
    .join(", ");
  lines.push(`    // ${c.label}`);
  lines.push(
    `    CvM5d5VestigialCase { label: ${JSON.stringify(c.label)}, handler: ${c.handler}, rng_value: ${c.rngValue}, ` +
      `attacker_acc_stage: ${c.attackerAccStage}, attacker_hp: ${c.attackerHp}, attacker_max_hp: ${c.attackerMaxHp}, ` +
      `target_atk_stage: ${c.targetAtkStage}, target_sp_atk_stage: ${c.targetSpAtkStage}, ` +
      `target_hp: ${c.targetHp}, target_max_hp: ${c.targetMaxHp}, ` +
      `target_types: [${c.targetTypes[0]}, ${c.targetTypes[1]}], ` +
      `expected_rng_value: ${c.expectedRngValue}, expected_rng_calls: ${c.expectedRngCalls}, ` +
      `expected_score_delta: ${c.expectedScoreDelta}, expected_func_result_after: ${opt(c.expectedFuncResultAfter, c.expectedFuncResultAfter)}, ` +
      `expected_draw_count: ${c.expectedDrawCount}, draws: [${drawsStr}] },`,
  );
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
const rustfmtCandidates = [path.join(rustupBin, "rustfmt"), "rustfmt"];
let formatted = false;
for (const rustfmt of rustfmtCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
if (!formatted) {
  throw new Error("gen-cv-m5d5-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cv-m5d5-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cv-m5d5-vectors: ${cases.length} main cases + ${vestigialCases.length} vestigial cases`);
