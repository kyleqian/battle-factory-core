import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  orientation: string;
  attacker: { species: string; geometry: { side: "player" | "opponent" } };
  target: { species: string; geometry: { side: "player" | "opponent" } };
  sourceWindow: { startFrame: number; endFrame: number; frameCount: number };
  lifecycleCounts: Record<string, number>;
  evidenceSha256: string;
  rawRgbSha256: string;
};

function receipt(path: string): Receipt {
  return JSON.parse(readFileSync(path, "utf8")) as Receipt;
}

describe("finger-metronome component-track receipt ratchet", () => {
  it("requires both independently exact bilateral FINGER bodies", () => {
    const metronome = [
      receipt("tools/compare/fixtures/metronome-player-chansey-opponent-onix.json"),
      receipt("tools/compare/fixtures/metronome-opponent-chansey-player-onix.json"),
    ];
    const followMe = [
      receipt("tools/compare/fixtures/follow-me-player-togetic-opponent-onix.json"),
      receipt("tools/compare/fixtures/follow-me-opponent-togetic-player-onix.json"),
    ];

    expect(metronome.map((entry) => [
      entry.orientation, entry.attacker.species, entry.attacker.geometry.side,
      entry.target.species, entry.target.geometry.side, entry.sourceWindow,
      entry.lifecycleCounts, entry.evidenceSha256, entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Chansey -> opponent-front Onix", "CHANSEY", "player", "ONIX", "opponent", { startFrame: 245, endFrame: 371, frameCount: 127 },
        { gThoughtBubbleSpriteTemplate: 1, gMetronomeFingerSpriteTemplate: 1 },
        "01f259da1179263438c721865ce1e5e534652004336a887ea9d9b91f07666e02",
        "24940bca0b95034ff2e8b9b5b2e450996df581c70b6622fb72cb5ad360d176af"],
      ["opponent-front Chansey -> player-back Onix", "CHANSEY", "opponent", "ONIX", "player", { startFrame: 244, endFrame: 370, frameCount: 127 },
        { gThoughtBubbleSpriteTemplate: 1, gMetronomeFingerSpriteTemplate: 1 },
        "cdae46f8d3b37b4603314f96fe268621df779aee72066a272b90d8f709be6881",
        "06e94878ed92007e98d7fe26e6f6e3404e8e76fb93273fc903a98a69b254f8f6"],
    ]);
    expect(followMe.map((entry) => [
      entry.orientation, entry.attacker.species, entry.attacker.geometry.side,
      entry.target.species, entry.target.geometry.side, entry.sourceWindow,
      entry.lifecycleCounts, entry.evidenceSha256, entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Togetic -> opponent-front Onix", "TOGETIC", "player", "ONIX", "opponent", { startFrame: 69, endFrame: 253, frameCount: 185 },
        { gFollowMeFingerSpriteTemplate: 1 },
        "5aefcc2e260438071df5776ec35ff02a9c4540e4913fcab8db5d4018892cb871",
        "99d4031b7dc1aa40e2f68ba177e7617283a9873603b3d962db0e4cc1c33ffd96"],
      ["opponent-front Togetic -> player-back Onix", "TOGETIC", "opponent", "ONIX", "player", { startFrame: 73, endFrame: 257, frameCount: 185 },
        { gFollowMeFingerSpriteTemplate: 1 },
        "74485aa1de9e13cc0721a99d78c2cacfd4bf2c456d91a0a844ae20cb1c7be0e0",
        "7518f7d53c9d83f9ee9e5711a6082b169d56026ce037575878d7092fd1bea1bf"],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    expect(coverage.entries.filter((entry: { status: string }) =>
      entry.status === "partial" || entry.status === "staged",
    )).toEqual([]);
    for (const move of ["MOVE_METRONOME", "MOVE_FOLLOW_ME"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ move, status: "exact" });
    }
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "finger-metronome",
    )).toEqual([
      expect.objectContaining({
        components: [
          "asset:ANIM_TAG_FINGER",
          "asset:ANIM_TAG_THOUGHT_BUBBLE",
          "sprite:gThoughtBubbleSpriteTemplate",
          "sprite:gMetronomeFingerSpriteTemplate",
          "sprite:gFollowMeFingerSpriteTemplate",
        ],
        representatives: ["MOVE_METRONOME", "MOVE_FOLLOW_ME"],
        fulfilled: true,
      }),
    ]);
  });
});
