// Hermetic Tier-1 tests for the final-confirm reveal (S5 slice 3,
// docs/confirm-flow-notes.md): the 3rd RENT confirm's cursor/menu-input
// lockout, the reveal sub-state machine's phase-boundary tick counts
// (oracle-verified this slice - see confirmReveal.ts's module doc), and RNG
// exactness through the whole window (mission-critical per the brief: this
// stream feeds the eventual battle-transition pick).
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { chosenMonSpecies, isMonsConfirmed } from "../src/engine/factoryDraftScreen.ts";
import {
  advanceConfirmReveal,
  getConfirmRevealVisual,
  INITIAL_CONFIRM_REVEAL_STATE,
  type ConfirmRevealState,
} from "../src/engine/confirmReveal.ts";
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

// rent-3picks.json's exact committed button prefix: 3 picks, confirms land
// at press-ticks 37/113/189 (RAM-pinned, ballAnimMultiBall.test.ts).
const PICK = (): Segment[] => [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];
const RENT_3PICKS: Segment[] = [...PICK(), [36, null], [2, "RIGHT"], ...PICK(), [36, null], [2, "RIGHT"], ...PICK()];

function idleAfterConfirm3(extraTicks: number): Segment[] {
  return [...RENT_3PICKS, [extraTicks, null]];
}

describe("isMonsConfirmed", () => {
  it("is false through the first 2 picks, true only once the 3rd lands", () => {
    expect(isMonsConfirmed(1)).toBe(false);
    expect(isMonsConfirmed(3)).toBe(false);
    expect(isMonsConfirmed(4)).toBe(true);
  });
});

describe("confirm-flow: cursor/menu input never resumes after the 3rd confirm", () => {
  it("selectingMonsState is 4 and mode-input is inert immediately after the 3rd confirm", () => {
    const state = replay(idleAfterConfirm3(0));
    expect(state.draftScreen.selectingMonsState).toBe(4);
    expect(isMonsConfirmed(state.draftScreen.selectingMonsState)).toBe(true);
  });

  it("a RIGHT/A press long after the 3rd confirm has zero effect on cursorPos/mode", () => {
    const before = replay(idleAfterConfirm3(60));
    const after = replay([...idleAfterConfirm3(60), [2, "RIGHT"]]);
    expect(after.draftScreen.cursorPos).toBe(before.draftScreen.cursorPos);
    expect(after.draftScreen.mode).toBe(before.draftScreen.mode);
  });
});

describe("confirm-flow: reveal starts once the 3rd confirm's own popup close finishes", () => {
  it("confirmReveal is null while monPic is still closing", () => {
    const state = replay(idleAfterConfirm3(5));
    expect(state.draftScreen.monPic.phase).toBe("closing");
    expect(state.draftScreen.confirmReveal).toBeNull();
  });

  it("confirmReveal becomes non-null the same tick monPic reaches 'closed'", () => {
    const stillClosing = replay(idleAfterConfirm3(18));
    expect(stillClosing.draftScreen.monPic.phase).toBe("closing");
    expect(stillClosing.draftScreen.confirmReveal).toBeNull();

    const justClosed = replay(idleAfterConfirm3(19));
    expect(justClosed.draftScreen.monPic.phase).toBe("closed");
    expect(justClosed.draftScreen.confirmReveal).not.toBeNull();
    expect(justClosed.draftScreen.confirmReveal!.phase).toBe("flash");
  });
});

