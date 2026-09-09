#!/usr/bin/env node
// Differential corpus for the shared hit-chain helper
// `calculateBattleScriptBaseDamageForCurrentMove`
// (src/engine/battleScriptHitChainOpcode.ts:1507-1580).
//
// Expected damage values and thrown messages come only from executing the
// canonical TypeScript helper through `createBattleScriptRulesContext`. This
// generator owns bounded input construction and Rust literal emission; it
// must never reimplement CalculateBaseDamage or the hold-effect/type
// resolvers. The item hold-effect catalog is a mechanical transcription of
// src/data/gen/item-hold-effects.json (same precedent as
// battle_script_weightdamage_catalog_gen.rs's species table).
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-base-damage-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const coreSourceDir = path.join(workspaceRoot, "core-rs", "crates", "factory-core", "src");
const vectorsOutPath = path.join(coreSourceDir, "battle_script_base_damage_vectors_gen.rs");
const catalogOutPath = path.join(coreSourceDir, "battle_script_base_damage_item_catalog_gen.rs");
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const itemHoldEffects = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "item-hold-effects.json"), "utf8"),
);

const rulesModule = await import(
  pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href
);
const opcodeModule = await import(
  pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href
);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-base-damage-vectors: ${message}`);
}

// --- Item hold-effect catalog (mechanical JSON -> Rust transcription) -----
assert(itemHoldEffects.itemsCount === 377, "item-hold-effects itemsCount drifted");
const catalogRows = itemHoldEffects.items
  .map((row) => Object.freeze({ itemId: row.itemId, holdEffectId: row.holdEffectId, holdEffectParam: row.holdEffectParam }))
  .sort((a, b) => a.itemId - b.itemId);
const catalogJson = JSON.stringify(catalogRows);
const catalogHash = crypto.createHash("sha256").update(catalogJson).digest("hex");

// --- Constants mirrored from battleScriptHitChainOpcode.ts / battleScriptRulesContext.ts ---
const ITEM_ENIGMA_BERRY = 175;
const ITEMS_COUNT = 377;
const TYPE_ELECTRIC = 13, TYPE_FIRE = 10, TYPE_WATER = 11, TYPE_PSYCHIC = 14, TYPE_STEEL = 8, TYPE_MYSTERY = 9, TYPE_NORMAL = 0;
const STATUS3_MUDSPORT = 1 << 16;
const STATUS3_WATERSPORT = 1 << 17;
const STATUS1_BURN = 1 << 4;
const STATUS1_POISON = 1 << 0;
const ABILITY_SAND_VEIL = 8, ABILITY_COMPOUND_EYES = 14, ABILITY_HUSTLE = 55, ABILITY_GUTS = 62;
const ABILITY_HUGE_POWER = 37, ABILITY_PURE_POWER = 74, ABILITY_MARVEL_SCALE = 63, ABILITY_PLUS = 57, ABILITY_MINUS = 58;
const ABILITY_CLOUD_NINE = 13, ABILITY_AIR_LOCK = 77;
const ITEM_CHOICE_BAND = 186, ITEM_METAL_COAT = 199, ITEM_TWISTED_SPOON = 214, ITEM_DEEP_SEA_TOOTH = 192,
  ITEM_DEEP_SEA_SCALE = 193, ITEM_LIGHT_BALL = 202, ITEM_METAL_POWDER = 223, ITEM_THICK_CLUB = 224,
  ITEM_SOUL_DEW = 191, ITEM_SCOPE_LENS = 198;
const SPECIES_PIKACHU = 25, SPECIES_CUBONE = 104, SPECIES_DITTO = 132, SPECIES_CLAMPERL = 373, SPECIES_LATIAS = 380;
const MOVE_TACKLE = 33; // physical Normal, power 35
const MOVE_CONFUSION = 93; // special Psychic
const MOVE_SWIFT = 129; // TYPE_NORMAL, unaffected by sports
const MOVE_SOLAR_BEAM = 76; // TYPE_GRASS special
const MOVE_SELFDESTRUCT = 120; // EFFECT_EXPLOSION physical
const MOVE_STRUGGLE = 165; // no reliable EFFECT_EXPLOSION; unused
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
const BATTLE_TYPE_FRONTIER = (1 << 8) | (1 << 16) | (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20) | (1 << 21);

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex16(value) { return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`; }
function rustString(value) { return JSON.stringify(value); }
function rustI32(value) { return `${value}i32`; }

