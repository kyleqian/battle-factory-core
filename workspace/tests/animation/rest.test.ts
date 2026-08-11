import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  REST_FRAME_COUNT,
  restAtAge,
  restLetterMatrixAtAge,
} from "../../src/animation/rest.ts";

describe("MOVE_REST source reducer", () => {
  it("ports all three spawn/callback lifecycles and side-specific affine programs", () => {
    const player = { x: 72, y: 80 };
    expect(restAtAge(4, "player", player).letters).toEqual([{
      index: 0, slot: 3, x: 76, y: 70, x2: 0, y2: 0,
      screenCenterYOffset: 16,
      matrix: { a: 1771, b: 1528, c: -1528, d: 1771 },
      callback: "AnimSleepLetterZ_Step",
    }]);
    expect(restAtAge(26, "player", player).letters.map((letter) => letter.slot))
      .toEqual([3, 4]);
    expect(restAtAge(48, "player", player).letters.map((letter) => letter.slot))
      .toEqual([3, 4, 5]);
    expect(restAtAge(63, "player", player).letters[0]).toMatchObject({
      x2: 11, y2: -42,
      matrix: { a: 305, b: 45, c: -45, d: 305 },
    });
    expect(restAtAge(64, "player", player).letters.map((letter) => letter.slot))
      .toEqual([4, 5]);
    expect(restLetterMatrixAtAge(0, "opponent"))
      .toEqual({ a: 1771, b: -1528, c: 1528, d: 1771 });
  });

  it("pins source offsets, tagged lifetime, attacker-panned audio, and cleanup", () => {
    const opponent = { x: 176, y: 53 };
    expect(restAtAge(0, "opponent", opponent))
      .toMatchObject({ active: true, letterZLoaded: false, scriptOffset: 0 });
    expect(restAtAge(1, "opponent", opponent)).toMatchObject({
      letterZLoaded: true,
      scriptOffset: 7,
      soundRestart: "SE_M_SNORE",
      soundPanSide: "opponent",
    });
    expect(restAtAge(4, "opponent", opponent).letters[0])
      .toMatchObject({ x: 172, y: 43, screenCenterYOffset: 0 });
    expect(restAtAge(109, "opponent", opponent)).toMatchObject({
      active: false, letterZLoaded: false, scriptOffset: 63, letters: [],
    });
    expect(REST_FRAME_COUNT).toBe(110);
  });

  it("pins the legal carrier, battle-state ordering, and distinct sibling boundary", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/restSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 117/FRONTIER_MON_TEDDIURSA -> SPECIES_TEDDIURSA 216/move 156",
    );
    expect(output).toContain(
      "Sleep Talk remains distinct with 9 gLetterZSpriteTemplate lifecycles plus AnimTask_SwayMon",
    );
  });
});
