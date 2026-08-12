#!/usr/bin/env node
// Codegen for
// core-rs/crates/factory-core/src/factory_ai_check_bad_move_m5b3_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckBadMove.ts's `runCheckBadMovePreamble` (read-only
// import, node --experimental-strip-types), mirroring
// gen-cbm-m5b1-vectors.mjs/gen-cbm-m5b2-vectors.mjs's conventions exactly.
// No value in the emitted file is hand-computed. Deterministic: a fixed
// directed case list plus a sweep seeded from a fixed GbaRng stream, not
// Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5b-3 only (docs/rust-m5b-checkbadmove-batching.md §2) -- the
// stat-UP family (Attack/Defense+Curl/Bulk Up/Curse/Speed/SpAtk/SpDef Up,
// Cosmic Power/Calm Mind/Dragon Dance), the screens (Light Screen/Reflect),
// Evasion Up (`+_2`/Minimize), Safeguard, Snore+Sleep Talk, Baton Pass,
// Substitute, Mean Look, Torment, Helping Hand, Tickle, Belly Drum, Haze
// (+ Psych Up), Mist, Disable, Encore, Memento, Stockpile, Recycle,
// Imprison, Mud Sport, Water Sport (44 effects, M5B3_EFFECT_NAMES below).
// Every case uses a move whose effect IS in this batch, same premise as
// gen-cbm-m5b1/2-vectors.mjs (TS is 109/109 ported, so its own scored output
// already reflects the real handler logic end to end -- directly comparable
// to the Rust port).
//
// EFFECT_ACCURACY_UP(_2) has no real Gen-3 move (verified against
// src/data/gen/moves.json and factoryAiCheckBadMove.ts's own exports -- only
// runCbmAccUp is exported for this batch), so it is covered by calling
// runCbmAccUp directly instead of going through runCheckBadMovePreamble.
// EFFECT_SPEED_UP/EFFECT_SPECIAL_DEFENSE_UP/EFFECT_EVASION_UP_2 are also
// vestigial (no real move) but reach the SAME handler as their `_2`/base
// sibling which DOES have a real move, so they need no separate direct-call
// treatment here.
//
// Usage: node core-rs/tools/gen-cbm-m5b3-vectors.mjs   (from any cwd)

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
  "factory_ai_check_bad_move_m5b3_vectors_gen.rs",
);

const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { runCheckBadMovePreamble, unportedCheckBadMoveTableEffects, AI_CHECK_BAD_MOVE_TABLE_EFFECTS, runCbmAccUp } =
  cbm;
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

if (unportedCheckBadMoveTableEffects().length !== 0) {
  throw new Error(
    "gen-cbm-m5b3-vectors: expected src/engine/factoryAiCheckBadMove.ts to be 109/109 ported " +
      "(this script's whole premise for treating its scored output as ground truth)",
  );
}