function defaultBattlerSpec(index) {
  return {
    side: index % 2,
    ability: 0,
    item: 0,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1 + index,
    attack: 60 + index * 3,
    defense: 60 + index * 2,
    spAttack: 60 + index,
    spDefense: 60 + index * 4,
    level: 50,
    speed: 60,
    hp: 100,
    maxHP: 100,
    status1: 0,
    status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    flashFireBoosted: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side,
    ability: spec.ability,
    hp: spec.hp,
    maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]),
    pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1,
    status2: 0,
    status3: spec.status3,
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
    item: spec.item,
    statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()),
    species: spec.species,
    attack: spec.attack,
    defense: spec.defense,
    spAttack: spec.spAttack,
    spDefense: spec.spDefense,
    speed: spec.speed,
    level: spec.level,
    friendship: 70,
    partyIndex: index,
    flashFireBoosted: spec.flashFireBoosted,
  });
}

// `createBattleScriptRulesContext` eagerly resolves `currentMoveEffect` from
// `currentMove` at construction time (battleScriptRulesContext.ts:2622,
// resolveBattleScriptCurrentMoveEffect), which throws BEFORE
// calculateBattleScriptBaseDamageForCurrentMove's own requireMoveRow guard
// ever runs -- exactly the same "unreachable through the full pipeline"
// shape as battleScriptTrysetfutureattackOpcode.ts's NotAFutureMove. To
// replay the helper's OWN unknown-move-row error, construction uses a safe
// placeholder move and the real (possibly invalid) currentMove is spliced
// into the frozen context afterward, never touching construction-time
// validation.
function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2, currentMove = MOVE_TACKLE,
  dynamicBasePower = 0, dynamicMoveType = 0, weather = 0, critMultiplier = 1,
  // battlersCount 4 requires the doubles bit set (same convention as
  // gen-battle-script-trysetfutureattack-vectors.mjs's canonicalRules).
  battleTypeFlags = battlersCount === 4 ? 1 << 0 : 0,
  enigmaBerryHoldEffects = [0, 0, 0, 0], enigmaBerryHoldEffectParams = [0, 0, 0, 0],
}) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
    }),
    battleTopology: Object.freeze({
      battlersCount,
      battleTypeFlags,
      battlerPositions: battlersCount === 4 ? Object.freeze([0, 1, 2, 3]) : Object.freeze([0, 1, 0xff, 0xff]),
    }),
    absentBattlerFlags: 0,
    sideStatuses: Object.freeze([0, 0]),
    futureSightCounter: Object.freeze([0, 0, 0, 0]),
    futureSightMove: Object.freeze([0, 0, 0, 0]),
    futureSightAttacker: Object.freeze([0, 0, 0, 0]),
    futureSightDmg: Object.freeze([0, 0, 0, 0]),
    multistringChooser: 0xff,
    dynamicBasePower,
    dynamicMoveType,
    weather,
    enigmaBerryHoldEffects: freezeArray(enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(enigmaBerryHoldEffectParams),
  });
}

function canonicalRules(spec) {
  const wantedMove = spec.currentMove ?? MOVE_TACKLE;
  try {
    return canonicalRulesRaw(spec);
  } catch {
    const placeholder = canonicalRulesRaw({ ...spec, currentMove: MOVE_TACKLE });
    return Object.freeze({ ...placeholder, currentMove: wantedMove });
  }
}

function baseSpec(overrides = {}) {
  const battlerSpecs = [0, 1, 2, 3].map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, target: 1, ...overrides };
}
function withBattler(spec, index, changes) {
  const battlerSpecs = spec.battlerSpecs.map((value, i) => (i === index ? { ...value, ...changes } : value));
  return { ...spec, battlerSpecs };
}

