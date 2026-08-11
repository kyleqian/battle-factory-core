import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  BACK_SHAKE_GLOW_GREEN_FACTORY_SPECIES,
  BACK_SHAKE_GLOW_GREEN_OUTSIDE_FACTORY_SPECIES,
  BACK_SHAKE_GLOW_GREEN_SPECIES,
  BACK_SHAKE_GLOW_GREEN_VARIANTS,
  backShakeGlowGreenFrameAtTick,
  backShakeGlowGreenTerminalSpriteData,
  backShakeGlowGreenWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const source = readFileSync(
  new URL(
    "../../reference/pokeemerald/src/pokemon_animation.c",
    import.meta.url,
  ),
  "utf8",
);
const constants = readFileSync(
  new URL(
    "../../reference/pokeemerald/include/pokemon_animation.h",
    import.meta.url,
  ),
  "utf8",
);
const NATURE_IDS = {
  hardy: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_HARDY"),
  docile: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_DOCILE"),
  quiet: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_QUIET"),
} as const;

describe("BACK_ANIM_SHAKE_GLOW_GREEN source census and routing", () => {
  it("pins both mappings, Roselia's complete Factory row, and Celebi outside", () => {
    expect(BACK_SHAKE_GLOW_GREEN_SPECIES).toEqual(["CELEBI", "ROSELIA"]);
    expect(BACK_SHAKE_GLOW_GREEN_FACTORY_SPECIES).toEqual(["ROSELIA"]);
    expect(BACK_SHAKE_GLOW_GREEN_OUTSIDE_FACTORY_SPECIES).toEqual(["CELEBI"]);
    const roseliaRecords = frontierMons.entries.filter(
      ({ species }) => species === "SPECIES_ROSELIA",
    );
    expect(roseliaRecords).toEqual([
      expect.objectContaining({
        index: 171,
        label: "FRONTIER_MON_ROSELIA_1",
        nature: "NATURE_DOCILE",
      }),
      expect.objectContaining({
        index: 276,
        label: "FRONTIER_MON_ROSELIA_2",
        nature: "NATURE_DOCILE",
      }),
    ]);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toMatchObject({
      backAnimSets: 25,
      selectorVariants: 75,
    });
    expect(
      selectorTables.backAnimationIds.sets.BACK_ANIM_SHAKE_GLOW_GREEN,
    ).toEqual([
      "ANIM_SHAKE_GLOW_GREEN_FAST",
      "ANIM_SHAKE_GLOW_GREEN",
      "ANIM_SHAKE_GLOW_GREEN_SLOW",
    ]);
  });

  it("batch-routes both source mappings under all three nature modifiers", () => {
    expect(NATURE_IDS).toEqual({ hardy: 0, docile: 6, quiet: 17 });
    for (const species of BACK_SHAKE_GLOW_GREEN_SPECIES) {
      expect(selectBackSendOutAnimation(species, NATURE_IDS.hardy)).toMatchObject({
        backAnimSetIndex: 23,
        backAnimSet: "BACK_ANIM_SHAKE_GLOW_GREEN",
        natureMod: 0,
        selector: "ANIM_SHAKE_GLOW_GREEN_FAST",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.docile)).toMatchObject({
        natureMod: 1,
        selector: "ANIM_SHAKE_GLOW_GREEN",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.quiet)).toMatchObject({
        natureMod: 2,
        selector: "ANIM_SHAKE_GLOW_GREEN_SLOW",
      });
    }
  });

  it("pins IDs 145/146/147, the shared helper order, green palette selector, and sDontFlip alias", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_SHAKE_GLOW_GREEN\s+24$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_GREEN_FAST\s+145$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_GREEN\s+146$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_GREEN_SLOW\s+147$/m);
    expect(BACK_SHAKE_GLOW_GREEN_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_SHAKE_GLOW_GREEN_FAST",
        callback: "Anim_ShakeGlowGreen_Fast",
        sourceId: 145,
        natureMod: 0,
        period: 10,
        passes: 2,
        movementThreshold: 54,
        accepted: true,
      },
      normal: {
        selector: "ANIM_SHAKE_GLOW_GREEN",
        callback: "Anim_ShakeGlowGreen",
        sourceId: 146,
        natureMod: 1,
        period: 20,
        passes: 1,
        movementThreshold: 54,
        accepted: true,
      },
      slow: {
        selector: "ANIM_SHAKE_GLOW_GREEN_SLOW",
        callback: "Anim_ShakeGlowGreen_Slow",
        sourceId: 147,
        natureMod: 2,
        period: 80,
        passes: 1,
        movementThreshold: 24,
        accepted: true,
      },
    });
    const familyStart = source.indexOf("enum {\n    SHAKEGLOW_RED");
    const greenStart = source.indexOf("static void Anim_ShakeGlowGreen_Fast", familyStart);
    const family = source.slice(
      familyStart,
      source.indexOf("static void Anim_ShakeGlowBlue_Fast", greenStart),
    );
    expect(family).toMatch(/SHAKEGLOW_RED,\s*SHAKEGLOW_GREEN,/);
    expect(family).toMatch(/SHAKEGLOW_GREEN\] = RGB_GREEN/);
    expect(family).toMatch(
      /data\[2\] > 127[\s\S]*?BlendPalette\(sprite->data\[7\], 16, 0, RGB_RED\)[\s\S]*?callback = WaitAnimEnd/,
    );
    const move = family.slice(
      family.indexOf("static void ShakeGlow_Move"),
      greenStart,
    );
    expect(move.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    expect(source).toContain("#define sDontFlip data[1]");
    for (const [callback, period, passes] of [
      ["Anim_ShakeGlowGreen_Fast", 10, 2],
      ["Anim_ShakeGlowGreen", 20, 1],
      ["Anim_ShakeGlowGreen_Slow", 80, 1],
    ] as const) {
      const start = family.indexOf(`static void ${callback}(struct Sprite *sprite)`);
      const body = family.slice(start, family.indexOf("\n}\n", start) + 3);
      expect(body).toMatch(
        new RegExp(
          `data\\[2\\] == 0[\\s\\S]*?OBJ_PLTT_ID[\\s\\S]*?data\\[0\\] = ${period}[\\s\\S]*?data\\[4\\] = ${passes}[\\s\\S]*?data\\[1\\] = SHAKEGLOW_GREEN`,
        ),
      );
      expect(body.indexOf("ShakeGlow_Blend(sprite)")).toBeLessThan(
        body.indexOf("ShakeGlow_Move(sprite)"),
      );
      expect(body).toMatch(
        /data\[2\] >= \(128 - sprite->data\[0\] \* sprite->data\[4\]\) \/ 2/,
      );
      expect(body.trimEnd().endsWith("sprite->data[2]++;\n}")).toBe(true);
    }
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
  });
});

