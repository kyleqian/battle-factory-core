import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/mega-drain-evidence.json", "utf8",
)) as Record<string, any>;
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const orientationEntries = Object.entries(fixture.orientations) as Array<[string, Record<string, any>]>;

describe("MOVE_MEGA_DRAIN dense Scene-ON evidence", () => {
  it("pins the evidence-only scope and retains all independent controls", () => {
    expect(fixture).toMatchObject({
      schema: "mega-drain-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_MEGA_DRAIN",
      moveId: 72,
      status: "unsupported",
      coverageCredit: false,
      coverageCounts: "Level 50: 185/276 exact, 0 partial, 0 staged, 91 unsupported",
      source: {
        scriptStart: "0x082d10b2",
        exclusiveEnd: "0x082d1121",
        megaDrainAbsorbEffect: "0x082d1121..0x082d1242",
        healingEffect: "0x082d79df..0x082d7a28",
        impactAnimation: 1,
        pairedOrbs: 16,
        greenBlend: "0->8->0",
      },
      evidenceScope: {
        productionAnimationChanged: false,
        reducerAdded: false,
        typedSeamAdded: false,
        compositorAdded: false,
        framebufferLookupAdded: false,
        coveragePromotion: false,
        boundaryOrBarrierChanged: false,
        gameplayStateOwned: false,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
      },
      batchSiblingAudit: {
        MOVE_ABSORB: expect.stringContaining("no evidence, latch, or acceptance inheritance"),
        MOVE_DREAM_EATER: "independently unsupported",
        MOVE_GIGA_DRAIN: "independently unsupported",
        coverageCredit: false,
      },
    });
  });

  it.each(orientationEntries)("pins repeatable source/state/RGB/map receipts for %s", (_orientation, evidence) => {
    expect(sha256(readFileSync(evidence.scenario))).toBe(evidence.scenarioSha256);
    expect(sha256(readFileSync(fixture.source.probe))).toBe(fixture.source.probeSha256);
    for (const [path, digest] of [
      [evidence.denseState, evidence.denseStateSha256],
      [evidence.rawRgbArchive, evidence.rawRgbArchiveSha256],
      [evidence.changeMap, evidence.changeMapSha256],
    ]) expect(sha256(readFileSync(path))).toBe(digest);
    expect(evidence.repeatProbeJsonSha256).toBe(evidence.probeJsonSha256);
    expect(evidence.sourceWindow).toMatchObject({ frameCount: 218 });
    expect(evidence.rawRgbArchiveMemberCount).toBe(218);
    expect(evidence.latches).toMatchObject({
      hardwareOamEqualsPrecedingSoftware: "217/217",
      hardwareMatricesEqualsPrecedingSoftware: "217/217",
      hardwarePaletteEqualsPrecedingFaded: "216/217",
      hardwarePaletteSameRowMonbgExceptionAges: [10],
      activeBackgroundOffsetsEqualPrecedingSource: "217/217",
    });
  });

  it("replays every banked state and raw-RGB row through the strict portable verifier", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/megaDrainEvidencePortable.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("MEGA_DRAIN portable evidence 436/436; player 218, opponent 218");
  });
});
