import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  readonly orientation?: string;
  readonly attackerSide?: "player" | "opponent";
  readonly move: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly denseWindow?: { readonly startFrame: number; readonly endFrame: number; readonly frameCount?: number };
  readonly sourceWindow?: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256?: string;
  readonly rawRgbSequenceSha256?: string;
  readonly rawRgbSha256?: string;
  readonly changeMapSha256?: string;
  readonly acceptance?: Readonly<Record<string, string | number | boolean>>;
  readonly status?: string;
};

function receipt(path: string): Receipt {
  return JSON.parse(readFileSync(path, "utf8")) as Receipt;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const fulfilledGoal = "FULFILLED: MOVE_RAZOR_LEAF, MOVE_MAGICAL_LEAF, MOVE_LEAF_BLADE, and Factory indoor MOVE_SECRET_POWER -> Move_STRENGTH each retain independently legal bilateral twice-fresh exact receipts. Razor Leaf closes its 139-frame WEEPINBELL leaf-particle/cutter, one-display OAM/palette/shake, monbg/alpha, audio, and cleanup body; Magical Leaf closes its 182-frame ROSELIA palette-cycle/cutter/hitsplat/ShakeMon2 body with its own transfer maps; Leaf Blade closes its distinct 224-frame SCEPTILE seven-arc AnimTask_LeafBlade/CROSS_IMPACT body with its separately measured split latches; and Secret Power closes its 102-frame TEDDIURSA Strength body in both orientations. Factory dispatches no grass/long-grass leaf body: Move_NEEDLE_ARM and Move_MAGICAL_LEAF are non-Factory branches and receive no Factory credit. Shared LEAF/RAZOR_LEAF art or ShakeMon2 never waive any move's own source body, latch, framebuffer, or acceptance.";

describe("razor-leaf-particle-cutter component-track receipt ratchet", () => {
  it("pins the four independent legal bilateral bodies, windows, and receipts", () => {
    const razorLeafPaths = [
      "tools/compare/fixtures/razor-leaf-player-weepinbell-opponent-shuckle.json",
      "tools/compare/fixtures/razor-leaf-opponent-weepinbell-player-shuckle.json",
    ];
    const magicalLeafPaths = [
      "tools/compare/fixtures/magical-leaf-player-roselia-opponent-onix.json",
      "tools/compare/fixtures/magical-leaf-opponent-roselia-player-onix.json",
    ];
    const leafBladePaths = [
      "tools/compare/fixtures/leaf-blade-player-sceptile-opponent-onix.json",
      "tools/compare/fixtures/leaf-blade-opponent-sceptile-player-onix.json",
    ];
    const secretPowerPaths = [
      "tools/compare/fixtures/secret-power-strength-player-teddiursa-opponent-onix.json",
      "tools/compare/fixtures/secret-power-strength-opponent-teddiursa-player-onix.json",
    ];

    expect(razorLeafPaths.map((path) => {
      const entry = receipt(path);
      return [
        entry.move, entry.attackerSide, entry.attacker.species, entry.attacker.geometry.side,
        entry.target.species, entry.target.geometry.side, entry.denseWindow, sha256(path),
      ];
    })).toEqual([
      ["RAZOR_LEAF", "player", "WEEPINBELL", "player", "SHUCKLE", "opponent", { startFrame: 91, endFrame: 229 },
        "515af5a638b3a09dca54ccfab78d0f1d41ca35e13671821faaaa6d5b0ac36f38"],
      ["RAZOR_LEAF", "opponent", "WEEPINBELL", "opponent", "SHUCKLE", "player", { startFrame: 95, endFrame: 233 },
        "9bd6860dd168bc5198af07129506a810e1ce7a52a08b01894f32b59dc7952d91"],
    ]);

    expect(magicalLeafPaths.map((path) => {
      const entry = receipt(path);
      return [
        entry.orientation, entry.move, entry.attacker.species, entry.attacker.geometry.side,
        entry.target.species, entry.target.geometry.side, entry.denseWindow,
        entry.evidenceSha256, entry.rawRgbSequenceSha256, entry.changeMapSha256, sha256(path),
      ];
    })).toEqual([
      ["player-back", "MAGICAL_LEAF", "ROSELIA", "player", "ONIX", "opponent", { startFrame: 77, endFrame: 258, frameCount: 182 },
        "d8250aaed208f7305154855b6d44a76d2e349ee56e7f516b922aa7386b0741f9",
        "f45745676e1c6383a01619d009f6e7f2e3e553417e39a2267fc81c85b6380f52",
        "df6be41752421612c4104aaacc73a9615ae3dea2d66cdbd58b4dec65632c8c0a",
        "539f244d407d4b2b2f3f8e6a54e7e23e7857a64f8876078f83c34844446a867c"],
      ["opponent-front", "MAGICAL_LEAF", "ROSELIA", "opponent", "ONIX", "player", { startFrame: 81, endFrame: 262, frameCount: 182 },
        "cc7fd4818a30ef6e0d38f6a3391e7a24d572d23a52fc3611e0b8267a2ca3a8d3",
        "1e7008151f3308e6e397640ef3e16789a0862f3ca1c5b729b1e847e74beff81f",
        "9eb40c1c44c929935555651fc3b09ac18ad5475dfc843a1a9b027c2d27ae2f7c",
        "bf2db8648515e4bac2c90a0fbe3b741fc86b36b85b00f14567bf1d3d20fbb484"],
    ]);

    expect(leafBladePaths.map((path) => {
      const entry = receipt(path);
      return [
        entry.orientation, entry.attacker.species, entry.attacker.geometry.side,
        entry.target.species, entry.target.geometry.side, entry.sourceWindow,
        entry.evidenceSha256, entry.rawRgbSha256, entry.changeMapSha256, sha256(path),
      ];
    })).toEqual([
      ["player-back Sceptile -> opponent-front Onix", "SCEPTILE", "player", "ONIX", "opponent", { startFrame: 76, endFrame: 299, frameCount: 224 },
        "5dcb5555738c51baf01032b7be3e67fa2f65c43ee133d7a440ae3f921c741369",
        "6ba2d80fc47d05832114a857ab1bacbed1e69352d577adadfbcd26d49e74f4ad",
        "ec5984b0761e0c724bbbf6d2c10ba069035ac495db876e4a2ef249dfd3313cbd",
        "3886db3b8010c256a9ccada714889798b4a165cf1a5dbfe566dfec630351d8ea"],
      ["opponent-front Sceptile -> player-back Onix", "SCEPTILE", "opponent", "ONIX", "player", { startFrame: 80, endFrame: 303, frameCount: 224 },
        "c2a599b0d4adaf7f807100908cf4d2a79210ccf38c00acc2aa88181db43578b5",
        "b85563f61d8681263728ac4becdf524b329854db31ca3a122257590e00285bed",
        "8a776614bf459d95e0b6de17f4253813f7400ef2583ae80a91acca34e69e333b",
        "f73d9520e5702eed81d2b417a59df3a9a8620a40b571a7ea5921dd4b197539b1"],
    ]);

    expect(secretPowerPaths.map((path) => {
      const entry = receipt(path);
      return [
        entry.orientation, entry.attacker.species, entry.attacker.geometry.side,
        entry.target.species, entry.target.geometry.side, entry.sourceWindow,
        entry.evidenceSha256, entry.rawRgbSha256, entry.status, entry.acceptance, sha256(path),
      ];
    })).toEqual([
      ["player-back Teddiursa -> opponent-front Onix", "TEDDIURSA", "player", "ONIX", "opponent", { startFrame: 222, endFrame: 323, frameCount: 102 },
        "9d8f3ad7a472bdd940aa35a7aa7e9c62823d8d2b11c0114ce6d4b1f92aed73a3",
        "af6ff533abeb22e9b2f45c09339dcb979ac8508501e64d6d012faa1eb91a2903", "exact",
        { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true },
        "dbef17560a3d27f9613327f5a192ecc3ea9dfe0fa9453489457adff0dc404f84"],
      ["opponent-front Teddiursa -> player-back Onix", "TEDDIURSA", "opponent", "ONIX", "player", { startFrame: 222, endFrame: 323, frameCount: 102 },
        "8d6902b63b3dc96622261856cdb413c452d3c55140465a674d97aa51271a2172",
        "f4c81b0de053a8703ed10238c70d6398693fc937c1ad2d088de451a097d6376a", "exact",
        { reducerPinned: true, typedSeam: true, productionFramebuffer: true, exact: true },
        "139cfef38498fbe7aff791738c05ad31cc0a23642ec415ab77f03f9ed8dd074f"],
    ]);
  });

  it("pins the distinct source bodies, Factory dispatch exclusion, and move-owned latches", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const razorLeafBody = source.slice(source.indexOf("Move_RAZOR_LEAF:"), source.indexOf("Move_NATURE_POWER:"));
    const magicalLeafBody = source.slice(source.indexOf("Move_MAGICAL_LEAF:"), source.indexOf("Move_ICE_BALL:"));
    expect(razorLeafBody.match(/create_razor_leaf_particle_sprite/g)).toHaveLength(10);
    expect(razorLeafBody.match(/create_razor_leaf_cutter_sprite/g)).toHaveLength(2);
    expect(razorLeafBody).toContain("createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1");
    expect(magicalLeafBody.match(/create_razor_leaf_particle_sprite/g)).toHaveLength(10);
    expect(magicalLeafBody.match(/create_razor_leaf_cutter_sprite/g)).toHaveLength(2);
    expect(magicalLeafBody.match(/create_basic_hitsplat_sprite/g)).toHaveLength(2);
    expect(magicalLeafBody).toContain("createvisualtask AnimTask_CycleMagicalLeafPal, 5");

    const leafBladeAudit = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/leafBladeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(leafBladeAudit).toContain("7 arcs + 5-tick pauses");
    const dispatch = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/secretPowerSourceAudit.ts",
    ], { encoding: "utf8" })) as {
      readonly factory: { readonly reachableBodies: readonly string[] };
      readonly visualDispatch: Record<string, { readonly body: string }>;
    };
    expect(dispatch.factory.reachableBodies).toEqual(["Move_STRENGTH"]);
    expect(dispatch.visualDispatch.BATTLE_ENVIRONMENT_BUILDING).toEqual({ body: "Move_STRENGTH", value: 8 });
    expect(dispatch.visualDispatch.BATTLE_ENVIRONMENT_GRASS?.body).toBe("Move_NEEDLE_ARM");
    expect(dispatch.visualDispatch.BATTLE_ENVIRONMENT_LONG_GRASS?.body).toBe("Move_MAGICAL_LEAF");

    const razorPortable = readFileSync("tools/compare/razorLeafPortable.ts", "utf8");
    const magicalPortable = readFileSync("tools/compare/magicalLeafPortable.ts", "utf8");
    expect(razorPortable).toContain("hardwareShape(prior.particles, prior.cutters)");
    expect(razorPortable).toContain("targetSprite.x2 === expected.targetX2");
    expect(razorPortable).toContain("oracle.hardwarePalette.every");
    expect(magicalPortable).toContain("expectedHardware(previous.particles, previous.cutters, previous.hitsplats)");
    expect(magicalPortable).toContain("paletteLatch");
    expect(magicalPortable).toContain("shakeTask");

    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM (per source task, per sprite class), never");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("visible events display ONE\n   frame after the RAM write.");
    expect(latches).toContain("`AnimTask_LeafBlade` primary + child sprites");
    expect(latches).toContain("task-owned position/creation RAM+2; animation cell/hFlip/blink and ordinary trail destruction RAM+1");
    expect(latches).toContain("Leaf Blade short `AnimTask_ShakeMon2(target,2,0,8,1)` bursts");
    expect(latches).toContain("creation display is the positive amplitude at RAM+1, then the ordinary body is RAM+2");
    expect(latches).toContain("Leaf Blade monbg `AnimTask_ShakeMon2(target,8,0,18,1)`");
    expect(latches).toContain("BG-scroll target motion RAM+1, including terminal return");
    expect(latches).toContain("script `create_cross_impact_sprite` during target monbg");
    expect(latches).toContain("sprite and terminal destroy-callback display RAM+1");
  });

  it("requires the fulfilled flag without granting any shared-component sibling credit", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    expect(coverage.entries.filter((entry: { status: string }) =>
      entry.status === "partial" || entry.status === "staged",
    )).toEqual([]);
    for (const move of ["MOVE_RAZOR_LEAF", "MOVE_MAGICAL_LEAF", "MOVE_LEAF_BLADE", "MOVE_SECRET_POWER"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ move, status: "exact" });
    }
    const secretPower = coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_SECRET_POWER",
    );
    expect(secretPower.covered.join("\n")).toContain("Move_STRENGTH");
    expect(secretPower.covered.join("\n")).not.toContain("Move_MAGICAL_LEAF");
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "razor-leaf-particle-cutter",
    )).toEqual([
      {
        id: "razor-leaf-particle-cutter",
        components: [
          "asset:ANIM_TAG_LEAF",
          "asset:ANIM_TAG_RAZOR_LEAF",
          "task:AnimTask_ShakeMon2",
          "visualCommand:create_razor_leaf_particle_sprite",
          "visualCommand:create_razor_leaf_cutter_sprite",
          "visualCommand:monbg",
          "visualCommand:setalpha",
          "visualCommand:clearmonbg",
          "visualCommand:blendoff",
        ],
        representatives: ["MOVE_RAZOR_LEAF", "MOVE_SECRET_POWER", "MOVE_MAGICAL_LEAF", "MOVE_LEAF_BLADE"],
        fulfilled: true,
        goal: fulfilledGoal,
      },
    ]);
  });
});
