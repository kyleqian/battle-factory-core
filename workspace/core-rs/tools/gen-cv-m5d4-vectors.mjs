#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_viability_m5d4_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckViability.ts's `runCheckViability` (read-only
// import, node --experimental-strip-types -- the gen-cv-m5d1/m5d2/m5d3-
// vectors.mjs precedent, which this script mirrors byte-for-byte in
// structure). No value in the emitted file is hand-computed. Deterministic:
// a fixed directed case list plus small seeded sweeps per handler/cluster,
// not Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5d-4 only (docs/rust-m5d-checkviability-batching.md §2) -- the 22
// effects covering the charge-up/status-cure/screen-siblings/Substitute
// cluster. Every case here uses a move whose effect IS in this 22-effect
// batch: since src/engine/factoryAiCheckViability.ts is verified live below
// to be 122/122 dispatch-complete, its `runCheckViability` output for such a
// move already reflects the real handler logic end to end -- directly
// comparable to the Rust port's own M5d-4 handlers.
//
// Usage: node core-rs/tools/gen-cv-m5d4-vectors.mjs   (from any cwd)

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
  "factory_ai_check_viability_m5d4_vectors_gen.rs",
);

const cv = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckViability.ts"));
const { runCheckViability, AI_CHECK_VIABILITY_TABLE_EFFECTS } = cv;
const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { MOVES_BY_ID } = cbm;

// Verify live (not from doc prose) that TS really is 122/122 table-complete
// -- the premise this generator relies on to treat TS's own scored output as
// the handler-inclusive expected value for every M5d-4 move (same premise
// check gen-cv-m5d1/m5d2/m5d3-vectors.mjs make for their own batches).
if (AI_CHECK_VIABILITY_TABLE_EFFECTS.size !== 122) {
  throw new Error(
    `gen-cv-m5d4-vectors: expected AI_CHECK_VIABILITY_TABLE_EFFECTS to have 122 entries, found ${AI_CHECK_VIABILITY_TABLE_EFFECTS.size} ` +
      "(this script's whole premise for treating TS's scored output as ground truth)",
  );
}

