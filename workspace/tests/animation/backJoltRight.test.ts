import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_JOLT_RIGHT_FACTORY_SPECIES,
  BACK_JOLT_RIGHT_OUTSIDE_FACTORY_SPECIES,
  BACK_JOLT_RIGHT_SPECIES,
  BACK_JOLT_RIGHT_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backJoltRightFrameAtTick,
  backJoltRightTerminalSpriteData,
  backJoltRightWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const source = readFileSync(
  new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
);
const constants = readFileSync(
  new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
);

const NATURE_IDS = {
  adamant: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_ADAMANT"),
  docile: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_DOCILE"),
  quiet: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_QUIET"),
} as const;

describe("BACK_ANIM_JOLT_RIGHT source census and routing", () => {
  it("pins all 33 Factory mappings, zero outside, and 74 records", () => {
    expect(BACK_JOLT_RIGHT_SPECIES).toHaveLength(33);
    expect(BACK_JOLT_RIGHT_FACTORY_SPECIES).toHaveLength(33);
    expect(BACK_JOLT_RIGHT_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(frontierMons.entries.filter(({ species }) =>
      BACK_JOLT_RIGHT_FACTORY_SPECIES.includes(species.replace(/^SPECIES_/, "")),
    )).toHaveLength(74);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toMatchObject({ backAnimSets: 25, selectorVariants: 75 });
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_JOLT_RIGHT).toEqual([
      "ANIM_JOLT_RIGHT_FAST",
      "ANIM_JOLT_RIGHT",
      "ANIM_JOLT_RIGHT_SLOW",
    ]);
    expect(BACK_JOLT_RIGHT_VARIANTS).toEqual({
      fast: { selector: "ANIM_JOLT_RIGHT_FAST", callback: "Anim_JoltRight_Fast", sourceId: 136, natureMod: 0, initialStep: 2, travelLimit: 12, oscillationCount: 16, oscillationDelta: 4, initialReturnStep: 4, accepted: true },
      normal: { selector: "ANIM_JOLT_RIGHT", callback: "Anim_JoltRight", sourceId: 137, natureMod: 1, initialStep: 1, travelLimit: 8, oscillationCount: 12, oscillationDelta: 2, initialReturnStep: 2, accepted: true },
      slow: { selector: "ANIM_JOLT_RIGHT_SLOW", callback: "Anim_JoltRight_Slow", sourceId: 138, natureMod: 2, initialStep: 1, travelLimit: 6, oscillationCount: 6, oscillationDelta: 2, initialReturnStep: 0, accepted: true },
    });
  });

  it("batch-routes every source sibling through the generated nature table", () => {
    expect(NATURE_IDS).toEqual({ adamant: 3, docile: 6, quiet: 17 });
    for (const species of BACK_JOLT_RIGHT_SPECIES) {
      expect(selectBackSendOutAnimation(species, NATURE_IDS.adamant)).toMatchObject({
        backAnimSetIndex: 20, backAnimSet: "BACK_ANIM_JOLT_RIGHT",
        natureMod: 0, selector: "ANIM_JOLT_RIGHT_FAST",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.docile)).toMatchObject({
        natureMod: 1, selector: "ANIM_JOLT_RIGHT",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.quiet)).toMatchObject({
        natureMod: 2, selector: "ANIM_JOLT_RIGHT_SLOW",
      });
    }
  });

  it("pins source ids, callback order, dual flips, affine start, and reset", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_JOLT_RIGHT\s+21$/m);
    expect(constants).toMatch(/^#define ANIM_JOLT_RIGHT_FAST\s+136$/m);
    expect(constants).toMatch(/^#define ANIM_JOLT_RIGHT\s+137$/m);
    expect(constants).toMatch(/^#define ANIM_JOLT_RIGHT_SLOW\s+138$/m);
    const helperStart = source.indexOf("static void JoltRight(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_JoltRight_Fast", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    for (const [phase, body] of [
      ["JoltRight", "sprite->x2 -= sprite->data[2];"],
      ["JoltRight_0", "sprite->x2 += sprite->data[7];"],
      ["JoltRight_1", "if (sprite->x2 > sprite->data[6])"],
      ["JoltRight_2", "sprite->data[4] *= -1;"],
      ["JoltRight_3", "ResetSpriteAfterAnim(sprite);"],
    ] as const) {
      const start = helper.indexOf(`static void ${phase}(struct Sprite *sprite)\n{`);
      const end = helper.indexOf("\n}\n", start) + 3;
      const phaseSource = helper.slice(start, end);
      expect(phaseSource).toContain(body);
      expect(phaseSource.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    }
    expect(helper).toMatch(/sprite->x2 <= -sprite->data\[6\][\s\S]*?sprite->data\[7\] = 2;[\s\S]*?sprite->callback = JoltRight_0;/);
    expect(helper).toMatch(/sprite->data\[3\] >= sprite->data\[5\][\s\S]*?sprite->callback = JoltRight_3;/);
    expect(helper).toMatch(/sprite->x2 <= 0[\s\S]*?sprite->x2 = 0;[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;/);
    for (const [callback, returnStep, limit, count, delta, initialStep] of [
      ["Anim_JoltRight_Fast", 4, 12, 16, 4, 2],
      ["Anim_JoltRight", 2, 8, 12, 2, 1],
      ["Anim_JoltRight_Slow", 0, 6, 6, 2, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).not.toContain("if (sprite->data[2] == 0)");
      expect(initializer).toMatch(new RegExp(
        `HandleStartAffineAnim\\(sprite\\);[\\s\\S]*?sprite->data\\[7\\] = ${returnStep};[\\s\\S]*?sprite->data\\[6\\] = ${limit};[\\s\\S]*?sprite->data\\[5\\] = ${count};[\\s\\S]*?sprite->data\\[4\\] = ${delta};[\\s\\S]*?sprite->data\\[3\\] = 0;[\\s\\S]*?sprite->data\\[2\\] = ${initialStep};[\\s\\S]*?sprite->callback = JoltRight;`,
      ));
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
  });
});

describe("BACK_ANIM_JOLT_RIGHT reducer", () => {
  it("preserves every fast phase boundary, signed x2, and affine lifecycle", () => {
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 0, -1)).toMatchObject({
      x2: 0, y2: 0, data1: -1, data2: 2, data3: 0, data4: 4, data5: 16, data6: 12, data7: 4,
      phase: "initializer", callbackBefore: "Anim_JoltRight_Fast", callback: "JoltRight",
      initializerCalled: true, handleStartAffineAnimCalls: 1, tryFlipXCalls: 0,
      normalBackDontFlip: true, flipApplied: false, affineMode: "double",
    });
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 6)).toMatchObject({
      x2: -12, data7: 2, phase: "JoltRight", callback: "JoltRight_0", tryFlipXCalls: 2,
    });
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 10)).toMatchObject({
      x2: 2, data7: 6, phase: "JoltRight_0", callback: "JoltRight_1",
    });
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 12)).toMatchObject({
      x2: 12, data7: 8, phase: "JoltRight_1", callback: "JoltRight_2",
    });
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 28)).toMatchObject({
      x2: 12, data3: 16, data4: 4, phase: "JoltRight_2", callback: "JoltRight_2",
    });
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 29)).toMatchObject({
      x2: 12, data3: 16, phase: "JoltRight_2", callback: "JoltRight_3",
    });
    const terminal = backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 35)!;
    expect(terminal).toMatchObject({
      x2: 0, data3: 16, data4: 4, data5: 16, data6: 12, data7: 8,
      phase: "JoltRight_3", callback: "WaitAnimEnd", resetSpriteAfterAnim: true,
      tryFlipXCalls: 2, affineMode: "normal",
    });
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 999)).toEqual(terminal);
  });

  it.each([
    ["ELECTRIKE", NATURE_IDS.docile, 13, 30, 12, 2, 8, 12, 7, "Anim_JoltRight"],
    ["ELECTRODE", NATURE_IDS.quiet, 10, 20, 6, 2, 6, 6, 6, "Anim_JoltRight_Slow"],
  ] as const)("models %s selector-specific limits and terminal state", (
    species, natureId, phase2Start, terminalTick, count, delta, limit, expectedData3, expectedData7, initializer,
  ) => {
    expect(backJoltRightFrameAtTick(species, natureId, 0)).toMatchObject({
      callbackBefore: initializer, callback: "JoltRight", affineMode: "double",
    });
    expect(backJoltRightFrameAtTick(species, natureId, phase2Start)).toMatchObject({
      phase: "JoltRight_1", callback: "JoltRight_2", x2: limit,
    });
    expect(backJoltRightFrameAtTick(species, natureId, terminalTick)).toMatchObject({
      x2: 0, data3: expectedData3, data4: delta, data5: count, data6: limit, data7: expectedData7,
      callback: "WaitAnimEnd", resetSpriteAfterAnim: true, affineMode: "normal",
    });
  });

  it("models WaitAnimEnd/task restoration and rejects adjacent routes", () => {
    expect(backJoltRightWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backJoltRightWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backJoltRightTerminalSpriteData("MACHOP", NATURE_IDS.adamant, 0, 66))
      .toEqual([0, 0, 66, 16, 4, 16, 12, 8]);
    expect(backJoltRightTerminalSpriteData("ELECTRIKE", NATURE_IDS.docile, 0, 337))
      .toEqual([0, 0, 337, 12, 2, 12, 8, 7]);
    expect(backJoltRightTerminalSpriteData("ELECTRODE", NATURE_IDS.quiet, 0, 101))
      .toEqual([0, 0, 101, 6, 2, 6, 6, 6]);
    expect(backJoltRightFrameAtTick("ONIX", NATURE_IDS.adamant, 0)).toBeNull();
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, -1)).toBeNull();
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 0.5)).toBeNull();
    expect(backJoltRightFrameAtTick("MACHOP", NATURE_IDS.adamant, 0, 0.5)).toBeNull();
  });
});
