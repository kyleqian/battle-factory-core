import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compactSemanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

type ComponentFixture = {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly scenario: string;
  readonly probe: string;
  readonly move: string;
  readonly attackerSide: "player" | "opponent";
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
};

type PresentFixture = {
  readonly schema: string;
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: "player-to-opponent" | "opponent-to-player";
  readonly branch: "damage" | "heal";
  readonly occurrence: number;
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

function fixture<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const fulfilledGoal = "FULFILLED: MOVE_SELF_DESTRUCT, MOVE_EXPLOSION, MOVE_DYNAMIC_PUNCH, and every MOVE_PRESENT orientation/branch retain independent legal, twice-fresh dense Battle Scene ON receipts through first inactive cleanup. Self Destruct closes 113/113 frames per orientation with its own attacker-red palette, plain EXPLOSION OAM/palette one-display transfer, and neutral-first then two-display ShakeMon2 body; Explosion closes 212/212 per orientation with its own plain EXPLOSION OAM/BG-palette transfer, neutral-first then two-display ShakeMon2 body, and red/black/white background program; Dynamic Punch closes 75/75 per orientation with target monbg alpha target-2, its own ShakeMon and ShakeMon2 target-offset transfers, ordinary fist/explosion OAM, opaque explosion order, and cleanup; Present separately closes player/opponent damage 201/201 and heal 252/252 bodies with its moving ITEM_BAG, five damage EXPLOSIONs, or nine GREEN_SPARKLE plus HealingEffect2 stars, including each branch's OAM/matrix/palette/audio/cleanup receipt. Shared gExplosionSpriteTemplate or ANIM_TAG_EXPLOSION never waives a move-owned source body, latch, framebuffer, branch, or acceptance.";

describe("explosion-sprite-self-destruct component-track receipt ratchet", () => {
  it("pins the ten independent legal fixtures, complete windows, and retained hashes", () => {
    const selfDestruct = [
      "tools/compare/fixtures/self-destruct-player-sudowoodo-opponent-shuckle.json",
      "tools/compare/fixtures/self-destruct-opponent-sudowoodo-player-shuckle.json",
    ].map((path) => [fixture<ComponentFixture>(path), sha256(path)] as const);
    expect(selfDestruct.map(([entry, hash]) => [
      entry.schema, entry.oracleProfile, entry.scenario, entry.move,
      entry.attackerSide, entry.attacker.species, entry.attacker.geometry.side,
      entry.target.species, entry.target.geometry.side, entry.denseWindow, hash,
    ])).toEqual([
      ["scene-on-portable-component/v1", "battle-scene-on", "tools/battle-lab/mechanic-self-destruct-player-sudowoodo-opponent-shuckle.json", "SELF_DESTRUCT", "player", "SUDOWOODO", "player", "SHUCKLE", "opponent", { startFrame: 82, endFrame: 194 }, "0bb6623ef4122c62bfa23ea51365ebd55fb7b1a9506eeb8342c94e6f42cb6e1f"],
      ["scene-on-portable-component/v1", "battle-scene-on", "tools/battle-lab/mechanic-self-destruct-opponent-sudowoodo-player-shuckle.json", "SELF_DESTRUCT", "opponent", "SUDOWOODO", "opponent", "SHUCKLE", "player", { startFrame: 86, endFrame: 198 }, "0317e06582fcc02fee81f115aa02dfbb374c70ee4051af0ffcb55e7c0ffc1b9b"],
    ]);

    const explosion = [
      "tools/compare/fixtures/explosion-player-glalie-opponent-shuckle.json",
      "tools/compare/fixtures/explosion-opponent-glalie-player-shuckle.json",
    ].map((path) => [fixture<ComponentFixture>(path), sha256(path)] as const);
    expect(explosion.map(([entry, hash]) => [
      entry.schema, entry.oracleProfile, entry.scenario, entry.move,
      entry.attackerSide, entry.attacker.species, entry.attacker.geometry.side,
      entry.target.species, entry.target.geometry.side, entry.denseWindow, hash,
    ])).toEqual([
      ["scene-on-portable-component/v1", "battle-scene-on", "tools/battle-lab/mechanic-explosion-player-glalie-opponent-shuckle.json", "EXPLOSION", "player", "GLALIE", "player", "SHUCKLE", "opponent", { startFrame: 76, endFrame: 287 }, "2fab962e1bf60a709155b9a3f2ccb01e81be3e9fa64c3f495db1c2d9e1ccb7cd"],
      ["scene-on-portable-component/v1", "battle-scene-on", "tools/battle-lab/mechanic-explosion-opponent-glalie-player-shuckle.json", "EXPLOSION", "opponent", "GLALIE", "opponent", "SHUCKLE", "player", { startFrame: 80, endFrame: 291 }, "7afa42a6735dc15c16ae3ded7bb904be4cfe7e4f33408fadfe118250cbeff45a"],
    ]);

    const dynamicPunch = [
      "tools/compare/fixtures/dynamic-punch-player-hitmonchan-opponent-shuckle.json",
      "tools/compare/fixtures/dynamic-punch-opponent-hitmonchan-player-shuckle.json",
    ].map((path) => [fixture<ComponentFixture>(path), sha256(path)] as const);
    expect(dynamicPunch.map(([entry, hash]) => [
      entry.schema, entry.oracleProfile, entry.scenario, entry.move,
      entry.attackerSide, entry.attacker.species, entry.attacker.geometry.side,
      entry.target.species, entry.target.geometry.side, entry.denseWindow, hash,
    ])).toEqual([
      ["scene-on-portable-component/v1", "battle-scene-on", "tools/battle-lab/mechanic-dynamic-punch-player-hitmonchan-opponent-shuckle.json", "DYNAMIC_PUNCH", "player", "HITMONCHAN", "player", "SHUCKLE", "opponent", { startFrame: 101, endFrame: 175 }, "83b5b45af0ad85589faaafa65c1aa4ca574ca27de62a9cbae811628d304b9614"],
      ["scene-on-portable-component/v1", "battle-scene-on", "tools/battle-lab/mechanic-dynamic-punch-opponent-hitmonchan-player-shuckle.json", "DYNAMIC_PUNCH", "opponent", "HITMONCHAN", "opponent", "SHUCKLE", "player", { startFrame: 105, endFrame: 179 }, "08863ad7b6cdad960f9840e0aa509496dc5b49d7f515d47322081478f873f65e"],
    ]);

    const present = [
      "tools/compare/fixtures/present-player-damage.json",
      "tools/compare/fixtures/present-player-heal.json",
      "tools/compare/fixtures/present-opponent-damage.json",
      "tools/compare/fixtures/present-opponent-heal.json",
    ].map((path) => [fixture<PresentFixture>(path), sha256(path)] as const);
    expect(present.map(([entry, hash]) => [
      entry.schema, entry.scenario, entry.orientation, entry.branch,
      entry.occurrence, entry.denseWindow, entry.lifecycleCounts,
      entry.evidenceSha256, entry.rawRgbSha256, hash,
    ])).toEqual([
      ["present-source-evidence/v1", "tools/battle-lab/mechanic-present-player-delibird-opponent-onix.json", "player-to-opponent", "damage", 1, { startFrame: 1012, endFrame: 1212, frameCount: 201 }, { gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 0, gExplosionSpriteTemplate: 5, gHealingBlueStarSpriteTemplate: 0 }, "a2cc09d1f2e3424c16412095b63bb028fdae781f3c0d4b9ad7330fc2b18dd6dd", "0507c4120384abae357322f65905bb7426d14d55a426853670e18814748e903f", "6621a04228724f02bfe4b0dd747431a0c951b241b40d58612556762d194b443b"],
      ["present-source-evidence/v1", "tools/battle-lab/mechanic-present-player-delibird-opponent-onix-heal.json", "player-to-opponent", "heal", 1, { startFrame: 1946, endFrame: 2197, frameCount: 252 }, { gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 9, gExplosionSpriteTemplate: 0, gHealingBlueStarSpriteTemplate: 4 }, "bbb023fe5b5bfa1ef06cf14a22fddc994f1af61ed4e3c39175d2d65e44406359", "b2fe7f30fa358dd7255026be702920ea977afabaf7517cddecdc78feea2e75c7", "5533cc9d2d266bcb560a68fd98f6f19027661b60a64a3df691e95e52a8b82056"],
      ["present-source-evidence/v1", "tools/battle-lab/mechanic-present-opponent-delibird-player-onix.json", "opponent-to-player", "damage", 1, { startFrame: 78, endFrame: 278, frameCount: 201 }, { gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 0, gExplosionSpriteTemplate: 5, gHealingBlueStarSpriteTemplate: 0 }, "9d752ec604a8d2e7f5f871b156ceb72e6f65902f9f03625787a15f5b8a0a4779", "8e9f36a7cd0858ed4d05c13be30fdc24e156df67b23f6d1445d89be3b1948442", "2472ccf57b2e441407cc3dccede732b6ddf95b382ac7afae1b2038ab12e02d7d"],
      ["present-source-evidence/v1", "tools/battle-lab/mechanic-present-opponent-delibird-player-onix-heal.json", "opponent-to-player", "heal", 2, { startFrame: 1404, endFrame: 1655, frameCount: 252 }, { gPresentSpriteTemplate: 1, gPresentHealParticleSpriteTemplate: 9, gExplosionSpriteTemplate: 0, gHealingBlueStarSpriteTemplate: 4 }, "9a76aeeb3b5ea1f21ab38903d9d3f025c38f2501a76001b7560743faebc13fd5", "2e5b78ad63f1968c74a51f7366a1b2267ebfdbd41420bfb3f70a588303cc11e0", "67b088416a2c0a67ee6435d8bf73b1267cdd579894c1a12b3d7aae045d943e61"],
    ]);
  });

  it("keeps the four source bodies distinct despite their shared explosion template", () => {
    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const body = (start: string, end: string) => source.slice(
      source.indexOf(start), source.indexOf(end, source.indexOf(start)),
    );
    const selfDestruct = body("Move_SELF_DESTRUCT:", "Move_SLAM:");
    const selfDestructExplode = body("SelfDestructExplode:", "Move_SLAM:");
    const explosion = body("Move_EXPLOSION:", "Move_DEFENSE_CURL:");
    const explosion1 = body("Explosion1:", "Move_DEFENSE_CURL:");
    const dynamicPunch = body("Move_DYNAMIC_PUNCH:", "Move_COUNTER:");
    const present = body("Move_PRESENT:", "Move_BATON_PASS:");

    expect(selfDestruct).toContain("createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATTACKER, 1, 0, 9, RGB_RED");
    expect(selfDestruct).toContain("createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATTACKER, 1, 9, 0, RGB_RED");
    expect(selfDestruct.match(/createvisualtask AnimTask_ShakeMon2, 5, .*, 6, 0, 38, 1/g)).toHaveLength(5);
    expect(selfDestruct.match(/call SelfDestructExplode/g)).toHaveLength(2);
    expect(selfDestructExplode.match(/createsprite gExplosionSpriteTemplate/g)).toHaveLength(5);
    expect(selfDestruct).not.toContain("complex_palette_blend");

    expect(explosion).toContain("complex_palette_blend unused_anim_battler=ANIM_ATTACKER, unused_subpriority_offset=2, selector=F_PAL_BG");
    expect(explosion.match(/createvisualtask AnimTask_ShakeMon2, 5, .*, 8, 0, 40, 1/g)).toHaveLength(5);
    expect(explosion.match(/call Explosion1/g)).toHaveLength(2);
    expect(explosion1.match(/createsprite gExplosionSpriteTemplate/g)).toHaveLength(5);
    expect(explosion).toContain("createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 1, 16, 16, RGB_WHITE");
    expect(explosion).toContain("createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 3, 16, 0, RGB_WHITE");

    expect(dynamicPunch).toContain("monbg ANIM_DEF_PARTNER");
    expect(dynamicPunch).toContain("setalpha 12, 8");
    expect(dynamicPunch).toContain("create_fist_sprite ANIM_TARGET, 3, x=0, y=0, duration=20");
    expect(dynamicPunch).toContain("create_basic_hitsplat_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=0");
    expect(dynamicPunch).toContain("createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 5, 0, 7, 1");
    expect(dynamicPunch).toContain("createvisualtask AnimTask_ShakeMon2, 5, ANIM_TARGET, 5, 0, 28, 1");
    expect(dynamicPunch.match(/createsprite gExplosionSpriteTemplate, ANIM_ATTACKER, 3, .*1, 1/g)).toHaveLength(5);
    expect(dynamicPunch).not.toContain("SelfDestructExplode");

    expect(present).toContain("loadspritegfx ANIM_TAG_ITEM_BAG");
    expect(present).toContain("create_present_sprite ANIM_TARGET, 2, initial_x=0, initial_y=-5, unk2=10, unk3=2, unk4=-1");
    expect(present).toContain("jumpretfalse PresentDamage");
    expect(present).toContain("jumprettrue PresentHeal");
    expect(present.match(/createsprite gExplosionSpriteTemplate, ANIM_TARGET, 3, .*1, 1/g)).toHaveLength(5);
    expect(present.match(/create_present_heal_particle_sprite/g)).toHaveLength(9);
    expect(present).toContain("call HealingEffect2");
    expect(present).not.toContain("AnimTask_ShakeMon2");
  });

  it("requires the move-owned latch policy and only the proved Present transport normalization", () => {
    const latches = readFileSync("ANIMATION_LATCHES.md", "utf8");
    expect(latches).toContain("The latch is per-MECHANISM (per source task, per sprite class), never");
    expect(latches).toContain("Never inherit a latch from a sibling move.");
    expect(latches).toContain("visible events display ONE\n   frame after the RAM write.");

    const selfDestructPortable = readFileSync("tools/compare/selfDestructPortable.ts", "utf8");
    expect(selfDestructPortable).toContain("SELF DESTRUCT owns its own ordinary script-sprite and palette transfer");
    expect(selfDestructPortable).toContain("activeHardwareExplosionCount");
    expect(selfDestructPortable).toContain("prior.explosions.length");
    expect(selfDestructPortable).toContain("priorFrame.fadedPalette");
    const explosionPortable = readFileSync("tools/compare/explosionPortable.ts", "utf8");
    expect(explosionPortable).toContain("hardwarePalette");
    expect(explosionPortable).toContain("previous.explosions.length");
    expect(explosionPortable).toContain("shakeTasks.length === 2");
    const dynamicPunchPortable = readFileSync("tools/compare/dynamicPunchPortable.ts", "utf8");
    expect(dynamicPunchPortable).toContain("oracle.bldcnt === 16192 && oracle.bldalpha === 2060");
    expect(dynamicPunchPortable).toContain("targetSprite.x2 === expected.targetX2");
    expect(dynamicPunchPortable).toContain("hardwareFists === Number(prior.fistVisible)");
    expect(dynamicPunchPortable).toContain("hardwareExplosions === prior.explosions.length");
    const presentPortable = readFileSync("tools/compare/presentPortable.ts", "utf8");
    expect(presentPortable).toContain("view.bag");
    expect(presentPortable).toContain("view.explosions");
    expect(presentPortable).toContain("view.greenSparkles");
    expect(presentPortable).toContain("view.blueStars");
    expect(presentPortable).toContain("framebufferMatches");

    const presentEvidence = readFileSync("tools/compare/presentEvidence.ts", "utf8");
    expect(presentEvidence).toContain("compactSemanticReceiptSha256(probe)");
    expect(presentEvidence).toContain("frame.hardwareOam.length !== 128");
    expect(presentEvidence).toContain("frame.hardwareMatrices.length !== 32");
    expect(presentEvidence).toContain("frame.se1 === undefined || frame.se2 === undefined");
    expect(readFileSync("tools/compare/presentProbe.py", "utf8"))
      .toContain('setup.get("preCheckpointCaptures") != []');

    const fresh = {
      schema: "present-transport-test",
      setup: {
        preCheckpointCaptures: [],
        name: "\u00e9",
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const historic = "{\"schema\":\"present-transport-test\",\"setup\":{\"name\":\"\\u00e9\",\"nested\":{\"value\":1}},\"rows\":[0,true,\"line\\n\"]}\n";
    expect(compactSemanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(historic).digest("hex"),
    );
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { name: "\u00e9", nested: { value: 1 } },
    })).toThrow("setup.preCheckpointCaptures must be []");
    expect(() => compactSemanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });

  it("fulfills only the independently exact four-move track without moving coverage", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    expect(coverage.entries.filter((entry: { move: string }) => [
      "MOVE_SELF_DESTRUCT", "MOVE_EXPLOSION", "MOVE_PRESENT", "MOVE_DYNAMIC_PUNCH",
    ].includes(entry.move))).toEqual([
      expect.objectContaining({ move: "MOVE_DYNAMIC_PUNCH", status: "exact" }),
      expect.objectContaining({ move: "MOVE_EXPLOSION", status: "exact" }),
      expect.objectContaining({ move: "MOVE_PRESENT", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SELF_DESTRUCT", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "explosion-sprite-self-destruct",
    )).toEqual([
      {
        id: "explosion-sprite-self-destruct",
        components: [
          "asset:ANIM_TAG_EXPLOSION",
          "sprite:gExplosionSpriteTemplate",
          "task:AnimTask_BlendBattleAnimPal",
          "task:AnimTask_ShakeMon2",
          "subroutine:SelfDestructExplode",
        ],
        representatives: [
          "MOVE_SELF_DESTRUCT",
          "MOVE_EXPLOSION",
          "MOVE_PRESENT",
          "MOVE_DYNAMIC_PUNCH",
        ],
        fulfilled: true,
        goal: fulfilledGoal,
      },
    ]);
  });
});
