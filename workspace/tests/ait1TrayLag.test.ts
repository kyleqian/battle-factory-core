// ait1: the voluntary AI switch's tray draw -> "sent out" print is 102 frames in the dominant ROM phase (D4 faithful timing, docs/ais1-ai-switch-withdraw.md "ait1");
// a faint replacement's tray has no lag frame (about 14 ROM observations, none stalled).
import { describe, expect, it } from "vitest";
import { dominantLiveMoveTimingPhase } from "../src/engine/liveMoveTimingPolicy.ts";
import { OPPONENT_SUMMARY_SWITCH_TRAY_LAG_FRAMES, OPPONENT_SUMMARY_SWITCH_TRAY_LAG_MEASURED, opponentPartySummaryDrawTiming } from "../src/engine/midBattleOpponentPartySummaryTiming.ts";

describe("AI switch tray lag frame (ait1)", () => {
  it("the dominant measured phase is the lag frame (15 of 24), by the D4 rule, not by the tie rule", () => {
    const { event, noEvent } = OPPONENT_SUMMARY_SWITCH_TRAY_LAG_MEASURED;
    expect({ event, noEvent }).toEqual({ event: 15, noEvent: 9 });
    const verdict = dominantLiveMoveTimingPhase([{ phase: "event", bodyRows: 102, measured: event }, { phase: "no-event", bodyRows: 101, measured: noEvent }]);
    expect(verdict).toEqual({ phase: "event", tie: false });
    expect(OPPONENT_SUMMARY_SWITCH_TRAY_LAG_FRAMES).toBe(1);
  });

  it("only the voluntary switch's draw carries the lag; faint replacements keep 100 / 123", () => {
    expect(opponentPartySummaryDrawTiming(false)).toEqual({ minimumFrames: 100, leadFrames: 0 });
    expect(opponentPartySummaryDrawTiming(true)).toEqual({ minimumFrames: 123, leadFrames: 23 });
    expect(opponentPartySummaryDrawTiming(false, true)).toEqual({ minimumFrames: 102, leadFrames: 0, lagFrames: 1 });
  });
});
