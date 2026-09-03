import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completePartyKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const sourceAudit = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/seismicTossSourceAudit.ts",
], { cwd: root, encoding: "utf8" }));

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
  ["player-back", "tools/battle-lab/mechanic-seismic-toss-player-kecleon-opponent-onix.json", [128, 149, 180], [135, 188, 184], "player", "opponent", [33, 33, 33, 33]] as const,
  ["opponent-front", "tools/battle-lab/mechanic-seismic-toss-opponent-kecleon-player-onix.json", [135, 188, 184], [128, 149, 180], "opponent", "player", [69, 69, 69, 69]] as const,
];

describe("MOVE_SEISMIC_TOSS source/classification and legal Scene-ON staging checkpoint", () => {
  it("byte-pins the complete pointer-owned graph, every branch, callback body, and source-selected damage rule", () => {
    const audit = sourceAudit();
    expect(audit).toMatchObject({
      move: "MOVE_SEISMIC_TOSS", moveId: 69, status: "exact", coverageCredit: true,
      pointerOwned: {
        root: {
          symbol: "Move_SEISMIC_TOSS", start: "0x82d6b00", endExclusive: "0x82d6c5d", byteLength: 349,
          romSha256: "16ac629cfb101ffb86ae36698ac3a7072da879ffbebd165f4b5e4738c2f3ad6f",
          sourcePath: "data/battle_anim_scripts.s", sourceStart: 368752, sourceEndExclusive: 370917, sourceByteLength: 2165,
          sourceSha256: "97724b3d87bc84761f684aee44edc542ab83bcc09c64abb3e34b95abb17db8f3",
        },
        blocks: {
          Move_SEISMIC_TOSS: { start: "0x82d6b00", endExclusive: "0x82d6b48", byteLength: 72, romSha256: "50e48a77e427c59b4ca8bd4141e4ec96705ad918e3f0e2e624c858a23ab674b4", sourceByteLength: 530, sourceSha256: "307f49500885c0353f3012f037a8b8254bd53a128c718ada0e8ba024d37c1bb3", commandCount: 18 },
          SeismicTossContinue: { start: "0x82d6b48", endExclusive: "0x82d6b53", byteLength: 11, romSha256: "724680ea1942b3bf21305f62f4d613c82f85205bb450f522f37094f805729cdb", sourceByteLength: 122, sourceSha256: "e7ac2fd1067b6977dbcc179aae6ee9f425974f3883ad202d53db5505dc1100ae", commandCount: 7 },
          SeismicTossWeak: { start: "0x82d6b53", endExclusive: "0x82d6b64", byteLength: 17, romSha256: "8ed18cd4e2d195090cd6980159b2cc7d9f6b48f83ba1ed631a1d9b81c61e3ae0", sourceByteLength: 113, sourceSha256: "50f0d7b8edcfa26426c14607257c69b7838e3b2cf952ee01196aadff0888c1fb", commandCount: 4 },
          SeismicTossMedium: { start: "0x82d6b64", endExclusive: "0x82d6b7c", byteLength: 24, romSha256: "e82fe27a51895847331674b70889c0dc79a151c6e1b2cd8177e4d819b6632de5", sourceByteLength: 155, sourceSha256: "a87b725d739ef35d84deda7ef7d0ae24124067703a30ed01f2fab27111a3dabe", commandCount: 6 },
          SeismicTossStrong: { start: "0x82d6b7c", endExclusive: "0x82d6b9b", byteLength: 31, romSha256: "2624018f887b83d047a734866dc3eeee92fcfee48fd4cb14d13b4d8ff80534f9", sourceByteLength: 195, sourceSha256: "4b688f776392a3be96beb2829029061708984b657bffb450f83aa0236153edc3", commandCount: 8 },
          SeismicTossRockScatter1: { start: "0x82d6b9b", endExclusive: "0x82d6bfc", byteLength: 97, romSha256: "f112a8876471730268466af9fd28b0f3240cb11e685b4bfd106bdbbf97f0161e", sourceByteLength: 524, sourceSha256: "edba95eae86cb1a4ef49698e08e3c7976df0e0e49b1df7398e1db55ecfe98a3d", commandCount: 8 },
          SeismicTossRockScatter2: { start: "0x82d6bfc", endExclusive: "0x82d6c5d", byteLength: 97, romSha256: "e03edbded60860fe48371a83387e818684a2f58ce179c64d341ccea8bea50230", sourceByteLength: 526, sourceSha256: "ac80c28d32a939f6b2dd773ca206e8c2a99916f4faaaa679f5da76ca08184d23", commandCount: 8 },
        },
      },
      graph: {
        blocks: ["Move_SEISMIC_TOSS", "SeismicTossWeak", "SeismicTossMedium", "SeismicTossStrong", "SeismicTossRockScatter1", "SeismicTossRockScatter2", "SeismicTossContinue"],
        components: [
          "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_ROCKS", "sprite:gRockScatterSpriteTemplate",
          "subroutine:SeismicTossContinue", "subroutine:SeismicTossMedium", "subroutine:SeismicTossRockScatter1",
          "subroutine:SeismicTossRockScatter2", "subroutine:SeismicTossStrong", "subroutine:SeismicTossWeak",
          "task:AnimTask_GetSeismicTossDamageLevel", "task:AnimTask_MoveSeismicTossBg",
          "task:AnimTask_SeismicTossBgAccelerateDownAtEnd", "task:AnimTask_ShakeMon",
          "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite",
          "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha",
          "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
        ],
      },
      damageBranch: {
        selector: "AnimTask_GetSeismicTossDamageLevel", returnArg: "ARG_RET_ID", returnArgIndex: 7,
        thresholds: [
          { animMoveDamage: "< 33", result: 0, branch: "SeismicTossWeak" },
          { animMoveDamage: "33..65", result: 1, branch: "SeismicTossMedium" },
          { animMoveDamage: "> 65", result: 2, branch: "SeismicTossStrong" },
        ],
      },
      checkpoint: {
        track: "seismic-toss-air-rock-scatter", trackFulfilled: true, denseWindowCaptured: true,
        latchMeasured: true, productionChanged: true, exactPromotion: true,
      },
    });

    const callbackPins: Record<string, [number, string, string, string, number, string]> = {
      AnimTask_GetSeismicTossDamageLevel: [304, "bced077563a2ad5621aa3bd98063a60813098a3ccd3c728ca4a11f453253a8ce", "0x81114ec", "0x811152c", 64, "60edd09b4f5438527b8edf72f8044d117173d6e88d7bc1a4384b8bef78fa0ee4"],
      AnimTask_MoveSeismicTossBg: [418, "8b65bf4cb6f315649c24d1e0217795036020bf0b6ed68f2e70cd2971e5898099", "0x811152c", "0x8111590", 100, "19b6dca7faf0da1d9ec23d3fbac2a4bfdf0b5f49725d64dbc55861b3f2c526e2"],
      AnimTask_SeismicTossBgAccelerateDownAtEnd: [535, "f731f8dc93d11a5265891043c7c6b1ba0fddaf32249251f2a083752887965096", "0x8111590", "0x811160c", 124, "e2b31066cbd31969f66875b4ac77874e62aeee123067605f5e21175e2febd1c8"],
      AnimTask_ShakeMon: [676, "d21e28967d7676d3b8698949946c06f544f72fd927458b105d8de77d3abff611", "0x80d51ac", "0x80d5220", 116, "329fdfe484d8dce4dda384af512c29d8618d55ccb53d2bd44aea75c4cc465269"],
      AnimTask_ShakeMon_Step: [910, "ba68bafa85e4896e8eb8f7e4ab1d996e0b31cdcf9a554f0f793d18ef02320482", "0x80d5220", "0x80d52d0", 176, "abcd92f74299a0c194ce5c28a6abccf6b6a85e74630cef920a6b60e8d40baf9e"],
      AnimRockScatter: [500, "d998ade473d98b308f7fa15334e50823906edf2d51a22564b10ebcdb6ff2f66e", "0x8111444", "0x811149c", 88, "631e25800fd1a4f5c7cdf6387f43632456bc8db9ac3ef2a7af11230334212922"],
      AnimRockScatter_Step: [330, "970ad322fb2d3f9a82e1ef13bc6726d74b48c947a2971d564df38da42dc867fb", "0x811149c", "0x81114ec", 80, "2918eda7f4bca85d3db5a9e05bde7c50215603c36dbdebacdf90196c7e14b979"],
      AnimHitSplatBasic: [422, "e1a57b345502378b934d3be6293d313a73eb1508472d61a4c0af931554e3100d", "0x8116388", "0x81163d0", 72, "bf52c4ae284f87979752db55e8bbe5fa90cb1ca822282c6a1027c0131c8bb43f"],
      Cmd_fadetobg: [297, "f4c9501b4c1ca6760b4105934070b34ac73f299ae29db32c5b8d5859ae0874ba", "0x80a4e18", "0x80a4e5c", 68, "8bc466c432cb3db5a642f7150cf1cc63561e53f2f0761f3a38275fa60c041b7f"],
      Task_FadeToBg: [816, "db2b82fe2f787726436b24836384f134ab8f3513b3673e4f0155b4081c59930b", "0x80a4ef4", "0x80a4fc8", 212, "6458f5fdb0ac21ef01dccc7eed3db42607ac8d06849093cedb9c2a7d1cd80854"],
      LoadMoveBg: [1003, "0d84a1f72a3ed3a84a7223c0a94b7aead9ad8aab625d10211ec0a32f40d12e8e", "0x80a4fc8", "0x80a5090", 200, "9a34b3b0492bdabca8145388ff373dca2dd78db856a1c13f6565705a6c6c071e"],
      Cmd_restorebg: [195, "724b3049b9923bf8231d90ee19eb4f8d32896f4d61f2886e47cf1147a2a8c820", "0x80a50ac", "0x80a50f0", 68, "535767361bfff1c629e7b566db8405ed72a8a6950fa7038a8264db4d180f7e03"],
      UpdateAnimBg3ScreenSize: [363, "6d386a1c02123f9d89be18caabcddb4043e4fd9a657109c0ff5ec6f0e80394be", "0x80a6dac", "0x80a6dec", 64, "d4a5d24aa7f7103c42c2aa1c8ab33933d2b7c7abbef535a226fe22325e69a8b4"],
      Cmd_dmgtolevel: [127, "ac18d87e45550adf4e137262de3c2adbbd1bbcc6483a584d1d8cfa06c298843a", "0x8052584", "0x80525b4", 48, "4a9529aef52388bb01af32bab101ca273e6bbe222d9f9dec28b3fe75373d9674"],
    };
    expect(Object.keys(audit.callbacks).sort()).toEqual(Object.keys(callbackPins).sort());
    for (const [name, [sourceByteLength, sourceSha256, start, endExclusive, byteLength, romSha256]] of Object.entries(callbackPins)) {
      expect(audit.callbacks[name]).toMatchObject({
        sourceByteLength, sourceSha256,
        rom: { start, endExclusive, byteLength, romSha256 },
      });
    }
  });

  it("pins the BG/resource/audio/cleanup dependencies and the complete Level-50 carrier census without sibling credit", () => {
    const audit = sourceAudit();
    expect(audit.resources).toMatchObject({
      rocks: {
        tag: "ANIM_TAG_ROCKS", registry: { gfx: "gBattleAnimSpriteGfx_Rocks", tileBytes: 3072, palette: "gBattleAnimSpritePal_Rocks" },
        source: "graphics/battle_anims/sprites/rocks.png",
        rom: {
          gfx: { start: "0x8c0aa2c", endExclusive: "0x8c0ae94", byteLength: 1128, romSha256: "dbd2a4a3fc367cc966efe78be967f5a8b201cf0283bbd7d27e26d7354747c9e2" },
          palette: { start: "0x8c0ae94", endExclusive: "0x8c0aebc", byteLength: 40, romSha256: "f2221c18f736f1531100ed0b9f7d1d8435ef061b6f1b3799f433eb96551ecdc3" },
        },
      },
      impact: {
        tag: "ANIM_TAG_IMPACT", registry: { gfx: "gBattleAnimSpriteGfx_Impact", tileBytes: 512, palette: "gBattleAnimSpritePal_Impact" },
        source: "graphics/battle_anims/sprites/impact.png",
        rom: {
          gfx: { start: "0x8c1a3a0", endExclusive: "0x8c1a478", byteLength: 216, romSha256: "6c59ae34e08142a15f02497aec2319c3e3012bb4228dfeb5b9b1c0511666c298" },
          palette: { start: "0x8c1a478", endExclusive: "0x8c1a490", byteLength: 24, romSha256: "c436b63ac10f37b7ec0733964d9e557e26c97b9ac7eb564bd756a8eb2f4d5cb1" },
        },
      },
      rockScatterTemplate: {
        symbol: "gRockScatterSpriteTemplate", start: "0x8596cb0", endExclusive: "0x8596cc8", byteLength: 24,
        romSha256: "9755043f1fbc30050134bae8308caf1fc922b0b2748afe2c52c02b9e562b2bcf",
        sourcePath: "src/battle_anim_rock.c", sourceByteLength: 306,
        sourceSha256: "3cdf7057aa7493fdd46cb15746e1279d2ebd665db53f4054bbf98c5a026a46f5",
      },
    });
    expect(audit.background).toMatchObject({
      id: "BG_IN_AIR", idValue: 17,
      resources: {
        image: { start: "0x8d8f414", endExclusive: "0x8d8f570", byteLength: 348, romSha256: "4f3ddea6e523c1a0ae0abd5ebe5c35129cc4859a6e54dd3d8358f6b5dfd3e44f" },
        palette: { start: "0x8d8f570", endExclusive: "0x8d8f598", byteLength: 40, romSha256: "25b13fa3ffc95575f6a3dc39a713434dc1331b0b281fd31d81860dc24315e72f" },
        tilemap: { start: "0x8d8f598", endExclusive: "0x8d8f780", byteLength: 488, romSha256: "579916e30a9a5c36ebb7a404401825a8a361f3e4823a8ca2ea4470d08a641eed" },
      },
    });
    expect(audit.audio).toEqual({
      root: [{ name: "SE_M_SKY_UPPERCUT", id: 238, pan: 0 }],
      rockScatter1: [{ name: "SE_M_STRENGTH", id: 214, pan: "SOUND_PAN_TARGET" }],
      rockScatter2: [{ name: "SE_M_ROCK_THROW", id: 131, pan: "SOUND_PAN_TARGET" }],
    });
    expect(audit.cleanup).toEqual({
      branch: "SeismicTossContinue",
      commands: ["restorebg", "waitbgfadeout", "setarg 7, 0xFFF", "waitbgfadein", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
      resourceUnload: "no explicit unloadspritegfx; the script exits only after restorebg, terminal BG task argument, clearmonbg, and blendoff.",
    });
    expect(audit.carrier.level50Range).toEqual({ first: 110, last: 849, count: 740 });
    expect(audit.carrier.completeLevel50Census.map((entry: Json) => ({
      index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature,
    }))).toEqual([
      { index: 220, label: "FRONTIER_MON_KECLEON_1", species: "SPECIES_KECLEON", moves: ["MOVE_SECRET_POWER", "MOVE_PSYBEAM", "MOVE_MAGIC_COAT", "MOVE_SEISMIC_TOSS"], itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_NAIVE" },
      { index: 291, label: "FRONTIER_MON_PLUSLE_2", species: "SPECIES_PLUSLE", moves: ["MOVE_THUNDERBOLT", "MOVE_THUNDER_WAVE", "MOVE_SEISMIC_TOSS", "MOVE_WISH"], itemName: "BATTLE_FRONTIER_ITEM_PETAYA_BERRY", nature: "NATURE_DOCILE" },
      { index: 332, label: "FRONTIER_MON_CHANSEY_2", species: "SPECIES_CHANSEY", moves: ["MOVE_SEISMIC_TOSS", "MOVE_SHADOW_BALL", "MOVE_DOUBLE_TEAM", "MOVE_SOFT_BOILED"], itemName: "BATTLE_FRONTIER_ITEM_LEFTOVERS", nature: "NATURE_RELAXED" },
      { index: 341, label: "FRONTIER_MON_HITMONTOP_2", species: "SPECIES_HITMONTOP", moves: ["MOVE_DOUBLE_EDGE", "MOVE_SEISMIC_TOSS", "MOVE_ROCK_SLIDE", "MOVE_COUNTER"], itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_ADAMANT" },
      { index: 378, label: "FRONTIER_MON_DUSCLOPS_1", species: "SPECIES_DUSCLOPS", moves: ["MOVE_WILL_O_WISP", "MOVE_SEISMIC_TOSS", "MOVE_PAIN_SPLIT", "MOVE_CONFUSE_RAY"], itemName: "BATTLE_FRONTIER_ITEM_LEFTOVERS", nature: "NATURE_IMPISH" },
      { index: 448, label: "FRONTIER_MON_BLASTOISE_1", species: "SPECIES_BLASTOISE", moves: ["MOVE_HYDRO_PUMP", "MOVE_RAIN_DANCE", "MOVE_BITE", "MOVE_SEISMIC_TOSS"], itemName: "BATTLE_FRONTIER_ITEM_SHELL_BELL", nature: "NATURE_MODEST" },
      { index: 558, label: "FRONTIER_MON_BLISSEY_2", species: "SPECIES_BLISSEY", moves: ["MOVE_SEISMIC_TOSS", "MOVE_SING", "MOVE_ATTRACT", "MOVE_SUBSTITUTE"], itemName: "BATTLE_FRONTIER_ITEM_LEFTOVERS", nature: "NATURE_BOLD" },
    ]);
    expect(audit.carrier).toMatchObject({
      lowestLevel50: { index: 220, label: "FRONTIER_MON_KECLEON_1", species: "SPECIES_KECLEON", itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_NAIVE" },
      excludedOutsideLevel50: [
        { index: 13, label: "FRONTIER_MON_IGGLYBUFF" }, { index: 22, label: "FRONTIER_MON_MAKUHITA" },
        { index: 82, label: "FRONTIER_MON_MACHOP" }, { index: 90, label: "FRONTIER_MON_ABRA" },
      ],
      excludedOpenOnly: [],
    });
    expect(audit.controls).toEqual({
      moves: ["MOVE_ROCK_THROW", "MOVE_ROCK_SLIDE", "MOVE_ANCIENT_POWER"],
      statuses: ["exact", "exact", "exact"],
      independence: "These exact source-identity controls are batch-checked only. MOVE_SEISMIC_TOSS is independently exact, and its non-exclusive track grants no inferred sibling credit.",
    });
  });

  it.each(stages)("validates the %s complete transient-free, choice-constrained three-Pokemon party stage", (_orientation, path, playerSets, opponentSets, attackerSide, targetSide, aiMoves) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 0, battleNum: 0, trainerId: 50, playerSetIds: playerSets, opponentSetIds: opponentSets,
    });
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
        for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) {
          expect(mon).not.toHaveProperty(transient);
        }
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({
      species: 352, level: 50, nature: 14, moves: [69, 69, 69, 69], item: 0, abilitySlot: 0, friendship: 70, gender: "male", shiny: false,
    });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({
      species: 95, level: 50, nature: 7, moves: [33, 33, 33, 33], item: 0, abilitySlot: 0, friendship: 70, gender: "male", shiny: false,
    });
    expect(stage.overrides.parties.opponent[0].moves).toEqual(aiMoves);
    expect(stage.trace).toEqual({
      segments: [
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
      ],
    });
    expect(stage.trace).not.toHaveProperty("captureFrames");
  });

  it("retains the compact pre-production receipt alongside the later exact acceptance", () => {
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/seismic-toss-staging-receipt.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({
      schema: "seismic-toss-compact-staging-receipt/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SEISMIC_TOSS", moveId: 69, status: "unsupported", coverageCredit: false,
      factoryLegalSelection: {
        level: 50, animationDamage: 50, selector: "AnimTask_GetSeismicTossDamageLevel",
        returnArgIndex: 7, result: 1, branch: "SeismicTossMedium",
        otherPointerOwnedBranches: ["SeismicTossWeak", "SeismicTossStrong"],
      },
      scope: {
        framebuffersRetained: false, denseWindowCaptured: false, latchMeasured: false,
        productionChanged: false, coveragePromotion: false, transientOverrides: [],
      },
    });
    for (const [orientation, expected] of Object.entries({
      "player-back": { attackerSide: "player", targetSide: "opponent", ppAfter: [19, 20, 20, 20], controllerExecFlags: 1, aiMoves: [33, 33, 33, 33] },
      "opponent-front": { attackerSide: "opponent", targetSide: "player", ppAfter: [20, 19, 20, 20], controllerExecFlags: 2, aiMoves: [69, 69, 69, 69] },
    })) {
      const run = receipt.runs[orientation];
      expect(run).toMatchObject({
        freshRuns: 2, outputsByteIdentical: true, sourceInitialized: true, customPartiesBuiltBeforeBattle: true,
        attacker: { side: expected.attackerSide, partyIndex: 0, species: 352, level: 50 },
        target: { side: expected.targetSide, partyIndex: 0, species: 95, initialHp: 142, maxHp: 142 },
        legalAiMoveSlots: expected.aiMoves,
        entry: { currentMove: 69, root: "Move_SEISMIC_TOSS", controllerExecFlags: expected.controllerExecFlags },
        branch: { label: "SeismicTossMedium", result: 1, returnArgIndex: 7, animationDamage: 50, rootObservations: 227 },
        pp: { before: [20, 20, 20, 20], after: expected.ppAfter, spent: 1 },
        benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true,
      });
      expect(run.target.maxHp).toBeGreaterThan(run.branch.animationDamage);
    }
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(231);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SEISMIC_TOSS"))
      .toMatchObject({ status: "exact" });
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "seismic-toss-air-rock-scatter");
    expect(track).toMatchObject({ representatives: ["MOVE_SEISMIC_TOSS"], fulfilled: true });
    for (const move of ["MOVE_ROCK_THROW", "MOVE_ROCK_SLIDE", "MOVE_ANCIENT_POWER"]) {
      expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
    }
  });
});
