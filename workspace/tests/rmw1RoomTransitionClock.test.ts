// rmw1 (docs/rmw1-room-walk-and-summary-fade.md): the ROM's transition intro takes its first picture on an odd absolute frame; the ordinary
// room's transition clock runs one frame ahead when the engine's own first picture (press + 4 + draw + 2) would land on an even one.
import { describe, expect, it } from "vitest";
import {
  INITIAL_BATTLE_2_ROOM_STATE,
  alignOrdinaryTransitionClock,
  battleRoomAcceptedState,
  ordinaryBattleTransitionTe,
  ordinaryTransitionDrawElapsed,
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";

const closing = (encounter: "first" | "later"): BattleRoomState => ({
  ...(encounter === "later" ? INITIAL_BATTLE_2_ROOM_STATE : { phase: "entering", elapsed: 0 }),
  phase: "msgboxClosing",
  elapsed: 0,
});

describe("rmw1: the ordinary transition clock follows the ROM's odd first picture", () => {
  for (const encounter of ["first", "later"] as const) {
    it(`${encounter} battle: ahead by one frame exactly when press + 4 + draw + 2 is even`, () => {
      const draw = ordinaryTransitionDrawElapsed(closing(encounter));
      for (let press = 740; press < 750; press++) {
        const aligned = alignOrdinaryTransitionClock(closing(encounter), press);
        const even = (press + 4 + draw + 2) % 2 === 0;
        expect(aligned.transitionClockAhead).toBe(even ? 1 : undefined);
        const base = ordinaryBattleTransitionTe(closing(encounter));
        expect(ordinaryBattleTransitionTe(aligned)).toBe(base + (even ? 1 : 0));
        expect(ordinaryBattleTransitionTe(aligned, false)).toBe(closing(encounter).elapsed + (even ? 1 : 0));
      }
    });
  }

  it("is untouched without a press frame and outside the closing phase; handoff elapsed is not moved", () => {
    const s = closing("first");
    expect(alignOrdinaryTransitionClock(s)).toBe(s);
    const settled: BattleRoomState = { ...s, phase: "settled" };
    expect(alignOrdinaryTransitionClock(settled, 742)).toBe(settled);
    expect(battleRoomAcceptedState({ ...s, phase: "settled" }).transitionClockAhead).toBeUndefined();
  });
});
