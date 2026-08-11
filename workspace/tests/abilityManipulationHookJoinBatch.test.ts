import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.ability.abilityManipulation as Row;

const CATEGORY_BY_MOVE: Record<string, string> = {
  MOVE_ROLE_PLAY: "ability-manipulation-roleplay",
  MOVE_SKILL_SWAP: "ability-manipulation-skillswap",
};

describe("Direct ability-manipulation opcode Level-50 hook-join family", () => {
  it("enumerates exactly the two Rank-4 selectors and promotes both, no exceptions", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 2, blockers: [], sourceExceptionRows: [] });
    expect(audit.sourceMoveCandidates.map((row: Row) => row.move)).toEqual(["MOVE_ROLE_PLAY", "MOVE_SKILL_SWAP"]);
    expect(audit.sourceProvenRows).toEqual(["MOVE_ROLE_PLAY", "MOVE_SKILL_SWAP"]);
    expect(audit.routeWitnesses).toHaveLength(2);
  });

  it("certifies each row through its own exact entry-script statement audit and dedicated opcode dispatcher -- not a shared moveend state", () => {
    const dispatcherLocators = new Set<string>();
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      expect(family.category).toBe(CATEGORY_BY_MOVE[witness.move]);
      expect(family.selector.symbol).toBe(witness.move);
      const graphStatements = family.entryPath.graph.statements as Row[];
      const programStatements = family.entryPath.program.statements as Row[];
      expect(graphStatements).toEqual(programStatements);
      expect(graphStatements.length).toBeGreaterThan(0);
      expect(typeof family.dispatcher.line).toBe("number");
      expect(family.dispatcher.path).toBe("reference/pokeemerald/src/battle_script_commands.c");
      dispatcherLocators.add(family.dispatcher.locator);
      expect(Array.isArray(family.runtimeGuardSignature.orderedGuards)).toBe(true);
      expect(family.runtimeGuardSignature.orderedGuards.length).toBeGreaterThan(0);
      expect(family.familyVerification.oracleReceipt).toBe("docs/ability-manipulation-family-ground-truth.md");
      expect(family.familyVerification.batchTest).toBe("tests/abilityManipulationHookJoinBatch.test.ts");
    }
    // Two distinct dispatchers -- like Rank-3 item-manipulation, this family
    // has no shared MOVEEND_* state across rows.
    expect(dispatcherLocators.size).toBe(2);
  });

  it("pins each move's exact opcode-terminated entry-script statement sequence", () => {
    const byMove = new Map((audit.routeWitnesses as Row[]).map((witness) => [witness.move, witness.familyEvidence.entryPath.graph.statements as Row[]]));
    expect(byMove.get("MOVE_ROLE_PLAY")?.map((s) => s.mnemonic)).toContain("trycopyability");
    expect(byMove.get("MOVE_SKILL_SWAP")?.map((s) => s.mnemonic)).toContain("tryswapabilities");
  });

  it("pins the pre-existing-vs-fresh evidence split named in the ground-truth doc", () => {
    const byMove = new Map((audit.routeWitnesses as Row[]).map((witness) => [witness.move, witness.familyEvidence.familyVerification as Row]));
    expect(byMove.get("MOVE_ROLE_PLAY")?.oracleFixtures).toEqual([
      "tools/battle-lab/mechanic-ability-manipulation-roleplay-copy-off.json",
      "tools/battle-lab/mechanic-ability-manipulation-roleplay-control-off.json",
    ]);
    expect(byMove.get("MOVE_ROLE_PLAY")?.preExistingEvidence).toBeUndefined();
    expect(byMove.get("MOVE_SKILL_SWAP")?.oracleFixtures).toBeUndefined();
    expect(byMove.get("MOVE_SKILL_SWAP")?.preExistingEvidence?.test).toBe("tests/skillSwapOracleEvidence.test.ts");
    expect(byMove.get("MOVE_SKILL_SWAP")?.preExistingDownstreamEvidence?.oracleReceipt).toBe("docs/immunity-abilities-ground-truth.md");
  });
});