// The 22 effects this batch covers (batching doc §2 "M5d-4"), TS dispatch
// source order (factoryAiCheckViability.ts:6383-6748) -- mirrors Rust's
// CV_HANDLED_EFFECTS_M5D4 exactly (factory_ai_check_viability.rs).
const M5D4_EFFECT_NAMES = new Set([
  "EFFECT_BRICK_BREAK",
  "EFFECT_SOLAR_BEAM", "EFFECT_RAZOR_WIND", "EFFECT_SKY_ATTACK", "EFFECT_SKULL_BASH",
  "EFFECT_OVERHEAT",
  "EFFECT_FACADE",
  "EFFECT_CURSE",
  "EFFECT_PSYCH_UP",
  "EFFECT_MIRROR_COAT",
  "EFFECT_DRAGON_DANCE",
  "EFFECT_BATON_PASS",
  "EFFECT_KNOCK_OFF",
  "EFFECT_FOCUS_PUNCH",
  "EFFECT_REVENGE",
  "EFFECT_SUPERPOWER",
  "EFFECT_MAGIC_COAT",
  "EFFECT_FORESIGHT",
  "EFFECT_ENDEAVOR",
  "EFFECT_ENCORE",
  "EFFECT_HEAL_BELL",
  "EFFECT_SUBSTITUTE",
]);
if (M5D4_EFFECT_NAMES.size !== 22) {
  throw new Error(`gen-cv-m5d4-vectors: expected exactly 22 M5d-4 effect names, got ${M5D4_EFFECT_NAMES.size}`);
}
for (const name of M5D4_EFFECT_NAMES) {
  if (!AI_CHECK_VIABILITY_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cv-m5d4-vectors: ${name} is not a real AI_CheckViability table effect`);
  }
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use (identical to
// gen-cv-m5d1/m5d2/m5d3-vectors.mjs's own TYPE_IDS). ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};
// `AiWeatherValue` is a plain 0-3 NUMBER on the TS side
// (`factoryAiCheckBadMove.ts:144-147`).
const AI_WEATHER_SUN = 0;
const AI_WEATHER_RAIN = 1;
const AI_WEATHER_SANDSTORM = 2;
const AI_WEATHER_HAIL = 3;

// --- draw site indices, one per M5d-4 draw kind. ---
const SITE_BY_KIND = {
  "target-faster-tie": 0,
  "curse-roll-1": 1,
  "curse-roll-2": 2,
  "curse-roll-3": 3,
  "psych-up-roll": 4,
  "mirror-coat-roll-1": 5,
  "mirror-coat-roll-2": 6,
  "mirror-coat-roll-3": 7,
  "mirror-coat-roll-4": 8,
  "mirror-coat-roll-5": 9,
  "mirror-coat-roll-6": 10,
  "mirror-coat-roll-7": 11,
  "dragon-dance-roll-1": 12,
  "dragon-dance-roll-2": 13,
  "baton-pass-roll": 14,
  "knock-off-roll": 15,
  "focus-punch-roll-1": 16,
  "focus-punch-roll-2": 17,
  "revenge-roll": 18,
  "magic-coat-roll-1": 19,
  "magic-coat-roll-2": 20,
  "magic-coat-roll-3": 21,
  "foresight-roll-1": 22,
  "foresight-roll-2": 23,
  "encore-roll": 24,
  "substitute-roll-1": 25,
  "substitute-roll-2": 26,
  "substitute-roll-3": 27,
  "substitute-roll-4": 28,
};

function drawFlag(d) {
  if (d.kind === "target-faster-tie") return d.strikesFirst;
  if ("succeeded" in d) return d.succeeded ? 1 : 0;
  if ("jumped" in d) return d.jumped ? 1 : 0;
  throw new Error(`gen-cv-m5d4-vectors: unrecognized draw shape for kind ${d.kind}`);
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
  if (!move) throw new Error(`gen-cv-m5d4-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5D4_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cv-m5d4-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5d-4 batch`,
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
    throw new Error(`gen-cv-m5d4-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 8) {
    throw new Error(`gen-cv-m5d4-vectors: case ${label} produced ${result.draws.length} draws, expected <=8`);
  }

  const draws = result.draws.map((d) => {
    const site = SITE_BY_KIND[d.kind];
    if (site === undefined) throw new Error(`gen-cv-m5d4-vectors: case ${label} unrecognized draw kind ${d.kind}`);
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
    attackerIsFirstTurn: attacker.isFirstTurn,
    attackerMoves: attacker.moves ?? [0, 0, 0, 0],
    attackerHasSubstitute: attacker.hasSubstitute ?? null,
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
    targetHasSideReflect: target.hasSideReflect ?? null,
    targetIsPoisoned: target.isPoisoned ?? null,
    targetIsBurned: target.isBurned ?? null,
    targetIsParalyzed: target.isParalyzed ?? null,
    targetIsToxicPoisoned: target.isToxicPoisoned ?? null,
    targetIsAsleep: target.isAsleep ?? null,
    targetIsInfatuated: target.isInfatuated ?? null,
    targetIsConfused: target.isConfused ?? null,
    targetIsTaunted: target.isTaunted ?? null,
    targetLastUsedMoveId: target.lastUsedMoveId ?? null,
    targetKnownMoves: target.knownMoves ?? [0, 0, 0, 0],
    targetAnyMoveDisabled: target.anyMoveDisabled ?? null,
    targetHasAnyStatus: target.hasAnyStatus ?? null,
    targetPartyStatusEqualsAny: target.targetPartyStatusEqualsAny ?? null,
    targetIsLeechSeeded: target.isLeechSeeded ?? null,
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

// === EFFECT_BRICK_BREAK (test:5773-5802) =====================================

const MOVE_BRICK_BREAK = 280;

pushCase("brick_break_side_reflect_scores_plus1", MOVE_BRICK_BREAK, RNG_SEED, {}, { hasSideReflect: true }, AI_WEATHER_SUN);
pushCase("brick_break_no_side_reflect_scores_zero", MOVE_BRICK_BREAK, RNG_SEED, {}, { hasSideReflect: false }, undefined);

// === EFFECT_SOLAR_BEAM+RAZOR_WIND+SKY_ATTACK+SKULL_BASH: run_cv_charge_up_move
// (test:5803-5865) ============================================================

const MOVE_SOLAR_BEAM = 76;
const MOVE_RAZOR_WIND = 13;
const MOVE_SKY_ATTACK = 143;
const MOVE_SKULL_BASH = 130;
const MOVE_PROTECT_CU = 182;

pushCase("charge_up_weak_effectiveness_minus2", MOVE_SOLAR_BEAM, RNG_SEED,
  { types: ["TYPE_GRASS", "TYPE_GRASS"], hp: 100, maxHp: 100 }, { types: ["TYPE_FIRE", "TYPE_FIRE"] }, undefined);
pushCase("charge_up_target_history_protect_minus2", MOVE_SOLAR_BEAM, RNG_SEED,
  { types: ["TYPE_GRASS", "TYPE_GRASS"], hp: 100, maxHp: 100, moves: [MOVE_PROTECT_CU, 0, 0, 0] },
  { types: ["TYPE_NORMAL", "TYPE_NORMAL"], knownMoves: [MOVE_PROTECT_CU, 0, 0, 0] }, undefined);
pushCase("charge_up_high_hp_zero", MOVE_SOLAR_BEAM, RNG_SEED,
  { types: ["TYPE_GRASS", "TYPE_GRASS"], hp: 39, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("charge_up_low_hp_minus1", MOVE_SOLAR_BEAM, RNG_SEED,
  { types: ["TYPE_GRASS", "TYPE_GRASS"], hp: 38, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("razor_wind_shares_charge_up_handler", MOVE_RAZOR_WIND, RNG_SEED,
  { types: ["TYPE_NORMAL", "TYPE_NORMAL"], hp: 100, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("sky_attack_shares_charge_up_handler", MOVE_SKY_ATTACK, RNG_SEED,
  { types: ["TYPE_FLYING", "TYPE_FLYING"], hp: 100, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("skull_bash_shares_charge_up_handler", MOVE_SKULL_BASH, RNG_SEED,
  { types: ["TYPE_NORMAL", "TYPE_NORMAL"], hp: 100, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);

// === EFFECT_OVERHEAT (test:5866-5914) ========================================

const MOVE_OVERHEAT = 315;

pushCase("overheat_weak_effectiveness_minus1", MOVE_OVERHEAT, RNG_SEED,
  { types: ["TYPE_FIRE", "TYPE_FIRE"], hp: 100, maxHp: 100 }, { types: ["TYPE_ROCK", "TYPE_ROCK"] }, undefined);
pushCase("overheat_target_faster_high_hp_zero", MOVE_OVERHEAT, RNG_SEED,
  { types: ["TYPE_FIRE", "TYPE_FIRE"], speed: 50, hp: 81, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 150 }, undefined);
pushCase("overheat_target_faster_low_hp_minus1", MOVE_OVERHEAT, RNG_SEED,
  { types: ["TYPE_FIRE", "TYPE_FIRE"], speed: 50, hp: 80, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 150 }, undefined);
pushCase("overheat_not_faster_high_hp_zero", MOVE_OVERHEAT, RNG_SEED,
  { types: ["TYPE_FIRE", "TYPE_FIRE"], speed: 150, hp: 61, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 50 }, undefined);
pushCase("overheat_not_faster_low_hp_minus1", MOVE_OVERHEAT, RNG_SEED,
  { types: ["TYPE_FIRE", "TYPE_FIRE"], speed: 150, hp: 60, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 50 }, undefined);
pushCase("overheat_tie_draws_target_faster_tie", MOVE_OVERHEAT, RNG_SEED,
  { types: ["TYPE_FIRE", "TYPE_FIRE"], speed: 100, hp: 50, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 100 }, undefined);

// === EFFECT_FACADE (test:5915-5953) ==========================================

const MOVE_FACADE = 263;

pushCase("facade_poisoned_plus1", MOVE_FACADE, RNG_SEED, {}, { isPoisoned: true }, undefined);
pushCase("facade_burned_plus1", MOVE_FACADE, RNG_SEED, {}, { isBurned: true }, undefined);
pushCase("facade_paralyzed_plus1", MOVE_FACADE, RNG_SEED, {}, { isParalyzed: true }, undefined);
pushCase("facade_toxic_poisoned_plus1", MOVE_FACADE, RNG_SEED, {}, { isToxicPoisoned: true }, undefined);
pushCase("facade_no_status_zero", MOVE_FACADE, RNG_SEED, {}, {}, undefined);

// === EFFECT_CURSE (test:5954-6024) — own independent DEF-band/Ghost-HP body =

const MOVE_CURSE = 174;

pushCase("curse_def10_zero", MOVE_CURSE, 1, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], defStage: 10 }, {}, AI_WEATHER_SANDSTORM);
pushCase("curse_def8_one_draw_plus1", MOVE_CURSE, 1, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], defStage: 8 }, {}, undefined);
pushCase("curse_def7_two_draws_zero", MOVE_CURSE, 4, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], defStage: 7 }, {}, undefined);
pushCase("curse_def6_seed1_three_draws_plus2", MOVE_CURSE, 1, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], defStage: 6 }, {}, undefined);
pushCase("curse_def6_seed4_three_draws_zero", MOVE_CURSE, 4, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], defStage: 6 }, {}, undefined);
pushCase("curse_ghost_hp_high_zero", MOVE_CURSE, 1, { types: ["TYPE_GHOST", "TYPE_GHOST"], hp: 81, maxHp: 100 }, {}, undefined);
pushCase("curse_ghost_hp_low_minus1", MOVE_CURSE, 1, { types: ["TYPE_GHOST", "TYPE_GHOST"], hp: 80, maxHp: 100 }, {}, undefined);
pushCase("curse_func_result_type2_non_ghost", MOVE_CURSE, 1, { types: ["TYPE_FIRE", "TYPE_FIGHTING"], defStage: 10 }, {}, undefined);
for (let i = 0; i < 8; i += 1) {
  pushCase(`curse_sweep_${i}`, MOVE_CURSE, 40_000 + i * 6113,
    { types: i % 2 === 0 ? ["TYPE_FIRE", "TYPE_GHOST"] : ["TYPE_WATER", "TYPE_GRASS"], defStage: i % 13, hp: 10 + i * 10, maxHp: 100 },
    {}, undefined);
}

// === EFFECT_PSYCH_UP (test:6025-6073) — own independent body ================

const MOVE_PSYCH_UP = 244;

pushCase("psych_up_no_raised_stat_minus2", MOVE_PSYCH_UP, 1, {}, { atkStage: 8 }, undefined);
pushCase("psych_up_user_atk_low_bare_plus1", MOVE_PSYCH_UP, 1, { atkStage: 5 }, { atkStage: 9 }, undefined);
pushCase("psych_up_only_evasion_low_chained_plus2", MOVE_PSYCH_UP, 1,
  { atkStage: 7, defStage: 7, spAtkStage: 7, spDefStage: 7, evasionStage: 5 }, { atkStage: 9 }, undefined);
pushCase("psych_up_all_high_roll_below_50_zero", MOVE_PSYCH_UP, 4,
  { atkStage: 7, defStage: 7, spAtkStage: 7, spDefStage: 7, evasionStage: 7 }, { atkStage: 9 }, undefined);
pushCase("psych_up_all_high_roll_above_50_minus2", MOVE_PSYCH_UP, 1,
  { atkStage: 7, defStage: 7, spAtkStage: 7, spDefStage: 7, evasionStage: 7 }, { atkStage: 9 }, undefined);

// === EFFECT_MIRROR_COAT (test:6074-6172) — densest directed coverage ========

const MOVE_MIRROR_COAT = 243;
const MOVE_COUNTER_MC = 68;
const MOVE_THUNDERBOLT_MC = 85; // power 95, TYPE_ELECTRIC (special list)
const MOVE_TACKLE_MC = 33; // power 35, TYPE_NORMAL (not special)

pushCase("mirror_coat_status_asleep_minus1", MOVE_MIRROR_COAT, RNG_SEED, { hp: 100, maxHp: 100 }, { isAsleep: true }, AI_WEATHER_SUN);
pushCase("mirror_coat_status_infatuated_minus1", MOVE_MIRROR_COAT, RNG_SEED, { hp: 100, maxHp: 100 }, { isInfatuated: true }, undefined);
pushCase("mirror_coat_status_confused_minus1", MOVE_MIRROR_COAT, RNG_SEED, { hp: 100, maxHp: 100 }, { isConfused: true }, undefined);
pushCase("mirror_coat_low_hp_and_mid_hp_rolls", MOVE_MIRROR_COAT, 4, { hp: 20, maxHp: 100 }, {}, undefined);
pushCase("mirror_coat_counter_shortcut", MOVE_MIRROR_COAT, RNG_SEED, { hp: 100, maxHp: 100, moves: [MOVE_COUNTER_MC, 0, 0, 0] }, {}, undefined);
pushCase("mirror_coat_nonzero_power_taunted_special_type", MOVE_MIRROR_COAT, RNG_SEED,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_THUNDERBOLT_MC, isTaunted: true }, undefined);
pushCase("mirror_coat_nonzero_power_not_taunted_special_type", MOVE_MIRROR_COAT, RNG_SEED,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_THUNDERBOLT_MC, isTaunted: false }, undefined);
pushCase("mirror_coat_nonzero_power_nonspecial_type", MOVE_MIRROR_COAT, RNG_SEED,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_TACKLE_MC }, undefined);
pushCase("mirror_coat_zero_power_taunted", MOVE_MIRROR_COAT, RNG_SEED,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: null, isTaunted: true, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("mirror_coat_zero_power_special_target_type1", MOVE_MIRROR_COAT, RNG_SEED,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: null, types: ["TYPE_FIRE", "TYPE_NORMAL"] }, undefined);
pushCase("mirror_coat_zero_power_special_target_type2", MOVE_MIRROR_COAT, RNG_SEED,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: null, types: ["TYPE_NORMAL", "TYPE_DARK"] }, undefined);
pushCase("mirror_coat_zero_power_nonspecial_tail_roll_jump", MOVE_MIRROR_COAT, 4,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: null, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("mirror_coat_zero_power_nonspecial_tail_roll_no_jump", MOVE_MIRROR_COAT, 1,
  { hp: 100, maxHp: 100 }, { lastUsedMoveId: null, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
for (let i = 0; i < 12; i += 1) {
  const lastMoves = [MOVE_THUNDERBOLT_MC, MOVE_TACKLE_MC, null];
  const types = [
    ["TYPE_NORMAL", "TYPE_NORMAL"], ["TYPE_FIRE", "TYPE_NORMAL"], ["TYPE_NORMAL", "TYPE_DARK"], ["TYPE_ROCK", "TYPE_STEEL"],
  ];
  pushCase(`mirror_coat_sweep_${i}`, MOVE_MIRROR_COAT, 41_000 + i * 5347,
    { hp: 5 + i * 8, maxHp: 100, moves: i % 5 === 0 ? [MOVE_COUNTER_MC, 0, 0, 0] : [0, 0, 0, 0] },
    { lastUsedMoveId: lastMoves[i % lastMoves.length], isTaunted: i % 3 === 0, types: types[i % types.length] },
    i % 4 === 0 ? AI_WEATHER_RAIN : undefined);
}

// === EFFECT_DRAGON_DANCE (test:6173-6227) ====================================

const MOVE_DRAGON_DANCE = 349;

pushCase("dragon_dance_target_faster_roll_jump", MOVE_DRAGON_DANCE, 4, { speed: 50 }, { speed: 150 }, undefined);
pushCase("dragon_dance_target_faster_roll_no_jump", MOVE_DRAGON_DANCE, 1, { speed: 50 }, { speed: 150 }, undefined);
pushCase("dragon_dance_not_faster_high_hp_zero", MOVE_DRAGON_DANCE, RNG_SEED, { speed: 150, hp: 51, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("dragon_dance_not_faster_low_hp_roll_jump", MOVE_DRAGON_DANCE, 4, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("dragon_dance_not_faster_low_hp_roll_no_jump", MOVE_DRAGON_DANCE, 1, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("dragon_dance_tie_draws_target_faster_tie", MOVE_DRAGON_DANCE, RNG_SEED, { speed: 100, hp: 50, maxHp: 100 }, { speed: 100 }, undefined);

// === EFFECT_BATON_PASS (test:6228-6296) ======================================

const MOVE_BATON_PASS = 226;

pushCase("baton_pass_stat_above8_target_faster_high_hp_zero", MOVE_BATON_PASS, RNG_SEED,
  { atkStage: 9, speed: 50, hp: 71, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("baton_pass_stat_above8_target_faster_roll", MOVE_BATON_PASS, 4,
  { atkStage: 9, speed: 50, hp: 70, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("baton_pass_stat_above8_not_faster_high_hp_zero", MOVE_BATON_PASS, RNG_SEED,
  { atkStage: 9, speed: 150, hp: 61, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("baton_pass_stat_above8_not_faster_roll_jump", MOVE_BATON_PASS, 4,
  { atkStage: 9, speed: 150, hp: 60, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("baton_pass_stat_above8_not_faster_roll_no_jump", MOVE_BATON_PASS, 1,
  { atkStage: 9, speed: 150, hp: 60, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("baton_pass_stat_above7_not8_target_faster_low_hp_zero", MOVE_BATON_PASS, RNG_SEED,
  { atkStage: 8, speed: 50, hp: 69, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("baton_pass_stat_above7_not8_target_faster_high_hp_minus2", MOVE_BATON_PASS, RNG_SEED,
  { atkStage: 8, speed: 50, hp: 70, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("baton_pass_stat_above7_not8_not_faster_high_hp_minus2", MOVE_BATON_PASS, RNG_SEED,
  { atkStage: 8, speed: 150, hp: 61, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("baton_pass_stat_above7_not8_not_faster_low_hp_zero", MOVE_BATON_PASS, RNG_SEED,
  { atkStage: 8, speed: 150, hp: 60, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("baton_pass_no_stat_above7_minus2", MOVE_BATON_PASS, RNG_SEED, { speed: 150 }, { speed: 50 }, undefined);

// === EFFECT_KNOCK_OFF (test:5063-5116) =======================================

const MOVE_KNOCK_OFF = 282;

pushCase("knock_off_low_target_hp_carry_survives", MOVE_KNOCK_OFF, RNG_SEED, {}, { hp: 29, maxHp: 100 }, AI_WEATHER_RAIN);
pushCase("knock_off_not_first_turn_writes_func_result", MOVE_KNOCK_OFF, RNG_SEED, { isFirstTurn: 2 }, { hp: 100, maxHp: 100 }, undefined);
pushCase("knock_off_first_turn_roll_jump", MOVE_KNOCK_OFF, 4, { isFirstTurn: 0 }, { hp: 100, maxHp: 100 }, undefined);
pushCase("knock_off_first_turn_roll_no_jump", MOVE_KNOCK_OFF, 1, { isFirstTurn: 0 }, { hp: 100, maxHp: 100 }, undefined);

// === EFFECT_FOCUS_PUNCH (test:6297-6364) =====================================

const MOVE_FOCUS_PUNCH = 264;

pushCase("focus_punch_weak_effectiveness_minus1", MOVE_FOCUS_PUNCH, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] }, { types: ["TYPE_FLYING", "TYPE_FLYING"] }, AI_WEATHER_HAIL);
pushCase("focus_punch_asleep_bare_plus1", MOVE_FOCUS_PUNCH, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], isAsleep: true }, undefined);
pushCase("focus_punch_confused_roll_jump_zero", MOVE_FOCUS_PUNCH, 4,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], isConfused: true }, undefined);
pushCase("focus_punch_infatuated_fallthrough_no_substitute_plus1", MOVE_FOCUS_PUNCH, 1,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], hasSubstitute: false }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], isInfatuated: true }, undefined);
pushCase("focus_punch_infatuated_fallthrough_substitute_plus5", MOVE_FOCUS_PUNCH, 1,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], hasSubstitute: true }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], isInfatuated: true }, undefined);
pushCase("focus_punch_statusless_not_first_turn_zero_writes", MOVE_FOCUS_PUNCH, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], isFirstTurn: 1 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("focus_punch_statusless_first_turn_roll_jump", MOVE_FOCUS_PUNCH, 4,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], isFirstTurn: 0 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("focus_punch_statusless_first_turn_roll_no_jump", MOVE_FOCUS_PUNCH, 1,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], isFirstTurn: 0 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);

// === EFFECT_REVENGE (test:6387-6422) =========================================

const MOVE_REVENGE = 279;

pushCase("revenge_status_asleep_minus2", MOVE_REVENGE, RNG_SEED, {}, { isAsleep: true }, undefined);
pushCase("revenge_clean_roll_jump_minus2", MOVE_REVENGE, 4, {}, {}, undefined);
pushCase("revenge_clean_roll_no_jump_plus2", MOVE_REVENGE, 1, {}, {}, undefined);

// === EFFECT_SUPERPOWER (test:6423-6465) ======================================

const MOVE_SUPERPOWER = 276;

pushCase("superpower_weak_effectiveness_minus1", MOVE_SUPERPOWER, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"] }, { types: ["TYPE_FLYING", "TYPE_FLYING"] }, undefined);
pushCase("superpower_low_atk_stage_minus1", MOVE_SUPERPOWER, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], atkStage: 5 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, undefined);
pushCase("superpower_target_faster_low_hp_zero", MOVE_SUPERPOWER, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], speed: 50, hp: 59, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 150 }, undefined);
pushCase("superpower_target_faster_high_hp_minus1", MOVE_SUPERPOWER, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], speed: 50, hp: 60, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 150 }, undefined);
pushCase("superpower_not_faster_high_hp_minus1", MOVE_SUPERPOWER, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], speed: 150, hp: 41, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 50 }, undefined);
pushCase("superpower_not_faster_low_hp_zero", MOVE_SUPERPOWER, RNG_SEED,
  { types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], speed: 150, hp: 40, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], speed: 50 }, undefined);

// === EFFECT_MAGIC_COAT (test:6466-6521) ======================================

const MOVE_MAGIC_COAT = 277;

pushCase("magic_coat_low_hp_roll1_jump_first_turn_roll3_jump", MOVE_MAGIC_COAT, 4, { isFirstTurn: 1 }, { hp: 20, maxHp: 100 }, undefined);
pushCase("magic_coat_low_hp_roll1_no_jump_first_turn_roll3_no_jump", MOVE_MAGIC_COAT, 1, { isFirstTurn: 1 }, { hp: 20, maxHp: 100 }, undefined);
pushCase("magic_coat_high_hp_first_turn_zero_roll2_jump", MOVE_MAGIC_COAT, 4, { isFirstTurn: 0 }, { hp: 100, maxHp: 100 }, undefined);
pushCase("magic_coat_high_hp_first_turn_zero_roll2_no_jump", MOVE_MAGIC_COAT, 1, { isFirstTurn: 0 }, { hp: 100, maxHp: 100 }, undefined);

// === EFFECT_FORESIGHT (test:6522-6567) =======================================

const MOVE_FORESIGHT = 193;

pushCase("foresight_non_ghost_low_evasion_minus2", MOVE_FORESIGHT, RNG_SEED, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], evasionStage: 8 }, {}, undefined);
pushCase("foresight_ghost_roll_jump", MOVE_FORESIGHT, 4, { types: ["TYPE_GHOST", "TYPE_NORMAL"], evasionStage: 6 }, {}, undefined);
pushCase("foresight_ghost_roll_no_jump", MOVE_FORESIGHT, 1, { types: ["TYPE_GHOST", "TYPE_NORMAL"], evasionStage: 6 }, {}, undefined);
pushCase("foresight_high_evasion_non_ghost_roll", MOVE_FORESIGHT, 1, { types: ["TYPE_NORMAL", "TYPE_NORMAL"], evasionStage: 9 }, {}, undefined);

