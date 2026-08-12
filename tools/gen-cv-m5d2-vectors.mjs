#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_viability_m5d2_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckViability.ts's `runCheckViability` (read-only
// import, node --experimental-strip-types -- the gen-cv-m5d1-vectors.mjs
// precedent, which this script mirrors byte-for-byte in structure). No
// value in the emitted file is hand-computed. Deterministic: a fixed
// directed case list plus small seeded sweeps per handler-family, not
// Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5d-2 only (docs/rust-m5d-checkviability-batching.md §2) -- the
// 29 effects covering AttackDown/DefenseDown+TICKLE/SpDefDown/AttackUp/
// DefenseUp+BULK_UP/AccuracyDown/SpeedUp/SpAtkUp/SpDefUp+COSMIC_POWER+
// CALM_MIND/LightScreen/Reflect/EvasionUp+MINIMIZE/EvasionDown. Every case
// here uses a move whose effect IS in this 29-effect batch: since
// src/engine/factoryAiCheckViability.ts is verified live below to be
// 122/122 dispatch-complete, its `runCheckViability` output for such a
// move already reflects the real handler logic end to end -- directly
// comparable to the Rust port's own M5d-2 handlers.
//
// Usage: node core-rs/tools/gen-cv-m5d2-vectors.mjs   (from any cwd)

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
  "factory_ai_check_viability_m5d2_vectors_gen.rs",
);

const cv = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckViability.ts"));
const { runCheckViability, AI_CHECK_VIABILITY_TABLE_EFFECTS } = cv;
const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { MOVES_BY_ID } = cbm;

// Verify live (not from doc prose) that TS really is 122/122 table-complete
// -- the premise this generator relies on to treat TS's own scored output as
// the handler-inclusive expected value for every M5d-2 move (same premise
// check gen-cv-m5d1-vectors.mjs makes for its own batch).
if (AI_CHECK_VIABILITY_TABLE_EFFECTS.size !== 122) {
  throw new Error(
    `gen-cv-m5d2-vectors: expected AI_CHECK_VIABILITY_TABLE_EFFECTS to have 122 entries, found ${AI_CHECK_VIABILITY_TABLE_EFFECTS.size} ` +
      "(this script's whole premise for treating TS's scored output as ground truth)",
  );
}

