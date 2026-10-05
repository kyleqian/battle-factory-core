import { describe, expect, it } from "vitest";
import { SOURCE_CONFIRMED_ABS_INVARIANT } from "../tools/integration/spriteOrderProductionTable.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../src/engine/spriteOrderProductionPlans.ts";
import { postKoRoute } from "../tools/integration/postKoTrackerRoutes.ts";
import { scanRoute } from "../tools/integration/orderCrossBodyRouteScan.ts";

// Source-confirmed abs-invariant rows (docs/sprite-order-absinv-source-check.md): production table membership and one ordinary-input
// route where a newly planned body precedes order-gated adapter bodies.
describe("abs-invariant production rows (22 source-confirmed)", () => {
  it("every allowlisted (move, side) is in the production table; 283:player comes from the policy-gaps rows", () => {
    expect(SOURCE_CONFIRMED_ABS_INVARIANT.size).toBe(22);
    for (const key of SOURCE_CONFIRMED_ABS_INVARIANT) expect(SPRITE_ORDER_PRODUCTION_BODIES[key], key).toBeTypeOf("number");
    expect(SPRITE_ORDER_PRODUCTION_BODIES["283:player"]).toBeTypeOf("number");
  });

  it("seed 54 slots 3,3,3: the opponent's Heal Bell (planned) precedes two more Heal Bells; both are lent, adapter active every age, ON/OFF parity", () => {
    const route = scanRoute(54, [3, 3, 3]);
    const healBells = route.bodies.filter(body => body.moveId === 215);
    expect(healBells.map(body => [body.index, body.side, body.known])).toEqual([[9, "opponent", true], [11, "opponent", true], [13, "opponent", true]]);
    expect(route.bodies.filter(body => body.mismatch)).toEqual([]);
    expect(route.consumers.filter(c => c.moveId === 215).every(c => c.activeEveryAge)).toBe(true);
    const full = postKoRoute(54, [3, 3, 3]);
    expect(full.parity).toBeNull();
    expect(full.hostVsPure.mismatches).toEqual([]);
    expect(full.decisions.animations.filter(a => a.moveId === 215).every(a => /^1+$/.test(a.adapterActive))).toBe(true);
    expect(route.bodies.some(body => body.index > 13) || route.phase === "action-menu").toBe(true); // the next prompt was reached
  }, 60000);
});
