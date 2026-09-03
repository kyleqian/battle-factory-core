import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_WHIRLPOOL exact Scene-ON evidence", () => {
  it("keeps the independent source body and legal Wailmer carrier pinned", () => {
    expect(execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/waterOrbSourceAudit.ts"], { encoding: "utf8" }))
      .toContain("18 affine vortex orbs");
  });

  it("records the complete main body, twice fresh in both orientations", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const entry = coverage.entries.find((candidate: { move: string }) =>
      candidate.move === "MOVE_WHIRLPOOL");
    expect(entry).toMatchObject({ status: "exact" });
    expect(entry.evidence).toEqual(expect.arrayContaining([
      "src/animation/whirlpool.ts",
      "tools/compare/whirlpoolPortable.ts",
      "tests/animation/whirlpool.test.ts",
    ]));
    for (const [path, frameCount, evidence, raw] of [
      ["tools/compare/fixtures/whirlpool-player-wailmer-opponent-onix.json", 133,
        "7525e3073f8832c7528f88a847227605d4024cbbc0022178a5e3e5d6531320ce",
        "d3a4cebcb258d334414d99096b7ded4accc90be1af37da4abf01610866ae96c8"],
      ["tools/compare/fixtures/whirlpool-opponent-wailmer-player-onix.json", 133,
        "d02b38e48b8b71affa46845e9fd867f93e913697d17ff1f03709814f7e690068",
        "8b42073d713d49286935abd3079c2266464f6f66c492a039903fb70740a26ffa"],
    ] as const) {
      expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
        oracleProfile: "battle-scene-on", sourceWindow: { frameCount },
        evidenceSha256: evidence, rawRgbSha256: raw,
      });
    }
  });

  it("pins the separate real-play Status_Whirlpool body twice fresh in both orientations", () => {
    for (const [path, startFrame, evidence, raw] of [
      ["tools/compare/fixtures/status-whirlpool-player-wailmer-opponent-onix.json", 663,
        "f1b3213432dc5269dce74e53d7b94dd92e53e9c718d60bb326fc8e8cb8bc491b",
        "8a809496f28e7cb8e5eb9a37e26f721a9e9b3c14ef67bbf798825d4b527a9e71"],
      ["tools/compare/fixtures/status-whirlpool-opponent-wailmer-player-onix.json", 653,
        "c5e73b98282c51e9a59dcd2e2da4d8cb67c58584d5d8400d7b2eb97733152929",
        "481017b8c09ddf3bbe585e6e2845a02384e27e1b7ed38169834e3eb2ea82463c"],
    ] as const) {
      expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
        schema: "status-whirlpool-portable-evidence/v1", oracleProfile: "battle-scene-on",
        sourceWindow: { startFrame, frameCount: 108 }, evidenceSha256: evidence, rawRgbSha256: raw,
      });
    }
  });

  it("ratchets the independently accepted Water Orb component track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "water-orb-hydro-pump-whirlpool")).toMatchObject({
      representatives: ["MOVE_HYDRO_PUMP", "MOVE_WHIRLPOOL"],
      fulfilled: true,
    });
  });
});
