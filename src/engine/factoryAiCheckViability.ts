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
 * `"factory-ai-check-viability"` unsupported-branch barrier -- except four,
 * dispatched before that barrier check: `EFFECT_SPEED_DOWN(_2)` (`AI_CV_SpeedDown`,
 * `runCvSpeedDown` below, `data/battle_ai_scripts.s:1142-1152`,
 * `docs/factory-ai-checkviability-ground-truth.md` §6), `EFFECT_PURSUIT`
 * (`AI_CV_Pursuit`, `runCvPursuit` below, `:2018-2036`, doc §11.1),
 * `EFFECT_HIGH_CRITICAL`/`EFFECT_BLAZE_KICK`/`EFFECT_POISON_TAIL`
 * (`AI_CV_HighCrit`, `runCvHighCrit` below, `:1449-1461`, doc §11.2),
 * `EFFECT_ALWAYS_HIT` (`AI_CV_AlwaysHit`, `runCvAlwaysHit` below,
 * `:1075-1089`, doc §12.1), and `EFFECT_VITAL_THROW` (`AI_CV_VitalThrow`,
 * `runCvVitalThrow` below, `:1536-1546`, doc §13 -- the fifth and last
 * CV-only-reachable handler). The other 85 are not ported this round (a
 * separate, much larger phased body of work per the audit's §3), so a move
 * that reaches one of THOSE must not silently score zero.
 */
import { MOVES_BY_ID, TYPE_EFFECTIVENESS } from "./factoryAiCheckBadMove.ts";
import type { BattleRngState } from "./battleDecisionBoundary.ts";
import { applyStab, applyTypeEffectiveness } from "./damageCalc.ts";
import { advanceRngValue } from "./rng.ts";
import { effectiveSpeed, getWhoStrikesFirst, type TurnOrderBattler } from "./turnOrder.ts";

const U16_MAX = 0xffff;

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
 * _script_commands.c:713-741`).
 */
export type FactoryAiCheckViabilityBattler = Readonly<{
  speed: number;
  speedStage: number;
  types: readonly [string, string];
  isFirstTurn: number;
  evasionStage: number;
  accStage: number;
  hp: number;
  maxHp: number;
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
    kind: "pursuit-roll";
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
  }>;

export type FactoryAiCheckViabilityResult =
  | Readonly<{
    kind: "scored";
    rng: BattleRngState;
    draws: readonly FactoryAiCheckViabilityDraw[];
    scoreDelta: number;
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
function runCvPursuit(input: Readonly<{
  rng: BattleRngState;
  attackerIsFirstTurn: number;
  targetTypes: readonly [string, string];
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): Readonly<{ rng: BattleRngState; draws: readonly FactoryAiCheckViabilityDraw[]; scoreDelta: number }> {
  if (input.attackerIsFirstTurn !== 0) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0 });
  }
  const isGhostOrPsychic = input.targetTypes.some((t) => t === "TYPE_GHOST" || t === "TYPE_PSYCHIC");
  if (!isGhostOrPsychic) {
    return Object.freeze({ rng: input.rng, draws: Object.freeze([]), scoreDelta: 0 });
  }

  const draw = nextDraw(input.rng, input.drawOrdinalStart, `${input.reasonPrefix}-roll`);
  // if_random_less_than 128, AI_CV_Pursuit_End: the JUMP (roll < 128, ~50%)
  // skips the bonus; falling through (roll >= 128) grants +1.
  const succeeded = draw.randomValue % 256 >= 128;
  return Object.freeze({
    rng: draw.after,
    draws: Object.freeze([Object.freeze({ ...draw, kind: "pursuit-roll" as const, succeeded })]),
    scoreDelta: succeeded ? 1 : 0,
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

/** `AI_CheckViability` for one move slot (`:652-775` dispatch shell only). */
export function runCheckViability(input: Readonly<{
  rng: BattleRngState;
  moveId: number;
  attacker: FactoryAiCheckViabilityBattler;
  target: FactoryAiCheckViabilityBattler;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>): FactoryAiCheckViabilityResult {
  const move = MOVES_BY_ID.get(input.moveId);
  if (!move) throw new Error(`factory-ai-check-viability: unknown move ${input.moveId}`);

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
  return Object.freeze({
    kind: "scored",
    rng: input.rng,
    draws: Object.freeze([]) as readonly FactoryAiCheckViabilityDraw[],
    scoreDelta: 0,
  });
}
