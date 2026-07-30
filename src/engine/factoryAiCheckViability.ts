/**
 * Pure port of `AI_CheckViability`'s dispatch shell
 * (`data/battle_ai_scripts.s:652-2615`,
 * `docs/factory-ai-ground-truth.md` §4 item 5). Per the port-subset audit,
 * this session stubs the entire script behind a source-complete `if_effect`
 * table lookup, same shape as `factoryAiCheckBadMove.ts`'s own table: a move
 * whose effect has NO entry in the 122-line `if_effect` chain
 * (`AI_CheckViability_CheckIfEffect`, grouped into 90 unique `AI_CV_*`
 * handlers) falls straight through to the trailing `end` with a genuine,
 * complete zero score / zero draws -- not a stub for that path. A move
 * whose effect DOES have an entry halts with a named
 * `"factory-ai-check-viability"` unsupported-branch barrier -- except the
 * following (the ported handlers per
 * `docs/factory-ai-checkviability-ground-truth.md` §5's table, dispatched
 * before that barrier check): `EFFECT_SLEEP` (`AI_CV_Sleep`, doc §29), `EFFECT_SPEED_DOWN(_2)` (`AI_CV_SpeedDown`,
 * `runCvSpeedDown` below, `data/battle_ai_scripts.s:1142-1152`,
 * `docs/factory-ai-checkviability-ground-truth.md` §6), `EFFECT_PURSUIT`
 * (`AI_CV_Pursuit`, `runCvPursuit` below, `:2018-2036`, doc §11.1),
 * `EFFECT_HIGH_CRITICAL`/`EFFECT_BLAZE_KICK`/`EFFECT_POISON_TAIL`
 * (`AI_CV_HighCrit`, `runCvHighCrit` below, `:1449-1461`, doc §11.2),
 * `EFFECT_ALWAYS_HIT` (`AI_CV_AlwaysHit`, `runCvAlwaysHit` below,
 * `:1075-1089`, doc §12.1), `EFFECT_VITAL_THROW` (`AI_CV_VitalThrow`,
 * `runCvVitalThrow` below, `:1536-1546`, doc §13 -- the fifth and last
 * CV-only-reachable handler), and `EFFECT_ATTACK_DOWN`/`EFFECT_ATTACK_DOWN_2`
 * (`AI_CV_AttackDown`, `runCvAttackDown` below, `:1090-1123`, doc §14 -- the
 * first CBM-blocked pair's own CV half, paired with
 * `factoryAiCheckBadMove.ts`'s `AI_CBM_AttackDown`), `EFFECT_DEFENSE_DOWN(_2)`
 * (`AI_CV_DefenseDown`, `runCvDefenseDown` below, `:1124-1134`, doc §15 --
 * the second CBM-blocked pair's own CV half), and
 * `EFFECT_SPECIAL_DEFENSE_DOWN(_2)` (`AI_CV_SpDefDown`, `runCvSpDefDown`
 * below, `:1186-1196`, doc §16 -- the third CBM-blocked pair's own CV half,
 * byte-for-byte the same shape as `AI_CV_DefenseDown` with `STAT_SPDEF`
 * swapped for `STAT_DEF`), and `EFFECT_ATTACK_UP`/`EFFECT_ATTACK_UP_2`
 * (`AI_CV_AttackUp`, `runCvAttackUp` below, `:896-913`, doc §17 -- the
 * fourth CBM-blocked pair's own CV half, and the first stat-**UP** handler:
 * every gate/draw site reads `AI_USER`'s OWN state, `AI_TARGET` is never
 * read at all), `EFFECT_DEFENSE_UP`/`EFFECT_DEFENSE_UP_2`/`EFFECT_BULK_UP`
 * (`AI_CV_DefenseUp`, `runCvDefenseUp` below, `:915-942`, doc §18 -- the
 * fifth CBM-blocked pair's own CV half), `EFFECT_ACCURACY_DOWN(_2)`
 * (`AI_CV_AccuracyDown`, `runCvAccuracyDown` below, `:1198-1234`, doc §19 --
 * the sixth CBM-blocked pair's own CV half and the largest ported handler
 * in this doc, 7 `if_random_less_than` sites), `EFFECT_SPEED_UP`/
 * `EFFECT_SPEED_UP_2` (`AI_CV_SpeedUp`, `runCvSpeedUp` below, `:956-965`,
 * doc §20 -- the seventh CBM-blocked pair's own CV half, gated on relative
 * Speed like `AI_CV_SpeedDown` rather than an HP/stat-stage threshold), and
 * `EFFECT_SPECIAL_ATTACK_UP`/`EFFECT_SPECIAL_ATTACK_UP_2` (`AI_CV_SpAtkUp`,
 * `runCvSpAtkUp` below, `:967-983`, doc §21 -- the eighth CBM-blocked pair's
 * own CV half, byte-for-byte `AI_CV_AttackUp`'s own shape with `STAT_SPATK`
 * for `STAT_ATK` and DRAW SITE 3's threshold corrected to 70, not 40), and
 * `EFFECT_SPECIAL_DEFENSE_UP`/`EFFECT_SPECIAL_DEFENSE_UP_2`/
 * `EFFECT_COSMIC_POWER`/`EFFECT_CALM_MIND` (`AI_CV_SpDefUp`, `runCvSpDefUp`
 * below, `:986-1013`, doc §22 -- the ninth CBM-blocked pair's own CV half,
 * and the single shared CV target for all four of these effects even though
 * the CBM side splits them across three separate handlers, doc §22.1.
 * Byte-for-byte `AI_CV_DefenseUp`'s own gate topology and odds with
 * `STAT_SPDEF` for `STAT_DEF`, EXCEPT Gate F's `if_in_bytes` polarity is
 * INVERTED vs `DefenseUp`'s own `if_not_in_bytes` -- the correct in-universe
 * semantics for Special Defense's own mirror-image relationship to physical
 * damage, doc §22.1), and `EFFECT_LIGHT_SCREEN`/`EFFECT_REFLECT`
 * (`AI_CV_LightScreen`/`AI_CV_Reflect`, `runCvLightScreen`/`runCvReflect`
 * below, `:1373-1393`/`:1492-1514`, doc §23 -- the tenth CBM-blocked pair's
 * own CV half, the first fully twin-symmetric pair in this doc: one HP gate
 * on AI_USER's OWN hp, then the TARGET's own innate type1/type2 against a
 * type list -- `LightScreen`'s 8-type special list, `Reflect`'s 9-type
 * physical list, exact complements covering all 17 Gen 3 types -- and
 * exactly 1 draw site each, the shortest CV body in the whole
 * physical/special-list sub-family), and `EFFECT_EVASION_UP`/
 * `EFFECT_EVASION_UP_2`/`EFFECT_MINIMIZE` and `EFFECT_EVASION_DOWN`/
 * `EFFECT_EVASION_DOWN_2` (`AI_CV_EvasionUp`/`AI_CV_EvasionDown`,
 * `runCvEvasionUp`/`runCvEvasionDown` below, `:1037-1074`/`:1235-1246`,
 * doc §24 -- the eleventh CBM-blocked pair's own CV half. `AI_CV_EvasionUp`
 * is the largest ported CV handler in this doc, 8 `if_random_less_than`
 * sites -- structurally close to `AI_CV_AccuracyDown`'s own 7-site shape
 * but re-derived independently per doc §24.1, which found three real
 * divergences: DRAW SITE 1 has no Gate B companion (a single 90%-HP gate,
 * not AccuracyDown's own two-gate 70% shape), Gate A's own HP threshold is
 * 90 not 70, and Gate I reads AI_USER's own evasion stage (not AI_TARGET's)
 * since this is an UP handler raising the opponent's own stat.
 * `AI_CV_EvasionDown` is confirmed byte-for-byte the same shape as
 * `AI_CV_DefenseDown`/`AI_CV_SpDefDown` with `STAT_EVASION` swapped in,
 * reusing the shared `runCvStatDown` body), and `EFFECT_SUNNY_DAY`/
 * `EFFECT_HAIL`/`EFFECT_RAIN_DANCE` (`AI_CV_SunnyDay`/`AI_CV_Hail`/
 * `AI_CV_RainDance`, `runCvSunnyDay`/`runCvHail`/`runCvRainDance` below,
 * `:2060-2075`/`:2261-2276`/`:2037-2058`, doc §25 -- the twelfth CBM-blocked
 * pair's own CV third. `SunnyDay`/`Hail` are exact twins (1 HP gate + a
 * 3-way `get_weather` chain over the OTHER three weather values, zero
 * `if_random_less_than`); `RainDance` genuinely diverges with its own extra
 * Speed-order/Swift-Swim bypass prologue and Rain-Dish tail bonus (doc
 * §25.2/§25.3), independently re-derived per the doc's own standing
 * divergence-check rule rather than assumed identical to its siblings), and
 * `EFFECT_SPEED_DOWN_HIT` (`AI_CV_SpeedDownFromChance`,
 * `runCvSpeedDownFromChance` below, `:1136-1141`, doc §5's table row/§4's
 * footnote/§10 -- the 22nd and last reachable handler, completing this
 * program. Zero `if_random_less_than` sites of its own: a plain `if_move`
 * literal-ID match against 3 of its 6 covered moves that `goto`s straight
 * into `AI_CV_SpeedDown`'s own label -- reused verbatim via `runCvSpeedDown`,
 * not reimplemented -- with the other 3 moves falling through to a genuine
 * zero). The other ~68 are not ported this round (a separate, much larger
 * phased body of work per the audit's §3), so a move that reaches one of
 * THOSE must not silently score zero. R13-D additionally ports
 * `EFFECT_TOXIC`/`EFFECT_LEECH_SEED` (`AI_CV_Toxic`,
 * `runCvToxic` below, `:1353-1371`) because the banked Wonder Guard control
 * reaches that shared handler after its newly ported CheckBadMove Toxic arm,
 * plus `EFFECT_PROTECT` (`AI_CV_Protect`, `runCvProtect` below,
 * `:1894-1932`), the same receipt's following and final score-script draw.
 */
import {
  ABILITY_ID_IN_WEATHER_RANGE,
  AI_WEATHER_HAIL,
  AI_WEATHER_RAIN,
  AI_WEATHER_SANDSTORM,
  AI_WEATHER_SUN,
  MOVES_BY_ID,
  TYPE_EFFECTIVENESS,
  type AiWeatherValue,
} from "./factoryAiCheckBadMove.ts";
import type { BattleRngState } from "./battleDecisionBoundary.ts";
import { applyStab, applyTypeEffectiveness, DEFAULT_STAT_STAGE } from "./damageCalc.ts";
import { advanceRngValue } from "./rng.ts";
import { effectiveSpeed, getWhoStrikesFirst, type TurnOrderBattler } from "./turnOrder.ts";

const U16_MAX = 0xffff;

/**
 * Type-name -> `AI_WEATHER_*` collision id, the CV-side twin of
 * `ABILITY_ID_IN_WEATHER_RANGE` (`factoryAiCheckBadMove.ts`, Channel 1) --
 * `funcResult` is a raw int register, so any `AI_CV_*` handler that writes a
 * TYPE id (`include/constants/pokemon.h:6-23`, 0-17) can re-collide with an
 * `AI_WEATHER_*` constant (0-3) exactly the same way a written ability id
 * can. Only the four lowest type ids -- `TYPE_NORMAL`(0)/`TYPE_FIGHTING`(1)/
 * `TYPE_FLYING`(2)/`TYPE_POISON`(3) -- ever collide; every other type ID
 * (4 upward) can never equal an `if_equal AI_WEATHER_*` compare.
 */
const TYPE_ID_IN_WEATHER_RANGE: ReadonlyMap<string, AiWeatherValue> = new Map([
  ["TYPE_NORMAL", AI_WEATHER_SUN], // id 0
  ["TYPE_FIGHTING", AI_WEATHER_RAIN], // id 1
  ["TYPE_FLYING", AI_WEATHER_SANDSTORM], // id 2
  ["TYPE_POISON", AI_WEATHER_HAIL], // id 3
]);

/** Collision-maps a written TYPE name onto `AI_WEATHER_*`, or `undefined` if its raw id can never collide (>=4). */
function typeFuncResultCollision(typeName: string): AiWeatherValue | undefined {
  return TYPE_ID_IN_WEATHER_RANGE.get(typeName);
}

/** Collision-maps a written ABILITY name onto `AI_WEATHER_*`, or `undefined` if its raw id can never collide (>=4). Channel 1's own map, reused for any CV handler that writes `get_ability`'s result (`AI_CV_RainDance`'s Gate S/R). */
function abilityFuncResultCollision(abilityName: string): AiWeatherValue | undefined {
  return ABILITY_ID_IN_WEATHER_RANGE.get(abilityName);
}

/**
 * Shared value formula for every `AI_CV_*` handler whose body reads
 * `get_target_type1` then, ONLY if type1 doesn't match `matchList`,
 * `get_target_type2` (`AI_CV_AttackDown`'s Gates E/F, `AI_CV_LightScreen`/
 * `AI_CV_Reflect`'s own single gate) -- `Cmd_get_type` is a pure write of
 * whichever type it was asked for (`battle_ai_script_commands.c:1115-1136`),
 * so the LAST type read before either an `if_in_bytes` jump or a fallthrough
 * is exactly type1 (if it matched, or the compare was never reached for
 * type2) or type2 (in every other case, matched or not, since no third
 * `get_type` follows) -- never a mix.
 */
function typeChainFuncResultAfter(
  types: readonly [string, string],
  matchList: ReadonlySet<string>,
): AiWeatherValue | undefined {
  return matchList.has(types[0])
    ? typeFuncResultCollision(types[0])
    : typeFuncResultCollision(types[1]);
}

/**
 * Every `EFFECT_*` with an `if_effect` entry in `AI_CheckViability`
 * (`data/battle_ai_scripts.s:654-775`), source-complete: 122 `if_effect`
 * lines grouped into 90 unique `AI_CV_*` handlers (several effects, e.g.
 * `EFFECT_ATTACK_UP`/`EFFECT_ATTACK_UP_2`, share one handler). An effect NOT
 * in this set has no entry in the dispatch chain at all.
 */
export const AI_CHECK_VIABILITY_TABLE_EFFECTS: ReadonlySet<string> = new Set([
  "EFFECT_SLEEP", "EFFECT_ABSORB", "EFFECT_EXPLOSION", "EFFECT_DREAM_EATER",
  "EFFECT_MIRROR_MOVE", "EFFECT_ATTACK_UP", "EFFECT_DEFENSE_UP", "EFFECT_SPEED_UP",
  "EFFECT_SPECIAL_ATTACK_UP", "EFFECT_SPECIAL_DEFENSE_UP", "EFFECT_ACCURACY_UP", "EFFECT_EVASION_UP",
  "EFFECT_ALWAYS_HIT", "EFFECT_ATTACK_DOWN", "EFFECT_DEFENSE_DOWN", "EFFECT_SPEED_DOWN",
  "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_ACCURACY_DOWN", "EFFECT_EVASION_DOWN",
  "EFFECT_HAZE", "EFFECT_BIDE", "EFFECT_ROAR", "EFFECT_CONVERSION",
  "EFFECT_RESTORE_HP", "EFFECT_TOXIC", "EFFECT_LIGHT_SCREEN", "EFFECT_REST",
  "EFFECT_OHKO", "EFFECT_RAZOR_WIND", "EFFECT_SUPER_FANG", "EFFECT_TRAP",
  "EFFECT_HIGH_CRITICAL", "EFFECT_CONFUSE", "EFFECT_ATTACK_UP_2", "EFFECT_DEFENSE_UP_2",
  "EFFECT_SPEED_UP_2", "EFFECT_SPECIAL_ATTACK_UP_2", "EFFECT_SPECIAL_DEFENSE_UP_2", "EFFECT_ACCURACY_UP_2",
  "EFFECT_EVASION_UP_2", "EFFECT_ATTACK_DOWN_2", "EFFECT_DEFENSE_DOWN_2", "EFFECT_SPEED_DOWN_2",
  "EFFECT_SPECIAL_ATTACK_DOWN_2", "EFFECT_SPECIAL_DEFENSE_DOWN_2", "EFFECT_ACCURACY_DOWN_2", "EFFECT_EVASION_DOWN_2",
  "EFFECT_REFLECT", "EFFECT_POISON", "EFFECT_PARALYZE", "EFFECT_SWAGGER",
  "EFFECT_SPEED_DOWN_HIT", "EFFECT_SKY_ATTACK", "EFFECT_VITAL_THROW", "EFFECT_SUBSTITUTE",
  "EFFECT_RECHARGE", "EFFECT_LEECH_SEED", "EFFECT_DISABLE", "EFFECT_COUNTER",
  "EFFECT_ENCORE", "EFFECT_PAIN_SPLIT", "EFFECT_SNORE", "EFFECT_LOCK_ON",
  "EFFECT_SLEEP_TALK", "EFFECT_DESTINY_BOND", "EFFECT_FLAIL", "EFFECT_HEAL_BELL",
  "EFFECT_THIEF", "EFFECT_MEAN_LOOK", "EFFECT_MINIMIZE", "EFFECT_CURSE",
  "EFFECT_PROTECT", "EFFECT_FORESIGHT", "EFFECT_ENDURE", "EFFECT_BATON_PASS",
  "EFFECT_PURSUIT", "EFFECT_MORNING_SUN", "EFFECT_SYNTHESIS", "EFFECT_MOONLIGHT",
  "EFFECT_RAIN_DANCE", "EFFECT_SUNNY_DAY", "EFFECT_BELLY_DRUM", "EFFECT_PSYCH_UP",
  "EFFECT_MIRROR_COAT", "EFFECT_SKULL_BASH", "EFFECT_SOLAR_BEAM", "EFFECT_SEMI_INVULNERABLE",
  "EFFECT_SOFTBOILED", "EFFECT_FAKE_OUT", "EFFECT_SPIT_UP", "EFFECT_SWALLOW",
  "EFFECT_HAIL", "EFFECT_FLATTER", "EFFECT_MEMENTO", "EFFECT_FACADE",
  "EFFECT_FOCUS_PUNCH", "EFFECT_SMELLINGSALT", "EFFECT_TRICK", "EFFECT_ROLE_PLAY",
  "EFFECT_SUPERPOWER", "EFFECT_MAGIC_COAT", "EFFECT_RECYCLE", "EFFECT_REVENGE",
  "EFFECT_BRICK_BREAK", "EFFECT_KNOCK_OFF", "EFFECT_ENDEAVOR", "EFFECT_ERUPTION",
  "EFFECT_SKILL_SWAP", "EFFECT_IMPRISON", "EFFECT_REFRESH", "EFFECT_SNATCH",
  "EFFECT_BLAZE_KICK", "EFFECT_MUD_SPORT", "EFFECT_OVERHEAT", "EFFECT_TICKLE",
  "EFFECT_COSMIC_POWER", "EFFECT_BULK_UP", "EFFECT_POISON_TAIL", "EFFECT_WATER_SPORT",
  "EFFECT_CALM_MIND", "EFFECT_DRAGON_DANCE",
]);