// === EFFECT_ENDEAVOR (test:6568-6604) ========================================

const MOVE_ENDEAVOR = 283;

pushCase("endeavor_low_target_hp_minus1", MOVE_ENDEAVOR, RNG_SEED, {}, { hp: 69, maxHp: 100 }, undefined);
pushCase("endeavor_target_faster_high_hp_minus1", MOVE_ENDEAVOR, RNG_SEED, { speed: 50, hp: 51, maxHp: 100 }, { speed: 150, hp: 70, maxHp: 100 }, undefined);
pushCase("endeavor_target_faster_low_hp_plus1", MOVE_ENDEAVOR, RNG_SEED, { speed: 50, hp: 50, maxHp: 100 }, { speed: 150, hp: 70, maxHp: 100 }, undefined);
pushCase("endeavor_not_faster_high_hp_minus1", MOVE_ENDEAVOR, RNG_SEED, { speed: 150, hp: 41, maxHp: 100 }, { speed: 50, hp: 70, maxHp: 100 }, undefined);
pushCase("endeavor_not_faster_low_hp_plus1", MOVE_ENDEAVOR, RNG_SEED, { speed: 150, hp: 40, maxHp: 100 }, { speed: 50, hp: 70, maxHp: 100 }, undefined);

// === EFFECT_ENCORE (test:6605-6660) ==========================================

