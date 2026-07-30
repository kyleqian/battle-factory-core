// S6 slice 2a: Tier-1 tests for the battle-room ENTRY window's state
// machine (src/engine/battleRoom.ts) and its core.ts wiring - pixel parity
// itself lives in tools/compare/traces/room-entry.json (110/110).
import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
  advanceBattleRoom,
  ENTRY_SETTLE_ELAPSED,
  FADE_IN,
  INITIAL_BATTLE_ROOM_STATE,
  MSGBOX_APPEAR_ELAPSED,
  MSGBOX_CLOSE_TICKS,
  MSGBOX_LINE1,
  MSGBOX_LINE2,
  MSGBOX_PRINT_COMPLETE_ELAPSED,
  MSGBOX_PRINT_TICKS,
  OPPONENT_ADD_ELAPSED,
  OPPONENT_SETTLED_SCREEN_Y,
  OPPONENT_WALK_END_ELAPSED,
  WARP_FADE_TO_ROOM_ELAPSED,
  entryStep,
  msgboxVisual,
  opponentStep,
  scientistTurnFrame,
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";
import { EXIT_TO_ROOM_BLACK_HOLD_TICKS, MESSAGE_CLOSING_TICKS, MESSAGE_PRINT_TICKS, ROOM_HOLD_TICKS, WALK_TICKS } from "../src/engine/prebattleRoom.ts";
import { EXIT_FADE_OUT_TICKS, FADE_IN_TICKS, bgFadeY, objFadeY } from "../src/engine/paletteFade.ts";
import type { GbaButton } from "../src/input.ts";

type Segment = [number, GbaButton | null];

function replay(segments: Segment[]) {
  let state = createInitialState({ appRoute: "canonical-recorded" });
  for (const [count, button] of segments) {
    for (let i = 0; i < count; i += 1) {
      state = tick(state, button ? new Set([button]) : new Set());
    }
  }
  return state;
}

describe("battleRoom.ts: advanceBattleRoom", () => {
  it("just increments elapsed - this window reads no input", () => {
    let state = INITIAL_BATTLE_ROOM_STATE;
    expect(state.elapsed).toBe(0);
    state = advanceBattleRoom(state);
    expect(state).toEqual({ phase: "entering", elapsed: 1 });
    state = advanceBattleRoom(state);
    expect(state).toEqual({ phase: "entering", elapsed: 2 });
  });
});

describe("battleRoom.ts: entryStep (RAM-probed per-tick table)", () => {
  it("holds camPanY at 0 and the decoy at its idle north-facing pose through elapsed 22 (RAM ticks 519-541, pan not yet started)", () => {
    expect(entryStep(0)).toEqual({ camPanY: 0, decoyFrame: 1, decoyHFlip: false });
    expect(entryStep(22)).toEqual({ camPanY: 0, decoyFrame: 1, decoyHFlip: false });
  });

  it("pans exactly 1px/tick from elapsed 23 through the settle at elapsed 102 (camPanY 1..80)", () => {
    expect(entryStep(23).camPanY).toBe(1);
    expect(entryStep(23).decoyFrame).toBe(6);
    for (let e = 23; e <= 102; e += 1) {
      expect(entryStep(e).camPanY).toBe(e - 22);
    }
    expect(entryStep(102).camPanY).toBe(80);
  });

  it("settles the decoy facing east (frame 2, hFlip) one tick after the pan itself stops", () => {
    expect(entryStep(102)).toEqual({ camPanY: 80, decoyFrame: 1, decoyHFlip: false });
    expect(entryStep(103)).toEqual({ camPanY: 80, decoyFrame: 2, decoyHFlip: true });
  });

  it("clamps at the settled row indefinitely past elapsed 103 (ENTRY_SETTLE_ELAPSED)", () => {
    expect(ENTRY_SETTLE_ELAPSED).toBe(103);
    expect(entryStep(103)).toEqual(entryStep(200));
    expect(entryStep(103)).toEqual(entryStep(10000));
  });

  it("cycles the decoy's walk frame through 6/1/5/1 in 8-tick groups (sAnim_GoNorth, object_event_anims.h:211-218)", () => {
    // elapsed 23-30: frame 6; 31-38: frame 1; 39-46: frame 5; 47-54: frame 1 (one full cycle).
    expect(entryStep(30).decoyFrame).toBe(6);
    expect(entryStep(31).decoyFrame).toBe(1);
    expect(entryStep(38).decoyFrame).toBe(1);
    expect(entryStep(39).decoyFrame).toBe(5);
    expect(entryStep(46).decoyFrame).toBe(5);
    expect(entryStep(47).decoyFrame).toBe(1);
  });
});

