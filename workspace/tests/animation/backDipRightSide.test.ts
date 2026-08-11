import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_DIP_RIGHT_SIDE_FACTORY_SPECIES,
  BACK_DIP_RIGHT_SIDE_OUTSIDE_FACTORY_SPECIES,
  BACK_DIP_RIGHT_SIDE_SPECIES,
  BACK_DIP_RIGHT_SIDE_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  backDipRightSideFrameAtTick,
  backDipRightSideTerminalSpriteData,
  backDipRightSideWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const source = readFileSync(
  new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
);
const constants = readFileSync(
  new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
);

const NATURE_IDS = {
  naughty: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_NAUGHTY"),
  relaxed: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_RELAXED"),
  bashful: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_BASHFUL"),
} as const;

describe("BACK_ANIM_DIP_RIGHT_SIDE source census and routing", () => {
  it("pins the complete 38-mapping Factory census and source selector order", () => {
    expect(BACK_DIP_RIGHT_SIDE_SPECIES).toHaveLength(38);
    expect(BACK_DIP_RIGHT_SIDE_FACTORY_SPECIES).toHaveLength(38);
    expect(BACK_DIP_RIGHT_SIDE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(frontierMons.entries.filter(({ species }) =>
      BACK_DIP_RIGHT_SIDE_FACTORY_SPECIES.includes(species.replace(/^SPECIES_/, "")),
    )).toHaveLength(68);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS.backAnimSets).toBe(25);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS.selectorVariants).toBe(75);
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_DIP_RIGHT_SIDE).toEqual([
      "ANIM_H_DIP_TWICE", "ANIM_H_DIP", "ANIM_H_DIP_FAST",
    ]);
    expect(BACK_DIP_RIGHT_SIDE_VARIANTS).toEqual({
      twice: { selector: "ANIM_H_DIP_TWICE", callback: "Anim_HorizontalDip_Twice", sourceId: 132, natureMod: 0, duration: 30, runs: 2, amplitude: 8, offset: -32, accepted: true },
      normal: { selector: "ANIM_H_DIP", callback: "Anim_HorizontalDip", sourceId: 130, natureMod: 1, duration: 60, runs: 1, amplitude: 8, offset: -32, accepted: true },
      fast: { selector: "ANIM_H_DIP_FAST", callback: "Anim_HorizontalDip_Fast", sourceId: 131, natureMod: 2, duration: 90, runs: 1, amplitude: 8, offset: -32, accepted: true },
    });
  });

  it("routes every sibling through the source nature-modifier triple", () => {
    expect(NATURE_IDS).toEqual({ naughty: 4, relaxed: 7, bashful: 18 });
    const cases = [
      ["BALTOY", NATURE_IDS.naughty, 0, "ANIM_H_DIP_TWICE"],
      ["SUNKERN", NATURE_IDS.relaxed, 1, "ANIM_H_DIP"],
      ["METAPOD", NATURE_IDS.bashful, 2, "ANIM_H_DIP_FAST"],
    ] as const;
    for (const [species, natureId, natureMod, selector] of cases) {
      expect(selectBackSendOutAnimation(species, natureId)).toMatchObject({
        backAnimSetIndex: 18, backAnimSet: "BACK_ANIM_DIP_RIGHT_SIDE", natureMod, selector,
      });
    }
    for (const species of BACK_DIP_RIGHT_SIDE_SPECIES) {
      expect(selectBackSendOutAnimation(species, NATURE_IDS.naughty)?.selector).toBe("ANIM_H_DIP_TWICE");
      expect(selectBackSendOutAnimation(species, NATURE_IDS.relaxed)?.selector).toBe("ANIM_H_DIP");
      expect(selectBackSendOutAnimation(species, NATURE_IDS.bashful)?.selector).toBe("ANIM_H_DIP_FAST");
    }
  });

  it("pins source ids, initializer constants, strict threshold, and affine lifecycle", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_DIP_RIGHT_SIDE\s+19$/m);
    expect(constants).toMatch(/^#define ANIM_H_DIP\s+130$/m);
    expect(constants).toMatch(/^#define ANIM_H_DIP_FAST\s+131$/m);
    expect(constants).toMatch(/^#define ANIM_H_DIP_TWICE\s+132$/m);
    const helperStart = source.indexOf("static void SetHorizontalDip(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_HorizontalDip(struct Sprite *sprite)", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper).toContain("Sin((sprite->data[2] * 128) / sprite->data[7], sprite->data[5])");
    expect(helper).toContain("sprite->data[6] = -(index << 8);");
    expect(helper).toContain("SetPosForRotation(sprite, index, sprite->data[4], 0);");
    expect(helper).toContain("HandleSetAffineData(sprite, 256, 256, sprite->data[6]);");
    for (const [callback, duration, runs] of [
      ["Anim_HorizontalDip_Twice", 30, 2], ["Anim_HorizontalDip", 60, 1], ["Anim_HorizontalDip_Fast", 90, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain("if (sprite->data[2] == 0)");
      expect(initializer).toContain("HandleStartAffineAnim(sprite);");
      expect(initializer).toContain(`sprite->data[7] = ${duration};`);
      expect(initializer).toContain(`sprite->data[3] = ${runs};`);
      expect(initializer).toContain("sprite->data[5] = 8;");
      expect(initializer).toContain("sprite->data[4] = -32;");
      expect(initializer).toContain("sprite->data[0] = 0;");
      expect(initializer).toContain("SetHorizontalDip(sprite);");
      expect(initializer).not.toContain("TryFlipX");
    }
  });
});

describe("BACK_ANIM_DIP_RIGHT_SIDE reducer", () => {
  it("preserves SetPosForRotation, u16 rotation, affine writes, and the twice restart", () => {
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 0, -1)).toMatchObject({
      x2: 0, y2: 0, data0: 0, data1: -1, data2Before: 0, data2: 1,
      data3: 2, data4: -32, data5: 8, data6: 0, data7: 30,
      phaseIndex: 0, rotationIndex: 0, rotationSigned: 0, rotationU16: 0,
      initializerCalled: true, handleStartAffineAnimCalls: 1,
      affineMode: "double", affineWriteCount: 1, callback: "Anim_HorizontalDip_Twice",
    });
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 15, -1)).toMatchObject({
      x2: -1, y2: 6, data2Before: 15, data2: 16, phaseIndex: 64, rotationIndex: 8,
      data6: -2048, rotationSigned: -2048, rotationU16: 63488,
      affineWrites: [{ xScale: 256, yScale: 256, rotationSigned: -2048, rotationU16: 63488 }],
    });
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 30, -1)).toMatchObject({
      strictOverflow: false, data0: 0, data2Before: 30, data2: 31, phaseIndex: 128,
      rotationIndex: 0, x2: 0, y2: 0, affineMode: "double", callback: "Anim_HorizontalDip_Twice",
    });
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 31, -1)).toMatchObject({
      strictOverflow: true, perRunReset: true, data0: 1, data2Before: 31, data2: 1,
      x2: 0, y2: 0, affineWrites: [{ xScale: 256, yScale: 256, rotationSigned: 0, rotationU16: 0 }],
      resetSpriteAfterAnim: false, affineMode: "double", callback: "Anim_HorizontalDip_Twice",
    });
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 62, -1)).toMatchObject({
      strictOverflow: true, perRunReset: true, data0: 2, data2Before: 31, data2: 31,
      resetSpriteAfterAnim: true, affineMode: "normal", callback: "WaitAnimEnd",
    });
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 999, -1)).toEqual(
      backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 62, -1),
    );
  });

  it.each([
    ["SUNKERN", NATURE_IDS.relaxed, "Anim_HorizontalDip", 60, 1],
    ["METAPOD", NATURE_IDS.bashful, "Anim_HorizontalDip_Fast", 90, 1],
  ] as const)("models %s terminal reset", (species, natureId, callback, duration, runs) => {
    expect(backDipRightSideFrameAtTick(species, natureId, duration, -1)).toMatchObject({ callback });
    const terminal = backDipRightSideFrameAtTick(species, natureId, duration + 1, -1)!;
    expect(terminal).toMatchObject({
      strictOverflow: true, perRunReset: true, data0: runs, data2Before: duration + 1,
      data2: duration + 1, x2: 0, y2: 0, resetSpriteAfterAnim: true,
      affineMode: "normal",
    });
    expect(terminal.callback).toBe("WaitAnimEnd");
  });

  it("models WaitAnimEnd/task restoration and rejects adjacent routes", () => {
    expect(backDipRightSideWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backDipRightSideWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backDipRightSideTerminalSpriteData("BALTOY", NATURE_IDS.naughty, 0, 318))
      .toEqual([0, 0, 318, 2, -32, 8, 0, 30]);
    expect(backDipRightSideTerminalSpriteData("SUNKERN", NATURE_IDS.relaxed, 0, 191))
      .toEqual([0, 0, 191, 1, -32, 8, 0, 60]);
    expect(backDipRightSideFrameAtTick("ONIX", NATURE_IDS.naughty, 0)).toBeNull();
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, -1)).toBeNull();
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 0.5)).toBeNull();
    expect(backDipRightSideFrameAtTick("BALTOY", NATURE_IDS.naughty, 0, 0.5)).toBeNull();
    expect(backDipRightSideFrameAtTick("NOT_A_SPECIES", NATURE_IDS.naughty, 0)).toBeNull();
  });
});
