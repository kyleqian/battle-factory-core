/**
 * Pure port of `AI_CheckBadMove` (`data/battle_ai_scripts.s:51-651`,
 * `docs/factory-ai-ground-truth.md` §4 item 2). Zero `if_random_*` in the
 * script itself, but `get_ability AI_TARGET` (`Cmd_get_ability`,
 * `battle_ai_script_commands.c:1350-1400`) draws one `Random()` per call
 * whenever the target's ability is unknown, the target is not a trapper
 * (Shadow Tag/Magnet Pull/Arena Trap), and the species has two distinct
 * abilities -- and it NEVER caches: `BATTLE_HISTORY->abilities[target]` is
 * read but never written by this command, so both static call sites in the
 * preamble (ability-negation, soundproof) redraw fresh every time they're
 * reached, even within the same slot's pass. This is the load-bearing
 * quirk for roll-count parity (ground-truth doc §0(2)/§4 item 2).
 *
 * Scope this port covers in full: the universal preamble --
 * `get_how_powerful_move_is`'s MOVE_POWER_OTHER classification (the
 * cross-moveset "most powerful" comparison itself is TryToFaint-only and
 * not needed for CheckBadMove's own control flow), the FISSURE/HORN_DRILL
 * short-circuit, the type-immunity `Score_Minus10`, the five
 * ability-negation branches (Volt Absorb/Water Absorb/Flash Fire/Wonder
 * Guard/Levitate), and the Soundproof nine-move list.
 *
 * `AI_CheckBadMove_CheckEffect`'s `if_effect` dispatch (`:104-214`, ~100
 * entries) is otherwise NOT implemented -- any move whose effect has an
 * entry in that table (whether it names an `AI_CBM_*` handler or jumps
 * straight to a `Score_Minus*` label like `EFFECT_TELEPORT`) halts with a
 * named `unsupported-branch` barrier, per the port-subset audit's item 6. A
 * move whose effect has NO entry falls through to the chain's trailing
 * `end` with zero score contribution -- that's a genuine, complete port of
 * that path, not a stub (none of the three banked ledgers' four moves reach
 * a table entry; confirmed by direct grep of `data/battle_ai_scripts.s`).
 *
 * Four table entries ARE ported: `EFFECT_SPEED_DOWN(_2)` -> `AI_CBM_SpeedDown`
 * (`data/battle_ai_scripts.s:287-312`, `runCbmSpeedDown` below), the
 * proven CBM+CV pair with `factoryAiCheckViability.ts`'s `AI_CV_SpeedDown`
 * (`docs/factory-ai-checkviability-ground-truth.md` §6); `EFFECT_ATTACK_DOWN(_2)`
 * -> `AI_CBM_AttackDown` (`:277-281` + `CheckIfAbilityBlocksStatChange`'s
 * shared tail `:308-312`, `runCbmAttackDown` below), the first CBM-blocked
 * pair's own CBM half, with `AI_CV_AttackDown` (doc §14); and
 * `EFFECT_DEFENSE_DOWN(_2)`/`EFFECT_SPECIAL_DEFENSE_DOWN(_2)` ->
 * `AI_CBM_DefenseDown`/`AI_CBM_SpDefDown` (`:283-285`/`:296-298` + the same
 * shared tail, `runCbmStatDownViaSharedTail` below), the second and third
 * CBM-blocked pairs' own CBM halves, with `AI_CV_DefenseDown`/`AI_CV_SpDefDown`
 * (doc §15/§16) -- both `goto` straight into the shared tail with no
 * intervening ability check of their own, unlike `AttackDown`'s Hyper Cutter
 * gate; and `EFFECT_ATTACK_UP(_2)`/`EFFECT_DEFENSE_UP(_2)`/
 * `EFFECT_DEFENSE_CURL`/`EFFECT_BULK_UP` -> `AI_CBM_AttackUp`/
 * `AI_CBM_DefenseUp`/`AI_CBM_BulkUp` (`:249-251`/`:253-255`/`:581-584`,
 * `runCbmAttackUp`/`runCbmDefenseUp`/`runCbmBulkUp` below), the fourth and
 * fifth CBM-blocked pairs' own CBM halves, with `AI_CV_AttackUp`/
 * `AI_CV_DefenseUp` (doc §17/§18) -- the first stat-**UP** handlers: bare
 * MAX_STAT_STAGE gates on `AI_USER`'s OWN stat stage, zero `get_ability`
 * calls, no shared `CheckIfAbilityBlocksStatChange` tail at all (a
 * documented structural break from every stat-DOWN CBM handler above); and
 * `EFFECT_SPEED_UP(_2)`/`EFFECT_SPECIAL_ATTACK_UP(_2)` -> `AI_CBM_SpeedUp`/
 * `AI_CBM_SpAtkUp` (`:257-259`/`:261-263`, `runCbmSpeedUp`/`runCbmSpAtkUp`
 * below), the seventh and eighth CBM-blocked pairs' own CBM halves, with
 * `AI_CV_SpeedUp`/`AI_CV_SpAtkUp` (doc §20/§21) -- byte-for-byte the same
 * bare 2-instruction `MAX_STAT_STAGE` shape as `AI_CBM_AttackUp`/
 * `AI_CBM_DefenseUp` with `STAT_SPEED`/`STAT_SPATK` swapped in; and
 * `EFFECT_COSMIC_POWER`/`EFFECT_CALM_MIND` -> `AI_CBM_CosmicPower`/
 * `AI_CBM_CalmMind` (`:576-579`/`:590-593`, `runCbmCosmicPower`/
 * `runCbmCalmMind` below, doc §22.1), the ninth CBM-blocked pair's own CBM
 * half -- unlike every stat-UP handler above, these are TWO SEPARATE
 * dual-stat handlers (the `AI_CBM_BulkUp`/`AI_CBM_DragonDance` shape, §18.1),
 * each checking both stats the move raises (`-10` first stat, `-8` second),
 * not aliases of each other or of the also-dispatched-but-not-ported-here
 * single-stat `AI_CBM_SpDefUp` (`EFFECT_SPECIAL_DEFENSE_UP(_2)`'s own CBM
 * target, doc §22.1 -- out of this pair's scope, still an unsupported
 * branch). Both converge with `EFFECT_SPECIAL_DEFENSE_UP(_2)` on the single
 * shared `AI_CV_SpDefUp` CV handler (doc §22); and `EFFECT_LIGHT_SCREEN`/
 * `EFFECT_REFLECT` -> `AI_CBM_LightScreen`/`AI_CBM_Reflect` (`:354-356`/
 * `:393-395`, `runCbmLightScreen`/`runCbmReflect` below, doc §23.1), the
 * tenth CBM-blocked pair's own CBM half and the smallest CBM handler shape
 * in this doc to date -- a single `if_side_affecting AI_USER,
 * SIDE_STATUS_*` bit test with zero stat-stage read, zero `get_ability`
 * call, converging with `factoryAiCheckViability.ts`'s `AI_CV_LightScreen`/
 * `AI_CV_Reflect` (doc §23); and `EFFECT_EVASION_UP(_2)`/`EFFECT_MINIMIZE`
 * -> `AI_CBM_EvasionUp` (`:273-275`, `runCbmEvasionUp` below, doc §24.1),
 * the eleventh CBM-blocked pair's own CBM half -- byte-for-byte the same
 * bare 2-instruction MAX_STAT_STAGE-on-AI_USER's-own-stage shape as
 * `AI_CBM_AttackUp` et al. with `STAT_EVASION` swapped in (`EFFECT_MINIMIZE`
 * shares this single-stat handler, not `BulkUp`/`CosmicPower`/`CalmMind`'s
 * dual-stat shape, since Minimize only ever raises evasion); and
 * `EFFECT_EVASION_DOWN(_2)` -> `AI_CBM_EvasionDown` (`:306-312`,
 * `runCbmEvasionDown` below, doc §24.1), the eleventh pair's other CBM
 * half -- the same bare-MIN_STAT_STAGE-plus-shared-tail shape as
 * `AI_CBM_DefenseDown`/`AI_CBM_SpDefDown`, converging with
 * `factoryAiCheckViability.ts`'s `AI_CV_EvasionUp`/`AI_CV_EvasionDown`
 * (doc §24); and `EFFECT_RAIN_DANCE`/`EFFECT_SUNNY_DAY`/`EFFECT_HAIL` ->
 * `AI_CBM_RainDance`/`AI_CBM_SunnyDay`/`AI_CBM_Hail` (`:490-493`/`:495-498`/
 * `:522-525`, `runCbmRainDance`/`runCbmSunnyDay`/`runCbmHail` below, doc
 * §25.1), the twelfth and final CBM-blocked pair's own CBM third -- three
 * separately named dispatch targets (not a shared handler), but
 * byte-for-byte identical 3-instruction bodies (`get_weather; if_equal
 * <OWN_WEATHER>, Score_Minus8; end`), converging with
 * `factoryAiCheckViability.ts`'s `AI_CV_RainDance`/`AI_CV_SunnyDay`/
 * `AI_CV_Hail` (doc §25) -- the last of the twelve CBM-blocked pairs. The
 * 22nd and last reachable CV handler overall, `AI_CV_SpeedDownFromChance`
 * (doc §5's table), is CV-only-reachable and has no CBM counterpart, so it
 * has no entry in this file.
 */
