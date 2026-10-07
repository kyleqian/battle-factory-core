import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_MOVE_ANIMATION_IDS } from "../src/engine/liveMoveAnimation.ts";
import { PRESENTATION_RNG_POLICIES } from "../src/engine/presentationRngHost.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_MOVE_TIMING_POLICY_VERSION } from "../src/engine/liveMoveTimingPolicy.ts";

// The preview manifest and the remaining-adapters census read `implementedCount`;
// it must agree with the entry list and the production registry.
describe("animation-integration live status count", () => {
  it("implementedCount equals the implemented entries and LIVE_MOVE_ANIMATION_IDS", () => {
    const status = JSON.parse(readFileSync(join(import.meta.dirname, "../docs/animation-integration-live-status.json"), "utf8"));
    const ids = (status.implementedAdapters as { id: number }[]).map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(status.implementedCount).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual([...LIVE_MOVE_ANIMATION_IDS].sort((a, b) => a - b));
  });

  it("keeps the faithful-random bucket separate from implementedCount (D3, docs/presentation-rng.md)", () => {
    const status = JSON.parse(readFileSync(join(import.meta.dirname, "../docs/animation-integration-live-status.json"), "utf8"));
    expect(status.implementedCount).toBe(247);
    expect(status.playableExactCount).toBe(0);
    const faithful = status.faithfulRandomAdapters as { id: number; move: string; policy: string; provenance: string }[];
    expect(status.faithfulRandomCount).toBe(faithful.length);
    expect(faithful.map(entry => entry.id).sort((a, b) => a - b))
      .toEqual([...LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS].sort((a, b) => a - b));
    const implemented = new Set((status.implementedAdapters as { id: number }[]).map(entry => entry.id));
    for (const entry of faithful) {
      expect(implemented.has(entry.id)).toBe(false);
      expect((LIVE_MOVE_ANIMATION_IDS as readonly number[]).includes(entry.id)).toBe(false);
      expect(PRESENTATION_RNG_POLICIES).toContain(entry.policy);
      expect(["surrogate", "pinned"]).toContain(entry.provenance);
    }
    expect(status.faithfulRandomClaim.policy).toBe(PRESENTATION_RNG_POLICIES[0]);
    expect(status.faithfulRandomClaim.claimBoundary).toContain("Surrogate frames are \"faithful random\", never oracle-exact");
    expect(status.faithfulRandomClaim.claimBoundary).toContain("pinned-word proofs establish controlled bodies only");
    expect(Object.keys(status.faithfulRandomClaim.entryFields)).toEqual(["id", "move", "policy", "provenance", "pinnedProofs", "surrogateRoutes"]);
  });

  it("keeps the faithful-timing bucket disjoint; exact + faithful random + faithful timing + remaining = 276, each accepted move once (D4, docs/faithful-timing.md)", () => {
    const read = (path: string) => JSON.parse(readFileSync(join(import.meta.dirname, "..", path), "utf8"));
    const status = read("docs/animation-integration-live-status.json");
    const accepted = new Set([...read("docs/animation-integration-readiness.json").acceptedMoves, ...read("docs/animation-integration-merged-readiness.json").acceptedMoves]
      .map((entry: { move: string }) => entry.move));
    expect(accepted.size).toBe(276);
    expect(status.currentAcceptedFactoryMoves).toBe(276);
    const timing = status.faithfulTimingAdapters as { id: number; move: string; policyVersion: string; d3: boolean; timingParameters: unknown[] }[];
    expect(status.faithfulTimingCount).toBe(timing.length);
    expect(timing.map((entry) => entry.id).sort((a, b) => a - b)).toEqual([...LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS].sort((a, b) => a - b));
    const buckets = {
      exact: (status.implementedAdapters as { move: string }[]).map((entry) => entry.move),
      faithfulRandom: (status.faithfulRandomAdapters as { move: string }[]).map((entry) => entry.move),
      faithfulTiming: timing.map((entry) => entry.move),
    };
    const counted = Object.values(buckets).flat();
    expect(new Set(counted).size).toBe(counted.length); // no move in two buckets
    for (const move of counted) expect(accepted.has(move)).toBe(true);
    const remaining = [...accepted].filter((move) => !counted.includes(move));
    expect(buckets.exact.length + buckets.faithfulRandom.length + buckets.faithfulTiming.length + remaining.length).toBe(276);
    const census = read("tools/integration/fixtures/remaining-adapters-census.json").summary;
    expect(census).toMatchObject({ live: buckets.exact.length, faithfulRandom: buckets.faithfulRandom.length, faithfulTiming: buckets.faithfulTiming.length, inFlight: 0, remaining: remaining.length });
    expect(census.sumsTo).toBe(`${buckets.exact.length}+${buckets.faithfulRandom.length}+${buckets.faithfulTiming.length}+0+${remaining.length}=276`);
    const random = new Set(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS as readonly number[]);
    for (const entry of timing) {
      // A D3+D4 adapter appears once, here, with d3: true; never in faithfulRandomAdapters / the faithful-random production list.
      expect(typeof entry.d3).toBe("boolean");
      expect(random.has(entry.id)).toBe(false);
      expect((LIVE_MOVE_ANIMATION_IDS as readonly number[]).includes(entry.id)).toBe(false);
      expect(entry.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
      expect(LIVE_MOVE_TIMING_POLICY[entry.id]?.move).toBe(entry.move);
      expect(Object.keys(entry).sort()).toEqual(Object.keys(status.faithfulTimingClaim.entryFields).sort());
    }
    expect(status.faithfulTimingClaim.policyVersion).toBe(LIVE_MOVE_TIMING_POLICY_VERSION);
    expect(status.faithfulTimingClaim.claimBoundary).toContain("add no exact coverage, implementedCount or Factory acceptance");
  });
});
