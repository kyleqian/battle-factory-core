import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/psybeam-evidence.json", "utf8",
));
const sha = (path: string): string => createHash("sha256")
  .update(readFileSync(path)).digest("hex");

describe("MOVE_PSYBEAM bilateral dense evidence checkpoint", () => {
  it("retains complete twice-fresh Scene-ON state and RGB through cleanup", () => {
    expect(fixture).toMatchObject({
      schema: "psybeam-bilateral-evidence/v1",
      status: "partial",
      coverageCredit: false,
      acceptance: {
        sourceRows: 320, rawRgbRows: 320, freshRunsPerOrientation: 2,
        ringGroups: 11, ringSprites: 11, firstInactiveCleanupAge: 159,
      },
    });
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.verifier)).toBe(fixture.source.verifierSha256);
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const entry = fixture.orientations[orientation];
      expect(entry.probeJsonSha256).toBe(entry.repeatProbeJsonSha256);
      expect(sha(entry.scenario)).toBe(entry.scenarioSha256);
      expect(sha(entry.denseState)).toBe(entry.denseStateSha256);
      expect(sha(entry.rawRgbArchive)).toBe(entry.rawRgbArchiveSha256);
      expect(sha(entry.changeMap)).toBe(entry.changeMapSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(entry.denseState)).toString());
      expect(probe.sourceWindow).toEqual(entry.sourceWindow);
      expect(probe.frames).toHaveLength(160);
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

  it("pins Psybeam's own latch maps and keeps every sibling independent", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/psybeamEvidence.ts",
    ], { encoding: "utf8" }));
    for (const orientation of ["player-back", "opponent-front"] as const) {
      expect(summary[orientation]).toMatchObject({
        sourceWindow: { startFrame: 213, endFrame: 372, frameCount: 160 },
        ringCreationAges: [42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102],
        latches: { oam: "159/159", matrices: "159/159", palette: "159/159" },
        bldyEdges: 65, orientationShift: 0,
        rng: { gameplayDistinct: 1, animationDistinct: 160 },
        cleanup: { age: 159, active: false, visualTasks: 0, soundTasks: 0 },
      });
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_PSYBEAM"))
      .toMatchObject({ status: "partial" });
    for (const move of ["MOVE_HYPNOSIS", "MOVE_SHADOW_BALL", "MOVE_CONFUSION", "MOVE_PSYCHIC"]) {
      expect(coverage.entries.find((entry: any) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
    expect(fixture.boundedRemainder).toContain("320 retained framebuffer rows");
    expect(fixture.boundedRemainder).toContain("No sibling");
  });
});
