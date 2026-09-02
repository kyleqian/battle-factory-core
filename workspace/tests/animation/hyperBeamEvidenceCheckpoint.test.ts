import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/hyperBeamEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_HYPER_BEAM complete bilateral Scene-ON evidence", () => {
  it("replays every dense pointer row, orb lifecycle, task, transfer, palette ramp, audio row, and cleanup", () => {
    const result = verify();
    expect(result).toMatchObject({ schema: "hyper-beam-bilateral-evidence/v1", move: "MOVE_HYPER_BEAM", status: "exact", coverageCredit: true, boundary: { moveLedgerEntry: true, trackFulfilled: true, barrierChanged: false } });
    expect(result.orientations["player-back"]).toMatchObject({
      sourceWindow: { startFrame: 79, endFrame: 358, frameCount: 280, sourceFrameCount: 280 },
      probeJsonSha256: "ad28c7d36c5e6b45c17f6614a1258c89cc1886694878ddd80b9a4340b9706e3d",
      repeatProbeJsonSha256: "ad28c7d36c5e6b45c17f6614a1258c89cc1886694878ddd80b9a4340b9706e3d",
      rawRgbSequenceSha256: "3a9599a3c5404ee243b5ab5a84bf35fefafd284a4f78001eeb2dd239baa5d6b7",
      lifecycle: { orbCount: 52, orbGroupStarts: [110, 113, 116, 119, 122, 125, 128, 131, 134, 137, 140, 143, 146, 149, 152, 155, 158, 161, 164, 167, 170, 173, 176, 179, 182, 185] },
      rng: { stepHistogram: { 1: 253, 7: 26 }, random2Draws: 156, totalTransitions: 279 },
      latches: { oam: "279/279", matrices: "279/279", palette: "279/279" },
      palette: { orbFlashAges: [110, 116, 122, 128, 134, 140, 146, 152, 158, 164, 170, 176, 182, 189], targetBlendAges: [129, 132, 135, 138, 141, 144, 147, 150, 153, 156, 159, 192, 195, 198, 201, 204, 207, 210, 213, 216, 219, 222] },
      cleanup: { age: 279, active: false, visualTasks: 0, soundTasks: 0, orbs: 0, tasks: 0, simplePaletteBlend: 0 },
    });
    expect(result.orientations["opponent-front"]).toMatchObject({
      sourceWindow: { startFrame: 83, endFrame: 362, frameCount: 280, sourceFrameCount: 280 },
      probeJsonSha256: "834a2a81c933f906670fc417daa4425391736fec5266cceced99e372521fbbad",
      repeatProbeJsonSha256: "834a2a81c933f906670fc417daa4425391736fec5266cceced99e372521fbbad",
      rawRgbSequenceSha256: "5de2eebec3cf5362a38ec6f7ecae28e2b5bc44df3d9621555063edafa81cb8b3",
      lifecycle: { orbCount: 52, orbGroupStarts: [110, 113, 116, 119, 122, 125, 128, 131, 134, 137, 140, 143, 146, 149, 152, 155, 158, 161, 164, 167, 170, 173, 176, 179, 182, 185] },
      rng: { stepHistogram: { 1: 253, 7: 26 }, random2Draws: 156, totalTransitions: 279 },
      latches: { oam: "279/279", matrices: "279/279", palette: "279/279" },
      cleanup: { age: 279, active: false, visualTasks: 0, soundTasks: 0, orbs: 0, tasks: 0, simplePaletteBlend: 0 },
    });
  });

  it("records exact production scope and keeps Aurora/Psybeam controls exact while Thunderbolt stays distinct", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/hyper-beam-evidence.json"), "utf8"));
    expect(fixture.evidenceScope).toMatchObject({ sourceAudit: true, completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: true, reducerAdded: true, assetBundleAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferCompared: true, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_HYPER_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_AURORA_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_PSYBEAM")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_THUNDERBOLT")).toBeUndefined();
    expect(coverage.componentTracks.find((entry: any) => entry.id === "hyper-beam-orbs-blackout")).toMatchObject({ representatives: ["MOVE_HYPER_BEAM"], fulfilled: true });
    for (const side of ["player-back", "opponent-front"]) {
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, fixture.orientations[side].denseState))).toString("utf8"));
      expect(dense.frames).toHaveLength(280);
      expect(dense.frames.every((row: any) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.spriteFlags.length === 64 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });
});
