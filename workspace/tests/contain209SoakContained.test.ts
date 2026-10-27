// contain209: the soak SEES contained presentation throws -- the seed keeps its ordinary outcome (not CRASH) and its result
// carries the distinct contained count + the first message (the CLI prints them as CONTAINED). Separate file: module mock.
import { afterAll, describe, expect, it, vi } from "vitest";

describe("soak contained presentation throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/liveSubstituteSwap.ts");
    vi.resetModules();
  });

  it("reports CONTAINED on the seed instead of CRASH", async () => {
    vi.resetModules();
    vi.doMock("../src/engine/liveSubstituteSwap.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/liveSubstituteSwap.ts")>();
      return {
        ...actual,
        liveSubstituteSwapApplies: () => {
          throw new Error("injected adapter fault");
        },
      };
    });
    const { runSeed } = await import("../tools/soak/randomRoundSoakDriver.ts");
    const result = runSeed(0, { policy: "vanilla", renderEvery: 1, scene: "on", maxFrames: 6000 });
    expect(result.outcome).not.toBe("CRASH");
    expect(result.contained).toBeGreaterThanOrEqual(1);
    expect(result.containedFirstMessage).toBe("Error: injected adapter fault");
    // The next seed starts from a clean list.
    const clean = runSeed(0, { policy: "vanilla", renderEvery: 0, scene: "off", maxFrames: 50 });
    expect("contained" in clean).toBe(false);
  }, 240_000);
});
