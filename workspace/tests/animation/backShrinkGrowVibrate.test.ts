import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SHRINK_GROW_VIBRATE_FACTORY_SPECIES,
  BACK_SHRINK_GROW_VIBRATE_OUTSIDE_FACTORY_SPECIES,
  BACK_SHRINK_GROW_VIBRATE_SPECIES,
  BACK_SHRINK_GROW_VIBRATE_VARIANTS,
  backShrinkGrowVibrateFrameAtTick,
  backShrinkGrowVibrateTerminalSpriteData,
  backShrinkGrowVibrateWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const source = readFileSync(
  new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
);
const constants = readFileSync(
  new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
);

const NATURE_IDS = {
  naive: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_NAIVE"),
  docile: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_DOCILE"),
  lonely: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_LONELY"),
} as const;

describe("BACK_ANIM_SHRINK_GROW_VIBRATE source census and routing", () => {
  it("pins all 23 mappings, 22 Factory species, DEOXYS, and 70 records", () => {
    expect(BACK_SHRINK_GROW_VIBRATE_SPECIES).toHaveLength(23);
    expect(BACK_SHRINK_GROW_VIBRATE_FACTORY_SPECIES).toHaveLength(22);
    expect(BACK_SHRINK_GROW_VIBRATE_OUTSIDE_FACTORY_SPECIES).toEqual(["DEOXYS"]);
    expect(frontierMons.entries.filter(({ species }) =>
      BACK_SHRINK_GROW_VIBRATE_FACTORY_SPECIES.includes(species.replace(/^SPECIES_/, "")),
    )).toHaveLength(70);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toMatchObject({ backAnimSets: 25, selectorVariants: 75 });
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_SHRINK_GROW_VIBRATE).toEqual([
      "ANIM_SHRINK_GROW_VIBRATE_FAST",
      "ANIM_SHRINK_GROW_VIBRATE",
      "ANIM_SHRINK_GROW_VIBRATE_SLOW",
    ]);
    expect(BACK_SHRINK_GROW_VIBRATE_VARIANTS).toEqual({
      fast: { selector: "ANIM_SHRINK_GROW_VIBRATE_FAST", callback: "Anim_ShrinkGrowVibrate_Fast", sourceId: 133, natureMod: 0, cycle: 40, duration: 80, accepted: true },
      normal: { selector: "ANIM_SHRINK_GROW_VIBRATE", callback: "Anim_ShrinkGrowVibrate", sourceId: 134, natureMod: 1, cycle: 40, duration: 40, accepted: true },
      slow: { selector: "ANIM_SHRINK_GROW_VIBRATE_SLOW", callback: "Anim_ShrinkGrowVibrate_Slow", sourceId: 135, natureMod: 2, cycle: 80, duration: 80, accepted: true },
    });
  });

  it("batch-routes every source sibling with the real nature table", () => {
    expect(NATURE_IDS).toEqual({ naive: 14, docile: 6, lonely: 1 });
    for (const species of BACK_SHRINK_GROW_VIBRATE_SPECIES) {
      expect(selectBackSendOutAnimation(species, NATURE_IDS.naive)).toMatchObject({
        backAnimSetIndex: 19, backAnimSet: "BACK_ANIM_SHRINK_GROW_VIBRATE",
        natureMod: 0, selector: "ANIM_SHRINK_GROW_VIBRATE_FAST",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.docile)).toMatchObject({
        natureMod: 1, selector: "ANIM_SHRINK_GROW_VIBRATE",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.lonely)).toMatchObject({
        natureMod: 2, selector: "ANIM_SHRINK_GROW_VIBRATE_SLOW",
      });
    }
  });

  it("pins source ids, initializer order, helper arithmetic, and no-flip route", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_SHRINK_GROW_VIBRATE\s+20$/m);
    expect(constants).toMatch(/^#define ANIM_SHRINK_GROW_VIBRATE_FAST\s+133$/m);
    expect(constants).toMatch(/^#define ANIM_SHRINK_GROW_VIBRATE\s+134$/m);
    expect(constants).toMatch(/^#define ANIM_SHRINK_GROW_VIBRATE_SLOW\s+135$/m);
    const helperStart = source.indexOf("static void ShrinkGrowVibrate(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_ShrinkGrowVibrate_Fast", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toContain("if (sprite->data[2] > sprite->data[7])");
    expect(helper).toContain("s16 index = ((u16)(sprite->data[2] % sprite->data[6] * 256) / sprite->data[6]) % 256;");
    expect(helper).toContain("if (sprite->data[2] % 2 == 0)");
    expect(helper).toContain("Sin(index, 32) + 256");
    expect(helper).toContain("Sin(index, 8) + 256");
    expect(helper).toContain("y = sinY / 8;");
    expect(helper).toContain("HandleSetAffineData(sprite, sprite->data[4], sprite->data[5], 0);");
    expect(helper).toContain("sprite->data[2]++;");
    for (const [callback, cycle, duration] of [
      ["Anim_ShrinkGrowVibrate_Fast", 40, 80],
      ["Anim_ShrinkGrowVibrate", 40, 40],
      ["Anim_ShrinkGrowVibrate_Slow", 80, 80],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain("if (sprite->data[2] == 0)");
      expect(initializer.indexOf("HandleStartAffineAnim(sprite);")).toBeLessThan(initializer.indexOf("sprite->y2 += 2;"));
      expect(initializer).toContain(`sprite->data[6] = ${cycle};`);
      expect(initializer).toContain(`sprite->data[7] = ${duration};`);
      expect(initializer).toContain("ShrinkGrowVibrate(sprite);");
      expect(initializer).not.toContain("TryFlipX");
    }
  });
});

describe("BACK_ANIM_SHRINK_GROW_VIBRATE reducer", () => {
  it("preserves alternating amplitude, signed division, and fast two-cycle timing", () => {
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 0, -1)).toMatchObject({
      y2: 0, data1: -1, data2: 1, data4: 256, data5: 256, data6: 40, data7: 80,
      counter: 0, index: 0, amplitude: 32, sinY: 0, initializerCalled: true,
      initializerY2Add: 2, handleStartAffineAnimCalls: 1, affineMode: "double",
      callback: "Anim_ShrinkGrowVibrate_Fast",
    });
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 10)).toMatchObject({
      y2: 4, index: 64, amplitude: 32, sinY: 32, xScale: 288, yScale: 288,
    });
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 30)).toMatchObject({
      y2: -4, index: 192, amplitude: 32, sinY: -32, xScale: 224, yScale: 224,
    });
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 50)).toMatchObject({
      index: 64, amplitude: 32, xScale: 288,
    });
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 11)).toMatchObject({
      amplitude: 8, initializerCalled: false, initializerY2Add: 0, handleStartAffineAnimCalls: 0,
    });
  });

  it.each([
    ["SHEDINJA", NATURE_IDS.naive, 40, 80, "Anim_ShrinkGrowVibrate_Fast"],
    ["RALTS", NATURE_IDS.docile, 40, 40, "Anim_ShrinkGrowVibrate"],
    ["ABRA", NATURE_IDS.lonely, 80, 80, "Anim_ShrinkGrowVibrate_Slow"],
  ] as const)("models %s strict terminal reset", (species, natureId, cycle, duration, callback) => {
    expect(backShrinkGrowVibrateFrameAtTick(species, natureId, duration)).toMatchObject({
      strictOverflow: false, cycle, duration, callback,
    });
    const terminal = backShrinkGrowVibrateFrameAtTick(species, natureId, duration + 1)!;
    expect(terminal).toMatchObject({
      y2: 0, data2: duration + 2, data4: 256, data5: 256, strictOverflow: true,
      index: null, amplitude: null, sinY: 0, resetSpriteAfterAnim: true,
      affineMode: "normal", callback: "WaitAnimEnd",
    });
    expect(backShrinkGrowVibrateFrameAtTick(species, natureId, 999)).toEqual(terminal);
  });

  it("models WaitAnimEnd/task restoration and rejects adjacent routes", () => {
    expect(backShrinkGrowVibrateWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShrinkGrowVibrateWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backShrinkGrowVibrateTerminalSpriteData("SHEDINJA", NATURE_IDS.naive, 0, 303))
      .toEqual([0, 0, 303, 0, 256, 256, 40, 80]);
    expect(backShrinkGrowVibrateTerminalSpriteData("RALTS", NATURE_IDS.docile, 0, 392))
      .toEqual([0, 0, 392, 0, 256, 256, 40, 40]);
    expect(backShrinkGrowVibrateFrameAtTick("ONIX", NATURE_IDS.naive, 0)).toBeNull();
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, -1)).toBeNull();
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 0.5)).toBeNull();
    expect(backShrinkGrowVibrateFrameAtTick("SHEDINJA", NATURE_IDS.naive, 0, 0.5)).toBeNull();
  });
});
