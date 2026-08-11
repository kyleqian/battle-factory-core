import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.item.itemManipulation as Row;

const CATEGORY_BY_MOVE: Record<string, string> = {
  MOVE_COVET: "item-manipulation-steal",
  MOVE_TRICK: "item-manipulation-swap",
  MOVE_RECYCLE: "item-manipulation-recycle",
  MOVE_KNOCK_OFF: "item-manipulation-knockoff",
};

describe("Direct item-manipulation opcode Level-50 hook-join family", () => {
  it("enumerates exactly the four Rank-3 selectors and promotes all four, no exceptions", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 4, blockers: [], sourceExceptionRows: [] });
    expect(audit.sourceMoveCandidates.map((row: Row) => row.move)).toEqual(["MOVE_COVET", "MOVE_TRICK", "MOVE_RECYCLE", "MOVE_KNOCK_OFF"]);
    expect(audit.sourceProvenRows).toEqual(["MOVE_COVET", "MOVE_TRICK", "MOVE_RECYCLE", "MOVE_KNOCK_OFF"]);
    expect(audit.routeWitnesses).toHaveLength(4);
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
      expect(family.familyVerification.oracleReceipt).toBe("docs/item-manipulation-family-ground-truth.md");
      expect(family.familyVerification.batchTest).toBe("tests/itemManipulationHookJoinBatch.test.ts");
    }
    // Four distinct dispatchers -- the defining shape difference from every
    // other item-axis family, which shares one MOVEEND_* state across rows.
    expect(dispatcherLocators.size).toBe(4);
  });

  it("pins each move's exact opcode-terminated entry-script statement sequence", () => {
    const byMove = new Map((audit.routeWitnesses as Row[]).map((witness) => [witness.move, witness.familyEvidence.entryPath.graph.statements as Row[]]));
    expect(byMove.get("MOVE_COVET")?.map((s) => s.mnemonic)).toEqual(["setmoveeffect", "goto"]);
    expect(byMove.get("MOVE_KNOCK_OFF")?.map((s) => s.mnemonic)).toEqual(["setmoveeffect", "goto"]);
    expect(byMove.get("MOVE_TRICK")?.map((s) => s.mnemonic)).toContain("tryswapitems");
    expect(byMove.get("MOVE_RECYCLE")?.map((s) => s.mnemonic)).toContain("tryrecycleitem");
  });

  it("pins the pre-existing-vs-fresh evidence split named in the ground-truth doc", () => {
    const byMove = new Map((audit.routeWitnesses as Row[]).map((witness) => [witness.move, witness.familyEvidence.familyVerification as Row]));
    expect(byMove.get("MOVE_COVET")?.oracleFixtures).toEqual([
      "tools/battle-lab/mechanic-item-manipulation-covet-steal-off.json",
      "tools/battle-lab/mechanic-item-manipulation-covet-control-off.json",
    ]);
    expect(byMove.get("MOVE_COVET")?.preExistingEvidence?.test).toBe("tests/familyBCluster4OracleEvidence.test.ts");
    expect(byMove.get("MOVE_RECYCLE")?.oracleFixtures).toEqual([
      "tools/battle-lab/mechanic-item-manipulation-recycle-restore-off.json",
      "tools/battle-lab/mechanic-item-manipulation-recycle-control-off.json",
    ]);
    expect(byMove.get("MOVE_RECYCLE")?.preExistingEvidence).toBeUndefined();
    expect(byMove.get("MOVE_TRICK")?.oracleFixtures).toBeUndefined();
    expect(byMove.get("MOVE_TRICK")?.preExistingEvidence?.test).toBe("tests/trickOracleEvidence.test.ts");
    expect(byMove.get("MOVE_KNOCK_OFF")?.oracleFixtures).toBeUndefined();
    expect(byMove.get("MOVE_KNOCK_OFF")?.preExistingEvidence?.test).toBe("tests/familyBCluster4OracleEvidence.test.ts");
  });
});
