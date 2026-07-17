// Hermetic Tier-1 pin for core.ts's render() dispatch during summary-screen
// transitions: which FadeTiming curve, which tick offset, and the
// black-hold peek quirk apply to each phase x direction combination. This
// is exactly the logic ISSUES #4 found broken for the B-exit (toDraft) -
// the entry (toSummary) direction's own dispatch was already oracle-pinned
// pixel-exact via tools/compare/traces/summary-info-onix.json, but nothing
// at this hermetic tier previously distinguished "which curve applies to
// which direction" from the underlying bgFadeY/objFadeY math itself
// (already covered by paletteFade.test.ts). No oracle, no pixels at test
// time - each expected framebuffer is computed via the same lower-level
// renderSummaryInfoPageFaded/renderFactoryDraftScreenFaded primitives
// render() itself calls, so this pins the *dispatch*, not the compositing.

import { describe, expect, it } from "vitest";
import { createInitialState, render, type EngineState } from "../src/engine/core.ts";
import { openSummaryScreen, requestSummaryScreenExit, advanceSummaryScreen, type SummaryScreenState } from "../src/engine/summaryScreen.ts";
import { renderFactoryDraftScreenFaded } from "../src/engine/factoryDraftScreen.ts";
import { renderSummaryInfoPageFaded } from "../src/engine/summaryInfoPage.ts";
import { bgFadeY, objFadeY, ENTRY_FADE_OUT, EXIT_FADE_OUT, FADE_IN } from "../src/engine/paletteFade.ts";

function run(state: SummaryScreenState, ticks: number): SummaryScreenState {
  for (let i = 0; i < ticks; i += 1) state = advanceSummaryScreen(state);
  return state;
}

function withSummary(summaryScreen: SummaryScreenState): EngineState {
  return { ...createInitialState(), summaryScreen };
}

describe("render() dispatch: entry (toSummary) transition", () => {
  it("fadingOut renders the draft screen faded on ENTRY_FADE_OUT at elapsed+1", () => {
    const state = withSummary(run(openSummaryScreen(0), 6)); // mid fade-out, elapsed=6
    const t = state.summaryScreen.transition!;
    expect(t).toMatchObject({ phase: "fadingOut" });
    const expected = renderFactoryDraftScreenFaded(state.draftScreen, bgFadeY(t.elapsed + 1, ENTRY_FADE_OUT), objFadeY(t.elapsed + 1, ENTRY_FADE_OUT));
    expect(render(state)).toEqual(expected);
  });

  it("black hold renders pure black except its own last tick, which peeks at fade-in's first step (Info page)", () => {
    const midBlack = withSummary(run(openSummaryScreen(0), 20 + 10)); // black, elapsed=10
    expect(midBlack.summaryScreen.transition).toMatchObject({ phase: "black", elapsed: 10 });
    const midFrame = render(midBlack);
    expect(midFrame.every((byte, i) => (i % 4 === 3 ? byte === 255 : byte === 0))).toBe(true); // opaque solid black

    const lastBlackTick = withSummary(run(openSummaryScreen(0), 20 + 23)); // black, elapsed=23 (holdTicks-1)
    expect(lastBlackTick.summaryScreen.transition).toMatchObject({ phase: "black", elapsed: 23 });
    const expected = renderSummaryInfoPageFaded(0, bgFadeY(0, FADE_IN), objFadeY(0, FADE_IN));
    expect(render(lastBlackTick)).toEqual(expected);
  });

  it("fadingIn renders the Info page faded on FADE_IN at elapsed+1", () => {
    const state = withSummary(run(openSummaryScreen(5), 20 + 24 + 3)); // fadingIn, elapsed=3, slot 5
    const t = state.summaryScreen.transition!;
    expect(t).toMatchObject({ phase: "fadingIn" });
    const expected = renderSummaryInfoPageFaded(5, bgFadeY(t.elapsed + 1, FADE_IN), objFadeY(t.elapsed + 1, FADE_IN));
    expect(render(state)).toEqual(expected);
  });
});

describe("render() dispatch: exit (toDraft, B on the settled Info page) transition", () => {
  function afterB(slot: number, extraTicks: number): EngineState {
    const settled = run(openSummaryScreen(slot), 59);
    const exiting = requestSummaryScreenExit(settled);
    return withSummary(run(exiting, extraTicks));
  }

  it("fadingOut renders the Info page faded on EXIT_FADE_OUT at elapsed+1 - NOT the entry's ENTRY_FADE_OUT curve", () => {
    const state = afterB(2, 6); // mid fade-out, elapsed=6
    const t = state.summaryScreen.transition!;
    expect(t).toMatchObject({ direction: "toDraft", phase: "fadingOut" });
    const expected = renderSummaryInfoPageFaded(2, bgFadeY(t.elapsed + 1, EXIT_FADE_OUT), objFadeY(t.elapsed + 1, EXIT_FADE_OUT));
    expect(render(state)).toEqual(expected);
    // Sanity: the entry's curve would disagree here, proving direction actually matters to the dispatch.
    const wrongCurve = renderSummaryInfoPageFaded(2, bgFadeY(t.elapsed + 1, ENTRY_FADE_OUT), objFadeY(t.elapsed + 1, ENTRY_FADE_OUT));
    expect(render(state)).not.toEqual(wrongCurve);
  });

  it("black hold renders pure black except its own last tick, which peeks at fade-in's first step (draft screen) - same quirk as entry, not pure black throughout", () => {
    const midBlack = afterB(0, 18 + 10); // black, elapsed=10
    expect(midBlack.summaryScreen.transition).toMatchObject({ phase: "black", elapsed: 10 });
    const midFrame = render(midBlack);
    expect(midFrame.every((byte, i) => (i % 4 === 3 ? byte === 255 : byte === 0))).toBe(true); // opaque solid black

    const lastBlackTick = afterB(0, 18 + 19); // black, elapsed=19 (holdTicks-1)
    expect(lastBlackTick.summaryScreen.transition).toMatchObject({ phase: "black", elapsed: 19 });
    const expected = renderFactoryDraftScreenFaded(lastBlackTick.draftScreen, bgFadeY(0, FADE_IN), objFadeY(0, FADE_IN));
    expect(render(lastBlackTick)).toEqual(expected);
  });

  it("fadingIn renders the draft screen faded on FADE_IN at elapsed+1", () => {
    const state = afterB(3, 18 + 20 + 5); // fadingIn, elapsed=5
    const t = state.summaryScreen.transition!;
    expect(t).toMatchObject({ direction: "toDraft", phase: "fadingIn" });
    const expected = renderFactoryDraftScreenFaded(state.draftScreen, bgFadeY(t.elapsed + 1, FADE_IN), objFadeY(t.elapsed + 1, FADE_IN));
    expect(render(state)).toEqual(expected);
  });

  it("settles back to the plain (unfaded) draft screen render, matching the pre-entry screen", () => {
    const settled = withSummary(run(requestSummaryScreenExit(run(openSummaryScreen(1), 59)), 53));
    expect(settled.summaryScreen.transition).toBeNull();
    expect(render(settled)).toEqual(renderFactoryDraftScreenFaded(settled.draftScreen, 0, 0));
  });
});
