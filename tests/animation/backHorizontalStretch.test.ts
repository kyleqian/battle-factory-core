import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_H_STRETCH_FACTORY_SPECIES,
  BACK_H_STRETCH_OUTSIDE_FACTORY_SPECIES,
  BACK_H_STRETCH_SPECIES,
  BACK_H_STRETCH_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backHorizontalStretchFrameAtTick,
  backHorizontalStretchWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const H_STRETCH_SPECIES = ["MUK", "LILEEP"] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_H_STRETCH back send-out reducer", () => {
  it("pins the generated 2/2/0 Factory census and every sibling route", () => {
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    const generated = Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_H_STRETCH")
      .map(([species]) => species);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(BACK_H_STRETCH_SPECIES).toEqual(H_STRETCH_SPECIES);
    expect(BACK_H_STRETCH_FACTORY_SPECIES).toEqual(H_STRETCH_SPECIES);
    expect(BACK_H_STRETCH_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(generated).toEqual(H_STRETCH_SPECIES);
    expect(H_STRETCH_SPECIES.every((species) => factory.has(species))).toBe(true);
    for (const species of H_STRETCH_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(11);
      expect([3, 6, 17].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual([
          "ANIM_H_STRETCH_FAR_TWICE",
          "ANIM_H_STRETCH_FAR",
          "ANIM_H_STRETCH_FAR_SLOW",
        ]);
    }
  });

  it("uses party nature for the HorizontalStretchFar initializer triple", () => {
    expect(BACK_H_STRETCH_VARIANTS).toEqual({
      twice: {
        selector: "ANIM_H_STRETCH_FAR_TWICE", callback: "Anim_HorizontalStretchFar_Twice",
        sourceId: 117, natureMod: 0, duration: 20, amplitude: 70, runs: 2, accepted: true,
      },
      normal: {
        selector: "ANIM_H_STRETCH_FAR", callback: "Anim_HorizontalStretchFar",
        sourceId: 118, natureMod: 1, duration: 30, amplitude: 60, runs: 1, accepted: true,
      },
      slow: {
        selector: "ANIM_H_STRETCH_FAR_SLOW", callback: "Anim_HorizontalStretchFar_Slow",
        sourceId: 91, natureMod: 2, duration: 40, amplitude: 40, runs: 1, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("MUK", 3)).toMatchObject({
      backAnimSetIndex: 11, backAnimSet: "BACK_ANIM_H_STRETCH", natureMod: 0,
      selector: "ANIM_H_STRETCH_FAR_TWICE",
    });
    expect(selectBackSendOutAnimation("LILEEP", 6)).toMatchObject({
      backAnimSetIndex: 11, backAnimSet: "BACK_ANIM_H_STRETCH", natureMod: 1,
      selector: "ANIM_H_STRETCH_FAR",
    });
    expect(selectBackSendOutAnimation("MUK", 17)).toMatchObject({
      backAnimSetIndex: 11, backAnimSet: "BACK_ANIM_H_STRETCH", natureMod: 2,
      selector: "ANIM_H_STRETCH_FAR_SLOW",
    });
  });

  it("pins source dispatch, initializer-first cadence, affine lifecycle, and task restoration", () => {
    const source = readFileSync(new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8");
    const constants = readFileSync(new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8");
    const trig = readFileSync(new URL("../../reference/pokeemerald/src/trig.c", import.meta.url), "utf8");
    expect(constants).toMatch(/^#define BACK_ANIM_H_STRETCH\s+12$/m);
    expect(constants).toMatch(/^#define ANIM_H_STRETCH_FAR_SLOW\s+91$/m);
    expect(constants).toMatch(/^#define ANIM_H_STRETCH_FAR_TWICE\s+117$/m);
    expect(constants).toMatch(/^#define ANIM_H_STRETCH_FAR\s+118$/m);
    expect(trig).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(source).toMatch(/\(BACK_ANIM_H_STRETCH - 1\) \* 3\]\s*= ANIM_H_STRETCH_FAR_TWICE, ANIM_H_STRETCH_FAR, ANIM_H_STRETCH_FAR_SLOW,/);
    const helperStart = source.indexOf("static void HorizontalStretchFar(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_HorizontalStretchFar_Slow(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/sprite->data\[5\] > sprite->data\[6\][\s\S]*?sprite->data\[5\] = 0;[\s\S]*?HandleSetAffineData\(sprite, 256, 256, 0\);/);
    expect(helper).toMatch(/sprite->data\[4\] <= 1[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?sprite->data\[4\]--;[\s\S]*?sprite->data\[7\] = 0;/);
    expect(helper).toMatch(/index2 = \(sprite->data\[5\] \* 128\) \/ sprite->data\[6\];[\s\S]*?sprite->data\[7\] \+= 51;[\s\S]*?index1 = sprite->data\[7\] & 0xFF;/);
    expect(helper).toMatch(/if \(!sprite->sDontFlip\)[\s\S]*?xScale = -256 \+ Sin\(index2, amplitude\) \+ Sin\(index1, amplitude \/ 5 \* 2\);[\s\S]*?xScale = 256 - Sin\(index2, amplitude\) - Sin\(index1, amplitude \/ 5 \* 2\);/);
    expect(helper).toMatch(/SetAffineData\(sprite, xScale, 256, 0\);[\s\S]*?sprite->data\[5\]\+\+;/);
    for (const [callback, duration, amplitude, runs] of [
      ["Anim_HorizontalStretchFar_Twice", 20, 70, 2],
      ["Anim_HorizontalStretchFar", 30, 60, 1],
      ["Anim_HorizontalStretchFar_Slow", 40, 40, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toMatch(/if \(sprite->data\[2\] == 0\)[\s\S]*?sprite->data\[2\] = 1;[\s\S]*?HandleStartAffineAnim\(sprite\);/);
      expect(initializer).toContain(`sprite->data[4] = ${runs};`);
      expect(initializer).toContain(`sprite->data[6] = ${duration};`);
      expect(initializer).toContain(`sprite->data[3] = ${amplitude};`);
      expect(initializer).toMatch(/sprite->data\[5\] = 0;[\s\S]*?sprite->data\[7\] = 0;[\s\S]*?HorizontalStretchFar\(sprite\);/);
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(backSendOutTerminalSpriteData(0, 89)).toEqual([0, 0, 89, 0, 0, 0, 0, 0]);
  });

  it.each([
    ["MUK", 3, "ANIM_H_STRETCH_FAR_TWICE", 117, 20, 70, 2, 43],
    ["LILEEP", 6, "ANIM_H_STRETCH_FAR", 118, 30, 60, 1, 31],
    ["MUK", 17, "ANIM_H_STRETCH_FAR_SLOW", 91, 40, 40, 1, 41],
  ] as const)("models %s through affine cycles and strict terminal cleanup", (
    species, natureId, selector, sourceId, duration, amplitude, runs, terminalTick,
  ) => {
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const frame = backHorizontalStretchFrameAtTick(species, natureId, tick, -1)!;
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
      expect(frame.callback).toBe(selector === "ANIM_H_STRETCH_FAR_TWICE"
        ? "Anim_HorizontalStretchFar_Twice"
        : selector === "ANIM_H_STRETCH_FAR"
          ? "Anim_HorizontalStretchFar"
          : "Anim_HorizontalStretchFar_Slow");
    }

    const middle = backHorizontalStretchFrameAtTick(species, natureId, Math.trunc(duration / 4), -1)!;
    expect(middle.data7).toBe(51);
    expect(middle.index1).toBe(51);
    expect(middle.index2).toBe(Math.trunc((Math.trunc(duration / 4) * 128) / duration));
    expect(middle.affineWrites[0]).toEqual({
      xScale: 256 - gbaSin(middle.index2!, amplitude)
        - gbaSin(51, Math.trunc(amplitude / 5) * 2),
      yScale: 256, rotationSigned: 0, rotationU16: 0,
    });

    if (runs === 2) {
      const boundary = backHorizontalStretchFrameAtTick(species, natureId, 21, -1)!;
      expect(boundary).toMatchObject({ phaseBoundary: true, data4: 1, data5: 0, data7: 0, index1: 0, index2: null, x2: 0, y2: 0, callback: "Anim_HorizontalStretchFar_Twice" });
      expect(boundary.affineWrites).toEqual([{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }]);
    }

    const terminal = backHorizontalStretchFrameAtTick(species, natureId, terminalTick, -1)!;
    expect(terminal).toMatchObject({
      x2: 0, y2: 0, data1: -1, data2: 1, data5: 0,
      data4: 1, index1: 0, index2: null, phaseBoundary: true,
      resetSpriteAfterAnim: true, affineMode: "normal", callback: "WaitAnimEnd",
      affineWrites: [{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }],
    });
    expect(backHorizontalStretchFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backHorizontalStretchWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalStretchWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid state and keeps neighboring back families outside this reducer", () => {
    expect(backHorizontalStretchFrameAtTick("MUK", 3, -1)).toBeNull();
    expect(backHorizontalStretchFrameAtTick("MUK", 3, 1.5)).toBeNull();
    expect(backHorizontalStretchFrameAtTick("MUK", 3, 0, 0.5)).toBeNull();
    expect(backHorizontalStretchFrameAtTick("CHINCHOU", 0, 0)).toBeNull();
    expect(backHorizontalStretchFrameAtTick("NOT_A_SPECIES", 17, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_H_STRETCH).toEqual([
      "ANIM_H_STRETCH_FAR_TWICE", "ANIM_H_STRETCH_FAR", "ANIM_H_STRETCH_FAR_SLOW",
    ]);
  });
});
