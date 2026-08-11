import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SHAKE_FLASH_YELLOW_FACTORY_SPECIES,
  BACK_SHAKE_FLASH_YELLOW_OUTSIDE_FACTORY_SPECIES,
  BACK_SHAKE_FLASH_YELLOW_SPECIES,
  BACK_SHAKE_FLASH_YELLOW_VARIANTS,
  SHAKE_YELLOW_FLASH_TABLES,
  backShakeFlashYellowFrameAtTick,
  backShakeFlashYellowTerminalSpriteData,
  backShakeFlashYellowWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const source = readFileSync(new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8");
const constants = readFileSync(new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8");
const NATURE_IDS = {
  adamant: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_ADAMANT"),
  docile: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_DOCILE"),
  quiet: BACK_ANIM_NATURE_ORDER.indexOf("NATURE_QUIET"),
} as const;

describe("BACK_ANIM_SHAKE_FLASH_YELLOW source census and routing", () => {
  it("pins all 8 mappings, all 8 Factory species, zero outside, and 33 records", () => {
    expect(BACK_SHAKE_FLASH_YELLOW_SPECIES).toEqual([
      "PIKACHU", "RAICHU", "ELECTABUZZ", "JOLTEON", "ZAPDOS", "LANTURN", "AMPHAROS", "RAIKOU",
    ]);
    expect(BACK_SHAKE_FLASH_YELLOW_FACTORY_SPECIES).toEqual(BACK_SHAKE_FLASH_YELLOW_SPECIES);
    expect(BACK_SHAKE_FLASH_YELLOW_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(frontierMons.entries.filter(({ species }) =>
      BACK_SHAKE_FLASH_YELLOW_FACTORY_SPECIES.includes(species.replace(/^SPECIES_/, "")),
    )).toHaveLength(33);
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toMatchObject({ backAnimSets: 25, selectorVariants: 75 });
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_SHAKE_FLASH_YELLOW).toEqual([
      "ANIM_SHAKE_FLASH_YELLOW_FAST", "ANIM_SHAKE_FLASH_YELLOW", "ANIM_SHAKE_FLASH_YELLOW_SLOW",
    ]);
  });

  it("batch-routes every generated sibling under all three real nature mods", () => {
    expect(NATURE_IDS).toEqual({ adamant: 3, docile: 6, quiet: 17 });
    for (const species of BACK_SHAKE_FLASH_YELLOW_SPECIES) {
      expect(selectBackSendOutAnimation(species, NATURE_IDS.adamant)).toMatchObject({
        backAnimSetIndex: 21, backAnimSet: "BACK_ANIM_SHAKE_FLASH_YELLOW", natureMod: 0,
        selector: "ANIM_SHAKE_FLASH_YELLOW_FAST",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.docile)).toMatchObject({
        natureMod: 1, selector: "ANIM_SHAKE_FLASH_YELLOW",
      });
      expect(selectBackSendOutAnimation(species, NATURE_IDS.quiet)).toMatchObject({
        natureMod: 2, selector: "ANIM_SHAKE_FLASH_YELLOW_SLOW",
      });
    }
  });

  it("pins source ids, u8 tables/selector, and exact helper order", () => {
    expect(constants).toMatch(/^#define BACK_ANIM_SHAKE_FLASH_YELLOW\s+22$/m);
    for (const [name, id] of [["FAST", 139], ["", 140], ["SLOW", 141]] as const) {
      expect(constants).toMatch(new RegExp(`^#define ANIM_SHAKE_FLASH_YELLOW${name ? `_${name}` : ""}\\s+${id}$`, "m"));
    }
    expect(BACK_SHAKE_FLASH_YELLOW_VARIANTS).toMatchObject({
      fast: { sourceId: 139, tableIndex: 0, terminalTick: 81, accepted: true },
      normal: { sourceId: 140, tableIndex: 1, terminalTick: 56, accepted: true },
      slow: { sourceId: 141, tableIndex: 2, terminalTick: 75, accepted: true },
    });
    expect(SHAKE_YELLOW_FLASH_TABLES.map((table) => table.at(-1))).toEqual([
      [false, 255], [false, 255], [false, 255],
    ]);
    const helper = source.slice(source.indexOf("static void SetShakeFlashYellowPos"), source.indexOf("enum {\n    SHAKEGLOW_RED"));
    expect(helper).toMatch(/sprite->x2 = sprite->data\[1\];[\s\S]*?sprite->data\[1\] \*= -1;[\s\S]*?sprite->data\[0\] = 0;/);
    expect(helper).toMatch(/SetShakeFlashYellowPos\(sprite\);[\s\S]*?time == \(u8\)-1[\s\S]*?sprite->x2 = 0;[\s\S]*?sprite->callback = WaitAnimEnd;/);
    expect(helper).toMatch(/data\[4\] == 1[\s\S]*?BlendPalette\(sprite->data\[7\], 16, 16, RGB_YELLOW\)[\s\S]*?BlendPalette\(sprite->data\[7\], 16, 0, RGB_YELLOW\)/);
    expect(helper).toMatch(/time == sprite->data\[5\][\s\S]*?data\[4\] = 1;[\s\S]*?data\[5\] = 0;[\s\S]*?data\[6\]\+\+;[\s\S]*?data\[5\]\+\+;/);
    for (const variant of Object.values(BACK_SHAKE_FLASH_YELLOW_VARIANTS)) {
      const start = helper.indexOf(`static void ${variant.callback}(struct Sprite *sprite)`);
      const body = helper.slice(start, helper.indexOf("\n}\n", start) + 3);
      expect(body).toMatch(/if \(\+\+sprite->data\[2\] == 1\)/);
      expect(body).toContain("sprite->data[7] = OBJ_PLTT_ID(sprite->oam.paletteNum);");
      expect(body.indexOf("++sprite->data[2]")).toBeLessThan(body.indexOf("ShakeFlashYellow(sprite)"));
    }
  });
});

describe("BACK_ANIM_SHAKE_FLASH_YELLOW reducer", () => {
  it.each([
    ["RAICHU", NATURE_IDS.adamant, 81, 0, 19, "Anim_ShakeFlashYellow_Fast"],
    ["PIKACHU", NATURE_IDS.docile, 56, 1, 13, "Anim_ShakeFlashYellow"],
    ["LANTURN", NATURE_IDS.quiet, 75, 2, 9, "Anim_ShakeFlashYellow_Slow"],
  ] as const)("models %s initializer through signed sentinel", (species, nature, terminalTick, table, terminalIndex, callback) => {
    expect(backShakeFlashYellowFrameAtTick(species, nature, 0, 1)).toMatchObject({
      x2: 1, data0: 1, data1: 1, data2: 1, data3: table, data4: 0, data5: 1, data6: 0,
      data7: 256, callbackBefore: callback, callback, initializerCalled: true,
      tableEntryTimeU8: SHAKE_YELLOW_FLASH_TABLES[table][0][1], blendCoefficient: null,
    });
    const terminal = backShakeFlashYellowFrameAtTick(species, nature, terminalTick, 1)!;
    expect(terminal).toMatchObject({
      x2: 0, data2: terminalTick + 1, data3: table, data4: 1, data5: 0,
      data6: terminalIndex, data7: 256, tableEntryIsYellow: false, tableEntryTimeU8: 255,
      blendCoefficient: null, callback: "WaitAnimEnd", terminal: true,
    });
    expect(backShakeFlashYellowFrameAtTick(species, nature, 999, 1)).toEqual(terminal);
  });

  it("preserves cadence, palette events, restoration, and task-owned slots", () => {
    expect(backShakeFlashYellowFrameAtTick("RAICHU", NATURE_IDS.adamant, 1, 1)).toMatchObject({
      x2: 1, data0: 2, data1: 1, data4: 1, data5: 0, data6: 1, blendCoefficient: null,
    });
    expect(backShakeFlashYellowFrameAtTick("RAICHU", NATURE_IDS.adamant, 2, 1)).toMatchObject({
      x2: 1, data0: 0, data1: -1, data4: 0, data5: 1, data6: 1,
      blendCoefficient: 16, blendColor: "RGB_YELLOW",
    });
    expect(backShakeFlashYellowFrameAtTick("RAICHU", NATURE_IDS.adamant, 5, 1)).toMatchObject({
      x2: -1, data0: 0, data1: 1, data6: 2, blendCoefficient: 0, blendColor: "RGB_YELLOW",
    });
    expect(backShakeFlashYellowTerminalSpriteData("RAICHU", NATURE_IDS.adamant, 0, 26))
      .toEqual([0, 0, 26, 0, 1, 0, 19, 256]);
    expect(backShakeFlashYellowTerminalSpriteData("PIKACHU", NATURE_IDS.docile, 0, 25))
      .toEqual([0, 0, 25, 1, 1, 0, 13, 256]);
    expect(backShakeFlashYellowTerminalSpriteData("LANTURN", NATURE_IDS.quiet, 0, 171))
      .toEqual([0, 0, 171, 2, 1, 0, 9, 256]);
    expect(backShakeFlashYellowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShakeFlashYellowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backShakeFlashYellowFrameAtTick("ONIX", NATURE_IDS.adamant, 0)).toBeNull();
  });
});
