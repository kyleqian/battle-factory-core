import { describe, expect, it } from "vitest";
import probe from "../../src/data/gen/onix-front-idle-probe.json" with { type: "json" };
import {
  rapidHorizontalHopsOffsetAtTick,
  speciesFrontIdleRestOffset,
  verticalSquishBounceFrameAtTick,
  verticalStretchFrameAtTick,
  V_SQUISH_AND_BOUNCE_FRONT_SPECIES,
  V_STRETCH_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import bayleefRunA from "../../tools/compare/fixtures/sendout-front-bayleef-run-a.json" with { type: "json" };
import bayleefRunB from "../../tools/compare/fixtures/sendout-front-bayleef-run-b.json" with { type: "json" };
import magbyRunA from "../../tools/compare/fixtures/sendout-front-magby-run-a.json" with { type: "json" };
import magbyRunB from "../../tools/compare/fixtures/sendout-front-magby-run-b.json" with { type: "json" };
import quilavaRunA from "../../tools/compare/fixtures/sendout-front-quilava-run-a.json" with { type: "json" };
import quilavaRunB from "../../tools/compare/fixtures/sendout-front-quilava-run-b.json" with { type: "json" };
import houndourRunA from "../../tools/compare/fixtures/sendout-front-houndour-run-a.json" with { type: "json" };
import houndourRunB from "../../tools/compare/fixtures/sendout-front-houndour-run-b.json" with { type: "json" };

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

    it("dispatches the complete generated 50-species V_SQUISH_AND_BOUNCE family", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SQUISH_AND_BOUNCE")
        .map(([species]) => species);
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toEqual(generated);
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toHaveLength(50);
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toContain("BAYLEEF");
      expect(V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toContain("MAGBY");
      for (const species of V_SQUISH_AND_BOUNCE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("returns null for generated species whose front-anim family isn't ported", () => {
      expect(speciesFrontIdleRestOffset("CHARMELEON")).toBeNull();
      expect(speciesFrontIdleRestOffset("WARTORTLE")).toBeNull();
    });

    it("dispatches the complete generated 32-species V_STRETCH family", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_STRETCH")
        .map(([species]) => species);
      expect(V_STRETCH_FRONT_SPECIES).toEqual(generated);
      expect(V_STRETCH_FRONT_SPECIES).toHaveLength(32);
      expect(V_STRETCH_FRONT_SPECIES).toContain("QUILAVA");
      expect(V_STRETCH_FRONT_SPECIES).toContain("HOUNDOUR");
      expect(V_STRETCH_FRONT_SPECIES).toContain("GROVYLE");
      for (const species of V_STRETCH_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalSquishBounceFrameAtTick (Anim_VerticalSquishBounce port)", () => {
    it("ports the source accumulators, sine arithmetic, and affine writes", () => {
      expect(verticalSquishBounceFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data2: 1, data3: 0, data4: 8,
        xScale: 256, yScale: 256,
        callback: "VerticalSquishBounce", affineMode: "double",
      });
      expect(verticalSquishBounceFrameAtTick(8)).toMatchObject({
        y2: 4, data2: 9, data3: 0, data4: 72, xScale: 224, yScale: 288,
      });
      expect(verticalSquishBounceFrameAtTick(24)).toMatchObject({
        y2: -10, data2: 25, data3: 64, data4: 200, xScale: 288, yScale: 224,
      });
      expect(verticalSquishBounceFrameAtTick(48)).toMatchObject({
        y2: -1, data2: 49, data3: 120, data4: 136,
      });
    });

    it("ports the terminal cleanup before WaitAnimEnd hands off to SpriteCallbackDummy", () => {
      expect(verticalSquishBounceFrameAtTick(49)).toEqual({
        x2: 0, y2: 0, data2: 49, data3: 120, data4: 136,
        xScale: 256, yScale: 256,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(verticalSquishBounceFrameAtTick(50)).toEqual(verticalSquishBounceFrameAtTick(49));
      expect(verticalSquishBounceFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["BAYLEEF", bayleefRunA, bayleefRunB, 1],
      ["MAGBY", magbyRunA, magbyRunB, 1],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (species, runA, runB, animNum) => {
      // Deep equality is the hermetic counterpart to the generation-time
      // `cmp`: these independently launched Scene-ON emulator runs stay
      // byte-identical in the committed evidence.
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SQUISH_AND_BOUNCE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });
  });

  describe("verticalStretchFrameAtTick (Anim_VerticalStretch port)", () => {
    it("ports the source accumulators, sine arithmetic, and both sDontFlip branches", () => {
      expect(verticalStretchFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data2: 1, data4: -256, data5: 256, data7: 0,
        xScale: -256, yScale: 256,
        callback: "Anim_VerticalStretch", affineMode: "double",
      });
      expect(verticalStretchFrameAtTick(10)).toMatchObject({
        y2: -4, data2: 11, data4: -267, data5: 221, data7: 51,
      });
      expect(verticalStretchFrameAtTick(20)).toMatchObject({
        y2: -5, data2: 21, data4: -272, data5: 209, data7: 561,
      });
      expect(verticalStretchFrameAtTick(29)).toMatchObject({
        y2: -3, data2: 30, data4: -268, data5: 227, data7: 1020,
      });
      expect(verticalStretchFrameAtTick(20, true)).toMatchObject({
        y2: -5, data4: 272, data5: 209,
      });
    });

    it("ports the terminal affine/y2 cleanup before WaitAnimEnd", () => {
      expect(verticalStretchFrameAtTick(40)).toMatchObject({
        x2: 0, y2: 0, data2: 41, xScale: -256, yScale: 256,
        callback: "Anim_VerticalStretch", affineMode: "double",
      });
      expect(verticalStretchFrameAtTick(41)).toEqual({
        x2: 0, y2: 0, data2: 42, data4: -256, data5: 256, data7: 1020,
        xScale: 256, yScale: 256,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(verticalStretchFrameAtTick(42)).toEqual(verticalStretchFrameAtTick(41));
      expect(verticalStretchFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["QUILAVA", quilavaRunA, quilavaRunB],
      ["HOUNDOUR", houndourRunA, houndourRunB],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (species, runA, runB) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_STRETCH");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });
  });
});
