import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/auroraBeamSourceAudit.ts"], { encoding: "utf8" }));
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

describe("MOVE_AURORA_BEAM source/classification foundation", () => {
  it("byte-pins the exclusive body and complete source component graph", () => {
    const result = audit();
    expect(result).toMatchObject({
      move: "MOVE_AURORA_BEAM", moveId: 62, status: "exact",
      sourceBounds: {
        start: "0x82d0804", endExclusive: "0x82d08d8", byteLength: 212,
        romSha256: "b178f9fa4e4b8494ed18eeb008374c90becfb6a3093d44825e1c0f3284f1633c",
        sourceByteLength: 1188,
        sourceSha256: "e782d921c01fccda6a275bae3d1fcb54216d8f6cb9e499c194240e7fbe182318",
      },
      graph: { blocks: ["Move_AURORA_BEAM", "AuroraBeamCreateRings"] },
      dispatch: { ringGroups: 10, ringsPerGroup: 4, ringsTotal: 40, paletteTaskFrames: 130, paletteRotateEvery: 3, firstShake: [1, 0, 17, 1], secondShake: [2, 0, 40, 1], arg7Gate: [0, 0xFFFF], bg: "BG_AURORA" },
      assets: { tag: "ANIM_TAG_RAINBOW_RINGS", tileBytes: 0xC0, palette: "gBattleAnimSpritePal_RainbowRings", cells: [0, 4], affine: [[0, 0, 0, 1], [0x60, 0x60, 0, 1]], oam: "gOamData_AffineDouble_ObjNormal_8x16", bgImage: "aurora.png", bgPalette: "gBattleAnimBgPalette_Aurora", bgTilemap: "aurora.bin" },
      paletteAndRegisters: { ringRotation: "faded OBJ colors 1..8 rotate left every 3 task ticks", fadeMask: "0xE8", blend: "hardware palette fade 0->16, load BG_AURORA, 16->0; restore repeats with default BG" },
      audio: { initial: "SE_M_BUBBLE_BEAM", loop: "SE_M_BUBBLE_BEAM2", loopArgs: [3, 6, 0, 10] },
      cleanup: ["DestroyAnimSprite", "DestroyAnimVisualTask", "restorebg", "waitbgfadein", "end"],
    });
    expect(result.graph.components).toHaveLength(10);
  });

  it("derives the complete Level-50 carrier census and lowest legal carrier", () => {
    expect(audit().carrier).toEqual({
      lowestLevel50Set: 219, frontierMon: "FRONTIER_MON_SEADRA_1", speciesId: 117,
      itemId: 209, nature: "NATURE_SASSY", allLevel50Sets: [219, 256, 266], excludedBelowLevel50: [73, 109],
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-aurora-beam-player-seadra-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-aurora-beam-opponent-seadra-player-onix.json", false],
  ])("keeps the %s stage complete, transient-free, and legally choice-constrained", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined(); expect(validated.status).toBe(0);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(target).toHaveLength(3);
    for (const mon of [...attacker, ...target]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker[0]).toMatchObject({ species: 117, level: 50, moves: [62, 62, 62, 62], item: 209 });
    expect(target[0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });

  it("keeps coverage and the dedicated track honest", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries).toHaveLength(252);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_AURORA_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((entry: { id: string }) => entry.id === "aurora-beam-rainbow-rings-bg")).toMatchObject({ representatives: ["MOVE_AURORA_BEAM"], fulfilled: true });
  });
});
