import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
let cached: Json | undefined;
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/uproarSourceAudit.ts"], { cwd: root, encoding: "utf8" });
const audit = (): Json => cached ??= JSON.parse(auditText());
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

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
    "import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_UPROAR authoritative source and legal staging checkpoint", () => {
  it("is byte-identical across two source-only audit runs and pins the complete ELF/ROM script interval", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(JSON.parse(first)).toMatchObject({
      move: "MOVE_UPROAR", moveId: 253, status: "exact", coverageCredit: true,
      source: {
        start: "0x082cdafc", endExclusive: "0x082cdbc6", byteLength: 202,
        romSha256: "650c484ddc250b89e303ff4d2cab7639b35b780317c8247c0810435d9f2f1dd0",
        sourceByteLength: 1182,
        sourceSha256: "34fe247c02011ff9af0c9ef77b5e868af041933ba1a9d16f25acd60fface0958",
        commandRows: 23,
        pointerContract: "half-open ELF script interval starts at Move_UPROAR and stops exactly at the next dispatch label Move_HEAT_WAVE; the root has no local branch, call, return, or pointer-owned subroutine label",
      },
      graph: {
        blocks: ["Move_UPROAR"],
        components: [
          "asset:ANIM_TAG_JAGGED_MUSIC_NOTE", "asset:ANIM_TAG_THIN_RING",
          "sprite:gJaggedMusicNoteSpriteTemplate", "sprite:gUproarRingSpriteTemplate",
          "task:AnimTask_UproarDistortion", "visualCommand:clearmonbg", "visualCommand:monbg",
        ],
      },
      controlFlow: { root: { branches: [], calls: [], returns: [], pulses: 3, delays: [16, 16] } },
    });
  });

  it("pins every root command, linked task/callback branch, asset, audio, resource, and cleanup dependency", () => {
    const result = audit();
    expect(result.commands).toEqual([
      "loadspritegfx ANIM_TAG_JAGGED_MUSIC_NOTE", "loadspritegfx ANIM_TAG_THIN_RING", "monbg ANIM_DEF_PARTNER",
      "createvisualtask AnimTask_UproarDistortion, 2, 0",
      "createsprite gUproarRingSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 0, 31, 8",
      "playsewithpan SE_M_UPROAR, SOUND_PAN_ATTACKER",
      "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, 29, -12, 0",
      "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, -12, -29, 1",
      "delay 16", "createvisualtask AnimTask_UproarDistortion, 2, 0",
      "createsprite gUproarRingSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 0, 31, 8",
      "playsewithpan SE_M_UPROAR, SOUND_PAN_ATTACKER",
      "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, 12, -29, 1",
      "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, -29, -12, 0",
      "delay 16", "createvisualtask AnimTask_UproarDistortion, 2, 0",
      "createsprite gUproarRingSpriteTemplate, ANIM_ATTACKER, 3, 0, 0, 0, 0, 31, 8",
      "playsewithpan SE_M_UPROAR, SOUND_PAN_ATTACKER",
      "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, 24, -24, 1",
      "createsprite gJaggedMusicNoteSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, -24, 0",
      "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "end",
    ]);
    expect(result.resources).toEqual({
      thinRing: {
        tag: "ANIM_TAG_THIN_RING", tagValue: 10203, tileBytes: 2048,
        gfx: { start: "0x08c22234", endExclusive: "0x08c223e0", byteLength: 428, romSha256: "e7d6945594e8f1bf50c324a5be3754c4ddcdc5c85b5cb81f7c9b7a8d2e63e0dd" },
        palette: { start: "0x08c223e0", endExclusive: "0x08c22404", byteLength: 36, romSha256: "291e6ed30c91b23ef7ecf300b8906ba5d0fcb176f02e2c5d9b2f4f7aa33d5a0a" },
        template: { start: "0x08593898", endExclusive: "0x085938b0", byteLength: 24, romSha256: "f8bf367541779e32e6e1a5d5c0a49339c13c5698946e5d929c1a4e97313204e3" },
        affineTable: { start: "0x08593810", endExclusive: "0x08593818", byteLength: 8, romSha256: "96ae74330b7567661748621e3cd4b113b23b481efaebe103a78c5dff0437460f" },
        selectedAffine: { start: "0x085937e0", endExclusive: "0x085937f8", byteLength: 24, romSha256: "64626e50de3b2be38b60ba602abc9092d6ac729b55bc0b9ff7e5761dd32072ff" },
        oam: "gOamData_AffineDouble_ObjBlend_64x64",
      },
      jaggedMusicNote: {
        tag: "ANIM_TAG_JAGGED_MUSIC_NOTE", tagValue: 10225, tileBytes: 1024,
        gfx: { start: "0x08c27764", endExclusive: "0x08c278e8", byteLength: 388, romSha256: "35b47e714e890bd01004b2c491e546565771ee5df341ce870e08c572714bf728" },
        palette: { start: "0x08c278e8", endExclusive: "0x08c27910", byteLength: 40, romSha256: "d90073592df7950d05921fbc4234a7cd5a53652906799b728e19d440cf8ecd3c" },
        template: { start: "0x08593bb8", endExclusive: "0x08593bd0", byteLength: 24, romSha256: "9a6d05519edcaf99ae6009a4c397a873982fb4513a48fa0840b9fcf66fce10e9" },
        oam: "gOamData_AffineOff_ObjNormal_32x32",
      },
    });
    expect(result.callbacks).toEqual({
      AnimTask_UproarDistortion: { start: "0x08106d90", endExclusive: "0x08106dd4", byteLength: 68, romSha256: "e252d1c54910e679207d01f8dca36ec8aab342af26c649e4aaf4241b058e94d6" },
      AnimTask_UproarDistortion_Step: { start: "0x08106dd4", endExclusive: "0x08106e00", byteLength: 44, romSha256: "1a5aab64769a86de02377c59fd4ac3215e2b68897d8650df3c48cfd34db74477" },
      sAffineAnims_UproarDistortion: { start: "0x08593b98", endExclusive: "0x08593bb8", byteLength: 32, romSha256: "38d8c550196055a0525a2f4e73400d9d0932a0bdf66b93ea683cbdea4f77e839" },
      PrepareAffineAnimInTaskData: { start: "0x080a7cfc", endExclusive: "0x080a7d34", byteLength: 56, romSha256: "27691a84955797e91240bafc419f6a7ccace51d88f0179f71a7d8f60e0192fc9" },
      RunAffineAnimFromTaskData: { start: "0x080a7d34", endExclusive: "0x080a7e6a", byteLength: 310, romSha256: "1cbb7f369507eaeae6f4db0c0df411c3d1fa4758e6211efeedfdfbef946bfbed" },
      AnimUproarRing: { start: "0x081054e8", endExclusive: "0x08105538", byteLength: 80, romSha256: "ecc64aaba78de2fe6bd136532923017bb3b9f4c2fce0fd4634c87aa3cb5608fa" },
      AnimSpriteOnMonPos: { start: "0x080a77c8", endExclusive: "0x080a7820", byteLength: 88, romSha256: "4499c813dbfd75cbef473750a24fd3c4ab72b8a69af1c0d47b272633d780f036" },
      AnimJaggedMusicNote: { start: "0x08106e00", endExclusive: "0x08106ec8", byteLength: 200, romSha256: "3002da06ded4ed3b0890d8712f83abb8438c2afca7804bc9b8340a6f58fbf452" },
      AnimJaggedMusicNote_Step: { start: "0x08106ec8", endExclusive: "0x08106f00", byteLength: 56, romSha256: "061f25a119e508a7742e9bfd084995cd63377539f7b2728083db58e1f5704ee8" },
      DestroyAnimSprite: { start: "0x080a3bfc", endExclusive: "0x080a3c1c", byteLength: 32, romSha256: "0091976a9f39b4de3157011fbf4f0140713a42d177d4227726c3f1e536fb8fe6" },
      DestroyAnimVisualTask: { start: "0x080a3c1c", endExclusive: "0x080a3c38", byteLength: 28, romSha256: "7a15376984e9f5be2039329a51b466c5d4d5ea1486be304df5bf96a617428b23" },
    });
    expect(result.behavior).toMatchObject({
      distortion: { task: "AnimTask_UproarDistortion", attackerSelector: 0, affineFrames: [[-12, 8, 0, 4], [20, -20, 0, 4], [-8, 12, 0, 4]] },
      ring: { args: [0, 0, 0, 0, 31, 8] },
      notes: { count: 6 },
      background: { command: "monbg ANIM_DEF_PARTNER", cleanup: "clearmonbg ANIM_DEF_PARTNER" },
      audio: { command: "playsewithpan", sound: "SE_M_UPROAR", id: 241, pan: "SOUND_PAN_ATTACKER", pulses: 3 },
      resourceLifetime: { explicitUnload: false },
    });
  });

  it("derives the complete one-set Level-50 carrier census and lowest legal carrier from generated data", () => {
    const carriers = audit().carriers;
    expect(carriers).toMatchObject({ level50Range: { first: 110, last: 849 }, setCount: 1, speciesCount: 1 });
    expect(carriers.all).toEqual([{
      index: 221, label: "FRONTIER_MON_VIGOROTH_1", species: "SPECIES_VIGOROTH",
      moves: ["MOVE_SLASH", "MOVE_COUNTER", "MOVE_ENCORE", "MOVE_UPROAR"],
      itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_LONELY",
      evSpreadStats: ["F_EV_SPREAD_ATTACK", "F_EV_SPREAD_HP"],
    }]);
    expect(carriers.lowest).toMatchObject({ index: 221, label: "FRONTIER_MON_VIGOROTH_1", species: "SPECIES_VIGOROTH" });
    expect(carriers.lowestLegalRoute).toEqual({ challengeNum: 1, level50Range: [162, 266], trainerId: 80, regularTrainerRange: [80, 119] });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-uproar-player-vigoroth-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-uproar-opponent-vigoroth-player-onix.json", false],
  ])("validates the %s complete legal transient-free party-only Uproar stage", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 1, battleNum: 0, trainerId: 80,
      playerSetIds: playerAttacker ? [255, 256, 259] : [260, 261, 262],
      opponentSetIds: playerAttacker ? [260, 261, 262] : [255, 256, 259],
      seed: playerAttacker ? 305420253 : 305420254,
    });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).toEqual({ segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
    ] });
    expect(stage).not.toHaveProperty("preCheckpointCaptureFrames");
    expect(stage).not.toHaveProperty("captureFrames");
    expect(stage.overrides).not.toHaveProperty("battlers");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      expect(new Set(party.map((mon) => mon.item)).size).toBe(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    const attacker = playerAttacker ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    const passive = playerAttacker ? stage.overrides.parties.opponent[0] : stage.overrides.parties.player[0];
    expect(attacker).toMatchObject({ species: 365, level: 50, nature: 1, moves: [253, 253, 253, 253], item: 196, abilitySlot: 0, friendship: 70, gender: "male", shiny: false });
    expect(passive.moves).toEqual([33, 33, 33, 33]);
  });

  it("promotes only Uproar after its independent production and latch gates", () => {
    expect(audit().checkpoint).toEqual({
      sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, productionChanged: true,
      coveragePromotion: true, componentTrackCredit: false, latchPromotion: true, unsupportedNoCreditBoundary: false,
    });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_UPROAR")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual([]);
    expect(coverage.componentTracks.filter((track: Json) => track.moves?.includes("MOVE_UPROAR"))).toEqual([]);
  });
});
