#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_viability_m5d3_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckViability.ts's `runCheckViability` (read-only
// import, node --experimental-strip-types -- the gen-cv-m5d1/m5d2-vectors.mjs
// precedent, which this script mirrors byte-for-byte in structure). No value
// in the emitted file is hand-computed. Deterministic: a fixed directed case
// list plus small seeded sweeps per handler-family, not Math.random/Date.now,
// so reruns are byte-identical.
//
// Scope: M5d-3 only (docs/rust-m5d-checkviability-batching.md §2) -- the 30
// effects covering the weather trio + heal family + damage/status singles +
// Counter. Every case here uses a move whose effect IS in this 30-effect
// batch: since src/engine/factoryAiCheckViability.ts is verified live below
// to be 122/122 dispatch-complete, its `runCheckViability` output for such a
// move already reflects the real handler logic end to end -- directly
// comparable to the Rust port's own M5d-3 handlers.
//
// Usage: node core-rs/tools/gen-cv-m5d3-vectors.mjs   (from any cwd)

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
  "factory_ai_check_viability_m5d3_vectors_gen.rs",
);

const cv = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckViability.ts"));
const { runCheckViability, AI_CHECK_VIABILITY_TABLE_EFFECTS } = cv;
const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { MOVES_BY_ID } = cbm;

// Verify live (not from doc prose) that TS really is 122/122 table-complete
// -- the premise this generator relies on to treat TS's own scored output as
// the handler-inclusive expected value for every M5d-3 move (same premise
// check gen-cv-m5d1/m5d2-vectors.mjs make for their own batches).
if (AI_CHECK_VIABILITY_TABLE_EFFECTS.size !== 122) {
  throw new Error(
    `gen-cv-m5d3-vectors: expected AI_CHECK_VIABILITY_TABLE_EFFECTS to have 122 entries, found ${AI_CHECK_VIABILITY_TABLE_EFFECTS.size} ` +
      "(this script's whole premise for treating TS's scored output as ground truth)",
  );
}

