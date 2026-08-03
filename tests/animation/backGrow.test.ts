import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_GROW_FACTORY_SPECIES,
  BACK_GROW_OUTSIDE_FACTORY_SPECIES,
  BACK_GROW_SPECIES,
  BACK_GROW_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backGrowFrameAtTick,
  backGrowInStagesFrameAtTick,
  backGrowWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const GROW_SPECIES = ["WIGGLYTUFF", "KOFFING", "WEEZING"] as const;

describe("BACK_ANIM_GROW back send-out reducer", () => {
  it("pins the complete generated census and exactly the three Factory mappings", () => {
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
    expect(BACK_GROW_SPECIES).toEqual(GROW_SPECIES);
    expect(BACK_GROW_FACTORY_SPECIES).toEqual(GROW_SPECIES);
    expect(BACK_GROW_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(BACK_GROW_SPECIES.every((species) => factory.has(species))).toBe(true);
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_GROW"))
      .toEqual(GROW_SPECIES.map((species) => [species, "BACK_ANIM_GROW"]));
  });

  it("routes the live species plus party-nature seam to all three callbacks", () => {
    expect(BACK_GROW_VARIANTS).toEqual({
      twice: {
        selector: "ANIM_GROW_TWICE", callback: "Anim_Grow_Twice",
        sourceId: 108, natureMod: 0, speed: 8, runs: 2, accepted: true,
      },
      normal: {
        selector: "ANIM_GROW", callback: "Anim_Grow",
        sourceId: 107, natureMod: 1, speed: 4, runs: 1, accepted: true,
      },
      inStages: {
        selector: "ANIM_GROW_IN_STAGES", callback: "Anim_GrowInStages",
        sourceId: 58, natureMod: 2, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("WEEZING", 3)).toMatchObject({
      species: "WEEZING", backAnimSetIndex: 5, backAnimSet: "BACK_ANIM_GROW",
      natureMod: 0, selector: "ANIM_GROW_TWICE",
    });
    expect(selectBackSendOutAnimation("WIGGLYTUFF", 7)).toMatchObject({
      species: "WIGGLYTUFF", backAnimSetIndex: 5, backAnimSet: "BACK_ANIM_GROW",
      natureMod: 1, selector: "ANIM_GROW",
    });
    // Koffing's Modest path is legal staging only; no set-6 Factory record is Modest.
    expect(selectBackSendOutAnimation("KOFFING", 15)).toMatchObject({
      species: "KOFFING", backAnimSetIndex: 5, backAnimSet: "BACK_ANIM_GROW",
      natureMod: 2, selector: "ANIM_GROW_IN_STAGES",
    });
    expect(frontierMons.entries.find(({ index }) => index === 405)).toMatchObject({
      index: 405, species: "SPECIES_WEEZING", nature: "NATURE_ADAMANT",
    });
    expect(frontierMons.entries.find(({ index }) => index === 207)).toMatchObject({
      index: 207, species: "SPECIES_WIGGLYTUFF", nature: "NATURE_RELAXED",
    });
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_WIGGLYTUFF" || species === "SPECIES_KOFFING" || species === "SPECIES_WEEZING"
    )).every(({ nature }) => nature !== "NATURE_MODEST")).toBe(true);
  });

  it("pins source-relative initializers, shared Grow, and distinct staged logic", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_GROW\s+6$/m);
    expect(constants).toMatch(/^#define ANIM_GROW_IN_STAGES\s+58$/m);
    expect(constants).toMatch(/^#define ANIM_GROW\s+107$/m);
    expect(constants).toMatch(/^#define ANIM_GROW_TWICE\s+108$/m);
    const growStart = source.indexOf("static void Grow(struct Sprite *sprite)\n{");
    const growEnd = source.indexOf("static void Anim_Grow(struct Sprite *sprite)\n{", growStart);
    const grow = source.slice(growStart, growEnd);
    expect(grow).toMatch(/sprite->data\[7\] > 255[\s\S]*?sprite->data\[5\] <= 1[\s\S]*?ResetSpriteAfterAnim/);
    expect(grow).toMatch(/sprite->data\[7\] \+= sprite->data\[6\][\s\S]*?sprite->data\[7\] = 256[\s\S]*?Sin\(sprite->data\[7\] \/ 2, 64\)/);
    for (const [callback, speed, runs] of [
      ["Anim_Grow_Twice", 8, 2], ["Anim_Grow", 4, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const entry = source.slice(start, end);
      expect(entry).toContain("TryFlipX(sprite);");
      expect(entry).toContain("HandleStartAffineAnim(sprite);");
      expect(entry).toContain(`sprite->data[6] = ${speed};`);
      expect(entry).toContain(`sprite->data[5] = ${runs};`);
      expect(entry).toContain("Grow(sprite);");
    }
    const stagedStart = source.indexOf("static void Anim_GrowInStages(struct Sprite *sprite)\n{");
    const stagedEnd = source.indexOf("\n}\n", stagedStart) + 3;
    const staged = source.slice(stagedStart, stagedEnd);
    expect(staged).toMatch(/TryFlipX\(sprite\);[\s\S]*?sprite->data\[6\]--;[\s\S]*?\(8 \* sprite->data\[6\]\) \/ 20/);
    expect(staged).toMatch(/Sin\(sprite->data\[7\] - scale, 64\)[\s\S]*?Cos\(sprite->data\[7\], 64\)/);
    expect(staged).toMatch(/sprite->data\[7\] = 64;[\s\S]*?HandleSetAffineData\(sprite, 256, 256, 0\);[\s\S]*?ResetSpriteAfterAnim/);
  });

  it("keeps the shared Grow cycle reset and terminal restoration source-order exact", () => {
    const twiceStart = backGrowFrameAtTick("WEEZING", 3, 0, -1)!;
    expect(twiceStart).toMatchObject({
      data1: -1, data2: 1, data4: 0, data5: 2, data6: 8, data7: 8,
      selector: "ANIM_GROW_TWICE", sourceId: 108, speed: 8, runs: 2,
      xScale: 250, yScale: 250, initializerCalled: true,
      handleStartAffineAnimCalls: 1, affineMode: "double", affineWriteCount: 1,
      normalBackDontFlip: true, tryFlipXCalls: 2, callback: "Anim_Grow_Twice",
    });
    expect(backGrowFrameAtTick("WEEZING", 3, 32, -1)).toMatchObject({
      data5: 1, data7: 0, affineWriteCount: 0, callback: "Anim_Grow_Twice",
    });
    const terminal = backGrowFrameAtTick("WEEZING", 3, 65, -1)!;
    expect(terminal).toMatchObject({
      data5: 1, data6: 8, data7: 256, xScale: 256, yScale: 256,
      initializerCalled: false, handleStartAffineAnimCalls: 0,
      resetSpriteAfterAnim: true, affineMode: "normal", affineWriteCount: 1,
      callback: "WaitAnimEnd",
    });
    expect(backGrowFrameAtTick("WEEZING", 3, 999, -1)).toEqual(terminal);
    expect(backGrowFrameAtTick("WIGGLYTUFF", 7, 64, -1)).toMatchObject({
      data5: 1, data6: 4, data7: 256, resetSpriteAfterAnim: true,
      affineMode: "normal", callback: "WaitAnimEnd",
    });
  });

  it("keeps GrowInStages independent, including pauses and terminal double-write order", () => {
    const start = backGrowInStagesFrameAtTick("KOFFING", 15, 0, -1)!;
    expect(start).toMatchObject({
      data1: -1, data2: 1, data4: 0, data5: 0, data6: 0, data7: 2,
      selector: "ANIM_GROW_IN_STAGES", sourceId: 58, speed: null, runs: null,
      xScale: 256, yScale: 256, affineMode: "double", affineWriteCount: 1,
      tryFlipXCalls: 2, callback: "Anim_GrowInStages",
    });
    expect(backGrowInStagesFrameAtTick("KOFFING", 15, 26, -1)).toMatchObject({
      data5: 1, data6: 0, data7: 14,
    });
    const terminal = backGrowInStagesFrameAtTick("KOFFING", 15, 114, -1)!;
    expect(terminal).toMatchObject({
      data5: 3, data6: 0, data7: 66, resetSpriteAfterAnim: true,
      initializerCalled: false, handleStartAffineAnimCalls: 0,
      affineMode: "normal", affineWriteCount: 2, callback: "WaitAnimEnd",
    });
    expect(terminal.terminalAffineWriteOrdering).toEqual([
      "HandleSetAffineData(256, 256, 0)", "HandleSetAffineData(256, 256, 0)",
    ]);
    expect(backGrowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backGrowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid inputs and keeps neighboring back families out of this reducer", () => {
    expect(backGrowFrameAtTick("WEEZING", 3, -1)).toBeNull();
    expect(backGrowFrameAtTick("WEEZING", 3, 1.5)).toBeNull();
    expect(backGrowInStagesFrameAtTick("KOFFING", 15, Number.NaN)).toBeNull();
    expect(backGrowFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backGrowInStagesFrameAtTick("NOT_A_SPECIES", 15, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_GROW).toEqual([
      "ANIM_GROW_TWICE", "ANIM_GROW", "ANIM_GROW_IN_STAGES",
    ]);
  });
});
