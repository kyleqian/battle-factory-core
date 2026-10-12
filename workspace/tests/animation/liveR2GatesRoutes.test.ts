import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveAnimation.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// r2-gates: ordinary generated routes for the widened gates (tools/integration/fixtures/r2-gates/routes.json): a later Overheat body (known
// order lend) and an opponent Psych Up first body are live every age, the next prompt is reached, and Scene ON/OFF gameplay is equal.
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
const routes = JSON.parse(readFileSync("tools/integration/fixtures/r2-gates/routes.json", "utf8"));
const cases = [
  // prep28: seed 143 / streak 28 / index 1 declined behind an unplanned predecessor (Water Pulse); the 14 prep28 plan rows make its lend known, so the body is now live.
  ...routes["overheat-later-body"].map((r: any) => ({ ...r, moveId: 315, duration: 230, slots: [0] as (0 | 1 | 2 | 3)[],
    active: r.seed === 143 && r.streak === 28 && r.index === 1 ? true : r.active })),
  ...routes["psych-up-opponent"].filter((r: any) => r.seed !== undefined).map((r: any) => ({
    ...r, moveId: 244, duration: 179, slots: ([[0, 1, 2, 3], [1, 2, 3, 0]] as const)[r.seed % 2]!.slice(0, 3) as (0 | 1 | 2 | 3)[] })),
];
describe("r2-gates ordinary routes (later Overheat, opponent Psych Up)", () => {
  it("registers the widened gates", () => {
    for (const id of [315, 244]) expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
  });
  it.each(cases)("route $moveId seed $seed streak $streak index $index ($pair): ON/OFF rules and RNG unchanged", r => {
    const on = generatedCommandAnimationReplay(r.seed, "on", r.slots, r.streak, true, true);
    const off = generatedCommandAnimationReplay(r.seed, "off", r.slots, r.streak, true, true);
    const body = on.animations[r.index]!;
    expect([body.moveId, body.attacker]).toEqual([r.moveId, r.attacker === "player" ? 0 : 1]);
    expect(on.animations.slice(0, r.index).map(a => `${a.moveId}${a.attacker === 0 ? "p" : "o"}`).join(",")).toBe(r.prior);
    expect(body.ages).toEqual(iu120Ages(r.moveId, r.duration, r.attacker));
    expect(body.adapterActive.every(Boolean)).toBe(r.active);
    expect(body.adapterActive.some(Boolean)).toBe(r.active);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
  }, 240000);

  it("pins the unpatched-renderer dense receipt: lb21 later bodies, opponent Psych Up alternates and the regression fixtures are 0 px twice fresh", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/r2-gates-firepunch-receipt.json", "utf8"));
    const groups = [receipt.lb21LaterBodies.fixtures, receipt.psychUpOpponentAlternates.fixtures, receipt.existingRegression.prep16Live, receipt.existingRegression.laterBodiesBg];
    expect(groups.map(g => Object.keys(g).length)).toEqual([17, 2, 8, 11]);
    for (const group of groups) for (const row of Object.values(group) as any[]) {
      expect(row.freshRuns).toHaveLength(2);
      for (const run of row.freshRuns) expect([run.rows, run.exactRows, run.residualPixels]).toEqual([row.expectedDuration, row.expectedDuration, 0]);
      expect(row.freshRuns[0].digest).toBe(row.freshRuns[1].digest);
    }
    // Species breadth: opponent attackers HYPNO (elevated GOLBAT target) and CLAYDOL; both orientations of Overheat.
    const alt = Object.keys(receipt.psychUpOpponentAlternates.fixtures);
    expect(alt).toEqual(["pua-claydol-golem-b0", "pua-hypno-golbat-b0"]);
    for (const side of ["o", "p"]) expect(Object.keys(receipt.lb21LaterBodies.fixtures).filter(n => n.startsWith(`oh2-${side}-`))).toHaveLength(5);
  });
});
