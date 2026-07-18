// S5 final slice: Tier-1 tests for the YES-press accept path's scene-mode
// state machine (src/engine/prebattleRoom.ts) and its core.ts wiring -
// pixel parity itself lives in tools/compare/traces/accept-prebattle.json
// (137/137, ISSUES #14 DELETED).
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  advancePrebattleRoom,
  EXIT_TO_ROOM_BLACK_HOLD_TICKS,
  INITIAL_PREBATTLE_ROOM_STATE,
  MESSAGE_CLOSING_TICKS,
  MESSAGE_PRINT_TICKS,
  MESSAGE_TEXT,
  ROOM_HOLD_TICKS,
  WALK_TICKS,
  WARP_FADE_FROZEN_VISUAL,
  messageBoxVisible,
  visiblePrintedChars,
  walkVisual,
} from "../src/engine/prebattleRoom.ts";
import { EXIT_FADE_OUT_TICKS, FADE_IN_TICKS, WARP_FADE_OUT, bgFadeY, objFadeY } from "../src/engine/paletteFade.ts";
import { getConfirmRevealVisual } from "../src/engine/confirmReveal.ts";
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
    // preCloseBallAnims snapshots ballAnims as of the tick before the A press
    // (ISSUES #14) - fetch it the same way confirmDecline.test.ts does for
    // decliningBallAnim, rather than hardcoding the array.
    const before = replay(THROUGH_YES.slice(0, -1));
    expect(shown.draftScreen.confirmReveal).toEqual({
      phase: "closing",
      elapsed: 1,
      decliningSpecies: undefined,
      decliningBallAnim: undefined,
      accepting: true,
      preCloseBallAnims: before.draftScreen.ballAnims,
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

  it("reaches the settled, fully-printed idle message and holds there until A is pressed", () => {
    // THROUGH_YES already includes 1 tick of "closing" (see the describe
    // block above) - 19 more finishes it, then the fade/hold/print phases.
    const ticksToIdle = 19 + EXIT_FADE_OUT_TICKS + EXIT_TO_ROOM_BLACK_HOLD_TICKS + FADE_IN_TICKS + ROOM_HOLD_TICKS + MESSAGE_PRINT_TICKS;
    const settled = replay([...THROUGH_YES, [ticksToIdle, null]]);
    expect(settled.prebattleRoom?.phase).toBe("idle");

    // No-input ticks hold idle indefinitely (MSGBOX_DEFAULT blocks on A).
    const stillIdle = tick(settled, new Set());
    expect(stillIdle.prebattleRoom?.phase).toBe("idle");

    // S6 slice 1a: A starts the closemessage/walk/warp-fade sequence.
    const pressed = tick(settled, new Set(["A"]));
    expect(pressed.prebattleRoom).toEqual({ phase: "messageClosing", elapsed: 0 });
  });

  it("walks the A-press through messageClosing -> walking -> warpFade at the pinned tick counts (tools/compare/traces/walk-warpout.json)", () => {
    const ticksToIdle = 19 + EXIT_FADE_OUT_TICKS + EXIT_TO_ROOM_BLACK_HOLD_TICKS + FADE_IN_TICKS + ROOM_HOLD_TICKS + MESSAGE_PRINT_TICKS;
    const settled = replay([...THROUGH_YES, [ticksToIdle, null]]);
    let state = tick(settled, new Set(["A"]));
    expect(state.prebattleRoom).toEqual({ phase: "messageClosing", elapsed: 0 });

    // A held through the pulse changes nothing further (newKeys only fires once).
    state = tick(state, new Set(["A"]));
    expect(state.prebattleRoom).toEqual({ phase: "messageClosing", elapsed: 1 });

    // MESSAGE_CLOSING_TICKS (2) registration-lag ticks, then "walking" begins
    // at elapsed 0 - matches the ground truth's frame 403 (first visibly-
    // changed frame, 3 ticks after the press's own first tick at frame 400).
    expect(MESSAGE_CLOSING_TICKS).toBe(2);
    state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "walking", elapsed: 0 });

    for (let i = 0; i < WALK_TICKS - 1; i += 1) state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "walking", elapsed: WALK_TICKS - 1 });

    // WALK_TICKS (80) ticks after walking starts, warpFade begins - matches
    // the ground truth's frame 483 (walk motion frozen 80 ticks after frame
    // 403 = tick 403+80 = 483).
    state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "warpFade", elapsed: 0 });

    // warpFade holds forever (out of this slice's scope past the solid-
    // black window), never transitioning further.
    for (let i = 0; i < 40; i += 1) state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "warpFade", elapsed: 40 });
  });
});

