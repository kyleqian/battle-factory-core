import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  AMNESIA_FRAME_COUNT,
  amnesiaAtAge,
  amnesiaDisplayedQuestionMarkAtAge,
} from "../../src/animation/amnesia.ts";

describe("MOVE_AMNESIA", () => {
  it("ports the source-relative question mark, psychic background, audio, and cleanup", () => {
    const center = { x: 72, y: 98 };
    const size = { width: 64, height: 48 };
    expect(AMNESIA_FRAME_COUNT).toBe(216);
    expect(amnesiaAtAge(52, "player", center, size)).toMatchObject({
      resourceLoaded: true, psychicTaskActive: true,
      sound: "SE_M_METRONOME", soundPanSide: "player",
      questionMark: { x: 104, y: 74, frame: 0, affine: false },
    });
    expect(amnesiaAtAge(107, "player", center, size).questionMark).toMatchObject({
      frame: 6, affine: true, matrix: [254, -25, 25, 254],
    });
    expect(amnesiaDisplayedQuestionMarkAtAge(108, "player", center, size)?.matrix)
      .toEqual([254, -25, 25, 254]);
    expect(amnesiaAtAge(215, "player", center, size)).toMatchObject({
      active: false, resourceLoaded: false, psychicTaskActive: false,
      bgBldy: 0, bgIsPsychic: false, questionMark: null,
    });
    expect(amnesiaAtAge(52, "opponent", { x: 176, y: 48 }, { width: 64, height: 64 }).questionMark)
      .toMatchObject({ x: 144, y: 16 });
  });

  it("passes all 432 retained actual-core rows in two fresh processes", () => {
    const run = () => JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/amnesiaActualCore.ts", "--require-exact",
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    const first = run();
    const second = run();
    expect(first).toMatchObject({
      schema: "amnesia-actual-core-residual/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_AMNESIA", totalRows: 432, exactRows: 432, residualRows: 0,
      firstResidual: null, lastResidual: null, maximumResidual: null,
      rowsSha256: "cac83ed5dec881b743662f86f6142efdb01916dc0919c403dd584b1331db0637",
      alteredControl: { differs: true, species: "RELICANTH" },
    });
    expect(second).toEqual(first);
  }, 20_000);
});