describe("BACK_ANIM_SHAKE_GLOW_GREEN reducer", () => {
  it.each([
    ["ROSELIA", NATURE_IDS.hardy, 10, 2, 54, "Anim_ShakeGlowGreen_Fast", 2, 11],
    ["ROSELIA", NATURE_IDS.docile, 20, 1, 54, "Anim_ShakeGlowGreen", 1, 21],
    ["ROSELIA", NATURE_IDS.quiet, 80, 1, 24, "Anim_ShakeGlowGreen_Slow", 1, 81],
  ] as const)(
    "models %s selector initialization, green palette blend, and source terminal lifecycle",
    (
      species,
      nature,
      period,
      passes,
      threshold,
      callback,
      terminalPhase,
      terminalData5,
    ) => {
      expect(backShakeGlowGreenFrameAtTick(species, nature, 0)).toMatchObject({
        x2: 0,
        data0: period,
        data1: 1,
        data2: 1,
        data3: 0,
        data4: passes,
        data5: 0,
        data6: 0,
        data7: 256,
        callbackBefore: callback,
        callback,
        initializerCalled: true,
        blendCalled: true,
        blendCoefficient: 0,
        blendColor: "RGB_GREEN",
        dontFlipAfterColorSelector: true,
        flipApplied: false,
        movementThreshold: threshold,
        moveCalled: false,
      });
      const terminal = backShakeGlowGreenFrameAtTick(species, nature, 128)!;
      expect(terminal).toMatchObject({
        x2: 0,
        data1: 1,
        data2: 129,
        data3: terminalPhase,
        data5: terminalData5,
        data6: 0,
        data7: 256,
        callback: "WaitAnimEnd",
        blendCalled: true,
        blendCoefficient: 0,
        blendColor: "RGB_RED",
        paletteRestored: true,
        moveCalled: false,
        terminal: true,
      });
      expect(backShakeGlowGreenFrameAtTick(species, nature, 999)).toEqual(
        terminal,
      );
    },
  );

  it("keeps both source TryFlipX calls as no-ops after SHAKEGLOW_GREEN == 1", () => {
    expect(backShakeGlowGreenFrameAtTick("ROSELIA", NATURE_IDS.hardy, 54)).toMatchObject({
      data2: 55,
      data3: 0,
      data5: 1,
      data6: 11,
      x2: 0,
      movementPhase: 0,
      movementIndex: 0,
      movementSign: 1,
      tryFlipXCalls: 2,
      dontFlipAfterColorSelector: true,
      flipApplied: false,
    });
    expect(backShakeGlowGreenFrameAtTick("ROSELIA", NATURE_IDS.hardy, 55)).toMatchObject({
      data2: 56,
      data5: 2,
      x2: 4,
      movementIndex: 38,
      movementSign: 1,
      tryFlipXCalls: 2,
      flipApplied: false,
    });
    expect(backShakeGlowGreenFrameAtTick("ROSELIA", NATURE_IDS.hardy, 65)).toMatchObject({
      data3: 1,
      data5: 0,
      x2: 0,
    });
    expect(backShakeGlowGreenFrameAtTick("ROSELIA", NATURE_IDS.hardy, 75)).toMatchObject({
      data3: 1,
      data5: 10,
      x2: -4,
      movementIndex: 89,
      movementSign: -1,
      tryFlipXCalls: 2,
      flipApplied: false,
    });
  });

  it("models WaitAnimEnd/task restoration and rejects adjacent routes", () => {
    expect(backShakeGlowGreenWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShakeGlowGreenWaitAnimEndCallback(true)).toBe(
      "SpriteCallbackDummy",
    );
    expect(
      backShakeGlowGreenTerminalSpriteData("ROSELIA", NATURE_IDS.hardy, 0, 363),
    ).toEqual([0, 0, 363, 2, 2, 11, 0, 256]);
    expect(
      backShakeGlowGreenTerminalSpriteData("ROSELIA", NATURE_IDS.docile, 0, 363),
    ).toEqual([0, 0, 363, 1, 1, 21, 0, 256]);
    expect(
      backShakeGlowGreenTerminalSpriteData("ROSELIA", NATURE_IDS.quiet, 0, 363),
    ).toEqual([0, 0, 363, 1, 1, 81, 0, 256]);
    expect(backShakeGlowGreenFrameAtTick("ONIX", NATURE_IDS.hardy, 0)).toBeNull();
    expect(backShakeGlowGreenFrameAtTick("ROSELIA", NATURE_IDS.hardy, -1)).toBeNull();
    expect(backShakeGlowGreenFrameAtTick("ROSELIA", NATURE_IDS.hardy, 0.5)).toBeNull();
  });
});
