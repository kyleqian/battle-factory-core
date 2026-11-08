// contain209 (finish plan Phase 1c): gameplay-state throws are NOT contained -- a throw from the turn reducer
// (factoryBattleScriptFullTurnDecision.ts) still escapes tick() (the bench advance() ABI calls tick() bare; src/main.ts's loop turns
// it into the crash overlay) and nothing is recorded as contained. Plus the bounded/deduped log and the session export field.
// Separate file: module mock.
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  CONTAINED_PRESENTATION_ERROR_LIMIT,
  clearContainedPresentationErrors,
  containedPresentationErrorCount,
  containedPresentationErrors,
  recordContainedPresentationError,
} from "../src/engine/presentationContainment.ts";
import { SessionRecorder } from "../src/sessionRecorder.ts";
import { contain209Replay } from "./helpers/contain209Replay.ts";

describe("contain209 contained-error log", () => {
  it("dedupes by command type + message and bounds the list, counting every distinct error", () => {
    clearContainedPresentationErrors();
    expect(recordContainedPresentationError("adapter", "move-animation", new Error("a"), "move 1")).toBe(true);
    expect(recordContainedPresentationError("draw", "move-animation", new Error("a"))).toBe(false);
    expect(recordContainedPresentationError("draw", "hp", new Error("a"))).toBe(true);
    for (let i = 0; i < CONTAINED_PRESENTATION_ERROR_LIMIT + 5; i += 1) recordContainedPresentationError("draw", "message", `x${i}`);
    expect(containedPresentationErrorCount()).toBe(CONTAINED_PRESENTATION_ERROR_LIMIT + 7);
    const errors = containedPresentationErrors();
    expect(errors).toHaveLength(CONTAINED_PRESENTATION_ERROR_LIMIT);
    expect(errors[0]).toMatchObject({ ordinal: 1, site: "adapter", commandType: "move-animation", message: "Error: a", detail: "move 1" });
    expect(errors[1]).toMatchObject({ ordinal: 2, commandType: "hp" });
    expect(errors[2]).toMatchObject({ commandType: "message", message: "x0", stack: null });
    clearContainedPresentationErrors();
    expect(containedPresentationErrorCount()).toBe(0);
    expect(containedPresentationErrors()).toEqual([]);
  });

  it("rides along in the session trace only when there is one", () => {
    const recorder = new SessionRecorder();
    recorder.recordTick(new Set());
    const base = { appRoute: "generated-orchestrator", build: "test", battleScene: "on" as const };
    expect("containedErrors" in recorder.toTrace(base)).toBe(false);
    expect("containedErrors" in recorder.toTrace({ ...base, containedErrors: [] })).toBe(false);
    const entry = { ordinal: 1, site: "draw" as const, commandType: "hp", message: "Error: b", stack: null, detail: null, frame: 1 };
    expect(recorder.toTrace({ ...base, containedErrors: [entry] }).containedErrors).toEqual([entry]);
  });
});

describe("contain209 gameplay throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/factoryBattleScriptFullTurnDecision.ts");
    vi.resetModules();
  });

  it("still propagates out of tick and is not contained", async () => {
    vi.resetModules();
    vi.doMock("../src/engine/factoryBattleScriptFullTurnDecision.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/factoryBattleScriptFullTurnDecision.ts")>();
      return {
        ...actual,
        reduceFactoryFullTurnDecision: () => {
          throw new Error("injected kernel fault");
        },
      };
    });
    await import("../src/engine/monPicPixelsInstall.ts"); // fresh module graph after resetModules: reinstall the sprite pixels (bnd256c)
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();
    expect(() => contain209Replay(core)).toThrow("injected kernel fault");
    expect(containment.containedPresentationErrors()).toEqual([]);
  }, 240_000);
});