import movesData from "../data/gen/moves.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import { advanceRngValue } from "./rng.ts";
import type { BattleRngState } from "./battleDecisionBoundary.ts";
import { DEFAULT_STAT_STAGE, MAX_STAT_STAGE, MIN_STAT_STAGE, type TypeEffectivenessEntry } from "./damageCalc.ts";

const U16_MAX = 0xffff;

export type MoveRow = Readonly<{ id: number; type: string; power: number; effect: string }>;
export const MOVES_BY_ID: ReadonlyMap<number, MoveRow> = new Map(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row]),
);

type SpeciesRow = Readonly<{ id: number; abilities: readonly [string, string] }>;
const SPECIES_BY_ID: ReadonlyMap<number, SpeciesRow> = new Map(
  (speciesStatsData.species as unknown as readonly SpeciesRow[]).map((row) => [row.id, row]),
);

export const TYPE_EFFECTIVENESS = typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[];

/**
 * `AI_WEATHER_*` (`include/constants/battle_ai.h:27-30`), the encoding
 * `Cmd_get_weather` (`battle_ai_script_commands.c:1644-1665`) writes to
 * `AI_THINKING_STRUCT->funcResult` -- NOT `gBattleWeather`'s own raw bit
 * layout. Shared by the weather-trio CBM+CV handlers (doc §25.1/§25.2)
 * below and by `factoryAiCheckViability.ts`.
 */
export const AI_WEATHER_SUN = 0;
export const AI_WEATHER_RAIN = 1;
export const AI_WEATHER_SANDSTORM = 2;
export const AI_WEATHER_HAIL = 3;
export type AiWeatherValue =
  | typeof AI_WEATHER_SUN
  | typeof AI_WEATHER_RAIN
  | typeof AI_WEATHER_SANDSTORM
  | typeof AI_WEATHER_HAIL;

/** `sIgnoredPowerfulMoveEffects` (`battle_ai_script_commands.c:266-281`). */
export const IGNORED_POWERFUL_MOVE_EFFECTS: ReadonlySet<string> = new Set([
  "EFFECT_EXPLOSION",
  "EFFECT_DREAM_EATER",
  "EFFECT_RAZOR_WIND",
  "EFFECT_SKY_ATTACK",
  "EFFECT_RECHARGE",
  "EFFECT_SKULL_BASH",
  "EFFECT_SOLAR_BEAM",
  "EFFECT_SPIT_UP",
  "EFFECT_FOCUS_PUNCH",
  "EFFECT_SUPERPOWER",
  "EFFECT_ERUPTION",
  "EFFECT_OVERHEAT",
]);

const MOVE_FISSURE = 90;
const MOVE_HORN_DRILL = 32;

/** Trapper abilities (`Cmd_get_ability`'s "abilities that prevent fleeing" branch). */
const TRAPPER_ABILITIES: ReadonlySet<string> = new Set([
  "ABILITY_SHADOW_TAG",
  "ABILITY_MAGNET_PULL",
  "ABILITY_ARENA_TRAP",
]);

const NEGATING_ABILITIES = Object.freeze({
  voltAbsorb: "ABILITY_VOLT_ABSORB",
  waterAbsorb: "ABILITY_WATER_ABSORB",
  flashFire: "ABILITY_FLASH_FIRE",
  wonderGuard: "ABILITY_WONDER_GUARD",
  levitate: "ABILITY_LEVITATE",
} as const);

const SOUNDPROOF_MOVES: ReadonlySet<number> = new Set([
  45, // MOVE_GROWL
  46, // MOVE_ROAR
  47, // MOVE_SING
  48, // MOVE_SUPERSONIC
  103, // MOVE_SCREECH
  173, // MOVE_SNORE
  253, // MOVE_UPROAR
  319, // MOVE_METAL_SOUND
  320, // MOVE_GRASS_WHISTLE
]);

/**
 * `AI_CheckBadMove_CheckEffect`'s `if_effect` table (`:104-214`), source-
 * complete: every `EFFECT_*` that has ANY entry (named `AI_CBM_*` handler or
 * a direct `Score_Minus*` jump). A candidate move whose effect is NOT in
 * this set gets the table's true fallthrough: zero score, zero draws.
 */