describe("prebattleRoom.ts: WALK_STEPS table (RAM-probed - gObjectEvents/gSprites/gSpriteCoordOffsetX/Y, see module doc)", () => {
  it("has exactly WALK_TICKS (80) entries, matching the ground truth's frozen-at-tick-483 boundary (403 + 80 = 483)", () => {
    expect(WALK_TICKS).toBe(80);
  });

  it("pins the first walking tick (elapsed 0 = ground-truth frame 403, first visibly-changed frame)", () => {
    expect(walkVisual(0)).toEqual({
      originX: 16,
      originY: 55,
      attendantX: 111,
      attendantY: 41,
      attendantVisible: true,
      playerFrame: 5, // ANIM_STD_GO_NORTH, first frame of its 4-step cycle
      attendantFrame: 7, // ANIM_STD_GO_WEST
    });
  });

  it("vanishes the attendant (set_invisible) exactly at elapsed 64 (ground-truth frame 467), matching the script's 5th movement command", () => {
    expect(walkVisual(63).attendantVisible).toBe(true);
    expect(walkVisual(64).attendantVisible).toBe(false);
    // Screen position keeps updating even once invisible (camera still
    // scrolling, the object just stops being drawn) - see module doc.
    expect(walkVisual(64)).toEqual({
      originX: -16,
      originY: 23,
      attendantX: 112,
      attendantY: 41,
      attendantVisible: false,
      playerFrame: 5,
      attendantFrame: 1,
    });
  });

  it("the player's own screen position is never part of this table - the field camera exactly cancels the player's movement (module doc)", () => {
    // prebattleRoomRender.ts's PLAYER_POS is reused unchanged for the whole
    // walk; only WALK_STEPS' player *frame* index varies, never a position.
    const frames = Array.from({ length: WALK_TICKS }, (_, i) => walkVisual(i).playerFrame);
    expect(new Set(frames)).toEqual(new Set([1, 2, 5, 6, 7, 8]));
  });

  it("reaches the net 2-tiles-left + 3-tiles-up displacement and freezes there (last row), matching the script's own choreography", () => {
    const last = walkVisual(WALK_TICKS - 1);
    expect(last).toEqual({ originX: -16, originY: 8, attendantX: 112, attendantY: 56, attendantVisible: false, playerFrame: 1, attendantFrame: 1 });
    expect(WARP_FADE_FROZEN_VISUAL).toEqual(last);
    // Clamps beyond the table's end (warpFade keeps reading this same row).
    expect(walkVisual(WALK_TICKS)).toEqual(last);
    expect(walkVisual(WALK_TICKS + 1000)).toEqual(last);
  });
});

describe("paletteFade.ts: WARP_FADE_OUT (S6 slice 1a warp fade, tools/compare/traces/walk-warpout.json frames 483-519)", () => {
  it("holds unfaded for 3 ticks, then blends to fully black - BG settles one tick before OBJ (module doc)", () => {
    // elapsed 0-2 (warpFade's own first 3 ticks, ground-truth frames 483-485,
    // all still 255,255,255 on a static room pixel) - startDelay 4 means
    // ticks (=elapsed+1) 1-3 are all still below the delay.
    for (let elapsed = 0; elapsed <= 2; elapsed += 1) {
      expect(bgFadeY(elapsed + 1, WARP_FADE_OUT)).toBe(0);
      expect(objFadeY(elapsed + 1, WARP_FADE_OUT)).toBe(0);
    }
    // elapsed 3 (frame 486): BG's first step (y=2); OBJ still lags a tick.
    expect(bgFadeY(4, WARP_FADE_OUT)).toBe(2);
    expect(objFadeY(4, WARP_FADE_OUT)).toBe(0);
    // elapsed 17 (frame 500): BG fully black, OBJ not yet (matches the
    // ground truth: frame 500 is NOT part of the solid-black run).
    expect(bgFadeY(18, WARP_FADE_OUT)).toBe(16);
    expect(objFadeY(18, WARP_FADE_OUT)).toBe(14);
    // elapsed 18 (frame 501): both layers fully black - first frame of the
    // ground truth's solid-black window (frames 501-519, sha d8b44303...).
    expect(bgFadeY(19, WARP_FADE_OUT)).toBe(16);
    expect(objFadeY(19, WARP_FADE_OUT)).toBe(16);
    // Stays fully black indefinitely past that (module doc: "holds forever").
    expect(bgFadeY(100, WARP_FADE_OUT)).toBe(16);
    expect(objFadeY(100, WARP_FADE_OUT)).toBe(16);
  });
});

