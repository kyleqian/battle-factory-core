// contain213 (finish plan Phase 1c follow-up, presentationContainment.ts "order"): a throw updating the presentation hosts for a
// command (here the sprite-order host's event advance, injected once at the Shadow Punch body) leaves the battle's order /
// allocator / x2 histories unknown and drops the command's inputs; the battle reaches the next action menu with the same events,
// commands and gameplay RNG, and the error is recorded once. Likewise a throw in the display ledger's presentation-only extras
// (Castform forms) keeps their earlier value. Separate file: module mocks.
import { afterAll, describe, expect, it, vi } from "vitest";
import * as realCore from "../src/engine/core.ts";
import { contain209Replay } from "./helpers/contain209Replay.ts";

const SHADOW_PUNCH = 325;

type Resolution = Readonly<{ segments: readonly { commands: readonly { type: string; animation?: { moveId: number } }[] }[];
  segmentIndex: number; commandIndex: number }>;
const atShadowPunch = (resolution: Resolution) => {
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  return command?.type === "move-animation" && command.animation?.moveId === SHADOW_PUNCH;
};

describe("contain213 order-host throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/liveSpriteOrderHost.ts");
    vi.doUnmock("../src/engine/battleResolutionPresentationRender.ts");
    vi.resetModules();
  });

  let baseline: ReturnType<typeof contain209Replay>;

  it("marks the order / allocator history unknown and the battle continues", async () => {
    baseline = contain209Replay(realCore);
    const baseSprites = baseline.state.factoryRoundBattleOrchestrator!.liveMoveSpriteAllocatorHost!;
    expect(baseSprites.order.known).toBe(true);

    vi.resetModules();
    let thrown = 0;
    vi.doMock("../src/engine/liveSpriteOrderHost.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/liveSpriteOrderHost.ts")>();
      return {
        ...actual,
        advanceLiveSpriteOrderHost: (...args: Parameters<typeof actual.advanceLiveSpriteOrderHost>) => {
          if (thrown === 0 && atShadowPunch(args[1] as unknown as Resolution)) {
            thrown += 1;
            throw new Error("injected order-host fault");
          }
          return actual.advanceLiveSpriteOrderHost(...args);
        },
      };
    });
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();

    const run = contain209Replay(core);
    expect(thrown).toBe(1);
    expect(run.actionMenus).toBe(1);
    expect(run.state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ site: "order", commandType: "move-animation", message: "Error: injected order-host fault" });

    // The unknown history is the sticky state later adapters decline / classify on.
    const sprites = run.state.factoryRoundBattleOrchestrator!.liveMoveSpriteAllocatorHost!;
    expect(sprites.order.known).toBe(false);
    expect(sprites.host.historyKnown).toBe(false);

    expect(run.commands.map((c) => [c.key, c.type, c.moveId])).toEqual(baseline.commands.map((c) => [c.key, c.type, c.moveId]));
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(JSON.stringify(run.state.factoryRoundBattleOrchestrator!.battle!.rules))
      .toBe(JSON.stringify(baseline.state.factoryRoundBattleOrchestrator!.battle!.rules));
  }, 240_000);

  it("keeps the ledger's presentation-only extras on a throw", async () => {
    vi.doUnmock("../src/engine/liveSpriteOrderHost.ts");
    vi.resetModules();
    let thrown = 0;
    vi.doMock("../src/engine/battleResolutionPresentationRender.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/battleResolutionPresentationRender.ts")>();
      return {
        ...actual,
        liveCastformFormsThroughCommand: (...args: Parameters<typeof actual.liveCastformFormsThroughCommand>) => {
          if (thrown === 0 && args[1].type === "move-animation") {
            thrown += 1;
            throw new Error("injected ledger-extras fault");
          }
          return actual.liveCastformFormsThroughCommand(...args);
        },
      };
    });
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();

    const run = contain209Replay(core);
    expect(thrown).toBe(1);
    expect(run.actionMenus).toBe(1);
    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ site: "order", commandType: "move-animation", message: "Error: injected ledger-extras fault" });
    expect(errors[0]!.detail).toMatch(/ledger extras/);
    // No Castform here: the extras keep the same (normal) value, so every row is the clean run's.
    expect(run.commands.map((c) => [c.key, c.type, c.rows])).toEqual(baseline.commands.map((c) => [c.key, c.type, c.rows]));
    run.commands.forEach((c, i) => expect(c.frames).toEqual(baseline.commands[i]!.frames));
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(run.state.frame).toBe(baseline.state.frame);
  }, 240_000);
});