export const AI_CHECK_BAD_MOVE_TABLE_EFFECTS: ReadonlySet<string> = new Set([
  "EFFECT_SLEEP", "EFFECT_EXPLOSION", "EFFECT_DREAM_EATER", "EFFECT_ATTACK_UP",
  "EFFECT_DEFENSE_UP", "EFFECT_SPEED_UP", "EFFECT_SPECIAL_ATTACK_UP", "EFFECT_SPECIAL_DEFENSE_UP",
  "EFFECT_ACCURACY_UP", "EFFECT_EVASION_UP", "EFFECT_ATTACK_DOWN", "EFFECT_DEFENSE_DOWN",
  "EFFECT_SPEED_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_ACCURACY_DOWN",
  "EFFECT_EVASION_DOWN", "EFFECT_HAZE", "EFFECT_BIDE", "EFFECT_ROAR",
  "EFFECT_TOXIC", "EFFECT_LIGHT_SCREEN", "EFFECT_OHKO", "EFFECT_RAZOR_WIND",
  "EFFECT_SUPER_FANG", "EFFECT_MIST", "EFFECT_FOCUS_ENERGY", "EFFECT_CONFUSE",
  "EFFECT_ATTACK_UP_2", "EFFECT_DEFENSE_UP_2", "EFFECT_SPEED_UP_2", "EFFECT_SPECIAL_ATTACK_UP_2",
  "EFFECT_SPECIAL_DEFENSE_UP_2", "EFFECT_ACCURACY_UP_2", "EFFECT_EVASION_UP_2", "EFFECT_ATTACK_DOWN_2",
  "EFFECT_DEFENSE_DOWN_2", "EFFECT_SPEED_DOWN_2", "EFFECT_SPECIAL_ATTACK_DOWN_2", "EFFECT_SPECIAL_DEFENSE_DOWN_2",
  "EFFECT_ACCURACY_DOWN_2", "EFFECT_EVASION_DOWN_2", "EFFECT_REFLECT", "EFFECT_POISON",
  "EFFECT_PARALYZE", "EFFECT_SUBSTITUTE", "EFFECT_RECHARGE", "EFFECT_LEECH_SEED",
  "EFFECT_DISABLE", "EFFECT_LEVEL_DAMAGE", "EFFECT_PSYWAVE", "EFFECT_COUNTER",
  "EFFECT_ENCORE", "EFFECT_SNORE", "EFFECT_SLEEP_TALK", "EFFECT_FLAIL",
  "EFFECT_MEAN_LOOK", "EFFECT_NIGHTMARE", "EFFECT_MINIMIZE", "EFFECT_CURSE",
  "EFFECT_SPIKES", "EFFECT_FORESIGHT", "EFFECT_PERISH_SONG", "EFFECT_SANDSTORM",
  "EFFECT_SWAGGER", "EFFECT_ATTRACT", "EFFECT_RETURN", "EFFECT_PRESENT",
  "EFFECT_FRUSTRATION", "EFFECT_SAFEGUARD", "EFFECT_MAGNITUDE", "EFFECT_BATON_PASS",
  "EFFECT_SONICBOOM", "EFFECT_RAIN_DANCE", "EFFECT_SUNNY_DAY", "EFFECT_BELLY_DRUM",
  "EFFECT_PSYCH_UP", "EFFECT_MIRROR_COAT", "EFFECT_SKULL_BASH", "EFFECT_FUTURE_SIGHT",
  "EFFECT_TELEPORT", "EFFECT_DEFENSE_CURL", "EFFECT_FAKE_OUT", "EFFECT_STOCKPILE",
  "EFFECT_SPIT_UP", "EFFECT_SWALLOW", "EFFECT_HAIL", "EFFECT_TORMENT",
  "EFFECT_FLATTER", "EFFECT_WILL_O_WISP", "EFFECT_MEMENTO", "EFFECT_FOCUS_PUNCH",
  "EFFECT_HELPING_HAND", "EFFECT_TRICK", "EFFECT_INGRAIN", "EFFECT_SUPERPOWER",
  "EFFECT_RECYCLE", "EFFECT_KNOCK_OFF", "EFFECT_ENDEAVOR", "EFFECT_IMPRISON",
  "EFFECT_REFRESH", "EFFECT_LOW_KICK", "EFFECT_MUD_SPORT", "EFFECT_TICKLE",
  "EFFECT_COSMIC_POWER", "EFFECT_BULK_UP", "EFFECT_WATER_SPORT", "EFFECT_CALM_MIND",
  "EFFECT_DRAGON_DANCE",
]);

export type FactoryAiCheckBadMoveTarget = Readonly<{
  species: number;
  types: readonly [string, string];
  /** BattleHistory-style known ability, or null if never observed this battle. */
  knownAbility: string | null;
  /** The target's real, engine-known ability (trapper check reads this directly, not a guess). */
  realAbility: string;
  /** Current SPEED stat stage (`gBattleMons[].statStages[STAT_SPEED]`), 0..12 -- `AI_CBM_SpeedDown`'s MIN_STAT_STAGE gate. */
  speedStage: number;
  /** Current ATTACK stat stage, 0..12 -- `AI_CBM_AttackDown`'s MIN_STAT_STAGE gate. */
  atkStage: number;
  /** Current DEFENSE stat stage, 0..12 -- `AI_CBM_DefenseDown`'s MIN_STAT_STAGE gate. */
  defStage: number;
  /** Current SPECIAL DEFENSE stat stage, 0..12 -- `AI_CBM_SpDefDown`'s MIN_STAT_STAGE gate. */
  spDefStage: number;
  /**
   * Current ACCURACY stat stage, 0..12 -- `AI_CBM_AccDown`'s MIN_STAT_STAGE
   * gate (doc §19.1). Optional, defaulting to `DEFAULT_STAT_STAGE` (6) -- the
   * real battle-start neutral value -- so no pre-existing target literal in
   * this file's test suite needs updating.
   */
  accStage?: number;
  /**
   * Current EVASION stat stage, 0..12 -- `AI_CBM_EvasionDown`'s MIN_STAT_STAGE
   * gate (doc §24.1). Optional, defaulting to `DEFAULT_STAT_STAGE` (6) --
   * same convention/rationale as `accStage` above.
   */
  evasionStage?: number;
}>;

/**
 * `AI_USER`'s own state, needed only by the stat-**UP** CBM handlers
 * (`AI_CBM_AttackUp`/`AI_CBM_DefenseUp`/`AI_CBM_BulkUp`,
 * `docs/factory-ai-checkviability-ground-truth.md` §17.1/§18.1) -- every
 * other CBM handler ported so far reads only `AI_TARGET`'s state
 * (`FactoryAiCheckBadMoveTarget` above), since stat-DOWN effects target the
 * opponent. Stat-UP effects are self-targeted, so their own CBM gate reads
 * the AI battler's (the engine's "attacker") own stat stage instead.
 */
