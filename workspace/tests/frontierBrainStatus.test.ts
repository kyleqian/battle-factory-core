import { describe, expect, it } from "vitest";
import {
  getFactoryFrontierBrainStatus,
  type FrontierBrainStatus,
} from "../src/engine/frontierBrainStatus.ts";

/**
 * Hand-derived from `GetFrontierBrainStatus` (`frontier_util.c:1657-1698`)
 * against the Factory row of `sFrontierBrainStreakAppearances`
 * (`:86-95`): `{21, 42, 21, 1}` — silver/gold/streak thresholds 21 and 42,
 * a further STREAK_LONG every 21 wins after gold, +1 modifier.
 *
 * effectiveWinStreak = winStreak + 1:
 *   19 -> 20   20 -> 21   21 -> 22
 *   41 -> 42   42 -> 43
 *   62 -> 63   63 -> 64
 *   83 -> 84   84 -> 85
 *
 * symbolsCount 0 fires only at effective == 21 (winStreak 20).
 * symbolsCount 1 fires only at effective == 42 (winStreak 41).
 * symbolsCount 2 fires at effective == 21 (streak), == 42 (streak-long), and
 * every effective == 42 + 21k thereafter (streak-long): 63 (winStreak 62),
 * 84 (winStreak 83).
 */
const MATRIX: readonly (readonly [number, 0 | 1 | 2, FrontierBrainStatus])[] = [
  [19, 0, "not-ready"], [19, 1, "not-ready"], [19, 2, "not-ready"],
  [20, 0, "silver"], [20, 1, "not-ready"], [20, 2, "streak"],
  [21, 0, "not-ready"], [21, 1, "not-ready"], [21, 2, "not-ready"],
  [41, 0, "not-ready"], [41, 1, "gold"], [41, 2, "streak-long"],
  [42, 0, "not-ready"], [42, 1, "not-ready"], [42, 2, "not-ready"],
  [62, 0, "not-ready"], [62, 1, "not-ready"], [62, 2, "streak-long"],
  [63, 0, "not-ready"], [63, 1, "not-ready"], [63, 2, "not-ready"],
  [83, 0, "not-ready"], [83, 1, "not-ready"], [83, 2, "streak-long"],
  [84, 0, "not-ready"], [84, 1, "not-ready"], [84, 2, "not-ready"],
];

describe("getFactoryFrontierBrainStatus", () => {
  it.each(MATRIX)(
    "winStreak %i, symbolsCount %i -> %s",
    (winStreak, symbolsCount, expected) => {
      expect(getFactoryFrontierBrainStatus({
        battleMode: "singles",
        winStreak,
        symbolsCount,
      })).toBe(expected);
    },
  );

  it("is not-ready outside singles regardless of streak/symbols", () => {
    expect(getFactoryFrontierBrainStatus({
      battleMode: "doubles",
      winStreak: 20,
      symbolsCount: 2,
    })).toBe("not-ready");
    expect(getFactoryFrontierBrainStatus({
      battleMode: "multi",
      winStreak: 41,
      symbolsCount: 1,
    })).toBe("not-ready");
  });
});
