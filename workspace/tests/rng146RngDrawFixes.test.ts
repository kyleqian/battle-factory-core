import { describe, expect, it } from "vitest";
import r1 from "../tools/probe/receipts/rcp143-r1-thrash-lockin-off.json" with { type: "json" };
import r2 from "../tools/probe/receipts/rcp143-r2-covet-stickyhold-off.json" with { type: "json" };
import r3 from "../tools/probe/receipts/rcp143-r3-getmovetarget-133-off.json" with { type: "json" };
import r3Control from "../tools/probe/receipts/rcp143-r3-control-transform-off.json" with { type: "json" };
import { verifyReceipt } from "../tools/probe/verify-rcp143.ts";

/**
 * STEP rng146 -- ISSUES #141b and the #140 remainder (#141a deferred). Each banked
 * stock-ROM receipt (docs/rcp143-engine-fix-receipts.md) is replayed through
 * the live full-turn kernel here, so a regression in any of the three fixes
 * fails hermetically (committed JSON + pure kernel; no oracle).
 */
type Receipt = Parameters<typeof verifyReceipt>[0];

describe("rng146 -- source-exact RNG draws against the rcp143 receipts", () => {
  it.each([
    ["R2 Covet into Sticky Hold returns onto seteffectwithchance (F2)", r2],
    ["R3 locked Solar Beam cancelled by a faster Spore takes battle_util.c:133 (F3)", r3],
    ["R3 control: Transform's overwritten slot on a later turn draws no GetMoveTarget", r3Control],
  ] as const)("%s", (_name, receipt) => {
    const result = verifyReceipt(receipt as unknown as Receipt);
    expect(result.comparison.firstDivergence).toBeNull();
    expect(result.port.stoppedEarly).toBeNull();
    expect(result.comparison.portActiveHp).toEqual(result.comparison.romActiveHp);
    expect(result.pass).toBe(true);
  });

  it("R1 (F1, #141a) stays the known FAIL until its re-pins land: one draw short at the first lock-in", () => {
    // F1 (0f9b5301e) was reverted in 86888ac9b: it is correct (R1 PASS) but moves 8 pinned
    // trajectories through Petal Dance / Thrash lock-ins; see docs/rng146-rng-draw-fixes.md.
    const result = verifyReceipt(r1 as unknown as Receipt);
    expect(result.pass).toBe(false);
    expect(result.comparison.firstDivergence).toMatchObject({
      turn: 1,
      index: 5,
      rom: { reason: "seteffectwithchance" },
      port: { reason: "accuracycheck" },
    });
  });

  it("R3: the :133 loop draws once on turn 4 and twice on turn 8, on the Solar Beam user's own action", () => {
    const result = verifyReceipt(r3 as unknown as Receipt);
    const loops = result.port.turns.map((turn) =>
      turn.draws.filter((draw) => draw.reason === "GetMoveTarget(MOVE_TARGET_SELECTED)").length);
    expect(loops).toEqual([0, 0, 0, 1, 0, 0, 0, 2, 0, 0]);
    for (const turn of [result.port.turns[3]!, result.port.turns[7]!]) {
      // Parasect's Spore (accuracy, sleep duration) cancels the lock first.
      expect(turn.draws.slice(0, 2).map((draw) => draw.reason)).toEqual([
        "accuracycheck",
        "SetMoveEffect sleep duration ((Random() & 3) + 2)",
      ]);
    }
  });
});
