import { describe, expect, it } from "vitest";
import {
  LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_MOVE_TABLE, applyLiveBattlerX2Event, liveBattlerX2MoveRoleClass, liveMoveBattlerX2Input,
  liveTrackedFrontIdleRest,
} from "../src/engine/liveBattlerX2History.ts";
import movesData from "../src/data/gen/moves.json" with { type: "json" };

// fix122 (docs/fix122-audit26-defects.md): live audit 26's (aud118) two banked defects, landed.
describe("fix122 DEFECT A: Struggle 165 keeps its target's x2 (Move_STRUGGLE shakes it only with the relative ShakeMonInPlace)", () => {
  it("165 is a target `keep` row, not the damaging-move fallback", () => {
    // Revert experiment: without the row, the power-50 fallback marks the target zeroed (the aud118 1 px offset).
    expect(movesData.moves.find((row) => row.id === 165)?.power).toBe(50);
    expect(LIVE_BATTLER_X2_MOVE_TABLE.target.keep).toContain(165);
    expect(liveBattlerX2MoveRoleClass(165, "target")).toBe("keep");
    expect(liveBattlerX2MoveRoleClass(165, "attacker")).toBe("keep");
  });

  it("an opponent ONIX / RATTATA struggled onto keeps its idle rest for its next live body", () => {
    const after = applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "move-body", moveId: 165, attackerSide: "player", turn: 2 });
    expect(after).toBe(LIVE_BATTLER_X2_IDLE);
    expect(liveMoveBattlerX2Input(after)).toBeUndefined();
    // aud118 pb-aud118-ply-50-95-c2 / pb-aud118-ply-65-19-c2: the opponent's next Taunt anchors on the rest x2 1.
    expect(liveTrackedFrontIdleRest("opponent", { x2: 1, y2: 0 }, liveMoveBattlerX2Input(after))).toEqual({ x2: 1, y2: 0 });
    const zeroedFirst = applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "move-body", moveId: 33, attackerSide: "player" });
    expect(applyLiveBattlerX2Event(zeroedFirst, { kind: "move-body", moveId: 165, attackerSide: "player" })).toBe(zeroedFirst);
  });
});
