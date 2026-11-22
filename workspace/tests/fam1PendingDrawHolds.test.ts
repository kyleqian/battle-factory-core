// fam1 (docs/fam1-first-use-move-animations.md): an animation file that has not arrived when a Scene ON live body is DRAWN (an
// AnimAssetPending thrown once inside renderBattleResolutionLiveView at Shadow Punch body age 10) leaves render() for the caller -- the
// browser loop's hold (lib.ts drawOrHold) -- instead of being contained: nothing is recorded, the command is not degraded, and the same
// frame drawn again once the file is in is the live body, so every row equals the clean run. contain209DrawThrow.test.ts pins the
// other side: any other draw throw still degrades the command. Separate file: module mock.
import { afterAll, describe, expect, it, vi } from "vitest";
import * as realCore from "../src/engine/core.ts";
import { contain209Replay } from "./helpers/contain209Replay.ts";

const SHADOW_PUNCH = 325;
const PENDING_AGE = 10;

describe("fam1: a pending animation file at draw time holds the frame, it does not degrade the command", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/battleScene.ts");
    vi.resetModules();
  });

  it("render() throws the pending read out, nothing is recorded, and the redrawn frame and every later row are the live body", async () => {
    const baseline = contain209Replay(realCore);

    const liveDraws: Array<{ age: number; pending: boolean }> = [];
    vi.resetModules();
    vi.doMock("../src/engine/battleScene.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/battleScene.ts")>();
      const { AnimAssetPending } = await import("../src/engine/animAssets.ts");
      return {
        ...actual,
        renderBattleResolutionLiveView: (...args: Parameters<typeof actual.renderBattleResolutionLiveView>) => {
          const effect = args[1].effect;
          if (effect?.type === "move" && effect.request.moveId === SHADOW_PUNCH) {
            const pending = effect.age === PENDING_AGE && !liveDraws.some((draw) => draw.pending);
            liveDraws.push({ age: effect.age, pending });
            if (pending) throw new AnimAssetPending("shadow-punch-test-file");
          }
          return actual.renderBattleResolutionLiveView(...args);
        },
      };
    });
    await import("../src/engine/monPicPixelsInstall.ts"); // fresh module graph after resetModules: reinstall the sprite pixels (bnd256c)
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    const { AnimAssetPending } = await import("../src/engine/animAssets.ts");
    containment.clearContainedPresentationErrors();

    // The browser loop's hold, in one call: a render that read a file before it arrived is not presented; the same state is drawn
    // again once the file is in.
    let held = 0;
    const holding = {
      ...core,
      render: (state: Parameters<typeof core.render>[0]) => {
        try {
          return core.render(state);
        } catch (error) {
          if (!(error instanceof AnimAssetPending)) throw error;
          held += 1;
          expect(containment.presentationRenderRunning()).toBe(false);
          return core.render(state);
        }
      },
    } as typeof core;
    const run = contain209Replay(holding);
    expect(run.actionMenus).toBe(1);

    expect(held).toBe(1);
    expect(containment.containedPresentationErrors()).toEqual([]);
    // The pending row was drawn again, live, and the body went on live (no static decline path).
    const at = liveDraws.findIndex((draw) => draw.pending);
    expect(liveDraws[at]!.age).toBe(PENDING_AGE);
    expect(liveDraws[at + 1]).toEqual({ age: PENDING_AGE, pending: false });
    expect(liveDraws.at(-1)!.age).toBeGreaterThan(PENDING_AGE);

    // Every command's rows and every move-animation row's pixels equal the clean run; events, RNG and frame count too.
    expect(run.commands.length).toBe(baseline.commands.length);
    run.commands.forEach((c, i) => {
      expect([c.key, c.type, c.rows]).toEqual([baseline.commands[i]!.key, baseline.commands[i]!.type, baseline.commands[i]!.rows]);
      expect(c.frames).toEqual(baseline.commands[i]!.frames);
    });
    expect(run.commands.some((c) => c.moveId === SHADOW_PUNCH)).toBe(true);
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(run.state.frame).toBe(baseline.state.frame);
    expect(run.state.presentationRng).toEqual(baseline.state.presentationRng);
  }, 240_000);
});
