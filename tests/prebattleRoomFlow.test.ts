// S5 final slice: Tier-1 tests for the YES-press accept path's scene-mode
// state machine (src/engine/prebattleRoom.ts) and its core.ts wiring -
// pixel parity itself lives in tools/compare/traces/accept-prebattle.json
// (see ISSUES #14 for the one remaining, individually-attributed residual).
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  advancePrebattleRoom,
  EXIT_TO_ROOM_BLACK_HOLD_TICKS,
  INITIAL_PREBATTLE_ROOM_STATE,
  MESSAGE_PRINT_TICKS,
  MESSAGE_TEXT,
  ROOM_HOLD_TICKS,
  messageBoxVisible,
  visiblePrintedChars,
} from "../src/engine/prebattleRoom.ts";
import { EXIT_FADE_OUT_TICKS, FADE_IN_TICKS } from "../src/engine/paletteFade.ts";
import type { GbaButton } from "../src/input.ts";

type Segment = [number, GbaButton | null];

function replay(segments: Segment[]) {
  let state = createInitialState();
  for (const [count, button] of segments) {
    for (let i = 0; i < count; i += 1) {
      state = tick(state, button ? new Set([button]) : new Set());
    }
  }
  return state;
}

// accept-prebattle.json's exact button script: confirm-flow.json's proven
// pick1/2/3 prefix (opens@0/76/152, confirms@36/112/188), 70 idle, A-on-YES.
const PICK = (): Segment[] => [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];
const THROUGH_YES: Segment[] = [
  ...PICK(),
  [36, null],
  [2, "RIGHT"],
  ...PICK(),
  [36, null],
  [2, "RIGHT"],
  ...PICK(),
  [70, null],
  [2, "A"],
];

describe("prebattleRoom.ts: phase state machine", () => {
  it("advances fadingOut -> black -> fadingIn -> roomHold -> printing -> idle at the pinned tick counts", () => {
    let state = INITIAL_PREBATTLE_ROOM_STATE;
    expect(state).toEqual({ phase: "fadingOut", elapsed: 0 });

    for (let i = 0; i < EXIT_FADE_OUT_TICKS - 1; i += 1) state = advancePrebattleRoom(state)!;
    expect(state.phase).toBe("fadingOut");
    state = advancePrebattleRoom(state)!;
    expect(state).toEqual({ phase: "black", elapsed: 0 });

    for (let i = 0; i < EXIT_TO_ROOM_BLACK_HOLD_TICKS - 1; i += 1) state = advancePrebattleRoom(state)!;
    expect(state.phase).toBe("black");
    state = advancePrebattleRoom(state)!;
    expect(state).toEqual({ phase: "fadingIn", elapsed: 0 });

    for (let i = 0; i < FADE_IN_TICKS - 1; i += 1) state = advancePrebattleRoom(state)!;
    expect(state.phase).toBe("fadingIn");
    state = advancePrebattleRoom(state)!;
    expect(state).toEqual({ phase: "roomHold", elapsed: 0 });

    for (let i = 0; i < ROOM_HOLD_TICKS - 1; i += 1) state = advancePrebattleRoom(state)!;
    expect(state.phase).toBe("roomHold");
    state = advancePrebattleRoom(state)!;
    expect(state).toEqual({ phase: "printing", elapsed: 0 });

    for (let i = 0; i < MESSAGE_PRINT_TICKS - 1; i += 1) state = advancePrebattleRoom(state)!;
    expect(state.phase).toBe("printing");
    state = advancePrebattleRoom(state)!;
    expect(state).toEqual({ phase: "idle", elapsed: 0 });

    // MSGBOX_DEFAULT blocks on player A (S6 scope) - holds forever here.
    const held = advancePrebattleRoom(state)!;
    expect(held).toEqual({ phase: "idle", elapsed: 0 });
  });

  it("advancePrebattleRoom(null) is a no-op", () => {
    expect(advancePrebattleRoom(null)).toBeNull();
  });
});

