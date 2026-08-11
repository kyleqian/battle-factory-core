import { describe, expect, it } from "vitest";
import receipt from "../tools/probe/receipts/gate6-r3-off.json" with { type: "json" };
import fixture from "../tools/battle-lab/gate6-r3-off.json" with { type: "json" };

describe("Gate-6 R3 Cloud Nine OFF semantic receipt", () => {
  it("keeps the legal parties and real switch route wired to the receipt", () => {
    expect(fixture).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    expect(fixture.overrides.parties.player).toHaveLength(3);
    expect(fixture.overrides.parties.opponent).toHaveLength(3);
    expect(fixture.overrides.parties.player[0]).toMatchObject({
      species: 55,
      abilitySlot: 1,
      moves: [240, 33, 33, 33],
    });
    expect(fixture.overrides.parties.player[1]).toMatchObject({
      species: 19,
      abilitySlot: 0,
      moves: [33, 33, 33, 33],
    });
    expect(fixture.overrides.parties.opponent[0]).toMatchObject({
      species: 385,
      abilitySlot: 0,
      moves: [311, 311, 311, 311],
    });
    expect(receipt.parties).toEqual({
      playerLead: { species: 55, abilitySlot: 1, ability: 13, moves: [240, 33, 33, 33] },
      playerSwitchIn: { species: 19, abilitySlot: 0, ability: 50 },
      weatherConsumer: { species: 385, abilitySlot: 0, ability: 59, moves: [311, 311, 311, 311] },
    });
  });

  it("pins two fresh byte-identical semantic runs and the suppression/removal/reactivation boundaries", () => {
    expect(receipt.schema).toBe("gate6-r3-off-semantic-receipt/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.scenario).toBe("tools/battle-lab/gate6-r3-off.json");
    expect(receipt.determinism).toMatchObject({
      freshRunCount: 2,
      artifactsCompared: ["manifest.json", "frame-*.png sorted by basename"],
      ignoredNondeterministicPaths: [],
      temporaryOutputDirectoryPrefixesExcludedFromPathNames: true,
      byteIdentical: true,
      manifestSha256: "e0fdd5103205c6f3313d06574dd05a9e180613562f8919a51debf3007a4bab60",
      capturePngBasenameSha256: "143f651f2ba31a82a1a7319b60a98c6e7982e23577ac201463a3e0a9e0b5d2b6",
    });

    const at = (frame: number) => {
      const checkpoint = receipt.checkpoints.find((candidate) => candidate.frame === frame);
      if (!checkpoint) throw new Error(`missing R3 checkpoint ${frame}`);
      return checkpoint;
    };
    const rain = at(258);
    expect(rain.weather).toBe(1);
    expect(rain.weatherTurns).toBe(5);
    expect(rain.player).toMatchObject({ partyIndex: 0, species: 55, ability: 13 });
    expect(rain.opponent).toMatchObject({ species: 385, ability: 59, types: [0, 0], currentMove: 311 });

    const switched = at(1150);
    expect(switched.weather).toBe(1);
    expect(switched.weatherTurns).toBe(4);
    expect(switched.player).toMatchObject({ partyIndex: 1, species: 19, ability: 50, types: [0, 0] });
    expect(switched.opponent.types).toEqual([0, 0]);

    const reactivated = at(1300);
    expect(reactivated.weather).toBe(1);
    expect(reactivated.weatherTurns).toBe(4);
    expect(reactivated.player).toMatchObject({ partyIndex: 1, species: 19, ability: 50 });
    expect(reactivated.opponent).toMatchObject({
      species: 385,
      ability: 59,
      types: [11, 11],
      currentMove: 0,
    });

    const consumer = at(1500);
    expect(consumer.weather).toBe(1);
    expect(consumer.weatherTurns).toBeGreaterThan(0);
    expect(consumer.opponent).toMatchObject({
      species: 385,
      types: [11, 11],
      currentMove: 311,
      pp: [10, 10, 9, 9],
    });
  });
});