/**
 * Everything every ported `AI_CV_*` handler body needs from a battler:
 * speed + SPEED stat stage (`if_target_faster`, `runCvSpeedDown`), both
 * types (`get_target_type1/2`, `if_type_effectiveness`'s STAB check),
 * `gDisableStructs[].isFirstTurn` (`is_first_turn_for`, `runCvPursuit` --
 * only AI_USER/the attacker is ever read, but carried on both sides for
 * shape symmetry with the rest of this battler view, same convention
 * `speed`/`speedStage` already established), EVASION/ACC stat stages
 * (`if_stat_level_more_than`/`if_stat_level_less_than`, `runCvAlwaysHit` --
 * only AI_TARGET's evasion and AI_USER's own acc are ever read, same
 * both-sides-carried convention as `isFirstTurn`), and current/max HP
 * (`if_hp_more_than`/`if_hp_less_than`, `runCvVitalThrow` -- only AI_USER's
 * own `hp`/`maxHp` are ever read, same both-sides-carried convention;
 * `hpPercent` is truncating `100*hp/maxHp`, matching
 * `Cmd_if_hp_more_than`/`Cmd_if_hp_less_than`'s own `(u32)` cast, `battle_ai
 * _script_commands.c:713-741`), and ATTACK stat stage
 * (`if_stat_level_equal`/`if_stat_level_more_than AI_TARGET, STAT_ATK`,
 * `runCvAttackDown` -- only AI_TARGET's is ever read; this same handler also
 * reads `hp`/`maxHp` on BOTH sides, unlike `VitalThrow`'s attacker-only
 * reads -- AI_USER's own HP gates Gate B and AI_TARGET's own HP gates Gate
 * D, doc §14.1), and DEFENSE/SPECIAL DEFENSE stat stage
 * (`if_stat_level_more_than AI_TARGET, STAT_DEF`/`STAT_SPDEF`,
 * `runCvDefenseDown`/`runCvSpDefDown` -- only AI_TARGET's is ever read for
 * either, same both-sides-carried convention as `atkStage`).
 */
export type FactoryAiCheckViabilityBattler = Readonly<{
  speed: number;
  speedStage: number;
  types: readonly [string, string];
  isFirstTurn: number;
  evasionStage: number;
  accStage: number;
  atkStage: number;
  defStage: number;
  spDefStage: number;
  hp: number;
  maxHp: number;
  /**
   * AI_USER's own SPECIAL ATTACK stat stage, 0..12 -- `AI_CV_SpAtkUp`'s Gate A
   * (`if_stat_level_less_than AI_USER, STAT_SPATK, 9`, doc §21.1). Optional,
   * defaulting to `DEFAULT_STAT_STAGE` (6) -- the real battle-start neutral
   * value -- so no pre-existing battler literal in this doc's test suite
   * needs touching, same precedent as `lastUsedMoveId` below.
   */
  spAtkStage?: number;
  /**
   * `gLastMoves[battler]` (`src/battle_main.c:190`), the move ID this
   * battler last used -- `AI_CV_DefenseUp`'s own Gate E/F read the
   * TARGET's copy (`get_last_used_bank_move AI_TARGET`, doc §18.1/§18.2).
   * Optional, defaulting to `MOVE_NONE` (0) when omitted -- the real
   * source's own battle-start default (`gBattleMoves[MOVE_NONE].power ==
   * 0`, doc §18.2), so every pre-existing battler literal in this doc's
   * test suite stays valid unchanged.
   */
  lastUsedMoveId?: number;
  /**
   * `gBattleMons[].status1 & STATUS1_TOXIC_POISON` (`Cmd_if_not_status`,
   * `battle_ai_script_commands.c:791-807`, bit 7 -- `include/constants/
   * battle.h:121`) -- `AI_CV_AccuracyDown`'s Gate D, TARGET's own copy only
   * (doc §19.1). Optional, defaulting to `false` (the real battle-start
   * default -- no status at all).
   */
  isToxicPoisoned?: boolean;
  /**
   * `gStatuses3[] & STATUS3_LEECHSEED` (`Cmd_if_not_status3`,
   * `battle_ai_script_commands.c:863-879`, bit 2 -- `include/constants/
   * battle.h:159`) -- `AI_CV_AccuracyDown`'s Gate E, TARGET's own copy only.
   * Optional, defaulting to `false`.
   */
  isLeechSeeded?: boolean;
  /**
   * `gStatuses3[] & STATUS3_ROOTED` (same `Cmd_if_not_status3`, bit 10 --
   * `include/constants/battle.h:167`, Ingrain) -- `AI_CV_AccuracyDown`'s
   * Gate F, AI_USER's (the opponent's) OWN copy, NOT the target's --
   * carried on both sides for the same shape-symmetry convention as
   * `isFirstTurn`/`lastUsedMoveId`. Optional, defaulting to `false`.
   */
  isRooted?: boolean;
  /**
   * `gBattleMons[].status2 & STATUS2_CURSED` (`Cmd_if_not_status2`,
   * `battle_ai_script_commands.c:827-843`, bit 28 -- `include/constants/
   * battle.h:152`) -- `AI_CV_AccuracyDown`'s Gate G, TARGET's own copy only.
   * Optional, defaulting to `false`.
   */
  isCursed?: boolean;
  /**
   * The AI's own real ability (`get_ability AI_USER`, a direct field read --
   * NEVER the two-ability-guessing heuristic `get_ability AI_TARGET` uses
   * elsewhere, so no `Random()`-consuming confound) -- `AI_CV_RainDance`'s
   * Gate S (Swift Swim bypass) and Gate R (Rain Dish tail bonus), doc §25.2.
   * Only AI_USER's own copy is ever read; carried on both sides for the same
   * shape-symmetry convention as `isFirstTurn`/`lastUsedMoveId` above.
   * Optional, defaulting to `"ABILITY_NONE"` -- no prior ported handler
   * needed the attacker's own real ability, so this is a genuinely new input.
   */
  ability?: string;
  /**
   * Current weather, `AI_WEATHER_*`-encoded (0=Sun/1=Rain/2=Sandstorm/
   * 3=Hail) -- `AI_CV_SunnyDay`/`Hail`/`RainDance`'s own `get_weather` read
   * (doc §25.2), the same encoding `factoryAiCheckBadMove.ts`'s CBM weather
   * trio reads. Only AI_USER's own copy is ever read; carried on both sides
   * for shape symmetry. Optional, defaulting to `undefined` (no weather bit
   * set) -- never equals any of the four `AI_WEATHER_*` values, so it never
   * matches any of the three handlers' own weather-chain gates.
   */
  currentWeather?: AiWeatherValue;
  /**
   * AI_USER's four live move IDs, read by `if_user_has_no_attacking_moves`
   * and the two `if_has_move_with_effect` commands in `AI_CV_Toxic`.
   * Required by that handler's source path; other handlers ignore it.
   */
  moves?: readonly [number, number, number, number];
  /** BattleHistory-known moves for AI_TARGET move-effect scans. */
  knownMoves?: readonly number[];
  /** STATUS2_INFATUATION. */
  isInfatuated?: boolean;
  /** STATUS3_YAWN. */
  hasYawn?: boolean;
  /** STATUS3_PERISH_SONG. */
  hasPerishSong?: boolean;
  /** DisableStruct::protectUses, read by AI_CV_Protect. */
  protectUses?: number;
}>;

export type FactoryAiCheckViabilityDraw =
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "target-faster-tie";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    strikesFirst: 0 | 1 | 2;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    /** `AI_CV_RainDance`'s own Gate P (`if_user_faster`, doc §25.3) -- the SAME hidden-tie-break-`Random()` mechanism `target-faster-tie` above already ports, inverse polarity comparison. */
    kind: "user-faster-tie";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    strikesFirst: 0 | 1 | 2;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "speed-down-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "pursuit-roll" | "sleep-roll" | "roar-roll" | "paralyze-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "high-crit-fallthrough-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    /** true = jumped straight to End (roll < 128, this call draws no further); false = fell through into AI_CV_HighCrit2's own roll immediately after. */
    jumpedToEnd: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "high-crit-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "always-hit-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "vital-throw-midband-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    /** true = jumped straight to End (roll < 180, this call draws no further); false = fell through into AI_CV_VitalThrow2's own roll immediately after. */
    jumpedToEnd: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "vital-throw-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "attack-down-roll-1";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "attack-down-roll-2";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "defense-down-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "sp-def-down-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "evasion-down-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "attack-up-roll-1" | "attack-up-roll-2" | "attack-up-roll-3";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "speed-up-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "sp-atk-up-roll-1" | "sp-atk-up-roll-2" | "sp-atk-up-roll-3";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "defense-up-roll-1" | "defense-up-roll-2" | "defense-up-roll-3" | "defense-up-roll-4" | "defense-up-roll-5";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "sp-def-up-roll-1" | "sp-def-up-roll-2" | "sp-def-up-roll-3" | "sp-def-up-roll-4" | "sp-def-up-roll-5";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "light-screen-roll" | "reflect-roll";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "toxic-roll-1" | "toxic-roll-2" | "toxic-roll-3";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    /** True when `if_random_less_than` takes its jump (raw low byte < threshold). */
    jumped: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind: "protect-roll-1" | "protect-roll-2";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    jumped: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind:
      | "accuracy-down-roll-1"
      | "accuracy-down-roll-2"
      | "accuracy-down-roll-3"
      | "accuracy-down-roll-4"
      | "accuracy-down-roll-5"
      | "accuracy-down-roll-6"
      | "accuracy-down-roll-7";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>
  | Readonly<{
    ordinal: number;
    reason: string;
    kind:
      | "evasion-up-roll-1"
      | "evasion-up-roll-2"
      | "evasion-up-roll-3"
      | "evasion-up-roll-4"
      | "evasion-up-roll-5"
      | "evasion-up-roll-6"
      | "evasion-up-roll-7"
      | "evasion-up-roll-8";
    before: BattleRngState;
    after: BattleRngState;
    rawRngValue: number;
    randomValue: number;
    succeeded: boolean;
  }>;

export type FactoryAiCheckViabilityResult =
  | Readonly<{
    kind: "scored";
    rng: BattleRngState;
    draws: readonly FactoryAiCheckViabilityDraw[];
    scoreDelta: number;
    /**
     * `AI_THINKING_STRUCT->funcResult` as this slot's own dispatched handler
     * leaves it, per the doc §27.1 per-handler write audit -- `undefined`
     * either because the incoming carry (`staleFuncResultFallback`) was
     * itself `undefined`/never written over, or because a write DID happen
     * but its own raw value can never collide with an `AI_WEATHER_*`
     * constant (0-3). The caller threads this into the NEXT dispatched
     * slot's own `staleFuncResultFallback` to simulate the whole pass, not
     * just the first scripted slot (ISSUES #47's movesetIndex-1-3 remainder).
     */
    funcResultAfter: AiWeatherValue | undefined;
  }>
  | Readonly<{
    kind: "unsupported-branch";
    barrier: "factory-ai-check-viability";
    effect: string;
    moveId: number;
  }>;

function nextDraw(
  rng: BattleRngState,
  ordinal: number,
  reason: string,
): Readonly<{
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  ordinal: number;
  reason: string;
}> {
  const rawRngValue = advanceRngValue(rng.value);
  const after: BattleRngState = Object.freeze({ value: rawRngValue, calls: rng.calls + 1 });
  return Object.freeze({
    ordinal,
    reason,
    before: rng,
    after,
    rawRngValue,
    randomValue: (rawRngValue >>> 16) & U16_MAX,
  });
}

/**
 * `AI_CV_Toxic` (`data/battle_ai_scripts.s:1353-1371`), shared by Toxic and
 * Leech Seed. Every branch is ported in script order, including all three
 * `%256` draws and the move-effect scans over AI_USER's complete four-move
 * set. None of these commands writes `funcResult`, so the caller's carry is
 * preserved unchanged.
 */
function runCvToxic(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{
  rng: BattleRngState;
  draws: readonly FactoryAiCheckViabilityDraw[];
  scoreDelta: number;
}> {
  const moves = input.attacker.moves;
  if (!moves) {
    throw new Error("factory-ai-check-viability: AI_CV_Toxic requires AI_USER moves");
  }
  const effects = moves.map((moveId) => MOVES_BY_ID.get(moveId)?.effect ?? null);
  const hasAttackingMove = moves.some((moveId) => (MOVES_BY_ID.get(moveId)?.power ?? 0) !== 0);
  const hasSetupPartner = effects.includes("EFFECT_SPECIAL_DEFENSE_UP")
    || effects.includes("EFFECT_PROTECT");

  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  let score = 0;
  const draw = (
    kind: "toxic-roll-1" | "toxic-roll-2" | "toxic-roll-3",
    threshold: number,
  ): boolean => {
    const roll = nextDraw(rng, ordinal, `${input.reasonPrefix}-${kind}`);
    rng = roll.after;
    ordinal += 1;
    const jumped = roll.randomValue % 256 < threshold;
    draws.push(Object.freeze({ ...roll, kind, jumped }));
    return jumped;
  };

  // AI_CV_Toxic -> AI_CV_Toxic3 when the user has no damaging move.
  if (hasAttackingMove) {
    const attackerHpPercent = Math.floor((100 * input.attacker.hp) / input.attacker.maxHp);
    // HP > 50 jumps to Toxic2; otherwise roll < 50 jumps there. Falling
    // through is the only route to Score_Minus3.
    if (attackerHpPercent <= 50 && !draw("toxic-roll-1", 50)) {
      score -= 3;
    }

    const targetHpPercent = Math.floor((100 * input.target.hp) / input.target.maxHp);
    // HP > 50 jumps to Toxic3; otherwise roll < 50 jumps there. Falling
    // through applies the second independent -3.
    if (targetHpPercent <= 50 && !draw("toxic-roll-2", 50)) {
      score -= 3;
    }
  }

  // The paired SpDef-up/Protect move scan is zero-RNG. With either effect,
  // roll < 60 ends; falling through adds +2.
  if (hasSetupPartner && !draw("toxic-roll-3", 60)) {
    score += 2;
  }

  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
}

const EFFECT_ID_IN_WEATHER_RANGE: ReadonlyMap<string, AiWeatherValue> = new Map([
  ["EFFECT_HIT", AI_WEATHER_SUN],
  ["EFFECT_SLEEP", AI_WEATHER_RAIN],
  ["EFFECT_POISON_HIT", AI_WEATHER_SANDSTORM],
  ["EFFECT_ABSORB", AI_WEATHER_HAIL],
]);

/**
 * `AI_CV_Protect` (`data/battle_ai_scripts.s:1894-1932`), including both
 * status/move-history prologues, the source's usual +2 path, both `%256`
 * rolls, and the consecutive-Protect penalty. Both paths execute
 * `get_last_used_bank_move; get_move_effect_from_result`, so funcResult is
 * always replaced by the target's last-move effect before return.
 */
function runCvProtect(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{
  rng: BattleRngState;
  draws: readonly FactoryAiCheckViabilityDraw[];
  scoreDelta: number;
  funcResultAfter: AiWeatherValue | undefined;
}> {
  const lastMoveEffect = MOVES_BY_ID.get(input.target.lastUsedMoveId ?? 0)?.effect ?? "EFFECT_HIT";
  const funcResultAfter = EFFECT_ID_IN_WEATHER_RANGE.get(lastMoveEffect);
  const knownMoves = input.target.knownMoves ?? [];
  const userMoves = input.attacker.moves ?? [0, 0, 0, 0];
  // Cmd_if_has_move_with_effect's pinned-source AI_TARGET bug checks the AI
  // user's move slot for nonzero before reading the target-history move at
  // that same index. Preserve that positional gate instead of a plain
  // history membership test.
  const targetHistoryHasEffect = (effect: string): boolean =>
    knownMoves.some((moveId, slot) =>
      (userMoves[slot] ?? 0) !== 0
      && MOVES_BY_ID.get(moveId)?.effect === effect
    );
  const earlyProtect3 = (input.attacker.isInfatuated ?? false)
    || (input.attacker.isLeechSeeded ?? false)
    || (input.attacker.hasYawn ?? false)
    || targetHistoryHasEffect("EFFECT_RESTORE_HP")
    || targetHistoryHasEffect("EFFECT_DEFENSE_CURL");

  if (earlyProtect3) {
    return Object.freeze({
      rng: input.rng,
      draws: Object.freeze([]),
      scoreDelta: lastMoveEffect === "EFFECT_LOCK_ON" ? -2 : 0,
      funcResultAfter,
    });
  }

  let score = (input.target.isToxicPoisoned ?? false)
    || (input.target.isCursed ?? false)
    || (input.target.hasPerishSong ?? false)
    || (input.target.isInfatuated ?? false)
    || (input.target.isLeechSeeded ?? false)
    || (input.target.hasYawn ?? false)
    || lastMoveEffect !== "EFFECT_LOCK_ON"
    ? 2
    : 0;

  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const roll1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-protect-roll-1`);
  rng = roll1.after;
  ordinal += 1;
  const jumped1 = roll1.randomValue % 256 < 128;
  draws.push(Object.freeze({ ...roll1, kind: "protect-roll-1" as const, jumped: jumped1 }));
  if (!jumped1) score -= 1;

  if ((input.attacker.protectUses ?? 0) !== 0) {
    score -= 1;
    const roll2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-protect-roll-2`);
    rng = roll2.after;
    const jumped2 = roll2.randomValue % 256 < 128;
    draws.push(Object.freeze({ ...roll2, kind: "protect-roll-2" as const, jumped: jumped2 }));
    if (!jumped2) score -= 1;
  }

  return Object.freeze({
    rng,
    draws: Object.freeze(draws),
    scoreDelta: score,
    funcResultAfter,
  });
}

/**
 * `AI_CV_SpeedDown` (`data/battle_ai_scripts.s:1142-1152`,
 * `docs/factory-ai-checkviability-ground-truth.md` §6):
 *
 * ```
 * AI_CV_SpeedDown:
 *     if_target_faster AI_CV_SpeedDown2
 *     score -3
 *     goto AI_CV_SpeedDown_End
 * AI_CV_SpeedDown2:
 *     if_random_less_than 70, AI_CV_SpeedDown_End
 *     score +2
 * AI_CV_SpeedDown_End:
 *     end
 * ```
 *
 * `if_target_faster` is `if_user_goes 1` (`Cmd_if_user_goes`,
 * `battle_ai_script_commands.c:1268-1274`): it jumps only when
 * `GetWhoStrikesFirst(AI_USER, AI_TARGET, ignoreChosenMoves=TRUE)`
 * (`battle_main.c:4595-4754`, ported bit-exact as `getWhoStrikesFirst` in
 * `turnOrder.ts`) returns EXACTLY 1 (target strictly faster). An exact
 * speed tie resolves to 0 or 2 (`speedBattler1 == speedBattler2 && Random()
 * & 1`, `:4728/4745`) -- never 1 -- so a tie never takes the +2/roll
 * branch, even though `GetWhoStrikesFirst` itself still burns one real
 * `Random()` call to break the tie internally before that comparison is
 * even made; this port replicates that real draw. `ignoreChosenMoves=TRUE`
 * means both battlers compare at move-priority 0 for this call specifically
 * (not the move actually being scored).
 */
function runCvSpeedDown(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;

  const attacker: TurnOrderBattler = { speed: input.attacker.speed, speedStage: input.attacker.speedStage, movePriority: 0 };
  const target: TurnOrderBattler = { speed: input.target.speed, speedStage: input.target.speedStage, movePriority: 0 };

  let tieRoll = 0;
  let tieDraw: ReturnType<typeof nextDraw> | null = null;
  if (effectiveSpeed(attacker) === effectiveSpeed(target)) {
    tieDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-target-faster-tie`);
    rng = tieDraw.after;
    tieRoll = tieDraw.randomValue;
    ordinal += 1;
  }
  const strikesFirst = getWhoStrikesFirst(attacker, target, tieRoll);
  if (tieDraw) {
    draws.push(Object.freeze({ ...tieDraw, kind: "target-faster-tie" as const, strikesFirst }));
  }
  const targetFaster = strikesFirst === 1;

  if (!targetFaster) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: -3 });
  }

  const rollDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-roll`);
  rng = rollDraw.after;
  // if_random_less_than 70, AI_CV_SpeedDown_End: the JUMP (roll < 70, ~27%
  // of rolls) skips the bonus; falling through (roll >= 70, ~73%) grants +2
  // (battle_ai_script_commands.c:663-670).
  const succeeded = rollDraw.randomValue % 256 >= 70;
  draws.push(Object.freeze({ ...rollDraw, kind: "speed-down-roll" as const, succeeded }));
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: succeeded ? 2 : 0 });
}

