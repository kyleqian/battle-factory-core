import { describe, expect, it } from "vitest";
import receipt from "../tools/probe/receipts/gate6-r9-off.json" with { type: "json" };
import fixture from "../tools/battle-lab/gate6-r9-off.json" with { type: "json" };

describe("Gate-6 R9 Swagger × Lum/White Herb OFF semantic receipt", () => {
  it("keeps the complete legal parties and ordinary switch route wired to the receipt", () => {
    expect(fixture).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    expect(Object.keys(fixture.overrides)).toEqual(["parties"]);
    expect(fixture.overrides.parties.player).toHaveLength(3);
    expect(fixture.overrides.parties.opponent).toHaveLength(3);
    expect(fixture.overrides.parties.player.slice(0, 2)).toEqual([
      expect.objectContaining({ species: 68, item: 141, abilitySlot: 0, moves: [33, 33, 33, 33] }),
      expect.objectContaining({ species: 68, item: 180, abilitySlot: 0, moves: [33, 33, 33, 33] }),
    ]);
    expect(fixture.overrides.parties.opponent[0]).toMatchObject({
      species: 94,
      item: 0,
      abilitySlot: 0,
      moves: [207, 207, 207, 207],
    });
    expect(receipt.parties).toEqual({
      lumMachamp: { species: 68, item: 141, abilitySlot: 0, ability: 62, moves: [33, 33, 33, 33] },
      whiteHerbMachamp: { species: 68, item: 180, abilitySlot: 0, ability: 62, moves: [33, 33, 33, 33] },
      swaggerGengar: { species: 94, item: 0, abilitySlot: 0, ability: 26, moves: [207, 207, 207, 207] },
    });
  });

  it("pins two fresh byte-identical oracle artifacts and the compact semantic probe", () => {
    expect(receipt.schema).toBe("gate6-r9-off-semantic-receipt/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.scenario).toBe("tools/battle-lab/gate6-r9-off.json");
    expect(receipt.determinism).toEqual({
      freshRunCount: 2,
      artifactsCompared: ["manifest.json", "frame-*.png sorted by basename", "tools/run-mgba-probe.py compact semantic JSON"],
      ignoredNondeterministicPaths: [],
      temporaryOutputDirectoryPrefixesExcludedFromPathNames: true,
      manifestSha256: "d9e731373bf44be85fc088f14db98478f74bd715989aa435affcbc42532bfc11",
      capturePngBasenameSha256: "35bb8b2c46b8157bf1a4ab637b0ce3570193ccba9f3a82d5db596f96fe16a559",
      compactSemanticReceiptSha256: "05fcbde6df91d4fec842783f902e816a3fa7464c18f77021e8f5d6777ac1cc04",
      byteIdentical: true,
    });
  });

  it("receipts Lum's cure/consumption and White Herb's held confusion boundary in exact event order", () => {
    expect(receipt.messageEvents).toEqual([
      { frame: 43, text: "Foe GENGAR used\nSWAGGER!" },
      { frame: 200, text: "MACHAMP’s ATTACK\nsharply rose!" },
      { frame: 300, text: "MACHAMP became\nconfused!" },
      { frame: 429, text: "MACHAMP’s LUM BERRY\ncured its confusion problem!" },
      { frame: 1277, text: "Foe GENGAR used\nSWAGGER!" },
      { frame: 1434, text: "MACHAMP’s ATTACK\nsharply rose!" },
      { frame: 1534, text: "MACHAMP became\nconfused!" },
    ]);
    expect(receipt.messageEvents.some((event) => /WHITE HERB/i.test(event.text))).toBe(false);

    const { lumBoostAndCure, lumCureMessageBeforeConsumption, lumConsumed, whiteHerbSwitchIn,
      whiteHerbBoost, whiteHerbConfusedAndHeld, whiteHerbConfusionMessageAndHeld } = receipt.checkpoints;
    expect(lumBoostAndCure).toMatchObject({
      frame: 106,
      rngValue: 3690816045,
      player: { partyIndex: 0, item: 141, partyItems: [141, 180, 0], attackStage: 8, status2: 0, confusionTurns: 0 },
      opponent: { pp: [15, 14, 15, 15] },
    });
    expect(lumCureMessageBeforeConsumption).toMatchObject({
      frame: 429,
      rngValue: 983229340,
      player: { item: 141, partyItems: [141, 180, 0], attackStage: 8, status2: 0, confusionTurns: 0 },
    });
    expect(lumConsumed).toMatchObject({
      frame: 544,
      rngValue: 983229340,
      player: { item: 0, partyItems: [0, 180, 0], attackStage: 8, status2: 0, confusionTurns: 0 },
    });
    expect(whiteHerbSwitchIn).toMatchObject({
      frame: 1135,
      rngValue: 3031698222,
      player: { partyIndex: 1, item: 180, partyItems: [0, 180, 0], attackStage: 6, status2: 0, confusionTurns: 0 },
    });
    for (const checkpoint of [whiteHerbBoost, whiteHerbConfusedAndHeld, whiteHerbConfusionMessageAndHeld]) {
      expect(checkpoint.player.item).toBe(180);
      expect(checkpoint.player.partyItems).toEqual([0, 180, 0]);
      expect(checkpoint.player.attackStage).toBe(8);
    }
    expect(whiteHerbBoost).toMatchObject({ frame: 1340, rngValue: 530917129, player: { status2: 0, confusionTurns: 0 } });
    expect(whiteHerbConfusedAndHeld).toMatchObject({ frame: 1532, rngValue: 1160559944, player: { status2: 2, confusionTurns: 2 } });
    expect(whiteHerbConfusionMessageAndHeld).toMatchObject({ frame: 1534, rngValue: 1160559944, player: { status2: 2, confusionTurns: 2 } });
    expect(receipt.final).toMatchObject({
      frame: 1976,
      rngValue: 1636055286,
      player: { partyIndex: 1, item: 180, partyItems: [0, 180, 0], attackStage: 8, status2: 2, confusionTurns: 2 },
    });
  });

  it("pins the complete RNG ledger, including one stat/volatile draw for each Swagger", () => {
    expect(receipt.rngLedger).toEqual([
      { frame: 42, randomCalls: 1, rngBefore: 919694434, rngAfter: 3690816045, currentMove: 207, chosenMoveByBattler: [33, 207] },
      { frame: 298, randomCalls: 1, rngBefore: 3690816045, rngAfter: 983229340, currentMove: 207, chosenMoveByBattler: [33, 207] },
      { frame: 553, randomCalls: 1, rngBefore: 983229340, rngAfter: 3421819359, currentMove: 33, chosenMoveByBattler: [33, 207] },
      { frame: 576, randomCalls: 1, rngBefore: 3421819359, rngAfter: 1621732966, currentMove: 33, chosenMoveByBattler: [33, 207] },
      { frame: 579, randomCalls: 1, rngBefore: 1621732966, rngAfter: 2756097505, currentMove: 33, chosenMoveByBattler: [33, 207] },
      { frame: 716, randomCalls: 1, rngBefore: 2756097505, rngAfter: 1250713408, currentMove: 33, chosenMoveByBattler: [33, 207] },
      { frame: 726, randomCalls: 1, rngBefore: 1250713408, rngAfter: 1850371763, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 733, randomCalls: 5, rngBefore: 1850371763, rngAfter: 3031698222, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 1276, randomCalls: 1, rngBefore: 3031698222, rngAfter: 530917129, currentMove: 207, chosenMoveByBattler: [0, 207] },
      { frame: 1532, randomCalls: 1, rngBefore: 530917129, rngAfter: 1160559944, currentMove: 207, chosenMoveByBattler: [0, 207] },
      { frame: 1633, randomCalls: 1, rngBefore: 1160559944, rngAfter: 3278432283, currentMove: 0, chosenMoveByBattler: [0, 0] },
      { frame: 1640, randomCalls: 5, rngBefore: 3278432283, rngAfter: 1636055286, currentMove: 0, chosenMoveByBattler: [0, 0] },
    ]);
  });
});
