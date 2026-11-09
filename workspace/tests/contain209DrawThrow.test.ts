// contain209 (finish plan Phase 1c): a throw while DRAWING a Scene ON live body (renderBattleResolutionLiveView, injected once at
// Shadow Punch body age 10) draws that row and every later row of the command as the decline path's static field -- sticky, the
// live draw is never retried for that command -- records the error once, and the battle continues. Render never feeds tick, so
// the command keeps its scheduled rows and every command, event and RNG value matches the clean run. Separate file: module mock.
import { afterAll, describe, expect, it, vi } from "vitest";
import * as realCore from "../src/engine/core.ts";
import { contain209Replay } from "./helpers/contain209Replay.ts";

const SHADOW_PUNCH = 325;
const THROW_AGE = 10;

describe("contain209 Scene ON draw throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/battleScene.ts");
    vi.resetModules();
  });

  it("degrades the drawn command to the static field from the throwing row on, and the battle continues", async () => {
    const baseline = contain209Replay(realCore);

    const liveDraws: Array<{ age: number; thrown: boolean }> = [];
    vi.resetModules();
    vi.doMock("../src/engine/battleScene.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/battleScene.ts")>();
      return {
        ...actual,
        renderBattleResolutionLiveView: (...args: Parameters<typeof actual.renderBattleResolutionLiveView>) => {
          const effect = args[1].effect;
          if (effect?.type === "move" && effect.request.moveId === SHADOW_PUNCH) {
            const thrown = effect.age === THROW_AGE && !liveDraws.some((draw) => draw.thrown);
            liveDraws.push({ age: effect.age, thrown });
            if (thrown) throw new TypeError("injected scene-on draw fault");
          }
          return actual.renderBattleResolutionLiveView(...args);
        },
      };
    });
    await import("../src/engine/monPicPixelsInstall.ts"); // fresh module graph after resetModules: reinstall the sprite pixels (bnd256c)
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();

    const run = contain209Replay(core);
    expect(run.actionMenus).toBe(1);
    expect(run.state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");

    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ site: "draw", commandType: "move-animation", message: "TypeError: injected scene-on draw fault" });

    // Sticky: the throwing draw is the last live draw of the command (no retry, no flicker back to live).
    expect(liveDraws.at(-1)).toEqual({ age: THROW_AGE, thrown: true });

    const index = run.commands.findIndex((c) => c.moveId === SHADOW_PUNCH);
    const degraded = run.commands[index]!;
    const live = baseline.commands[index]!;
    expect(degraded.rows).toBe(live.rows);
    const firstStatic = degraded.frames!.findIndex((hash, row) => hash !== live.frames![row]);
    expect(firstStatic).toBe(liveDraws.length - 1);
    // Rows before the throw are the live body byte for byte; from it on, one static image.
    expect(degraded.frames!.slice(0, firstStatic)).toEqual(live.frames!.slice(0, firstStatic));
    expect(new Set(degraded.frames!.slice(firstStatic)).size).toBe(1);

    // Nothing else changed: every other command's rows and frames, the semantic events, the RNG and the frame count.
    run.commands.forEach((c, i) => {
      expect([c.key, c.type, c.rows]).toEqual([baseline.commands[i]!.key, baseline.commands[i]!.type, baseline.commands[i]!.rows]);
      if (i !== index) expect(c.frames).toEqual(baseline.commands[i]!.frames);
    });
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(run.state.frame).toBe(baseline.state.frame);
    expect(run.state.presentationRng).toEqual(baseline.state.presentationRng);
  }, 240_000);
});
