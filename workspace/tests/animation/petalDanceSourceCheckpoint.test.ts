import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completeKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const components = [
  "asset:ANIM_TAG_FLOWER", "asset:ANIM_TAG_IMPACT",
  "sprite:gSlideMonToOffsetSpriteTemplate", "sprite:gSlideMonToOriginalPosSpriteTemplate",
  "task:AnimTask_ShakeMon", "task:AnimTask_TranslateMonEllipticalRespectSide",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:create_petal_dance_big_flower_sprite", "visualCommand:create_petal_dance_small_flower_sprite",
  "visualCommand:monbg", "visualCommand:setalpha",
];

function auditText(): string {
  return execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/petalDanceSourceAudit.ts",
  ], { cwd: root, encoding: "utf8" });
}

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
    "import json, sys",
    "sys.path.insert(0, sys.argv[1])",
    "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

const stages = [
  [
    "player-back", "tools/battle-lab/mechanic-petal-dance-player-gloom-opponent-onix.json",
    "player", "opponent", [167, 158, 188], [156, 157, 185], 305420080,
  ],
  [
    "opponent-front", "tools/battle-lab/mechanic-petal-dance-opponent-gloom-player-onix.json",
    "opponent", "player", [156, 157, 185], [167, 158, 188], 305420081,
  ],
] as const;

