import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_MOVE_ANIMATION_IDS } from "../src/engine/liveMoveAnimation.ts";
import { PRESENTATION_RNG_POLICIES } from "../src/engine/presentationRngHost.ts";

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
    expect(status.implementedCount).toBe(218);
    expect(status.playableExactCount).toBe(0);
    const faithful = status.faithfulRandomAdapters as { id: number; move: string; policy: string; provenance: string }[];
    expect(status.faithfulRandomCount).toBe(faithful.length);
    expect(status.faithfulRandomCount).toBe(0);
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
});
