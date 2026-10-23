/**
 * tl204 (docs/tl204-zero-tail-rows.md): the ROM rows (Scene ON, direct mGBA, twice fresh) around the live body of ten no-hit moves whose ont193 script tail is 0 frames,
 * pinned side by side with production's current command timeline. The residuals are DATA: this test documents the gap, it does not hide it. When the proposed rule
 * lands (tail frames = scriptTailRows - 1, Double Team's masked pre not gating it) the production columns and `tailFrames` move and these pins are re-pinned.
 * Hermetic: reads the committed ROM receipt (tools/integration/fixtures/tl204/rom-rows.json) and runs the real kernel + projection in-process.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareCase } from "../tools/integration/tl204Compare.ts";

const FIX = new URL("../tools/integration/fixtures/tl204/", import.meta.url);
const rom = JSON.parse(readFileSync(new URL("rom-rows.json", FIX), "utf8")) as Record<string, any>;
const byMove = new Map(Object.values(rom).map((r) => [r.move as string, r]));

// used -> print = first glyph of "<MON> used <MOVE>!" to the first glyph of the print that follows the body (ROM) / message start (production).
// print -> next = that print (chain end) to the foe's "used TACKLE!". Production columns are what the code produces today.
const PINS: Record<string, {
  romUsedToPrint: number; productionUsedToPrint: number; romPrintToNext: number; productionPrintToNext: number; tailRows: number; tailFrames: number; pre: number;
  romScriptRows: number; productionStatRows: number; romWindowRows: number; productionBodyRows: number; residualAfterHypothesis: number;
}> = {
  "double-team": { romUsedToPrint: 271, productionUsedToPrint: 266, romPrintToNext: 104, productionPrintToNext: 104, tailRows: 6, tailFrames: 0, pre: 0, romScriptRows: 7, productionStatRows: 2, romWindowRows: 239, productionBodyRows: 239, residualAfterHypothesis: 0 },
  "rain-dance": { romUsedToPrint: 219, productionUsedToPrint: 214, romPrintToNext: 105, productionPrintToNext: 105, tailRows: 6, tailFrames: 0, pre: 3, romScriptRows: 5, productionStatRows: 0, romWindowRows: 190, productionBodyRows: 190, residualAfterHypothesis: 0 },
  "scary-face": { romUsedToPrint: 333, productionUsedToPrint: 314, romPrintToNext: 107, productionPrintToNext: 107, tailRows: 6, tailFrames: 0, pre: 3, romScriptRows: 7, productionStatRows: 2, romWindowRows: 302, productionBodyRows: 288, residualAfterHypothesis: -14 },
  "light-screen": { romUsedToPrint: 121, productionUsedToPrint: 117, romPrintToNext: 111, productionPrintToNext: 111, tailRows: 7, tailFrames: 0, pre: 3, romScriptRows: 6, productionStatRows: 0, romWindowRows: 89, productionBodyRows: 91, residualAfterHypothesis: 2 },
  "calm-mind": { romUsedToPrint: 220, productionUsedToPrint: 210, romPrintToNext: 100, productionPrintToNext: 100, tailRows: 7, tailFrames: 0, pre: 3, romScriptRows: 9, productionStatRows: 2, romWindowRows: 188, productionBodyRows: 185, residualAfterHypothesis: -4 },
  "sunny-day": { romUsedToPrint: 190, productionUsedToPrint: 184, romPrintToNext: 110, productionPrintToNext: 110, tailRows: 7, tailFrames: 0, pre: 3, romScriptRows: 6, productionStatRows: 0, romWindowRows: 161, productionBodyRows: 161, residualAfterHypothesis: 0 },
  "charm": { romUsedToPrint: 218, productionUsedToPrint: 212, romPrintToNext: 108, productionPrintToNext: 108, tailRows: 6, tailFrames: 0, pre: 3, romScriptRows: 7, productionStatRows: 2, romWindowRows: 192, productionBodyRows: 191, residualAfterHypothesis: -1 },
  "fake-tears": { romUsedToPrint: 209, productionUsedToPrint: 208, romPrintToNext: 109, productionPrintToNext: 109, tailRows: 6, tailFrames: 0, pre: 3, romScriptRows: 7, productionStatRows: 2, romWindowRows: 178, productionBodyRows: 182, residualAfterHypothesis: 4 },
  "leech-seed": { romUsedToPrint: 207, productionUsedToPrint: 168, romPrintToNext: 98, productionPrintToNext: 98, tailRows: 40, tailFrames: 0, pre: 3, romScriptRows: 39, productionStatRows: 0, romWindowRows: 144, productionBodyRows: 144, residualAfterHypothesis: 0 },
  "hail": { romUsedToPrint: 185, productionUsedToPrint: 179, romPrintToNext: 105, productionPrintToNext: 105, tailRows: 7, tailFrames: 0, pre: 3, romScriptRows: 6, productionStatRows: 0, romWindowRows: 161, productionBodyRows: 161, residualAfterHypothesis: 0 },
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
    expect(row.universalRows).toEqual({ pre: pin.pre, post: 0 });
    expect(row.accounting).toMatchObject({
      romScriptRows: pin.romScriptRows, productionStatRows: pin.productionStatRows, romWindowRows: pin.romWindowRows, productionBodyRows: pin.productionBodyRows,
      residualAfterHypothesis: pin.residualAfterHypothesis,
    });
  });

  it("every residual is production early (negative) and is exactly script rows + body rows (+ used-print rows, none)", () => {
    for (const [move, pin] of Object.entries(PINS)) {
      const { row } = compareCase(byMove.get(move)!);
      const a = row.accounting;
      expect(a.usedResidual).toBe(0);
      expect(row.usedToPrint.residual).toBe(a.scriptResidual + a.bodyResidual);
      expect(row.usedToPrint.residual).toBeLessThan(0);
      expect(pin.productionUsedToPrint).toBeLessThan(pin.romUsedToPrint);
    }
  });

  it("the foe's following print is already on the ROM row after every chain (print -> next residual 0 for all ten)", () => {
    for (const move of Object.keys(PINS)) expect(compareCase(byMove.get(move)!).row.printToNext.residual).toBe(0);
  });

  it("the proposed rule (tail frames = scriptTailRows - 1) would clear the script residual: only body-length residuals remain", () => {
    for (const [move, pin] of Object.entries(PINS)) {
      const { row } = compareCase(byMove.get(move)!);
      const a = row.accounting;
      // exact body windows (Double Team, Rain Dance, Sunny Day, Hail, Leech Seed): the script residual is the whole residual and the hypothesis lands on 0
      if (a.bodyResidual === 0) expect([move, a.residualAfterHypothesis]).toEqual([move, 0]);
      else expect(a.residualAfterHypothesis).toBe(a.bodyResidual + (a.scriptResidual + Math.max(0, pin.tailRows - 1)));
    }
    // the five exact-window moves carry scriptTailRows - 1 = the full script deficit
    for (const move of ["double-team", "rain-dance", "sunny-day", "hail", "leech-seed"]) {
      const { row } = compareCase(byMove.get(move)!);
      expect(-row.accounting.scriptResidual).toBe(row.tailRows! - 1);
    }
  });
});
