import { describe, expect, it } from "vitest";
import {
  createOpponentFaintPresentationOwner,
  opponentFaintContinuationElapsed,
  storeOpponentFaintDismiss,
} from "../src/engine/opponentFaintPresentationOwner.ts";

describe("opponent-faint presentation owner", () => {
  it("composes the kernel-derived faint and automatic switch facts before dismissal", () => {
    const owner = createOpponentFaintPresentationOwner();

    expect(owner.resolution.faintedBattler).toBe(1);
    expect(owner.switchIn.replacementSpecies).toBe("MURKROW");
    expect(owner.faintText).toEqual({ redraw: "settled", input: "ready" });
    expect(owner.dismiss).toBeNull();
    expect(Object.isFrozen(owner)).toBe(true);
    expect(Object.isFrozen(owner.faintText)).toBe(true);
  });

  it("publishes the accepted edge, frozen cursor, and automatic continuation atomically and once", () => {
    const before = createOpponentFaintPresentationOwner();
    const accepted = storeOpponentFaintDismiss(before, 15_781);

    expect(accepted.dismiss).toEqual({
      acceptedElapsed: 15_781,
      input: "accepted",
      cursor: { mode: "frozen", frozenAtElapsed: 15_781 },
      continuation: {
        kind: "automatic-opponent-switch-in",
        startedAtElapsed: 15_781,
      },
    });
    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(accepted.dismiss)).toBe(true);
    expect(Object.isFrozen(accepted.dismiss!.cursor)).toBe(true);
    expect(Object.isFrozen(accepted.dismiss!.continuation)).toBe(true);
    expect(storeOpponentFaintDismiss(accepted, 15_811)).toBe(accepted);
  });

  it("measures continuation time only from the accepted edge", () => {
    const owner = storeOpponentFaintDismiss(createOpponentFaintPresentationOwner(), 100);

    expect(opponentFaintContinuationElapsed(owner, 100)).toBe(0);
    expect(opponentFaintContinuationElapsed(owner, 126)).toBe(26);
    expect(opponentFaintContinuationElapsed(null, 126)).toBeNull();
  });
});
