import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/razorWindEvidence.ts"], { cwd: root, encoding: "utf8" }));

describe("MOVE_RAZOR_WIND dense Scene-ON evidence checkpoint", () => {
  it("verifies both complete two-turn bodies and raw RGB receipts", () => {
    const result = verify();
    expect(result).toMatchObject({ schema: "razor-wind-bilateral-evidence/v1", move: "MOVE_RAZOR_WIND", status: "unsupported-evidence", coverageCredit: false, boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false } });
    expect(result.orientations["player-back"]).toMatchObject({ denseRows: 119, rawRgbRows: 119, bodyWindows: [{ frameCount: 46 }, { frameCount: 73 }], latches: { setup: { ordinaryOamRamPlus1: "45/45", ordinaryMatricesRamPlus1: "45/45", ordinaryPaletteRamPlus1: "45/45" }, unleash: { ordinaryOamRamPlus1: "72/72", ordinaryMatricesRamPlus1: "72/72", ordinaryPaletteRamPlus1: "71/72", paletteSameRowExceptions: [7] } } });
    expect(result.orientations["opponent-front"]).toMatchObject({ denseRows: 119, rawRgbRows: 119, bodyWindows: [{ frameCount: 46 }, { frameCount: 73 }], latches: { setup: { ordinaryOamRamPlus1: "45/45", ordinaryMatricesRamPlus1: "45/45", ordinaryPaletteRamPlus1: "45/45" }, unleash: { ordinaryOamRamPlus1: "72/72", ordinaryMatricesRamPlus1: "72/72", ordinaryPaletteRamPlus1: "71/72", paletteSameRowExceptions: [7] } } });
  });

  it("retains all requested dense software/hardware/resource/state surfaces", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/razor-wind-evidence.json"), "utf8"));
    expect(fixture.evidenceScope).toMatchObject({ completePointerBody: true, fullDenseRowsRetained: true, twiceFreshByteIdentical: true, productionAnimationChanged: false, framebufferCompared: false, gameplayStateOwned: false });
    for (const side of ["player-back", "opponent-front"]) {
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, fixture.orientations[side].denseState))).toString("utf8"));
      expect(dense.frames).toHaveLength(119);
      expect(dense.frames.every((row: any) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.paletteTags.length === 16 && row.tileTags.length === 128 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });
});
