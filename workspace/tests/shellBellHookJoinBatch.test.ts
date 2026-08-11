import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.item.shellBell as Row;

describe("Shell Bell Level-50 hook-join family", () => {
  it("enumerates all 183 power != 0 selectors, promotes exactly 182, and leaves Future Sight explicit", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 183, blockers: [] });
    expect(audit.sourceMoveCandidates).toHaveLength(183);
    expect(audit.sourceProvenRows).toHaveLength(182);
    expect(audit.routeWitnesses).toHaveLength(182);
    expect(audit.sourceExceptionRows).toEqual([expect.objectContaining({
      id: "shell-bell-ignore:MOVE_FUTURE_SIGHT",
      move: "MOVE_FUTURE_SIGHT",
      reason: expect.stringMatching(/IGNORE_SHELL_BELL/),
    })]);
    expect(audit.sourceProvenRows).not.toContain("MOVE_FUTURE_SIGHT");
  });

  it("certifies each promoted entry through graph/program target damage and MOVEEND state 12 with fallthrough preserved", () => {
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      const graph = family.entryPath.graph as Row;
      const program = family.entryPath.program as Row;
      expect(family.category).toBe("moveend-shell-bell");
      expect(graph.route).toEqual(program.route);
      expect(graph.transitions).toEqual(program.transitions);
      const dataIndex = graph.route.findIndex((statement: Row) => statement.mnemonic === "datahpupdate" && statement.operands[0] === "BS_TARGET");
      const moveEndIndex = graph.route.findIndex((statement: Row) => ["moveendall", "moveendto", "moveendfromto"].includes(statement.mnemonic));
      expect(dataIndex).toBeGreaterThanOrEqual(0);
      expect(moveEndIndex).toBeGreaterThan(dataIndex);
      expect(family.entryPath.moveEnd).toMatchObject({ state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12 });
      expect(family.dispatcher).toMatchObject({ state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12, call: "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)" });
      expect(family.selector).toMatchObject({ guard: "gBattleMoves[move].power != 0" });
    }
  });

  it("King's Rock's 105 promoted rows are a full subset of Shell Bell's 182, without sharing the flinch flag selector", () => {
    const kingsRock = manifest.coverage.hookCatalogs.item.kingsRock as Row;
    const shellBellRows = new Set(audit.sourceProvenRows as string[]);
    for (const move of kingsRock.sourceProvenRows as string[]) {
      expect(shellBellRows.has(move)).toBe(true);
    }
    expect(audit.sourceProvenRows.length).toBeGreaterThan(kingsRock.sourceProvenRows.length);
  });

  it("pins the exact ordered guard order and King's Rock boundary", () => {
    expect(audit.runtimeGuardSignature.orderedGuards).toEqual([
      "gBattleMoveDamage != 0",
      "atkHoldEffect == HOLD_EFFECT_SHELL_BELL",
      "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "gSpecialStatuses[gBattlerTarget].shellBellDmg != 0",
      "gSpecialStatuses[gBattlerTarget].shellBellDmg != IGNORE_SHELL_BELL",
      "gBattlerAttacker != gBattlerTarget",
      "gBattleMons[gBattlerAttacker].hp != gBattleMons[gBattlerAttacker].maxHP",
      "gBattleMons[gBattlerAttacker].hp != 0",
    ]);
    expect(JSON.stringify(audit.runtimeGuardSignature.orderedGuards)).not.toContain("Random()");
    expect(audit.runtimeGuardSignature.holdEffect).toEqual({ item: "ITEM_SHELL_BELL", effect: "HOLD_EFFECT_SHELL_BELL", parameter: 8 });
    expect(audit.runtimeGuardSignature.scopeBoundary).toMatch(/HOLD_EFFECT_FLINCH.*is not promoted/);
  });
});
