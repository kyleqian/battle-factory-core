#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_viability_m5d1_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckViability.ts's `runCheckViability` (read-only
// import, node --experimental-strip-types — the gen-cbm-preamble-vectors.mjs
// precedent). No value in the emitted file is hand-computed. Deterministic: a
// fixed directed case list plus a small seeded sweep per handler, not
// Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5d-1 only (docs/rust-m5d-checkviability-batching.md §2) — the 13
// effects EFFECT_SLEEP/EFFECT_SPEED_DOWN(+_2)/EFFECT_SPEED_DOWN_HIT/
// EFFECT_TOXIC+EFFECT_LEECH_SEED/EFFECT_PROTECT/EFFECT_PURSUIT/
// EFFECT_HIGH_CRITICAL+EFFECT_BLAZE_KICK+EFFECT_POISON_TAIL/EFFECT_ALWAYS_HIT/
// EFFECT_VITAL_THROW. Every case here uses a move whose effect IS in this
// 13-effect batch: since src/engine/factoryAiCheckViability.ts is verified
// live below to be 122/122 dispatch-complete, its `runCheckViability` output
// for such a move already reflects the real handler logic end to end —
// directly comparable to the Rust port's own M5d-1 handlers.
//
// Usage: node core-rs/tools/gen-cv-m5d1-vectors.mjs   (from any cwd)

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
  "factory_ai_check_viability_m5d1_vectors_gen.rs",
);

const cv = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckViability.ts"));
const { runCheckViability, AI_CHECK_VIABILITY_TABLE_EFFECTS } = cv;
const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { MOVES_BY_ID } = cbm;

// Verify live (not from doc prose) that TS really is 122/122 table-complete
// -- the premise this generator relies on to treat TS's own scored output as
// the handler-inclusive expected value for every M5d-1 move (same premise
// check gen-cv-shell-vectors.mjs makes for the dispatcher shell).
if (AI_CHECK_VIABILITY_TABLE_EFFECTS.size !== 122) {
  throw new Error(
    `gen-cv-m5d1-vectors: expected AI_CHECK_VIABILITY_TABLE_EFFECTS to have 122 entries, found ${AI_CHECK_VIABILITY_TABLE_EFFECTS.size} ` +
      "(this script's whole premise for treating TS's scored output as ground truth)",
  );
}

