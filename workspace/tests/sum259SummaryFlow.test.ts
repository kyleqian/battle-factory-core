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