const MOVE_ICY_WIND = 196;
const MOVE_ROCK_TOMB = 317;
const MOVE_MUD_SHOT = 341;

/**
 * `AI_CV_SpeedDownFromChance` (`data/battle_ai_scripts.s:1136-1141`,
 * `docs/factory-ai-checkviability-ground-truth.md` §5's table row, §4's
 * footnote, §10's porter note):
 *
 * ```
 * AI_CV_SpeedDownFromChance:
 *     if_move MOVE_ICY_WIND, AI_CV_SpeedDown
 *     if_move MOVE_ROCK_TOMB, AI_CV_SpeedDown
 *     if_move MOVE_MUD_SHOT, AI_CV_SpeedDown
 *     end
 * ```
 *
 * `EFFECT_SPEED_DOWN_HIT` covers 6 executable moves (`MOVE_ICY_WIND`,
 * `MOVE_ROCK_TOMB`, `MOVE_MUD_SHOT`, `MOVE_BUBBLE_BEAM`, `MOVE_CONSTRICT`,
 * `MOVE_BUBBLE`). The handler's own body has ZERO `if_random_less_than`
 * sites and reads nothing but the literal move ID currently under
 * consideration (`if_move`, a plain `u16` compare, `Cmd_if_move` --
 * NOT a read of any effect-chance/secondary-effect-probability datum
 * despite the "FromChance" name; that name describes the in-game MOVE
 * CATEGORY the 6 dispatching moves belong to (a chance-on-hit secondary
 * effect), not anything this handler itself inspects -- re-derived from
 * the raw assembly, not assumed from the name). Exactly 3 of the 6
 * (`ICY_WIND`/`ROCK_TOMB`/`MUD_SHOT`) `goto` into `AI_CV_SpeedDown`'s OWN
 * label -- the real ROM's control flow lands inside that handler's own
 * instructions, not a copy -- so this port calls `runCvSpeedDown` directly
 * for those three, unmodified (no duplicated gate/roll logic). The other 3
 * (`BUBBLE_BEAM`/`CONSTRICT`/`BUBBLE`) fall through the un-matched `if_move`
 * chain straight to `end`: a genuine, deterministic zero score/zero draws
 * for every battle state, not a stub.
 */
function runCvSpeedDownFromChance(input: Readonly<{
  rng: BattleRngState;
  moveId: number;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  if (input.moveId === MOVE_ICY_WIND || input.moveId === MOVE_ROCK_TOMB || input.moveId === MOVE_MUD_SHOT) {
    return runCvSpeedDown(input);
  }
  return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0 });
}

/**
 * `AI_CV_SpeedUp` (`data/battle_ai_scripts.s:956-965`,
 * `docs/factory-ai-checkviability-ground-truth.md` §20.1):
 *
 * ```
 * AI_CV_SpeedUp:
 *     if_target_faster AI_CV_SpeedUp2
 *     score -3
 *     goto AI_CV_SpeedUp_End
 * AI_CV_SpeedUp2:
 *     if_random_less_than 70, AI_CV_SpeedUp_End
 *     score +3
 * AI_CV_SpeedUp_End:
 *     end
 * ```
 *
 * The SAME `if_target_faster` gate and tie-break machinery `runCvSpeedDown`
 * already ports above (doc §20.1 cites §6 as the true structural sibling,
 * not `AttackUp`/`DefenseUp`) -- target strictly faster reaches DRAW SITE 1
 * (`:962`, JUMP roll<70 skips the bonus, ~27.3%; fall through roll>=70
 * grants +3, ~72.7%); target not faster is a deterministic `score -3`, DRAW
 * SITE 1 never reached. Only the fallthrough score differs from
 * `SpeedDown`'s own shape (+3 here vs +2 there); the deterministic branch's
 * `-3` is identical in both.
 */
function runCvSpeedUp(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;

  const attacker: TurnOrderBattler = { speed: input.attacker.speed, speedStage: input.attacker.speedStage, movePriority: 0 };
  const target: TurnOrderBattler = { speed: input.target.speed, speedStage: input.target.speedStage, movePriority: 0 };

  let tieRoll = 0;
  let tieDraw: ReturnType<typeof nextDraw> | null = null;
  if (effectiveSpeed(attacker) === effectiveSpeed(target)) {
    tieDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-target-faster-tie`);
    rng = tieDraw.after;
    tieRoll = tieDraw.randomValue;
    ordinal += 1;
  }
  const strikesFirst = getWhoStrikesFirst(attacker, target, tieRoll);
  if (tieDraw) {
    draws.push(Object.freeze({ ...tieDraw, kind: "target-faster-tie" as const, strikesFirst }));
  }
  const targetFaster = strikesFirst === 1;

  if (!targetFaster) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: -3 });
  }

  const rollDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-roll`);
  rng = rollDraw.after;
  // if_random_less_than 70, AI_CV_SpeedUp_End: the JUMP (roll < 70, ~27%)
  // skips the bonus; falling through (roll >= 70, ~73%) grants +3.
  const succeeded = rollDraw.randomValue % 256 >= 70;
  draws.push(Object.freeze({ ...rollDraw, kind: "speed-up-roll" as const, succeeded }));
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: succeeded ? 3 : 0 });
}

/**
 * `AI_CV_Pursuit` (`data/battle_ai_scripts.s:2018-2036`,
 * `docs/factory-ai-checkviability-ground-truth.md` §11.1):
 *
 * ```
 * AI_CV_Pursuit:
 *     is_first_turn_for AI_USER
 *     if_not_equal 0, AI_CV_Pursuit_End
 *     get_target_type1
 *     if_equal TYPE_GHOST, AI_CV_Pursuit2
 *     get_target_type1
 *     if_equal TYPE_PSYCHIC, AI_CV_Pursuit2
 *     get_target_type2
 *     if_equal TYPE_GHOST, AI_CV_Pursuit2
 *     get_target_type2
 *     if_equal TYPE_PSYCHIC, AI_CV_Pursuit2
 *     goto AI_CV_Pursuit_End
 * AI_CV_Pursuit2:
 *     if_random_less_than 128, AI_CV_Pursuit_End
 *     score +1
 * AI_CV_Pursuit_End:
 *     end
 * ```
 *
 * `is_first_turn_for AI_USER` (`Cmd_is_first_turn_for`,
 * `battle_ai_script_commands.c:2102-2113`) reads
 * `gDisableStructs[aiBattler].isFirstTurn` -- 2 during turn 1's decision, 1
 * during turn 2's, 0 from turn 3 onward (send-out init + `TurnValuesCleanUp`'s
 * per-turn decrement, `battle_main.c`). The gate gauges the OPPONENT's own
 * elapsed turns, not the target's -- Pursuit's real "punish a switch"
 * purpose plays no role in this AI check. Only once that clears does the
 * script test the target's own two type slots against Ghost/Psychic
 * (hardcoded types, not a read of Pursuit's own Dark type or a real type
 * effectiveness lookup).
 */
/**
 * `AI_CV_Pursuit`'s own writes-ALWAYS `funcResult` exit value (doc §27.1
 * handler 3): `is_first_turn_for AI_USER` writes unconditionally first
 * (`funcResult = isFirstTurn`, 0-2). If nonzero, that value survives
 * untouched (no further write on this path) -- always collision-mapped
 * in-range since 1/2 are themselves valid `AI_WEATHER_*` ids. If zero, the
 * handler re-reads target type1 (twice, checked against GHOST then
 * PSYCHIC) then type2 (twice, same checks) -- EVERY `if_equal` compare that
 * takes the jump to `AI_CV_Pursuit2` does so immediately after a
 * `get_target_typeX` write of exactly the value it just compared, and the
 * one non-jumping fallthrough path's last write is also type2 (the second,
 * redundant type2 read) -- so the exit value is always type1 (if type1 is
 * Ghost or Psychic) or type2 (in every other case, matched or not).
 */
function pursuitFuncResultAfter(attackerIsFirstTurn: number, targetTypes: readonly [string, string]): AiWeatherValue | undefined {
  if (attackerIsFirstTurn !== 0) {
    // Only 1 or 2 reach here -- both already valid AI_WEATHER_* ids.
    return attackerIsFirstTurn as AiWeatherValue;
  }
  const [t1] = targetTypes;
  if (t1 === "TYPE_GHOST" || t1 === "TYPE_PSYCHIC") {
    return typeFuncResultCollision(t1);
  }
  return typeFuncResultCollision(targetTypes[1]);
}

function runCvPursuit(input: Readonly<{
  rng: BattleRngState;
  attackerIsFirstTurn: number;
  targetTypes: readonly [string, string];
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  const funcResultAfter = pursuitFuncResultAfter(input.attackerIsFirstTurn, input.targetTypes);
  if (input.attackerIsFirstTurn !== 0) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0, funcResultAfter });
  }
  const isGhostOrPsychic = input.targetTypes.some((t) => t === "TYPE_GHOST" || t === "TYPE_PSYCHIC");
  if (!isGhostOrPsychic) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0, funcResultAfter });
  }

  const draw = nextDraw(input.rng, input.drawOrdinalStart, `${input.reasonPrefix}-roll`);
  // if_random_less_than 128, AI_CV_Pursuit_End: the JUMP (roll < 128, ~50%)
  // skips the bonus; falling through (roll >= 128) grants +1.
  const succeeded = draw.randomValue % 256 >= 128;
  return Object.freeze({
    rng: draw.after,
    draws: Object.freeze([Object.freeze({ ...draw, kind: "pursuit-roll" as const, succeeded })]),
    scoreDelta: succeeded ? 1 : 0,
    funcResultAfter,
  });
}

const AI_EFFECTIVENESS_X0_25 = 10;
const AI_EFFECTIVENESS_X0_5 = 20;
const AI_EFFECTIVENESS_X1 = 40;
const AI_EFFECTIVENESS_X2 = 80;
const AI_EFFECTIVENESS_X4 = 160;

/**
 * `Cmd_if_type_effectiveness`'s own effectiveness-class probe
 * (`battle_ai_script_commands.c:1515-1554`), reused verbatim by all four
 * `if_type_effectiveness` sites in `AI_CV_HighCrit` below -- deterministic
 * (no `Random()` call inside `TypeCalc`/`ModulateDmgByType2`), so it is
 * computed once here and compared four times rather than re-run per site
 * (same simplification `factoryAiTryToFaint.ts`'s `isQuadrupleEffective`
 * already makes for its own single x4 check). Feeds a fixed
 * `AI_EFFECTIVENESS_x1` (40) baseline through the SAME STAB (`applyStab`)
 * + per-defending-type truncating multiply (`applyTypeEffectiveness`,
 * `ModulateDmgByType2`'s own shape) the real hit chain uses, then remaps
 * the 4 magic-number results a STAB'd double-type application produces
 * (120/240/30/15) back onto the four named `AI_EFFECTIVENESS_x*` constants
 * -- exactly `Cmd_if_type_effectiveness`'s own 4 `if` remaps. (Unlike
 * `factoryAiTryToFaint.ts`'s sibling probe, this one does NOT port
 * `TypeCalc`'s Levitate+Ground short-circuit: all 10 of `AI_CV_HighCrit`'s
 * real triggering moves -- `EFFECT_HIGH_CRITICAL`/`BLAZE_KICK`/
 * `POISON_TAIL`, doc §11.2 -- are Fighting/Grass/Water/Normal/Flying/Fire/
 * Poison typed, never Ground, so that branch is structurally unreachable
 * here and is left unported rather than carried as dead code.)
 */
function classifyHighCritEffectiveness(
  attackerTypes: readonly [string, string],
  moveType: string,
  targetTypes: readonly [string, string],
): number {
  const stabbed = applyStab(AI_EFFECTIVENESS_X1, attackerTypes, moveType);
  let value = applyTypeEffectiveness(stabbed, moveType, targetTypes, TYPE_EFFECTIVENESS).damage;
  if (value === 120) value = AI_EFFECTIVENESS_X2; // Super effective STAB.
  if (value === 240) value = AI_EFFECTIVENESS_X4;
  if (value === 30) value = AI_EFFECTIVENESS_X0_5; // Not very effective STAB.
  if (value === 15) value = AI_EFFECTIVENESS_X0_25;
  return value;
}

/**
 * `AI_CV_HighCrit` (`data/battle_ai_scripts.s:1449-1461`,
 * `docs/factory-ai-checkviability-ground-truth.md` §11.2):
 *
 * ```
 * AI_CV_HighCrit:
 *     if_type_effectiveness AI_EFFECTIVENESS_x0_25, AI_CV_HighCrit_End
 *     if_type_effectiveness AI_EFFECTIVENESS_x0_5, AI_CV_HighCrit_End
 *     if_type_effectiveness AI_EFFECTIVENESS_x2, AI_CV_HighCrit2
 *     if_type_effectiveness AI_EFFECTIVENESS_x4, AI_CV_HighCrit2
 *     if_random_less_than 128, AI_CV_HighCrit_End
 * AI_CV_HighCrit2:
 *     if_random_less_than 128, AI_CV_HighCrit_End
 *     score +1
 * AI_CV_HighCrit_End:
 *     end
 * ```
 *
 * Exactly 0.25x/0.5x: deterministic End, zero draws. Exactly 2x/4x: JUMPS
 * straight to `AI_CV_HighCrit2`, skipping the first roll -- exactly one
 * draw. Everything else (neutral 1x, immune 0x, or any other truncated
 * remainder, e.g. a STAB'd one-weak-one-resist wash) falls through
 * SEQUENTIALLY into the first `if_random_less_than 128` -- which, in the
 * real assembly, sits immediately before the `AI_CV_HighCrit2:` label, so
 * NOT jumping (roll >= 128) doesn't skip anything; execution falls straight
 * into `AI_CV_HighCrit2`'s OWN `if_random_less_than 128` immediately after.
 * This is a real, source-confirmed quirk: the neutral/immune/"other" path
 * burns ONE draw when the first roll is < 128 (jumps to End) but TWO when
 * it is >= 128 (continues into the second roll) -- not a fixed count,
 * unlike the deterministic and x2/x4 branches.
 */
