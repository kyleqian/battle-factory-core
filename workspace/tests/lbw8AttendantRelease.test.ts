// lbw8 (ISSUES #221): after the attendant's farewell the ROM's `releaseall` runs one frame before the app's `done` tick (sGlobalScriptContextStatus 0 -> 2
// at ROM frame 5762 on lbrb-exit-off, att -> 0 at 5763), so the woman and the fat man resume (and draw RNG) two app ticks earlier than a release at `done`.
// ROM values: tools/probe/lbw1-lobby-wander-rom.py on lbrb-exit-off (woman data[3] delay 33 -> 32 on the release frame; the woman steps east at 5794).
import { describe, expect, it } from "vitest";
import "../tools/compare/harnessPlayerName.ts";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { presentationRngFromTrace } from "../src/engine/presentationRngHost.ts";
import { applyTraceStage } from "../tools/compare/appTrace.ts";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import {
  ATTENDANT_TIMING,
  createFactoryLobbyAttendantState,
  isFactoryLobbyAttendantNpcsReleased,
  type FactoryLobbyAttendantState,
} from "../src/engine/factoryLobbyAttendant.ts";

function replay(name: string, last: number): Map<number, EngineState> {
  const trace = loadCompareTrace(`tools/compare/traces/${name}.json`);
  const pr = presentationRngFromTrace(trace);
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene, presentationSeed: pr.seed, presentationRngPolicy: pr.policy });
  if (trace.appStage?.frame === 0) state = applyTraceStage(trace, state);
  const rows = new Map<number, EngineState>();
  for (const a of traceAdvances(trace.segments)) {
    state = tick(state, a.buttons);
    if (trace.appStage?.frame === a.frame) state = applyTraceStage(trace, state);
    if (trace.appRngRebase?.frame === a.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
    rows.set(a.frame, state);
    if (a.frame === last) break;
  }
  return rows;
}

describe("lbw8: the Lobby NPCs resume when the attendant script releases", () => {
  it("lbrb-exit-off matches the ROM woman delay, step and cursor across the release", () => {
    const rows = replay("lbrb-exit-off", 5800);
    const delay = (f: number): number | undefined => rows.get(f)!.lobbyNpcs?.woman.delay;
    expect([5760, 5761, 5762, 5763, 5764].map(delay)).toEqual([33, 33, 32, 31, 30]);
    expect(rows.get(5761)!.lobbyAttendant).not.toBeNull();
    expect(rows.get(5762)!.lobbyAttendant).not.toBeNull();
    expect(rows.get(5763)!.lobbyAttendant).toBeNull();
    const w = rows.get(5794)!.lobbyNpcs!.woman;
    expect([w.x, w.y, w.prevX, w.prevY, w.facing]).toEqual([11, 18, 10, 18, 4]);
    expect(rows.get(5794)!.rngValue).toBe(3937092037);
  });

  it("the release covers the last two closing ticks of a farewell, never the walk to the draft", () => {
    const closing = (closingTick: number, closingTo: "freeRoam" | "walk"): FactoryLobbyAttendantState => ({
      ...createFactoryLobbyAttendantState(0),
      phase: "closing",
      closingTick,
      closingTo,
    });
    const last = ATTENDANT_TIMING.boxCloseTick;
    expect(isFactoryLobbyAttendantNpcsReleased(closing(last - 2, "freeRoam"))).toBe(false);
    expect(isFactoryLobbyAttendantNpcsReleased(closing(last - 1, "freeRoam"))).toBe(true);
    expect(isFactoryLobbyAttendantNpcsReleased(closing(last, "freeRoam"))).toBe(true);
    expect(isFactoryLobbyAttendantNpcsReleased(closing(last, "walk"))).toBe(false);
    expect(isFactoryLobbyAttendantNpcsReleased(createFactoryLobbyAttendantState(0))).toBe(false);
  });
});
