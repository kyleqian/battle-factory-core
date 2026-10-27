// contain209 (finish plan Phase 1c): a throw inside a live move adapter's selection / timing (here the Substitute swap gate every
// live adapter consults, liveSubstituteSwap.ts, injected for Shadow Punch only) degrades that ONE command to the decline path: it
// holds the static field for the decline length (seGate + minimumFrames), the battle reaches the next action menu, the error is
// recorded once, and every other command, the semantic events and the gameplay RNG are unchanged. Separate file: module mock.
import { afterAll, describe, expect, it, vi } from "vitest";
import * as realCore from "../src/engine/core.ts";
import { contain209Replay } from "./helpers/contain209Replay.ts";

const SHADOW_PUNCH = 325;

describe("contain209 adapter throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/liveSubstituteSwap.ts");
    vi.resetModules();
  });

  it("plays the throwing command as the static decline hold and the battle continues", async () => {
    const baseline = contain209Replay(realCore);

    vi.resetModules();
    vi.doMock("../src/engine/liveSubstituteSwap.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/liveSubstituteSwap.ts")>();
      return {
        ...actual,
        liveSubstituteSwapApplies: (...args: Parameters<typeof actual.liveSubstituteSwapApplies>) => {
          if (args[0].moveId === SHADOW_PUNCH) throw new Error("injected adapter fault");
          return actual.liveSubstituteSwapApplies(...args);
        },
      };
    });
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    const presentationRender = await import("../src/engine/battleResolutionPresentationRender.ts");
    containment.clearContainedPresentationErrors();

    const run = contain209Replay(core);
    expect(run.actionMenus).toBe(1);
    expect(run.state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");

    // Recorded once (adapter selection, duration and draw all hit the same fault on the same command).
    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ ordinal: 1, commandType: "move-animation", message: "Error: injected adapter fault" });
    expect(errors[0]!.stack).toContain("injected adapter fault");

    const shadowPunch = (commands: typeof run.commands) => commands.findIndex((c) => c.moveId === SHADOW_PUNCH);
    const index = shadowPunch(run.commands);
    expect(index).toBe(shadowPunch(baseline.commands));
    const degraded = run.commands[index]!;
    const live = baseline.commands[index]!;
    // The decline length, not the live body's.
    expect(degraded.rows).toBe(presentationRender.battleResolutionCommandFallbackDuration(degraded.command as never));
    expect(degraded.rows).not.toBe(live.rows);
    // The static field: one image for the whole hold (the live body draws many).
    expect(new Set(degraded.frames).size).toBe(1);
    expect(new Set(live.frames).size).toBeGreaterThan(1);

    // Everything else is untouched: the same commands with the same rows, the same semantic events, the same gameplay RNG.
    expect(run.commands.map((c) => [c.key, c.type, c.moveId])).toEqual(baseline.commands.map((c) => [c.key, c.type, c.moveId]));
    run.commands.forEach((c, i) => { if (i !== index) expect(c.rows).toBe(baseline.commands[i]!.rows); });
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(run.state.frame).toBe(baseline.state.frame - (live.rows - degraded.rows));
  }, 240_000);
});