function runCvHighCrit(input: Readonly<{
  rng: BattleRngState;
  attackerTypes: readonly [string, string];
  moveType: string;
  targetTypes: readonly [string, string];
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  const classified = classifyHighCritEffectiveness(input.attackerTypes, input.moveType, input.targetTypes);
  if (classified === AI_EFFECTIVENESS_X0_25 || classified === AI_EFFECTIVENESS_X0_5) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0 });
  }

  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const draws: FactoryAiCheckViabilityDraw[] = [];

  if (classified !== AI_EFFECTIVENESS_X2 && classified !== AI_EFFECTIVENESS_X4) {
    const fallthroughDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-fallthrough-roll`);
    rng = fallthroughDraw.after;
    ordinal += 1;
    const jumpedToEnd = fallthroughDraw.randomValue % 256 < 128;
    draws.push(Object.freeze({ ...fallthroughDraw, kind: "high-crit-fallthrough-roll" as const, jumpedToEnd }));
    if (jumpedToEnd) {
      return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: 0 });
    }
  }

  const roll = nextDraw(rng, ordinal, `${input.reasonPrefix}-roll`);
  rng = roll.after;
  const succeeded = roll.randomValue % 256 >= 128;
  draws.push(Object.freeze({ ...roll, kind: "high-crit-roll" as const, succeeded }));
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: succeeded ? 1 : 0 });
}

/**
 * `AI_CV_AlwaysHit` (`data/battle_ai_scripts.s:1075-1089`,
 * `docs/factory-ai-checkviability-ground-truth.md` §11.3/§12.1):
 *
 * ```
 * AI_CV_AlwaysHit:
 *     if_stat_level_more_than AI_TARGET, STAT_EVASION, 10, AI_CV_AlwaysHit_ScoreUp1
 *     if_stat_level_less_than AI_USER, STAT_ACC, 2, AI_CV_AlwaysHit_ScoreUp1
 *     if_stat_level_more_than AI_TARGET, STAT_EVASION, 8, AI_CV_AlwaysHit2
 *     if_stat_level_less_than AI_USER, STAT_ACC, 4, AI_CV_AlwaysHit2
 *     goto AI_CV_AlwaysHit_End
 *
 * AI_CV_AlwaysHit_ScoreUp1:
 *     score +1
 * AI_CV_AlwaysHit2:
 *     if_random_less_than 100, AI_CV_AlwaysHit_End
 *     score +1
 * AI_CV_AlwaysHit_End:
 *     end
 * ```
 *
 * `if_stat_level_more_than`/`if_stat_level_less_than`
 * (`battle_ai_script_commands.c:1683-1711`) compare `gBattleMons[battler]
 * .statStages[stat]` (stored 0-12, `DEFAULT_STAT_STAGE`=6 neutral) against a
 * literal threshold -- never true at battle start, needs a prior real
 * stat-changing move to land.
 *
 * Real finding beyond the doc's own §11.3 inline gloss (confirmed by direct
 * read of `Cmd_score`, `battle_ai_script_commands.c:703-711`: it only adds
 * to the score and advances the script pointer by a fixed 2 bytes, no jump
 * at all): `AI_CV_AlwaysHit_ScoreUp1`'s `score +1` does NOT terminate the
 * script -- there is no `goto` after it, so execution falls straight through
 * into the `AI_CV_AlwaysHit2:` label immediately below, i.e. INTO the same
 * `if_random_less_than 100` roll the second pair of gates reaches. So the
 * doc's own "§11.3 evasion stage 11-12 or user acc stage 0-1 -> deterministic
 * +1, 0 draws" comment undercounts this branch (its own recipe never
 * exercises it -- the reach fixture only ever hits evasion 9/10, the second
 * gate pair -- so this doesn't touch the doc's live §12.1 fixture evidence,
 * which is unaffected): reaching `ScoreUp1` still burns exactly one draw and
 * scores +1 (roll < 100, ~39%) or +2 (roll >= 100, ~61%), never a
 * zero-draw deterministic +1. Reaching `AI_CV_AlwaysHit2` directly (second
 * gate pair only) burns the same one draw and scores 0 or +1, matching the
 * doc's own §12.1 table exactly (the only branch its banked fixtures
 * exercise). Neither gate true: `goto End`, zero draws, zero score.
 */
function runCvAlwaysHit(input: Readonly<{
  rng: BattleRngState;
  targetEvasionStage: number;
  attackerAccStage: number;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  const reachesScoreUp1 = input.targetEvasionStage > 10 || input.attackerAccStage < 2;
  const reachesAlwaysHit2 = reachesScoreUp1
    || input.targetEvasionStage > 8
    || input.attackerAccStage < 4;
  if (!reachesAlwaysHit2) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0 });
  }

  const baseScore = reachesScoreUp1 ? 1 : 0;
  const draw = nextDraw(input.rng, input.drawOrdinalStart, `${input.reasonPrefix}-roll`);
  // if_random_less_than 100, AI_CV_AlwaysHit_End: the JUMP (roll < 100, ~39%)
  // skips the bonus; falling through (roll >= 100, ~61%) grants +1.
  const succeeded = draw.randomValue % 256 >= 100;
  return Object.freeze({
    rng: draw.after,
    draws: Object.freeze([Object.freeze({ ...draw, kind: "always-hit-roll" as const, succeeded })]),
    scoreDelta: baseScore + (succeeded ? 1 : 0),
  });
}

/**
 * `AI_CV_VitalThrow` (`data/battle_ai_scripts.s:1536-1546`,
 * `docs/factory-ai-checkviability-ground-truth.md` §13):
 *
 * ```
 * AI_CV_VitalThrow:
 *     if_target_faster AI_CV_VitalThrow_End
 *     if_hp_more_than AI_USER, 60, AI_CV_VitalThrow_End
 *     if_hp_less_than AI_USER, 40, AI_CV_VitalThrow2
 *     if_random_less_than 180, AI_CV_VitalThrow_End
 * AI_CV_VitalThrow2:
 *     if_random_less_than 50, AI_CV_VitalThrow_End
 *     score -1
 * AI_CV_VitalThrow_End:
 *     end
 * ```
 *
 * `if_target_faster` is the SAME macro/comparison `runCvSpeedDown` already
 * ports (`if_user_goes 1` -> `GetWhoStrikesFirst(AI_USER, AI_TARGET, TRUE)
 * === 1`), reused verbatim including its tie-break `Random()` burn -- but
 * with the OPPOSITE consequence. Doc §13.1's own correction of §11.4's
 * backwards prose: this jump lands on End (0 draws past any tie-break) when
 * the TARGET is strictly faster, so the rest of the handler is reachable
 * only when AI_USER (the attacker) is faster than or tied with the target.
 *
 * Past that gate, `if_hp_more_than`/`if_hp_less_than`
 * (`battle_ai_script_commands.c:713-741`) read AI_USER's OWN truncating
 * `100*hp/maxHp` -- never the target's. >60%: deterministic End, zero
 * draws (both HP checks use strict `>`/`<`, so exactly 60% itself does NOT
 * take this branch). <40%: skips straight to `AI_CV_VitalThrow2`'s own
 * roll, one draw. The remaining [40,60] band (both ends inclusive) burns
 * the `if_random_less_than 180` roll first: jump (roll<180, ~70.3%) to
 * End, one draw total; fall through (roll>=180, ~29.7%) into
 * `AI_CV_VitalThrow2`'s own roll immediately after -- no gap in the real
 * assembly, the same fallthrough shape `AI_CV_HighCrit`'s own neutral
 * cascade already established -- two draws total.
 *
 * `AI_CV_VitalThrow2`'s own `if_random_less_than 50`: jump (roll<50,
 * ~19.5%) to End, no score; fall through (roll>=50, ~80.5%) to `score -1`.
 * This polarity is read directly off `Cmd_if_random_less_than`'s own
 * jump-on-less-than semantics (`battle_ai_script_commands.c:663-671`, the
 * SAME opcode every other ported handler's roll already uses), not off
 * §11.4's own inline gloss, which states this roll's score/no-score
 * polarity backwards -- an unverified analytical claim (§11.4 was never
 * staged live); §13's own live fixtures assert draw counts and the chosen
 * move only, never the score sign, since all 4 dispatch slots are
 * identical `MOVE_VITAL_THROW` with no pick ambiguity (doc §13.3).
 */
function runCvVitalThrow(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;

  const attacker: TurnOrderBattler = { speed: input.attacker.speed, speedStage: input.attacker.speedStage, movePriority: 0 };
  const target: TurnOrderBattler = { speed: input.target.speed, speedStage: input.target.speedStage, movePriority: 0 };

  let tieRoll = 0;
  let tieDraw: ReturnType<typeof nextDraw> | null = null;
  if (effectiveSpeed(attacker) === effectiveSpeed(target)) {
    tieDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-target-faster-tie`);
    rng = tieDraw.after;
    tieRoll = tieDraw.randomValue;
    ordinal += 1;
  }
  const strikesFirst = getWhoStrikesFirst(attacker, target, tieRoll);
  if (tieDraw) {
    draws.push(Object.freeze({ ...tieDraw, kind: "target-faster-tie" as const, strikesFirst }));
  }
  if (strikesFirst === 1) {
    // Target strictly faster: goto End immediately, no HP check ever runs.
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: 0 });
  }

  const hpPercent = Math.floor((100 * input.attacker.hp) / input.attacker.maxHp);
  if (hpPercent > 60) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: 0 });
  }

  if (hpPercent >= 40) {
    // Only reached at HP% in [40, 60]: if_random_less_than 180.
    const midbandDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-midband-roll`);
    rng = midbandDraw.after;
    ordinal += 1;
    const jumpedToEnd = midbandDraw.randomValue % 256 < 180;
    draws.push(Object.freeze({ ...midbandDraw, kind: "vital-throw-midband-roll" as const, jumpedToEnd }));
    if (jumpedToEnd) {
      return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: 0 });
    }
  }

  const roll = nextDraw(rng, ordinal, `${input.reasonPrefix}-roll`);
  rng = roll.after;
  // if_random_less_than 50, AI_CV_VitalThrow_End: the JUMP (roll < 50, ~19.5%)
  // skips the penalty; falling through (roll >= 50, ~80.5%) scores -1.
  const succeeded = roll.randomValue % 256 >= 50;
  draws.push(Object.freeze({ ...roll, kind: "vital-throw-roll" as const, succeeded }));
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: succeeded ? -1 : 0 });
}

const AI_CV_ATTACK_DOWN_PHYSICAL_TYPES: ReadonlySet<string> = new Set([
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_GROUND", "TYPE_ROCK", "TYPE_BUG", "TYPE_STEEL",
]);

/**
 * `AI_CV_AttackDown` (`data/battle_ai_scripts.s:1090-1123`,
 * `docs/factory-ai-checkviability-ground-truth.md` §14.1):
 *
 * ```
 * AI_CV_AttackDown:
 *     if_stat_level_equal AI_TARGET, STAT_ATK, DEFAULT_STAT_STAGE, AI_CV_AttackDown3  ; Gate A
 *     score -1
 *     if_hp_more_than AI_USER, 90, AI_CV_AttackDown2                                  ; Gate B
 *     score -1
 * AI_CV_AttackDown2:
 *     if_stat_level_more_than AI_TARGET, STAT_ATK, 3, AI_CV_AttackDown3               ; Gate C
 *     if_random_less_than 50, AI_CV_AttackDown3                                       ; DRAW SITE 1
 *     score -2
 * AI_CV_AttackDown3:
 *     if_hp_more_than AI_TARGET, 70, AI_CV_AttackDown4                                ; Gate D
 *     score -2
 * AI_CV_AttackDown4:
 *     get_target_type1
 *     if_in_bytes AI_CV_AttackDown_PhysicalTypeList, AI_CV_AttackDown_End             ; Gate E
 *     get_target_type2
 *     if_in_bytes AI_CV_AttackDown_PhysicalTypeList, AI_CV_AttackDown_End             ; Gate F
 *     if_random_less_than 50, AI_CV_AttackDown_End                                    ; DRAW SITE 2
 *     score -2
 * AI_CV_AttackDown_End:
 *     end
 * ```
 *
 * Gate A (`if_stat_level_equal AI_TARGET, STAT_ATK, DEFAULT_STAT_STAGE`): a
 * fresh, never-lowered-or-raised ATK stage (6) skips straight to
 * `AI_CV_AttackDown3`, so Gate B/C/DRAW SITE 1 apply only once a real
 * stat-changing move has already landed on the target this battle. Gate B
 * (`if_hp_more_than AI_USER, 90`, the ATTACKER's OWN hp) and Gate D
 * (`if_hp_more_than AI_TARGET, 70`) are plain fallthroughs -- neither gates
 * reachability of anything past them, both always continue into the next
 * label regardless of which side of the `>` they land on. Gate C
 * (`if_stat_level_more_than AI_TARGET, STAT_ATK, 3`) guards DRAW SITE 1: only
 * stages 0-3 reach the roll (stage 6 already excluded by Gate A, so this
 * also silently excludes 7-12). Gates E/F (`get_target_type1`/`2` +
 * `if_in_bytes`) are the only state-independent, fully decisive gate: target
 * type1 OR type2 in the physical-type list (Normal/Fighting/Ground/Rock/
 * Bug/Steel -- Flying/Poison/Ghost conspicuously left out, source's own
 * comment) jumps straight to `End` with zero further draws, skipping DRAW
 * SITE 2 entirely. Both `get_target_type1`/`get_target_type2` are pure
 * `AI_THINKING_STRUCT->funcResult` reads (`Cmd_get_type`,
 * `battle_ai_script_commands.c:1115-1138`) -- no `Random()` call -- so this
 * port computes the combined type-list membership once rather than
 * simulating two separate zero-RNG opcode reads, same simplification
 * `classifyHighCritEffectiveness` above already makes for its own four
 * `if_type_effectiveness` sites. Both `if_random_less_than 50` roll sites
 * share the identical polarity every other ported handler's roll already
 * uses: JUMP (roll < 50, ~19.5%) skips the `-2`; falling through (roll >=
 * 50, ~80.5%) applies it. DRAW SITE 1 and DRAW SITE 2 are NOT mutually
 * exclusive -- a target whose ATK stage is already in [0,3] AND whose types
 * are both off the physical list can draw both in the same pass, up to a
 * worst-case -8 total (`-1,-1,-2,-2,-2`) across the whole handler.
 */
function runCvAttackDown(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  targetAtkStage: number;
  targetHp: number;
  targetMaxHp: number;
  targetTypes: readonly [string, string];
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  let score = 0;

  if (input.targetAtkStage !== DEFAULT_STAT_STAGE) {
    score -= 1;
    const attackerHpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
    if (attackerHpPercent <= 90) {
      score -= 1;
    }
    if (input.targetAtkStage <= 3) {
      const draw1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw1`);
      rng = draw1.after;
      ordinal += 1;
      const succeeded1 = draw1.randomValue % 256 >= 50;
      draws.push(Object.freeze({ ...draw1, kind: "attack-down-roll-1" as const, succeeded: succeeded1 }));
      if (succeeded1) score -= 2;
    }
  }

  const targetHpPercent = Math.floor((100 * input.targetHp) / input.targetMaxHp);
  if (targetHpPercent <= 70) {
    score -= 2;
  }

  // Gates E/F ALWAYS execute (AI_CV_AttackDown4 is reached unconditionally,
  // doc §27.1 handler 7, writes-ALWAYS) -- funcResultAfter doesn't depend on
  // any earlier gate/draw outcome above.
  const funcResultAfter = typeChainFuncResultAfter(input.targetTypes, AI_CV_ATTACK_DOWN_PHYSICAL_TYPES);
  const isPhysicalType = AI_CV_ATTACK_DOWN_PHYSICAL_TYPES.has(input.targetTypes[0])
    || AI_CV_ATTACK_DOWN_PHYSICAL_TYPES.has(input.targetTypes[1]);
  if (isPhysicalType) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
  }

  const draw2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw2`);
  rng = draw2.after;
  const succeeded2 = draw2.randomValue % 256 >= 50;
  draws.push(Object.freeze({ ...draw2, kind: "attack-down-roll-2" as const, succeeded: succeeded2 }));
  if (succeeded2) score -= 2;

  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
}

/**
 * Shared body for `AI_CV_DefenseDown` (`data/battle_ai_scripts.s:1124-1134`,
 * doc §15.1) and `AI_CV_SpDefDown` (`:1186-1196`, doc §16.1) -- byte-for-byte
 * the same shape with only the compared stat stage differing:
 *
 * ```
 * AI_CV_DefenseDown:
 *     if_hp_less_than AI_USER, 70, AI_CV_DefenseDown2                 ; Gate A (opponent's OWN hp)
 *     if_stat_level_more_than AI_TARGET, STAT_DEF, 3, AI_CV_DefenseDown3  ; Gate B (only reached if Gate A false)
 * AI_CV_DefenseDown2:
 *     if_random_less_than 50, AI_CV_DefenseDown3                       ; DRAW SITE
 *     score -2
 * AI_CV_DefenseDown3:
 *     if_hp_more_than AI_TARGET, 70, AI_CV_DefenseDown_End             ; Gate C (target's OWN hp)
 *     score -2
 * AI_CV_DefenseDown_End:
 *     end
 * ```
 *
 * Gate A (AI_USER's own hp < 70%): true jumps straight into the draw site,
 * bypassing Gate B entirely -- the cheap, unconditional-reachability path.
 * Gate B (only evaluated when Gate A is false; AI_TARGET's own stat stage >
 * 3): true skips the draw site entirely (0 draws); false falls straight
 * through into the SAME draw site Gate A would have jumped to. So the draw
 * site is reached whenever `hpPercent < 70 || statStage <= 3` -- the two
 * gates are not independent options, they're two different paths into one
 * shared roll. `if_random_less_than 50`: JUMP (roll < 50, ~19.5%) skips the
 * `-2`; falling through (roll >= 50, ~80.5%) applies it -- same polarity
 * every other ported handler's roll already uses. Gate C (AI_TARGET's own hp
 * > 70%) is a plain, always-reached fallthrough, orthogonal to the draw
 * site's own reachability: true skips its own `-2`, false applies it.
 */
function runCvStatDown(
  kind: "defense-down-roll" | "sp-def-down-roll" | "evasion-down-roll",
  input: Readonly<{
    rng: BattleRngState;
    attackerHp: number;
    attackerMaxHp: number;
    targetStatStage: number;
    targetHp: number;
    targetMaxHp: number;
    drawOrdinalStart: number;
    reasonPrefix: string;
  }>,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  let rng = input.rng;
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let score = 0;

  const attackerHpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
  const reachesDrawSite = attackerHpPercent < 70 || input.targetStatStage <= 3;
  if (reachesDrawSite) {
    const roll = nextDraw(rng, input.drawOrdinalStart, `${input.reasonPrefix}-roll`);
    rng = roll.after;
    const succeeded = roll.randomValue % 256 >= 50;
    draws.push(Object.freeze({ ...roll, kind, succeeded }));
    if (succeeded) score -= 2;
  }

  const targetHpPercent = Math.floor((100 * input.targetHp) / input.targetMaxHp);
  if (targetHpPercent <= 70) {
    score -= 2;
  }

  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
}

function runCvDefenseDown(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  targetDefStage: number;
  targetHp: number;
  targetMaxHp: number;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  return runCvStatDown("defense-down-roll", {
    rng: input.rng,
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    targetStatStage: input.targetDefStage,
    targetHp: input.targetHp,
    targetMaxHp: input.targetMaxHp,
    drawOrdinalStart: input.drawOrdinalStart,
    reasonPrefix: input.reasonPrefix,
  });
}

function runCvSpDefDown(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  targetSpDefStage: number;
  targetHp: number;
  targetMaxHp: number;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  return runCvStatDown("sp-def-down-roll", {
    rng: input.rng,
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    targetStatStage: input.targetSpDefStage,
    targetHp: input.targetHp,
    targetMaxHp: input.targetMaxHp,
    drawOrdinalStart: input.drawOrdinalStart,
    reasonPrefix: input.reasonPrefix,
  });
}

/**
 * `AI_CV_EvasionDown` (`data/battle_ai_scripts.s:1235-1246`, doc §24.1) --
 * confirmed byte-for-byte the same topology as `AI_CV_DefenseDown`/
 * `AI_CV_SpDefDown` above (`STAT_EVASION` swapped in, same `70`/`50`/`70`
 * thresholds and odds, same `score -2` on every non-skip branch) -- reuses
 * the identical shared `runCvStatDown` body rather than a parallel
 * implementation.
 */
function runCvEvasionDown(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  targetEvasionStage: number;
  targetHp: number;
  targetMaxHp: number;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  return runCvStatDown("evasion-down-roll", {
    rng: input.rng,
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    targetStatStage: input.targetEvasionStage,
    targetHp: input.targetHp,
    targetMaxHp: input.targetMaxHp,
    drawOrdinalStart: input.drawOrdinalStart,
    reasonPrefix: input.reasonPrefix,
  });
}

/**
 * `AI_CV_AttackUp` (`data/battle_ai_scripts.s:896-913`,
 * `docs/factory-ai-checkviability-ground-truth.md` §17.1):
 *
 * ```
 * AI_CV_AttackUp:
 *     if_stat_level_less_than AI_USER, STAT_ATK, 9, AI_CV_AttackUp2  ; Gate A
 *     if_random_less_than 100, AI_CV_AttackUp3                        ; DRAW SITE 1
 *     score -1
 *     goto AI_CV_AttackUp3
 *
 * AI_CV_AttackUp2:
 *     if_hp_not_equal AI_USER, 100, AI_CV_AttackUp3                   ; Gate B
 *     if_random_less_than 128, AI_CV_AttackUp3                        ; DRAW SITE 2
 *     score +2
 * AI_CV_AttackUp3:
 *     if_hp_more_than AI_USER, 70, AI_CV_AttackUp_End                 ; Gate C
 *     if_hp_less_than AI_USER, 40, AI_CV_AttackUp_ScoreDown2           ; Gate D
 *     if_random_less_than 40, AI_CV_AttackUp_End                       ; DRAW SITE 3
 * AI_CV_AttackUp_ScoreDown2:
 *     score -2
 * AI_CV_AttackUp_End:
 *     end
 * ```
 *
 * A structural break from every handler above: every gate/draw site reads
 * `AI_USER`'s OWN state (its own ATK stage, its own HP) -- `AI_TARGET` is
 * never read anywhere in this body (the mechanical consequence of a
 * self-targeted effect). Gate A (own ATK stage < 9) skips DRAW SITE 1 --
 * only reachable once a prior real stat-up move has already raised the
 * stage to 9-11 (stage 12 is excluded earlier, by `AI_CBM_AttackUp`'s own
 * MAX_STAT_STAGE gate). Gate B (own HP != 100%, an EQUALITY test, not a
 * threshold band) skips DRAW SITE 2 -- only reachable while still exactly
 * full HP. Gate A and Gate B gate mutually exclusive branches (only one of
 * DRAW SITE 1/2 can ever fire per call), but only the Gate-A/DRAW-SITE-1
 * path can ADDITIONALLY reach DRAW SITE 3 afterwards: Gate B's own
 * precondition (HP == 100% exactly) makes Gate C (own HP > 70%) always true
 * immediately afterward, a clean stop -- so a DRAW SITE 2 call can never
 * also reach DRAW SITE 3, while a DRAW SITE 1 call can, if HP separately
 * lands in [40,70). Past `AttackUp3`: Gate C (own HP > 70%) is a clean
 * stop; Gate D (own HP < 40%) skips DRAW SITE 3 straight to the -2 penalty;
 * the [40,70) band burns DRAW SITE 3 (roll < 40, ~15.6%, skips the penalty;
 * roll >= 40, ~84.4%, applies it) -- same JUMP-skips/FALLTHROUGH-applies
 * roll polarity every other ported handler's `if_random_less_than` already
 * uses.
 *
 * Shared with `AI_CV_SpAtkUp` (`:967-983`, doc §21.1) below, which is
 * byte-for-byte this same gate topology with `STAT_SPATK` for `STAT_ATK`
 * and ONE numeric difference: DRAW SITE 3's threshold is `70`, not `40`
 * (doc §21.1's own citation-level correction against a naive "same shape"
 * copy) -- `runCvAttackStyleStatUp` below factors the shared body out,
 * parameterized by that one threshold and the draw-kind labels.
 */
function runCvAttackStyleStatUp(
  kinds: Readonly<{
    roll1: "attack-up-roll-1" | "sp-atk-up-roll-1";
    roll2: "attack-up-roll-2" | "sp-atk-up-roll-2";
    roll3: "attack-up-roll-3" | "sp-atk-up-roll-3";
  }>,
  drawSite3Threshold: number,
  input: Readonly<{
    rng: BattleRngState;
    attackerStage: number;
    attackerHp: number;
    attackerMaxHp: number;
    drawOrdinalStart: number;
    reasonPrefix: string;
  }>,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let score = 0;

  const hpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);

  if (input.attackerStage < 9) {
    // Gate B (own HP != 100%) skips DRAW SITE 2 straight to the tail.
    if (hpPercent === 100) {
      const draw2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw2`);
      rng = draw2.after;
      ordinal += 1;
      const succeeded2 = draw2.randomValue % 256 >= 128;
      draws.push(Object.freeze({ ...draw2, kind: kinds.roll2, succeeded: succeeded2 }));
      if (succeeded2) score += 2;
    }
  } else {
    // DRAW SITE 1: if_random_less_than 100 (jump skips -1; fall through applies it, then goto the tail either way).
    const draw1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw1`);
    rng = draw1.after;
    ordinal += 1;
    const succeeded1 = draw1.randomValue % 256 >= 100;
    draws.push(Object.freeze({ ...draw1, kind: kinds.roll1, succeeded: succeeded1 }));
    if (succeeded1) score -= 1;
  }

  // Gate C (own HP > 70%) is a clean, deterministic stop.
  if (hpPercent > 70) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
  }
  // Gate D (own HP < 40%) skips DRAW SITE 3 straight to the -2 penalty.
  if (hpPercent < 40) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2 });
  }
  // DRAW SITE 3, only reached at HP in [40,70).
  const draw3 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw3`);
  rng = draw3.after;
  const succeeded3 = draw3.randomValue % 256 >= drawSite3Threshold;
  draws.push(Object.freeze({ ...draw3, kind: kinds.roll3, succeeded: succeeded3 }));
  if (succeeded3) score -= 2;
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
}

