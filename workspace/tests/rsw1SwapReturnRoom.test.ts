// rsw1: the room after the swap screen (CB2_ReturnToFieldContinueScript, overworld.c:1677): 14 black frames, 15 fade-in frames, 8 settled
// frames, then the box. A real swap says "Thank you! Your POKéMON swap is complete." and waits for A/B before "Right this way, please!";
// keeping the party goes straight to "Right this way, please!". The map reload draws the ROM's 2 and 3 Random() steps at hand-off + 2 / + 3.
// Frame numbers below are ROM-measured on tools/compare/traces/rsw1-swap-return-room-off.json (swap exit ends at tick 30223).
import { beforeAll, describe, expect, it } from "vitest";
import "../tools/compare/harnessPlayerName.ts";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import { presentationRngFromTrace } from "../src/engine/presentationRngHost.ts";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { normalizeButtons } from "../src/input.ts";
import {
  SWAP_COMPLETE_CHARS,
  SWAP_RETURN_BOX_TICK,
  swapReturnThanksInputReady,
} from "../src/engine/swapReturn.ts";

interface Replay {
  readonly start: EngineState;
  readonly states: EngineState[];
}

function replayToSwapReturn(tracePath: string, extraTicks: number): Replay {
  const trace = loadCompareTrace(tracePath);
  const presentation = presentationRngFromTrace(trace);
  let state = createInitialState({
    appRoute: trace.appRoute,
    battleScene: trace.battleScene,
    presentationSeed: presentation.seed,
    presentationRngPolicy: presentation.policy,
  });
  let start: EngineState | null = null;
  const states: EngineState[] = [];
  const advances = traceAdvances(trace.segments);
  for (const advance of advances) {
    state = tick(state, advance.buttons);
    if (state.swapReturn !== null && start === null) start = state;
    if (start !== null) {
      states.push(state);
      if (states.length > extraTicks) break;
    }
  }
  if (start === null) throw new Error("the trace never reached the swap return");
  return { start, states };
}

const black = (state: EngineState): boolean => render(state).every((value, index) => index % 4 === 3 || value === 0);
const none = new Set(normalizeButtons([]));
const pressA = new Set(normalizeButtons(["A"]));

describe("rsw1 the room after a real swap", () => {
  let replay: Replay;
  beforeAll(() => {
    replay = replayToSwapReturn("tools/compare/traces/rsw1-swap-return-room-off.json", 120);
  }, 180_000);

  it("holds black 13 frames, peeks at the fade on the 14th, fades 15 frames, holds 8, then draws the box", () => {
    const { states } = replay;
    expect(states[0]!.swapReturn).toMatchObject({ kind: "swapped", elapsed: 0 });
    for (let r = 0; r < 13; r += 1) expect(black(states[r]!)).toBe(true);
    expect(black(states[13]!)).toBe(false);
    const boxRow = (r: number) => render(states[r]!).slice((120 * 240 + 8) * 4, (150 * 240 + 200) * 4);
    const lit = (r: number) => Array.from(render(states[r]!)).reduce((sum, value, i) => (i % 4 === 3 ? sum : sum + value), 0);
    for (let r = 14; r < 28; r += 1) expect(lit(r)).toBeGreaterThan(lit(r - 1) - 1);
    // Settled and unchanged through the 8-frame hold, no box yet; the box appears on frame 37.
    for (let r = 29; r < SWAP_RETURN_BOX_TICK - 1; r += 1) expect(lit(r)).toBe(lit(29));
    expect(lit(SWAP_RETURN_BOX_TICK)).toBeGreaterThan(lit(SWAP_RETURN_BOX_TICK - 1));
    expect(boxRow(SWAP_RETURN_BOX_TICK).length).toBeGreaterThan(0);
    expect(SWAP_RETURN_BOX_TICK).toBe(37);
  });

  it("draws one Random() step per frame, and the map reload's 2 and 3 at hand-off + 2 / + 3", () => {
    const { start, states } = replay;
    let expected = start.rngValue;
    for (let r = 1; r <= 8; r += 1) {
      const steps = r === 2 ? 2 : r === 3 ? 3 : 1;
      for (let i = 0; i < steps; i += 1) expected = advanceRngValue(expected);
      expect(states[r]!.rngValue).toBe(expected);
    }
  });

  it("waits for A after \"Thank you!\" and only then starts \"Right this way\"", () => {
    const { states } = replay;
    const full = SWAP_RETURN_BOX_TICK + SWAP_COMPLETE_CHARS;
    expect(swapReturnThanksInputReady(full)).toBe(false);
    expect(swapReturnThanksInputReady(full + 1)).toBe(true);
    // The recorded idle presses nothing: the wait holds.
    expect(states[110]!.swapReturn?.guideElapsed).toBeNull();
    expect(states[110]!.postwin?.swapDeclineElapsed).toBeNull();
    // An A before the text is complete is ignored; one after it is taken.
    const early = tick(states[full - 5]!, pressA);
    expect(early.swapReturn?.guideElapsed).toBeNull();
    const ready = tick(states[full + 2]!, pressA);
    expect(ready.swapReturn?.guideElapsed).not.toBeNull();
    expect(ready.postwin?.swapDeclineElapsed).toBe(ready.postwin?.elapsed);
    const held = tick(states[full + 2]!, none);
    expect(held.swapReturn?.guideElapsed).toBeNull();
  });
});

describe("rsw1 the room after keeping the party", () => {
  it("goes straight from the settled room to \"Right this way\": box on frame 37, text from 38, no Thank you", () => {
    const { start, states } = replayToSwapReturn("tools/compare/traces/rsw1-swap-kept-return-room-off.json", 60);
    expect(start.swapReturn).toMatchObject({ kind: "kept", elapsed: 0 });
    expect(states[SWAP_RETURN_BOX_TICK - 1]!.swapReturn?.guideElapsed).toBeNull();
    const handed = states[SWAP_RETURN_BOX_TICK]!;
    expect(handed.swapReturn?.guideElapsed).not.toBeNull();
    expect(handed.postwin!.elapsed - handed.postwin!.swapDeclineElapsed!).toBe(3);
  }, 180_000);
});
