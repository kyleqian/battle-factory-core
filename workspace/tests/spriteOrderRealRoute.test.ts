import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Receipt of tools/integration/spriteOrderRealRouteReplay.ts (docs/sprite-order-real-route.md): the section 2 rule table of
// docs/sprite-order-gap-causes.md replayed from recorded events over real ordinary-Factory battle-1 histories.
const receipt = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/sprite-order-real-route/replay-receipt.json", import.meta.url), "utf8")) as {
  results: { trace: string; mode: string; moveEdges: { tested: number; exact: number; mismatched: number }; bodyLevel: Record<string, { checks: number; mismatched: number }>;
    edges: { frame: number; kind: string; move?: number; attacker: number; known: boolean; trivial: boolean; exact: boolean | null; observedFHead: number[] }[] }[];
};

describe("sprite-order real-route replay receipt", () => {
  it("covers the five committed traces in strict and resync mode", () => {
    expect(new Set(receipt.results.map(r => r.trace)).size).toBe(5);
    expect(receipt.results.filter(r => r.mode === "resync")).toHaveLength(5);
  });
  it("strict mode: the first (known-entry) edge is exact", () => {
    for (const r of receipt.results.filter(x => x.mode === "strict")) {
      const first = r.edges[0]!;
      expect(first.known && first.exact).toBe(true);
      expect(first.observedFHead).toHaveLength(24);
    }
  });
  it("resync mode: every non-trivially-seeded edge and every rule/table unit check is exact", () => {
    for (const r of receipt.results.filter(x => x.mode === "resync")) {
      expect(r.moveEdges.tested).toBeGreaterThan(0);
      expect(r.moveEdges.mismatched).toBe(0);
      for (const edge of r.edges.filter(e => e.known && !e.trivial)) expect(edge.exact).toBe(true);
      for (const [, c] of Object.entries(r.bodyLevel).filter(([k]) => k !== "learned")) expect(c.mismatched).toBe(0);
    }
  });
});