export type FactoryAiCheckBadMoveAttacker = Readonly<{
  /** AI_USER's own ATTACK stat stage, 0..12 -- `AI_CBM_AttackUp`/`AI_CBM_BulkUp`'s own MAX_STAT_STAGE gate. */
  atkStage: number;
  /** AI_USER's own DEFENSE stat stage, 0..12 -- `AI_CBM_DefenseUp`/`AI_CBM_BulkUp`'s own MAX_STAT_STAGE gate. */
  defStage: number;
  /**
   * AI_USER's own SPEED stat stage, 0..12 -- `AI_CBM_SpeedUp`'s own
   * MAX_STAT_STAGE gate (doc §20.1). Optional, defaulting to
   * `DEFAULT_STAT_STAGE` (6) so no pre-existing `FactoryAiCheckBadMoveAttacker`
   * literal (e.g. the AttackUp/DefenseUp/BulkUp test block's own) needs
   * touching -- same precedent as `FactoryAiCheckBadMoveTarget.accStage`.
   */
  speedStage?: number;
  /**
   * AI_USER's own SPECIAL ATTACK stat stage, 0..12 -- `AI_CBM_SpAtkUp`'s own
   * MAX_STAT_STAGE gate (doc §21.1). Optional, same default/rationale as
   * `speedStage` above.
   */
  spAtkStage?: number;
  /**
   * AI_USER's own SPECIAL DEFENSE stat stage, 0..12 -- `AI_CBM_CosmicPower`/
   * `AI_CBM_CalmMind`'s own second MAX_STAT_STAGE gate (doc §22.1). Optional,
   * same default/rationale as `speedStage`/`spAtkStage` above.
   */
  spDefStage?: number;
  /**
   * AI_USER's own `SIDE_STATUS_LIGHTSCREEN` bit -- `AI_CBM_LightScreen`'s
   * single `if_side_affecting AI_USER` gate (doc §23.1). Optional, defaulting
   * to `false` (screen not up) -- same optional/default convention as
   * `speedStage`/`spAtkStage`/`spDefStage` above, but a boolean side-status
   * flag rather than a 0..12 stat stage.
   */
  lightScreenUp?: boolean;
  /**
   * AI_USER's own `SIDE_STATUS_REFLECT` bit -- `AI_CBM_Reflect`'s single
   * `if_side_affecting AI_USER` gate (doc §23.1). Optional, defaulting to
   * `false`, same convention as `lightScreenUp` above.
   */
  reflectUp?: boolean;
  /**
   * AI_USER's own EVASION stat stage, 0..12 -- `AI_CBM_EvasionUp`'s own
   * MAX_STAT_STAGE gate (doc §24.1). Optional, same default/rationale as
   * `speedStage`/`spAtkStage`/`spDefStage` above.
   */
  evasionStage?: number;
  /**
   * Current weather, `AI_WEATHER_*`-encoded (0=Sun/1=Rain/2=Sandstorm/3=Hail)
   * -- `AI_CBM_RainDance`/`SunnyDay`/`Hail`'s own `get_weather` read (doc
   * §25.1). Optional, defaulting to `undefined` (no weather bit set, matching
   * the real battle-start state) -- same optional/default convention as
   * `speedStage`/`lightScreenUp` above. `undefined` never equals any of the
   * four `AI_WEATHER_*` values, so it never fires any of the three handlers'
   * own equality gate, the correct outcome for "no weather" either way.
   */
  currentWeather?: AiWeatherValue;
}>;

export type FactoryAiCheckBadMoveDraw = Readonly<{
  ordinal: number;
  reason: string;
  kind: "get-ability";
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  guessedAbility: string;
}>;

export type FactoryAiCheckBadMoveResult =
  | Readonly<{
    kind: "scored";
    rng: BattleRngState;
    draws: readonly FactoryAiCheckBadMoveDraw[];
    scoreDelta: number;
  }>
  | Readonly<{
    kind: "unsupported-branch";
    barrier: "factory-ai-check-bad-move";
    effect: string;
    moveId: number;
  }>;

function nextGetAbilityDraw(
  rng: BattleRngState,
  ordinal: number,
  reason: string,
  target: FactoryAiCheckBadMoveTarget,
): Readonly<{ rng: BattleRngState; draw: FactoryAiCheckBadMoveDraw | null; ability: string }> {
  if (TRAPPER_ABILITIES.has(target.realAbility)) {
    return { rng, draw: null, ability: target.realAbility };
  }
  if (target.knownAbility !== null) {
    return { rng, draw: null, ability: target.knownAbility };
  }
  const species = SPECIES_BY_ID.get(target.species);
  if (!species) throw new Error(`factory-ai-check-bad-move: unknown species ${target.species}`);
  const [ability0, ability1] = species.abilities;
  if (ability1 === "ABILITY_NONE") {
    return { rng, draw: null, ability: ability0 };
  }
  const rawRngValue = advanceRngValue(rng.value);
  const after: BattleRngState = Object.freeze({ value: rawRngValue, calls: rng.calls + 1 });
  const randomValue = (rawRngValue >>> 16) & U16_MAX;
  const guessedAbility = (randomValue & 1) !== 0 ? ability0 : ability1;
  const draw: FactoryAiCheckBadMoveDraw = Object.freeze({
    ordinal,
    reason,
    kind: "get-ability",
    before: rng,
    after,
    rawRngValue,
    randomValue,
    guessedAbility,
  });
  return { rng: after, draw, ability: guessedAbility };
}

const ABILITY_SPEED_BOOST = "ABILITY_SPEED_BOOST";
const ABILITY_HYPER_CUTTER = "ABILITY_HYPER_CUTTER";
const ABILITY_KEEN_EYE = "ABILITY_KEEN_EYE";
const ABILITY_CLEAR_BODY = "ABILITY_CLEAR_BODY";
const ABILITY_WHITE_SMOKE = "ABILITY_WHITE_SMOKE";

/**
 * `check_ability AI_TARGET, ability` / `if_ability AI_TARGET, ability, ptr`
 * (`Cmd_check_ability`, `battle_ai_script_commands.c:1407-1443`, AI_TARGET
 * branch only -- no caller here needs AI_USER). Zero-RNG, unlike
 * `get_ability`: a known (BattleHistory) or single-ability species compares
 * exactly; a species with two distinct, unobserved abilities can NEVER
 * register a match here regardless of which ability is asked about -- the
 * source's own `abilityDummyVariable` trick collapses both outcomes
 * (neither ability matches -> compares against ability slot 0 anyway, which
 * by construction still doesn't match; one of the two matches -> forced to
 * ABILITY_NONE, "unable to answer") to a non-match. A genuine source quirk,
 * ported exactly rather than "simplified" to a coin flip.
 */
function checkAbilityAiTarget(target: FactoryAiCheckBadMoveTarget, wantedAbility: string): boolean {
  if (TRAPPER_ABILITIES.has(target.realAbility)) {
    return target.realAbility === wantedAbility;
  }
  if (target.knownAbility !== null) {
    return target.knownAbility === wantedAbility;
  }
  const species = SPECIES_BY_ID.get(target.species);
  if (!species) throw new Error(`factory-ai-check-bad-move: unknown species ${target.species}`);
  const [ability0, ability1] = species.abilities;
  if (ability1 === "ABILITY_NONE") {
    return ability0 === wantedAbility;
  }
  return false;
}

/**
 * `AI_CBM_SpeedDown` + the shared `CheckIfAbilityBlocksStatChange` tail
 * (`data/battle_ai_scripts.s:287-312`). MIN_STAT_STAGE and Speed Boost are
 * zero-RNG short-circuits (`if_stat_level_equal`/`if_ability`, the latter
 * via `checkAbilityAiTarget` above -- distinct from `get_ability`'s
 * guess-and-draw machinery); the shared tail's own `get_ability AI_TARGET`
 * reuses `nextGetAbilityDraw` unchanged (same redraw-per-call machinery
 * CheckBadMove's preamble already established for its own two call sites).
 */
function runCbmSpeedDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if (target.speedStage === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  if (checkAbilityAiTarget(target, ABILITY_SPEED_BOOST)) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const result = nextGetAbilityDraw(rng, ordinal, reason, target);
  const draws = result.draw ? [result.draw] : [];
  const blocksChange = result.ability === ABILITY_CLEAR_BODY || result.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng: result.rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

/**
 * `AI_CBM_AttackDown` + the shared `CheckIfAbilityBlocksStatChange` tail
 * (`data/battle_ai_scripts.s:277-281,308-312`,
 * `docs/factory-ai-checkviability-ground-truth.md` §14.1). Unlike
 * `AI_CBM_SpeedDown`'s second gate (`if_ability`, zero-RNG
 * `checkAbilityAiTarget`), this handler's own Hyper Cutter check is a real
 * `get_ability AI_TARGET` + `if_equal` pair -- a genuine second (guessing,
 * uncached) draw site distinct from the shared tail's own, per §14.2's own
 * finding that this handler calls `get_ability` twice.
 */
function runCbmAttackDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if (target.atkStage === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const draws: FactoryAiCheckBadMoveDraw[] = [];
  const hyperCutter = nextGetAbilityDraw(rng, ordinal, `${reason}-hyper-cutter`, target);
  rng = hyperCutter.rng;
  if (hyperCutter.draw) {
    draws.push(hyperCutter.draw);
    ordinal += 1;
  }
  if (hyperCutter.ability === ABILITY_HYPER_CUTTER) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: -10 });
  }
  const tail = nextGetAbilityDraw(rng, ordinal, `${reason}-shared-tail`, target);
  rng = tail.rng;
  if (tail.draw) draws.push(tail.draw);
  const blocksChange = tail.ability === ABILITY_CLEAR_BODY || tail.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

/**
 * Shared body for `AI_CBM_DefenseDown` (`data/battle_ai_scripts.s:283-285`,
 * doc §15.1) and `AI_CBM_SpDefDown` (`:296-298`, doc §16.1): both are a bare
 * `if_stat_level_equal AI_TARGET, <stat>, MIN_STAT_STAGE, Score_Minus10`
 * followed by a direct `goto CheckIfAbilityBlocksStatChange` -- unlike
 * `AI_CBM_AttackDown`, neither has its own intervening `get_ability` call
 * before the shared tail, so the tail's own `get_ability AI_TARGET` fires at
 * most once here (vs. up to twice for AttackDown).
 */
function runCbmStatDownViaSharedTail(
  stage: number,
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if (stage === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const tail = nextGetAbilityDraw(rng, ordinal, `${reason}-shared-tail`, target);
  const draws = tail.draw ? [tail.draw] : [];
  const blocksChange = tail.ability === ABILITY_CLEAR_BODY || tail.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng: tail.rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

/**
 * `AI_CBM_AccDown` + the shared `CheckIfAbilityBlocksStatChange` tail
 * (`data/battle_ai_scripts.s:300-312`,
 * `docs/factory-ai-checkviability-ground-truth.md` §19.1):
 *
 * ```
 * AI_CBM_AccDown:
 *     if_stat_level_equal AI_TARGET, STAT_ACC, MIN_STAT_STAGE, Score_Minus10
 *     get_ability AI_TARGET
 *     if_equal ABILITY_KEEN_EYE, Score_Minus10
 *     goto CheckIfAbilityBlocksStatChange
 * ```
 *
 * Unlike `AI_CBM_DefenseDown`/`AI_CBM_SpDefDown` (bare MIN_STAT_STAGE gate,
 * direct `goto` to the shared tail, no intervening ability check), this
 * handler has its own extra `get_ability AI_TARGET` + `ABILITY_KEEN_EYE`
 * check first -- the same two-`get_ability`-call shape `AI_CBM_AttackDown`
 * already established for Hyper Cutter, confirmed live in the source per
 * the brief's own speculation (doc §19.1). A genuine second, independently
 * redrawing `get_ability` site distinct from the shared tail's own.
 */
function runCbmAccDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  if ((target.accStage ?? DEFAULT_STAT_STAGE) === MIN_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze([]), scoreDelta: -10 });
  }
  const draws: FactoryAiCheckBadMoveDraw[] = [];
  const keenEye = nextGetAbilityDraw(rng, ordinal, `${reason}-keen-eye`, target);
  rng = keenEye.rng;
  if (keenEye.draw) {
    draws.push(keenEye.draw);
    ordinal += 1;
  }
  if (keenEye.ability === ABILITY_KEEN_EYE) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: -10 });
  }
  const tail = nextGetAbilityDraw(rng, ordinal, `${reason}-shared-tail`, target);
  rng = tail.rng;
  if (tail.draw) draws.push(tail.draw);
  const blocksChange = tail.ability === ABILITY_CLEAR_BODY || tail.ability === ABILITY_WHITE_SMOKE;
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: blocksChange ? -10 : 0 });
}

function runCbmDefenseDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  return runCbmStatDownViaSharedTail(target.defStage, target, rng, ordinal, reason);
}

function runCbmSpDefDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  return runCbmStatDownViaSharedTail(target.spDefStage, target, rng, ordinal, reason);
}

/**
 * `AI_CBM_AttackUp` (`data/battle_ai_scripts.s:249-251`,
 * `docs/factory-ai-checkviability-ground-truth.md` §17.1):
 *
 * ```
 * AI_CBM_AttackUp:
 *     if_stat_level_equal AI_USER, STAT_ATK, MAX_STAT_STAGE, Score_Minus10
 *     end
 * ```
 *
 * A bare 2-instruction gate on AI_USER's OWN ATK stage -- zero
 * `get_ability` calls, no shared `CheckIfAbilityBlocksStatChange` tail,
 * unlike every stat-DOWN CBM handler above (a documented structural break,
 * §17.1). Dispatch: `EFFECT_ATTACK_UP`/`EFFECT_ATTACK_UP_2`
 * (`data/battle_ai_scripts.s:96,127`).
 */
function runCbmAttackUp(attackerAtkStage: number): number {
  return attackerAtkStage === MAX_STAT_STAGE ? -10 : 0;
}

/**
 * `AI_CBM_DefenseUp` (`:253-255`, doc §18.1) -- byte-for-byte the same
 * 2-instruction shape as `AI_CBM_AttackUp` with `STAT_DEF` swapped for
 * `STAT_ATK`. Dispatch: `EFFECT_DEFENSE_UP`, `EFFECT_DEFENSE_UP_2`, AND
 * `EFFECT_DEFENSE_CURL` (`:109,134,186`) all route to this same handler on
 * the CBM side -- `EFFECT_DEFENSE_CURL` has no corresponding `AI_CV_*`
 * dispatch entry at all (doc §18.1's own finding), so only its CBM half is
 * reachable/ported.
 */