function projectRules(rulesSpec) {
  const battlers = rulesSpec.battlerSpecs.map((spec) => Object.freeze({
    item: spec.item, ability: spec.ability, species: spec.species,
    types: freezeArray(spec.types.map((t) => TYPE_NAME_TO_ID[t])),
    level: spec.level, attack: spec.attack, defense: spec.defense,
    spAttack: spec.spAttack, spDefense: spec.spDefense,
    statStages: Object.freeze({ atk: spec.statStages[1], def: spec.statStages[2], spAtk: spec.statStages[4], spDef: spec.statStages[5] }),
    hp: spec.hp, maxHp: spec.maxHP, status1: spec.status1, status3: spec.status3,
    flashFireBoosted: spec.flashFireBoosted,
  }));
  return Object.freeze({
    battlers: freezeArray(battlers),
    battlersCount: rulesSpec.battlersCount ?? 2,
    battleTypeFlags: rulesSpec.battleTypeFlags
      ?? ((rulesSpec.battlersCount ?? 2) === 4 ? 1 << 0 : 0),
    weather: rulesSpec.weather ?? 0,
    currentMove: rulesSpec.currentMove ?? MOVE_TACKLE,
    dynamicBasePower: rulesSpec.dynamicBasePower ?? 0,
    dynamicMoveType: rulesSpec.dynamicMoveType ?? 0,
    critMultiplier: rulesSpec.critMultiplier ?? 1,
    attacker: rulesSpec.attacker ?? null,
    target: rulesSpec.target ?? null,
    enigmaBerryHoldEffects: freezeArray(rulesSpec.enigmaBerryHoldEffects ?? [0, 0, 0, 0]),
    enigmaBerryHoldEffectParams: freezeArray(rulesSpec.enigmaBerryHoldEffectParams ?? [0, 0, 0, 0]),
  });
}

const TYPE_NAME_TO_ID = Object.freeze({
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
});

function sourceOutcome(rulesSpec) {
  try {
    const rules = canonicalRules(rulesSpec);
    const damage = opcodeModule.calculateBattleScriptBaseDamageForCurrentMove(rules);
    return Object.freeze({ damage, error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({ damage: null, error: error.message });
  }
}

const cases = [];
function addCase(label, category, rulesSpec) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec);
  cases.push(Object.freeze({ label, category, rules: projectRules(rulesSpec), ...outcome }));
}

// --- Role errors -------------------------------------------------------
addCase("missing_attacker_role", "role-errors", baseSpec({ attacker: null }));
addCase("missing_target_role", "role-errors", baseSpec({ target: null }));

// --- Unknown move row error ---------------------------------------------
addCase("unknown_move_row", "move-row-error", baseSpec({ currentMove: 60000 }));

// --- Dynamic type: win + mask (incl 0x80 -> Normal) + out-of-domain -----
addCase("dynamic_type_zero_uses_move_row", "dynamic-type", baseSpec({ currentMove: MOVE_CONFUSION, dynamicMoveType: 0 }));
addCase("dynamic_type_wins_over_move_row", "dynamic-type", baseSpec({ currentMove: MOVE_CONFUSION, dynamicMoveType: TYPE_FIRE }));
addCase("dynamic_type_masked_0x80_is_normal", "dynamic-type", baseSpec({ currentMove: MOVE_CONFUSION, dynamicMoveType: 0x80 }));
addCase("dynamic_type_out_of_domain_error", "dynamic-type", baseSpec({ currentMove: MOVE_CONFUSION, dynamicMoveType: 0x3f }));

// --- dynamicBasePower zero/nonzero ---------------------------------------
addCase("dynamic_base_power_zero_uses_move_row_power", "dynamic-base-power", baseSpec({ currentMove: MOVE_TACKLE, dynamicBasePower: 0 }));
addCase("dynamic_base_power_nonzero_overrides", "dynamic-base-power", baseSpec({ currentMove: MOVE_TACKLE, dynamicBasePower: 200 }));