const MOVE_ENCORE = 227;
const MOVE_TOXIC_ENCORE = 92; // EFFECT_TOXIC, in the encouraged table
const MOVE_TACKLE_ENCORE = 33; // EFFECT_HIT, not in the encouraged table

pushCase("encore_any_move_disabled_roll_jump", MOVE_ENCORE, 4, {}, { anyMoveDisabled: true }, AI_WEATHER_HAIL);
pushCase("encore_any_move_disabled_roll_no_jump", MOVE_ENCORE, 1, {}, { anyMoveDisabled: true }, undefined);
pushCase("encore_target_faster_minus2", MOVE_ENCORE, RNG_SEED, { speed: 50 }, { speed: 150 }, undefined);
pushCase("encore_not_faster_not_encouraged_minus2", MOVE_ENCORE, RNG_SEED,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TACKLE_ENCORE }, undefined);
pushCase("encore_not_faster_encouraged_roll_jump", MOVE_ENCORE, 4,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TOXIC_ENCORE }, undefined);
pushCase("encore_not_faster_encouraged_roll_no_jump", MOVE_ENCORE, 1,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TOXIC_ENCORE }, undefined);

// === EFFECT_HEAL_BELL (test:6661-6694) =======================================

const MOVE_HEAL_BELL = 215;

