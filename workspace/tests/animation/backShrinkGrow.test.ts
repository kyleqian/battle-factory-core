import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SHRINK_GROW_FACTORY_SPECIES,
  BACK_SHRINK_GROW_OUTSIDE_FACTORY_SPECIES,
  BACK_SHRINK_GROW_SPECIES,
  BACK_SHRINK_GROW_VARIANTS,
  backSendOutTerminalSpriteData,
  backShrinkGrowFrameAtTick,
  backShrinkGrowWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const SHRINK_GROW_SPECIES = ["DITTO", "GLIGAR", "OCTILLERY"] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_SHRINK_GROW back send-out reducer", () => {
  it("pins the complete generated census and exactly the three Factory mappings", () => {
    const speciesToSet = selectorTables.speciesToBackAnimSet.species as Record<string, string>;
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
    expect(BACK_SHRINK_GROW_SPECIES).toEqual(SHRINK_GROW_SPECIES);
    expect(BACK_SHRINK_GROW_FACTORY_SPECIES).toEqual(SHRINK_GROW_SPECIES);
    expect(BACK_SHRINK_GROW_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(BACK_SHRINK_GROW_SPECIES.every((species) => factory.has(species))).toBe(true);
    expect(Object.entries(speciesToSet).filter(([, set]) => set === "BACK_ANIM_SHRINK_GROW"))
      .toEqual(SHRINK_GROW_SPECIES.map((species) => [species, "BACK_ANIM_SHRINK_GROW"]));
  });

  it("routes the live species plus party-nature seam to all three callbacks", () => {
    expect(BACK_SHRINK_GROW_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_SHRINK_GROW_FAST", callback: "Anim_ShrinkGrow_Fast",
        sourceId: 113, natureMod: 0, speed: 8, phaseLimit: 5, accepted: true,
      },
      normal: {
        selector: "ANIM_SHRINK_GROW", callback: "Anim_ShrinkGrow",
        sourceId: 19, natureMod: 1, speed: 8, phaseLimit: 3, accepted: true,
      },
      slow: {
        selector: "ANIM_SHRINK_GROW_SLOW", callback: "Anim_ShrinkGrow_Slow",
        sourceId: 114, natureMod: 2, speed: 4, phaseLimit: 3, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("DITTO", 0)).toMatchObject({
      species: "DITTO", backAnimSetIndex: 4, backAnimSet: "BACK_ANIM_SHRINK_GROW",
      natureMod: 0, selector: "ANIM_SHRINK_GROW_FAST",
    });
    expect(selectBackSendOutAnimation("OCTILLERY", 24)).toMatchObject({
      species: "OCTILLERY", backAnimSetIndex: 4, backAnimSet: "BACK_ANIM_SHRINK_GROW",
      natureMod: 1, selector: "ANIM_SHRINK_GROW",
    });
    // Gligar has no mod-2 Factory record; this is the legal staged selector.
    expect(selectBackSendOutAnimation("GLIGAR", 15)).toMatchObject({
      species: "GLIGAR", backAnimSetIndex: 4, backAnimSet: "BACK_ANIM_SHRINK_GROW",
      natureMod: 2, selector: "ANIM_SHRINK_GROW_SLOW",
    });
    expect(frontierMons.entries.find(({ index }) => index === 54)).toMatchObject({
      index: 54, label: "FRONTIER_MON_DITTO", species: "SPECIES_DITTO", nature: "NATURE_HARDY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 361)).toMatchObject({
      index: 361, label: "FRONTIER_MON_OCTILLERY_2", species: "SPECIES_OCTILLERY", nature: "NATURE_QUIRKY",
    });
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_DITTO" || species === "SPECIES_GLIGAR" || species === "SPECIES_OCTILLERY"
    )).every(({ nature }) => nature !== "NATURE_MODEST")).toBe(true);
  });

  it("pins the source-relative helper, initializer guards, and shared task lifecycle", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_SHRINK_GROW\s+5$/m);
    expect(constants).toMatch(/^#define ANIM_SHRINK_GROW\s+19$/m);
    expect(constants).toMatch(/^#define ANIM_SHRINK_GROW_FAST\s+113$/m);
    expect(constants).toMatch(/^#define ANIM_SHRINK_GROW_SLOW\s+114$/m);
    const helperStart = source.indexOf("static void ShrinkGrow(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_ShrinkGrow(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(
      /sprite->data\[2\] > \(128 \/ sprite->data\[6\]\) \* sprite->data\[7\][\s\S]*?HandleSetAffineData\(sprite, 256, 256, 0\);[\s\S]*?sprite->y2 = 0;[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;/,
    );
    expect(helper).toMatch(
      /s16 yScale = Sin\(sprite->data\[4\], 32\) \+ 256;[\s\S]*?posY = \(256 - yScale\) \/ 8;[\s\S]*?sprite->y2 = -\(posY\);[\s\S]*?HandleSetAffineData\(sprite, Sin\(sprite->data\[4\], 48\) \+ 256, yScale, 0\);[\s\S]*?sprite->data\[4\] = \(sprite->data\[4\] \+ sprite->data\[6\]\) & 0xFF;/,
    );
    for (const [callback, phaseLimit, speed] of [
      ["Anim_ShrinkGrow_Fast", 5, 8],
      ["Anim_ShrinkGrow", 3, 8],
      ["Anim_ShrinkGrow_Slow", 3, 4],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const entry = source.slice(start, end);
      expect(entry).toContain("if (sprite->data[2] == 0)");
      expect(entry).toContain("HandleStartAffineAnim(sprite);");
      expect(entry).toContain(`sprite->data[7] = ${phaseLimit};`);
      expect(entry).toContain(`sprite->data[6] = ${speed};`);
      expect(entry).toContain("ShrinkGrow(sprite);");
    }
    expect(BACK_SHRINK_GROW_VARIANTS.fast.sourceId).toBe(113);
    expect(BACK_SHRINK_GROW_VARIANTS.normal.sourceId).toBe(19);
    expect(BACK_SHRINK_GROW_VARIANTS.slow.sourceId).toBe(114);
  });

  it.each([
    ["DITTO", 0, "ANIM_SHRINK_GROW_FAST", 113, 8, 5],
    ["OCTILLERY", 24, "ANIM_SHRINK_GROW", 19, 8, 3],
    ["GLIGAR", 15, "ANIM_SHRINK_GROW_SLOW", 114, 4, 3],
  ] as const)("models %s through source affine writes and terminal restoration", (species, natureId, selector, sourceId, speed, phaseLimit) => {
    const duration = Math.floor(128 / speed) * phaseLimit;
    const active = backShrinkGrowFrameAtTick(species, natureId, 0, -1)!;
    expect(active).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2: 1, data4: speed, data5: 0,
      data6: speed, data7: phaseLimit, phaseBefore: 0, phaseAfter: speed,
      duration, selector, sourceId, speed, phaseLimit, xScale: 256, yScale: 256,
      initializerCalled: true, handleStartAffineAnimCalls: 1,
      callbackInvokedByInitializer: true, resetSpriteAfterAnim: false,
      normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 1,
      affineMode: "double", callback: expect.stringContaining("Anim_ShrinkGrow"),
    });
    expect(active.affineWrites).toEqual([{
      xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0,
    }]);
    const sample = backShrinkGrowFrameAtTick(species, natureId, 1, -1)!;
    expect(sample.xScale).toBe(256 + gbaSin(speed, 48));
    expect(sample.yScale).toBe(256 + gbaSin(speed, 32));
    expect(sample.y2).toBe(sample.yScale > 256 ? -Math.trunc((256 - sample.yScale) / 8) : 0);
    const lastActive = backShrinkGrowFrameAtTick(species, natureId, duration, -1)!;
    expect(lastActive.data2).toBe(duration + 1);
    expect(lastActive.callback).toContain("Anim_ShrinkGrow");
    const terminal = backShrinkGrowFrameAtTick(species, natureId, duration + 1, -1)!;
    expect(terminal).toMatchObject({
      x2: 0, y2: 0, data1: -1, data2: duration + 1,
      data4: ((duration + 1) * speed) & 0xff, data6: speed, data7: phaseLimit,
      xScale: 256, yScale: 256, initializerCalled: false,
      handleStartAffineAnimCalls: 0, resetSpriteAfterAnim: true,
      affineMode: "normal", callback: "WaitAnimEnd",
    });
    expect(backShrinkGrowFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backShrinkGrowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShrinkGrowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid inputs and keeps neighboring back families out of this reducer", () => {
    expect(backShrinkGrowFrameAtTick("DITTO", 0, -1)).toBeNull();
    expect(backShrinkGrowFrameAtTick("DITTO", 0, 1.5)).toBeNull();
    expect(backShrinkGrowFrameAtTick("DITTO", 0, Number.NaN)).toBeNull();
    expect(backShrinkGrowFrameAtTick("DITTO", 0, 0, 0.5)).toBeNull();
    expect(backShrinkGrowFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backShrinkGrowFrameAtTick("NOT_A_SPECIES", 17, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_SHRINK_GROW).toEqual([
      "ANIM_SHRINK_GROW_FAST", "ANIM_SHRINK_GROW", "ANIM_SHRINK_GROW_SLOW",
    ]);
    expect(backSendOutTerminalSpriteData(0, 132)).toEqual([0, 0, 132, 0, 0, 0, 0, 0]);
  });
});
