import { describe, expect, it } from "vitest";
import {
  SPITE_BODY_FRAME_COUNT,
  SPITE_CLEANUP_AGE,
  SPITE_PULSE_FIRST_AGE,
  SPITE_PULSE_LAST_AGE,
  spiteAtAge,
} from "../../src/animation/spite.ts";

describe("MOVE_SPITE source-relative reducer", () => {
  it("keeps the synchronous setup and three-pass task teardown distinct", () => {
    expect([0, 1, 2, 3, 4, 5, 132, 133, 134, 135].map((age) => {
      const state = spiteAtAge(age);
      return [age, state.phase, state.taskActive, state.cloneActive,
        state.scanlineActive, state.copiedBgEnabled, state.targetVisible,
        state.targetPaletteTint, state.pulseIndex];
    })).toEqual([
      [0, "clone", true, true, false, false, true, 0, null],
      [1, "palette", true, true, false, false, true, 10, null],
      [2, "scanline", true, true, true, false, true, 10, null],
      [3, "blend", true, true, true, false, true, 10, null],
      [4, "enable-bg", true, true, true, true, true, 10, null],
      [5, "pulse", true, true, true, true, true, 10, 1],
      [132, "teardown-hide-bg", true, true, true, false, true, 10, 128],
      [133, "teardown-restore-palette", true, true, false, false, true, 0, null],
      [134, "cleanup", true, false, false, true, false, 0, null],
      [135, "inactive", false, false, false, true, true, 0, null],
    ]);
    expect(SPITE_BODY_FRAME_COUNT).toBe(135);
    expect(SPITE_PULSE_FIRST_AGE).toBe(5);
    expect(SPITE_PULSE_LAST_AGE).toBe(132);
    expect(SPITE_CLEANUP_AGE).toBe(134);
  });

  it("retains the source task's alternating sine-derived alpha words", () => {
    expect(spiteAtAge(5).alpha).toEqual({ eva: 0, evb: 16 });
    expect(spiteAtAge(6).alpha).toEqual({ eva: 0, evb: 16 });
    expect(spiteAtAge(7).alpha).toEqual({ eva: 0, evb: 15 });
    expect(spiteAtAge(68).alpha).toEqual({ eva: 14, evb: 16 });
    expect(spiteAtAge(69).alpha).toEqual({ eva: 14, evb: 2 });
    expect(spiteAtAge(132).alpha).toEqual({ eva: 0, evb: 16 });
  });
});