describe("core.ts wiring: prebattleRoom's warpFade hands off to battleRoom", () => {
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

  it("switches prebattleRoom -> battleRoom at exactly WARP_FADE_TO_ROOM_ELAPSED, then free-runs with no input", () => {
    const ticksToIdle = 19 + EXIT_FADE_OUT_TICKS + EXIT_TO_ROOM_BLACK_HOLD_TICKS + FADE_IN_TICKS + ROOM_HOLD_TICKS + MESSAGE_PRINT_TICKS;
    const settled = replay([...THROUGH_YES, [ticksToIdle, null]]);
    let state = tick(settled, new Set(["A"]));
    for (let i = 0; i < MESSAGE_CLOSING_TICKS - 1; i += 1) state = tick(state, new Set());
    state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "walking", elapsed: 0 });

    for (let i = 0; i < WALK_TICKS - 1; i += 1) state = tick(state, new Set());
    state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "warpFade", elapsed: 0 });

    for (let i = 0; i < WARP_FADE_TO_ROOM_ELAPSED - 1; i += 1) state = tick(state, new Set());
    expect(state.prebattleRoom).toEqual({ phase: "warpFade", elapsed: WARP_FADE_TO_ROOM_ELAPSED - 1 });
    expect(state.battleRoom).toBeNull();

    state = tick(state, new Set());
    expect(state.prebattleRoom).toBeNull();
    expect(state.battleRoom).toEqual({ phase: "entering", elapsed: 0 });

    // Holds indefinitely past settle, reading no input (even A held).
    for (let i = 0; i < 200; i += 1) state = tick(state, new Set(["A"]));
    expect(state.battleRoom).toEqual({ phase: "entering", elapsed: 200 });
  });
});

describe("battleRoom.ts: scientistTurnFrame (S6 slice 2b, RAM-probed)", () => {
  it("holds the pre-turn face-south pose (picture frame 0) through elapsed 105", () => {
    expect(scientistTurnFrame(0)).toEqual({ frame: 0, turned: false });
    expect(scientistTurnFrame(104)).toEqual({ frame: 0, turned: false });
    expect(scientistTurnFrame(105)).toEqual({ frame: 0, turned: false });
  });

  it("shows the 2-tick transient picture frame 8 at elapsed 106-107", () => {
    expect(scientistTurnFrame(106)).toEqual({ frame: 8, turned: true });
    expect(scientistTurnFrame(107)).toEqual({ frame: 8, turned: true });
  });

  it("settles turned (picture frame 2) from elapsed 108 on, indefinitely", () => {
    expect(scientistTurnFrame(108)).toEqual({ frame: 2, turned: true });
    expect(scientistTurnFrame(109)).toEqual({ frame: 2, turned: true });
    expect(scientistTurnFrame(197)).toEqual({ frame: 2, turned: true });
    expect(scientistTurnFrame(10000)).toEqual({ frame: 2, turned: true });
  });
});