function runCbmDefenseUp(attackerDefStage: number): number {
  return attackerDefStage === MAX_STAT_STAGE ? -10 : 0;
}

/**
 * `AI_CBM_BulkUp` (`:581-584`, doc §18.1):
 *
 * ```
 * AI_CBM_BulkUp:
 *     if_stat_level_equal AI_USER, STAT_ATK, MAX_STAT_STAGE, Score_Minus10
 *     if_stat_level_equal AI_USER, STAT_DEF, MAX_STAT_STAGE, Score_Minus8
 *     end
 * ```
 *
 * `AI_CBM_AttackUp`'s own gate applied a second time for STAT_DEF at a
 * different penalty (-8, not -10), sequentially, no interaction between the
 * two checks -- a separate, third handler `EFFECT_BULK_UP` reaches on the
 * CBM side ONLY (`:210`); its CV side (`:771`) instead dispatches straight
 * to `AI_CV_DefenseUp`, shared with `DEFENSE_UP`/`DEFENSE_UP_2` (doc
 * §17.1/§18.1).
 */
function runCbmBulkUp(attackerAtkStage: number, attackerDefStage: number): number {
  return runCbmAttackUp(attackerAtkStage) + (attackerDefStage === MAX_STAT_STAGE ? -8 : 0);
}

/**
 * `AI_CBM_SpeedUp` (`data/battle_ai_scripts.s:257-259`,
 * `docs/factory-ai-checkviability-ground-truth.md` §20.1) -- byte-for-byte
 * the same 2-instruction shape as `AI_CBM_AttackUp` with `STAT_SPEED`
 * swapped in. Dispatch: `EFFECT_SPEED_UP`/`EFFECT_SPEED_UP_2`
 * (`data/battle_ai_scripts.s:110,135`).
 */
function runCbmSpeedUp(attackerSpeedStage: number): number {
  return attackerSpeedStage === MAX_STAT_STAGE ? -10 : 0;
}

/**
 * `AI_CBM_SpAtkUp` (`:261-263`, doc §21.1) -- byte-for-byte the same
 * 2-instruction shape as `AI_CBM_AttackUp` with `STAT_SPATK` swapped in.
 * Dispatch: `EFFECT_SPECIAL_ATTACK_UP`/`EFFECT_SPECIAL_ATTACK_UP_2`
 * (`:111,136`).
 */
function runCbmSpAtkUp(attackerSpAtkStage: number): number {
  return attackerSpAtkStage === MAX_STAT_STAGE ? -10 : 0;
}

/**
 * `AI_CBM_CosmicPower` (`data/battle_ai_scripts.s:576-579`, doc §22.1):
 *
 * ```
 * AI_CBM_CosmicPower:
 *     if_stat_level_equal AI_USER, STAT_DEF, MAX_STAT_STAGE, Score_Minus10
 *     if_stat_level_equal AI_USER, STAT_SPDEF, MAX_STAT_STAGE, Score_Minus8
 *     end
 * ```
 *
 * `AI_CBM_BulkUp`'s own dual-stat shape (checks the user's own DEF then
 * SPDEF, sequentially, no interaction between the two checks) applied to
 * `Cosmic Power`'s own two raised stats -- a genuinely separate handler
 * (it inlines its own DEF check rather than `goto AI_CBM_DefenseUp`), but
 * composes `runCbmDefenseUp` for that identical first check exactly as
 * `runCbmBulkUp` composes `runCbmAttackUp` above.
 */
function runCbmCosmicPower(attackerDefStage: number, attackerSpDefStage: number): number {
  return runCbmDefenseUp(attackerDefStage) + (attackerSpDefStage === MAX_STAT_STAGE ? -8 : 0);
}

/**
 * `AI_CBM_CalmMind` (`:590-593`, doc §22.1) -- same dual-stat shape as
 * `AI_CBM_CosmicPower` above, `STAT_SPATK` then `STAT_SPDEF` (`Calm Mind`'s
 * own two raised stats, not `Cosmic Power`'s DEF+SPDEF). Composes
 * `runCbmSpAtkUp` for the first check.
 */
function runCbmCalmMind(attackerSpAtkStage: number, attackerSpDefStage: number): number {
  return runCbmSpAtkUp(attackerSpAtkStage) + (attackerSpDefStage === MAX_STAT_STAGE ? -8 : 0);
}

/**
 * `AI_CBM_LightScreen` (`data/battle_ai_scripts.s:354-356`, doc §23.1):
 *
 * ```
 * AI_CBM_LightScreen:
 *     if_side_affecting AI_USER, SIDE_STATUS_LIGHTSCREEN, Score_Minus8
 *     end
 * ```
 *
 * The smallest CBM handler shape in this doc to date: a single side-status
 * bit test against AI_USER's OWN side, zero stat-stage read, zero
 * `get_ability` call -- simpler even than the bare `MAX_STAT_STAGE` stat-UP
 * gates (`AI_CBM_AttackUp` etc.).
 */
function runCbmLightScreen(attackerLightScreenUp: boolean): number {
  return attackerLightScreenUp ? -8 : 0;
}

/**
 * `AI_CBM_Reflect` (`:393-395`, doc §23.1) -- byte-for-byte the same
 * single-instruction shape as `AI_CBM_LightScreen` with `SIDE_STATUS_REFLECT`
 * swapped in (a distinct bit, `include/constants/battle.h:210-211`, not an
 * alias of `SIDE_STATUS_LIGHTSCREEN`).
 */
function runCbmReflect(attackerReflectUp: boolean): number {
  return attackerReflectUp ? -8 : 0;
}

/**
 * `AI_CBM_EvasionUp` (`data/battle_ai_scripts.s:273-275`, doc §24.1):
 *
 * ```
 * AI_CBM_EvasionUp:
 *     if_stat_level_equal AI_USER, STAT_EVASION, MAX_STAT_STAGE, Score_Minus10
 *     end
 * ```
 *
 * Byte-for-byte the same bare 2-instruction MAX_STAT_STAGE-on-AI_USER's-own
 * -stage shape as `AI_CBM_AttackUp`/`AI_CBM_DefenseUp`/`AI_CBM_SpeedUp`/
 * `AI_CBM_SpAtkUp` with `STAT_EVASION` swapped in -- zero `get_ability`
 * calls, no shared tail. Dispatch: `EFFECT_EVASION_UP`/`EFFECT_EVASION_UP_2`
 * (`:114,139`) AND `EFFECT_MINIMIZE` (`:163`) all converge here -- Minimize
 * shares this single-stat shape (not `AI_CBM_BulkUp`/`CosmicPower`/
 * `CalmMind`'s separate dual-stat pattern) because it only ever raises
 * STAT_EVASION.
 */
function runCbmEvasionUp(attackerEvasionStage: number): number {
  return attackerEvasionStage === MAX_STAT_STAGE ? -10 : 0;
}

