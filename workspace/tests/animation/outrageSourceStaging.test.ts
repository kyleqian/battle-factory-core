import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const runAudit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/outrageSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
function oracleDir(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("pinned battle_lab.py not found");
    candidate = parent;
  }
}
function validateStage(path: string) {
  return spawnSync("python3", ["-c", "import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom battle_lab import validate_request\nvalidate_request(json.load(open(sys.argv[2],encoding='utf-8')),'battle-scene-on')", oracleDir(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_OUTRAGE source and legal bilateral staging checkpoint", () => {
  it("pins the complete pointer-owned graph, all six components, and the Open carrier without credit", () => {
    const text = runAudit();
    expect(runAudit()).toBe(text);
    expect(readFileSync(resolve(root, "tools/compare/evidence/outrage-source-audit.json"), "utf8")).toBe(text);
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({
      schema: "outrage-source-audit/v1",
      move: "MOVE_OUTRAGE",
      moveId: 200,
      status: "unsupported-source-staging-checkpoint",
      coverageCredit: false,
      source: {
        pointerOwnedRoot: {
          symbol: "Move_OUTRAGE",
          nextDispatchLabel: "Move_SPARK",
          rom: { start: "0x082cb908", endExclusive: "0x082cbaa3", byteLength: 411 },
        },
        pointerOwnedSubroutine: {
          symbol: "OutrageFlames",
          nextDispatchLabel: "Move_SPARK",
          rom: { start: "0x082cba0f", endExclusive: "0x082cbaa3", byteLength: 148 },
        },
        template: { rom: { byteLength: 24 }, animation: { rom: { byteLength: 24 } } },
        callbacks: {
          outrageFlame: { rom: { byteLength: 156 } },
          ellipse: { rom: { byteLength: 48 } },
          shakeMon2: { rom: { byteLength: 236 } },
          blendColorCycle: { rom: { byteLength: 80 } },
          blendColorCycleLoop: { rom: { byteLength: 104 } },
        },
      },
      graph: { blocks: ["Move_OUTRAGE", "OutrageFlames"], componentCount: 6, novelComponents: ["subroutine:OutrageFlames", "visualCommand:create_outrage_flame_sprite"] },
      behavior: {
        ellipse: { args: [12, 6, 5, 4], playerXVelocity: 12, opponentXVelocity: -12, wavePeriod: 16 },
        flames: { count: 23, duration: 30, flickerDuration: 3, repeatedSubroutineBodies: 2 },
        targetShakeMon2: [2, 0, 40, 1],
        blendColorCycle: { selector: "F_PAL_BG | F_PAL_ATTACKER | F_PAL_TARGET", delay: 2, numBlends: 5, initialBlendY: 3, targetBlendY: 8, color: [14, 13, 0] },
        cleanup: ["waitforvisualfinish", "end"],
      },
      resources: { smallEmber: { tag: "ANIM_TAG_SMALL_EMBER", value: 10029, tileBytes: 2560 }, audio: { sound: "SE_M_DRAGON_RAGE", id: 171, pan: "SOUND_PAN_ATTACKER" } },
      carriers: {
        factoryCount: 1,
        openOnlyCount: 1,
        representative: { index: 854, label: "FRONTIER_MON_DRAGONITE_5", species: "SPECIES_DRAGONITE", moves: ["MOVE_OUTRAGE", "MOVE_DOUBLE_EDGE", "MOVE_THUNDER_WAVE", "MOVE_ROAR"], itemTableId: 41, nature: "NATURE_DOCILE" },
      },
      checkpoint: {
        sourceAudit: true,
        completePointerOwnedRoot: true,
        completeReachableVisualGraph: true,
        directSpriteTaskResourceBodies: true,
        fullFactoryCarrierCensus: true,
        legalBilateralPartyOnlyStaging: true,
        denseWindowCaptured: true,
        rawRgbRetained: true,
        normalizedMaps: true,
        latchMeasured: true,
        productionChanged: false,
        reducerAdded: false,
        typedSeamAdded: false,
        compositorAdded: false,
        actualCoreFramebufferAcceptance: false,
        coveragePromotion: false,
        componentTrackFulfilled: false,
        gameplayStateOwned: false,
        boundaryOrBarrierChanged: false,
        unsupportedNoCreditBoundary: true,
      },
    });
    expect(audit.source.pointerOwnedRoot.commands).toHaveLength(27);
    expect(audit.graph.components).toEqual([
      "asset:ANIM_TAG_SMALL_EMBER",
      "subroutine:OutrageFlames",
      "task:AnimTask_ShakeMon2",
      "task:AnimTask_TranslateMonEllipticalRespectSide",
      "visualCommand:blend_color_cycle",
      "visualCommand:create_outrage_flame_sprite",
    ]);
    expect(audit.source.template.source.sourcePath).toBe("src/battle_anim_dragon.c");
    expect(audit.source.callbacks.outrageFlame.source.sourcePath).toBe("src/battle_anim_dragon.c");
    expect(audit.source.callbacks.ellipse.source.sourcePath).toBe("src/battle_anim_mon_movement.c");
    expect(audit.source.callbacks.shakeMon2.source.sourcePath).toBe("src/battle_anim_mon_movement.c");
    expect(audit.source.callbacks.blendColorCycle.source.sourcePath).toBe("src/battle_anim_normal.c");
    expect(audit.source.commandMacro.sourcePath).toBe("asm/macros/battle_anim_script.inc");
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-outrage-player-dragonite-opponent-onix.json", "player", "opponent", [200, 38, 86, 46]],
    ["opponent-front", "tools/battle-lab/mechanic-outrage-opponent-dragonite-player-onix.json", "opponent", "player", [200, 200, 200, 200]],
  ])("keeps the %s party stage complete, transient-free, and legally Scene-ON valid", (_side, path, attacker, target, attackerMoves) => {
    const stage = readJson(path as string);
    const validated = validateStage(path as string);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort());
        for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    expect(stage.overrides.parties[attacker as string][0]).toMatchObject({ species: 149, level: 50, nature: 6, moves: attackerMoves, item: 141 });
    expect(stage.overrides.parties[target as string][0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
    if (path.toString().includes("opponent-dragonite")) {
      expect(stage.opponentSetIds[0]).not.toBe(854);
      expect(stage.overrides.parties.opponent.every((mon: Json) => mon.moves.every((move: number) => move === 200))).toBe(true);
    }
  });
});
