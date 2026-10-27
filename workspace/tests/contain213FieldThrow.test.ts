// contain213 (finish plan Phase 1c follow-up, presentationContainment.ts "field"): render-view reads inside tick() degrade instead
// of crashing. End to end: a fault building the battle's frozen postwin / return-hold scene (here the field art every view builds,
// injected only for the terminal-handoff ticks) leaves the postwin without a frozen scene (the black hold); the round still reaches
// it on the same frame with the same events and gameplay RNG, and the error is recorded once. Unit: the continuation boundary
// field falls back to the view without the current command, then to the completed-command fold. Separate file: module mock.
import { afterAll, describe, expect, it, vi } from "vitest";
import * as realCore from "../src/engine/core.ts";
import * as realRender from "../src/engine/battleResolutionPresentationRender.ts";
import type { BattleResolutionPresentationState } from "../src/engine/battleResolutionPresentation.ts";
import { contain213BattleToEnd } from "./helpers/contain213Battle.ts";

const ARMED = "__contain213FieldArtThrow";
const armed = globalThis as Record<string, unknown>;

describe("contain213 field-read throw", () => {
  afterAll(() => {
    vi.doUnmock("../src/engine/battleCommandFieldArt.ts");
    vi.resetModules();
    delete armed[ARMED];
  });

  let baseline: ReturnType<typeof contain213BattleToEnd>;
  let hpState: BattleResolutionPresentationState | null = null;

  it("plays the battle to its postwin with no frozen scene when the frozen scene throws", async () => {
    baseline = contain213BattleToEnd(realCore, (state) => {
      const r = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      const command = r?.segments[r.segmentIndex]?.commands[r.commandIndex];
      if (hpState === null && r?.lifecycle.phase === "presenting" && command?.type === "hp" && r.lifecycle.phaseElapsed > 2) hpState = r;
    });
    expect(baseline.state.postwin?.frozenSceneView).not.toBeNull();

    vi.resetModules();
    vi.doMock("../src/engine/battleCommandFieldArt.ts", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../src/engine/battleCommandFieldArt.ts")>();
      return {
        ...actual,
        createBattleCommandFieldArtView: (...args: Parameters<typeof actual.createBattleCommandFieldArtView>) => {
          if (armed[ARMED] === true) throw new Error("injected field-art fault");
          return actual.createBattleCommandFieldArtView(...args);
        },
      };
    });
    const core = await import("../src/engine/core.ts");
    const containment = await import("../src/engine/presentationContainment.ts");
    containment.clearContainedPresentationErrors();

    let armedTicks = 0;
    const run = contain213BattleToEnd(core, (state) => {
      if (state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.lifecycle.phase !== "terminal-handoff") return;
      armedTicks += 1;
      armed[ARMED] = true;
      return () => { armed[ARMED] = false; };
    });
    expect(armedTicks).toBeGreaterThan(0);
    expect(run.state.postwin).not.toBeNull();
    expect(run.state.postwin!.frozenSceneView).toBeNull();
    const errors = containment.containedPresentationErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ site: "field", commandType: "view", message: "Error: injected field-art fault" });
    expect(errors[0]!.detail).toMatch(/frozen scene/);

    expect(run.state.frame).toBe(baseline.state.frame);
    expect(run.state.rngValue).toBe(baseline.state.rngValue);
    expect(JSON.stringify(run.segmentEvents)).toBe(JSON.stringify(baseline.segmentEvents));
    expect(JSON.stringify(run.state.factoryRoundBattleOrchestrator?.round.rules))
      .toBe(JSON.stringify(baseline.state.factoryRoundBattleOrchestrator?.round.rules));
    // The black hold renders and the postwin goes on exactly as before.
    let a = run.state;
    let b = baseline.state;
    for (let i = 0; i < 120; i++) {
      a = core.tick(a, new Set());
      core.render(a);
      b = realCore.tick(b, new Set());
    }
    expect(a.postwin?.elapsed).toBe(b.postwin?.elapsed);
    expect(a.rngValue).toBe(b.rngValue);
  }, 600_000);

  it("falls back to the field without the current command, then to the completed-command fold", async () => {
    expect(hpState).not.toBeNull();
    const r = hpState!;
    const segment = r.segments[r.segmentIndex]!;
    const hp = segment.commands[r.commandIndex]!;
    if (hp.type !== "hp") throw new Error("expected an hp command");
    // A displayed-HP mismatch: the view's HP guard throws.
    const bad = Object.freeze({ ...hp, from: hp.from + 1 });
    const commands = segment.commands.map((command) => (command === hp ? bad : command));
    const tampered = Object.freeze({
      ...r,
      segments: Object.freeze(r.segments.map((s) => (s === segment ? Object.freeze({ ...s, commands: Object.freeze(commands) }) : s))),
    }) as BattleResolutionPresentationState;
    expect(() => realRender.createBattleResolutionPresentationRenderView(tampered)).toThrow(/HP command starts at/);

    const containment = await import("../src/engine/presentationContainment.ts");
    const render = await import("../src/engine/battleResolutionPresentationRender.ts");
    containment.clearContainedPresentationErrors();
    const expected = realRender.createBattleResolutionPresentationRenderView(r, null, true).field;
    // Untouched path: the ordinary view's field.
    expect(render.containedBattleResolutionDisplayedField(r, "test")).toEqual(realRender.createBattleResolutionPresentationRenderView(r).field);
    expect(containment.containedPresentationErrors()).toEqual([]);
    expect(render.containedBattleResolutionDisplayedField(tampered, "test")).toEqual(expected);
    expect(render.containedBattleResolutionDisplayedField(tampered, "test")).toEqual(expected);
    expect(containment.containedPresentationErrors()).toHaveLength(1);
    expect(containment.containedPresentationErrors()[0]).toMatchObject({ site: "field", commandType: "hp" });

    // Both views throw (every view builds field art): the segment field with the completed commands applied.
    containment.clearContainedPresentationErrors();
    armed[ARMED] = true;
    try {
      expect(() => render.createBattleResolutionPresentationRenderView(r, null, true)).toThrow("injected field-art fault");
      expect(render.containedBattleResolutionDisplayedField(r, "test")).toEqual(expected);
      expect(render.containedBattleResolutionRenderView(r, "test")).toBeNull();
    } finally {
      armed[ARMED] = false;
    }
    expect(containment.containedPresentationErrors()).toHaveLength(1);
    expect(containment.containedPresentationErrors()[0]).toMatchObject({ site: "field", message: "Error: injected field-art fault" });
  }, 120_000);
});
