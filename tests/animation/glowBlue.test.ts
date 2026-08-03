import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  GLOW_BLUE_ENTRY,
  GLOW_BLUE_FACTORY_FRONT_SPECIES,
  GLOW_BLUE_FRONT_SPECIES,
  GLOW_BLUE_OUTSIDE_FACTORY_FRONT_SPECIES,
  TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES,
  glowBlueFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";

describe("ANIM_GLOW_BLUE", () => {
  it("derives the complete 1/1/0 selector census", () => {
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_GLOW_BLUE")
      .map(([species]) => species);
    const factorySpecies = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );

    expect(generated).toEqual(["MILOTIC"]);
    expect(GLOW_BLUE_FRONT_SPECIES).toEqual(generated);
    expect(GLOW_BLUE_FACTORY_FRONT_SPECIES).toEqual(
      generated.filter((species) => factorySpecies.has(species)),
    );
    expect(GLOW_BLUE_FACTORY_FRONT_SPECIES).toEqual(["MILOTIC"]);
    expect(GLOW_BLUE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(speciesFrontIdleRestOffset("MILOTIC")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins selector 34's task-zeroed direct callback and distinct blue arguments", () => {
    expect(GLOW_BLUE_ENTRY).toEqual({
      selector: "ANIM_GLOW_BLUE",
      sourceId: 34,
      taskZeroedData2: true,
      taskZeroedData6: true,
      taskZeroedData7: true,
      callbackInstalled: "Anim_GlowBlue",
      callbackInvokedByInitializer: false,
      colorIncrement: 12,
      speed: 2,
      blendColor: 0x7c00,
      normalFrontDontFlip: true,
      accepted: true,
    });
    expect(TASK_HANDLE_MON_ANIMATION_ZEROED_DATA_INDICES).toEqual([0, 2, 3, 4, 5, 6, 7]);
  });

  it("exhausts all 65 active callbacks with exact palette and signed-register writes", () => {
    for (let tick = 0; tick <= 64; tick += 1) {
      const data2 = tick * 2;
      const coefficient = Math.floor((12 * GBA_SINE_TABLE_256[data2]!) / 256);
      expect(glowBlueFrameAtTick(tick, 5), `callback ${tick}`).toEqual({
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
        blendColor: 0x7c00,
        paletteWrite: true,
        restoredPalette: false,
        normalFrontDontFlip: true,
        callback: "Anim_GlowBlue",
      });
    }
  });

  it("pins sine phase boundaries, blue color packing, and OBJ palette-slot masking", () => {
    expect(0 | (0 << 5) | (31 << 10)).toBe(0x7c00);
    expect(glowBlueFrameAtTick(0, 0)).toMatchObject({
      data2Before: 0, data6: 0, data7: 0x100, blendCoefficient: 0,
    });
    expect(glowBlueFrameAtTick(16, 15)).toMatchObject({
      data2Before: 32, data6: 8, data7: 0x1f0, blendCoefficient: 8,
    });
    expect(glowBlueFrameAtTick(32, 16)).toMatchObject({
      data2Before: 64, data6: 12, data7: 0x100, blendCoefficient: 12,
    });
    expect(glowBlueFrameAtTick(48, -1)).toMatchObject({
      data2Before: 96, data6: 8, data7: 0x1f0, blendCoefficient: 8,
    });
    expect(glowBlueFrameAtTick(64, 5)).toMatchObject({
      data2Before: 128, data2: 130, data6: 0, blendCoefficient: 0,
      restoredPalette: false, callback: "Anim_GlowBlue",
    });
  });

  it("restores the palette at the strict terminal sentinel and remains stable", () => {
    const terminal = glowBlueFrameAtTick(65, 5);
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
      blendColor: 0x7c00,
      paletteWrite: true,
      restoredPalette: true,
      normalFrontDontFlip: true,
      callback: "WaitAnimEnd",
    });
    expect(glowBlueFrameAtTick(66, 5)).toEqual(terminal);
    expect(glowBlueFrameAtTick(4096, 5)).toEqual(terminal);
  });

  it("rejects invalid inputs while adjacent unused glow controls stay unsupported", () => {
    for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(glowBlueFrameAtTick(invalid)).toBeNull();
    }
    for (const invalidPalette of [0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(glowBlueFrameAtTick(0, invalidPalette)).toBeNull();
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
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_GLOW_RED");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_GLOW_YELLOW");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_GLOW_PURPLE");
    expect(speciesFrontIdleRestOffset("GASTLY")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("PONYTA")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("PIDGEOT")).toBeNull();
  });
});
