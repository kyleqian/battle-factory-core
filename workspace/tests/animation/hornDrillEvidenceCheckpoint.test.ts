import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/hornDrillEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_HORN_DRILL complete bilateral Scene-ON evidence", () => {
  it("strictly replays every retained row, lifecycle, latch, BG, and cleanup fact", () => {
    const result = verify();
    expect(result).toMatchObject({ schema: "horn-drill-bilateral-evidence/v1", move: "MOVE_HORN_DRILL", status: "unsupported-evidence", coverageCredit: false, boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } });
    expect(result.orientations["player-back"]).toMatchObject({ sourceWindow: { startFrame: 213, endFrame: 405, frameCount: 193 }, probeJsonSha256: "97c6596394f43436b1ad039ed1d715ceda165b26c81e586531416613d3458a1f", repeatProbeJsonSha256: "97c6596394f43436b1ad039ed1d715ceda165b26c81e586531416613d3458a1f", rawRgbSequenceSha256: "0e3eb5a7fd40c4e6444751ca75047acd92a11142bbc812580dd6f4388df447e5", latches: { hardwareOamEqualsPrecedingSoftware: "192/192", hardwareMatricesEqualPrecedingSoftware: "192/192", hardwarePaletteEqualsPrecedingFaded: "192/192", shakeInvocations: [{ role: "attacker", hardwareLag: 1 }, { role: "target", hardwareLag: 1 }] }, lifecycle: { gBowMonSpriteTemplate: 3, gHornHitSpriteTemplate: 1, gFlashingHitSplatSpriteTemplate: 11 }, background: { bgVramTransitions: [26, 172] }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, gameplayRngTransitions: [] }, cleanup: { age: 192, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 } });
    expect(result.orientations["opponent-front"]).toMatchObject({ sourceWindow: { startFrame: 214, endFrame: 405, frameCount: 192 }, probeJsonSha256: "4d2c544174b3ece5121e536793ddeec15dfa9864b7a5fc51cdbf0e77670f5572", repeatProbeJsonSha256: "4d2c544174b3ece5121e536793ddeec15dfa9864b7a5fc51cdbf0e77670f5572", rawRgbSequenceSha256: "f05011338b2a148f7e44dd7bcfa1736fbe9f54a699d03ac2d725ea24a15f56f9", latches: { hardwareOamEqualsPrecedingSoftware: "191/191", hardwareMatricesEqualPrecedingSoftware: "191/191", hardwarePaletteEqualsPrecedingFaded: "191/191", shakeInvocations: [{ role: "attacker", hardwareLag: 1 }, { role: "target", hardwareLag: 1 }] }, lifecycle: { gBowMonSpriteTemplate: 3, gHornHitSpriteTemplate: 1, gFlashingHitSplatSpriteTemplate: 11 }, background: { bgVramTransitions: [26, 172] }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, gameplayRngTransitions: [] }, cleanup: { age: 191, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 } });
  });

  it("retains complete dense surfaces while production coverage is independently exact", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/horn-drill-evidence.json"), "utf8"));
    expect(fixture.evidenceScope).toMatchObject({ completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, normalizedMaps: true, productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, framebufferCompared: false, coveragePromotion: false, gameplayStateOwned: false });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_HORN_DRILL"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: any) => track.id === "horn-drill-bg-horn-shakes")).toMatchObject({ fulfilled: true, representatives: ["MOVE_HORN_DRILL"] });
    for (const side of ["player-back", "opponent-front"]) {
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, fixture.orientations[side].denseState))).toString("utf8"));
      expect(dense.frames).toHaveLength(side === "player-back" ? 193 : 192);
      expect(dense.frames.every((row: any) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.spriteOrder.length === 64 && row.bgVram.charBlockSha256.length === 4 && row.bgVram.screenBlockSha256.length === 32 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });
});