// The 29 effects this batch covers (batching doc §2 "M5d-2"), TS dispatch
// source order (factoryAiCheckViability.ts:5648-5942) -- mirrors Rust's
// CV_HANDLED_EFFECTS_M5D2 exactly (factory_ai_check_viability.rs).
const M5D2_EFFECT_NAMES = new Set([
  "EFFECT_ATTACK_DOWN", "EFFECT_ATTACK_DOWN_2",
  "EFFECT_DEFENSE_DOWN", "EFFECT_DEFENSE_DOWN_2", "EFFECT_TICKLE",
  "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_SPECIAL_DEFENSE_DOWN_2",
  "EFFECT_ATTACK_UP", "EFFECT_ATTACK_UP_2",
  "EFFECT_DEFENSE_UP", "EFFECT_DEFENSE_UP_2", "EFFECT_BULK_UP",
  "EFFECT_ACCURACY_DOWN", "EFFECT_ACCURACY_DOWN_2",
  "EFFECT_SPEED_UP", "EFFECT_SPEED_UP_2",
  "EFFECT_SPECIAL_ATTACK_UP", "EFFECT_SPECIAL_ATTACK_UP_2",
  "EFFECT_SPECIAL_DEFENSE_UP", "EFFECT_SPECIAL_DEFENSE_UP_2", "EFFECT_COSMIC_POWER", "EFFECT_CALM_MIND",
  "EFFECT_LIGHT_SCREEN", "EFFECT_REFLECT",
  "EFFECT_EVASION_UP", "EFFECT_EVASION_UP_2", "EFFECT_MINIMIZE",
  "EFFECT_EVASION_DOWN", "EFFECT_EVASION_DOWN_2",
]);
if (M5D2_EFFECT_NAMES.size !== 29) {
  throw new Error(`gen-cv-m5d2-vectors: expected exactly 29 M5d-2 effect names, got ${M5D2_EFFECT_NAMES.size}`);
}
for (const name of M5D2_EFFECT_NAMES) {
  if (!AI_CHECK_VIABILITY_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cv-m5d2-vectors: ${name} is not a real AI_CheckViability table effect`);
  }
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use (identical to
// gen-cv-m5d1-vectors.mjs's own TYPE_IDS). ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};

// --- draw site indices, one per M5d-2 draw kind. ---
const SITE_BY_KIND = {
  "target-faster-tie": 0,
  "attack-down-roll-1": 1,
  "attack-down-roll-2": 2,
  "defense-down-roll": 3,
  "sp-def-down-roll": 4,
  "evasion-down-roll": 5,
  "attack-up-roll-1": 6,
  "attack-up-roll-2": 7,
  "attack-up-roll-3": 8,
  "sp-atk-up-roll-1": 9,
  "sp-atk-up-roll-2": 10,
  "sp-atk-up-roll-3": 11,
  "defense-up-roll-1": 12,
  "defense-up-roll-2": 13,
  "defense-up-roll-3": 14,
  "defense-up-roll-4": 15,
  "defense-up-roll-5": 16,
  "sp-def-up-roll-1": 17,
  "sp-def-up-roll-2": 18,
  "sp-def-up-roll-3": 19,
  "sp-def-up-roll-4": 20,
  "sp-def-up-roll-5": 21,
  "light-screen-roll": 22,
  "reflect-roll": 23,
  "accuracy-down-roll-1": 24,
  "accuracy-down-roll-2": 25,
  "accuracy-down-roll-3": 26,
  "accuracy-down-roll-4": 27,
  "accuracy-down-roll-5": 28,
  "accuracy-down-roll-6": 29,
  "accuracy-down-roll-7": 30,
  "speed-up-roll": 31,
  "evasion-up-roll-1": 32,
  "evasion-up-roll-2": 33,
  "evasion-up-roll-3": 34,
  "evasion-up-roll-4": 35,
  "evasion-up-roll-5": 36,
  "evasion-up-roll-6": 37,
  "evasion-up-roll-7": 38,
  "evasion-up-roll-8": 39,
};

function drawFlag(d) {
  if (d.kind === "target-faster-tie") return d.strikesFirst;
  if ("succeeded" in d) return d.succeeded ? 1 : 0;
  if ("jumped" in d) return d.jumped ? 1 : 0;
  if ("jumpedToEnd" in d) return d.jumpedToEnd ? 1 : 0;
  throw new Error(`gen-cv-m5d2-vectors: unrecognized draw shape for kind ${d.kind}`);
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
  if (!move) throw new Error(`gen-cv-m5d2-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5D2_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cv-m5d2-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5d-2 batch`,
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
    throw new Error(`gen-cv-m5d2-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 8) {
    throw new Error(`gen-cv-m5d2-vectors: case ${label} produced ${result.draws.length} draws, expected <=8`);
  }

  const draws = result.draws.map((d) => {
    const site = SITE_BY_KIND[d.kind];
    if (site === undefined) throw new Error(`gen-cv-m5d2-vectors: case ${label} unrecognized draw kind ${d.kind}`);
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
    attackerAtkStage: attacker.atkStage,
    attackerDefStage: attacker.defStage,
    attackerSpDefStage: attacker.spDefStage,
    attackerEvasionStage: attacker.evasionStage,
    attackerAccStage: attacker.accStage,
    attackerSpAtkStage: attacker.spAtkStage ?? null,
    attackerHp: attacker.hp,
    attackerMaxHp: attacker.maxHp,
    attackerIsRooted: attacker.isRooted ?? null,
    targetSpeed: target.speed,
    targetSpeedStage: target.speedStage,
    targetTypes: [TYPE_IDS[target.types[0]], TYPE_IDS[target.types[1]]],
    targetAtkStage: target.atkStage,
    targetDefStage: target.defStage,
    targetSpDefStage: target.spDefStage,
    targetEvasionStage: target.evasionStage,
    targetAccStage: target.accStage,
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    targetLastUsedMoveId: target.lastUsedMoveId ?? null,
    targetIsToxicPoisoned: target.isToxicPoisoned ?? null,
    targetIsLeechSeeded: target.isLeechSeeded ?? null,
    targetIsCursed: target.isCursed ?? null,
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

// === EFFECT_ATTACK_DOWN(+_2): runCvAttackDown (test:1524-1748) ==============

const MOVE_GROWL_ATTACK_DOWN = 45;
const MOVE_CHARM = 204; // EFFECT_ATTACK_DOWN_2

pushCase("attack_down_gate_a_held_physical_type", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 100, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_gate_b_hp_high", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 4, hp: 100, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_gate_b_hp_exact_90", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 90, maxHp: 100 }, { atkStage: 4, hp: 100, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_draw1_jumps", MOVE_GROWL_ATTACK_DOWN, 4,
  { hp: 100, maxHp: 100 }, { atkStage: 3, hp: 100, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_draw1_succeeds", MOVE_GROWL_ATTACK_DOWN, 1,
  { hp: 100, maxHp: 100 }, { atkStage: 3, hp: 100, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_gate_d_hp_71", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 71, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_gate_d_hp_70", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 70, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("attack_down_gates_ef_type1_match", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 100, maxHp: 100, types: ["TYPE_BUG", "TYPE_FLYING"] });
pushCase("attack_down_gates_ef_type2_match", MOVE_GROWL_ATTACK_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 100, maxHp: 100, types: ["TYPE_GHOST", "TYPE_ROCK"] });
pushCase("attack_down_draw2_jumps", MOVE_GROWL_ATTACK_DOWN, 4,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 100, maxHp: 100, types: ["TYPE_FIRE", "TYPE_FIRE"] });
pushCase("attack_down_draw2_succeeds", MOVE_GROWL_ATTACK_DOWN, 1,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 100, maxHp: 100, types: ["TYPE_FIRE", "TYPE_FIRE"] });
pushCase("attack_down_both_draws_worst_case", MOVE_GROWL_ATTACK_DOWN, 2,
  { hp: 50, maxHp: 100 }, { atkStage: 3, hp: 50, maxHp: 100, types: ["TYPE_FIRE", "TYPE_FIRE"] });
pushCase("attack_down_2_charm", MOVE_CHARM, RNG_SEED,
  { hp: 100, maxHp: 100 }, { atkStage: 6, hp: 100, maxHp: 100, types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
for (let i = 0; i < 8; i += 1) {
  pushCase(`attack_down_sweep_${i}`, MOVE_GROWL_ATTACK_DOWN, 10_000 + i * 6299,
    { hp: 30 + i * 9, maxHp: 100 },
    { atkStage: i % 7, hp: 20 + i * 11, maxHp: 100, types: [i % 2 === 0 ? "TYPE_FIRE" : "TYPE_NORMAL", "TYPE_WATER"] });
}

// === EFFECT_DEFENSE_DOWN(+_2)+TICKLE / SPECIAL_DEFENSE_DOWN(+_2) / EVASION_DOWN(+_2):
// runCvStatDown shared tail (test:1749-2051, 4127-4265) ====================

const MOVE_TAIL_WHIP_DEFENSE_DOWN = 39;
const MOVE_SCREECH = 103; // EFFECT_DEFENSE_DOWN_2
const MOVE_TICKLE = 321; // EFFECT_TICKLE -> AI_CV_DefenseDown
const MOVE_FAKE_TEARS_SPDEF_DOWN = 313; // EFFECT_SPECIAL_DEFENSE_DOWN_2
const MOVE_METAL_SOUND = 319; // EFFECT_SPECIAL_DEFENSE_DOWN_2
const MOVE_SWEET_SCENT_CV = 230; // EFFECT_EVASION_DOWN

pushCase("defense_down_gate_a_reaches", MOVE_TAIL_WHIP_DEFENSE_DOWN, 4,
  { hp: 50, maxHp: 100 }, { defStage: 6, hp: 100, maxHp: 100 });
pushCase("defense_down_gate_a_reaches_succeeds", MOVE_TAIL_WHIP_DEFENSE_DOWN, 1,
  { hp: 50, maxHp: 100 }, { defStage: 6, hp: 100, maxHp: 100 });
pushCase("defense_down_gate_b_reaches", MOVE_TAIL_WHIP_DEFENSE_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { defStage: 3, hp: 100, maxHp: 100 });
pushCase("defense_down_neither_gate", MOVE_TAIL_WHIP_DEFENSE_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { defStage: 4, hp: 100, maxHp: 100 });
pushCase("defense_down_gate_c_hp_71", MOVE_TAIL_WHIP_DEFENSE_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { defStage: 4, hp: 71, maxHp: 100 });
pushCase("defense_down_gate_c_hp_70", MOVE_TAIL_WHIP_DEFENSE_DOWN, RNG_SEED,
  { hp: 100, maxHp: 100 }, { defStage: 4, hp: 70, maxHp: 100 });
pushCase("defense_down_2_screech", MOVE_SCREECH, RNG_SEED,
  { hp: 100, maxHp: 100 }, { defStage: 6, hp: 100, maxHp: 100 });
pushCase("tickle_shares_defense_down_handler", MOVE_TICKLE, RNG_SEED,
  { hp: 100, maxHp: 100 }, { defStage: 3, hp: 100, maxHp: 100 });
pushCase("sp_def_down_2_fake_tears", MOVE_FAKE_TEARS_SPDEF_DOWN, 4,
  { hp: 50, maxHp: 100 }, { spDefStage: 6, hp: 100, maxHp: 100 });
pushCase("sp_def_down_2_metal_sound_succeeds", MOVE_METAL_SOUND, 1,
  { hp: 50, maxHp: 100 }, { spDefStage: 6, hp: 100, maxHp: 100 });
pushCase("evasion_down_gate_a_reaches", MOVE_SWEET_SCENT_CV, 4,
  { hp: 50, maxHp: 100 }, { evasionStage: 6, hp: 100, maxHp: 100 });
pushCase("evasion_down_gate_b_reaches_succeeds", MOVE_SWEET_SCENT_CV, 1,
  { hp: 100, maxHp: 100 }, { evasionStage: 3, hp: 100, maxHp: 100 });
pushCase("evasion_down_gate_c_hp_70", MOVE_SWEET_SCENT_CV, RNG_SEED,
  { hp: 100, maxHp: 100 }, { evasionStage: 4, hp: 70, maxHp: 100 });
for (let i = 0; i < 6; i += 1) {
  pushCase(`defense_down_sweep_${i}`, MOVE_TAIL_WHIP_DEFENSE_DOWN, 11_000 + i * 5507,
    { hp: 30 + i * 12, maxHp: 100 }, { defStage: i % 7, hp: 20 + i * 13, maxHp: 100 });
}
for (let i = 0; i < 6; i += 1) {
  pushCase(`sp_def_down_sweep_${i}`, MOVE_FAKE_TEARS_SPDEF_DOWN, 12_000 + i * 5347,
    { hp: 30 + i * 12, maxHp: 100 }, { spDefStage: i % 7, hp: 20 + i * 13, maxHp: 100 });
}
for (let i = 0; i < 6; i += 1) {
  pushCase(`evasion_down_sweep_${i}`, MOVE_SWEET_SCENT_CV, 13_000 + i * 5107,
    { hp: 30 + i * 12, maxHp: 100 }, { evasionStage: i % 7, hp: 20 + i * 13, maxHp: 100 });
}

// === EFFECT_ATTACK_UP(+_2) / SPECIAL_ATTACK_UP(+_2): runCvAttackStyleStatUp
// shared tail (test:2052-2290, 3031-3223) ====================================

const MOVE_MEDITATE_ATTACK_UP = 96;
const MOVE_SWORDS_DANCE_ATTACK_UP = 14; // EFFECT_ATTACK_UP_2
const MOVE_GROWTH_SPATK_UP = 74;
const MOVE_TAIL_GLOW_SPATK_UP_2 = 294; // EFFECT_SPECIAL_ATTACK_UP_2

pushCase("attack_up_gate_a_low_stage_hp100_jumps", MOVE_MEDITATE_ATTACK_UP, 4,
  { atkStage: 6, hp: 100, maxHp: 100 }, {});
pushCase("attack_up_gate_a_low_stage_hp100_succeeds", MOVE_MEDITATE_ATTACK_UP, 1,
  { atkStage: 6, hp: 100, maxHp: 100 }, {});
pushCase("attack_up_gate_a_low_stage_hp_not100_clean_stop", MOVE_MEDITATE_ATTACK_UP, RNG_SEED,
  { atkStage: 6, hp: 80, maxHp: 100 }, {});
pushCase("attack_up_gate_a_high_stage_jumps", MOVE_MEDITATE_ATTACK_UP, 4,
  { atkStage: 9, hp: 80, maxHp: 100 }, {});
pushCase("attack_up_gate_a_high_stage_succeeds", MOVE_MEDITATE_ATTACK_UP, 1,
  { atkStage: 9, hp: 80, maxHp: 100 }, {});
pushCase("attack_up_gate_d_low_hp", MOVE_MEDITATE_ATTACK_UP, 1,
  { atkStage: 9, hp: 30, maxHp: 100 }, {});
pushCase("attack_up_draw_site3_band_jumps", MOVE_MEDITATE_ATTACK_UP, 4,
  { atkStage: 6, hp: 50, maxHp: 100 }, {});
pushCase("attack_up_draw_site3_band_succeeds", MOVE_MEDITATE_ATTACK_UP, 1,
  { atkStage: 6, hp: 50, maxHp: 100 }, {});
pushCase("attack_up_2_swords_dance", MOVE_SWORDS_DANCE_ATTACK_UP, RNG_SEED,
  { atkStage: 9, hp: 80, maxHp: 100 }, {});
pushCase("sp_atk_up_gate_a_low_stage_hp100_jumps", MOVE_GROWTH_SPATK_UP, 4,
  { spAtkStage: 6, hp: 100, maxHp: 100 }, {});
pushCase("sp_atk_up_gate_a_high_stage_succeeds", MOVE_GROWTH_SPATK_UP, 1,
  { spAtkStage: 9, hp: 80, maxHp: 100 }, {});
pushCase("sp_atk_up_draw_site3_band_threshold70_jumps", MOVE_GROWTH_SPATK_UP, 4,
  { spAtkStage: 6, hp: 50, maxHp: 100 }, {});
pushCase("sp_atk_up_draw_site3_band_threshold70_succeeds", MOVE_GROWTH_SPATK_UP, 1,
  { spAtkStage: 6, hp: 50, maxHp: 100 }, {});
pushCase("sp_atk_up_2_tail_glow", MOVE_TAIL_GLOW_SPATK_UP_2, RNG_SEED,
  { spAtkStage: 9, hp: 80, maxHp: 100 }, {});
for (let i = 0; i < 8; i += 1) {
  pushCase(`attack_up_sweep_${i}`, MOVE_MEDITATE_ATTACK_UP, 14_000 + i * 4999,
    { atkStage: 3 + i, hp: 20 + i * 11, maxHp: 100 }, {});
}
for (let i = 0; i < 8; i += 1) {
  pushCase(`sp_atk_up_sweep_${i}`, MOVE_GROWTH_SPATK_UP, 15_000 + i * 4801,
    { spAtkStage: 3 + i, hp: 20 + i * 11, maxHp: 100 }, {});
}

// === EFFECT_DEFENSE_UP(+_2)+BULK_UP: runCvDefenseUp (test:2291-2548) =======

const MOVE_HARDEN_DEFENSE_UP = 106;
const MOVE_ACID_ARMOR_DEFENSE_UP_2 = 151;
const MOVE_BULK_UP_DEFENSE_UP = 339; // EFFECT_BULK_UP
const MOVE_SPLASH_ZERO_POWER = 150; // power 0 -- Gate E true.
const MOVE_VITAL_THROW_PHYSICAL_LAST = 233; // power 70, Fighting -- IN AI_CV_DefenseUp_PhysicalTypes.
const MOVE_DRAGON_RAGE_NONPHYSICAL_LAST = 82; // power 1, Dragon -- NOT in the list.

pushCase("defense_up_gate_a_low_stage_hp100_jumps", MOVE_HARDEN_DEFENSE_UP, 4,
  { defStage: 6, hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_a_low_stage_hp100_succeeds", MOVE_HARDEN_DEFENSE_UP, 1,
  { defStage: 6, hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_a_high_stage_hp_50", MOVE_HARDEN_DEFENSE_UP, 4,
  { defStage: 9, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_c_site3_jumps_stops", MOVE_HARDEN_DEFENSE_UP, 4,
  { defStage: 6, hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_c_site3_continues", MOVE_HARDEN_DEFENSE_UP, 1,
  { defStage: 6, hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_d_low_hp", MOVE_HARDEN_DEFENSE_UP, RNG_SEED,
  { defStage: 9, hp: 30, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_e_power_zero_site5", MOVE_HARDEN_DEFENSE_UP, 4,
  { defStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_e_power_zero_site5_succeeds", MOVE_HARDEN_DEFENSE_UP, 1,
  { defStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("defense_up_gate_f_nonphysical_skips_to_penalty", MOVE_HARDEN_DEFENSE_UP, RNG_SEED,
  { defStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_DRAGON_RAGE_NONPHYSICAL_LAST });
pushCase("defense_up_draw_site4_stops", MOVE_HARDEN_DEFENSE_UP, 4,
  { defStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_VITAL_THROW_PHYSICAL_LAST });
pushCase("defense_up_draw_site4_chains_into_site5", MOVE_HARDEN_DEFENSE_UP, 1,
  { defStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_VITAL_THROW_PHYSICAL_LAST });
pushCase("defense_up_2_acid_armor", MOVE_ACID_ARMOR_DEFENSE_UP_2, RNG_SEED,
  { defStage: 9, hp: 80, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("bulk_up_shares_defense_up_handler", MOVE_BULK_UP_DEFENSE_UP, RNG_SEED,
  { defStage: 9, hp: 80, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
for (let i = 0; i < 8; i += 1) {
  pushCase(`defense_up_sweep_${i}`, MOVE_HARDEN_DEFENSE_UP, 16_000 + i * 4703,
    { defStage: 3 + i, hp: 20 + i * 11, maxHp: 100 },
    { lastUsedMoveId: i % 2 === 0 ? MOVE_VITAL_THROW_PHYSICAL_LAST : MOVE_DRAGON_RAGE_NONPHYSICAL_LAST });
}

// === EFFECT_SPECIAL_DEFENSE_UP(+_2)+COSMIC_POWER+CALM_MIND: runCvSpDefUp
// (test:3224-3465) ============================================================

const MOVE_COSMIC_POWER_SPDEF_UP = 322;
const MOVE_CALM_MIND_SPDEF_UP = 347;

pushCase("sp_def_up_gate_a_low_stage_hp100_succeeds", MOVE_COSMIC_POWER_SPDEF_UP, 1,
  { spDefStage: 6, hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("sp_def_up_gate_a_high_stage_hp50", MOVE_COSMIC_POWER_SPDEF_UP, 4,
  { spDefStage: 9, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("sp_def_up_gate_c_site3", MOVE_COSMIC_POWER_SPDEF_UP, 1,
  { spDefStage: 6, hp: 100, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("sp_def_up_gate_e_power_zero_site5", MOVE_COSMIC_POWER_SPDEF_UP, 4,
  { spDefStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_SPLASH_ZERO_POWER });
pushCase("sp_def_up_gate_f_inverted_physical_stops", MOVE_COSMIC_POWER_SPDEF_UP, RNG_SEED,
  { spDefStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_VITAL_THROW_PHYSICAL_LAST });
pushCase("sp_def_up_gate_f_nonphysical_reaches_site4", MOVE_COSMIC_POWER_SPDEF_UP, RNG_SEED,
  { spDefStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_DRAGON_RAGE_NONPHYSICAL_LAST });
pushCase("calm_mind_shares_sp_def_up_handler", MOVE_CALM_MIND_SPDEF_UP, RNG_SEED,
  { spDefStage: 6, hp: 50, maxHp: 100 }, { lastUsedMoveId: MOVE_DRAGON_RAGE_NONPHYSICAL_LAST });
for (let i = 0; i < 8; i += 1) {
  pushCase(`sp_def_up_sweep_${i}`, MOVE_COSMIC_POWER_SPDEF_UP, 17_000 + i * 4507,
    { spDefStage: 3 + i, hp: 20 + i * 11, maxHp: 100 },
    { lastUsedMoveId: i % 2 === 0 ? MOVE_VITAL_THROW_PHYSICAL_LAST : MOVE_DRAGON_RAGE_NONPHYSICAL_LAST });
}

// === EFFECT_LIGHT_SCREEN / EFFECT_REFLECT: runCvSideScreenTypeGate shared
// tail (test:3466-3647) =======================================================

const MOVE_LIGHT_SCREEN_CV = 113;
const MOVE_REFLECT_CV = 115;

pushCase("light_screen_gate_a_low_hp", MOVE_LIGHT_SCREEN_CV, RNG_SEED,
  { hp: 49, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] });
pushCase("light_screen_listed_type", MOVE_LIGHT_SCREEN_CV, RNG_SEED,
  { hp: 50, maxHp: 100 }, { types: ["TYPE_FIRE", "TYPE_NORMAL"] });
pushCase("light_screen_unlisted_type_jumps", MOVE_LIGHT_SCREEN_CV, 4,
  { hp: 100, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_ROCK"] });
pushCase("light_screen_unlisted_type_succeeds", MOVE_LIGHT_SCREEN_CV, 1,
  { hp: 100, maxHp: 100 }, { types: ["TYPE_NORMAL", "TYPE_ROCK"] });
pushCase("reflect_gate_a_low_hp", MOVE_REFLECT_CV, RNG_SEED,
  { hp: 49, maxHp: 100 }, { types: ["TYPE_FIRE", "TYPE_WATER"] });
pushCase("reflect_listed_type", MOVE_REFLECT_CV, RNG_SEED,
  { hp: 100, maxHp: 100 }, { types: ["TYPE_GHOST", "TYPE_FIRE"] });
pushCase("reflect_unlisted_type_jumps", MOVE_REFLECT_CV, 4,
  { hp: 100, maxHp: 100 }, { types: ["TYPE_FIRE", "TYPE_WATER"] });
pushCase("reflect_unlisted_type_succeeds", MOVE_REFLECT_CV, 1,
  { hp: 100, maxHp: 100 }, { types: ["TYPE_FIRE", "TYPE_WATER"] });
for (let i = 0; i < 6; i += 1) {
  pushCase(`light_screen_sweep_${i}`, MOVE_LIGHT_SCREEN_CV, 18_000 + i * 4211,
    { hp: 30 + i * 12, maxHp: 100 }, { types: [i % 2 === 0 ? "TYPE_FIRE" : "TYPE_NORMAL", "TYPE_ROCK"] });
}
for (let i = 0; i < 6; i += 1) {
  pushCase(`reflect_sweep_${i}`, MOVE_REFLECT_CV, 19_000 + i * 4099,
    { hp: 30 + i * 12, maxHp: 100 }, { types: [i % 2 === 0 ? "TYPE_GHOST" : "TYPE_FIRE", "TYPE_WATER"] });
}

// === EFFECT_ACCURACY_DOWN(+_2): runCvAccuracyDown (test:2549-2925, biggest
// test block, densest coverage per the step brief) ===========================

const MOVE_SAND_ATTACK = 28;
const MOVE_SMOKESCREEN = 108; // same handler, different real move.

pushCase("acc_down_site1_via_attacker_hp", MOVE_SAND_ATTACK, 4,
  { hp: 50, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site1_via_attacker_hp_succeeds", MOVE_SAND_ATTACK, 1,
  { hp: 50, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site1_via_target_hp", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 70, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site1_neither", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site2_gate_c_reaches", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 4, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site3_toxic", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: true, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site4_leech", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: true, isCursed: false });
pushCase("acc_down_site5_rooted", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: true },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site6_cursed", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: true });
pushCase("acc_down_all_status_gates_together", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: true },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: true, isLeechSeeded: true, isCursed: true });
pushCase("acc_down_gate_h_clean_stop", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 71, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_gate_i_clean_stop", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 50, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 6, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_gates_jk_deterministic_penalty", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 39, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site7_jumps", MOVE_SAND_ATTACK, 4,
  { hp: 70, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 71, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_site7_succeeds", MOVE_SAND_ATTACK, 1,
  { hp: 70, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 71, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_2_vestigial_but_dispatched", MOVE_SAND_ATTACK, RNG_SEED,
  { hp: 100, maxHp: 100, accStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("acc_down_smokescreen_same_handler", MOVE_SMOKESCREEN, 1,
  { hp: 50, maxHp: 100, accStage: 4, isRooted: true },
  { hp: 100, maxHp: 100, accStage: 4, isToxicPoisoned: true, isLeechSeeded: true, isCursed: true });
for (let i = 0; i < 12; i += 1) {
  pushCase(`acc_down_sweep_${i}`, MOVE_SAND_ATTACK, 20_000 + i * 3989,
    { hp: 20 + i * 8, maxHp: 100, accStage: i % 7, isRooted: i % 3 === 0 },
    {
      hp: 15 + i * 9, maxHp: 100, accStage: i % 8,
      isToxicPoisoned: i % 2 === 0, isLeechSeeded: i % 3 === 1, isCursed: i % 4 === 2,
    });
}

// === EFFECT_SPEED_UP(+_2): runCvSpeedUp (test:2926-3030) ====================

const MOVE_AGILITY_SPEED_UP_2 = 97;

pushCase("speed_up_target_not_faster", MOVE_AGILITY_SPEED_UP_2, RNG_SEED, { speed: 150 }, { speed: 50 });
pushCase("speed_up_target_faster_jumps", MOVE_AGILITY_SPEED_UP_2, 4, { speed: 50 }, { speed: 150 });
pushCase("speed_up_target_faster_succeeds", MOVE_AGILITY_SPEED_UP_2, 1, { speed: 50 }, { speed: 150 });
pushCase("speed_up_tie", MOVE_AGILITY_SPEED_UP_2, RNG_SEED, { speed: 100 }, { speed: 100 });
for (let i = 0; i < 6; i += 1) {
  pushCase(`speed_up_sweep_${i}`, MOVE_AGILITY_SPEED_UP_2, 21_000 + i * 3877,
    { speed: 40 + i * 13 }, { speed: 120 });
}

// === EFFECT_EVASION_UP(+_2)+MINIMIZE: runCvEvasionUp (test:3648-4126,
// densest coverage per the step brief -- the module's largest handler) ======

const MOVE_DOUBLE_TEAM_CV = 104;
const MOVE_MINIMIZE_CV = 107; // shares this same handler.

pushCase("evasion_up_gate_a_below_90", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 89, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site1_jumps", MOVE_DOUBLE_TEAM_CV, 4,
  { hp: 90, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site1_succeeds", MOVE_DOUBLE_TEAM_CV, 1,
  { hp: 90, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site2_gate_b", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 9, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_toxic_pair_high_hp_single_draw", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: true, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_toxic_pair_low_hp_stops_at_site3", MOVE_DOUBLE_TEAM_CV, 4,
  { hp: 50, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: true, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_toxic_pair_low_hp_chains_into_site4", MOVE_DOUBLE_TEAM_CV, 1,
  { hp: 50, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: true, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site5_leech", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: true, isCursed: false });
pushCase("evasion_up_site6_rooted", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: true },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site7_cursed", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: true });
pushCase("evasion_up_sites_5_6_7_together", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: true },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: true, isCursed: true });
pushCase("evasion_up_gate_h_clean_stop", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 71, maxHp: 100, evasionStage: 4, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_gate_i_clean_stop", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 50, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_gates_jk_deterministic_penalty", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 39, maxHp: 100, evasionStage: 4, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site8_jumps", MOVE_DOUBLE_TEAM_CV, 4,
  { hp: 50, maxHp: 100, evasionStage: 4, isRooted: false },
  { hp: 50, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_site8_succeeds", MOVE_DOUBLE_TEAM_CV, 1,
  { hp: 50, maxHp: 100, evasionStage: 4, isRooted: false },
  { hp: 50, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("evasion_up_worst_case_seven_draws", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 45, maxHp: 100, evasionStage: 9, isRooted: true },
  { hp: 100, maxHp: 100, isToxicPoisoned: true, isLeechSeeded: true, isCursed: true });
pushCase("evasion_up_2_vestigial_but_dispatched", MOVE_DOUBLE_TEAM_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
pushCase("minimize_shares_evasion_up_handler", MOVE_MINIMIZE_CV, RNG_SEED,
  { hp: 80, maxHp: 100, evasionStage: 6, isRooted: false },
  { hp: 100, maxHp: 100, isToxicPoisoned: false, isLeechSeeded: false, isCursed: false });
for (let i = 0; i < 12; i += 1) {
  pushCase(`evasion_up_sweep_${i}`, MOVE_DOUBLE_TEAM_CV, 22_000 + i * 3571,
    { hp: 20 + i * 8, maxHp: 100, evasionStage: i % 12, isRooted: i % 3 === 0 },
    {
      hp: 15 + i * 9, maxHp: 100,
      isToxicPoisoned: i % 2 === 0, isLeechSeeded: i % 3 === 1, isCursed: i % 4 === 2,
    });
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
  "// GENERATED by core-rs/tools/gen-cv-m5d2-vectors.mjs — regenerate: node core-rs/tools/gen-cv-m5d2-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckViability.ts's runCheckViability");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One draw's generic (site, ordinal, rng, flag) snapshot. `site` is a");
lines.push("/// 0-based per-batch draw-kind index (see this generator's own `SITE_BY_KIND`");
lines.push("/// map); `flag` is the one extra boolean/tri-state field every M5d-2 draw");
lines.push("/// kind carries (`succeeded` as 0/1, or `strikesFirst` for the shared tie");
lines.push("/// draw, already 0/1/2).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CvM5d2Draw {");
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

lines.push("/// One M5d-2 `run_check_viability` case (batching doc §2 \"M5d-2\"). Only");
lines.push("/// the battler fields this batch's handlers actually read are carried;");
lines.push("/// every other `FactoryAiCheckViabilityBattler` field stays at the test");
lines.push("/// file's own neutral default.");
lines.push("#[derive(Debug, Clone, Copy)]");
lines.push("pub struct CvM5d2Case {");
lines.push("    pub label: &'static str,");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub attacker_speed: u32,");
lines.push("    pub attacker_speed_stage: u8,");
lines.push("    pub attacker_atk_stage: u8,");
lines.push("    pub attacker_def_stage: u8,");
lines.push("    pub attacker_sp_def_stage: u8,");
lines.push("    pub attacker_evasion_stage: u8,");
lines.push("    pub attacker_acc_stage: u8,");
lines.push("    pub attacker_sp_atk_stage: Option<u8>,");
lines.push("    pub attacker_hp: i32,");
lines.push("    pub attacker_max_hp: i32,");
lines.push("    pub attacker_is_rooted: Option<bool>,");
lines.push("    pub target_speed: u32,");
lines.push("    pub target_speed_stage: u8,");
lines.push("    pub target_types: [u8; 2],");
lines.push("    pub target_atk_stage: u8,");
lines.push("    pub target_def_stage: u8,");
lines.push("    pub target_sp_def_stage: u8,");
lines.push("    pub target_evasion_stage: u8,");
lines.push("    pub target_acc_stage: u8,");
lines.push("    pub target_hp: i32,");
lines.push("    pub target_max_hp: i32,");
lines.push("    pub target_last_used_move_id: Option<u16>,");
lines.push("    pub target_is_toxic_poisoned: Option<bool>,");
lines.push("    pub target_is_leech_seeded: Option<bool>,");
lines.push("    pub target_is_cursed: Option<bool>,");
lines.push("    pub fallback: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CvM5d2Draw; 8],");
lines.push("}");
lines.push(`pub static CV_M5D2_CASES: [CvM5d2Case; ${cases.length}] = [`);
for (const c of cases) {
  const drawsStr = c.draws
    .map(
      (d) =>
        `CvM5d2Draw { site: ${d.site}, ordinal: ${d.ordinal}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, flag: ${d.flag} }`,
    )
    .join(", ");
  lines.push(`    // ${c.label}`);
  lines.push(
    `    CvM5d2Case { label: ${JSON.stringify(c.label)}, move_id: ${c.moveId}, rng_value: ${c.rngValue}, ` +
      `attacker_speed: ${c.attackerSpeed}, attacker_speed_stage: ${c.attackerSpeedStage}, ` +
      `attacker_atk_stage: ${c.attackerAtkStage}, attacker_def_stage: ${c.attackerDefStage}, ` +
      `attacker_sp_def_stage: ${c.attackerSpDefStage}, attacker_evasion_stage: ${c.attackerEvasionStage}, ` +
      `attacker_acc_stage: ${c.attackerAccStage}, attacker_sp_atk_stage: ${opt(c.attackerSpAtkStage, c.attackerSpAtkStage)}, ` +
      `attacker_hp: ${c.attackerHp}, attacker_max_hp: ${c.attackerMaxHp}, attacker_is_rooted: ${optBool(c.attackerIsRooted)}, ` +
      `target_speed: ${c.targetSpeed}, target_speed_stage: ${c.targetSpeedStage}, ` +
      `target_types: [${c.targetTypes[0]}, ${c.targetTypes[1]}], target_atk_stage: ${c.targetAtkStage}, ` +
      `target_def_stage: ${c.targetDefStage}, target_sp_def_stage: ${c.targetSpDefStage}, ` +
      `target_evasion_stage: ${c.targetEvasionStage}, target_acc_stage: ${c.targetAccStage}, ` +
      `target_hp: ${c.targetHp}, target_max_hp: ${c.targetMaxHp}, ` +
      `target_last_used_move_id: ${opt(c.targetLastUsedMoveId, c.targetLastUsedMoveId)}, ` +
      `target_is_toxic_poisoned: ${optBool(c.targetIsToxicPoisoned)}, target_is_cursed: ${optBool(c.targetIsCursed)}, ` +
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
  throw new Error("gen-cv-m5d2-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cv-m5d2-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cv-m5d2-vectors: ${cases.length} cases`);
