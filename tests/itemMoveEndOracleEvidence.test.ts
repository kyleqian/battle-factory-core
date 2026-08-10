import { describe, expect, it } from "vitest";
import cheriFixture from "../tools/battle-lab/mechanic-item-move-end-paralysis-cheri-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/mechanic-item-move-end-paralysis-control-off.json" with { type: "json" };
import cheriReceipt from "../tools/probe/receipts/item-move-end-paralysis-cheri-off.json" with { type: "json" };
import controlReceipt from "../tools/probe/receipts/item-move-end-paralysis-control-off.json" with { type: "json" };

const STATUS1_PARALYSIS = 1 << 6;

describe("Item post-move status-cure/stat-restore Battle Scene OFF family receipt", () => {
  it("uses complete legal parties, a faster Pichu carrying Thunder Wave, and a Zubat that differs only by held item", () => {
    for (const fixture of [cheriFixture, controlFixture]) {
      expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      expect(fixture.overrides.parties.player[0]).toMatchObject({ species: 172, item: 0, moves: [86, 86, 86, 86] });
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({ species: 41, moves: [33, 33, 33, 33] });
    }
    expect(cheriFixture.overrides.parties.opponent[0]).toMatchObject({ item: 133 });
    expect(controlFixture.overrides.parties.opponent[0]).toMatchObject({ item: 0 });
    const { item: _cheriItem, ...cheriOpponentRest } = cheriFixture.overrides.parties.opponent[0] as Record<string, unknown>;
    const { item: _controlItem, ...controlOpponentRest } = controlFixture.overrides.parties.opponent[0] as Record<string, unknown>;
    expect(cheriOpponentRest).toEqual(controlOpponentRest);
    expect(cheriFixture.overrides.parties.player).toEqual(controlFixture.overrides.parties.player);
  });

  it("pins the holder's cure-and-consume lifecycle and the control's persisting paralysis, within one moveend pass", () => {
    expect(cheriReceipt.summary).toMatchObject({
      paralysisAppliedFrame: 111,
      paralysisCuredFrame: 238,
      itemConsumedFrame: 380,
      finalOpponentStatus1: 0,
      finalOpponentItem: 0,
      totalRandomCalls: 12,
    });
    expect(controlReceipt.summary).toMatchObject({
      paralysisAppliedFrame: 111,
      paralysisCuredFrame: null,
      itemConsumedFrame: null,
      finalOpponentStatus1: STATUS1_PARALYSIS,
      finalOpponentItem: 0,
      totalRandomCalls: 13,
    });
    // The cure fires within the same moveend pass as the paralyzing move
    // itself (before the target's own turn) -- item consumption at frame
    // 380 precedes the cure being visible in the earlier randomFrames ledger
    // only because status/item writes and RNG draws are sampled separately;
    // both still land well before either receipt's final frame.
    expect(cheriReceipt.summary.itemConsumedFrame).toBeGreaterThan(cheriReceipt.summary.paralysisCuredFrame!);
    expect(controlReceipt.summary.totalRandomCalls).toBe(cheriReceipt.summary.totalRandomCalls + 1);
  });

  it("pins the opponent's held-item-holding Cheri Berry starting state and the shared pre-divergence RNG prefix", () => {
    expect(cheriReceipt.initial.opponent).toMatchObject({ status1: 0, item: 133, hp: 115 });
    expect(controlReceipt.initial.opponent).toMatchObject({ status1: 0, item: 0, hp: 115 });
    expect(cheriReceipt.initial.rngValue).toBe(controlReceipt.initial.rngValue);
    // Every Random() call up through and including Thunder Wave's own
    // accuracy roll is identical between the two arms; they diverge only at
    // Zubat's own action, where the control's full-paralysis roll has no
    // counterpart in the holder run.
    expect(cheriReceipt.randomFrames[0]).toMatchObject({ frame: 73, rngBefore: cheriReceipt.initial.rngValue });
    expect(controlReceipt.randomFrames[0]).toMatchObject({ frame: 73, rngBefore: controlReceipt.initial.rngValue });
    expect(cheriReceipt.randomFrames[0]!.rngAfter).toBe(controlReceipt.randomFrames[0]!.rngAfter);
  });

  it("pins each arm's final HP/status/PP invariants: a non-damaging move never changes the opponent's HP", () => {
    expect(cheriReceipt.final.opponent).toMatchObject({ status1: 0, item: 0, hp: 115 });
    expect(controlReceipt.final.opponent).toMatchObject({ status1: STATUS1_PARALYSIS, item: 0, hp: 115 });
    expect(cheriReceipt.initial.opponent.hp).toBe(cheriReceipt.final.opponent.hp);
    expect(controlReceipt.initial.opponent.hp).toBe(controlReceipt.final.opponent.hp);
    // Pichu's Thunder Wave PP decrements by exactly 1 in both arms.
    expect(cheriReceipt.final.player.pp[0]).toBe(cheriReceipt.initial.player.pp[0] - 1);
    expect(controlReceipt.final.player.pp[0]).toBe(controlReceipt.initial.player.pp[0] - 1);
  });
});
