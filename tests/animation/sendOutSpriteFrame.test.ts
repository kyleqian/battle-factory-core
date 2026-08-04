import { describe, expect, it } from "vitest";
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import frontPicAnimPrograms from "../../src/data/gen/front-pic-anim-programs.json" with { type: "json" };
import summaryFrontAnimation from "../../src/data/gen/summary-front-animation.json" with { type: "json" };
import {
  frontSendOutSpriteFrameAtTick,
  hasTwoFramesAnimation,
} from "../../src/animation/sendOutSpriteFrame.ts";

const programs = frontPicAnimPrograms.species as Readonly<
  Record<string, ReadonlyArray<{ readonly frame: number; readonly duration: number }>>
>;
const selectorSpecies = selectorTables.frontAnimIds.species as Readonly<Record<string, string>>;

type SummaryRow = {
  species: string;
  spriteFrameProgram: ReadonlyArray<{ frame: number; duration: number }> | null;
};

describe("send-out sprite-frame programs JSON", () => {
  it("reproduces every probe-derived spriteFrameProgram row from summary-front-animation", () => {
    for (const row of (summaryFrontAnimation.species as readonly SummaryRow[])) {
      const key = row.species.replace(/^SPECIES_/, "");
      if (row.spriteFrameProgram === null) {
        // SPINDA's sAnims array has no index-1 program (GeneralFrame0 only).
        expect(programs[key], key).toBeUndefined();
      } else {
        expect(programs[key], key).toEqual([...row.spriteFrameProgram]);
      }
    }
    const onixRow = (summaryFrontAnimation.species as readonly SummaryRow[]).find(
      (r) => r.species === "SPECIES_ONIX",
    )!;
    expect(onixRow.spriteFrameProgram).toEqual([
      { frame: 1, duration: 50 },
      { frame: 1, duration: 30 },
      { frame: 0, duration: 30 },
    ]);
  });

  it("pins the KABUTO program to the engine literal (no import from src/engine)", () => {
    expect(programs["KABUTO"]).toEqual([
      { frame: 1, duration: 8 },
      { frame: 0, duration: 8 },
      { frame: 1, duration: 8 },
      { frame: 0, duration: 20 },
      { frame: 1, duration: 8 },
      { frame: 0, duration: 8 },
      { frame: 1, duration: 8 },
      { frame: 0, duration: 8 },
    ]);
  });

  it("census: 439 species keys, every selector frontAnimIds key except SPINDA has a program", () => {
    expect(Object.keys(programs).length).toBe(439);
    const absent: string[] = [];
    for (const key of Object.keys(selectorSpecies)) {
      if (!(key in programs)) absent.push(key);
    }
    expect(absent).toEqual(["SPINDA"]);
  });

  it("records the excluded species' programs verbatim (predicate excludes them, not the data)", () => {
    // SPINDA has no index-1 table at all; the other three do.
    expect("SPINDA" in programs).toBe(false);
    expect("CASTFORM" in programs).toBe(true);
    expect("DEOXYS" in programs).toBe(true);
    expect("UNOWN" in programs).toBe(true);
  });

  it("keeps the EGG frames-2|3 deviation loud and verbatim", () => {
    // EGG's index-1 program cycles 0->1->2->3 (source-faithful); frame 2/3 are
    // outside the two-frames contract, so walking it throws (never reachable —
    // EGG is not in the Factory species pool). Data stays verbatim.
    expect(programs["EGG"]).toEqual([
      { frame: 0, duration: 6 },
      { frame: 1, duration: 6 },
      { frame: 2, duration: 6 },
      { frame: 3, duration: 6 },
    ]);
  });
});

describe("frontSendOutSpriteFrameAtTick boundaries", () => {
  it("ONIX: [{1,50},{1,30},{0,30}] step windows", () => {
    expect(frontSendOutSpriteFrameAtTick("ONIX", 0)).toBe(1);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 49)).toBe(1);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 50)).toBe(1);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 79)).toBe(1);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 80)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 109)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 110)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("ONIX", 5000)).toBe(0);
  });

  it("KABUTO: the 8-step literal from the engine", () => {
    const cases: ReadonlyArray<readonly [number, 0 | 1]> = [
      [0, 1],
      [7, 1],
      [8, 0],
      [15, 0],
      [16, 1],
      [23, 1],
      [24, 0],
      [43, 0],
      [44, 1],
      [51, 1],
      [52, 0],
      [59, 0],
      [60, 1],
      [67, 1],
      [68, 0],
      [75, 0],
      [76, 0],
      [5000, 0],
    ];
    for (const [tick, expected] of cases) {
      expect(frontSendOutSpriteFrameAtTick("KABUTO", tick), `KABUTO @ ${tick}`).toBe(expected);
    }
  });
});

describe("hasTwoFramesAnimation predicate", () => {
  it("is false for the four excluded species and for unknown species", () => {
    expect(hasTwoFramesAnimation("CASTFORM")).toBe(false);
    expect(hasTwoFramesAnimation("DEOXYS")).toBe(false);
    expect(hasTwoFramesAnimation("SPINDA")).toBe(false);
    expect(hasTwoFramesAnimation("UNOWN")).toBe(false);
    expect(hasTwoFramesAnimation("NOT_A_SPECIES")).toBe(false);
  });

  it("is true for ordinary two-frame species", () => {
    expect(hasTwoFramesAnimation("ONIX")).toBe(true);
    expect(hasTwoFramesAnimation("KABUTO")).toBe(true);
    expect(hasTwoFramesAnimation("GROVYLE")).toBe(true);
    expect(hasTwoFramesAnimation("PIDGEOTTO")).toBe(true);
  });
});

describe("frontSendOutSpriteFrameAtTick edges", () => {
  it("returns null for unknown species and invalid ticks", () => {
    expect(frontSendOutSpriteFrameAtTick("NOT_A_SPECIES", 0)).toBeNull();
    expect(frontSendOutSpriteFrameAtTick("ONIX", -1)).toBeNull();
    expect(frontSendOutSpriteFrameAtTick("ONIX", 1.5)).toBeNull();
  });

  it("returns 0 for a false-predicate species at any valid tick", () => {
    expect(frontSendOutSpriteFrameAtTick("SPINDA", 0)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("SPINDA", 500)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("CASTFORM", 0)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("CASTFORM", 500)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("DEOXYS", 0)).toBe(0);
    expect(frontSendOutSpriteFrameAtTick("UNOWN", 0)).toBe(0);
  });

  it("throws loudly when a two-frames species' program steps outside 0|1 (EGG)", () => {
    // EGG satisfies the predicate but its verbatim program carries frames 2|3;
    // the invariant is loud rather than silently clamped. EGG is not
    // Factory-reachable, so this path never fires in the engine.
    expect(() => frontSendOutSpriteFrameAtTick("EGG", 12)).toThrow(/outside 0\|1/);
  });
});
