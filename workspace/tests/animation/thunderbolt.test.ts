import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { thunderboltAtAge } from "../../src/animation/thunderbolt.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspect = (): any => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/thunderboltFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const allocation = { slot: 3, matrixNum: 0, order: 0 };
const profile = { bolts: Array.from({ length: 15 }, () => allocation), orb: allocation,
  flashes: Array.from({ length: 8 }, () => allocation),
  arcs: Array.from({ length: 8 }, () => allocation) };
const geometry = { targetBattleCenter: { x: 176, y: 40 },
  targetPictureCenter: { x: 176, y: 49 } };

describe("MOVE_THUNDERBOLT production body", () => {
  it("ports bolt, affine flash/orb, shared arc, palette, and cleanup schedules", () => {
    expect(thunderboltAtAge(28, "opponent", geometry, profile).sprites
      .filter((sprite) => sprite.kind === "bolt")).toHaveLength(1);
    expect(thunderboltAtAge(54, "opponent", geometry, profile).sprites
      .filter((sprite) => sprite.kind === "bolt")).toHaveLength(15);
    expect(thunderboltAtAge(105, "opponent", geometry, profile).sprites
      .map((sprite) => sprite.kind)).toEqual(["orb", ...Array(7).fill("flash")]);
    expect(thunderboltAtAge(106, "opponent", geometry, profile).sprites
      .filter((sprite) => sprite.kind === "flash")).toHaveLength(8);
    expect(thunderboltAtAge(173, "opponent", geometry, profile).sprites[0])
      .toMatchObject({ kind: "arc", x: 181, y: 40 });
    expect(thunderboltAtAge(173, "player", { ...geometry,
      targetBattleCenter: { x: 72, y: 80 } }, profile).sprites[0])
      .toMatchObject({ kind: "arc", x: 67, y: 80 });
    expect(thunderboltAtAge(236, "opponent", geometry, profile))
      .toMatchObject({ active: false, cleanup: true, backgroundPaletteY: 0 });
  });

  it("extracts all Thunderbolt sprite sheets byte-for-byte", () => {
    const scratch = createScratchDir("pokebench-thunderbolt-assets-");
    const output = join(scratch, "thunderbolt.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractThunderboltAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(
      root, "src/animation/assets/thunderbolt.json")));
  });

  it("reproduces all 474 actual-core rows twice and changes an altered live control", () => {
    const result = inspect(), repeat = inspect();
    expect(result.comparisons.map((item: any) => [item.totalRows, item.componentExactRows]))
      .toEqual([[237, 237], [237, 237]]);
    expect(result.comparisons.map((item: any) => [item.zeroRows, item.residualPixels,
      item.peakResidualPixels])).toEqual([[237, 0, 0], [237, 0, 0]]);
    expect(repeat).toEqual(result);
    expect(result.alteredControl.species).toEqual(["GOLDUCK", "GRAVELER"]);
    expect(result.alteredControl.sides).toEqual(["opponent", "player"]);
    expect(result.alteredControl.baseFramebufferSha256)
      .not.toBe(result.alteredControl.alteredFramebufferSha256);
  });
});
