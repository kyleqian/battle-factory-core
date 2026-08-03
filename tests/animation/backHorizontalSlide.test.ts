import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_H_SLIDE_FACTORY_SPECIES,
  BACK_H_SLIDE_OUTSIDE_FACTORY_SPECIES,
  BACK_H_SLIDE_SPECIES,
  BACK_H_SLIDE_VARIANTS,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_SEND_OUT_TASK_LIFECYCLE,
  backHorizontalSlideFrameAtTick,
  backHorizontalSlideWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const FIXTURE_SPECIES = "TENTACRUEL";

describe("BACK_ANIM_H_SLIDE back send-out reducer", () => {
  it("pins the global generated back census and exactly this Factory set", () => {
    const speciesToSet = selectorTables.speciesToBackAnimSet.species as Record<string, string>;
    const backSets = selectorTables.backAnimationIds.sets as Record<string, string[]>;
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    const generated = Object.entries(speciesToSet)
      .filter(([, set]) => set === "BACK_ANIM_H_SLIDE")
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

    expect(BACK_H_SLIDE_SPECIES).toEqual(generated);
    expect(BACK_H_SLIDE_SPECIES).toEqual([
      "IVYSAUR", "CATERPIE", "WEEDLE", "ODDISH", "GLOOM", "PARAS", "PSYDUCK",
      "TENTACOOL", "TENTACRUEL", "SLOWPOKE", "FARFETCHD", "DEWGONG", "EXEGGCUTE",
      "HITMONLEE", "LICKITUNG", "DRATINI", "BAYLEEF", "ARIADOS", "SUDOWOODO",
      "SUNFLORA", "QUAGSIRE", "CORSOLA", "REMORAID", "MANTINE", "SMEARGLE",
      "SMOOCHUM", "MILTANK", "MUDKIP", "LOTAD", "SLAKOTH", "RELICANTH",
    ]);
    expect(BACK_H_SLIDE_SPECIES).toHaveLength(31);
    expect(BACK_H_SLIDE_FACTORY_SPECIES).toEqual(generated);
    expect(BACK_H_SLIDE_OUTSIDE_FACTORY_SPECIES).toEqual([]);
  });

  it("uses the back task's nature lookup for all three H-slide selectors", () => {
    expect(BACK_H_SLIDE_VARIANTS).toEqual({
      fast: {
        selector: "ANIM_H_SLIDE_FAST",
        callback: "Anim_HorizontalSlide_Fast",
        natureMod: 0,
        duration: 20,
        amplitude: 6,
        accepted: true,
      },
      normal: {
        selector: "ANIM_H_SLIDE",
        callback: "Anim_HorizontalSlide",
        natureMod: 1,
        duration: 40,
        amplitude: 6,
        accepted: true,
      },
      slow: {
        selector: "ANIM_H_SLIDE_SLOW",
        callback: "Anim_HorizontalSlide_Slow",
        natureMod: 2,
        duration: 80,
        amplitude: 6,
        accepted: true,
      },
    });
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(getSpeciesBackAnimSet(FIXTURE_SPECIES)).toBe(1);

    expect([8, 24, 15].map((natureId) => selectBackSendOutAnimation(FIXTURE_SPECIES, natureId)))
      .toEqual([
        {
          species: FIXTURE_SPECIES, natureId: 8, nature: "NATURE_IMPISH", backAnimSetIndex: 1,
          backAnimSet: "BACK_ANIM_H_SLIDE", natureMod: 0, selector: "ANIM_H_SLIDE_FAST",
        },
        {
          species: FIXTURE_SPECIES, natureId: 24, nature: "NATURE_QUIRKY", backAnimSetIndex: 1,
          backAnimSet: "BACK_ANIM_H_SLIDE", natureMod: 1, selector: "ANIM_H_SLIDE",
        },
        {
          species: FIXTURE_SPECIES, natureId: 15, nature: "NATURE_MODEST", backAnimSetIndex: 1,
          backAnimSet: "BACK_ANIM_H_SLIDE", natureMod: 2, selector: "ANIM_H_SLIDE_SLOW",
        },
      ]);
  });

  it("pins the back task, immediate H-slide initializer, signed writes, and adjacent set controls", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const spriteHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/sprite.h", import.meta.url),
      "utf8",
    );
    const trigSource = readFileSync(
      new URL("../../reference/pokeemerald/src/trig.c", import.meta.url),
      "utf8",
    );

    expect(spriteHeader).toMatch(/\/\*0x24\*\/ s16 x2, y2;/);
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(trigSource).toMatch(/s16 Sin\(s16 index, s16 amplitude\)[\s\S]*?return \(amplitude \* gSineTable\[index\]\) >> 8;/);
    expect(constants).toMatch(/^#define BACK_ANIM_H_VIBRATE\s+1$/m);
    expect(constants).toMatch(/^#define BACK_ANIM_H_SLIDE\s+2$/m);
    expect(constants).toMatch(/^#define BACK_ANIM_H_SPRING\s+3$/m);
    expect(constants).toMatch(/^#define ANIM_H_SLIDE\s+3$/m);
    expect(constants).toMatch(/^#define ANIM_H_SLIDE_SLOW\s+70$/m);
    expect(constants).toMatch(/^#define ANIM_H_SLIDE_FAST\s+94$/m);

    const launchStart = source.indexOf("void LaunchAnimationTaskForBackSprite");
    const launchEnd = source.indexOf("#undef tState", launchStart);
    expect(source.slice(launchStart, launchEnd)).toMatch(
      /CreateTask\(Task_HandleMonAnimation, 128\)[\s\S]*?battler = sprite->data\[0\];[\s\S]*?nature = GetNature\(&gPlayerParty\[gBattlerPartyIndexes\[battler\]\]\);[\s\S]*?animId = 3 \* backAnimSet \+ sBackAnimNatureModTable\[nature\];[\s\S]*?gTasks\[taskId\]\.tAnimId = sBackAnimationIds\[animId\];/,
    );
    const taskStart = source.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = source.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    expect(source.slice(taskStart, taskEnd)).toMatch(
      /gTasks\[taskId\]\.tBattlerId = sprite->data\[0\];[\s\S]*?gTasks\[taskId\]\.tSpeciesId = sprite->data\[2\];[\s\S]*?sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?if \(sprite->callback == SpriteCallbackDummy\)[\s\S]*?sprite->data\[0\] = gTasks\[taskId\]\.tBattlerId;[\s\S]*?sprite->data\[2\] = gTasks\[taskId\]\.tSpeciesId;[\s\S]*?sprite->data\[1\] = 0;/,
    );

    const sharedStart = source.indexOf("static void HorizontalSlide(struct Sprite *sprite)\n{");
    const sharedEnd = source.indexOf("static void Anim_HorizontalSlide(struct Sprite *sprite)\n{", sharedStart);
    const shared = source.slice(sharedStart, sharedEnd);
    expect(shared).toMatch(
      /TryFlipX\(sprite\);[\s\S]*?sprite->data\[2\] > sprite->data\[0\][\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?sprite->x2 = 0;[\s\S]*?Sin\(\(sprite->data\[2\] \* 384 \/ sprite->data\[0\]\) % 256, 6\);[\s\S]*?sprite->data\[2\]\+\+;[\s\S]*?TryFlipX\(sprite\);/,
    );
    for (const [callback, duration] of [
      ["Anim_HorizontalSlide_Fast", 20],
      ["Anim_HorizontalSlide", 40],
      ["Anim_HorizontalSlide_Slow", 80],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      expect(source.slice(start, end)).toMatch(
        new RegExp(`sprite->data\\[0\\] = ${duration};[\\s\\S]*?HorizontalSlide\\(sprite\\);[\\s\\S]*?sprite->callback = HorizontalSlide;`),
      );
    }
    const backIdsStart = source.indexOf("static const u8 sBackAnimationIds[] =");
    const backIdsEnd = source.indexOf("static const u8 sBackAnimNatureModTable", backIdsStart);
    expect(source.slice(backIdsStart, backIdsEnd)).toMatch(
      /\[\(BACK_ANIM_H_SLIDE - 1\) \* 3\]\s*= ANIM_H_SLIDE_FAST, ANIM_H_SLIDE, ANIM_H_SLIDE_SLOW,/,
    );
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
    expect(BACK_SEND_OUT_TASK_LIFECYCLE.backSpriteDontFlip).toBe(true);
    expect(backHorizontalSlideWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalSlideWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, 73)).toEqual([0, 0, 73, 0, 0, 0, 0, 0]);

    expect(selectBackSendOutAnimation("BEEDRILL", 0)).toMatchObject({
      backAnimSetIndex: 0, backAnimSet: "BACK_ANIM_H_VIBRATE", selector: "ANIM_H_VIBRATE_FASTEST",
    });
    expect(selectBackSendOutAnimation("SURSKIT", 0)).toMatchObject({
      backAnimSetIndex: 2, backAnimSet: "BACK_ANIM_H_SPRING", selector: "ANIM_H_SPRING_FAST",
    });
  });

  it.each([
    [8, "ANIM_H_SLIDE_FAST", 20],
    [24, "ANIM_H_SLIDE", 40],
    [15, "ANIM_H_SLIDE_SLOW", 80],
  ] as const)("models each source callback for nature %i / %s", (natureId, selector, duration) => {
    for (let tick = 0; tick <= duration; tick += 1) {
      const index = Math.trunc((tick * 384) / duration) % 256;
      expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, natureId, tick, -1)).toEqual({
        x2: Math.floor((6 * GBA_SINE_TABLE_256[index]!) / 256),
        y2: 0,
        data0: duration,
        data1: -1,
        data2: tick + 1,
        counter: tick,
        index,
        selector,
        duration,
        amplitude: 6,
        initializerCallBeforeCallbackInstall: tick === 0,
        normalBackDontFlip: true,
        tryFlipXCalls: 2,
        affineWriteCount: 0,
        affineMode: "normal",
        callback: "HorizontalSlide",
      });
    }
    expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, natureId, duration + 1, -1)).toEqual({
      x2: 0,
      y2: 0,
      data0: duration,
      data1: -1,
      data2: duration + 2,
      counter: duration + 1,
      index: null,
      selector,
      duration,
      amplitude: 6,
      initializerCallBeforeCallbackInstall: false,
      normalBackDontFlip: true,
      tryFlipXCalls: 2,
      affineWriteCount: 0,
      affineMode: "normal",
      callback: "WaitAnimEnd",
    });
    expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, natureId, 999, -1))
      .toEqual(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, natureId, duration + 1, -1));
  });

  it("rejects invalid inputs and keeps adjacent back families out of this reducer", () => {
    expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, 8, -1)).toBeNull();
    expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, 8, 1.5)).toBeNull();
    expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, 8, Number.NaN)).toBeNull();
    expect(backHorizontalSlideFrameAtTick(FIXTURE_SPECIES, 8, 0, 0.5)).toBeNull();
    expect(backHorizontalSlideFrameAtTick("BEEDRILL", 0, 0)).toBeNull();
    expect(backHorizontalSlideFrameAtTick("SURSKIT", 0, 0)).toBeNull();
    expect(backHorizontalSlideFrameAtTick("NOT_A_SPECIES", 8, 0)).toBeNull();
  });
});
