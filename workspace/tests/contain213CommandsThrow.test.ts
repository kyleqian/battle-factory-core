// contain213 (finish plan Phase 1c follow-up, presentationContainment.ts "commands"): a throw while turning the kernel's receipt
// into presentation commands (here the move-animation request the projector builds for Shadow Punch, injected only inside
// projectBattleResolutionCommands) presents that span as the minimal command list -- HP / status to the kernel's endpoint, then a
// turn-end -- so the battle reaches the next action menu showing the same outcome, with the same events and gameplay RNG, and the
// error is recorded once. A forced send-in continuation whose projection throws (field art, injected only under
// appendResolutionSegment) presents the typed switch-in the display ledger and the send-out need, and the battle plays to its end.
// Separate file: module mocks.
import { afterAll, describe, expect, it, vi } from "vitest";
import * as realCore from "../src/engine/core.ts";
import { contain209Replay } from "./helpers/contain209Replay.ts";
import { contain213BattleToEnd } from "./helpers/contain213Battle.ts";

const SHADOW_PUNCH = 325;

describe("contain213 command-building throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/battleMoveAnimation.ts");
    vi.doUnmock("../src/engine/battleCommandFieldArt.ts");
    vi.resetModules();
  });

  it("presents the turn as the minimal command list and reaches the next action menu", async () => {
    const baseline = contain209Replay(realCore);

    vi.resetModules();
    vi.doMock("../src/engine/battleMoveAnimation.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/battleMoveAnimation.ts")>();
      return {
        ...actual,
        battleMoveAnimationRequest: (...args: Parameters<typeof actual.battleMoveAnimationRequest>) => {
          const request = actual.battleMoveAnimationRequest(...args);
          if (request.moveId === SHADOW_PUNCH && new Error().stack?.includes("projectBattleResolutionCommands")) {
            throw new Error("injected projection fault");
          }
          return request;
        },
      };
    });
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();

    const run = contain209Replay(core);
    expect(run.actionMenus).toBe(1);
    const menu = run.state.factoryRoundBattleOrchestrator?.battleCommandPresentation;
    expect(menu?.lifecycle.phase).toBe("action-menu");

    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ site: "commands", commandType: "segment", message: "Error: injected projection fault" });

    // The degraded turn: no move bodies, HP moved to the kernel's endpoint, a closing turn-end.
    const types = run.commands.map((c) => c.type);
    expect(types).not.toContain("move-animation");
    expect(types.at(-1)).toBe("turn-end");
    expect(types).toContain("hp");
    expect(baseline.commands.map((c) => c.type)).toContain("move-animation");

    // Gameplay is the kernel's: the same events, RNG and next command boundary (field, PP) as the clean run.
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    const baseMenu = baseline.state.factoryRoundBattleOrchestrator!.battleCommandPresentation!;
    expect(JSON.stringify(menu!.field)).toBe(JSON.stringify(baseMenu.field));
    expect(JSON.stringify(run.state.factoryRoundBattleOrchestrator!.battle!.rules))
      .toBe(JSON.stringify(baseline.state.factoryRoundBattleOrchestrator!.battle!.rules));
  }, 240_000);

  it("presents a forced send-in continuation as its switch-in and plays the battle to its end", async () => {
    const baseline = contain213BattleToEnd(realCore);
    expect(baseline.forcedMenus).toBeGreaterThan(0);

    vi.doUnmock("../src/engine/battleMoveAnimation.ts");
    vi.resetModules();
    // Armed after import: module-load fixtures (turn15FlyResolutionAdapter.ts) append continuations too.
    let projectionArmed = false;
    vi.doMock("../src/engine/battleCommandFieldArt.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/battleCommandFieldArt.ts")>();
      return {
        ...actual,
        createBattleCommandFieldArtView: (...args: Parameters<typeof actual.createBattleCommandFieldArtView>) => {
          const stack = new Error().stack ?? "";
          if (projectionArmed && stack.includes("appendResolutionSegment") && stack.includes("projectBattleResolutionCommands")) {
            throw new Error("injected continuation projection fault");
          }
          return actual.createBattleCommandFieldArtView(...args);
        },
      };
    });
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();
    projectionArmed = true;

    const switchIns: unknown[] = [];
    const run = contain213BattleToEnd(core, (state) => {
      const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting-switch-in") return;
      const segment = r.segments[r.segmentIndex]!;
      if (!switchIns.includes(segment)) switchIns.push(segment);
    });
    expect(run.forcedMenus).toBe(baseline.forcedMenus);
    expect(run.state.postwin).not.toBeNull();
    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ site: "commands", message: "Error: injected continuation projection fault" });
    // The degraded continuation: its switch-in, then the closing turn-end.
    expect(switchIns.length).toBeGreaterThan(0);
    for (const segment of switchIns as { commands: readonly { type: string }[] }[]) {
      expect(segment.commands.map((c) => c.type).filter((t) => t === "switch-in" || t === "turn-end")).toEqual(["switch-in", "turn-end"]);
    }
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(JSON.stringify(run.state.factoryRoundBattleOrchestrator?.round.rules))
      .toBe(JSON.stringify(baseline.state.factoryRoundBattleOrchestrator?.round.rules));
  }, 600_000);
});
