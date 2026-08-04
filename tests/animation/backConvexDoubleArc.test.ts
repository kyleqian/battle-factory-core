import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_CONVEX_DOUBLE_ARC_FACTORY_SPECIES,
  BACK_CONVEX_DOUBLE_ARC_OUTSIDE_FACTORY_SPECIES,
  BACK_CONVEX_DOUBLE_ARC_SPECIES,
  BACK_CONVEX_DOUBLE_ARC_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backConvexDoubleArcFrameAtTick,
  backConvexDoubleArcTerminalSpriteData,
  backConvexDoubleArcWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const CONVEX_DOUBLE_ARC_SPECIES = [
  "BUTTERFREE", "ZUBAT", "VENOMOTH", "SEADRA", "GOLDEEN", "SEAKING", "HOOTHOOT", "LEDIAN",
  "TOGETIC", "BELLOSSOM", "HOPPIP", "SKIPLOOM", "JUMPLUFF", "YANMA", "BEAUTIFLY", "WINGULL",
  "PELIPPER", "MASQUERAIN", "SWABLU", "ALTARIA", "HUNTAIL", "GOREBYSS", "CASTFORM", "VOLBEAT",
  "ILLUMISE", "JIRACHI", "CHIMECHO",
] as const;

describe("BACK_ANIM_CONVEX_DOUBLE_ARC back send-out reducer", () => {
  it("derives the complete 27/26/1 source census and all 43 Factory records", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const sourceMappings = [...source.matchAll(/\[SPECIES_([A-Z0-9_]+)\]\s*= BACK_ANIM_CONVEX_DOUBLE_ARC,/g)]
      .map(([, species]) => species);
    const factoryRecords = frontierMons.entries.filter(({ species }) => (
      CONVEX_DOUBLE_ARC_SPECIES.includes(species.replace(/^SPECIES_/, "") as typeof CONVEX_DOUBLE_ARC_SPECIES[number])
    ));
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(sourceMappings).toEqual(CONVEX_DOUBLE_ARC_SPECIES);
    expect(BACK_CONVEX_DOUBLE_ARC_SPECIES).toEqual(CONVEX_DOUBLE_ARC_SPECIES);
    expect(BACK_CONVEX_DOUBLE_ARC_FACTORY_SPECIES).toEqual(CONVEX_DOUBLE_ARC_SPECIES.filter((species) => species !== "JIRACHI"));
    expect(BACK_CONVEX_DOUBLE_ARC_OUTSIDE_FACTORY_SPECIES).toEqual(["JIRACHI"]);
    expect(factoryRecords).toHaveLength(43);
    expect(new Set(factoryRecords.map(({ species }) => species.replace(/^SPECIES_/, "")))).toEqual(
      new Set(BACK_CONVEX_DOUBLE_ARC_FACTORY_SPECIES),
    );
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_CONVEX_DOUBLE_ARC"))
      .toEqual(CONVEX_DOUBLE_ARC_SPECIES.map((species) => [species, "BACK_ANIM_CONVEX_DOUBLE_ARC"]));
  });

  it("routes every source sibling through the party-nature triple", () => {
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(BACK_CONVEX_DOUBLE_ARC_VARIANTS).toEqual({
      twice: { selector: "ANIM_CONVEX_DOUBLE_ARC_TWICE", callback: "Anim_ConvexDoubleArc_Twice", sourceId: 126, natureMod: 0, step: 8, xAmplitude: 16, terminalArcCount: 3, accepted: true },
      normal: { selector: "ANIM_CONVEX_DOUBLE_ARC", callback: "Anim_ConvexDoubleArc", sourceId: 125, natureMod: 1, step: 6, xAmplitude: 16, terminalArcCount: 2, accepted: true },
      slow: { selector: "ANIM_CONVEX_DOUBLE_ARC_SLOW", callback: "Anim_ConvexDoubleArc_Slow", sourceId: 124, natureMod: 2, step: 4, xAmplitude: 16, terminalArcCount: 2, accepted: true },
    });
    // The Factory records named in the brief do not span this triple: source
    // maps Lax (Hoppip index 29) to normal and Hasty (Castform index 204) to
    // twice. These direct selector facts keep a later fixture from silently
    // attributing an impossible callback to its stored nature.
    expect(selectBackSendOutAnimation("HOPPIP", 9)).toMatchObject({
      backAnimSetIndex: 16, backAnimSet: "BACK_ANIM_CONVEX_DOUBLE_ARC", natureMod: 1,
      selector: "ANIM_CONVEX_DOUBLE_ARC",
    });
    expect(selectBackSendOutAnimation("ZUBAT", 22)).toMatchObject({
      backAnimSetIndex: 16, backAnimSet: "BACK_ANIM_CONVEX_DOUBLE_ARC", natureMod: 1,
      selector: "ANIM_CONVEX_DOUBLE_ARC",
    });
    expect(selectBackSendOutAnimation("CASTFORM", 11)).toMatchObject({
      backAnimSetIndex: 16, backAnimSet: "BACK_ANIM_CONVEX_DOUBLE_ARC", natureMod: 0,
      selector: "ANIM_CONVEX_DOUBLE_ARC_TWICE",
    });
    for (const species of CONVEX_DOUBLE_ARC_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(16);
      expect([11, 22, 1].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_CONVEX_DOUBLE_ARC_TWICE", "ANIM_CONVEX_DOUBLE_ARC", "ANIM_CONVEX_DOUBLE_ARC_SLOW"]);
    }
  });

  it("pins source ids, guarded initializers, strict overflow, and the three y regions", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_CONVEX_DOUBLE_ARC\s+17$/m);
    expect(constants).toMatch(/^#define ANIM_CONVEX_DOUBLE_ARC_SLOW\s+124$/m);
    expect(constants).toMatch(/^#define ANIM_CONVEX_DOUBLE_ARC\s+125$/m);
    expect(constants).toMatch(/^#define ANIM_CONVEX_DOUBLE_ARC_TWICE\s+126$/m);
    expect(source).toMatch(/\(BACK_ANIM_CONVEX_DOUBLE_ARC - 1\) \* 3\]\s*= ANIM_CONVEX_DOUBLE_ARC_TWICE, ANIM_CONVEX_DOUBLE_ARC, ANIM_CONVEX_DOUBLE_ARC_SLOW,/);
    expect(source).toMatch(/\[NATURE_LAX\]\s*= 1,/);
    expect(source).toMatch(/\[NATURE_SASSY\]\s*= 1,/);
    expect(source).toMatch(/\[NATURE_HASTY\]\s*= 0,/);
    const helperStart = source.indexOf("static void ConvexDoubleArc(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_ConvexDoubleArc_Slow", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toContain("if (sprite->data[7] > 256)");
    expect(helper).toContain("if (sprite->data[6] <= sprite->data[4])");
    expect(helper).toContain("sprite->data[4]++;");
    expect(helper).toContain("sprite->data[7] = 0;");
    expect(helper).toContain("sprite->x2 = 0;");
    expect(helper).toContain("sprite->y2 = 0;");
    expect(helper).toContain("if (sprite->data[7] > 159)");
    expect(helper).toContain("else if (sprite->data[7] > 95)");
    expect(helper).toContain("sprite->y2 = -(Sin(sprite->data[7] % 256, 8));");
    expect(helper).toContain("Sin(96, 6) - Sin((sprite->data[7] - 96) * 2, 4)");
    expect(helper).toContain("posX = -(Sin(sprite->data[7] / 2, sprite->data[5]));");
    expect(helper).toContain("if (sprite->data[4] % 2 == 0)");
    for (const [callback, selector, sourceId, step, arcs] of [
      ["Anim_ConvexDoubleArc_Twice", "ANIM_CONVEX_DOUBLE_ARC_TWICE", 126, 8, 3],
      ["Anim_ConvexDoubleArc", "ANIM_CONVEX_DOUBLE_ARC", 125, 6, 2],
      ["Anim_ConvexDoubleArc_Slow", "ANIM_CONVEX_DOUBLE_ARC_SLOW", 124, 4, 2],
    ] as const) {
      expect(constants).toMatch(new RegExp(`^#define ${selector}\\s+${sourceId}$`, "m"));
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain("if (sprite->data[2] == 0)");
      expect(initializer).toContain("sprite->data[2] = 1;");
      expect(initializer).toContain(`sprite->data[6] = ${arcs};`);
      expect(initializer).toContain("sprite->data[7] = 0;");
      expect(initializer).toContain("sprite->data[5] = 16;");
      expect(initializer).toContain("sprite->data[4] = 1;");
      expect(initializer).toContain(`sprite->data[3] = ${step};`);
      expect(initializer).toContain("ConvexDoubleArc(sprite);");
      expect(initializer).not.toContain("sprite->callback = ConvexDoubleArc;");
    }
  });

  it("models signed GBA sine arithmetic, arc parity/restarts, terminal cleanup, and dummy restoration", () => {
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 0, -1)).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2: 1, data3: 8, data4Before: 1, data4: 1,
      data5: 16, data6: 3, data7Before: 0, data7: 8, strictOverflow: false,
      yRegion: "low", xSineIndex: 0, ySineIndex: 0, xSign: -1,
      selector: "ANIM_CONVEX_DOUBLE_ARC_TWICE", sourceId: 126, terminalArcCount: 3,
      initializerCallBeforeCallbackInstall: true, helperInvokedByInitializer: true,
      tryFlipXCalls: 0, normalBackDontFlip: true, affineWriteCount: 0, affineMode: "normal",
      oamVisible: true, resetSpriteAfterAnim: false, callback: "Anim_ConvexDoubleArc_Twice",
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 12, -1)).toMatchObject({
      data7Before: 96, data7: 104, yRegion: "middle", ySineIndex: 0, xSineIndex: 48, xSign: -1,
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 20, -1)).toMatchObject({
      data7Before: 160, data7: 168, yRegion: "high", ySineIndex: 160, xSineIndex: 80, xSign: -1,
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 32, -1)).toMatchObject({
      data7Before: 256, data7: 264, strictOverflow: false, yRegion: "high", ySineIndex: 0,
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 33, -1)).toMatchObject({
      x2: 0, y2: 0, data4Before: 1, data4: 2, data6: 3, data7Before: 264, data7: 0,
      strictOverflow: true, repeatWillRestart: true, yRegion: null, xSign: null,
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 34, -1)).toMatchObject({
      data4Before: 2, data4: 2, data7Before: 0, xSign: 1, yRegion: "low",
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 67, -1)).toMatchObject({
      data4Before: 2, data4: 3, data6: 3, data7Before: 264, data7: 0,
      strictOverflow: true, repeatWillRestart: true,
    });
    const twiceTerminal = backConvexDoubleArcFrameAtTick("HOPPIP", 11, 101, -1)!;
    expect(twiceTerminal).toMatchObject({
      x2: 0, y2: 0, data4Before: 3, data4: 3, data6: 3, data7Before: 264, data7: 264,
      strictOverflow: true, repeatWillRestart: false, yRegion: null, callback: "WaitAnimEnd",
    });
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, 999, -1)).toEqual(twiceTerminal);
    expect(backConvexDoubleArcFrameAtTick("ZUBAT", 22, 43, 1)).toMatchObject({
      data3: 6, data4: 2, data6: 2, data7Before: 258, data7: 0,
      strictOverflow: true, repeatWillRestart: true,
    });
    expect(backConvexDoubleArcFrameAtTick("ZUBAT", 22, 87, 1)).toMatchObject({
      data3: 6, data4: 2, data6: 2, data7Before: 258, data7: 258,
      strictOverflow: true, callback: "WaitAnimEnd",
    });
    expect(backConvexDoubleArcFrameAtTick("CASTFORM", 1, 131, 1)).toMatchObject({
      data3: 4, data4: 2, data6: 2, data7Before: 260, data7: 260,
      strictOverflow: true, callback: "WaitAnimEnd",
    });
    expect(backConvexDoubleArcWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backConvexDoubleArcWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backConvexDoubleArcTerminalSpriteData("HOPPIP", 11, 0, 187)).toEqual([0, 0, 187, 8, 3, 16, 3, 264]);
    expect(backConvexDoubleArcTerminalSpriteData("ZUBAT", 22, 0, 41)).toEqual([0, 0, 41, 6, 2, 16, 2, 258]);
    expect(backConvexDoubleArcTerminalSpriteData("CASTFORM", 1, 0, 385)).toEqual([0, 0, 385, 4, 2, 16, 2, 260]);
  });

  it("rejects invalid input and adjacent send-out families", () => {
    expect(backConvexDoubleArcFrameAtTick("HOPPIP", 11, -1)).toBeNull();
    expect(backConvexDoubleArcFrameAtTick("ZUBAT", 22, 0.5)).toBeNull();
    expect(backConvexDoubleArcFrameAtTick("ONIX", 0, 0)).toBeNull();
    expect(backConvexDoubleArcFrameAtTick("NOT_A_SPECIES", 1, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_CONVEX_DOUBLE_ARC).toEqual([
      "ANIM_CONVEX_DOUBLE_ARC_TWICE", "ANIM_CONVEX_DOUBLE_ARC", "ANIM_CONVEX_DOUBLE_ARC_SLOW",
    ]);
  });
});
