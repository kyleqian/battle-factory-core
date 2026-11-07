// flw252 (ISSUES #195 / #191): ROM input gating shared by the voluntary and forced party menus, and the postwin multichoices.
//   party_menu.c:1259-1261  Task_HandleChooseMonInput only runs with !gPaletteFade.active
//   text.c:884-899          TextPrinterWait reads JOY_NEW(A|B) only after the last glyph ({PAUSE_UNTIL_PRESS})
//   menu.c:985-1041         Menu_ProcessInput / NoWrap read JOY_NEW (no key repeat)
import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
  PARTY_MESSAGE_CLEAR_LAG_FRAMES,
  PARTY_MESSAGE_CLOCK_START,
  partyMessageLines,
  partyMessagePrintedChars,
  stepPartyMessage,
} from "../src/engine/partyMenuMessage.ts";
import {
  INITIAL_POSTWIN_STATE,
  POSTWIN_CONTINUATION_INPUT_READY_DELAY,
  POSTWIN_QUESTION_WINDOW_DELAYS,
  POSTWIN_SWAP_INPUT_READY_DELAY,
  type PostwinState,
} from "../src/engine/postwin.ts";
import type { GbaButton } from "../src/input.ts";

const NONE: ReadonlySet<GbaButton> = new Set();
const held = (button: GbaButton): ReadonlySet<GbaButton> => new Set([button]);

describe("flw252 party message printer (partyMenuMessage.ts)", () => {
  const message = "ONIX is already\nin battle!";
  const chars = partyMessagePrintedChars(message);

  it("counts glyphs without the newline and reveals one per frame", () => {
    expect(chars).toBe(25);
    expect(partyMessageLines(message, 0)).toBeNull();
    expect(partyMessageLines(message, 1)).toEqual(["O", ""]);
    expect(partyMessageLines(message, 15)).toEqual(["ONIX is already", ""]);
    expect(partyMessageLines(message, 16)).toEqual(["ONIX is already", "i"]);
    expect(partyMessageLines(message, 500)).toEqual(["ONIX is already", "in battle!"]);
  });

  it("ignores A / B until the last glyph, then accepts and clears after the lag", () => {
    let clock = PARTY_MESSAGE_CLOCK_START;
    for (let i = 0; i < chars; i += 1) {
      const step = stepPartyMessage(message, clock, true);
      expect(step.accepted).toBe(false);
      clock = step.clock;
    }
    const accepting = stepPartyMessage(message, clock, true);
    expect(accepting.accepted).toBe(true);
    clock = accepting.clock;
    for (let i = 1; i < PARTY_MESSAGE_CLEAR_LAG_FRAMES; i += 1) {
      const step = stepPartyMessage(message, clock, true);
      expect(step).toMatchObject({ accepted: false, cleared: false });
      clock = step.clock;
    }
    expect(stepPartyMessage(message, clock, false).cleared).toBe(true);
  });
});

describe("flw252 postwin multichoices step on new presses only (Menu_ProcessInput JOY_NEW)", () => {
  const engineWith = (postwin: PostwinState): EngineState => ({ ...createInitialState(), postwin });

  it("the continuation menu moves one entry for a held DOWN", () => {
    const heal = 3_000;
    let state = engineWith({
      ...INITIAL_POSTWIN_STATE,
      elapsed: heal + POSTWIN_CONTINUATION_INPUT_READY_DELAY + 10,
      healDismissElapsed: heal,
      continuationCursorPos: 0,
    });
    for (let i = 0; i < 42; i += 1) state = tick(state, held("DOWN"));
    expect(state.postwin!.continuationCursorPos).toBe(1);
  });

  it("the continuation menu moves one more entry for each new press", () => {
    const heal = 3_000;
    let state = engineWith({
      ...INITIAL_POSTWIN_STATE,
      elapsed: heal + POSTWIN_CONTINUATION_INPUT_READY_DELAY + 10,
      healDismissElapsed: heal,
      continuationCursorPos: 0,
    });
    for (let press = 0; press < 2; press += 1) {
      state = tick(state, held("DOWN"));
      state = tick(state, NONE);
    }
    expect(state.postwin!.continuationCursorPos).toBe(2);
  });

  it("the RECORD/RETIRE question registers a held UP once", () => {
    const edge = 6_639;
    let state = engineWith({
      ...INITIAL_POSTWIN_STATE,
      elapsed: edge + POSTWIN_QUESTION_WINDOW_DELAYS.record + 5,
      healDismissElapsed: 2_000,
      question: { kind: "record", edgeElapsed: edge },
      questionCursorPos: 1,
    });
    state = tick(state, held("UP"));
    const movedAt = state.postwin!.questionCursorMoveElapsed;
    expect(state.postwin!.questionCursorPos).toBe(0);
    for (let i = 0; i < 100; i += 1) state = tick(state, held("UP"));
    expect(state.postwin!.questionCursorMoveElapsed).toBe(movedAt);
  });

  it("the swap offer registers a held UP once", () => {
    let state = engineWith({
      ...INITIAL_POSTWIN_STATE,
      elapsed: POSTWIN_SWAP_INPUT_READY_DELAY + 5,
      healDismissElapsed: 100,
      dialoguePage: 4,
      dialoguePageEdgeElapsed: 0,
      swapCursorPos: 1,
    });
    state = tick(state, held("UP"));
    const movedAt = state.postwin!.swapCursorMoveElapsed;
    expect(state.postwin!.swapCursorPos).toBe(0);
    for (let i = 0; i < 100; i += 1) state = tick(state, held("UP"));
    expect(state.postwin!.swapCursorMoveElapsed).toBe(movedAt);
  });
});
