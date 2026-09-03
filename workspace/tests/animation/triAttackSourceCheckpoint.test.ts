import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completePartyKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const sourceAudit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/triAttackSourceAudit.ts"], { cwd: root, encoding: "utf8" }));

function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate battle_lab.py");
    candidate = parent;
  }
}

const stages = [
  ["player-back", "tools/battle-lab/mechanic-tri-attack-player-porygon-opponent-shuckle.json", [273, 274, 275], [349, 339, 327], "player", "opponent", [33, 33, 33, 33]] as const,
  ["opponent-front", "tools/battle-lab/mechanic-tri-attack-opponent-porygon-player-shuckle.json", [349, 339, 327], [273, 274, 275], "opponent", "player", [161, 161, 161, 161]] as const,
];

describe("MOVE_TRI_ATTACK authoritative source and legal Scene-ON staging checkpoint", () => {
  it("pins the complete script, direct callback bodies, graph, assets, audio, and carrier census", () => {
    const audit = sourceAudit();
    expect(audit).toMatchObject({
      move: "MOVE_TRI_ATTACK", moveId: 161, status: "unsupported-evidence", coverageCredit: false,
      pointerOwned: {
        root: { symbol: "Move_TRI_ATTACK", start: "0x82d4595", endExclusive: "0x82d4709", byteLength: 372, romSha256: "86d2d0432dd6648fcb29c176d3f1f275a1a53ec9a7234b3bdd860be600935396", sourcePath: "data/battle_anim_scripts.s", sourceStart: 309682, sourceEndExclusive: 311802, sourceByteLength: 2120, sourceSha256: "ac0223c3d6245ec0d062aebb7c6c611352c610cbad267c1cac05af22ebb602fe" },
        subroutine: { symbol: "IceCrystalEffectShort", start: "0x82d7720", endExclusive: "0x82d77a4", byteLength: 132, romSha256: "3da0ca21634d29ab068ed61238f9bb3129e4403019d36dbdcf4a7f722f3e5772", sourcePath: "data/battle_anim_scripts.s", sourceStart: 389291, sourceEndExclusive: 390232, sourceByteLength: 941, sourceSha256: "96031e55891f2051396b5ac2d28303b96f65724d841e8e8cfce7d8be1a004ef2" },
        combined: { byteLength: 504, romSha256: "399c3d7c32b99fc52e6e75b8f9d2be8590dd3a8b0a852e4e59432d397a3fc895", sourceByteLength: 3061, sourceSha256: "6ea5700eb44b978cbddfdeaf5f7049ab3a1f6c24b445a69b8abb519c943da6eb" },
      },
      script: { root: { commandCount: 47 }, subroutine: { commandCount: 21 } },
      graph: {
        rootScript: "Move_TRI_ATTACK", blocks: ["Move_TRI_ATTACK", "IceCrystalEffectShort"],
        components: ["asset:ANIM_TAG_FIRE", "asset:ANIM_TAG_ICE_CRYSTALS", "asset:ANIM_TAG_LIGHTNING", "asset:ANIM_TAG_TRI_ATTACK_TRIANGLE", "soundTask:SoundTask_LoopSEAdjustPanning", "sprite:gIceCrystalHitLargeSpriteTemplate", "sprite:gIceCrystalHitSmallSpriteTemplate", "sprite:gLargeFlameScatterSpriteTemplate", "sprite:gLightningSpriteTemplate", "sprite:gTriAttackTriangleSpriteTemplate", "subroutine:IceCrystalEffectShort", "task:AnimTask_ShakeTargetInPattern", "visualCommand:invert_screen_color", "visualCommand:simple_palette_blend"],
      },
      phases: {
        triangle: { asset: "ANIM_TAG_TRI_ATTACK_TRIANGLE", template: "gTriAttackTriangleSpriteTemplate", initialOffset: [16, 0], waits: [20, 20] },
        fire: { asset: "ANIM_TAG_FIRE", template: "gLargeFlameScatterSpriteTemplate", spriteCount: 8, lifetime: 30, shake: [20, 3, true, 1] },
        lightning: { asset: "ANIM_TAG_LIGHTNING", template: "gLightningSpriteTemplate", spriteCount: 3, yOffsets: [-48, -16, 16], shake: [20, 3, true, 0], screenInversions: 2 },
        ice: { asset: "ANIM_TAG_ICE_CRYSTALS", subroutine: "IceCrystalEffectShort", spriteCount: 7 },
      },
      sound: { triangleLoop: { song: "SE_M_TRI_ATTACK", sourcePan: "SOUND_PAN_ATTACKER", targetPan: "SOUND_PAN_TARGET", panIncrement: 5, firstWait: 6, firstRestart: 0, repeats: 7 }, cues: [["SE_M_TRI_ATTACK", "SOUND_PAN_ATTACKER"], ["SE_M_FLAME_WHEEL2", "SOUND_PAN_TARGET"], ["SE_M_TRI_ATTACK2", "SOUND_PAN_TARGET"], ["SE_M_ICY_WIND", "SOUND_PAN_TARGET"]] },
      assets: {
        triangle: { gfx: "gBattleAnimSpriteGfx_TriAttackTriangle", tileBytes: 2048, palette: "gBattleAnimSpritePal_TriAttackTriangle" },
        fire: { gfx: "gBattleAnimSpriteGfx_Fire", tileBytes: 4096, palette: "gBattleAnimSpritePal_Fire" },
        lightning: { gfx: "gBattleAnimSpriteGfx_Lightning", tileBytes: 2560, palette: "gBattleAnimSpritePal_Lightning2" },
        ice: { gfx: "gBattleAnimSpriteGfx_IceCrystals", tileBytes: 448, palette: "gBattleAnimSpritePal_IceCrystals" },
      },
      background: { dedicatedBackground: false, enter: { selector: "F_PAL_BG", delay: 2, initialBlendY: 0, targetBlendY: 16 }, restore: { selector: "F_PAL_BG", delay: 2, initialBlendY: 16, targetBlendY: 0 } },
      carrier: { lowestLevel50Set: 273, frontierMon: "FRONTIER_MON_PORYGON_2", species: "SPECIES_PORYGON", itemTableId: 12, nature: "NATURE_QUIET", allLevel50Sets: [273, 372, 375, 379, 436, 468, 473, 628], allInventorySets: [273, 372, 375, 379, 436, 468, 473, 628], excludedOpenOnly: [], excludedOutsideFactory: [], level50SpeciesCount: 5 },
    });

    const callbackHashes: Record<string, { sourceSha256: string; romSha256: string }> = {
      AnimTriAttackTriangle: { sourceSha256: "67557732d46f7adfddab35c440974446c584f7cfe05da3c27512401be4cbc291", romSha256: "2120159d0ae41c60a34385852247885b9a43d5d5b5c05476cc1090b5b510fa4a" },
      AnimLargeFlame: { sourceSha256: "9f72afb57d03a734d323ae3fa6209b1c8e36fee5041fa61296b1d6153dadf32c", romSha256: "fd6791ce8d762712241236c9757d64144d74097bad04be70c171fc29018a30af" },
      AnimLargeFlame_Step: { sourceSha256: "43c322ff79197470cc92c472cbb533728f6b058b03d0cf22419ebbbac8e8bdaa", romSha256: "296c0a4e4da9394cb101ce18835addf52ead131c26fe1f6a04165878ed8feafb" },
      AnimLightning: { sourceSha256: "1efbf3f94ff5176bac84c4ea11c4f794754f714aa18c24980f96046f2490c177", romSha256: "1d2e13c9517cd2ba99811027cb903cfe897c3ee0f7d4f3b7a4c906fed921e2bc" },
      AnimLightning_Step: { sourceSha256: "926d626c3892da3a46d4e34e0e85629bbf404ad2d5d3a5410ba9008816e7a1a0", romSha256: "b4a5e2c4c6ced946a6e981926c4bbf940efd485bd2bd49ac01d18219c7d77f48" },
      AnimIceEffectParticle: { sourceSha256: "0c0110e9666cef197bd85146b7a51f1c7659e70138f0351265849cb2c14c4e1b", romSha256: "35149eeff62c021fdc2746e62af16e86de0db94b4b5fc02a18cf1c9b43c439ea" },
      AnimFlickerIceEffectParticle: { sourceSha256: "b67b253d84a1db4d9f342bff278e048e231b19c998b8d00aae131659ec64a368", romSha256: "162c67b0ef88f77b8cd0aca39acb53fa5fdba9fee39c875fdafd8922b55954cd" },
      AnimTask_ShakeTargetInPattern: { sourceSha256: "39f15c2b0d5592370c294433bbf9126d012319030ea78fdc4d5e714dfd15bd3e", romSha256: "e8bac2c06850bba6b9b6dd57ee760f4a5d32a824ea2bd0cb61202e4ac5166161" },
    };
    for (const [name, hashes] of Object.entries(callbackHashes)) expect(audit.callbacks[name]).toMatchObject({ sourceSha256: hashes.sourceSha256, rom: { romSha256: hashes.romSha256 } });
    expect(audit.sound.task).toMatchObject({ sourceSha256: "a968542e8f2453b0279e2a14319bb913e595bf2e09bbb0a7c63db372c5c5a5d1", rom: { start: "0x8158c58", endExclusive: "0x8158d08", romSha256: "5429ffec049a3219a57704e1c48d80e7669f8c74618ba9a08b28de42cbec5bb7" } });
    expect(audit.sound.step).toMatchObject({ sourceSha256: "f5b74ca25404977487a2b138e42f92fd979b4c5534df72f3902e6c02d9265f0d", rom: { start: "0x8158d08", endExclusive: "0x8158d8c", romSha256: "24ab699bdd0010c5970bf50597d52609ecc6e0d8093efdb8ad19b6ffdfb37160" } });
    expect(audit.siblings).toEqual([{ move: "MOVE_SCARY_FACE", status: "exact", blocks: ["Move_SCARY_FACE"] }, { move: "MOVE_GLARE", status: "exact", blocks: ["Move_GLARE"] }, { move: "MOVE_THUNDER", status: "exact", blocks: ["Move_THUNDER"] }, { move: "MOVE_TRI_ATTACK", status: "unsupported", blocks: ["Move_TRI_ATTACK", "IceCrystalEffectShort"] }]);
  });

  it.each(stages)("validates the %s complete transient-free bilateral party stage locally", (_side, path, playerSets, opponentSets, attackerSide, targetSide, constrainedMoves) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = spawnSync("python3", ["-c", [
      "import json, sys",
      "sys.path.insert(0, sys.argv[1])",
      "from battle_lab import validate_request",
      "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
    ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110, playerSetIds: playerSets, opponentSetIds: opponentSets });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const side of ["player", "opponent"] as const) {
      expect(stage.overrides.parties[side]).toHaveLength(3);
      for (const mon of stage.overrides.parties[side]) {
        expect(Object.keys(mon).sort()).toEqual([...completePartyKeys].sort());
        expect(mon.level).toBe(50);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
    const attacker = stage.overrides.parties[attackerSide][0];
    const target = stage.overrides.parties[targetSide][0];
    expect(attacker).toMatchObject({ species: 137, level: 50, nature: 17, moves: [161, 161, 161, 161], item: 133, abilitySlot: 0, gender: "genderless", shiny: false });
    expect(target).toMatchObject({ species: 213, level: 50, moves: [33, 33, 33, 33], item: 0, abilitySlot: 0, shiny: false });
    expect(stage.overrides.parties.opponent[0].moves).toEqual(constrainedMoves);
    expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }], captureFrames: [0, 112, 160, 934] });
  });

  it("pins the two sparse live Scene-ON receipts and the later independent promotion", () => {
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/tri-attack-staging-receipt.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({ schema: "tri-attack-sparse-staging/v1", oracleProfile: "battle-scene-on", move: "MOVE_TRI_ATTACK", moveId: 161, status: "unsupported-evidence", coverageCredit: false, evidenceScope: { sourceInitialized: true, customPartiesBuiltBeforeBattle: true, legalBilateralParties: true, sparseLiveReplay: true, denseWindowCaptured: false, transientOverrides: [] } });
    for (const [side, expected] of [["player-back", { attackerSide: "player", targetSide: "opponent", controllerExecFlagsAtMove: 1 }], ["opponent-front", { attackerSide: "opponent", targetSide: "player", controllerExecFlagsAtMove: 2 }]] as const) {
      const run = receipt.runs[side];
      expect(run).toMatchObject({ totalFrames: 934, sourceInitialized: true, customPartiesBuiltBeforeBattle: true, attacker: { side: expected.attackerSide, partyIndex: 0, species: 137 }, target: { side: expected.targetSide, partyIndex: 0, species: 213 }, controllerExecFlagsAtMove: expected.controllerExecFlagsAtMove });
      expect(run.captures.map((capture: Json) => capture.frame)).toEqual([0, 112, 160, 934]);
      const initial = run.captures[0];
      const inProgress = run.captures[1];
      expect(initial).toMatchObject({ frame: 0, currentMove: 0, visibleInProgress: false, attackerPp: [10, 10, 10, 10] });
      expect(inProgress).toMatchObject({ frame: 112, currentMove: 161, visibleInProgress: true, attackerPp: [9, 10, 10, 10] });
      expect(inProgress.framebufferSha256).not.toBe(initial.framebufferSha256);
      expect(run.triAttackPp).toMatchObject({ before: 10, atFrame112: 9, atFrame160: 9, final: 9, spent: 1 });
      expect(run.triAttackPp.before - run.triAttackPp.atFrame112).toBe(run.triAttackPp.spent);
    }
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_TRI_ATTACK")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "shake-target-in-pattern-scary-face").fulfilled).toBe(true);
    for (const move of ["MOVE_SCARY_FACE", "MOVE_GLARE", "MOVE_THUNDER"]) expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
  });
});
