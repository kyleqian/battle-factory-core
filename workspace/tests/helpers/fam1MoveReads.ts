// fam1 (docs/fam1-first-use-move-animations.md): one shard of the per-move table check. Every Factory move (Level 50 and Open Level
// pools) records the files its animation reads (tools/bundle/animAssetMoveReads.ts) and fails when a lazy one is missing from its
// src/assets/gen/anim-asset-moves.json entry: that file would not be prefetched, and the first use would pause the game while it loads.
// Sharded over four files so the ~2 minutes of drawing run in parallel forks.
import { describe, expect, it } from "vitest";
import animAssetMoves from "../../src/assets/gen/anim-asset-moves.json" with { type: "json" };
import { factoryMoveIds, moveName, recordMoveAnimationReads } from "../../tools/bundle/animAssetMoveReads.ts";

export const FAM1_SHARDS = 4;

export function fam1MoveReadShard(shard: number): void {
  const eager = new Set(animAssetMoves.eager);
  const byMove = animAssetMoves.byMove as Record<string, string[]>;
  const moves = factoryMoveIds().filter((_, index) => index % FAM1_SHARDS === shard);
  describe(`fam1: a Factory move's animation reads only lazy files its table entry lists (shard ${shard + 1} of ${FAM1_SHARDS})`, () => {
    it("the shard is not empty and the pools are both levels'", () => {
      expect(moves.length).toBeGreaterThan(60);
      expect(factoryMoveIds("both").length).toBeGreaterThan(factoryMoveIds("open").length);
    });
    for (const move of moves) {
      it(`${move} ${moveName(move)}`, () => {
        const recorded = recordMoveAnimationReads(move);
        expect(recorded.errors).toEqual([]);
        // Not vacuous: a move with a live body drew rows of it (a body none of whose rows draws here is invisible to this check).
        if (recorded.undrawn.length > 0) expect(recorded.rows, recorded.undrawn.join("\n")).toBeGreaterThan(0);
        const listed = new Set(byMove[move] ?? []);
        expect(recorded.reads.filter((name) => !eager.has(name) && !listed.has(name))).toEqual([]);
      }, 60_000);
    }
  });
}
