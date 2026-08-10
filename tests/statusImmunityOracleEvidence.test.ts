import { describe, expect, it } from "vitest";
import fixture from "../tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json" with { type: "json" };
import receiptA from "../tools/probe/receipts/immunity-limber-off-seed-610839776.json" with { type: "json" };
import receiptB from "../tools/probe/receipts/immunity-limber-off-seed-324508639.json" with { type: "json" };

describe("Status-immunity ability Battle Scene OFF family receipt", () => {
  it("uses complete legal parties staging a Girafarig Skill Swap onto a Limber Hitmonlee", () => {
    expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off" });
    expect(fixture.overrides.parties.player).toHaveLength(3);
    expect(fixture.overrides.parties.opponent).toHaveLength(3);
    expect(fixture.overrides.parties.player[0]).toMatchObject({ species: 203, moves: [60, 23, 273, 285] });
    expect(fixture.overrides.parties.opponent[0]).toMatchObject({ species: 106, moves: [86, 86, 86, 86] });
  });

  it("pins both seeds' status-stage/ability-swap/cure checkpoints and Random() ledgers byte-precisely", () => {
    for (const [receipt, seed] of [
      [receiptA, 610839776],
      [receiptB, 324508639],
    ] as const) {
      expect(receipt.seed).toBe(seed);
      expect(receipt.checkpoints.statusStaged).toMatchObject({
        frame: 183,
        battleStatus1: { player: 64 },
        partyStatus1: { player: [64, 0, 0] },
        activeAbility: { player: 39 },
      });
      expect(receipt.checkpoints.abilitySwapped).toMatchObject({
        frame: 345,
        battleStatus1: { player: 64 },
        activeAbility: { player: 7, opponent: 39 },
        persistentAbility: { player: 39, opponent: 7 },
      });
      expect(receipt.checkpoints.statusCured).toMatchObject({
        frame: 494,
        battleStatus1: { player: 0 },
        partyStatus1: { player: [0, 0, 0] },
        activeAbility: { player: 7 },
      });
      expect(receipt.checkpoints.cureMessage).toMatchObject({ frame: 495 });
      expect(receipt.checkpoints.cureMessage.displayedString).toContain("LIMBER");
      expect(receipt.checkpoints.cureMessage.displayedString).toContain("cured its paralysis p");
      expect(receipt.randomFrames.map((row) => [row.frame, row.randomCalls])).toEqual([
        [145, 1],
        [315, 1],
      ]);
      expect(receipt.randomFrames.map((row) => row.sourceAttribution)).toEqual([
        "Factory AI equal-slot choice (all four slots are THUNDER_WAVE)",
        "BattleScript_MoveUsedIsParalyzed Random() % 4 mobility check",
      ]);
      expect(receipt.final.pp.player).toEqual([20, 20, 10, 9]);
      expect(receipt.final.pp.opponent).toEqual([20, 20, 20, 19]);
    }
    expect(receiptA.randomFrames[0]!.rngBefore).toBe(3872647298);
    expect(receiptB.randomFrames[0]!.rngBefore).toBe(3908550445);
  });
});
