import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { beginLiveSpriteOrderTurn, createLiveSpriteOrderHost, type LiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import { applySpriteOrderPresentationEvent, type SpriteOrderTracker } from "../src/engine/spriteOrderEventTransform.ts";

// prep47 (A) (docs/next-adapters-prep47.md): a retained opponent locked action (Dig, Petal Dance, ...) is continued across the
// player's next command. HandleTurnActionSelectionState skips the prompt only for the locked battler, so the non-locked
// player sees its ordinary prompt cycle at the turn boundary, between the retained resolution's last applied segment and the
// appended continuation segment (ROM: 37/37 prompt pairs, 36/36 spans exact). A locked player shows no prompt (invalidates).
const promptCycle = (tracker: SpriteOrderTracker) => applySpriteOrderPresentationEvent(
  applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }), { kind: "actions-committed" });

function drainedRetainedHost(): LiveSpriteOrderHost {
  const host = createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory"));
  return Object.freeze({ ...host, promptRequestId: 1, cursor: Object.freeze({ requestId: 1, segmentIndex: 0, nextEventIndex: 9, drained: true }) });
}

describe("retained locked-action continuation keeps the sprite-order host known (prep47 (A))", () => {
  it("beginLiveSpriteOrderTurn on a drained retained cursor, same request id: prompt shown = the prompt cycle; locked player invalidates", () => {
    const retained = drainedRetainedHost();
    const shown = beginLiveSpriteOrderTurn(retained, 1, true);
    expect(shown.tracker).toEqual(promptCycle(retained.tracker));
    expect(shown.tracker.cursor.order.known).toBe(true);
    expect(shown.cursor).toEqual(retained.cursor);
    expect(shown.promptRequestId).toBe(1);
    // A locked player action (no prompt) is unchanged: it invalidates.
    const locked = beginLiveSpriteOrderTurn(retained, 1, false);
    expect(locked.tracker.cursor.order.known).toBe(false);
    expect(locked.tracker.invalidReason).toBe("command resolution without an action prompt");
  });

  it("generated seed 0: the opponent's Dig, retained across the player's command, continues with a known order and lends", () => {
    // Every orchestrator order-host change, with the resolution it belongs to.
    const changes: { frame: number; requestId: number | undefined; segments: number | undefined; host: LiveSpriteOrderHost | undefined }[] = [];
    const run = generatedCommandAnimationReplay(0, "on", [0, 0, 0], 0, true, false, (state, frame) => {
      const host = state.liveMoveSpriteAllocatorHost?.orderHost;
      if (changes.at(-1)?.host === host) return;
      const r = state.battleResolutionPresentation;
      changes.push({ frame, requestId: r?.resolutionId.requestId, segments: r?.segments.length, host });
    });
    // The turn boundary: the retained resolution (request 1, Dig setup) gains its appended continuation segment.
    const at = changes.findIndex((row, index) => index > 0 && row.requestId === 1 && row.segments === 2
      && changes[index - 1]!.requestId === 1 && changes[index - 1]!.segments === 1);
    expect(at).toBeGreaterThan(0);
    const before = changes[at - 1]!.host!, after = changes[at]!.host!;
    expect(before.cursor).toMatchObject({ requestId: 1, segmentIndex: 0, drained: true });
    expect(before.tracker.cursor.order.known).toBe(true);
    // Same request id, the player's prompt cycle on the drained retained cursor (master before prep47: invalidated).
    expect(after.promptRequestId).toBe(1);
    expect(after.tracker.cursor.order.known).toBe(true);
    expect(after.tracker).toEqual(promptCycle(before.tracker));
    // The appended continuation segment's bodies (opponent Dig unleash, then the player's move) are lent the host's order.
    const continuation = run.commands.filter(row => row.type === "move-animation"
      && row.orderHostView?.cursor?.requestId === 1 && row.orderHostView.cursor.segmentIndex === 1);
    expect(continuation.map(row => (row.command as { animation?: { moveId: number; attacker: number } }).animation))
      .toMatchObject([{ moveId: 91, attacker: 1 }, { attacker: 0 }]);
    for (const row of continuation) {
      expect(row.orderHostView!.known).toBe(true);
      expect(row.spriteOrderInput).toBeDefined();
    }
    expect(continuation[0]!.spriteOrderInput).toEqual(after.tracker.cursor.order.free);
  }, 60000);
});
