import { describe, expect, it } from "vitest";
import data from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };

type Row = Record<string, any>;
const manifest = data as unknown as Row;
const audit = manifest.coverage.hookCatalogs.item.kingsRock as Row;

describe("King's Rock Level-50 hook-join family", () => {
  it("enumerates all 106 selectors, promotes exactly 105, retains all 12 roster-only rows, and leaves Tickle explicit", () => {
    expect(audit).toMatchObject({ status: "source-proven-family", candidateCount: 106, blockers: [] });
    expect(audit.sourceMoveCandidates).toHaveLength(106);
    expect(audit.sourceProvenRows).toHaveLength(105);
    expect(audit.routeWitnesses).toHaveLength(105);
    expect(audit.sourceMoveCandidates.filter((row: Row) => row.executionInventory === "level50-roster-only")).toHaveLength(12);
    expect(audit.sourceExceptionRows).toEqual([expect.objectContaining({
      id: "kings-rock-zero-damage:MOVE_TICKLE",
      move: "MOVE_TICKLE",
      reason: expect.stringMatching(/power is 0.*no successful target datahpupdate/),
    })]);
    expect(audit.sourceProvenRows).not.toContain("MOVE_TICKLE");
  });

  it("certifies each promoted entry through graph/program target damage and MOVEEND state 12 with fallthrough preserved", () => {
    for (const witness of audit.routeWitnesses as Row[]) {
      const family = witness.familyEvidence as Row;
      const graph = family.entryPath.graph as Row;
      const program = family.entryPath.program as Row;
      expect(family.category).toBe("moveend-kings-rock");
      expect(graph.route).toEqual(program.route);
      expect(graph.transitions).toEqual(program.transitions);
      const dataIndex = graph.route.findIndex((statement: Row) => statement.mnemonic === "datahpupdate" && statement.operands[0] === "BS_TARGET");
      const moveEndIndex = graph.route.findIndex((statement: Row) => ["moveendall", "moveendto", "moveendfromto"].includes(statement.mnemonic));
      expect(dataIndex).toBeGreaterThanOrEqual(0);
      expect(moveEndIndex).toBeGreaterThan(dataIndex);
      expect(graph.transitions.some((transition: Row) => transition.kind === "fallthrough")).toBe(true);
      expect(family.entryPath.moveEnd).toMatchObject({ state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12 });
      expect(family.dispatcher).toMatchObject({ state: "MOVEEND_KINGSROCK_SHELLBELL", stateValue: 12, call: "ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL, 0, FALSE)" });
      expect(family.selector).toMatchObject({ guard: "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED" });
    }
  });

  it("pins the bounded charge/release set, exact guard order, and Shell Bell boundary", () => {
    expect(audit.chargeReleaseMoves).toEqual([
      "MOVE_RAZOR_WIND", "MOVE_FLY", "MOVE_SOLAR_BEAM", "MOVE_DIG", "MOVE_BIDE", "MOVE_SKY_ATTACK", "MOVE_DIVE", "MOVE_BOUNCE",
    ]);
    for (const move of audit.chargeReleaseMoves as string[]) {
      const witness = (audit.routeWitnesses as Row[]).find((row) => row.move === move)!;
      expect(witness.routeKind).toBe("bounded-charge-release-damage-route");
    }
    const bide = (audit.routeWitnesses as Row[]).find((row) => row.move === "MOVE_BIDE")!;
    expect(bide.familyEvidence.entryPath.alternatives).toEqual([
      expect.objectContaining({ kind: "bide-charge-no-damage", outcome: expect.stringMatching(/only BattleScript_BideAttack/) }),
    ]);
    expect(audit.runtimeGuardSignature.orderedGuards).toEqual([
      "gBattleMoveDamage != 0",
      "atkHoldEffect == HOLD_EFFECT_FLINCH",
      "!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
      "TARGET_TURN_DAMAGED",
      "Random() % 100 (draw occurs before the move-flag and target-HP tests)",
      "roll < atkHoldEffectParam",
      "gBattleMoves[gCurrentMove].flags & FLAG_KINGS_ROCK_AFFECTED",
      "gBattleMons[gBattlerTarget].hp != 0",
      "SetMoveEffect(FALSE, 0) with MOVE_EFFECT_FLINCH",
    ]);
    expect(JSON.stringify(audit.runtimeGuardSignature.orderedGuards)).not.toContain("HOLD_EFFECT_SHELL_BELL");
    expect(audit.runtimeGuardSignature.holdEffect).toEqual({ item: "ITEM_KINGS_ROCK", effect: "HOLD_EFFECT_FLINCH", parameter: 10 });
    expect(audit.runtimeGuardSignature.scopeBoundary).toMatch(/HOLD_EFFECT_SHELL_BELL arm is not promoted/);
  });
});
