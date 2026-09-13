import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completePartyKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];

function sourceAuditText(): string {
  return execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/focusPunchSourceAudit.ts",
  ], { cwd: root, encoding: "utf8" });
}

function sourceAudit(): Json {
  return JSON.parse(sourceAuditText()) as Json;
}

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
  [
    "player-back",
    "tools/battle-lab/mechanic-focus-punch-player-breloom-opponent-starmie.json",
    "player", "opponent", [274, 354, 338], [349, 339, 327],
  ],
  [
    "opponent-front",
    "tools/battle-lab/mechanic-focus-punch-opponent-breloom-player-starmie.json",
    "opponent", "player", [349, 339, 327], [274, 354, 338],
  ],
] as const;

describe("MOVE_FOCUS_PUNCH source/classification and legal Scene-ON staging checkpoint", () => {
  it("pins the complete pointer-owned script graph, half-open ROM/source intervals, commands, and independent controls", () => {
    const text = sourceAuditText();
    const audit = JSON.parse(text) as Json;
    expect(createHash("sha256").update(text).digest("hex")).toBe(
      "fc7fa149d20a2f7aa527a1fe6539b60c8407807900bd8052756be19ec2851ff9",
    );
    expect(audit).toMatchObject({
      schema: "focus-punch-source-audit/v1",
      status: "unsupported-source-staging-checkpoint",
      coverageCredit: false,
      move: "MOVE_FOCUS_PUNCH",
      moveId: 264,
      pointerOwned: {
        root: {
          elf: {
            start: "0x82d5a07", endExclusive: "0x82d5ace",
            startSymbol: "Move_FOCUS_PUNCH", endSymbol: "Move_RETURN",
          },
          rom: {
            start: "0x82d5a07", endExclusive: "0x82d5ace", byteLength: 199,
            sha256: "65b5c33127f2be16a6522f572c9ee49d5b86c1bcb06376a4577aceabd1e36abd",
          },
          source: {
            path: "data/battle_anim_scripts.s", start: 343045, endExclusive: 344549,
            byteLength: 1504,
            sha256: "2eab776023f90d7d51fb30549e3a787044bdc84cdaa24df38f7d9b7c170c77ba",
          },
        },
      },
      scope: {
        productionChanged: false, reducerAdded: false, typedSeamAdded: false,
        compositorAdded: false, framebufferAcceptance: false, latchMeasured: false,
        coveragePromotion: false,
      },
    });

    const blocks: Record<string, {
      elf: readonly [string, string];
      rom: readonly [number, string];
      source: readonly [number, number, number, string];
      commands: readonly string[];
    }> = {
      Move_FOCUS_PUNCH: {
        elf: ["0x82d5a07", "0x82d5a0c"],
        rom: [5, "2f8a73420534f87604a14bd7ec3db2477351dfd2d2a775d14526b69c9fdff1ac"],
        source: [343045, 343080, 35, "2ad71b84e51688c9e1cc48b36d6c48d41a9c62cd5867278adfdb2c7509da57cf"],
        commands: ["goto FocusPunch"],
      },
      FocusPunchEnd: {
        elf: ["0x82d5a0c", "0x82d5a0e"],
        rom: [2, "b94f82274fe77dff278988a9ea096f8857d32ecf50518db9cb24c830880a2f5b"],
        source: [343080, 343121, 41, "098d1d0aa1e3b3b944ab416a372256a69a62c946952715afac78d93f07c0fd96"],
        commands: ["waitforvisualfinish", "end"],
      },
      FocusPunch: {
        elf: ["0x82d5a0e", "0x82d5a3c"],
        rom: [46, "4da759a1c9b0867eebc1cf91f6081895e69bf70e80a944edbfa0bfbdd26e9ee0"],
        source: [343121, 343401, 280, "0d7f90b5010835efbf64b1caed71cb47f2af41543595b1a1ddc62bda99f248a1"],
        commands: [
          "loadspritegfx ANIM_TAG_IMPACT", "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
          "delay 1", "createvisualtask AnimTask_IsContest, 2",
          "jumprettrue FocusPunchInContest",
          "createvisualtask AnimTask_IsTargetPlayerSide, 2",
          "jumpretfalse FocusPunchOnOpponent", "jumprettrue FocusPunchOnPlayer",
        ],
      },
      FocusPunchContinue: {
        elf: ["0x82d5a3c", "0x82d5ab9"],
        rom: [125, "6d38ca26496cd49ab66a0df9c3feda49dcf4a6a951e7b0dfa51decd9417cd7f8"],
        source: [343401, 344325, 924, "9fe1fb132c1151e8ac1cc24eb40e3cfdf0389cb5307bc339d603d847005fa5a6"],
        commands: [
          "waitbgfadein", "monbg ANIM_DEF_PARTNER", "setalpha 12, 8",
          "playsewithpan SE_M_SWAGGER, SOUND_PAN_TARGET",
          "createsprite gFocusPunchFistSpriteTemplate, ANIM_TARGET, 2", "delay 10",
          "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-10, y=-8, relative_to=ANIM_TARGET, animation=0",
          "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 8, 0, 24, 1", "delay 8",
          "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=10, y=2, relative_to=ANIM_TARGET, animation=0",
          "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET", "delay 8",
          "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=10, y=-6, relative_to=ANIM_TARGET, animation=0",
          "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET", "delay 8",
          "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=8, relative_to=ANIM_TARGET, animation=0",
          "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET", "waitforvisualfinish",
          "restorebg", "waitbgfadein", "clearmonbg ANIM_DEF_PARTNER", "blendoff",
          "goto FocusPunchEnd",
        ],
      },
      FocusPunchOnOpponent: {
        elf: ["0x82d5ab9", "0x82d5ac0"],
        rom: [7, "7014d14f673444ccb66bf3cff9cceaa193886c19fc1a4b1140b81c694f9bb812"],
        source: [344325, 344401, 76, "cb29e9ed57ac4f4822186db539efe298038e0956ad98353b2733eebe33387b9b"],
        commands: ["fadetobg BG_IMPACT_OPPONENT", "goto FocusPunchContinue"],
      },
      FocusPunchOnPlayer: {
        elf: ["0x82d5ac0", "0x82d5ac7"],
        rom: [7, "1c4b58bb44f3b46dd782846f26332a37a1c17d50df8fe8d82bbd30eac930e485"],
        source: [344401, 344473, 72, "61bddef373e36b1f16b4a95449a44b7185fa81a3caa582e0e8de05885bcd673a"],
        commands: ["fadetobg BG_IMPACT_PLAYER", "goto FocusPunchContinue"],
      },
      FocusPunchInContest: {
        elf: ["0x82d5ac7", "0x82d5ace"],
        rom: [7, "30995541098a5caafc5f8eb8586b8d8df2b6fe9ca0d396b4d109c7a45b07bdfd"],
        source: [344473, 344549, 76, "318bfc12c8f5beeefec8e43a90c6e54a04457e77b2b8484cbd9b47718e851318"],
        commands: ["fadetobg BG_IMPACT_CONTESTS", "goto FocusPunchContinue"],
      },
    };
    expect(Object.keys(audit.pointerOwned.blocks).sort()).toEqual(Object.keys(blocks).sort());
    for (const [label, expected] of Object.entries(blocks)) {
      expect(audit.pointerOwned.blocks[label]).toMatchObject({
        elf: { start: expected.elf[0], endExclusive: expected.elf[1] },
        rom: { byteLength: expected.rom[0], sha256: expected.rom[1] },
        source: {
          start: expected.source[0], endExclusive: expected.source[1],
          byteLength: expected.source[2], sha256: expected.source[3],
        },
        commands: expected.commands,
      });
    }

    const controls: Record<string, readonly [string, string, number, string]> = {
      MOVE_MEGA_PUNCH: ["0x82ca14d", "0x82ca227", 218, "f2c1ec91b7d7b64c5f8607cabdb916f55b80c93b1ff4c674f8ef2ee8dd79f968"],
      MOVE_MEGA_KICK: ["0x82ca227", "0x82ca2c3", 156, "7a420f198d3dda7e4e4a9cb51471987f0df13b1e741122c95ca5b02848c2c43b"],
      MOVE_HYPER_FANG: ["0x82d452e", "0x82d4595", 103, "878a5182cef2efcce1eee34f1517c8842fdbee33799d7fe8df9551aa24d91754"],
      MOVE_SOLAR_BEAM: ["0x82d08d8", "0x82d0b2d", 597, "423f7f6832318d13d85460631eda2d3c5fb749526146f4729dc985d22e13fbf9"],
      MOVE_FOCUS_ENERGY: ["0x82d36cf", "0x82d370f", 64, "359bb050fa34d83e7136d457ea0eb6c4a9b937f8205e70b245964058da822e6e"],
      MOVE_ENDURE: ["0x82cd687", "0x82cd71b", 148, "6eb060c30c457aadbd2d1e40a047cdf72803a46019988e618b7f0c778507e5ed"],
      General_FocusPunchSetUp: ["0x82d84e3", "0x82d8523", 64, "b826b05f88fb24305bf86233f91e10187b126f1d42d60797c67858ee95cc218a"],
    };
    expect(Object.keys(audit.controls.distinctPointerBodies).sort()).toEqual(Object.keys(controls).sort());
    for (const [name, [start, endExclusive, byteLength, sha256]] of Object.entries(controls)) {
      expect(audit.controls.distinctPointerBodies[name]).toMatchObject({
        elf: { start, endExclusive },
        rom: { byteLength, sha256 },
      });
      expect(start).not.toBe(audit.pointerOwned.root.elf.start);
    }
    expect(audit.controls.noTransfer).toContain("Mega Punch, Mega Kick, Hyper Fang, Solar Beam, Focus Energy, Endure");
  });

  it("pins the generated component graph, Focus Punch-only source pieces, resources, callbacks, tasks, and all legal carriers", () => {
    const audit = sourceAudit();
    expect(audit.generatedGraph).toMatchObject({
      rootScript: "Move_FOCUS_PUNCH",
      blocks: [
        "Move_FOCUS_PUNCH", "FocusPunch", "FocusPunchInContest", "FocusPunchOnOpponent",
        "FocusPunchOnPlayer", "FocusPunchContinue", "FocusPunchEnd",
      ],
      components: [
        "asset:ANIM_TAG_HANDS_AND_FEET", "asset:ANIM_TAG_IMPACT",
        "sprite:gFocusPunchFistSpriteTemplate", "subroutine:FocusPunch",
        "subroutine:FocusPunchContinue", "subroutine:FocusPunchEnd",
        "subroutine:FocusPunchInContest", "subroutine:FocusPunchOnOpponent",
        "subroutine:FocusPunchOnPlayer", "task:AnimTask_IsContest",
        "task:AnimTask_IsTargetPlayerSide", "task:AnimTask_ShakeMon",
        "visualCommand:blendoff", "visualCommand:clearmonbg",
        "visualCommand:create_basic_hitsplat_sprite", "visualCommand:fadetobg",
        "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha",
        "visualCommand:waitbgfadein",
      ],
    });
    expect(audit.generatedGraph.componentDetails
      .filter((component: Json) => component.focusPunchOwned)
      .map((component: Json) => component.id)).toEqual([
      "sprite:gFocusPunchFistSpriteTemplate", "subroutine:FocusPunch",
      "subroutine:FocusPunchContinue", "subroutine:FocusPunchEnd",
      "subroutine:FocusPunchInContest", "subroutine:FocusPunchOnOpponent",
      "subroutine:FocusPunchOnPlayer",
    ]);
    expect(audit.dependencies.resources).toEqual({
      HANDS_AND_FEET: {
        gfx: "gBattleAnimSpriteGfx_HandsAndFeet",
        palette: "gBattleAnimSpritePal_HandsAndFeet",
        tag: "ANIM_TAG_HANDS_AND_FEET",
      },
      IMPACT: {
        gfx: "gBattleAnimSpriteGfx_Impact", palette: "gBattleAnimSpritePal_Impact",
        tag: "ANIM_TAG_IMPACT", template: "gBasicHitSplatSpriteTemplate",
      },
    });
    expect(audit.dependencies.background).toEqual({
      targetOpponent: { id: 4, token: "BG_IMPACT_OPPONENT", tilemap: "gBattleAnimBgTilemap_ImpactOpponent" },
      targetPlayer: { id: 5, token: "BG_IMPACT_PLAYER", tilemap: "gBattleAnimBgTilemap_ImpactPlayer" },
      contest: { id: 6, token: "BG_IMPACT_CONTESTS", tilemap: "gBattleAnimBgTilemap_ImpactContests" },
    });
    expect(audit.dependencies.paletteMonbgAlphaAudioCleanup).toEqual({
      monbg: "monbg ANIM_DEF_PARTNER", alpha: "setalpha 12, 8",
      audio: ["SE_M_SWAGGER", "SE_M_VITAL_THROW2", "SE_M_VITAL_THROW2", "SE_M_MEGA_KICK2"],
      cleanup: [
        "waitforvisualfinish", "restorebg", "waitbgfadein",
        "clearmonbg ANIM_DEF_PARTNER", "blendoff", "FocusPunchEnd",
      ],
    });

    const spans: Record<string, readonly [string, number, number, number, string]> = {
      "templates.focusPunchFist": ["src/battle_anim_fight.c", 11500, 11836, 336, "1ddf967ea86b1160c7756312b900583d42b861f86d59a01c27744a8a4dd8f4a0"],
      "templates.basicHitSplat": ["src/battle_anim_normal.c", 4830, 5143, 313, "87a11444acefd6697c082862146aa52c0f89f9194caf5f330840ca1db2875774"],
      "callbacks.AnimFocusPunchFist": ["src/battle_anim_fight.c", 28287, 28567, 280, "290f805d0badf9c1d95850a739518a876e95826c5a52edcd252dcf5c8a021c4e"],
      "callbacks.AnimHitSplatBasic": ["src/battle_anim_normal.c", 29787, 30209, 422, "e1a57b345502378b934d3be6293d313a73eb1508472d61a4c0af931554e3100d"],
      "tasks.AnimTask_IsContest": ["src/battle_anim_utility_funcs.c", 34264, 34457, 193, "bf69ea22274d10673e91755e8c683730dc40facc0c5ace495e755bf4d8bbcb16"],
      "tasks.AnimTask_IsTargetPlayerSide": ["src/battle_anim_effects_3.c", 41714, 41957, 243, "2a54fd0c3166b9ff81903d5f045867c95aee30097262050a8c613180ae177e94"],
      "tasks.AnimTask_ShakeMon": ["src/battle_anim_mon_movement.c", 2961, 3637, 676, "d21e28967d7676d3b8698949946c06f544f72fd927458b105d8de77d3abff611"],
      "tasks.AnimTask_ShakeMon_Step": ["src/battle_anim_mon_movement.c", 3639, 4549, 910, "ba68bafa85e4896e8eb8f7e4ab1d996e0b31cdcf9a554f0f793d18ef02320482"],
      "tasks.Task_FadeToBg": ["src/battle_anim.c", 32085, 32901, 816, "db2b82fe2f787726436b24836384f134ab8f3513b3673e4f0155b4081c59930b"],
      "tasks.Task_UpdateMonBg": ["src/battle_anim.c", 22948, 23864, 916, "e78a322e6efeec6868dbdddf30ae9835f5d5489b955d0c80b425e587d3a90e47"],
      "tasks.Task_ClearMonBg": ["src/battle_anim.c", 24997, 25810, 813, "64f22026587fab61b9eddef01acbd25f99e8a10ca4b5493846af549601f2186e"],
    };
    for (const [path, [sourcePath, start, endExclusive, byteLength, sha256]] of Object.entries(spans)) {
      const value = path.split(".").reduce((record: Json, key) => record[key], audit.dependencies);
      expect(value).toMatchObject({ path: sourcePath, start, endExclusive, byteLength, sha256 });
    }

    expect(audit.carrierCensus).toMatchObject({
      level50IndexRange: { first: 110, last: 849 }, count: 11,
      lowestLegal: {
        setId: 480, frontierMon: "FRONTIER_MON_BRELOOM_2",
        species: "SPECIES_BRELOOM",
        moves: ["MOVE_GIGA_DRAIN", "MOVE_LEECH_SEED", "MOVE_FOCUS_PUNCH", "MOVE_SPORE"],
      },
    });
    expect(audit.carrierCensus.carriers.map((carrier: Json) => ({
      setId: carrier.setId, frontierMon: carrier.frontierMon,
      species: carrier.species, moves: carrier.moves,
    }))).toEqual([
      { setId: 480, frontierMon: "FRONTIER_MON_BRELOOM_2", species: "SPECIES_BRELOOM", moves: ["MOVE_GIGA_DRAIN", "MOVE_LEECH_SEED", "MOVE_FOCUS_PUNCH", "MOVE_SPORE"] },
      { setId: 498, frontierMon: "FRONTIER_MON_GOLEM_2", species: "SPECIES_GOLEM", moves: ["MOVE_FOCUS_PUNCH", "MOVE_SUBSTITUTE", "MOVE_DOUBLE_TEAM", "MOVE_REST"] },
      { setId: 503, frontierMon: "FRONTIER_MON_ELECTABUZZ_2", species: "SPECIES_ELECTABUZZ", moves: ["MOVE_THUNDER", "MOVE_RAIN_DANCE", "MOVE_ATTRACT", "MOVE_FOCUS_PUNCH"] },
      { setId: 507, frontierMon: "FRONTIER_MON_MILTANK_2", species: "SPECIES_MILTANK", moves: ["MOVE_FOCUS_PUNCH", "MOVE_SHADOW_BALL", "MOVE_ATTRACT", "MOVE_THUNDER_WAVE"] },
      { setId: 518, frontierMon: "FRONTIER_MON_AMPHAROS_2", species: "SPECIES_AMPHAROS", moves: ["MOVE_THUNDER_PUNCH", "MOVE_FIRE_PUNCH", "MOVE_FOCUS_PUNCH", "MOVE_THUNDER_WAVE"] },
      { setId: 546, frontierMon: "FRONTIER_MON_AGGRON_2", species: "SPECIES_AGGRON", moves: ["MOVE_FOCUS_PUNCH", "MOVE_EARTHQUAKE", "MOVE_ROCK_SLIDE", "MOVE_THUNDER_WAVE"] },
      { setId: 574, frontierMon: "FRONTIER_MON_BRELOOM_3", species: "SPECIES_BRELOOM", moves: ["MOVE_IRON_TAIL", "MOVE_FOCUS_PUNCH", "MOVE_ATTRACT", "MOVE_SPORE"] },
      { setId: 670, frontierMon: "FRONTIER_MON_BRELOOM_4", species: "SPECIES_BRELOOM", moves: ["MOVE_FOCUS_PUNCH", "MOVE_SLUDGE_BOMB", "MOVE_SPORE", "MOVE_DOUBLE_TEAM"] },
      { setId: 810, frontierMon: "FRONTIER_MON_MACHAMP_7", species: "SPECIES_MACHAMP", moves: ["MOVE_FOCUS_PUNCH", "MOVE_SUBSTITUTE", "MOVE_ATTRACT", "MOVE_DOUBLE_TEAM"] },
      { setId: 836, frontierMon: "FRONTIER_MON_REGIROCK_5", species: "SPECIES_REGIROCK", moves: ["MOVE_HYPER_BEAM", "MOVE_FOCUS_PUNCH", "MOVE_ROCK_SLIDE", "MOVE_DOUBLE_TEAM"] },
      { setId: 840, frontierMon: "FRONTIER_MON_REGISTEEL_5", species: "SPECIES_REGISTEEL", moves: ["MOVE_FOCUS_PUNCH", "MOVE_SUBSTITUTE", "MOVE_TOXIC", "MOVE_DOUBLE_TEAM"] },
    ]);
  });

  it.each(stages)("validates the %s complete, party-only, transient-free legal stage", (
    _orientation, path, attackerSide, targetSide, playerSetIds, opponentSetIds,
  ) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 2, battleNum: 2, trainerId: 110, playerSetIds, opponentSetIds,
    });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.overrides).not.toHaveProperty("battlers");
    for (const side of ["player", "opponent"] as const) {
      expect(stage.overrides.parties[side]).toHaveLength(3);
      for (const mon of stage.overrides.parties[side]) {
        expect(Object.keys(mon).sort()).toEqual([...completePartyKeys].sort());
        expect(mon.level).toBe(50);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        for (const transient of [
          "hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile",
        ]) expect(mon).not.toHaveProperty(transient);
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({
      species: 307, level: 50, nature: 6, moves: [264, 264, 264, 264],
      item: 179, abilitySlot: 0, friendship: 70, gender: "male", shiny: false,
      evs: { hp: 0, attack: 0, defense: 0, speed: 255, spAttack: 255, spDefense: 0 },
    });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({
      species: 121, level: 50, nature: 0, moves: [113, 113, 113, 113],
      item: 0, abilitySlot: 0, friendship: 70, gender: "genderless", shiny: false,
    });
    expect(stage.trace).toEqual({
      segments: [
        { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
      ],
    });
    expect(stage.trace).not.toHaveProperty("captureFrames");
  });

  it("validates the material altered-species/geometry party-only control", () => {
    const path = "tools/battle-lab/mechanic-focus-punch-player-breloom-opponent-staryu.json";
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.overrides.parties.player).toHaveLength(3);
    expect(stage.overrides.parties.opponent).toHaveLength(3);
    expect(stage.overrides.parties.player[0]).toMatchObject({
      species: 307, moves: [264, 264, 264, 264], gender: "male",
    });
    expect(stage.overrides.parties.opponent[0]).toMatchObject({
      species: 120, moves: [113, 113, 113, 113], gender: "genderless",
    });
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual([...completePartyKeys].sort());
      }
    }
  });

  it("retains the original compact Scene-ON branch/window receipt and records later independent Focus Punch acceptance", () => {
    const receipt = JSON.parse(readFileSync(
      resolve(root, "tools/compare/fixtures/focus-punch-staging-receipt.json"), "utf8",
    )) as Json;
    expect(receipt).toMatchObject({
      schema: "focus-punch-compact-staging-receipt/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_FOCUS_PUNCH",
      moveId: 264,
      status: "unsupported-source-staging-checkpoint",
      coverageCredit: false,
      sourceAudit: {
        outputSha256: "fc7fa149d20a2f7aa527a1fe6539b60c8407807900bd8052756be19ec2851ff9",
        root: {
          elf: ["0x82d5a07", "0x82d5ace"], romByteLength: 199,
          romSha256: "65b5c33127f2be16a6522f572c9ee49d5b86c1bcb06376a4577aceabd1e36abd",
        },
        carrierCensus: {
          count: 11, lowestLegal: { setId: 480, name: "FRONTIER_MON_BRELOOM_2" },
          setIds: [480, 498, 503, 507, 518, 546, 574, 670, 810, 836, 840],
        },
      },
      probe: {
        freshRunsPerOrientation: 2, serial: true, sampledEveryFrame: true,
        retainedFramebuffers: false, retainedDenseWindow: false,
      },
      scope: {
        partiesOnly: true, transientOverrides: [], latchMeasurement: false,
        productionReducerOrSeam: false, framebufferAcceptance: false,
        coveragePromotion: false,
      },
    });
    const expected: Record<string, Json> = {
      playerBack: {
        scenarioSha256: "98ec7bff44b7358adb4c92947b3efdc8f9664c64648eb8b543822badb19c4135",
        repeatOutputSha256: "c830b9578ae49952aff0410172f1592c831a262302a6717bdf208729d2b040fb",
        attacker: { side: "player", species: 307, carrierSetId: 480, ppSpent: 1, undamaged: true },
        target: { side: "opponent", species: 121, hp: [135, 66], lightScreenTurns: 4 },
        branch: { label: "FocusPunchOnOpponent", targetBackgroundId: 4, contestBranchObserved: false, returnArg: 0 },
        window: { startFrame: 535, lastActiveFrame: 688, firstInactiveFrame: 689, activeFrameCount: 154, throughFirstInactiveCleanup: true },
      },
      opponentFront: {
        scenarioSha256: "d34762995783402c5a118044c22030d671339f3a42f93e59c21260a9963c3fe4",
        repeatOutputSha256: "a9b3695d459e08455be63639462eccadd61513fabeb627a4a841914fde8020e4",
        attacker: { side: "opponent", species: 307, carrierSetId: 480, ppSpent: 1, undamaged: true },
        target: { side: "player", species: 121, hp: [135, 71], lightScreenTurns: 4 },
        branch: { label: "FocusPunchOnPlayer", targetBackgroundId: 5, contestBranchObserved: false, returnArg: 1 },
        window: { startFrame: 540, lastActiveFrame: 692, firstInactiveFrame: 693, activeFrameCount: 153, throughFirstInactiveCleanup: true },
      },
    };
    for (const [orientation, values] of Object.entries(expected)) {
      expect(receipt.orientations[orientation]).toMatchObject({
        ...values, benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true },
      });
      expect(receipt.orientations[orientation].window.firstInactiveFrame)
        .toBe(receipt.orientations[orientation].window.lastActiveFrame + 1);
    }

    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(250);
    expect(coverage.entries.filter((entry: Json) => entry.status === "exact")).toHaveLength(250);
    const focusPunch = coverage.entries.find((entry: Json) => entry.move === "MOVE_FOCUS_PUNCH");
    expect(focusPunch).toMatchObject({ status: "exact" });
    expect(focusPunch.covered.join(" ")).toContain("155/155");
    expect(focusPunch.covered.join(" ")).toContain("154/154");
    expect(focusPunch.covered.join(" ")).toContain("STARYU");
    expect(focusPunch.evidence).toEqual(expect.arrayContaining([
      "tools/compare/focusPunchPortable.ts",
      "src/animation/focusPunch.ts",
      "src/engine/battleScene.ts",
    ]));
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SOLAR_BEAM")).toMatchObject({ status: "exact" });
    for (const move of ["MOVE_HYPER_FANG", "MOVE_MEGA_PUNCH", "MOVE_MEGA_KICK", "MOVE_FOCUS_ENERGY", "MOVE_ENDURE"]) {
      expect(coverage.entries.find((entry: Json) => entry.move === move)).toMatchObject({ status: "exact" });
    }
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "contest-target-side-impact-bg");
    expect(track.fulfilled).toBe(true);
    expect(track.goal).toContain("MOVE_FOCUS_PUNCH independently proves");
    expect(track.goal).toContain("MOVE_SOLAR_BEAM independently closes its retained 108-row setup and 160-row unleash bodies");
    expect(JSON.stringify(coverage.entries.find((entry: Json) => entry.move === "MOVE_FOCUS_ENERGY"))).not.toContain("HyperVoiceEffect");
    expect(JSON.stringify(coverage.entries.find((entry: Json) => entry.move === "MOVE_ENDURE"))).not.toContain("HyperVoiceEffect");
  });
});
