import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const runAudit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/revengeSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
function oracleDir(): string { let candidate = root; while (true) { const oracle = resolve(candidate, "oracle"); if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle; const parent = dirname(candidate); if (parent === candidate) throw new Error("pinned battle_lab.py not found"); candidate = parent; } }
function validateStage(path: string) { return spawnSync("python3", ["-c", "import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom battle_lab import validate_request\nvalidate_request(json.load(open(sys.argv[2],encoding='utf-8')),'battle-scene-on')", oracleDir(), resolve(root, path)], { cwd: root, encoding: "utf8" }); }

describe("MOVE_REVENGE source and legal bilateral staging checkpoint", () => {
  it("pins the complete 14-component source graph, five novel components, ROM body, and legal carriers", () => {
    const text = runAudit(); expect(runAudit()).toBe(text);
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({ schema: "revenge-source-audit/v1", move: "MOVE_REVENGE", moveId: 279, status: "unsupported-source-staging-checkpoint", coverageCredit: false, source: { pointerOwnedRoot: { nextDispatchLabel: "Move_POISON_FANG", rom: { start: "0x082d5731", endExclusive: "0x082d57c8", byteLength: 151 } }, templates: { small: { rom: { byteLength: 24 } }, big: { rom: { byteLength: 24 } } } }, graph: { blocks: ["Move_REVENGE"], componentCount: 14, novelComponents: ["asset:ANIM_TAG_PURPLE_SCRATCH", "asset:ANIM_TAG_PURPLE_SWIPE", "sprite:gRevengeBigScratchSpriteTemplate", "sprite:gRevengeSmallScratchSpriteTemplate", "visualCommand:create_persist_hitsplat_sprite"] }, carriers: { factoryCount: 3, allSourceIndices: [82,264,316,811], excludedOutsideLevel50: [82] }, checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, rawRgbRetained: false, normalizedMaps: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
    expect(audit.carriers.level50.map((entry: Json) => entry.index)).toEqual([264,316,811]);
    expect(readFileSync(resolve(root, "tools/compare/evidence/revenge-source-audit.json"), "utf8")).toBe(text);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-revenge-player-machamp-opponent-shuckle.json"],
    ["opponent-front", "tools/battle-lab/mechanic-revenge-opponent-qwilfish-player-shuckle.json"],
  ])("keeps the %s party-before-init stage complete, transient-free, and Scene-ON valid", (_side, path) => {
    const stage = readJson(path); const validated = validateStage(path);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const party of Object.values(stage.overrides.parties) as Json[][]) { expect(party).toHaveLength(3); for (const mon of party) { expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort()); for (const key of ["hp","maxHp","status","stages","statStages","weather","weatherTurns","sideConditions","outcome","volatile"]) expect(mon).not.toHaveProperty(key); } }
    const mons = (Object.values(stage.overrides.parties) as Json[][]).flat();
    expect(mons.some((mon: Json) => mon.moves.every((move: number) => move === 279))).toBe(true);
    expect(mons.every((mon: Json) => mon.level === 50 && mon.moves.length === 4)).toBe(true);
  });

  it("records only an unfulfilled non-exclusive component track and grants no move credit", () => {
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_REVENGE")).toBeUndefined();
    expect(coverage.queue).not.toContain("MOVE_REVENGE");
    expect(coverage.componentTracks.find((track: Json) => track.id === "revenge-purple-scratch-persist-hit")).toMatchObject({ components: ["asset:ANIM_TAG_PURPLE_SCRATCH", "asset:ANIM_TAG_PURPLE_SWIPE", "sprite:gRevengeBigScratchSpriteTemplate", "sprite:gRevengeSmallScratchSpriteTemplate", "visualCommand:create_persist_hitsplat_sprite"], representatives: ["MOVE_REVENGE"], fulfilled: false });
  });
});
