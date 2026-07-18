// S6 slice 2a: Tier-1 tests for the battle-room ENTRY window's state
// machine (src/engine/battleRoom.ts) and its core.ts wiring - pixel parity
// itself lives in tools/compare/traces/room-entry.json (110/110).
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import {
  advanceBattleRoom,
  ENTRY_SETTLE_ELAPSED,
  FADE_IN,
  INITIAL_BATTLE_ROOM_STATE,
  OPPONENT_ADD_ELAPSED,
  OPPONENT_SETTLED_SCREEN_Y,
  OPPONENT_WALK_END_ELAPSED,
  WARP_FADE_TO_ROOM_ELAPSED,
  entryStep,
  opponentStep,
  scientistTurnFrame,
} from "../src/engine/battleRoom.ts";
import { EXIT_TO_ROOM_BLACK_HOLD_TICKS, MESSAGE_CLOSING_TICKS, MESSAGE_PRINT_TICKS, ROOM_HOLD_TICKS, WALK_TICKS } from "../src/engine/prebattleRoom.ts";
import { EXIT_FADE_OUT_TICKS, FADE_IN_TICKS, bgFadeY, objFadeY } from "../src/engine/paletteFade.ts";
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
