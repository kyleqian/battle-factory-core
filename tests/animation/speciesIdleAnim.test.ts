import { describe, expect, it } from "vitest";
import probe from "../../src/data/gen/onix-front-idle-probe.json" with { type: "json" };
import {
  rapidHorizontalHopsOffsetAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("speciesIdleAnim", () => {
  describe("rapidHorizontalHopsOffsetAtTick (Anim_RapidHorizontalHops port)", () => {
    it("matches hand-derived source arithmetic at several ticks across all 4 phases", () => {
      const expected: Record<number, { x2: number; y2: number } | null> = {
        0: { x2: 0, y2: 0 },
        1: { x2: 0, y2: -2 },
        21: { x2: -15, y2: 0 },
        22: { x2: -16, y2: -1 },
        42: { x2: -1, y2: -1 },
        43: { x2: 0, y2: 0 },
        63: { x2: 15, y2: -2 },
        64: { x2: 16, y2: 0 },
        84: { x2: 1, y2: -2 },
        85: { x2: 1, y2: 0 },
        86: null,
        87: null,
        200: null,
      };
      for (const [tick, want] of Object.entries(expected)) {
        expect(rapidHorizontalHopsOffsetAtTick(Number(tick))).toEqual(want);
      }
    });

    it("is null before the animation's own creation tick", () => {
      expect(rapidHorizontalHopsOffsetAtTick(-1)).toBeNull();
    });
  });

  describe("speciesFrontIdleRestOffset", () => {
    it("returns ONIX's own frozen Anim_RapidHorizontalHops residual (last active tick 85, accumulator 2040)", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
    });

    it("matches the RAM-probed settled state (SpriteCallbackDummy, both battler slots, tools/probe/dump-onix-front-idle-anim.py)", () => {
      const rows = (probe as { ticks: readonly { battler1: { x2: number; y2: number; callbackSymbol: string } }[] }).ticks;
      for (const row of rows) {
        expect(row.battler1.callbackSymbol).toBe("SpriteCallbackDummy");
        expect({ x2: row.battler1.x2, y2: row.battler1.y2 }).toEqual(speciesFrontIdleRestOffset("ONIX"));
      }
    });

    it("returns null for species whose own front-anim family isn't ported", () => {
      expect(speciesFrontIdleRestOffset("CHARMELEON")).toBeNull();
      expect(speciesFrontIdleRestOffset("GROVYLE")).toBeNull();
    });
  });
});
