import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { sortGbaSpriteOrder } from "../src/animation/gbaObjCompositor.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { carryLiveSpriteOrder } from "../src/engine/liveMoveOamAssembler.ts";
import { liveMovePresentationRngBodyKey } from "../src/engine/liveMovePresentationRng.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, invalidateLiveSpriteOrderHost, lendLiveSpriteOrder,
  markLiveSpriteOrderDeferredBody, openLiveSpriteOrderHostPartyMenu, type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import { resolveSpriteOrderDeferredLend, type SpriteOrderDeferredLend } from "../src/engine/spriteOrderEventTransform.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, knownEntrySpriteOrderState, spriteOrderWithOccupiedPrefix,
} from "../src/engine/spriteOrderProvider.ts";

// Deferred lend (docs/s10a-random2-order-lend-blocker.md design 1): the logical order host records a word-free marker at an Ice Ball body
// and lends it to the next Ice Ball body; only the render seam resolves it (here with the corpus sort keys standing in for the words).
type Json = Record<string, any>;
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const iceBall = (seq: number, battler: 0 | 1, counter: number) =>
  ev(seq, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: ["301", "0", String(30 << (counter - 1)), "10", "70", "0", String(counter)] });
const tackle = (seq: number, battler: 0 | 1) =>
  ev(seq, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: ["33", "0", "35", "10", "70", "0"] });
const hit = (seq: number, target: 0 | 1) => ev(seq, "animation", { animationId: "HIT_ANIMATION", battler: target, target, arguments: [] });

/** One turn as the orchestrator drives it: prompt cycle, then each body lent at its activation edge (and marked), then its own event. */
function turn(host: LiveSpriteOrderHost, requestId: number, events: readonly BattleKernelSemanticEvent[]) {
  host = beginLiveSpriteOrderTurn(host, requestId, true);
  const resolution = { resolutionId: { requestId }, segmentIndex: 0, segments: [{ events }] };
  const lends: Json[] = [];
  events.forEach((event, commandIndex) => {
    const payload = event.payload as Json;
    if (payload.animationId !== "MOVE_ANIMATION") return;
    host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true);
    const request = battleMoveAnimationRequest(payload.battler, payload.target, payload.arguments);
    const lend = lendLiveSpriteOrder(host, request.moveId);
    lends.push({ moveId: request.moveId, lend });
    host = markLiveSpriteOrderDeferredBody(host, lend, request,
      liveMovePresentationRngBodyKey({ resolutionId: { requestId }, segmentIndex: 0, commandIndex }));
  });
  return { host: advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY), lends };
}

