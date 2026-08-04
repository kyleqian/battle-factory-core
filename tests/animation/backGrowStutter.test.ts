import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_GROW_STUTTER_FACTORY_SPECIES,
  BACK_GROW_STUTTER_OUTSIDE_FACTORY_SPECIES,
  BACK_GROW_STUTTER_SPECIES,
  BACK_GROW_STUTTER_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backGrowStutterFrameAtTick,
  backGrowStutterWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const STUTTER_SPECIES = ["ALAKAZAM", "MEWTWO", "QWILFISH", "EXPLOUD", "RAYQUAZA"] as const;

describe("BACK_ANIM_GROW_STUTTER back send-out reducer", () => {
  it("pins the exact generated five-mapping census and Factory split", () => {
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25,
      selectorVariants: 75,
      speciesMappings: 386,
      factoryMappings: 376,
      outsideFactoryMappings: 10,
    });
    expect(BACK_GROW_STUTTER_SPECIES).toEqual(STUTTER_SPECIES);
    expect(BACK_GROW_STUTTER_FACTORY_SPECIES).toEqual(["ALAKAZAM", "QWILFISH", "EXPLOUD"]);
    expect(BACK_GROW_STUTTER_OUTSIDE_FACTORY_SPECIES).toEqual(["MEWTWO", "RAYQUAZA"]);
    expect(BACK_GROW_STUTTER_SPECIES.every((species) => (
      factory.has(species) === BACK_GROW_STUTTER_FACTORY_SPECIES.includes(species)
    ))).toBe(true);
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_GROW_STUTTER"))
      .toEqual(STUTTER_SPECIES.map((species) => [species, "BACK_ANIM_GROW_STUTTER"]));
  });

  it("routes every species through the party-nature selector triple", () => {
    expect(BACK_GROW_STUTTER_VARIANTS).toEqual({
      twice: {
        selector: "ANIM_GROW_STUTTER_TWICE", callback: "Anim_GrowStutter_Twice",
        sourceId: 119, natureMod: 0, duration: 20, amplitude: 70, runs: 2, accepted: true,
      },
      normal: {
        selector: "ANIM_GROW_STUTTER", callback: "Anim_GrowStutter",
        sourceId: 120, natureMod: 1, duration: 30, amplitude: 60, runs: 1, accepted: true,
      },
      slow: {
        selector: "ANIM_GROW_STUTTER_SLOW", callback: "Anim_GrowStutter_Slow",
        sourceId: 101, natureMod: 2, duration: 40, amplitude: 40, runs: 1, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("QWILFISH", 3)).toMatchObject({
      species: "QWILFISH", backAnimSetIndex: 12, backAnimSet: "BACK_ANIM_GROW_STUTTER",
      natureMod: 0, selector: "ANIM_GROW_STUTTER_TWICE",
    });
    expect(selectBackSendOutAnimation("EXPLOUD", 24)).toMatchObject({
      species: "EXPLOUD", backAnimSetIndex: 12, backAnimSet: "BACK_ANIM_GROW_STUTTER",
      natureMod: 1, selector: "ANIM_GROW_STUTTER",
    });
    expect(selectBackSendOutAnimation("ALAKAZAM", 15)).toMatchObject({
      species: "ALAKAZAM", backAnimSetIndex: 12, backAnimSet: "BACK_ANIM_GROW_STUTTER",
      natureMod: 2, selector: "ANIM_GROW_STUTTER_SLOW",
    });
    for (const species of STUTTER_SPECIES) {
      expect(selectBackSendOutAnimation(species, 3)?.backAnimSet).toBe("BACK_ANIM_GROW_STUTTER");
    }
  });

  it("pins source ids, callback initializers, and the shared source formula", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_GROW_STUTTER\s+13$/m);
    expect(constants).toMatch(/^#define ANIM_GROW_STUTTER_SLOW\s+101$/m);
    expect(constants).toMatch(/^#define ANIM_GROW_STUTTER_TWICE\s+119$/m);
    expect(constants).toMatch(/^#define ANIM_GROW_STUTTER\s+120$/m);
    const helperStart = source.indexOf("static void GrowStutter(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_GrowStutter_Slow", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/sprite->data\[5\] > sprite->data\[6\]/);
    expect(helper).toMatch(/sprite->data\[7\] \+= 51/);
    expect(helper).toMatch(/256 - Sin\(index1, amplitude \/ 5 \* 2\) - Sin\(index2, amplitude\)/);
    expect(helper).toMatch(/256 - Sin\(index1, amplitude \/ 5\) - Sin\(index2, amplitude\)/);
    for (const [callback, duration, amplitude, runs] of [
      ["Anim_GrowStutter_Twice", 20, 70, 2],
      ["Anim_GrowStutter", 30, 60, 1],
      ["Anim_GrowStutter_Slow", 40, 40, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const entry = source.slice(start, end);
      expect(entry).toContain("HandleStartAffineAnim(sprite);");
      expect(entry).toContain(`sprite->data[4] = ${runs};`);
      expect(entry).toContain(`sprite->data[6] = ${duration};`);
      expect(entry).toContain(`sprite->data[3] = ${amplitude};`);
      expect(entry).toContain("GrowStutter(sprite);");
      expect(entry).not.toContain("TryFlipX(sprite);");
    }
  });

  it("models initializer-first affine writes, the twice boundary, and terminal restore", () => {
    const start = backGrowStutterFrameAtTick("QWILFISH", 3, 0, -1)!;
    expect(start).toMatchObject({
      data1: -1, data2: 1, data3: 70, data4: 2, data5: 1, data6: 20, data7: 0,
      index1: 0, index2: 0, xScale: 256, yScale: 256,
      selector: "ANIM_GROW_STUTTER_TWICE", sourceId: 119,
      initializerCalled: true, handleStartAffineAnimCalls: 1,
      affineMode: "double", affineWriteCount: 1, tryFlipXCalls: 0,
      resetSpriteAfterAnim: false, callback: "Anim_GrowStutter_Twice",
    });
    const midStutter = backGrowStutterFrameAtTick("QWILFISH", 3, 5, -1)!;
    expect(midStutter.xScale).not.toBe(midStutter.yScale);
    expect(midStutter.affineWrites).toEqual([{
      xScale: midStutter.xScale,
      yScale: midStutter.yScale,
      rotationSigned: 0,
      rotationU16: 0,
    }]);
    expect(backGrowStutterFrameAtTick("QWILFISH", 3, 21, -1)).toMatchObject({
      data4: 1, data5: 0, data7: 0, xScale: 256, yScale: 256,
      affineWriteCount: 1, affineMode: "double", callback: "Anim_GrowStutter_Twice",
    });
    expect(backGrowStutterFrameAtTick("QWILFISH", 3, 43, -1)).toMatchObject({
      data4: 1, data5: 0, data7: 510, xScale: 256, yScale: 256,
      affineWriteCount: 1, affineMode: "normal", resetSpriteAfterAnim: true,
      callback: "WaitAnimEnd",
    });
    expect(backGrowStutterFrameAtTick("EXPLOUD", 24, 31, 1)).toMatchObject({
      data3: 60, data4: 1, data5: 0, data6: 30, data7: 714, affineMode: "normal",
      resetSpriteAfterAnim: true, callback: "WaitAnimEnd",
    });
    expect(backGrowStutterFrameAtTick("ALAKAZAM", 15, 41, 1)).toMatchObject({
      data3: 40, data4: 1, data5: 0, data6: 40, data7: 1020, affineMode: "normal",
      resetSpriteAfterAnim: true, callback: "WaitAnimEnd",
    });
    expect(backGrowStutterFrameAtTick("QWILFISH", 3, 999, -1)).toEqual(
      backGrowStutterFrameAtTick("QWILFISH", 3, 43, -1),
    );
    expect(backGrowStutterWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backGrowStutterWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid inputs and keeps neighboring back families out", () => {
    expect(backGrowStutterFrameAtTick("QWILFISH", 3, -1)).toBeNull();
    expect(backGrowStutterFrameAtTick("QWILFISH", 3, 1.5)).toBeNull();
    expect(backGrowStutterFrameAtTick("WEEZING", 3, 0)).toBeNull();
    expect(backGrowStutterFrameAtTick("NOT_A_SPECIES", 15, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_GROW_STUTTER).toEqual([
      "ANIM_GROW_STUTTER_TWICE", "ANIM_GROW_STUTTER", "ANIM_GROW_STUTTER_SLOW",
    ]);
  });
});
