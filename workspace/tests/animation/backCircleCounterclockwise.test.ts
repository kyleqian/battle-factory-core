import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_CIRCLE_COUNTERCLOCKWISE_FACTORY_SPECIES,
  BACK_CIRCLE_COUNTERCLOCKWISE_OUTSIDE_FACTORY_SPECIES,
  BACK_CIRCLE_COUNTERCLOCKWISE_SPECIES,
  BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backCircleCounterclockwiseFrameAtTick,
  backCircleCounterclockwiseWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const CIRCLE_SPECIES = ["HITMONTOP", "SPINDA"] as const;

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

describe("BACK_ANIM_CIRCLE_COUNTERCLOCKWISE back send-out reducer", () => {
  it("pins the complete generated census and exactly both Factory mappings", () => {
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
    expect(BACK_CIRCLE_COUNTERCLOCKWISE_SPECIES).toEqual(CIRCLE_SPECIES);
    expect(BACK_CIRCLE_COUNTERCLOCKWISE_FACTORY_SPECIES).toEqual(CIRCLE_SPECIES);
    expect(BACK_CIRCLE_COUNTERCLOCKWISE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(BACK_CIRCLE_COUNTERCLOCKWISE_SPECIES.every((species) => factory.has(species))).toBe(true);
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE"))
      .toEqual(CIRCLE_SPECIES.map((species) => [species, "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE"]));
  });

  it("routes the live species plus party-nature seam to all three callbacks", () => {
    expect(BACK_CIRCLE_COUNTERCLOCKWISE_VARIANTS).toEqual({
      long: {
        selector: "ANIM_CIRCLE_C_CLOCKWISE_LONG", callback: "Anim_CircleCounterclockwise_Long",
        sourceId: 100, natureMod: 0, rotation: 1024, data: 6, speed: 24, accepted: true,
      },
      normal: {
        selector: "ANIM_CIRCLE_C_CLOCKWISE", callback: "Anim_CircleCounterclockwise",
        sourceId: 20, natureMod: 1, rotation: 512, data: 6, speed: 24, accepted: true,
      },
      slow: {
        selector: "ANIM_CIRCLE_C_CLOCKWISE_SLOW", callback: "Anim_CircleCounterclockwise_Slow",
        sourceId: 79, natureMod: 2, rotation: 512, data: 3, speed: 12, accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(getSpeciesBackAnimSet("HITMONTOP")).toBe(6);
    expect(getSpeciesBackAnimSet("SPINDA")).toBe(6);
    expect(selectBackSendOutAnimation("HITMONTOP", 0)).toMatchObject({
      backAnimSetIndex: 6, backAnimSet: "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE", natureMod: 0,
      selector: "ANIM_CIRCLE_C_CLOCKWISE_LONG",
    });
    expect(selectBackSendOutAnimation("SPINDA", 7)).toMatchObject({
      backAnimSetIndex: 6, backAnimSet: "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE", natureMod: 1,
      selector: "ANIM_CIRCLE_C_CLOCKWISE",
    });
    // No Factory record reaches natureMod 2; Modest remains a complete legal staged party only.
    expect(selectBackSendOutAnimation("SPINDA", 15)).toMatchObject({
      backAnimSetIndex: 6, backAnimSet: "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE", natureMod: 2,
      selector: "ANIM_CIRCLE_C_CLOCKWISE_SLOW",
    });
    expect(frontierMons.entries.find(({ index }) => index === 236)).toMatchObject({
      index: 236, label: "FRONTIER_MON_HITMONTOP_1", species: "SPECIES_HITMONTOP", nature: "NATURE_HARDY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 145)).toMatchObject({
      index: 145, label: "FRONTIER_MON_SPINDA", species: "SPECIES_SPINDA", nature: "NATURE_RELAXED",
    });
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_HITMONTOP" || species === "SPECIES_SPINDA"
    )).map(({ nature }) => nature)).toEqual([
      "NATURE_RELAXED", "NATURE_HARDY", "NATURE_ADAMANT",
    ]);
  });

  it("pins the source selector triple, AddNewAnim setup, callback order, and non-affine lifecycle", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_CIRCLE_COUNTERCLOCKWISE\s+7$/m);
    expect(constants).toMatch(/^#define ANIM_CIRCLE_C_CLOCKWISE\s+20$/m);
    expect(constants).toMatch(/^#define ANIM_CIRCLE_C_CLOCKWISE_SLOW\s+79$/m);
    expect(constants).toMatch(/^#define ANIM_CIRCLE_C_CLOCKWISE_LONG\s+100$/m);
    expect(source).toMatch(/\(BACK_ANIM_CIRCLE_COUNTERCLOCKWISE - 1\) \* 3\]\s*= ANIM_CIRCLE_C_CLOCKWISE_LONG, ANIM_CIRCLE_C_CLOCKWISE, ANIM_CIRCLE_C_CLOCKWISE_SLOW/);
    const helperStart = source.indexOf("static void CircleCounterclockwise(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_CircleCounterclockwise(struct Sprite *sprite)\n{", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toMatch(/TryFlipX\(sprite\);[\s\S]*?sprite->data\[2\] > sAnims\[id\]\.rotation[\s\S]*?sprite->x2 = 0;[\s\S]*?sprite->y2 = 0;[\s\S]*?sprite->callback = WaitAnimEnd/);
    expect(helper).toMatch(/index = \(sprite->data\[2\] \+ 192\) % 256;[\s\S]*?sprite->x2 = -\(Cos\(index, sAnims\[id\]\.data \* 2\)\);[\s\S]*?sprite->y2 = Sin\(index, sAnims\[id\]\.data\) \+ sAnims\[id\]\.data;[\s\S]*?sprite->data\[2\] \+= sAnims\[id\]\.speed;[\s\S]*?TryFlipX\(sprite\);/);
    expect(helper).not.toContain("HandleStartAffineAnim");
    expect(helper).not.toContain("ResetSpriteAfterAnim");
    for (const [callback, rotation, data, speed] of [
      ["Anim_CircleCounterclockwise_Long", 1024, 6, 24],
      ["Anim_CircleCounterclockwise", 512, 6, 24],
      ["Anim_CircleCounterclockwise_Slow", 512, 3, 12],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain("sprite->data[0] = AddNewAnim()");
      expect(initializer).toContain(`sAnims[id].rotation = ${rotation};`);
      expect(initializer).toContain(`sAnims[id].data = ${data};`);
      expect(initializer).toContain(`sAnims[id].speed = ${speed};`);
      expect(initializer).toMatch(/CircleCounterclockwise\(sprite\);[\s\S]*?sprite->callback = CircleCounterclockwise;/);
    }
  });

  it("matches signed GBA circle arithmetic, strict cleanup, and task lifecycle for every selector", () => {
    const cases = [
      ["HITMONTOP", 0, 2, 1024, 6, 24, 43],
      ["SPINDA", 7, 1, 512, 6, 24, 22],
      ["SPINDA", 15, 3, 512, 3, 12, 43],
    ] as const;
    for (const [species, natureId, slot, rotation, data, speed, terminalTick] of cases) {
      for (let tick = 0; tick < terminalTick; tick += 1) {
        const counter = tick * speed;
        const index = (counter + 192) % 256;
        const sin = gbaSin(index, data);
        const cos = gbaSin(index + 64, data * 2);
        expect(backCircleCounterclockwiseFrameAtTick(species, natureId, tick, -1, slot), `${species} tick ${tick}`)
          .toMatchObject({
            x2: cos === 0 ? 0 : -cos, y2: sin + data, data0: slot, data1: -1,
            data2Before: counter, data2: counter + speed, index, sin, cos,
            rotation, data, speed, initializerCallBeforeCallbackInstall: tick === 0,
            normalBackDontFlip: true, tryFlipXCalls: 2, affineWriteCount: 0,
            affineMode: "normal", resetSpriteAfterAnim: false, callback: "CircleCounterclockwise",
          });
      }
      const terminal = backCircleCounterclockwiseFrameAtTick(species, natureId, terminalTick, -1, slot)!;
      expect(terminal).toMatchObject({
        x2: 0, y2: 0, data0: slot, data1: -1,
        data2Before: terminalTick * speed, data2: (terminalTick + 1) * speed,
        index: null, sin: null, cos: null, rotation, data, speed,
        initializerCallBeforeCallbackInstall: false, callback: "WaitAnimEnd",
      });
      expect(backCircleCounterclockwiseFrameAtTick(species, natureId, terminalTick + 1, -1, slot)).toEqual(terminal);
    }
    expect(backCircleCounterclockwiseWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backCircleCounterclockwiseWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });

  it("rejects invalid state and keeps adjacent back families outside this reducer", () => {
    expect(backCircleCounterclockwiseFrameAtTick("HITMONTOP", 0, -1)).toBeNull();
    expect(backCircleCounterclockwiseFrameAtTick("SPINDA", 15, 0.5)).toBeNull();
    expect(backCircleCounterclockwiseFrameAtTick("SPINDA", 15, 0, 0, 4)).toBeNull();
    expect(backCircleCounterclockwiseFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backCircleCounterclockwiseFrameAtTick("NOT_A_SPECIES", 15, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_CIRCLE_COUNTERCLOCKWISE).toEqual([
      "ANIM_CIRCLE_C_CLOCKWISE_LONG", "ANIM_CIRCLE_C_CLOCKWISE", "ANIM_CIRCLE_C_CLOCKWISE_SLOW",
    ]);
  });
});
