// A throw from render() (the Scene ON drawing path) is a CRASH with the stack,
// exactly like an engine throw -- separate file because it module-mocks render.

import { afterEach, describe, expect, it, vi } from "vitest";

describe("soak render throw", () => {
  afterEach(() => {
    vi.doUnmock("../src/engine/core.ts");
    vi.resetModules();
  });

  it("reports CRASH with phase render and a stack", async () => {
    // doMock + fresh import: robust even when the worker shares a module cache.
    vi.resetModules();
    vi.doMock("../src/engine/core.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/core.ts")>();
      return {
        ...actual,
        render: vi.fn(() => {
          throw new TypeError("scene-on draw exploded");
        }),
      };
    });
    const { runSeed } = await import("../tools/soak/randomRoundSoakDriver.ts");
    const result = runSeed(0, { policy: "vanilla", renderEvery: 1, scene: "on", maxFrames: 50 });
    expect(result).toMatchObject({
      outcome: "CRASH",
      scene: "on",
      errorPhase: "render",
      errorName: "TypeError",
      errorMessage: "scene-on draw exploded",
    });
    expect(result.stackTop!.length).toBeGreaterThan(0);
    expect(result.signature).toContain("scene-on draw exploded");
  });
});
