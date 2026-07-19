// Turn order, ported bit-exact from GetWhoStrikesFirst
// (reference/pokeemerald/src/battle_main.c:4595-4754). Scope: priority +
// speed comparison + the Random()&1 speed-tie break; the weather-based
// speed-doubling abilities (Swift Swim/Chlorophyll), Macho Brace,
// paralysis speed-quarter, and Quick Claw are ported structurally (battle 1
// turn 1 needs none of them - both battlers are unstatused, unparalyzed,
// hold no speed-affecting item, no weather) but are untested this step -
// see docs/battle-turn-notes.md §10. Badge boosts are NOT ported: like
// damageCalc.ts, ShouldGetStatBadgeBoost is unconditionally FALSE for
// BATTLE_TYPE_FRONTIER, which every battle this engine models is.

import { STAT_STAGE_RATIOS } from "./damageCalc.ts";

export interface TurnOrderBattler {
  speed: number;
  speedStage: number;
  /** The chosen move's priority bracket (gBattleMoves[move].priority), 0 for most moves. */
  movePriority: number;
  isParalyzed?: boolean;
  /** ABILITY_SWIFT_SWIM/ABILITY_CHLOROPHYLL - structurally present, needs a weather flag to matter. */
  ability?: string | null;
  holdEffect?: string | null;
  holdEffectParam?: number;
}

export interface WeatherState {
  isRaining?: boolean;
  isSunny?: boolean;
}

/**
 * GetWhoStrikesFirst's effective-speed computation for one battler
 * (battle_main.c:4605-4650 half of the pairwise function - the two
 * battlers' halves are identical code, factored here instead of
 * duplicated).
 */
export function effectiveSpeed(battler: TurnOrderBattler, weather: WeatherState = {}): number {
  const swiftBoost =
    (battler.ability === "ABILITY_SWIFT_SWIM" && weather.isRaining) ||
    (battler.ability === "ABILITY_CHLOROPHYLL" && weather.isSunny);
  const speedMultiplier = swiftBoost ? 2 : 1;

  const [num, den] = STAT_STAGE_RATIOS[battler.speedStage]!;
  let speed = Math.trunc((battler.speed * speedMultiplier * num) / den);

  if (battler.holdEffect === "HOLD_EFFECT_MACHO_BRACE") speed = Math.trunc(speed / 2);
  if (battler.isParalyzed) speed = Math.trunc(speed / 4);
  return speed;
}

/** 0 = battler1 strikes first (no swap); 1 or 2 = battler2 strikes first (swap) - see SetActionsAndBattlersTurnOrder's `!= 0` check. */
export type StrikesFirstResult = 0 | 1 | 2;

/**
 * GetWhoStrikesFirst (battle_main.c:4595-4754). `speedTieRngRoll` is the
 * raw Random() u16 output consumed ONLY when both priority and effective
 * speed are exactly equal (battle_main.c:4728/4745, `Random() & 1`) - pass
 * any value when a tie is impossible, it won't be read.
 */
export function getWhoStrikesFirst(
  battler1: TurnOrderBattler,
  battler2: TurnOrderBattler,
  speedTieRngRoll: number,
  weather: WeatherState = {},
): StrikesFirstResult {
  const speed1 = effectiveSpeed(battler1, weather);
  const speed2 = effectiveSpeed(battler2, weather);

  const bothPriorityZero = battler1.movePriority === 0 && battler2.movePriority === 0;
  const priorityEqual = battler1.movePriority === battler2.movePriority;

  if (!bothPriorityZero && !priorityEqual) {
    return battler1.movePriority < battler2.movePriority ? 1 : 0;
  }
  // Either both priorities are 0, or they're equal-but-nonzero - both take
  // the plain speed comparison (battle_main.c:4724-4731/4741-4748).
  if (speed1 === speed2 && (speedTieRngRoll & 1) === 1) return 2;
  if (speed1 < speed2) return 1;
  return 0;
}

/**
 * SetActionsAndBattlersTurnOrder's pairwise bubble sort (battle_main.c
 * :4830-4839), generalized to N battlers all using B_ACTION_USE_MOVE (no
 * switch/item/run - battle 1 turn 1's case). `speedTieRngRolls` supplies one
 * u16 per pairwise comparison, consumed left-to-right; only comparisons
 * that actually tie will read from it.
 */
export function sortBattlersByTurnOrder(
  battlerIds: readonly number[],
  battlers: ReadonlyMap<number, TurnOrderBattler>,
  speedTieRngRolls: readonly number[] = [],
  weather: WeatherState = {},
): number[] {
  const order = [...battlerIds];
  let rollIndex = 0;
  for (let i = 0; i < order.length - 1; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const b1 = battlers.get(order[i]!)!;
      const b2 = battlers.get(order[j]!)!;
      const priorityBracketsTie =
        (b1.movePriority === 0 && b2.movePriority === 0) || b1.movePriority === b2.movePriority;
      const isSpeedTie = priorityBracketsTie && effectiveSpeed(b1, weather) === effectiveSpeed(b2, weather);
      const roll = isSpeedTie ? (speedTieRngRolls[rollIndex++] ?? 0) : 0;
      const result = getWhoStrikesFirst(b1, b2, roll, weather);
      if (result !== 0) {
        const tmp = order[i]!;
        order[i] = order[j]!;
        order[j] = tmp;
      }
    }
  }
  return order;
}
