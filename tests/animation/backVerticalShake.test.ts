import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  BACK_V_SHAKE_FACTORY_SPECIES,
  BACK_V_SHAKE_OUTSIDE_FACTORY_SPECIES,
  BACK_V_SHAKE_SPECIES,
  BACK_V_SHAKE_VARIANTS,
  backSendOutTerminalSpriteData,
  backVerticalShakeFrameAtTick,
  backVerticalShakeWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const V_SHAKE_SPECIES = [
  "ARBOK", "NIDOQUEEN", "NIDOKING", "GOLBAT", "DIGLETT", "DUGTRIO", "POLIWHIRL",
  "MACHOKE", "MACHAMP", "ONIX", "KINGLER", "GYARADOS", "DRAGONITE", "MEGANIUM",
  "FERALIGATR", "FORRETRESS", "STEELIX", "GRANBULL", "URSARING", "HOUNDOUR",
  "HOUNDOOM", "PUPITAR", "SCEPTILE", "NUZLEAF", "WHISCASH", "MANECTRIC", "SEALEO",
  "WALREIN", "MAWILE", "LOUDRED", "LAIRON", "ARMALDO", "BAGON", "SHELGON",
  "METAGROSS", "REGIROCK", "REGICE", "REGISTEEL",
] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_V_SHAKE back send-out reducer", () => {
  it("pins the generated 38/38/0 Factory census and every sibling route", () => {
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    const generated = Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_V_SHAKE")
      .map(([species]) => species);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(BACK_V_SHAKE_SPECIES).toEqual(V_SHAKE_SPECIES);
    expect(BACK_V_SHAKE_FACTORY_SPECIES).toEqual(V_SHAKE_SPECIES);
    expect(BACK_V_SHAKE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(generated).toEqual(V_SHAKE_SPECIES);
    expect(V_SHAKE_SPECIES.every((species) => factory.has(species))).toBe(true);
    for (const species of V_SHAKE_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(8);
      expect([0, 5, 15].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_V_SHAKE_BACK_FAST", "ANIM_V_SHAKE_BACK", "ANIM_V_SHAKE_BACK_SLOW"]);
    }
  });

  it("uses the player party nature at the set-9 selector seam", () => {
    expect(BACK_V_SHAKE_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_V_SHAKE_BACK_FAST", callback: "Anim_VerticalShakeBack_Fast",
        sourceId: 97, natureMod: 0, step: 70, amplitude: 6, accepted: true,
      },
      normal: {
        selector: "ANIM_V_SHAKE_BACK", callback: "Anim_VerticalShakeBack",
        sourceId: 87, natureMod: 1, step: 60, amplitude: 3, accepted: true,
      },
      slow: {
        selector: "ANIM_V_SHAKE_BACK_SLOW", callback: "Anim_VerticalShakeBack_Slow",
        sourceId: 88, natureMod: 2, step: 30, amplitude: 3, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(selectBackSendOutAnimation("ARBOK", 3)).toMatchObject({
      backAnimSetIndex: 8, backAnimSet: "BACK_ANIM_V_SHAKE", natureMod: 0,
      selector: "ANIM_V_SHAKE_BACK_FAST",
    });
    expect(selectBackSendOutAnimation("HOUNDOUR", 6)).toMatchObject({
      backAnimSetIndex: 8, backAnimSet: "BACK_ANIM_V_SHAKE", natureMod: 1,
      selector: "ANIM_V_SHAKE_BACK",
    });
    expect(selectBackSendOutAnimation("MANECTRIC", 15)).toMatchObject({
      backAnimSetIndex: 8, backAnimSet: "BACK_ANIM_V_SHAKE", natureMod: 2,
      selector: "ANIM_V_SHAKE_BACK_SLOW",
    });
  });

  it("pins source triple order, shared callback, initializer cadence, and task restoration", () => {
    const source = readFileSync(new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8");
    const constants = readFileSync(new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8");
    const trig = readFileSync(new URL("../../reference/pokeemerald/src/trig.c", import.meta.url), "utf8");
    expect(constants).toMatch(/^#define BACK_ANIM_V_SHAKE\s+9$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_BACK\s+87$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_BACK_SLOW\s+88$/m);
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_BACK_FAST\s+97$/m);
    expect(trig).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(source).toMatch(/\(BACK_ANIM_V_SHAKE - 1\) \* 3\]\s*= ANIM_V_SHAKE_BACK_FAST, ANIM_V_SHAKE_BACK, ANIM_V_SHAKE_BACK_SLOW,/);
    const helperStart = source.indexOf("static void VerticalShakeBack(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_VerticalShakeBack(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/counter > 2304[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?sprite->y2 = 0;[\s\S]*?Sin\(\(counter \+ 192\) % 256, sprite->data\[7\]\) \+ sprite->data\[7\];[\s\S]*?sprite->data\[2\] \+= sprite->data\[0\];/);
    expect(helper).not.toContain("TryFlipX");
    for (const [callback, step, amplitude] of [
      ["Anim_VerticalShakeBack_Fast", 70, 6],
      ["Anim_VerticalShakeBack", 60, 3],
      ["Anim_VerticalShakeBack_Slow", 30, 3],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      expect(source.slice(start, end)).toMatch(new RegExp(
        `sprite->data\\[0\\] = ${step};[\\s\\S]*?sprite->data\\[7\\] = ${amplitude};[\\s\\S]*?VerticalShakeBack\\(sprite\\);[\\s\\S]*?sprite->callback = VerticalShakeBack;`,
      ));
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataZeroed).toEqual([0, 2, 3, 4, 5, 6, 7]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.spriteDataPreserved).toEqual([1]);
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(backSendOutTerminalSpriteData(0, 24)).toEqual([0, 0, 24, 0, 0, 0, 0, 0]);
  });

  it.each([
    ["ARBOK", 3, "ANIM_V_SHAKE_BACK_FAST", 97, 70, 6],
    ["HOUNDOUR", 6, "ANIM_V_SHAKE_BACK", 87, 60, 3],
    ["MANECTRIC", 15, "ANIM_V_SHAKE_BACK_SLOW", 88, 30, 3],
  ] as const)("models %s nature %i through strict terminal cleanup", (species, natureId, selector, sourceId, step, amplitude) => {
    const terminalTick = Math.floor(2304 / step) + 1;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const counter = tick * step;
      const index = (counter + 192) % 256;
      expect(backVerticalShakeFrameAtTick(species, natureId, tick, -1)).toEqual({
        x2: 0, y2: gbaSin(index, amplitude) + amplitude, data0: step, data1: -1,
        data2Before: counter, data2: counter + step, data7: amplitude, index,
        selector, sourceId, step, amplitude, initializerCallBeforeCallbackInstall: tick === 0,
        normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 0,
        affineMode: "normal", resetSpriteAfterAnim: false, callback: "VerticalShakeBack",
      });
    }
    const terminal = backVerticalShakeFrameAtTick(species, natureId, terminalTick, -1)!;
    expect(terminal).toEqual({
      x2: 0, y2: 0, data0: step, data1: -1, data2Before: terminalTick * step,
      data2: (terminalTick + 1) * step, data7: amplitude, index: null,
      selector, sourceId, step, amplitude, initializerCallBeforeCallbackInstall: false,
      normalBackDontFlip: true, tryFlipXCalls: 0, affineWriteCount: 0,
      affineMode: "normal", resetSpriteAfterAnim: false, callback: "WaitAnimEnd",
    });
    expect(backVerticalShakeFrameAtTick(species, natureId, 999, -1)).toEqual(terminal);
    expect(backVerticalShakeWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalShakeWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid state and keeps adjacent families outside this reducer", () => {
    expect(backVerticalShakeFrameAtTick("ARBOK", 3, -1)).toBeNull();
    expect(backVerticalShakeFrameAtTick("HOUNDOUR", 6, 0.5)).toBeNull();
    expect(backVerticalShakeFrameAtTick("MANECTRIC", 15, 0, 0.5)).toBeNull();
    expect(backVerticalShakeFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backVerticalShakeFrameAtTick("NOT_A_SPECIES", 15, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_V_SHAKE).toEqual([
      "ANIM_V_SHAKE_BACK_FAST", "ANIM_V_SHAKE_BACK", "ANIM_V_SHAKE_BACK_SLOW",
    ]);
  });
});