describe("battleRoom.ts: opponentStep (S6 slice 2b, RAM-probed)", () => {
  it("is hidden through elapsed 111 (OPPONENT_ADD_ELAPSED - 1)", () => {
    expect(OPPONENT_ADD_ELAPSED).toBe(112);
    expect(opponentStep(0)).toEqual({ visible: false, frame: 0, screenY: 0 });
    expect(opponentStep(111)).toEqual({ visible: false, frame: 0, screenY: 0 });
  });

  it("becomes visible at elapsed 112, one sub-pixel step already into its walk_down (screenY -23, not the formula spawn of -24)", () => {
    expect(opponentStep(112)).toEqual({ visible: true, frame: 3, screenY: -23 });
  });

  it("ramps screenY a clean 1px/tick with no sub-tile easing, through the settle at elapsed 191", () => {
    expect(OPPONENT_WALK_END_ELAPSED).toBe(191);
    expect(OPPONENT_SETTLED_SCREEN_Y).toBe(56);
    for (let e = 112; e <= 191; e += 1) {
      expect(opponentStep(e).screenY).toBe(e - 135);
    }
    expect(opponentStep(191).screenY).toBe(56);
  });

  it("cycles the walk picture frames 3/0/4/0 (sAnim_GoSouth) in 8-tick blocks", () => {
    expect(opponentStep(112).frame).toBe(3);
    expect(opponentStep(119).frame).toBe(3);
    expect(opponentStep(120).frame).toBe(0);
    expect(opponentStep(127).frame).toBe(0);
    expect(opponentStep(128).frame).toBe(4);
    expect(opponentStep(135).frame).toBe(4);
    expect(opponentStep(136).frame).toBe(0);
    expect(opponentStep(184).frame).toBe(0);
    expect(opponentStep(191).frame).toBe(0);
  });

  it("settles facing west (picture frame 2) from elapsed 192 on, screenY held at 56 indefinitely", () => {
    expect(opponentStep(192)).toEqual({ visible: true, frame: 2, screenY: 56 });
    expect(opponentStep(197)).toEqual({ visible: true, frame: 2, screenY: 56 });
    expect(opponentStep(10000)).toEqual({ visible: true, frame: 2, screenY: 56 });
  });
});

describe("core.ts render dispatch: battle-room entry fade (S6 slice 2a)", () => {
  it("uses bgFadeY/objFadeY(elapsed, FADE_IN) directly - NOT elapsed+1, unlike prebattleRoom's own fadingIn phase (battleRoom.ts module doc point 1)", () => {
    // Oracle-sampled brightness steps (module doc): y=14 at elapsed 0-1, y=12 at 2-3, ..., y=0 from 14 on.
    expect(bgFadeY(0, FADE_IN)).toBe(14);
    expect(bgFadeY(1, FADE_IN)).toBe(14);
    expect(bgFadeY(2, FADE_IN)).toBe(12);
    expect(bgFadeY(3, FADE_IN)).toBe(12);
    expect(bgFadeY(14, FADE_IN)).toBe(0);
    expect(objFadeY(0, FADE_IN)).toBe(16);
    expect(objFadeY(1, FADE_IN)).toBe(14);
  });
});

