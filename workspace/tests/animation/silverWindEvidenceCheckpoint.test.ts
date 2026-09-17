import { describe, expect, it } from "vitest";
import { verifySilverWindEvidence } from "../../tools/compare/silverWindEvidence.ts";

describe("MOVE_SILVER_WIND bilateral dense evidence checkpoint", () => {
  it("reconstructs every retained semantic, RGB888, normalized-map, and latch row without an oracle", () => {
    expect(verifySilverWindEvidence()).toEqual({
      schema: "silver-wind-bilateral-evidence/v1",
      status: "unsupported-evidence-checkpoint",
      coverageCredit: false,
      orientations: {
        "player-back": {
          rows: 193, startFrame: 81, cleanupAge: 192,
          probeJsonSha256: "416bcc0f84501c945b79ade41b0f0d2615ea727b8cfcd71708db02c97cb75d5e",
          rawRgbSequenceSha256: "2694dc3097053c98f64adc7f76d52e98a499aa47b802d78a4664c36414978d2b",
          sparkles: 18, oamRamPlusOneRows: 192, matrixRamPlusOneRows: 192, paletteRamPlusOneRows: 191,
          paletteSameRowExceptions: [6], slidingBgFirstSourceAge: 30, slidingBgFirstHardwareAge: 31,
          slidingBgClearSourceAge: 165, slidingBgClearHardwareAge: 166, excludedTargetBank: 17,
          affectedBanks: [1, 2, 3, 16],
        },
        "opponent-front": {
          rows: 196, startFrame: 223, cleanupAge: 195,
          probeJsonSha256: "3fed2dda881b3f79b70169f7554e1812d72b4a82c4cd72aa677a907fbcdde517",
          rawRgbSequenceSha256: "8c32e7335376eb95bdefb08d01513c4e5fc0a658cb5890bf7b45c8d858c05653",
          sparkles: 18, oamRamPlusOneRows: 195, matrixRamPlusOneRows: 195, paletteRamPlusOneRows: 194,
          paletteSameRowExceptions: [6], slidingBgFirstSourceAge: 30, slidingBgFirstHardwareAge: 31,
          slidingBgClearSourceAge: 168, slidingBgClearHardwareAge: 169, excludedTargetBank: 16,
          affectedBanks: [1, 2, 3, 17],
        },
      },
    });
  });
});
