import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sourceAudit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/zapCannonSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const stages = [
  ["player-back", "tools/battle-lab/mechanic-zap-cannon-player-forretress-opponent-shuckle.json", [277, 276, 275], [349, 339, 327]],
  ["opponent-front", "tools/battle-lab/mechanic-zap-cannon-opponent-forretress-player-shuckle.json", [349, 339, 327], [277, 276, 275]],
] as const;

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

describe("MOVE_ZAP_CANNON authoritative source and legal staging checkpoint", () => {
  it("pins the exclusive source interval, shared ElectricityEffect, graph, assets, and all controls", () => {
    expect(sourceAudit()).toMatchObject({
      move: "MOVE_ZAP_CANNON", moveId: 192, status: "unsupported",
      pointerOwned: {
        root: { symbol: "Move_ZAP_CANNON", start: "0x82d3298", endExclusive: "0x82d337d", byteLength: 229, romSha256: "ff30a37584554d149a66d53722ce184adf1d29d07807e474dd9e34e0bde652de", sourceByteLength: 1111, sourceSha256: "418959fa65972b2bb4d1b5bedfa222bf8096973219b9ef5fd5ebd39558deb587" },
        subroutine: { symbol: "ElectricityEffect", start: "0x82d7bea", endExclusive: "0x82d7c75", byteLength: 139, romSha256: "f26be8a47153d4d67aff5a54063a070dbdf84b497c94f80531519c9eef614245", sourceByteLength: 708, sourceSha256: "0b2bb54bb5f380502bda828532a7a36b44443d36f26aa681bebe156f4157630a" },
        combined: { byteLength: 368, romSha256: "72db8ae9ab53ee0144c4d863f3ae43d4645d2d3ff99a314a7a3519e26015f9c6", sourceByteLength: 1819, sourceSha256: "28e889b712da5e1b393b1694031b40278b941737e8386370b5b33253bf7e6bce" },
      },
      graph: { blocks: ["Move_ZAP_CANNON", "ElectricityEffect"], components: ["asset:ANIM_TAG_BLACK_BALL_2", "asset:ANIM_TAG_SPARK_2", "sprite:gElectricitySpriteTemplate", "sprite:gZapCannonBallSpriteTemplate", "sprite:gZapCannonSparkSpriteTemplate", "subroutine:ElectricityEffect", "task:AnimTask_ShakeMon2"] },
      dispatch: { assets: ["ANIM_TAG_BLACK_BALL_2", "ANIM_TAG_SPARK_2"], projectile: { template: "gZapCannonBallSpriteTemplate" }, orbitingSparks: { template: "gZapCannonSparkSpriteTemplate", count: 8, radii: [16, 16, 16, 16, 8, 8, 8, 8], phase: [0, 64, 128, 192, 32, 96, 160, 224], period: 40 }, targetShake: { task: "AnimTask_ShakeMon2" }, electricityArcs: { subroutine: "ElectricityEffect", count: 8, lifetime: 5 } },
      assets: { blackBall2: { tileBytes: 128, palette: "gBattleAnimSpritePal_BlackBall2", template: "gZapCannonBallSpriteTemplate", oam: "gOamData_AffineOff_ObjNormal_16x16" }, spark2: { tileBytes: 384, palette: "gBattleAnimSpritePal_Spark2", template: "gZapCannonSparkSpriteTemplate", electricityTemplate: "gElectricitySpriteTemplate" } },
      audio: { initial: ["SE_M_THUNDER_WAVE", "SOUND_PAN_ATTACKER"], completion: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET", 19], electricity: ["SE_M_THUNDERBOLT2", "SOUND_PAN_TARGET"] },
      carrier: { lowestLevel50Set: 575, frontierMon: "FRONTIER_MON_FORRETRESS_3", speciesId: 205, itemId: 196, nature: "NATURE_QUIET", allLevel50Sets: [575], allInventorySets: [575], excludedOpenOnly: [] },
    });
    expect(sourceAudit().siblings).toEqual([
      { move: "MOVE_SPARK", status: "exact", blocks: ["Move_SPARK", "ElectricityEffect"] },
      { move: "MOVE_THUNDERBOLT", status: "exact", blocks: ["Move_THUNDERBOLT", "ElectricityEffect"] },
      { move: "MOVE_THUNDER_WAVE", status: "exact", blocks: ["Move_THUNDER_WAVE"] },
      { move: "MOVE_SHOCK_WAVE", status: "unsupported", blocks: ["Move_SHOCK_WAVE"] },
      { move: "MOVE_ZAP_CANNON", status: "unsupported", blocks: ["Move_ZAP_CANNON", "ElectricityEffect"] },
    ]);
  });

  it.each(stages)("keeps the %s orientation legal, complete, and transient-free", (_side, path, playerSets, opponentSets) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = spawnSync("python3", ["-c", ["import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request", "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')"].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
    expect(validated.error).toBeUndefined(); expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110, playerSetIds: playerSets, opponentSetIds: opponentSets });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const side of ["player", "opponent"] as const) {
      expect(stage.overrides.parties[side]).toHaveLength(3);
      for (const mon of stage.overrides.parties[side]) {
        expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort());
        expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4); expect(Object.keys(mon.ivs)).toHaveLength(6); expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
    const attacker = _side === "player-back" ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    const target = _side === "player-back" ? stage.overrides.parties.opponent[0] : stage.overrides.parties.player[0];
    expect(attacker).toMatchObject({ species: 205, level: 50, nature: 17, moves: [192, 192, 192, 192], item: 196, abilitySlot: 0, gender: "male", shiny: false });
    expect(target).toMatchObject({ species: 213, level: 50, moves: [33, 33, 33, 33] });
    expect(stage.trace.captureFrames).toEqual([0, 112, 160, 934]);
  });
});