function runCvAttackUp(input: Readonly<{
  rng: BattleRngState;
  attackerAtkStage: number;
  attackerHp: number;
  attackerMaxHp: number;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  return runCvAttackStyleStatUp(
    { roll1: "attack-up-roll-1", roll2: "attack-up-roll-2", roll3: "attack-up-roll-3" },
    40,
    {
      rng: input.rng,
      attackerStage: input.attackerAtkStage,
      attackerHp: input.attackerHp,
      attackerMaxHp: input.attackerMaxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    },
  );
}

/**
 * `AI_CV_SpAtkUp` (`data/battle_ai_scripts.s:967-983`,
 * `docs/factory-ai-checkviability-ground-truth.md` §21.1) --
 * `runCvAttackStyleStatUp`'s shared body above, reading `AI_USER`'s own
 * SPATK stage instead of ATK, with DRAW SITE 3's threshold corrected to
 * `70` (`:980`, ~27.3% skip) instead of `AttackUp`'s own `40` (~15.6% skip)
 * -- the doc's own §21.1 citation, re-derived from the raw immediate operand
 * rather than assumed from gate-topology similarity alone.
 */
function runCvSpAtkUp(input: Readonly<{
  rng: BattleRngState;
  attackerSpAtkStage: number;
  attackerHp: number;
  attackerMaxHp: number;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  return runCvAttackStyleStatUp(
    { roll1: "sp-atk-up-roll-1", roll2: "sp-atk-up-roll-2", roll3: "sp-atk-up-roll-3" },
    70,
    {
      rng: input.rng,
      attackerStage: input.attackerSpAtkStage,
      attackerHp: input.attackerHp,
      attackerMaxHp: input.attackerMaxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    },
  );
}

const MOVE_NONE = 0;

/** `AI_CV_DefenseUp_PhysicalTypes` (`data/battle_ai_scripts.s:944-954`) -- a
 * DIFFERENT, larger list than `AI_CV_AttackDown`'s own physical-type list
 * (doc §14.1): this one additionally includes Poison, Flying, and Ghost. */
const AI_CV_DEFENSE_UP_PHYSICAL_TYPES: ReadonlySet<string> = new Set([
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_POISON", "TYPE_GROUND", "TYPE_FLYING",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL",
]);

/**
 * `AI_CV_DefenseUp` (`data/battle_ai_scripts.s:915-942`,
 * `docs/factory-ai-checkviability-ground-truth.md` §18.1):
 *
 * ```
 * AI_CV_DefenseUp:
 *     if_stat_level_less_than AI_USER, STAT_DEF, 9, AI_CV_DefenseUp2   ; Gate A
 *     if_random_less_than 100, AI_CV_DefenseUp3                        ; DRAW SITE 1
 *     score -1
 *     goto AI_CV_DefenseUp3
 *
 * AI_CV_DefenseUp2:
 *     if_hp_not_equal AI_USER, 100, AI_CV_DefenseUp3                   ; Gate B
 *     if_random_less_than 128, AI_CV_DefenseUp3                        ; DRAW SITE 2
 *     score +2
 * AI_CV_DefenseUp3:
 *     if_hp_less_than AI_USER, 70, AI_CV_DefenseUp4                    ; Gate C (INVERTED vs AttackUp)
 *     if_random_less_than 200, AI_CV_DefenseUp_End                     ; DRAW SITE 3
 * AI_CV_DefenseUp4:
 *     if_hp_less_than AI_USER, 40, AI_CV_DefenseUp_ScoreDown2          ; Gate D
 *     get_last_used_bank_move AI_TARGET                                ; Gate E setup -- TARGET's last move
 *     get_move_power_from_result
 *     if_equal 0, AI_CV_DefenseUp5                                     ; Gate E (last move power == 0)
 *     get_last_used_bank_move AI_TARGET
 *     get_move_type_from_result
 *     if_not_in_bytes AI_CV_DefenseUp_PhysicalTypes, AI_CV_DefenseUp_ScoreDown2  ; Gate F
 *     if_random_less_than 60, AI_CV_DefenseUp_End                      ; DRAW SITE 4
 * AI_CV_DefenseUp5:
 *     if_random_less_than 60, AI_CV_DefenseUp_End                      ; DRAW SITE 5
 * AI_CV_DefenseUp_ScoreDown2:
 *     score -2
 * AI_CV_DefenseUp_End:
 *     end
 * ```
 *
 * Gates A/B/DRAW SITE 1/2 are byte-for-byte `AttackUp`'s own shape with
 * `STAT_DEF` swapped for `STAT_ATK` (doc §18.1 -- not re-derived here).
 * **Gate C is INVERTED vs `AttackUp`'s own**: own HP < 70% jumps straight
 * into `DefenseUp4` (skipping DRAW SITE 3 entirely); HP >= 70% instead
 * reaches DRAW SITE 3 first, whose own *failure* (roll < 200, ~78.1%, jumps
 * to End) is the only way to stop there -- its success (roll >= 200,
 * ~21.9%) falls through into `DefenseUp4` anyway, same as a direct Gate C
 * jump. So HP == 100% (this doc's usual "clean stop" shape for every other
 * handler) instead guarantees an EXTRA draw here, with a chance to still
 * continue. Gate D (own HP < 40%) skips straight to the `-2` penalty, same
 * shape as `AttackUp`'s own. Gates E/F read the TARGET's (not `AI_USER`'s)
 * last-used move: power == 0 (true for both a genuine 0-power last move AND
 * the untouched `MOVE_NONE` battle-start default, doc §18.2 -- indistinguishable
 * by this branch) skips straight to `DefenseUp5`'s own roll; power != 0 AND
 * type in the (larger, 9-type) `AI_CV_DefenseUp_PhysicalTypes` list reaches
 * DRAW SITE 4; power != 0 and NOT in the list jumps straight to the `-2`
 * penalty, skipping both remaining draw sites. **DRAW SITE 4 and DRAW SITE 5
 * are NOT mutually exclusive** -- `docs/factory-ai-draw-discrepancy-probe.md`
 * §4 confirms, via raw ROM byte disassembly and live single-step
 * instrumentation, that DRAW SITE 4's own failure path (roll >= 60) is
 * literally DRAW SITE 5's own instruction address (`AI_CV_DefenseUp4`'s +6
 * bytes == `AI_CV_DefenseUp5`'s own label, no gate between them) -- reaching
 * DRAW SITE 4 at all means either 1 draw (roll < 60, ~23.4%, stops with no
 * penalty) or 2 draws (roll >= 60, ~76.6%, falls through into DRAW SITE 5's
 * own `if_random_less_than 60` roll, which only THEN decides the `-2`: stops
 * with no penalty on its own roll < 60, ~23.4%, or applies `-2` on roll >=
 * 60, ~76.6%). Net probability of the `-2` penalty given DRAW SITE 4 is
 * reached at all: `(196/256)^2 ~= 58.65%`, not the naive single-roll 76.6%.
 * Gate E's own direct jump into `DefenseUp5` is a SEPARATE, single-draw path
 * to the identical site -- the two entry paths share the site's kind label
 * (`"defense-up-roll-5"`) because they are the same physical assembly
 * instruction, not because they are the same logical event.
 */
/**
 * `AI_CV_DefenseUp`/`AI_CV_SpDefUp`'s shared Gates E/F write value (doc
 * §27.1 handlers 11/15, writes-conditionally): `get_last_used_bank_move
 * AI_TARGET` + `get_move_power_from_result` always write when reached
 * (Gate D passed) -- if that power is exactly 0, no further write occurs
 * (`AI_CV_*5`'s own `if_random_less_than` doesn't write), so the exit value
 * IS literally 0 (== `AI_WEATHER_SUN`). If nonzero, a second
 * `get_last_used_bank_move` + `get_move_type_from_result` always overwrites
 * with the move's own TYPE id next -- collision-mapped -- and nothing
 * further writes afterward regardless of the physical-type-list branch
 * either handler takes from there.
 */
function statUpLastMoveFuncResultAfter(lastMove: { power: number; type: string }): AiWeatherValue | undefined {
  if (lastMove.power === 0) return AI_WEATHER_SUN;
  return typeFuncResultCollision(lastMove.type);
}

function runCvDefenseUp(input: Readonly<{
  rng: BattleRngState;
  attackerDefStage: number;
  attackerHp: number;
  attackerMaxHp: number;
  targetLastUsedMoveId: number;
  funcResultCarry: AiWeatherValue | undefined;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let score = 0;

  const hpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);

  if (input.attackerDefStage < 9) {
    // DefenseUp2: Gate B (own HP != 100%) skips DRAW SITE 2 straight to DefenseUp3.
    if (hpPercent === 100) {
      const draw2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw2`);
      rng = draw2.after;
      ordinal += 1;
      const succeeded2 = draw2.randomValue % 256 >= 128;
      draws.push(Object.freeze({ ...draw2, kind: "defense-up-roll-2" as const, succeeded: succeeded2 }));
      if (succeeded2) score += 2;
    }
  } else {
    // DRAW SITE 1: if_random_less_than 100, DefenseUp3 (jump skips -1; fall through applies it, then goto DefenseUp3 either way).
    const draw1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw1`);
    rng = draw1.after;
    ordinal += 1;
    const succeeded1 = draw1.randomValue % 256 >= 100;
    draws.push(Object.freeze({ ...draw1, kind: "defense-up-roll-1" as const, succeeded: succeeded1 }));
    if (succeeded1) score -= 1;
  }

  // DefenseUp3: Gate C, INVERTED vs AttackUp -- own HP < 70% jumps straight into DefenseUp4.
  if (hpPercent >= 70) {
    const draw3 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw3`);
    rng = draw3.after;
    ordinal += 1;
    // if_random_less_than 200, End: JUMP (roll<200, ~78.1%) stops; fall through (roll>=200, ~21.9%) continues to DefenseUp4.
    const fellThrough = draw3.randomValue % 256 >= 200;
    draws.push(Object.freeze({ ...draw3, kind: "defense-up-roll-3" as const, succeeded: fellThrough }));
    if (!fellThrough) {
      // Never reaches Gate D -- no write at all this dispatch (doc §27.1).
      return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter: input.funcResultCarry });
    }
  }

  // DefenseUp4: Gate D -- own HP < 40% skips straight to the -2 penalty, no write.
  if (hpPercent < 40) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2, funcResultAfter: input.funcResultCarry });
  }

  // Gates E/F: the TARGET's own last-used move power/type -- ALWAYS written from here on.
  const lastMove = MOVES_BY_ID.get(input.targetLastUsedMoveId);
  if (!lastMove) {
    throw new Error(`factory-ai-check-viability: unknown last-used move ${input.targetLastUsedMoveId}`);
  }
  const funcResultAfter = statUpLastMoveFuncResultAfter(lastMove);

  if (lastMove.power === 0) {
    // DefenseUp5, DRAW SITE 5.
    const draw5 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw5`);
    rng = draw5.after;
    const succeeded5 = draw5.randomValue % 256 >= 60;
    draws.push(Object.freeze({ ...draw5, kind: "defense-up-roll-5" as const, succeeded: succeeded5 }));
    if (succeeded5) score -= 2;
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
  }

  if (!AI_CV_DEFENSE_UP_PHYSICAL_TYPES.has(lastMove.type)) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2, funcResultAfter });
  }

  // DRAW SITE 4: if_random_less_than 60, End (roll<60, ~23.4%, stops here).
  // Its own failure (roll>=60, ~76.6%) does NOT apply the penalty directly --
  // there is no gate between them (data/battle_ai_scripts.s:936-938), so
  // execution falls straight through into DRAW SITE 5's own instruction
  // immediately below (the SAME site the Gate E jump above reaches
  // directly). Only a second failed roll applies the -2 penalty.
  const draw4 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw4`);
  rng = draw4.after;
  ordinal += 1;
  const succeeded4 = draw4.randomValue % 256 >= 60;
  draws.push(Object.freeze({ ...draw4, kind: "defense-up-roll-4" as const, succeeded: succeeded4 }));
  if (!succeeded4) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
  }

  // DRAW SITE 5, reached here via DRAW SITE 4's own fall-through.
  const draw5 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw5`);
  rng = draw5.after;
  const succeeded5 = draw5.randomValue % 256 >= 60;
  draws.push(Object.freeze({ ...draw5, kind: "defense-up-roll-5" as const, succeeded: succeeded5 }));
  if (succeeded5) score -= 2;
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
}

/**
 * `AI_CV_SpDefUp` (`data/battle_ai_scripts.s:986-1013`,
 * `docs/factory-ai-checkviability-ground-truth.md` §22.1) -- the single
 * shared CV target for `EFFECT_SPECIAL_DEFENSE_UP(_2)`/`EFFECT_COSMIC_POWER`/
 * `EFFECT_CALM_MIND` (`:663,692,770,774`):
 *
 * ```
 * AI_CV_SpDefUp:
 *     if_stat_level_less_than AI_USER, STAT_SPDEF, 9, AI_CV_SpDefUp2   ; Gate A
 *     if_random_less_than 100, AI_CV_SpDefUp3                          ; DRAW SITE 1
 *     score -1
 *     goto AI_CV_SpDefUp3
 *
 * AI_CV_SpDefUp2:
 *     if_hp_not_equal AI_USER, 100, AI_CV_SpDefUp3                     ; Gate B
 *     if_random_less_than 128, AI_CV_SpDefUp3                          ; DRAW SITE 2
 *     score +2
 * AI_CV_SpDefUp3:
 *     if_hp_less_than AI_USER, 70, AI_CV_SpDefUp4                      ; Gate C (same direction as DefenseUp)
 *     if_random_less_than 200, AI_CV_SpDefUp_End                       ; DRAW SITE 3
 * AI_CV_SpDefUp4:
 *     if_hp_less_than AI_USER, 40, AI_CV_SpDefUp_ScoreDown2            ; Gate D
 *     get_last_used_bank_move AI_TARGET                                 ; Gate E setup -- TARGET's last move
 *     get_move_power_from_result
 *     if_equal 0, AI_CV_SpDefUp5                                       ; Gate E (last move power == 0)
 *     get_last_used_bank_move AI_TARGET
 *     get_move_type_from_result
 *     if_in_bytes AI_CV_SpDefUp_PhysicalTypes, AI_CV_SpDefUp_ScoreDown2  ; Gate F -- INVERTED vs DefenseUp
 *     if_random_less_than 60, AI_CV_SpDefUp_End                        ; DRAW SITE 4
 * AI_CV_SpDefUp5:
 *     if_random_less_than 60, AI_CV_SpDefUp_End                        ; DRAW SITE 5
 * AI_CV_SpDefUp_ScoreDown2:
 *     score -2
 * AI_CV_SpDefUp_End:
 *     end
 * ```
 *
 * Gates A/B/C/D and DRAW SITE 1/2/3's odds are byte-for-byte `AI_CV_
 * DefenseUp`'s own shape (`STAT_DEF` -> `STAT_SPDEF` in Gates A/B only,
 * doc §22.1 -- re-verified against the raw assembly, not assumed). **Gate F
 * is the one real structural break: its `if_in_bytes` is the OPPOSITE
 * polarity of `DefenseUp`'s own `if_not_in_bytes`** -- the target's last
 * move type BEING in the (identical, byte-for-byte `AI_CV_DefenseUp_
 * PhysicalTypes`) physical-types list now routes straight to `ScoreDown2`,
 * and NOT being in the list is what falls through to DRAW SITE 4 -- the
 * correct in-universe semantics for Special Defense (which does NOT
 * mitigate physical damage, so a physical last move means the SPDEF raise
 * wasn't useful -- penalize), the mirror image of Defense's own reasoning.
 * Reuses `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` directly rather than duplicating
 * an identical byte list under a second name -- `AI_CV_SpDefUp_PhysicalTypes`
 * (`:1015-1025`) is a distinct assembly symbol at a different address, but
 * doc §22.1 confirms its 9-type contents are byte-for-byte identical.
 * DRAW SITE 4 and DRAW SITE 5 share `AI_CV_DefenseUp`'s own chained (NOT
 * mutually exclusive) shape byte-for-byte -- see `runCvDefenseUp`'s own doc
 * comment above and `docs/factory-ai-draw-discrepancy-probe.md` §4: DRAW
 * SITE 4's own failure (roll >= 60) falls straight through into DRAW SITE
 * 5's own roll, which alone decides the `-2` (net ~58.65%, not a naive
 * single-roll ~76.6%).
 */
