import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
function auditText(): string { return execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/skyUppercutSourceAudit.ts"], { cwd: root, encoding: "utf8" }); }
function oracleDir(): string {
  let candidate = root;
  while (true) { const oracle = resolve(candidate, "oracle"); if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle; const parent = dirname(candidate); if (parent === candidate) throw new Error("pinned battle_lab.py not found"); candidate = parent; }
}
function validate(path: string) { return spawnSync("python3", ["-c", "import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom battle_lab import validate_request\nvalidate_request(json.load(open(sys.argv[2],encoding='utf-8')),'battle-scene-on')", oracleDir(), resolve(root, path)], { cwd: root, encoding: "utf8" }); }
const stages = [
  ["player-back", "tools/battle-lab/mechanic-sky-uppercut-player-hitmonchan-opponent-onix.json", "player", "opponent", 305420240],
  ["opponent-front", "tools/battle-lab/mechanic-sky-uppercut-opponent-hitmonchan-player-onix.json", "opponent", "player", 305420241],
] as const;

describe("MOVE_SKY_UPPERCUT source and legal staging checkpoint", () => {
  it("pins the complete pointer-owned source interval and exact component boundary", () => {
    const first = auditText(); expect(auditText()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("8013b9dd757536a69879b44d637c9655efab9b8d1feba2e81080f19ef67a8922");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({ schema: "sky-uppercut-source-audit/v1", move: "MOVE_SKY_UPPERCUT", moveId: 327, status: "unsupported-evidence", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_SKY_UPPERCUT", nextDispatchLabel: "Move_SECRET_POWER", rom: { start: "0x082d6ed7", endExclusive: "0x082d6fd0", byteLength: 249, romSha256: "83bc8a7a59ff7912092898a56c5afad37cef1957d1dde0d4834617a54eac80ee" } } },
      graph: { blocks: ["Move_SKY_UPPERCUT"], components: ["asset:ANIM_TAG_IMPACT", "sprite:gSlideMonToOffsetSpriteTemplate", "sprite:gSlideMonToOriginalPosSpriteTemplate", "task:AnimTask_MoveSkyUppercutBg", "task:AnimTask_ShakeMon2", "task:AnimTask_ShakeMonInPlace", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:splitbgprio", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"] },
      behavior: { bg: { task: "AnimTask_MoveSkyUppercutBg", initialArg: 55, deltaX: 1280, deltaY: 2816, cleanupArg7: -1 }, impacts: { count: 5 }, shakes: [{ task: "AnimTask_ShakeMon2" }, { task: "AnimTask_ShakeMonInPlace" }] },
      carriers: { level50Range: [110, 849], all: [{ index: 234, label: "FRONTIER_MON_HITMONCHAN_1" }, { index: 294, label: "FRONTIER_MON_COMBUSKEN_2" }, { index: 382, label: "FRONTIER_MON_BRELOOM_1" }] },
    });
  });

  it.each(stages)("validates the %s complete legal transient-free party-only Scene-ON stage", (_side, file, attackerSide, targetSide, seed) => {
    const stage = JSON.parse(readFileSync(resolve(root, file), "utf8")) as Json; const result = validate(file);
    expect(result.status).toBe(0); expect(result.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0, trainerId: 50, seed });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]); expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }] });
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) { expect(Object.keys(mon).sort()).toEqual(completeKeys.sort()); expect(Object.keys(mon.ivs).sort()).toEqual(statKeys.sort()); expect(Object.keys(mon.evs).sort()).toEqual(statKeys.sort()); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4); for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key); }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({ species: 107, level: 50, moves: [327, 327, 327, 327], ppUps: [0, 0, 0, 0] });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });

  it("observes Sky Uppercut's independent exact promotion", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.queue).toEqual(["MOVE_DESTINY_BOND"]); expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SKY_UPPERCUT")).toMatchObject({ status: "exact" });
    const track = coverage.componentTracks.find((entry: Json) => entry.id === "sky-uppercut-impact-slide-bg");
    expect(track).toMatchObject({ representatives: ["MOVE_SKY_UPPERCUT"], fulfilled: true }); expect(track.components).toHaveLength(17); expect(track.components).toContain("task:AnimTask_MoveSkyUppercutBg");
  });
});
