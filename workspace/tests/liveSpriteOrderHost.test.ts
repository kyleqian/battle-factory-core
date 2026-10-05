import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { prepareLiveMoveSpriteOrder } from "../src/engine/liveMoveSpriteAllocator.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, invalidateSpriteOrderState, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, liveSpriteOrderBattlersPresent,
  openLiveSpriteOrderHostPartyMenu, returnLiveSpriteOrderHostFromPartyMenu, seedLiveSpriteOrderHostFromBattleStart,
  type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { ORDER_CONSUMER_MOVES, predictLentOrders, predictTrackers, scanRoute } from "../tools/integration/orderCrossBodyRouteScan.ts";
import { evidenceEvents, maskSlotsOf, productionReplay } from "../tools/integration/spriteOrderBattleUnitsReplay.ts";

type Replay = ReturnType<typeof generatedCommandAnimationReplay>;
// 20-battle sweep: command edges compared host vs pure, host known, host declines where pure is known (all 27 = seed 17,
// "command resolution without an action prompt": the locked-action continuation the host refuses), later bodies with a
// known pre-body tracker (35 of 80 without the battle units).
const SWEEP_PIN = { compared: 863, hostKnown: 477, declines: 27, laterAfter: 47 };
const bodies = (run: Replay) => run.commands.filter(row => row.type === "move-animation");

function expectRulesEqual(on: Replay, off: Replay): void {
  expect(on.boundaries).toHaveLength(off.boundaries.length);
  for (let index = 0; index < on.boundaries.length; index += 1) {
    const a = on.boundaries[index]!, b = off.boundaries[index]!;
    expect(a.rng).toEqual(b.rng);
    const { hitMarker: am, ...ar } = a.rules.rulesContext;
    const { hitMarker: bm, ...br } = b.rules.rulesContext;
    expect(ar).toEqual(br);
    expect(am ^ bm).toBe(0x80);
    expect(a.boundary).toEqual(b.boundary);
  }
}