pushCase("heal_bell_target_status_zero", MOVE_HEAL_BELL, RNG_SEED, {}, { hasAnyStatus: true }, undefined);
pushCase("heal_bell_party_status_zero", MOVE_HEAL_BELL, RNG_SEED, {}, { targetPartyStatusEqualsAny: true }, undefined);
pushCase("heal_bell_no_status_minus5", MOVE_HEAL_BELL, RNG_SEED, {}, {}, undefined);

// === EFFECT_SUBSTITUTE (test:6695-6807) — densest directed coverage =========

const MOVE_SUBSTITUTE = 164;
const MOVE_GLARE_SUB = 78; // EFFECT_PARALYZE
const MOVE_LEECH_SEED_SUB = 73; // EFFECT_LEECH_SEED
const MOVE_TACKLE_SUB = 33; // EFFECT_HIT
const MOVE_SUPERSONIC_SUB = 48; // EFFECT_CONFUSE

pushCase("substitute_high_hp_no_band_rolls_target_faster", MOVE_SUBSTITUTE, RNG_SEED,
  { hp: 91, maxHp: 100, speed: 50 }, { speed: 150 }, AI_WEATHER_SANDSTORM);
pushCase("substitute_band_70_90_single_roll", MOVE_SUBSTITUTE, 4, { hp: 80, maxHp: 100, speed: 150 }, { speed: 50 }, undefined);
pushCase("substitute_band_50_70_two_rolls", MOVE_SUBSTITUTE, 4, { hp: 60, maxHp: 100, speed: 150 }, { speed: 50 }, undefined);
pushCase("substitute_band_le_50_three_rolls_seed1", MOVE_SUBSTITUTE, 1, { hp: 40, maxHp: 100, speed: 150 }, { speed: 50 }, undefined);
pushCase("substitute_band_le_50_three_rolls_seed4", MOVE_SUBSTITUTE, 4, { hp: 40, maxHp: 100, speed: 150 }, { speed: 50 }, undefined);
pushCase("substitute_tie_draws_target_faster_tie", MOVE_SUBSTITUTE, RNG_SEED, { hp: 40, maxHp: 100, speed: 100 }, { speed: 100 }, undefined);
pushCase("substitute_unmatched_last_effect_zero", MOVE_SUBSTITUTE, RNG_SEED,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TACKLE_SUB }, undefined);
pushCase("substitute_status1_clean_target_roll8", MOVE_SUBSTITUTE, 1,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_GLARE_SUB, hasAnyStatus: false }, undefined);
pushCase("substitute_status1_statused_target_zero", MOVE_SUBSTITUTE, RNG_SEED,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_GLARE_SUB, hasAnyStatus: true }, undefined);
pushCase("substitute_confuse_clean_target_roll8", MOVE_SUBSTITUTE, 1,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_SUPERSONIC_SUB, isConfused: false }, undefined);
pushCase("substitute_confuse_confused_target_zero", MOVE_SUBSTITUTE, RNG_SEED,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_SUPERSONIC_SUB, isConfused: true }, undefined);
pushCase("substitute_leech_seed_unseeded_roll8", MOVE_SUBSTITUTE, 1,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_LEECH_SEED_SUB, isLeechSeeded: false }, undefined);
pushCase("substitute_leech_seed_seeded_zero", MOVE_SUBSTITUTE, RNG_SEED,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_LEECH_SEED_SUB, isLeechSeeded: true }, undefined);
pushCase("substitute_roll8_fallthrough_plus1", MOVE_SUBSTITUTE, RNG_SEED,
  { hp: 100, maxHp: 100, speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_GLARE_SUB, hasAnyStatus: false }, undefined);