// --- Mud Sport / Water Sport halving --------------------------------------
{
  const moveElectric = 84; // THUNDERBOLT: TYPE_ELECTRIC special
  addCase("mudsport_attacker_halves_electric", "sport-halving", withBattler(baseSpec({ currentMove: moveElectric }), 0, { status3: STATUS3_MUDSPORT }));
  addCase("mudsport_other_battler_halves_electric", "sport-halving", withBattler(baseSpec({ currentMove: moveElectric }), 1, { status3: STATUS3_MUDSPORT }));
  addCase("mudsport_fainted_battler_still_halves", "sport-halving", withBattler(baseSpec({ currentMove: moveElectric }), 1, { status3: STATUS3_MUDSPORT, hp: 0 }));
  addCase(
    "mudsport_index_beyond_battlers_count_ignored", "sport-halving",
    withBattler(baseSpec({ currentMove: moveElectric, battlersCount: 2 }), 2, { status3: STATUS3_MUDSPORT }),
  );
  addCase("mudsport_non_electric_unaffected", "sport-halving", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { status3: STATUS3_MUDSPORT }));
}
{
  addCase("watersport_halves_fire", "sport-halving", withBattler(baseSpec({ currentMove: MOVE_SOLAR_BEAM }), 0, { status3: STATUS3_WATERSPORT }));
  const fireMove = 52; // EMBER: TYPE_FIRE special
  addCase("watersport_halves_ember", "sport-halving", withBattler(baseSpec({ currentMove: fireMove }), 1, { status3: STATUS3_WATERSPORT }));
  const moveElectric = 84;
  let both = withBattler(baseSpec({ currentMove: moveElectric }), 0, { status3: STATUS3_MUDSPORT });
  both = withBattler(both, 1, { status3: STATUS3_WATERSPORT });
  addCase("both_sports_active_electric_move_only_mud_applies", "sport-halving", both);
  let bothFire = withBattler(baseSpec({ currentMove: fireMove }), 0, { status3: STATUS3_MUDSPORT });
  bothFire = withBattler(bothFire, 1, { status3: STATUS3_WATERSPORT });
  addCase("both_sports_active_fire_move_only_water_applies", "sport-halving", bothFire);
}

// --- Physical vs special vs TYPE_MYSTERY ----------------------------------
addCase("physical_move_baseline", "move-category", baseSpec({ currentMove: MOVE_TACKLE }));
addCase("special_move_baseline", "move-category", baseSpec({ currentMove: MOVE_CONFUSION }));
addCase("type_mystery_zero_damage", "move-category", baseSpec({ currentMove: MOVE_SWIFT, dynamicMoveType: TYPE_MYSTERY }));

// --- Crit vs stat stages ---------------------------------------------------
addCase("crit_multiplier_2", "crit", baseSpec({ currentMove: MOVE_TACKLE, critMultiplier: 2 }));
addCase("crit_multiplier_1", "crit", baseSpec({ currentMove: MOVE_TACKLE, critMultiplier: 1 }));
{
  let spec = baseSpec({ currentMove: MOVE_TACKLE, critMultiplier: 2 });
  spec = withBattler(spec, 0, { statStages: [6, 3, 6, 6, 6, 6, 6, 6] }); // attacker atk lowered
  spec = withBattler(spec, 1, { statStages: [6, 6, 9, 6, 6, 6, 6, 6] }); // defender def raised
  addCase("crit_ignores_lowered_attack_and_raised_defense", "crit", spec);
}
{
  let spec = baseSpec({ currentMove: MOVE_TACKLE, critMultiplier: 1 });
  spec = withBattler(spec, 0, { statStages: [6, 3, 6, 6, 6, 6, 6, 6] });
  spec = withBattler(spec, 1, { statStages: [6, 6, 9, 6, 6, 6, 6, 6] });
  addCase("non_crit_applies_stat_stages", "crit", spec);
}

