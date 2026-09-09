import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/hyperBeamSourceAudit.ts"], { encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const root = resolve(import.meta.dirname, "../..");
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

describe("MOVE_HYPER_BEAM source/classification checkpoint", () => {
  it("byte-pins every pointer-owned source block and the complete generated graph", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_HYPER_BEAM", moveId: 63, status: "exact",
      sourceBounds: {
        start: "0x82d4d70", endExclusive: "0x82d4eb2", byteLength: 322,
        romSha256: "2f6089be2a4da2aaf1f0168a1f38715deb712e214070e2ce8260d1b7123f60ce",
        sourceByteLength: 1662,
        sourceSha256: "23fcfaff142e4d12b5cd5c261d3dd98780bd032f5b64daa85787b528f41f2b4f",
      },
      pointerOwned: {
        root: { symbol: "Move_HYPER_BEAM", start: "0x82d4d70", endExclusive: "0x82d4ea1" },
        subroutine: { symbol: "HyperBeamOrbs", start: "0x82d4ea1", endExclusive: "0x82d4eb2" },
      },
      graph: {
        blocks: ["Move_HYPER_BEAM", "HyperBeamOrbs"],
        components: [
          "asset:ANIM_TAG_ORBS", "soundTask:SoundTask_LoopSEAdjustPanning", "subroutine:HyperBeamOrbs",
          "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ShakeMon", "task:AnimTask_ShakeMon2",
          "visualCommand:create_hyper_beam_orb_sprite", "visualCommand:flash_anim_tag_with_color", "visualCommand:simple_palette_blend",
        ],
      },
    });
  });

  it("pins every command, all 26 orb groups, callbacks, resources, palettes, audio, and cleanup", () => {
    expect(audit()).toMatchObject({
      commands: { loadspritegfx: 1, simple_palette_blend: 2, waitforvisualfinish: 3, delay: 3, playsewithpan: 1, createvisualtask: 5, createsoundtask: 1, flash_anim_tag_with_color: 1, call: 26, create_hyper_beam_orb_sprite: 2, end: 1, return: 1 },
      dispatch: {
        blackout: ["F_PAL_BG", 4, 0, 16, "RGB_BLACK"], restore: ["F_PAL_BG", 4, 16, 0, "RGB_BLACK"],
        attackerShake2: ["ANIM_ATTACKER", 1, 0, 4, 1], attackerShake: ["ANIM_ATTACKER", 0, 4, 50, 1], targetShake2: ["ANIM_TARGET", 4, 0, 50, 1],
        targetBlendForward: ["F_PAL_TARGET", 2, 0, 11, "RGB(25, 25, 25)"], targetBlendReverse: ["F_PAL_TARGET", 2, 11, 0, "RGB(25, 25, 25)"],
        hyperBeamOrbs: { groups: 26, groupsBeforeTargetShake: 5, groupsAfterTargetShake: 21, orbsPerGroup: 2, totalOrbs: 52 },
      },
      assets: { tag: "ANIM_TAG_ORBS", tileBytes: 0x180, palette: "gBattleAnimSpritePal_Orbs", template: "gHyperBeamOrbSpriteTemplate", oam: "gOamData_AffineOff_ObjNormal_8x8", anims: "gSolarBeamBigOrbAnimTable" },
      palette: { flash: ["ANIM_TAG_ORBS", 1, 12, "RGB_RED", 16, "RGB_BLACK", 0], targetBlend: ["F_PAL_TARGET", 2, 0, 11, "RGB(25, 25, 25)", 11, 0] },
      audio: { initial: ["SE_M_HYPER_BEAM", "SOUND_PAN_ATTACKER"], loop: ["SE_M_HYPER_BEAM2", "SOUND_PAN_ATTACKER", "SOUND_PAN_TARGET", 1, 15, 0, 5] },
    });
  });

  it("derives the complete Level-50 census and excludes Open-only carriers", () => {
    expect(audit().carrier).toEqual({
      lowestLevel50Set: 531, frontierMon: "FRONTIER_MON_AERODACTYL_2", speciesId: 142, itemId: 186, nature: "NATURE_ADAMANT",
      allLevel50Sets: [531, 805, 826, 836], allInventorySets: [531, 805, 826, 836, 852, 853], excludedOpenOnly: [852, 853],
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-hyper-beam-player-aerodactyl-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-hyper-beam-opponent-aerodactyl-player-onix.json", false],
  ])("keeps the %s party stage complete, transient-free, and choice-constrained", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined(); expect(validated.status).toBe(0);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 4, trainerId: 140 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(target).toHaveLength(3);
    for (const mon of [...attacker, ...target]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker[0]).toMatchObject({ species: 142, level: 50, nature: 3, moves: [63, 63, 63, 63], item: 186 });
    expect(target[0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });

  it("keeps the exact shared controls independently accepted", () => {
    const componentGraph = JSON.parse(readFileSync("src/data/gen/battle-animation-components.json", "utf8"));
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries).toHaveLength(244);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_HYPER_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_AURORA_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_PSYBEAM")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_THUNDERBOLT")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((entry: { id: string }) => entry.id === "hyper-beam-orbs-blackout")).toMatchObject({ representatives: ["MOVE_HYPER_BEAM"], fulfilled: true });
    for (const move of ["MOVE_AURORA_BEAM", "MOVE_PSYBEAM"]) {
      expect(componentGraph.moves.find((entry: { move: string }) => entry.move === move)?.componentIds).toContain("soundTask:SoundTask_LoopSEAdjustPanning");
    }
    expect(componentGraph.moves.find((entry: { move: string }) => entry.move === "MOVE_THUNDERBOLT")?.componentIds).toEqual([
      "asset:ANIM_TAG_SHOCK_3", "asset:ANIM_TAG_SPARK", "asset:ANIM_TAG_SPARK_2", "sprite:gElectricitySpriteTemplate", "sprite:gSparkElectricityFlashingSpriteTemplate", "sprite:gThunderboltOrbSpriteTemplate", "subroutine:ElectricityEffect", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ElectricBolt",
    ]);
  });
});
