import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_H_SHAKE_FACTORY_SPECIES,
  BACK_H_SHAKE_OUTSIDE_FACTORY_SPECIES,
  BACK_H_SHAKE_SPECIES,
  BACK_H_SHAKE_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backHorizontalShakeFrameAtTick,
  backHorizontalShakeWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const H_SHAKE_SPECIES = [
  "VENUSAUR", "PARASECT", "GRAVELER", "GOLEM", "PINECO", "PILOSWINE", "ELEKID",
  "MIGHTYENA", "SILCOON", "CASCOON", "CACTURNE", "SLAKING", "SALAMENCE",
] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_H_SHAKE back send-out reducer", () => {
  it("pins the generated 13/13/0 Factory census and every sibling route", () => {
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    const generated = Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_H_SHAKE")
      .map(([species]) => species);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(BACK_H_SHAKE_SPECIES).toEqual(H_SHAKE_SPECIES);
    expect(BACK_H_SHAKE_FACTORY_SPECIES).toEqual(H_SHAKE_SPECIES);
    expect(BACK_H_SHAKE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(generated).toEqual(H_SHAKE_SPECIES);
    expect(H_SHAKE_SPECIES.every((species) => factory.has(species))).toBe(true);
    for (const species of H_SHAKE_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(7);
      expect([0, 5, 15].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_H_SHAKE_FAST", "ANIM_H_SHAKE", "ANIM_H_SHAKE_SLOW"]);
    }
  });

  it("uses the player party nature at the set-8 selector seam", () => {
    expect(BACK_H_SHAKE_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_H_SHAKE_FAST", callback: "Anim_HorizontalShake_Fast",
        sourceId: 93, natureMod: 0, step: 70, amplitude: 6, accepted: true,
      },
      normal: {
        selector: "ANIM_H_SHAKE", callback: "Anim_HorizontalShake",
        sourceId: 15, natureMod: 1, step: 60, amplitude: 3, accepted: true,
      },
      slow: {
        selector: "ANIM_H_SHAKE_SLOW", callback: "Anim_HorizontalShake_Slow",
        sourceId: 76, natureMod: 2, step: 30, amplitude: 3, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("CACTURNE", 11)).toMatchObject({
      backAnimSetIndex: 7, backAnimSet: "BACK_ANIM_H_SHAKE", natureMod: 0,
      selector: "ANIM_H_SHAKE_FAST",
    });
    expect(selectBackSendOutAnimation("VENUSAUR", 5)).toMatchObject({
      backAnimSetIndex: 7, backAnimSet: "BACK_ANIM_H_SHAKE", natureMod: 1,
      selector: "ANIM_H_SHAKE",
    });
    expect(selectBackSendOutAnimation("SALAMENCE", 15)).toMatchObject({
      backAnimSetIndex: 7, backAnimSet: "BACK_ANIM_H_SHAKE", natureMod: 2,
      selector: "ANIM_H_SHAKE_SLOW",
    });
  });

  it("pins source triple order, shared callback, initializer cadence, and task restoration", () => {
    const source = readFileSync(new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8");
    const constants = readFileSync(new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8");
    const trig = readFileSync(new URL("../../reference/pokeemerald/src/trig.c", import.meta.url), "utf8");
    expect(constants).toMatch(/^#define BACK_ANIM_H_SHAKE\s+8$/m);
    expect(constants).toMatch(/^#define ANIM_H_SHAKE\s+15$/m);
    expect(constants).toMatch(/^#define ANIM_H_SHAKE_SLOW\s+76$/m);
    expect(constants).toMatch(/^#define ANIM_H_SHAKE_FAST\s+93$/m);
    expect(trig).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(source).toMatch(/\(BACK_ANIM_H_SHAKE - 1\) \* 3\]\s*= ANIM_H_SHAKE_FAST, ANIM_H_SHAKE, ANIM_H_SHAKE_SLOW,/);
    const helperStart = source.indexOf("static void HorizontalShake(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_HorizontalShake(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/counter > 2304[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?sprite->x2 = 0;[\s\S]*?Sin\(counter % 256, sprite->data\[7\]\);[\s\S]*?sprite->data\[2\] \+= sprite->data\[0\];/);
    expect(helper).not.toContain("TryFlipX");
    for (const [callback, step, amplitude] of [
      ["Anim_HorizontalShake_Fast", 70, 6],
      ["Anim_HorizontalShake", 60, 3],
      ["Anim_HorizontalShake_Slow", 30, 3],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      expect(source.slice(start, end)).toMatch(new RegExp(
        `sprite->data\\[0\\] = ${step};[\\s\\S]*?sprite->data\\[7\\] = ${amplitude};[\\s\\S]*?HorizontalShake\\(sprite\\);[\\s\\S]*?sprite->callback = HorizontalShake;`,
      ));
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(backSendOutTerminalSpriteData(0, 345)).toEqual([0, 0, 345, 0, 0, 0, 0, 0]);
  });

  it.each([
    ["CACTURNE", 11, "ANIM_H_SHAKE_FAST", 93, 70, 6],
    ["VENUSAUR", 5, "ANIM_H_SHAKE", 15, 60, 3],
    ["SALAMENCE", 15, "ANIM_H_SHAKE_SLOW", 76, 30, 3],
  ] as const)("models %s nature %i through strict terminal cleanup", (species, natureId, selector, sourceId, step, amplitude) => {
    const terminalTick = Math.floor(2304 / step) + 1;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const counter = tick * step;
      const index = counter % 256;
      expect(backHorizontalShakeFrameAtTick(species, natureId, tick, -1)).toEqual({
        x2: gbaSin(index, amplitude), y2: 0, data0: step, data1: -1,
        data2Before: counter, data2: counter + step, data7: amplitude, index,
        selector, sourceId, step, amplitude, initializerCallBeforeCallbackInstall: tick === 0,
        normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 0,
        affineMode: "normal", resetSpriteAfterAnim: false, callback: "HorizontalShake",
      });
    }
    const terminal = backHorizontalShakeFrameAtTick(species, natureId, terminalTick, -1)!;
    expect(terminal).toEqual({
      x2: 0, y2: 0, data0: step, data1: -1, data2Before: terminalTick * step,
      data2: (terminalTick + 1) * step, data7: amplitude, index: null,
      selector, sourceId, step, amplitude, initializerCallBeforeCallbackInstall: false,
      normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 0,
      affineMode: "normal", resetSpriteAfterAnim: false, callback: "WaitAnimEnd",
    });
    expect(backHorizontalShakeFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backHorizontalShakeWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalShakeWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid state and keeps adjacent families outside this reducer", () => {
    expect(backHorizontalShakeFrameAtTick("CACTURNE", 11, -1)).toBeNull();
    expect(backHorizontalShakeFrameAtTick("VENUSAUR", 5, 0.5)).toBeNull();
    expect(backHorizontalShakeFrameAtTick("SALAMENCE", 15, 0, 0.5)).toBeNull();
    expect(backHorizontalShakeFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backHorizontalShakeFrameAtTick("NOT_A_SPECIES", 15, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_H_SHAKE).toEqual([
      "ANIM_H_SHAKE_FAST", "ANIM_H_SHAKE", "ANIM_H_SHAKE_SLOW",
    ]);
  });
});