/**
 * `AI_CBM_EvasionDown` (`data/battle_ai_scripts.s:306-312`, doc §24.1) --
 * the same bare MIN_STAT_STAGE-gate-plus-direct-goto-to-the-shared-tail
 * shape `AI_CBM_DefenseDown`/`AI_CBM_SpDefDown` already established (no
 * intervening own-ability short-circuit like `AttackDown`/`AccDown`'s Hyper
 * Cutter/Keen Eye -- there is no dedicated evasion-immunity ability in
 * Gen 3). Dispatch: `EFFECT_EVASION_DOWN`/`EFFECT_EVASION_DOWN_2` (`:121,146`).
 */
function runCbmEvasionDown(
  target: FactoryAiCheckBadMoveTarget,
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckBadMoveDraw[]; scoreDelta: number }> {
  return runCbmStatDownViaSharedTail(target.evasionStage ?? DEFAULT_STAT_STAGE, target, rng, ordinal, reason);
}

/**
 * `AI_CBM_RainDance`/`AI_CBM_SunnyDay`/`AI_CBM_Hail` (`data/battle_ai_scripts.s:490-493`/
 * `:495-498`/`:522-525`, doc §25.1) -- three separate, individually named
 * dispatch targets (not a shared handler, correcting an earlier doc's own
 * "shared handler" guess), but byte-for-byte the same 3-instruction body:
 *
 * ```
 * AI_CBM_<Weather>:
 *     get_weather
 *     if_equal AI_WEATHER_<OWN>, Score_Minus8
 *     end
 * ```
 *
 * Zero `get_ability` calls, zero stat-stage reads, zero ability/item gate --
 * the smallest CBM handler shape in the doc. One parameterized helper covers
 * all three, differing only in which `AI_WEATHER_*` constant each checks.
 */
function runCbmWeatherSetter(currentWeather: AiWeatherValue | undefined, ownWeatherConstant: AiWeatherValue): number {
  return currentWeather === ownWeatherConstant ? -8 : 0;
}

function runCbmRainDance(currentWeather: AiWeatherValue | undefined): number {
  return runCbmWeatherSetter(currentWeather, AI_WEATHER_RAIN);
}

function runCbmSunnyDay(currentWeather: AiWeatherValue | undefined): number {
  return runCbmWeatherSetter(currentWeather, AI_WEATHER_SUN);
}

function runCbmHail(currentWeather: AiWeatherValue | undefined): number {
  return runCbmWeatherSetter(currentWeather, AI_WEATHER_HAIL);
}

export function typeMultiplierTenths(attackingType: string, defendingTypes: readonly [string, string]): number {
  const distinct = defendingTypes[0] === defendingTypes[1] ? [defendingTypes[0]] : defendingTypes;
  let mult = 10;
  for (const defType of distinct) {
    const entry = TYPE_EFFECTIVENESS.find(
      (candidate) => candidate.attackingType === attackingType && candidate.defendingType === defType,
    );
    if (entry) mult = Math.trunc((mult * entry.multiplierTenths) / 10);
  }
  return mult;
}

/**
 * `AI_CheckBadMove` for one move slot against one target (`:51-214`).
 * `drawOrdinalStart` numbers this pass's `get-ability` draws for tracing;
 * the caller composes ordinals across slots/scripts.
 */
