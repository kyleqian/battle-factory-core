/**
 * Save/meta consumer boundary for Battle Script `game-stat-increment`
 * observations. This module deliberately owns decoded counters only:
 * SaveBlock1 storage and SaveBlock2 encryption remain future full-save work,
 * outside BattleScriptRulesContext, Factory round state, and presentation.
 *
 * Source: IncrementGameStat (`overworld.c:433-445`), with constants from
 * `include/constants/game_stat.h:30-31,57`.
 */
import type {
  BattleScriptGameStat,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";

export const BATTLE_GAME_STAT_USED_SPLASH = Object.freeze({
  index: 26,
  symbol: "GAME_STAT_USED_SPLASH",
} as const satisfies BattleScriptGameStat);

export const BATTLE_GAME_STAT_USED_STRUGGLE = Object.freeze({
  index: 27,
  symbol: "GAME_STAT_USED_STRUGGLE",
} as const satisfies BattleScriptGameStat);

export const BATTLE_GAME_STAT_COUNT = 52;
export const BATTLE_GAME_STAT_MAX = 0x00ff_ffff;

export type BattleGameStatIncrementEvent = Extract<
  BattleScriptSemanticEventPayload,
  { kind: "game-stat-increment" }
>;

export type BattleGameStatIncrementIntent = Readonly<{
  kind: "game-stat-increment";
  gameStat: Readonly<{ index: number }>;
}>;

export type BattleGameStatMetaState = Readonly<{
  /** Decoded `gameStats[0..NUM_USED_GAME_STATS)`, never encrypted storage. */
  counters: readonly number[];
}>;

export type BattleGameStatIncrementReceipt =
  | Readonly<{
    kind: "incremented";
    index: number;
    before: number;
    after: number;
  }>
  | Readonly<{
    kind: "saturated";
    index: number;
    before: typeof BATTLE_GAME_STAT_MAX;
    after: typeof BATTLE_GAME_STAT_MAX;
  }>
  | Readonly<{
    kind: "ignored-out-of-range";
    index: number;
    validIndexUpperBoundExclusive: typeof BATTLE_GAME_STAT_COUNT;
  }>;

export type BattleGameStatMetaTransition = Readonly<{
  state: BattleGameStatMetaState;
  receipt: BattleGameStatIncrementReceipt;
}>;

function requireCounter(value: number, index: number): number {
  if (
    !Number.isSafeInteger(value)
    || value < 0
    || value > BATTLE_GAME_STAT_MAX
  ) {
    throw new Error(
      `decoded game stat ${index} must be an integer in 0..0xFFFFFF, got ${value}`,
    );
  }
  return value;
}

export function createBattleGameStatMetaState(
  counters: readonly number[] = Array(BATTLE_GAME_STAT_COUNT).fill(0),
): BattleGameStatMetaState {
  if (counters.length !== BATTLE_GAME_STAT_COUNT) {
    throw new Error(
      `decoded game stats must contain exactly ${BATTLE_GAME_STAT_COUNT} counters, got ${counters.length}`,
    );
  }
  return Object.freeze({
    counters: Object.freeze(
      counters.map((value, index) => requireCounter(value, index)),
    ),
  });
}

/**
 * Faithful decoded-value portion of IncrementGameStat. Invalid raw-u8
 * indexes are observed but do not alter state; valid counters increment once
 * and clamp at 0xFFFFFF. The immutable receipt makes all three outcomes
 * inspectable for a future encrypted-save adapter.
 */
export function consumeBattleGameStatIncrement(
  state: BattleGameStatMetaState,
  event: BattleGameStatIncrementIntent,
): BattleGameStatMetaTransition {
  if (
    !Number.isSafeInteger(event.gameStat.index)
    || event.gameStat.index < 0
    || event.gameStat.index > 0xff
  ) {
    throw new Error(
      `game-stat-increment index must be a raw u8, got ${event.gameStat.index}`,
    );
  }
  const index = event.gameStat.index;
  if (index >= BATTLE_GAME_STAT_COUNT) {
    return Object.freeze({
      state,
      receipt: Object.freeze({
        kind: "ignored-out-of-range",
        index,
        validIndexUpperBoundExclusive: BATTLE_GAME_STAT_COUNT,
      }),
    });
  }

  const before = requireCounter(state.counters[index]!, index);
  if (before === BATTLE_GAME_STAT_MAX) {
    return Object.freeze({
      state,
      receipt: Object.freeze({
        kind: "saturated",
        index,
        before,
        after: BATTLE_GAME_STAT_MAX,
      }),
    });
  }

  const after = before + 1;
  const counters = Object.freeze(state.counters.map((value, candidate) =>
    candidate === index ? after : value
  ));
  return Object.freeze({
    state: Object.freeze({ counters }),
    receipt: Object.freeze({
      kind: "incremented",
      index,
      before,
      after,
    }),
  });
}
