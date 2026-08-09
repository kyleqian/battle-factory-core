// Tier-1 pin for the random-play soak driver (tools/soak/randomRoundSoak.ts).
//
// Pins the currently-green soak surface: a seeded random player, driving the
// production play path (createInitialState + tick, real button presses only)
// through draft -> prebattle room -> battle room -> generated battle-start
// intro, reaches battle 1's first interactive action menu without any engine
// throw, for a small fixed seed set. Seeds that crash deeper in the round are
// cataloged in docs/soak-crash-catalog.md, NOT pinned here — as of 2026-08-08
// every soaked seed crashes inside battle 1's resolution presentation, so the
// full-round surface cannot be pinned green yet. When those engine defects
// close, extend this pin toward full rounds.

import { describe, expect, it } from "vitest";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

const PIN_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

describe("random round soak driver (green milestone pin)", () => {
  it("reaches battle 1's first action menu crash-free for the pinned seeds", () => {
    for (const seed of PIN_SEEDS) {
      const result = runSeed(seed, {
        maxFrames: 6_000,
        renderEvery: 8,
        stopAtFirstActionMenu: true,
      });
      expect(result, `seed ${seed}: ${result.errorMessage ?? result.hangSurface ?? ""}`)
        .toMatchObject({
          seed,
          outcome: "OK",
          endState: "milestone:first-action-menu",
          battle: 1,
        });
      // The whole draft->intro route runs ~1.4-1.6k frames; a blowout here
      // means the driver lost its way (a driver bug, not an engine bug).
      expect(result.frames).toBeLessThan(4_000);
    }
  });

  it("also reaches the milestone under the vanilla policy", () => {
    const result = runSeed(11, {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "vanilla",
      stopAtFirstActionMenu: true,
    });
    expect(result).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
  });

  it("is deterministic per seed", () => {
    const first = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    const second = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    expect(second.frames).toBe(first.frames);
    expect(second.outcome).toBe(first.outcome);
    expect(second.lastActions).toEqual(first.lastActions);
  });
});
