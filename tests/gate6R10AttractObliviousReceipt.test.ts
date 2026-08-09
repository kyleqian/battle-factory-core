import { describe, expect, it } from "vitest";
import blockedFixture from "../tools/battle-lab/gate6-r10-attract-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/gate6-r10-attract-control-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-r10-attract-oblivious-off.json" with { type: "json" };

describe("Gate-6 R10 Attract / Oblivious Battle Scene OFF semantic receipt", () => {
  it("keeps the paired complete legal-party fixtures wired to the one variable ability slot", () => {
    for (const fixture of [blockedFixture, controlFixture]) {
      expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 1 });
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      expect(fixture.overrides.parties.opponent[0]).toMatchObject({ species: 394, moves: [213, 213, 213, 213], abilitySlot: 0, gender: "female" });
    }
    expect(blockedFixture.overrides.parties.player[0]).toMatchObject({ species: 108, moves: [45, 45, 45, 45], abilitySlot: 1, gender: "male" });
    expect(controlFixture.overrides.parties.player[0]).toMatchObject({ species: 108, moves: [45, 45, 45, 45], abilitySlot: 0, gender: "male" });
  });

  it("pins two fresh semantic OFF runs: Oblivious reveal/block versus the 0x20000 love control", () => {
    expect(receipt).toMatchObject({
      schema: "gate6-r10-attract-oblivious-off-semantic-receipt/v1",
      oracleProfile: "battle-scene-off",
      runner: "tools/run-mgba-probe.py",
      probe: "tools/probe/probe-gate6-r10-off.py",
      seed: 1,
      freshRunCount: 2,
      fixtures: {
        oblivious: "tools/battle-lab/gate6-r10-attract-off.json",
        control: "tools/battle-lab/gate6-r10-attract-control-off.json",
      },
    });
    expect(receipt.semanticAgreementAcrossFreshRuns).toEqual({
      oblivious: { targetAbility: 12, attractMoveId: 213, attractPp: [15, 14], lastUsedAbilityAtAttractMoveEnd: 12, targetStatus2: 0 },
      control: { targetAbility: 20, attractMoveId: 213, attractPp: [15, 14], targetStatus2: 131072, targetStatus2Hex: "0x20000" },
    });
    expect(receipt.observations.oblivious).toMatchObject({
      targetAbility: 12,
      gLastUsedAbilityAtAttractMoveEnd: 12,
      targetStatus2Before: 0,
      targetStatus2After: 0,
      attackerAttractPpBefore: 15,
      attackerAttractPpAfter: 14,
    });
    expect(receipt.observations.control).toMatchObject({
      targetAbility: 20,
      targetInfatuatedFrame: 71,
      targetStatus2Before: 0,
      targetStatus2After: 131072,
      targetStatus2AfterHex: "0x20000",
      attackerAttractPpBefore: 15,
      attackerAttractPpAfter: 14,
    });
    expect(receipt.assertions.join(" ")).toMatch(/semantic RAM observations only/);
  });
});
