// Hermetic Tier-1 tests for ISSUES #11's species-name breathe
// (Select_Task_FadeSpeciesName): the waveform's own state machine
// (speciesNameFade.ts) plus its wiring into core.ts's activate/deactivate
// call sites. All boundary ticks and the coeff->RGB table are RAM/pixel-
// pinned against the oracle (tools/probe/ram-probe.py; see
// speciesNameFade.ts's module doc) - this file re-asserts that already-
// verified behavior in a hermetic, oracle-free form.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";
import {
  activateSpeciesNameFade,
  ANCHOR_SPECIES_NAME_FADE_STATE,
  advanceSpeciesNameFade,
  deactivateSpeciesNameFade,
  speciesNameColor,
  type SpeciesNameFadeState,
} from "../src/engine/speciesNameFade.ts";

function stepN(state: SpeciesNameFadeState, n: number): SpeciesNameFadeState {
  let s = state;
  for (let i = 0; i < n; i += 1) s = advanceSpeciesNameFade(s);
  return s;
}

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

describe("speciesNameColor: BlendPalette(coeff, RGB_BLACK) on TEXT_COLOR_RED (255,0,0)", () => {
  it("reproduces every RAM/pixel-sampled coeff -> RGB pair, including ISSUES #11's 173 sample at coeff 5", () => {
    const table: [number, number][] = [
      [0, 255],
      [1, 239],
      [2, 222],
      [3, 206],
      [4, 189],
      [5, 173],
      [6, 156],
    ];
    for (const [coeff, r] of table) {
      expect(speciesNameColor(coeff)).toEqual({ r, g: 0, b: 0 });
    }
  });
});

describe("advanceSpeciesNameFade: onset from the anchor (RAM-verified tick-by-tick)", () => {
  it("stays render-coeff 0 (full red) for the first 104 ticks - the ~104-tick idle-stable budget ROADMAP.md documents", () => {
    // coeff itself sits at 0 through tick 103 (RAM), and even once it steps
    // to 1 at tick 104 the render lag (see module doc) keeps the visible
    // color at the old value through that same tick's render.
    const at104 = stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 104);
    expect(at104.coeff).toBe(1);
    expect(at104.renderCoeff).toBe(0);
  });

  it("the first visible color step lands at tick 105", () => {
    const at105 = stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 105);
    expect(at105.renderCoeff).toBe(1);
    expect(speciesNameColor(at105.renderCoeff)).toEqual({ r: 239, g: 0, b: 0 });
  });

  it("the pre-104 ramp bounces through FADESTATE_DELAY every ~17 ticks without coeff ever leaving 0 (RAM-confirmed quirk)", () => {
    // coeffDelay ticks 0->1 at tick 2, then a full 16-tick DELAY before the
    // next RUN tick at tick 19 (coeffDelay 1->2), etc. - see module doc.
    expect(stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 2).coeffDelay).toBe(1);
    expect(stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 18).tState).toBe("run");
    expect(stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 19).coeffDelay).toBe(2);
    for (let n = 3; n <= 17; n += 1) {
      expect(stepN(ANCHOR_SPECIES_NAME_FADE_STATE, n).coeff).toBe(0);
    }
  });
});