function runCvSpDefUp(input: Readonly<{
  rng: BattleRngState;
  attackerSpDefStage: number;
  attackerHp: number;
  attackerMaxHp: number;
  targetLastUsedMoveId: number;
  funcResultCarry: AiWeatherValue | undefined;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let score = 0;

  const hpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);

  if (input.attackerSpDefStage < 9) {
    // SpDefUp2: Gate B (own HP != 100%) skips DRAW SITE 2 straight to SpDefUp3.
    if (hpPercent === 100) {
      const draw2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw2`);
      rng = draw2.after;
      ordinal += 1;
      const succeeded2 = draw2.randomValue % 256 >= 128;
      draws.push(Object.freeze({ ...draw2, kind: "sp-def-up-roll-2" as const, succeeded: succeeded2 }));
      if (succeeded2) score += 2;
    }
  } else {
    // DRAW SITE 1: if_random_less_than 100, SpDefUp3 (jump skips -1; fall through applies it, then goto SpDefUp3 either way).
    const draw1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw1`);
    rng = draw1.after;
    ordinal += 1;
    const succeeded1 = draw1.randomValue % 256 >= 100;
    draws.push(Object.freeze({ ...draw1, kind: "sp-def-up-roll-1" as const, succeeded: succeeded1 }));
    if (succeeded1) score -= 1;
  }

  // SpDefUp3: Gate C, same direction as DefenseUp -- own HP < 70% jumps straight into SpDefUp4.
  if (hpPercent >= 70) {
    const draw3 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw3`);
    rng = draw3.after;
    ordinal += 1;
    const fellThrough = draw3.randomValue % 256 >= 200;
    draws.push(Object.freeze({ ...draw3, kind: "sp-def-up-roll-3" as const, succeeded: fellThrough }));
    if (!fellThrough) {
      return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter: input.funcResultCarry });
    }
  }

  // SpDefUp4: Gate D -- own HP < 40% skips straight to the -2 penalty, no write.
  if (hpPercent < 40) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2, funcResultAfter: input.funcResultCarry });
  }

  // Gates E/F: the TARGET's own last-used move power/type -- ALWAYS written from here on.
  const lastMove = MOVES_BY_ID.get(input.targetLastUsedMoveId);
  if (!lastMove) {
    throw new Error(`factory-ai-check-viability: unknown last-used move ${input.targetLastUsedMoveId}`);
  }
  const funcResultAfter = statUpLastMoveFuncResultAfter(lastMove);

  if (lastMove.power === 0) {
    // SpDefUp5, DRAW SITE 5.
    const draw5 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw5`);
    rng = draw5.after;
    const succeeded5 = draw5.randomValue % 256 >= 60;
    draws.push(Object.freeze({ ...draw5, kind: "sp-def-up-roll-5" as const, succeeded: succeeded5 }));
    if (succeeded5) score -= 2;
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
  }

  // Gate F, INVERTED vs DefenseUp: type IS in the physical list -> straight to ScoreDown2.
  if (AI_CV_DEFENSE_UP_PHYSICAL_TYPES.has(lastMove.type)) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2, funcResultAfter });
  }

  // DRAW SITE 4 (reached when NOT in the physical list): if_random_less_than
  // 60, End (roll<60, ~23.4%, stops here). Its own failure (roll>=60,
  // ~76.6%) falls straight through into DRAW SITE 5's own instruction
  // immediately below (same site the Gate E jump above reaches directly) --
  // only a second failed roll applies the -2 penalty.
  const draw4 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw4`);
  rng = draw4.after;
  ordinal += 1;
  const succeeded4 = draw4.randomValue % 256 >= 60;
  draws.push(Object.freeze({ ...draw4, kind: "sp-def-up-roll-4" as const, succeeded: succeeded4 }));
  if (!succeeded4) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
  }

  // DRAW SITE 5, reached here via DRAW SITE 4's own fall-through.
  const draw5 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw5`);
  rng = draw5.after;
  const succeeded5 = draw5.randomValue % 256 >= 60;
  draws.push(Object.freeze({ ...draw5, kind: "sp-def-up-roll-5" as const, succeeded: succeeded5 }));
  if (succeeded5) score -= 2;
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score, funcResultAfter });
}

const AI_CV_LIGHT_SCREEN_SPECIAL_TYPES: ReadonlySet<string> = new Set([
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC", "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
]);

const AI_CV_REFLECT_PHYSICAL_TYPES: ReadonlySet<string> = new Set([
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND", "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL",
]);

/**
 * Shared body for `AI_CV_LightScreen` (`data/battle_ai_scripts.s:1373-1382`,
 * doc §23.1) and `AI_CV_Reflect` (`:1492-1501`, doc §23.1) -- byte-for-byte
 * the same shape, differing only in which type list is checked:
 *
 * ```
 * AI_CV_LightScreen:
 *     if_hp_less_than AI_USER, 50, AI_CV_LightScreen_ScoreDown2        ; Gate A (opponent's OWN hp)
 *     get_target_type1
 *     if_in_bytes AI_CV_LightScreen_SpecialTypeList, AI_CV_LightScreen_End ; Gate B (target's type1)
 *     get_target_type2
 *     if_in_bytes AI_CV_LightScreen_SpecialTypeList, AI_CV_LightScreen_End ; Gate C (target's type2)
 *     if_random_less_than 50, AI_CV_LightScreen_End                    ; DRAW SITE
 * AI_CV_LightScreen_ScoreDown2:
 *     score -2
 * AI_CV_LightScreen_End:
 *     end
 * ```
 *
 * Gate A (AI_USER's own hp < 50%) jumps straight to the -2 penalty, zero
 * draws -- the opponent's own HP is never staged in this doc's own §23.2
 * fixtures (no damage occurs at all), so this gate is unstaged live, doc
 * §23.5 item 4. Falling through, Gates B/C (`get_target_type1`/`2` +
 * `if_in_bytes`) are zero-RNG `AI_THINKING_STRUCT->funcResult` reads -- this
 * port computes the combined type-list membership once, same simplification
 * `runCvAttackDown`'s own Gates E/F already make. Type IN the list jumps to
 * `End` (score 0, zero draws); type NOT in the list falls through to the
 * single DRAW SITE: `if_random_less_than 50` jump (roll < 50, ~19.5%) skips
 * the `-2`; falling through (roll >= 50, ~80.5%) applies it -- the same
 * polarity every other ported handler's roll already uses.
 */
function runCvSideScreenTypeGate(
  kind: "light-screen-roll" | "reflect-roll",
  typeList: ReadonlySet<string>,
  input: Readonly<{
    rng: BattleRngState;
    attackerHp: number;
    attackerMaxHp: number;
    targetTypes: readonly [string, string];
    funcResultCarry: AiWeatherValue | undefined;
    drawOrdinalStart: number;
    reasonPrefix: string;
  }>,
): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  const hpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
  if (hpPercent < 50) {
    // ScoreDown2 short-circuit, no get_type call at all -- no write.
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: -2, funcResultAfter: input.funcResultCarry });
  }

  // get_target_type1 (always reached from here) -> if_in_bytes; else
  // get_target_type2 -> if_in_bytes; either way the last type read is the
  // exit value (same shared shape as AI_CV_AttackDown's own Gates E/F).
  const funcResultAfter = typeChainFuncResultAfter(input.targetTypes, typeList);
  const isListedType = typeList.has(input.targetTypes[0]) || typeList.has(input.targetTypes[1]);
  if (isListedType) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0, funcResultAfter });
  }

  const roll = nextDraw(input.rng, input.drawOrdinalStart, `${input.reasonPrefix}-roll`);
  const succeeded = roll.randomValue % 256 >= 50;
  const draws: FactoryAiCheckViabilityDraw[] = [Object.freeze({ ...roll, kind, succeeded })];
  return Object.freeze({ rng: roll.after, draws: Object.freeze(draws), scoreDelta: succeeded ? -2 : 0, funcResultAfter });
}

function runCvLightScreen(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  targetTypes: readonly [string, string];
  funcResultCarry: AiWeatherValue | undefined;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  return runCvSideScreenTypeGate("light-screen-roll", AI_CV_LIGHT_SCREEN_SPECIAL_TYPES, input);
}

/**
 * `AI_CV_Reflect` (`:1492-1501`, doc §23.1) -- `runCvSideScreenTypeGate`'s
 * shared body with `AI_CV_Reflect_PhysicalTypeList` (`:1504-1514`), a
 * genuinely distinct 9-type list from `AI_CV_AttackDown_PhysicalTypeList`/
 * `AI_CV_DEFENSE_UP_PHYSICAL_TYPES` above (those exclude Flying/Poison/Ghost;
 * this one includes them, doc §23.1) -- not reused, kept as its own named
 * constant.
 */
function runCvReflect(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  targetTypes: readonly [string, string];
  funcResultCarry: AiWeatherValue | undefined;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  return runCvSideScreenTypeGate("reflect-roll", AI_CV_REFLECT_PHYSICAL_TYPES, input);
}

/**
 * `AI_CV_AccuracyDown` (`data/battle_ai_scripts.s:1198-1234`,
 * `docs/factory-ai-checkviability-ground-truth.md` §19.1) -- the largest
 * ported `AI_CV_*` handler in this doc, 7 `if_random_less_than` sites:
 *
 * ```
 * AI_CV_AccuracyDown:
 *     if_hp_less_than AI_USER, 70, AI_CV_AccuracyDown2       ; Gate A (opponent's OWN hp)
 *     if_hp_more_than AI_TARGET, 70, AI_CV_AccuracyDown3     ; Gate B (target's hp)
 * AI_CV_AccuracyDown2:
 *     if_random_less_than 100, AI_CV_AccuracyDown3           ; DRAW SITE 1
 *     score -1
 * AI_CV_AccuracyDown3:
 *     if_stat_level_more_than AI_USER, STAT_ACC, 4, AI_CV_AccuracyDown4  ; Gate C (opponent's OWN acc stage)
 *     if_random_less_than 80, AI_CV_AccuracyDown4            ; DRAW SITE 2
 *     score -2
 * AI_CV_AccuracyDown4:
 *     if_not_status AI_TARGET, STATUS1_TOXIC_POISON, AI_CV_AccuracyDown5  ; Gate D
 *     if_random_less_than 70, AI_CV_AccuracyDown5             ; DRAW SITE 3
 *     score +2
 * AI_CV_AccuracyDown5:
 *     if_not_status3 AI_TARGET, STATUS3_LEECHSEED, AI_CV_AccuracyDown6    ; Gate E
 *     if_random_less_than 70, AI_CV_AccuracyDown6              ; DRAW SITE 4
 *     score +2
 * AI_CV_AccuracyDown6:
 *     if_not_status3 AI_USER, STATUS3_ROOTED, AI_CV_AccuracyDown7         ; Gate F (opponent's own Ingrain flag)
 *     if_random_less_than 128, AI_CV_AccuracyDown7             ; DRAW SITE 5
 *     score +1
 * AI_CV_AccuracyDown7:
 *     if_not_status2 AI_TARGET, STATUS2_CURSED, AI_CV_AccuracyDown8       ; Gate G
 *     if_random_less_than 70, AI_CV_AccuracyDown8               ; DRAW SITE 6
 *     score +2
 * AI_CV_AccuracyDown8:
 *     if_hp_more_than AI_USER, 70, AI_CV_AccuracyDown_End       ; Gate H (opponent's OWN hp again)
 *     if_stat_level_equal AI_TARGET, STAT_ACC, DEFAULT_STAT_STAGE, AI_CV_AccuracyDown_End  ; Gate I (target's OWN acc stage)
 *     if_hp_less_than AI_USER, 40, AI_CV_AccuracyDown_ScoreDown2   ; Gate J
 *     if_hp_less_than AI_TARGET, 40, AI_CV_AccuracyDown_ScoreDown2 ; Gate K
 *     if_random_less_than 70, AI_CV_AccuracyDown_End             ; DRAW SITE 7
 * AI_CV_AccuracyDown_ScoreDown2:
 *     score -2
 * AI_CV_AccuracyDown_End:
 *     end
 * ```
 *
 * Gates A-G form one straight-line sequential body: unlike `AttackDown`'s
 * mutually-exclusive branch pairs or `DefenseUp`'s early-stopping Gate C,
 * NONE of `score -1`/`-2`/`+2`/`+2`/`+1`/`+2` after DRAW SITEs 1-6 is
 * followed by a `goto` -- every one falls straight through into the next
 * gate's own label immediately after, so all six are independently
 * evaluated regardless of any earlier gate's or draw's own outcome (doc
 * §19.1's own gate-map prose). Gate A/B reach DRAW SITE 1 by two
 * independent routes (either battler's HP alone); Gate C guards DRAW SITE 2
 * on the OPPONENT's own ACC stage (`>4` skips -- true at battle start);
 * Gates D/E/F/G each gate one status flag's own draw site (target toxic/
 * leech-seed/cursed, opponent's own rooted) -- none reachable from a
 * single-turn HP/PP build (doc §19.5). Only past all seven does Gate H
 * (opponent HP>70%) offer the tail's own clean, deterministic stop,
 * skipping Gates I/J/K and DRAW SITE 7 entirely; Gate I (target's own ACC
 * stage == neutral) is the second clean stop -- state-dependent on this
 * handler's OWN dispatch move already having lowered the target's ACC
 * stage this same turn (doc §19.1/§19.2); Gates J/K (either battler <40%)
 * skip straight to the deterministic `-2`, so DRAW SITE 7 is reached only
 * when both battlers sit in `[40,70]%` HP. Every roll shares the same
 * JUMP-skips/FALLTHROUGH-applies polarity every other ported handler's roll
 * already uses, EXCEPT DRAW SITE 7 itself: jump (roll<70) goes straight to
 * `End` with NO further score change; falling through (roll>=70) is what
 * applies the tail's own `-2` -- the opposite of DRAW SITEs 1-6, where
 * fallthrough is what carries a score change and the jump is the no-op.
 */
