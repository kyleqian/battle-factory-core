import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  readonly orientation: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly lifecycleCounts?: Record<string, number>;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMapSha256?: string;
};

function receipt(path: string): Receipt {
  return JSON.parse(readFileSync(path, "utf8")) as Receipt;
}

describe("cross-impact-cross-chop component-track receipt ratchet", () => {
  it("requires independent complete bilateral Cross Chop and Leaf Blade receipts", () => {
    const crossChop = [
      receipt("tools/compare/fixtures/cross-chop-player-machoke-opponent-onix.json"),
      receipt("tools/compare/fixtures/cross-chop-opponent-machoke-player-onix.json"),
    ];
    const leafBlade = [
      receipt("tools/compare/fixtures/leaf-blade-player-sceptile-opponent-onix.json"),
      receipt("tools/compare/fixtures/leaf-blade-opponent-sceptile-player-onix.json"),
    ];

    expect(crossChop.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Machoke -> opponent-front Onix", "MACHOKE", "player", "ONIX", "opponent", { startFrame: 216, endFrame: 303, frameCount: 88 },
        "7be7a5bb02c477873c77bec6162f0c9dc0f92e3f1ec3ec8572037c4a44888bc7",
        "9d38ec1582d17fea8c5103c90f904fbf983793b0e3aa26e2cf1df2cec5cd3d04"],
      ["opponent-front Machoke -> player-back Onix", "MACHOKE", "opponent", "ONIX", "player", { startFrame: 217, endFrame: 304, frameCount: 88 },
        "a556199025d17c28ddc9429216daff80afad1f29d92f15324dd563092010d23f",
        "528e9ed15d9e9926f92e5e6e4ce8bbc0d157f34c8e6a05372561d004b76f900f"],
    ]);
    expect(leafBlade.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.lifecycleCounts,
      entry.evidenceSha256,
      entry.rawRgbSha256,
      entry.changeMapSha256,
    ])).toEqual([
      ["player-back Sceptile -> opponent-front Onix", "SCEPTILE", "player", "ONIX", "opponent", { startFrame: 76, endFrame: 299, frameCount: 224 },
        { leafBlade: 45, crossImpact: 1 },
        "5dcb5555738c51baf01032b7be3e67fa2f65c43ee133d7a440ae3f921c741369",
        "6ba2d80fc47d05832114a857ab1bacbed1e69352d577adadfbcd26d49e74f4ad",
        "ec5984b0761e0c724bbbf6d2c10ba069035ac495db876e4a2ef249dfd3313cbd"],
      ["opponent-front Sceptile -> player-back Onix", "SCEPTILE", "opponent", "ONIX", "player", { startFrame: 80, endFrame: 303, frameCount: 224 },
        { leafBlade: 45, crossImpact: 1 },
        "c2a599b0d4adaf7f807100908cf4d2a79210ccf38c00acc2aa88181db43578b5",
        "b85563f61d8681263728ac4becdf524b329854db31ca3a122257590e00285bed",
        "8a776614bf459d95e0b6de17f4253813f7400ef2583ae80a91acca34e69e333b"],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const inventory = JSON.parse(readFileSync(
      "src/data/gen/factory-animation-inventory.json",
      "utf8",
    ));
    const statusByMove = new Map<string, string>(coverage.entries.map((entry: {
      move: string;
      status: string;
    }) => [entry.move, entry.status]));
    const level50Counts = inventory.tiers.level50.moves.reduce((counts: Record<string, number>, move: {
      move: string;
    }) => {
      const status = statusByMove.get(move.move) ?? "unsupported";
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});
    expect(level50Counts).toEqual({ exact: 232, unsupported: 44 });
    expect(coverage.entries.filter((entry: { status: string }) =>
      entry.status === "partial" || entry.status === "staged",
    )).toEqual([]);
    for (const move of ["MOVE_CROSS_CHOP", "MOVE_LEAF_BLADE"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ move, status: "exact" });
    }
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "cross-impact-cross-chop",
    )).toEqual([
      expect.objectContaining({
        components: [
          "asset:ANIM_TAG_HANDS_AND_FEET",
          "asset:ANIM_TAG_CROSS_IMPACT",
          "sprite:gCrossChopHandSpriteTemplate",
          "task:AnimTask_ShakeMon",
          "visualCommand:complex_palette_blend",
          "visualCommand:create_cross_impact_sprite",
          "visualCommand:monbg",
          "visualCommand:setalpha",
          "visualCommand:clearmonbg",
          "visualCommand:blendoff",
        ],
        representatives: ["MOVE_CROSS_CHOP", "MOVE_LEAF_BLADE"],
        fulfilled: true,
      }),
    ]);
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "cross-impact-cross-chop",
    )?.goal).toContain("shared impact asset does not substitute");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("`AnimTask_LeafBlade` primary + child sprites");
    expect(latches).toContain("task-owned position/creation RAM+2; animation cell/hFlip/blink and ordinary trail destruction RAM+1");
    expect(latches).toContain("Leaf Blade short `AnimTask_ShakeMon2(target,2,0,8,1)` bursts");
    expect(latches).toContain("creation display is the positive amplitude at RAM+1, then the ordinary body is RAM+2");
    expect(latches).toContain("Leaf Blade monbg `AnimTask_ShakeMon2(target,8,0,18,1)`");
    expect(latches).toContain("BG-scroll target motion RAM+1, including terminal return");
    expect(latches).toContain("script `create_cross_impact_sprite` during target monbg");
    expect(latches).toContain("sprite and terminal destroy-callback display RAM+1");
  });
});
