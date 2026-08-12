#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_bad_move_m5b1_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckBadMove.ts's `runCheckBadMovePreamble` (read-only
// import, node --experimental-strip-types — the gen-cbm-preamble-vectors.mjs
// precedent). No value in the emitted file is hand-computed. Deterministic: a
// fixed directed case list plus a sweep seeded from a fixed GbaRng stream, not
// Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5b-1 only (docs/rust-m5b-checkbadmove-batching.md §2) — the
// 18-effect HighRiskForDamage cluster, Teleport, the 8 zero-RNG single-flag
// effects, the weather quartet (incl. the stale-funcResult bug), and
// Magnitude (32 effects total, M5B1_EFFECT_NAMES below). Unlike
// gen-cbm-preamble-vectors.mjs (M5b-0, which had to EXCLUDE every table
// effect since the Rust side had no handlers yet), every case here uses a
// move whose effect IS in this 32-effect batch: since src/engine/
// factoryAiCheckBadMove.ts is verified live below to be 109/109 ported, its
// `runCheckBadMovePreamble` output for such a move already reflects the real
// handler logic end to end — directly comparable to the Rust port's own
// M5b-1 handlers.
//
// Usage: node core-rs/tools/gen-cbm-m5b1-vectors.mjs   (from any cwd)

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
  "factory_ai_check_bad_move_m5b1_vectors_gen.rs",
);

const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { runCheckBadMovePreamble, unportedCheckBadMoveTableEffects, AI_CHECK_BAD_MOVE_TABLE_EFFECTS } = cbm;
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

// Verify live (not from doc prose) that TS really has zero unported table
// effects -- the premise this generator relies on to treat TS's own scored
// output as the handler-inclusive expected value for every M5b-1 move.
if (unportedCheckBadMoveTableEffects().length !== 0) {
  throw new Error(
    "gen-cbm-m5b1-vectors: expected src/engine/factoryAiCheckBadMove.ts to be 109/109 ported " +
      "(this script's whole premise for treating its scored output as ground truth)",
  );
}

// The 32 effects this batch covers, TS dispatch source order
// (factoryAiCheckBadMove.ts:1338-1810,2076-2118,2410-2419) -- mirrors Rust's
// CBM_HANDLED_EFFECTS_M5B1 exactly (factory_ai_check_bad_move.rs).
const M5B1_EFFECT_NAMES = new Set([
  "EFFECT_COUNTER", "EFFECT_FLAIL", "EFFECT_MIRROR_COAT", "EFFECT_FOCUS_PUNCH",
  "EFFECT_LEVEL_DAMAGE", "EFFECT_FRUSTRATION", "EFFECT_RETURN", "EFFECT_RECHARGE",
  "EFFECT_ENDEAVOR", "EFFECT_SUPERPOWER", "EFFECT_RAZOR_WIND", "EFFECT_PSYWAVE",
  "EFFECT_LOW_KICK", "EFFECT_SUPER_FANG", "EFFECT_PRESENT", "EFFECT_SONICBOOM",
  "EFFECT_BIDE", "EFFECT_SKULL_BASH", "EFFECT_TELEPORT", "EFFECT_INGRAIN",
  "EFFECT_PERISH_SONG", "EFFECT_NIGHTMARE", "EFFECT_FORESIGHT", "EFFECT_SPIKES",
  "EFFECT_FUTURE_SIGHT", "EFFECT_FOCUS_ENERGY", "EFFECT_REFRESH", "EFFECT_RAIN_DANCE",
  "EFFECT_SUNNY_DAY", "EFFECT_HAIL", "EFFECT_SANDSTORM", "EFFECT_MAGNITUDE",
]);
if (M5B1_EFFECT_NAMES.size !== 32) {
  throw new Error(`gen-cbm-m5b1-vectors: expected exactly 32 M5b-1 effect names, got ${M5B1_EFFECT_NAMES.size}`);
}
for (const name of M5B1_EFFECT_NAMES) {
  if (!AI_CHECK_BAD_MOVE_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cbm-m5b1-vectors: ${name} is not a real AI_CheckBadMove table effect`);
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
  if (!abilityIdByName.has(name)) throw new Error(`gen-cbm-m5b1-vectors: unknown ability ${name}`);
  return abilityIdByName.get(name);
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use. ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};

// --- AI_WEATHER_* (battle_ai.h:27-30), same encoding attacker.currentWeather
// uses. ---
const AI_WEATHER_SUN = 0;
const AI_WEATHER_RAIN = 1;
const AI_WEATHER_SANDSTORM = 2;
const AI_WEATHER_HAIL = 3;

const scoredCases = [];

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
  // HighRiskForDamage's own draw ends in "-high-risk-ability" whether
  // reached directly (reasonPrefix-high-risk-ability) or via Magnitude's
  // fall-through (reasonPrefix-magnitude-high-risk-ability) -- both are the
  // same Rust CheckBadMoveDrawSite::HighRiskForDamageAbility site.
  if (reason.endsWith("-negates-type")) return 0; // NegatesType
  if (reason.endsWith("-high-risk-ability")) return 2; // HighRiskForDamageAbility
  if (reason.endsWith("-magnitude-levitate")) return 3; // MagnitudeLevitate
  if (reason.endsWith("-soundproof")) return 1; // Soundproof
  throw new Error(`gen-cbm-m5b1-vectors: unrecognized draw reason ${reason}`);
}

function pushCase(label, moveId, t, atk, rngValue) {
  const move = cbm.MOVES_BY_ID.get(moveId);
  if (!move) throw new Error(`gen-cbm-m5b1-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5B1_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cbm-m5b1-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5b-1 batch`,
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
    throw new Error(`gen-cbm-m5b1-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 3) {
    throw new Error(`gen-cbm-m5b1-vectors: case ${label} produced ${result.draws.length} draws, expected <=3`);
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
    targetHasPerishSong: t.hasPerishSong ?? null,
    targetIsNightmared: t.isNightmared ?? null,
    targetIsAsleep: t.isAsleep ?? null,
    targetIsForesighted: t.isForesighted ?? null,
    targetSpikesUp: t.spikesUp ?? null,
    targetFutureAttackUp: t.targetFutureAttackUp ?? null,
    attackerIsRooted: atk.isRooted ?? null,
    attackerHasFocusEnergy: atk.hasFocusEnergy ?? null,
    attackerHasCurableStatus: atk.hasCurableStatus ?? null,
    attackerFutureAttackUp: atk.attackerFutureAttackUp ?? null,
    attackerCurrentWeather: atk.currentWeather ?? null,
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedDrawCount: result.draws.length,
    draws,
    expectedScoreDelta: result.scoreDelta,
  });
}

