import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { prepareLiveMoveSpriteOrder } from "../src/engine/liveMoveSpriteAllocator.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, invalidateSpriteOrderState, knownEntryPrePromptSpriteOrderState, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder, liveSpriteOrderBattlersPresent,
  openLiveSpriteOrderHostPartyMenu, returnLiveSpriteOrderHostFromPartyMenu, seedLiveSpriteOrderHostFromBattleStart,
  type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderPresentationEvent } from "../src/engine/spriteOrderEventTransform.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { ORDER_CONSUMER_MOVES, predictLentOrders, predictTrackers, scanRoute as scanRouteUncached } from "../tools/integration/orderCrossBodyRouteScan.ts";
import { evidenceEvents, maskSlotsOf, productionReplay } from "../tools/integration/spriteOrderBattleUnitsReplay.ts";

type Replay = ReturnType<typeof generatedCommandAnimationReplay>;
// cln277: the 20-seed sweep and the later-body routes are replayed by several tests; the replay is deterministic and read-only here, so compute each once per worker.
const routeMemo = new Map<string, ReturnType<typeof scanRouteUncached>>();
const scanRoute = (seed: number, slots: readonly (0 | 1 | 2 | 3)[]) => {
  const key = JSON.stringify([seed, slots]);
  let route = routeMemo.get(key);
  if (!route) { route = scanRouteUncached(seed, slots); routeMemo.set(key, route); }
  return route;
};
// 20-battle sweep: command edges compared host vs pure, host known, host declines where pure is known (all 27 = seed 17,
// "command resolution without an action prompt": the locked-action continuation the host refused before prep47), later bodies with a
// known pre-body tracker (35 of 80 without the battle units).
// hostKnown 477 -> 524, laterAfter 47 -> 51: Roar/Whirlwind forced switch-out + send-in units keep the tracker known
// (docs/forced-switch-continuation.md §2.4); declines and mismatches unchanged.
// prep43 plans: hostKnown 524 -> 626, laterAfter 51 -> 63; declines 27 -> 63 = edges the pure transform now knows past a planned unit
// that the host still refuses (its host-only invalidations, e.g. the retained locked-action continuation); still 0 mismatches.
// prep45 plans + TURN_TRAP / Solar Beam keys: hostKnown 626 -> 646, laterAfter 63 -> 65; declines and mismatches unchanged.
// prep47 (A): a retained opponent locked-action continuation applies the player's prompt cycle at its turn boundary instead
// of invalidating: hostKnown 646 -> 709, declines 63 -> 0 (every former decline now equals the pure transform; 0 mismatches).
// plans48 plans (Attract, FRZ, NIGHTMARE, CURSED, ITEM_KNOCKOFF, Ice Punch, ...; Razor Wind key): hostKnown 709 -> 752, laterAfter
// 65 -> 69; + Present (keyed by its branch) / Struggle opponent: 752 -> 772, 69 -> 72; declines and mismatches unchanged (0).
// sc106: + the sweep's 19 stats-change command edges (16 with a known host), each equal to the pure transform (0 mismatches); without
// them compared / hostKnown stay 863 / 772, declines and laterAfter unchanged.
// sa125: + the sweep's 13 Scene ON status-animation command edges (10 with a known host), each equal to the pure transform (0
// mismatches); without them compared / hostKnown stay 882 / 788, declines and laterAfter unchanged.
// wth236: + the sweep's 3 Scene ON weather-continues command edges (no known host), each equal to the pure transform (0 mismatches);
// without them compared stays 895, hostKnown / declines / laterAfter unchanged.
// parity-mac re-pin (docs/parity-mac/STATUS.md "Re-pins"): the 20 sweep battles changed with the AI / replacement fixes (they are
// shorter in bodies): compared 898 -> 840, hostKnown 798 -> 740, laterAfter 72 -> 65; declines 0 and 0 mismatches unchanged.
// hie1: + the sweep's 6 Scene ON held-item-effect command edges (5 with a known host), each equal to the pure transform (0 mismatches);
// without them compared / hostKnown stay 840 / 740, declines and laterAfter unchanged.
// btn1: one sweep battle's gated message (a `\\p` / `\\l` string split into prompt pieces) adds one known command edge, equal to the pure
// transform (0 mismatches): compared / hostKnown 846 / 745 -> 847 / 746, declines and laterAfter unchanged.
const SWEEP_PIN = { compared: 847, hostKnown: 746, declines: 0, laterAfter: 65 };
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
      // The host may decline where the pure prediction is known (a consumer gate, a host-only invalidation); it must never
      // lend an order the prediction does not.
      for (const body of route.bodies) expect(body.mismatch || (!body.agrees && body.known), `seed ${seed} body ${body.index}`).toBe(false);
      later += route.bodies.filter(body => body.index > 0).length;
      laterKnown += route.bodies.filter(body => body.index > 0 && body.known).length;
      // Rung 2 (docs/postko-consumer-audit.md §4): after a modelled opponent faint + summary + send-out the occupancy is
      // role-isomorphic to the entry and later bodies may lend pi(F) (checked == the pure prediction above). After a
      // player-side unit (player faint, player switch-in, trainer slide) the lend still declines for the rest of the battle.
      const events = route.on.semanticEvents.map(row => row.event as {
        sequence: number; payload: { kind: string; battler?: number }; provenance?: { opcodeName?: string } });
      // A forced (Roar/Whirlwind) player send-in is a modelled unit pair: it keeps the tracker known.
      const forcedSendIn = (index: number) => events.slice(0, index).reverse()
        .find(event => event.payload.kind !== "switch")?.provenance?.opcodeName === "B_SCR_OP_RETURNTOBALL";
      const invalidating = events.find((event, index) => event.payload.kind === "trainer-slide-in"
        || (event.payload.kind === "faint-animation" && event.payload.battler === 0)
        || (event.payload.kind === "switch-in-animation" && event.payload.battler === 0 && !forcedSendIn(index)));
      if (invalidating) {
        invalidatedBattles += 1;
        expect(route.bodies.filter(body => body.sequence > invalidating.sequence).every(body => !body.known)).toBe(true);
      }
      const ko = events.find(event => event.payload.kind === "switch-in-animation" && event.payload.battler === 1);
      if (ko) postKoLent += route.bodies.filter(body => body.sequence > ko.sequence && body.known).length;
      // Once unknown, never known again in the same battle (no resync). The Dig unleash's measured constant lend is masked
      // as unknown above and is not a tracker body (prep47 (A): seed 0's opponent Dig continuation keeps the tracker known).
      const tracked = route.bodies.filter(body => !body.digUnleashConstant);
      const firstUnknown = tracked.findIndex(body => !body.known);
      if (firstUnknown >= 0) {
        expect(tracked.slice(firstUnknown).every(body => !body.known)).toBe(true);
        if (firstUnknown > 0) laterUnknownAfterKnown += 1;
      }
    }
    // laterKnown 34 -> 44: the 10 post-KO bodies of seeds 8 (2), 10 (1) and 11 (7, five after a second opponent KO) now lend.
    // laterKnown 44 -> 48: the 4 bodies after a Roar/Whirlwind forced switch-out + send-in now lend (same pure prediction).
    // laterKnown 48 -> 56: prep43 plans (CONFUSION / LEECH_SEED_DRAIN / sandstorm / Dig / Brick Break, the PRZ survivor count).
    // laterKnown 56 -> 58: prep45 plans + the host's TURN_TRAP / Solar Beam keys (mirrored in orderCrossBodyRouteScan.ts's prediction).
    // laterKnown 58 -> 64, postKoLent 10 -> 12: prep47 (A), the bodies after a retained opponent locked-action continuation
    // (the player's prompt cycle at the turn boundary) now lend (same pure prediction).
    // laterKnown 64 -> 68: plans48 (the bodies after an Attract now lend; same pure prediction). 68 -> 71: plans48 Present / Struggle.
    // parity-mac re-pin (docs/parity-mac/STATUS.md "Re-pins"): the 20 battles themselves changed (the opponent's replacement
    // after a faint and the AI's draws now follow the ROM), so they hold fewer later bodies: later 80 -> 73, laterKnown 71 -> 64,
    // postKoLent 12 -> 5. The invariant (host == pure prediction, 0 mismatches below) is unchanged.
    expect({ later, laterKnown, postKoLent }).toEqual({ later: 73, laterKnown: 64, postKoLent: 5 });
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
    // laterBefore 35 -> 47: prep43 plans (same pure prediction, 0 mismatches). 47 -> 49: prep45 plans + TURN_TRAP / Solar Beam keys.
    // 49 -> 53: plans48 plans (the bodies after an Attract; same pure prediction, 0 mismatches). 53 -> 56: plans48 Present / Struggle.
    // parity-mac re-pin: later 80 -> 73 (the battles changed, see above); laterBefore and 0 mismatches as before.
    expect({ mismatches, later, laterBefore }).toEqual({ mismatches: 0, later: 73, laterBefore: 56 });
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
    // A hidden PLAYER battler or the opponent battler alone missing at the reshow is unobserved: invalidate (neither battler is
    // reshowNeither since prep49: see "order host prep49 stops" below). hist73 / land75: a hidden OPPONENT at the reshow is the normal
    // reshow (hidden-battler-audit.json rs-* == the shown reshow), `hidden` kept (the ROM re-creates it invisible).
    const shownReshow = returnLiveSpriteOrderHostFromPartyMenu(host, { player: true, opponent: true });
    const hiddenOpponent = returnLiveSpriteOrderHostFromPartyMenu(Object.freeze({ ...host, hidden: [false, true] as const }), { player: true, opponent: true });
    expect(hiddenOpponent.tracker.invalidReason).toBeNull();
    expect(hiddenOpponent.tracker.cursor.order.known).toBe(true);
    expect(hiddenOpponent.tracker.cursor.order.free).toEqual(shownReshow.tracker.cursor.order.free);
    expect(hiddenOpponent.tracker.cursor.occupied).toEqual(shownReshow.tracker.cursor.occupied);
    expect(hiddenOpponent.hidden).toEqual([false, true]);
    const hiddenPlayer = returnLiveSpriteOrderHostFromPartyMenu(Object.freeze({ ...host, hidden: [true, false] as const }), { player: true, opponent: true });
    expect(hiddenPlayer.tracker.cursor.order.known).toBe(false);
    expect(hiddenPlayer.tracker.invalidReason).toBe("reshow with a hidden battler");
    expect(returnLiveSpriteOrderHostFromPartyMenu(host, { player: true, opponent: false }).tracker.cursor.order.known).toBe(false);
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
    // Seed 16 [slot 1, Grudge]: Confuse Ray's confusion status unit used to end the tracker (Grudge declined); STATUS_CONFUSION is
    // EXACT since prep43 (docs/next-adapters-prep43.md), so Grudge is now a known, agreeing later body.
    const confused = scanRoute(16, [1, 3]);
    const grudge = confused.bodies.find(row => row.moveId === 288)!;
    expect(grudge.index).toBeGreaterThan(0);
    expect(grudge.known && !grudge.mismatch).toBe(true);
    expect(ORDER_CONSUMER_MOVES[288]).toBe("GRUDGE");
    // After a body without an EXACT plan (Giga Drain 202 without its geometry plan: no bodyPlanAt resolver, gdgeo) the host
    // lends nothing: the consumer declines.
    const ev = (sequence: number, kind: string, extra: object = {}) =>
      Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
    const host = advanceLiveSpriteOrderHost(Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 2 }),
      { resolutionId: { requestId: 2 }, segmentIndex: 0, segments: [{ events: [
        ev(1, "animation", { animationId: "MOVE_ANIMATION", battler: 1, target: 0, arguments: ["202", "0", "0", "0", "0", "0"] })] }] },
      Number.POSITIVE_INFINITY);
    expect(lendLiveSpriteOrder(host, 288)).toBeUndefined();
  }, 120000);

  // docs/voluntary-switch-lend-audit.md §4: reshowBoth roles, the voluntary recall as the switch-out unit, allocator re-seeded after the
  // cancel return and after the voluntary switch-in. Before: every body after a switch or party menu declined (no lend).
  it("lends after a voluntary switch or a cancelled party menu; adapters active every age; ON/OFF parity; next prompt", () => {
    const routes = [
      { slots: [{ switch: 1 }, 0], post: ["113LA", "61L"] }, // Light Screen: re-seeded after the voluntary switch-in
      { slots: ["cancel-party", 0], post: ["113LA", "325L"] }, // Light Screen: re-seeded at the cancel return
      { slots: [0, { switch: 1 }, 0], pre: ["113LA", "325L"], post: ["129L", "129L", "61L"] },
      // Spark's PRZ status unit used to end the tracker ("4 survivors", the prep43 survivor-count fix): the later bodies now lend.
      { slots: [{ switch: 2 }, 0, 0], post: ["113LA", "129L", "209L", "9L", "209L"] },
    ] as const;
    for (const { slots, post, ...route } of routes) {
      const on = generatedCommandAnimationReplay(16, "on", slots);
      const off = generatedCommandAnimationReplay(16, "off", slots);
      expectRulesEqual(on, off);
      expect([on.stalled, off.stalled]).toEqual([false, false]); // every slot reached its next action prompt
      expect(off.commands.every(row => row.spriteOrderInput === undefined)).toBe(true);
      const out = on.commands.findIndex(row => row.type === "switch-out");
      const pre = "pre" in route ? route.pre : [];
      expect(out >= 0).toBe(slots.some(slot => typeof slot === "object"));
      const labels = bodies(on).map(row => `${(row.command as { animation: { moveId: number } }).animation.moveId}`
        + `${row.spriteOrderInput ? "L" : "-"}${row.spriteInputHistoryKnown ? "A" : ""}`);
      expect(labels).toEqual([...pre, ...post]);
      // bodies before the menu: unchanged decisions (the seed 16 [0, 0] route lends the same first turn)
      if (pre.length) expect(bodies(on).slice(0, pre.length).map(row => row.spriteOrderInput))
        .toEqual(bodies(generatedCommandAnimationReplay(16, "on", [0, 0])).slice(0, pre.length).map(row => row.spriteOrderInput));
      const active = on.animations.map(row => row.ages.length > 0 && row.adapterActive.every(Boolean));
      expect(active.slice(0, labels.findIndex(label => label.endsWith("-")) >>> 0)).not.toContain(false);
    }
  }, 120000);

  it("battle-start events: Intimidate triples (pre-prompt + one stat plan each) and Trace / prevented-Intimidate messages seed; anything else refuses", () => {
    // prep47 (B) (docs/next-adapters-prep47.md): ROM 17/17 seed windows, 56/56 stat-copy + prompt windows, 17/17 first-move
    // edges exact. Trace and the prevented Intimidate allocate nothing (byte-identical to the no-event entry).
    const statPlans = (count: number) => {
      let tracker = createSpriteOrderTracker(knownEntryPrePromptSpriteOrderState("ordinary-factory"));
      for (let at = 0; at < count; at += 1) tracker = applySpriteOrderPresentationEvent(tracker, { kind: "stat-animation", argument: 22 });
      return tracker.cursor.order;
    };
    // Generated seeds by battle-start events (n = events): none; Trace (1); Intimidate (3); Intimidate + Trace (4); Intimidate on
    // each side (6); Intimidate + a held-item status cure (6, unlisted units: unknown).
    const classes: Record<number, number | "none" | "unknown"> = {
      3: "none", 26: 0, 83: 0, 34: 1, 53: 1, 116: 1, 1457: 1, 3114: 1, 2959: 2, 905: "unknown",
    };
    const events: Record<number, number> = { 3: 0, 26: 1, 83: 1, 34: 3, 53: 3, 116: 3, 1457: 4, 3114: 4, 2959: 6, 905: 6 };
    for (const [seed, expected] of Object.entries(classes)) {
      const run = generatedCommandAnimationReplay(Number(seed), "on", []);
      const host = run.state.liveMoveSpriteAllocatorHost!;
      expect(host.host.historyKnown).toBe(true);
      expect(run.state.battle!.nextEventSequence, `seed ${seed}`).toBe(events[Number(seed)]);
      if (expected === "unknown") expect(host.order.known, `seed ${seed}`).toBe(false);
      else if (expected === "none" || expected === 0) expect(host.order.free, `seed ${seed}`).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
      else expect(host.order, `seed ${seed}`).toEqual(statPlans(expected)); // before the prompt cycle
    }
    expect(statPlans(1).free.slice(0, 4)).toEqual([3, 4, 21, 20]);
    const ev = (kind: string, extra: object = {}) => ({ sequence: 0, payload: { kind, ...extra }, provenance: undefined }) as any;
    const triple = [ev("stat-stage-change"), ev("animation", { animationId: "STATS_CHANGE", battler: 1, target: 0, arguments: ["22"] }), ev("message")];
    const traced = ev("message", { messageId: "STRINGID_PKMNTRACED" });
    const prevented = ev("message", { messageId: "STRINGID_PREVENTEDFROMWORKING" });
    const seeded = (list: readonly unknown[]) => seedLiveSpriteOrderHostFromBattleStart(list as BattleKernelSemanticEvent[]);
    expect(seeded([]).tracker.cursor.order).toEqual(knownEntrySpriteOrderState("ordinary-factory"));
    expect(seeded([traced]).tracker.cursor.order).toEqual(knownEntrySpriteOrderState("ordinary-factory"));
    expect(seeded([prevented]).tracker.cursor.order).toEqual(knownEntrySpriteOrderState("ordinary-factory"));
    expect(seeded([traced]).bodies ?? 0).toBe(0);
    expect(seeded(triple).tracker.cursor.order).toEqual(statPlans(1));
    expect(seeded([...triple, traced]).tracker.cursor.order).toEqual(statPlans(1));
    expect(seeded([traced, ...triple]).tracker.cursor.order).toEqual(statPlans(1));
    const double = seeded([...triple, ...triple]);
    expect(double.tracker.cursor.order).toEqual(statPlans(2));
    expect(double.bodies).toBe(2);
    expect(statPlans(2).known).toBe(true);
    // Unlisted units and truncated triples stay unknown history.
    expect(seeded([ev("message", { messageId: "STRINGID_PKMNSITEMRESTOREDSTATUS" })]).tracker.cursor.order.known).toBe(false);
    expect(seeded([...triple, ev("message", { messageId: "STRINGID_PKMNSITEMRESTOREDSTATUS" })]).tracker.cursor.order.known).toBe(false);
    expect(seeded(triple.slice(0, 2)).tracker.cursor.order.known).toBe(false);
    expect(seeded([...triple, ...triple.slice(0, 2)]).tracker.cursor.order.known).toBe(false);
    expect(seeded([ev("animation", { animationId: "HELD_ITEM_EFFECT", battler: 0, arguments: [] })]).tracker.cursor.order.known).toBe(false);
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

describe("order host event keys (prep43)", () => {
  const ev = (sequence: number, kind: string, extra: object = {}) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
  const after = (events: readonly BattleKernelSemanticEvent[]) => {
    const host: LiveSpriteOrderHost = Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 });
    return advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: [{ events }] }, Number.POSITIVE_INFINITY).tracker;
  };
  const expected = (event: SpriteOrderPresentationEvent) =>
    applySpriteOrderPresentationEvent(createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")), event);
  const move = (moveId: number, turn: number, battler: 0 | 1) =>
    ev(10, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [`${moveId}`, `${turn}`, "0", "0", "0", "0"] });

  it("an odd choosetwoturnanim turn of Dig / Brick Break / Solar Beam / Razor Wind (like Sky Attack) keys the body 10000 + move id", () => {
    for (const [moveId, turn, key] of [[91, 0, 91], [91, 1, 10091], [280, 0, 280], [280, 1, 10280], [143, 1, 10143], [143, 0, 143],
      [76, 0, 76], [76, 1, 10076], [76, 2, 76], [13, 0, 13], [13, 1, 10013]] as const) {
      for (const battler of [0, 1] as const) {
        const tracker = after([move(moveId, turn, battler)]);
        const want = expected({ kind: "move-animation", moveId: key, attackerSide: battler === 0 ? "player" : "opponent" });
        expect(tracker.cursor.order.known, `${moveId}/${turn}`).toBe(true);
        expect(tracker.cursor.order.free, `${moveId}/${turn}`).toEqual(want.cursor.order.free);
      }
    }
    // The two Brick Break branches allocate differently: the key is load-bearing.
    expect(after([move(280, 1, 1)]).cursor.order.free).not.toEqual(after([move(280, 0, 1)]).cursor.order.free);
    // prep45: so do Solar Beam's charge (SolarBeamSetUp) and unleash (SolarBeamUnleash).
    expect(after([move(76, 1, 0)]).cursor.order.free).not.toEqual(after([move(76, 0, 0)]).cursor.order.free);
    // plans48: and Razor Wind's charge (RazorWindSetUp) and unleash (RazorWindUnleash).
    expect(after([move(13, 1, 1)]).cursor.order.free).not.toEqual(after([move(13, 0, 1)]).cursor.order.free);
  });

  it("Present keys PresentHeal (MOVE_ANIMATION damage <= 0, AnimTask_IsHealingMove) as 20217, PresentDamage as 217", () => {
    const present = (damage: number, battler: 0 | 1) =>
      ev(10, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: ["217", "0", "40", `${damage}`, "0", "0"] });
    for (const battler of [0, 1] as const) {
      const attackerSide = battler === 0 ? "player" as const : "opponent" as const;
      for (const [damage, key] of [[37, 217], [1, 217], [-40, 20217], [0, 20217]] as const) {
        const tracker = after([present(damage, battler)]);
        expect(tracker.cursor.order.known, `${damage}`).toBe(true);
        expect(tracker.cursor.order.free, `${damage}`).toEqual(expected({ kind: "move-animation", moveId: key, attackerSide }).cursor.order.free);
      }
      expect(after([present(-40, battler)]).cursor.order.free).not.toEqual(after([present(37, battler)]).cursor.order.free);
    }
  });

  it("WEATHER_VAR with sB_ANIM_ARG1 12 is SANDSTORM_CONTINUES (planned); 13 HAIL_CONTINUES and no argument stay unknown", () => {
    const weather = (args: readonly string[]) => after([ev(10, "animation", { animationId: "WEATHER_VAR", battler: 0, target: 0, arguments: args })]);
    const sandstorm = weather(["12"]);
    expect(sandstorm.cursor.order.known).toBe(true);
    expect(sandstorm.cursor.order.free).toEqual(expected({ kind: "general-animation", animation: "SANDSTORM_CONTINUES" }).cursor.order.free);
    expect(weather(["13"]).cursor.order.known).toBe(false);
    expect(weather(["13"]).invalidReason).toContain("HAIL_CONTINUES");
    expect(weather([]).cursor.order.known).toBe(false);
  });

  it("TURN_TRAP is keyed by the trapped battler's wrapped move (prep45); Clamp and an unknown argument stay unplanned", () => {
    const trap = (args: readonly string[], battler: 0 | 1) => after([ev(10, "animation", { animationId: "TURN_TRAP", battler, target: battler, arguments: args })]);
    for (const [move, animation] of [[83, "TURN_TRAP_FIRE_SPIN"], [250, "TURN_TRAP_WHIRLPOOL"], [328, "TURN_TRAP_SAND_TOMB"],
      [20, "TURN_TRAP_BIND"], [35, "TURN_TRAP_BIND"]] as const) {
      for (const battler of [0, 1] as const) {
        const tracker = trap([`${move}`], battler);
        expect(tracker.cursor.order.known, `${move}/${battler}`).toBe(true);
        expect(tracker.cursor.order.free, `${move}/${battler}`).toEqual(expected({ kind: "general-animation", animation }).cursor.order.free);
      }
    }
    // The four branches allocate differently (Fire Spin vs Bind): the key is load-bearing.
    expect(trap(["83"], 0).cursor.order.free).not.toEqual(trap(["35"], 0).cursor.order.free);
    for (const args of [["128"], ["0"], []]) {
      const tracker = trap(args, 1);
      expect(tracker.cursor.order.known, JSON.stringify(args)).toBe(false);
      expect(tracker.invalidReason, JSON.stringify(args)).toContain("TURN_TRAP");
      expect(tracker.invalidReason, JSON.stringify(args)).not.toContain("TURN_TRAP_");
    }
  });
});