// The 44 effects this batch covers, TS dispatch source order
// (factoryAiCheckBadMove.ts:1878-2046,2260-2404,2421-2436,2457-2526,
// 2545-2570,2586-2637) -- mirrors Rust's CBM_HANDLED_EFFECTS_M5B3 exactly
// (factory_ai_check_bad_move.rs).
const M5B3_EFFECT_NAMES = new Set([
  "EFFECT_ATTACK_UP", "EFFECT_ATTACK_UP_2", "EFFECT_DEFENSE_UP", "EFFECT_DEFENSE_UP_2", "EFFECT_DEFENSE_CURL",
  "EFFECT_BULK_UP", "EFFECT_CURSE", "EFFECT_SPEED_UP", "EFFECT_SPEED_UP_2",
  "EFFECT_SPECIAL_ATTACK_UP", "EFFECT_SPECIAL_ATTACK_UP_2", "EFFECT_SPECIAL_DEFENSE_UP", "EFFECT_SPECIAL_DEFENSE_UP_2",
  "EFFECT_COSMIC_POWER", "EFFECT_CALM_MIND", "EFFECT_DRAGON_DANCE", "EFFECT_LIGHT_SCREEN", "EFFECT_REFLECT",
  "EFFECT_EVASION_UP", "EFFECT_EVASION_UP_2", "EFFECT_MINIMIZE", "EFFECT_ACCURACY_UP", "EFFECT_ACCURACY_UP_2",
  "EFFECT_SAFEGUARD", "EFFECT_SNORE", "EFFECT_SLEEP_TALK", "EFFECT_BATON_PASS", "EFFECT_SUBSTITUTE",
  "EFFECT_MEAN_LOOK", "EFFECT_TORMENT", "EFFECT_HELPING_HAND", "EFFECT_TICKLE", "EFFECT_BELLY_DRUM",
  "EFFECT_HAZE", "EFFECT_PSYCH_UP", "EFFECT_MIST", "EFFECT_DISABLE", "EFFECT_ENCORE",
  "EFFECT_MEMENTO", "EFFECT_STOCKPILE", "EFFECT_RECYCLE", "EFFECT_IMPRISON", "EFFECT_MUD_SPORT", "EFFECT_WATER_SPORT",
]);
if (M5B3_EFFECT_NAMES.size !== 44) {
  throw new Error(`gen-cbm-m5b3-vectors: expected exactly 44 M5b-3 effect names, got ${M5B3_EFFECT_NAMES.size}`);
}
for (const name of M5B3_EFFECT_NAMES) {
  if (!AI_CHECK_BAD_MOVE_TABLE_EFFECTS.has(name)) {
    throw new Error(`gen-cbm-m5b3-vectors: ${name} is not a real AI_CheckBadMove table effect`);
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
  if (!abilityIdByName.has(name)) throw new Error(`gen-cbm-m5b3-vectors: unknown ability ${name}`);
  return abilityIdByName.get(name);
}

const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};

const scoredCases = [];
const accUpCases = [];

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
  throw new Error(`gen-cbm-m5b3-vectors: unrecognized draw reason ${reason} (M5b-3 handlers are zero-RNG)`);
}

