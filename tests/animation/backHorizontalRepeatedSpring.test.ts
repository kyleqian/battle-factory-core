import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_H_SPRING_REPEATED_FACTORY_SPECIES,
  BACK_H_SPRING_REPEATED_OUTSIDE_FACTORY_SPECIES,
  BACK_H_SPRING_REPEATED_SPECIES,
  BACK_H_SPRING_REPEATED_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backHorizontalRepeatedSpringFrameAtTick,
  backHorizontalRepeatedSpringWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const REPEATED_SPECIES = ["LUVDISC", "CARVANHA"] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_H_SPRING_REPEATED back send-out reducer", () => {
  it("pins the complete generated census and exactly both Factory mappings", () => {
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
    expect(BACK_H_SPRING_REPEATED_SPECIES).toEqual(REPEATED_SPECIES);
    expect(BACK_H_SPRING_REPEATED_FACTORY_SPECIES).toEqual(REPEATED_SPECIES);
    expect(BACK_H_SPRING_REPEATED_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(BACK_H_SPRING_REPEATED_SPECIES.every((species) => factory.has(species))).toBe(true);
    expect(Object.entries(speciesToSet).filter(([, set]) => set === "BACK_ANIM_H_SPRING_REPEATED"))
      .toEqual(REPEATED_SPECIES.map((species) => [species, "BACK_ANIM_H_SPRING_REPEATED"]));
  });

  it("routes by species and party nature, with Hardy fast clearly staged", () => {
    expect(BACK_H_SPRING_REPEATED_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_H_REPEATED_SPRING_FAST", callback: "Anim_HorizontalRepeatedSpring_Fast",
        sourceId: 111, natureMod: 0, speed: 8, limit: 512, amplitude: 16, accepted: true,
      },
      normal: {
        selector: "ANIM_H_REPEATED_SPRING", callback: "Anim_HorizontalRepeatedSpring",
        sourceId: 112, natureMod: 1, speed: 8, limit: 512, amplitude: 8, accepted: true,
      },
      slow: {
        selector: "ANIM_H_REPEATED_SPRING_SLOW", callback: "Anim_HorizontalRepeatedSpring_Slow",
        sourceId: 63, natureMod: 2, speed: 4, limit: 256, amplitude: 16, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(getSpeciesBackAnimSet("LUVDISC")).toBe(3);
    expect(getSpeciesBackAnimSet("CARVANHA")).toBe(3);

    // Hardy/mod-0 is a staged legal nature selector, not a Factory-record
    // selector: both real records reach only normal or slow below.
    expect(selectBackSendOutAnimation("LUVDISC", 0)).toMatchObject({
      backAnimSetIndex: 3, backAnimSet: "BACK_ANIM_H_SPRING_REPEATED", natureMod: 0,
      selector: "ANIM_H_REPEATED_SPRING_FAST",
    });
    expect(selectBackSendOutAnimation("LUVDISC", 7)).toMatchObject({
      backAnimSetIndex: 3, backAnimSet: "BACK_ANIM_H_SPRING_REPEATED", natureMod: 1,
      selector: "ANIM_H_REPEATED_SPRING",
    });
    expect(selectBackSendOutAnimation("CARVANHA", 17)).toMatchObject({
      backAnimSetIndex: 3, backAnimSet: "BACK_ANIM_H_SPRING_REPEATED", natureMod: 2,
      selector: "ANIM_H_REPEATED_SPRING_SLOW",
    });
    expect(frontierMons.entries.find(({ index }) => index === 123)).toMatchObject({
      index: 123, label: "FRONTIER_MON_LUVDISC", species: "SPECIES_LUVDISC", nature: "NATURE_RELAXED",
    });
    expect(frontierMons.entries.find(({ index }) => index === 86)).toMatchObject({
      index: 86, label: "FRONTIER_MON_CARVANHA", species: "SPECIES_CARVANHA", nature: "NATURE_QUIET",
    });
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_LUVDISC" || species === "SPECIES_CARVANHA"
    )).map(({ nature }) => nature)).toEqual(["NATURE_QUIET", "NATURE_RELAXED"]);
  });

  it("pins the source-relative repeated helper, initializers, and shared task lifecycle", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    const spriteHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/sprite.h", import.meta.url), "utf8",
    );
    const trigSource = readFileSync(
      new URL("../../reference/pokeemerald/src/trig.c", import.meta.url), "utf8",
    );
    expect(spriteHeader).toMatch(/\/\*0x24\*\/ s16 x2, y2;/);
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(trigSource).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(constants).toMatch(/^#define BACK_ANIM_H_SPRING_REPEATED\s+4$/m);
    expect(constants).toMatch(/^#define ANIM_H_REPEATED_SPRING_SLOW\s+63$/m);
    expect(constants).toMatch(/^#define ANIM_H_REPEATED_SPRING_FAST\s+111$/m);
    expect(constants).toMatch(/^#define ANIM_H_REPEATED_SPRING\s+112$/m);

    const helperStart = source.indexOf("static void HorizontalRepeatedSpring(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_HorizontalRepeatedSpring_Slow(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(
      /sprite->data\[7\] > sprite->data\[5\][\s\S]*?sprite->x2 = 0;[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?HandleSetAffineData\(sprite, 256, 256, 0\);/,
    );
    expect(helper).toMatch(
      /sprite->x2 = Sin\(sprite->data\[7\] % 256, sprite->data\[4\]\);[\s\S]*?sprite->data\[7\] \+= sprite->data\[6\];[\s\S]*?xScale = Sin\(\(sprite->data\[7\] % 64\) \* 2, 128\);[\s\S]*?HandleSetAffineData\(sprite, 256 \+ xScale, 256, 0\);/,
    );
    expect(helper).not.toContain("TryFlipX");

    for (const [callback, speed, limit, amplitude] of [
      ["Anim_HorizontalRepeatedSpring_Fast", 8, 512, 16],
      ["Anim_HorizontalRepeatedSpring", 8, 512, 8],
      ["Anim_HorizontalRepeatedSpring_Slow", 4, 256, 16],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const entry = source.slice(start, end);
      expect(entry).toContain("if (sprite->data[2] == 0)");
      expect(entry).toContain("HandleStartAffineAnim(sprite);");
      expect(entry).toContain(`sprite->data[6] = ${speed};`);
      expect(entry).toContain(`sprite->data[5] = ${limit};`);
      expect(entry).toContain(`sprite->data[4] = ${amplitude};`);
      expect(entry).toContain("HorizontalRepeatedSpring(sprite);");
      expect(entry).not.toContain("TryFlipX");
    }
    const idsStart = source.indexOf("static const u8 sBackAnimationIds[] =");
    const idsEnd = source.indexOf("static const u8 sBackAnimNatureModTable", idsStart);
    expect(source.slice(idsStart, idsEnd)).toMatch(
      /\[\(BACK_ANIM_H_SPRING_REPEATED - 1\) \* 3\]\s*= ANIM_H_REPEATED_SPRING_FAST, ANIM_H_REPEATED_SPRING, ANIM_H_REPEATED_SPRING_SLOW,/,
    );
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
  });

  it.each([
    ["LUVDISC", 0, "ANIM_H_REPEATED_SPRING_FAST", 111, 8, 512, 16],
    ["LUVDISC", 7, "ANIM_H_REPEATED_SPRING", 112, 8, 512, 8],
    ["CARVANHA", 17, "ANIM_H_REPEATED_SPRING_SLOW", 63, 4, 256, 16],
  ] as const)("models %s nature %i through repeated affine writes and terminal", (species, natureId, selector, sourceId, speed, limit, amplitude) => {
    const active = backHorizontalRepeatedSpringFrameAtTick(species, natureId, 0, -1)!;
    expect(active).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2: 1,
      data4: amplitude, data5: limit, data6: speed, data7Before: 0, data7: speed,
      selector, sourceId, speed, limit, amplitude,
      xScale: 256 + gbaSin((speed % 64) * 2, 128), yScale: 256,
      initializerCalled: true, handleStartAffineAnimCalls: 1,
      callbackInvokedByInitializer: true, resetSpriteAfterAnim: false,
      normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 1,
      affineMode: "double", callback: expect.stringContaining("Anim_HorizontalRepeatedSpring"),
    });
    expect(active.affineWrites).toEqual([{
      xScale: active.xScale, yScale: 256, rotationSigned: 0, rotationU16: 0,
    }]);
    const lastActive = backHorizontalRepeatedSpringFrameAtTick(species, natureId, limit / speed, -1)!;
    expect(lastActive.data7Before).toBe(limit);
    expect(lastActive.x2).toBe(gbaSin(limit % 256, amplitude));
    expect(lastActive.xScale).toBe(256 + gbaSin(((limit + speed) % 64) * 2, 128));
    expect(lastActive.callback).toContain("Anim_HorizontalRepeatedSpring");
    const terminal = backHorizontalRepeatedSpringFrameAtTick(species, natureId, limit / speed + 1, -1)!;
    expect(terminal).toMatchObject({
      x2: 0, y2: 0, data1: -1, data2: 1, data7Before: limit + speed,
      data7: limit + speed, xScale: 256, yScale: 256,
      initializerCalled: false, handleStartAffineAnimCalls: 0,
      resetSpriteAfterAnim: true, tryFlipXCalls: 0, affineWriteCount: 1,
      affineMode: "normal", callback: "WaitAnimEnd",
    });
    expect(terminal.affineWrites).toEqual([{
      xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0,
    }]);
    expect(backHorizontalRepeatedSpringFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backHorizontalRepeatedSpringWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalRepeatedSpringWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, species === "LUVDISC" ? 370 : 86))
      .toEqual([0, 0, species === "LUVDISC" ? 370 : 86, 0, 0, 0, 0, 0]);
  });

  it("rejects invalid inputs and keeps neighboring back families out of this reducer", () => {
    expect(backHorizontalRepeatedSpringFrameAtTick("LUVDISC", 0, -1)).toBeNull();
    expect(backHorizontalRepeatedSpringFrameAtTick("LUVDISC", 0, 1.5)).toBeNull();
    expect(backHorizontalRepeatedSpringFrameAtTick("LUVDISC", 0, Number.NaN)).toBeNull();
    expect(backHorizontalRepeatedSpringFrameAtTick("LUVDISC", 0, 0, 0.5)).toBeNull();
    expect(backHorizontalRepeatedSpringFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backHorizontalRepeatedSpringFrameAtTick("SURSKIT", 0, 0)).toBeNull();
    expect(backHorizontalRepeatedSpringFrameAtTick("NOT_A_SPECIES", 17, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_H_SPRING_REPEATED).toEqual([
      "ANIM_H_REPEATED_SPRING_FAST", "ANIM_H_REPEATED_SPRING", "ANIM_H_REPEATED_SPRING_SLOW",
    ]);
  });
});