describe("deferred sprite-order lend (multi-body Random2 moves)", () => {
  it("records a word-free marker at an Ice Ball body and lends it, nested, to every later consumer (ice72: Ice Ball is a words unit)", () => {
    let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
    const t1 = turn(host, 1, [iceBall(10, 0, 1), hit(11, 1), tackle(12, 1), hit(13, 0)]);
    host = t1.host;
    expect(t1.lends[0]!.lend).toEqual({ known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, firstBody: true });
    expect(host.tracker.cursor.order.known).toBe(false);
    expect(host.deferred).toEqual({ key: "move:1:0:0", moveId: 301, attackerSide: "player", rolloutCounter: 1, turn: 0,
      activation: { free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER },
      units: [{ kind: "hit-animation", targetVisible: true }, { kind: "move-animation", moveId: 33, attackerSide: "opponent" },
        { kind: "hit-animation", targetVisible: true }] });
    // ice72: the Tackle after the Ice Ball body takes the deferred lend (the marker with the units up to its activation).
    expect(t1.lends[1]).toEqual({ moveId: 33, lend: { known: true, free: [], deferred: { ...host.deferred!,
      units: [{ kind: "hit-animation", targetVisible: true }] } } });
    const t2 = turn(host, 2, [iceBall(20, 0, 2), hit(21, 1)]);
    const first = host.deferred!;
    expect(t2.lends[0]!.lend).toEqual({ known: true, free: [], deferred: { ...first, units: [...first.units,
      { kind: "action-prompt" }, { kind: "actions-committed" }] } });
    host = t2.host;
    expect(host.deferred!.activation).toEqual({ deferred: (t2.lends[0]!.lend as Json).deferred });
    expect(host.deferred!.rolloutCounter).toBe(2);
    expect(host.deferred!.units).toEqual([{ kind: "hit-animation", targetVisible: true }]);
    // Word-free: keys, request fields, orders and order events only.
    expect(JSON.stringify(host)).not.toMatch(/words|presentationRng|activationValue/);
    // Other moves are unchanged (identity), and an invalidation is recorded as a unit; a party-menu reset drops the marker.
    expect(markLiveSpriteOrderDeferredBody(host, t2.lends[0]!.lend, { moveId: 33, attacker: 0 }, "k")).toBe(host);
    expect(invalidateLiveSpriteOrderHost(host, "x").deferred!.units.at(-1)).toEqual({ kind: "invalidate", reason: "x" });
    expect(openLiveSpriteOrderHostPartyMenu(host).deferred).toBeUndefined();
  });

  it("resolves to the ROM activation order of every later accepted Ice Ball body (chain from body 1, both sides)", () => {
    for (const side of ["player", "opponent"] as const) {
      const bodies: Json[][] = JSON.parse(gunzipSync(readFileSync(`tools/compare/fixtures/ice-ball/${side}-dense.json.gz`)).toString("utf8")).bodies;
      const battler = side === "player" ? 0 : 1, foe = (1 - battler) as 0 | 1;
      // Accepted history: the faster REGISTEEL's Tackle + its blip, then the Ice Ball + its blip, each turn.
      let host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
      const freeOf = (row: Json) => (row.spriteOrder as number[]).filter((slot) => !row.sprites.some((s: Json) => s.slot === slot));
      const carryBody = (body: SpriteOrderDeferredLend, activationFree: readonly number[]) => {
        const rows = bodies[body.rolloutCounter! - 1]!;
        let order: readonly number[] = spriteOrderWithOccupiedPrefix({ known: true, free: activationFree, pendingDestroyed: [] },
          KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
        expect(order).toEqual(rows[0]!.spriteOrder);
        for (const row of rows) {
          order = carryLiveSpriteOrder(order, row.sprites.map((s: Json) => ({ slot: s.slot, attr: s.attr, subpriority: s.subpriority, visible: true,
            oamY: s.attr[0] & 0xff })), sortGbaSpriteOrder);
        }
        return order.filter((slot) => !KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER.includes(slot));
      };
      let checked = 0;
      for (let k = 0; k < bodies.length; k += 1) {
        const t = turn(host, k + 1, [tackle(10 * k, foe), hit(10 * k + 1, battler), iceBall(10 * k + 2, battler, k + 1), hit(10 * k + 3, foe)]);
        const lend = t.lends[1]!.lend as Json;
        const want = freeOf(bodies[k]![0]!);
        if (k === 0) expect(lend.free).toEqual(want);
        else {
          expect(lend.free).toEqual([]);
          expect(resolveSpriteOrderDeferredLend(lend.deferred, carryBody), `${side} body ${k + 1}`).toEqual(want);
          checked += 1;
        }
        host = t.host;
      }
      expect(checked).toBe(4);
    }
  });

  it("declines a deferred lend whose units leave the modelled occupancy (KO / send-in / invalidation) or whose carry is unknown", () => {
    const base: SpriteOrderDeferredLend = { key: "move:1:0:0", moveId: 301, attackerSide: "player", rolloutCounter: 1,
      activation: { free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER }, units: [{ kind: "hit-animation", targetVisible: true }] };
    const identity = (_: SpriteOrderDeferredLend, free: readonly number[]) => free;
    expect(resolveSpriteOrderDeferredLend(base, identity)).not.toBeNull();
    for (const unit of [{ kind: "faint", side: "opponent" }, { kind: "party-summary-next" }, { kind: "next-mon-send-out" },
      { kind: "switch-out" }, { kind: "invalidate", reason: "x" }, { kind: "party-menu-reset" }] as const) {
      expect(resolveSpriteOrderDeferredLend({ ...base, units: [...base.units, unit] }, identity), unit.kind).toBeNull();
    }
    expect(resolveSpriteOrderDeferredLend(base, () => null)).toBeNull();
    expect(resolveSpriteOrderDeferredLend({ ...base, activation: { deferred: { ...base, units: [{ kind: "faint", side: "player" }] } } }, identity))
      .toBeNull();
  });
});
