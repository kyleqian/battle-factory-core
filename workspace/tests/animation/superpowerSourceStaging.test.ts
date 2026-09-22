import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const runAudit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/superpowerSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
function oracleDir(): string {
  let candidate = root;
  while (true) { const oracle = resolve(candidate, "oracle"); if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle; const parent = dirname(candidate); if (parent === candidate) throw new Error("pinned battle_lab.py not found"); candidate = parent; }
}
function validateStage(path: string) {
  return spawnSync("python3", ["-c", "import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom battle_lab import validate_request\nvalidate_request(json.load(open(sys.argv[2],encoding='utf-8')),'battle-scene-on')", oracleDir(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_SUPERPOWER source and legal bilateral staging checkpoint", () => {
  it("pins the 14-component source graph, five novel components, exact ROM pointers, and carriers", () => {
    const text = runAudit(); expect(runAudit()).toBe(text);
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({
      schema: "superpower-source-audit/v1", move: "MOVE_SUPERPOWER", moveId: 276, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { nextDispatchLabel: "Move_RECYCLE", rom: { start: "0x082cdfa3", endExclusive: "0x082ce05e", byteLength: 187 } }, templates: { orb: { rom: { byteLength: 24 } }, rock: { rom: { byteLength: 24 } }, fireball: { rom: { byteLength: 24 } } } },
      graph: { blocks: ["Move_SUPERPOWER"], componentCount: 14, novelComponents: ["asset:ANIM_TAG_FLAT_ROCK", "asset:ANIM_TAG_METEOR", "sprite:gSuperpowerFireballSpriteTemplate", "sprite:gSuperpowerOrbSpriteTemplate", "sprite:gSuperpowerRockSpriteTemplate"] },
      carriers: { factoryCount: 3, level50Count: 3, allFactory: [{ index: 701, label: "FRONTIER_MON_NIDOQUEEN_4" }, { index: 762, label: "FRONTIER_MON_REGIROCK_1" }, { index: 841, label: "FRONTIER_MON_REGISTEEL_6" }] },
      behavior: { attackerOrb: { affine: [32, 4, -6, 6], blend: [12, 8] }, shakeBgY: { velocity: 4, timer: 1, duration: 180, type: "SHAKE_BG_Y" }, rocks: [[200, 96, 1, 120], [20, 248, 4, 112], [130, 160, 2, 104], [160, 192, 0, 96], [60, 288, 3, 88]], targetShake: [8, 0, 16, 1] },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, rawRgbRetained: true, normalizedMaps: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    });
    expect(audit.graph.components).toEqual(["asset:ANIM_TAG_CIRCLE_OF_LIGHT", "asset:ANIM_TAG_FLAT_ROCK", "asset:ANIM_TAG_METEOR", "sprite:gSuperpowerFireballSpriteTemplate", "sprite:gSuperpowerOrbSpriteTemplate", "sprite:gSuperpowerRockSpriteTemplate", "task:AnimTask_ShakeMon2", "task:SoundTask_PlaySE2WithPanning", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:shake_mon_or_platform", "visualCommand:splitbgprio"]);
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([701, 762, 841]);
    expect(readFileSync(resolve(root, "tools/compare/evidence/superpower-source-audit.json"), "utf8")).toBe(text);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-superpower-player-nidoqueen-opponent-onix.json"],
    ["opponent-front", "tools/battle-lab/mechanic-superpower-opponent-registeel-player-regirock.json"],
  ])("keeps the %s complete-party stage transient-free and legally Scene-ON valid", (_side, path) => {
    const stage = readJson(path); const validated = validateStage(path);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) { expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort()); for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key); }
    }
    const mons = (Object.values(stage.overrides.parties) as Json[][]).flat();
    expect(mons.filter((mon: Json) => mon.moves.includes(276))).not.toHaveLength(0);
    expect(mons.every((mon: Json) => mon.level === 50 && mon.moves.length === 4)).toBe(true);
  });

  it("keeps the coverage boundary staged and the sole five-component track unfulfilled", () => {
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SUPERPOWER")).toMatchObject({ status: "staged" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "superpower-rock-orb-fire")).toMatchObject({ components: ["asset:ANIM_TAG_FLAT_ROCK", "asset:ANIM_TAG_METEOR", "sprite:gSuperpowerFireballSpriteTemplate", "sprite:gSuperpowerOrbSpriteTemplate", "sprite:gSuperpowerRockSpriteTemplate"], representatives: ["MOVE_SUPERPOWER"], fulfilled: false });
  });
});
