import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  BACK_V_SHAKE_H_SLIDE_FACTORY_SPECIES,
  BACK_V_SHAKE_H_SLIDE_OUTSIDE_FACTORY_SPECIES,
  BACK_V_SHAKE_H_SLIDE_SPECIES,
  BACK_V_SHAKE_H_SLIDE_VARIANTS,
  backSendOutTerminalSpriteData,
  backVerticalShakeHorizontalSlideFrameAtTick,
  backVerticalShakeHorizontalSlideWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const V_SHAKE_H_SLIDE_SPECIES = [
  "RATTATA", "RATICATE", "VENONAT", "KRABBY", "LEDYBA", "SPINARAK", "SWINUB", "NINCADA", "CACNEA",
] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

function sourceX2(counter: number): number {
  const remainder = counter % 512;
  let x2: number;
  switch (Math.trunc(counter / 512) % 4) {
    case 0: x2 = Math.trunc(remainder / 32); break;
    case 1: x2 = Math.trunc(-(remainder * 16) / 512) + 16; break;
    case 2: x2 = Math.trunc(-(remainder * 16) / 512); break;
    case 3: x2 = Math.trunc(remainder / 32) - 16; break;
    default: throw new Error("unreachable source phase");
  }
  // A signed s16 store canonicalizes C's arithmetic negative zero to zero.
  return x2 === 0 ? 0 : x2;
}

