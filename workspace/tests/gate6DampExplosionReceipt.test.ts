import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import control from "../tools/battle-lab/gate6-damp-explosion-control-off.json" with { type: "json" };
import targetDamp from "../tools/battle-lab/gate6-damp-explosion-target-off.json" with { type: "json" };
import attackerDamp from "../tools/battle-lab/gate6-damp-explosion-attacker-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/gate6-damp-explosion-off.json" with { type: "json" };

describe("Gate-6 Explosion / Damp Battle Scene OFF receipt", () => {
  it("uses three complete legal-party fixtures with only the active Damp holder varied", () => {
    for (const fixture of [control, targetDamp, attackerDamp]) {
      expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 305419897 });
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      expect(fixture.overrides.parties.player[0].moves).toEqual([153, 153, 153, 153]);
    }
    expect(targetDamp.overrides.parties.opponent[0]).toMatchObject({ species: 54, abilitySlot: 0 });
    expect(attackerDamp.overrides.parties.player[0]).toMatchObject({ species: 54, abilitySlot: 0 });
  });

  it("pins two byte-identical fresh runs of all three PP/HP/RNG/owner arms", () => {
    expect(receipt).toMatchObject({ oracleProfile: "battle-scene-off", freshRunCountPerArm: 2, byteIdenticalAcrossFreshRuns: true });
    expect(receipt.observations.control).toEqual({ move: 153, pp: [5, 4], attackerHp: [155, 0], targetHp: [95, 44], rng: [960307641, 2797792354], actionRngCalls: 3, target: 1, abilityHistory: [0, 0, 0, 0], dampFailureScript: false });
    expect(receipt.observations.targetDamp).toEqual({ move: 153, pp: [5, 4], attackerHp: [155, 155], targetHp: [125, 125], rng: [960307641, 960307641], actionRngCalls: 0, target: 1, lastUsedAbility: 6, abilityHistory: [0, 6, 0, 0], script: "BattleScript_DampStopsExplosion" });
    expect(receipt.observations.attackerDamp).toEqual({ move: 153, pp: [5, 4], attackerHp: [125, 125], targetHp: [95, 95], rng: [3167892961, 3167892961], actionRngCalls: 0, target: 0, lastUsedAbility: 6, abilityHistory: [6, 0, 0, 0], script: "BattleScript_DampStopsExplosion" });
    expect(receipt.probeOutputSha256).toEqual({ control: expect.stringMatching(/^[0-9a-f]{64}$/), targetDamp: expect.stringMatching(/^[0-9a-f]{64}$/), attackerDamp: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it("keeps public attacker-held message identity attached to the existing main proof", () => {
    const publicProof = readFileSync("tests/presentationStringIssue72Batch2.test.ts", "utf8");
    expect(receipt.publicMessageIdentityProof).toContain("presentationStringIssue72Batch2.test.ts");
    expect(publicProof).toContain("snapshots and resolves attacker-held Damp instead of the ordinary opposing defender");
    expect(publicProof).toContain("STRINGID_PKMNPREVENTSUSAGE");
  });
});
