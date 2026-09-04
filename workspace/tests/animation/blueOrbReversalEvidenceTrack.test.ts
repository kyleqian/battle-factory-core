import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ReversalReceipt = {
  readonly orientation: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

type SwallowCheckpoint = {
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
    readonly rgbSequenceSha256: string;
  };
};

function receipt(path: string): ReversalReceipt {
  return JSON.parse(readFileSync(path, "utf8")) as ReversalReceipt;
}

describe("blue-orb-reversal-evidence component-track receipt ratchet", () => {
  it("requires independent exact Reversal and every natural Swallow body", () => {
    const reversal = [
      receipt("tools/compare/fixtures/reversal-player-vigoroth-opponent-delcatty.json"),
      receipt("tools/compare/fixtures/reversal-player-delcatty-opponent-vigoroth.json"),
    ];
    expect(reversal.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-vigoroth-to-opponent-delcatty", "VIGOROTH", "player", "DELCATTY", "opponent", { startFrame: 451, endFrame: 624, frameCount: 174 },
        "f4f3dce725b38c7f857a76e6a8d890e983c680ca6032dcfaee5553f7cd5b3a0c",
        "1a761bb08df97ee8b7732f58a46d6da5c249ea2a74495052e6ffabcd54ccb621"],
      ["opponent-vigoroth-to-player-delcatty", "VIGOROTH", "opponent", "DELCATTY", "player", { startFrame: 404, endFrame: 577, frameCount: 174 },
        "11937052c0e51f13725fbb42723c88d758979c38727e1deddf4a3686c1d82877",
        "0f284e09df395d32a63702ebe3ab349b5edec829345a87b6ca92990dbb7623e1"],
    ]);

    const matrix = JSON.parse(readFileSync(
      "tools/compare/fixtures/swallow-evidence-matrix.json",
      "utf8",
    )) as { readonly branches: readonly {
      orientation: string;
      stockpiles: number;
      fixture: string;
    }[] };
    expect(matrix.branches.map((branch) => {
      const checkpoint = JSON.parse(readFileSync(branch.fixture, "utf8")) as SwallowCheckpoint;
      return [
        branch.orientation,
        branch.stockpiles,
        checkpoint.sourceWindow,
      ];
    })).toEqual([
      ["player-back", 1, { startFrame: 1247, endFrame: 1409, frameCount: 163, rgbSequenceSha256: "1723b6d66528faf51a26facde57ab0e96ce7a564804f26da828428e29d5f95b8" }],
      ["player-back", 2, { startFrame: 2174, endFrame: 2351, frameCount: 178, rgbSequenceSha256: "f864b72c9e6580d45a8c9c63810d6e3a04828c8b231b9e747471fd7edf0590c4" }],
      ["player-back", 3, { startFrame: 2999, endFrame: 3191, frameCount: 193, rgbSequenceSha256: "f4e2c8b34d7b96529d2d24e787ed66d9ebf2311781a025427d231ea9aafc8b63" }],
      ["opponent-front", 1, { startFrame: 1140, endFrame: 1300, frameCount: 161, rgbSequenceSha256: "62ac89c01abcd2ab14d48b6a0ed3d75a840fa161ddab8b40d551afb7d5feeeba" }],
      ["opponent-front", 2, { startFrame: 2066, endFrame: 2241, frameCount: 176, rgbSequenceSha256: "be8e2bd5631e63d9259355b26a76c5437bc49936f6c391e23c269bfaf53ecc38" }],
      ["opponent-front", 3, { startFrame: 6979, endFrame: 7169, frameCount: 191, rgbSequenceSha256: "002662dc153f5c0e8768b41c611184527bf4d0c8fd03593610ca29b50d63c96c" }],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    for (const move of ["MOVE_REVERSAL", "MOVE_SWALLOW"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ move, status: "exact" });
    }
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "blue-orb-reversal-evidence",
    )).toMatchObject({
      representatives: ["MOVE_REVERSAL", "MOVE_SWALLOW"],
      fulfilled: true,
    });
  });

  it("keeps the move-owned latch evidence distinct from sibling inheritance", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites");
    expect(latches).toContain("Palette writes (`gPlttBufferFaded`)");
    expect(latches).toContain("Freshly allocated OAM **affine matrix**");
    expect(latches).toContain("`AnimTask_ShakeMon2` (usual longer schedules)");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured: visible events display ONE");
    expect(readFileSync("tools/compare/reversalPortable.ts", "utf8"))
      .toContain("targetShake");
    expect(readFileSync("src/animation/swallow.ts", "utf8"))
      .toContain("attackerDisplayedY2: age === 48");
  });
});
