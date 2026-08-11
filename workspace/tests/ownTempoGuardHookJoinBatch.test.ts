import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.ability.ownTempoGuard as Row;

const OWN_TEMPO_GUARD_MOVES = ["MOVE_CONFUSE_RAY", "MOVE_SWEET_KISS", "MOVE_SWAGGER", "MOVE_FLATTER", "MOVE_TEETER_DANCE"];

describe("Pre-emptive Own Tempo confusion-guard Level-50 hook-join family", () => {
  it("enumerates exactly the five Rank-5 selectors and promotes all five, no exceptions", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 5, blockers: [], sourceExceptionRows: [] });
    expect(audit.sourceMoveCandidates.map((row: Row) => row.move)).toEqual(OWN_TEMPO_GUARD_MOVES);
    expect(audit.sourceProvenRows).toEqual(OWN_TEMPO_GUARD_MOVES);
    expect(audit.routeWitnesses).toHaveLength(5);
  });

  it("certifies each row through a graph/program route to its own jumpifability BS_TARGET, ABILITY_OWN_TEMPO guard", () => {
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      const graph = family.entryPath.graph as Row;
      const program = family.entryPath.program as Row;
      expect(family.category).toBe("own-tempo-guard");
      expect(family.selector.symbol).toBe(witness.move);
      expect(graph.route).toEqual(program.route);
      expect(graph.transitions).toEqual(program.transitions);
      const guardIndex = graph.route.findIndex((statement: Row) => statement.mnemonic === "jumpifability");
      expect(guardIndex).toBeGreaterThanOrEqual(0);
      expect(graph.route[guardIndex].operands).toContain("ABILITY_OWN_TEMPO");
      expect(typeof family.entryPath.guardLine).toBe("number");
      expect(family.dispatcher).toMatchObject({ locator: "Cmd_jumpifability", path: "reference/pokeemerald/src/battle_script_commands.c" });
      expect(family.familyVerification.oracleReceipt).toBe("docs/own-tempo-guard-family-ground-truth.md");
      expect(family.familyVerification.batchTest).toBe("tests/ownTempoGuardHookJoinBatch.test.ts");
    }
  });

  it("pins each row's redirect target -- BattleScript_TeeterDanceOwnTempoPrevents only for Teeter Dance", () => {
    const byMove = new Map((audit.routeWitnesses as Row[]).map((witness) => [witness.move, witness.familyEvidence.entryPath.redirect as string]));
    expect(byMove.get("MOVE_CONFUSE_RAY")).toBe("BattleScript_OwnTempoPrevents");
    expect(byMove.get("MOVE_SWEET_KISS")).toBe("BattleScript_OwnTempoPrevents");
    expect(byMove.get("MOVE_SWAGGER")).toBe("BattleScript_OwnTempoPrevents");
    expect(byMove.get("MOVE_FLATTER")).toBe("BattleScript_OwnTempoPrevents");
    expect(byMove.get("MOVE_TEETER_DANCE")).toBe("BattleScript_TeeterDanceOwnTempoPrevents");
  });

  it("Confuse Ray and Sweet Kiss share the identical entry script and guard line; the receipt pair is cited by both", () => {
    const byMove = new Map((audit.routeWitnesses as Row[]).map((witness) => [witness.move, witness.familyEvidence as Row]));
    const confuseRay = byMove.get("MOVE_CONFUSE_RAY")!;
    const sweetKiss = byMove.get("MOVE_SWEET_KISS")!;
    expect(confuseRay.entryPath.declaredEntryScript).toBe("BattleScript_EffectConfuse");
    expect(sweetKiss.entryPath.declaredEntryScript).toBe("BattleScript_EffectConfuse");
    expect(confuseRay.entryPath.guardLine).toBe(sweetKiss.entryPath.guardLine);
    for (const family of [confuseRay, sweetKiss]) {
      expect(family.familyVerification.oracleFixtures).toEqual([
        "tools/battle-lab/mechanic-own-tempo-guard-confuseray-block-off.json",
        "tools/battle-lab/mechanic-own-tempo-guard-confuseray-control-off.json",
      ]);
    }
    for (const move of ["MOVE_SWAGGER", "MOVE_FLATTER", "MOVE_TEETER_DANCE"]) {
      expect(byMove.get(move)?.familyVerification.oracleFixtures).toBeUndefined();
    }
  });
});
