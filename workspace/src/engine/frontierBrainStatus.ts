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

/** The symbol tier a Frontier Brain battle's own data is read with: index 0 (Silver) or 1 (Gold) of the source's per-symbol tables. */
export type FrontierBrainSymbolTier = "silver" | "gold";

/**
 * hdl1 (docs/hdl1-head-lines-bike-sprite.md): `GetFronterBrainSymbol` (the source's spelling, `frontier_util.c:2587-2604`) from the
 * battle's own status. With 0 or 1 symbols it is the symbol count (the battle is SILVER or GOLD); with both symbols it is 0 at streak 21
 * (STREAK) and 1 at 42 and every 21 after (STREAK_LONG), the same win streak + 1 tests `getFactoryFrontierBrainStatus` makes. Neither
 * input changes during the battle (the battle room's script writes them after it: `IncrementWinStreak` at
 * `BattleFrontier_BattleFactoryBattleRoom/scripts.inc:92-99`, `frontier_givesymbol` at `:139, :165`), so the status picked at battle start
 * gives the tier read when the end-of-battle line is printed (`CopyFrontierBrainText`, `frontier_util.c:2607-2631`).
 */
export function frontierBrainSymbolTier(
  status: Exclude<FrontierBrainStatus, "not-ready">,
): FrontierBrainSymbolTier {
  switch (status) {
    case "silver":
    case "streak":
      return "silver";
    case "gold":
    case "streak-long":
      return "gold";
  }
}