describe("live sprite-order seam (presentation-only, tracked across modelled bodies)", () => {
  it("lends a known order once and invalidates it", () => {
    const request = battleMoveAnimationRequest(0, 1, ["288", "0", "0", "0", "0", "0"]);
    const known = prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request);
    expect(known.input).toEqual({ known: true, free: KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER });
    expect(known.next.known).toBe(false);
    const unknown = prepareLiveMoveSpriteOrder(known.next, request);
    expect(unknown.input).toBeUndefined();
    expect(prepareLiveMoveSpriteOrder(invalidateSpriteOrderState(known.next), request).input).toBeUndefined();
  });

  it("supplies the known-entry order to the battle's first body; later bodies get the pure transform's prediction; scene OFF none; rules/RNG equal", () => {
    const on = generatedCommandAnimationReplay(16, "on", [0, 0]);
    const off = generatedCommandAnimationReplay(16, "off", [0, 0]);
    expectRulesEqual(on, off);
    const moves = bodies(on);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    const firstGraphics = on.commands.findIndex(row => row.type !== "message");
    expect(on.commands[firstGraphics]!.type).toBe("move-animation");
    expect(moves[0]!.spriteOrderInput).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    const predicted = predictLentOrders(on, true);
    for (const row of moves) {
      const sequence = (row.command as { eventSequence: number }).eventSequence;
      expect(predicted.has(sequence)).toBe(true);
      expect(row.spriteOrderInput ?? null).toEqual(predicted.get(sequence));
    }
    expect(off.commands.every(row => row.spriteOrderInput === undefined && row.retainedSpriteOrderKnown === undefined))
      .toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

  it("tracks the order across bodies on 20 generated battles exactly as the pure transform predicts", () => {
    let later = 0, laterKnown = 0, laterUnknownAfterKnown = 0, invalidatedBattles = 0, postKoLent = 0;
    for (let seed = 0; seed < 20; seed += 1) {
      const route = scanRoute(seed, [0, 0, 0]);
      // The host may decline where the pure prediction is known (retained locked-action continuation, e.g. Rollout:
      // predictLentOrders documents this); it must never lend an order the prediction does not.
      for (const body of route.bodies) expect(body.mismatch || (!body.agrees && body.known), `seed ${seed} body ${body.index}`).toBe(false);
      later += route.bodies.filter(body => body.index > 0).length;
      laterKnown += route.bodies.filter(body => body.index > 0 && body.known).length;
      // Rung 2 (docs/postko-consumer-audit.md §4): after a modelled opponent faint + summary + send-out the occupancy is
      // role-isomorphic to the entry and later bodies may lend pi(F) (checked == the pure prediction above). After a
      // player-side unit (player faint, player switch-in, trainer slide) the lend still declines for the rest of the battle.
      const events = route.on.semanticEvents.map(row => row.event as { sequence: number; payload: { kind: string; battler?: number } });
      const invalidating = events.find(event => event.payload.kind === "trainer-slide-in"
        || (["faint-animation", "switch-in-animation"].includes(event.payload.kind) && event.payload.battler === 0));
      if (invalidating) {
        invalidatedBattles += 1;
        expect(route.bodies.filter(body => body.sequence > invalidating.sequence).every(body => !body.known)).toBe(true);
      }
      const ko = events.find(event => event.payload.kind === "switch-in-animation" && event.payload.battler === 1);
      if (ko) postKoLent += route.bodies.filter(body => body.sequence > ko.sequence && body.known).length;
      // Once unknown, never known again in the same battle (no resync).
      const firstUnknown = route.bodies.findIndex(body => !body.known);
      if (firstUnknown >= 0) {
        expect(route.bodies.slice(firstUnknown).every(body => !body.known)).toBe(true);
        if (firstUnknown > 0) laterUnknownAfterKnown += 1;
      }
    }
    // laterKnown 34 -> 44: the 10 post-KO bodies of seeds 8 (2), 10 (1) and 11 (7, five after a second opponent KO) now lend.
    expect({ later, laterKnown, postKoLent }).toEqual({ later: 80, laterKnown: 44, postKoLent: 10 });
    expect(laterUnknownAfterKnown).toBeGreaterThan(0);
    expect(invalidatedBattles).toBeGreaterThan(0);
  }, 120000);

  it("host tracker == pure transform at every command edge of the 20-battle sweep; battle units keep later bodies' tracker known", () => {
    let compared = 0, hostKnown = 0, mismatches = 0, declines = 0, later = 0, laterBefore = 0, laterAfter = 0;
    for (let seed = 0; seed < 20; seed += 1) {
      const route = scanRoute(seed, [0, 0, 0]);
      const after = predictTrackers(route.on, route.entryKnown, true);
      const before = predictTrackers(route.on, route.entryKnown, false);
      for (const row of route.on.commands) {
        const view = row.orderHostView;
        const pure = view?.cursor ? after.positions.get(`${view.cursor.requestId}:${view.cursor.segmentIndex}:${view.cursor.nextEventIndex}`) : undefined;
        if (!view || !pure) continue;
        compared += 1;
        if (!view.known) { if (pure.cursor.order.known) declines += 1; continue; }
        hostKnown += 1;
        if (!pure.cursor.order.known || JSON.stringify([view.free, view.occupied, view.battlerSlots])
          !== JSON.stringify([pure.cursor.order.free, pure.cursor.occupied, pure.battlerSlots])) mismatches += 1;
      }
      for (const body of route.bodies.filter(row => row.index > 0)) {
        later += 1;
        if (before.preBody.get(body.sequence)?.cursor.order.known) laterBefore += 1;
        if (after.preBody.get(body.sequence)?.cursor.order.known) laterAfter += 1;
      }
    }
    expect({ mismatches, later, laterBefore }).toEqual({ mismatches: 0, later: 80, laterBefore: 35 });
    expect({ compared, hostKnown, declines, laterAfter }).toEqual(SWEEP_PIN);
  }, 120000);

  it("KO chain resolution views stay known and equal the observed F (battle1-turn17-dense 6519 / 6587 / 6726, edges 6864 / 7395)", () => {
    const trace = evidenceEvents("battle1-turn17-dense");
    const at = (frame: number) => trace.find(e => e.n === frame)!;
    const expectObserved = (host: LiveSpriteOrderHost, frame: number) => {
      expect(host.tracker.cursor.order.free, `F @${frame}`).toEqual(at(frame).obsF);
      expect(host.tracker.cursor.occupied, `occupancy @${frame}`).toEqual(maskSlotsOf(at(frame).obsMask as string));
    };
    const pre = productionReplay("battle1-turn17-dense", true, 6519).tracker; // strict pre-state: known, battlers 6 / 8
    expect(pre.battlerSlots).toEqual({ player: 6, opponent: 8 });
    const ev = (sequence: number, kind: string, extra: object = {}) =>
      Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
    const events = [ev(10, "faint-animation", { battler: 1 }), ev(11, "message"), ev(12, "draw-party-status-summary", { battler: 1 }),
      ev(13, "switch", { side: "opponent", fromPartyIndex: 0, toPartyIndex: 1 }), ev(14, "message"), ev(15, "hide-party-status-summary", { battler: 1 }),
      ev(16, "switch-in-animation", { battler: 1, partyIndex: 1 }),
      ev(17, "animation", { animationId: "HELD_ITEM_EFFECT", battler: 1, target: 1, arguments: [] })];
    const resolution = { resolutionId: { requestId: 5 }, segmentIndex: 0, segments: [{ events }] };
    let host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")),
      tracker: pre, promptRequestId: 5 });
    host = advanceLiveSpriteOrderHost(host, resolution, 10);
    expectObserved(host, 6519);
    host = advanceLiveSpriteOrderHost(host, resolution, 12);
    expectObserved(host, 6587);
    host = advanceLiveSpriteOrderHost(host, resolution, 16);
    expectObserved(host, 6726);
    expect(host.tracker.battlerSlots).toEqual({ player: 6, opponent: 5 });
    host = advanceLiveSpriteOrderHost(host, resolution, 17, true);
    expectObserved(host, 6864);
    host = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
    expect(host.cursor?.drained).toBe(true);
    host = beginLiveSpriteOrderTurn(host, 6, true);
    const body = { resolutionId: { requestId: 6 }, segmentIndex: 0, segments: [{ events: [
      ev(20, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["297", "0", "0", "0", "0", "0"] })] }] };
    host = advanceLiveSpriteOrderHost(host, body, 20, true);
    expectObserved(host, 7395);
  });

  it("player faint -> forced party menu (reset revives) -> reshow (player gone) -> forced switch-in equals the observed F (20291 / 20389)", () => {
    const trace = evidenceEvents("battle1-turn17-dense");
    const at = (frame: number) => trace.find(e => e.n === frame)!;
    const pre = productionReplay("battle1-turn17-dense", true, 19325).tracker;
    expect(pre.cursor.order.known).toBe(false); // strict: unknown since the plan-less 28:opponent body (frame 15468)
    const ev = (sequence: number, kind: string, extra: object = {}) =>
      Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
    const segments = [{ events: [ev(30, "faint-animation", { battler: 0 }), ev(31, "message")] },
      { events: [ev(40, "switch", { side: "player", fromPartyIndex: 0, toPartyIndex: 2 }), ev(41, "draw-party-status-summary", { battler: 0 }),
        ev(42, "message"), ev(43, "hide-party-status-summary", { battler: 0 }), ev(44, "switch-in-animation", { battler: 0, partyIndex: 2 }),
        ev(45, "message")] }];
    let host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")),
      tracker: pre, promptRequestId: 9 });
    host = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 9 }, segmentIndex: 0, segments: segments.slice(0, 1) }, Number.POSITIVE_INFINITY);
    const forced = { resolutionId: { requestId: 9 }, segmentIndex: 1, segments };
    expect(liveSpriteOrderBattlersPresent(forced, 1)).toEqual({ player: false, opponent: true });
    // The orchestrator's presenting-switch-in order: settle earlier segments, menu reset + reshow, then through the switch-in.
    host = returnLiveSpriteOrderHostFromPartyMenu(advanceLiveSpriteOrderHost(host, forced, Number.NEGATIVE_INFINITY, true),
      liveSpriteOrderBattlersPresent(forced, 1));
    expect(host.tracker.cursor.order.free).toEqual(at(20291).obsF);
    expect(host.tracker.cursor.occupied).toEqual(maskSlotsOf(at(20291).obsMask as string));
    host = advanceLiveSpriteOrderHost(host, forced, 44);
    expect(host.tracker.cursor.order.free).toEqual(at(20389).obsF);
    expect(host.tracker.cursor.occupied).toEqual(maskSlotsOf(at(20389).obsMask as string));
    expect(host.tracker.battlerSlots).toEqual({ player: 5, opponent: 0 });
    // A hidden battler or a missing opponent battler at the reshow is unobserved: invalidate.
    expect(returnLiveSpriteOrderHostFromPartyMenu(Object.freeze({ ...host, hidden: [false, true] as const }), { player: true, opponent: true })
      .tracker.cursor.order.known).toBe(false);
    expect(returnLiveSpriteOrderHostFromPartyMenu(host, { player: false, opponent: false }).tracker.cursor.order.known).toBe(false);
  });

  it("voluntary party menu: open resets (revives), choose = reset + reshow without the prompt cycle (issue135 Pursuit edge 2467)", () => {
    const trace = evidenceEvents("lab:issue135-pursuit-switch-intercept");
    const pursuit = trace.find(e => e.n === 2467)!;
    const invalid = createLiveSpriteOrderHost(invalidateSpriteOrderState(knownEntrySpriteOrderState("ordinary-factory")));
    const opened = openLiveSpriteOrderHostPartyMenu(invalid);
    expect(opened.tracker.cursor.order.free).toEqual(Array.from({ length: 64 }, (_, slot) => slot));
    const chosen = beginLiveSpriteOrderTurn(opened, 3, true, true);
    expect(chosen.tracker.promptPair).toBeNull();
    expect(chosen.tracker.cursor.order.free).toEqual(pursuit.obsF);
    expect(chosen.tracker.cursor.occupied).toEqual(maskSlotsOf(pursuit.obsMask as string));
    expect(chosen.tracker.battlerSlots).toEqual({ player: 0, opponent: 1 });
    // Cancel: the same reshow, then the next prompt cycle applies as usual.
    const cancelled = returnLiveSpriteOrderHostFromPartyMenu(opened, { player: true, opponent: true });
    expect(cancelled.tracker.cursor.order.free).toEqual(pursuit.obsF);
  });

  it("a consumer as a LATER body renders with the tracked order; after an unmodelled body it declines", () => {
    // Later bodies after modelled bodies only (tools/integration/fixtures/order-cross-body-live-receipt.json routes):
    // Heal Bell player (seed 12, 2nd body) / opponent (seed 186, 5th body), Grudge player (seed 16, 3rd body),
    // Rock Throw opponent (seed 112, 4th body).
    for (const [seed, slots, moveId, index] of [
      [12, [1, 3], 215, 1], [186, [0, 0, 0], 215, 4], [16, [2, 3], 288, 2], [112, [3, 3], 88, 3],
    ] as const) {
      const route = scanRoute(seed, slots);
      const body = route.bodies.find(row => row.moveId === moveId)!;
      expect(body.index).toBe(index);
      expect(route.bodies.every(row => row.index > index || (row.known && !row.mismatch))).toBe(true);
      expect(body.known && body.agrees).toBe(true);
      const anim = route.consumers.find(row => row.moveId === moveId)!;
      expect(anim.activeEveryAge && anim.ages > 0).toBe(true);
      expect(route.phase).toBe("action-menu");
      expectRulesEqual(route.on, generatedCommandAnimationReplay(seed, "off", slots));
    }
    // Seed 16 [slot 1, Grudge]: an earlier body has no EXACT plan -> Grudge declines (scene-off fallback).
    const declined = scanRoute(16, [1, 3]);
    const grudge = declined.bodies.find(row => row.moveId === 288)!;
    expect(grudge.index).toBeGreaterThan(0);
    expect(grudge.known).toBe(false);
    expect(declined.consumers.find(row => row.moveId === 288)!.activeAny).toBe(false);
    expect(ORDER_CONSUMER_MOVES[288]).toBe("GRUDGE");
  }, 120000);

  it("refuses the order after a preceding switch or party menu", () => {
    for (const slots of [[{ switch: 1 }, 0], ["cancel-party", 0]] as const) {
      const on = generatedCommandAnimationReplay(16, "on", slots);
      const off = generatedCommandAnimationReplay(16, "off", slots);
      expectRulesEqual(on, off);
      expect(bodies(on).length).toBeGreaterThan(0);
      expect(bodies(on).every(row => row.spriteOrderInput === undefined)).toBe(true);
    }
  }, 60000);

  it("battle-start events: none = known entry, exactly one Intimidate triple = pre-prompt + stat plan (lends after the prompt), anything else refuses", () => {
    let intimidate = 0, other = 0, without = 0;
    for (const seed of [26, 34, 53, 83, 116, 3]) {
      const run = generatedCommandAnimationReplay(seed, "on", []);
      const host = run.state.liveMoveSpriteAllocatorHost!;
      expect(host.host.historyKnown).toBe(true);
      const n = run.state.battle!.nextEventSequence;
      if (n === 3) {
        intimidate += 1;
        expect(host.order.known).toBe(true);
        expect(host.order.free.slice(0, 4)).toEqual([3, 4, 21, 20]); // pre-prompt + stat plan, before the prompt cycle
      } else if (n > 0) {
        other += 1;
        expect(host.order.known).toBe(false);
      } else {
        without += 1;
        expect(host.order.free).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
      }
    }
    expect([intimidate > 0, other > 0, without > 0]).toEqual([true, true, true]);
    const ev = (kind: string, extra: object = {}) => ({ sequence: 0, payload: { kind, ...extra }, provenance: undefined }) as any;
    const triple = [ev("stat-stage-change"), ev("animation", { animationId: "STATS_CHANGE", battler: 1, target: 0, arguments: ["22"] }), ev("message")];
    expect(seedLiveSpriteOrderHostFromBattleStart([]).tracker.cursor.order).toEqual(knownEntrySpriteOrderState("ordinary-factory"));
    expect(seedLiveSpriteOrderHostFromBattleStart([...triple, ...triple]).tracker.cursor.order.known).toBe(false);
    expect(seedLiveSpriteOrderHostFromBattleStart(triple.slice(0, 2)).tracker.cursor.order.known).toBe(false);
  }, 120000);

  it("a generated battle with an Intimidate lead (seed 53) lends a known order to its first body; adapter active every age; ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(53, "on", [0, 0]);
    const off = generatedCommandAnimationReplay(53, "off", [0, 0]);
    expectRulesEqual(on, off);
    expect(generatedCommandAnimationReplay(53, "on", []).state.battle!.nextEventSequence).toBe(3);
    const moves = bodies(on);
    expect(moves.length).toBeGreaterThanOrEqual(1);
    // ROM first move edge after Intimidate (12/12 corpus): slots 3,4 swapped against the no-Intimidate entry
    expect(moves[0]!.spriteOrderInput).toEqual([3, 4, ...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.slice(2)]);
    expect(on.animations.length).toBeGreaterThan(0);
    // Hex 290 (first, player) and 332 (second, opponent) render with the exact adapter every age; the unaudited later body falls back.
    expect(on.animations.slice(0, 2).map(row => [row.moveId, row.ages.length > 0 && row.adapterActive.every(Boolean)])).toEqual([[290, true], [332, true]]);
    expect(off.commands.every(row => row.spriteOrderInput === undefined)).toBe(true);
  }, 120000);
});
