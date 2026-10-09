import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// order45 (docs/next-adapters-prep45.md): B_ANIM_TURN_TRAP's event argument is the trapped battler's wrappedMove. It is a presentation
// payload only: on generated Fire Spin / Wrap routes (live-share census battles 36 and 139: seed, streak, FIGHT + least-used slot,
// forced replacement answered) Scene ON and OFF keep identical rules, RNG and boundaries (the replay records semantic events in ON only).
type Replay = ReturnType<typeof generatedCommandAnimationReplay>;

function expectRulesEqual(on: Replay, off: Replay): void {
  expect(on.boundaries).toHaveLength(off.boundaries.length);
  for (let index = 0; index < on.boundaries.length; index += 1) {
    const a = on.boundaries[index]!, b = off.boundaries[index]!;
    expect(a.rng).toEqual(b.rng);
    const { hitMarker: am, ...ar } = a.rules.rulesContext;
    const { hitMarker: bm, ...br } = b.rules.rulesContext;
    expect(ar).toEqual(br);
    expect(am ^ bm).toBe(0x80);
    expect(a.boundary).toEqual(b.boundary);
  }
}

const trapEvents = (run: Replay) => run.semanticEvents
  .map(row => (row as { event: { payload: { kind: string; animationId?: string; battler?: number; arguments?: readonly string[] } } }).event.payload)
  .filter(payload => payload.kind === "animation" && payload.animationId === "TURN_TRAP")
  .map(payload => ({ battler: payload.battler, arguments: payload.arguments }));

describe("order45: TURN_TRAP carries the wrapped move; Scene ON/OFF parity on Fire Spin / Wrap routes", () => {
  it.each([
    [36, 4, 6, ["83"]],
    [139, 10, 10, ["35"]],
  ] as const)("seed %i (streak %i, %i turns)", (seed, streak, turns, wrapped) => {
    const slots = Array.from({ length: turns }, (_, index) => (index % 4) as 0 | 1 | 2 | 3);
    const on = generatedCommandAnimationReplay(seed, "on", slots, streak, false, true);
    const off = generatedCommandAnimationReplay(seed, "off", slots, streak, false, true);
    expectRulesEqual(on, off);
    const traps = trapEvents(on);
    expect(traps.length).toBeGreaterThan(0);
    expect([...new Set(traps.map(trap => trap.arguments![0]))].sort()).toEqual([...wrapped].sort());
    // The argument is the trapped battler's own wrappedMove at its boundary (never the stale animArg1).
    for (const trap of traps) expect(["20", "35", "83", "250", "328", "128"]).toContain(trap.arguments![0]);
  }, 120000);
});