// The 13 effects this batch covers (batching doc §2 "M5d-1"), TS dispatch
// source order (factoryAiCheckViability.ts:5490-5646) -- mirrors Rust's
// CV_HANDLED_EFFECTS_M5D1 exactly (factory_ai_check_viability.rs).
const M5D1_EFFECT_NAMES = new Set([
  "EFFECT_SLEEP", "EFFECT_SPEED_DOWN", "EFFECT_SPEED_DOWN_2", "EFFECT_SPEED_DOWN_HIT",
  "EFFECT_TOXIC", "EFFECT_LEECH_SEED", "EFFECT_PROTECT", "EFFECT_PURSUIT",
  "EFFECT_HIGH_CRITICAL", "EFFECT_BLAZE_KICK", "EFFECT_POISON_TAIL", "EFFECT_ALWAYS_HIT",
  "EFFECT_VITAL_THROW",
]);
if (M5D1_EFFECT_NAMES.size !== 13) {
  throw new Error(`gen-cv-m5d1-vectors: expected exactly 13 M5d-1 effect names, got ${M5D1_EFFECT_NAMES.size}`);
}
for (const name of M5D1_EFFECT_NAMES) {
  if (!AI_CHECK_VIABILITY_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cv-m5d1-vectors: ${name} is not a real AI_CheckViability table effect`);
  }
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use (identical to
// gen-cbm-m5b1-vectors.mjs's own TYPE_IDS). ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};

// --- draw site indices, one per M5d-1 draw kind (test file's own SITE_*
// constants mirror this exactly). ---
const SITE_BY_KIND = {
  "target-faster-tie": 0,
  "speed-down-roll": 1,
  "sleep-roll": 2,
  "pursuit-roll": 3,
  "protect-roll-1": 4,
  "protect-roll-2": 5,
  "toxic-roll-1": 6,
  "toxic-roll-2": 7,
  "toxic-roll-3": 8,
  "high-crit-fallthrough-roll": 9,
  "high-crit-roll": 10,
  "always-hit-roll": 11,
  "vital-throw-midband-roll": 12,
  "vital-throw-roll": 13,
};

function drawFlag(d) {
  if (d.kind === "target-faster-tie") return d.strikesFirst;
  if ("succeeded" in d) return d.succeeded ? 1 : 0;
  if ("jumped" in d) return d.jumped ? 1 : 0;
  if ("jumpedToEnd" in d) return d.jumpedToEnd ? 1 : 0;
  throw new Error(`gen-cv-m5d1-vectors: unrecognized draw shape for kind ${d.kind}`);
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
  if (!move) throw new Error(`gen-cv-m5d1-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5D1_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cv-m5d1-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5d-1 batch`,
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
    throw new Error(`gen-cv-m5d1-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 8) {
    throw new Error(`gen-cv-m5d1-vectors: case ${label} produced ${result.draws.length} draws, expected <=8`);
  }

  const draws = result.draws.map((d) => {
    const site = SITE_BY_KIND[d.kind];
    if (site === undefined) throw new Error(`gen-cv-m5d1-vectors: case ${label} unrecognized draw kind ${d.kind}`);
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
    attackerIsFirstTurn: attacker.isFirstTurn,
    attackerAccStage: attacker.accStage,
    attackerHp: attacker.hp,
    attackerMaxHp: attacker.maxHp,
    attackerMoves: attacker.moves ?? null,
    attackerIsInfatuated: attacker.isInfatuated ?? null,
    attackerIsLeechSeeded: attacker.isLeechSeeded ?? null,
    attackerHasYawn: attacker.hasYawn ?? null,
    attackerProtectUses: attacker.protectUses ?? null,
    targetSpeed: target.speed,
    targetSpeedStage: target.speedStage,
    targetTypes: [TYPE_IDS[target.types[0]], TYPE_IDS[target.types[1]]],
    targetEvasionStage: target.evasionStage,
    targetHp: target.hp,
    targetMaxHp: target.maxHp,
    targetLastUsedMoveId: target.lastUsedMoveId ?? null,
    targetKnownMoves: target.knownMoves ?? null,
    targetIsToxicPoisoned: target.isToxicPoisoned ?? null,
    targetIsCursed: target.isCursed ?? null,
    targetHasPerishSong: target.hasPerishSong ?? null,
    targetIsInfatuated: target.isInfatuated ?? null,
    targetIsLeechSeeded: target.isLeechSeeded ?? null,
    targetHasYawn: target.hasYawn ?? null,
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

// === EFFECT_SLEEP: runCvSleep (test:229-278) ================================

const MOVE_SPORE = 147;
const MOVE_DREAM_EATER = 138;
const MOVE_NIGHTMARE = 171;
const MOVE_TACKLE = 33;

pushCase("sleep_no_known_moves", MOVE_SPORE, RNG_SEED, {}, {});
pushCase("sleep_known_moves_no_dream_eater_or_nightmare", MOVE_SPORE, RNG_SEED, {}, { knownMoves: [MOVE_TACKLE, 0, 0, 0] });
pushCase("sleep_dream_eater_roll_jumps", MOVE_SPORE, 1, {}, { knownMoves: [MOVE_DREAM_EATER, 0, 0, 0] });
pushCase("sleep_dream_eater_roll_succeeds", MOVE_SPORE, RNG_SEED, {}, { knownMoves: [MOVE_DREAM_EATER, 0, 0, 0] });
pushCase("sleep_nightmare_roll", MOVE_SPORE, RNG_SEED, {}, { knownMoves: [0, MOVE_NIGHTMARE, 0, 0] });
for (let i = 0; i < 6; i += 1) {
  pushCase(`sleep_sweep_${i}`, MOVE_SPORE, 1_000 + i * 7919, {}, { knownMoves: [MOVE_DREAM_EATER, 0, 0, 0] });
}

// === EFFECT_SPEED_DOWN(+_2): runCvSpeedDown (test:665-791) ===================

const MOVE_STRING_SHOT = 81;
const MOVE_SCARY_FACE = 184;

pushCase("speed_down_target_not_faster", MOVE_STRING_SHOT, RNG_SEED, { speed: 100 }, { speed: 50 });
pushCase("speed_down_target_faster_roll_fails", MOVE_STRING_SHOT, 1, { speed: 50 }, { speed: 150 });
pushCase("speed_down_target_faster_roll_succeeds", MOVE_STRING_SHOT, RNG_SEED, { speed: 50 }, { speed: 150 });
pushCase("speed_down_tie", MOVE_STRING_SHOT, RNG_SEED, { speed: 100 }, { speed: 100 });
pushCase("speed_down_2_scary_face", MOVE_SCARY_FACE, RNG_SEED, { speed: 50 }, { speed: 150 });
for (let i = 0; i < 6; i += 1) {
  pushCase(`speed_down_sweep_${i}`, MOVE_STRING_SHOT, 2_000 + i * 6221, { speed: 40 + i * 13 }, { speed: 120 });
}

// === EFFECT_SPEED_DOWN_HIT: runCvSpeedDownFromChance (test:4612-4776) =======

const MOVE_ICY_WIND = 196;
const MOVE_ROCK_TOMB = 317;
const MOVE_MUD_SHOT = 341;
const MOVE_BUBBLEBEAM = 61;
const MOVE_CONSTRICT = 132;
const MOVE_BUBBLE = 145;

pushCase("speed_down_hit_icy_wind_delegates", MOVE_ICY_WIND, RNG_SEED, { speed: 50 }, { speed: 150 });
pushCase("speed_down_hit_rock_tomb_delegates", MOVE_ROCK_TOMB, RNG_SEED, { speed: 50 }, { speed: 150 });
pushCase("speed_down_hit_mud_shot_delegates", MOVE_MUD_SHOT, RNG_SEED, { speed: 100 }, { speed: 50 });
pushCase("speed_down_hit_bubblebeam_not_delegated", MOVE_BUBBLEBEAM, RNG_SEED, { speed: 50 }, { speed: 150 });
pushCase("speed_down_hit_constrict_not_delegated", MOVE_CONSTRICT, RNG_SEED, { speed: 50 }, { speed: 150 });
pushCase("speed_down_hit_bubble_not_delegated", MOVE_BUBBLE, RNG_SEED, { speed: 50 }, { speed: 150 });

// === EFFECT_TOXIC+EFFECT_LEECH_SEED: runCvToxic (test:562-614) ==============

const MOVE_TOXIC = 92;
const MOVE_LEECH_SEED = 73;
const MOVE_PROTECT = 182;

pushCase("toxic_no_attacking_move_no_setup_partner", MOVE_TOXIC, RNG_SEED, { moves: [0, 0, 0, 0] }, { hp: 100, maxHp: 100 });
pushCase("toxic_attacking_move_both_hp_high", MOVE_TOXIC, RNG_SEED, { moves: [MOVE_TACKLE, 0, 0, 0], hp: 100, maxHp: 100 }, { hp: 100, maxHp: 100 });
pushCase("toxic_attacking_move_attacker_low_hp_roll_fails", MOVE_TOXIC, 1, { moves: [MOVE_TACKLE, 0, 0, 0], hp: 40, maxHp: 100 }, { hp: 100, maxHp: 100 });
pushCase("toxic_attacking_move_attacker_low_hp_roll_succeeds", MOVE_TOXIC, RNG_SEED, { moves: [MOVE_TACKLE, 0, 0, 0], hp: 40, maxHp: 100 }, { hp: 100, maxHp: 100 });
pushCase("toxic_attacking_move_target_low_hp_roll_fails", MOVE_TOXIC, 1, { moves: [MOVE_TACKLE, 0, 0, 0], hp: 100, maxHp: 100 }, { hp: 40, maxHp: 100 });
pushCase("toxic_attacking_move_both_low_hp", MOVE_TOXIC, 1, { moves: [MOVE_TACKLE, 0, 0, 0], hp: 40, maxHp: 100 }, { hp: 40, maxHp: 100 });
pushCase("toxic_setup_partner_roll_fails", MOVE_TOXIC, 1, { moves: [MOVE_PROTECT, 0, 0, 0] }, { hp: 100, maxHp: 100 });
pushCase("toxic_setup_partner_roll_succeeds", MOVE_TOXIC, RNG_SEED, { moves: [MOVE_PROTECT, 0, 0, 0] }, { hp: 100, maxHp: 100 });
pushCase("toxic_attacking_and_setup_partner_all_low_hp", MOVE_TOXIC, RNG_SEED, { moves: [MOVE_TACKLE, MOVE_PROTECT, 0, 0], hp: 40, maxHp: 100 }, { hp: 40, maxHp: 100 });
pushCase("leech_seed_attacking_move_both_low_hp", MOVE_LEECH_SEED, RNG_SEED, { moves: [MOVE_TACKLE, 0, 0, 0], hp: 40, maxHp: 100 }, { hp: 40, maxHp: 100 });
for (let i = 0; i < 6; i += 1) {
  pushCase(
    `toxic_sweep_${i}`,
    MOVE_TOXIC,
    3_000 + i * 5303,
    { moves: [MOVE_TACKLE, MOVE_PROTECT, 0, 0], hp: 20 + i * 9, maxHp: 100 },
    { hp: 30 + i * 11, maxHp: 100 },
  );
}

// === EFFECT_PROTECT: runCvProtect (test:615-664) ============================

const MOVE_RECOVER = 105;
const MOVE_DEFENSE_CURL = 111;
const MOVE_LOCK_ON = 199;

pushCase("protect_early_infatuated", MOVE_PROTECT, RNG_SEED, { isInfatuated: true }, {});
pushCase("protect_early_leech_seeded_attacker", MOVE_PROTECT, RNG_SEED, { isLeechSeeded: true }, {});
pushCase("protect_early_yawn_attacker", MOVE_PROTECT, RNG_SEED, { hasYawn: true }, {});
pushCase(
  "protect_early_target_history_restore_hp",
  MOVE_PROTECT,
  RNG_SEED,
  { moves: [MOVE_RECOVER, 0, 0, 0] },
  { knownMoves: [MOVE_RECOVER, 0, 0, 0] },
);
pushCase(
  "protect_early_target_history_defense_curl",
  MOVE_PROTECT,
  RNG_SEED,
  { moves: [MOVE_DEFENSE_CURL, 0, 0, 0] },
  { knownMoves: [MOVE_DEFENSE_CURL, 0, 0, 0] },
);
pushCase(
  "protect_early_target_history_positional_gate_blocks",
  MOVE_PROTECT,
  1,
  { moves: [0, 0, 0, 0] },
  { knownMoves: [MOVE_RECOVER, 0, 0, 0], lastUsedMoveId: MOVE_LOCK_ON },
);
pushCase(
  "protect_early_last_move_lock_on_minus2",
  MOVE_PROTECT,
  RNG_SEED,
  { isInfatuated: true },
  { lastUsedMoveId: MOVE_LOCK_ON },
);
pushCase("protect_normal_base_gate_true_roll1_fails", MOVE_PROTECT, 1, {}, {});
pushCase("protect_normal_base_gate_true_roll1_succeeds", MOVE_PROTECT, RNG_SEED, {}, {});
pushCase(
  "protect_normal_base_gate_false_last_move_lock_on",
  MOVE_PROTECT,
  RNG_SEED,
  {},
  { lastUsedMoveId: MOVE_LOCK_ON },
);
pushCase(
  "protect_normal_protect_uses_nonzero",
  MOVE_PROTECT,
  RNG_SEED,
  { protectUses: 2 },
  {},
);
for (let i = 0; i < 6; i += 1) {
  pushCase(
    `protect_sweep_${i}`,
    MOVE_PROTECT,
    4_000 + i * 4177,
    { protectUses: i % 2 },
    { isToxicPoisoned: i % 2 === 0, lastUsedMoveId: i % 3 === 0 ? MOVE_LOCK_ON : MOVE_TACKLE },
  );
}

// === EFFECT_PURSUIT: runCvPursuit (test:792-886) ============================

const MOVE_PURSUIT = 228;

pushCase("pursuit_first_turn_1", MOVE_PURSUIT, RNG_SEED, { isFirstTurn: 1 }, { types: ["TYPE_GHOST", "TYPE_GHOST"] });
pushCase("pursuit_first_turn_2", MOVE_PURSUIT, RNG_SEED, { isFirstTurn: 2 }, { types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] });
pushCase("pursuit_not_ghost_or_psychic", MOVE_PURSUIT, RNG_SEED, { isFirstTurn: 0 }, { types: ["TYPE_NORMAL", "TYPE_WATER"] });
pushCase("pursuit_ghost_type1_roll_fails", MOVE_PURSUIT, 1, { isFirstTurn: 0 }, { types: ["TYPE_GHOST", "TYPE_NORMAL"] });
pushCase("pursuit_ghost_type1_roll_succeeds", MOVE_PURSUIT, RNG_SEED, { isFirstTurn: 0 }, { types: ["TYPE_GHOST", "TYPE_NORMAL"] });
pushCase("pursuit_psychic_type2_roll", MOVE_PURSUIT, RNG_SEED, { isFirstTurn: 0 }, { types: ["TYPE_NORMAL", "TYPE_PSYCHIC"] });
for (let i = 0; i < 6; i += 1) {
  pushCase(
    `pursuit_sweep_${i}`,
    MOVE_PURSUIT,
    5_000 + i * 3989,
    { isFirstTurn: 0 },
    { types: [i % 2 === 0 ? "TYPE_GHOST" : "TYPE_NORMAL", "TYPE_WATER"] },
  );
}

// === EFFECT_HIGH_CRITICAL+EFFECT_BLAZE_KICK+EFFECT_POISON_TAIL: runCvHighCrit
// (test:887-1157) — empirically classify candidate matchups into the 3
// branch shapes (deterministic / skip-first-roll / fallthrough) by
// inspecting TS's own returned draws, rather than hand-deriving the type
// chart. ===

const MOVE_KARATE_CHOP = 2; // TYPE_FIGHTING
const MOVE_SLASH = 163; // TYPE_NORMAL
const MOVE_BLAZE_KICK = 299; // TYPE_FIRE
const MOVE_POISON_TAIL = 342; // TYPE_POISON

function classifyHighCrit(moveId, attackerTypes, targetTypes) {
  const result = runCheckViability({
    rng: { value: RNG_SEED, calls: 0 },
    moveId,
    attacker: { ...NEUTRAL_BATTLER, types: attackerTypes },
    target: { ...NEUTRAL_BATTLER, types: targetTypes },
    drawOrdinalStart: 1,
    reasonPrefix: "classify",
  });
  if (result.kind !== "scored") throw new Error("gen-cv-m5d1-vectors: classifyHighCrit hit the barrier");
  if (result.draws.length === 0) return "deterministic";
  if (result.draws.length === 1 && result.draws[0].kind === "high-crit-roll") return "skip-first-roll";
  return "fallthrough";
}

const HIGH_CRIT_CANDIDATES = [
  [MOVE_KARATE_CHOP, ["TYPE_FIGHTING", "TYPE_FIGHTING"], ["TYPE_GHOST", "TYPE_GHOST"]],
  [MOVE_KARATE_CHOP, ["TYPE_FIGHTING", "TYPE_FIGHTING"], ["TYPE_POISON", "TYPE_BUG"]],
  [MOVE_KARATE_CHOP, ["TYPE_FIGHTING", "TYPE_FIGHTING"], ["TYPE_ROCK", "TYPE_ROCK"]],
  [MOVE_SLASH, ["TYPE_NORMAL", "TYPE_NORMAL"], ["TYPE_GHOST", "TYPE_GHOST"]],
  [MOVE_SLASH, ["TYPE_NORMAL", "TYPE_NORMAL"], ["TYPE_ROCK", "TYPE_STEEL"]],
  [MOVE_SLASH, ["TYPE_NORMAL", "TYPE_NORMAL"], ["TYPE_NORMAL", "TYPE_NORMAL"]],
  [MOVE_BLAZE_KICK, ["TYPE_FIRE", "TYPE_FIRE"], ["TYPE_GRASS", "TYPE_BUG"]],
  [MOVE_BLAZE_KICK, ["TYPE_FIRE", "TYPE_FIRE"], ["TYPE_FIRE", "TYPE_WATER"]],
  [MOVE_POISON_TAIL, ["TYPE_POISON", "TYPE_POISON"], ["TYPE_GRASS", "TYPE_GRASS"]],
  [MOVE_POISON_TAIL, ["TYPE_POISON", "TYPE_POISON"], ["TYPE_STEEL", "TYPE_STEEL"]],
];

const highCritByShape = { deterministic: [], "skip-first-roll": [], fallthrough: [] };
for (const [moveId, atkTypes, tgtTypes] of HIGH_CRIT_CANDIDATES) {
  const shape = classifyHighCrit(moveId, atkTypes, tgtTypes);
  highCritByShape[shape].push([moveId, atkTypes, tgtTypes]);
}
for (const shape of ["deterministic", "skip-first-roll", "fallthrough"]) {
  if (highCritByShape[shape].length === 0) {
    throw new Error(`gen-cv-m5d1-vectors: no HIGH_CRIT_CANDIDATES entry landed in the "${shape}" branch shape`);
  }
}

{
  const [moveId, atkTypes, tgtTypes] = highCritByShape.deterministic[0];
  pushCase("high_crit_deterministic", moveId, RNG_SEED, { types: atkTypes }, { types: tgtTypes });
}
{
  const [moveId, atkTypes, tgtTypes] = highCritByShape["skip-first-roll"][0];
  pushCase("high_crit_skip_first_roll_fails", moveId, 1, { types: atkTypes }, { types: tgtTypes });
  pushCase("high_crit_skip_first_roll_succeeds", moveId, RNG_SEED, { types: atkTypes }, { types: tgtTypes });
}
{
  const [moveId, atkTypes, tgtTypes] = highCritByShape.fallthrough[0];
  // Search a small seed range for one rng value landing in each of the
  // fallthrough branch's own two sub-shapes (1 draw vs 2 draws).
  let oneDraw = null;
  let twoDraw = null;
  for (let seed = 1; seed < 5000 && (!oneDraw || !twoDraw); seed += 1) {
    const result = runCheckViability({
      rng: { value: seed, calls: 0 },
      moveId,
      attacker: { ...NEUTRAL_BATTLER, types: atkTypes },
      target: { ...NEUTRAL_BATTLER, types: tgtTypes },
      drawOrdinalStart: 1,
      reasonPrefix: "classify",
    });
    if (result.draws.length === 1 && !oneDraw) oneDraw = seed;
    if (result.draws.length === 2 && !twoDraw) twoDraw = seed;
  }
  if (!oneDraw || !twoDraw) {
    throw new Error("gen-cv-m5d1-vectors: could not find both high-crit fallthrough sub-shapes in the seed range");
  }
  pushCase("high_crit_fallthrough_one_draw", moveId, oneDraw, { types: atkTypes }, { types: tgtTypes });
  pushCase("high_crit_fallthrough_two_draws", moveId, twoDraw, { types: atkTypes }, { types: tgtTypes });
}
for (let i = 0; i < 6; i += 1) {
  const [moveId, atkTypes, tgtTypes] = HIGH_CRIT_CANDIDATES[i % HIGH_CRIT_CANDIDATES.length];
  pushCase(`high_crit_sweep_${i}`, moveId, 6_000 + i * 3251, { types: atkTypes }, { types: tgtTypes });
}

// === EFFECT_ALWAYS_HIT: runCvAlwaysHit (test:1158-1290) =====================

const MOVE_SWIFT = 129;

pushCase("always_hit_neither_gate", MOVE_SWIFT, RNG_SEED, { accStage: 6 }, { evasionStage: 6 });
pushCase("always_hit_score_up1_evasion_roll_fails", MOVE_SWIFT, 1, { accStage: 6 }, { evasionStage: 11 });
pushCase("always_hit_score_up1_evasion_roll_succeeds", MOVE_SWIFT, RNG_SEED, { accStage: 6 }, { evasionStage: 11 });
pushCase("always_hit_score_up1_acc_stage", MOVE_SWIFT, RNG_SEED, { accStage: 1 }, { evasionStage: 6 });
pushCase("always_hit2_only_evasion_roll_fails", MOVE_SWIFT, 1, { accStage: 6 }, { evasionStage: 9 });
pushCase("always_hit2_only_evasion_roll_succeeds", MOVE_SWIFT, RNG_SEED, { accStage: 6 }, { evasionStage: 9 });
pushCase("always_hit2_only_acc_stage", MOVE_SWIFT, RNG_SEED, { accStage: 3 }, { evasionStage: 6 });
for (let i = 0; i < 6; i += 1) {
  pushCase(`always_hit_sweep_${i}`, MOVE_SWIFT, 7_000 + i * 2801, { accStage: i % 7 }, { evasionStage: 6 + i });
}

// === EFFECT_VITAL_THROW: runCvVitalThrow (test:1291-1523) ===================

const MOVE_VITAL_THROW = 233;

pushCase("vital_throw_target_faster", MOVE_VITAL_THROW, RNG_SEED, { speed: 50 }, { speed: 150 });
pushCase("vital_throw_tie", MOVE_VITAL_THROW, RNG_SEED, { speed: 100 }, { speed: 100 });
pushCase("vital_throw_user_faster_hp_high", MOVE_VITAL_THROW, RNG_SEED, { speed: 150, hp: 80, maxHp: 100 }, { speed: 50 });
pushCase("vital_throw_user_faster_hp_low_roll_fails", MOVE_VITAL_THROW, 1, { speed: 150, hp: 30, maxHp: 100 }, { speed: 50 });
pushCase("vital_throw_user_faster_hp_low_roll_succeeds", MOVE_VITAL_THROW, RNG_SEED, { speed: 150, hp: 30, maxHp: 100 }, { speed: 50 });
pushCase("vital_throw_midband_jumps", MOVE_VITAL_THROW, 1, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 });
pushCase("vital_throw_midband_falls_through_roll_fails", MOVE_VITAL_THROW, 4, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 });
pushCase("vital_throw_midband_falls_through_roll_succeeds", MOVE_VITAL_THROW, RNG_SEED, { speed: 150, hp: 50, maxHp: 100 }, { speed: 50 });
for (let i = 0; i < 6; i += 1) {
  pushCase(
    `vital_throw_sweep_${i}`,
    MOVE_VITAL_THROW,
    8_000 + i * 6899,
    { speed: 150, hp: 20 + i * 12, maxHp: 100 },
    { speed: 50 },
  );
}