const RNG_SEED = 249_678_687; // tests/factoryAiCheckBadMove.test.ts:1541, same convention as gen-cbm-preamble-vectors.mjs.
const SHUCKLE = 213; // single ability Sturdy: zero-RNG short-circuit.

// === HighRiskForDamage cluster (18 effects, one shared handler) =============
// TS :1338-1689/2681-2706, test.ts:30-931.

const HIGH_RISK_MOVES = [
  ["counter", 68, "TYPE_FIGHTING"],
  ["flail", 175, "TYPE_NORMAL"],
  ["mirror_coat", 243, "TYPE_PSYCHIC"],
  ["focus_punch", 264, "TYPE_FIGHTING"],
  ["level_damage_seismic_toss", 69, "TYPE_FIGHTING"],
  ["frustration", 218, "TYPE_NORMAL"],
  ["return", 216, "TYPE_NORMAL"],
  ["recharge_hyper_beam", 63, "TYPE_NORMAL"],
  ["endeavor", 283, "TYPE_NORMAL"],
  ["superpower", 276, "TYPE_FIGHTING"],
  ["razor_wind", 13, "TYPE_NORMAL"],
  ["psywave", 149, "TYPE_PSYCHIC"],
  ["low_kick", 67, "TYPE_FIGHTING"],
  ["super_fang", 162, "TYPE_NORMAL"],
  ["present", 217, "TYPE_NORMAL"],
  ["sonicboom", 49, "TYPE_NORMAL"],
  ["bide", 117, "TYPE_NORMAL"],
  ["skull_bash", 130, "TYPE_NORMAL"],
];

// Dispatch-routing directed case per cluster member: fixed Rock/Bug target,
// known Sturdy (zero-RNG), so every case differs only in which move/effect
// reaches the shared handler -- whatever score TS computes is the expected
// value, no need to hand-pick a specific matchup.
for (const [label, moveId] of HIGH_RISK_MOVES) {
  pushCase(
    `high_risk_routing_${label}`,
    moveId,
    target(SHUCKLE, ["TYPE_ROCK", "TYPE_BUG"], "ABILITY_STURDY", "ABILITY_STURDY"),
    attacker(),
    RNG_SEED,
  );
}