function pushCase(label, moveId, t, atk, rngValue) {
  const move = cbm.MOVES_BY_ID.get(moveId);
  if (!move) throw new Error(`gen-cbm-m5b3-vectors: unknown move ${moveId} (case ${label})`);
  if (!M5B3_EFFECT_NAMES.has(move.effect)) {
    throw new Error(
      `gen-cbm-m5b3-vectors: case ${label} uses move ${moveId} with effect ${move.effect}, not in the M5b-3 batch`,
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
    throw new Error(`gen-cbm-m5b3-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 3) {
    throw new Error(`gen-cbm-m5b3-vectors: case ${label} produced ${result.draws.length} draws, expected <=3`);
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
    targetIsEscapePrevented: t.isEscapePrevented ?? null,
    targetIsTormented: t.isTormented ?? null,
    targetAnyMoveDisabled: t.anyMoveDisabled ?? null,
    targetAnyMoveEncored: t.anyMoveEncored ?? null,
    attackerAtkStage: atk.atkStage,
    attackerDefStage: atk.defStage,
    attackerSpeedStage: atk.speedStage ?? null,
    attackerSpAtkStage: atk.spAtkStage ?? null,
    attackerSpDefStage: atk.spDefStage ?? null,
    attackerEvasionStage: atk.evasionStage ?? null,
    attackerAccStage: atk.accStage ?? null,
    attackerLightScreenUp: atk.lightScreenUp ?? null,
    attackerReflectUp: atk.reflectUp ?? null,
    attackerSafeguardUp: atk.safeguardUp ?? null,
    attackerIsAsleep: atk.isAsleep ?? null,
    attackerUsablePartyMons: atk.usablePartyMons ?? null,
    attackerHasSubstitute: atk.hasSubstitute ?? null,
    attackerHp: atk.hp ?? null,
    attackerMaxHp: atk.maxHp ?? null,
    attackerMistUp: atk.mistUp ?? null,
    attackerImprisonedOthers: atk.imprisonedOthers ?? null,
    attackerMudSportUp: atk.mudSportUp ?? null,
    attackerWaterSportUp: atk.waterSportUp ?? null,
    attackerUsedHeldItemId: atk.usedHeldItemId ?? null,
    attackerStockpileCount: atk.stockpileCount ?? null,
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedDrawCount: result.draws.length,
    draws,
    expectedScoreDelta: result.scoreDelta,
  });
}

// runCbmAccUp direct-call cases (EFFECT_ACCURACY_UP(+_2), no real move --
// TS exports this handler for exactly this reason, :3380).
function pushAccUpCase(label, accStage) {
  const scoreDelta = runCbmAccUp(accStage);
  accUpCases.push({ label, accStage, expectedScoreDelta: scoreDelta });
}

const RNG_SEED = 249_678_687; // tests/factoryAiCheckBadMove.test.ts:1541, same convention as gen-cbm-m5b1/2-vectors.mjs.
const SHUCKLE = 213; // single ability Sturdy: zero-RNG short-circuit.
const MAROWAK = 105; // Rock Head / Lightning Rod: ambiguous, drives the negates-type + soundproof draws.
const MAX_STAGE = 12;
const DEFAULT_STAGE = 6;
const MIN_STAGE = 0;
const rngStream = new GbaRng(0x2468_ace0);

// === stat-UP family (TS :956-1063, dispatch :1878-2006, test.ts:2484-2913) ===

const STAGE_SHUCKLE_BASE = [SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"]];

pushCase("attack_up_maxed", 96 /* Meditate, EFFECT_ATTACK_UP */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: MAX_STAGE }), RNG_SEED);
pushCase("attack_up_2_not_maxed", 14 /* Swords Dance, EFFECT_ATTACK_UP_2 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE }), RNG_SEED);
for (let stage = 0; stage <= 12; stage += 3) {
  rngStream.next();
  pushCase(`attack_up_sweep_stage${stage}`, 96, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: stage }), rngStream.rngValue);
}

pushCase("defense_up_maxed", 106 /* Harden, EFFECT_DEFENSE_UP */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ defStage: MAX_STAGE }), RNG_SEED);
pushCase("defense_up_2_not_maxed", 112 /* Barrier, EFFECT_DEFENSE_UP_2 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ defStage: DEFAULT_STAGE }), RNG_SEED);
pushCase("defense_curl_maxed", 111 /* Defense Curl, EFFECT_DEFENSE_CURL */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ defStage: MAX_STAGE }), RNG_SEED);

pushCase("bulk_up_both_maxed", 339 /* Bulk Up */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: MAX_STAGE, defStage: MAX_STAGE }), RNG_SEED);
pushCase("bulk_up_def_only", 339, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, defStage: MAX_STAGE }), RNG_SEED);
pushCase("bulk_up_neither", 339, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, defStage: DEFAULT_STAGE }), RNG_SEED);
pushCase("curse_both_maxed", 174 /* Curse, reuses runCbmBulkUp */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: MAX_STAGE, defStage: MAX_STAGE }), RNG_SEED);
pushCase("curse_neither", 174, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, defStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("speed_up_2_maxed", 97 /* Agility, EFFECT_SPEED_UP_2 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ speedStage: MAX_STAGE }), RNG_SEED);
pushCase("speed_up_2_not_maxed", 97, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ speedStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("sp_atk_up_2_maxed", 294 /* Tail Glow, EFFECT_SPECIAL_ATTACK_UP_2 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spAtkStage: MAX_STAGE }), RNG_SEED);
pushCase("sp_atk_up_2_not_maxed", 294, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spAtkStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("sp_def_up_2_maxed", 133 /* Amnesia, EFFECT_SPECIAL_DEFENSE_UP_2 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spDefStage: MAX_STAGE }), RNG_SEED);
pushCase("sp_def_up_2_not_maxed", 133, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spDefStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("cosmic_power_both_maxed", 322 /* Cosmic Power */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ defStage: MAX_STAGE, spDefStage: MAX_STAGE }), RNG_SEED);
pushCase("cosmic_power_spdef_only", 322, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ defStage: DEFAULT_STAGE, spDefStage: MAX_STAGE }), RNG_SEED);
pushCase("cosmic_power_neither", 322, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ defStage: DEFAULT_STAGE, spDefStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("calm_mind_both_maxed", 347 /* Calm Mind */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spAtkStage: MAX_STAGE, spDefStage: MAX_STAGE }), RNG_SEED);
pushCase("calm_mind_spdef_only", 347, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spAtkStage: DEFAULT_STAGE, spDefStage: MAX_STAGE }), RNG_SEED);
pushCase("calm_mind_neither", 347, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ spAtkStage: DEFAULT_STAGE, spDefStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("dragon_dance_both_maxed", 349 /* Dragon Dance */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: MAX_STAGE, speedStage: MAX_STAGE }), RNG_SEED);
pushCase("dragon_dance_speed_only", 349, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, speedStage: MAX_STAGE }), RNG_SEED);
pushCase("dragon_dance_neither", 349, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, speedStage: DEFAULT_STAGE }), RNG_SEED);

pushCase("stat_up_ambiguous_species_draws", 96, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker({ atkStage: MAX_STAGE }), RNG_SEED);

// === screens + Evasion Up/Minimize (TS :1079-1113, dispatch :2008-2046, ====
// test.ts:3050-3175) ===========================================================

pushCase("light_screen_up", 113 /* Light Screen */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ lightScreenUp: true }), RNG_SEED);
pushCase("light_screen_down", 113, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ lightScreenUp: false }), RNG_SEED);
pushCase("reflect_up", 115 /* Reflect */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ reflectUp: true }), RNG_SEED);
pushCase("reflect_down", 115, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ reflectUp: false }), RNG_SEED);
pushCase("evasion_up_maxed", 104 /* Double Team, EFFECT_EVASION_UP */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ evasionStage: MAX_STAGE }), RNG_SEED);
pushCase("evasion_up_not_maxed", 104, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ evasionStage: DEFAULT_STAGE }), RNG_SEED);
pushCase("minimize_maxed", 107 /* Minimize, EFFECT_MINIMIZE */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ evasionStage: MAX_STAGE }), RNG_SEED);
pushCase("minimize_not_maxed", 107, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ evasionStage: DEFAULT_STAGE }), RNG_SEED);

// === Safeguard, Snore/Sleep Talk (TS :3031-3044, dispatch :2260-2282, ======
// test.ts:3546-3629) ===========================================================

pushCase("safeguard_up", 219 /* Safeguard */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ safeguardUp: true }), RNG_SEED);
pushCase("safeguard_down", 219, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ safeguardUp: false }), RNG_SEED);
pushCase("snore_asleep", 173 /* Snore, power 40 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ isAsleep: true }), RNG_SEED);
pushCase("snore_not_asleep", 173, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ isAsleep: false }), RNG_SEED);
pushCase("snore_ambiguous_negates_type_and_soundproof_draws", 173, target(MAROWAK, ["TYPE_NORMAL", "TYPE_NORMAL"], null, "ABILITY_ROCK_HEAD"), attacker({ isAsleep: true }), RNG_SEED);
pushCase("sleep_talk_asleep", 214 /* Sleep Talk, power 0 */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ isAsleep: true }), RNG_SEED);
pushCase("sleep_talk_not_asleep", 214, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ isAsleep: false }), RNG_SEED);

// === Baton Pass, Substitute (TS :3093-3113, dispatch :2305-2327, ===========
// test.ts:3694-4012) ===========================================================

pushCase("baton_pass_zero_party", 226 /* Baton Pass */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ usablePartyMons: 0 }), RNG_SEED);
pushCase("baton_pass_nonzero_party", 226, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ usablePartyMons: 2 }), RNG_SEED);
pushCase("substitute_own_substitute_up", 164 /* Substitute */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ hasSubstitute: true, hp: 1, maxHp: 100 }), RNG_SEED);
pushCase("substitute_low_hp", 164, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ hasSubstitute: false, hp: 25, maxHp: 100 }), RNG_SEED);
pushCase("substitute_all_clear", 164, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ hasSubstitute: false, hp: 100, maxHp: 100 }), RNG_SEED);
for (let i = 0; i <= 100; i += 25) {
  rngStream.next();
  pushCase(`substitute_hp_sweep_${i}`, 164, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ hasSubstitute: false, hp: i, maxHp: 100 }), rngStream.rngValue);
}

// === Mean Look, Torment (TS :3140-3151, dispatch :2341-2363, ===============
// test.ts:3694-4012) ===========================================================

pushCase("mean_look_already_trapped", 212 /* Mean Look */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { isEscapePrevented: true }), attacker(), RNG_SEED);
pushCase("mean_look_not_trapped", 212, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { isEscapePrevented: false }), attacker(), RNG_SEED);
pushCase("torment_already_tormented", 259 /* Torment */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { isTormented: true }), attacker(), RNG_SEED);
pushCase("torment_not_tormented", 259, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { isTormented: false }), attacker(), RNG_SEED);

// === Helping Hand, Tickle, Belly Drum (TS :3264-3294, dispatch :2365-2404, =
// test.ts:3694-4012) ===========================================================

pushCase("helping_hand_constant", 270 /* Helping Hand */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker(), RNG_SEED);
pushCase("tickle_both_floor", 321 /* Tickle */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: MIN_STAGE, defStage: MIN_STAGE }), attacker(), RNG_SEED);
pushCase("tickle_atk_floor_only", 321, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: MIN_STAGE, defStage: DEFAULT_STAGE }), attacker(), RNG_SEED);
pushCase("tickle_def_floor_only", 321, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: DEFAULT_STAGE, defStage: MIN_STAGE }), attacker(), RNG_SEED);
pushCase("tickle_neither_floor", 321, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: DEFAULT_STAGE, defStage: DEFAULT_STAGE }), attacker(), RNG_SEED);
pushCase("belly_drum_low_hp", 187 /* Belly Drum */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: MAX_STAGE, hp: 50, maxHp: 100 }), RNG_SEED);
pushCase("belly_drum_falls_through_maxed_atk", 187, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: MAX_STAGE, hp: 51, maxHp: 100 }), RNG_SEED);
pushCase("belly_drum_all_clear", 187, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, hp: 100, maxHp: 100 }), RNG_SEED);
for (let i = 0; i <= 100; i += 25) {
  rngStream.next();
  pushCase(`belly_drum_hp_sweep_${i}`, 187, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ atkStage: DEFAULT_STAGE, hp: i, maxHp: 100 }), rngStream.rngValue);
}

// === Haze, Psych Up, Mist, Disable, Encore (TS :3435-3485, =================
// dispatch :2457-2526, test.ts:4150-4356) ======================================

function hazeAttacker(stage, overrides = {}) {
  return attacker({
    atkStage: stage, defStage: stage, speedStage: stage, spAtkStage: stage,
    spDefStage: stage, accStage: stage, evasionStage: stage, ...overrides,
  });
}
function hazeTarget(stage, overrides = {}) {
  return target(SHUCKLE, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_STURDY", "ABILITY_STURDY", {
    speedStage: stage, atkStage: stage, defStage: stage, spDefStage: stage,
    accStage: stage, evasionStage: stage, spAtkStage: stage, ...overrides,
  });
}

pushCase("haze_all_neutral_scores_minus10", 114 /* Haze */, hazeTarget(DEFAULT_STAGE), hazeAttacker(DEFAULT_STAGE), RNG_SEED);
pushCase("haze_own_atk_lowered", 114, hazeTarget(DEFAULT_STAGE), hazeAttacker(DEFAULT_STAGE, { atkStage: 0 }), RNG_SEED);
pushCase("haze_own_evasion_lowered", 114, hazeTarget(DEFAULT_STAGE), hazeAttacker(DEFAULT_STAGE, { evasionStage: 0 }), RNG_SEED);
pushCase("haze_target_spatk_raised", 114, hazeTarget(DEFAULT_STAGE, { spAtkStage: MAX_STAGE }), hazeAttacker(DEFAULT_STAGE), RNG_SEED);
pushCase("haze_target_evasion_raised", 114, hazeTarget(DEFAULT_STAGE, { evasionStage: MAX_STAGE }), hazeAttacker(DEFAULT_STAGE), RNG_SEED);
pushCase("haze_own_lowered_wins_over_target_raised", 114, hazeTarget(MAX_STAGE), hazeAttacker(0), RNG_SEED);
pushCase("psych_up_all_neutral_scores_minus10", 244 /* Psych Up, reuses runCbmHaze */, hazeTarget(DEFAULT_STAGE), hazeAttacker(DEFAULT_STAGE), RNG_SEED);
pushCase("psych_up_own_atk_lowered", 244, hazeTarget(DEFAULT_STAGE), hazeAttacker(DEFAULT_STAGE, { atkStage: 0 }), RNG_SEED);
for (let stage = 0; stage <= 12; stage += 4) {
  rngStream.next();
  pushCase(`haze_uniform_stage_sweep_${stage}`, 114, hazeTarget(stage), hazeAttacker(stage), rngStream.rngValue);
}

pushCase("mist_up", 54 /* Mist */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ mistUp: true }), RNG_SEED);
pushCase("mist_down", 54, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ mistUp: false }), RNG_SEED);
pushCase("disable_already_disabled", 50 /* Disable */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { anyMoveDisabled: true }), attacker(), RNG_SEED);
pushCase("disable_none_disabled", 50, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { anyMoveDisabled: false }), attacker(), RNG_SEED);
pushCase("encore_already_encored", 227 /* Encore */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { anyMoveEncored: true }), attacker(), RNG_SEED);
pushCase("encore_none_encored", 227, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { anyMoveEncored: false }), attacker(), RNG_SEED);

// === Memento, Stockpile, Recycle, Imprison, Mud/Water Sport (TS :3568-3657, =
// dispatch :2545-2637, test.ts:4438-4692) ======================================

pushCase("memento_atk_floor", 262 /* Memento */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: MIN_STAGE }), attacker({ usablePartyMons: 1 }), RNG_SEED);
pushCase("memento_sp_atk_floor", 262, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: DEFAULT_STAGE, spAtkStage: MIN_STAGE }), attacker({ usablePartyMons: 1 }), RNG_SEED);
pushCase("memento_falls_through_zero_party", 262, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: DEFAULT_STAGE, spAtkStage: DEFAULT_STAGE }), attacker({ usablePartyMons: 0 }), RNG_SEED);
pushCase("memento_falls_through_nonzero_party", 262, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY", { atkStage: DEFAULT_STAGE, spAtkStage: DEFAULT_STAGE }), attacker({ usablePartyMons: 2 }), RNG_SEED);
for (let count = 0; count <= 3; count += 1) {
  rngStream.next();
  pushCase(`stockpile_sweep_${count}`, 254 /* Stockpile */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ stockpileCount: count }), rngStream.rngValue);
}
pushCase("recycle_no_item", 278 /* Recycle */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ usedHeldItemId: 0 }), RNG_SEED);
pushCase("recycle_has_item", 278, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ usedHeldItemId: 4 /* ITEM_POTION-ish, just nonzero */ }), RNG_SEED);
pushCase("imprison_already_up", 286 /* Imprison */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ imprisonedOthers: true }), RNG_SEED);
pushCase("imprison_not_up", 286, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ imprisonedOthers: false }), RNG_SEED);
pushCase("mud_sport_already_up", 300 /* Mud Sport */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ mudSportUp: true }), RNG_SEED);
pushCase("mud_sport_not_up", 300, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ mudSportUp: false }), RNG_SEED);
pushCase("water_sport_already_up", 346 /* Water Sport */, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ waterSportUp: true }), RNG_SEED);
pushCase("water_sport_not_up", 346, target(...STAGE_SHUCKLE_BASE, "ABILITY_STURDY", "ABILITY_STURDY"), attacker({ waterSportUp: false }), RNG_SEED);

// === AccUp (vestigial, direct calls to runCbmAccUp, TS :3380-3382) =========

pushAccUpCase("acc_up_maxed", MAX_STAGE);
pushAccUpCase("acc_up_not_maxed", DEFAULT_STAGE);
for (let stage = 0; stage <= 12; stage += 2) {
  pushAccUpCase(`acc_up_sweep_stage${stage}`, stage);
}

// === emit Rust source ========================================================

function drawCaseLiteral(d) {
  return `CbmM5b3DrawCase { ordinal: ${d.ordinal}, site: ${d.site}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, guessed_ability: ${d.guessedAbility} }`;
}

function optBool(v) {
  return v === null || v === undefined ? "None" : v ? "Some(true)" : "Some(false)";
}

function optU8(v) {
  return v === null || v === undefined ? "None" : `Some(${v})`;
}

function optU16(v) {
  return v === null || v === undefined ? "None" : `Some(${v})`;
}

function optI32(v) {
  return v === null || v === undefined ? "None" : `Some(${v})`;
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cbm-m5b3-vectors.mjs — regenerate: node core-rs/tools/gen-cbm-m5b3-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckBadMove.ts's runCheckBadMovePreamble");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One `next_get_ability_draw` call recorded inside a scored case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b3DrawCase {");
lines.push("    pub ordinal: u32,");
lines.push("    /// Matches `CheckBadMoveDrawSite`'s own discriminants (0=NegatesType, 1=Soundproof — M5b-3 handlers are zero-RNG, so no other site can appear).");
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

lines.push("/// One M5b-3 `run_check_bad_move_preamble` case that reached");
lines.push("/// `CheckBadMoveResult::Scored`. Every optional field mirrors the matching");
lines.push("/// `FactoryAiCheckBadMoveTarget`/`FactoryAiCheckBadMoveAttacker` field 1:1;");
lines.push("/// `None` reproduces that field's own TS-side default.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b3ScoredCase {");
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
lines.push("    pub target_is_escape_prevented: Option<bool>,");
lines.push("    pub target_is_tormented: Option<bool>,");
lines.push("    pub target_any_move_disabled: Option<bool>,");
lines.push("    pub target_any_move_encored: Option<bool>,");
lines.push("    pub attacker_atk_stage: u8,");
lines.push("    pub attacker_def_stage: u8,");
lines.push("    pub attacker_speed_stage: Option<u8>,");
lines.push("    pub attacker_sp_atk_stage: Option<u8>,");
lines.push("    pub attacker_sp_def_stage: Option<u8>,");
lines.push("    pub attacker_evasion_stage: Option<u8>,");
lines.push("    pub attacker_acc_stage: Option<u8>,");
lines.push("    pub attacker_light_screen_up: Option<bool>,");
lines.push("    pub attacker_reflect_up: Option<bool>,");
lines.push("    pub attacker_safeguard_up: Option<bool>,");
lines.push("    pub attacker_is_asleep: Option<bool>,");
lines.push("    pub attacker_usable_party_mons: Option<u8>,");
lines.push("    pub attacker_has_substitute: Option<bool>,");
lines.push("    pub attacker_hp: Option<i32>,");
lines.push("    pub attacker_max_hp: Option<i32>,");
lines.push("    pub attacker_mist_up: Option<bool>,");
lines.push("    pub attacker_imprisoned_others: Option<bool>,");
lines.push("    pub attacker_mud_sport_up: Option<bool>,");
lines.push("    pub attacker_water_sport_up: Option<bool>,");
lines.push("    pub attacker_used_held_item_id: Option<u16>,");
lines.push("    pub attacker_stockpile_count: Option<u8>,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CbmM5b3DrawCase; 3],");
lines.push("    pub expected_score_delta: i32,");
lines.push("}");
lines.push(`pub static CBM_M5B3_SCORED_CASES: [CbmM5b3ScoredCase; ${scoredCases.length}] = [`);
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
    `target_is_escape_prevented: ${optBool(c.targetIsEscapePrevented)}`,
    `target_is_tormented: ${optBool(c.targetIsTormented)}`,
    `target_any_move_disabled: ${optBool(c.targetAnyMoveDisabled)}`,
    `target_any_move_encored: ${optBool(c.targetAnyMoveEncored)}`,
    `attacker_atk_stage: ${c.attackerAtkStage}`,
    `attacker_def_stage: ${c.attackerDefStage}`,
    `attacker_speed_stage: ${optU8(c.attackerSpeedStage)}`,
    `attacker_sp_atk_stage: ${optU8(c.attackerSpAtkStage)}`,
    `attacker_sp_def_stage: ${optU8(c.attackerSpDefStage)}`,
    `attacker_evasion_stage: ${optU8(c.attackerEvasionStage)}`,
    `attacker_acc_stage: ${optU8(c.attackerAccStage)}`,
    `attacker_light_screen_up: ${optBool(c.attackerLightScreenUp)}`,
    `attacker_reflect_up: ${optBool(c.attackerReflectUp)}`,
    `attacker_safeguard_up: ${optBool(c.attackerSafeguardUp)}`,
    `attacker_is_asleep: ${optBool(c.attackerIsAsleep)}`,
    `attacker_usable_party_mons: ${optU8(c.attackerUsablePartyMons)}`,
    `attacker_has_substitute: ${optBool(c.attackerHasSubstitute)}`,
    `attacker_hp: ${optI32(c.attackerHp)}`,
    `attacker_max_hp: ${optI32(c.attackerMaxHp)}`,
    `attacker_mist_up: ${optBool(c.attackerMistUp)}`,
    `attacker_imprisoned_others: ${optBool(c.attackerImprisonedOthers)}`,
    `attacker_mud_sport_up: ${optBool(c.attackerMudSportUp)}`,
    `attacker_water_sport_up: ${optBool(c.attackerWaterSportUp)}`,
    `attacker_used_held_item_id: ${optU16(c.attackerUsedHeldItemId)}`,
    `attacker_stockpile_count: ${optU8(c.attackerStockpileCount)}`,
    `expected_rng_value: ${c.expectedRngValue}`,
    `expected_rng_calls: ${c.expectedRngCalls}`,
    `expected_draw_count: ${c.expectedDrawCount}`,
    `draws: [${drawCaseLiteral(c.draws[0])}, ${drawCaseLiteral(c.draws[1])}, ${drawCaseLiteral(c.draws[2])}]`,
    `expected_score_delta: ${c.expectedScoreDelta}`,
  ];
  lines.push(`    // ${c.label}\n    CbmM5b3ScoredCase { ${fields.join(", ")} },`);
}
lines.push("];");
lines.push("");

lines.push("/// One direct `run_cbm_acc_up` case (`EFFECT_ACCURACY_UP(_2)`, no real");
lines.push("/// Gen-3 move -- TS exports `runCbmAccUp` for exactly this, :3380, called");
lines.push("/// directly here instead of through the full preamble). Zero-RNG.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmM5b3AccUpCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub acc_stage: u8,");
lines.push("    pub expected_score_delta: i32,");
lines.push("}");
lines.push(`pub static CBM_M5B3_ACC_UP_CASES: [CbmM5b3AccUpCase; ${accUpCases.length}] = [`);
for (const c of accUpCases) {
  lines.push(
    `    CbmM5b3AccUpCase { label: ${JSON.stringify(c.label)}, acc_stage: ${c.accStage}, expected_score_delta: ${c.expectedScoreDelta} },`,
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
  throw new Error("gen-cbm-m5b3-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cbm-m5b3-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-cbm-m5b3-vectors: ${scoredCases.length} scored cases, ${accUpCases.length} acc-up direct cases`,
);
