import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  BACK_SHAKE_GLOW_BLUE_FACTORY_SPECIES,
  BACK_SHAKE_GLOW_BLUE_OUTSIDE_FACTORY_SPECIES,
  BACK_SHAKE_GLOW_BLUE_SPECIES,
  BACK_SHAKE_GLOW_BLUE_VARIANTS,
  backShakeGlowBlueFrameAtTick,
  backShakeGlowBlueTerminalSpriteData,
  backShakeGlowBlueWaitAnimEndCallback,
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
  adamant: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_ADAMANT"),
  docile: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_DOCILE"),
  quiet: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_QUIET"),
  modest: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_MODEST"),
} as const;

describe("BACK_ANIM_SHAKE_GLOW_BLUE source census and routing", () => {
  it("pins all 13 mappings, 11 Factory species, Lugia/Kyogre outside, and 54 records", () => {
    expect(BACK_SHAKE_GLOW_BLUE_SPECIES).toEqual([
      "BLASTOISE", "STARMIE", "LAPRAS", "VAPOREON", "ARTICUNO",
      "KINGDRA", "SUICUNE", "LUGIA", "SWAMPERT", "WAILMER", "WAILORD",
      "MILOTIC", "KYOGRE",
    ]);
    expect(BACK_SHAKE_GLOW_BLUE_FACTORY_SPECIES).toHaveLength(11);
    expect(BACK_SHAKE_GLOW_BLUE_OUTSIDE_FACTORY_SPECIES).toEqual(["LUGIA", "KYOGRE"]);
    expect(frontierMons.entries.filter(({ species }) =>
      BACK_SHAKE_GLOW_BLUE_FACTORY_SPECIES.includes(species.replace(/^SPECIES_/, "")),
    )).toHaveLength(54);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toMatchObject({
      backAnimSets: 25,
      selectorVariants: 75,
    });
    expect(
      selectorTables.backAnimationIds.sets.BACK_ANIM_SHAKE_GLOW_BLUE,
    ).toEqual([
      "ANIM_SHAKE_GLOW_BLUE_FAST",
      "ANIM_SHAKE_GLOW_BLUE",
      "ANIM_SHAKE_GLOW_BLUE_SLOW",
    ]);
  });

  it("batch-routes both source mappings under all three nature modifiers", () => {
    expect(NATURE_IDS).toEqual({ hardy: 0, adamant: 3, docile: 6, quiet: 17, modest: 15 });
    for (const species of BACK_SHAKE_GLOW_BLUE_SPECIES) {
      expect(selectBackSendOutAnimation(species, NATURE_IDS.hardy)).toMatchObject({
        backAnimSetIndex: 24,
        backAnimSet: "BACK_ANIM_SHAKE_GLOW_BLUE",
        natureMod: 0,
        selector: "ANIM_SHAKE_GLOW_BLUE_FAST",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.docile)).toMatchObject({
        natureMod: 1,
        selector: "ANIM_SHAKE_GLOW_BLUE",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.quiet)).toMatchObject({
        natureMod: 2,
        selector: "ANIM_SHAKE_GLOW_BLUE_SLOW",
      });
    }
  });

  it("pins IDs 148/149/150, shared helper order, SHAKEGLOW_BLUE == 2, and sDontFlip alias", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_SHAKE_GLOW_BLUE\s+25$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_BLUE_FAST\s+148$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_BLUE\s+149$/m);
    expect(constants).toMatch(/^#define ANIM_SHAKE_GLOW_BLUE_SLOW\s+150$/m);
    expect(BACK_SHAKE_GLOW_BLUE_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_SHAKE_GLOW_BLUE_FAST",
        callback: "Anim_ShakeGlowBlue_Fast",
        sourceId: 148,
        natureMod: 0,
        period: 10,
        passes: 2,
        movementThreshold: 54,
        accepted: true,
      },
      normal: {
        selector: "ANIM_SHAKE_GLOW_BLUE",
        callback: "Anim_ShakeGlowBlue",
        sourceId: 149,
        natureMod: 1,
        period: 20,
        passes: 1,
        movementThreshold: 54,
        accepted: true,
      },
      slow: {
        selector: "ANIM_SHAKE_GLOW_BLUE_SLOW",
        callback: "Anim_ShakeGlowBlue_Slow",
        sourceId: 150,
        natureMod: 2,
        period: 80,
        passes: 1,
        movementThreshold: 24,
        accepted: true,
      },
    });
    const familyStart = source.indexOf("enum {\n    SHAKEGLOW_RED");
    const blueStart = source.indexOf("static void Anim_ShakeGlowBlue_Fast", familyStart);
    const family = source.slice(
      familyStart,
      source.indexOf("static void WaitAnimEnd", blueStart),
    );
    expect(family).toMatch(/SHAKEGLOW_RED,\s*SHAKEGLOW_GREEN,\s*SHAKEGLOW_BLUE,/);
    expect(family).toMatch(/SHAKEGLOW_BLUE\]\s*= RGB_BLUE/);
    expect(family).toMatch(
      /data\[2\] > 127[\s\S]*?BlendPalette\(sprite->data\[7\], 16, 0, RGB_RED\)[\s\S]*?callback = WaitAnimEnd/,
    );
    const move = family.slice(
      family.indexOf("static void ShakeGlow_Move"),
      blueStart,
    );
    expect(move.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    expect(source).toContain("#define sDontFlip data[1]");
    for (const [callback, period, passes] of [
      ["Anim_ShakeGlowBlue_Fast", 10, 2],
      ["Anim_ShakeGlowBlue", 20, 1],
      ["Anim_ShakeGlowBlue_Slow", 80, 1],
    ] as const) {
      const start = family.indexOf(`static void ${callback}(struct Sprite *sprite)`);
      const body = family.slice(start, family.indexOf("\n}\n", start) + 3);
      expect(body).toMatch(
        new RegExp(
          `data\\[2\\] == 0[\\s\\S]*?OBJ_PLTT_ID[\\s\\S]*?data\\[0\\] = ${period}[\\s\\S]*?data\\[4\\] = ${passes}[\\s\\S]*?data\\[1\\] = SHAKEGLOW_BLUE`,
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

describe("BACK_ANIM_SHAKE_GLOW_BLUE reducer", () => {
  it.each([
    ["SWAMPERT", NATURE_IDS.adamant, 10, 2, 54, "Anim_ShakeGlowBlue_Fast", 2, 11],
    ["WAILMER", NATURE_IDS.docile, 20, 1, 54, "Anim_ShakeGlowBlue", 1, 21],
    ["STARMIE", NATURE_IDS.modest, 80, 1, 24, "Anim_ShakeGlowBlue_Slow", 1, 81],
  ] as const)(
    "models %s selector initialization, blue palette blend, and source terminal lifecycle",
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
      expect(backShakeGlowBlueFrameAtTick(species, nature, 0)).toMatchObject({
        x2: 0,
        data0: period,
        data1: 2,
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
        blendColor: "RGB_BLUE",
        dontFlipAfterColorSelector: true,
        flipApplied: false,
        movementThreshold: threshold,
        moveCalled: false,
      });
      const terminal = backShakeGlowBlueFrameAtTick(species, nature, 128)!;
      expect(terminal).toMatchObject({
        x2: 0,
        data1: 2,
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
      expect(backShakeGlowBlueFrameAtTick(species, nature, 999)).toEqual(
        terminal,
      );
    },
  );

  it("keeps both source TryFlipX calls as no-ops after SHAKEGLOW_BLUE == 2", () => {
    expect(backShakeGlowBlueFrameAtTick("SWAMPERT", NATURE_IDS.adamant, 54)).toMatchObject({
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
    expect(backShakeGlowBlueFrameAtTick("SWAMPERT", NATURE_IDS.adamant, 55)).toMatchObject({
      data2: 56,
      data5: 2,
      x2: 4,
      movementIndex: 38,
      movementSign: 1,
      tryFlipXCalls: 2,
      flipApplied: false,
    });
    expect(backShakeGlowBlueFrameAtTick("SWAMPERT", NATURE_IDS.adamant, 65)).toMatchObject({
      data3: 1,
      data5: 0,
      x2: 0,
    });
    expect(backShakeGlowBlueFrameAtTick("SWAMPERT", NATURE_IDS.adamant, 75)).toMatchObject({
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
    expect(backShakeGlowBlueWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShakeGlowBlueWaitAnimEndCallback(true)).toBe(
      "SpriteCallbackDummy",
    );
    expect(
      backShakeGlowBlueTerminalSpriteData("SWAMPERT", NATURE_IDS.adamant, 0, 285),
    ).toEqual([0, 0, 285, 2, 2, 11, 0, 256]);
    expect(
      backShakeGlowBlueTerminalSpriteData("WAILMER", NATURE_IDS.docile, 0, 313),
    ).toEqual([0, 0, 313, 1, 1, 21, 0, 256]);
    expect(
      backShakeGlowBlueTerminalSpriteData("STARMIE", NATURE_IDS.modest, 0, 121),
    ).toEqual([0, 0, 121, 1, 1, 81, 0, 256]);
    expect(backShakeGlowBlueFrameAtTick("ONIX", NATURE_IDS.hardy, 0)).toBeNull();
    expect(backShakeGlowBlueFrameAtTick("SWAMPERT", NATURE_IDS.adamant, -1)).toBeNull();
    expect(backShakeGlowBlueFrameAtTick("SWAMPERT", NATURE_IDS.adamant, 0.5)).toBeNull();
  });
});
