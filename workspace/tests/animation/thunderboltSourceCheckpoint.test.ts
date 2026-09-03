import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const audit = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/thunderboltSourceAudit.ts",
], { encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

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

describe("MOVE_THUNDERBOLT source/classification checkpoint", () => {
  it("byte-pins the exclusive root, shared pointer-owned subroutine, and generated nine-component graph", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_THUNDERBOLT", moveId: 85, status: "exact",
      pointerOwned: {
        root: {
          symbol: "Move_THUNDERBOLT", start: "0x82ca40a", endExclusive: "0x82ca5c0", byteLength: 438,
          romSha256: "ca15d4b50d2497386adf8bc20d9c5d18b7cac1548c9e22c598af7f662904016f",
          sourceByteLength: 2344, sourceSha256: "7968c51a5ede726a575865fb70a529998721ef534807c2bd0dde454273cf705a",
        },
        subroutine: {
          symbol: "ElectricityEffect", start: "0x82d7bea", endExclusive: "0x82d7c75", byteLength: 139,
          romSha256: "f26be8a47153d4d67aff5a54063a070dbdf84b497c94f80531519c9eef614245",
          sourceByteLength: 708, sourceSha256: "0b2bb54bb5f380502bda828532a7a36b44443d36f26aa681bebe156f4157630a",
        },
        combined: {
          byteLength: 577, romSha256: "d62d2642438bcacaf4159a43026f3b6152a883dc1a626b2c4a5c9dd6c0bce899",
          sourceByteLength: 3052, sourceSha256: "2b9c71d42def7d0ca6a46dafc265f054649fb241ecabf8e872a45b7d833fa910",
        },
      },
      graph: {
        blocks: ["Move_THUNDERBOLT", "ElectricityEffect"],
        components: [
          "asset:ANIM_TAG_SHOCK_3", "asset:ANIM_TAG_SPARK", "asset:ANIM_TAG_SPARK_2",
          "sprite:gElectricitySpriteTemplate", "sprite:gSparkElectricityFlashingSpriteTemplate",
          "sprite:gThunderboltOrbSpriteTemplate", "subroutine:ElectricityEffect",
          "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ElectricBolt",
        ],
      },
    });
  });

  it("pins commands, callback-owned visuals, assets, tasks, palette phases, audio, and cleanup", () => {
    expect(audit()).toMatchObject({
      commands: {
        root: { loadspritegfx: 3, createvisualtask: 11, waitforvisualfinish: 6, delay: 11, playsewithpan: 4, createsprite: 9, waitplaysewithpan: 1, call: 1, end: 1 },
        electricityEffect: { playsewithpan: 1, createsprite: 8, delay: 7, return: 1 },
      },
      dispatch: {
        assets: ["ANIM_TAG_SPARK", "ANIM_TAG_SHOCK_3", "ANIM_TAG_SPARK_2"],
        electricBolts: [[24, -52, 0], [-24, -52, 0], [0, -60, 1]], targetPalette: [[0, 13], [13, 0]],
        backgroundPalette: [[0, 6], [2, 2], [6, 6], [2, 2], [6, 6], [6, 0]],
        orb: { count: 1, args: [44, 0, 0, 3] },
        flashingSparks: { count: 8, radii: [32, 32, 32, 32, 16, 16, 16, 16], phase: [0, 64, 128, 192, 32, 96, 160, 224], tileVariants: [0, 1, 0, 2, 0, 1, 0, 2], targetFlag: -32765 },
        electricityArcs: { count: 8, offsets: [[5, 0, 0], [-5, 10, 1], [15, 20, 2], [-15, -10, 0], [25, 0, 1], [-8, 8, 2], [2, -8, 0], [-20, 15, 1]], lifetime: 5 },
      },
      assets: {
        spark: { tileBytes: 0x300, palette: "gBattleAnimSpritePal_Spark", boltTemplate: "gElectricBoltSegmentSpriteTemplate", oam: "gOamData_AffineOff_ObjNormal_8x8" },
        spark2: { tileBytes: 0x180, palette: "gBattleAnimSpritePal_Spark2", flashingTemplate: "gSparkElectricityFlashingSpriteTemplate", electricityTemplate: "gElectricitySpriteTemplate" },
        shock3: { tileBytes: 0x600, palette: "gBattleAnimSpritePal_Shock3", orbTemplate: "gThunderboltOrbSpriteTemplate", oam: "gOamData_AffineNormal_ObjNormal_32x32" },
      },
      audio: {
        bolt: ["SE_M_THUNDERBOLT", "SOUND_PAN_TARGET", 3], impact: ["SE_M_HYPER_BEAM", "SOUND_PAN_TARGET"],
        completion: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET", 19], electricity: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET"],
      },
    });
  });

  it("derives the complete carrier census including the Open-only distinction", () => {
    expect(audit().carrier).toEqual({
      lowestLevel50Set: 267, frontierMon: "FRONTIER_MON_DELCATTY_2", speciesId: 316, itemId: 183, nature: "NATURE_MODEST",
      allLevel50Sets: [267, 277, 278, 291, 292, 309, 391, 393, 396, 407, 443, 474, 479, 487, 539, 555, 572, 581, 585, 588, 597, 598, 599, 605, 612, 613, 614, 631, 635, 662, 668, 669, 679, 681, 684, 695, 696, 710, 724, 725, 727, 731, 744, 755, 757, 759, 763, 765, 766, 775, 776, 777, 779, 781, 785, 787, 788, 790, 792, 799, 800, 801, 802, 803, 813, 819, 820, 839],
      allInventorySets: [267, 277, 278, 291, 292, 309, 391, 393, 396, 407, 443, 474, 479, 487, 539, 555, 572, 581, 585, 588, 597, 598, 599, 605, 612, 613, 614, 631, 635, 662, 668, 669, 679, 681, 684, 695, 696, 710, 724, 725, 727, 731, 744, 755, 757, 759, 763, 765, 766, 775, 776, 777, 779, 781, 785, 787, 788, 790, 792, 799, 800, 801, 802, 803, 813, 819, 820, 839, 855, 856, 860, 861, 863, 872, 876, 877],
      excludedOpenOnly: [855, 856, 860, 861, 863, 872, 876, 877],
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-thunderbolt-player-delcatty-opponent-shuckle.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-thunderbolt-opponent-delcatty-player-shuckle.json", false],
  ])("keeps the %s party stage complete, transient-free, and naturally Thunderbolt-constrained", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined(); expect(validated.status).toBe(0);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, trainerId: 110 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace.captureFrames).toEqual([0, 112, 160, 934]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(target).toHaveLength(3);
    for (const mon of [...attacker, ...target]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker[0]).toMatchObject({ species: 316, level: 50, nature: 15, moves: [85, 85, 85, 85], item: 183 });
    expect(target[0]).toMatchObject({ species: 213, level: 50, moves: [33, 33, 33, 33] });
  });

  it("keeps exact sibling controls independent and fulfills the track only after each representative", () => {
    const result = audit();
    expect(result.siblings).toEqual([
      { move: "MOVE_SPARK", status: "exact", blocks: ["Move_SPARK", "ElectricityEffect"] },
      { move: "MOVE_THUNDER_WAVE", status: "exact", blocks: ["Move_THUNDER_WAVE"] },
      { move: "MOVE_ZAP_CANNON", status: "exact", blocks: ["Move_ZAP_CANNON", "ElectricityEffect"] },
      { move: "MOVE_SHOCK_WAVE", status: "unsupported", blocks: ["Move_SHOCK_WAVE"] },
    ]);
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries).toHaveLength(229);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_THUNDERBOLT"))
      .toMatchObject({ status: "exact" });
    const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "spark-2-electricity");
    expect(track).toMatchObject({ representatives: ["MOVE_SPARK", "MOVE_THUNDERBOLT", "MOVE_THUNDER_WAVE", "MOVE_ZAP_CANNON"] });
    expect(track.fulfilled).toBe(true);
  });
});
