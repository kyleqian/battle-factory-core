/**
 * Pins `applyFactoryBrainRoundOutcome` (`GiveBattlePoints` +
 * `GiveFacilitySymbol`, `frontier_util.c:1853-1925`) against
 * `docs/noland-brain-post-battle-audit.md` §1a/§3's hand-derived table:
 * silver/gold grant a symbol and the brain-bonus BP row; STREAK/STREAK_LONG
 * award BP with no symbol; an ordinary first-challenge win reproduces the
 * existing 3 BP fixture untouched.
 */
import { describe, expect, it } from "vitest";
import { applyFactoryBrainRoundOutcome } from "../src/engine/factoryBrainRoundOutcome.ts";

describe("applyFactoryBrainRoundOutcome", () => {
  it("silver win: challengeNum row 2 (4) + brain bonus (10) = 14 BP, symbol granted, count 0 -> 1", () => {
    const result = applyFactoryBrainRoundOutcome({
      outcome: "win",
      factoryWinStreak: 20,
      factorySymbolsCount: 0,
      frontierBrain: { status: "silver" },
    });
    expect(result).toEqual({ battlePointsAwarded: 14, symbolGranted: true, newSymbolsCount: 1 });
  });

  it("gold win: challengeNum row 5 (5) + brain bonus (10) = 15 BP, symbol granted, count 1 -> 2", () => {
    const result = applyFactoryBrainRoundOutcome({
      outcome: "win",
      factoryWinStreak: 41,
      factorySymbolsCount: 1,
      frontierBrain: { status: "gold" },
    });
    expect(result).toEqual({ battlePointsAwarded: 15, symbolGranted: true, newSymbolsCount: 2 });
  });

  it("streak win (silver threshold reached again, both symbols held): same 14 BP as the original silver win, no symbol", () => {
    const result = applyFactoryBrainRoundOutcome({
      outcome: "win",
      factoryWinStreak: 20,
      factorySymbolsCount: 2,
      frontierBrain: { status: "streak" },
    });
    expect(result).toEqual({ battlePointsAwarded: 14, symbolGranted: false, newSymbolsCount: 2 });
  });

  it("streak-long win (63, one increment past gold): challengeNum row 8 (7) + brain bonus (10) = 17 BP, no symbol", () => {
    const result = applyFactoryBrainRoundOutcome({
      outcome: "win",
      factoryWinStreak: 62,
      factorySymbolsCount: 2,
      frontierBrain: { status: "streak-long" },
    });
    expect(result).toEqual({ battlePointsAwarded: 17, symbolGranted: false, newSymbolsCount: 2 });
  });

  it("ordinary first-challenge win (battle 7, not the brain): challengeNum row 0 (3), no bonus, no symbol", () => {
    const result = applyFactoryBrainRoundOutcome({
      outcome: "win",
      factoryWinStreak: 6,
      factorySymbolsCount: 0,
    });
    expect(result).toEqual({ battlePointsAwarded: 3, symbolGranted: false, newSymbolsCount: 0 });
  });

  it("loss against the brain: no BP, no symbol, symbol count untouched (identical to an ordinary loss)", () => {
    const result = applyFactoryBrainRoundOutcome({
      outcome: "loss",
      factoryWinStreak: 20,
      factorySymbolsCount: 0,
      frontierBrain: { status: "silver" },
    });
    expect(result).toEqual({ battlePointsAwarded: 0, symbolGranted: false, newSymbolsCount: 0 });
  });
});
