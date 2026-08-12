#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_bad_move_m5b2_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckBadMove.ts's `runCheckBadMovePreamble` (read-only
// import, node --experimental-strip-types), mirroring
// gen-cbm-m5b1-vectors.mjs's conventions exactly. No value in the emitted
// file is hand-computed. Deterministic: a fixed directed case list plus a
// sweep seeded from a fixed GbaRng stream, not Math.random/Date.now, so
// reruns are byte-identical.
//
// Scope: M5b-2 only (docs/rust-m5b-checkbadmove-batching.md §2) -- the
// stat-DOWN sextet (Speed/Attack/Defense/SpDef/Acc/Evasion, each `+_2`),
// Toxic/Poison, Roar, Sleep, Paralyze, Confuse/Swagger/Flatter, OHKO, Leech
// Seed, Fake Out, Will-O-Wisp, Knock Off/Trick, Explosion, Dream Eater,
// Special Attack Down (`+_2`), Attract, and Spit Up/Swallow (33 effects,
// M5B2_EFFECT_NAMES below). Every case uses a move whose effect IS in this
// batch, same premise as gen-cbm-m5b1-vectors.mjs (TS is 109/109 ported, so
// its own scored output already reflects the real handler logic end to
// end -- directly comparable to the Rust port).
//
// EFFECT_ACCURACY_DOWN_2 has no TS export and no real Gen-3 move (verified
// against src/data/gen/moves.json and factoryAiCheckBadMove.ts's own
// exports -- only runCbmAccUp/runCbmSpAtkDown are exported), so it is
// hand-test-only on the Rust side (native test acc_down_2_vestigial_
// handler_direct_only) and NOT covered here, mirroring how the TS suite
// itself covers it. EFFECT_SPECIAL_ATTACK_DOWN(+_2) similarly has no real
// move, but TS DOES export `runCbmSpAtkDown` (:3404) for exactly this case
// -- covered below by calling it directly instead of going through
// runCheckBadMovePreamble.
//
// Usage: node core-rs/tools/gen-cbm-m5b2-vectors.mjs   (from any cwd)

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
  "factory_ai_check_bad_move_m5b2_vectors_gen.rs",
);

const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { runCheckBadMovePreamble, unportedCheckBadMoveTableEffects, AI_CHECK_BAD_MOVE_TABLE_EFFECTS, runCbmSpAtkDown } =
  cbm;
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

if (unportedCheckBadMoveTableEffects().length !== 0) {
  throw new Error(
    "gen-cbm-m5b2-vectors: expected src/engine/factoryAiCheckBadMove.ts to be 109/109 ported " +
      "(this script's whole premise for treating its scored output as ground truth)",
  );
}

