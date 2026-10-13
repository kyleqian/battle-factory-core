import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import { invalidateLiveSpriteAllocatorHost } from "../src/engine/liveSpriteAllocator.ts";
import {
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS, LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS,
} from "../src/engine/liveMoveSpriteAllocator.ts";
import {
  advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, lendLiveSpriteOrder, liveSpriteAllocatorReseedable,
  liveSpriteOrderHostOrder, markLiveSpriteOrderDeferredBody, reseedLiveSpriteAllocatorAfterSendOut,
  type LiveSpriteOrderHost,
} from "../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { WORDS_ORDER_GENERAL_ANIMATION, WORDS_ORDER_UNIT_MOVE_IDS } from "../src/engine/wordsOrderUnits.ts";

// land87 (reseed85 landed; docs/land87-words-occupancy-reseed.md): the post-KO send-out allocator reseed after a words-order unit reads the
// order host's word-free occupancy shadow while the free ORDER stays deferred.
const ev = (sequence: number, kind: string, extra: object = {}) =>
  Object.freeze({ sequence, payload: { kind, ...extra }, provenance: undefined }) as unknown as BattleKernelSemanticEvent;
const body = (seq: number, id: number, battler: 0 | 1) =>
  ev(seq, "animation", { animationId: "MOVE_ANIMATION", battler, target: 1 - battler, arguments: [String(id), "0", "40", "10", "70", "0"] });
const rain = (seq: number) => ev(seq, "animation", { animationId: WORDS_ORDER_GENERAL_ANIMATION, battler: 0, target: 0, arguments: [] });
const hit = (seq: number) => ev(seq, "animation", { animationId: "HIT_ANIMATION", battler: 0, target: 0, arguments: [] });
const KO = (seq: number): BattleKernelSemanticEvent[] => [ev(seq, "faint-animation", { battler: 1 }), ev(seq + 1, "draw-party-status-summary", { battler: 1 }),
  ev(seq + 2, "hide-party-status-summary", { battler: 1 }), ev(seq + 3, "switch-in-animation", { battler: 1 })];

/** Drive one resolution; a words body (`marks` ids) is lent + marked as the orchestrator does. */
function drive(events: BattleKernelSemanticEvent[], marks: readonly number[] = []): LiveSpriteOrderHost {
  let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true);
  const resolution = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events }] };
  for (const event of events) {
    const payload = event.payload as unknown as { kind: string; animationId?: string; battler: 0 | 1; target: 0 | 1; arguments: string[] };
    const isBody = payload.kind === "animation" && payload.animationId === "MOVE_ANIMATION";
    if (isBody && marks.includes(Number(payload.arguments[0]))) {
      host = advanceLiveSpriteOrderHost(host, resolution, event.sequence, true);
      const request = battleMoveAnimationRequest(payload.battler, payload.target, payload.arguments);
      host = markLiveSpriteOrderDeferredBody(host, lendLiveSpriteOrder(host, request.moveId), request, `k${event.sequence}`);
    }
    host = advanceLiveSpriteOrderHost(host, resolution, event.sequence);
  }
  return host;
}
const firstMove = createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove;
const invalid = invalidateLiveSpriteAllocatorHost(firstMove);

