import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_H_VIBRATE_FACTORY_SPECIES,
  BACK_H_VIBRATE_OUTSIDE_FACTORY_SPECIES,
  BACK_H_VIBRATE_SPECIES,
  BACK_H_VIBRATE_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backHorizontalVibrateFrameAtTick,
  backHorizontalVibrateWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const FIXTURE_SPECIES = "BEEDRILL";

describe("BACK_ANIM_H_VIBRATE back send-out reducer", () => {
  it("pins the global generated back census and exactly this Factory set", () => {
    const speciesToSet = selectorTables.speciesToBackAnimSet.species as Record<string, string>;
    const backSets = selectorTables.backAnimationIds.sets as Record<string, string[]>;
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    const generated = Object.entries(speciesToSet)
      .filter(([, set]) => set === "BACK_ANIM_H_VIBRATE")
      .map(([species]) => species);

    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25,
      selectorVariants: 75,
      speciesMappings: 386,
      factoryMappings: 376,
      outsideFactoryMappings: 10,
    });
    expect(Object.keys(backSets)).toHaveLength(25);
    expect(Object.values(backSets).flat()).toHaveLength(75);
    expect(Object.keys(speciesToSet)).toHaveLength(386);
    expect([...factory].filter((species) => speciesToSet[species] !== undefined)).toHaveLength(376);
    expect(Object.keys(speciesToSet).filter((species) => !factory.has(species))).toHaveLength(10);

    expect(BACK_H_VIBRATE_SPECIES).toEqual(generated);
    expect(BACK_H_VIBRATE_SPECIES).toEqual([
      "BEEDRILL", "NINETALES", "GASTLY", "HAUNTER", "PORYGON", "MISDREAVUS",
      "PORYGON2", "NINJASK", "KECLEON", "SABLEYE", "VIBRAVA", "DUSKULL",
      "DUSCLOPS", "SHUPPET", "BANETTE", "LATIAS", "LATIOS",
    ]);
    expect(BACK_H_VIBRATE_FACTORY_SPECIES).toEqual(generated);
    expect(BACK_H_VIBRATE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
  });

  it("keeps the front-looking selector spellings separate and selects all three back variants by nature", () => {
    expect(BACK_H_VIBRATE_VARIANTS).toEqual({
      fastest: {
        selector: "ANIM_H_VIBRATE_FASTEST",
        callback: "Anim_HorizontalVibrate_Fastest",
        natureMod: 0,
        amplitude: 12,
        accepted: true,
      },
      fast: {
        selector: "ANIM_H_VIBRATE_FAST",
        callback: "Anim_HorizontalVibrate_Fast",
        natureMod: 1,
        amplitude: 9,
        accepted: true,
      },
      normal: {
        selector: "ANIM_H_VIBRATE",
        callback: "Anim_HorizontalVibrate",
        natureMod: 2,
        amplitude: 6,
        accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(BACK_ANIM_NATURE_ORDER.slice(0, 6)).toEqual([
      "NATURE_HARDY", "NATURE_LONELY", "NATURE_BRAVE", "NATURE_ADAMANT", "NATURE_NAUGHTY", "NATURE_BOLD",
    ]);
    expect(getSpeciesBackAnimSet(FIXTURE_SPECIES)).toBe(0);
    expect(getSpeciesBackAnimSet("OLD_UNOWN_B")).toBe(0);
    expect(getSpeciesBackAnimSet("NOT_A_SPECIES")).toBeNull();

    expect([0, 5, 1].map((natureId) => selectBackSendOutAnimation(FIXTURE_SPECIES, natureId)))
      .toEqual([
        {
          species: FIXTURE_SPECIES, natureId: 0, nature: "NATURE_HARDY", backAnimSetIndex: 0,
          backAnimSet: "BACK_ANIM_H_VIBRATE", natureMod: 0, selector: "ANIM_H_VIBRATE_FASTEST",
        },
        {
          species: FIXTURE_SPECIES, natureId: 5, nature: "NATURE_BOLD", backAnimSetIndex: 0,
          backAnimSet: "BACK_ANIM_H_VIBRATE", natureMod: 1, selector: "ANIM_H_VIBRATE_FAST",
        },
        {
          species: FIXTURE_SPECIES, natureId: 1, nature: "NATURE_LONELY", backAnimSetIndex: 0,
          backAnimSet: "BACK_ANIM_H_VIBRATE", natureMod: 2, selector: "ANIM_H_VIBRATE",
        },
      ]);
    expect(selectBackSendOutAnimation(FIXTURE_SPECIES, -1)).toBeNull();
    expect(selectBackSendOutAnimation(FIXTURE_SPECIES, 25)).toBeNull();
    expect(selectBackSendOutAnimation("BULBASAUR", 0)?.backAnimSet).toBe("BACK_ANIM_DIP_RIGHT_SIDE");
  });

  it("pins source task setup, signed C arithmetic, OAM lifecycle, and dummy terminal", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const pokemonSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
      "utf8",
    );
    const spriteHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/sprite.h", import.meta.url),
      "utf8",
    );
    const gbaTypesHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/gba/types.h", import.meta.url),
      "utf8",
    );

    expect(spriteHeader).toMatch(/\/\*0x24\*\/ s16 x2, y2;/);
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(gbaTypesHeader).toMatch(/#define ST_OAM_AFFINE_NORMAL 1/);
    expect(constants).toMatch(/^#define BACK_ANIM_H_VIBRATE\s+1$/m);
    expect(constants).toMatch(/^#define BACK_ANIM_H_SLIDE\s+2$/m);
    expect(constants).toMatch(/^#define ANIM_H_VIBRATE\s+2$/m);
    expect(constants).toMatch(/^#define ANIM_H_VIBRATE_FAST\s+95$/m);
    expect(constants).toMatch(/^#define ANIM_H_VIBRATE_FASTEST\s+96$/m);
    const getSetStart = source.indexOf("u8 GetSpeciesBackAnimSet(u16 species)\n{");
    const getSetEnd = source.indexOf("#define tState", getSetStart);
    expect(source.slice(getSetStart, getSetEnd)).toMatch(
      /sSpeciesToBackAnimSet\[species\] != BACK_ANIM_NONE[\s\S]*?return sSpeciesToBackAnimSet\[species\] - 1;[\s\S]*?else[\s\S]*?return 0;/,
    );
    const launchStart = source.indexOf("void LaunchAnimationTaskForBackSprite");
    const launchEnd = source.indexOf("#undef tState", launchStart);
    expect(source.slice(launchStart, launchEnd)).toMatch(
      /CreateTask\(Task_HandleMonAnimation, 128\)[\s\S]*?battler = sprite->data\[0\];[\s\S]*?nature = GetNature\(&gPlayerParty\[gBattlerPartyIndexes\[battler\]\]\);[\s\S]*?animId = 3 \* backAnimSet \+ sBackAnimNatureModTable\[nature\];[\s\S]*?gTasks\[taskId\]\.tAnimId = sBackAnimationIds\[animId\];/,
    );
    const backBattleStart = pokemonSource.indexOf("void BattleAnimateBackSprite(struct Sprite *sprite, u16 species)");
    const backBattleEnd = pokemonSource.indexOf("// Identical to GetOpposingLinkMultiBattlerId", backBattleStart);
    expect(pokemonSource.slice(backBattleStart, backBattleEnd)).toMatch(
      /HITMARKER_NO_ANIMATIONS[\s\S]*?sprite->callback = SpriteCallbackDummy;[\s\S]*?else[\s\S]*?LaunchAnimationTaskForBackSprite\(sprite, GetSpeciesBackAnimSet\(species\)\);[\s\S]*?sprite->callback = SpriteCallbackDummy_2;/,
    );
    const taskStart = source.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = source.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    expect(source.slice(taskStart, taskEnd)).toMatch(
      /gTasks\[taskId\]\.tBattlerId = sprite->data\[0\];[\s\S]*?gTasks\[taskId\]\.tSpeciesId = sprite->data\[2\];[\s\S]*?sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?if \(sprite->callback == SpriteCallbackDummy\)[\s\S]*?sprite->data\[0\] = gTasks\[taskId\]\.tBattlerId;[\s\S]*?sprite->data\[2\] = gTasks\[taskId\]\.tSpeciesId;[\s\S]*?sprite->data\[1\] = 0;/,
    );
    for (const [selector, callback, amplitude] of [
      ["ANIM_H_VIBRATE", "Anim_HorizontalVibrate", 6],
      ["ANIM_H_VIBRATE_FAST", "Anim_HorizontalVibrate_Fast", 9],
      ["ANIM_H_VIBRATE_FASTEST", "Anim_HorizontalVibrate_Fastest", 12],
    ]) {
      expect(source).toContain(`[${selector}]`);
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const callbackSource = source.slice(start, end);
      expect(callbackSource).toMatch(
        new RegExp(`sprite->data\\[2\\] > 40[\\s\\S]*?sprite->callback = WaitAnimEnd;[\\s\\S]*?sprite->x2 = 0;[\\s\\S]*?Sin\\(\\(sprite->data\\[2\\] \\* 128 / 40\\) % 256, ${amplitude}\\) \\* sign;[\\s\\S]*?sprite->data\\[2\\]\\+\\+;`),
      );
      expect(callbackSource).not.toContain("TryFlipX");
      expect(callbackSource).not.toContain("HandleStartAffineAnim");
      expect(callbackSource).not.toContain("HandleSetAffineData");
    }
    const backIdsStart = source.indexOf("static const u8 sBackAnimationIds[] =");
    const backIdsEnd = source.indexOf("static const u8 sBackAnimNatureModTable", backIdsStart);
    const backIds = source.slice(backIdsStart, backIdsEnd);
    expect(backIds).toMatch(
      /\[\(BACK_ANIM_H_VIBRATE - 1\) \* 3\]\s*= ANIM_H_VIBRATE_FASTEST, ANIM_H_VIBRATE_FAST, ANIM_H_VIBRATE,/,
    );
    const natureStart = source.indexOf("static const u8 sBackAnimNatureModTable[NUM_NATURES] =");
    const natureEnd = source.indexOf("static const union AffineAnimCmd", natureStart);
    const natureTable = source.slice(natureStart, natureEnd);
    expect(natureTable).toMatch(/\[NATURE_HARDY\]\s*= 0,/);
    expect(natureTable).toMatch(/\[NATURE_BOLD\]\s*= 1,/);
    expect(natureTable).toMatch(/\[NATURE_LONELY\]\s*= 2,/);
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
    expect(BACK_SEND_OUT_TASK_LIFECYCLE).toEqual({
      launch: "LaunchAnimationTaskForBackSprite",
      speciesSetLookup: "GetSpeciesBackAnimSet",
      sharedTask: "Task_HandleMonAnimation",
      sourceBackSetIsOneBased: true,
      getSpeciesBackAnimSetReturnsZeroBased: true,
      taskData: { state: 0, pointerHi: 1, pointerLo: 2, animId: 3, battlerId: 4, speciesId: 5 },
      spriteDataZeroed: [0, 2, 3, 4, 5, 6, 7],
      spriteDataPreserved: [1],
      backSpriteDontFlip: true,
      terminalCallback: "SpriteCallbackDummy",
      terminalRestores: ["data[0]=battler", "data[2]=species", "data[1]=0"],
    });
    expect(backHorizontalVibrateWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalVibrateWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, 15)).toEqual([0, 0, 15, 0, 0, 0, 0, 0]);
    expect(backSendOutTerminalSpriteData(1, 0x10000)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(backSendOutTerminalSpriteData(0.5, 15)).toBeNull();
  });

  it.each([
    [0, "ANIM_H_VIBRATE_FASTEST", "Anim_HorizontalVibrate_Fastest", 12],
    [5, "ANIM_H_VIBRATE_FAST", "Anim_HorizontalVibrate_Fast", 9],
    [1, "ANIM_H_VIBRATE", "Anim_HorizontalVibrate", 6],
  ] as const)("models every source callback for nature %i / %s", (natureId, selector, callback, amplitude) => {
    for (let tick = 0; tick <= 40; tick += 1) {
      const index = Math.trunc((tick * 128) / 40);
      const sign = tick & 1 ? -1 : 1;
      const x2 = Math.floor((amplitude * GBA_SINE_TABLE_256[index]!) / 256) * sign + 0;
      expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, natureId, tick)).toEqual({
        x2,
        y2: 0,
        data0: 0,
        data1: 0,
        data2: tick + 1,
        counter: tick,
        index,
        sign,
        selector,
        amplitude,
        normalBackDontFlip: true,
        tryFlipXCalls: 0,
        affineWriteCount: 0,
        affineMode: "normal",
        callback,
      });
    }
    expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, natureId, 41)).toEqual({
      x2: 0,
      y2: 0,
      data0: 0,
      data1: 0,
      data2: 42,
      counter: 41,
      index: null,
      sign: null,
      selector,
      amplitude,
      normalBackDontFlip: true,
      tryFlipXCalls: 0,
      affineWriteCount: 0,
      affineMode: "normal",
      callback: "WaitAnimEnd",
    });
    expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, natureId, 999))
      .toEqual(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, natureId, 41));
  });

  it("rejects invalid reducer inputs and adjacent back-set controls", () => {
    expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, 0, -1)).toBeNull();
    expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, 0, 1.5)).toBeNull();
    expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, 0, Number.NaN)).toBeNull();
    expect(backHorizontalVibrateFrameAtTick(FIXTURE_SPECIES, 0, 0, 0.5)).toBeNull();
    expect(backHorizontalVibrateFrameAtTick("BULBASAUR", 0, 0)).toBeNull();
    expect(selectBackSendOutAnimation("BULBASAUR", 0)).toMatchObject({
      backAnimSet: "BACK_ANIM_DIP_RIGHT_SIDE",
      selector: "ANIM_H_DIP_TWICE",
    });
    expect(selectBackSendOutAnimation("IVYSAUR", 5)).toMatchObject({
      backAnimSet: "BACK_ANIM_H_SLIDE",
      selector: "ANIM_H_SLIDE",
    });
  });
});
