import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import probe from "../../src/data/gen/onix-front-idle-probe.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  bounceRotateToSidesSmallFrameAtTick,
  bounceRotateToSidesSmallSlowFrameAtTick,
  bounceRotateToSidesSlowFrameAtTick,
  BOUNCE_ROTATE_TO_SIDES_DATA,
  BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES,
  BOUNCE_ROTATE_TO_SIDES_VARIANTS,
  growVibrateFrameAtTick,
  GROW_VIBRATE_FACTORY_FRONT_SPECIES,
  GROW_VIBRATE_FRONT_SPECIES,
  GROW_VIBRATE_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalJumpsVerticalStretchFrameAtTick,
  H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_FRONT_SPECIES,
  H_JUMPS_V_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalShakeFrameAtTick,
  H_SHAKE_FACTORY_FRONT_SPECIES,
  H_SHAKE_FRONT_SPECIES,
  H_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES,
  rapidHorizontalHopsOffsetAtTick,
  speciesFrontIdleRestOffset,
  swingConcaveFrameAtTick,
  SWING_CONCAVE_FACTORY_FRONT_SPECIES,
  SWING_CONCAVE_FRONT_SPECIES,
  SWING_CONCAVE_OUTSIDE_FACTORY_FRONT_SPECIES,
  verticalSlideFrameAtTick,
  verticalJumpsSmallFrameAtTick,
  verticalShakeFrameAtTick,
  verticalShakeTwiceFrameAtTick,
  verticalSquishBounceFrameAtTick,
  verticalSquishBounceSlowFrameAtTick,
  verticalStretchFrameAtTick,
  V_SQUISH_AND_BOUNCE_FRONT_SPECIES,
  V_SQUISH_AND_BOUNCE_SLOW_FRONT_SPECIES,
  V_SHAKE_FACTORY_FRONT_SPECIES,
  V_SHAKE_FRONT_SPECIES,
  V_SHAKE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_SHAKE_TWICE_FACTORY_FRONT_SPECIES,
  V_SHAKE_TWICE_FRONT_SPECIES,
  V_SHAKE_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_JUMPS_SMALL_FACTORY_FRONT_SPECIES,
  V_JUMPS_SMALL_FRONT_SPECIES,
  V_JUMPS_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_SLIDE_FACTORY_FRONT_SPECIES,
  V_SLIDE_FRONT_SPECIES,
  V_SLIDE_OUTSIDE_FACTORY_FRONT_SPECIES,
  V_STRETCH_FRONT_SPECIES,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  VERTICAL_SHAKE_TWICE_DATA,
  VERTICAL_SHAKE_TWICE_INITIALIZERS,
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
import squirtleRunA from "../../tools/compare/fixtures/sendout-front-squirtle-run-a.json" with { type: "json" };
import squirtleRunB from "../../tools/compare/fixtures/sendout-front-squirtle-run-b.json" with { type: "json" };
import shuckleRunA from "../../tools/compare/fixtures/sendout-front-shuckle-run-a.json" with { type: "json" };
import shuckleRunB from "../../tools/compare/fixtures/sendout-front-shuckle-run-b.json" with { type: "json" };
import seadraScenario from "../../tools/compare/fixtures/sendout-front-seadra.json" with { type: "json" };
import seadraRunA from "../../tools/compare/fixtures/sendout-front-seadra-run-a.json" with { type: "json" };
import seadraRunB from "../../tools/compare/fixtures/sendout-front-seadra-run-b.json" with { type: "json" };
import marshtompScenario from "../../tools/compare/fixtures/sendout-front-marshtomp.json" with { type: "json" };
import marshtompRunA from "../../tools/compare/fixtures/sendout-front-marshtomp-run-a.json" with { type: "json" };
import marshtompRunB from "../../tools/compare/fixtures/sendout-front-marshtomp-run-b.json" with { type: "json" };
import charmanderScenario from "../../tools/compare/fixtures/sendout-front-charmander.json" with { type: "json" };
import charmanderRunA from "../../tools/compare/fixtures/sendout-front-charmander-run-a.json" with { type: "json" };
import charmanderRunB from "../../tools/compare/fixtures/sendout-front-charmander-run-b.json" with { type: "json" };
import delibirdScenario from "../../tools/compare/fixtures/sendout-front-delibird.json" with { type: "json" };
import delibirdRunA from "../../tools/compare/fixtures/sendout-front-delibird-run-a.json" with { type: "json" };
import delibirdRunB from "../../tools/compare/fixtures/sendout-front-delibird-run-b.json" with { type: "json" };
import mankeyScenario from "../../tools/compare/fixtures/sendout-front-mankey.json" with { type: "json" };
import mankeyRunA from "../../tools/compare/fixtures/sendout-front-mankey-run-a.json" with { type: "json" };
import mankeyRunB from "../../tools/compare/fixtures/sendout-front-mankey-run-b.json" with { type: "json" };
import wynautScenario from "../../tools/compare/fixtures/sendout-front-wynaut.json" with { type: "json" };
import wynautRunA from "../../tools/compare/fixtures/sendout-front-wynaut-run-a.json" with { type: "json" };
import wynautRunB from "../../tools/compare/fixtures/sendout-front-wynaut-run-b.json" with { type: "json" };
import vileplumeScenario from "../../tools/compare/fixtures/sendout-front-vileplume.json" with { type: "json" };
import vileplumeRunA from "../../tools/compare/fixtures/sendout-front-vileplume-run-a.json" with { type: "json" };
import vileplumeRunB from "../../tools/compare/fixtures/sendout-front-vileplume-run-b.json" with { type: "json" };
import loudredScenario from "../../tools/compare/fixtures/sendout-front-loudred.json" with { type: "json" };
import loudredRunA from "../../tools/compare/fixtures/sendout-front-loudred-run-a.json" with { type: "json" };
import loudredRunB from "../../tools/compare/fixtures/sendout-front-loudred-run-b.json" with { type: "json" };
import jigglypuffScenario from "../../tools/compare/fixtures/sendout-front-jigglypuff.json" with { type: "json" };
import jigglypuffRunA from "../../tools/compare/fixtures/sendout-front-jigglypuff-run-a.json" with { type: "json" };
import jigglypuffRunB from "../../tools/compare/fixtures/sendout-front-jigglypuff-run-b.json" with { type: "json" };
import gyaradosScenario from "../../tools/compare/fixtures/sendout-front-gyarados.json" with { type: "json" };
import gyaradosRunA from "../../tools/compare/fixtures/sendout-front-gyarados-run-a.json" with { type: "json" };
import gyaradosRunB from "../../tools/compare/fixtures/sendout-front-gyarados-run-b.json" with { type: "json" };
import blastoiseScenario from "../../tools/compare/fixtures/sendout-front-blastoise.json" with { type: "json" };
import blastoiseRunA from "../../tools/compare/fixtures/sendout-front-blastoise-run-a.json" with { type: "json" };
import blastoiseRunB from "../../tools/compare/fixtures/sendout-front-blastoise-run-b.json" with { type: "json" };
import bagonScenario from "../../tools/compare/fixtures/sendout-front-bagon.json" with { type: "json" };
import bagonRunA from "../../tools/compare/fixtures/sendout-front-bagon-run-a.json" with { type: "json" };
import bagonRunB from "../../tools/compare/fixtures/sendout-front-bagon-run-b.json" with { type: "json" };

const squirtleRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-squirtle-run-a.json", import.meta.url),
);
const squirtleRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-squirtle-run-b.json", import.meta.url),
);
const shuckleRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-shuckle-run-a.json", import.meta.url),
);
const shuckleRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-shuckle-run-b.json", import.meta.url),
);
const seadraRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-seadra-run-a.json", import.meta.url),
);
const seadraRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-seadra-run-b.json", import.meta.url),
);
const marshtompRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-marshtomp-run-a.json", import.meta.url),
);
const marshtompRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-marshtomp-run-b.json", import.meta.url),
);
const charmanderRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-charmander-run-a.json", import.meta.url),
);
const charmanderRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-charmander-run-b.json", import.meta.url),
);
const delibirdRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-delibird-run-a.json", import.meta.url),
);
const delibirdRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-delibird-run-b.json", import.meta.url),
);
const mankeyRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-mankey-run-a.json", import.meta.url),
);
const mankeyRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-mankey-run-b.json", import.meta.url),
);
const wynautRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wynaut-run-a.json", import.meta.url),
);
const wynautRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-wynaut-run-b.json", import.meta.url),
);
const vileplumeRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-vileplume-run-a.json", import.meta.url),
);
const vileplumeRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-vileplume-run-b.json", import.meta.url),
);
const loudredRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-loudred-run-a.json", import.meta.url),
);
const loudredRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-loudred-run-b.json", import.meta.url),
);
const jigglypuffRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-jigglypuff-run-a.json", import.meta.url),
);
const jigglypuffRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-jigglypuff-run-b.json", import.meta.url),
);
const gyaradosRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gyarados-run-a.json", import.meta.url),
);
const gyaradosRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-gyarados-run-b.json", import.meta.url),
);
const blastoiseRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-blastoise-run-a.json", import.meta.url),
);
const blastoiseRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-blastoise-run-b.json", import.meta.url),
);
const bagonRawA = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-bagon-run-a.json", import.meta.url),
);
const bagonRawB = readFileSync(
  new URL("../../tools/compare/fixtures/sendout-front-bagon-run-b.json", import.meta.url),
);

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

  describe("swingConcaveFrameAtTick (Anim_SwingConcave / SwingConcave port)", () => {
    it("derives all 11 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_SWING_CONCAVE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(SWING_CONCAVE_FRONT_SPECIES).toEqual(generated);
      expect(SWING_CONCAVE_FRONT_SPECIES).toHaveLength(11);
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(SWING_CONCAVE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toContain("SQUIRTLE");
      expect(SWING_CONCAVE_FACTORY_FRONT_SPECIES).toContain("SHUCKLE");
      for (const species of SWING_CONCAVE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins AddNewAnim defaults and data=100 at the tick-0 affine start", () => {
      expect(swingConcaveFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 100,
        index: 0,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "SwingConcave",
        affineMode: "double",
      });
    });

    it("pins C index arithmetic, both normal-front flips, x2 sine, and rotation at every active boundary", () => {
      const indices = [
        0,2,5,7,10,12,15,17,20,23,25,28,30,33,35,38,40,43,46,48,51,53,56,58,61,
        64,66,69,71,74,76,79,81,84,87,89,92,94,97,99,102,104,107,110,112,115,117,
        120,122,125,128,130,133,135,138,140,143,145,148,151,153,156,158,161,163,166,
        168,171,174,176,179,181,184,186,189,192,194,197,199,202,204,207,209,212,215,
        217,220,222,225,227,230,232,235,238,240,243,245,248,250,253,256,
      ];
      const x2Writes = [
        0,0,-1,-1,-2,-2,-3,-4,-4,-5,-5,-6,-6,-7,-7,-8,-8,-8,-9,-9,-9,-9,-9,-9,
        -9,-10,-9,-9,-9,-9,-9,-9,-9,-8,-8,-8,-7,-7,-6,-6,-5,-5,-4,-4,-3,-3,-2,-1,
        -1,0,0,1,2,2,3,3,4,5,5,6,6,7,7,8,8,9,9,9,10,10,10,10,10,10,10,10,10,10,
        10,10,10,10,10,9,9,9,8,8,7,7,6,6,5,5,4,4,3,2,2,1,0,
      ];
      const rotationWrites = [
        0,153,396,550,793,946,1177,1318,1535,1740,1881,2073,2188,2367,2469,2623,
        2712,2840,2956,3020,3109,3148,3212,3237,3263,3276,3263,3250,3224,3173,3122,
        3045,2994,2879,2764,2674,2520,2418,2252,2137,1945,1817,1612,1394,1241,1023,
        870,627,473,230,0,-154,-397,-551,-794,-947,-1178,-1319,-1536,-1741,-1882,
        -2074,-2189,-2368,-2470,-2624,-2713,-2841,-2957,-3021,-3110,-3149,-3213,
        -3238,-3264,-3276,-3264,-3251,-3225,-3174,-3123,-3046,-2995,-2880,-2765,
        -2675,-2521,-2419,-2253,-2138,-1946,-1818,-1613,-1395,-1242,-1024,-871,-628,
        -474,-231,0,
      ];
      expect(indices).toHaveLength(101);
      expect(x2Writes).toHaveLength(101);
      expect(rotationWrites).toHaveLength(101);
      for (let tick = 0; tick <= 100; tick += 1) {
        expect(swingConcaveFrameAtTick(tick)).toMatchObject({
          x2: x2Writes[tick],
          y2: 0,
          data2: tick + 1,
          animRotation: 0,
          animDelay: 0,
          animRuns: 1,
          animSpeed: 0,
          animData: 100,
          index: indices[tick],
          xScale: 256,
          yScale: 256,
          affineRotation: rotationWrites[tick],
          startedAffine: tick === 0,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "SwingConcave",
          affineMode: "double",
        });
      }
    });

    it("uses the strict duration guard and pins identity/x2/reset/callback terminal state", () => {
      expect(swingConcaveFrameAtTick(100)).toMatchObject({
        data2: 101,
        index: 256,
        x2: 0,
        affineRotation: 0,
        callback: "SwingConcave",
        affineMode: "double",
      });
      expect(swingConcaveFrameAtTick(101)).toEqual({
        x2: 0,
        y2: 0,
        data2: 102,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 100,
        index: null,
        xScale: 256,
        yScale: 256,
        affineRotation: 0,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(swingConcaveFrameAtTick(102)).toEqual(swingConcaveFrameAtTick(101));
      expect(swingConcaveFrameAtTick(-1)).toBeNull();
    });

    it.each([
      ["SQUIRTLE", squirtleRunA, squirtleRunB, squirtleRawA, squirtleRawB, 7],
      ["SHUCKLE", shuckleRunA, shuckleRunB, shuckleRawA, shuckleRawB, 213],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_SWING_CONCAVE");
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
        animCmdIndex: 2,
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
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalSlideFrameAtTick (Anim_VerticalSlide / VerticalSlide port)", () => {
    it("derives all 10 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SLIDE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SLIDE_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_FRONT_SPECIES).toHaveLength(10);
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SLIDE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toContain("SEADRA");
      expect(V_SLIDE_FACTORY_FRONT_SPECIES).toContain("MARSHTOMP");
      for (const species of V_SLIDE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins data0=40, C index arithmetic, both normal-front flips, and negated-sine y2 at every active callback", () => {
      const activeIndexAndY2 = [
        [0,0],[9,-1],[19,-2],[28,-3],[38,-4],[48,-5],[57,-5],[67,-5],[76,-5],
        [86,-5],[96,-4],[105,-3],[115,-1],[124,0],[134,1],[144,3],[153,4],
        [163,5],[172,6],[182,6],[192,6],[201,6],[211,6],[220,5],[230,4],[240,3],
        [249,2],[3,0],[12,-1],[22,-3],[32,-4],[41,-5],[51,-5],[60,-5],[70,-5],
        [80,-5],[89,-4],[99,-3],[108,-2],[118,-1],[128,0],
      ] as const;
      expect(activeIndexAndY2).toHaveLength(41);
      for (const [tick, [index, y2]] of activeIndexAndY2.entries()) {
        expect(verticalSlideFrameAtTick(tick)).toEqual({
          x2: 0,
          y2,
          data0: 40,
          data2: tick + 1,
          index,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "VerticalSlide",
        });
      }
    });

    it("uses the strict >duration guard and pins y2/WaitAnimEnd cleanup plus the final data2 increment", () => {
      expect(verticalSlideFrameAtTick(40)).toEqual({
        x2: 0,
        y2: 0,
        data0: 40,
        data2: 41,
        index: 128,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "VerticalSlide",
      });
      expect(verticalSlideFrameAtTick(41)).toEqual({
        x2: 0,
        y2: 0,
        data0: 40,
        data2: 42,
        index: null,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        callback: "WaitAnimEnd",
      });
      expect(verticalSlideFrameAtTick(42)).toEqual(verticalSlideFrameAtTick(41));
      expect(verticalSlideFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [117, seadraScenario],
      [284, marshtompScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "SEADRA", seadraRunA, seadraRunB, seadraRawA, seadraRawB, 4, 117,
        "c70a070b61918ed2e3c0f1bbe3b1be778d63ee29865a13176f1683ab5e17963a",
      ],
      [
        "MARSHTOMP", marshtompRunA, marshtompRunB, marshtompRawA, marshtompRawB, 8, 284,
        "f29ff01ed2a5fc6b732da0955e4029559063e0a2acc7db7b9fbbfaa84ca1ec68",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SLIDE");
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
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalJumpsSmallFrameAtTick (Anim_VerticalJumps_Small / VerticalJumps port)", () => {
    it("derives all 10 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_JUMPS_SMALL")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_JUMPS_SMALL_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_SMALL_FRONT_SPECIES).toEqual([
        "CHARMANDER", "MEOWTH", "PORYGON", "CYNDAQUIL", "LEDYBA",
        "CLEFFA", "SUNKERN", "REMORAID", "DELIBIRD", "LARVITAR",
      ]);
      expect(V_JUMPS_SMALL_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_JUMPS_SMALL_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_JUMPS_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_JUMPS_SMALL_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins data0, C division branches, u8 sine indices, amplitudes, and x2/y2 at every active callback", () => {
      const activeBoundaries = [
        [0,0,0,0,6,0,0],[12,0,12,12,6,0,-1],[24,0,24,24,6,0,-3],
        [36,0,36,36,6,0,-4],[48,0,48,48,6,0,-5],[60,0,60,60,6,0,-5],
        [72,0,72,72,6,0,-5],[84,0,84,84,6,0,-5],[96,0,96,96,6,0,-4],
        [108,0,108,108,6,0,-2],[120,0,120,120,6,0,-1],[132,1,132,4,6,0,0],
        [144,1,144,16,6,0,-2],[156,1,156,28,6,0,-3],[168,1,168,40,6,0,-4],
        [180,1,180,52,6,0,-5],[192,1,192,64,6,0,-6],[204,1,204,76,6,0,-5],
        [216,1,216,88,6,0,-4],[228,1,228,100,6,0,-3],[240,1,240,112,6,0,-2],
        [252,1,252,124,6,0,0],[264,2,8,8,9,0,-1],[276,2,20,20,9,0,-4],
        [288,2,32,32,9,0,-6],[300,2,44,44,9,0,-7],[312,2,56,56,9,0,-8],
        [324,2,68,68,9,0,-8],[336,2,80,80,9,0,-8],[348,2,92,92,9,0,-6],
        [360,2,104,104,9,0,-4],[372,2,116,116,9,0,-2],[384,3,128,128,9,0,0],
      ] as const;
      expect(activeBoundaries).toHaveLength(33);
      for (const [tick, [counter, divCounter, adjustedCounter, sineIndex, amplitude, x2, y2]]
        of activeBoundaries.entries()) {
        expect(verticalJumpsSmallFrameAtTick(tick)).toEqual({
          x2,
          y2,
          data0: 3,
          data2: counter + 12,
          counter,
          divCounter,
          adjustedCounter,
          sineIndex,
          amplitude,
          callback: "VerticalJumps",
        });
      }
    });

    it("uses the strict counter > 384 guard and pins terminal cleanup plus the final increment", () => {
      expect(verticalJumpsSmallFrameAtTick(32)).toMatchObject({
        x2: 0,
        y2: 0,
        data2: 396,
        counter: 384,
        divCounter: 3,
        adjustedCounter: 128,
        sineIndex: 128,
        amplitude: 9,
        callback: "VerticalJumps",
      });
      expect(verticalJumpsSmallFrameAtTick(33)).toEqual({
        x2: 0,
        y2: 0,
        data0: 3,
        data2: 408,
        counter: 396,
        divCounter: null,
        adjustedCounter: null,
        sineIndex: null,
        amplitude: null,
        callback: "WaitAnimEnd",
      });
      expect(verticalJumpsSmallFrameAtTick(34)).toEqual(verticalJumpsSmallFrameAtTick(33));
      expect(verticalJumpsSmallFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [4, charmanderScenario],
      [225, delibirdScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "CHARMANDER", charmanderRunA, charmanderRunB, charmanderRawA, charmanderRawB, 2, 4,
        "11290c70ee4cef6463fa4878ad94c665f080c6ae2cd03fe4b41354add0227518",
      ],
      [
        "DELIBIRD", delibirdRunA, delibirdRunB, delibirdRawA, delibirdRawB, 3, 225,
        "ab44bf5b7111e37d8f491e24a1f0aa0ce6a331d7220ae231f74d3c9741626661",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_JUMPS_SMALL");
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
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("horizontalJumpsVerticalStretchFrameAtTick (single-run callbacks _0/_1/_2)", () => {
    it("derives all 10 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_H_JUMPS_V_STRETCH")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(H_JUMPS_V_STRETCH_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_V_STRETCH_FRONT_SPECIES).toEqual([
        "MANKEY", "POLIWHIRL", "VICTREEBEL", "EXEGGUTOR", "FURRET",
        "POLITOED", "AIPOM", "PHANPY", "GRUMPIG", "WYNAUT",
      ]);
      expect(H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(H_JUMPS_V_STRETCH_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(H_JUMPS_V_STRETCH_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of H_JUMPS_V_STRETCH_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins AddNewAnim defaults, the single-run data=-1 override, and tick-0 affine start", () => {
      expect(horizontalJumpsVerticalStretchFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 12,
        data3: 0,
        data4: 0,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: -1,
        counter: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "HorizontalJumpsVerticalStretch_0",
        affineMode: "double",
      });
      // The distinct `_Twice` initializer uses data=1/runs=2 and reaches the
      // delay/repeat branch; neither value is inherited by this family.
      expect(horizontalJumpsVerticalStretchFrameAtTick(0)).toMatchObject({
        animDelay: 0,
        animRuns: 1,
        animData: -1,
      });
    });

    it("pins every callback-_0 jump write and its strict >128 transition/reset", () => {
      const active = [
        [0,0,0],[12,0,-2],[24,-1,-4],[36,-2,-6],[48,-3,-7],[60,-3,-7],
        [72,-4,-7],[84,-5,-7],[96,-6,-5],[108,-6,-3],[120,-7,-1],
      ] as const;
      for (const [tick, [counter, x2, y2]] of active.entries()) {
        expect(horizontalJumpsVerticalStretchFrameAtTick(tick)).toMatchObject({
          x2,
          y2,
          data2: counter + 12,
          data3: 0,
          data4: 0,
          animDelay: 0,
          counter,
          xScale: 256,
          yScale: 256,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "HorizontalJumpsVerticalStretch_0",
          affineMode: "double",
        });
      }
      expect(horizontalJumpsVerticalStretchFrameAtTick(11)).toMatchObject({
        x2: -7,
        y2: -1,
        data2: 0,
        data3: 0,
        data4: 0,
        counter: 132,
        callback: "HorizontalJumpsVerticalStretch_1",
      });
    });

    it("pins all 49 callback-_1 sine/scale/x2/y2 writes and the strict >48 transition", () => {
      const active = [
        [0,0,8,-7,0,256,256],[1,0,16,-7,1,250,268],[2,0,24,-7,3,244,280],
        [3,0,32,-7,4,239,291],[4,0,40,-7,5,234,301],[5,0,48,-7,6,230,309],
        [6,0,56,-7,7,227,315],[7,0,64,-7,7,225,318],[8,0,72,-7,8,224,320],
        [9,0,80,-7,7,225,318],[10,0,88,-7,7,227,315],[11,0,96,-7,6,230,309],
        [12,0,104,-7,5,234,301],[13,0,112,-7,4,239,291],[14,0,120,-7,3,244,280],
        [15,0,128,-7,1,250,268],[16,8,136,-6,-3,256,256],[17,16,144,-5,-7,263,243],
        [18,24,152,-4,-11,269,231],[19,32,160,-3,-14,274,220],
        [20,40,168,-2,-16,279,210],[21,48,176,-1,-18,283,203],
        [22,56,184,0,-19,286,197],[23,64,192,1,-20,288,193],
        [24,72,200,2,-19,288,192],[25,80,208,3,-18,288,193],
        [26,88,216,4,-16,286,197],[27,96,224,5,-14,283,203],
        [28,104,232,6,-11,279,210],[29,112,240,7,-7,274,220],
        [30,120,248,8,-3,269,231],[31,128,0,9,0,263,243],[32,128,8,9,0,256,256],
        [33,128,16,9,1,250,268],[34,128,24,9,3,244,280],[35,128,32,9,4,239,291],
        [36,128,40,9,5,234,301],[37,128,48,9,6,230,309],[38,128,56,9,7,227,315],
        [39,128,64,9,7,225,318],[40,128,72,9,8,224,320],[41,128,80,9,7,225,318],
        [42,128,88,9,7,227,315],[43,128,96,9,6,230,309],
        [44,128,104,9,5,234,301],[45,128,112,9,4,239,291],
        [46,128,120,9,3,244,280],[47,128,128,9,1,250,268],
        [48,128,136,9,0,256,256],
      ] as const;
      expect(active).toHaveLength(49);
      for (const [offset, [counter, data3, data4, x2, y2, xScale, yScale]]
        of active.entries()) {
        expect(horizontalJumpsVerticalStretchFrameAtTick(12 + offset)).toMatchObject({
          x2,
          y2,
          data2: counter + 1,
          data3,
          data4,
          counter,
          xScale,
          yScale,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          callback: "HorizontalJumpsVerticalStretch_1",
          affineMode: "double",
        });
      }
      expect(horizontalJumpsVerticalStretchFrameAtTick(61)).toMatchObject({
        x2: 9,
        y2: 0,
        data2: 0,
        data3: 128,
        data4: 136,
        counter: 49,
        xScale: 256,
        yScale: 256,
        callback: "HorizontalJumpsVerticalStretch_2",
      });
    });

    it("pins every callback-_2 write and terminal ResetSpriteAfterAnim/final increment", () => {
      const active = [
        [0,8,0],[12,8,-2],[24,7,-4],[36,6,-6],[48,5,-7],[60,5,-7],
        [72,4,-7],[84,3,-7],[96,2,-5],[108,2,-3],[120,1,-1],
      ] as const;
      for (const [offset, [counter, x2, y2]] of active.entries()) {
        expect(horizontalJumpsVerticalStretchFrameAtTick(62 + offset)).toMatchObject({
          x2,
          y2,
          data2: counter + 12,
          data3: 128,
          data4: 136,
          counter,
          xScale: 256,
          yScale: 256,
          normalFrontDontFlip: true,
          tryFlipXCalls: 2,
          resetSpriteAfterAnim: false,
          callback: "HorizontalJumpsVerticalStretch_2",
          affineMode: "double",
        });
      }
      expect(horizontalJumpsVerticalStretchFrameAtTick(73)).toEqual({
        x2: 0,
        y2: 0,
        data2: 144,
        data3: 128,
        data4: 136,
        animRotation: 0,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: -1,
        counter: 132,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(horizontalJumpsVerticalStretchFrameAtTick(74)).toEqual(
        horizontalJumpsVerticalStretchFrameAtTick(73),
      );
      expect(horizontalJumpsVerticalStretchFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [56, mankeyScenario],
      [360, wynautScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "MANKEY", mankeyRunA, mankeyRunB, mankeyRawA, mankeyRawB, 5, 56,
        "dd828c5122f1693d1a947794c315648eb3fd1edbb15b0d988667d9de8ffb5161",
      ],
      [
        "WYNAUT", wynautRunA, wynautRunB, wynautRawA, wynautRawB, 4, 360,
        "0998becc3884e86138b282f1a17b153827575583adeac15283618a98b2bc9d61",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_H_JUMPS_V_STRETCH");
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

    it("preserves all previously accepted representative and sibling families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("bounceRotateToSidesSlowFrameAtTick (normal Slow source lifecycle)", () => {
    it("derives all 9 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES).toEqual([
        "VILEPLUME", "LUDICOLO", "NOSEPASS", "BARBOACH", "WHISCASH",
        "FEEBAS", "CARVANHA", "CACNEA", "LOUDRED",
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SLOW_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of BOUNCE_ROTATE_TO_SIDES_SLOW_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins the complete two-speed source table and normal/SmallSlow initializer distinction", () => {
      expect(BOUNCE_ROTATE_TO_SIDES_DATA).toEqual([
        [
          [0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12],
          [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0],
        ],
        [
          [0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24],
          [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0],
        ],
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_VARIANTS).toEqual({
        normal: { data6: 0, rotation: 4096 },
        small: { data6: 0, rotation: 2048 },
        slow: { data6: 1, rotation: 4096 },
        smallSlow: { data6: 1, rotation: 2048 },
      });
    });

    it("pins AddNewAnim defaults, Slow overrides, affine start, and normal-front flips", () => {
      expect(bounceRotateToSidesSlowFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 1,
        data4: 0,
        data6: 1,
        animRotation: 4096,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        legIndex: 0,
        legStartX: 0,
        legEndX: 8,
        legDuration: 16,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      });
    });

    it("pins all 167 active writes with C truncation, u16 rotation, and every leg boundary", () => {
      const slowLegs = BOUNCE_ROTATE_TO_SIDES_DATA[1]!;
      let tick = 0;
      for (let legIndex = 0; legIndex < 7; legIndex += 1) {
        const [startX, endX, duration] = slowLegs[legIndex]!;
        for (let progress = 0; progress <= duration; progress += 1) {
          const expectedX = Math.trunc(((endX - startX) * progress) / duration) + startX;
          const sineIndex = Math.trunc((progress * 128) / duration);
          const expectedY = -Math.floor((10 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
          const expectedRotation = Math.trunc((-(4096 * expectedX)) / 8) & 0xffff;
          const frame = bounceRotateToSidesSlowFrameAtTick(tick);
          expect(frame, `tick ${tick}`).toMatchObject({
            x2: expectedX,
            y2: expectedY,
            data2: 1,
            data3: progress === duration ? 0 : progress + 1,
            data4: progress === duration ? legIndex + 1 : legIndex,
            data6: 1,
            animRotation: 4096,
            animData: 1,
            legIndex,
            legStartX: startX,
            legEndX: endX,
            legDuration: duration,
            legProgress: progress,
            affineRotationU16: expectedRotation,
            xScale: 256,
            yScale: 256,
            startedAffine: tick === 0,
            normalFrontDontFlip: true,
            tryFlipXCalls: 2,
            resetSpriteAfterAnim: false,
            callback: "BounceRotateToSides",
            affineMode: "double",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(167);

      // Negative delta / positive x proves signed division truncates toward
      // zero; the two signs prove assignment into the source's u16 rotation.
      expect(bounceRotateToSidesSlowFrameAtTick(18)).toMatchObject({
        x2: 8,
        affineRotationU16: 61440,
      });
      expect(bounceRotateToSidesSlowFrameAtTick(41)).toMatchObject({
        x2: -8,
        affineRotationU16: 4096,
        data3: 0,
        data4: 2,
      });

      expect([16, 41, 66, 91, 116, 141, 166].map((boundary) => {
        const frame = bounceRotateToSidesSlowFrameAtTick(boundary)!;
        return [boundary, frame.legIndex, frame.legProgress, frame.x2, frame.y2,
          frame.data3, frame.data4, frame.affineRotationU16];
      })).toEqual([
        [16, 0, 16, 8, 0, 0, 1, 61440],
        [41, 1, 24, -8, 0, 0, 2, 4096],
        [66, 2, 24, 8, 0, 0, 3, 61440],
        [91, 3, 24, -8, 0, 0, 4, 4096],
        [116, 4, 24, 8, 0, 0, 5, 61440],
        [141, 5, 24, -8, 0, 0, 6, 4096],
        [166, 6, 24, 0, 0, 0, 7, 0],
      ]);
    });

    it("pins the sentinel terminal identity/reset/WaitAnimEnd state", () => {
      expect(bounceRotateToSidesSlowFrameAtTick(167)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 0,
        data4: 7,
        data6: 1,
        animRotation: 4096,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 1,
        legIndex: 7,
        legStartX: 0,
        legEndX: 0,
        legDuration: 0,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(bounceRotateToSidesSlowFrameAtTick(168)).toEqual(
        bounceRotateToSidesSlowFrameAtTick(167),
      );
      expect(bounceRotateToSidesSlowFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [45, vileplumeScenario],
      [371, loudredScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "VILEPLUME", vileplumeRunA, vileplumeRunB, vileplumeRawA, vileplumeRawB, 4, 45,
        "891884d74ae18521c3e4963b01d290653f988cdbe5045e87c3860bd847cfd2f2",
      ],
      [
        "LOUDRED", loudredRunA, loudredRunB, loudredRawA, loudredRawB, 4, 371,
        "f0dadc0c0711f44386e832a5f2ea862e967096fe27b56686bdc53ff210e9c3bc",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe(
        "ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW",
      );
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

    it("preserves all previously accepted representative and sibling families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("bounceRotateToSidesSmallFrameAtTick (Small normal-speed source lifecycle)", () => {
    it("derives all 8 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES).toEqual([
        "JIGGLYPUFF", "PRIMEAPE", "GEODUDE", "GRAVELER",
        "FARFETCHD", "CUBONE", "TANGELA", "GYARADOS",
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(BOUNCE_ROTATE_TO_SIDES_SMALL_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of BOUNCE_ROTATE_TO_SIDES_SMALL_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins the complete source table and all normal/Small/Slow/SmallSlow selectors", () => {
      expect(BOUNCE_ROTATE_TO_SIDES_DATA).toEqual([
        [
          [0, 8, 8], [8, -8, 12], [-8, 8, 12], [8, -8, 12],
          [-8, 8, 12], [8, -8, 12], [-8, 0, 12], [0, 0, 0],
        ],
        [
          [0, 8, 16], [8, -8, 24], [-8, 8, 24], [8, -8, 24],
          [-8, 8, 24], [8, -8, 24], [-8, 0, 24], [0, 0, 0],
        ],
      ]);
      expect(BOUNCE_ROTATE_TO_SIDES_VARIANTS).toEqual({
        normal: { data6: 0, rotation: 4096 },
        small: { data6: 0, rotation: 2048 },
        slow: { data6: 1, rotation: 4096 },
        smallSlow: { data6: 1, rotation: 2048 },
      });
    });

    it("pins AddNewAnim defaults, Small overrides, affine start, and normal-front flips", () => {
      expect(bounceRotateToSidesSmallFrameAtTick(0)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 1,
        data4: 0,
        data6: 0,
        animRotation: 2048,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 0,
        legIndex: 0,
        legStartX: 0,
        legEndX: 8,
        legDuration: 8,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: true,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: false,
        callback: "BounceRotateToSides",
        affineMode: "double",
      });
    });

    it("pins all 87 active writes with C truncation, u16 rotation, and every leg boundary", () => {
      const normalSpeedLegs = BOUNCE_ROTATE_TO_SIDES_DATA[0]!;
      let tick = 0;
      for (let legIndex = 0; legIndex < 7; legIndex += 1) {
        const [startX, endX, duration] = normalSpeedLegs[legIndex]!;
        for (let progress = 0; progress <= duration; progress += 1) {
          const expectedX = Math.trunc(((endX - startX) * progress) / duration) + startX;
          const sineIndex = Math.trunc((progress * 128) / duration);
          const expectedY = -Math.floor((10 * GBA_SINE_TABLE_256[sineIndex]!) / 256) + 0;
          const expectedRotation = Math.trunc((-(2048 * expectedX)) / 8) & 0xffff;
          const frame = bounceRotateToSidesSmallFrameAtTick(tick);
          expect(frame, `tick ${tick}`).toMatchObject({
            x2: expectedX,
            y2: expectedY,
            data2: 1,
            data3: progress === duration ? 0 : progress + 1,
            data4: progress === duration ? legIndex + 1 : legIndex,
            data6: 0,
            animRotation: 2048,
            animDelay: 0,
            animRuns: 1,
            animSpeed: 0,
            animData: 0,
            legIndex,
            legStartX: startX,
            legEndX: endX,
            legDuration: duration,
            legProgress: progress,
            affineRotationU16: expectedRotation,
            xScale: 256,
            yScale: 256,
            startedAffine: tick === 0,
            normalFrontDontFlip: true,
            tryFlipXCalls: 2,
            resetSpriteAfterAnim: false,
            callback: "BounceRotateToSides",
            affineMode: "double",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(87);

      expect([8, 21, 34, 47, 60, 73, 86].map((boundary) => {
        const frame = bounceRotateToSidesSmallFrameAtTick(boundary)!;
        return [boundary, frame.legIndex, frame.legProgress, frame.x2, frame.y2,
          frame.data3, frame.data4, frame.affineRotationU16];
      })).toEqual([
        [8, 0, 8, 8, 0, 0, 1, 63488],
        [21, 1, 12, -8, 0, 0, 2, 2048],
        [34, 2, 12, 8, 0, 0, 3, 63488],
        [47, 3, 12, -8, 0, 0, 4, 2048],
        [60, 4, 12, 8, 0, 0, 5, 63488],
        [73, 5, 12, -8, 0, 0, 6, 2048],
        [86, 6, 12, 0, 0, 0, 7, 0],
      ]);
    });

    it("pins tick 87 sentinel identity/reset/WaitAnimEnd cleanup", () => {
      expect(bounceRotateToSidesSmallFrameAtTick(87)).toEqual({
        x2: 0,
        y2: 0,
        data2: 1,
        data3: 0,
        data4: 7,
        data6: 0,
        animRotation: 2048,
        animDelay: 0,
        animRuns: 1,
        animSpeed: 0,
        animData: 0,
        legIndex: 7,
        legStartX: 0,
        legEndX: 0,
        legDuration: 0,
        legProgress: 0,
        affineRotationU16: 0,
        xScale: 256,
        yScale: 256,
        startedAffine: false,
        normalFrontDontFlip: true,
        tryFlipXCalls: 2,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
      expect(bounceRotateToSidesSmallFrameAtTick(88)).toEqual(
        bounceRotateToSidesSmallFrameAtTick(87),
      );
      expect(bounceRotateToSidesSmallFrameAtTick(-1)).toBeNull();
    });

    it("preserves Slow and distinguishes SmallSlow through the shared reducer", () => {
      expect(bounceRotateToSidesSlowFrameAtTick(0)).toMatchObject({
        data6: 1,
        animRotation: 4096,
        animData: 1,
        legDuration: 16,
      });
      expect(bounceRotateToSidesSmallSlowFrameAtTick(0)).toMatchObject({
        data6: 1,
        animRotation: 2048,
        animData: 1,
        legDuration: 16,
      });
      expect(bounceRotateToSidesSmallSlowFrameAtTick(167)).toMatchObject({
        data6: 1,
        animRotation: 2048,
        animData: 1,
        resetSpriteAfterAnim: true,
        callback: "WaitAnimEnd",
        affineMode: "normal",
      });
    });

    it.each([
      [39, jigglypuffScenario],
      [130, gyaradosScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "JIGGLYPUFF", jigglypuffRunA, jigglypuffRunB, jigglypuffRawA, jigglypuffRawB, 4, 39,
        "bb3d61bffa2354eac237e0bbdf6ed46ae03a14420ce80da7477ec40d5c0a1ba2",
      ],
      [
        "GYARADOS", gyaradosRunA, gyaradosRunB, gyaradosRawA, gyaradosRawB, 2, 130,
        "2642520d74a64f6b47f6cd472e2e9d5e20d75a32e6416c44e218bfd79cdcee74",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      animCmdIndex,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe(
        "ANIM_BOUNCE_ROTATE_TO_SIDES_SMALL",
      );
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

    it("preserves all previously accepted representative and sibling families", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });

  describe("verticalShakeTwiceFrameAtTick (normal source lifecycle)", () => {
    it("derives all 8 selector mappings as Factory-reachable with no outside mappings", () => {
      const generated = Object.entries(selectorTables.frontAnimIds.species)
        .filter(([, family]) => family === "ANIM_V_SHAKE_TWICE")
        .map(([species]) => species);
      const factorySpecies = new Set(
        frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
      );
      expect(V_SHAKE_TWICE_FRONT_SPECIES).toEqual(generated);
      expect(V_SHAKE_TWICE_FRONT_SPECIES).toEqual([
        "BLASTOISE", "POLIWRATH", "TAUROS", "DONPHAN",
        "EXPLOUD", "AGGRON", "CRADILY", "BAGON",
      ]);
      expect(V_SHAKE_TWICE_FACTORY_FRONT_SPECIES).toEqual(generated);
      expect(V_SHAKE_TWICE_FACTORY_FRONT_SPECIES).toEqual(
        generated.filter((species) => factorySpecies.has(species)),
      );
      expect(V_SHAKE_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
      for (const species of V_SHAKE_TWICE_FRONT_SPECIES) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });

    it("pins Task_HandleMonAnimation defaults, the complete u8 table, and initializer distinction", () => {
      expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
      expect(VERTICAL_SHAKE_TWICE_DATA).toEqual([
        [6, 30],
        [254, 15],
        [6, 30],
        [255, 0],
      ]);
      expect(VERTICAL_SHAKE_TWICE_INITIALIZERS).toEqual({
        normal: { selector: "ANIM_V_SHAKE_TWICE", data0: 48, used: true },
        slow: { selector: "ANIM_V_SHAKE_TWICE_SLOW", data0: 24, used: false },
      });
      expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain(
        "ANIM_V_SHAKE_TWICE_SLOW",
      );
      expect(verticalShakeTwiceFrameAtTick(0)).toMatchObject({
        data0: 48,
        data2: 48,
        data3: 0,
        data4: 0,
        data5: 0,
        data6: 1,
        data7: 0,
      });
    });

    it("pins all 78 active callbacks, u8 casts, amplitudes, sine writes, and phase resets", () => {
      let tick = 0;
      let expectedData2 = 0;
      for (let phase = 0; phase < 3; phase += 1) {
        const [var5, var6] = VERTICAL_SHAKE_TWICE_DATA[phase]!;
        for (let var7 = 0; var7 <= var6; var7 += 1) {
          const index = expectedData2 & 0xff;
          const amplitude = var5 === 254
            ? 0
            : Math.trunc(((var6 - var7) * var5) / var6) & 0xff;
          const expectedY = Math.floor(
            (amplitude * GBA_SINE_TABLE_256[index]!) / 256,
          ) + 0;
          const boundary = var7 === var6;
          if (!boundary) expectedData2 += 48;

          expect(verticalShakeTwiceFrameAtTick(tick), `tick ${tick}`).toEqual({
            x2: 0,
            y2: expectedY,
            data0: 48,
            data2: expectedData2,
            data3: 0,
            data4: 0,
            data5: boundary ? phase + 1 : phase,
            data6: boundary ? 0 : var7 + 1,
            data7: 0,
            index,
            var5: var5 & 0xff,
            var6: var6 & 0xff,
            var7: var7 & 0xff,
            amplitude,
            callback: "VerticalShakeTwice",
          });
          tick += 1;
        }
      }
      expect(tick).toBe(78);
      expect(expectedData2).toBe(3600);

      expect([30, 46, 77].map((boundaryTick) => {
        const frame = verticalShakeTwiceFrameAtTick(boundaryTick)!;
        return [
          boundaryTick, frame.index, frame.var5, frame.var6, frame.var7,
          frame.amplitude, frame.y2, frame.data2, frame.data5, frame.data6,
        ];
      })).toEqual([
        [30, 160, 6, 30, 30, 0, 0, 1440, 1, 0],
        [46, 112, 254, 15, 15, 0, 0, 2160, 2, 0],
        [77, 16, 6, 30, 30, 0, 0, 3600, 3, 0],
      ]);
    });

    it("pins tick 78 sentinel division result and terminal y2/WaitAnimEnd cleanup", () => {
      expect(verticalShakeTwiceFrameAtTick(78)).toEqual({
        x2: 0,
        y2: 0,
        data0: 48,
        data2: 3600,
        data3: 0,
        data4: 0,
        data5: 3,
        data6: 0,
        data7: 0,
        index: 16,
        var5: 255,
        var6: 0,
        var7: 0,
        amplitude: 0,
        callback: "WaitAnimEnd",
      });
      expect(verticalShakeTwiceFrameAtTick(79)).toEqual(verticalShakeTwiceFrameAtTick(78));
      expect(verticalShakeTwiceFrameAtTick(-1)).toBeNull();
    });

    it.each([
      [9, blastoiseScenario],
      [395, bagonScenario],
    ] as const)("stages a complete legal Scene-ON party for opponent species %i", (species, scenario) => {
      expect(scenario.mode).toBe("mechanicLab");
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties.opponent[0]!.species).toBe(species);
      for (const mon of [
        ...scenario.overrides.parties.player,
        ...scenario.overrides.parties.opponent,
      ]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number),
          abilitySlot: expect.any(Number),
          friendship: expect.any(Number),
          gender: expect.any(String),
          shiny: expect.any(Boolean),
        }));
      }
    });

    it.each([
      [
        "BLASTOISE", blastoiseRunA, blastoiseRunB, blastoiseRawA, blastoiseRawB, 9,
        "333c436ec56ad12d0d8d3586f86af7f4feb076a5234a646c194f6705ab826a87",
      ],
      [
        "BAGON", bagonRunA, bagonRunB, bagonRawA, bagonRawB, 395,
        "9accac67bde9270bfe8898e45ea5160783fc08dc47fcfbd0d8fea1ca995fdf16",
      ],
    ] as const)("matches byte-identical raw settled %s Scene-ON receipts", (
      species,
      runA,
      runB,
      rawA,
      rawB,
      data2,
      rawSha256,
    ) => {
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA.at(-1)).toBe("}".charCodeAt(0));
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(rawSha256);
      expect(runA).toEqual(runB);
      expect(selectorTables.frontAnimIds.species[species]).toBe("ANIM_V_SHAKE_TWICE");
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
        animCmdIndex: 4,
        data2,
        callback: "0x8007428",
        callbackSymbol: "SpriteCallbackDummy",
      });
      expect({ x2: settled.x2, y2: settled.y2 }).toEqual(speciesFrontIdleRestOffset(species));
    });

    it("preserves every previously accepted representative and sibling family", () => {
      expect(speciesFrontIdleRestOffset("ONIX")).toEqual({ x2: 1, y2: 0 });
      for (const species of [
        "BAYLEEF", "MAGBY", "QUILAVA", "HOUNDOUR", "MACHOKE", "RHYHORN",
        "LICKITUNG", "MILTANK", "KABUTOPS", "BLAZIKEN", "KADABRA", "REGISTEEL",
        "SQUIRTLE", "SHUCKLE", "SEADRA", "MARSHTOMP", "CHARMANDER", "DELIBIRD",
        "MANKEY", "WYNAUT", "VILEPLUME", "LOUDRED", "JIGGLYPUFF", "GYARADOS",
      ]) {
        expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
      }
    });
  });
});
