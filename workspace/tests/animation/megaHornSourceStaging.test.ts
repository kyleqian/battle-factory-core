import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const runAudit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/megaHornSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
function oracleDir(): string {
  let candidate = root;
  while (true) { const oracle = resolve(candidate, "oracle"); if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle; const parent = dirname(candidate); if (parent === candidate) throw new Error("pinned battle_lab.py not found"); candidate = parent; }
}
function validateStage(path: string) {
  return spawnSync("python3", ["-c", "import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom battle_lab import validate_request\nvalidate_request(json.load(open(sys.argv[2],encoding='utf-8')),'battle-scene-on')", oracleDir(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_MEGAHORN source and legal bilateral staging checkpoint", () => {
  it("pins the complete battle/contest source graph, novel components, and all Factory carriers", () => {
    const text = runAudit();
    expect(runAudit()).toBe(text);
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({
      schema: "mega-horn-source-audit/v1", move: "MOVE_MEGAHORN", moveId: 224, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { nextDispatchLabel: "Move_GUST", rom: { start: "0x082d1924", endExclusive: "0x082d1a11", byteLength: 237 } }, template: { rom: { byteLength: 24 } } },
      graph: { blocks: ["Move_MEGAHORN", "MegahornInContest", "MegahornContinue"], componentCount: 21, novelComponents: ["asset:ANIM_TAG_HORN_HIT_2", "subroutine:MegahornContinue", "subroutine:MegahornInContest", "visualCommand:create_megahorn_horn_sprite"] },
      behavior: { battle: { background: "BG_DRILL", scroll: [-2304, 768, 1, -1] }, contest: { background: "BG_DRILL_CONTESTS", scroll: [2304, 768, 0, -1] }, horn: { affinePrograms: [30, -99, 94] }, targetShake: [-4, 1, 12, 1] },
      carriers: { factoryCount: 8, level50Count: 8, lowestLevel50: { index: 333, label: "FRONTIER_MON_SEAKING_2", species: "SPECIES_SEAKING" } },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directSpriteTaskResourceBodies: true, fullFactoryCarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, rawRgbRetained: true, normalizedMaps: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false, unsupportedNoCreditBoundary: true },
    });
    expect(audit.source.pointerOwnedRoot.commands).toHaveLength(39);
    expect(audit.graph.components).toEqual(["asset:ANIM_TAG_HORN_HIT_2", "asset:ANIM_TAG_IMPACT", "sprite:gSlideMonToOffsetSpriteTemplate", "sprite:gSlideMonToOriginalPosSpriteTemplate", "subroutine:MegahornContinue", "subroutine:MegahornInContest", "task:AnimTask_ShakeMon", "task:AnimTask_ShakeMonInPlace", "task:AnimTask_StartSlidingBg", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:complex_palette_blend", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_megahorn_horn_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"]);
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([333, 424, 520, 595, 616, 691, 702, 712]);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-megahorn-player-seaking-opponent-onix.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-megahorn-opponent-seaking-player-onix.json", "opponent", "player"],
  ])("keeps the %s party stage complete, transient-free, and legally Scene-ON valid", (_side, path, attacker, target) => {
    const stage = readJson(path); const validated = validateStage(path);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) { expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort()); for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key); }
    }
    expect(stage.overrides.parties[attacker][0]).toMatchObject({ species: 119, level: 50, moves: [224, 224, 224, 224], item: 183 });
    expect(stage.overrides.parties[target][0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });
});
