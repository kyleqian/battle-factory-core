import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/auroraBeamEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_AURORA_BEAM complete bilateral Scene-ON evidence", () => {
  it("strictly replays both dense windows, all 40 rings, transfers, BG fades, audio, and cleanup", () => {
    const result = verify();
    expect(result).toMatchObject({ schema: "aurora-beam-bilateral-evidence/v1", move: "MOVE_AURORA_BEAM", status: "unsupported-evidence", coverageCredit: false, boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } });
    expect(result.orientations["player-back"]).toMatchObject({
      sourceWindow: { startFrame: 215, endFrame: 430, frameCount: 216, sourceFrameCount: 216 },
      probeJsonSha256: "6e75815588a417b4966981ae6288f46c7153a143fcad744c2cc6831563c9b601",
      repeatProbeJsonSha256: "6e75815588a417b4966981ae6288f46c7153a143fcad744c2cc6831563c9b601",
      rawRgbSequenceSha256: "38f7e8987498680d704097e7e2d1ca286f298738f669ec793b9cfab50794403d",
      lifecycle: { ringCount: 40, arg7Edges: [[0, 0], [90, -1]], releaseRows: [90] },
      latches: { oam: "215/215", matrices: "215/215", palette: "215/215", firstShake: { invocation: [1, 0, 17, 1], task: [54, 85, 32], source: [54, 86], hardwareLag: 1 }, secondShake: { invocation: [2, 0, 40, 1], task: [90, 167, 78], source: [90, 168], hardwareLag: 1 }, paletteRotations: 43 },
      background: { bgVramTransitions: [23, 195], bldcntEdges: [[0, 0], [5, 232], [41, 0], [177, 232], [214, 0]], loadAge: 23, restoreAge: 195, firstFadeTask: [4, 40], restoreFadeTask: [176, 213] },
      audio: { initialDispatch: 42, loopTask: [90, 143, 54], loopDispatches: [90, 100, 111, 122, 133, 144], args: [3, 6, 0, 10] },
      resources: { rainbowRings: { tile: [1, 214, 214], palette: [1, 214, 214] } },
      state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, gameplayRngTransitions: [], animationRngDistinct: 215 },
      cleanup: { age: 215, active: false, visualTasks: 0, soundTasks: 0, rings: 0, tasks: 0 },
    });
    expect(result.orientations["opponent-front"]).toMatchObject({
      sourceWindow: { startFrame: 216, endFrame: 431, frameCount: 216, sourceFrameCount: 216 },
      probeJsonSha256: "c84a4676b99b3fcacfbf2b7af1af706412555149333ddfc53f8c8e4c449b7ff9",
      repeatProbeJsonSha256: "c84a4676b99b3fcacfbf2b7af1af706412555149333ddfc53f8c8e4c449b7ff9",
      rawRgbSequenceSha256: "8c5be30ea3580e0fa146fc83f1e1133bbb69c0e21f2c8e75da0ab420b4746421",
      lifecycle: { ringCount: 40, arg7Edges: [[0, 0], [90, -1]], releaseRows: [90] },
      latches: { oam: "215/215", matrices: "215/215", palette: "215/215", firstShake: { hardwareLag: 1 }, secondShake: { hardwareLag: 1 }, paletteRotations: 43 },
      background: { bgVramTransitions: [23, 195] },
      state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, gameplayRngTransitions: [], animationRngDistinct: 215 },
      cleanup: { age: 215, active: false, visualTasks: 0, soundTasks: 0, rings: 0, tasks: 0 },
    });
  });

  it("retains complete hermetic surfaces without granting production or coverage credit", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/aurora-beam-evidence.json"), "utf8"));
    expect(fixture.evidenceScope).toMatchObject({ completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: false, reducerAdded: false, assetBundleAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_AURORA_BEAM")).toBeUndefined();
    expect(coverage.componentTracks.find((track: any) => track.id === "aurora-beam-rainbow-rings-bg")).toMatchObject({ fulfilled: false, representatives: ["MOVE_AURORA_BEAM"] });
    for (const side of ["player-back", "opponent-front"]) {
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, fixture.orientations[side].denseState))).toString("utf8"));
      expect(dense.frames).toHaveLength(216);
      expect(dense.frames.every((row: any) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });
});