// The 30 effects this batch covers (batching doc §2 "M5d-3"), TS dispatch
// source order (factoryAiCheckViability.ts:5944-6381) -- mirrors Rust's
// CV_HANDLED_EFFECTS_M5D3 exactly (factory_ai_check_viability.rs).
const M5D3_EFFECT_NAMES = new Set([
  "EFFECT_SUNNY_DAY", "EFFECT_HAIL", "EFFECT_RAIN_DANCE",
  "EFFECT_REST",
  "EFFECT_MORNING_SUN", "EFFECT_SYNTHESIS", "EFFECT_MOONLIGHT",
  "EFFECT_RESTORE_HP", "EFFECT_SOFTBOILED", "EFFECT_SWALLOW",
  "EFFECT_ABSORB", "EFFECT_DREAM_EATER", "EFFECT_SLEEP_TALK", "EFFECT_ENDURE",
  "EFFECT_OHKO", "EFFECT_ROAR", "EFFECT_FAKE_OUT", "EFFECT_SUPER_FANG",
  "EFFECT_RECHARGE", "EFFECT_FLAIL", "EFFECT_DESTINY_BOND",
  "EFFECT_EXPLOSION", "EFFECT_MEMENTO",
  "EFFECT_SEMI_INVULNERABLE", "EFFECT_TRAP", "EFFECT_MEAN_LOOK",
  "EFFECT_PARALYZE", "EFFECT_CONFUSE", "EFFECT_SWAGGER", "EFFECT_COUNTER",
]);
if (M5D3_EFFECT_NAMES.size !== 30) {
  throw new Error(`gen-cv-m5d3-vectors: expected exactly 30 M5d-3 effect names, got ${M5D3_EFFECT_NAMES.size}`);
}
for (const name of M5D3_EFFECT_NAMES) {
  if (!AI_CHECK_VIABILITY_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cv-m5d3-vectors: ${name} is not a real AI_CheckViability table effect`);
  }
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use (identical to
// gen-cv-m5d1/m5d2-vectors.mjs's own TYPE_IDS). ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};
// `AiWeatherValue` is a plain 0-3 NUMBER on the TS side
// (`factoryAiCheckBadMove.ts:144-147`), unlike ability names -- these are
// the real values, not a display-only id map (contrast `ABILITY_IDS` below).
const AI_WEATHER_SUN = 0;
const AI_WEATHER_RAIN = 1;
const AI_WEATHER_SANDSTORM = 2;
const AI_WEATHER_HAIL = 3;
// Only the 2 abilities `AI_CV_RainDance` reads by name
// (`reference/pokeemerald/include/constants/abilities.h:37,48`).
const ABILITY_IDS = { ABILITY_SWIFT_SWIM: 33, ABILITY_RAIN_DISH: 44 };

// --- draw site indices, one per M5d-3 draw kind. ---
const SITE_BY_KIND = {
  "target-faster-tie": 0,
  "user-faster-tie": 1,
  "rest-roll-1": 2,
  "rest-roll-2": 3,
  "rest-snatch-roll": 4,
  "rest-tail-roll": 5,
  "heal-roll-1": 6,
  "heal-roll-2": 7,
  "heal-roll-3": 8,
  "absorb-roll": 9,
  "endure-roll": 10,
  "roar-roll": 11,
  "flail-roll": 12,
  "destiny-bond-roll-1": 13,
  "destiny-bond-roll-2": 14,
  "destiny-bond-roll-3": 15,
  "self-ko-roll-1": 16,
  "self-ko-roll-2": 17,
  "self-ko-roll-3": 18,
  "self-ko-roll-4": 19,
  "self-ko-roll-5": 20,
  "semi-invulnerable-roll": 21,
  "trap-roll": 22,
  "paralyze-roll": 23,
  "confuse-roll": 24,
  "swagger-roll": 25,
  "counter-low-hp-roll": 26,
  "counter-mid-hp-roll": 27,
  "counter-taunt-roll": 28,
  "counter-physical-roll": 29,
  "counter-target-type-roll": 30,
  "counter-bonus-roll": 31,
};

function drawFlag(d) {
  if (d.kind === "target-faster-tie" || d.kind === "user-faster-tie") return d.strikesFirst;
  if ("succeeded" in d) return d.succeeded ? 1 : 0;
  if ("jumped" in d) return d.jumped ? 1 : 0;
  if ("jumpedToEnd" in d) return d.jumpedToEnd ? 1 : 0;
  throw new Error(`gen-cv-m5d3-vectors: unrecognized draw shape for kind ${d.kind}`);
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
  if (!move) throw new Error(`gen-cv-m5d3-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5D3_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cv-m5d3-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5d-3 batch`,
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
    throw new Error(`gen-cv-m5d3-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 8) {
    throw new Error(`gen-cv-m5d3-vectors: case ${label} produced ${result.draws.length} draws, expected <=8`);
  }

  const draws = result.draws.map((d) => {
    const site = SITE_BY_KIND[d.kind];
    if (site === undefined) throw new Error(`gen-cv-m5d3-vectors: case ${label} unrecognized draw kind ${d.kind}`);
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
    attackerHp: attacker.hp,
    attackerMaxHp: attacker.maxHp,
    attackerTypes: [TYPE_IDS[attacker.types[0]], TYPE_IDS[attacker.types[1]]],
    attackerAbility: attacker.ability !== undefined ? ABILITY_IDS[attacker.ability] : null,
    attackerCurrentWeather: attacker.currentWeather ?? null,
    attackerMoves: attacker.moves ?? [0, 0, 0, 0],
    attackerBattleTurnCount: attacker.battleTurnCount ?? null,
    attackerIsAsleep: attacker.isAsleep ?? null,
    targetSpeed: target.speed,
    targetSpeedStage: target.speedStage,
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    targetTypes: [TYPE_IDS[target.types[0]], TYPE_IDS[target.types[1]]],
    targetAtkStage: target.atkStage,
    targetEvasionStage: target.evasionStage,
    targetSpAtkStage: target.spAtkStage ?? null,
    targetLastUsedMoveId: target.lastUsedMoveId ?? null,
    targetKnownMoves: target.knownMoves ?? [0, 0, 0, 0],
    targetIsToxicPoisoned: target.isToxicPoisoned ?? null,
    targetIsLeechSeeded: target.isLeechSeeded ?? null,
    targetIsCursed: target.isCursed ?? null,
    targetHasPerishSong: target.hasPerishSong ?? null,
    targetIsInfatuated: target.isInfatuated ?? null,
    targetIsAsleep: target.isAsleep ?? null,
    targetIsConfused: target.isConfused ?? null,
    targetIsTaunted: target.isTaunted ?? null,
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

// === weather trio: EFFECT_SUNNY_DAY/EFFECT_HAIL/EFFECT_RAIN_DANCE
// (test:4266-4611) -- stale-funcResult collision directed cases, the M5d-0
// maps' first real end-to-end exercise. ========================================

const MOVE_SUNNY_DAY = 241;
const MOVE_HAIL = 258;
const MOVE_RAIN_DANCE = 240;

pushCase("sunny_day_low_hp_short_circuit_stale_survives", MOVE_SUNNY_DAY, RNG_SEED,
  { hp: 39, maxHp: 100 }, {}, AI_WEATHER_RAIN);
pushCase("sunny_day_writes_current_weather_other_three", MOVE_SUNNY_DAY, RNG_SEED,
  { hp: 100, maxHp: 100, currentWeather: AI_WEATHER_HAIL }, {}, undefined);
pushCase("sunny_day_own_type_excluded", MOVE_SUNNY_DAY, RNG_SEED,
  { hp: 100, maxHp: 100, currentWeather: AI_WEATHER_SUN }, {}, undefined);
pushCase("sunny_day_no_weather_falls_back_to_stale_ability_collision", MOVE_SUNNY_DAY, RNG_SEED,
  { hp: 100, maxHp: 100 }, {}, AI_WEATHER_SANDSTORM);
pushCase("hail_own_type_excluded", MOVE_HAIL, RNG_SEED,
  { hp: 100, maxHp: 100, currentWeather: AI_WEATHER_HAIL }, {}, undefined);
pushCase("hail_other_three_scores", MOVE_HAIL, RNG_SEED,
  { hp: 100, maxHp: 100, currentWeather: AI_WEATHER_SUN }, {}, undefined);
pushCase("hail_low_hp_stale_carry_survives", MOVE_HAIL, RNG_SEED,
  { hp: 10, maxHp: 100 }, {}, AI_WEATHER_HAIL);
pushCase("rain_dance_user_faster_no_weather_no_stale", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("rain_dance_not_user_faster_swift_swim_bypass", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 50, hp: 10, maxHp: 100, ability: "ABILITY_SWIFT_SWIM" }, { speed: 150 }, undefined);
pushCase("rain_dance_not_user_faster_low_hp_stale_carry", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 50, hp: 30, maxHp: 100 }, { speed: 150 }, AI_WEATHER_SUN);
pushCase("rain_dance_not_user_faster_rain_already_rain_dish_tail", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 50, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_RAIN, ability: "ABILITY_RAIN_DISH" }, { speed: 150 }, undefined);
pushCase("rain_dance_not_user_faster_rain_already_no_rain_dish", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 50, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_RAIN }, { speed: 150 }, undefined);
pushCase("rain_dance_span_scores_other_weather_present", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_SANDSTORM }, { speed: 50 }, undefined);
pushCase("rain_dance_tie_draws_user_faster_tie", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 100, hp: 100, maxHp: 100 }, { speed: 100 }, undefined);
pushCase("rain_dance_span_falls_through_no_rain_dish", MOVE_RAIN_DANCE, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100 }, { speed: 50 }, undefined);
for (let i = 0; i < 6; i += 1) {
  const weathers = [undefined, AI_WEATHER_SUN, AI_WEATHER_RAIN, AI_WEATHER_SANDSTORM, AI_WEATHER_HAIL];
  pushCase(`rain_dance_sweep_${i}`, MOVE_RAIN_DANCE, 30_000 + i * 6113,
    { speed: 40 + i * 25, hp: 15 + i * 15, maxHp: 100, currentWeather: weathers[i % weathers.length] },
    { speed: 120 - i * 10 },
    i % 2 === 0 ? AI_WEATHER_HAIL : undefined);
}

