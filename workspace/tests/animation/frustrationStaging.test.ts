import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completePartyKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const sourceAudit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/frustrationSourceAudit.ts"], { cwd: root, encoding: "utf8" }));

function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}

function validateStage(path: string) {
  return spawnSync("python3", ["-c", [
    "import json, sys",
    "sys.path.insert(0, sys.argv[1])",
    "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

const stages = [
  ["player-back", "tools/battle-lab/mechanic-frustration-player-furret-opponent-onix.json", [304, 305, 306], [349, 339, 327], "player", "opponent", [33, 33, 33, 33]] as const,
  ["opponent-front", "tools/battle-lab/mechanic-frustration-opponent-furret-player-onix.json", [349, 339, 327], [304, 305, 306], "opponent", "player", [218, 218, 218, 218]] as const,
];

describe("MOVE_FRUSTRATION authoritative source and legal Scene-ON staging checkpoint", () => {
  it("pins the root, every pointer-owned strength branch, callbacks, resources, audio, and Factory census", () => {
    const audit = sourceAudit();
    expect(audit).toMatchObject({
      move: "MOVE_FRUSTRATION", moveId: 218, status: "exact", coverageCredit: true,
      pointerOwned: {
        root: { symbol: "Move_FRUSTRATION", start: "0x82cb430", endExclusive: "0x82cb6f7", byteLength: 711, romSha256: "901d9a9d4ee45e9ba47d97a9a452a102dcdab95596499e70fac9b5ca3fc29200", sourcePath: "data/battle_anim_scripts.s", sourceStart: 65707, sourceEndExclusive: 70345, sourceByteLength: 4638, sourceSha256: "319ff215abce58a0cb07d6039321e3bf24ab56f218251e15043e764361fb3419" },
        blocks: {
          Move_FRUSTRATION: { start: "0x82cb430", endExclusive: "0x82cb45f", byteLength: 47, romSha256: "4c4d8030187e815b91368d40b0f5a40f04fff041554b3b2404d1a56def1052be", sourceByteLength: 299, sourceSha256: "e2d13440e8f988a5e50628c90dc6efa616434abcd4e8460df62053cd43db4923", commandCount: 9 },
          Frustration_Continue: { start: "0x82cb45f", endExclusive: "0x82cb464", byteLength: 5, romSha256: "e5b5655d15194fa24a98b4bec1c4cf771caaaf11c5a5e5512808d20890281e62", sourceByteLength: 87, sourceSha256: "135cc264824442c3028c1f054a518f9be33f91c917b2d6ea181eeb055fb82533", commandCount: 4 },
          Frustration_Strongest: { start: "0x82cb464", endExclusive: "0x82cb56a", byteLength: 262, romSha256: "e77a9692f3c3b6248389fcb5eddc307508991dd71a4a4c02c34400b0a452daad", sourceByteLength: 1748, sourceSha256: "27328e8e35ef60a7c367288c22d00eb3b3f7c8915d18b6334bcc39e519aec4ae", commandCount: 35 },
          Frustration_Strong: { start: "0x82cb56a", endExclusive: "0x82cb637", byteLength: 205, romSha256: "39364ca58a0116a908d7dc50669df874c2f5f561c3dc79433cd24af6bf1b9c58", sourceByteLength: 1260, sourceSha256: "b8b3cd71c49457da220399335bf5684a257e2568183108e66462e0d11d81430f", commandCount: 25 },
          Frustration_Medium: { start: "0x82cb637", endExclusive: "0x82cb6b3", byteLength: 124, romSha256: "1a4bfbeb57098c150a528277459630e62fe67572eb3aa5fbbe5d0a3a75072cbe", sourceByteLength: 796, sourceSha256: "07f2d99e89a64211ad19308148da1b3e66f997f3d7f7b2089baf3e75c408f198", commandCount: 16 },
          Frustration_Weak: { start: "0x82cb6b3", endExclusive: "0x82cb6f7", byteLength: 68, romSha256: "d36214478d8bbc6b07fc3ff9d9d59a80e22f152febd8c763a3045ed3982cdd8d", sourceByteLength: 448, sourceSha256: "b8235cc2810c09beef65b1f19d5d9682a41e4adca64ece1c17a6e70066d84e6b", commandCount: 9 },
        },
      },
      branches: {
        selector: { task: "AnimTask_GetFrustrationPowerLevel", returnArg: "ARG_RET_ID", returnArgIndex: 7, friendshipBands: [
          { friendship: "0..30", result: 0, label: "Frustration_Strongest" }, { friendship: "31..100", result: 1, label: "Frustration_Strong" },
          { friendship: "101..200", result: 2, label: "Frustration_Medium" }, { friendship: "201..255", result: 3, label: "Frustration_Weak" },
        ] },
        strongest: { label: "Frustration_Strongest", shakeTasks: [["ANIM_ATTACKER", 1, 0, 15, 1], ["ANIM_TARGET", 4, 0, 30, 1]], sway: [0, 16, 6144, 8, "ANIM_ATTACKER"], angerMarks: 2, hitSplats: 6, attackerBlend: ["F_PAL_ATTACKER", 3, 0, 9, "RGB_RED", 9, 0] },
        strong: { label: "Frustration_Strong", shakeTasks: [["ANIM_ATTACKER", 1, 0, 15, 1], ["ANIM_TARGET", 4, 0, 6, 1]], angerMarks: 1, strongGrowShrink: true, hitSplats: 3 },
        medium: { label: "Frustration_Medium", angerMarks: 1, horizontalLunges: 2, hitSplats: 2, targetShake: ["ANIM_TARGET", 3, 0, 6, 1] },
        weak: { label: "Frustration_Weak", weakAngerMarks: 1, horizontalLunges: 1, hitSplats: 1, targetShake: ["ANIM_TARGET", 1, 0, 6, 1] },
        cleanup: { label: "Frustration_Continue", commands: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"], visualFinishBeforeCleanup: true },
      },
      graph: {
        blocks: ["Move_FRUSTRATION", "Frustration_Strongest", "Frustration_Strong", "Frustration_Medium", "Frustration_Weak", "Frustration_Continue"],
        components: ["asset:ANIM_TAG_ANGER", "asset:ANIM_TAG_IMPACT", "sprite:gAngerMarkSpriteTemplate", "sprite:gHorizontalLungeSpriteTemplate", "sprite:gWeakFrustrationAngerMarkSpriteTemplate", "subroutine:Frustration_Continue", "subroutine:Frustration_Medium", "subroutine:Frustration_Strong", "subroutine:Frustration_Strongest", "subroutine:Frustration_Weak", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_GetFrustrationPowerLevel", "task:AnimTask_ShakeMon2", "task:AnimTask_StrongFrustrationGrowAndShrink", "task:AnimTask_SwayMon", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha"],
      },
      resources: {
        anger: { tag: "ANIM_TAG_ANGER", gfx: "gBattleAnimSpriteGfx_Anger", tileBytes: 128, palette: "gBattleAnimSpritePal_Anger", templates: ["gAngerMarkSpriteTemplate", "gWeakFrustrationAngerMarkSpriteTemplate"] },
        impact: { tag: "ANIM_TAG_IMPACT", gfx: "gBattleAnimSpriteGfx_Impact", tileBytes: 512, palette: "gBattleAnimSpritePal_Impact", template: "gBasicHitSplatSpriteTemplate" },
        trackControlsNotInFrustration: ["ANIM_TAG_BREATH", "gBreathPuffSpriteTemplate", "AnimTask_GrowAndShrink"],
      },
      audio: {
        strongest: [["SE_M_DRAGON_RAGE", "SOUND_PAN_ATTACKER", 1], ["SE_M_SWAGGER2", "SOUND_PAN_ATTACKER", 2], ["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 6]],
        strong: [["SE_M_DRAGON_RAGE", "SOUND_PAN_ATTACKER", 1], ["SE_M_SWAGGER2", "SOUND_PAN_ATTACKER", 1], ["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 3]],
        medium: [["SE_M_SWAGGER2", "SOUND_PAN_ATTACKER", 1], ["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 2]],
        weak: [["SE_M_COMET_PUNCH", "SOUND_PAN_TARGET", 1]],
      },
      factoryFriendship: {
        construction: "battle_factory.c writes friendship = 0 then MON_DATA_FRIENDSHIP for player and enemy Factory parties before battle.",
        returnReplacement: "SetMonMoveAvoidReturn rewrites MOVE_RETURN to MOVE_FRUSTRATION.",
        animationResult: "Factory-legal Frustration carriers enter Frustration_Strongest (result 0) only; the other three source branches remain pointer-owned and pinned but need non-Factory evidence if ever accepted.",
      },
      carrier: { lowestLevel50Set: 304, frontierMon: "FRONTIER_MON_FURRET_2", species: "SPECIES_FURRET", itemTableId: 16, itemName: "BATTLE_FRONTIER_ITEM_CHOICE_BAND", nature: "NATURE_ADAMANT", allLevel50Sets: [304, 307, 308, 310, 323, 324, 342, 351, 354, 693], allInventorySets: [304, 307, 308, 310, 323, 324, 342, 351, 354, 693], excludedOpenOnly: [], excludedOutsideFactory: [] },
      coverage: { level50Exact: 236, level50Unsupported: 40, trackFulfilled: true, siblingStatuses: { MOVE_SWAGGER: "exact", MOVE_FRUSTRATION: "exact", MOVE_TORMENT: "exact", MOVE_TAUNT: "exact" } },
    });

    const callbackHashes: Record<string, { sourceSha256: string; romSha256: string }> = {
      AnimTask_GetFrustrationPowerLevel: { sourceSha256: "efadb9aa99910e1e8a1167f59f76e9ebf80c3f97c7147504ec701946a4269484", romSha256: "cbb68e3bc1843f1e15c70cf519542027d59166938d2207ee9dafbd007a2002c7" },
      AnimTask_ShakeMon2: { sourceSha256: "70cb520c7783bead6d242f1888fa72e5b3c834e7d08803117694ec8bd1b0805f", romSha256: "18a0c6aae46b12981db295ebeb4044da2baa1a09931abc75afca5eded2b89d66" },
      AnimTask_SwayMon: { sourceSha256: "4373a508057b1450fa83ab68aa1b55ac7e02c56eb94aa4661bc68ce35d0424b9", romSha256: "666d6ea1e03850bdef46f231383039a65f33f1efc98c37f5a141fe2daf2d80ab" },
      AnimTask_StrongFrustrationGrowAndShrink: { sourceSha256: "7bc7cec5f9d87bd51159f6318e18d974d765758995c7c22adec54ac310ec3e27", romSha256: "d712b178606209bf6d105b711cc29642131d6adf4c22ae43c1ac1accbec8fe78" },
      AnimTask_BlendBattleAnimPal: { sourceSha256: "547c4682ace485c2e700d64e1b4b5feef19e839adaada6f294c5fd003f192948", romSha256: "975e324bde253daeee7691503316df123b98c1269fb52a92f887476d321b21f7" },
      AnimAngerMark: { sourceSha256: "33d26466053ba98d95ed31c8b88117fc204a7fc5025a9fba52bd8d848bb8df40", romSha256: "c4cbe8b5b802820e578894ef0019f89593fa76e5dfd2418b2bede382377b6233" },
      AnimWeakFrustrationAngerMark: { sourceSha256: "d704e6bed142288e5e3184249eb931328fd637be5527d0563e82c21f86479b39", romSha256: "eae91c08dbe316eb75717e60c25139279ad3d68ac3c8a51653da5c8fdc5be134" },
      DoHorizontalLunge: { sourceSha256: "0e854f5cedd517538b5aea5b111e57d564b52b6c2e0c16e9a2435a02b978552a", romSha256: "18ad5fbb5783ab51d200f699791b91a7bcea15279efe375588d6bd6771c8096c" },
      AnimHitSplatBasic: { sourceSha256: "e1a57b345502378b934d3be6293d313a73eb1508472d61a4c0af931554e3100d", romSha256: "bf52c4ae284f87979752db55e8bbe5fa90cb1ca822282c6a1027c0131c8bb43f" },
    };
    for (const [name, hashes] of Object.entries(callbackHashes)) expect(audit.callbacks[name]).toMatchObject({ sourceSha256: hashes.sourceSha256, rom: { romSha256: hashes.romSha256 } });
  });

  it.each(stages)("validates the %s complete, transient-free, choice-constrained three-Pokemon party stage", (_orientation, path, playerSets, opponentSets, attackerSide, targetSide, aiMoves) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
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
        expect(mon.friendship).toBe(0);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({ species: 162, level: 50, nature: 3, moves: [218, 218, 218, 218], item: 186, abilitySlot: 0, friendship: 0, gender: "male", shiny: false });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33], item: 142, abilitySlot: 0, friendship: 0, shiny: false });
    expect(stage.overrides.parties.opponent[0].moves).toEqual(aiMoves);
    expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }], captureFrames: [0, 112, 160, 934] });
  });

  it("pins the historical compact receipt while recognizing the later exact promotion", () => {
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/frustration-staging-receipt.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({
      schema: "frustration-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_FRUSTRATION", moveId: 218,
      status: "unsupported", coverageCredit: false,
      factoryLegalSelection: { friendship: 0, selector: "AnimTask_GetFrustrationPowerLevel", returnArgIndex: 7, result: 0, branch: "Frustration_Strongest", otherPointerOwnedBranches: ["Frustration_Strong", "Frustration_Medium", "Frustration_Weak"] },
      scope: { framebuffersRetained: false, denseWindowCaptured: false, latchMeasured: false, productionChanged: false, coveragePromotion: false, transientOverrides: [] },
    });
    for (const [orientation, expected] of Object.entries({
      "player-back": { attackerSide: "player", targetSide: "opponent", ppAfter: [19, 20, 20, 20], controllerExecFlags: 1, aiMoves: [33, 33, 33, 33] },
      "opponent-front": { attackerSide: "opponent", targetSide: "player", ppAfter: [20, 20, 19, 20], controllerExecFlags: 2, aiMoves: [218, 218, 218, 218] },
    })) {
      const run = receipt.runs[orientation];
      expect(run).toMatchObject({
        freshRuns: 2, outputsByteIdentical: true, sourceInitialized: true, customPartiesBuiltBeforeBattle: true,
        attacker: { side: expected.attackerSide, partyIndex: 0, species: 162, friendship: 0 },
        target: { side: expected.targetSide, partyIndex: 0, species: 95 }, legalAiMoveSlots: expected.aiMoves,
        entry: { currentMove: 218, root: "Move_FRUSTRATION", controllerExecFlags: expected.controllerExecFlags },
        branch: { label: "Frustration_Strongest", result: 0, returnArgIndex: 7 },
        pp: { before: [20, 20, 20, 20], after: expected.ppAfter, spent: 1 },
        benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true,
      });
    }
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(236);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_FRUSTRATION")).toMatchObject({ status: "exact" });
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "anger-mark-grow-breath");
    expect(track).toMatchObject({ representatives: ["MOVE_SWAGGER", "MOVE_FRUSTRATION", "MOVE_TORMENT", "MOVE_TAUNT"] });
    expect(track.fulfilled).toBe(true);
    for (const move of ["MOVE_SWAGGER", "MOVE_TORMENT", "MOVE_TAUNT"]) expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
  });
});