// === emit Rust source ========================================================

function opt(hasValue, value) {
  return hasValue !== null && hasValue !== undefined ? `Some(${value})` : "None";
}
function optArr4(v) {
  return v === null ? "None" : `Some([${v[0]}, ${v[1]}, ${v[2]}, ${v[3]}])`;
}
function optBool(v) {
  return v === null || v === undefined ? "None" : v ? "Some(true)" : "Some(false)";
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cv-m5d1-vectors.mjs — regenerate: node core-rs/tools/gen-cv-m5d1-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckViability.ts's runCheckViability");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One draw's generic (site, ordinal, rng, flag) snapshot. `site` is a");
lines.push("/// 0-based per-batch draw-kind index (see the test file's own `SITE_*`");
lines.push("/// constants); `flag` is the one extra boolean/tri-state field every M5d-1");
lines.push("/// draw kind carries (`succeeded`/`jumped`/`jumpedToEnd` as 0/1, or");
lines.push("/// `strikesFirst` for the shared tie draw, already 0/1/2).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CvM5d1Draw {");
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

lines.push("/// One M5d-1 `run_check_viability` case (batching doc §2 \"M5d-1\"). Only");
lines.push("/// the battler fields this batch's handlers actually read are carried;");
lines.push("/// every other `FactoryAiCheckViabilityBattler` field stays at the test");
lines.push("/// file's own neutral default.");
lines.push("#[derive(Debug, Clone, Copy)]");
lines.push("pub struct CvM5d1Case {");
lines.push("    pub label: &'static str,");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub attacker_speed: u32,");
lines.push("    pub attacker_speed_stage: u8,");
lines.push("    pub attacker_types: [u8; 2],");
lines.push("    pub attacker_is_first_turn: u8,");
lines.push("    pub attacker_acc_stage: u8,");
lines.push("    pub attacker_hp: i32,");
lines.push("    pub attacker_max_hp: i32,");
lines.push("    pub attacker_moves: Option<[u16; 4]>,");
lines.push("    pub attacker_is_infatuated: Option<bool>,");
lines.push("    pub attacker_is_leech_seeded: Option<bool>,");
lines.push("    pub attacker_has_yawn: Option<bool>,");
lines.push("    pub attacker_protect_uses: Option<u8>,");
lines.push("    pub target_speed: u32,");
lines.push("    pub target_speed_stage: u8,");
lines.push("    pub target_types: [u8; 2],");
lines.push("    pub target_evasion_stage: u8,");
lines.push("    pub target_hp: i32,");
lines.push("    pub target_max_hp: i32,");
lines.push("    pub target_last_used_move_id: Option<u16>,");
lines.push("    pub target_known_moves: Option<[u16; 4]>,");
lines.push("    pub target_is_toxic_poisoned: Option<bool>,");
lines.push("    pub target_is_cursed: Option<bool>,");
lines.push("    pub target_has_perish_song: Option<bool>,");
lines.push("    pub target_is_infatuated: Option<bool>,");
lines.push("    pub target_is_leech_seeded: Option<bool>,");
lines.push("    pub target_has_yawn: Option<bool>,");
lines.push("    pub fallback: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_func_result_after: Option<u8>,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CvM5d1Draw; 8],");
lines.push("}");
lines.push(`pub static CV_M5D1_CASES: [CvM5d1Case; ${cases.length}] = [`);
for (const c of cases) {
  const drawsStr = c.draws
    .map(
      (d) =>
        `CvM5d1Draw { site: ${d.site}, ordinal: ${d.ordinal}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, flag: ${d.flag} }`,
    )
    .join(", ");
  lines.push(`    // ${c.label}`);
  lines.push(
    `    CvM5d1Case { label: ${JSON.stringify(c.label)}, move_id: ${c.moveId}, rng_value: ${c.rngValue}, ` +
      `attacker_speed: ${c.attackerSpeed}, attacker_speed_stage: ${c.attackerSpeedStage}, ` +
      `attacker_types: [${c.attackerTypes[0]}, ${c.attackerTypes[1]}], attacker_is_first_turn: ${c.attackerIsFirstTurn}, ` +
      `attacker_acc_stage: ${c.attackerAccStage}, attacker_hp: ${c.attackerHp}, attacker_max_hp: ${c.attackerMaxHp}, ` +
      `attacker_moves: ${optArr4(c.attackerMoves)}, attacker_is_infatuated: ${optBool(c.attackerIsInfatuated)}, ` +
      `attacker_is_leech_seeded: ${optBool(c.attackerIsLeechSeeded)}, attacker_has_yawn: ${optBool(c.attackerHasYawn)}, ` +
      `attacker_protect_uses: ${opt(c.attackerProtectUses, c.attackerProtectUses)}, ` +
      `target_speed: ${c.targetSpeed}, target_speed_stage: ${c.targetSpeedStage}, ` +
      `target_types: [${c.targetTypes[0]}, ${c.targetTypes[1]}], target_evasion_stage: ${c.targetEvasionStage}, ` +
      `target_hp: ${c.targetHp}, target_max_hp: ${c.targetMaxHp}, ` +
      `target_last_used_move_id: ${opt(c.targetLastUsedMoveId, c.targetLastUsedMoveId)}, ` +
      `target_known_moves: ${optArr4(c.targetKnownMoves)}, ` +
      `target_is_toxic_poisoned: ${optBool(c.targetIsToxicPoisoned)}, target_is_cursed: ${optBool(c.targetIsCursed)}, ` +
      `target_has_perish_song: ${optBool(c.targetHasPerishSong)}, target_is_infatuated: ${optBool(c.targetIsInfatuated)}, ` +
      `target_is_leech_seeded: ${optBool(c.targetIsLeechSeeded)}, target_has_yawn: ${optBool(c.targetHasYawn)}, ` +
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
  throw new Error("gen-cv-m5d1-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cv-m5d1-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cv-m5d1-vectors: ${cases.length} cases`);
