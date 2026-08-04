import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  BACK_SHAKE_GLOW_RED_FACTORY_SPECIES,
  BACK_SHAKE_GLOW_RED_OUTSIDE_FACTORY_SPECIES,
  BACK_SHAKE_GLOW_RED_SPECIES,
  BACK_SHAKE_GLOW_RED_VARIANTS,
  backShakeGlowRedFrameAtTick,
  backShakeGlowRedTerminalSpriteData,
  backShakeGlowRedWaitAnimEndCallback,
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
  sassy: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_SASSY"),
  gentle: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_GENTLE"),
} as const;

describe("BACK_ANIM_SHAKE_GLOW_RED source census and routing", () => {
  it("pins all 15 mappings, 13 Factory species, the 2 outside species, and 42 records", () => {
    expect(BACK_SHAKE_GLOW_RED_SPECIES).toEqual([
      "CHARIZARD",
      "PONYTA",
      "MAGMAR",
      "FLAREON",
      "MOLTRES",
      "TYPHLOSION",
      "SLUGMA",
      "MAGCARGO",
      "MAGBY",
      "ENTEI",
      "HO_OH",
      "BLAZIKEN",
      "TORKOAL",
      "CAMERUPT",
      "GROUDON",
    ]);
    expect(BACK_SHAKE_GLOW_RED_FACTORY_SPECIES).toEqual(
      BACK_SHAKE_GLOW_RED_SPECIES.filter(
        (species) => species !== "HO_OH" && species !== "GROUDON",
      ),
    );
    expect(BACK_SHAKE_GLOW_RED_OUTSIDE_FACTORY_SPECIES).toEqual([
      "HO_OH",
      "GROUDON",
    ]);
    expect(
      frontierMons.entries.filter(({ species }) =>
        BACK_SHAKE_GLOW_RED_FACTORY_SPECIES.includes(
          species.replace(/^SPECIES_/, ""),
        ),
      ),
    ).toHaveLength(42);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toMatchObject({
      backAnimSets: 25,
      selectorVariants: 75,
    });
    expect(
      selectorTables.backAnimationIds.sets.BACK_ANIM_SHAKE_GLOW_RED,
    ).toEqual([
      "ANIM_SHAKE_GLOW_RED_FAST",
      "ANIM_SHAKE_GLOW_RED",
      "ANIM_SHAKE_GLOW_RED_SLOW",
    ]);
  });

  it("batch-routes all 15 generated siblings under all three nature modifiers", () => {
    expect(NATURE_IDS).toEqual({ hardy: 0, sassy: 22, gentle: 21 });
    for (const species of BACK_SHAKE_GLOW_RED_SPECIES) {
      expect(
        selectBackSendOutAnimation(species, NATURE_IDS.hardy),
      ).toMatchObject({
        backAnimSetIndex: 22,
        backAnimSet: "BACK_ANIM_SHAKE_GLOW_RED",
        natureMod: 0,
        selector: "ANIM_SHAKE_GLOW_RED_FAST",
      });
      expect(
        selectBackSendOutAnimation(species, NATURE_IDS.sassy),
      ).toMatchObject({
        natureMod: 1,
        selector: "ANIM_SHAKE_GLOW_RED",
      });
      expect(
        selectBackSendOutAnimation(species, NATURE_IDS.gentle),
      ).toMatchObject({
        natureMod: 2,
        selector: "ANIM_SHAKE_GLOW_RED_SLOW",
      });
    }
  });

  it("pins source ids, red selector, helper order, C arithmetic, and the data[1]/sDontFlip alias", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_SHAKE_GLOW_RED\s+23$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_RED_FAST\s+142$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_RED\s+143$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_RED_SLOW\s+144$/m);
    expect(BACK_SHAKE_GLOW_RED_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_SHAKE_GLOW_RED_FAST",
        callback: "Anim_ShakeGlowRed_Fast",
        sourceId: 142,
        natureMod: 0,
        period: 10,
        passes: 2,
        movementThreshold: 54,
        accepted: true,
      },
      normal: {
        selector: "ANIM_SHAKE_GLOW_RED",
        callback: "Anim_ShakeGlowRed",
        sourceId: 143,
        natureMod: 1,
        period: 20,
        passes: 1,
        movementThreshold: 54,
        accepted: true,
      },
      slow: {
        selector: "ANIM_SHAKE_GLOW_RED_SLOW",
        callback: "Anim_ShakeGlowRed_Slow",
        sourceId: 144,
        natureMod: 2,
        period: 80,
        passes: 1,
        movementThreshold: 24,
        accepted: true,
      },
    });
    const familyStart = source.indexOf("enum {\n    SHAKEGLOW_RED");
    const family = source.slice(
      familyStart,
      source.indexOf("static void Anim_ShakeGlowGreen_Fast", familyStart),
    );
    expect(family).toMatch(/SHAKEGLOW_RED[\s\S]*?= RGB_RED/);
    expect(family).toMatch(
      /data\[2\] > 127[\s\S]*?BlendPalette\(sprite->data\[7\], 16, 0, RGB_RED\)[\s\S]*?callback = WaitAnimEnd/,
    );
    expect(family).toMatch(
      /data\[6\] = Sin\(sprite->data\[2\], 12\)[\s\S]*?BlendPalette\(sprite->data\[7\], 16, sprite->data\[6\], sColors\[sprite->data\[1\]\]\)/,
    );
    expect(family).toMatch(
      /data\[3\] < sprite->data\[4\][\s\S]*?data\[5\] > sprite->data\[0\][\s\S]*?\+\+sprite->data\[3\][\s\S]*?data\[5\] = 0/,
    );
    expect(family).toMatch(
      /s8 sign = 1 - \(sprite->data\[3\] % 2 \* 2\)[\s\S]*?Sin\(\(sprite->data\[5\] \* 384 \/ sprite->data\[0\]\) % 256, 6\)[\s\S]*?data\[5\]\+\+/,
    );
    const move = family.slice(
      family.indexOf("static void ShakeGlow_Move"),
      family.indexOf("static void Anim_ShakeGlowRed_Fast"),
    );
    expect(move.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    expect(source).toContain("#define sDontFlip data[1]");
    for (const [callback, period, passes] of [
      ["Anim_ShakeGlowRed_Fast", 10, 2],
      ["Anim_ShakeGlowRed", 20, 1],
      ["Anim_ShakeGlowRed_Slow", 80, 1],
    ] as const) {
      const start = family.indexOf(
        `static void ${callback}(struct Sprite *sprite)`,
      );
      const body = family.slice(start, family.indexOf("\n}\n", start) + 3);
      expect(body).toMatch(
        new RegExp(
          `data\\[2\\] == 0[\\s\\S]*?OBJ_PLTT_ID[\\s\\S]*?data\\[0\\] = ${period}[\\s\\S]*?data\\[4\\] = ${passes}[\\s\\S]*?data\\[1\\] = SHAKEGLOW_RED`,
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
    // This family is the exception to the launch default: its color selector
    // reuses data[1] and writes SHAKEGLOW_RED == 0 before movement begins.
    expect(family).toMatch(/data\[1\] = SHAKEGLOW_RED/);
  });
});