describe("battleRoom.ts: msgboxVisual - appear + print cadence (S6 slice 2c, oracle-pinned, docs/battle-room-notes.md §8.2)", () => {
  it("pins the exact printed strings (curly apostrophe, charmap code 180 - ASCII \"'\" isn't in the charmap)", () => {
    expect(MSGBOX_LINE1).toBe("IT’S WAY TOO");
    expect(MSGBOX_LINE2).toBe("HOT HERE");
  });

  it("MSGBOX_PRINT_TICKS/MSGBOX_PRINT_COMPLETE_ELAPSED are derived from both lines' lengths, not separately-pinned magic numbers", () => {
    expect(MSGBOX_LINE1.length).toBe(12);
    expect(MSGBOX_LINE2.length).toBe(8);
    expect(MSGBOX_PRINT_TICKS).toBe(20);
    expect(MSGBOX_APPEAR_ELAPSED).toBe(198);
    expect(MSGBOX_PRINT_COMPLETE_ELAPSED).toBe(218);
  });

  it("is hidden through elapsed 197 (MSGBOX_APPEAR_ELAPSED - 1)", () => {
    expect(msgboxVisual({ phase: "entering", elapsed: 0 })).toEqual({ visible: false, chars: 0 });
    expect(msgboxVisual({ phase: "entering", elapsed: 197 })).toEqual({ visible: false, chars: 0 });
  });

  it("appears atomically at elapsed 198 (tick 718) - border+fill visible, zero characters printed yet", () => {
    expect(msgboxVisual({ phase: "entering", elapsed: 198 })).toEqual({ visible: true, chars: 0 });
  });

  it("prints exactly 1 character/tick, including space ticks, both lines back-to-back with no inter-line delay", () => {
    // First glyph at elapsed 199 (tick 719); line 1 (12 chars, incl. 2 space
    // ticks) completes at elapsed 210 (tick 730, "...TOO").
    for (let i = 1; i <= MSGBOX_LINE1.length; i += 1) {
      expect(msgboxVisual({ phase: "entering", elapsed: MSGBOX_APPEAR_ELAPSED + i })).toEqual({ visible: true, chars: i });
    }
    // Line 2 starts the very next tick (elapsed 211 / tick 731, "H") -
    // no extra tick between lines - and completes at elapsed 218.
    for (let i = 1; i <= MSGBOX_LINE2.length; i += 1) {
      expect(msgboxVisual({ phase: "entering", elapsed: MSGBOX_APPEAR_ELAPSED + MSGBOX_LINE1.length + i })).toEqual({
        visible: true,
        chars: MSGBOX_LINE1.length + i,
      });
    }
  });

  it("shows the box fully printed (all 20 chars) for both msgboxIdle and msgboxClosing, regardless of their own local elapsed", () => {
    expect(msgboxVisual({ phase: "msgboxIdle", elapsed: 0 })).toEqual({ visible: true, chars: MSGBOX_PRINT_TICKS });
    expect(msgboxVisual({ phase: "msgboxIdle", elapsed: 500 })).toEqual({ visible: true, chars: MSGBOX_PRINT_TICKS });
    expect(msgboxVisual({ phase: "msgboxClosing", elapsed: 2 })).toEqual({ visible: true, chars: MSGBOX_PRINT_TICKS });
  });

  it("is hidden once settled (post-close)", () => {
    expect(msgboxVisual({ phase: "settled", elapsed: 0 })).toEqual({ visible: false, chars: 0 });
    expect(msgboxVisual({ phase: "settled", elapsed: 999 })).toEqual({ visible: false, chars: 0 });
  });
});

describe("battleRoom.ts: advanceBattleRoom - entering -> msgboxIdle -> msgboxClosing -> settled", () => {
  it("stays 'entering' through elapsed 217, then switches to msgboxIdle at 218 with a fresh phase-relative elapsed", () => {
    let state: BattleRoomState = { phase: "entering", elapsed: MSGBOX_PRINT_COMPLETE_ELAPSED - 2 };
    state = advanceBattleRoom(state);
    expect(state).toEqual({ phase: "entering", elapsed: MSGBOX_PRINT_COMPLETE_ELAPSED - 1 });
    state = advanceBattleRoom(state);
    expect(state).toEqual({ phase: "msgboxIdle", elapsed: 0 });
  });

  it("msgboxIdle holds state unchanged under advanceBattleRoom - core.ts's own A-press gate (tested below) is what transitions it out", () => {
    const state: BattleRoomState = { phase: "msgboxIdle", elapsed: 0 };
    expect(advanceBattleRoom(state)).toBe(state);
    expect(advanceBattleRoom(advanceBattleRoom(state))).toBe(state);
  });

  it("closes exactly MSGBOX_CLOSE_TICKS ticks after msgboxClosing starts, then holds 'settled' indefinitely (docs §8.3 close-latency derivation)", () => {
    expect(MSGBOX_CLOSE_TICKS).toBe(4);
    let state: BattleRoomState = { phase: "msgboxClosing", elapsed: 0 };
    for (let i = 1; i < MSGBOX_CLOSE_TICKS; i += 1) {
      state = advanceBattleRoom(state);
      expect(state).toEqual({ phase: "msgboxClosing", elapsed: i });
    }
    state = advanceBattleRoom(state);
    expect(state).toEqual({ phase: "settled", elapsed: 0 });
    for (let i = 0; i < 50; i += 1) state = advanceBattleRoom(state);
    expect(state.phase).toBe("settled");
  });
});