// The 33 effects this batch covers, TS dispatch source order
// (factoryAiCheckBadMove.ts:1813-2072,2122-2258,2287-2339,2446-2455,
// 2534-2584) -- mirrors Rust's CBM_HANDLED_EFFECTS_M5B2 exactly
// (factory_ai_check_bad_move.rs).
const M5B2_EFFECT_NAMES = new Set([
  "EFFECT_SPEED_DOWN", "EFFECT_SPEED_DOWN_2", "EFFECT_ATTACK_DOWN", "EFFECT_ATTACK_DOWN_2",
  "EFFECT_DEFENSE_DOWN", "EFFECT_DEFENSE_DOWN_2", "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_SPECIAL_DEFENSE_DOWN_2",
  "EFFECT_ACCURACY_DOWN", "EFFECT_ACCURACY_DOWN_2", "EFFECT_EVASION_DOWN", "EFFECT_EVASION_DOWN_2",
  "EFFECT_TOXIC", "EFFECT_POISON", "EFFECT_ROAR", "EFFECT_SLEEP", "EFFECT_PARALYZE", "EFFECT_CONFUSE",
  "EFFECT_SWAGGER", "EFFECT_FLATTER", "EFFECT_OHKO", "EFFECT_LEECH_SEED", "EFFECT_FAKE_OUT", "EFFECT_WILL_O_WISP",
  "EFFECT_KNOCK_OFF", "EFFECT_TRICK", "EFFECT_EXPLOSION", "EFFECT_DREAM_EATER",
  "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN_2", "EFFECT_ATTRACT", "EFFECT_SPIT_UP", "EFFECT_SWALLOW",
]);
if (M5B2_EFFECT_NAMES.size !== 33) {
  throw new Error(`gen-cbm-m5b2-vectors: expected exactly 33 M5b-2 effect names, got ${M5B2_EFFECT_NAMES.size}`);
}
for (const name of M5B2_EFFECT_NAMES) {
  if (!AI_CHECK_BAD_MOVE_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cbm-m5b2-vectors: ${name} is not a real AI_CheckBadMove table effect`);
  }
}

// --- ability ids: same source gen_tables::SpeciesRow.abilities uses
// (src/data/gen/ability-item-hooks.json .universes.abilities). ---
const abilityItemHooks = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "ability-item-hooks.json"), "utf8"),
);
const abilityIdByName = new Map(abilityItemHooks.universes.abilities.map((a) => [a.name, a.id]));
function abilityId(name) {
  if (name === null || name === undefined) return null;
  if (!abilityIdByName.has(name)) throw new Error(`gen-cbm-m5b2-vectors: unknown ability ${name}`);
  return abilityIdByName.get(name);
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use. ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};

// --- gender: FactoryAiMonGender ("MON_MALE"/"MON_FEMALE"/"MON_GENDERLESS"),
// encoded 0/1/2 to match Rust's FactoryAiMonGender repr(u8). ---
const GENDER_IDS = { MON_MALE: 0, MON_FEMALE: 1, MON_GENDERLESS: 2 };
function genderId(g) {
  return g === null || g === undefined ? null : GENDER_IDS[g];
}

const scoredCases = [];
const spAtkDownCases = [];

function target(species, types, knownAbilityName, realAbilityName, overrides = {}) {
  return {
    species,
    types,
    knownAbility: knownAbilityName,
    realAbility: realAbilityName,
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    ...overrides,
  };
}

function attacker(overrides = {}) {
  return { atkStage: 6, defStage: 6, ...overrides };
}

function drawSite(reason) {
  if (reason.endsWith("-negates-type")) return 0; // NegatesType
  if (reason.endsWith("-soundproof")) return 1; // Soundproof
  if (reason.endsWith("-high-risk-ability")) return 2; // HighRiskForDamageAbility
  if (reason.endsWith("-magnitude-levitate")) return 3; // MagnitudeLevitate
  if (reason.endsWith("-speed-down")) return 4; // SpeedDownSharedTail
  if (reason.endsWith("-attack-down-hyper-cutter")) return 5; // AttackDownHyperCutter
  if (reason.endsWith("-attack-down-shared-tail")) return 6; // AttackDownSharedTail
  if (reason.endsWith("-defense-down-shared-tail")) return 7; // DefenseDownSharedTail
  if (reason.endsWith("-sp-def-down-shared-tail")) return 8; // SpDefDownSharedTail
  if (reason.endsWith("-acc-down-keen-eye")) return 9; // AccDownKeenEye
  if (reason.endsWith("-acc-down-shared-tail")) return 10; // AccDownSharedTail
  if (reason.endsWith("-evasion-down-shared-tail")) return 11; // EvasionDownSharedTail
  if (reason.endsWith("-sp-atk-down-shared-tail")) return 12; // SpAtkDownSharedTail
  if (reason.endsWith("-toxic-immunity")) return 13; // ToxicImmunity
  if (reason.endsWith("-sleep-ability")) return 14; // SleepAbility
  if (reason.endsWith("-paralyze-ability")) return 15; // ParalyzeAbility
  if (reason.endsWith("-confuse-ability")) return 16; // ConfuseAbility
  if (reason.endsWith("-one-hit-ko-ability")) return 17; // OneHitKoAbility
  if (reason.endsWith("-will-o-wisp-ability")) return 18; // WillOWispAbility
  if (reason.endsWith("-roar-ability")) return 19; // RoarAbility
  if (reason.endsWith("-trick-and-knock-off-ability")) return 20; // TrickAndKnockOffAbility
  if (reason.endsWith("-explosion-ability")) return 21; // ExplosionAbility
  if (reason.endsWith("-attract-ability")) return 22; // AttractAbility
  throw new Error(`gen-cbm-m5b2-vectors: unrecognized draw reason ${reason}`);
}

function pushCase(label, moveId, t, atk, rngValue) {
  const move = cbm.MOVES_BY_ID.get(moveId);
  if (!move) throw new Error(`gen-cbm-m5b2-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5B2_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cbm-m5b2-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5b-2 batch`,
    );
  }
  const result = runCheckBadMovePreamble({
    rng: { value: rngValue, calls: 0 },
    moveId,
    target: t,
    attacker: atk,
    drawOrdinalStart: 1,
    reasonPrefix: "vec",
  });
  if (result.kind !== "scored") {
    throw new Error(`gen-cbm-m5b2-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 3) {
    throw new Error(`gen-cbm-m5b2-vectors: case ${label} produced ${result.draws.length} draws, expected <=3`);
  }
  const known = abilityId(t.knownAbility);
  const draws = result.draws.map((d) => ({
    ordinal: d.ordinal,
    site: drawSite(d.reason),
    beforeValue: d.before.value,
    beforeCalls: d.before.calls,
    afterValue: d.after.value,
    afterCalls: d.after.calls,
    rawRngValue: d.rawRngValue,
    randomValue: d.randomValue,
    guessedAbility: abilityId(d.guessedAbility),
  }));
  while (draws.length < 3) {
    draws.push({
      ordinal: 0, site: 0, beforeValue: 0, beforeCalls: 0, afterValue: 0, afterCalls: 0,
      rawRngValue: 0, randomValue: 0, guessedAbility: 0,
    });
  }
  scoredCases.push({
    label,
    moveId,
    rngValue,
    species: t.species,
    types: [TYPE_IDS[t.types[0]], TYPE_IDS[t.types[1]]],
    hasKnownAbility: known !== null,
    knownAbility: known ?? 0,
    realAbility: abilityId(t.realAbility),
    targetSpeedStage: t.speedStage,
    targetAtkStage: t.atkStage,
    targetDefStage: t.defStage,
    targetSpDefStage: t.spDefStage,
    targetAccStage: t.accStage ?? null,
    targetEvasionStage: t.evasionStage ?? null,
    targetSpAtkStage: t.spAtkStage ?? null,
    targetHasAnyStatus: t.hasAnyStatus ?? null,
    targetSafeguardUp: t.safeguardUp ?? null,
    targetIsConfused: t.isConfused ?? null,
    targetIsLeechSeeded: t.isLeechSeeded ?? null,
    targetIsAsleep: t.isAsleep ?? null,
    targetIsInfatuated: t.isInfatuated ?? null,
    targetLevel: t.level ?? null,
    targetGender: genderId(t.gender),
    targetUsablePartyMons: t.usablePartyMons ?? null,
    attackerLevel: atk.level ?? null,
    attackerIsFirstTurn: atk.isFirstTurn ?? null,
    attackerUsablePartyMons: atk.usablePartyMons ?? null,
    attackerStockpileCount: atk.stockpileCount ?? null,
    attackerGender: genderId(atk.gender),
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedDrawCount: result.draws.length,
    draws,
    expectedScoreDelta: result.scoreDelta,
  });
}

