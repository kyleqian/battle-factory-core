import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import covetStealFixture from "../tools/battle-lab/mechanic-item-manipulation-covet-steal-off.json" with { type: "json" };
import covetControlFixture from "../tools/battle-lab/mechanic-item-manipulation-covet-control-off.json" with { type: "json" };
import covetStealReceipt from "../tools/probe/receipts/item-manipulation-covet-steal-off.json" with { type: "json" };
import covetControlReceipt from "../tools/probe/receipts/item-manipulation-covet-control-off.json" with { type: "json" };
import recycleRestoreFixture from "../tools/battle-lab/mechanic-item-manipulation-recycle-restore-off.json" with { type: "json" };
import recycleControlFixture from "../tools/battle-lab/mechanic-item-manipulation-recycle-control-off.json" with { type: "json" };
import recycleRestoreReceipt from "../tools/probe/receipts/item-manipulation-recycle-restore-off.json" with { type: "json" };
import recycleControlReceipt from "../tools/probe/receipts/item-manipulation-recycle-control-off.json" with { type: "json" };

const CHERI_BERRY = 133;
const WHITE_HERB = 180;

describe("Direct item-manipulation opcode family -- fresh Battle Scene OFF receipts (Covet, Recycle)", () => {
  it("Covet: Linoone (itemless vs occupied-attacker White Herb control) steals Zubat's Cheri Berry", () => {
    for (const fixture of [covetStealFixture, covetControlFixture]) {
      expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      expect(fixture.overrides.parties.player[0]).toMatchObject({ species: 289, moves: [343, 343, 343, 343] });
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({ species: 41, item: CHERI_BERRY, moves: [33, 33, 33, 33] });
    }
    expect(covetStealFixture.overrides.parties.player[0]).toMatchObject({ item: 0 });
    expect(covetControlFixture.overrides.parties.player[0]).toMatchObject({ item: WHITE_HERB });

    expect(covetStealReceipt.summary).toEqual({
      attackerItemTransitionFrame: 332,
      attackerPartyItemTransitionFrame: 191,
      defenderItemTransitionFrame: 191,
      defenderPartyItemTransitionFrame: 191,
      totalRandomCalls: 14,
    });
    expect(covetControlReceipt.summary).toEqual({
      attackerItemTransitionFrame: null,
      attackerPartyItemTransitionFrame: null,
      defenderItemTransitionFrame: null,
      defenderPartyItemTransitionFrame: null,
      totalRandomCalls: 14,
    });
    // The occupied-attacker guard is a deterministic branch (no extra Random()
    // gate): both arms consume exactly the same RNG call count.
    expect(covetControlReceipt.summary.totalRandomCalls).toBe(covetStealReceipt.summary.totalRandomCalls);

    expect(covetStealReceipt.initial.opponent).toMatchObject({ item: CHERI_BERRY, hp: 115 });
    expect(covetStealReceipt.final.opponent).toMatchObject({ item: 0, hp: 72 });
    expect(covetStealReceipt.final.player).toMatchObject({ item: CHERI_BERRY, hp: 141 });
    // Live attacker item (deferred MOVEEND_CHANGED_ITEMS commit) lags the
    // immediate party-record sync -- both fire at the same frame for the
    // target, but the attacker's live/party writes split by design.
    expect(covetStealReceipt.summary.attackerItemTransitionFrame).toBeGreaterThan(covetStealReceipt.summary.attackerPartyItemTransitionFrame!);

    expect(covetControlReceipt.final.player).toMatchObject({ item: WHITE_HERB });
    expect(covetControlReceipt.final.opponent).toMatchObject({ item: CHERI_BERRY, hp: 72 });
    // Covet's damage still lands identically whether or not the steal itself executes.
    expect(covetControlReceipt.final.opponent.hp).toBe(covetStealReceipt.final.opponent.hp);
  });

  it("Recycle: Zubat's Cheri Berry, consumed curing paralysis, is restored; an itemless control no-ops", () => {
    expect(recycleRestoreFixture.overrides.parties.opponent[0]).toMatchObject({ species: 41, item: CHERI_BERRY, moves: [278, 278, 278, 278] });
    expect(recycleControlFixture.overrides.parties.opponent[0]).toMatchObject({ species: 41, item: 0, moves: [278, 278, 278, 278] });

    expect(recycleRestoreReceipt.summary).toEqual({
      itemTransitionFrame: 380,
      partyItemTransitionFrame: 380,
      paralysisAppliedFrame: 111,
      totalRandomCalls: 7,
    });
    expect(recycleControlReceipt.summary).toEqual({
      itemTransitionFrame: null,
      partyItemTransitionFrame: null,
      paralysisAppliedFrame: null,
      totalRandomCalls: 10,
    });

    expect(recycleRestoreReceipt.initial.opponent).toMatchObject({ item: CHERI_BERRY, status1: 0, hp: 115 });
    expect(recycleRestoreReceipt.final.opponent).toMatchObject({ item: CHERI_BERRY, status1: 0, hp: 115 });
    // Restore fires within the same-turn cure+consume window, well before the receipt's final frame.
    expect(recycleRestoreReceipt.summary.itemTransitionFrame).toBeGreaterThan(recycleRestoreReceipt.summary.paralysisAppliedFrame!);

    expect(recycleControlReceipt.initial.opponent).toMatchObject({ item: 0, status1: 0 });
    expect(recycleControlReceipt.final.opponent).toMatchObject({ item: 0, status1: 0 });
    // The itemless control never triggers Thunder Wave staging or a Recycle
    // restore -- Recycle's own precondition (usedHeldItems != ITEM_NONE) is
    // never populated, so it silently no-ops every use.
  });

  it("cites the Cmd_tryrecycleitem precondition/immediate-assignment source shape this receipt exercises", () => {
    const commands = readFileSync(new URL("../reference/pokeemerald/src/battle_script_commands.c", import.meta.url), "utf8");
    expect(commands).toContain("static void Cmd_tryrecycleitem(void)");
    expect(commands).toMatch(/usedHeldItem = &gBattleStruct->usedHeldItems\[gActiveBattler\];[\s\S]*?\*usedHeldItem != ITEM_NONE && gBattleMons\[gActiveBattler\]\.item == ITEM_NONE[\s\S]*?gLastUsedItem = \*usedHeldItem;[\s\S]*?\*usedHeldItem = ITEM_NONE;[\s\S]*?gBattleMons\[gActiveBattler\]\.item = gLastUsedItem;/);
  });
});

describe("Direct item-manipulation opcode family -- pre-existing Trick/Knock Off evidence (not restaged)", () => {
  it("references, and does not duplicate, the 2026-07-28 Trick and family-B Cluster-4 (Covet/Knock Off) receipts", () => {
    // Trick and Knock Off already carry deterministic committed-request +
    // reproducible-receipt evidence landed before this family existed; see
    // docs/item-manipulation-family-ground-truth.md section 0 for the full
    // inventory this test cites rather than re-derives.
    const trickTest = readFileSync(new URL("./trickOracleEvidence.test.ts", import.meta.url), "utf8");
    expect(trickTest).toContain("Battle Scene OFF Trick / tryswapitems evidence");
    expect(trickTest).toContain("trick-off-evidence.json");

    const clusterTest = readFileSync(new URL("./familyBCluster4OracleEvidence.test.ts", import.meta.url), "utf8");
    expect(clusterTest).toContain("family-B Cluster-4 item-motion receipts");
    expect(clusterTest).toContain("knockOffRemovalAndNoItem");
    expect(clusterTest).toContain("covetSuccessAndOccupiedAttacker");
  });
});
