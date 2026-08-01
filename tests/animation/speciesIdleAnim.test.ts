import { describe, expect, it } from "vitest";
import probe from "../../src/data/gen/onix-front-idle-probe.json" with { type: "json" };
import {
  growVibrateFrameAtTick,
  GROW_VIBRATE_FACTORY_FRONT_SPECIES,
  GROW_VIBRATE_FRONT_SPECIES,
  GROW_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalShakeFrameAtTick,
  H_SHAKE_FACTORY_FRONT_SPECIES,
  H_SHAKE_FRONT_SPECIES,
  H_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES,
  rapidHorizontalHopsOffsetAtTick,
  speciesFrontIdleRestOffset,
  verticalShakeFrameAtTick,
  verticalSquishBounceFrameAtTick,
  verticalSquishBounceSlowFrameAtTick,
  verticalStretchFrameAtTick,
  V_SQUISH_AND_BOUNCE_FRONT_SPECIES,
  V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES,
  V_SHAKE_FACTORY_FRONT_SPECIES,
  V_SHAKE_FRONT_SPECIES,
  V_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_STRETCH_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import bayleefRunA from "../../tools/compare/fixtures/sendout-front-bayleef-run-a.json" with { type: "json" };
import bayleefRunB from "../../tools/compare/fixtures/sendout-front-bayleef-run-b.json" with { type: "json" };
import magbyRunA from "../../tools/compare/fixtures/sendout-front-magby-run-a.json" with { type: "json" };
import magbyRunB from "../../tools/compare/fixtures/sendout-front-magby-run-b.json" with { type: "json" };
import quilavaRunA from "../../tools/compare/fixtures/sendout-front-quilava-run-a.json" with { type: "json" };
import quilavaRunB from "../../tools/compare/fixtures/sendout-front-quilava-run-b.json" with { type: "json" };
import houndourRunA from "../../tools/compare/fixtures/sendout-front-houndour-run-a.json" with { type: "json" };
import houndourRunB from "../../tools/compare/fixtures/sendout-front-houndour-run-b.json" with { type: "json" };
import machokeRunA from "../../tools/compare/fixtures/sendout-front-machoke-run-a.json" with { type: "json" };
import machokeRunB from "../../tools/compare/fixtures/sendout-front-machoke-run-b.json" with { type: "json" };
import rhyhornRunA from "../../tools/compare/fixtures/sendout-front-rhyhorn-run-a.json" with { type: "json" };
import rhyhornRunB from "../../tools/compare/fixtures/sendout-front-rhyhorn-run-b.json" with { type: "json" };
import lickitungRunA from "../../tools/compare/fixtures/sendout-front-lickitung-run-a.json" with { type: "json" };
import lickitungRunB from "../../tools/compare/fixtures/sendout-front-lickitung-run-b.json" with { type: "json" };
import miltankRunA from "../../tools/compare/fixtures/sendout-front-miltank-run-a.json" with { type: "json" };
import miltankRunB from "../../tools/compare/fixtures/sendout-front-miltank-run-b.json" with { type: "json" };
import kabutopsRunA from "../../tools/compare/fixtures/sendout-front-kabutops-run-a.json" with { type: "json" };
import kabutopsRunB from "../../tools/compare/fixtures/sendout-front-kabutops-run-b.json" with { type: "json" };
import blazikenRunA from "../../tools/compare/fixtures/sendout-front-blaziken-run-a.json" with { type: "json" };
import blazikenRunB from "../../tools/compare/fixtures/sendout-front-blaziken-run-b.json" with { type: "json" };
import kadabraRunA from "../../tools/compare/fixtures/sendout-front-kadabra-run-a.json" with { type: "json" };
import kadabraRunB from "../../tools/compare/fixtures/sendout-front-kadabra-run-b.json" with { type: "json" };
import registeelRunA from "../../tools/compare/fixtures/sendout-front-registeel-run-a.json" with { type: "json" };
import registeelRunB from "../../tools/compare/fixtures/sendout-front-registeel-run-b.json" with { type: "json" };

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

    it("distinguishes all 25 V_SHAKE selector mappings from the 24-species Factory subset", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SHAKE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SHAKE_FRONT_SPECIES).toEqual(generated);
      expect(V_SHAKE_FRONT_SPECIES).toHaveLength(25);
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toHaveLength(24);
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toContain("MACHOKE");
      expect(V_SHAKE_FACTORY_FRONT_SPECIES).toContain("RHYHORN");
      expect(V_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["GROUDON"]);
      expect(factorySpecies.has("GROUDON")).toBe(false);
      for (const species of V_SHAKE_FRONT_SPECIES) {
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

  describe("verticalSquishBounceSlowFrameAtTick (Anim_VerticalSquishBounce_Slow port)", () => {
    it("derives all 16 selector mappings and proves every one is Factory-reachable", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SQUISH_AND_BOUNCE_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toHaveLength(16);
      expect(generated.filter((species) => factorySpecies.has(species))).toHaveLength(16);
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toContain("LICKITUNG");
      expect(V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES).toContain("MILTANK");
      for (const species of V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("ports the shared callback with source duration 32 arithmetic", () => {
      expect(verticalSquishBounceSlowFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data2: 1, data3: 0, data4: 4,
        xScale: 256, yScale: 256,
        callback: "VerticalSquishBounce", affineMode: "double",
      });
      expect(verticalSquishBounceSlowFrameAtTick(16)).toMatchObject({
        y2: 4, data2: 17, data3: 0, data4: 68, xScale: 224, yScale: 288,
      });
      expect(verticalSquishBounceSlowFrameAtTick(48)).toMatchObject({
        y2: -10, data2: 49, data3: 64, data4: 196, xScale: 288, yScale: 224,
      });
      expect(verticalSquishBounceSlowFrameAtTick(96)).toMatchObject({
        y2: 0, data2: 97, data3: 124, data4: 132,
        callback: "VerticalSquishBounce", affineMode: "double",
      });
    });

    it("pins tick 97 terminal x2/y2/affine/callback cleanup", () => {
      expect(verticalSquishBounceSlowFrameAtTick(97)).toEqual({
        x2: 0, y2: 0, data2: 97, data3: 124, data4: 132,
        xScale: 256, yScale: 256,
        callback: "WaitAnimEnd", affineMode: "normal",
      });
      expect(verticalSquishBounceSlowFrameAtTick(98)).toEqual(
        verticalSquishBounceSlowFrameAtTick(97),
      );
      expect(verticalSquishBounceSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["LICKITUNG", lickitungRunA, lickitungRunB, 2, 108],
      ["MILTANK", miltankRunA, miltankRunB, 1, 241],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SQUISH_AND_BOUNCE_SLOW");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of ["BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN"]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalShakeFrameAtTick (Anim_VerticalShake / VerticalShake port)", () => {
    it("ports source accumulator arithmetic and the strict terminal guard", () => {
      expect(verticalShakeFrameAtTick(0)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 60, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(1)).toEqual({
        x2: 0, y2: 2, data0: 60, data2: 120, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(3)).toEqual({
        x2: 0, y2: -3, data0: 60, data2: 240, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(37)).toMatchObject({
        y2: -3, data2: 2280, callback: "VerticalShake",
      });
      expect(verticalShakeFrameAtTick(38)).toEqual({
        x2: 0, y2: -2, data0: 60, data2: 2340, callback: "VerticalShake",
      });
    });

    it("cleans terminal y2 only after the accumulator exceeds 2304", () => {
      expect(verticalShakeFrameAtTick(39)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 2400, callback: "WaitAnimEnd",
      });
      expect(verticalShakeFrameAtTick(40)).toEqual(verticalShakeFrameAtTick(39));
      expect(verticalShakeFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["MACHOKE", machokeRunA, machokeRunB, 2, 67],
      ["RHYHORN", rhyhornRunA, rhyhornRunB, 4, 111],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SHAKE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves the three prior accepted front families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of ["BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR"]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalShakeFrameAtTick (Anim_HorizontalShake / HorizontalShake port)", () => {
    it("distinguishes all 17 selector mappings, 16 Factory species, and RAYQUAZA outside Factory", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_SHAKE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_SHAKE_FRONT_SPECIES).toEqual(generated);
      expect(H_SHAKE_FRONT_SPECIES).toHaveLength(17);
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toHaveLength(16);
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toContain("KABUTOPS");
      expect(H_SHAKE_FACTORY_FRONT_SPECIES).toContain("BLAZIKEN");
      expect(H_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["RAYQUAZA"]);
      expect(factorySpecies.has("RAYQUAZA")).toBe(false);
      for (const species of H_SHAKE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every active callback boundary with source data0=60 and data7=3", () => {
      const activeX2 = [
        0, 2, 0, -3, -2, 2, 1, -3, -3, 1, 2, -2, -3,
        0, 2, -1, -3, -1, 2, 0, -3, -2, 2, 1, -3, -3,
        1, 2, -2, -3, 0, 2, 0, -3, -1, 2, 1, -3, -2,
      ];
      expect(activeX2).toHaveLength(39);
      for (const [tick, x2] of activeX2.entries()) {
        expect(horizontalShakeFrameAtTick(tick)).toEqual({
          x2,
          y2: 0,
          data0: 60,
          data2: (tick + 1) * 60,
          data7: 3,
          callback: "HorizontalShake",
        });
      }
    });

    it("uses the strict >2304 guard and performs terminal x2/y2/callback cleanup", () => {
      expect(horizontalShakeFrameAtTick(38)).toEqual({
        x2: -2, y2: 0, data0: 60, data2: 2340, data7: 3,
        callback: "HorizontalShake",
      });
      expect(horizontalShakeFrameAtTick(39)).toEqual({
        x2: 0, y2: 0, data0: 60, data2: 2400, data7: 3,
        callback: "WaitAnimEnd",
      });
      expect(horizontalShakeFrameAtTick(40)).toEqual(horizontalShakeFrameAtTick(39));
      expect(horizontalShakeFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["KABUTOPS", kabutopsRunA, kabutopsRunB, 3, 141],
      ["BLAZIKEN", blazikenRunA, blazikenRunB, 4, 282],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_SHAKE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR",
        "MACHOKE", "RHYHORN", "LICKITUNG", "MILTANK",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("growVibrateFrameAtTick (Anim_GrowVibrate port)", () => {
    it("distinguishes 18 selector mappings, 16 Factory species, and MEWTWO plus HO_OH outside Factory", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_GROW_VIBRATE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(GROW_VIBRATE_FRONT_SPECIES).toEqual(generated);
      expect(GROW_VIBRATE_FRONT_SPECIES).toHaveLength(18);
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toHaveLength(16);
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toContain("KADABRA");
      expect(GROW_VIBRATE_FACTORY_FRONT_SPECIES).toContain("REGISTEEL");
      expect(GROW_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["MEWTWO", "HO_OH"]);
      expect(factorySpecies.has("MEWTWO")).toBe(false);
      expect(factorySpecies.has("HO_OH")).toBe(false);
      for (const species of GROW_VIBRATE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins every active callback boundary, C index arithmetic, and alternating sine amplitude", () => {
      const activeIndexAmplitudeScale = [
        [0, 32, 256], [6, 8, 257], [12, 32, 265], [19, 8, 259],
        [25, 32, 274], [32, 8, 261], [38, 32, 281], [44, 8, 263],
        [51, 32, 286], [57, 8, 263], [64, 32, 288], [70, 8, 263],
        [76, 32, 286], [83, 8, 263], [89, 32, 282], [96, 8, 261],
        [102, 32, 275], [108, 8, 259], [115, 32, 266], [121, 8, 257],
        [128, 32, 256], [134, 8, 254], [140, 32, 246], [147, 8, 252],
        [153, 32, 237], [160, 8, 250], [166, 32, 230], [172, 8, 248],
        [179, 32, 225], [185, 8, 248], [192, 32, 224], [198, 8, 248],
        [204, 32, 225], [211, 8, 248], [217, 32, 229], [224, 8, 250],
        [230, 32, 237], [236, 8, 252], [243, 32, 246], [249, 8, 254],
        [0, 32, 256],
      ] as const;
      expect(activeIndexAmplitudeScale).toHaveLength(41);
      for (const [tick, [index, amplitude, scale]] of activeIndexAmplitudeScale.entries()) {
        expect(growVibrateFrameAtTick(tick)).toEqual({
          x2: 0,
          y2: 0,
          data2: tick + 1,
          data4: scale,
          data5: scale,
          index,
          amplitude,
          xScale: scale,
          yScale: scale,
          startedAffine: tick === 0,
          callback: "Anim_GrowVibrate",
          affineMode: "double",
        });
      }
    });

    it("uses strict data2 > 40 cleanup and preserves the final data2 increment", () => {
      expect(growVibrateFrameAtTick(40)).toMatchObject({
        data2: 41,
        index: 0,
        amplitude: 32,
        xScale: 256,
        yScale: 256,
        callback: "Anim_GrowVibrate",
        affineMode: "double",
      });
      expect(growVibrateFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data2: 42,
        data4: 256,
        data5: 256,
        index: null,
        amplitude: null,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(growVibrateFrameAtTick(42)).toEqual(growVibrateFrameAtTick(41));
      expect(growVibrateFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["KADABRA", kadabraRunA, kadabraRunB, 2, 64],
      ["REGISTEEL", registeelRunA, registeelRunB, 4, 403],
    ] as const)("matches two byte-identical fresh settled %s RAM receipts", (
      species,
      runA,
      runB,
      animCmdIndex,
      data2,
    ) => {
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_GROW_VIBRATE");
      const settled = runA.ticks[0]!.battler1;
      expect({
        x2: settled.x2,
        y2: settled.y2,
        animNum: settled.animNum,
        animCmdIndex: settled.animCmdIndex,
        data2: settled.data2,
        callback: settled.callback,
        callbackSymbol: settled.callbackSymbol,
      }).toEqual({
        x2: 0,
        y2: 0,
        animNum: 1,
        animCmdIndex,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted front family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });
});
