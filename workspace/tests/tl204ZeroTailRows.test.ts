/**
 * tl204 (docs/tl204-zero-tail-rows.md) / tl205: the ROM rows (Scene ON, direct mGBA, twice fresh) around the live body of ten no-hit moves whose ont193 script tail was
 * 0 frames, pinned side by side with production's command timeline. tl205 landed the rule (tail frames = scriptTailRows - 1: trail -1, post 0; a masked pre no longer gates a
 * measured trail): Double Team, Rain Dance, Sunny Day, Hail and Leech Seed are at residual 0; the other five keep their body-window-length remainders (data, not hidden).
 * Hermetic: reads the committed ROM receipt (tools/integration/fixtures/tl204/rom-rows.json) and runs the real kernel + projection in-process. The ROM rows are expectations only.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareCase } from "../tools/integration/tl204Compare.ts";

const FIX = new URL("../tools/integration/fixtures/tl204/", import.meta.url);
const rom = JSON.parse(readFileSync(new URL("rom-rows.json", FIX), "utf8")) as Record<string, any>;
const byMove = new Map(Object.values(rom).map((r) => [r.move as string, r]));

// kse1: the body-window column (304) and the hypothesis column (2) count the SE wait's universal post 2 twice; the used -> print row (333) is the ROM's. Scary Face's body now ends with Cmd_end's SE_M_STRING_SHOT2 wait (+14 rows, post 2, tail frames 2): used -> print 319 -> 333 = the ROM row (residual -14 -> 0).
// lead4 (B3): the S bodies (Double Team, Rain Dance, Scary Face, Light Screen, Sunny Day, Charm, Hail) present their script lead before the body, so their tailRows / tailFrames
// pins are the old ones minus the lead (1 / 2 / 1 / 3 / 3 / 1 / 3 rows); every window residual and the used -> print / print -> next rows are unchanged.
// used -> print = first glyph of "<MON> used <MOVE>!" to the first glyph of the print that follows the body (ROM) / message start (production).
// print -> next = that print (chain end) to the foe's "used TACKLE!". Production columns are what the code produces today.
const PINS: Record<string, {
  romUsedToPrint: number; productionUsedToPrint: number; romPrintToNext: number; productionPrintToNext: number; tailRows: number; tailFrames: number; pre: number;
  romScriptRows: number; productionStatRows: number; romWindowRows: number; productionBodyRows: number; residualAfterHypothesis: number; residualBefore: number;
}> = {
  "double-team": { romUsedToPrint: 271, productionUsedToPrint: 271, romPrintToNext: 104, productionPrintToNext: 104, tailRows: 5, tailFrames: 4, pre: 0, romScriptRows: 7, productionStatRows: 2, romWindowRows: 239, productionBodyRows: 239, residualAfterHypothesis: 0, residualBefore: -5 },
  "rain-dance": { romUsedToPrint: 219, productionUsedToPrint: 219, romPrintToNext: 105, productionPrintToNext: 105, tailRows: 4, tailFrames: 3, pre: 3, romScriptRows: 5, productionStatRows: 0, romWindowRows: 190, productionBodyRows: 190, residualAfterHypothesis: 0, residualBefore: -5 },
  "scary-face": { romUsedToPrint: 333, productionUsedToPrint: 333, romPrintToNext: 107, productionPrintToNext: 107, tailRows: 5, tailFrames: 2, pre: 3, romScriptRows: 7, productionStatRows: 2, romWindowRows: 302, productionBodyRows: 304, residualAfterHypothesis: 2, residualBefore: -19 },
  "light-screen": { romUsedToPrint: 121, productionUsedToPrint: 123, romPrintToNext: 111, productionPrintToNext: 111, tailRows: 4, tailFrames: 3, pre: 3, romScriptRows: 6, productionStatRows: 0, romWindowRows: 89, productionBodyRows: 91, residualAfterHypothesis: 2, residualBefore: -4 },
  "calm-mind": { romUsedToPrint: 220, productionUsedToPrint: 219, romPrintToNext: 100, productionPrintToNext: 100, tailRows: 5, tailFrames: 4, pre: 3, romScriptRows: 9, productionStatRows: 2, romWindowRows: 188, productionBodyRows: 185, residualAfterHypothesis: -1, residualBefore: -10 },
  "sunny-day": { romUsedToPrint: 190, productionUsedToPrint: 190, romPrintToNext: 110, productionPrintToNext: 110, tailRows: 4, tailFrames: 3, pre: 3, romScriptRows: 6, productionStatRows: 0, romWindowRows: 161, productionBodyRows: 161, residualAfterHypothesis: 0, residualBefore: -6 },
  "charm": { romUsedToPrint: 218, productionUsedToPrint: 217, romPrintToNext: 108, productionPrintToNext: 108, tailRows: 5, tailFrames: 4, pre: 3, romScriptRows: 7, productionStatRows: 2, romWindowRows: 192, productionBodyRows: 191, residualAfterHypothesis: -1, residualBefore: -6 },
  "fake-tears": { romUsedToPrint: 209, productionUsedToPrint: 208, romPrintToNext: 109, productionPrintToNext: 109, tailRows: 6, tailFrames: 0, pre: 3, romScriptRows: 7, productionStatRows: 2, romWindowRows: 178, productionBodyRows: 182, residualAfterHypothesis: 4, residualBefore: -1 },
  "leech-seed": { romUsedToPrint: 207, productionUsedToPrint: 207, romPrintToNext: 98, productionPrintToNext: 98, tailRows: 4, tailFrames: 3, pre: 3, romScriptRows: 39, productionStatRows: 0, romWindowRows: 144, productionBodyRows: 144, residualAfterHypothesis: 0, residualBefore: -39 },
  "hail": { romUsedToPrint: 185, productionUsedToPrint: 185, romPrintToNext: 105, productionPrintToNext: 105, tailRows: 4, tailFrames: 3, pre: 3, romScriptRows: 6, productionStatRows: 0, romWindowRows: 161, productionBodyRows: 161, residualAfterHypothesis: 0, residualBefore: -6 },
};

describe("tl204: Scene ON zero-tail no-hit moves, ROM rows vs production (residuals are data)", () => {
  it("the ROM receipt covers the ten staged moves, each probed twice fresh with identical rows", () => {
    expect([...byMove.keys()].sort()).toEqual(Object.keys(PINS).sort());
    const dir = readdirSync(new URL("rom/", FIX));
    for (const file of dir.filter((f) => f.endsWith("-r1.json"))) expect(dir).toContain(file.replace("-r1.json", "-r2.json"));
    const identity = readFileSync(new URL("rom/r1-r2-identity.txt", FIX), "utf8").trim().split("\n");
    expect(identity).toHaveLength(10);
    for (const line of identity) expect(line).toContain("rows r1==r2 byte-identical");
    for (const f of dir.filter((f) => f.endsWith("-r1.json"))) {
      expect(readFileSync(new URL(`rom/${f}`, FIX), "utf8")).toBe(readFileSync(new URL(`rom/${f.replace("-r1.json", "-r2.json")}`, FIX), "utf8"));
    }
  });

  it.each(Object.entries(PINS))("%s: ROM row, production row and residual", (move, pin) => {
    const { row } = compareCase(byMove.get(move)!);
    expect(row.usedToPrint.rom).toBe(pin.romUsedToPrint);
    expect(row.usedToPrint.production).toBe(pin.productionUsedToPrint);
    expect(row.usedToPrint.residual).toBe(pin.productionUsedToPrint - pin.romUsedToPrint);
    expect(row.printToNext.rom).toBe(pin.romPrintToNext);
    expect(row.printToNext.production).toBe(pin.productionPrintToNext);
    expect(row.printToNext.residual).toBe(0);
    expect(row.tailRows).toBe(pin.tailRows);
    expect(row.tailFrames).toBe(pin.tailFrames);
    expect(row.universalRows).toEqual({ pre: pin.pre, post: move === "scary-face" ? 2 : 0 }); // kse1: Scary Face carries the universal post 2 with its SE wait
    expect(row.accounting).toMatchObject({
      romScriptRows: pin.romScriptRows, productionStatRows: pin.productionStatRows, romWindowRows: pin.romWindowRows, productionBodyRows: pin.productionBodyRows,
      residualAfterHypothesis: pin.residualAfterHypothesis,
    });
  });

  it("residual = script residual + body residual (+ used-print rows, none); before tl205 every residual was production early", () => {
    for (const [move, pin] of Object.entries(PINS)) {
      const { row } = compareCase(byMove.get(move)!);
      const a = row.accounting;
      expect(a.usedResidual).toBe(0);
      expect(row.usedToPrint.residual).toBe(a.scriptResidual + a.bodyResidual);
      expect(pin.residualBefore).toBeLessThan(0);
      expect(row.usedToPrint.residual).toBe(pin.productionUsedToPrint - pin.romUsedToPrint);
      expect(a.productionTailFrames).toBe(pin.tailFrames);
    }
  });

  it("the foe's following print is already on the ROM row after every chain (print -> next residual 0 for all ten)", () => {
    for (const move of Object.keys(PINS)) expect(compareCase(byMove.get(move)!).row.printToNext.residual).toBe(0);
  });

  it("tl205: the five exact-window moves are at residual 0 (tail frames = scriptTailRows - 1); the others are no worse than before; Fake Tears is held out", () => {
    for (const move of ["double-team", "rain-dance", "sunny-day", "hail", "leech-seed"]) {
      const { row } = compareCase(byMove.get(move)!);
      expect([move, row.usedToPrint.residual]).toEqual([move, 0]);
      expect(row.tailFrames).toBe(row.tailRows! - 1);
      expect(-row.accounting.scriptResidual + row.tailFrames!).toBe(row.tailRows! - 1);
    }
    for (const [move, pin] of Object.entries(PINS)) {
      const { row } = compareCase(byMove.get(move)!);
      expect([move, Math.abs(row.usedToPrint.residual)]).toEqual([move, Math.abs(pin.productionUsedToPrint - pin.romUsedToPrint)]);
      expect(Math.abs(row.usedToPrint.residual)).toBeLessThanOrEqual(Math.abs(pin.residualBefore));
      // Fake Tears is held out of the trail table (rule would give +4, worse than its -1): its tail stays 0 and the hypothesis column is the would-be value
      if (move !== "fake-tears" && move !== "scary-face") expect(row.accounting.residualAfterHypothesis).toBe(row.usedToPrint.residual);
    }
    expect(compareCase(byMove.get("fake-tears")!).row.accounting.residualAfterHypothesis).toBe(4);
    // the remaining non-zero residuals are the body-window lengths (data/battle_anim_scripts.s), not tail rules
    for (const [move, residual] of [["light-screen", 2], ["charm", -1], ["fake-tears", -1], ["calm-mind", -1], ["scary-face", 0]] as const) {
      expect([move, compareCase(byMove.get(move)!).row.usedToPrint.residual]).toEqual([move, residual]);
    }
  });
});