// --- Burn / Guts --------------------------------------------------------
addCase("burned_without_guts_halves", "burn-guts", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { status1: STATUS1_BURN }));
addCase("burned_with_guts_no_halving", "burn-guts", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { status1: STATUS1_BURN, ability: ABILITY_GUTS }));
addCase("hustle_boosts_physical_attack", "burn-guts", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { ability: ABILITY_HUSTLE }));

// --- Huge Power / Pure Power NOT doubling (ability filter pin) ------------
addCase("huge_power_not_doubled", "ability-filter", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { ability: ABILITY_HUGE_POWER }));
addCase("pure_power_not_doubled", "ability-filter", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { ability: ABILITY_PURE_POWER }));
addCase("marvel_scale_inert", "ability-filter", withBattler(withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { ability: ABILITY_MARVEL_SCALE }), 1, { status1: STATUS1_POISON }));
{
  let spec = baseSpec({ currentMove: MOVE_CONFUSION, battlersCount: 4, attacker: 0, target: 2 });
  spec = withBattler(spec, 0, { ability: ABILITY_PLUS });
  spec = withBattler(spec, 1, { ability: ABILITY_MINUS });
  addCase("plus_minus_inert_via_field_scan", "ability-filter", spec);
}
addCase("sand_veil_allowed_ability_id", "ability-filter", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { ability: ABILITY_SAND_VEIL }));
addCase("compound_eyes_allowed_ability_id", "ability-filter", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { ability: ABILITY_COMPOUND_EYES }));

// --- Hold-effect families through real items ------------------------------
addCase("choice_band_boosts_attack", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { item: ITEM_CHOICE_BAND }));
addCase("type_boost_item_with_param", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { item: ITEM_METAL_COAT, types: ["TYPE_NORMAL", "TYPE_NORMAL"] }));
addCase(
  "soul_dew_frontier_bit_set_no_boost", "hold-effect-family",
  withBattler(baseSpec({ currentMove: MOVE_CONFUSION, battleTypeFlags: 1 << 8 }), 0, { item: ITEM_SOUL_DEW, species: SPECIES_LATIAS }),
);
addCase(
  "soul_dew_frontier_bit_clear_boosts", "hold-effect-family",
  withBattler(baseSpec({ currentMove: MOVE_CONFUSION, battleTypeFlags: 0 }), 0, { item: ITEM_SOUL_DEW, species: SPECIES_LATIAS }),
);
addCase("deep_sea_tooth_clamperl", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_CONFUSION }), 0, { item: ITEM_DEEP_SEA_TOOTH, species: SPECIES_CLAMPERL }));
addCase("deep_sea_tooth_non_clamperl_inert", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_CONFUSION }), 0, { item: ITEM_DEEP_SEA_TOOTH, species: 1 }));
addCase("deep_sea_scale_defender_clamperl", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_CONFUSION }), 1, { item: ITEM_DEEP_SEA_SCALE, species: SPECIES_CLAMPERL }));
addCase("light_ball_pikachu", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_CONFUSION }), 0, { item: ITEM_LIGHT_BALL, species: SPECIES_PIKACHU }));
addCase("metal_powder_ditto", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { item: ITEM_METAL_POWDER, species: SPECIES_DITTO }));
addCase("thick_club_cubone", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { item: ITEM_THICK_CLUB, species: SPECIES_CUBONE }));
addCase("unmapped_hold_effect_scope_lens_inert", "hold-effect-family", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { item: ITEM_SCOPE_LENS }));

// --- Enigma Berry per-battler override ------------------------------------
addCase(
  "enigma_berry_attacker_override", "enigma-berry",
  { ...withBattler(baseSpec({ currentMove: MOVE_CONFUSION }), 0, { item: ITEM_ENIGMA_BERRY }), enigmaBerryHoldEffects: [57, 0, 0, 0], enigmaBerryHoldEffectParams: [10, 0, 0, 0] },
);
addCase(
  "enigma_berry_defender_override", "enigma-berry",
  { ...withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { item: ITEM_ENIGMA_BERRY }), enigmaBerryHoldEffects: [0, 64, 0, 0], enigmaBerryHoldEffectParams: [0, 0, 0, 0] },
);

