import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_V_SHAKE_LOW_FACTORY_SPECIES,
  BACK_V_SHAKE_LOW_OUTSIDE_FACTORY_SPECIES,
  BACK_V_SHAKE_LOW_SPECIES,
  BACK_V_SHAKE_LOW_VARIANTS,
  backSendOutTerminalSpriteData,
  backVerticalShakeLowFrameAtTick,
  backVerticalShakeLowWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const LOW_SHAKE_SPECIES = [
  "POLIWRATH", "GEODUDE", "RHYHORN", "RHYDON", "PINSIR", "TAUROS", "DONPHAN", "LARVITAR",
  "TYRANITAR", "NOSEPASS", "MAKUHITA", "HARIYAMA", "NUMEL", "TROPIUS", "AGGRON",
] as const;

describe("BACK_ANIM_V_SHAKE_LOW back send-out reducer", () => {
  it("pins the exact generated fifteen-mapping Factory census", () => {
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386, factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(BACK_V_SHAKE_LOW_SPECIES).toEqual(LOW_SHAKE_SPECIES);
    expect(BACK_V_SHAKE_LOW_FACTORY_SPECIES).toEqual(LOW_SHAKE_SPECIES);
    expect(BACK_V_SHAKE_LOW_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(LOW_SHAKE_SPECIES.every((species) => factory.has(species))).toBe(true);
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_V_SHAKE_LOW"))
      .toEqual(LOW_SHAKE_SPECIES.map((species) => [species, "BACK_ANIM_V_SHAKE_LOW"]));
  });

  it("routes every source mapping through all three party-nature selectors", () => {
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(BACK_V_SHAKE_LOW_VARIANTS).toEqual({
      fast: { selector: "ANIM_V_SHAKE_LOW_TWICE_FAST", callback: "Anim_VerticalShakeLowTwice_Fast", sourceId: 99, natureMod: 0, step: 56, amplitude: 9, accepted: true },
      normal: { selector: "ANIM_V_SHAKE_LOW_TWICE", callback: "Anim_VerticalShakeLowTwice", sourceId: 92, natureMod: 1, step: 40, amplitude: 6, accepted: true },
      slow: { selector: "ANIM_V_SHAKE_LOW_TWICE_SLOW", callback: "Anim_VerticalShakeLowTwice_Slow", sourceId: 98, natureMod: 2, step: 24, amplitude: 6, accepted: true },
    });
    expect(selectBackSendOutAnimation("GEODUDE", 2)).toMatchObject({
      backAnimSetIndex: 13, backAnimSet: "BACK_ANIM_V_SHAKE_LOW", natureMod: 0, selector: "ANIM_V_SHAKE_LOW_TWICE_FAST",
    });
    expect(selectBackSendOutAnimation("MAKUHITA", 6)).toMatchObject({
      backAnimSetIndex: 13, backAnimSet: "BACK_ANIM_V_SHAKE_LOW", natureMod: 1, selector: "ANIM_V_SHAKE_LOW_TWICE",
    });
    expect(selectBackSendOutAnimation("HARIYAMA", 17)).toMatchObject({
      backAnimSetIndex: 13, backAnimSet: "BACK_ANIM_V_SHAKE_LOW", natureMod: 2, selector: "ANIM_V_SHAKE_LOW_TWICE_SLOW",
    });
    for (const species of LOW_SHAKE_SPECIES) {
      for (const natureId of [2, 6, 17]) {
        expect(selectBackSendOutAnimation(species, natureId)?.backAnimSet).toBe("BACK_ANIM_V_SHAKE_LOW");
      }
    }
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_V_SHAKE_LOW).toEqual([
      "ANIM_V_SHAKE_LOW_TWICE_FAST", "ANIM_V_SHAKE_LOW_TWICE", "ANIM_V_SHAKE_LOW_TWICE_SLOW",
    ]);
  });

  it("pins source selectors, phase table, and initializer-to-helper cadence", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_V_SHAKE_LOW\s+14$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_LOW_TWICE\s+92$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_LOW_TWICE_SLOW\s+98$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_LOW_TWICE_FAST\s+99$/m);
    expect(source).toMatch(/\(BACK_ANIM_V_SHAKE_LOW - 1\) \* 3\]\s*= ANIM_V_SHAKE_LOW_TWICE_FAST, ANIM_V_SHAKE_LOW_TWICE, ANIM_V_SHAKE_LOW_TWICE_SLOW,/);
    const table = source.slice(source.indexOf("static const u8 sVerticalShakeData"), source.indexOf("};", source.indexOf("static const u8 sVerticalShakeData")) + 2);
    expect(table).toContain("{ 6,  30}");
    expect(table).toContain("{-2,  15}");
    expect(table).toContain("{-1,   0}");
    const helperStart = source.indexOf("static void VerticalShakeLowTwice(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_VerticalShakeLowTwice(struct Sprite *sprite)", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/u8 var8 = sprite->data\[2\]/);
    expect(helper).toMatch(/var7 = \(var6 - var9\) \* var5 \/ var6/);
    expect(helper).toMatch(/Sin\(\(var8 \+ 192\) % 256, var7\) \+ var7/);
    expect(helper).toMatch(/sprite->data\[5\]\+\+/);
    for (const [callback, step, amplitude] of [
      ["Anim_VerticalShakeLowTwice_Fast", 56, 9],
      ["Anim_VerticalShakeLowTwice", 40, 6],
      ["Anim_VerticalShakeLowTwice_Slow", 24, 6],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const entry = source.slice(start, end);
      expect(entry).toMatch(new RegExp(`sprite->data\\[0\\] = ${step};`));
      expect(entry).toMatch(new RegExp(`sprite->data\\[7\\] = ${amplitude};`));
      expect(entry).toContain("VerticalShakeLowTwice(sprite);");
      expect(entry).toContain("sprite->callback = VerticalShakeLowTwice;");
      expect(entry).not.toContain("TryFlipX(sprite);");
    }
  });

  it("models the damped pulse, forced-zero gap, source boundaries, and terminal dummy handoff", () => {
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 0, -1)).toMatchObject({
      data0: 56, data1: -1, data2Before: 0, data2: 56, data5: 0, data6: 1, data7: 9,
      sourceRowMultiplier: 6, sourceRowDuration: 30, effectiveAmplitude: 9, sineIndex: 192,
      y2: 0, phaseBoundary: false, initializerCallBeforeCallbackInstall: true,
      normalBackDontFlip: true, tryFlipXCalls: 0, affineMode: "normal", callback: "VerticalShakeLowTwice",
    });
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 30, -1)).toMatchObject({
      data2Before: 1680, data2: 1680, data5: 1, data6: 0,
      effectiveAmplitude: 0, phaseBoundary: true, callback: "VerticalShakeLowTwice",
    });
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 31, -1)).toMatchObject({
      data2Before: 1680, data2: 1736, data5: 1, data6: 1, sourceRowMultiplier: -2,
      sourceRowDuration: 15, effectiveAmplitude: 0, y2: 0,
    });
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 46, -1)).toMatchObject({
      data2: 2520, data5: 2, data6: 0, phaseBoundary: true, effectiveAmplitude: 0,
    });
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 77, -1)).toMatchObject({
      data2: 4200, data5: 3, data6: 0, phaseBoundary: true, effectiveAmplitude: 0,
    });
    const terminal = backVerticalShakeLowFrameAtTick("GEODUDE", 2, 78, -1)!;
    expect(terminal).toMatchObject({
      data2Before: 4200, data2: 4200, data5: 3, data6: 0, sourceRowMultiplier: -1,
      sourceRowDuration: 0, effectiveAmplitude: 0, sineIndex: null, y2: 0, callback: "WaitAnimEnd",
    });
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 999, -1)).toEqual(terminal);
    expect(backVerticalShakeLowFrameAtTick("MAKUHITA", 6, 78)).toMatchObject({ data0: 40, data2: 3000, data7: 6, callback: "WaitAnimEnd" });
    expect(backVerticalShakeLowFrameAtTick("HARIYAMA", 17, 78)).toMatchObject({ data0: 24, data2: 1800, data7: 6, callback: "WaitAnimEnd" });
    expect(backVerticalShakeLowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalShakeLowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, 74)).toEqual([0, 0, 74, 0, 0, 0, 0, 0]);
  });

  it("rejects invalid input and keeps adjacent selector families out", () => {
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, -1)).toBeNull();
    expect(backVerticalShakeLowFrameAtTick("GEODUDE", 2, 0.5)).toBeNull();
    expect(backVerticalShakeLowFrameAtTick("ONIX", 2, 0)).toBeNull();
    expect(backVerticalShakeLowFrameAtTick("NOT_A_SPECIES", 2, 0)).toBeNull();
  });
});