// Branch matrix on Counter (test.ts:46-90): x0 immunity, non-Wonder-Guard
// fallthrough, Wonder Guard + x2, Wonder Guard + non-x2.
const MOVE_COUNTER = 68;
pushCase(
  "high_risk_counter_x0_immune",
  MOVE_COUNTER,
  target(SHUCKLE, ["TYPE_GHOST", "TYPE_GHOST"], null, "ABILITY_STURDY"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "high_risk_counter_non_wonder_guard_fallthrough",
  MOVE_COUNTER,
  target(SHUCKLE, ["TYPE_WATER", "TYPE_WATER"], "ABILITY_STURDY", "ABILITY_STURDY"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "high_risk_counter_wonder_guard_x2",
  MOVE_COUNTER,
  target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_WONDER_GUARD", "ABILITY_WONDER_GUARD"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "high_risk_counter_wonder_guard_non_x2",
  MOVE_COUNTER,
  target(SHUCKLE, ["TYPE_WATER", "TYPE_WATER"], "ABILITY_WONDER_GUARD", "ABILITY_WONDER_GUARD"),
  attacker(),
  RNG_SEED,
);

// Seeded sweep: ambiguous (unknown-ability) targets across several cluster
// moves -- exercises the handler's own uncached get_ability draw end to end
// against the real engine, never-caches included (RNG advances every call).
const HIGH_RISK_TWO_ABILITY_SPECIES = [
  { id: 105, real: "ABILITY_ROCK_HEAD" }, // MAROWAK: Rock Head / Lightning Rod
  { id: 171, real: "ABILITY_VOLT_ABSORB" }, // LANTURN: Volt Absorb / Illuminate
  { id: 58, real: "ABILITY_INTIMIDATE" }, // GROWLITHE: Intimidate / Flash Fire
];
const HIGH_RISK_SWEEP_MOVES = [68 /* Counter */, 217 /* Present */, 130 /* Skull Bash */];
const rngStream = new GbaRng(0x2468_ace0);
let highRiskSweepCount = 0;
for (const species of HIGH_RISK_TWO_ABILITY_SPECIES) {
  for (const moveId of HIGH_RISK_SWEEP_MOVES) {
    for (let i = 0; i < 2; i += 1) {
      rngStream.next();
      const seed = rngStream.rngValue;
      pushCase(
        `high_risk_sweep_species${species.id}_move${moveId}_i${i}`,
        moveId,
        target(species.id, ["TYPE_NORMAL", "TYPE_NORMAL"], null, species.real),
        attacker(),
        seed,
      );
      highRiskSweepCount += 1;
    }
  }
}

// === EFFECT_TELEPORT (TS :1694-1701, test.ts:932-939) =======================

pushCase(
  "teleport_unconditional_minus10",
  100 /* MOVE_TELEPORT */,
  target(SHUCKLE, ["TYPE_GROUND", "TYPE_GROUND"], "ABILITY_STURDY", "ABILITY_STURDY"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "teleport_unconditional_minus10_unknown_ability",
  100,
  target(105 /* MAROWAK */, ["TYPE_GROUND", "TYPE_GROUND"], null, "ABILITY_ROCK_HEAD"),
  attacker(),
  RNG_SEED,
);

// === the 8 zero-RNG single-flag handlers (TS :3158-3255, test.ts:941-1207) ==

const SINGLES_TARGET_BASE = [SHUCKLE, ["TYPE_BUG", "TYPE_ROCK"], "ABILITY_STURDY", "ABILITY_STURDY"];

pushCase("ingrain_rooted", 275, target(...SINGLES_TARGET_BASE), attacker({ isRooted: true }), RNG_SEED);
pushCase("ingrain_not_rooted", 275, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase(
  "perish_song_already_up",
  195,
  target(...SINGLES_TARGET_BASE, { hasPerishSong: true }),
  attacker(),
  RNG_SEED,
);
pushCase("perish_song_not_up", 195, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase(
  "nightmare_already_nightmared",
  171,
  target(...SINGLES_TARGET_BASE, { isNightmared: true, isAsleep: true }),
  attacker(),
  RNG_SEED,
);
pushCase(
  "nightmare_asleep_not_nightmared",
  171,
  target(...SINGLES_TARGET_BASE, { isAsleep: true }),
  attacker(),
  RNG_SEED,
);
pushCase("nightmare_neither", 171, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase(
  "foresight_already_foresighted",
  193,
  target(...SINGLES_TARGET_BASE, { isForesighted: true }),
  attacker(),
  RNG_SEED,
);
pushCase("foresight_not_foresighted", 193, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase("spikes_already_up", 191, target(...SINGLES_TARGET_BASE, { spikesUp: true }), attacker(), RNG_SEED);
pushCase("spikes_not_up", 191, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase(
  "future_sight_target_side_up",
  248,
  target(...SINGLES_TARGET_BASE, { targetFutureAttackUp: true }),
  attacker(),
  RNG_SEED,
);
pushCase(
  "future_sight_attacker_side_up",
  248,
  target(...SINGLES_TARGET_BASE),
  attacker({ attackerFutureAttackUp: true }),
  RNG_SEED,
);
pushCase("future_sight_neither_side_up", 248, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase(
  "focus_energy_already_up",
  116,
  target(...SINGLES_TARGET_BASE),
  attacker({ hasFocusEnergy: true }),
  RNG_SEED,
);
pushCase("focus_energy_not_up", 116, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

pushCase(
  "refresh_has_curable_status",
  287,
  target(...SINGLES_TARGET_BASE),
  attacker({ hasCurableStatus: true }),
  RNG_SEED,
);
pushCase("refresh_no_curable_status", 287, target(...SINGLES_TARGET_BASE), attacker(), RNG_SEED);

// A single unknown-ability case (Marowak) proving the soundproof draw still
// threads correctly alongside a flag read.
pushCase(
  "ingrain_unknown_ability_still_draws_soundproof",
  275,
  target(105, ["TYPE_GRASS", "TYPE_GRASS"], null, "ABILITY_ROCK_HEAD"),
  attacker({ isRooted: true }),
  RNG_SEED,
);

// === weather quartet (TS :1209-1240, dispatch :2076-2118, test.ts:3277-3496) =

const WEATHER_SHUCKLE = [SHUCKLE, ["TYPE_BUG", "TYPE_ROCK"]];
const MOVE_RAIN_DANCE = 240;
const MOVE_SUNNY_DAY = 241;
const MOVE_HAIL = 258;
const MOVE_SANDSTORM = 201;

for (const [label, moveId, ownWeather] of [
  ["rain_dance", MOVE_RAIN_DANCE, AI_WEATHER_RAIN],
  ["sunny_day", MOVE_SUNNY_DAY, AI_WEATHER_SUN],
  ["hail", MOVE_HAIL, AI_WEATHER_HAIL],
  ["sandstorm", MOVE_SANDSTORM, AI_WEATHER_SANDSTORM],
]) {
  pushCase(
    `weather_${label}_matches_current_weather`,
    moveId,
    target(...WEATHER_SHUCKLE, null, "ABILITY_STURDY"),
    attacker({ currentWeather: ownWeather }),
    RNG_SEED,
  );
  const other = [AI_WEATHER_SUN, AI_WEATHER_RAIN, AI_WEATHER_SANDSTORM, AI_WEATHER_HAIL].find((w) => w !== ownWeather);
  pushCase(
    `weather_${label}_different_weather`,
    moveId,
    target(...WEATHER_SHUCKLE, null, "ABILITY_STURDY"),
    attacker({ currentWeather: other }),
    RNG_SEED,
  );
  pushCase(
    `weather_${label}_no_weather_no_collision`,
    moveId,
    target(...WEATHER_SHUCKLE, null, "ABILITY_STURDY"),
    attacker(),
    RNG_SEED,
  );
}

// Stale-funcResult collision channel (TS :1191-1207): weatherless + a target
// ability ID (0-3) colliding with this handler's own AI_WEATHER_* constant.
pushCase(
  "weather_sunny_day_stale_collision_ability_none",
  MOVE_SUNNY_DAY,
  target(...WEATHER_SHUCKLE, "ABILITY_NONE", "ABILITY_STURDY"), // id 0 == AI_WEATHER_SUN
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_rain_dance_stale_collision_ability_stench",
  MOVE_RAIN_DANCE,
  target(...WEATHER_SHUCKLE, "ABILITY_STENCH", "ABILITY_STENCH"), // id 1 == AI_WEATHER_RAIN
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_hail_stale_collision_ability_speed_boost",
  MOVE_HAIL,
  target(...WEATHER_SHUCKLE, "ABILITY_SPEED_BOOST", "ABILITY_SPEED_BOOST"), // id 3 == AI_WEATHER_HAIL
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_sandstorm_stale_collision_ability_drizzle",
  MOVE_SANDSTORM,
  target(...WEATHER_SHUCKLE, "ABILITY_DRIZZLE", "ABILITY_DRIZZLE"), // id 2 == AI_WEATHER_SANDSTORM
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_hail_stale_wrong_collision_ability_stench",
  MOVE_HAIL,
  target(...WEATHER_SHUCKLE, "ABILITY_STENCH", "ABILITY_STENCH"), // id 1 (Rain) != Hail's own id 3
  attacker(),
  RNG_SEED,
);

// Real Factory-reachable species reproducing doc §25.10.2's two live
// fixtures (test.ts:3386-3427): both single-ability, zero draws either way.
pushCase(
  "weather_hail_ninjask_staleweather_collision",
  MOVE_HAIL,
  target(302 /* NINJASK */, ["TYPE_BUG", "TYPE_FLYING"], null, "ABILITY_SPEED_BOOST"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_rain_dance_ninjask_no_collision_with_hail_id",
  MOVE_RAIN_DANCE,
  target(302, ["TYPE_BUG", "TYPE_FLYING"], null, "ABILITY_SPEED_BOOST"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_hail_anorith_staleweather_control_outside_range",
  MOVE_HAIL,
  target(390 /* ANORITH */, ["TYPE_ROCK", "TYPE_BUG"], null, "ABILITY_BATTLE_ARMOR"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "weather_rain_dance_ninjask_real_weather_wins_over_stale_read",
  MOVE_RAIN_DANCE,
  target(302, ["TYPE_BUG", "TYPE_FLYING"], null, "ABILITY_SPEED_BOOST"),
  attacker({ currentWeather: AI_WEATHER_RAIN }),
  RNG_SEED,
);

// === AI_CBM_Magnitude (TS :3331-3361, dispatch :2410-2419, test.ts:4012-4072)

const MOVE_MAGNITUDE = 222;

pushCase(
  "magnitude_levitate",
  MOVE_MAGNITUDE,
  target(SHUCKLE, ["TYPE_ROCK", "TYPE_BUG"], "ABILITY_LEVITATE", "ABILITY_LEVITATE"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "magnitude_non_levitate_x0_effectiveness",
  MOVE_MAGNITUDE,
  target(SHUCKLE, ["TYPE_FLYING", "TYPE_FLYING"], "ABILITY_STURDY", "ABILITY_STURDY"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "magnitude_non_levitate_non_wonder_guard_fallthrough",
  MOVE_MAGNITUDE,
  target(SHUCKLE, ["TYPE_ROCK", "TYPE_BUG"], "ABILITY_STURDY", "ABILITY_STURDY"),
  attacker(),
  RNG_SEED,
);
pushCase(
  "magnitude_ambiguous_lanturn_draws_twice",
  MOVE_MAGNITUDE,
  target(171 /* LANTURN */, ["TYPE_ROCK", "TYPE_BUG"], null, "ABILITY_VOLT_ABSORB"),
  attacker(),
  RNG_SEED,
);

// Seeded sweep over ambiguous species: every case here fills all 3 draw
// slots (soundproof + levitate + high-risk-ability) whenever the Levitate
// draw doesn't itself resolve to Levitate, asserting the never-caches
// property (RNG advances at every one of the 2-3 draws) across many seeds.
const MAGNITUDE_TWO_ABILITY_SPECIES = [171 /* LANTURN */, 105 /* MAROWAK */, 60 /* POLIWAG */];
let magnitudeSweepCount = 0;
for (const species of MAGNITUDE_TWO_ABILITY_SPECIES) {
  for (let i = 0; i < 3; i += 1) {
    rngStream.next();
    const seed = rngStream.rngValue;
    pushCase(
      `magnitude_sweep_species${species}_i${i}`,
      MOVE_MAGNITUDE,
      target(species, ["TYPE_ROCK", "TYPE_BUG"], null, speciesRealAbility(species)),
      attacker(),
      seed,
    );
    magnitudeSweepCount += 1;
  }
}

function speciesRealAbility(species) {
  if (species === 171) return "ABILITY_VOLT_ABSORB";
  if (species === 105) return "ABILITY_ROCK_HEAD";
  if (species === 60) return "ABILITY_WATER_ABSORB";
  throw new Error(`gen-cbm-m5b1-vectors: no known real ability for species ${species}`);
}

// === emit Rust source ========================================================

function drawCaseLiteral(d) {
  return `CbmM5b1DrawCase { ordinal: ${d.ordinal}, site: ${d.site}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, guessed_ability: ${d.guessedAbility} }`;
}

function optBool(v) {
  return v === null || v === undefined ? "None" : v ? "Some(true)" : "Some(false)";
}

function optU8(v) {
  return v === null || v === undefined ? "None" : `Some(${v})`;
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cbm-m5b1-vectors.mjs — regenerate: node core-rs/tools/gen-cbm-m5b1-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckBadMove.ts's runCheckBadMovePreamble");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One `next_get_ability_draw` call recorded inside a scored case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b1DrawCase {");
lines.push("    pub ordinal: u32,");
lines.push("    /// 0 = negates-type, 1 = soundproof, 2 = high-risk-for-damage ability,");
lines.push("    /// 3 = magnitude levitate.");
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

lines.push("/// One M5b-1 `run_check_bad_move_preamble` case that reached");
lines.push("/// `CheckBadMoveResult::Scored`. Every optional field mirrors the matching");
lines.push("/// `FactoryAiCheckBadMoveTarget`/`FactoryAiCheckBadMoveAttacker` field 1:1;");
lines.push("/// `None` reproduces that field's own TS-side default.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b1ScoredCase {");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub species: u16,");
lines.push("    pub types: [u8; 2],");
lines.push("    pub known_ability: Option<u16>,");
lines.push("    pub real_ability: u16,");
lines.push("    pub target_has_perish_song: Option<bool>,");
lines.push("    pub target_is_nightmared: Option<bool>,");
lines.push("    pub target_is_asleep: Option<bool>,");
lines.push("    pub target_is_foresighted: Option<bool>,");
lines.push("    pub target_spikes_up: Option<bool>,");
lines.push("    pub target_future_attack_up: Option<bool>,");
lines.push("    pub attacker_is_rooted: Option<bool>,");
lines.push("    pub attacker_has_focus_energy: Option<bool>,");
lines.push("    pub attacker_has_curable_status: Option<bool>,");
lines.push("    pub attacker_future_attack_up: Option<bool>,");
lines.push("    pub attacker_current_weather: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CbmM5b1DrawCase; 3],");
lines.push("    pub expected_score_delta: i32,");
lines.push("}");
lines.push(`pub static CBM_M5B1_SCORED_CASES: [CbmM5b1ScoredCase; ${scoredCases.length}] = [`);
for (const c of scoredCases) {
  const known = c.hasKnownAbility ? `Some(${c.knownAbility})` : "None";
  const fields = [
    `move_id: ${c.moveId}`,
    `rng_value: ${c.rngValue}`,
    `species: ${c.species}`,
    `types: [${c.types[0]}, ${c.types[1]}]`,
    `known_ability: ${known}`,
    `real_ability: ${c.realAbility}`,
    `target_has_perish_song: ${optBool(c.targetHasPerishSong)}`,
    `target_is_nightmared: ${optBool(c.targetIsNightmared)}`,
    `target_is_asleep: ${optBool(c.targetIsAsleep)}`,
    `target_is_foresighted: ${optBool(c.targetIsForesighted)}`,
    `target_spikes_up: ${optBool(c.targetSpikesUp)}`,
    `target_future_attack_up: ${optBool(c.targetFutureAttackUp)}`,
    `attacker_is_rooted: ${optBool(c.attackerIsRooted)}`,
    `attacker_has_focus_energy: ${optBool(c.attackerHasFocusEnergy)}`,
    `attacker_has_curable_status: ${optBool(c.attackerHasCurableStatus)}`,
    `attacker_future_attack_up: ${optBool(c.attackerFutureAttackUp)}`,
    `attacker_current_weather: ${optU8(c.attackerCurrentWeather)}`,
    `expected_rng_value: ${c.expectedRngValue}`,
    `expected_rng_calls: ${c.expectedRngCalls}`,
    `expected_draw_count: ${c.expectedDrawCount}`,
    `draws: [${drawCaseLiteral(c.draws[0])}, ${drawCaseLiteral(c.draws[1])}, ${drawCaseLiteral(c.draws[2])}]`,
    `expected_score_delta: ${c.expectedScoreDelta}`,
  ];
  lines.push(`    // ${c.label}\n    CbmM5b1ScoredCase { ${fields.join(", ")} },`);
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
  throw new Error("gen-cbm-m5b1-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cbm-m5b1-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-cbm-m5b1-vectors: ${scoredCases.length} scored cases (${highRiskSweepCount} high-risk sweep, ${magnitudeSweepCount} magnitude sweep)`,
);