// === EFFECT_REST (test:4777-4908) ============================================

const MOVE_REST = 156;
const MOVE_SNATCH = 289;

pushCase("rest_not_target_faster_hp100", MOVE_REST, RNG_SEED, { speed: 150, hp: 100, maxHp: 100 }, { speed: 50 });
pushCase("rest_not_target_faster_mid_hp_deterministic", MOVE_REST, RNG_SEED, { speed: 150, hp: 45, maxHp: 100 }, { speed: 50 });
pushCase("rest_not_target_faster_low_hp_tail_jump", MOVE_REST, 4, { speed: 150, hp: 20, maxHp: 100 }, { speed: 50 });
pushCase("rest_not_target_faster_low_hp_tail_no_jump", MOVE_REST, 1, { speed: 150, hp: 20, maxHp: 100 }, { speed: 50 });
pushCase("rest_not_target_faster_band_roll1_jump", MOVE_REST, 4, { speed: 150, hp: 45, maxHp: 100 }, { speed: 50 });
pushCase("rest_not_target_faster_band_roll1_no_jump", MOVE_REST, 1, { speed: 150, hp: 45, maxHp: 100 }, { speed: 50 });
pushCase("rest_target_faster_high_hp_deterministic", MOVE_REST, RNG_SEED, { speed: 50, hp: 80, maxHp: 100 }, { speed: 150 });
pushCase("rest_target_faster_low_hp_tail", MOVE_REST, 4, { speed: 50, hp: 40, maxHp: 100 }, { speed: 150 });
pushCase("rest_target_faster_band_roll2_jump", MOVE_REST, 4, { speed: 50, hp: 65, maxHp: 100 }, { speed: 150 });
pushCase("rest_target_faster_band_roll2_no_jump", MOVE_REST, 1, { speed: 50, hp: 65, maxHp: 100 }, { speed: 150 });
pushCase("rest_snatch_gate_jump", MOVE_REST, 4, { speed: 150, hp: 20, maxHp: 100 }, { speed: 50, knownMoves: [MOVE_SNATCH, 0, 0, 0] });
pushCase("rest_snatch_gate_no_jump_falls_through", MOVE_REST, 1, { speed: 150, hp: 20, maxHp: 100 }, { speed: 50, knownMoves: [MOVE_SNATCH, 0, 0, 0] });
pushCase("rest_tie_target_faster_tie", MOVE_REST, RNG_SEED, { speed: 100, hp: 45, maxHp: 100 }, { speed: 100 });
for (let i = 0; i < 6; i += 1) {
  pushCase(`rest_sweep_${i}`, MOVE_REST, 31_000 + i * 5987,
    { speed: 40 + i * 15, hp: 5 + i * 16, maxHp: 100 },
    { speed: 130 - i * 12, knownMoves: i % 2 === 0 ? [MOVE_SNATCH, 0, 0, 0] : [0, 0, 0, 0] });
}

// === EFFECT_MORNING_SUN+SYNTHESIS+MOONLIGHT / EFFECT_RESTORE_HP+SOFTBOILED+
// SWALLOW: run_cv_heal_weather / run_cv_heal shared run_cv_heal_body
// (test:5191-5294, 5738-5772) =================================================

const MOVE_MORNING_SUN = 234;
const MOVE_SYNTHESIS = 235;
const MOVE_MOONLIGHT = 236;
const MOVE_RESTORE_HP = 105; // Recover
const MOVE_SOFTBOILED = 135;
const MOVE_SWALLOW = 256;

pushCase("heal_weather_bad_weather_penalty", MOVE_MORNING_SUN, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_RAIN }, { speed: 50 }, undefined);
pushCase("heal_weather_sun_no_penalty", MOVE_MORNING_SUN, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_SUN }, { speed: 50 }, undefined);
pushCase("heal_weather_no_weather_stale_carry", MOVE_MORNING_SUN, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100 }, { speed: 50 }, AI_WEATHER_HAIL);
pushCase("synthesis_shares_heal_weather_handler", MOVE_SYNTHESIS, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_SANDSTORM }, { speed: 50 }, undefined);
pushCase("moonlight_shares_heal_weather_handler", MOVE_MOONLIGHT, RNG_SEED,
  { speed: 150, hp: 100, maxHp: 100, currentWeather: AI_WEATHER_HAIL }, { speed: 50 }, undefined);