describe("core.ts wiring: msgboxIdle's A-press gate (S6 slice 2c - the only input this window reads)", () => {
  it("ignores A everywhere except msgboxIdle - holding it through the whole print window causes no early close", () => {
    let state: EngineState = {
      ...createInitialState({ appRoute: "canonical-recorded" }),
      battleRoom: { phase: "entering", elapsed: 0 },
    };
    for (let i = 0; i < MSGBOX_PRINT_COMPLETE_ELAPSED - 1; i += 1) state = tick(state, new Set(["A"]));
    expect(state.battleRoom).toEqual({ phase: "entering", elapsed: MSGBOX_PRINT_COMPLETE_ELAPSED - 1 });
  });

  it("starts the 4-tick close the exact tick A registers, once idle; vanishes after MSGBOX_CLOSE_TICKS and holds settled thereafter (reproduces battle1-intro.json's segment 29 press -> oracle tick 843, room-msgbox.json 142/142)", () => {
    let state: EngineState = {
      ...createInitialState({ appRoute: "canonical-recorded" }),
      battleRoom: { phase: "msgboxIdle", elapsed: 0 },
    };
    // No press yet - holds idle byte-identically.
    state = tick(state, new Set());
    expect(state.battleRoom).toEqual({ phase: "msgboxIdle", elapsed: 0 });

    // A registers this tick (edge-triggered, keyRepeat.ts) - msgboxClosing
    // starts the SAME tick (matches the ground-truth trace's segment 29:
    // a 2-frame A hold, newKeys fires once on the first frame).
    state = tick(state, new Set(["A"]));
    expect(state.battleRoom).toEqual({ phase: "msgboxClosing", elapsed: 0 });
    expect(msgboxVisual(state.battleRoom!)).toEqual({ visible: true, chars: MSGBOX_PRINT_TICKS });

    // Held for the pulse's second frame - already registered, no re-trigger, just a normal advance.
    state = tick(state, new Set(["A"]));
    expect(state.battleRoom).toEqual({ phase: "msgboxClosing", elapsed: 1 });

    state = tick(state, new Set());
    expect(state.battleRoom).toEqual({ phase: "msgboxClosing", elapsed: 2 });
    state = tick(state, new Set());
    expect(state.battleRoom).toEqual({ phase: "msgboxClosing", elapsed: 3 });
    expect(msgboxVisual(state.battleRoom!)).toEqual({ visible: true, chars: MSGBOX_PRINT_TICKS });

    // 4th tick after the press - box vanishes (oracle tick 843, byte-identical to tick 717).
    state = tick(state, new Set());
    expect(state.battleRoom).toEqual({ phase: "settled", elapsed: 0 });
    expect(msgboxVisual(state.battleRoom!)).toEqual({ visible: false, chars: 0 });

    // Holds settled indefinitely, reading no further input.
    for (let i = 0; i < 100; i += 1) state = tick(state, new Set(["A"]));
    expect(state.battleRoom!.phase).toBe("settled");
    expect(msgboxVisual(state.battleRoom!)).toEqual({ visible: false, chars: 0 });
  });
});
