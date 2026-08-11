import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  FOLLOW_ME_FRAME_COUNT,
  followMeAtAge,
} from "../../src/animation/followMe.ts";

describe("MOVE_FOLLOW_ME source reducer", () => {
  it("ports normal-affine grow, delay, sine crossings, and terminal program", () => {
    const top = { x: 72, y: 72 };
    expect(followMeAtAge(4, "player", top).finger).toMatchObject({
      x: 72, y: 72, x2: 0, subpriority: 28,
      matrix: { a: 1424, b: 0, c: 0, d: 1424 },
    });
    expect(followMeAtAge(25, "player", top).finger)
      .toMatchObject({ x2: 0, subpriority: 28 });
    expect(followMeAtAge(27, "player", top).finger)
      .toMatchObject({ x2: 4, subpriority: 28 });
    expect(followMeAtAge(46, "player", top).finger)
      .toMatchObject({ x2: 43, subpriority: 32 });
    expect(followMeAtAge(66, "player", top).finger)
      .toMatchObject({ x2: -35, subpriority: 28 });
    expect(followMeAtAge(107, "player", top).finger?.matrix)
      .toEqual({ a: 254, b: -25, c: 25, d: 254 });
    expect(followMeAtAge(180, "player", top).finger?.matrix)
      .toEqual({ a: 4096, b: 0, c: 0, d: 4096 });
    expect(followMeAtAge(183, "player", top).finger).toBeNull();
    expect(FOLLOW_ME_FRAME_COUNT).toBe(185);
  });

  it("ports tagged lifetime, audio restarts, clamped top, and cleanup", () => {
    expect(followMeAtAge(1, "opponent", { x: 176, y: 4 }))
      .toMatchObject({ fingerLoaded: true, finger: null });
    expect(followMeAtAge(4, "opponent", { x: 176, y: 4 }))
      .toMatchObject({
        finger: { x: 176, y: 10, subpriority: 38 },
        soundRestart: "SE_M_TAIL_WHIP",
        soundPanSide: "opponent",
      });
    expect(followMeAtAge(24, "player", { x: 72, y: 72 }).soundRestart)
      .toBe("SE_M_ATTRACT");
    expect([97, 119, 141].map((age) =>
      followMeAtAge(age, "player", { x: 72, y: 72 }).soundRestart,
    )).toEqual(["SE_M_TAIL_WHIP", "SE_M_TAIL_WHIP", "SE_M_TAIL_WHIP"]);
    expect(followMeAtAge(184, "player", { x: 72, y: 72 }))
      .toMatchObject({ active: false, fingerLoaded: false, finger: null });
  });

  it("pins the lowest source-legal Level-50 carrier and callback boundary", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/followMeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 183/FRONTIER_MON_TOGETIC_1 -> SPECIES_TOGETIC 176/move 266",
    );
    expect(output).toContain(
      "gFollowMeFingerSpriteTemplate/AnimFollowMeFinger",
    );
  });
});
