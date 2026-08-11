import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  BACK_V_STRETCH_FACTORY_SPECIES,
  BACK_V_STRETCH_OUTSIDE_FACTORY_SPECIES,
  BACK_V_STRETCH_SPECIES,
  BACK_V_STRETCH_VARIANTS,
  backSendOutTerminalSpriteData,
  backVerticalStretchFrameAtTick,
  backVerticalStretchWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const V_STRETCH_SPECIES = [
  "BELLSPROUT", "WEEPINBELL", "VICTREEBEL", "GRIMER", "TANGELA", "CHINCHOU", "WOOPER",
  "WOBBUFFET", "WURMPLE", "BARBOACH", "GULPIN", "SWALOT", "SEVIPER", "CRADILY",
] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_V_STRETCH back send-out reducer", () => {
  it("pins the generated 14/14/0 Factory census and every sibling route", () => {
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    const generated = Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_V_STRETCH")
      .map(([species]) => species);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(BACK_V_STRETCH_SPECIES).toEqual(V_STRETCH_SPECIES);
    expect(BACK_V_STRETCH_FACTORY_SPECIES).toEqual(V_STRETCH_SPECIES);
    expect(BACK_V_STRETCH_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(generated).toEqual(V_STRETCH_SPECIES);
    expect(V_STRETCH_SPECIES.every((species) => factory.has(species))).toBe(true);
    for (const species of V_STRETCH_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(10);
      expect([0, 24, 17].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual([
          "ANIM_V_STRETCH_BOTH_ENDS_TWICE",
          "ANIM_V_STRETCH_BOTH_ENDS",
          "ANIM_V_STRETCH_BOTH_ENDS_SLOW",
        ]);
    }
  });

  it("uses party nature for the initializer triple and shared callback", () => {
    expect(BACK_V_STRETCH_VARIANTS).toEqual({
      twice: {
        selector: "ANIM_V_STRETCH_BOTH_ENDS_TWICE", callback: "Anim_VerticalStretchBothEnds_Twice",
        sourceId: 116, natureMod: 0, duration: 20, amplitude: 70, runs: 2, accepted: true,
      },
      normal: {
        selector: "ANIM_V_STRETCH_BOTH_ENDS", callback: "Anim_VerticalStretchBothEnds",
        sourceId: 115, natureMod: 1, duration: 30, amplitude: 60, runs: 1, accepted: true,
      },
      slow: {
        selector: "ANIM_V_STRETCH_BOTH_ENDS_SLOW", callback: "Anim_VerticalStretchBothEnds_Slow",
        sourceId: 90, natureMod: 2, duration: 40, amplitude: 40, runs: 1, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("CHINCHOU", 0)).toMatchObject({
      backAnimSetIndex: 10, backAnimSet: "BACK_ANIM_V_STRETCH", natureMod: 0,
      selector: "ANIM_V_STRETCH_BOTH_ENDS_TWICE",
    });
    expect(selectBackSendOutAnimation("WURMPLE", 24)).toMatchObject({
      backAnimSetIndex: 10, backAnimSet: "BACK_ANIM_V_STRETCH", natureMod: 1,
      selector: "ANIM_V_STRETCH_BOTH_ENDS",
    });
    expect(selectBackSendOutAnimation("WEEPINBELL", 17)).toMatchObject({
      backAnimSetIndex: 10, backAnimSet: "BACK_ANIM_V_STRETCH", natureMod: 2,
      selector: "ANIM_V_STRETCH_BOTH_ENDS_SLOW",
    });
  });

  it("pins source constants, initializer-first cadence, affine lifecycle, and task restoration", () => {
    const source = readFileSync(new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8");
    const constants = readFileSync(new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8");
    const trig = readFileSync(new URL("../../reference/pokeemerald/src/trig.c", import.meta.url), "utf8");
    expect(constants).toMatch(/^#define BACK_ANIM_V_STRETCH\s+11$/m);
    expect(constants).toMatch(/^#define ANIM_V_STRETCH_BOTH_ENDS_SLOW\s+90$/m);
    expect(constants).toMatch(/^#define ANIM_V_STRETCH_BOTH_ENDS\s+115$/m);
    expect(constants).toMatch(/^#define ANIM_V_STRETCH_BOTH_ENDS_TWICE\s+116$/m);
    expect(trig).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(source).toMatch(/\(BACK_ANIM_V_STRETCH - 1\) \* 3\]\s*= ANIM_V_STRETCH_BOTH_ENDS_TWICE, ANIM_V_STRETCH_BOTH_ENDS, ANIM_V_STRETCH_BOTH_ENDS_SLOW,/);
    const helperStart = source.indexOf("static void VerticalStretchBothEnds(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_VerticalStretchBothEnds_Slow(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/sprite->data\[5\] > sprite->data\[6\][\s\S]*?sprite->y2 = 0;[\s\S]*?sprite->data\[5\] = 0;[\s\S]*?HandleSetAffineData\(sprite, 256, 256, 0\);/);
    expect(helper).toMatch(/sprite->data\[4\] <= 1[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?sprite->data\[4\]--;[\s\S]*?sprite->data\[7\] = 0;/);
    expect(helper).toMatch(/index2 = \(sprite->data\[5\] \* 128\) \/ sprite->data\[6\];[\s\S]*?sprite->data\[7\] \+= 51;[\s\S]*?index1 = sprite->data\[7\] & 0xFF;/);
    expect(helper).toMatch(/if \(!sprite->sDontFlip\)[\s\S]*?xScale = -256 - Sin\(index2, 16\);[\s\S]*?xScale = 256 \+ Sin\(index2, 16\);/);
    expect(helper).toMatch(/yScale = 256 - Sin\(index2, amplitude\) - Sin\(index1, amplitude \/ 5\);[\s\S]*?SetAffineData\(sprite, xScale, yScale, 0\);[\s\S]*?sprite->data\[5\]\+\+;/);
    for (const [callback, duration, amplitude, runs] of [
      ["Anim_VerticalStretchBothEnds_Twice", 20, 70, 2],
      ["Anim_VerticalStretchBothEnds", 30, 60, 1],
      ["Anim_VerticalStretchBothEnds_Slow", 40, 40, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toMatch(/if \(sprite->data\[2\] == 0\)[\s\S]*?sprite->data\[2\] = 1;[\s\S]*?HandleStartAffineAnim\(sprite\);/);
      expect(initializer).toContain(`sprite->data[4] = ${runs};`);
      expect(initializer).toContain(`sprite->data[6] = ${duration};`);
      expect(initializer).toContain(`sprite->data[3] = ${amplitude};`);
      expect(initializer).toMatch(/sprite->data\[7\] = 0;[\s\S]*?VerticalStretchBothEnds\(sprite\);/);
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(backSendOutTerminalSpriteData(0, 170)).toEqual([0, 0, 170, 0, 0, 0, 0, 0]);
  });

  it.each([
    ["CHINCHOU", 0, "ANIM_V_STRETCH_BOTH_ENDS_TWICE", 116, 20, 70, 2, 43],
    ["WURMPLE", 24, "ANIM_V_STRETCH_BOTH_ENDS", 115, 30, 60, 1, 31],
    ["WEEPINBELL", 17, "ANIM_V_STRETCH_BOTH_ENDS_SLOW", 90, 40, 40, 1, 41],
  ] as const)("models %s through affine cycles and strict terminal cleanup", (
    species, natureId, selector, sourceId, duration, amplitude, runs, terminalTick,
  ) => {
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const frame = backVerticalStretchFrameAtTick(species, natureId, tick, -1)!;
      expect(frame.data0).toBe(0);
      expect(frame.data1).toBe(-1);
      expect(frame.data2).toBe(1);
      expect(frame.data3).toBe(amplitude);
      expect(frame.data6).toBe(duration);
      expect(frame.selector).toBe(selector);
      expect(frame.sourceId).toBe(sourceId);
      expect(frame.duration).toBe(duration);
      expect(frame.amplitude).toBe(amplitude);
      expect(frame.runs).toBe(runs);
      expect(frame.initializerCalled).toBe(tick === 0);
      expect(frame.handleStartAffineAnimCalls).toBe(tick === 0 ? 1 : 0);
      expect(frame.callbackInvokedByInitializer).toBe(true);
      expect(frame.normalBackDontFlip).toBe(true);
      expect(frame.tryFlipXCalls).toBe(0);
      expect(frame.resetSpriteAfterAnim).toBe(false);
      expect(frame.affineWriteCount).toBe(1);
      expect(frame.affineMode).toBe("double");
      expect(frame.callback).toBe(selector === "ANIM_V_STRETCH_BOTH_ENDS_TWICE"
        ? "Anim_VerticalStretchBothEnds_Twice"
        : selector === "ANIM_V_STRETCH_BOTH_ENDS"
          ? "Anim_VerticalStretchBothEnds"
          : "Anim_VerticalStretchBothEnds_Slow");
    }

    const middle = backVerticalStretchFrameAtTick(species, natureId, Math.trunc(duration / 4), -1)!;
    expect(middle.data7).toBe(51);
    expect(middle.index1).toBe(51);
    expect(middle.index2).toBe(Math.trunc((Math.trunc(duration / 4) * 128) / duration));
    expect(middle.affineWrites[0]).toEqual({
      xScale: 256 + gbaSin(middle.index2!, 16),
      yScale: 256 - gbaSin(middle.index2!, amplitude) - gbaSin(51, Math.trunc(amplitude / 5)),
      rotationSigned: 0, rotationU16: 0,
    });

    if (runs === 2) {
      const boundary = backVerticalStretchFrameAtTick(species, natureId, 21, -1)!;
      expect(boundary).toMatchObject({ phaseBoundary: true, data4: 1, data5: 0, data7: 0, x2: 0, y2: 0, callback: selector === "ANIM_V_STRETCH_BOTH_ENDS_TWICE" ? "Anim_VerticalStretchBothEnds_Twice" : "" });
      expect(boundary.affineWrites).toEqual([{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }]);
    }

    const terminal = backVerticalStretchFrameAtTick(species, natureId, terminalTick, -1)!;
    expect(terminal).toMatchObject({
      x2: 0, y2: 0, data1: -1, data2: 1, data5: 0,
      data4: 1, index2: null, phaseBoundary: true,
      resetSpriteAfterAnim: true, affineMode: "normal", callback: "WaitAnimEnd",
      affineWrites: [{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }],
    });
    expect(backVerticalStretchFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backVerticalStretchWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalStretchWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid state and keeps neighboring back families outside this reducer", () => {
    expect(backVerticalStretchFrameAtTick("CHINCHOU", 0, -1)).toBeNull();
    expect(backVerticalStretchFrameAtTick("CHINCHOU", 0, 1.5)).toBeNull();
    expect(backVerticalStretchFrameAtTick("CHINCHOU", 0, 0, 0.5)).toBeNull();
    expect(backVerticalStretchFrameAtTick("ARBOK", 3, 0)).toBeNull();
    expect(backVerticalStretchFrameAtTick("NOT_A_SPECIES", 17, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_V_STRETCH).toEqual([
      "ANIM_V_STRETCH_BOTH_ENDS_TWICE", "ANIM_V_STRETCH_BOTH_ENDS", "ANIM_V_STRETCH_BOTH_ENDS_SLOW",
    ]);
  });
});
