import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hornDrillAtAge } from "../../src/animation/hornDrill.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const inspect = (): any => JSON.parse(execFileSync(process.execPath,
  ["--experimental-strip-types", "tools/compare/hornDrillFramebuffer.ts"],
  { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));

describe("MOVE_HORN_DRILL source reducer and production framebuffer checkpoint", () => {
  const geometry = {
    attackerCenter: { x: 72, y: 91 }, targetPictureCenter: { x: 176, y: 42 },
    attackerRestOffset: { x2: 0, y2: 0 }, targetRestOffset: { x2: 1, y2: 0 },
  } as const;
  const profile = {
    hornSlot: 4, hornMatrixId: 0,
    impactSlots: [3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4],
    impactMatrixIds: [0, 3, 4, 0, 3, 4, 0, 3, 4, 0, 3],
    spriteOrderSeed: [3, 4, 5], effectSubpriority: 37,
  } as const;
  it("ports its own BG, BowMon, horn, dual shakes, impacts, restore, and cleanup", () => {
    const at = (age: number) => hornDrillAtAge(age, "player", geometry, profile);
    expect(at(26).background).toEqual({ active: true, hofs: 503, vofs: 3 });
    expect(at(27).background).toEqual({ active: true, hofs: 494, vofs: 6 });
    expect(at(45).attackerOffset).toEqual({ x2: 0, y2: 0 });
    expect(at(56)).toMatchObject({ attackerOffset: { x2: -12, y2: 9 },
      attackerMatrix: [244, 74, -74, 244] });
    expect(at(62).horn).toMatchObject({ x: 139, y: 60, hFlip: false, vFlip: false });
    expect([74, 75, 76, 77, 150, 151].map((age) => at(age).attackerOffset.x2))
      .toEqual([-2, 2, 2, -2, -2, 0]);
    expect([74, 75, 76, 77, 150, 151].map((age) => at(age).targetOffset.x2))
      .toEqual([-10, 10, 10, -10, -10, 0]);
    expect(at(134).impacts.some((impact) => impact.index === 10)).toBe(true);
    expect(at(172).cleanup.sourceRestore).toBe(true);
    expect(at(173).cleanup.hardwareRestore).toBe(true);
    expect(at(192).cleanup.firstInactive).toBe(true);
  });

  it("regenerates the source asset bundle byte-for-byte", () => {
    const scratch = resolve(createScratchDir("pokebench-horn-drill-assets-"), "horn-drill.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractHornDrillAssets.ts", "--out", scratch], { cwd: root });
    expect(readFileSync(scratch)).toEqual(readFileSync(resolve(root,
      "src/animation/assets/horn-drill.json")));
  });

  it("keeps the complete actual-core residual verdict deterministic", () => {
    const first = inspect();
    expect(inspect()).toEqual(first);
    expect(first.comparisons.map(({ orientation, totalRows, zeroRows, residualPixels,
      peakResidualPixels, componentExactRows }: any) => ({ orientation, totalRows, zeroRows,
      residualPixels, peakResidualPixels, componentExactRows }))).toEqual([
      { orientation: "player-back", totalRows: 193, zeroRows: 85,
        residualPixels: 1829747, peakResidualPixels: 26880, componentExactRows: 193 },
      { orientation: "opponent-front", totalRows: 192, zeroRows: 85,
        residualPixels: 1845577, peakResidualPixels: 26880, componentExactRows: 192 },
    ]);
  }, 30_000);

  it("routes altered live species, side, geometry, allocator, matrix, and order", () => {
    const result = inspect().alteredControl;
    expect(result).toMatchObject({ species: ["GOLDUCK", "GRAVELER"],
      sides: ["player", "opponent"], geometry: { attackerCenter: { x: 61, y: 93 },
        targetPictureCenter: { x: 183, y: 39 } },
      allocator: { hornSlot: 11, order: [17, 15, 16] } });
    expect(result.alteredFramebufferSha256).not.toBe(result.baseFramebufferSha256);
  });
});
