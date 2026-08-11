import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tickleAsset from "../../src/animation/assets/tickle.json" with { type: "json" };
import {
  TICKLE_FRAME_COUNT,
  tickleAtAge,
  tickleEyesAtAge,
  ticklePaletteBlackCoeffAtAge,
} from "../../src/animation/tickle.ts";

describe("MOVE_TICKLE source reducer", () => {
  it("ports both black palette ramps and the two eye lifecycles", () => {
    expect([4, 6, 20, 48, 50, 64].map(ticklePaletteBlackCoeffAtAge))
      .toEqual([0, 2, 16, 16, 14, 0]);
    expect(tickleEyesAtAge(27, "player", { x: 72, y: 96 }))
      .toEqual([
        { slot: 3, x: 56, y: 96, frame: 0 },
        { slot: 4, x: 88, y: 96, frame: 0 },
      ]);
    expect(tickleEyesAtAge(34, "player", { x: 72, y: 96 })[0]?.frame).toBe(2);
    expect(tickleEyesAtAge(47, "player", { x: 72, y: 96 })).toEqual([]);
  });

  it("ports SwayMon and the target speed-2 six-rock body", () => {
    expect(tickleAtAge(93, "player", { x: 72, y: 96 }))
      .toMatchObject({ attackerX2: 0, swayActive: true });
    expect(tickleAtAge(94, "player", { x: 72, y: 96 }).attackerX2).toBe(1);
    expect(tickleAtAge(107, "player", { x: 72, y: 96 }).targetRock)
      .toMatchObject({ active: true, x2: -4, rotation: 512 });
    expect(tickleAtAge(202, "player", { x: 72, y: 96 }).targetRock.active)
      .toBe(true);
    expect(tickleAtAge(203, "player", { x: 72, y: 96 }).targetRock.active)
      .toBe(false);
    expect(TICKLE_FRAME_COUNT).toBe(205);
  });

  it("regenerates OMANYTE and EYE_SPARKLE source art byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-tickle-assets-"));
    const output = join(scratch, "tickle.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractTickleAssets.ts",
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/tickle.json"),
    );
    expect(tickleAsset.source.eyeSparkle).toContain("ANIM_TAG_EYE_SPARKLE");
  });
});
