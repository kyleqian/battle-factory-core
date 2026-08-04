import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_CONCAVE_ARC_LARGE_FACTORY_SPECIES,
  BACK_CONCAVE_ARC_LARGE_OUTSIDE_FACTORY_SPECIES,
  BACK_CONCAVE_ARC_LARGE_SPECIES,
  BACK_CONCAVE_ARC_LARGE_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backConcaveArcLargeFrameAtTick,
  backConcaveArcLargeTerminalSpriteData,
  backConcaveArcLargeWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const CONCAVE_ARC_LARGE_SPECIES = [
  "SANDSLASH", "VULPIX", "MEOWTH", "MANKEY", "PRIMEAPE", "EXEGGUTOR", "MAROWAK", "MAGIKARP",
  "FURRET", "POLITOED", "AIPOM", "TREECKO", "COMBUSKEN", "LOMBRE", "LUDICOLO", "AZURILL",
  "SPOINK", "VIGOROTH",
] as const;

describe("BACK_ANIM_CONCAVE_ARC_LARGE back send-out reducer", () => {
  it("derives the complete 18/18/0 source census and all 33 Factory records", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const sourceMappings = [...source.matchAll(/\[SPECIES_([A-Z0-9_]+)\]\s*= BACK_ANIM_CONCAVE_ARC_LARGE,/g)]
      .map(([, species]) => species);
    const factoryRecords = frontierMons.entries.filter(({ species }) => (
      CONCAVE_ARC_LARGE_SPECIES.includes(species.replace(/^SPECIES_/, "") as typeof CONCAVE_ARC_LARGE_SPECIES[number])
    ));
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(sourceMappings).toEqual(CONCAVE_ARC_LARGE_SPECIES);
    expect(BACK_CONCAVE_ARC_LARGE_SPECIES).toEqual(CONCAVE_ARC_LARGE_SPECIES);
    expect(BACK_CONCAVE_ARC_LARGE_FACTORY_SPECIES).toEqual(CONCAVE_ARC_LARGE_SPECIES);
    expect(BACK_CONCAVE_ARC_LARGE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(factoryRecords).toHaveLength(33);
    expect(new Set(factoryRecords.map(({ species }) => species.replace(/^SPECIES_/, "")))).toEqual(
      new Set(CONCAVE_ARC_LARGE_SPECIES),
    );
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_CONCAVE_ARC_LARGE"))
      .toEqual(CONCAVE_ARC_LARGE_SPECIES.map((species) => [species, "BACK_ANIM_CONCAVE_ARC_LARGE"]));
  });

  it("routes every source sibling through the party-nature triple", () => {
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(BACK_CONCAVE_ARC_LARGE_VARIANTS).toEqual({
      twice: { selector: "ANIM_CONCAVE_ARC_LARGE_TWICE", callback: "Anim_ConcaveArcLarge_Twice", sourceId: 123, natureMod: 0, step: 8, xAmplitude: 12, yAmplitude: 12, runs: 2, accepted: true },
      normal: { selector: "ANIM_CONCAVE_ARC_LARGE", callback: "Anim_ConcaveArcLarge", sourceId: 122, natureMod: 1, step: 6, xAmplitude: 12, yAmplitude: 12, runs: 1, accepted: true },
      slow: { selector: "ANIM_CONCAVE_ARC_LARGE_SLOW", callback: "Anim_ConcaveArcLarge_Slow", sourceId: 121, natureMod: 2, step: 4, xAmplitude: 12, yAmplitude: 12, runs: 1, accepted: true },
    });
    expect(selectBackSendOutAnimation("MAGIKARP", 0)).toMatchObject({
      backAnimSetIndex: 15, backAnimSet: "BACK_ANIM_CONCAVE_ARC_LARGE", natureMod: 0,
      selector: "ANIM_CONCAVE_ARC_LARGE_TWICE",
    });
    expect(selectBackSendOutAnimation("AZURILL", 19)).toMatchObject({
      backAnimSetIndex: 15, backAnimSet: "BACK_ANIM_CONCAVE_ARC_LARGE", natureMod: 1,
      selector: "ANIM_CONCAVE_ARC_LARGE",
    });
    expect(selectBackSendOutAnimation("TREECKO", 1)).toMatchObject({
      backAnimSetIndex: 15, backAnimSet: "BACK_ANIM_CONCAVE_ARC_LARGE", natureMod: 2,
      selector: "ANIM_CONCAVE_ARC_LARGE_SLOW",
    });
    for (const species of CONCAVE_ARC_LARGE_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(15);
      expect([0, 19, 1].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_CONCAVE_ARC_LARGE_TWICE", "ANIM_CONCAVE_ARC_LARGE", "ANIM_CONCAVE_ARC_LARGE_SLOW"]);
    }
  });

  it("pins source ids, guarded initializers, strict overflow, and helper cadence", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_CONCAVE_ARC_LARGE\s+16$/m);
    expect(constants).toMatch(/^#define ANIM_CONCAVE_ARC_LARGE_SLOW\s+121$/m);
    expect(constants).toMatch(/^#define ANIM_CONCAVE_ARC_LARGE\s+122$/m);
    expect(constants).toMatch(/^#define ANIM_CONCAVE_ARC_LARGE_TWICE\s+123$/m);
    expect(source).toMatch(/\(BACK_ANIM_CONCAVE_ARC_LARGE - 1\) \* 3\]\s*= ANIM_CONCAVE_ARC_LARGE_TWICE, ANIM_CONCAVE_ARC_LARGE, ANIM_CONCAVE_ARC_LARGE_SLOW,/);
    const helperStart = source.indexOf("static void ConcaveArc(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_ConcaveArcLarge_Slow", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toContain("if (sprite->data[7] > 255)");
    expect(helper).toContain("sprite->data[7] %= 256;");
    expect(helper).toContain("sprite->data[6]--;");
    expect(helper).toContain("sprite->x2 = -(Sin(sprite->data[7], sprite->data[5]));");
    expect(helper).toContain("Sin((sprite->data[7] + 192) % 256, sprite->data[4])");
    expect(helper).toContain("if (sprite->y2 > 0)");
    expect(helper).toContain("sprite->y2 += sprite->data[4];");
    for (const [callback, selector, sourceId, step, runs] of [
      ["Anim_ConcaveArcLarge_Twice", "ANIM_CONCAVE_ARC_LARGE_TWICE", 123, 8, 2],
      ["Anim_ConcaveArcLarge", "ANIM_CONCAVE_ARC_LARGE", 122, 6, 1],
      ["Anim_ConcaveArcLarge_Slow", "ANIM_CONCAVE_ARC_LARGE_SLOW", 121, 4, 1],
    ] as const) {
      expect(constants).toMatch(new RegExp(`^#define ${selector}\\s+${sourceId}$`, "m"));
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain("if (sprite->data[2] == 0)");
      expect(initializer).toContain("sprite->data[2] = 1;");
      expect(initializer).toContain(`sprite->data[6] = ${runs};`);
      expect(initializer).toContain("sprite->data[7] = 0;");
      expect(initializer).toContain("sprite->data[5] = 12;");
      expect(initializer).toContain("sprite->data[4] = 12;");
      expect(initializer).toContain(`sprite->data[3] = ${step};`);
      expect(initializer).toContain("ConcaveArc(sprite);");
      expect(initializer).not.toContain("sprite->callback = ConcaveArc;");
    }
  });

  it("models the GBA-sine arc, strict terminal/repeat branch, and dummy restoration", () => {
    expect(backConcaveArcLargeFrameAtTick("MAGIKARP", 0, 0, -1)).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2: 1, data3: 8, data4: 12, data5: 12,
      data6: 2, data7Before: 0, data7: 8, strictOverflow: false, sineIndex: 0,
      reflectedY: false, selector: "ANIM_CONCAVE_ARC_LARGE_TWICE", sourceId: 123,
      runs: 2, initializerCallBeforeCallbackInstall: true, helperInvokedByInitializer: true,
      tryFlipXCalls: 0, normalBackDontFlip: true, affineWriteCount: 0, affineMode: "normal",
      oamVisible: true, resetSpriteAfterAnim: false, callback: "Anim_ConcaveArcLarge_Twice",
    });
    expect(backConcaveArcLargeFrameAtTick("MAGIKARP", 0, 8, -1)).toMatchObject({
      x2: -12, y2: 12, data7Before: 64, data7: 72, sineIndex: 64, reflectedY: false,
    });
    expect(backConcaveArcLargeFrameAtTick("MAGIKARP", 0, 32, -1)).toMatchObject({
      x2: 3, y2: 0, data6: 1, data7Before: 256, data7: 0, strictOverflow: true,
      repeatWillRestart: true, sineIndex: null, callback: "Anim_ConcaveArcLarge_Twice",
    });
    expect(backConcaveArcLargeFrameAtTick("MAGIKARP", 0, 33, -1)).toMatchObject({
      x2: 0, y2: 0, data6: 1, data7Before: 0, data7: 8, strictOverflow: false,
    });
    const twiceTerminal = backConcaveArcLargeFrameAtTick("MAGIKARP", 0, 65, -1)!;
    expect(twiceTerminal).toMatchObject({
      x2: 0, y2: 0, data6: 0, data7Before: 256, data7: 256, strictOverflow: true,
      repeatWillRestart: false, sineIndex: null, callback: "WaitAnimEnd",
    });
    expect(backConcaveArcLargeFrameAtTick("MAGIKARP", 0, 999, -1)).toEqual(twiceTerminal);
    expect(backConcaveArcLargeFrameAtTick("AZURILL", 19, 16, 1)).toMatchObject({
      x2: -8, y2: 4, data3: 6, data6: 1, data7Before: 96, data7: 102,
      sineIndex: 96, reflectedY: true, callback: "Anim_ConcaveArcLarge",
    });
    expect(backConcaveArcLargeFrameAtTick("AZURILL", 19, 43, 1)).toMatchObject({
      x2: 0, y2: 0, data6: 0, data7Before: 258, data7: 258,
      strictOverflow: true, callback: "WaitAnimEnd",
    });
    expect(backConcaveArcLargeFrameAtTick("TREECKO", 1, 64, 1)).toMatchObject({
      data3: 4, data6: 0, data7Before: 256, data7: 256,
      strictOverflow: true, callback: "WaitAnimEnd",
    });
    expect(backConcaveArcLargeWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backConcaveArcLargeWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backConcaveArcLargeTerminalSpriteData("MAGIKARP", 0, 0, 129)).toEqual([0, 0, 129, 8, 12, 12, 0, 256]);
    expect(backConcaveArcLargeTerminalSpriteData("AZURILL", 19, 0, 298)).toEqual([0, 0, 298, 6, 12, 12, 0, 258]);
    expect(backConcaveArcLargeTerminalSpriteData("TREECKO", 1, 0, 252)).toEqual([0, 0, 252, 4, 12, 12, 0, 256]);
  });

  it("rejects invalid input and adjacent send-out families", () => {
    expect(backConcaveArcLargeFrameAtTick("MAGIKARP", 0, -1)).toBeNull();
    expect(backConcaveArcLargeFrameAtTick("AZURILL", 19, 0.5)).toBeNull();
    expect(backConcaveArcLargeFrameAtTick("ONIX", 0, 0)).toBeNull();
    expect(backConcaveArcLargeFrameAtTick("NOT_A_SPECIES", 1, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_CONCAVE_ARC_LARGE).toEqual([
      "ANIM_CONCAVE_ARC_LARGE_TWICE", "ANIM_CONCAVE_ARC_LARGE", "ANIM_CONCAVE_ARC_LARGE_SLOW",
    ]);
  });
});
