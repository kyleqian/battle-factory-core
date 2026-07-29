import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { endureAtAge } from "../../src/animation/endure.ts";

describe("MOVE_ENDURE source-relative reducer", () => {
  const player = (age: number) =>
    endureAtAge(age, "player", { x: 72, y: 80 });

  it("reuses the exact three-wave lifecycle while keeping red explicit", () => {
    expect(player(4).sprites).toEqual([
      expect.objectContaining({
        wave: 0,
        index: 0,
        oamSlot: 3,
        x: 48,
        y: 105,
        frame: 0,
      }),
    ]);
    expect(player(38)).toMatchObject({
      active: true,
      visualTaskCount: 6,
      paletteTaskActive: true,
      attackerPaletteY: 0,
      attackerPaletteTarget: "red",
      shakeTaskActive: true,
      attackerX2: -1,
    });
    expect(player(62)).toMatchObject({
      attackerPaletteY: 11,
      attackerPaletteTarget: "red",
    });
    expect(player(121)).toMatchObject({
      active: false,
      assetLoaded: false,
      scriptOffset: 63,
      visualTaskCount: 0,
      attackerPaletteTarget: "red",
    });
  });

  it("keeps attacker-panned Dragon Rage and display latches", () => {
    expect(player(1).soundEvents).toEqual([{
      age: 1,
      song: "SE_M_DRAGON_RAGE",
      pan: -64,
      player: "SE1",
    }]);
    expect(endureAtAge(1, "opponent", { x: 176, y: 40 }).soundEvents[0])
      .toMatchObject({ pan: 63 });
    expect(player(39)).toMatchObject({
      battlerDisplayAge: 38,
      attackerShakeDisplayAge: 37,
      attackerDisplayX2: 1,
    });
  });

  it("re-extracts only Eevee front/back art byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "endure-assets-"));
    const output = join(scratch, "endure.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractEndureAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/endure.json"),
    );
  });
});