describe("advanceSpeciesNameFade: waveform shape past onset (7-tick cadence, peak 6, 16-tick pause)", () => {
  const past103 = stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 104); // coeff just became 1

  it("climbs one coeff step every 7 ticks with no further DELAY bounces once coeff > 0", () => {
    let s = past103;
    for (let step = 2; step <= 6; step += 1) {
      s = stepN(s, 7);
      expect(s.coeff).toBe(step);
      expect(s.tState).toBe("run");
    }
  });

  it("fadeOut flips FALSE the instant coeff exceeds 5 (coeff === 6)", () => {
    const atSix = stepN(past103, 7 * 5); // 1 -> 6
    expect(atSix.coeff).toBe(6);
    expect(atSix.fadeOut).toBe(false);
  });

  it("descends back down every 7 ticks once fadeOut is FALSE, then enters a 16-tick DELAY at coeff 0", () => {
    let s = stepN(past103, 7 * 5); // coeff 6, fadeOut FALSE
    for (let step = 5; step >= 1; step -= 1) {
      s = stepN(s, 7);
      expect(s.coeff).toBe(step);
    }
    // One more 7-tick step drives coeff to 0 and immediately enters DELAY.
    s = stepN(s, 7);
    expect(s.coeff).toBe(0);
    expect(s.tState).toBe("delay");
    expect(s.fadeOut).toBe(true);
    // The DELAY holds for exactly 16 ticks (delay 0..15) before RUN resumes.
    const afterDelay = stepN(s, 16);
    expect(afterDelay.tState).toBe("run");
    expect(afterDelay.coeff).toBe(0);
  });
});

describe("activate/deactivate: pauses (not resets) the counters", () => {
  it("deactivating during FADESTATE_RUN freezes coeffDelay/coeff exactly where they are", () => {
    const running = stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 104); // tState 'run', coeff 1
    expect(running.tState).toBe("run");
    const paused = deactivateSpeciesNameFade(running);
    const stillPaused = stepN(paused, 50);
    expect(stillPaused.coeffDelay).toBe(running.coeffDelay);
    expect(stillPaused.coeff).toBe(running.coeff);
    expect(stillPaused.tState).toBe("run");
  });

  it("reactivating resumes from the frozen counters rather than resetting them", () => {
    const running = stepN(ANCHOR_SPECIES_NAME_FADE_STATE, 104);
    const paused = stepN(deactivateSpeciesNameFade(running), 50);
    const resumed = activateSpeciesNameFade(paused);
    // One more RUN tick continues the same 7-tick cadence from coeff 1's
    // own coeffDelay, not from a fresh coeffDelay/coeff of 0.
    const next = advanceSpeciesNameFade(resumed);
    expect(next.coeffDelay).toBe(paused.coeffDelay + 1);
    expect(next.coeff).toBe(paused.coeff);
  });

  it("deactivating during FADESTATE_DELAY does NOT pause the countdown (unconditional in the source)", () => {
    // The anchor itself sits mid-DELAY (delay=15, tState 'delay').
    const paused = deactivateSpeciesNameFade(ANCHOR_SPECIES_NAME_FADE_STATE);
    const advanced = advanceSpeciesNameFade(paused);
    expect(advanced.tState).toBe("run"); // delay(15) > 14 -> rolls over regardless of `active`.
    expect(advanced.delay).toBe(0);
  });
});

describe("core.ts wiring: cursor-mode A opens the popup and pauses the breathe", () => {
  it("A in cursor mode deactivates speciesNameFade (frozen, not reset)", () => {
    const beforeOpen = replay([[104, null]]);
    expect(beforeOpen.draftScreen.speciesNameFade.coeff).toBe(1);
    const opened = tick(beforeOpen, new Set(["A"]));
    expect(opened.draftScreen.speciesNameFade.active).toBe(false);
    const stillFrozen = replay([[104, null], [1, "A"], [30, null]]);
    expect(stillFrozen.draftScreen.speciesNameFade.active).toBe(false);
    expect(stillFrozen.draftScreen.speciesNameFade.coeff).toBe(opened.draftScreen.speciesNameFade.coeff);
  });

  it("B-close resumes the breathe from wherever it was paused", () => {
    const resumed = replay([[104, null], [1, "A"], [35, null], [1, "B"]]);
    expect(resumed.draftScreen.mode).toBe("cursor");
    expect(resumed.draftScreen.speciesNameFade.active).toBe(true);
  });
});

describe("core.ts wiring: none of the 10 shipped traces' own action budgets ever reach the breathe", () => {
  it("draft-cursor-scale idle (under ~100 ticks) never leaves renderCoeff 0", () => {
    const state = replay([[95, null]]);
    expect(state.draftScreen.speciesNameFade.renderCoeff).toBe(0);
  });
});