describe("land87: allocator reseed through a pending words marker's occupancy shadow", () => {
  for (const [name, events, marks] of [
    ["Sand-Attack 28 marker", [body(10, 28, 0), hit(11), ...KO(12)], [28]],
    ["Mud-Slap 189 marker", [body(10, 189, 1), hit(11), ...KO(12)], [189]],
    ["RAIN_CONTINUES marker", [rain(10), ...KO(11)], []],
    ["nested words unit (Mud-Slap after Sand-Attack)", [body(10, 28, 0), hit(11), body(12, 189, 1), hit(13), ...KO(14)], [28, 189]],
  ] as const) {
    it(`${name}: KO + send-out is reseedable, reseeds the known-entry firstMove, order stays unknown, lend unchanged`, () => {
      const host = drive([...events], marks);
      expect(host.deferred).toBeDefined();
      expect(host.tracker.cursor.order.known).toBe(false);
      expect(host.deferredOccupancy?.cursor.order.known).toBe(true);
      expect(liveSpriteAllocatorReseedable(host)).toBe(true);
      expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, host)).toEqual(firstMove);
      expect(reseedLiveSpriteAllocatorAfterSendOut(firstMove, host)).toBe(firstMove);
      expect(liveSpriteOrderHostOrder(host).known).toBe(false);
      expect(lendLiveSpriteOrder(host, 33)?.deferred).toBe(host.deferred);
      expect(lendLiveSpriteOrder(host, 33)?.free).toEqual([]);
    });
  }

  it("refuses: no send-out yet, an invalidating unit or planless body inside the marker, no marker, the shadow dropped with the marker", () => {
    const early = drive([body(10, 28, 0), hit(11), ...KO(12).slice(0, 3)], [28]);
    expect(liveSpriteAllocatorReseedable(early)).toBe(false);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, early)).toBe(invalid);
    // Gust 16 has no order plan: its unit invalidates the replay
    const planless = drive([body(10, 28, 0), hit(11), body(12, 16, 1), ...KO(13)], [28]);
    expect(planless.deferred).toBeDefined();
    expect(liveSpriteAllocatorReseedable(planless)).toBe(false);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, planless)).toBe(invalid);
    const explicit = drive([body(10, 28, 0), ev(11, "animation", { animationId: "SCENE_OFF_ATTACK_PAUSE", battler: 0, target: 0, arguments: [] }), ...KO(12)], [28]);
    expect(liveSpriteAllocatorReseedable(explicit)).toBe(false);
    // a non-words invalid tracker (no marker)
    const unmarked = drive([body(10, 28, 0), hit(11), ...KO(12)]);
    expect(unmarked.deferred).toBeUndefined();
    expect(unmarked.deferredOccupancy).toBeUndefined();
    expect(liveSpriteAllocatorReseedable(unmarked)).toBe(false);
    expect(reseedLiveSpriteAllocatorAfterSendOut(invalid, unmarked)).toBe(invalid);
    // the shadow lives and dies with the marker
    const marked = drive([body(10, 28, 0), hit(11), ...KO(12)], [28]);
    const { deferred: _d, ...withoutMarker } = marked;
    expect(liveSpriteAllocatorReseedable(Object.freeze(withoutMarker) as LiveSpriteOrderHost)).toBe(false);
  });

  it("policy pin: every words unit is allocator-net-zero (the shadow's license), Flatter 260 and Astonish 310 (ord149) included", () => {
    expect(WORDS_ORDER_UNIT_MOVE_IDS).toEqual([28, 189, 240, 260, 291, 301, 310]);
    for (const id of WORDS_ORDER_UNIT_MOVE_IDS) expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS, `move ${id}`).toContain(id);
    expect(LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS.has("RAIN_CONTINUES")).toBe(true);
    expect(WORDS_ORDER_GENERAL_ANIMATION).toBe("RAIN_CONTINUES");
  });

  it("receipt pins: reseed85 occupancy audit and windows", () => {
    const audit = JSON.parse(readFileSync("tools/integration/fixtures/reseed85/occupancy-audit.json", "utf8")) as
      { summary: { pairsSame: number; allRoleIsomorphic: boolean; allAligned: boolean } };
    expect(audit.summary.pairsSame).toBe(4);
    expect(audit.summary.allRoleIsomorphic).toBe(true);
    expect(audit.summary.allAligned).toBe(true);
    const windows = JSON.parse(readFileSync("tools/integration/fixtures/reseed85/windows.json", "utf8")) as { summary: { pass: boolean } };
    expect(windows.summary.pass).toBe(true);
  });

  it("land87 live receipt: 8 re-rendered windows live 0 px, census +58 commands, 0 regressions", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/land87-live-receipt.json", "utf8")) as
      { windowsSummary: { count: number; allLive: boolean; allZeroPx: boolean; allRunsEqual: boolean }; census: { commandsGained: number; regressions: number; keySequenceIdentical: boolean } };
    expect(receipt.windowsSummary).toMatchObject({ count: 8, allLive: true, allZeroPx: true, allRunsEqual: true });
    expect(receipt.census).toMatchObject({ commandsGained: 58, regressions: 0, keySequenceIdentical: true });
  });
});