describe("MOVE_PETAL_DANCE source/classification and legal Scene-ON staging checkpoint", () => {
  it("byte-pins the complete branchless pointer-owned root and generated component identities", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe(
      "0dc22f5157d3701cfed03cfa886043bdb6ebadd01cec62f217e4172aef3fae1d",
    );
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "petal-dance-source-audit/v1",
      status: "unsupported-source-staging-checkpoint",
      coverageCredit: false,
      move: "MOVE_PETAL_DANCE", moveId: 80,
      pointerOwned: {
        root: {
          symbol: "Move_PETAL_DANCE", nextDispatchLabel: "Move_RAZOR_LEAF",
          rom: {
            start: "0x082d281c", endExclusive: "0x082d2954", byteLength: 312,
            romSha256: "543d178b9bac22a99c5863cf7f41747232191c08bc287cf97b78ddfd9d19b36f",
          },
          source: {
            path: "data/battle_anim_scripts.s", start: 261172, endExclusive: 263420,
            byteLength: 2248, sha256: "40c5f5434ebb3989344ebfd7493110412fa847c6e71fa4d8e5275cab661976a2",
          },
        },
      },
      graph: { rootScript: "Move_PETAL_DANCE", blocks: ["Move_PETAL_DANCE"], components },
      scope: {
        legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, latchMeasured: false,
        assetsExtracted: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false,
        framebufferAcceptance: false, productionChanged: false, coveragePromotion: false,
        componentTrackCredit: false, siblingCredit: false, queueItemAdded: true,
      },
    });
    expect(audit.graph.identities.map((entry: Json) => entry.id)).toEqual(components);
    expect(audit.graph.identities.filter((entry: Json) => entry.moveCount === 1).map((entry: Json) => entry.id)).toEqual([
      "visualCommand:create_petal_dance_big_flower_sprite",
      "visualCommand:create_petal_dance_small_flower_sprite",
    ]);
    expect(audit.script).toMatchObject({
      commandCount: 36,
      flowerGroups: {
        big: [
          { initialX: 0, initialY: -24, targetY: 8, duration: 140 },
          { initialX: 0, initialY: -24, targetY: 8, duration: 140 },
          { initialX: 0, initialY: -24, targetY: 8, duration: 140 },
        ],
        delays: [15, 15, 30, 30],
      },
      impact: { slideOffset: [0, 24, 0, 0, 5], shake: ["ANIM_TARGET", 6, 0, 8, 1], slideOriginal: [0, 0, 7] },
      background: { monbg: "ANIM_DEF_PARTNER", alpha: [12, 8], cleanup: ["clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"] },
    });
    expect(audit.script.flowerGroups.small).toHaveLength(10);
    expect(Object.keys(audit.directBodies.callbacks).sort()).toEqual([
      "AnimHitSplatBasic", "AnimPetalDanceBigFlower", "AnimPetalDanceBigFlower_Step",
      "AnimPetalDanceSmallFlower", "AnimPetalDanceSmallFlower_Step", "AnimTask_ShakeMon",
      "AnimTask_ShakeMon_Step", "AnimTask_TranslateMonElliptical", "AnimTask_TranslateMonEllipticalRespectSide",
      "SlideMonToOffset", "SlideMonToOriginalPos", "Task_ClearMonBg", "Task_InitUpdateMonBg", "Task_UpdateMonBg",
    ]);
  });

  it("derives the complete Level-50 carrier census and observes independent exact promotion", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.carrierCensus).toMatchObject({
      level50Range: { first: 110, last: 849 },
      lowestLegal: {
        index: 167, label: "FRONTIER_MON_GLOOM_1", species: "SPECIES_GLOOM",
        moves: ["MOVE_PETAL_DANCE", "MOVE_ACID", "MOVE_STUN_SPORE", "MOVE_MOONLIGHT"],
        itemName: "BATTLE_FRONTIER_ITEM_PERSIM_BERRY", nature: "NATURE_QUIRKY",
      },
      lowestLegalRoute: { challengeNum: 0, battleNum: 0, level50Range: [110, 199], trainerId: 50, regularTrainerRange: [0, 99] },
    });
    expect(audit.carrierCensus.complete.map((entry: Json) => ({
      index: entry.index, label: entry.label, species: entry.species, moves: entry.moves,
    }))).toEqual([
      { index: 167, label: "FRONTIER_MON_GLOOM_1", species: "SPECIES_GLOOM", moves: ["MOVE_PETAL_DANCE", "MOVE_ACID", "MOVE_STUN_SPORE", "MOVE_MOONLIGHT"] },
      { index: 174, label: "FRONTIER_MON_IVYSAUR_1", species: "SPECIES_IVYSAUR", moves: ["MOVE_PETAL_DANCE", "MOVE_GROWTH", "MOVE_SWEET_SCENT", "MOVE_FURY_CUTTER"] },
      { index: 208, label: "FRONTIER_MON_SUNFLORA_1", species: "SPECIES_SUNFLORA", moves: ["MOVE_PETAL_DANCE", "MOVE_INGRAIN", "MOVE_LEECH_SEED", "MOVE_LIGHT_SCREEN"] },
      { index: 255, label: "FRONTIER_MON_BELLOSSOM_1", species: "SPECIES_BELLOSSOM", moves: ["MOVE_PETAL_DANCE", "MOVE_SAFEGUARD", "MOVE_SUNNY_DAY", "MOVE_SYNTHESIS"] },
      { index: 394, label: "FRONTIER_MON_VILEPLUME_1", species: "SPECIES_VILEPLUME", moves: ["MOVE_SLUDGE_BOMB", "MOVE_PETAL_DANCE", "MOVE_MOONLIGHT", "MOVE_AROMATHERAPY"] },
    ]);
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_PETAL_DANCE"))
      .toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual(["MOVE_SMOG"]);
    expect(audit.independence).toContain("stays unsupported");
  });

  it.each(stages)("validates the %s complete legal transient-free party-only stage", (
    _orientation, path, attackerSide, targetSide, playerSetIds, opponentSetIds, seed,
  ) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 0, battleNum: 0, trainerId: 50, playerSetIds, opponentSetIds, seed,
    });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.trace).toEqual({ segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
    ] });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(stage).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      expect(new Set(party.map((mon) => mon.item)).size).toBe(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        for (const key of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) {
          expect(mon).not.toHaveProperty(key);
        }
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({
      species: 44, level: 50, nature: 24, item: 140, abilitySlot: 0, friendship: 0,
      gender: "female", shiny: false, moves: [80, 80, 80, 80], ppUps: [0, 0, 0, 0],
    });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({
      species: 95, level: 50, moves: [33, 33, 33, 33],
    });
  });
});