// --- item out of range error ----------------------------------------------
addCase("item_out_of_range_error", "item-range-error", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 0, { item: ITEMS_COUNT }));
addCase("item_out_of_range_target_error", "item-range-error", withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { item: 60000 }));

// --- Explosion defense halving ---------------------------------------------
addCase("explosion_effect_halves_defense", "explosion", baseSpec({ currentMove: MOVE_SELFDESTRUCT }));

// --- Weather ----------------------------------------------------------------
{
  const fireMove = 52, waterMove = 55; // EMBER, WATER_GUN
  addCase("rain_halves_fire", "weather", baseSpec({ currentMove: fireMove, weather: B_WEATHER_RAIN }));
  addCase("rain_boosts_water", "weather", baseSpec({ currentMove: waterMove, weather: B_WEATHER_RAIN }));
  addCase("sun_boosts_fire", "weather", baseSpec({ currentMove: fireMove, weather: B_WEATHER_SUN }));
  addCase("sun_halves_water", "weather", baseSpec({ currentMove: waterMove, weather: B_WEATHER_SUN }));
  addCase("solar_beam_in_rain_exception", "weather", baseSpec({ currentMove: MOVE_SOLAR_BEAM, weather: B_WEATHER_RAIN }));
  addCase(
    "fainted_cloud_nine_still_suppresses_weather", "weather",
    withBattler(baseSpec({ currentMove: fireMove, weather: B_WEATHER_RAIN }), 1, { ability: ABILITY_CLOUD_NINE, hp: 0 }),
  );
  addCase(
    "air_lock_suppresses_weather", "weather",
    withBattler(baseSpec({ currentMove: waterMove, weather: B_WEATHER_SUN }), 0, { ability: ABILITY_AIR_LOCK }),
  );
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => (value.error === null ? "ok" : "error"));

