import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/fire-blast-evidence.json", "utf8",
));
const sha = (path: string): string => createHash("sha256")
  .update(readFileSync(path)).digest("hex");

describe("MOVE_FIRE_BLAST bilateral dense evidence checkpoint", () => {
  it("retains two fresh complete Scene-ON runs per orientation through cleanup", () => {
    expect(fixture).toMatchObject({
      schema: "fire-blast-bilateral-evidence/v1",
      status: "exact",
      coverageCredit: true,
      acceptance: {
        sourceRows: 394, rawRgbRows: 394, freshRunsPerOrientation: 2,
        reducerRows: 394, typedSeamRows: 394, framebufferRows: 394,
        ringGroups: 3, ringSprites: 15, crossGroups: 9, crossSprites: 45,
        firstInactiveCleanupAge: 196,
      },
    });
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.verifier)).toBe(fixture.source.verifierSha256);
    expect(sha(fixture.source.reducerVerifier))
      .toBe(fixture.source.reducerVerifierSha256);
    expect(sha(fixture.source.framebufferVerifier))
      .toBe(fixture.source.framebufferVerifierSha256);
    expect(sha(fixture.source.stagingFixture))
      .toBe(fixture.source.stagingFixtureSha256);
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const entry = fixture.orientations[orientation];
      expect(entry.probeJsonSha256).toBe(entry.repeatProbeJsonSha256);
      expect(sha(entry.scenario)).toBe(entry.scenarioSha256);
      expect(sha(entry.denseState)).toBe(entry.denseStateSha256);
      expect(sha(entry.rawRgbArchive)).toBe(entry.rawRgbArchiveSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(entry.denseState)).toString());
      expect(probe.sourceWindow).toEqual(entry.sourceWindow);
      expect(probe.frames).toHaveLength(197);
      expect(probe.frames[0]).toMatchObject({ scriptOffset: 0, animScriptActive: true });
      expect(probe.frames.at(-1)).toMatchObject({
        animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0,
      });
      expect(probe.frames.every((row: any) => row.softwareOam.length === 128
        && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32
        && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512
        && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
        && row.parties.player.length === 3 && row.parties.opponent.length === 3
      )).toBe(true);
    }
  });

  it("replays every retained source/state/RGB row and promotes Fire Blast alone", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/fireBlastEvidence.ts",
    ], { encoding: "utf8" }));
    for (const orientation of ["player-back", "opponent-front"] as const) {
      expect(summary[orientation]).toMatchObject({
        lifecycle: {
          gFireBlastRingSpriteTemplate: 15,
          gFireBlastCrossSpriteTemplate: 45,
        },
        latches: { oam: "196/196", matrices: "196/196", palette: "196/196" },
        rng: { gameplayDistinct: 1, animationDistinct: 197 },
        cleanup: { age: 196, active: false, visualTasks: 0, soundTasks: 0 },
      });
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: any) => entry.status === "exact"))
      .toHaveLength(218);
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_FIRE_BLAST"))
      .toMatchObject({ status: "exact" });
    for (const move of ["MOVE_DRAGON_BREATH", "MOVE_FLAMETHROWER", "MOVE_BLAZE_KICK",
      "MOVE_EMBER", "MOVE_FIRE_SPIN"]) {
      expect(coverage.entries.find((entry: any) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
    expect(fixture.acceptanceVerdict).toContain("394/394");
    expect(fixture.acceptanceVerdict).toContain("No sibling");
  });
});