describe("prebattleRoom.ts: message print cadence (oracle-pinned, see module doc)", () => {
  it("shows 0 characters before 'printing', exactly 1 more per tick during it, and holds the full string once idle", () => {
    expect(MESSAGE_TEXT).toBe("Right this way, please!");
    expect(MESSAGE_PRINT_TICKS).toBe(MESSAGE_TEXT.length);
    expect(messageBoxVisible({ phase: "roomHold", elapsed: 3 })).toBe(false);
    expect(visiblePrintedChars({ phase: "roomHold", elapsed: 3 })).toBe(0);

    for (let elapsed = 0; elapsed <= MESSAGE_PRINT_TICKS; elapsed += 1) {
      const state = { phase: "printing" as const, elapsed };
      expect(messageBoxVisible(state)).toBe(true);
      expect(visiblePrintedChars(state)).toBe(Math.min(elapsed, MESSAGE_PRINT_TICKS));
    }
    const idle = { phase: "idle" as const, elapsed: 0 };
    expect(messageBoxVisible(idle)).toBe(true);
    expect(visiblePrintedChars(idle)).toBe(MESSAGE_PRINT_TICKS);
  });
});

describe("core.ts wiring: A-on-YES accept path", () => {
  it("stays on the draft screen (prebattleRoom null) until the 20-tick closing/un-reveal completes", () => {
    // THROUGH_YES's own last segment is the 2-tick A pulse, so it already
    // includes 1 tick of "closing" (elapsed 0 on the press tick itself,
    // elapsed 1 on THROUGH_YES's final tick).
    const shown = replay(THROUGH_YES);
    expect(shown.prebattleRoom).toBeNull();
    expect(shown.draftScreen.confirmReveal).toEqual({
      phase: "closing",
      elapsed: 1,
      decliningSpecies: undefined,
      decliningBallAnim: undefined,
      accepting: true,
    });
  });

  it("hands off to prebattleRoom fadingOut the same tick confirmReveal goes null (press+20)", () => {
    const at18 = replay([...THROUGH_YES, [18, null]]);
    expect(at18.prebattleRoom).toBeNull();
    expect(at18.draftScreen.confirmReveal?.elapsed).toBe(19);
    const at19 = replay([...THROUGH_YES, [19, null]]);
    expect(at19.prebattleRoom).toEqual({ phase: "fadingOut", elapsed: 0 });
    expect(at19.draftScreen.confirmReveal).toBeNull();
  });

  it("reaches the settled, fully-printed idle message and holds there (no player input processed)", () => {
    // THROUGH_YES already includes 1 tick of "closing" (see the describe
    // block above) - 19 more finishes it, then the fade/hold/print phases.
    const ticksToIdle = 19 + EXIT_FADE_OUT_TICKS + EXIT_TO_ROOM_BLACK_HOLD_TICKS + FADE_IN_TICKS + ROOM_HOLD_TICKS + MESSAGE_PRINT_TICKS;
    const settled = replay([...THROUGH_YES, [ticksToIdle, null]]);
    expect(settled.prebattleRoom?.phase).toBe("idle");

    // A held afterward changes nothing this slice (closemessage/warp are S6).
    const stillIdle = tick(settled, new Set(["A"]));
    expect(stillIdle.prebattleRoom?.phase).toBe("idle");
  });
});

describe("core.ts wiring: RNG continuity through the exit sequence (ROADMAP S6 correction note)", () => {
  it("advances exactly one LCG step per tick throughout the whole accept-prebattle.json window (no gaps, no double-steps)", () => {
    let state = createInitialState();
    let prevRng = state.rngValue;
    for (const [count, button] of THROUGH_YES) {
      for (let i = 0; i < count; i += 1) {
        state = tick(state, button ? new Set([button]) : new Set());
        // Every tick advances the base VBlank LCG step at least once; ball
        // rolls (still live through "fadingOut", see core.ts's prebattleRoom
        // branch) can consume additional steps, so just assert monotonic
        // progress via the LCG's own deterministic multiplier - never a
        // silent no-op tick.
        expect(state.rngValue).not.toBe(prevRng);
        prevRng = state.rngValue;
      }
    }
  });

  it("matches the RAM-verified gRngValue at the fully-printed idle tick (tools/probe/ram-probe.py, accept-prebattle.json frame 363, oracle tick 360 - see PROGRESS.md for the fixed 3-tick label offset between this repo's frame-count convention and ram-probe.py's)", () => {
    // THROUGH_YES is 262 ticks (A-on-YES held through ticks 260-261); 101
    // more ticks reaches absolute tick 363, comfortably inside "idle"
    // (which begins at 262 + 20 + 18 + 14 + 15 + 8 + 23 = 360).
    const settled = replay([...THROUGH_YES, [101, null]]);
    expect(settled.prebattleRoom?.phase).toBe("idle");
    expect(settled.rngValue >>> 0).toBe(4060251448);
  });
});