const corpus = Object.freeze({ categoryCensus, branchCensus, cases, catalogHash });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustStatStages(value) {
  return `StatStages { atk: ${value.atk}, def: ${value.def}, sp_atk: ${value.spAtk}, sp_def: ${value.spDef} }`;
}
function rustBattlerState(value) {
  return [
    "BattleScriptBaseDamageVectorBattlerState {",
    `item: ${hex16(value.item)}, ability: ${hex16(value.ability)}, species: ${hex16(value.species)},`,
    `types: [${value.types.join(", ")}], level: ${rustI32(value.level)},`,
    `attack: ${rustI32(value.attack)}, defense: ${rustI32(value.defense)}, sp_attack: ${rustI32(value.spAttack)}, sp_defense: ${rustI32(value.spDefense)},`,
    `stat_stages: ${rustStatStages(value.statStages)},`,
    `hp: ${rustI32(value.hp)}, max_hp: ${rustI32(value.maxHp)}, status1: ${value.status1}u32, status3: ${value.status3}u32,`,
    `flash_fire_boosted: ${value.flashFireBoosted}u8,`,
    "}",
  ].join(" ");
}
function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustArr4i32(values) { return `[${values.map(rustI32).join(", ")}]`; }
function rustOptionU8(value) { return value === null ? "None" : `Some(${value}u8)`; }
function rustRules(value) {
  return [
    "BattleScriptBaseDamageVectorRules {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `battlers_count: ${value.battlersCount}u8, battle_type_flags: ${value.battleTypeFlags}u32, weather: ${value.weather}u32,`,
    `current_move: ${hex16(value.currentMove)}, dynamic_base_power: ${hex16(value.dynamicBasePower)}, dynamic_move_type: ${value.dynamicMoveType}u8,`,
    `crit_multiplier: ${value.critMultiplier}u8, attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)},`,
    `enigma_berry_hold_effects: ${rustArr4u16(value.enigmaBerryHoldEffects)}, enigma_berry_hold_effect_params: ${rustArr4i32(value.enigmaBerryHoldEffectParams)},`,
    "}",
  ].join(" ");
}
function rustOptionalI32(value) { return value === null ? "None" : `Some(${rustI32(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustCensus(name, entries) {
  return [
    `pub const ${name}: [(&str, usize); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-base-damage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::damage_calc::StatStages;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptBaseDamageVectorBattlerState { pub item: u16, pub ability: u16, pub species: u16, pub types: [u8; 2], pub level: i32, pub attack: i32, pub defense: i32, pub sp_attack: i32, pub sp_defense: i32, pub stat_stages: StatStages, pub hp: i32, pub max_hp: i32, pub status1: u32, pub status3: u32, pub flash_fire_boosted: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptBaseDamageVectorRules { pub battlers: [BattleScriptBaseDamageVectorBattlerState; 4], pub battlers_count: u8, pub battle_type_flags: u32, pub weather: u32, pub current_move: u16, pub dynamic_base_power: u16, pub dynamic_move_type: u8, pub crit_multiplier: u8, pub attacker: Option<u8>, pub target: Option<u8>, pub enigma_berry_hold_effects: [u16; 4], pub enigma_berry_hold_effect_params: [i32; 4] }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptBaseDamageVectorCase { pub label: &'static str, pub category: &'static str, pub rules: BattleScriptBaseDamageVectorRules, pub expected_damage: Option<i32>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_BASE_DAMAGE_CATEGORY_CENSUS", categoryCensus));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_BASE_DAMAGE_BRANCH_CENSUS", branchCensus));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_BASE_DAMAGE_CASES: [BattleScriptBaseDamageVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptBaseDamageVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)},`);
  lines.push(`        rules: ${rustRules(value.rules)},`);
  lines.push(`        expected_damage: ${rustOptionalI32(value.damage)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(vectorsOutPath, `${lines.join("\n")}\n`);

const catalogLines = [];
catalogLines.push("// GENERATED by core-rs/tools/gen-battle-script-base-damage-vectors.mjs.");
catalogLines.push("// Source: src/data/gen/item-hold-effects.json (itemId -> holdEffectId, holdEffectParam),");
catalogLines.push("// sparse over the 377-item gItems corpus; entries absent here resolve to");
catalogLines.push("// HOLD_EFFECT_NONE (0) / param 0, mirroring GENERATED_ITEM_HOLD_EFFECTS.get(item) ?? 0.");
catalogLines.push("// Regenerate; do not hand-edit.");
catalogLines.push("");
catalogLines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_SHA256: &str = ${rustString(catalogHash)};`);
catalogLines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG_BYTES: usize = ${Buffer.byteLength(catalogJson)};`);
catalogLines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_ITEMS_COUNT: u16 = ${itemHoldEffects.itemsCount};`);
catalogLines.push(`pub const BATTLE_SCRIPT_BASE_DAMAGE_ITEM_CATALOG: [(u16, u16, i32); ${catalogRows.length}] = [`);
for (const row of catalogRows) {
  catalogLines.push(`    (${hex16(row.itemId)}, ${hex16(row.holdEffectId)}, ${rustI32(row.holdEffectParam)}),`);
}
catalogLines.push("];\n");
fs.writeFileSync(catalogOutPath, `${catalogLines.join("\n")}\n`);

const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, vectorsOutPath, catalogOutPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-base-damage-vectors: could not find rustfmt");

const generatedVectors = fs.readFileSync(vectorsOutPath);
const generatedCatalog = fs.readFileSync(catalogOutPath);
assert(generatedVectors.length <= GENERATED_FILE_MAX_BYTES, `generated vectors file ${generatedVectors.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, vectorsOutPath)} (${cases.length} cases, corpus ${corpusHash})`);
console.log(`generated vectors sha256 ${crypto.createHash("sha256").update(generatedVectors).digest("hex")} bytes ${generatedVectors.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
console.log(`wrote ${path.relative(workspaceRoot, catalogOutPath)} (${catalogRows.length} rows, catalog ${catalogHash})`);
console.log(`generated catalog sha256 ${crypto.createHash("sha256").update(generatedCatalog).digest("hex")} bytes ${generatedCatalog.length}`);
