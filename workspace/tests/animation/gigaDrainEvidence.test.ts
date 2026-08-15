import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/giga-drain-evidence.json", "utf8",
)) as Record<string, any>;
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

describe("MOVE_GIGA_DRAIN bilateral Scene-ON evidence", () => {
  it("pins exact scope, independent siblings, and complete retained windows", () => {
    expect(fixture).toMatchObject({
      schema: "giga-drain-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_GIGA_DRAIN",
      moveId: 202,
      status: "exact",
      coverageCredit: true,
      coverageCounts: "Level 50: 187/276 exact, 0 partial, 0 staged, 89 unsupported",
      source: {
        scriptStart: "0x082d1242",
        exclusiveEnd: "0x082d12b1",
        gigaDrainAbsorbEffect: "0x082d12b1..0x082d144a",
        healingEffect: "0x082d79df..0x082d7a28",
        impactAnimation: 0,
        orbs: 24,
        greenBlend: "0->12->0",
      },
      evidenceScope: {
        productionAnimationChanged: true,
        reducerAdded: true,
        typedSeamAdded: true,
        compositorAdded: true,
        framebufferLookupAdded: false,
        coveragePromotion: true,
        boundaryOrBarrierChanged: false,
        gameplayStateOwned: false,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
      },
      batchSiblingAudit: {
        MOVE_ABSORB: expect.stringContaining("no evidence, latch, or acceptance inheritance"),
        MOVE_MEGA_DRAIN: expect.stringContaining("independently exact"),
        MOVE_DREAM_EATER: "independently unsupported",
        MOVE_GIGA_DRAIN: "sole promotion candidate",
        coverageCredit: "MOVE_GIGA_DRAIN only",
      },
    });
  });

  it.each(Object.entries(fixture.orientations) as Array<[string, Record<string, any>]>)(
    "pins complete source/RGB/change-map receipts for %s",
    (_orientation, evidence) => {
      expect(sha256(readFileSync(evidence.scenario))).toBe(evidence.scenarioSha256);
      expect(sha256(readFileSync(fixture.source.probe))).toBe(fixture.source.probeSha256);
      for (const [path, digest] of [
        [evidence.denseState, evidence.denseStateSha256],
        [evidence.rawRgbArchive, evidence.rawRgbArchiveSha256],
        [evidence.changeMap, evidence.changeMapSha256],
      ]) expect(sha256(readFileSync(path))).toBe(digest);
      expect(evidence.repeatProbeJsonSha256).toBe(evidence.probeJsonSha256);
      expect(evidence.sourceWindow).toMatchObject({ frameCount: 230 });
      expect(evidence.rawRgbArchiveMemberCount).toBe(230);
      expect(evidence.latches).toMatchObject({
        hardwareOamEqualsPrecedingSoftware: "229/229",
        hardwareMatricesEqualsPrecedingSoftware: "229/229",
        hardwarePaletteEqualsPrecedingFaded: "228/229",
        hardwarePaletteSameRowMonbgExceptionAges: [10],
        activeBackgroundOffsetsEqualPrecedingSource: "229/229",
      });
    },
  );

  it("replays all retained state/RGB maps and production framebuffer rows", () => {
    const portable = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/gigaDrainEvidencePortable.ts",
    ], { encoding: "utf8" });
    expect(portable).toContain("GIGA_DRAIN portable evidence 460/460; player 230, opponent 230");
    const framebuffer = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/gigaDrainFramebuffer.ts",
    ], { encoding: "utf8" });
    expect(framebuffer).toContain("MOVE_GIGA_DRAIN: 460/460 rows exact with zero residual pixels");
  }, 30000);
});
