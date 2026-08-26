import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/ice-beam-evidence.json", "utf8"));
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_ICE_BEAM complete bilateral evidence checkpoint", () => {
  it("pins twice-fresh dense state, chronological RGB, normalized maps, and first inactive cleanup", () => {
    expect(fixture).toMatchObject({
      schema: "ice-beam-bilateral-evidence/v1", status: "unsupported-evidence-checkpoint", coverageCredit: false,
      acceptance: { sourceRows: 406, rawRgbRows: 406, freshRunsPerOrientation: 2, firstInactiveCleanupAge: 202, productionFramebufferRows: 0 },
    });
    for (const key of ["audit", "assetExtractor", "asset", "probe", "changeMapBuilder", "verifier"] as const) {
      expect(sha(fixture.source[key])).toBe(fixture.source[`${key}Sha256`]);
    }
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const entry = fixture.orientations[orientation];
      expect(entry.probeJsonSha256).toBe(entry.repeatProbeJsonSha256);
      for (const key of ["scenario", "denseState", "rawRgbArchive", "changeMap"] as const) expect(sha(entry[key])).toBe(entry[`${key}Sha256`]);
      const probe = JSON.parse(gunzipSync(readFileSync(entry.denseState)).toString("utf8"));
      expect(probe.sourceWindow).toEqual(entry.sourceWindow);
      expect(probe.frames).toHaveLength(203);
      expect(probe.frames[0]).toMatchObject({ scriptOwner: "Move_ICE_BEAM", scriptOffset: 0, animScriptActive: true });
      expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
    }
  });

  it("replays every retained state/RGB/map row and pins Ice Beam's own monbg ShakeMon2 latch", () => {
    const summary = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/iceBeamEvidence.ts"], { encoding: "utf8" }));
    expect(summary["player-back"]).toMatchObject({
      sourceWindow: { startFrame: 75, endFrame: 277, frameCount: 203 },
      ownerCounts: { Move_ICE_BEAM: 134, IceBeamCreateCrystals: 33, IceCrystalEffectShort: 36 },
      creations: { outer: 24, inner: 13, largeHits: 3, smallHits: 4 },
      tasks: { sound: [26,57,32], shake: [38,85,48], monbg: [1,200,200], clear: [198,200,3] },
      latches: { oam: "202/202 RAM+1", matrices: "202/202 RAM+1", palette: "201/202 RAM+1; age 1 pre-animation exception", monbgShake: "source 38..86 -> display 39..87 RAM+1" },
      rng: { gameplayDistinct: 1, animationDistinct: 201 }, cleanup: { age: 202, active: false, resources: false, visualTasks: 0, soundTasks: 0 }, changedRgbEdges: 130,
    });
    expect(summary["opponent-front"]).toMatchObject({
      sourceWindow: { startFrame: 79, endFrame: 281, frameCount: 203 }, changedRgbEdges: 129,
      latches: { oam: "202/202 RAM+1", matrices: "202/202 RAM+1", monbgShake: "source 38..86 -> display 39..87 RAM+1" },
      cleanup: { age: 202, active: false, resources: false, visualTasks: 0, soundTasks: 0 },
    });
    expect(fixture.latchVerdict).toContain("AnimTask_ShakeMon2(2,0,25,1)");
    expect(fixture.remainder).toContain("remains unsupported");
    expect(fixture.remainder).toContain("No reducer");
  });
});