for (let i = 0; i < 14; i += 1) {
  const lastMoves = [MOVE_GLARE_SUB, MOVE_LEECH_SEED_SUB, MOVE_SUPERSONIC_SUB, MOVE_TACKLE_SUB];
  pushCase(`substitute_sweep_${i}`, MOVE_SUBSTITUTE, 42_000 + i * 5813,
    { hp: 3 + i * 7, maxHp: 100, speed: 100 + (i % 3 === 0 ? 50 : -50) },
    {
      speed: 100,
      lastUsedMoveId: lastMoves[i % lastMoves.length],
      hasAnyStatus: i % 2 === 0,
      isConfused: i % 3 === 0,
      isLeechSeeded: i % 4 === 0,
    },
    i % 5 === 0 ? AI_WEATHER_HAIL : undefined);
}

// === emit Rust source ========================================================

function opt(hasValue, value) {
  return hasValue !== null && hasValue !== undefined ? `Some(${value})` : "None";
}
function optBool(v) {
  return v === null || v === undefined ? "None" : v ? "Some(true)" : "Some(false)";
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cv-m5d4-vectors.mjs — regenerate: node core-rs/tools/gen-cv-m5d4-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckViability.ts's runCheckViability");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One draw's generic (site, ordinal, rng, flag) snapshot. `site` is a");
lines.push("/// 0-based per-batch draw-kind index (see this generator's own `SITE_BY_KIND`");
lines.push("/// map); `flag` is the one extra boolean/tri-state field every M5d-4 draw");
lines.push("/// kind carries (`succeeded`/`jumped` as 0/1, or `strikesFirst` for the shared");
lines.push("/// tie draw, already 0/1/2).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CvM5d4Draw {");
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

lines.push("/// One M5d-4 `run_check_viability` case (batching doc §2 \"M5d-4\"). Only");
lines.push("/// the battler fields this batch's handlers actually read are carried;");
lines.push("/// every other `FactoryAiCheckViabilityBattler` field stays at the test");
lines.push("/// file's own neutral default.");
lines.push("#[derive(Debug, Clone, Copy)]");
lines.push("pub struct CvM5d4Case {");
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
lines.push("    pub attacker_is_first_turn: u8,");
lines.push("    pub attacker_moves: [u16; 4],");
lines.push("    pub attacker_has_substitute: Option<bool>,");
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
lines.push("    pub target_has_side_reflect: Option<bool>,");
lines.push("    pub target_is_poisoned: Option<bool>,");
lines.push("    pub target_is_burned: Option<bool>,");
lines.push("    pub target_is_paralyzed: Option<bool>,");
lines.push("    pub target_is_toxic_poisoned: Option<bool>,");
lines.push("    pub target_is_asleep: Option<bool>,");
lines.push("    pub target_is_infatuated: Option<bool>,");
lines.push("    pub target_is_confused: Option<bool>,");
lines.push("    pub target_is_taunted: Option<bool>,");
lines.push("    pub target_last_used_move_id: Option<u16>,");
lines.push("    pub target_known_moves: [u16; 4],");
lines.push("    pub target_any_move_disabled: Option<bool>,");
lines.push("    pub target_has_any_status: Option<bool>,");
lines.push("    pub target_party_status_equals_any: Option<bool>,");
lines.push("    pub target_is_leech_seeded: Option<bool>,");
lines.push("    pub fallback: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CvM5d4Draw; 8],");
lines.push("}");
lines.push(`pub static CV_M5D4_CASES: [CvM5d4Case; ${cases.length}] = [`);
for (const c of cases) {
  const drawsStr = c.draws
    .map(
      (d) =>
        `CvM5d4Draw { site: ${d.site}, ordinal: ${d.ordinal}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, flag: ${d.flag} }`,
    )
    .join(", ");
  lines.push(`    // ${c.label}`);
  lines.push(
    `    CvM5d4Case { label: ${JSON.stringify(c.label)}, move_id: ${c.moveId}, rng_value: ${c.rngValue}, ` +
      `attacker_speed: ${c.attackerSpeed}, attacker_speed_stage: ${c.attackerSpeedStage}, ` +
      `attacker_types: [${c.attackerTypes[0]}, ${c.attackerTypes[1]}], ` +
      `attacker_hp: ${c.attackerHp}, attacker_max_hp: ${c.attackerMaxHp}, ` +
      `attacker_atk_stage: ${c.attackerAtkStage}, attacker_def_stage: ${c.attackerDefStage}, ` +
      `attacker_sp_def_stage: ${c.attackerSpDefStage}, ` +
      `attacker_sp_atk_stage: ${opt(c.attackerSpAtkStage, c.attackerSpAtkStage)}, ` +
      `attacker_evasion_stage: ${c.attackerEvasionStage}, attacker_is_first_turn: ${c.attackerIsFirstTurn}, ` +
      `attacker_moves: [${c.attackerMoves.join(", ")}], ` +
      `attacker_has_substitute: ${optBool(c.attackerHasSubstitute)}, ` +
      `target_speed: ${c.targetSpeed}, target_speed_stage: ${c.targetSpeedStage}, ` +
      `target_types: [${c.targetTypes[0]}, ${c.targetTypes[1]}], ` +
      `target_hp: ${c.targetHp}, target_max_hp: ${c.targetMaxHp}, ` +
      `target_atk_stage: ${c.targetAtkStage}, target_def_stage: ${c.targetDefStage}, ` +
      `target_sp_def_stage: ${c.targetSpDefStage}, ` +
      `target_sp_atk_stage: ${opt(c.targetSpAtkStage, c.targetSpAtkStage)}, ` +
      `target_evasion_stage: ${c.targetEvasionStage}, ` +
      `target_has_side_reflect: ${optBool(c.targetHasSideReflect)}, ` +
      `target_is_poisoned: ${optBool(c.targetIsPoisoned)}, target_is_burned: ${optBool(c.targetIsBurned)}, ` +
      `target_is_paralyzed: ${optBool(c.targetIsParalyzed)}, ` +
      `target_is_toxic_poisoned: ${optBool(c.targetIsToxicPoisoned)}, ` +
      `target_is_asleep: ${optBool(c.targetIsAsleep)}, target_is_infatuated: ${optBool(c.targetIsInfatuated)}, ` +
      `target_is_confused: ${optBool(c.targetIsConfused)}, target_is_taunted: ${optBool(c.targetIsTaunted)}, ` +
      `target_last_used_move_id: ${opt(c.targetLastUsedMoveId, c.targetLastUsedMoveId)}, ` +
      `target_known_moves: [${c.targetKnownMoves.join(", ")}], ` +
      `target_any_move_disabled: ${optBool(c.targetAnyMoveDisabled)}, ` +
      `target_has_any_status: ${optBool(c.targetHasAnyStatus)}, ` +
      `target_party_status_equals_any: ${optBool(c.targetPartyStatusEqualsAny)}, ` +
      `target_is_leech_seeded: ${optBool(c.targetIsLeechSeeded)}, ` +
      `fallback: ${opt(c.fallback, c.fallback)}, ` +
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
  throw new Error("gen-cv-m5d4-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cv-m5d4-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cv-m5d4-vectors: ${cases.length} cases`);