export function runCheckBadMovePreamble(input: Readonly<{
  rng: BattleRngState;
  moveId: number;
  target: FactoryAiCheckBadMoveTarget;
  attacker: FactoryAiCheckBadMoveAttacker;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): FactoryAiCheckBadMoveResult {
  const { target } = input;
  const move = MOVES_BY_ID.get(input.moveId);
  if (!move) throw new Error(`factory-ai-check-bad-move: unknown move ${input.moveId}`);

  let rng = input.rng;
  const draws: FactoryAiCheckBadMoveDraw[] = [];
  let ordinal = input.drawOrdinalStart;
  const drawAbility = (reason: string): string => {
    const result = nextGetAbilityDraw(rng, ordinal, reason, target);
    rng = result.rng;
    if (result.draw) {
      draws.push(result.draw);
      ordinal += 1;
    }
    return result.ability;
  };

  const isOhko = input.moveId === MOVE_FISSURE || input.moveId === MOVE_HORN_DRILL;
  const isMovePowerOther = !isOhko
    && (move.power <= 1 || IGNORED_POWERFUL_MOVE_EFFECTS.has(move.effect));

  let reachedCheckEffect = false;

  if (!isMovePowerOther) {
    // AI_CBM_CheckIfNegatesType
    const effectivenessTenths = typeMultiplierTenths(move.type, target.types);
    if (effectivenessTenths === 0) {
      return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
    }

    const guessed = drawAbility(`${input.reasonPrefix}-negates-type`);
    let negated = false;
    if (guessed === NEGATING_ABILITIES.voltAbsorb) {
      if (move.type === "TYPE_ELECTRIC") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -12 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.waterAbsorb) {
      if (move.type === "TYPE_WATER") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -12 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.flashFire) {
      if (move.type === "TYPE_FIRE") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -12 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.wonderGuard) {
      if (effectivenessTenths !== 20) {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
      }
      negated = true;
    } else if (guessed === NEGATING_ABILITIES.levitate) {
      if (move.type === "TYPE_GROUND") {
        return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
      }
      negated = true;
    }
    void negated;
  }

  // AI_CheckBadMove_CheckSoundproof_ / AI_CheckBadMove_CheckSoundproof
  const soundproofGuess = drawAbility(`${input.reasonPrefix}-soundproof`);
  if (soundproofGuess === "ABILITY_SOUNDPROOF" && SOUNDPROOF_MOVES.has(input.moveId)) {
    return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: -10 });
  }
  reachedCheckEffect = true;
  void reachedCheckEffect;

  // AI_CheckBadMove_CheckEffect: EFFECT_SPEED_DOWN(_2) -> AI_CBM_SpeedDown,
  // one of the two handlers this port implements out of the table's ~100 entries.
  if (move.effect === "EFFECT_SPEED_DOWN" || move.effect === "EFFECT_SPEED_DOWN_2") {
    const speedDown = runCbmSpeedDown(target, rng, ordinal, `${input.reasonPrefix}-speed-down`);
    for (const draw of speedDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: speedDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: speedDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_ATTACK_DOWN(_2) -> AI_CBM_AttackDown,
  // the first CBM-blocked pair's own CBM half (doc §14).
  if (move.effect === "EFFECT_ATTACK_DOWN" || move.effect === "EFFECT_ATTACK_DOWN_2") {
    const attackDown = runCbmAttackDown(target, rng, ordinal, `${input.reasonPrefix}-attack-down`);
    for (const draw of attackDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: attackDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: attackDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_DEFENSE_DOWN(_2) -> AI_CBM_DefenseDown,
  // the second CBM-blocked pair's own CBM half (doc §15).
  if (move.effect === "EFFECT_DEFENSE_DOWN" || move.effect === "EFFECT_DEFENSE_DOWN_2") {
    const defenseDown = runCbmDefenseDown(target, rng, ordinal, `${input.reasonPrefix}-defense-down`);
    for (const draw of defenseDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: defenseDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: defenseDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_SPECIAL_DEFENSE_DOWN(_2) -> AI_CBM_SpDefDown,
  // the third CBM-blocked pair's own CBM half (doc §16).
  if (move.effect === "EFFECT_SPECIAL_DEFENSE_DOWN" || move.effect === "EFFECT_SPECIAL_DEFENSE_DOWN_2") {
    const spDefDown = runCbmSpDefDown(target, rng, ordinal, `${input.reasonPrefix}-sp-def-down`);
    for (const draw of spDefDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: spDefDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: spDefDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_ACCURACY_DOWN(_2) -> AI_CBM_AccDown,
  // the sixth CBM-blocked pair's own CBM half (doc §19). EFFECT_ACCURACY_
  // DOWN_2 is dispatched too, source-faithfully, despite being a vestigial
  // constant with zero real moves (doc §19.1).
  if (move.effect === "EFFECT_ACCURACY_DOWN" || move.effect === "EFFECT_ACCURACY_DOWN_2") {
    const accDown = runCbmAccDown(target, rng, ordinal, `${input.reasonPrefix}-acc-down`);
    for (const draw of accDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: accDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: accDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_ATTACK_UP(_2) -> AI_CBM_AttackUp,
  // the fourth CBM-blocked pair's own CBM half (doc §17) -- the first
  // stat-UP handler; reads AI_USER's own state, not the target's.
  if (move.effect === "EFFECT_ATTACK_UP" || move.effect === "EFFECT_ATTACK_UP_2") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmAttackUp(input.attacker.atkStage),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_DEFENSE_UP(_2)/EFFECT_DEFENSE_CURL ->
  // AI_CBM_DefenseUp, the fifth CBM-blocked pair's own CBM half (doc §18).
  if (
    move.effect === "EFFECT_DEFENSE_UP"
    || move.effect === "EFFECT_DEFENSE_UP_2"
    || move.effect === "EFFECT_DEFENSE_CURL"
  ) {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmDefenseUp(input.attacker.defStage),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_BULK_UP -> AI_CBM_BulkUp, a separate
  // third stat-up handler reached on the CBM side only (doc §18.1).
  if (move.effect === "EFFECT_BULK_UP") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmBulkUp(input.attacker.atkStage, input.attacker.defStage),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_SPEED_UP(_2) -> AI_CBM_SpeedUp, the
  // seventh CBM-blocked pair's own CBM half (doc §20).
  if (move.effect === "EFFECT_SPEED_UP" || move.effect === "EFFECT_SPEED_UP_2") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmSpeedUp(input.attacker.speedStage ?? DEFAULT_STAT_STAGE),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_SPECIAL_ATTACK_UP(_2) -> AI_CBM_SpAtkUp,
  // the eighth CBM-blocked pair's own CBM half (doc §21).
  if (move.effect === "EFFECT_SPECIAL_ATTACK_UP" || move.effect === "EFFECT_SPECIAL_ATTACK_UP_2") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmSpAtkUp(input.attacker.spAtkStage ?? DEFAULT_STAT_STAGE),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_COSMIC_POWER -> AI_CBM_CosmicPower,
  // the ninth CBM-blocked pair's own CBM half (doc §22) -- a separate
  // dual-stat handler (DEF then SPDEF), not an alias of AI_CBM_DefenseUp.
  if (move.effect === "EFFECT_COSMIC_POWER") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmCosmicPower(
        input.attacker.defStage,
        input.attacker.spDefStage ?? DEFAULT_STAT_STAGE,
      ),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_CALM_MIND -> AI_CBM_CalmMind, the
  // ninth CBM-blocked pair's other CBM half (doc §22) -- a separate
  // dual-stat handler (SPATK then SPDEF), not an alias of AI_CBM_SpAtkUp.
  if (move.effect === "EFFECT_CALM_MIND") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmCalmMind(
        input.attacker.spAtkStage ?? DEFAULT_STAT_STAGE,
        input.attacker.spDefStage ?? DEFAULT_STAT_STAGE,
      ),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_LIGHT_SCREEN -> AI_CBM_LightScreen,
  // the tenth CBM-blocked pair's own CBM half (doc §23) -- a single
  // AI_USER-own-side-status bit test, zero stat-stage/ability reads.
  if (move.effect === "EFFECT_LIGHT_SCREEN") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmLightScreen(input.attacker.lightScreenUp ?? false),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_REFLECT -> AI_CBM_Reflect, the tenth
  // CBM-blocked pair's other CBM half (doc §23), same shape as LightScreen
  // above with SIDE_STATUS_REFLECT swapped in.
  if (move.effect === "EFFECT_REFLECT") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmReflect(input.attacker.reflectUp ?? false),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_EVASION_UP(_2)/EFFECT_MINIMIZE ->
  // AI_CBM_EvasionUp, the eleventh CBM-blocked pair's own CBM half (doc §24)
  // -- reads AI_USER's own state, same shape as AttackUp/DefenseUp/etc.
  if (
    move.effect === "EFFECT_EVASION_UP"
    || move.effect === "EFFECT_EVASION_UP_2"
    || move.effect === "EFFECT_MINIMIZE"
  ) {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmEvasionUp(input.attacker.evasionStage ?? DEFAULT_STAT_STAGE),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_EVASION_DOWN(_2) -> AI_CBM_EvasionDown,
  // the eleventh CBM-blocked pair's other CBM half (doc §24).
  if (move.effect === "EFFECT_EVASION_DOWN" || move.effect === "EFFECT_EVASION_DOWN_2") {
    const evasionDown = runCbmEvasionDown(target, rng, ordinal, `${input.reasonPrefix}-evasion-down`);
    for (const draw of evasionDown.draws) draws.push(draw);
    return Object.freeze({
      kind: "scored",
      rng: evasionDown.rng,
      draws: Object.freeze(draws),
      scoreDelta: evasionDown.scoreDelta,
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_RAIN_DANCE -> AI_CBM_RainDance, the
  // twelfth (weather-trio) CBM-blocked pair's own CBM half (doc §25).
  if (move.effect === "EFFECT_RAIN_DANCE") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmRainDance(input.attacker.currentWeather),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_SUNNY_DAY -> AI_CBM_SunnyDay, the
  // weather trio's second CBM half (doc §25).
  if (move.effect === "EFFECT_SUNNY_DAY") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmSunnyDay(input.attacker.currentWeather),
    });
  }

  // AI_CheckBadMove_CheckEffect: EFFECT_HAIL -> AI_CBM_Hail, the weather
  // trio's third CBM half (doc §25).
  if (move.effect === "EFFECT_HAIL") {
    return Object.freeze({
      kind: "scored",
      rng,
      draws: Object.freeze(draws),
      scoreDelta: runCbmHail(input.attacker.currentWeather),
    });
  }

  // AI_CheckBadMove_CheckEffect: source-complete if_effect table lookup.
  if (AI_CHECK_BAD_MOVE_TABLE_EFFECTS.has(move.effect)) {
    return Object.freeze({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-bad-move",
      effect: move.effect,
      moveId: input.moveId,
    });
  }

  return Object.freeze({ kind: "scored", rng, draws: Object.freeze(draws), scoreDelta: 0 });
}
