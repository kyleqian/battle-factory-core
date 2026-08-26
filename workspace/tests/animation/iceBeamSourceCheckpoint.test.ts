import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import crystals from "../../src/assets/gen/battle-anim-ice-crystals.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_ICE_BEAM bounded source/asset checkpoint", () => {
  it("pins both source intervals, the complete component graph, lowest Level-50 carrier, and distinct controls", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/iceBeamSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_ICE_BEAM", moveId: 58, status: "unsupported-source-asset-checkpoint",
      sourceBounds: {
        main: { start: "0x082d06c0", endExclusive: "0x082d07f7", bytes: 311, sha256: "1c5b2c5be7eb05ac6e51b5e5ecf8a822d234de534659d184f8749c16b8b9e080" },
        effect: { start: "0x082d7720", endExclusive: "0x082d77a4", bytes: 132, sha256: "3da0ca21634d29ab068ed61238f9bb3129e4403019d36dbdcf4a7f722f3e5772" },
      },
      counts: { beamGroups: 11, initialOuter: 2, terminalInner: 2, shortEffectLarge: 3, shortEffectSmall: 4 },
      asset: { tag: "ANIM_TAG_ICE_CRYSTALS", bytes: 0x01c0, largeTile: 4, smallTile: 6 },
      audio: { song: "SE_M_BUBBLE_BEAM2", songId: 183, schedule: [4, 4, 0, 10] },
      shake: { battler: "ANIM_TARGET", x: 2, y: 0, count: 25, delay: 1 },
      carrier: { setId: 267, label: "FRONTIER_MON_DELCATTY_2", species: "SPECIES_DELCATTY", moves: ["MOVE_FAKE_TEARS", "MOVE_SING", "MOVE_THUNDERBOLT", "MOVE_ICE_BEAM"] },
      controls: { ice: ["MOVE_BLIZZARD", "MOVE_ICY_WIND"], soundTask: "MOVE_PSYBEAM", siblingCredit: false },
      ownership: { reducer: false, seam: false, renderer: false, framebuffer: false, exact: false, partial: false, staged: false },
    });
    expect(audit.components).toEqual([
      "asset:ANIM_TAG_ICE_CRYSTALS", "soundTask:SoundTask_LoopSEAdjustPanning",
      "sprite:gIceBeamInnerCrystalSpriteTemplate", "sprite:gIceBeamOuterCrystalSpriteTemplate",
      "sprite:gIceCrystalHitLargeSpriteTemplate", "sprite:gIceCrystalHitSmallSpriteTemplate",
      "subroutine:IceBeamCreateCrystals", "subroutine:IceCrystalEffectShort", "task:AnimTask_ShakeMon2",
      "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha",
      "visualCommand:simple_palette_blend", "visualCommand:splitbgprio",
    ]);
  });

  it("reproduces the complete 0x01c0-byte source-composed crystal sheet byte-for-byte", () => {
    expect(crystals.tileset).toMatchObject({ columns: 2, rows: 7 });
    expect(crystals.tileset.tiles).toHaveLength(14);
    expect(crystals.palette).toHaveLength(16);
    expect(crystals.frames).toEqual({ large: { tile: 4, width: 8, height: 16 }, small: { tile: 6, width: 8, height: 8 } });
    const scratch = createScratchDir("pokebench-ice-beam-assets-");
    const output = join(scratch, "ice.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractIceBeamCrystalAssets.ts", "--out", output], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(join(root, "src/assets/gen/battle-anim-ice-crystals.json")));
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-ice-beam-player-delcatty-opponent-shuckle.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-ice-beam-opponent-delcatty-player-shuckle.json", false],
  ])("keeps the %s lowest-carrier stage complete, legal, bilateral, and capture-free", (_orientation, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(join(root, path), "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110 });
    expect(stage).not.toHaveProperty("captureFrames");
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const defender = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    for (const mon of [...attacker, ...defender]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
      expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker.every((mon: any) => mon.species === 301 && mon.moves.every((move: number) => move === 58))).toBe(true);
    expect(defender[0].species).toBe(213);
  });

  it("keeps Ice Beam unsupported and the named sibling controls independently exact", () => {
    const coverage = JSON.parse(readFileSync(join(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries.some((entry: any) => entry.move === "MOVE_ICE_BEAM")).toBe(false);
    for (const move of ["MOVE_BLIZZARD", "MOVE_ICY_WIND", "MOVE_PSYBEAM"]) {
      expect(coverage.entries.find((entry: any) => entry.move === move)?.status).toBe("exact");
    }
    expect(coverage.componentTracks.find((track: any) => track.id === "ice-beam-crystals")).toMatchObject({
      representatives: ["MOVE_ICE_BEAM"], fulfilled: false,
    });
  });
});
