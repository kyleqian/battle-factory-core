import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type DisableReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly probeJsonSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMapSha256: string;
};

type DetectReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
    readonly skipProbeFrames?: number;
    readonly ageOffset?: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly componentMatching: number; readonly framebufferMatching: number };
};

function receipt<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const fulfilledGoal = "FULFILLED: MOVE_DISABLE independently proves its complete source-specific SPARKLE_4 plus target GrowAndGrayscale body at 113/113 source/component, typed-seam, software and hardware OAM/matrix/palette/register/audio, immutable battle state, raw-RGB/change-map, and actual-core framebuffer frames 697-809 player-back and 214-326 opponent-front, twice fresh. MOVE_DETECT independently proves its own BG/attacker palette ramps and shared gSpinningSparkleSpriteTemplate/AnimSpinningSparkle program at 110/110 player-back frames 64-173 and the deliberate 109/109 opponent-front frames 69-177 (skipProbeFrames:1, ageOffset:1), twice fresh. Disable alone owns target monbg/splitbgprio, alpha 8:8, SE_M_DETECT/SE_M_BIND, and AnimTask_GrowAndGrayscale; Detect has its own palette body and does not inherit that task. Shared components waive no move-owned acceptance or sibling credit.";

describe("sparkle-4-grow-grayscale component-track receipt ratchet", () => {
  it("pins the independent legal bilateral Disable and Detect windows and receipts", () => {
    const disable = [
      receipt<DisableReceipt>("tools/compare/fixtures/disable-player-drowzee-opponent-onix.json"),
      receipt<DisableReceipt>("tools/compare/fixtures/disable-opponent-drowzee-player-onix.json"),
    ];
    expect(disable.map((entry) => [
      entry.schema,
      entry.oracleProfile,
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.probeJsonSha256,
      entry.rawRgbSha256,
      entry.changeMapSha256,
    ])).toEqual([
      ["disable-portable-evidence/v1", "battle-scene-on", "player-back", "DROWZEE", "player", "ONIX", "opponent", { startFrame: 697, endFrame: 809, frameCount: 113 },
        "8f7eff0e6957ed815f470d3aebb9ec5bd5edebe673527e702230f4d0f1f7ca38",
        "352068a567a21be80acd8babd5786a34601d10e749eb9817fbd5f48800e1be63",
        "7cd84be397dfcda9f074d1aca2780d5bf044d2ad2fb9cf46e6d311f04db39636"],
      ["disable-portable-evidence/v1", "battle-scene-on", "opponent-front", "DROWZEE", "opponent", "ONIX", "player", { startFrame: 214, endFrame: 326, frameCount: 113 },
        "de6c0403e5baa03de893cd858fbfb4eac4916699dac5d2baf7485a967da1411b",
        "f621f96050f9841139667fb2fb20bdbeeec376c2abfbac093a24a8b1cfee70a9",
        "3aedbc9d0e0b7b544df548b30e62de8a50e9fcff4e59557468f3b03b05b16b55"],
    ]);

    const detect = [
      receipt<DetectReceipt>("tools/compare/fixtures/detect-player-yanma-opponent-onix.json"),
      receipt<DetectReceipt>("tools/compare/fixtures/detect-opponent-yanma-player-onix.json"),
    ];
    expect(detect.map((entry) => [
      entry.schema,
      entry.oracleProfile,
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.denseWindow,
      entry.evidenceSha256,
      entry.secondFreshEvidenceSha256,
      entry.rawRgbSha256,
      entry.acceptance,
    ])).toEqual([
      ["scene-on-portable-evidence/v1", "battle-scene-on", "player-to-opponent", "YANMA", "player", "ONIX", "opponent", { startFrame: 64, endFrame: 173, frameCount: 110 },
        "2a1054d283c2442589eef01bbf65048e2a0ab2f59a69e63f390c6439d640e34e",
        "2a1054d283c2442589eef01bbf65048e2a0ab2f59a69e63f390c6439d640e34e",
        "274b00b5e15634a4d19eb03c9cc62d8552dd02dffa4348efb927bab545ed5cb0",
        { status: "exact", componentMatching: 110, framebufferMatching: 110 }],
      ["scene-on-portable-evidence/v1", "battle-scene-on", "opponent-to-player", "YANMA", "opponent", "ONIX", "player", { startFrame: 69, endFrame: 177, frameCount: 109, skipProbeFrames: 1, ageOffset: 1 },
        "f8e7f48c77f020ceeb6f2c1ae7ac0ce1dbbfa30af7820d763b840777046c0b93",
        "f8e7f48c77f020ceeb6f2c1ae7ac0ce1dbbfa30af7820d763b840777046c0b93",
        "2086c05aac41c72e0f82c265d658c7d27cee9e8cf3f7ce6d93498f0eb4c39549",
        { status: "exact", componentMatching: 109, framebufferMatching: 109 }],
    ]);
  });

  it("keeps Disable's GrowAndGrayscale body distinct from Detect's palette body", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const body = (start: string, end: string) => source.slice(
      source.indexOf(start), source.indexOf(end, source.indexOf(start)),
    );
    const disable = body("Move_DISABLE:", "Move_RECOVER:");
    const detect = body("Move_DETECT:", "Move_FRUSTRATION:");

    for (const shared of ["loadspritegfx ANIM_TAG_SPARKLE_4", "createsprite gSpinningSparkleSpriteTemplate"]) {
      expect(disable).toContain(shared);
      expect(detect).toContain(shared);
    }
    expect(disable).toContain("monbg ANIM_TARGET");
    expect(disable).toContain("splitbgprio ANIM_TARGET");
    expect(disable).toContain("setalpha 8, 8");
    expect(disable).toContain("playsewithpan SE_M_DETECT, SOUND_PAN_ATTACKER");
    expect(disable).toContain("createvisualtask AnimTask_GrowAndGrayscale, 5");
    expect(disable).toContain("loopsewithpan SE_M_BIND, SOUND_PAN_TARGET, 15, 4");
    expect(disable).not.toContain("simple_palette_blend");
    expect(detect).toContain("simple_palette_blend selector=F_PAL_BG");
    expect(detect).toContain("createvisualtask AnimTask_BlendBattleAnimPal");
    expect(detect).toContain("createsprite gSpinningSparkleSpriteTemplate, ANIM_ATTACKER, 13, 20, -20");
    expect(detect).not.toContain("AnimTask_GrowAndGrayscale");
    expect(detect).not.toContain("splitbgprio");
    expect(detect).not.toContain("loopsewithpan SE_M_BIND");
  });

  it("preserves the move-owned latch policy and fulfilled track without moving coverage", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM (per source task, per sprite class), never");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured: visible events display ONE");
    expect(latches).toContain("Outgoing animation's OAM teardown");

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(232);
    expect(coverage.entries.filter((entry: { move: string }) => ["MOVE_DISABLE", "MOVE_DETECT"].includes(entry.move)))
      .toEqual([
        expect.objectContaining({ move: "MOVE_DETECT", status: "exact" }),
        expect.objectContaining({ move: "MOVE_DISABLE", status: "exact" }),
      ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "sparkle-4-grow-grayscale",
    )).toEqual([
      {
        id: "sparkle-4-grow-grayscale",
        components: [
          "asset:ANIM_TAG_SPARKLE_4",
          "sprite:gSpinningSparkleSpriteTemplate",
          "task:AnimTask_GrowAndGrayscale",
          "visualCommand:monbg",
          "visualCommand:splitbgprio",
          "visualCommand:setalpha",
          "visualCommand:clearmonbg",
          "visualCommand:blendoff",
        ],
        representatives: ["MOVE_DISABLE", "MOVE_DETECT"],
        fulfilled: true,
        goal: fulfilledGoal,
      },
    ]);
  });
});
