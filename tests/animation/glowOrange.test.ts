import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  GLOW_ORANGE_ENTRY,
  GLOW_ORANGE_FACTORY_FRONT_SPECIES,
  GLOW_ORANGE_FRONT_SPECIES,
  GLOW_ORANGE_OUTSIDE_FACTORY_FRONT_SPECIES,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  glowOrangeFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_GLOW_ORANGE", () => {
  it("derives the complete 2/2/0 selector census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_GLOW_ORANGE")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["KAKUNA", "PONYTA"]);
    expect(GLOW_ORANGE_FRONT_SPECIES).toEqual(generated);
    expect(GLOW_ORANGE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(GLOW_ORANGE_FACTORY_FRONT_SPECIES).toEqual(["KAKUNA", "PONYTA"]);
    expect(GLOW_ORANGE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins selector 32's direct callback initializer and distinct macro arguments", () => {
    expect(GLOW_ORANGE_ENTRY).toEqual({
      selector: "ANIM_GLOW_ORANGE",
      sourceId: 32,
      taskZeroedData2: true,
      taskZeroedData6: true,
      taskZeroedData7: true,
      callbackInstalled: "Anim_GlowOrange",
      callbackInvokedByInitializer: false,
      colorIncrement: 12,
      speed: 2,
      blendColor: 0x02df,
      normalFrontDontFlip: true,
      accepted: true,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
  });

  it("exhausts all 65 active callbacks with exact palette and signed-register writes", () => {
    for (let tick = 0; tick <= 64; tick += 1) {
      const data2 = tick * 2;
      const coefficient = Math.floor((12 * GBA_SINE_TABLE_256[data2]!) / 256);
      expect(glowOrangeFrameAtTick(tick, 5), `callback ${tick}`).toEqual({
        x2: 0,
        y2: 0,
        data2Before: data2,
        data2: data2 + 2,
        data6: coefficient,
        data7: 0x150,
        paletteNum: 5,
        paletteStart: 0x150,
        paletteCount: 16,
        blendCoefficient: coefficient,
        blendColor: 0x02df,
        paletteWrite: true,
        restoredPalette: false,
        normalFrontDontFlip: true,
        callback: "Anim_GlowOrange",
      });
    }
  });

  it("pins sine phase boundaries and OBJ palette-slot masking", () => {
    expect(glowOrangeFrameAtTick(0, 0)).toMatchObject({
      data2Before: 0, data6: 0, data7: 0x100, blendCoefficient: 0,
    });
    expect(glowOrangeFrameAtTick(16, 15)).toMatchObject({
      data2Before: 32, data6: 8, data7: 0x1f0, blendCoefficient: 8,
    });
    expect(glowOrangeFrameAtTick(32, 16)).toMatchObject({
      data2Before: 64, data6: 12, data7: 0x100, blendCoefficient: 12,
    });
    expect(glowOrangeFrameAtTick(48, -1)).toMatchObject({
      data2Before: 96, data6: 8, data7: 0x1f0, blendCoefficient: 8,
    });
    expect(glowOrangeFrameAtTick(64, 5)).toMatchObject({
      data2Before: 128, data2: 130, data6: 0, blendCoefficient: 0,
      restoredPalette: false, callback: "Anim_GlowOrange",
    });
  });

  it("restores the palette at the strict terminal sentinel and remains stable", () => {
    const terminal = glowOrangeFrameAtTick(65, 5);
    expect(terminal).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 130,
      data2: 132,
      data6: 0,
      data7: 0x150,
      paletteNum: 5,
      paletteStart: 0x150,
      paletteCount: 16,
      blendCoefficient: 0,
      blendColor: 0x02df,
      paletteWrite: true,
      restoredPalette: true,
      normalFrontDontFlip: true,
      callback: "WaitAnimEnd",
    });
    expect(glowOrangeFrameAtTick(66, 5)).toEqual(terminal);
    expect(glowOrangeFrameAtTick(4096, 5)).toEqual(terminal);
  });

  it("rejects invalid inputs while every other adjacent glow selector stays unsupported", () => {
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(glowOrangeFrameAtTick(invalid)).toBeNull();
    }
    for (const invalidPalette of [0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(glowOrangeFrameAtTick(0, invalidPalette)).toBeNull();
    }

    const glowSelectors = [...new Set(
      Object.values(selectorTables.frontAnimIds.species)
        .filter((selector) => selector.startsWith("ANIM_GLOW_")),
    )].sort();
    expect(glowSelectors).toEqual([
      "ANIM_GLOW_BLACK",
      "ANIM_GLOW_BLUE",
      "ANIM_GLOW_ORANGE",
    ]);
    expect(speciesFrontIdleRestOffset("GASTLY")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("MILOTIC")).toBeNull();
  });
});
