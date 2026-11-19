import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveMoveGeometrySpriteOrderPlanText } from "../src/engine/liveMoveAnimation.ts";
import { liveMovePresentationRngBodyKey } from "../src/engine/liveMovePresentationRng.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder, markLiveSpriteOrderDeferredBody,
} from "../src/engine/liveSpriteOrderHost.ts";
import { createSpriteOrderTracker, resolveSpriteOrderDeferredLend, spriteOrderTrackerLend } from "../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// ice2: a lent-order-keyed body (Shock Wave 351, Water Spout 323) recorded under a pending words marker carries the displayed field
// (`geometryField`); the render seam computes its plan at the replayed lend, so the marker replays instead of invalidating.
const ev = (sequence: number, extra: object) => Object.freeze({ sequence, payload: { kind: "animation", ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const body = (seq: number, battler: 0 | 1, args: string[]) => ev(seq, { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: args });
const iceBall = (seq: number, battler: 0 | 1, counter: number) => body(seq, battler, ["301", "0", String(30 << (counter - 1)), "10", "70", "0", String(counter)]);
const shockWave = (seq: number, battler: 0 | 1) => body(seq, battler, ["351", "0", "60", "10", "70", "0"]);

const fixture = JSON.parse(readFileSync("tools/integration/fixtures/audit-19/fixtures/cast-rain-shock-wave-opp-c0.json", "utf8")) as Fixture;
const field = liveView(fixture, 0).field;

function record(planAtField: boolean) {
  let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
  const events = [iceBall(10, 1, 1), shockWave(12, 1), iceBall(14, 1, 2)];
  const resolution = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events }] };
  const plans = planAtField
    ? (_s: number, _q: number, moveId: number, _side: "player" | "opponent", lentFree?: readonly number[]) =>
      lentFree === undefined && moveId === 351 ? { field } : undefined
    : undefined;
  const lends: unknown[] = [];
  events.forEach((event, commandIndex) => {
    host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true, plans);
    const payload = event.payload as { battler: number; target: number; arguments: string[] };
    const request = battleMoveAnimationRequest(payload.battler, payload.target, payload.arguments);
    const lend = lendLiveSpriteOrder(host, request.moveId);
    lends.push(lend);
    host = markLiveSpriteOrderDeferredBody(host, lend, request, liveMovePresentationRngBodyKey({ resolutionId: { requestId: 1 }, segmentIndex: 0, commandIndex }));
  });
  return { host, lends };
}

describe("ice2: lent-order-keyed bodies under a pending words marker", () => {
  const carry = () => KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER; // the earlier Ice Ball body's carry (a fixed stand-in)
  const marker = (planAtField: boolean) => {
    const r = record(planAtField);
    const third = r.lends[2] as { deferred?: Parameters<typeof resolveSpriteOrderDeferredLend>[0] };
    return third.deferred ?? null;
  };

  it("records the displayed field on the Shock Wave unit (no record-time plan: the lent order is unknown there)", () => {
    const m = marker(true)!;
    const unit = m.units.find((u) => u.kind === "move-animation" && u.moveId === 351) as { geometryField?: unknown; geometryPlan?: string };
    expect(unit.geometryField).toBe(field);
    expect(unit.geometryPlan).toBeUndefined();
  });

  it("without the field the marker cannot replay the Shock Wave unit (the lend stays unresolved)", () => {
    const m = marker(false)!;
    expect(resolveSpriteOrderDeferredLend(m, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY)).toBeNull();
  });

  it("with the field the replay lends exactly what a plan computed at the replayed order lends", () => {
    const m = marker(true)!;
    const lend = resolveSpriteOrderDeferredLend(m, carry, LIVE_WORDS_ORDER_DEFERRED_REPLAY);
    expect(lend).not.toBeNull();
    const lentAtShockWave = spriteOrderTrackerLend(createSpriteOrderTracker({ known: true, free: carry(), pendingDestroyed: [] }));
    const plan = liveMoveGeometrySpriteOrderPlanText(351, "opponent", { playerSpecies: field.player.species, opponentSpecies: field.opponent.species }, field, lentAtShockWave!);
    expect(plan).not.toBeNull();
    const withPlan = { ...m, units: m.units.map((u) => u.kind === "move-animation" && u.moveId === 351 ? { kind: u.kind, moveId: u.moveId, attackerSide: u.attackerSide, geometryPlan: plan! } : u) };
    expect(resolveSpriteOrderDeferredLend(withPlan as never, carry, { replayBattleUnits: LIVE_WORDS_ORDER_DEFERRED_REPLAY.replayBattleUnits })).toEqual(lend);
  });
});