pushCase("heal_hp100_scores_minus3", MOVE_RESTORE_HP, RNG_SEED, { speed: 150, hp: 100, maxHp: 100 }, { speed: 50 }, AI_WEATHER_SUN);
pushCase("heal_not_target_faster_minus8", MOVE_RESTORE_HP, RNG_SEED, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("heal_target_faster_low_hp_tail", MOVE_RESTORE_HP, 4, { speed: 50, hp: 50, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("heal_target_faster_roll1_jump", MOVE_RESTORE_HP, 4, { speed: 50, hp: 80, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("heal_target_faster_roll1_no_jump", MOVE_RESTORE_HP, 1, { speed: 50, hp: 80, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("heal_snatch_gate_jump", MOVE_RESTORE_HP, 4, { speed: 50, hp: 50, maxHp: 100 }, { speed: 150, knownMoves: [MOVE_SNATCH, 0, 0, 0] }, undefined);
pushCase("softboiled_shares_heal_handler", MOVE_SOFTBOILED, RNG_SEED, { speed: 50, hp: 50, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("swallow_shares_heal_handler_dispatch_only", MOVE_SWALLOW, RNG_SEED, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 }, undefined);
for (let i = 0; i < 6; i += 1) {
  pushCase(`heal_sweep_${i}`, MOVE_RESTORE_HP, 32_000 + i * 5879,
    { speed: 40 + i * 15, hp: 5 + i * 16, maxHp: 100 },
    { speed: 130 - i * 12, knownMoves: i % 2 === 0 ? [MOVE_SNATCH, 0, 0, 0] : [0, 0, 0, 0] }, undefined);
}

// === EFFECT_ABSORB (test:4909-4974) / EFFECT_DREAM_EATER (test:4975-5024) ===

const MOVE_ABSORB = 71;
const MOVE_DREAM_EATER = 138;

pushCase("absorb_neutral_zero", MOVE_ABSORB, RNG_SEED, {}, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("absorb_weak_effectiveness_jump", MOVE_ABSORB, 4, {}, { types: ["TYPE_FIRE", "TYPE_FIRE"] });
pushCase("absorb_weak_effectiveness_no_jump", MOVE_ABSORB, 1, {}, { types: ["TYPE_FIRE", "TYPE_FIRE"] });
pushCase("dream_eater_weak_effectiveness", MOVE_DREAM_EATER, RNG_SEED, {}, { types: ["TYPE_DARK", "TYPE_DARK"] });
pushCase("dream_eater_neutral", MOVE_DREAM_EATER, RNG_SEED, {}, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] });

// === EFFECT_SLEEP_TALK (test:5025-5062) / EFFECT_ENDURE (test:5117-5173) ====

const MOVE_SLEEP_TALK = 214;
const MOVE_ENDURE = 203;

pushCase("sleep_talk_asleep", MOVE_SLEEP_TALK, RNG_SEED, { isAsleep: true }, {}, undefined);
pushCase("sleep_talk_awake", MOVE_SLEEP_TALK, RNG_SEED, { isAsleep: false }, {}, undefined);
pushCase("endure_low_hp_deterministic", MOVE_ENDURE, RNG_SEED, { hp: 3, maxHp: 100 }, {}, undefined);
pushCase("endure_high_hp_deterministic", MOVE_ENDURE, RNG_SEED, { hp: 35, maxHp: 100 }, {}, undefined);
pushCase("endure_mid_band_jump", MOVE_ENDURE, 4, { hp: 20, maxHp: 100 }, {}, undefined);
pushCase("endure_mid_band_no_jump", MOVE_ENDURE, 1, { hp: 20, maxHp: 100 }, {}, undefined);

// === EFFECT_OHKO (test:5174-5190) -- inline arm, no handler fn =============

const MOVE_HORN_DRILL = 32; // EFFECT_OHKO
pushCase("ohko_is_deterministic_zero", MOVE_HORN_DRILL, RNG_SEED, {}, {}, AI_WEATHER_RAIN);

// === EFFECT_ROAR (test:279-337) / EFFECT_FAKE_OUT (test:5344-5361) =========

const MOVE_ROAR = 18;
const MOVE_FAKE_OUT = 252;

pushCase("roar_no_raised_stat", MOVE_ROAR, RNG_SEED, {}, {}, undefined);
pushCase("roar_raised_stat_jump", MOVE_ROAR, 4, {}, { atkStage: 9 }, undefined);
pushCase("roar_raised_stat_no_jump", MOVE_ROAR, 1, {}, { atkStage: 9 }, undefined);
pushCase("fake_out_bare_plus2", MOVE_FAKE_OUT, RNG_SEED, {}, {}, undefined);

// === EFFECT_SUPER_FANG (test:5434-5461) / EFFECT_RECHARGE (test:5462-5513) ==

const MOVE_SUPER_FANG = 162;
const MOVE_RECHARGE_HYPER_BEAM = 63;

pushCase("super_fang_high_hp", MOVE_SUPER_FANG, RNG_SEED, {}, { hp: 51, maxHp: 100 }, undefined);
pushCase("super_fang_low_hp", MOVE_SUPER_FANG, RNG_SEED, {}, { hp: 50, maxHp: 100 }, undefined);
pushCase("recharge_weak_effectiveness", MOVE_RECHARGE_HYPER_BEAM, RNG_SEED,
  { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, { types: ["TYPE_ROCK", "TYPE_ROCK"] }, undefined);
pushCase("recharge_not_target_faster_high_hp", MOVE_RECHARGE_HYPER_BEAM, RNG_SEED,
  { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("recharge_not_target_faster_low_hp", MOVE_RECHARGE_HYPER_BEAM, RNG_SEED,
  { speed: 150, hp: 40, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("recharge_target_faster_high_hp", MOVE_RECHARGE_HYPER_BEAM, RNG_SEED,
  { speed: 50, hp: 60, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("recharge_target_faster_low_hp", MOVE_RECHARGE_HYPER_BEAM, RNG_SEED,
  { speed: 50, hp: 59, maxHp: 100 }, { speed: 150 }, undefined);

// === EFFECT_FLAIL (test:5514-5579) / EFFECT_DESTINY_BOND (test:5580-5658) ===

const MOVE_FLAIL = 175;
const MOVE_DESTINY_BOND = 194;

pushCase("flail_not_target_faster_high", MOVE_FLAIL, RNG_SEED, { speed: 150, hp: 34, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("flail_not_target_faster_mid", MOVE_FLAIL, RNG_SEED, { speed: 150, hp: 21, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("flail_not_target_faster_low_scoreup_jump", MOVE_FLAIL, 4, { speed: 150, hp: 7, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("flail_not_target_faster_low_scoreup_no_jump", MOVE_FLAIL, 1, { speed: 150, hp: 7, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("flail_target_faster_high", MOVE_FLAIL, RNG_SEED, { speed: 50, hp: 61, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("flail_target_faster_mid", MOVE_FLAIL, RNG_SEED, { speed: 50, hp: 41, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("flail_target_faster_site_jump", MOVE_FLAIL, 4, { speed: 50, hp: 40, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("destiny_bond_target_faster_deterministic", MOVE_DESTINY_BOND, RNG_SEED, { speed: 50, hp: 80, maxHp: 100 }, { speed: 150 }, undefined);
pushCase("destiny_bond_high_hp_deterministic", MOVE_DESTINY_BOND, RNG_SEED, { speed: 150, hp: 80, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("destiny_bond_band70_jump", MOVE_DESTINY_BOND, 4, { speed: 150, hp: 60, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("destiny_bond_band70_no_jump_stops_at_band50", MOVE_DESTINY_BOND, 1, { speed: 150, hp: 60, maxHp: 100 }, { speed: 50 }, undefined);
for (let i = 0; i < 8; i += 1) {
  pushCase(`destiny_bond_sweep_${i}`, MOVE_DESTINY_BOND, 33_000 + i * 5717,
    { speed: 150, hp: 5 + i * 9, maxHp: 100 }, { speed: 50 }, undefined);
}

// === EFFECT_EXPLOSION+EFFECT_MEMENTO: run_cv_self_ko (test:5659-5737,
// 6365-6386) ==================================================================

const MOVE_EXPLOSION = 120;
const MOVE_MEMENTO = 262;

pushCase("self_ko_evasion_below_7_high_hp_not_target_faster", MOVE_EXPLOSION, 4,
  { speed: 150, hp: 90, maxHp: 100 }, { speed: 50, evasionStage: 6 }, undefined);
pushCase("self_ko_evasion_7_9_scores_minus1_no_prologue", MOVE_EXPLOSION, RNG_SEED,
  { speed: 150, hp: 60, maxHp: 100 }, { speed: 50, evasionStage: 8 }, undefined);
for (let i = 0; i < 10; i += 1) {
  pushCase(`self_ko_sweep_${i}`, MOVE_EXPLOSION, 34_000 + i * 5623,
    { speed: 100 + (i % 3 === 0 ? 50 : -50), hp: 5 + i * 9, maxHp: 100 },
    { speed: 100, evasionStage: i % 12 }, undefined);
}
pushCase("memento_shares_self_ko_handler", MOVE_MEMENTO, RNG_SEED,
  { speed: 150, hp: 60, maxHp: 100 }, { speed: 50, evasionStage: 6 }, undefined);

// === EFFECT_SEMI_INVULNERABLE (test:5362-5433) -- densest coverage per the
// step brief (129-line, 2nd-largest handler). ================================

const MOVE_FLY = 19;
const MOVE_PROTECT_MOVE = 182;
const MOVE_LOCK_ON = 199;
const MOVE_TACKLE = 33; // EFFECT_HIT

pushCase("semi_invulnerable_target_has_protect", MOVE_FLY, RNG_SEED,
  {}, { knownMoves: [MOVE_PROTECT_MOVE, 0, 0, 0] }, AI_WEATHER_SUN);
pushCase("semi_invulnerable_status_jump_toxic", MOVE_FLY, 4,
  {}, { isToxicPoisoned: true }, AI_WEATHER_RAIN);
pushCase("semi_invulnerable_status_jump_cursed", MOVE_FLY, 4,
  {}, { isCursed: true }, undefined);
pushCase("semi_invulnerable_status_jump_leech_seeded", MOVE_FLY, 1,
  {}, { isLeechSeeded: true }, undefined);
pushCase("semi_invulnerable_hail_ground_resistant", MOVE_FLY, RNG_SEED,
  { types: ["TYPE_GROUND", "TYPE_NORMAL"], currentWeather: AI_WEATHER_HAIL }, {}, undefined);
pushCase("semi_invulnerable_hail_rock_resistant_type2", MOVE_FLY, RNG_SEED,
  { types: ["TYPE_NORMAL", "TYPE_ROCK"], currentWeather: AI_WEATHER_HAIL }, {}, undefined);
pushCase("semi_invulnerable_hail_nonresistant_falls_to_semi5", MOVE_FLY, RNG_SEED,
  { speed: 150, types: ["TYPE_NORMAL", "TYPE_NORMAL"], currentWeather: AI_WEATHER_HAIL }, { speed: 50 }, undefined);
pushCase("semi_invulnerable_sandstorm_ice_type1", MOVE_FLY, RNG_SEED,
  { types: ["TYPE_ICE", "TYPE_NORMAL"], currentWeather: AI_WEATHER_SANDSTORM }, {}, undefined);
pushCase("semi_invulnerable_sandstorm_ice_type2", MOVE_FLY, RNG_SEED,
  { types: ["TYPE_NORMAL", "TYPE_ICE"], currentWeather: AI_WEATHER_SANDSTORM }, {}, undefined);
pushCase("semi_invulnerable_sandstorm_nonice_falls_to_semi5", MOVE_FLY, RNG_SEED,
  { speed: 150, types: ["TYPE_NORMAL", "TYPE_NORMAL"], currentWeather: AI_WEATHER_SANDSTORM }, { speed: 50 }, undefined);
pushCase("semi_invulnerable_sun_falls_to_semi5", MOVE_FLY, RNG_SEED,
  { speed: 150, currentWeather: AI_WEATHER_SUN }, { speed: 50 }, undefined);
pushCase("semi_invulnerable_no_weather_falls_to_semi5_stale_carry", MOVE_FLY, RNG_SEED,
  { speed: 150 }, { speed: 50 }, AI_WEATHER_SANDSTORM);
pushCase("semi_invulnerable5_target_faster_ends_at_write", MOVE_FLY, RNG_SEED,
  { speed: 50 }, { speed: 150 }, AI_WEATHER_HAIL);
pushCase("semi_invulnerable5_lock_on_ends_without_roll", MOVE_FLY, RNG_SEED,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_LOCK_ON }, undefined);
pushCase("semi_invulnerable5_non_lock_on_reaches_try_encourage_jump", MOVE_FLY, 4,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TACKLE }, undefined);
pushCase("semi_invulnerable5_non_lock_on_reaches_try_encourage_no_jump", MOVE_FLY, 1,
  { speed: 150 }, { speed: 50, lastUsedMoveId: MOVE_TACKLE }, undefined);
pushCase("semi_invulnerable5_tie_draw", MOVE_FLY, RNG_SEED,
  { speed: 100 }, { speed: 100, lastUsedMoveId: MOVE_TACKLE }, undefined);
for (let i = 0; i < 10; i += 1) {
  const weathers = [undefined, AI_WEATHER_SUN, AI_WEATHER_RAIN, AI_WEATHER_SANDSTORM, AI_WEATHER_HAIL];
  const types = [
    ["TYPE_NORMAL", "TYPE_NORMAL"], ["TYPE_GROUND", "TYPE_WATER"], ["TYPE_ICE", "TYPE_FLYING"],
    ["TYPE_ROCK", "TYPE_STEEL"], ["TYPE_FIRE", "TYPE_GRASS"],
  ];
  pushCase(`semi_invulnerable_sweep_${i}`, MOVE_FLY, 35_000 + i * 5417,
    {
      speed: 60 + i * 10,
      types: types[i % types.length],
      currentWeather: weathers[i % weathers.length],
    },
    {
      speed: 100,
      lastUsedMoveId: i % 2 === 0 ? MOVE_TACKLE : MOVE_LOCK_ON,
      isCursed: i % 3 === 0,
    },
    i % 4 === 0 ? AI_WEATHER_RAIN : undefined);
}

// === EFFECT_TRAP+EFFECT_MEAN_LOOK (test:5295-5343) ==========================

const MOVE_TRAP = 20; // Wrap
const MOVE_MEAN_LOOK = 169;

pushCase("trap_no_trappable_status", MOVE_TRAP, RNG_SEED, {}, {}, undefined);
pushCase("trap_trappable_status_jump", MOVE_TRAP, 4, {}, { isCursed: true }, undefined);
pushCase("trap_trappable_status_no_jump", MOVE_TRAP, 1, {}, { isCursed: true }, undefined);
pushCase("mean_look_shares_trap_handler", MOVE_MEAN_LOOK, RNG_SEED, {}, { hasPerishSong: true }, undefined);

// === EFFECT_PARALYZE (test:338-400) / EFFECT_CONFUSE (test:401-451) ========

const MOVE_PARALYZE = 78; // Glare
const MOVE_CONFUSE = 48; // Supersonic

pushCase("paralyze_target_faster_roll_jump", MOVE_PARALYZE, 4, { speed: 50 }, { speed: 150 }, undefined);
pushCase("paralyze_target_faster_roll_no_jump", MOVE_PARALYZE, 1, { speed: 50 }, { speed: 150 }, undefined);
pushCase("paralyze_not_target_faster_high_hp", MOVE_PARALYZE, RNG_SEED, { speed: 150, hp: 71, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("paralyze_not_target_faster_low_hp", MOVE_PARALYZE, RNG_SEED, { speed: 150, hp: 70, maxHp: 100 }, { speed: 50 }, undefined);
pushCase("confuse_high_hp_deterministic", MOVE_CONFUSE, RNG_SEED, {}, { hp: 71, maxHp: 100 }, undefined);
pushCase("confuse_roll_jump", MOVE_CONFUSE, 4, {}, { hp: 70, maxHp: 100 }, undefined);
pushCase("confuse_roll_no_jump_high_band", MOVE_CONFUSE, 1, {}, { hp: 70, maxHp: 100 }, undefined);
pushCase("confuse_roll_no_jump_mid_band", MOVE_CONFUSE, 1, {}, { hp: 50, maxHp: 100 }, undefined);
pushCase("confuse_roll_no_jump_low_band", MOVE_CONFUSE, 1, {}, { hp: 30, maxHp: 100 }, undefined);

// === EFFECT_SWAGGER (test:452-561) ===========================================

const MOVE_SWAGGER = 207;
const MOVE_PSYCH_UP = 244;

pushCase("swagger_psych_up_target_atk_high", MOVE_SWAGGER, RNG_SEED,
  { moves: [MOVE_PSYCH_UP, 0, 0, 0], battleTurnCount: 5 }, { atkStage: 9 }, AI_WEATHER_SUN);
pushCase("swagger_psych_up_target_atk_low_turn2", MOVE_SWAGGER, RNG_SEED,
  { moves: [MOVE_PSYCH_UP, 0, 0, 0], battleTurnCount: 2 }, { atkStage: 3 }, undefined);
pushCase("swagger_psych_up_target_atk_low_turn0", MOVE_SWAGGER, RNG_SEED,
  { moves: [MOVE_PSYCH_UP, 0, 0, 0], battleTurnCount: 0 }, { atkStage: 3 }, undefined);
pushCase("swagger_psych_up_target_atk_low_turn_high", MOVE_SWAGGER, RNG_SEED,
  { moves: [MOVE_PSYCH_UP, 0, 0, 0], battleTurnCount: 10 }, { atkStage: 3 }, undefined);
pushCase("swagger_no_psych_up_delegates_to_confuse_jump", MOVE_SWAGGER, 4,
  { moves: [0, 0, 0, 0], battleTurnCount: 0 }, { atkStage: 6, hp: 70, maxHp: 100 }, AI_WEATHER_HAIL);
pushCase("swagger_no_psych_up_delegates_to_confuse_no_jump", MOVE_SWAGGER, 1,
  { moves: [0, 0, 0, 0], battleTurnCount: 0 }, { atkStage: 6, hp: 30, maxHp: 100 }, AI_WEATHER_HAIL);

// === EFFECT_COUNTER (test:46-206) ============================================

const MOVE_COUNTER = 68;

pushCase("counter_target_asleep", MOVE_COUNTER, RNG_SEED, {}, { isAsleep: true }, AI_WEATHER_SUN);
pushCase("counter_target_infatuated", MOVE_COUNTER, RNG_SEED, {}, { isInfatuated: true }, undefined);
pushCase("counter_target_confused", MOVE_COUNTER, RNG_SEED, {}, { isConfused: true }, undefined);
pushCase("counter_low_hp_and_mid_hp_rolls", MOVE_COUNTER, 4, { hp: 20, maxHp: 100 }, {}, undefined);
pushCase("counter_last_move_physical_taunt_and_physical_roll", MOVE_COUNTER, RNG_SEED,
  {}, { lastUsedMoveId: MOVE_TACKLE, isTaunted: true }, undefined);
pushCase("counter_last_move_nonphysical_no_physical_roll", MOVE_COUNTER, RNG_SEED,
  {}, { lastUsedMoveId: 85 /* MOVE_THUNDERBOLT, TYPE_ELECTRIC */ }, undefined);
pushCase("counter_no_last_move_power_type1_physical_short_circuit", MOVE_COUNTER, RNG_SEED,
  {}, { lastUsedMoveId: null, types: ["TYPE_NORMAL", "TYPE_WATER"] }, undefined);
pushCase("counter_no_last_move_power_type2_physical_short_circuit", MOVE_COUNTER, RNG_SEED,
  {}, { lastUsedMoveId: null, types: ["TYPE_WATER", "TYPE_GHOST"] }, undefined);
pushCase("counter_no_last_move_power_nonphysical_target_type_roll_jump", MOVE_COUNTER, 4,
  {}, { lastUsedMoveId: null, types: ["TYPE_WATER", "TYPE_PSYCHIC"] }, undefined);
pushCase("counter_no_last_move_power_nonphysical_bonus_roll", MOVE_COUNTER, 1,
  {}, { lastUsedMoveId: null, types: ["TYPE_WATER", "TYPE_PSYCHIC"] }, undefined);
pushCase("counter_taunt_no_last_move_power", MOVE_COUNTER, RNG_SEED,
  {}, { lastUsedMoveId: null, isTaunted: true, types: ["TYPE_WATER", "TYPE_PSYCHIC"] }, undefined);
for (let i = 0; i < 10; i += 1) {
  pushCase(`counter_sweep_${i}`, MOVE_COUNTER, 36_000 + i * 5309,
    { hp: 5 + i * 11, maxHp: 100 },
    {
      lastUsedMoveId: i % 3 === 0 ? null : (i % 3 === 1 ? MOVE_TACKLE : 85),
      isTaunted: i % 2 === 0,
      types: [i % 2 === 0 ? "TYPE_WATER" : "TYPE_NORMAL", "TYPE_PSYCHIC"],
    }, undefined);
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
  "// GENERATED by core-rs/tools/gen-cv-m5d3-vectors.mjs — regenerate: node core-rs/tools/gen-cv-m5d3-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckViability.ts's runCheckViability");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One draw's generic (site, ordinal, rng, flag) snapshot. `site` is a");
lines.push("/// 0-based per-batch draw-kind index (see this generator's own `SITE_BY_KIND`");
lines.push("/// map); `flag` is the one extra boolean/tri-state field every M5d-3 draw");
lines.push("/// kind carries (`succeeded`/`jumped` as 0/1, or `strikesFirst` for the two");
lines.push("/// shared tie draws, already 0/1/2).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CvM5d3Draw {");
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

lines.push("/// One M5d-3 `run_check_viability` case (batching doc §2 \"M5d-3\"). Only");
lines.push("/// the battler fields this batch's handlers actually read are carried;");
lines.push("/// every other `FactoryAiCheckViabilityBattler` field stays at the test");
lines.push("/// file's own neutral default.");
lines.push("#[derive(Debug, Clone, Copy)]");
lines.push("pub struct CvM5d3Case {");
lines.push("    pub label: &'static str,");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub attacker_speed: u32,");
lines.push("    pub attacker_speed_stage: u8,");
lines.push("    pub attacker_hp: i32,");
lines.push("    pub attacker_max_hp: i32,");
lines.push("    pub attacker_types: [u8; 2],");
lines.push("    pub attacker_ability: Option<u16>,");
lines.push("    pub attacker_current_weather: Option<u8>,");
lines.push("    pub attacker_moves: [u16; 4],");
lines.push("    pub attacker_battle_turn_count: Option<u32>,");
lines.push("    pub attacker_is_asleep: Option<bool>,");
lines.push("    pub target_speed: u32,");
lines.push("    pub target_speed_stage: u8,");
lines.push("    pub target_hp: i32,");
lines.push("    pub target_max_hp: i32,");
lines.push("    pub target_types: [u8; 2],");
lines.push("    pub target_atk_stage: u8,");
lines.push("    pub target_evasion_stage: u8,");
lines.push("    pub target_sp_atk_stage: Option<u8>,");
lines.push("    pub target_last_used_move_id: Option<u16>,");
lines.push("    pub target_known_moves: [u16; 4],");
lines.push("    pub target_is_toxic_poisoned: Option<bool>,");
lines.push("    pub target_is_leech_seeded: Option<bool>,");
lines.push("    pub target_is_cursed: Option<bool>,");
lines.push("    pub target_has_perish_song: Option<bool>,");
lines.push("    pub target_is_infatuated: Option<bool>,");
lines.push("    pub target_is_asleep: Option<bool>,");
lines.push("    pub target_is_confused: Option<bool>,");
lines.push("    pub target_is_taunted: Option<bool>,");
lines.push("    pub fallback: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CvM5d3Draw; 8],");
lines.push("}");
lines.push(`pub static CV_M5D3_CASES: [CvM5d3Case; ${cases.length}] = [`);
for (const c of cases) {
  const drawsStr = c.draws
    .map(
      (d) =>
        `CvM5d3Draw { site: ${d.site}, ordinal: ${d.ordinal}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, flag: ${d.flag} }`,
    )
    .join(", ");
  lines.push(`    // ${c.label}`);
  lines.push(
    `    CvM5d3Case { label: ${JSON.stringify(c.label)}, move_id: ${c.moveId}, rng_value: ${c.rngValue}, ` +
      `attacker_speed: ${c.attackerSpeed}, attacker_speed_stage: ${c.attackerSpeedStage}, ` +
      `attacker_hp: ${c.attackerHp}, attacker_max_hp: ${c.attackerMaxHp}, ` +
      `attacker_types: [${c.attackerTypes[0]}, ${c.attackerTypes[1]}], ` +
      `attacker_ability: ${opt(c.attackerAbility, c.attackerAbility)}, ` +
      `attacker_current_weather: ${opt(c.attackerCurrentWeather, c.attackerCurrentWeather)}, ` +
      `attacker_moves: [${c.attackerMoves.join(", ")}], ` +
      `attacker_battle_turn_count: ${opt(c.attackerBattleTurnCount, c.attackerBattleTurnCount)}, ` +
      `attacker_is_asleep: ${optBool(c.attackerIsAsleep)}, ` +
      `target_speed: ${c.targetSpeed}, target_speed_stage: ${c.targetSpeedStage}, ` +
      `target_hp: ${c.targetHp}, target_max_hp: ${c.targetMaxHp}, ` +
      `target_types: [${c.targetTypes[0]}, ${c.targetTypes[1]}], target_atk_stage: ${c.targetAtkStage}, ` +
      `target_evasion_stage: ${c.targetEvasionStage}, ` +
      `target_sp_atk_stage: ${opt(c.targetSpAtkStage, c.targetSpAtkStage)}, ` +
      `target_last_used_move_id: ${opt(c.targetLastUsedMoveId, c.targetLastUsedMoveId)}, ` +
      `target_known_moves: [${c.targetKnownMoves.join(", ")}], ` +
      `target_is_toxic_poisoned: ${optBool(c.targetIsToxicPoisoned)}, ` +
      `target_is_leech_seeded: ${optBool(c.targetIsLeechSeeded)}, ` +
      `target_is_cursed: ${optBool(c.targetIsCursed)}, ` +
      `target_has_perish_song: ${optBool(c.targetHasPerishSong)}, ` +
      `target_is_infatuated: ${optBool(c.targetIsInfatuated)}, ` +
      `target_is_asleep: ${optBool(c.targetIsAsleep)}, ` +
      `target_is_confused: ${optBool(c.targetIsConfused)}, ` +
      `target_is_taunted: ${optBool(c.targetIsTaunted)}, ` +
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
  throw new Error("gen-cv-m5d3-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cv-m5d3-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cv-m5d3-vectors: ${cases.length} cases`);
