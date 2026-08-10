import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.ability.immunity as Row;

describe("Status-immunity ability Level-50 hook-join family", () => {
  it("enumerates all 99 selectors, promotes exactly 97, and leaves Assist/Metronome explicit", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 99, blockers: [] });
    expect(audit.sourceMoveCandidates).toHaveLength(99);
    expect(audit.sourceProvenRows).toHaveLength(97);
    expect(audit.routeWitnesses).toHaveLength(97);
    expect(audit.sourceExceptionRows).toEqual([
      expect.objectContaining({
        id: "immunity-dynamic-dispatch:MOVE_ASSIST",
        move: "MOVE_ASSIST",
        reason: expect.stringMatching(/jumptocalledmove/),
      }),
      expect.objectContaining({
        id: "immunity-dynamic-dispatch:MOVE_METRONOME",
        move: "MOVE_METRONOME",
        reason: expect.stringMatching(/metronome opcode/),
      }),
    ]);
    expect(audit.sourceProvenRows).not.toContain("MOVE_ASSIST");
    expect(audit.sourceProvenRows).not.toContain("MOVE_SKILL_SWAP");
    expect(audit.sourceProvenRows).not.toContain("MOVE_ROLE_PLAY");
    expect(audit.sourceProvenRows).not.toContain("MOVE_CONFUSE_RAY");
    expect(audit.sourceProvenRows).not.toContain("MOVE_TEETER_DANCE");
  });

  it("certifies each promoted entry through graph/program to a state-4-capable moveend handoff", () => {
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      const graph = family.entryPath.graph as Row;
      const program = family.entryPath.program as Row;
      expect(family.category).toBe("moveend-immunity-abilities");
      expect(graph.route).toEqual(program.route);
      expect(graph.transitions).toEqual(program.transitions);
      const moveEndIndex = graph.route.findIndex((statement: Row) =>
        ["moveendall", "moveendto", "moveendfromto"].includes(statement.mnemonic),
      );
      expect(moveEndIndex).toBeGreaterThanOrEqual(0);
      expect(family.entryPath.moveEnd).toMatchObject({ state: "MOVEEND_IMMUNITY_ABILITIES", stateValue: 4 });
      expect(family.dispatcher).toMatchObject({
        state: "MOVEEND_IMMUNITY_ABILITIES",
        stateValue: 4,
        call: "AbilityBattleEffects(ABILITYEFFECT_IMMUNITY, 0, 0, 0, 0)",
      });
      expect(family.selector.symbol).toBe(witness.move);
    }
  });

  it("pins the exact dispatcher state and the family verification receipt locators", () => {
    expect(audit.dispatcher).toMatchObject({
      call: "AbilityBattleEffects(ABILITYEFFECT_IMMUNITY, 0, 0, 0, 0)",
      state: "MOVEEND_IMMUNITY_ABILITIES",
      stateValue: 4,
    });
    for (const witness of audit.routeWitnesses as Row[]) {
      const verification = witness.familyEvidence.familyVerification as Row;
      expect(verification.batchTest).toBe("tests/statusImmunityHookJoinBatch.test.ts");
      expect(verification.oracleReceipt).toBe("docs/immunity-abilities-ground-truth.md");
      expect(verification.oracleFixture).toBe("tools/battle-lab/mechanic-immunity-limber-skill-swap-off.json");
      expect(verification.oracleReceiptFiles).toEqual([
        "tools/probe/receipts/immunity-limber-off-seed-610839776.json",
        "tools/probe/receipts/immunity-limber-off-seed-324508639.json",
      ]);
    }
  });
});