// runCbmSpAtkDown direct-call cases (EFFECT_SPECIAL_ATTACK_DOWN(+_2), no
// real move -- TS exports this handler for exactly this reason, :3404).
function pushSpAtkDownCase(label, t, rngValue, ordinal) {
  const result = runCbmSpAtkDown(t, { value: rngValue, calls: 0 }, ordinal, "vec-sp-atk-down");
  if (result.draws.length > 1) {
    throw new Error(`gen-cbm-m5b2-vectors: sp-atk-down case ${label} produced ${result.draws.length} draws, expected <=1`);
  }
  const known = abilityId(t.knownAbility);
  const draw = result.draws[0]
    ? {
      ordinal: result.draws[0].ordinal,
      site: drawSite(result.draws[0].reason),
      beforeValue: result.draws[0].before.value,
      beforeCalls: result.draws[0].before.calls,
      afterValue: result.draws[0].after.value,
      afterCalls: result.draws[0].after.calls,
      rawRngValue: result.draws[0].rawRngValue,
      randomValue: result.draws[0].randomValue,
      guessedAbility: abilityId(result.draws[0].guessedAbility),
    }
    : { ordinal: 0, site: 0, beforeValue: 0, beforeCalls: 0, afterValue: 0, afterCalls: 0, rawRngValue: 0, randomValue: 0, guessedAbility: 0 };
  spAtkDownCases.push({
    label,
    rngValue,
    ordinal,
    species: t.species,
    hasKnownAbility: known !== null,
    knownAbility: known ?? 0,
    realAbility: abilityId(t.realAbility),
    spAtkStage: t.spAtkStage ?? null,
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedDrawCount: result.draws.length,
    draw,
    expectedScoreDelta: result.scoreDelta,
  });
}

const RNG_SEED = 249_678_687; // tests/factoryAiCheckBadMove.test.ts:1541, same convention as gen-cbm-m5b1-vectors.mjs.
const SHUCKLE = 213; // single ability Sturdy: zero-RNG short-circuit.
const MAROWAK = 105; // Rock Head / Lightning Rod: ambiguous, neither blocks any M5b-2 gate.
const NINJASK = 302; // single ability Speed Boost.
const POLIWAG = 60; // Water Absorb / Damp: ambiguous, Damp blocks Explosion.
const rngStream = new GbaRng(0x1357_9bdf);

// === stat-DOWN sextet (TS :796-938,859-873, dispatch :1813-2059, ===========
// test.ts:2042-2484) ===========================================================

const STAT_DOWN_SHUCKLE_BASE = [SHUCKLE, ["TYPE_ROCK", "TYPE_BUG"]];

