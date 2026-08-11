import { describe, expect, it } from "vitest";
import receipt from "../tools/probe/receipts/gate6-r12-off.json" with { type: "json" };
import fixture from "../tools/battle-lab/gate6-r12-off.json" with { type: "json" };

describe("Gate-6 R12 Hyper Cutter × White Herb OFF semantic receipt", () => {
  it("keeps the complete legal three-mon parties and ordinary replacement route wired to the receipt", () => {
    expect(fixture).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
    expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
    expect(fixture.overrides.parties.player).toHaveLength(3);
    expect(fixture.overrides.parties.opponent).toHaveLength(3);
    expect(fixture.overrides.parties.player[0]).toMatchObject({
      species: 127,
      item: 180,
      abilitySlot: 0,
      moves: [332, 332, 332, 332],
    });
    expect(fixture.overrides.parties.opponent.slice(0, 2)).toEqual([
      expect.objectContaining({ species: 303, item: 0, abilitySlot: 0, moves: [33, 33, 33, 33] }),
      expect.objectContaining({ species: 210, item: 0, abilitySlot: 0, moves: [33, 33, 33, 33] }),
    ]);
    expect(receipt.parties).toEqual({
      whiteHerbPinsir: { species: 127, item: 180, abilitySlot: 0, ability: 52, moves: [332, 332, 332, 332] },
      leadOpponent: { species: 303, item: 0, abilitySlot: 0, ability: 25, moves: [33, 33, 33, 33] },
      switchInGranbull: { species: 210, item: 0, abilitySlot: 0, ability: 22, moves: [33, 33, 33, 33] },
    });
  });

  it("pins two fresh byte-identical oracle artifact trees and compact mGBA probes", () => {
    expect(receipt.schema).toBe("gate6-r12-off-semantic-receipt/v1");
    expect(receipt.fixture).toBe("tools/battle-lab/gate6-r12-off.json");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.determinism).toEqual({
      freshRunCount: 2,
      artifactsCompared: ["manifest.json", "frame-*.png sorted by basename", "tools/run-mgba-probe.py compact semantic JSON"],
      ignoredNondeterministicPaths: [],
      temporaryOutputDirectoryPrefixesExcludedFromPathNames: true,
      manifestSha256: "9d1327b7584a4890fda18dc0fc00a8d33176d7a42c88acc3e5e76f55e2f3242b",
      capturePngBasenameSha256: "e2a60afd784484d0f6cdd511b96e938ee90a9fd45ebc591e08190379bf73b699",
      compactSemanticReceiptSha256: "381c6fb3aa05d7a3d4bfd90203fc52c63976fc999c60405fd8b3ff8764847ab5",
      byteIdentical: true,
    });
  });

  it("proves Granbull's real replacement gets to Hyper Cutter before White Herb dispatch", () => {
    expect(receipt.messageEvents).toEqual([
      { frame: 43, text: "PINSIR used\nAERIAL ACE!" },
      { frame: 373, text: "Foe SHEDINJA\nfainted!\n" },
      { frame: 521, text: "BLACK BELT SHIZUKA sent\nout GRANBULL!" },
      { frame: 742, text: "PINSIR’s HYPER CUTTER\nprevented Foe GRANBULL’s\nINTIMIDATE from working!" },
    ]);
    expect(receipt.messageEvents.some((event) => /WHITE HERB/i.test(event.text))).toBe(false);
    expect(receipt.controllerEvents).toEqual([
      { frame: 517, kind: "party-index-selected-before-battle-data-copy", activeBattler: 1, execFlags: 2, playerCommand: 53, opponentCommand: 0 },
      { frame: 519, kind: "incoming-granbull-battle-data-loaded", activeBattler: 2, execFlags: 0, playerCommand: 53, opponentCommand: 0 },
      { frame: 742, kind: "intimidate-prevention-message", activeBattler: 2, execFlags: 1, playerCommand: 16, opponentCommand: 5 },
      { frame: 826, kind: "post-entry-controller-idle", activeBattler: 2, execFlags: 0, playerCommand: 16, opponentCommand: 5 },
    ]);

    const { leadFainted, granbullPartyIndexSelected, granbullEntryDataLoaded,
      granbullIntimidatePrevention, postEntrySettled } = receipt.checkpoints;
    expect(leadFainted).toMatchObject({
      frame: 197,
      rngValue: 983229340,
      player: { item: 180, partyItems: [180, 0, 0], attackStage: 6, hp: 172, status1: 0, status2: 0, status3: 0 },
      opponent: { partyIndex: 0, species: 303, ability: 25, hp: 0 },
    });
    expect(granbullPartyIndexSelected).toMatchObject({
      frame: 517,
      rngValue: 3421819359,
      player: { item: 180, partyItems: [180, 0, 0], attackStage: 6, hp: 172, status1: 0, status2: 0, status3: 0 },
      opponent: { partyIndex: 1, species: 303, ability: 0, hp: 0 },
    });
    expect(granbullEntryDataLoaded).toMatchObject({
      frame: 519,
      rngValue: 3421819359,
      player: { item: 180, partyItems: [180, 0, 0], attackStage: 6, hp: 172, status1: 0, status2: 0, status3: 0 },
      opponent: { partyIndex: 1, species: 210, ability: 22, hp: 165, maxHp: 165, status1: 0, status2: 0, status3: 0 },
    });
    for (const checkpoint of [granbullIntimidatePrevention, postEntrySettled]) {
      expect(checkpoint.player).toMatchObject({
        partyIndex: 0,
        species: 127,
        ability: 52,
        item: 180,
        partyItems: [180, 0, 0],
        attackStage: 6,
        hp: 172,
        maxHp: 172,
        status1: 0,
        status2: 0,
        status3: 0,
      });
      expect(checkpoint.opponent).toMatchObject({ partyIndex: 1, species: 210, ability: 22, hp: 165, maxHp: 165 });
    }
    expect(granbullIntimidatePrevention).toMatchObject({ frame: 742, rngValue: 3421819359 });
    expect(postEntrySettled).toMatchObject({ frame: 826, rngValue: 3421819359, controller: { execFlags: 0 } });
    expect(receipt.final).toMatchObject({
      rngValue: 2682491093,
      player: { item: 180, partyItems: [180, 0, 0], attackStage: 6, hp: 172, status1: 0, status2: 0, status3: 0 },
      opponent: { partyIndex: 1, species: 210, ability: 22, hp: 165, maxHp: 165, status1: 0, status2: 0, status3: 0 },
    });
  });

  it("pins the complete RNG ledger around the prevention control", () => {
    expect(receipt.rngLedger).toEqual([
      { frame: 68, randomCalls: 1, rngBefore: 919694434, rngAfter: 3690816045, currentMove: 332, chosenMoveByBattler: [332, 33] },
      { frame: 71, randomCalls: 1, rngBefore: 3690816045, rngAfter: 983229340, currentMove: 332, chosenMoveByBattler: [332, 33] },
      { frame: 287, randomCalls: 1, rngBefore: 983229340, rngAfter: 3421819359, currentMove: 332, chosenMoveByBattler: [332, 33] },
      { frame: 901, randomCalls: 1, rngBefore: 3421819359, rngAfter: 1621732966, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 908, randomCalls: 4, rngBefore: 1621732966, rngAfter: 3034451114, currentMove: 33, chosenMoveByBattler: [0, 0] },
      { frame: 911, randomCalls: 1, rngBefore: 3034451114, rngAfter: 2682491093, currentMove: 0, chosenMoveByBattler: [0, 0] },
    ]);
  });
});
