import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COVET_ASSET_UNLOAD_AGE,
  COVET_CHARM_START_AGE,
  COVET_FRAME_COUNT,
  COVET_ITEM_BAG_LOAD_AGE,
  COVET_SHAKE_START_AGE,
  covetAtAge,
} from "../../src/animation/covet.ts";

describe("MOVE_COVET source reducer", () => {
  it("ports both source loads and the complete Charm prefix", () => {
    expect(covetAtAge(0, "player", { x: 72, y: 80 })).toMatchObject({
      heartAssetLoaded: true, itemBagAssetLoaded: false,
      charm: { visualActive: false },
    });
    expect(covetAtAge(COVET_ITEM_BAG_LOAD_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({ heartAssetLoaded: true, itemBagAssetLoaded: true });
    expect(covetAtAge(COVET_CHARM_START_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({
        charm: { rock: { x2: 2 }, hearts: [{ x: 72 }], soundRestart: "SE_M_CHARM" },
      });
  });

  it("ports terminal target ShakeMon2, side audio, and cleanup", () => {
    expect(covetAtAge(COVET_SHAKE_START_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({
        targetOffset: { x2: -2, y2: 0 }, shakeActive: true,
        soundRestart: "SE_M_DIZZY_PUNCH", soundPanSide: "opponent",
      });
    expect(covetAtAge(COVET_SHAKE_START_AGE + 13, "opponent", { x: 176, y: 40 }))
      .toMatchObject({ targetOffset: { x2: -2, y2: 0 }, shakeActive: true });
    expect(covetAtAge(COVET_SHAKE_START_AGE + 14, "player", { x: 72, y: 80 }))
      .toMatchObject({ targetOffset: { x2: 0, y2: 0 }, shakeActive: false });
    expect(COVET_FRAME_COUNT).toBe(135);
    expect(covetAtAge(COVET_ASSET_UNLOAD_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({
        heartAssetLoaded: false, itemBagAssetLoaded: false, active: true,
      });
  });

  it("regenerates LINOONE and ITEM_BAG assets byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-covet-assets-"));
    const output = join(scratch, "covet.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractCovetAssets.ts",
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/covet.json"),
    );
  });
});