describe("BACK_ANIM_V_SHAKE_H_SLIDE back send-out reducer", () => {
  it("pins the generated 9/9/0 Factory census and all selector siblings", () => {
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    const generated = Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_V_SHAKE_H_SLIDE")
      .map(([species]) => species);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(BACK_V_SHAKE_H_SLIDE_SPECIES).toEqual(V_SHAKE_H_SLIDE_SPECIES);
    expect(BACK_V_SHAKE_H_SLIDE_FACTORY_SPECIES).toEqual(V_SHAKE_H_SLIDE_SPECIES);
    expect(BACK_V_SHAKE_H_SLIDE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(generated).toEqual(V_SHAKE_H_SLIDE_SPECIES);
    expect(V_SHAKE_H_SLIDE_SPECIES.every((species) => factory.has(species))).toBe(true);
    for (const species of V_SHAKE_H_SLIDE_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(9);
      expect([0, 24, 21].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_V_SHAKE_H_SLIDE_FAST", "ANIM_V_SHAKE_H_SLIDE", "ANIM_V_SHAKE_H_SLIDE_SLOW"]);
    }
  });

  it("uses party nature for source set 10's direct callback dispatch", () => {
    expect(BACK_V_SHAKE_H_SLIDE_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_V_SHAKE_H_SLIDE_FAST", callback: "Anim_VerticalShakeHorizontalSlide_Fast",
        sourceId: 103, natureMod: 0, step: 64, modulus: 96, amplitude: 4, accepted: true,
      },
      normal: {
        selector: "ANIM_V_SHAKE_H_SLIDE", callback: "Anim_VerticalShakeHorizontalSlide",
        sourceId: 102, natureMod: 1, step: 48, modulus: 128, amplitude: 4, accepted: true,
      },
      slow: {
        selector: "ANIM_V_SHAKE_H_SLIDE_SLOW", callback: "Anim_VerticalShakeHorizontalSlide_Slow",
        sourceId: 89, natureMod: 2, step: 24, modulus: 128, amplitude: 4, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("KRABBY", 0)).toMatchObject({
      backAnimSetIndex: 9, backAnimSet: "BACK_ANIM_V_SHAKE_H_SLIDE", natureMod: 0,
      selector: "ANIM_V_SHAKE_H_SLIDE_FAST",
    });
    expect(selectBackSendOutAnimation("SPINARAK", 24)).toMatchObject({
      backAnimSetIndex: 9, backAnimSet: "BACK_ANIM_V_SHAKE_H_SLIDE", natureMod: 1,
      selector: "ANIM_V_SHAKE_H_SLIDE",
    });
    expect(selectBackSendOutAnimation("SWINUB", 21)).toMatchObject({
      backAnimSetIndex: 9, backAnimSet: "BACK_ANIM_V_SHAKE_H_SLIDE", natureMod: 2,
      selector: "ANIM_V_SHAKE_H_SLIDE_SLOW",
    });
  });

  it("pins source triple order, direct callback lifecycle, and task restoration", () => {
    const source = readFileSync(new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8");
    const constants = readFileSync(new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8");
    const trig = readFileSync(new URL("../../reference/pokeemerald/src/trig.c", import.meta.url), "utf8");
    expect(constants).toMatch(/^#define BACK_ANIM_V_SHAKE_H_SLIDE\s+10$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_H_SLIDE_SLOW\s+89$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_H_SLIDE\s+102$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_H_SLIDE_FAST\s+103$/m);
    expect(trig).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(source).toMatch(/\(BACK_ANIM_V_SHAKE_H_SLIDE - 1\) \* 3\]\s*= ANIM_V_SHAKE_H_SLIDE_FAST, ANIM_V_SHAKE_H_SLIDE, ANIM_V_SHAKE_H_SLIDE_SLOW,/);
    for (const [callback, step, modulus] of [
      ["Anim_VerticalShakeHorizontalSlide_Fast", 64, 96],
      ["Anim_VerticalShakeHorizontalSlide", 48, 128],
      ["Anim_VerticalShakeHorizontalSlide_Slow", 24, 128],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const body = source.slice(start, end);
      expect(body.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
      expect(body).toMatch(new RegExp(
        `sprite->data\\[2\\] > 2048[\\s\\S]*?sprite->callback = WaitAnimEnd;[\\s\\S]*?sprite->data\\[6\\] = 0;[\\s\\S]*?` +
        `s16 divCase = \\(sprite->data\\[2\\] / 512\\) % 4;[\\s\\S]*?` +
        `sprite->y2 = Sin\\(sprite->data\\[2\\] % ${modulus}, 4\\);[\\s\\S]*?sprite->data\\[2\\] \\+= ${step};`,
      ));
      expect(body).not.toMatch(/sprite->callback = Anim_VerticalShakeHorizontalSlide/);
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(backSendOutTerminalSpriteData(0, 98)).toEqual([0, 0, 98, 0, 0, 0, 0, 0]);
  });

  it.each([
    ["KRABBY", 0, "ANIM_V_SHAKE_H_SLIDE_FAST", "Anim_VerticalShakeHorizontalSlide_Fast", 103, 64, 96],
    ["SPINARAK", 24, "ANIM_V_SHAKE_H_SLIDE", "Anim_VerticalShakeHorizontalSlide", 102, 48, 128],
    ["SWINUB", 21, "ANIM_V_SHAKE_H_SLIDE_SLOW", "Anim_VerticalShakeHorizontalSlide_Slow", 89, 24, 128],
  ] as const)("models %s nature %i through all four X phases and retained terminal offsets", (
    species, natureId, selector, callback, sourceId, step, modulus,
  ) => {
    const terminalTick = Math.floor(2048 / step) + 1;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const counter = tick * step;
      expect(backVerticalShakeHorizontalSlideFrameAtTick(species, natureId, tick, -1)).toEqual({
        x2: sourceX2(counter), y2: gbaSin(counter % modulus, 4), data0: 0, data1: -1,
        data2Before: counter, data2: counter + step, data6: 0,
        horizontalPhase: Math.trunc(counter / 512) % 4,
        horizontalRemainder: counter % 512, ySineIndex: counter % modulus,
        selector, sourceId, step, modulus, amplitude: 4, callbackInvokedDirectlyFromTask: true,
        normalBackDontFlip: true, tryFlipXCalls: 2, affineWriteCount: 0,
        affineMode: "normal", resetSpriteAfterAnim: false, callback,
      });
    }
    const finalCounter = (terminalTick - 1) * step;
    const terminal = backVerticalShakeHorizontalSlideFrameAtTick(species, natureId, terminalTick, -1)!;
    expect(terminal).toEqual({
      x2: sourceX2(finalCounter), y2: gbaSin(finalCounter % modulus, 4), data0: 0, data1: -1,
      data2Before: terminalTick * step, data2: terminalTick * step, data6: 0,
      horizontalPhase: null, horizontalRemainder: null, ySineIndex: null,
      selector, sourceId, step, modulus, amplitude: 4, callbackInvokedDirectlyFromTask: true,
      normalBackDontFlip: true, tryFlipXCalls: 2, affineWriteCount: 0,
      affineMode: "normal", resetSpriteAfterAnim: false, callback: "WaitAnimEnd",
    });
    expect(backVerticalShakeHorizontalSlideFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backVerticalShakeHorizontalSlideWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalShakeHorizontalSlideWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid state and keeps adjacent families outside this reducer", () => {
    expect(backVerticalShakeHorizontalSlideFrameAtTick("KRABBY", 0, -1)).toBeNull();
    expect(backVerticalShakeHorizontalSlideFrameAtTick("SPINARAK", 24, 0.5)).toBeNull();
    expect(backVerticalShakeHorizontalSlideFrameAtTick("SWINUB", 21, 0, 0.5)).toBeNull();
    expect(backVerticalShakeHorizontalSlideFrameAtTick("ARBOK", 3, 0)).toBeNull();
    expect(backVerticalShakeHorizontalSlideFrameAtTick("NOT_A_SPECIES", 21, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_V_SHAKE_H_SLIDE).toEqual([
      "ANIM_V_SHAKE_H_SLIDE_FAST", "ANIM_V_SHAKE_H_SLIDE", "ANIM_V_SHAKE_H_SLIDE_SLOW",
    ]);
  });
});
