import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  BACK_ANIM_NATURE_ORDER,
  BACK_SEND_OUT_ANIMATION_CENSUS,
  BACK_TRIANGLE_DOWN_FACTORY_SPECIES,
  BACK_TRIANGLE_DOWN_OUTSIDE_FACTORY_SPECIES,
  BACK_TRIANGLE_DOWN_SPECIES,
  BACK_TRIANGLE_DOWN_VARIANTS,
  backTriangleDownFrameAtTick,
  backTriangleDownTerminalSpriteData,
  backTriangleDownWaitAnimEndCallback,
  getSpeciesBackAnimSet,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";

const TRIANGLE_DOWN_SPECIES = [
  "PIDGEY", "PIDGEOT", "SPEAROW", "EKANS", "PERSIAN", "MAGNEMITE", "MAGNETON", "DODUO",
  "CLOYSTER", "HITMONCHAN", "SCYTHER", "DRAGONAIR", "NOCTOWL", "CROBAT", "DUNSPARCE",
  "SNEASEL", "DELIBIRD", "TYROGUE", "ZIGZAGOON", "DUSTOX", "CORPHISH", "FLYGON", "SNORUNT",
  "GLALIE", "ANORITH", "BELDUM",
] as const;

describe("BACK_ANIM_TRIANGLE_DOWN back send-out reducer", () => {
  it("derives the complete 26/26/0 source census and all 45 Factory records", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const sourceMappings = [...source.matchAll(/\[SPECIES_([A-Z0-9_]+)\]\s*= BACK_ANIM_TRIANGLE_DOWN,/g)]
      .map(([, species]) => species);
    const factoryRecords = frontierMons.entries.filter(({ species }) => (
      TRIANGLE_DOWN_SPECIES.includes(species.replace(/^SPECIES_/, "") as typeof TRIANGLE_DOWN_SPECIES[number])
    ));
    expect(BACK_SEND_OUT_ANIMATION_CENSUS).toEqual({
      backAnimSets: 25, selectorVariants: 75, speciesMappings: 386,
      factoryMappings: 376, outsideFactoryMappings: 10,
    });
    expect(sourceMappings).toEqual(TRIANGLE_DOWN_SPECIES);
    expect(BACK_TRIANGLE_DOWN_SPECIES).toEqual(TRIANGLE_DOWN_SPECIES);
    expect(BACK_TRIANGLE_DOWN_FACTORY_SPECIES).toEqual(TRIANGLE_DOWN_SPECIES);
    expect(BACK_TRIANGLE_DOWN_OUTSIDE_FACTORY_SPECIES).toEqual([]);
    expect(factoryRecords).toHaveLength(45);
    expect(new Set(factoryRecords.map(({ species }) => species.replace(/^SPECIES_/, "")))).toEqual(
      new Set(TRIANGLE_DOWN_SPECIES),
    );
    expect(Object.entries(selectorTables.speciesToBackAnimSet.species)
      .filter(([, set]) => set === "BACK_ANIM_TRIANGLE_DOWN"))
      .toEqual(TRIANGLE_DOWN_SPECIES.map((species) => [species, "BACK_ANIM_TRIANGLE_DOWN"]));
  });

  it("routes every source sibling through the party-nature triple", () => {
    expect(BACK_ANIM_NATURE_ORDER).toHaveLength(25);
    expect(BACK_TRIANGLE_DOWN_VARIANTS).toEqual({
      twice: { selector: "ANIM_TRIANGLE_DOWN_TWICE", callback: "Anim_TriangleDown_Fast", sourceId: 106, natureMod: 0, amplitude: 2, runs: 2, accepted: true },
      normal: { selector: "ANIM_TRIANGLE_DOWN", callback: "Anim_TriangleDown", sourceId: 105, natureMod: 1, amplitude: 2, runs: 1, accepted: true },
      slow: { selector: "ANIM_TRIANGLE_DOWN_SLOW", callback: "Anim_TriangleDown_Slow", sourceId: 104, natureMod: 2, amplitude: 1, runs: 1, accepted: true },
    });
    expect(selectBackSendOutAnimation("SNORUNT", 2)).toMatchObject({
      backAnimSetIndex: 14, backAnimSet: "BACK_ANIM_TRIANGLE_DOWN", natureMod: 0,
      selector: "ANIM_TRIANGLE_DOWN_TWICE",
    });
    expect(selectBackSendOutAnimation("TYROGUE", 6)).toMatchObject({
      backAnimSetIndex: 14, backAnimSet: "BACK_ANIM_TRIANGLE_DOWN", natureMod: 1,
      selector: "ANIM_TRIANGLE_DOWN",
    });
    expect(selectBackSendOutAnimation("PIDGEY", 1)).toMatchObject({
      backAnimSetIndex: 14, backAnimSet: "BACK_ANIM_TRIANGLE_DOWN", natureMod: 2,
      selector: "ANIM_TRIANGLE_DOWN_SLOW",
    });
    for (const species of TRIANGLE_DOWN_SPECIES) {
      expect(getSpeciesBackAnimSet(species)).toBe(14);
      expect([2, 6, 1].map((natureId) => selectBackSendOutAnimation(species, natureId)?.selector))
        .toEqual(["ANIM_TRIANGLE_DOWN_TWICE", "ANIM_TRIANGLE_DOWN", "ANIM_TRIANGLE_DOWN_SLOW"]);
    }
  });

  it("pins the source table, signed division, callback cadence, and task-side flip contract", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url), "utf8",
    );
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url), "utf8",
    );
    expect(constants).toMatch(/^#define BACK_ANIM_TRIANGLE_DOWN\s+15$/m);
    expect(constants).toMatch(/^#define ANIM_TRIANGLE_DOWN_SLOW\s+104$/m);
    expect(constants).toMatch(/^#define ANIM_TRIANGLE_DOWN\s+105$/m);
    expect(constants).toMatch(/^#define ANIM_TRIANGLE_DOWN_TWICE\s+106$/m);
    expect(source).toMatch(/\(BACK_ANIM_TRIANGLE_DOWN - 1\) \* 3\]\s*= ANIM_TRIANGLE_DOWN_TWICE, ANIM_TRIANGLE_DOWN, ANIM_TRIANGLE_DOWN_SLOW,/);
    const tableStart = source.indexOf("static const s8 sTriangleDownData[][3]");
    const table = source.slice(tableStart, source.indexOf("};", tableStart) + 2);
    expect(table).toContain("{1,   1, 12}");
    expect(table).toContain("{-2,  0, 12}");
    expect(table).toContain("{1,  -1, 12}");
    expect(table).toContain("{0,  0,  0}");
    const helperStart = source.indexOf("static void TriangleDown(struct Sprite *sprite)\n{");
    const helperEnd = source.indexOf("static void Anim_TriangleDown_Slow", helperStart);
    const helper = source.slice(helperStart, helperEnd);
    expect(helper.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    expect(helper).toMatch(/sTriangleDownData\[sprite->data\[3\]\]\[2\] \/ sprite->data\[5\] == sprite->data\[2\]/);
    expect(helper).toMatch(/if \(--sprite->data\[6\] == 0\)\s*sprite->callback = WaitAnimEnd;/);
    expect(helper).toMatch(/sprite->x2 \+= \(sTriangleDownData\[sprite->data\[3\]\]\[0\] \* amplitude\);/);
    expect(helper).toMatch(/sprite->y2 \+= \(sTriangleDownData\[sprite->data\[3\]\]\[1\] \* sprite->data\[5\]\);/);
    for (const [callback, amplitude, runs] of [
      ["Anim_TriangleDown_Fast", 2, 2],
      ["Anim_TriangleDown", 2, 1],
      ["Anim_TriangleDown_Slow", 1, 1],
    ] as const) {
      const start = source.indexOf(`static void ${callback}(struct Sprite *sprite)\n{`);
      const end = source.indexOf("\n}\n", start) + 3;
      const initializer = source.slice(start, end);
      expect(initializer).toContain(`sprite->data[5] = ${amplitude};`);
      expect(initializer).toContain(`sprite->data[6] = ${runs};`);
      expect(initializer).toContain("TriangleDown(sprite);");
      expect(initializer).toContain("sprite->callback = TriangleDown;");
    }
  });

  it("models active vectors, C-divided boundaries, repeat restart, and terminal dummy handoff", () => {
    expect(backTriangleDownFrameAtTick("SNORUNT", 2, 0, -1)).toMatchObject({
      x2: 2, y2: 2, data0: 0, data1: -1, data2Before: 0, data2: 1, data3: 0,
      data4: 0, data5: 2, data6: 2, data7: 0, sourceRowIndex: 0,
      sourceRowX: 1, sourceRowY: 1, sourceRowTimer: 12, sourceRowDuration: 6,
      phaseBoundary: false, repeatWillRestart: false, selector: "ANIM_TRIANGLE_DOWN_TWICE",
      sourceId: 106, amplitude: 2, runs: 2, initializerCallBeforeCallbackInstall: true,
      tryFlipXCalls: 2, normalBackDontFlip: true, affineWriteCount: 0, affineMode: "normal",
      oamVisible: true, resetSpriteAfterAnim: false, callback: "TriangleDown",
    });
    expect(backTriangleDownFrameAtTick("SNORUNT", 2, 6, -1)).toMatchObject({
      x2: 8, y2: 12, data2Before: 6, data2: 1, data3: 1,
      sourceRowX: -2, sourceRowY: 0, sourceRowDuration: 6, phaseBoundary: true,
    });
    expect(backTriangleDownFrameAtTick("SNORUNT", 2, 18, -1)).toMatchObject({
      x2: 0, y2: 0, data2Before: 6, data2: 0, data3: 3, data6: 1,
      sourceRowIndex: 3, sourceRowTimer: 0, sourceRowDuration: 0, phaseBoundary: true,
      repeatWillRestart: true, tryFlipXCalls: 1, callback: "TriangleDown",
    });
    expect(backTriangleDownFrameAtTick("SNORUNT", 2, 19, -1)).toMatchObject({
      x2: 2, y2: 2, data2Before: 0, data2: 1, data3: 0, data6: 1,
      sourceRowIndex: 0, repeatWillRestart: false, callback: "TriangleDown",
    });
    const twiceTerminal = backTriangleDownFrameAtTick("SNORUNT", 2, 37, -1)!;
    expect(twiceTerminal).toMatchObject({
      x2: 0, y2: 0, data2Before: 6, data2: 0, data3: 3, data5: 2, data6: 0,
      sourceRowDuration: 0, repeatWillRestart: false, tryFlipXCalls: 1, callback: "WaitAnimEnd",
    });
    expect(backTriangleDownFrameAtTick("SNORUNT", 2, 999, -1)).toEqual(twiceTerminal);
    expect(backTriangleDownFrameAtTick("TYROGUE", 6, 18, 1)).toMatchObject({
      data1: 1, data5: 2, data6: 0, sourceRowDuration: 0, callback: "WaitAnimEnd",
    });
    expect(backTriangleDownFrameAtTick("PIDGEY", 1, 36, 1)).toMatchObject({
      data1: 1, data5: 1, data6: 0, sourceRowDuration: 0, callback: "WaitAnimEnd",
    });
    expect(backTriangleDownWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backTriangleDownWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backTriangleDownTerminalSpriteData("SNORUNT", 2, 0, 346)).toEqual([0, 0, 346, 3, 0, 2, 0, 0]);
    expect(backTriangleDownTerminalSpriteData("TYROGUE", 6, 0, 236)).toEqual([0, 0, 236, 3, 0, 2, 0, 0]);
    expect(backTriangleDownTerminalSpriteData("PIDGEY", 1, 0, 16)).toEqual([0, 0, 16, 3, 0, 1, 0, 0]);
  });

  it("rejects invalid input and adjacent send-out families", () => {
    expect(backTriangleDownFrameAtTick("SNORUNT", 2, -1)).toBeNull();
    expect(backTriangleDownFrameAtTick("TYROGUE", 6, 0.5)).toBeNull();
    expect(backTriangleDownFrameAtTick("ONIX", 2, 0)).toBeNull();
    expect(backTriangleDownFrameAtTick("NOT_A_SPECIES", 1, 0)).toBeNull();
    expect(selectorTables.backAnimationIds.sets.BACK_ANIM_TRIANGLE_DOWN).toEqual([
      "ANIM_TRIANGLE_DOWN_TWICE", "ANIM_TRIANGLE_DOWN", "ANIM_TRIANGLE_DOWN_SLOW",
    ]);
  });
});