describe("BACK_ANIM_SHAKE_GLOW_RED reducer", () => {
  it.each([
    ["PONYTA", NATURE_IDS.hardy, 10, 2, 54, "Anim_ShakeGlowRed_Fast", 2, 11],
    ["SLUGMA", NATURE_IDS.sassy, 20, 1, 54, "Anim_ShakeGlowRed", 1, 21],
    ["MAGCARGO", NATURE_IDS.gentle, 80, 1, 24, "Anim_ShakeGlowRed_Slow", 1, 81],
  ] as const)(
    "models %s initializer, movement lifecycle, red restore, and trailing increment",
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
      expect(backShakeGlowRedFrameAtTick(species, nature, 0)).toMatchObject({
        x2: 0,
        data0: period,
        data1: 0,
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
        blendColor: "RGB_RED",
        movementThreshold: threshold,
        moveCalled: false,
      });
      const terminal = backShakeGlowRedFrameAtTick(species, nature, 128)!;
      expect(terminal).toMatchObject({
        x2: 0,
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
      expect(backShakeGlowRedFrameAtTick(species, nature, 999)).toEqual(
        terminal,
      );
    },
  );

  it("preserves even-tick blend cadence and exact fast movement sequencing", () => {
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 1),
    ).toMatchObject({
      data2: 2,
      data6: 0,
      blendCalled: false,
      blendCoefficient: null,
    });
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 54),
    ).toMatchObject({
      data2: 55,
      data3: 0,
      data5: 1,
      data6: 11,
      x2: 0,
      movementPhase: 0,
      movementIndex: 0,
      movementSign: 1,
      tryFlipXCalls: 2,
    });
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 55),
    ).toMatchObject({
      data2: 56,
      data5: 2,
      x2: -4,
      movementIndex: 38,
      movementSign: 1,
      flipApplied: true,
    });
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 65),
    ).toMatchObject({
      data3: 1,
      data5: 0,
      x2: 0,
    });
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 66),
    ).toMatchObject({
      data3: 1,
      data5: 1,
      x2: 0,
      movementIndex: 0,
      movementSign: -1,
    });
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 75),
    ).toMatchObject({
      data3: 1,
      data5: 10,
      x2: 4,
      movementIndex: 89,
      movementSign: -1,
      flipApplied: true,
    });
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 77),
    ).toMatchObject({
      data3: 2,
      data5: 11,
      x2: 0,
    });
  });

  it("models WaitAnimEnd/task restoration and rejects adjacent routes", () => {
    expect(backShakeGlowRedWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShakeGlowRedWaitAnimEndCallback(true)).toBe(
      "SpriteCallbackDummy",
    );
    expect(
      backShakeGlowRedTerminalSpriteData("PONYTA", NATURE_IDS.hardy, 0, 77),
    ).toEqual([0, 0, 77, 2, 2, 11, 0, 256]);
    expect(
      backShakeGlowRedTerminalSpriteData("SLUGMA", NATURE_IDS.sassy, 0, 218),
    ).toEqual([0, 0, 218, 1, 1, 21, 0, 256]);
    expect(
      backShakeGlowRedTerminalSpriteData("MAGCARGO", NATURE_IDS.gentle, 0, 219),
    ).toEqual([0, 0, 219, 1, 1, 81, 0, 256]);
    expect(backShakeGlowRedFrameAtTick("ONIX", NATURE_IDS.hardy, 0)).toBeNull();
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, -1),
    ).toBeNull();
    expect(
      backShakeGlowRedFrameAtTick("PONYTA", NATURE_IDS.hardy, 0.5),
    ).toBeNull();
  });
});
