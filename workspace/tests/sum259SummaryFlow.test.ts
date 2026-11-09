// sum259 (ISSUES #192): summary-screen flow vs the ROM. Pixel proof lives in tools/compare/traces/sum259-*.json;
// this pins the state rules. See docs/sum259-summary-flow.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

type Segments = Array<{ frames: number; buttons?: string[] }>;

const trace = (name: string): { segments: Segments } =>
  JSON.parse(readFileSync(new URL(`../tools/compare/traces/${name}.json`, import.meta.url), "utf8")) as { segments: Segments };

function replay(segments: Segments, stopAfter = Infinity): EngineState {
  let state = createInitialState();
  for (const advance of traceAdvances(segments)) {
    if (advance.frame > stopAfter) break;
    state = tick(state, advance.buttons);
  }
  return state;
}

describe("draft summary return cursor (gLastViewedMonIndex)", () => {
  it("DOWN inside the summary moves the draft cursor to the last viewed mon on return", () => {
    const { segments } = trace("sum259-draft-return-cursor");
    expect(replay(segments, 138).draftScreen.cursorPos).toBe(0);
    const returned = replay(segments);
    expect(returned.summaryScreen.isOpen).toBe(false);
    expect(returned.summaryScreen.transition).toBeNull();
    expect(returned.draftScreen.cursorPos).toBe(1);
  });

  it("a summary with no mon change returns on the slot it opened on", () => {
    const { segments } = trace("summary-info-mon-down");
    const noChange = segments.filter((s) => !(s.buttons ?? []).includes("DOWN"));
    expect(replay(noChange).draftScreen.cursorPos).toBe(0);
  });
});

describe("summary input readiness (open + 63)", () => {
  // B pressed k frames after the accepted A: the ROM ignores it before P+63 (gPaletteFade.active), closes the summary from P+63.
  for (const [k, closes] of [[60, false], [62, false], [63, true]] as const) {
    it(`B at open+${k} ${closes ? "closes" : "is ignored"}`, () => {
      const { segments } = trace(`sum259-input-ready-b${k}`);
      const bFrame = 43 + k;
      const state = replay(segments, bFrame + 1);
      expect(state.summaryScreen.transition?.direction === "toDraft").toBe(closes);
      expect(state.summaryScreen.isOpen).toBe(!closes);
    });
  }
});

describe("swap summary UP / DOWN mon change (3 mons, no wrap)", () => {
  const swapSegments = (): Segments => {
    const derived = trace("sum259-swap-summary-mon-change") as unknown as { sourceSegmentCount: number; appendSegments: Segments };
    const source = JSON.parse(readFileSync(new URL("../tools/compare/traces-groundtruth/battle1-swapyes-a.json", import.meta.url), "utf8")) as { segments: Segments };
    return [...source.segments.slice(0, derived.sourceSegmentCount), ...derived.appendSegments];
  };
  const run = (stopAfter = Infinity): EngineState => {
    let state = createInitialState({ appRoute: "canonical-recorded", battleScene: "off" });
    for (const advance of traceAdvances(swapSegments())) {
      if (advance.frame > stopAfter) break;
      state = tick(state, advance.buttons);
    }
    return state;
  };

  it("DOWN at open+63 moves the summary slot; DOWN again reaches slot 2; UP, B return on slot 1", () => {
    // A at 29760; DOWN at 29760 + 63 = 29823; second DOWN +36; UP +36.
    expect(run(29822).summaryScreen.selectedSlot).toBe(0);
    expect(run(29824).summaryScreen.monTransition).not.toBeNull();
    expect(run(29860).summaryScreen.selectedSlot).toBe(2);
    expect(run(29896).summaryScreen.selectedSlot).toBe(1);
    const returned = run();
    expect(returned.summaryScreen.isOpen).toBe(false);
    expect(returned.factorySwap?.controller.cursor).toBe(1);
    expect(returned.factorySwap?.selectedBallIndex).toBe(1);
  });
});