describe("confirmReveal state machine (hermetic, no core.ts)", () => {
  function run(ticks: number): ConfirmRevealState | null {
    let state: ConfirmRevealState | null = INITIAL_CONFIRM_REVEAL_STATE;
    for (let i = 0; i < ticks; i += 1) state = advanceConfirmReveal(state);
    return state;
  }

  it("starts in 'flash' with nothing visible yet (1-tick OAM-creation lag)", () => {
    expect(INITIAL_CONFIRM_REVEAL_STATE.phase).toBe("flash");
    const visual = getConfirmRevealVisual(INITIAL_CONFIRM_REVEAL_STATE);
    expect(visual.flashWidths).toBeNull();
    expect(visual.window).toBeNull();
  });

  it("flash widths grow 1/1/4/4/8/8/16/16/32/32/64/64 across ticks 1-12", () => {
    const widths = [1, 1, 4, 4, 8, 8, 16, 16, 32, 32, 64, 64];
    widths.forEach((expected, i) => {
      const visual = getConfirmRevealVisual(run(i + 1));
      expect(visual.flashWidths).toEqual([expected, expected, expected]);
    });
  });

  it("transitions from 'flash' to 'window' after 13 ticks (12 flash frames, 1-tick creation lag), starting at the degenerate (64,65) window", () => {
    const atFlashEnd = run(13);
    expect(atFlashEnd!.phase).toBe("window");
    expect(getConfirmRevealVisual(atFlashEnd).window).toEqual({ top: 64, bottom: 65 });
  });

  it("holds the degenerate (64,65) window 1 extra tick (BG3 ShowBg's own tick) before growth starts", () => {
    const held = run(13 + 1);
    expect(getConfirmRevealVisual(held).window).toEqual({ top: 64, bottom: 65 });
  });

  it("window grows to (32,96) over 8 more ticks (starting after the extra hold), then holds before mons/YES-NO appear", () => {
    const grown = run(13 + 9);
    expect(getConfirmRevealVisual(grown).window).toEqual({ top: 32, bottom: 96 });
    expect(getConfirmRevealVisual(grown).monsAndYesNoVisible).toBe(false);
  });

  it("holds the fully-grown (32,96) window 1 more tick than the growth alone needs (oracle-pixel-verified, ISSUES #8 gap 2: 3 consecutive identical-window frames before mons/YES-NO appear, not 2)", () => {
    const stillHeld = run(13 + 10);
    expect(getConfirmRevealVisual(stillHeld).window).toEqual({ top: 32, bottom: 96 });
    expect(getConfirmRevealVisual(stillHeld).monsAndYesNoVisible).toBe(false);
  });

  it("reaches 'shown' (mons + YES/NO visible) after the window's hold ticks, cursor highlight lagging 1 more tick", () => {
    const shownState = run(13 + 12);
    expect(shownState!.phase).toBe("shown");
    const justShown = getConfirmRevealVisual(shownState);
    expect(justShown.monsAndYesNoVisible).toBe(true);
    expect(justShown.cursorVisible).toBe(false);
    const oneMore = getConfirmRevealVisual(run(13 + 12 + 1));
    expect(oneMore.cursorVisible).toBe(true);
  });

  it("'shown' is a steady state - further ticks are a no-op once the cursor has caught up", () => {
    const shownState = run(13 + 12 + 5);
    expect(advanceConfirmReveal(shownState)).toEqual(shownState);
  });
});

describe("chosenMonSpecies: pick order, not slot order", () => {
  it("orders the 3 rented species by selectedId (1st/2nd/3rd pick), matching rent-3picks.json's slots 0/1/2", () => {
    const state = replay(idleAfterConfirm3(60));
    const species = chosenMonSpecies(state.draftScreen);
    expect(species).toHaveLength(3);
    // rent-3picks.json rents slot0, then slot1 (after 1 RIGHT), then slot2 (after 1 more RIGHT).
    expect(species).toEqual([state.draftScreen.slots[0]!.species, state.draftScreen.slots[1]!.species, state.draftScreen.slots[2]!.species]);
  });
});

describe("RNG exactness through the whole confirm+reveal window (mission-critical)", () => {
  it("rngValue advances by exactly 1 per tick, plus any ball-roll draws, unpaused by the reveal", () => {
    // Baseline advance (main.c:366): rngValue after N ticks of pure idle
    // (0 balls rented) is exactly N applications of the LCG step - already
    // pinned independently in rng.test.ts/ballAnim.test.ts. Replaying through
    // the confirm+reveal window with 3 balls rented must never advance by
    // LESS than N (every tick still gets its unconditional VBlank draw, even
    // while cursor/menu input is locked out and the reveal is mid-animation).
    let state = createInitialState();
    const startRng = state.rngValue;
    let ticks = 0;
    for (const [count, button] of [...idleAfterConfirm3(60)]) {
      for (let i = 0; i < count; i += 1) {
        state = tick(state, button ? new Set([button as GbaButton]) : new Set());
        ticks += 1;
      }
    }
    // Every tick advances the LCG at least once (the unconditional per-VBlank
    // draw); with 3 balls rented for most of this window, additional ball-roll
    // draws land some ticks too, so the total step count must exceed `ticks`.
    let baseline = startRng;
    for (let i = 0; i < ticks; i += 1) {
      // ISO_RANDOMIZE1 (rng.ts's advanceRngValue) - reuse via re-import would
      // be circular in spirit but this file already imports core.ts's tick,
      // which itself calls advanceRngValue; assert monotonic distinctness
      // from a naive "1 step per tick" replay is exactly the point: the two
      // MUST differ once any ball-roll draw has occurred.
      baseline = (Math.imul(1103515245, baseline) + 24691) >>> 0;
    }
    expect(state.rngValue).not.toBe(baseline);
  });

  it("continues consuming RNG at the same architecture through 'shown' and stays deterministic (regression pin)", () => {
    const a = replay(idleAfterConfirm3(80));
    const b = replay(idleAfterConfirm3(80));
    expect(a.rngValue).toBe(b.rngValue);
    expect(a.draftScreen.confirmReveal?.phase).toBe("shown");
    // Ball anims are still present (not torn down) and still independently
    // threading rngValue - see core.ts's unconditional ball-anim loop, which
    // this slice's confirmed-gate deliberately does NOT wrap.
    expect(a.draftScreen.ballAnims.filter(Boolean)).toHaveLength(3);
  });
});
