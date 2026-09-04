import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

type ReflectReceipt = {
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly wallFrame: number;
  };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
};

type BrickBreakReceipt = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

type CrushClawReceipt = {
  readonly orientation: string;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
};

function receipt<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("blue-light-wall-reflect component-track receipt ratchet", () => {
  it("requires independent complete bilateral bodies before the track is fulfilled", () => {
    const reflect = [
      receipt<ReflectReceipt>("tools/compare/fixtures/reflect-player-shuppet-opponent-shuckle.json"),
      receipt<ReflectReceipt>("tools/compare/fixtures/reflect-opponent-shuppet-player-shuckle.json"),
    ];
    expect(reflect.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.denseWindow,
      entry.denseWindow.endFrame - entry.denseWindow.startFrame + 1,
    ])).toEqual([
      ["player-to-opponent", "MINUN", "player", "SHUCKLE", "opponent", { startFrame: 39, endFrame: 246, wallFrame: 72 }, 208],
      ["opponent-to-player", "MINUN", "opponent", "SHUCKLE", "player", { startFrame: 39, endFrame: 249, wallFrame: 76 }, 211],
    ]);

    const brickBreak = [
      receipt<BrickBreakReceipt>("tools/compare/fixtures/brick-break-normal-player-lombre-opponent-onix.json"),
      receipt<BrickBreakReceipt>("tools/compare/fixtures/brick-break-normal-opponent-lombre-player-onix.json"),
      receipt<BrickBreakReceipt>("tools/compare/fixtures/brick-break-player-lombre-opponent-onix.json"),
      receipt<BrickBreakReceipt>("tools/compare/fixtures/brick-break-opponent-lombre-player-onix.json"),
    ];
    expect(brickBreak.map((entry) => [
      entry.orientation,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back", { startFrame: 234, endFrame: 384, frameCount: 151 },
        "ad3d3e90b70fde1595dda316a773e887f17123df5ad5815086159ddb52398b5d",
        "67687eb221c4efb306fdca646b78fd181469aa22ef98e48d7006b4a9ec2c27cb"],
      ["opponent-front", { startFrame: 220, endFrame: 370, frameCount: 151 },
        "b1ac1081da160add8d9e92f878e3051199a909987735dc5bf06cd921bb1f8fab",
        "4a03768b6549b364296e3639833e7c5d0cd6dedcec567ee62f20e32fd94c2645"],
      ["player-back", { startFrame: 288, endFrame: 479, frameCount: 192 },
        "e484e602be861db10e4042c2a6de75e5f6e261e533515d48d8597637db5c4697",
        "e1b36f8036f30386af0c7cdaac9645f73bb9eb526802c3179e745871cf637363"],
      ["opponent-front", { startFrame: 289, endFrame: 480, frameCount: 192 },
        "f0314f159cb9b141c107cbe078382ebb4ff7379c4ce2c835aa9b921c65bbe27a",
        "8402d60c9605e852c0f099dbc617c80dc21d005097ed1985395b647564ae23bc"],
    ]);
    for (const entry of brickBreak) {
      const scenario = JSON.parse(readFileSync(entry.scenario, "utf8"));
      expect(entry).toMatchObject({
        schema: "brick-break-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        probe: "tools/compare/brickBreakProbe.py",
      });
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
    }

    const crushClaw = [
      receipt<CrushClawReceipt>("tools/compare/fixtures/crush-claw-player-grovyle-opponent-onix.json"),
      receipt<CrushClawReceipt>("tools/compare/fixtures/crush-claw-opponent-grovyle-player-onix.json"),
    ];
    expect(crushClaw.map((entry) => [
      entry.orientation,
      entry.denseWindow,
      entry.evidenceSha256,
      entry.secondFreshEvidenceSha256,
      entry.rawRgbSha256,
      entry.acceptance,
    ])).toEqual([
      ["player-to-opponent", { startFrame: 77, endFrame: 145, frameCount: 69 },
        "515abad038862c35a86d480f333560459f83bc103687837187f9448e1b7c6f06",
        "515abad038862c35a86d480f333560459f83bc103687837187f9448e1b7c6f06",
        "9e2c28d1edc910be89d157035334f10c234b92f4c3b3a72e240bfe922dd52508",
        { status: "exact", componentMatching: 69, framebufferMatching: 69 }],
      ["opponent-to-player", { startFrame: 81, endFrame: 149, frameCount: 69 },
        "639bdc9ad5a4809e603582a9de27b328f5c8d119707411aee4b41526411ab229",
        "639bdc9ad5a4809e603582a9de27b328f5c8d119707411aee4b41526411ab229",
        "b61b5eb2e20bd83c44016e40b389553ca2fa068526450911b010bea110407f69",
        { status: "exact", componentMatching: 69, framebufferMatching: 69 }],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_REFLECT", "MOVE_BRICK_BREAK", "MOVE_CRUSH_CLAW",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_BRICK_BREAK", status: "exact" }),
      expect.objectContaining({ move: "MOVE_CRUSH_CLAW", status: "exact" }),
      expect.objectContaining({ move: "MOVE_REFLECT", status: "exact" }),
    ]);
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "blue-light-wall-reflect",
    )).toMatchObject({
      components: [
        "asset:ANIM_TAG_BLUE_LIGHT_WALL",
        "asset:ANIM_TAG_SPARKLE_4",
        "sprite:gReflectWallSpriteTemplate",
        "sprite:gReflectSparkleSpriteTemplate",
      ],
      representatives: ["MOVE_REFLECT", "MOVE_BRICK_BREAK", "MOVE_CRUSH_CLAW"],
      fulfilled: true,
    });
  });

  it("keeps the wall body and each move-owned latch source-distinct", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const body = (start: string, end: string) => source.slice(
      source.indexOf(start), source.indexOf(end, source.indexOf(start)),
    );
    const reflect = body("Move_REFLECT:", "Move_BARRIER:");
    const brickBreak = body("Move_BRICK_BREAK:", "Move_YAWN:");
    const crushClaw = body("Move_CRUSH_CLAW:", "Move_AROMATHERAPY:");
    expect(reflect).toContain("createsprite gReflectWallSpriteTemplate");
    expect((reflect.match(/createsprite gReflectSparkleSpriteTemplate/g) ?? [])).toHaveLength(3);
    expect(brickBreak).toContain("choosetwoturnanim BrickBreakNormal, BrickBreakShatteredWall");
    expect((brickBreak.match(/gBrickBreakWallShardSpriteTemplate/g) ?? [])).toHaveLength(4);
    expect(crushClaw).toContain("loadspritegfx ANIM_TAG_BLUE_LIGHT_WALL");
    expect(crushClaw).toContain("loadspritegfx ANIM_TAG_TORN_METAL");
    expect((crushClaw.match(/create_claw_slash_sprite/g) ?? [])).toHaveLength(4);
    for (const wallTemplate of [
      "gReflectWallSpriteTemplate",
      "gReflectSparkleSpriteTemplate",
      "gBrickBreakWallSpriteTemplate",
      "gBrickBreakWallShardSpriteTemplate",
    ]) expect(crushClaw).not.toContain(wallTemplate);

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("Sprite-driven `x2` / plain OAM edits / script-`createsprite` sprites");
    expect(latches).toContain("Palette writes (`gPlttBufferFaded`)");
    expect(latches).toContain("`AnimTask_ShakeMon2` (usual longer schedules)");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("Default expectation where nothing is measured: visible events display ONE");
    expect(readFileSync("tools/compare/reflectPortable.ts", "utf8"))
      .toContain("priorVisible");
    expect(readFileSync("tools/compare/brickBreakPortable.ts", "utf8"))
      .toContain("compactSemanticReceiptSha256");
    expect(readFileSync("tools/compare/crushClawPortable.ts", "utf8"))
      .toContain("AnimTask_ShakeMon2");
  });

  it("normalizes only an asserted-empty Brick Break transport field", () => {
    const fresh = {
      schema: "brick-break-transport-test",
      setup: { preCheckpointCaptures: [], label: "brick" },
      frames: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"brick-break-transport-test\",\"setup\":{\"label\":\"brick\"},\"frames\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(historic).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { label: "brick" },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });
});
