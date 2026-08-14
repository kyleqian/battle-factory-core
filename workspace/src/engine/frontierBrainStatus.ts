/**
 * Pure `GetFrontierBrainStatus` port (`frontier_util.c:1657-1698`), scoped to
 * the Battle Factory row of `sFrontierBrainStreakAppearances`
 * (`frontier_util.c:86-95`): `{21, 42, 21, 1}` — silver at streak 21, gold at
 * streak 42, a further STREAK_LONG every 21 wins after gold, modifier +1.
 *
 * Source computes `winStreak = GetCurrentFacilityWinStreak() +
 * sFrontierBrainStreakAppearances[facility][3]` once, then a battle-mode
 * gate, then a symbols-count switch. Singles-only: any other battle mode is
 * unconditionally not-ready before the streak is even considered.
 */

const FACTORY_SILVER_STREAK = 21;
const FACTORY_GOLD_STREAK = 42;
const FACTORY_STREAK_INCREMENT = 21;
const FACTORY_STREAK_MODIFIER = 1;

export type FrontierBrainBattleMode = "singles" | "doubles" | "multi";

export type FrontierBrainStatus =
  | "not-ready"
  | "silver"
  | "gold"
  | "streak"
  | "streak-long";

export type FrontierBrainStatusInput = Readonly<{
  battleMode: FrontierBrainBattleMode;
  /** `GetCurrentFacilityWinStreak()`: the streak already banked entering the upcoming battle, unmodified. */
  winStreak: number;
  /** `GetPlayerSymbolCountForFacility(FRONTIER_FACILITY_FACTORY)`. */
  symbolsCount: 0 | 1 | 2;
}>;

function requireNonnegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a nonnegative integer, got ${value}`);
  }
  return value;
}

export function getFactoryFrontierBrainStatus(
  input: FrontierBrainStatusInput,
): FrontierBrainStatus {
  if (input.battleMode !== "singles") return "not-ready";
  const winStreak =
    requireNonnegativeInteger(input.winStreak, "winStreak") + FACTORY_STREAK_MODIFIER;

  switch (input.symbolsCount) {
    case 0:
      return winStreak === FACTORY_SILVER_STREAK ? "silver" : "not-ready";
    case 1:
      return winStreak === FACTORY_GOLD_STREAK ? "gold" : "not-ready";
    case 2:
    default:
      if (winStreak === FACTORY_SILVER_STREAK) return "streak";
      if (winStreak === FACTORY_GOLD_STREAK) return "streak-long";
      if (
        winStreak > FACTORY_GOLD_STREAK
        && (winStreak - FACTORY_GOLD_STREAK) % FACTORY_STREAK_INCREMENT === 0
      ) {
        return "streak-long";
      }
      return "not-ready";
  }
}