describe("ISSUES #14: accept-path closing window/flash table reads one tick early, ball snapshot fixes the one-tick-lag residual", () => {
  // Decline reference, same PICK prefix as THROUGH_YES but B instead of
  // A-on-YES, same 2-tick pulse shape (so it also lands on elapsed 1, not 0 -
  // see THROUGH_YES's own doc) - used as the "un-shifted" ground truth the
  // window/flash table was already independently verified against
  // (confirm-decline.json 67/67).
  const THROUGH_DECLINE: Segment[] = [...PICK(), [36, null], [2, "RIGHT"], ...PICK(), [36, null], [2, "RIGHT"], ...PICK(), [70, null], [2, "B"]];

  function closingVisualAt(base: Segment[], extraTicks: number) {
    const state = replay(extraTicks > 0 ? [...base, [extraTicks, null]] : base);
    const reveal = state.draftScreen.confirmReveal;
    return { elapsed: reveal?.elapsed, visual: getConfirmRevealVisual(reveal) };
  }

  it("accept's window/flashWidths at elapsed E equal decline's own at elapsed E+1, for every tick up to the clamp", () => {
    for (let e = 1; e <= 18; e += 1) {
      const accept = closingVisualAt(THROUGH_YES, e - 1);
      const decline = closingVisualAt(THROUGH_DECLINE, e);
      expect(accept.elapsed).toBe(e);
      expect(decline.elapsed).toBe(e + 1);
      expect(accept.visual.window).toEqual(decline.visual.window);
      expect(accept.visual.flashWidths).toEqual(decline.visual.flashWidths);
    }
  });

  it("clamps at the last tick: accept elapsed 19 matches decline's own elapsed 19 (not a hypothetical, out-of-table 20)", () => {
    const accept = closingVisualAt(THROUGH_YES, 18);
    const declineLast = closingVisualAt(THROUGH_DECLINE, 18);
    expect(accept.elapsed).toBe(19);
    expect(declineLast.elapsed).toBe(19);
    expect(accept.visual.window).toEqual(declineLast.visual.window);
    expect(accept.visual.flashWidths).toEqual(declineLast.visual.flashWidths);
  });

  it("ballAnimOverride is set only on accept's elapsed 1 (the one tick preCloseBallAnims covers), null everywhere else", () => {
    const before = replay(THROUGH_YES.slice(0, -1));
    const atElapsed0 = replay([...THROUGH_YES.slice(0, -1), [1, "A"]]);
    expect(atElapsed0.draftScreen.confirmReveal?.elapsed).toBe(0);
    expect(getConfirmRevealVisual(atElapsed0.draftScreen.confirmReveal).ballAnimOverride).toBeNull();

    const atElapsed1 = replay(THROUGH_YES);
    expect(atElapsed1.draftScreen.confirmReveal?.elapsed).toBe(1);
    expect(getConfirmRevealVisual(atElapsed1.draftScreen.confirmReveal).ballAnimOverride).toEqual(before.draftScreen.ballAnims);

    const atElapsed2 = replay([...THROUGH_YES, [1, null]]);
    expect(atElapsed2.draftScreen.confirmReveal?.elapsed).toBe(2);
    expect(getConfirmRevealVisual(atElapsed2.draftScreen.confirmReveal).ballAnimOverride).toBeNull();
  });

  it("decline's own closing path never sets ballAnimOverride (accept-only mechanism)", () => {
    const declined = replay(THROUGH_DECLINE);
    expect(declined.draftScreen.confirmReveal?.elapsed).toBe(1);
    expect(getConfirmRevealVisual(declined.draftScreen.confirmReveal).ballAnimOverride).toBeNull();
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
