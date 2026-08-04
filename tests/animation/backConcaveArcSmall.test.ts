import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_CONCAVE_ARC_SMALL_FACTORY_SPECIES,
  BACK_CONCAVE_ARC_SMALL_OUTSIDE_FACTORY_SPECIES,
  BACK_CONCAVE_ARC_SMALL_SPECIES,
  BACK_CONCAVE_ARC_SMALL_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backConcaveArcSmallFrameAtTick,
  backConcaveArcSmallTerminalSpriteData,
  backConcaveArcSmallWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const CONCAVE_ARC_SMALL_SPECIES = [
  "CHARMANDER", "SQUIRTLE", "WARTORTLE", "SANDSHREW", "NIDORAN_F", "NIDORAN_M", "POLIWAG",
  "CHANSEY", "KANGASKHAN", "EEVEE", "MEW", "CHIKORITA", "CYNDAQUIL", "SENTRET", "PICHU",
  "NATU", "MAREEP", "MARILL", "MURKROW", "TORCHIC", "MARSHTOMP", "POOCHYENA", "TAILLOW",
  "DELCATTY", "PLUSLE", "MINUN", "WYNAUT",
] as const;

describe("BACK_ANIM_CONCAVE_ARC_SMALL back send-out reducer", () => {
  it("derives the complete 27/26/1 source census and all 36 Factory records", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const sourceMappings = [...source.matchAll(/\[SPECIES_([A-Z0-9_]+)\]\s*= BACK_ANIM_CONCAVE_ARC_SMALL,/g)]
      .map(([, species]) => species);
    const factoryRecords = frontierMons.entries.filter(({ species }) => (
      CONCAVE_ARC_SMALL_SPECIES.includes(species.replace(/^SPECIES_/, "") as typeof CONCAVE_ARC_SMALL_SPECIES[number])
    ));
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(sourceMappings).toEqual(CONCAVE_ARC_SMALL_SPECIES);
    expect(BACK_CONCAVE_ARC_SMALL_SPECIES).toEqual(CONCAVE_ARC_SMALL_SPECIES);
    expect(BACK_CONCAVE_ARC_SMALL_FACTORY_SPECIES).toEqual(CONCAVE_ARC_SMALL_SPECIES.filter((species) => species !== "MEW"));
    expect(BACK_CONCAVE_ARC_SMALL_OUTSIDE_FACTORY_SPECIES).toEqual(["MEW"]);
    expect(factoryRecords).toHaveLength(36);
    expect(new Set(factoryRecords.map(({ species }) => species.replace(/^SPECIES_/, "")))).toEqual(
      new Set(CONCAVE_ARC_SMALL_SPECIES.filter((species) => species !== "MEW")),
    );
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_CONCAVE_ARC_SMALL"))
      .toEqual(CONCAVE_ARC_SMALL_SPECIES.map((species) => [species, "BACK_ANIM_CONCAVE_ARC_SMALL"]));
  });

  it("routes every source sibling through the party-nature triple", () => {
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(BACK_CONCAVE_ARC_SMALL_VARIANTS).toEqual({
      twice: { selector: "ANIM_CONCAVE_ARC_SMALL_TWICE", callback: "Anim_ConcaveArcSmall_Twice", sourceId: 129, natureMod: 0, step: 8, xAmplitude: 4, yAmplitude: 6, runs: 2, accepted: true },
      normal: { selector: "ANIM_CONCAVE_ARC_SMALL", callback: "Anim_ConcaveArcSmall", sourceId: 128, natureMod: 1, step: 6, xAmplitude: 4, yAmplitude: 6, runs: 1, accepted: true },
      slow: { selector: "ANIM_CONCAVE_ARC_SMALL_SLOW", callback: "Anim_ConcaveArcSmall_Slow", sourceId: 127, natureMod: 2, step: 4, xAmplitude: 4, yAmplitude: 6, runs: 1, accepted: true },
    });
    expect(selectBackSendOutAnimation("WYNAUT", 13)).toMatchObject({
      backAnimSetIndex: 17, backAnimSet: "BACK_ANIM_CONCAVE_ARC_SMALL", natureMod: 0,
      selector: "ANIM_CONCAVE_ARC_SMALL_TWICE",
    });
    expect(selectBackSendOutAnimation("PICHU", 19)).toMatchObject({
      backAnimSetIndex: 17, backAnimSet: "BACK_ANIM_CONCAVE_ARC_SMALL", natureMod: 1,
      selector: "ANIM_CONCAVE_ARC_SMALL",
    });
    expect(selectBackSendOutAnimation("MARILL", 21)).toMatchObject({
      backAnimSetIndex: 17, backAnimSet: "BACK_ANIM_CONCAVE_ARC_SMALL", natureMod: 2,
      selector: "ANIM_CONCAVE_ARC_SMALL_SLOW",
    });
    for (const species of CONCAVE_ARC_SMALL_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(17);
      expect([13, 19, 21].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_CONCAVE_ARC_SMALL_TWICE", "ANIM_CONCAVE_ARC_SMALL", "ANIM_CONCAVE_ARC_SMALL_SLOW"]);
    }
  });

  it("pins source ids, guarded initializers, strict overflow, and direct helper cadence", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_CONCAVE_ARC_SMALL\s+18$/m);
    expect(constants).toMatch(/^#define ANIM_CONCAVE_ARC_SMALL_SLOW\s+127$/m);
    expect(constants).toMatch(/^#define ANIM_CONCAVE_ARC_SMALL\s+128$/m);
    expect(constants).toMatch(/^#define ANIM_CONCAVE_ARC_SMALL_TWICE\s+129$/m);
    expect(source).toMatch(/\(BACK_ANIM_CONCAVE_ARC_SMALL - 1\) \* 3\]\s*= ANIM_CONCAVE_ARC_SMALL_TWICE, ANIM_CONCAVE_ARC_SMALL, ANIM_CONCAVE_ARC_SMALL_SLOW,/);
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
      ["Anim_ConcaveArcSmall_Twice", "ANIM_CONCAVE_ARC_SMALL_TWICE", 129, 8, 2],
      ["Anim_ConcaveArcSmall", "ANIM_CONCAVE_ARC_SMALL", 128, 6, 1],
      ["Anim_ConcaveArcSmall_Slow", "ANIM_CONCAVE_ARC_SMALL_SLOW", 127, 4, 1],
    ] as const) {
      expect(constants).toMatch(new RegExp(`^#define ${selector}\\s+${sourceId}$`, "m"));
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain("if (sprite->data[2] == 0)");
      expect(initializer).toContain("sprite->data[2] = 1;");
      expect(initializer).toContain(`sprite->data[6] = ${runs};`);
      expect(initializer).toContain("sprite->data[7] = 0;");
      expect(initializer).toContain("sprite->data[5] = 4;");
      expect(initializer).toContain("sprite->data[4] = 6;");
      expect(initializer).toContain(`sprite->data[3] = ${step};`);
      expect(initializer).toContain("ConcaveArc(sprite);");
      expect(initializer).not.toContain("sprite->callback = ConcaveArc;");
    }
  });

  it("models signed GBA sine arithmetic, strict terminal/repeat branch, and dummy restoration", () => {
    expect(backConcaveArcSmallFrameAtTick("WYNAUT", 13, 0, -1)).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2: 1, data3: 8, data4: 6, data5: 4,
      data6: 2, data7Before: 0, data7: 8, strictOverflow: false, sineIndex: 0,
      reflectedY: false, selector: "ANIM_CONCAVE_ARC_SMALL_TWICE", sourceId: 129,
      runs: 2, initializerCallBeforeCallbackInstall: true, helperInvokedByInitializer: true,
      tryFlipXCalls: 0, normalBackDontFlip: true, affineWriteCount: 0, affineMode: "normal",
      oamVisible: true, resetSpriteAfterAnim: false, callback: "Anim_ConcaveArcSmall_Twice",
    });
    expect(backConcaveArcSmallFrameAtTick("WYNAUT", 13, 8, -1)).toMatchObject({
      x2: -4, y2: 6, data7Before: 64, data7: 72, sineIndex: 64, reflectedY: false,
    });
    expect(backConcaveArcSmallFrameAtTick("WYNAUT", 13, 32, -1)).toMatchObject({
      x2: 1, y2: 0, data6: 1, data7Before: 256, data7: 0, strictOverflow: true,
      repeatWillRestart: true, sineIndex: null, callback: "Anim_ConcaveArcSmall_Twice",
    });
    expect(backConcaveArcSmallFrameAtTick("WYNAUT", 13, 33, -1)).toMatchObject({
      x2: 0, y2: 0, data6: 1, data7Before: 0, data7: 8, strictOverflow: false,
    });
    const twiceTerminal = backConcaveArcSmallFrameAtTick("WYNAUT", 13, 65, -1)!;
    expect(twiceTerminal).toMatchObject({
      x2: 0, y2: 0, data6: 1, data7Before: 256, data7: 256, strictOverflow: true,
      repeatWillRestart: false, sineIndex: null, callback: "WaitAnimEnd",
    });
    expect(backConcaveArcSmallFrameAtTick("WYNAUT", 13, 999, -1)).toEqual(twiceTerminal);
    expect(backConcaveArcSmallFrameAtTick("PICHU", 19, 16, 1)).toMatchObject({
      x2: -2, y2: 2, data3: 6, data6: 1, data7Before: 96, data7: 102,
      sineIndex: 96, reflectedY: true, callback: "Anim_ConcaveArcSmall",
    });
    expect(backConcaveArcSmallFrameAtTick("PICHU", 19, 43, 1)).toMatchObject({
      x2: 0, y2: 0, data6: 1, data7Before: 258, data7: 258,
      strictOverflow: true, callback: "WaitAnimEnd",
    });
    expect(backConcaveArcSmallFrameAtTick("MARILL", 21, 64, 1)).toMatchObject({
      data3: 4, data6: 1, data7Before: 256, data7: 256,
      strictOverflow: true, callback: "WaitAnimEnd",
    });
    expect(backConcaveArcSmallWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backConcaveArcSmallWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backConcaveArcSmallTerminalSpriteData("WYNAUT", 13, 0, 360)).toEqual([0, 0, 360, 8, 6, 4, 1, 256]);
    expect(backConcaveArcSmallTerminalSpriteData("PICHU", 19, 0, 172)).toEqual([0, 0, 172, 6, 6, 4, 1, 258]);
    expect(backConcaveArcSmallTerminalSpriteData("MARILL", 21, 0, 183)).toEqual([0, 0, 183, 4, 6, 4, 1, 256]);
  });

  it("rejects invalid input and adjacent send-out families", () => {
    expect(backConcaveArcSmallFrameAtTick("WYNAUT", 13, -1)).toBeNull();
    expect(backConcaveArcSmallFrameAtTick("PICHU", 19, 0.5)).toBeNull();
    expect(backConcaveArcSmallFrameAtTick("ONIX", 0, 0)).toBeNull();
    expect(backConcaveArcSmallFrameAtTick("NOT_A_SPECIES", 1, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_CONCAVE_ARC_SMALL).toEqual([
      "ANIM_CONCAVE_ARC_SMALL_TWICE", "ANIM_CONCAVE_ARC_SMALL", "ANIM_CONCAVE_ARC_SMALL_SLOW",
    ]);
  });
});
