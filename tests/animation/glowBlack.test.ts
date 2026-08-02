import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  GLOW_BLACK_ENTRY,
  GLOW_BLACK_FACTORY_FRONT_SPECIES,
  GLOW_BLACK_FRONT_SPECIES,
  GLOW_BLACK_OUTSIDE_FACTORY_FRONT_SPECIES,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  glowBlackFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_GLOW_BLACK", () => {
  it("derives the complete 2/2/0 selector census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_GLOW_BLACK")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["GASTLY", "SABLEYE"]);
    expect(GLOW_BLACK_FRONT_SPECIES).toEqual(generated);
    expect(GLOW_BLACK_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(GLOW_BLACK_FACTORY_FRONT_SPECIES).toEqual(["GASTLY", "SABLEYE"]);
    expect(GLOW_BLACK_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    for (const species of generated) {
      expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
    }
  });

  it("pins the task-zeroed direct callback entry", () => {
    expect(GLOW_BLACK_ENTRY).toEqual({
      selector: "ANIM_GLOW_BLACK",
      sourceId: 21,
      taskZeroedData2: true,
      taskZeroedData6: true,
      taskZeroedData7: true,
      callbackInstalled: "Anim_GlowBlack",
      callbackInvokedByInitializer: false,
      normalFrontDontFlip: true,
      accepted: true,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
  });

  it("exhausts all 129 active callbacks with exact palette and signed-register writes", () => {
    for (let tick = 0; tick <= 128; tick += 1) {
      const coefficient = Math.floor((16 * GBA_SINE_TABLE_256[tick]!) / 256);
      expect(glowBlackFrameAtTick(tick, 5), `callback ${tick}`).toEqual({
        x2: 0,
        y2: 0,
        data2Before: tick,
        data2: tick + 1,
        data6: coefficient,
        data7: 0x150,
        paletteNum: 5,
        paletteStart: 0x150,
        paletteCount: 16,
        blendCoefficient: coefficient,
        blendColor: 0,
        paletteWrite: true,
        restoredPalette: false,
        normalFrontDontFlip: true,
        callback: "Anim_GlowBlack",
      });
    }
  });

  it("pins sine phase boundaries and OBJ palette-slot masking", () => {
    expect(glowBlackFrameAtTick(0, 0)).toMatchObject({
      data2Before: 0, data6: 0, data7: 0x100, blendCoefficient: 0,
    });
    expect(glowBlackFrameAtTick(32, 15)).toMatchObject({
      data2Before: 32, data6: 11, data7: 0x1f0, blendCoefficient: 11,
    });
    expect(glowBlackFrameAtTick(64, 16)).toMatchObject({
      data2Before: 64, data6: 16, data7: 0x100, blendCoefficient: 16,
    });
    expect(glowBlackFrameAtTick(96, -1)).toMatchObject({
      data2Before: 96, data6: 11, data7: 0x1f0, blendCoefficient: 11,
    });
    expect(glowBlackFrameAtTick(128, 5)).toMatchObject({
      data2Before: 128, data2: 129, data6: 0, blendCoefficient: 0,
      restoredPalette: false, callback: "Anim_GlowBlack",
    });
  });

  it("restores the palette at the strict terminal sentinel and remains stable", () => {
    const terminal = glowBlackFrameAtTick(129, 5);
    expect(terminal).toEqual({
      x2: 0,
      y2: 0,
      data2Before: 129,
      data2: 130,
      data6: 0,
      data7: 0x150,
      paletteNum: 5,
      paletteStart: 0x150,
      paletteCount: 16,
      blendCoefficient: 0,
      blendColor: 0,
      paletteWrite: true,
      restoredPalette: true,
      normalFrontDontFlip: true,
      callback: "WaitAnimEnd",
    });
    expect(glowBlackFrameAtTick(130, 5)).toEqual(terminal);
    expect(glowBlackFrameAtTick(4096, 5)).toEqual(terminal);
  });

  it("rejects invalid inputs and preserves the unsupported blue-glow control", () => {
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(glowBlackFrameAtTick(invalid)).toBeNull();
    }
    for (const invalidPalette of [0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(glowBlackFrameAtTick(0, invalidPalette)).toBeNull();
    }
    expect(selectorTables.frontAnimIds.species.PONYTA).toBe("ANIM_GLOW_ORANGE");
    expect(selectorTables.frontAnimIds.species.MILOTIC).toBe("ANIM_GLOW_BLUE");
    expect(speciesFrontIdleRestOffset("PONYTA")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("MILOTIC")).toBeNull();
    expect(speciesFrontIdleRestOffset("VENUSAUR")).toBeNull();
  });
});
