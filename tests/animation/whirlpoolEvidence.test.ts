import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_WHIRLPOOL main-animation evidence checkpoint", () => {
  it("keeps the independent source body and legal Wailmer carrier pinned", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/waterOrbSourceAudit.ts"], { encoding: "utf8" }))
      .toContain("18 affine vortex orbs");
  });

  it("records only the complete main body, twice fresh in both orientations", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_WHIRLPOOL")).toMatchObject({ status: "partial" });
    for (const [path, frameCount, evidence, raw] of [
      ["tools/compare/fixtures/whirlpool-player-wailmer-opponent-onix.json", 133,
        "2942fa0bf1a07da485bcf391ca4ecea06a41361d648adc27a1e48a3f32018125",
        "d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8"],
      ["tools/compare/fixtures/whirlpool-opponent-wailmer-player-onix.json", 133,
        "7e57488e1a265960fec441a02b5133f0b4a6e38ddde46cd42e21b5a29b0aaba3",
        "8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa"],
    ] as const) {
      expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
        oracleProfile: "battle-scene-on", sourceWindow: { frameCount },
        evidenceSha256: evidence, rawRgbSha256: raw,
      });
    }
  });
});
