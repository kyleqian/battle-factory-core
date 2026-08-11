import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.item.itemMoveEnd as Row;

describe("Item post-move status-cure/stat-restore Level-50 hook-join family", () => {
  it("enumerates all 116 selectors, promotes exactly 112, and leaves Assist/Metronome/Mirror Move/Sleep Talk explicit", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 116, blockers: [] });
    expect(audit.sourceMoveCandidates).toHaveLength(116);
    expect(audit.sourceProvenRows).toHaveLength(112);
    expect(audit.routeWitnesses).toHaveLength(112);
    expect(audit.sourceExceptionRows).toEqual([
      expect.objectContaining({
        id: "item-move-end-dynamic-dispatch:MOVE_ASSIST",
        move: "MOVE_ASSIST",
        reason: expect.stringMatching(/jumptocalledmove/),
      }),
      expect.objectContaining({
        id: "item-move-end-dynamic-dispatch:MOVE_METRONOME",
        move: "MOVE_METRONOME",
        reason: expect.stringMatching(/metronome opcode/),
      }),
      expect.objectContaining({
        id: "item-move-end-dynamic-dispatch:MOVE_MIRROR_MOVE",
        move: "MOVE_MIRROR_MOVE",
        reason: expect.stringMatching(/Cmd_trymirrormove/),
      }),
      expect.objectContaining({
        id: "item-move-end-dynamic-dispatch:MOVE_SLEEP_TALK",
        move: "MOVE_SLEEP_TALK",
        reason: expect.stringMatching(/jumptocalledmove/),
      }),
    ]);
    expect(audit.sourceProvenRows).not.toContain("MOVE_ASSIST");
    expect(audit.sourceProvenRows).not.toContain("MOVE_METRONOME");
    expect(audit.sourceProvenRows).not.toContain("MOVE_MIRROR_MOVE");
    expect(audit.sourceProvenRows).not.toContain("MOVE_SLEEP_TALK");
    expect(audit.sourceProvenRows).not.toContain("MOVE_COVET");
    expect(audit.sourceProvenRows).not.toContain("MOVE_TRICK");
    expect(audit.sourceProvenRows).not.toContain("MOVE_RECYCLE");
    expect(audit.sourceProvenRows).not.toContain("MOVE_KNOCK_OFF");
    expect(audit.sourceMoveCandidates.map((row: Row) => row.move)).not.toEqual(
      expect.arrayContaining(["MOVE_COVET", "MOVE_TRICK", "MOVE_RECYCLE", "MOVE_KNOCK_OFF"]),
    );
  });

  it("certifies each promoted entry through graph/program to a state-11-capable moveend handoff", () => {
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      const graph = family.entryPath.graph as Row;
      const program = family.entryPath.program as Row;
      expect(family.category).toBe("moveend-item-effects-all");
      expect(graph.route).toEqual(program.route);
      expect(graph.transitions).toEqual(program.transitions);
      const moveEndIndex = graph.route.findIndex((statement: Row) =>
        ["moveendall", "moveendto", "moveendfromto"].includes(statement.mnemonic),
      );
      expect(moveEndIndex).toBeGreaterThanOrEqual(0);
      expect(family.entryPath.moveEnd).toMatchObject({ state: "MOVEEND_ITEM_EFFECTS_ALL", stateValue: 11 });
      expect(family.dispatcher).toMatchObject({
        state: "MOVEEND_ITEM_EFFECTS_ALL",
        stateValue: 11,
        call: "ItemBattleEffects(ITEMEFFECT_MOVE_END, 0, FALSE)",
      });
      expect(family.selector.symbol).toBe(witness.move);
    }
  });

  it("pins the exact dispatcher state and the family verification receipt locators", () => {
    expect(audit.dispatcher).toMatchObject({
      call: "ItemBattleEffects(ITEMEFFECT_MOVE_END, 0, FALSE)",
      state: "MOVEEND_ITEM_EFFECTS_ALL",
      stateValue: 11,
    });
    for (const witness of audit.routeWitnesses as Row[]) {
      const verification = witness.familyEvidence.familyVerification as Row;
      expect(verification.batchTest).toBe("tests/itemMoveEndHookJoinBatch.test.ts");
      expect(verification.oracleReceipt).toBe("docs/item-move-end-family-ground-truth.md");
      expect(verification.oracleFixture).toBe("tools/battle-lab/mechanic-item-move-end-paralysis-cheri-off.json");
      expect(verification.oracleControlFixture).toBe("tools/battle-lab/mechanic-item-move-end-paralysis-control-off.json");
      expect(verification.oracleReceiptFiles).toEqual([
        "tools/probe/receipts/item-move-end-paralysis-cheri-off.json",
        "tools/probe/receipts/item-move-end-paralysis-control-off.json",
      ]);
    }
  });
});