// docs/next-adapters-prep49.md: the three order-host stops it folds, against its ROM receipts (tools/integration/fixtures/prep49/units.json,
// prep49Probe.py BP_PLY / BP_OPP / EXP_*: every job twice fresh, A == B; the prep49Check.ts sequences).
describe("order host prep49 stops: Baton Pass recall, the AI's DoSwitchOut summary, the double-KO reshow", () => {
  interface Win { f: number; F: number[]; C: [number, string][]; D: number[]; act: number }
  interface Job { class: string; identicalAB: boolean; F0: number[]; windows: Win[]; edges: { f: number; mv: number; F: number[] }[] }
  const jobs = (JSON.parse(readFileSync(new URL("../tools/integration/fixtures/prep49/units.json", import.meta.url), "utf8")) as
    { jobs: Record<string, Job> }).jobs;
  const ev = (sequence: number, kind: string, extra: object = {}, provenance?: object) =>
    Object.freeze({ sequence, payload: { kind, ...extra }, provenance }) as unknown as BattleKernelSemanticEvent;
  const batonPassRecall = (sequence: number, battler: 0 | 1) => ev(sequence, "set-battler-sprite-visibility", { battler, invisible: true },
    { opcodeName: "B_SCR_OP_RETURNTOBALL", sourceLabel: "BattleScript_EffectBatonPass" });
  const hostAt = (free: readonly number[]): LiveSpriteOrderHost =>
    Object.freeze({ ...createLiveSpriteOrderHost({ known: true, free, pendingDestroyed: [] }), promptRequestId: 3 });
  const segmentsOf = (...segments: BattleKernelSemanticEvent[][]) => segments.map(events => ({ events }));
  const pure = (tracker: ReturnType<typeof createSpriteOrderTracker>, events: readonly SpriteOrderPresentationEvent[]) =>
    events.reduce(applySpriteOrderPresentationEvent, tracker);

  it("player Baton Pass: party-menu exit (reset + reshowBoth), returntoball = forced-switch-out D o<slot>, switch-in; next body edge = ROM", () => {
    for (const id of ["bp-ply-aipom-onix", "bp-ply-jolteon-onix"]) {
      const job = jobs[id]!;
      expect(job.identicalAB).toBe(true);
      const segments = segmentsOf([ev(10, "animation", { animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["226", "0", "0", "0", "0", "0"] })],
        [batonPassRecall(20, 0), ev(21, "switch-in-animation", { battler: 0, partyIndex: 1 }), ev(22, "message")]);
      const resolution = { resolutionId: { requestId: 3 }, segmentIndex: 1, segments };
      // The menu runs between the body's segment and the recall's (the orchestrator's forced switch-in return).
      let host = advanceLiveSpriteOrderHost(hostAt(job.F0), resolution, Number.NEGATIVE_INFINITY, true);
      expect(liveSpriteOrderBattlersPresent(resolution, 1)).toEqual({ player: true, opponent: true });
      host = returnLiveSpriteOrderHostFromPartyMenu(host, liveSpriteOrderBattlersPresent(resolution, 1));
      const reshown = host.tracker;
      expect(reshown.cursor.order.known).toBe(true);
      host = advanceLiveSpriteOrderHost(host, resolution, Number.POSITIVE_INFINITY);
      const want = pure(reshown, [{ kind: "forced-switch-out", side: "player" }, { kind: "switch-in-start", side: "player" },
        { kind: "switch-in-finish", side: "player" }]);
      expect(host.tracker.cursor.order.known, id).toBe(true);
      expect(host.tracker.cursor.order.free, id).toEqual(want.cursor.order.free);
      expect(host.tracker.cursor.occupied, id).toEqual(want.cursor.occupied);
      // ROM: the free order at the next body (Onix Tackle) edge.
      expect(job.edges[0]!.mv).toBe(33);
      expect(host.tracker.cursor.order.free, id).toEqual(job.edges[0]!.F);
    }
  });

  it("opponent Baton Pass: returntoball after its own body = forced-switch-out {opponent}, switch-in {opponent}; next body edge = ROM", () => {
    for (const id of ["bp-opp-aipom-onix", "bp-opp-jolteon-onix"]) {
      const job = jobs[id]!;
      const body = job.edges[0]!;
      expect(body.mv).toBe(226);
      const after = job.windows.findIndex(w => w.f > body.f && !w.act);
      const host = advanceLiveSpriteOrderHost(hostAt(job.windows[after - 1]!.F), { resolutionId: { requestId: 3 }, segmentIndex: 0,
        segments: segmentsOf([batonPassRecall(20, 1), ev(21, "switch-in-animation", { battler: 1, partyIndex: 1 }), ev(22, "message")]) },
      Number.POSITIVE_INFINITY);
      expect(host.tracker.cursor.order.known, id).toBe(true);
      expect(host.tracker.cursor.order.free, id).toEqual(job.edges[1]!.F);
    }
  });

  it("a RETURNTOBALL without the Baton Pass label and without a targeting body still invalidates (return to ball)", () => {
    const host = advanceLiveSpriteOrderHost(hostAt(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER), { resolutionId: { requestId: 3 }, segmentIndex: 0,
      segments: segmentsOf([ev(20, "set-battler-sprite-visibility", { battler: 0, invisible: true }, { opcodeName: "B_SCR_OP_RETURNTOBALL" })]) },
    Number.POSITIVE_INFINITY);
    expect(host.tracker.cursor.order.known).toBe(false);
    expect(host.tracker.invalidReason).toBe("return to ball");
  });

  it("the AI's DoSwitchOut summary (no recall receipt) applies switch-out {opponent} before it; a move body before it still invalidates", () => {
    const summary = (sequence: number) => ev(sequence, "draw-party-status-summary", { battler: 1 },
      { opcodeName: "B_SCR_OP_DRAWPARTYSTATUSSUMMARY", sourceLabel: "BattleScript_DoSwitchOut" });
    const tail = [ev(31, "hide-party-status-summary", { battler: 1 }), ev(32, "switch-in-animation", { battler: 1, partyIndex: 2 }), ev(33, "message")];
    const run = (events: BattleKernelSemanticEvent[]) => advanceLiveSpriteOrderHost(
      Object.freeze({ ...createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), promptRequestId: 3 }),
      { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: segmentsOf(events) }, Number.POSITIVE_INFINITY).tracker;
    const tracker = run([summary(30), ...tail]);
    const want = pure(createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory")), [{ kind: "switch-out", side: "opponent" },
      { kind: "party-summary-next" }, { kind: "party-summary-hide" }, { kind: "next-mon-send-out" }]);
    expect(tracker.cursor.order.known).toBe(true);
    expect(want.cursor.order.known).toBe(true);
    expect(tracker.cursor.order.free).toEqual(want.cursor.order.free);
    expect(tracker.cursor.occupied).toEqual(want.cursor.occupied);
    expect(tracker.battlerSlots).toEqual(want.battlerSlots);
    // Pursuit-intercepted (a move body before the summary) is unprobed: still the summary stop.
    const pursuit = run([ev(20, "animation", { animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["33", "0", "0", "0", "0", "0"] }),
      summary(30), ...tail]);
    expect(pursuit.cursor.order.known).toBe(false);
    expect(pursuit.invalidReason).toBe("next-mon summary while the opponent battler is tracked");
    // Another label (a forced send-out's summary while the opponent battler is tracked) is unchanged.
    const unlabelled = run([ev(30, "draw-party-status-summary", { battler: 1 }), ...tail]);
    expect(unlabelled.invalidReason).toBe("next-mon summary while the opponent battler is tracked");
  });

  it("double KO: the forced party menu's reshow with neither battler is reshowNeither (Cfee;Cfee;Cf) = ROM; slots null, roles n0 / n3 / n6", () => {
    for (const id of ["exp-opp-electrode-abra", "exp-opp-glalie-abra", "exp-ply-electrode-abra", "exp-ply-glalie-abra"]) {
      const job = jobs[id]!;
      const host = returnLiveSpriteOrderHostFromPartyMenu(hostAt(job.F0), { player: false, opponent: false });
      const tracker = host.tracker;
      expect(tracker.cursor.order.known, id).toBe(true);
      // The plan's three windows are the ROM's first three after the menu exit (created / destroyed / free order).
      expect(tracker.cursor.order.free, id).toEqual(job.windows[2]!.F);
      const created = job.windows.slice(0, 3).flatMap(w => w.C.map(([slot]) => slot));
      const destroyed = job.windows.slice(0, 3).flatMap(w => w.D);
      expect([...tracker.cursor.occupied].sort((l, r) => l - r), id).toEqual(created.filter(s => !destroyed.includes(s)).sort((l, r) => l - r));
      expect(tracker.battlerSlots).toEqual({ player: null, opponent: null });
      expect(tracker.occupantRoles?.healthboxMain).toEqual({ player: job.windows[0]!.C[0]![0], opponent: job.windows[1]!.C[0]![0] });
      expect(tracker.occupantRoles?.shadow).toBe(job.windows[2]!.C[0]![0]);
      // Then the census order: the player's forced switch-in, the opponent's summary / send-out (the existing units) stay known.
      const next = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 3 }, segmentIndex: 0, segments: segmentsOf([
        ev(40, "switch-in-animation", { battler: 0, partyIndex: 1 }), ev(41, "draw-party-status-summary", { battler: 1 }), ev(42, "message"),
        ev(43, "hide-party-status-summary", { battler: 1 }), ev(44, "switch-in-animation", { battler: 1, partyIndex: 1 }), ev(45, "message")]) },
      Number.POSITIVE_INFINITY);
      const want = pure(tracker, [{ kind: "switch-in-start" }, { kind: "switch-in-finish" }, { kind: "party-summary-next" },
        { kind: "party-summary-hide" }, { kind: "next-mon-send-out" }]);
      expect(next.tracker.cursor.order.known, id).toBe(true);
      expect(next.tracker.cursor.order.free, id).toEqual(want.cursor.order.free);
    }
  });

  it("route seed 71 (Aipom Baton Pass, party screen answered): the next body (Mega Drain) lends a known order, adapter active; ON/OFF parity", () => {
    const on = generatedCommandAnimationReplay(71, "on", [2, 0], 0, false, true);
    const off = generatedCommandAnimationReplay(71, "off", [2, 0], 0, false, true);
    expectRulesEqual(on, off);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
    expect(JSON.stringify(on.state.facilityState)).toBe(JSON.stringify(off.state.facilityState));
    // Before prep49 the Baton Pass returntoball invalidated the order host and Mega Drain fell back.
    expect(on.animations.map(row => [row.moveId, row.attacker, row.adapterActive.length > 0 && row.adapterActive.every(Boolean)]))
      .toEqual([[226, 0, true], [72, 0, true]]);
    expect(bodies(on).map(row => row.spriteOrderInput !== undefined)).toEqual([true, true]);
    expect(off.commands.every(row => row.spriteOrderInput === undefined)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 120000);

  it("a reshow with the player battler but not the opponent's stays unobserved: invalidate", () => {
    const host = returnLiveSpriteOrderHostFromPartyMenu(hostAt(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER), { player: true, opponent: false });
    expect(host.tracker.cursor.order.known).toBe(false);
    expect(host.tracker.invalidReason).toBe("reshow without the opponent battler");
  });
});
