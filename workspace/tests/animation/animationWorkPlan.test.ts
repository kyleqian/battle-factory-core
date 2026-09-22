import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import inventory from "../../src/data/gen/factory-animation-inventory.json" with { type: "json" };
import components from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import { animationWorkPlan, type AnimationCoverageLedger } from "../../tools/animation/coverage.ts";

const freshLedger = (): AnimationCoverageLedger => JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
const promote = (ledger: AnimationCoverageLedger, move: string) => {
  ledger.entries = ledger.entries.filter((entry) => entry.move !== move);
  ledger.entries.push({ move, status: "exact", covered: ["test-only promotion"], evidence: ["test-only"] });
};

describe("animation work selection", () => {
  it("accounts for every unfinished move despite an empty manual queue", () => {
    const ledger = freshLedger();
    ledger.queue = [];
    const work = animationWorkPlan(ledger);
    const exact = new Set(ledger.entries.filter((entry) => entry.status === "exact").map((entry) => entry.move));
    const unfinished = [...inventory.tiers.level50.moves, ...inventory.tiers.openOnly.moves]
      .filter((move) => !exact.has(move.move)).map((move) => move.move);
    const accounted = [...work.ready, ...work.blocked].map((move) => move.move);
    expect(work.state).toBe("ready");
    expect(work.remaining).toBe(unfinished.length);
    expect(accounted.sort()).toEqual(unfinished.sort());
    expect(new Set(accounted).size).toBe(accounted.length);
    expect(work.ready.some((move) => move.move === "MOVE_HELPING_HAND")).toBe(false);
    expect(work.blocked.map((move) => move.move)).toEqual(["MOVE_HELPING_HAND"]);
    expect(animationWorkPlan(ledger)).toEqual(work);
  });

  it("uses manual priority without hiding unlisted work and drops accepted moves automatically", () => {
    const ledger = freshLedger();
    const before = animationWorkPlan(ledger);
    const preferred = before.ready.filter((move) => move.tier === "level50").at(-1)!.move;
    ledger.queue = [preferred];
    const prioritized = animationWorkPlan(ledger);
    expect(prioritized.ready[0].move).toBe(preferred);
    expect(prioritized.ready.map((move) => move.move).sort()).toEqual(before.ready.map((move) => move.move).sort());
    promote(ledger, preferred);
    const after = animationWorkPlan(ledger);
    expect(after.ready.some((move) => move.move === preferred)).toBe(false);
    expect(after.remaining).toBe(before.remaining - 1);
    expect(after.ready.length).toBe(before.ready.length - 1);
    expect(after.blocked).toEqual(before.blocked);
  });

  it("keeps Outrage after ready Level 50 work but does not wait for blocked moves", () => {
    const ledger = freshLedger();
    ledger.queue = ["MOVE_OUTRAGE"];
    const work = animationWorkPlan(ledger);
    expect(work.ready.at(-1)).toMatchObject({ move: "MOVE_OUTRAGE", tier: "openOnly" });
    expect(work.ready.slice(0, -1).every((move) => move.tier === "level50")).toBe(true);
    for (const move of work.ready.filter((move) => move.tier === "level50")) promote(ledger, move.move);
    const next = animationWorkPlan(ledger);
    expect(next.state).toBe("ready");
    expect(next.ready.map((move) => move.move)).toEqual(["MOVE_OUTRAGE"]);
    expect(next.blocked.map((move) => move.move)).toEqual(["MOVE_HELPING_HAND"]);
  });

  it("supports documented Open-only blockers and component tracks", () => {
    const ledger = freshLedger();
    ledger.componentTracks.push({
      id: "test-outrage",
      components: [components.moves.find((move) => move.move === "MOVE_OUTRAGE")!.componentIds[0]],
      representatives: ["MOVE_OUTRAGE"],
      goal: "Test-only Open-only track",
    });
    ledger.blockers!.push({ ...ledger.blockers![0], move: "MOVE_OUTRAGE" });
    const work = animationWorkPlan(ledger);
    expect(work.ready.some((move) => move.move === "MOVE_OUTRAGE")).toBe(false);
    expect(work.blocked.find((move) => move.move === "MOVE_OUTRAGE")?.tier).toBe("openOnly");
  });

  it("keeps partial implementations dispatchable", () => {
    const ledger = freshLedger();
    const move = animationWorkPlan(ledger).ready[0].move;
    ledger.entries = ledger.entries.filter((entry) => entry.move !== move);
    ledger.entries.push({ move, status: "partial", covered: ["test-only"], evidence: ["test-only"], remaining: "Complete dense acceptance" });
    expect(animationWorkPlan(ledger).ready.find((entry) => entry.move === move)?.status).toBe("partial");
  });

  it("distinguishes all-blocked work from completion and resumes when a blocker is removed", () => {
    const ledger = freshLedger();
    for (const move of animationWorkPlan(ledger).ready) promote(ledger, move.move);
    const blocked = animationWorkPlan(ledger);
    expect(blocked.state).toBe("blocked");
    expect(blocked.ready).toEqual([]);
    expect(blocked.remaining).toBe(blocked.blocked.length);
    ledger.blockers = [];
    const resumed = animationWorkPlan(ledger);
    expect(resumed.state).toBe("ready");
    expect(resumed.ready.map((move) => move.move)).toEqual(blocked.blocked.map((move) => move.move));
    for (const move of resumed.ready) promote(ledger, move.move);
    expect(animationWorkPlan(ledger)).toEqual({ state: "complete", remaining: 0, ready: [], blocked: [] });
  });

  it("rejects duplicate, undocumented, out-of-tier, and stale blockers", () => {
    const ledger = freshLedger();
    const blocker = ledger.blockers![0];
    expect(() => animationWorkPlan({ ...ledger, blockers: [blocker, blocker] })).toThrow(/duplicate blocker/);
    expect(() => animationWorkPlan({ ...ledger, blockers: [{ ...blocker, resumeWhen: " " }] })).toThrow(/resume condition/);
    expect(() => animationWorkPlan({ ...ledger, blockers: [{ ...blocker, evidence: [] }] })).toThrow(/evidence/);
    expect(() => animationWorkPlan({ ...ledger, blockers: [{ ...blocker, move: "MOVE_POUND" }] })).toThrow(/Factory/);
    expect(() => animationWorkPlan({ ...ledger, queue: ["MOVE_POUND"] })).toThrow(/Factory/);
    const track = ledger.componentTracks[0];
    expect(() => animationWorkPlan({ ...ledger, componentTracks: [{ ...track, representatives: ["MOVE_POUND"] }] })).toThrow(/Factory/);
    promote(ledger, blocker.move);
    expect(() => animationWorkPlan(ledger)).toThrow(/exact move.*cannot remain blocked/);
  });
});