// Speed Down (EFFECT_SPEED_DOWN/_2): MIN_STAT_STAGE, Speed Boost zero-RNG
// gate, shared-tail blocking/non-blocking, ambiguous-species sweep.
pushCase("speed_down_min_stage", 81 /* String Shot */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { speedStage: 0 }), attacker(), RNG_SEED);
pushCase("speed_down_speed_boost_gate", 81, target(NINJASK, ["TYPE_BUG", "TYPE_FLYING"], null, "ABILITY_SPEED_BOOST"), attacker(), RNG_SEED);
pushCase("speed_down_clear_body_blocks", 178 /* Cotton Spore */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_CLEAR_BODY", "ABILITY_CLEAR_BODY"), attacker(), RNG_SEED);
pushCase("speed_down_white_smoke_blocks", 184 /* Scary Face */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_WHITE_SMOKE", "ABILITY_WHITE_SMOKE"), attacker(), RNG_SEED);
pushCase("speed_down_ambiguous_draws", 81, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
for (let stage = 0; stage <= 12; stage += 3) {
  rngStream.next();
  pushCase(`speed_down_sweep_stage${stage}`, 178, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { speedStage: stage }), attacker(), rngStream.rngValue);
}

// Attack Down (EFFECT_ATTACK_DOWN/_2): MIN_STAT_STAGE, Hyper Cutter,
// shared-tail, both-draw ambiguous species.
pushCase("attack_down_min_stage", 45 /* Growl */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: 0 }), attacker(), RNG_SEED);
pushCase("attack_down_hyper_cutter_blocks", 45, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_HYPER_CUTTER", "ABILITY_HYPER_CUTTER"), attacker(), RNG_SEED);
pushCase("attack_down_clear_body_blocks_tail", 204 /* Charm */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_CLEAR_BODY", "ABILITY_CLEAR_BODY"), attacker(), RNG_SEED);
pushCase("attack_down_ambiguous_draws_both_sites", 45, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
for (let i = 0; i < 4; i += 1) {
  rngStream.next();
  const species = i % 2 === 0 ? MAROWAK : 171 /* LANTURN */;
  pushCase(`attack_down_sweep_i${i}`, i % 2 === 0 ? 45 : 297 /* Featherdance */, target(species, ["TYPE_NORMAL", "TYPE_NORMAL"], null, species === MAROWAK ? "ABILITY_ROCK_HEAD" : "ABILITY_VOLT_ABSORB"), attacker(), rngStream.rngValue);
}

// Defense Down / SpDef Down (shared tail, no own gate beyond MIN_STAT_STAGE).
pushCase("defense_down_min_stage", 39 /* Tail Whip */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { defStage: 0 }), attacker(), RNG_SEED);
pushCase("defense_down_white_smoke_blocks", 43 /* Leer */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_WHITE_SMOKE", "ABILITY_WHITE_SMOKE"), attacker(), RNG_SEED);
pushCase("defense_down_2_ambiguous_draws", 103 /* Screech */, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
pushCase("sp_def_down_2_clear_body_blocks", 313 /* Fake Tears */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_CLEAR_BODY", "ABILITY_CLEAR_BODY", { spDefStage: 6 }), attacker(), RNG_SEED);
pushCase("sp_def_down_2_min_stage", 319 /* Metal Sound */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { spDefStage: 0 }), attacker(), RNG_SEED);
pushCase("sp_def_down_2_ambiguous_draws", 319, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);

// Acc Down (EFFECT_ACCURACY_DOWN, +_2 vestigial dispatch-only): MIN_STAT_STAGE,
// Keen Eye, shared-tail, both-draw ambiguous species.
pushCase("acc_down_min_stage", 28 /* Sand-Attack */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { accStage: 0 }), attacker(), RNG_SEED);
pushCase("acc_down_keen_eye_blocks", 108 /* Smokescreen */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_KEEN_EYE", "ABILITY_KEEN_EYE"), attacker(), RNG_SEED);
pushCase("acc_down_white_smoke_blocks_tail", 134 /* Kinesis */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_WHITE_SMOKE", "ABILITY_WHITE_SMOKE"), attacker(), RNG_SEED);
pushCase("acc_down_ambiguous_draws_both_sites", 148 /* Flash */, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
for (let i = 0; i < 3; i += 1) {
  rngStream.next();
  pushCase(`acc_down_sweep_i${i}`, 28, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), rngStream.rngValue);
}

// Evasion Down (EFFECT_EVASION_DOWN, +_2 has no real move): MIN_STAT_STAGE,
// blocking, ambiguous-species draw.
pushCase("evasion_down_min_stage", 230 /* Sweet Scent */, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { evasionStage: 0 }), attacker(), RNG_SEED);
pushCase("evasion_down_clear_body_blocks", 230, target(...STAT_DOWN_SHUCKLE_BASE, "ABILITY_CLEAR_BODY", "ABILITY_CLEAR_BODY"), attacker(), RNG_SEED);
pushCase("evasion_down_ambiguous_draws", 230, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);

// === Toxic/Poison (TS :1148-1172, dispatch :2063-2072, test.ts:1716-2042) ====

const TOXIC_SHUCKLE_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];
pushCase("toxic_steel_type_immune", 92 /* Toxic */, target(SHUCKLE, ["TYPE_STEEL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("toxic_poison_type_immune", 92, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_POISON"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("toxic_immunity_ability_blocks", 92, target(...TOXIC_SHUCKLE_BASE, "ABILITY_IMMUNITY", "ABILITY_IMMUNITY"), attacker(), RNG_SEED);
pushCase("toxic_has_any_status_blocks", 92, target(...TOXIC_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { hasAnyStatus: true }), attacker(), RNG_SEED);
pushCase("toxic_safeguard_blocks", 92, target(...TOXIC_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { safeguardUp: true }), attacker(), RNG_SEED);
pushCase("toxic_all_clear_ambiguous_draws", 92, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
pushCase("poison_powder_all_clear", 77 /* Poisonpowder */, target(...TOXIC_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("poison_gas_type_immune", 139 /* Poison Gas */, target(SHUCKLE, ["TYPE_POISON", "TYPE_POISON"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);

// === Sleep (TS :2722-2742, dispatch :2135-2144, test.ts:1716-2042) ===========

const SLEEP_SHUCKLE_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];
pushCase("sleep_insomnia_blocks", 47 /* Sing */, target(...SLEEP_SHUCKLE_BASE, "ABILITY_INSOMNIA", "ABILITY_INSOMNIA"), attacker(), RNG_SEED);
pushCase("sleep_vital_spirit_blocks", 79 /* Sleep Powder */, target(...SLEEP_SHUCKLE_BASE, "ABILITY_VITAL_SPIRIT", "ABILITY_VITAL_SPIRIT"), attacker(), RNG_SEED);
pushCase("sleep_has_any_status_blocks", 95 /* Hypnosis */, target(...SLEEP_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { hasAnyStatus: true }), attacker(), RNG_SEED);
pushCase("sleep_safeguard_blocks", 142 /* Lovely Kiss */, target(...SLEEP_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { safeguardUp: true }), attacker(), RNG_SEED);
pushCase("sleep_all_clear_ambiguous_draws", 147 /* Spore */, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
pushCase("sleep_grasswhistle_all_clear", 320 /* Grasswhistle */, target(...SLEEP_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
for (let i = 0; i < 3; i += 1) {
  rngStream.next();
  pushCase(`sleep_sweep_i${i}`, 47, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), rngStream.rngValue);
}

// === Roar (TS :2976-2995, dispatch :2122-2131, test.ts:1716-2042) ============

pushCase("roar_zero_usable_party_no_draw", 18 /* Whirlwind */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { usablePartyMons: 0 }), attacker(), RNG_SEED);
pushCase("roar_suction_cups_blocks", 46 /* Roar */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_SUCTION_CUPS", "ABILITY_SUCTION_CUPS", { usablePartyMons: 2 }), attacker(), RNG_SEED);
pushCase("roar_non_suction_cups_draws", 18, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD", { usablePartyMons: 3 }), attacker(), RNG_SEED);

// === Paralyze (TS :2773-2797, dispatch :2148-2157, test.ts:1716-2042) ========

const PARALYZE_SHUCKLE_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];
pushCase("paralyze_type_immune", 78 /* Stun Spore */, target(SHUCKLE, ["TYPE_GROUND", "TYPE_GROUND"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED); // Electric-typed? no -- Stun Spore is Grass; use Thunder Wave instead below for x0 case.
pushCase("paralyze_thunder_wave_type_immune", 86 /* Thunder Wave */, target(SHUCKLE, ["TYPE_GROUND", "TYPE_GROUND"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("paralyze_limber_blocks", 137 /* Glare */, target(...PARALYZE_SHUCKLE_BASE, "ABILITY_LIMBER", "ABILITY_LIMBER"), attacker(), RNG_SEED);
pushCase("paralyze_has_any_status_blocks", 86, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { hasAnyStatus: true }), attacker(), RNG_SEED);
pushCase("paralyze_safeguard_blocks", 86, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { safeguardUp: true }), attacker(), RNG_SEED);
pushCase("paralyze_all_clear_ambiguous_draws", 86, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);

// === Confuse/Swagger/Flatter (TS :2805-2825, dispatch :2163-2176, ===========
// test.ts:1716-2042) ===========================================================

const CONFUSE_SHUCKLE_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];
pushCase("confuse_already_confused", 48 /* Supersonic */, target(...CONFUSE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { isConfused: true }), attacker(), RNG_SEED);
pushCase("confuse_own_tempo_blocks", 109 /* Confuse Ray */, target(...CONFUSE_SHUCKLE_BASE, "ABILITY_OWN_TEMPO", "ABILITY_OWN_TEMPO"), attacker(), RNG_SEED);
pushCase("confuse_safeguard_blocks", 186 /* Sweet Kiss */, target(...CONFUSE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { safeguardUp: true }), attacker(), RNG_SEED);
pushCase("confuse_all_clear_ambiguous_draws", 48, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
pushCase("swagger_own_tempo_blocks", 207 /* Swagger */, target(...CONFUSE_SHUCKLE_BASE, "ABILITY_OWN_TEMPO", "ABILITY_OWN_TEMPO"), attacker(), RNG_SEED);
pushCase("flatter_all_clear", 260 /* Flatter */, target(...CONFUSE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);

// === OHKO (TS :2846-2868, dispatch :2180-2196, test.ts:1209-1554) ============

pushCase("ohko_guillotine_type_immune", 12 /* Guillotine */, target(SHUCKLE, ["TYPE_GHOST", "TYPE_GHOST"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("ohko_guillotine_sturdy_blocks", 12, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("ohko_guillotine_lower_level_blocks", 12, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_ROCK_HEAD", "ABILITY_ROCK_HEAD", { level: 80 }), attacker({ level: 30 }), RNG_SEED);
pushCase("ohko_guillotine_all_clear_ambiguous_draws", 12, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD", { level: 10 }), attacker({ level: 50 }), RNG_SEED);
// Fissure/Horn Drill: isOhko forces the preamble's own negates-type block to
// run even though power is 1 -- exercises the negates-type draw too.
pushCase("ohko_fissure_short_circuit_type_immune", 90 /* Fissure */, target(SHUCKLE, ["TYPE_FLYING", "TYPE_FLYING"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("ohko_horn_drill_ambiguous_draws_negates_type_then_own", 32 /* Horn Drill */, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD", { level: 10 }), attacker({ level: 50 }), RNG_SEED);
pushCase("ohko_sheer_cold_all_clear", 329 /* Sheer Cold */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { level: 5 }), attacker({ level: 50 }), RNG_SEED);

// === Leech Seed (TS :2886-2902, dispatch :2200-2209, test.ts:1209-1554) ======

pushCase("leech_seed_already_seeded", 73 /* Leech Seed */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { isLeechSeeded: true }), attacker(), RNG_SEED);
pushCase("leech_seed_grass_type_blocks", 73, target(SHUCKLE, ["TYPE_GRASS", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("leech_seed_all_clear", 73, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);

// === Fake Out (TS :2918-2920, dispatch :2213-2220, test.ts:1209-1554) ========

pushCase("fake_out_not_first_turn", 252 /* Fake Out */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ isFirstTurn: 0 }), RNG_SEED);
pushCase("fake_out_first_turn", 252, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ isFirstTurn: 1 }), RNG_SEED);

// === Will-O-Wisp (TS :2942-2966, dispatch :2224-2239, test.ts:1209-1554) =====

const WOW_SHUCKLE_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];
pushCase("will_o_wisp_water_veil_blocks", 261 /* Will-O-Wisp */, target(...WOW_SHUCKLE_BASE, "ABILITY_WATER_VEIL", "ABILITY_WATER_VEIL"), attacker(), RNG_SEED);
pushCase("will_o_wisp_has_any_status_blocks", 261, target(...WOW_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { hasAnyStatus: true }), attacker(), RNG_SEED);
pushCase("will_o_wisp_type_immune_blocks", 261, target(SHUCKLE, ["TYPE_FIRE", "TYPE_FIRE"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("will_o_wisp_half_effective_blocks", 261, target(SHUCKLE, ["TYPE_ROCK", "TYPE_WATER"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("will_o_wisp_safeguard_blocks", 261, target(...WOW_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { safeguardUp: true }), attacker(), RNG_SEED);
pushCase("will_o_wisp_all_clear_ambiguous_draws", 261, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);

// === Knock Off / Trick (TS :3006-3022, dispatch :2244-2258, ================
// test.ts:3498-3546) ===========================================================

pushCase("knock_off_sticky_hold_blocks", 282 /* Knock Off */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STICKY_HOLD", "ABILITY_STICKY_HOLD"), attacker(), RNG_SEED);
pushCase("knock_off_ambiguous_draws_negates_type_soundproof_and_own", 282, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker(), RNG_SEED);
pushCase("trick_sticky_hold_blocks", 271 /* Trick */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STICKY_HOLD", "ABILITY_STICKY_HOLD"), attacker(), RNG_SEED);
pushCase("trick_all_clear", 271, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);

// === Explosion (TS :3056-3085, dispatch :2287-2303, test.ts:3629-3694) =======

pushCase("explosion_type_immune", 120 /* Selfdestruct */, target(SHUCKLE, ["TYPE_GHOST", "TYPE_GHOST"], "ABILITY_STURDY", "ABILITY_STURDY", { usablePartyMons: 1 }), attacker({ usablePartyMons: 1 }), RNG_SEED);
pushCase("explosion_damp_blocks", 120, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_DAMP", "ABILITY_DAMP", { usablePartyMons: 1 }), attacker({ usablePartyMons: 1 }), RNG_SEED);
pushCase("explosion_attacker_has_reserves", 153 /* Explosion */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { usablePartyMons: 1 }), attacker({ usablePartyMons: 2 }), RNG_SEED);
pushCase("explosion_both_last_mon", 153, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { usablePartyMons: 0 }), attacker({ usablePartyMons: 0 }), RNG_SEED);
pushCase("explosion_only_target_has_reserves", 153, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { usablePartyMons: 2 }), attacker({ usablePartyMons: 0 }), RNG_SEED);
pushCase("explosion_ambiguous_poliwag_damp_draws", 120, target(POLIWAG, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_WATER_ABSORB", { usablePartyMons: 1 }), attacker({ usablePartyMons: 1 }), RNG_SEED);

// === Dream Eater (TS :3123-3131, dispatch :2332-2339, test.ts:3782-3821) =====

pushCase("dream_eater_not_asleep", 138 /* Dream Eater */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("dream_eater_asleep_type_immune", 138, target(SHUCKLE, ["TYPE_DARK", "TYPE_DARK"], "ABILITY_STURDY", "ABILITY_STURDY", { isAsleep: true }), attacker(), RNG_SEED);
pushCase("dream_eater_asleep_all_clear", 138, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { isAsleep: true }), attacker(), RNG_SEED);

// === Special Attack Down (TS runCbmSpAtkDown, direct calls, no real move) ====

pushSpAtkDownCase("sp_atk_down_min_stage", target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { spAtkStage: 0 }), RNG_SEED, 1);
pushSpAtkDownCase("sp_atk_down_white_smoke_blocks", target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_WHITE_SMOKE", "ABILITY_WHITE_SMOKE"), RNG_SEED, 1);
pushSpAtkDownCase("sp_atk_down_clear_body_blocks", target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_CLEAR_BODY", "ABILITY_CLEAR_BODY"), RNG_SEED, 1);
pushSpAtkDownCase("sp_atk_down_ambiguous_draws", target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), RNG_SEED, 1);
for (let stage = 0; stage <= 12; stage += 4) {
  rngStream.next();
  pushSpAtkDownCase(`sp_atk_down_sweep_stage${stage}`, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", { spAtkStage: stage }), rngStream.rngValue, 1);
}

// === Attract (TS :3523-3547, dispatch :2534-2543, test.ts:4356-4438) =========

const ATTRACT_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];
pushCase("attract_already_infatuated", 213 /* Attract */, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { isInfatuated: true }), attacker(), RNG_SEED);
pushCase("attract_oblivious_blocks", 213, target(...ATTRACT_BASE, "ABILITY_OBLIVIOUS", "ABILITY_OBLIVIOUS"), attacker(), RNG_SEED);
pushCase("attract_male_vs_female_scores_zero", 213, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { gender: "MON_FEMALE" }), attacker({ gender: "MON_MALE" }), RNG_SEED);
pushCase("attract_female_vs_male_scores_zero", 213, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { gender: "MON_MALE" }), attacker({ gender: "MON_FEMALE" }), RNG_SEED);
pushCase("attract_male_vs_male_blocks", 213, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { gender: "MON_MALE" }), attacker({ gender: "MON_MALE" }), RNG_SEED);
pushCase("attract_male_vs_genderless_blocks", 213, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { gender: "MON_GENDERLESS" }), attacker({ gender: "MON_MALE" }), RNG_SEED);
pushCase("attract_genderless_user_blocks", 213, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { gender: "MON_FEMALE" }), attacker({ gender: "MON_GENDERLESS" }), RNG_SEED);
pushCase("attract_unmodeled_user_blocks", 213, target(...ATTRACT_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { gender: "MON_FEMALE" }), attacker(), RNG_SEED);
pushCase("attract_ambiguous_draws", 213, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD", { gender: "MON_FEMALE" }), attacker({ gender: "MON_MALE" }), RNG_SEED);

// === Spit Up / Swallow (TS :3607-3616, dispatch :2577-2584, ================
// test.ts:4520-4564) ===========================================================

pushCase("spit_up_type_immune", 255 /* Spit Up */, target(SHUCKLE, ["TYPE_GHOST", "TYPE_GHOST"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ stockpileCount: 3 }), RNG_SEED);
pushCase("spit_up_zero_stockpile", 255, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ stockpileCount: 0 }), RNG_SEED);
pushCase("spit_up_nonzero_stockpile", 255, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ stockpileCount: 2 }), RNG_SEED);
pushCase("swallow_zero_stockpile", 256 /* Swallow */, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ stockpileCount: 0 }), RNG_SEED);
pushCase("swallow_nonzero_stockpile", 256, target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ stockpileCount: 1 }), RNG_SEED);

// === emit Rust source ========================================================

function drawCaseLiteral(d) {
  return `CbmM5b2DrawCase { ordinal: ${d.ordinal}, site: ${d.site}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, guessed_ability: ${d.guessedAbility} }`;
}

function optBool(v) {
  return v === null || v === undefined ? "None" : v ? "Some(true)" : "Some(false)";
}

function optU8(v) {
  return v === null || v === undefined ? "None" : `Some(${v})`;
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cbm-m5b2-vectors.mjs — regenerate: node core-rs/tools/gen-cbm-m5b2-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckBadMove.ts's runCheckBadMovePreamble");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One `next_get_ability_draw` call recorded inside a scored case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b2DrawCase {");
lines.push("    pub ordinal: u32,");
lines.push("    /// Matches `CheckBadMoveDrawSite`'s own discriminants (0-22).");
lines.push("    pub site: u8,");
lines.push("    pub before_value: u32,");
lines.push("    pub before_calls: u32,");
lines.push("    pub after_value: u32,");
lines.push("    pub after_calls: u32,");
lines.push("    pub raw_rng_value: u32,");
lines.push("    pub random_value: u16,");
lines.push("    pub guessed_ability: u16,");
lines.push("}");
lines.push("");

lines.push("/// One M5b-2 `run_check_bad_move_preamble` case that reached");
lines.push("/// `CheckBadMoveResult::Scored`. Every optional field mirrors the matching");
lines.push("/// `FactoryAiCheckBadMoveTarget`/`FactoryAiCheckBadMoveAttacker` field 1:1;");
lines.push("/// `None` reproduces that field's own TS-side default. Gender is encoded");
lines.push("/// 0=Male/1=Female/2=Genderless, matching `FactoryAiMonGender`'s repr(u8).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b2ScoredCase {");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub species: u16,");
lines.push("    pub types: [u8; 2],");
lines.push("    pub known_ability: Option<u16>,");
lines.push("    pub real_ability: u16,");
lines.push("    pub target_speed_stage: u8,");
lines.push("    pub target_atk_stage: u8,");
lines.push("    pub target_def_stage: u8,");
lines.push("    pub target_sp_def_stage: u8,");
lines.push("    pub target_acc_stage: Option<u8>,");
lines.push("    pub target_evasion_stage: Option<u8>,");
lines.push("    pub target_sp_atk_stage: Option<u8>,");
lines.push("    pub target_has_any_status: Option<bool>,");
lines.push("    pub target_safeguard_up: Option<bool>,");
lines.push("    pub target_is_confused: Option<bool>,");
lines.push("    pub target_is_leech_seeded: Option<bool>,");
lines.push("    pub target_is_asleep: Option<bool>,");
lines.push("    pub target_is_infatuated: Option<bool>,");
lines.push("    pub target_level: Option<u8>,");
lines.push("    pub target_gender: Option<u8>,");
lines.push("    pub target_usable_party_mons: Option<u8>,");
lines.push("    pub attacker_level: Option<u8>,");
lines.push("    pub attacker_is_first_turn: Option<u8>,");
lines.push("    pub attacker_usable_party_mons: Option<u8>,");
lines.push("    pub attacker_stockpile_count: Option<u8>,");
lines.push("    pub attacker_gender: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CbmM5b2DrawCase; 3],");
lines.push("    pub expected_score_delta: i32,");
lines.push("}");
lines.push(`pub static CBM_M5B2_SCORED_CASES: [CbmM5b2ScoredCase; ${scoredCases.length}] = [`);
for (const c of scoredCases) {
  const known = c.hasKnownAbility ? `Some(${c.knownAbility})` : "None";
  const fields = [
    `move_id: ${c.moveId}`,
    `rng_value: ${c.rngValue}`,
    `species: ${c.species}`,
    `types: [${c.types[0]}, ${c.types[1]}]`,
    `known_ability: ${known}`,
    `real_ability: ${c.realAbility}`,
    `target_speed_stage: ${c.targetSpeedStage}`,
    `target_atk_stage: ${c.targetAtkStage}`,
    `target_def_stage: ${c.targetDefStage}`,
    `target_sp_def_stage: ${c.targetSpDefStage}`,
    `target_acc_stage: ${optU8(c.targetAccStage)}`,
    `target_evasion_stage: ${optU8(c.targetEvasionStage)}`,
    `target_sp_atk_stage: ${optU8(c.targetSpAtkStage)}`,
    `target_has_any_status: ${optBool(c.targetHasAnyStatus)}`,
    `target_safeguard_up: ${optBool(c.targetSafeguardUp)}`,
    `target_is_confused: ${optBool(c.targetIsConfused)}`,
    `target_is_leech_seeded: ${optBool(c.targetIsLeechSeeded)}`,
    `target_is_asleep: ${optBool(c.targetIsAsleep)}`,
    `target_is_infatuated: ${optBool(c.targetIsInfatuated)}`,
    `target_level: ${optU8(c.targetLevel)}`,
    `target_gender: ${optU8(c.targetGender)}`,
    `target_usable_party_mons: ${optU8(c.targetUsablePartyMons)}`,
    `attacker_level: ${optU8(c.attackerLevel)}`,
    `attacker_is_first_turn: ${optU8(c.attackerIsFirstTurn)}`,
    `attacker_usable_party_mons: ${optU8(c.attackerUsablePartyMons)}`,
    `attacker_stockpile_count: ${optU8(c.attackerStockpileCount)}`,
    `attacker_gender: ${optU8(c.attackerGender)}`,
    `expected_rng_value: ${c.expectedRngValue}`,
    `expected_rng_calls: ${c.expectedRngCalls}`,
    `expected_draw_count: ${c.expectedDrawCount}`,
    `draws: [${drawCaseLiteral(c.draws[0])}, ${drawCaseLiteral(c.draws[1])}, ${drawCaseLiteral(c.draws[2])}]`,
    `expected_score_delta: ${c.expectedScoreDelta}`,
  ];
  lines.push(`    // ${c.label}\n    CbmM5b2ScoredCase { ${fields.join(", ")} },`);
}
lines.push("];");
lines.push("");

lines.push("/// One direct `run_cbm_sp_atk_down` case (`EFFECT_SPECIAL_ATTACK_DOWN(_2)`,");
lines.push("/// no real Gen-3 move -- TS exports `runCbmSpAtkDown` for exactly this,");
lines.push("/// :3404, called directly here instead of through the full preamble).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b2SpAtkDownCase {");
lines.push("    pub rng_value: u32,");
lines.push("    pub ordinal: u32,");
lines.push("    pub species: u16,");
lines.push("    pub known_ability: Option<u16>,");
lines.push("    pub real_ability: u16,");
lines.push("    pub sp_atk_stage: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draw: CbmM5b2DrawCase,");
lines.push("    pub expected_score_delta: i32,");
lines.push("}");
lines.push(`pub static CBM_M5B2_SP_ATK_DOWN_CASES: [CbmM5b2SpAtkDownCase; ${spAtkDownCases.length}] = [`);
for (const c of spAtkDownCases) {
  const known = c.hasKnownAbility ? `Some(${c.knownAbility})` : "None";
  const fields = [
    `rng_value: ${c.rngValue}`,
    `ordinal: ${c.ordinal}`,
    `species: ${c.species}`,
    `known_ability: ${known}`,
    `real_ability: ${c.realAbility}`,
    `sp_atk_stage: ${optU8(c.spAtkStage)}`,
    `expected_rng_value: ${c.expectedRngValue}`,
    `expected_rng_calls: ${c.expectedRngCalls}`,
    `expected_draw_count: ${c.expectedDrawCount}`,
    `draw: ${drawCaseLiteral(c.draw)}`,
    `expected_score_delta: ${c.expectedScoreDelta}`,
  ];
  lines.push(`    // ${c.label}\n    CbmM5b2SpAtkDownCase { ${fields.join(", ")} },`);
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
  throw new Error("gen-cbm-m5b2-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cbm-m5b2-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-cbm-m5b2-vectors: ${scoredCases.length} scored cases, ${spAtkDownCases.length} sp-atk-down direct cases`,
);
