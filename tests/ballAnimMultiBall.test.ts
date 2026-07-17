// Hermetic Tier-1 tests for ISSUES #6 (multi-ball SpriteCB_Pokeball timing):
// a second ball's cursor-move/RENT-DESELECT interactions measurably delay
// every OTHER currently-rented ball's own animation, RAM-confirmed to NOT be
// caused by mon-pic open/close itself. Checkpoints below are from dev-time
// RAM probes (dev-time recipe, see tools/extract/inspect-anchor.py's
// docstring; scratch scripts not committed per instructions) replaying the
// button scripts below from the anchor. `tick()` calls are 1-indexed to
// match the probes' `oracle.advance()` call count.
//
// Root cause (RAM-confirmed, file:line references):
// `Select_Task_HandleChooseMons`'s LEFT/RIGHT branch
// (battle_factory_screen.c ~1573-1585) calls `Select_PrintMonCategory`/
// `Select_PrintMonSpecies` (both call `AddTextPrinterParameterized[3]` +
// `CopyWindowToVram(..., COPYWIN_GFX)`), and `Select_OptionRentDeselect`
// (:1949-1970) calls the same-shaped `Select_PrintSelectMonString`
// (:1893-1909) on RENT/DESELECT confirm - RAM-confirmed these two text-print
// paths (and ONLY these two - not popup open/close, not B/OTHERS-close, not
// the popup's own internal DOWN/UP menu move, not a ball opening its OWN
// popup) cost every OTHER currently-active ball's own AnimateSprite()
// advance exactly one tick, landing the tick *after* the trigger (since
// CB2_SelectScreen's AnimateSprites() runs before RunTasks() each frame - a
// same-tick RunTasks() text-print can only affect the *next* tick's
// AnimateSprites() pass). See DraftScreenState.ballAnimStall's doc
// (factoryDraftScreen.ts) for the implementation.
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";

type Segment = [number, GbaButton | null];

function replayTo(segments: Segment[], targetFrame: number) {
  let state = createInitialState();
  const buttonsAtFrame: (GbaButton | null)[] = [];
  for (const [count, button] of segments) for (let i = 0; i < count; i += 1) buttonsAtFrame.push(button);
  while (buttonsAtFrame.length < targetFrame) buttonsAtFrame.push(null);
  for (let i = 0; i < targetFrame; i += 1) {
    const button = buttonsAtFrame[i];
    state = tick(state, button ? new Set([button]) : new Set());
  }
  return state;
}

// Rent slot 1 only (RAM-pinned baseline from ballAnim.test.ts): open A
// frames 1-2, idle to 30, DOWN 31-32, idle to 36, RENT-confirm A 37-38.
const RENT_SLOT1: Segment[] = [
  [2, "A"],
  [28, null],
  [2, "DOWN"],
  [4, null],
  [2, "A"],
];
// Dwell 40 ticks (matches ISSUES #6's own probe), then act on slot 2.
const DWELL_TO_SLOT2: Segment = [79 - 39, null];

describe("ISSUES #6 - multi-ball SpriteCB_Pokeball timing", () => {
  it("baseline (ball 0 only): animEnded-equivalent flip lands at frame 168, unaffected", () => {
    // ballAnimTile flips to the moving-cycle's first cmd at the tick after
    // cmdIndex 16 exhausts - probing rngValue alone can't see this directly,
    // so this just re-confirms the RAM-pinned base cadence via rngValue.
    const state = replayTo(RENT_SLOT1, 168);
    expect(state.rngValue >>> 0).toBe(0x4159e423);
  });

  it("a cursor move (RIGHT, no popup at all) stalls the OTHER rented ball's own anim by exactly 1 tick", () => {
    const segments: Segment[] = [...RENT_SLOT1, DWELL_TO_SLOT2, [2, "RIGHT"]];
    // RAM: rngValue at frame 168 is unaffected (0x4159e423, matches baseline
    // exactly - the stall hasn't landed yet), but frame 169 is now the
    // stalled tick (a repeat, not a fresh LCG step) - both frames still land
    // on the *same* LCG values baseline reaches at 168/169 respectively,
    // just one frame later for 169 onward, since ball 0's own advance was
    // skipped exactly once.
    expect(replayTo(segments, 168).rngValue >>> 0).toBe(0x4159e423);
    expect(replayTo(segments, 169).rngValue >>> 0).toBe(0x8cdb2d5a);
    expect(replayTo(segments, 170).rngValue >>> 0).toBe(0xaec01bc5);
    expect(replayTo(segments, 171).rngValue >>> 0).toBe(0x6fa03954);
  });

  it("a ball opening its OWN popup (A, re-selecting itself) does NOT self-stall - unaffected vs baseline", () => {
    const segments: Segment[] = [...RENT_SLOT1, DWELL_TO_SLOT2, [2, "A"]];
    expect(replayTo(segments, 168).rngValue >>> 0).toBe(0x4159e423);
    expect(replayTo(segments, 169).rngValue >>> 0).toBe(0x8cdb2d5a);
  });

  it("opening a SECOND ball's popup and closing it via B (OTHERS-equivalent) costs only the open's 1 tick - closing adds nothing", () => {
    const segments: Segment[] = [...RENT_SLOT1, DWELL_TO_SLOT2, [2, "RIGHT"], [2, "A"], [30, null], [2, "B"]];
    expect(replayTo(segments, 169).rngValue >>> 0).toBe(0x8cdb2d5a);
  });

  it("two-ball scenario (ISSUES #6 (b)): RIGHT + open slot 2 + DOWN + RENT-confirm costs ball 0 a full 2 ticks (open's 1 + RENT-confirm's own 1)", () => {
    const segments: Segment[] = [
      ...RENT_SLOT1,
      DWELL_TO_SLOT2,
      [2, "RIGHT"],
      [2, "A"],
      [30, null], // > 27-tick popup-open animation, so DOWN/A below land instead of being dropped pre-ready
      [2, "DOWN"],
      [4, null],
      [2, "A"],
    ];
    // RAM-confirmed exhaustive per-frame diff (frames 1-260, dev-time probe,
    // not committed): 0 mismatches with this exact model.
    const checkpoints: [number, number][] = [
      [79, 0x939cda18],
      [80, 0x6acc8cab],
      [119, 0x46ac7940],
      [120, 0xabe180b3],
      [168, 0x8cdb2d5a],
      [169, 0xaec01bc5],
      [170, 0x6fa03954], // ball 0's flip, +2 vs baseline's 168 - ISSUES #6's own cited number
      [171, 0x3a86137],
      [200, 0x3b52907a],
      [201, 0x22891065],
      [202, 0xca792174],
      [203, 0xe6b4fbfe], // ball 0's roll, +2 vs baseline's 201 - ISSUES #6's own cited number
      [204, 0xc44b0f99],
      [249, 0xf0834ba4], // ball 1's own first-cycle FAILURE reroll (a THIRD, previously-untested transition shape)
    ];
    for (const [frame, expected] of checkpoints) {
      expect(replayTo(segments, frame).rngValue >>> 0, `frame ${frame}`).toBe(expected);
    }
  });
});
