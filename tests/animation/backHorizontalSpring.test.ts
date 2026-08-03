import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_H_SPRING_FACTORY_SPECIES,
  BACK_H_SPRING_OUTSIDE_FACTORY_SPECIES,
  BACK_H_SPRING_SPECIES,
  BACK_H_SPRING_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backHorizontalSpringFrameAtTick,
  backHorizontalSpringWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const SPRING_SPECIES = ["SURSKIT", "FEEBAS"] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_H_SPRING back send-out reducer", () => {
  it("pins the complete generated census and exactly the two Factory mappings", () => {
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
    expect(BACK_H_SPRING_SPECIES).toEqual(SPRING_SPECIES);
    expect(BACK_H_SPRING_FACTORY_SPECIES).toEqual(SPRING_SPECIES);
    expect(BACK_H_SPRING_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(BACK_H_SPRING_SPECIES.every((species) => factory.has(species))).toBe(true);
    expect(Object.entries(speciesToSet).filter(([, set]) => set === "BACK_ANIM_H_SPRING"))
      .toEqual(SPRING_SPECIES.map((species) => [species, "BACK_ANIM_H_SPRING"]));
  });

  it("pins the fast/normal/slow selector triple and the staged-vs-real routes", () => {
    expect(BACK_H_SPRING_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_H_SPRING_FAST", callback: "Anim_HorizontalSpring_Fast", sourceId: 109,
        natureMod: 0, speed: 8, limit: 512, amplitude: 16, accepted: true,
      },
      normal: {
        selector: "ANIM_H_SPRING", callback: "Anim_HorizontalSpring", sourceId: 62,
        natureMod: 1, speed: 8, limit: 512, amplitude: 8, accepted: true,
      },
      slow: {
        selector: "ANIM_H_SPRING_SLOW", callback: "Anim_HorizontalSpring_Slow", sourceId: 110,
        natureMod: 2, speed: 4, limit: 256, amplitude: 16, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("SURSKIT", 0)).toMatchObject({
      backAnimSetIndex: 2, backAnimSet: "BACK_ANIM_H_SPRING", natureMod: 0,
      selector: "ANIM_H_SPRING_FAST",
    });
    expect(selectBackSendOutAnimation("SURSKIT", 7)).toMatchObject({
      backAnimSetIndex: 2, backAnimSet: "BACK_ANIM_H_SPRING", natureMod: 1,
      selector: "ANIM_H_SPRING",
    });
    expect(selectBackSendOutAnimation("FEEBAS", 1)).toMatchObject({
      backAnimSetIndex: 2, backAnimSet: "BACK_ANIM_H_SPRING", natureMod: 2,
      selector: "ANIM_H_SPRING_SLOW",
    });
    // Hardy/mod-0 is deliberately staged selector-table evidence: neither
    // real Factory species record reaches it.
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_SURSKIT" || species === "SPECIES_FEEBAS"
    )).map(({ nature }) => nature)).toEqual(["NATURE_LONELY", "NATURE_RELAXED"]);
    expect(getSpeciesBackAnimSet("SURSKIT")).toBe(2);
    expect(getSpeciesBackAnimSet("FEEBAS")).toBe(2);
  });

  it("pins the source entry points, affine helper, task lifecycle, and adjacent controls", () => {
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
    expect(constants).toMatch(/^#define BACK_ANIM_H_SPRING\s+3$/m);
    expect(constants).toMatch(/^#define BACK_ANIM_H_SPRING_REPEATED\s+4$/m);
    expect(constants).toMatch(/^#define ANIM_H_SPRING\s+62$/m);
    expect(constants).toMatch(/^#define ANIM_H_SPRING_FAST\s+109$/m);
    expect(constants).toMatch(/^#define ANIM_H_SPRING_SLOW\s+110$/m);
    expect(constants).toMatch(/^#define ANIM_H_REPEATED_SPRING_FAST\s+111$/m);

    const helperStart = source.indexOf("static void HorizontalSpring(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void HorizontalRepeatedSpring(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(
      /sprite->data\[7\] > sprite->data\[5\][\s\S]*?sprite->x2 = 0;[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?HandleSetAffineData\(sprite, 256, 256, 0\);/,
    );
    expect(helper).toMatch(
      /sprite->x2 = Sin\(sprite->data\[7\] % 256, sprite->data\[4\]\);[\s\S]*?sprite->data\[7\] \+= sprite->data\[6\];[\s\S]*?xScale = Sin\(sprite->data\[7\] % 128, 96\);[\s\S]*?HandleSetAffineData\(sprite, 256 \+ xScale, 256, 0\);/,
    );
    expect(helper).not.toContain("TryFlipX");
    for (const [callback, speed, limit, amplitude] of [
      ["Anim_HorizontalSpring", 8, 512, 8],
      ["Anim_HorizontalSpring_Fast", 8, 512, 16],
      ["Anim_HorizontalSpring_Slow", 4, 256, 16],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const entry = source.slice(start, end);
      expect(entry).toContain("if (sprite->data[2] == 0)");
      expect(entry).toContain("HandleStartAffineAnim(sprite);");
      expect(entry).toContain(`sprite->data[6] = ${speed};`);
      expect(entry).toContain(`sprite->data[5] = ${limit};`);
      expect(entry).toContain(`sprite->data[4] = ${amplitude};`);
      expect(entry).toContain("HorizontalSpring(sprite);");
      expect(entry).not.toContain("TryFlipX");
    }
    const idsStart = source.indexOf("static const u8 sBackAnimationIds[] =");
    const idsEnd = source.indexOf("static const u8 sBackAnimNatureModTable", idsStart);
    expect(source.slice(idsStart, idsEnd)).toMatch(
      /\[\(BACK_ANIM_H_SPRING - 1\) \* 3\]\s*= ANIM_H_SPRING_FAST, ANIM_H_SPRING, ANIM_H_SPRING_SLOW,/,
    );
    expect(source.slice(idsStart, idsEnd)).toMatch(
      /\[\(BACK_ANIM_H_SPRING_REPEATED - 1\) \* 3\]\s*= ANIM_H_REPEATED_SPRING_FAST, ANIM_H_REPEATED_SPRING, ANIM_H_REPEATED_SPRING_SLOW,/,
    );
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
  });

  it.each([
    ["SURSKIT", 0, "ANIM_H_SPRING_FAST", 109, 8, 512, 16],
    ["SURSKIT", 7, "ANIM_H_SPRING", 62, 8, 512, 8],
    ["FEEBAS", 1, "ANIM_H_SPRING_SLOW", 110, 4, 256, 16],
  ] as const)("models %s nature %i through active affine writes and terminal", (species, natureId, selector, sourceId, speed, limit, amplitude) => {
    const active = backHorizontalSpringFrameAtTick(species, natureId, 0, -1)!;
    expect(active).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2: 1,
      data4: amplitude, data5: limit, data6: speed, data7Before: 0, data7: speed,
      selector, sourceId, speed, limit, amplitude,
      xScale: 256 + gbaSin(speed % 128, 96), yScale: 256,
      initializerCalled: true, handleStartAffineAnimCalls: 1,
      callbackInvokedByInitializer: true, resetSpriteAfterAnim: false,
      normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 1,
      affineMode: "double", callback: expect.stringContaining("Anim_HorizontalSpring"),
    });
    expect(active.affineWrites).toEqual([{
      xScale: active.xScale, yScale: 256, rotationSigned: 0, rotationU16: 0,
    }]);
    const lastActive = backHorizontalSpringFrameAtTick(species, natureId, limit / speed, -1)!;
    expect(lastActive.data7Before).toBe(limit);
    expect(lastActive.x2).toBe(gbaSin((limit % 256), amplitude));
    expect(lastActive.callback).toContain("Anim_HorizontalSpring");
    const terminal = backHorizontalSpringFrameAtTick(species, natureId, limit / speed + 1, -1)!;
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
    expect(backHorizontalSpringFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backHorizontalSpringWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalSpringWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, species === "SURSKIT" ? 311 : 328))
      .toEqual([0, 0, species === "SURSKIT" ? 311 : 328, 0, 0, 0, 0, 0]);
  });

  it("keeps the H-spring reducer isolated from the adjacent repeated set", () => {
    expect(backHorizontalSpringFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backHorizontalSpringFrameAtTick("SURSKIT", 0, -1)).toBeNull();
    expect(backHorizontalSpringFrameAtTick("SURSKIT", 0, 0.5)).toBeNull();
    expect(backHorizontalSpringFrameAtTick("SURSKIT", 0, Number.NaN)).toBeNull();
    expect(backHorizontalSpringFrameAtTick("SURSKIT", 0, 0, 0.5)).toBeNull();
    expect(backHorizontalSpringFrameAtTick("NOT_A_SPECIES", 0, 0)).toBeNull();
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_H_SPRING_REPEATED"))
      .toEqual([["LUVDISC", "BACK_ANIM_H_SPRING_REPEATED"], ["CARVANHA", "BACK_ANIM_H_SPRING_REPEATED"]]);
    expect(backHorizontalSpringFrameAtTick("LUVDISC", 0, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_H_SPRING_REPEATED).toEqual([
      "ANIM_H_REPEATED_SPRING_FAST", "ANIM_H_REPEATED_SPRING", "ANIM_H_REPEATED_SPRING_SLOW",
    ]);
  });
});
