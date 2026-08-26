import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  scaryFaceAttackerPaletteBlackCoeffAtAge,
  scaryFacePaletteBlackCoeffAtAge,
} from "../../src/animation/scaryFace.ts";

describe("MOVE_ERUPTION simple-palette component", () => {
  it("strictly reduces every retained bilateral palette row through first inactive cleanup", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/eruptionPaletteAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(summary).toMatchObject({
      schema: "eruption-simple-palette-component-audit/v1",
      status: "banked-component-only-move-unsupported",
      "player-back": {
        rows: 476,
        openingCommandAges: { first: 4, last: 18, count: 15 },
        closingCommandAges: { first: 321, last: 475, count: 155 },
        spriteLives: [
          { first: 4, last: 17, count: 14, slot: 3 },
          { first: 321, last: 338, count: 18, slot: 3 },
        ],
        selectedPaletteMask: 0x0003_000e,
        selectedPaletteBanks: [1, 2, 3, 16, 17],
        warmRock: { tag: 10201, slot: 7, bank: 23, allocationAge: 1, freeAge: 475 },
        transfers: { palettePredecessor: "475/475", oamPredecessor: "475/475" },
        cleanupAge: 475,
      },
      "opponent-front": {
        rows: 494,
        openingCommandAges: { first: 4, last: 18, count: 15 },
        closingCommandAges: { first: 339, last: 493, count: 155 },
        spriteLives: [
          { first: 4, last: 17, count: 14, slot: 3 },
          { first: 339, last: 356, count: 18, slot: 3 },
        ],
        selectedPaletteMask: 0x0003_000e,
        selectedPaletteBanks: [1, 2, 3, 16, 17],
        warmRock: { tag: 10201, slot: 7, bank: 23, allocationAge: 1, freeAge: 493 },
        transfers: { palettePredecessor: "493/493", oamPredecessor: "493/493" },
        cleanupAge: 493,
      },
    });
    expect(summary["player-back"].fadeEdges).toEqual([
      { age: 0, coefficient: 0, bg: 0, obj: 0, active: false },
      { age: 4, coefficient: 0, bg: 0, obj: 0, active: true },
      { age: 7, coefficient: 0, bg: 2, obj: 0, active: true },
      { age: 8, coefficient: 2, bg: 2, obj: 2, active: true },
      { age: 11, coefficient: 2, bg: 4, obj: 2, active: true },
      { age: 12, coefficient: 4, bg: 4, obj: 4, active: true },
      { age: 17, coefficient: 4, bg: 4, obj: 4, active: false },
      { age: 321, coefficient: 4, bg: 4, obj: 4, active: true },
      { age: 326, coefficient: 4, bg: 2, obj: 4, active: true },
      { age: 327, coefficient: 2, bg: 2, obj: 2, active: true },
      { age: 332, coefficient: 2, bg: 0, obj: 2, active: true },
      { age: 333, coefficient: 0, bg: 0, obj: 0, active: true },
      { age: 338, coefficient: 0, bg: 0, obj: 0, active: false },
    ]);
  });

  it("banks no move credit and leaves an independent exact palette control unchanged", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ERUPTION")).toBeUndefined();
    expect(coverage.componentTracks.find((track: any) => track.id === "eruption-warm-rock")).toMatchObject({ fulfilled: false });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SCARY_FACE")?.status).toBe("exact");
    expect([0, 4, 5, 9, 10, 143, 148, 149, 188, 189].map(scaryFacePaletteBlackCoeffAtAge))
      .toEqual([0, 0, 2, 2, 4, 16, 14, 14, 0, 0]);
    expect([0, 5, 10, 143, 144, 149, 189].map(scaryFaceAttackerPaletteBlackCoeffAtAge))
      .toEqual([0, 0, 2, 16, 16, 14, 0]);
  });
});