function runCvAccuracyDown(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  attackerAccStage: number;
  attackerIsRooted: boolean;
  targetHp: number;
  targetMaxHp: number;
  targetAccStage: number;
  targetIsToxicPoisoned: boolean;
  targetIsLeechSeeded: boolean;
  targetIsCursed: boolean;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let score = 0;

  const attackerHpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
  const targetHpPercent = Math.floor((100 * input.targetHp) / input.targetMaxHp);

  // Gates A/B -> DRAW SITE 1: either battler's own HP band reaches it.
  if (attackerHpPercent < 70 || targetHpPercent <= 70) {
    const draw1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw1`);
    rng = draw1.after;
    ordinal += 1;
    const succeeded1 = draw1.randomValue % 256 >= 100;
    draws.push(Object.freeze({ ...draw1, kind: "accuracy-down-roll-1" as const, succeeded: succeeded1 }));
    if (succeeded1) score -= 1;
  }

  // Gate C -> DRAW SITE 2: opponent's own ACC stage <= 4.
  if (!(input.attackerAccStage > 4)) {
    const draw2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw2`);
    rng = draw2.after;
    ordinal += 1;
    const succeeded2 = draw2.randomValue % 256 >= 80;
    draws.push(Object.freeze({ ...draw2, kind: "accuracy-down-roll-2" as const, succeeded: succeeded2 }));
    if (succeeded2) score -= 2;
  }

  // Gate D -> DRAW SITE 3: target toxic-poisoned.
  if (input.targetIsToxicPoisoned) {
    const draw3 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw3`);
    rng = draw3.after;
    ordinal += 1;
    const succeeded3 = draw3.randomValue % 256 >= 70;
    draws.push(Object.freeze({ ...draw3, kind: "accuracy-down-roll-3" as const, succeeded: succeeded3 }));
    if (succeeded3) score += 2;
  }

  // Gate E -> DRAW SITE 4: target leech-seeded.
  if (input.targetIsLeechSeeded) {
    const draw4 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw4`);
    rng = draw4.after;
    ordinal += 1;
    const succeeded4 = draw4.randomValue % 256 >= 70;
    draws.push(Object.freeze({ ...draw4, kind: "accuracy-down-roll-4" as const, succeeded: succeeded4 }));
    if (succeeded4) score += 2;
  }

  // Gate F -> DRAW SITE 5: opponent's OWN rooted (Ingrain) flag.
  if (input.attackerIsRooted) {
    const draw5 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw5`);
    rng = draw5.after;
    ordinal += 1;
    const succeeded5 = draw5.randomValue % 256 >= 128;
    draws.push(Object.freeze({ ...draw5, kind: "accuracy-down-roll-5" as const, succeeded: succeeded5 }));
    if (succeeded5) score += 1;
  }

  // Gate G -> DRAW SITE 6: target cursed.
  if (input.targetIsCursed) {
    const draw6 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw6`);
    rng = draw6.after;
    ordinal += 1;
    const succeeded6 = draw6.randomValue % 256 >= 70;
    draws.push(Object.freeze({ ...draw6, kind: "accuracy-down-roll-6" as const, succeeded: succeeded6 }));
    if (succeeded6) score += 2;
  }

  // Gate H: opponent's own HP > 70% -- clean stop, skips the entire tail.
  if (attackerHpPercent > 70) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
  }
  // Gate I: target's own ACC stage back at neutral -- clean stop.
  if (input.targetAccStage === DEFAULT_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
  }
  // Gates J/K: either battler <40% HP skips DRAW SITE 7, deterministic -2.
  if (attackerHpPercent < 40 || targetHpPercent < 40) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2 });
  }
  // DRAW SITE 7: OPPOSITE polarity -- jump (roll<70) is the no-op; falling
  // through (roll>=70) is what applies the -2.
  const draw7 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw7`);
  rng = draw7.after;
  const succeeded7 = draw7.randomValue % 256 >= 70;
  draws.push(Object.freeze({ ...draw7, kind: "accuracy-down-roll-7" as const, succeeded: succeeded7 }));
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: succeeded7 ? score - 2 : score });
}

/**
 * `AI_CV_EvasionUp` (`data/battle_ai_scripts.s:1037-1074`,
 * `docs/factory-ai-checkviability-ground-truth.md` §24.1) -- the largest
 * ported `AI_CV_*` handler in this doc, 8 `if_random_less_than` sites:
 *
 * ```
 * AI_CV_EvasionUp:
 *     if_hp_less_than AI_USER, 90, AI_CV_EvasionUp2                    ; Gate A (opponent's OWN hp)
 *     if_random_less_than 100, AI_CV_EvasionUp2                        ; DRAW SITE 1
 *     score +3
 * AI_CV_EvasionUp2:
 *     if_stat_level_less_than AI_USER, STAT_EVASION, 9, AI_CV_EvasionUp3  ; Gate B (opponent's OWN evasion stage)
 *     if_random_less_than 128, AI_CV_EvasionUp3                        ; DRAW SITE 2
 *     score -1
 * AI_CV_EvasionUp3:
 *     if_not_status AI_TARGET, STATUS1_TOXIC_POISON, AI_CV_EvasionUp5  ; Gate C (target toxic-poisoned?)
 *     if_hp_more_than AI_USER, 50, AI_CV_EvasionUp4                    ; Gate D (opponent's OWN hp, only if Gate C true)
 *     if_random_less_than 80, AI_CV_EvasionUp5                         ; DRAW SITE 3
 * AI_CV_EvasionUp4:
 *     if_random_less_than 50, AI_CV_EvasionUp5                         ; DRAW SITE 4
 *     score +3
 * AI_CV_EvasionUp5:
 *     if_not_status3 AI_TARGET, STATUS3_LEECHSEED, AI_CV_EvasionUp6    ; Gate E (target leech-seeded?)
 *     if_random_less_than 70, AI_CV_EvasionUp6                         ; DRAW SITE 5
 *     score +3
 * AI_CV_EvasionUp6:
 *     if_not_status3 AI_USER, STATUS3_ROOTED, AI_CV_EvasionUp7         ; Gate F (opponent's OWN Ingrain flag)
 *     if_random_less_than 128, AI_CV_EvasionUp7                        ; DRAW SITE 6
 *     score +2
 * AI_CV_EvasionUp7:
 *     if_not_status2 AI_TARGET, STATUS2_CURSED, AI_CV_EvasionUp8       ; Gate G (target cursed?)
 *     if_random_less_than 70, AI_CV_EvasionUp8                         ; DRAW SITE 7
 *     score +3
 * AI_CV_EvasionUp8:
 *     if_hp_more_than AI_USER, 70, AI_CV_EvasionUp_End                 ; Gate H (opponent's OWN hp)
 *     if_stat_level_equal AI_USER, STAT_EVASION, DEFAULT_STAT_STAGE, AI_CV_EvasionUp_End  ; Gate I (opponent's OWN evasion stage)
 *     if_hp_less_than AI_USER, 40, AI_CV_EvasionUp_ScoreDown2          ; Gate J
 *     if_hp_less_than AI_TARGET, 40, AI_CV_EvasionUp_ScoreDown2        ; Gate K
 *     if_random_less_than 70, AI_CV_EvasionUp_End                      ; DRAW SITE 8
 * AI_CV_EvasionUp_ScoreDown2:
 *     score -2
 * AI_CV_EvasionUp_End:
 *     end
 * ```
 *
 * Re-derived independently from the raw assembly, NOT copied from
 * `AI_CV_AccuracyDown`'s own shape despite the structural similarity (both
 * share the four status-gated sites -- toxic/leechseed/rooted/cursed -- and
 * the Gate H/I/J/K tail). Three real divergences (doc §24.1): (1) DRAW SITE
 * 1 has no Gate B companion -- a single opponent-HP gate, not AccuracyDown's
 * own two-independent-routes shape; (2) Gate A's own HP threshold is 90, not
 * 70; (3) Gate I reads `AI_USER`'s own evasion stage, not `AI_TARGET`'s --
 * the operand flips because EvasionUp raises the OPPONENT's own stat, unlike
 * AccuracyDown which lowers the target's.
 *
 * Gates C/D (`:1046-1047`) gate DRAW SITE 3/DRAW SITE 4 as a pair only
 * reached at all when the target is toxic-poisoned (Gate C); the opponent's
 * OWN hp then picks the ENTRY point, NOT two mutually exclusive single-draw
 * alternatives (this comment's own prior claim, disproved by docs/factory-
 * ai-draw-discrepancy-probe.md §7, the same audit that found this): > 50%
 * jumps straight to DRAW SITE 4 alone (one draw); <= 50% reaches DRAW SITE 3
 * first, and DRAW SITE 3's own failure (roll >= 80) falls straight through
 * into DRAW SITE 4's own roll immediately below with no gate between them
 * (`data/battle_ai_scripts.s:1048-1050`) -- the SAME chained-pair shape
 * `AI_CV_DefenseUp`'s own DRAW SITE 4/5 has (`runCvDefenseUp`'s own doc
 * comment above). So this branch burns 0 draws (Gate C false), 1 draw (Gate
 * D true, or Gate C true + DRAW SITE 3 succeeds), or 2 draws (Gate C true,
 * own hp <= 50%, DRAW SITE 3 fails and chains into DRAW SITE 4) -- unlike
 * AccuracyDown's own four independent (non-exclusive, always-single-draw)
 * status gates. DRAW SITE 8 (`:1069`) shares AccuracyDown's own DRAW SITE 7
 * OPPOSITE polarity: jump (roll < 70) is the no-op; falling through (roll >=
 * 70) is what applies the tail's `-2`.
 */
function runCvEvasionUp(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  attackerEvasionStage: number;
  attackerIsRooted: boolean;
  targetHp: number;
  targetMaxHp: number;
  targetIsToxicPoisoned: boolean;
  targetIsLeechSeeded: boolean;
  targetIsCursed: boolean;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let score = 0;

  const attackerHpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
  const targetHpPercent = Math.floor((100 * input.targetHp) / input.targetMaxHp);

  // Gate A -> DRAW SITE 1: opponent's OWN hp >= 90% (no Gate B companion,
  // unlike AccuracyDown's own two-gate DRAW SITE 1 -- doc §24.1 divergence 1).
  if (attackerHpPercent >= 90) {
    const draw1 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw1`);
    rng = draw1.after;
    ordinal += 1;
    const succeeded1 = draw1.randomValue % 256 >= 100;
    draws.push(Object.freeze({ ...draw1, kind: "evasion-up-roll-1" as const, succeeded: succeeded1 }));
    if (succeeded1) score += 3;
  }

  // Gate B -> DRAW SITE 2: opponent's OWN evasion stage already >= 9.
  if (input.attackerEvasionStage >= 9) {
    const draw2 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw2`);
    rng = draw2.after;
    ordinal += 1;
    const succeeded2 = draw2.randomValue % 256 >= 128;
    draws.push(Object.freeze({ ...draw2, kind: "evasion-up-roll-2" as const, succeeded: succeeded2 }));
    if (succeeded2) score -= 1;
  }

  // Gates C/D -> DRAW SITE 3/4: target toxic-poisoned reaches this pair at
  // all. The opponent's OWN hp band picks the ENTRY point, NOT two mutually
  // exclusive single-draw sites (a prior version of this comment's own
  // claim, disproved by docs/factory-ai-draw-discrepancy-probe.md §7): own
  // HP > 50% jumps straight to DRAW SITE 4 (a single, independent draw); own
  // HP <= 50% reaches DRAW SITE 3 first, whose own failure (roll >= 80) falls
  // straight through into DRAW SITE 4's own roll immediately below -- no
  // gate between them (data/battle_ai_scripts.s:1048-1050) -- the SAME
  // chained-pair shape `AI_CV_DefenseUp`'s own DRAW SITE 4/5 has. Only a
  // second failed roll (DRAW SITE 4's own, roll >= 50) applies the `+3`.
  if (input.targetIsToxicPoisoned) {
    if (attackerHpPercent > 50) {
      const draw4 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw4`);
      rng = draw4.after;
      ordinal += 1;
      const succeeded4 = draw4.randomValue % 256 >= 50;
      draws.push(Object.freeze({ ...draw4, kind: "evasion-up-roll-4" as const, succeeded: succeeded4 }));
      if (succeeded4) score += 3;
    } else {
      const draw3 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw3`);
      rng = draw3.after;
      ordinal += 1;
      const succeeded3 = draw3.randomValue % 256 >= 80;
      draws.push(Object.freeze({ ...draw3, kind: "evasion-up-roll-3" as const, succeeded: succeeded3 }));
      if (succeeded3) {
        // DRAW SITE 3's own failure falls straight through into DRAW SITE 4.
        const draw4 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw4`);
        rng = draw4.after;
        ordinal += 1;
        const succeeded4 = draw4.randomValue % 256 >= 50;
        draws.push(Object.freeze({ ...draw4, kind: "evasion-up-roll-4" as const, succeeded: succeeded4 }));
        if (succeeded4) score += 3;
      }
    }
  }

  // Gate E -> DRAW SITE 5: target leech-seeded.
  if (input.targetIsLeechSeeded) {
    const draw5 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw5`);
    rng = draw5.after;
    ordinal += 1;
    const succeeded5 = draw5.randomValue % 256 >= 70;
    draws.push(Object.freeze({ ...draw5, kind: "evasion-up-roll-5" as const, succeeded: succeeded5 }));
    if (succeeded5) score += 3;
  }

  // Gate F -> DRAW SITE 6: opponent's OWN rooted (Ingrain) flag.
  if (input.attackerIsRooted) {
    const draw6 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw6`);
    rng = draw6.after;
    ordinal += 1;
    const succeeded6 = draw6.randomValue % 256 >= 128;
    draws.push(Object.freeze({ ...draw6, kind: "evasion-up-roll-6" as const, succeeded: succeeded6 }));
    if (succeeded6) score += 2;
  }

  // Gate G -> DRAW SITE 7: target cursed.
  if (input.targetIsCursed) {
    const draw7 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw7`);
    rng = draw7.after;
    ordinal += 1;
    const succeeded7 = draw7.randomValue % 256 >= 70;
    draws.push(Object.freeze({ ...draw7, kind: "evasion-up-roll-7" as const, succeeded: succeeded7 }));
    if (succeeded7) score += 3;
  }

  // Gate H: opponent's own HP > 70% -- clean stop, skips the entire tail.
  if (attackerHpPercent > 70) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
  }
  // Gate I: opponent's OWN evasion stage back at neutral -- clean stop.
  // AI_USER here, not AI_TARGET (doc §24.1 divergence 3): the operand flips
  // because EvasionUp raises the opponent's own stat, not the target's.
  if (input.attackerEvasionStage === DEFAULT_STAT_STAGE) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score });
  }
  // Gates J/K: either battler <40% HP skips DRAW SITE 8, deterministic -2.
  if (attackerHpPercent < 40 || targetHpPercent < 40) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: score - 2 });
  }
  // DRAW SITE 8: OPPOSITE polarity -- jump (roll<70) is the no-op; falling
  // through (roll>=70) is what applies the -2 (same shape as AccuracyDown's
  // own DRAW SITE 7).
  const draw8 = nextDraw(rng, ordinal, `${input.reasonPrefix}-draw8`);
  rng = draw8.after;
  const succeeded8 = draw8.randomValue % 256 >= 70;
  draws.push(Object.freeze({ ...draw8, kind: "evasion-up-roll-8" as const, succeeded: succeeded8 }));
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: succeeded8 ? score - 2 : score });
}

/** `AI_CV_SunnyDay`'s own "other three" weather values (excludes its own type, Sun) -- doc §25.2. */
const SUNNY_DAY_OTHER_THREE: ReadonlySet<AiWeatherValue> = new Set([AI_WEATHER_HAIL, AI_WEATHER_RAIN, AI_WEATHER_SANDSTORM]);
/** `AI_CV_Hail`'s own "other three" weather values (excludes its own type, Hail) -- doc §25.2. */
const HAIL_OTHER_THREE: ReadonlySet<AiWeatherValue> = new Set([AI_WEATHER_SUN, AI_WEATHER_RAIN, AI_WEATHER_SANDSTORM]);
/** `AI_CV_RainDance`'s own "other three" weather values (excludes its own type, Rain) -- doc §25.2. */
const RAIN_DANCE_OTHER_THREE: ReadonlySet<AiWeatherValue> = new Set([AI_WEATHER_HAIL, AI_WEATHER_SUN, AI_WEATHER_SANDSTORM]);

/**
 * Shared Gate H / weather-chain span for `AI_CV_SunnyDay`/`Hail` (their
 * entire body) and `AI_CV_RainDance` (everything between its own Gate P/S
 * prologue and Gate R tail), per doc §25.8's own named factoring:
 *
 * ```
 * if_hp_less_than AI_USER, 40, ScoreDown1   ; Gate H (own HP)
 * get_weather
 * if_equal <other #1>, Bonus                 ; Gate W1
 * if_equal <other #2>, Bonus                 ; Gate W2
 * if_equal <other #3>, Bonus                 ; Gate W3
 * goto End                                    ; own weather / none -> 0 (RainDance: falls to Gate R instead)
 * Bonus: score +1; goto End
 * ScoreDown1: score -1
 * ```
 *
 * Zero `if_random_less_than` anywhere in this span (doc §25.2/§25.4) -- pure
 * function of HP% and weather, no RNG threading needed.
 */
function weatherSetterCvScore(input: Readonly<{
  attackerHp: number;
  attackerMaxHp: number;
  currentWeather: AiWeatherValue | undefined;
  /**
   * `get_weather`'s own stale-`funcResult` fallback, Channel 2 (doc
   * §25.10.1) -- non-`undefined` only when the caller (`factoryAiDecision
   * Policy.ts`'s `ttfExitFuncResult`/`cvCarryStillIntact`) has proven no AI
   * script command has written `funcResult` since `AI_TryToFaint`'s own pass
   * ended. Consulted only when `currentWeather` is itself genuinely unset,
   * the same shape as `runCbmWeatherSetter`'s `staleAbilityGuess` fallback
   * (Channel 1, `factoryAiCheckBadMove.ts`).
   */
  staleFuncResultFallback: AiWeatherValue | undefined;
  otherThree: ReadonlySet<AiWeatherValue>;
}>): Readonly<{ scoreDelta: 1 | 0 | -1; funcResultAfter: AiWeatherValue | undefined }> {
  const hpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
  if (hpPercent < 40) {
    // ScoreDown1 short-circuit, before get_weather ever runs -- no write.
    return Object.freeze({ scoreDelta: -1 as const, funcResultAfter: input.staleFuncResultFallback });
  }
  // get_weather writes funcResult = currentWeather only when a real weather
  // bit is set (Channel 2's own BUGFIX-gated sentinel); otherwise the
  // incoming carry survives this call untouched -- same formula either way.
  const funcResultAfter = input.currentWeather ?? input.staleFuncResultFallback;
  const scoreDelta = funcResultAfter !== undefined && input.otherThree.has(funcResultAfter) ? 1 as const : 0 as const;
  return Object.freeze({ scoreDelta, funcResultAfter });
}

/**
 * `AI_CV_SunnyDay` (`data/battle_ai_scripts.s:2060-2075`, doc §25.2) -- the
 * whole body is `weatherSetterCvScore`'s shared span, own type Sun excluded.
 */
function runCvSunnyDay(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  currentWeather: AiWeatherValue | undefined;
  staleFuncResultFallback: AiWeatherValue | undefined;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  const { scoreDelta, funcResultAfter } = weatherSetterCvScore({
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    currentWeather: input.currentWeather,
    staleFuncResultFallback: input.staleFuncResultFallback,
    otherThree: SUNNY_DAY_OTHER_THREE,
  });
  return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta, funcResultAfter });
}

/**
 * `AI_CV_Hail` (`data/battle_ai_scripts.s:2261-2276`, doc §25.2) --
 * `SunnyDay`'s exact twin: same `weatherSetterCvScore` span, own type Hail
 * excluded instead of Sun.
 */
function runCvHail(input: Readonly<{
  rng: BattleRngState;
  attackerHp: number;
  attackerMaxHp: number;
  currentWeather: AiWeatherValue | undefined;
  staleFuncResultFallback: AiWeatherValue | undefined;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  const { scoreDelta, funcResultAfter } = weatherSetterCvScore({
    attackerHp: input.attackerHp,
    attackerMaxHp: input.attackerMaxHp,
    currentWeather: input.currentWeather,
    staleFuncResultFallback: input.staleFuncResultFallback,
    otherThree: HAIL_OTHER_THREE,
  });
  return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta, funcResultAfter });
}

/**
 * `AI_CV_RainDance` (`data/battle_ai_scripts.s:2037-2058`, doc §25.2) -- the
 * one weather-trio sibling that genuinely diverges (7 conditional
 * instructions vs `SunnyDay`/`Hail`'s 4):
 *
 * ```
 * AI_CV_RainDance:
 *     if_user_faster AI_CV_RainDance2         ; Gate P (relative Speed)
 *     get_ability AI_USER
 *     if_equal ABILITY_SWIFT_SWIM, AI_CV_RainDance3   ; Gate S (bypass)
 * AI_CV_RainDance2:
 *     <weatherSetterCvScore span, own type Rain excluded>   ; Gate H/W1/W2/W3
 *     get_ability AI_USER
 *     if_equal ABILITY_RAIN_DISH, AI_CV_RainDance3    ; Gate R (tail bonus)
 *     goto End
 * AI_CV_RainDance3: score +1
 * ```
 *
 * Gate P (`if_user_faster` = `if_user_goes 0`, doc §25.3): jumps straight to
 * the shared span (Gate H) whenever `GetWhoStrikesFirst(AI_USER, AI_TARGET,
 * tieRoll)` returns exactly 0 -- AI_USER strictly faster, OR a genuine speed
 * tie broken to AI_USER (`strikesFirst === 0`, the SAME
 * `getWhoStrikesFirst`/tie-break-`Random()` machinery `runCvSpeedDown`'s own
 * `target-faster-tie` already ports, inverse comparison target). Only when
 * AI_USER is NOT faster does Gate S run: a direct (non-guessing) own-ability
 * read for Swift Swim, which bypasses the HP gate and weather chain entirely
 * with a deterministic `+1` (a slower Swift-Swim user turns faster in Rain).
 * Falling through the shared span without a HP/weather hit (own weather is
 * already Rain, or none) reaches Gate R: a second own-ability read for Rain
 * Dish, `+1` if present (can coexist with `AI_CBM_RainDance`'s own `-8` when
 * weather is already Rain -- CBM/CV are independent score contributions, doc
 * §25.6 item 2), else `0`.
 */
/**
 * `AI_CV_RainDance`'s own exit `funcResult` value (doc §27.1 handler 22,
 * writes-conditionally, the most complex of the 22) -- computed
 * independently of `scoreDelta` below (which keeps its own, deliberately
 * simplified `!userFaster` treatment of the weather-chain's own stale-read,
 * unchanged from PROGRESS entry 504, to avoid perturbing any committed
 * score). Gate S's own `get_ability AI_USER` (`:2039`) ALWAYS writes when
 * `!userFaster`, so the shared span's own `get_weather` -- when weather is
 * unset -- reads THAT write, not the slot-to-slot carry; and Gate R's own
 * second `get_ability AI_USER` (`:2047`) re-reads the SAME (unchanged)
 * ability whenever the span falls all the way through without a weather
 * match, so the exit value is `ownAbilityCollision` in every `!userFaster`
 * sub-path regardless of which branch of the chain actually fired.
 */
function rainDanceFuncResultAfter(input: Readonly<{
  userFaster: boolean;
  ownAbility: string;
  attackerHp: number;
  attackerMaxHp: number;
  currentWeather: AiWeatherValue | undefined;
  staleFuncResultFallback: AiWeatherValue | undefined;
}>): AiWeatherValue | undefined {
  const ownAbilityCollision = abilityFuncResultCollision(input.ownAbility);
  if (!input.userFaster && input.ownAbility === "ABILITY_SWIFT_SWIM") {
    return ownAbilityCollision;
  }
  const hpPercent = Math.floor((100 * input.attackerHp) / input.attackerMaxHp);
  if (hpPercent < 40) {
    return !input.userFaster ? ownAbilityCollision : input.staleFuncResultFallback;
  }
  if (input.currentWeather !== undefined) {
    return RAIN_DANCE_OTHER_THREE.has(input.currentWeather) ? input.currentWeather : ownAbilityCollision;
  }
  const carryIntoWeatherCheck = !input.userFaster ? ownAbilityCollision : input.staleFuncResultFallback;
  if (carryIntoWeatherCheck !== undefined && RAIN_DANCE_OTHER_THREE.has(carryIntoWeatherCheck)) {
    return carryIntoWeatherCheck;
  }
  return ownAbilityCollision;
}

function runCvRainDance(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  staleFuncResultFallback: AiWeatherValue | undefined;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number; funcResultAfter: AiWeatherValue | undefined }> {
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;

  const attacker: TurnOrderBattler = { speed: input.attacker.speed, speedStage: input.attacker.speedStage, movePriority: 0 };
  const target: TurnOrderBattler = { speed: input.target.speed, speedStage: input.target.speedStage, movePriority: 0 };

  let tieRoll = 0;
  let tieDraw: ReturnType<typeof nextDraw> | null = null;
  if (effectiveSpeed(attacker) === effectiveSpeed(target)) {
    tieDraw = nextDraw(rng, ordinal, `${input.reasonPrefix}-user-faster-tie`);
    rng = tieDraw.after;
    tieRoll = tieDraw.randomValue;
    ordinal += 1;
  }
  const strikesFirst = getWhoStrikesFirst(attacker, target, tieRoll);
  if (tieDraw) {
    draws.push(Object.freeze({ ...tieDraw, kind: "user-faster-tie" as const, strikesFirst }));
  }
  // Gate P: if_user_faster = if_user_goes 0 -- jumps on EXACTLY 0 (user
  // strictly faster, or a tie broken to the user).
  const userFaster = strikesFirst === 0;
  const ownAbility = input.attacker.ability ?? "ABILITY_NONE";
  const funcResultAfter = rainDanceFuncResultAfter({
    userFaster,
    ownAbility,
    attackerHp: input.attacker.hp,
    attackerMaxHp: input.attacker.maxHp,
    currentWeather: input.attacker.currentWeather,
    staleFuncResultFallback: input.staleFuncResultFallback,
  });

  if (!userFaster && ownAbility === "ABILITY_SWIFT_SWIM") {
    // Gate S bypass: +1, HP gate and weather chain never reached.
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: 1, funcResultAfter });
  }

  // Gate S's own `get_ability AI_USER` (data/battle_ai_scripts.s:2039)
  // overwrites funcResult with the AI's own ability id whenever it runs (not
  // user-faster, whether or not that ability turned out to be Swift Swim) --
  // this port doesn't model that read as its own stale-funcResult channel
  // for SCORE purposes, so the TryToFaint carry is only known-valid for the
  // shared span's own `get_weather` when Gate P's jump skipped Gate S
  // entirely (user-faster). `funcResultAfter` above models it fully, for
  // the NEXT slot's own carry.
  const spanScore = weatherSetterCvScore({
    attackerHp: input.attacker.hp,
    attackerMaxHp: input.attacker.maxHp,
    currentWeather: input.attacker.currentWeather,
    staleFuncResultFallback: userFaster ? input.staleFuncResultFallback : undefined,
    otherThree: RAIN_DANCE_OTHER_THREE,
  }).scoreDelta;
  if (spanScore !== 0) {
    return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: spanScore, funcResultAfter });
  }
  // Span fell all the way through (own HP >= 40%, weather didn't match) --
  // Gate R tail: own ability == Rain Dish.
  const rainDish = ownAbility === "ABILITY_RAIN_DISH";
  return Object.freeze({ rng, draws: Object.freeze(draws), scoreDelta: rainDish ? 1 : 0, funcResultAfter });
}

/** `AI_CheckViability` for one move slot (`:652-775` dispatch shell only). */
export function runCheckViability(input: Readonly<{
  rng: BattleRngState;
  moveId: number;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  /**
   * `get_weather`'s own stale-`funcResult` fallback, Channel 2 (doc
   * §25.10.1) -- forwarded to the weather-trio handlers below only, and only
   * when `attacker.currentWeather` is itself unset. The caller
   * (`factoryAiDecisionPolicy.ts`) supplies a concrete value only for the
   * pass's own first actually-scripted slot, where it alone can prove no AI
   * script command has touched `funcResult` since `AI_TryToFaint`'s pass
   * ended. Optional, defaulting to `undefined` (no known carry).
   */
  staleFuncResultFallback?: AiWeatherValue;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): FactoryAiCheckViabilityResult {
  const move = MOVES_BY_ID.get(input.moveId);
  if (!move) throw new Error(`factory-ai-check-viability: unknown move ${input.moveId}`);
  // The incoming funcResult carry for THIS slot's own dispatch -- every
  // branch below either passes it straight through unchanged (13
  // writes-never handlers + the not-yet-ported fallback, doc §27.1) or
  // overrides it with a handler-computed `funcResultAfter` (the 2
  // writes-always + 7 writes-conditionally handlers).
  const funcResultCarry = input.staleFuncResultFallback;

  if (move.effect === "EFFECT_SLEEP") {
    const sleep = runCvSleep({
      rng: input.rng,
      targetKnownMoves: input.target.knownMoves ?? [],
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: sleep.rng,
      draws: sleep.draws,
      scoreDelta: sleep.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_SPEED_DOWN" || move.effect === "EFFECT_SPEED_DOWN_2") {
    const speedDown = runCvSpeedDown({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: speedDown.rng,
      draws: speedDown.draws,
      scoreDelta: speedDown.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_SPEED_DOWN_HIT") {
    const speedDownFromChance = runCvSpeedDownFromChance({
      rng: input.rng,
      moveId: input.moveId,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: speedDownFromChance.rng,
      draws: speedDownFromChance.draws,
      scoreDelta: speedDownFromChance.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_TOXIC" || move.effect === "EFFECT_LEECH_SEED") {
    const toxic = runCvToxic({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: toxic.rng,
      draws: toxic.draws,
      scoreDelta: toxic.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_PROTECT") {
    const protect = runCvProtect({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: protect.rng,
      draws: protect.draws,
      scoreDelta: protect.scoreDelta,
      funcResultAfter: protect.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_PURSUIT") {
    const pursuit = runCvPursuit({
      rng: input.rng,
      attackerIsFirstTurn: input.attacker.isFirstTurn,
      targetTypes: input.target.types,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: pursuit.rng,
      draws: pursuit.draws,
      scoreDelta: pursuit.scoreDelta,
      funcResultAfter: pursuit.funcResultAfter,
    });
  }

  if (
    move.effect === "EFFECT_HIGH_CRITICAL"
    || move.effect === "EFFECT_BLAZE_KICK"
    || move.effect === "EFFECT_POISON_TAIL"
  ) {
    const highCrit = runCvHighCrit({
      rng: input.rng,
      attackerTypes: input.attacker.types,
      moveType: move.type,
      targetTypes: input.target.types,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: highCrit.rng,
      draws: highCrit.draws,
      scoreDelta: highCrit.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_ALWAYS_HIT") {
    const alwaysHit = runCvAlwaysHit({
      rng: input.rng,
      targetEvasionStage: input.target.evasionStage,
      attackerAccStage: input.attacker.accStage,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: alwaysHit.rng,
      draws: alwaysHit.draws,
      scoreDelta: alwaysHit.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_VITAL_THROW") {
    const vitalThrow = runCvVitalThrow({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: vitalThrow.rng,
      draws: vitalThrow.draws,
      scoreDelta: vitalThrow.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_ATTACK_DOWN" || move.effect === "EFFECT_ATTACK_DOWN_2") {
    const attackDown = runCvAttackDown({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetAtkStage: input.target.atkStage,
      targetHp: input.target.hp,
      targetMaxHp: input.target.maxHp,
      targetTypes: input.target.types,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: attackDown.rng,
      draws: attackDown.draws,
      scoreDelta: attackDown.scoreDelta,
      funcResultAfter: attackDown.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_DEFENSE_DOWN" || move.effect === "EFFECT_DEFENSE_DOWN_2") {
    const defenseDown = runCvDefenseDown({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetDefStage: input.target.defStage,
      targetHp: input.target.hp,
      targetMaxHp: input.target.maxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: defenseDown.rng,
      draws: defenseDown.draws,
      scoreDelta: defenseDown.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_SPECIAL_DEFENSE_DOWN" || move.effect === "EFFECT_SPECIAL_DEFENSE_DOWN_2") {
    const spDefDown = runCvSpDefDown({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetSpDefStage: input.target.spDefStage,
      targetHp: input.target.hp,
      targetMaxHp: input.target.maxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: spDefDown.rng,
      draws: spDefDown.draws,
      scoreDelta: spDefDown.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_ATTACK_UP" || move.effect === "EFFECT_ATTACK_UP_2") {
    const attackUp = runCvAttackUp({
      rng: input.rng,
      attackerAtkStage: input.attacker.atkStage,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: attackUp.rng,
      draws: attackUp.draws,
      scoreDelta: attackUp.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (
    move.effect === "EFFECT_DEFENSE_UP"
    || move.effect === "EFFECT_DEFENSE_UP_2"
    || move.effect === "EFFECT_BULK_UP"
  ) {
    // EFFECT_BULK_UP's CV side dispatches straight to AI_CV_DefenseUp, shared
    // with DEFENSE_UP/DEFENSE_UP_2 (doc §18.1) -- AI_CBM_BulkUp (a separate,
    // third handler) is the CBM-side-only dispatch for this same effect.
    const defenseUp = runCvDefenseUp({
      rng: input.rng,
      attackerDefStage: input.attacker.defStage,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetLastUsedMoveId: input.target.lastUsedMoveId ?? MOVE_NONE,
      funcResultCarry,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: defenseUp.rng,
      draws: defenseUp.draws,
      scoreDelta: defenseUp.scoreDelta,
      funcResultAfter: defenseUp.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_ACCURACY_DOWN" || move.effect === "EFFECT_ACCURACY_DOWN_2") {
    // EFFECT_ACCURACY_DOWN_2 is dispatched too, source-faithfully, despite
    // being a vestigial constant with zero real moves (doc §19.1).
    const accuracyDown = runCvAccuracyDown({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      attackerAccStage: input.attacker.accStage,
      attackerIsRooted: input.attacker.isRooted ?? false,
      targetHp: input.target.hp,
      targetMaxHp: input.target.maxHp,
      targetAccStage: input.target.accStage,
      targetIsToxicPoisoned: input.target.isToxicPoisoned ?? false,
      targetIsLeechSeeded: input.target.isLeechSeeded ?? false,
      targetIsCursed: input.target.isCursed ?? false,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: accuracyDown.rng,
      draws: accuracyDown.draws,
      scoreDelta: accuracyDown.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_SPEED_UP" || move.effect === "EFFECT_SPEED_UP_2") {
    const speedUp = runCvSpeedUp({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: speedUp.rng,
      draws: speedUp.draws,
      scoreDelta: speedUp.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_SPECIAL_ATTACK_UP" || move.effect === "EFFECT_SPECIAL_ATTACK_UP_2") {
    const spAtkUp = runCvSpAtkUp({
      rng: input.rng,
      attackerSpAtkStage: input.attacker.spAtkStage ?? DEFAULT_STAT_STAGE,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: spAtkUp.rng,
      draws: spAtkUp.draws,
      scoreDelta: spAtkUp.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (
    move.effect === "EFFECT_SPECIAL_DEFENSE_UP"
    || move.effect === "EFFECT_SPECIAL_DEFENSE_UP_2"
    || move.effect === "EFFECT_COSMIC_POWER"
    || move.effect === "EFFECT_CALM_MIND"
  ) {
    // All four effects dispatch to the identical AI_CV_SpDefUp (doc §22.1/§28) --
    // AI_CBM_CosmicPower/AI_CBM_CalmMind (two separate handlers) and
    // AI_CBM_SpDefUp (the single-stat handler ported in §28) are the
    // CBM-side-only dispatch split for this same shared CV target.
    const spDefUp = runCvSpDefUp({
      rng: input.rng,
      attackerSpDefStage: input.attacker.spDefStage,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetLastUsedMoveId: input.target.lastUsedMoveId ?? MOVE_NONE,
      funcResultCarry,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: spDefUp.rng,
      draws: spDefUp.draws,
      scoreDelta: spDefUp.scoreDelta,
      funcResultAfter: spDefUp.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_LIGHT_SCREEN") {
    // The tenth CBM-blocked pair's own CV half (doc §23).
    const lightScreen = runCvLightScreen({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetTypes: input.target.types,
      funcResultCarry,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: lightScreen.rng,
      draws: lightScreen.draws,
      scoreDelta: lightScreen.scoreDelta,
      funcResultAfter: lightScreen.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_REFLECT") {
    // The tenth CBM-blocked pair's other CV half (doc §23).
    const reflect = runCvReflect({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetTypes: input.target.types,
      funcResultCarry,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: reflect.rng,
      draws: reflect.draws,
      scoreDelta: reflect.scoreDelta,
      funcResultAfter: reflect.funcResultAfter,
    });
  }

  if (
    move.effect === "EFFECT_EVASION_UP"
    || move.effect === "EFFECT_EVASION_UP_2"
    || move.effect === "EFFECT_MINIMIZE"
  ) {
    // The eleventh CBM-blocked pair's own CV half (doc §24) -- EFFECT_MINIMIZE
    // dispatches to the identical AI_CV_EvasionUp despite being
    // blocked-on-opcodes for move execution itself (doc §24.7), unrelated to
    // this AI-decision port.
    const evasionUp = runCvEvasionUp({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      attackerEvasionStage: input.attacker.evasionStage,
      attackerIsRooted: input.attacker.isRooted ?? false,
      targetHp: input.target.hp,
      targetMaxHp: input.target.maxHp,
      targetIsToxicPoisoned: input.target.isToxicPoisoned ?? false,
      targetIsLeechSeeded: input.target.isLeechSeeded ?? false,
      targetIsCursed: input.target.isCursed ?? false,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: evasionUp.rng,
      draws: evasionUp.draws,
      scoreDelta: evasionUp.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_EVASION_DOWN" || move.effect === "EFFECT_EVASION_DOWN_2") {
    // The eleventh CBM-blocked pair's other CV half (doc §24).
    const evasionDown = runCvEvasionDown({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      targetEvasionStage: input.target.evasionStage,
      targetHp: input.target.hp,
      targetMaxHp: input.target.maxHp,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: evasionDown.rng,
      draws: evasionDown.draws,
      scoreDelta: evasionDown.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_SUNNY_DAY") {
    // The weather trio's second CV half (doc §25) -- AI_USER's own HP/weather only.
    const sunnyDay = runCvSunnyDay({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      currentWeather: input.attacker.currentWeather,
      staleFuncResultFallback: funcResultCarry,
    });
    return Object.freeze({
      kind: "scored",
      rng: sunnyDay.rng,
      draws: sunnyDay.draws,
      scoreDelta: sunnyDay.scoreDelta,
      funcResultAfter: sunnyDay.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_HAIL") {
    // The weather trio's third CV half (doc §25).
    const hail = runCvHail({
      rng: input.rng,
      attackerHp: input.attacker.hp,
      attackerMaxHp: input.attacker.maxHp,
      currentWeather: input.attacker.currentWeather,
      staleFuncResultFallback: funcResultCarry,
    });
    return Object.freeze({
      kind: "scored",
      rng: hail.rng,
      draws: hail.draws,
      scoreDelta: hail.scoreDelta,
      funcResultAfter: hail.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_RAIN_DANCE") {
    // The twelfth (weather-trio) CBM-blocked pair's own CV third (doc §25) --
    // the one sibling with its own bespoke Speed/ability-reading prologue and tail.
    const rainDance = runCvRainDance({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      staleFuncResultFallback: funcResultCarry,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: rainDance.rng,
      draws: rainDance.draws,
      scoreDelta: rainDance.scoreDelta,
      funcResultAfter: rainDance.funcResultAfter,
    });
  }

  if (move.effect === "EFFECT_ROAR") {
    const roar = runCvRoar({
      rng: input.rng,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: roar.rng,
      draws: roar.draws,
      scoreDelta: roar.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (move.effect === "EFFECT_PARALYZE") {
    const paralyze = runCvParalyze({
      rng: input.rng,
      attacker: input.attacker,
      target: input.target,
      drawOrdinalStart: input.drawOrdinalStart,
      reasonPrefix: input.reasonPrefix,
    });
    return Object.freeze({
      kind: "scored",
      rng: paralyze.rng,
      draws: paralyze.draws,
      scoreDelta: paralyze.scoreDelta,
      funcResultAfter: funcResultCarry,
    });
  }

  if (AI_CHECK_VIABILITY_TABLE_EFFECTS.has(move.effect)) {
    return Object.freeze({
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect: move.effect,
      moveId: input.moveId,
    });
  }
  // No `if_effect` entry at all for this move's effect -- no AI script
  // command from AI_CheckViability's own dispatch chain runs for this slot,
  // so funcResult is untouched (doc §27.1's own framing extends naturally:
  // zero handler dispatch is the ultimate writes-never case).
  return Object.freeze({
    kind: "scored",
    rng: input.rng,
    draws: Object.freeze([]) as readonly FactoryAiCheckViabilityDraw[],
    scoreDelta: 0,
    funcResultAfter: funcResultCarry,
  });
}

/**
 * `AI_CV_Sleep` (`data/battle_ai_scripts.s:778-787`, doc §29). Kept after
 * the dispatcher so the ability/item census's exact source-site pins remain
 * byte-stable.
 */
function runCvSleep(input: Readonly<{
  rng: BattleRngState;
  targetKnownMoves: readonly number[];
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{
  rng: BattleRngState;
  draws: readonly FactoryAiCheckViabilityDraw[];
  scoreDelta: number;
}> {
  const knownEffects = input.targetKnownMoves.map((moveId) => MOVES_BY_ID.get(moveId)?.effect);
  const encouragesSleepDamage = knownEffects.includes("EFFECT_DREAM_EATER")
    || knownEffects.includes("EFFECT_NIGHTMARE");
  if (!encouragesSleepDamage) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0 });
  }

  const roll = nextDraw(input.rng, input.drawOrdinalStart, `${input.reasonPrefix}-sleep-roll`);
  const jumpedToEnd = roll.randomValue % 256 < 128;
  return Object.freeze({
    rng: roll.after,
    draws: Object.freeze([Object.freeze({
      ...roll,
      kind: "sleep-roll" as const,
      succeeded: !jumpedToEnd,
    })]),
    scoreDelta: jumpedToEnd ? 0 : 1,
  });
}

/**
 * `AI_CV_Roar` (`data/battle_ai_scripts.s:1290-1303`, doc §30). The five
 * target-stage gates execute in source order: ATK, DEF, SPATK, SPDEF, then
 * EVASION. The first value >8 JUMPs to the single random site. If all five
 * FALL THROUGH, score -3 and goto End with no draw. At the random site a
 * low byte <128 JUMPs to End; >=128 FALLS THROUGH and scores +2.
 */
function runCvRoar(input: Readonly<{
  rng: BattleRngState;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{
  rng: BattleRngState;
  draws: readonly FactoryAiCheckViabilityDraw[];
  scoreDelta: number;
}> {
  const hasRaisedTargetStat = input.target.atkStage > 8
    || input.target.defStage > 8
    || (input.target.spAtkStage ?? DEFAULT_STAT_STAGE) > 8
    || input.target.spDefStage > 8
    || input.target.evasionStage > 8;
  if (!hasRaisedTargetStat) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: -3 });
  }
  const roll = nextDraw(input.rng, input.drawOrdinalStart, `${input.reasonPrefix}-roar-roll`);
  const jumpedToEnd = roll.randomValue % 256 < 128;
  return Object.freeze({
    rng: roll.after,
    draws: Object.freeze([Object.freeze({
      ...roll,
      kind: "roar-roll" as const,
      succeeded: !jumpedToEnd,
    })]),
    scoreDelta: jumpedToEnd ? 0 : 2,
  });
}

/**
 * `AI_CV_Paralyze` (`data/battle_ai_scripts.s:1524-1534`, doc §31).
 * Target faster JUMPS to the single roll; low byte <20 JUMPS to End and
 * scores zero, while >=20 FALLS THROUGH to +3. Target not faster continues
 * to the user's own strict >70% HP gate: >70 JUMPS to End at zero, while
 * <=70 FALLS THROUGH to -1 and then goes to End. An exact Speed tie burns
 * the source's normal `GetWhoStrikesFirst` tie draw.
 */
function runCvParalyze(input: Readonly<{
  rng: BattleRngState;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{
  rng: BattleRngState;
  draws: readonly FactoryAiCheckViabilityDraw[];
  scoreDelta: number;
}> {
  const draws: FactoryAiCheckViabilityDraw[] = [];
  let rng = input.rng;
  let ordinal = input.drawOrdinalStart;
  const attacker: TurnOrderBattler = {
    speed: input.attacker.speed,
    speedStage: input.attacker.speedStage,
    movePriority: 0,
  };
  const target: TurnOrderBattler = {
    speed: input.target.speed,
    speedStage: input.target.speedStage,
    movePriority: 0,
  };

  let tieRoll = 0;
  if (effectiveSpeed(attacker) === effectiveSpeed(target)) {
    const tie = nextDraw(rng, ordinal, `${input.reasonPrefix}-target-faster-tie`);
    rng = tie.after;
    ordinal += 1;
    tieRoll = tie.randomValue;
    const strikesFirst = getWhoStrikesFirst(attacker, target, tieRoll);
    draws.push(Object.freeze({ ...tie, kind: "target-faster-tie" as const, strikesFirst }));
  }
  const targetFaster = getWhoStrikesFirst(attacker, target, tieRoll) === 1;
  if (targetFaster) {
    const roll = nextDraw(rng, ordinal, `${input.reasonPrefix}-paralyze-roll`);
    const jumpedToEnd = roll.randomValue % 256 < 20;
    draws.push(Object.freeze({
      ...roll,
      kind: "paralyze-roll" as const,
      succeeded: !jumpedToEnd,
    }));
    return Object.freeze({
      rng: roll.after,
      draws: Object.freeze(draws),
      scoreDelta: jumpedToEnd ? 0 : 3,
    });
  }

  const hpPercent = Math.floor((100 * input.attacker.hp) / input.attacker.maxHp);
  return Object.freeze({
    rng,
    draws: Object.freeze(draws),
    scoreDelta: hpPercent > 70 ? 0 : -1,
  });
}
