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

function sourceAuditText(): string {
  return execFileSync(process.execPath, [
    "--experimental-strip-types", "tools/compare/rapidSpinSourceAudit.ts",
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
    "player-back",
    "tools/battle-lab/mechanic-rapid-spin-player-wartortle-opponent-onix.json",
    "player", "opponent", [281, 276, 275], [349, 339, 327], 305420229,
  ],
  [
    "opponent-front",
    "tools/battle-lab/mechanic-rapid-spin-opponent-wartortle-player-onix.json",
    "opponent", "player", [349, 339, 327], [281, 276, 275], 305420230,
  ],
] as const;

describe("MOVE_RAPID_SPIN source/classification and legal Scene-ON staging checkpoint", () => {
  it("regenerates the complete pointer-owned and direct-body source audit byte-identically", () => {
    const first = sourceAuditText();
    const second = sourceAuditText();
    expect(second).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe(
      "651076e9313aa1f7e8e14fbafdf820fcc31519d7e7563a310d48bd0b232ebfe4",
    );
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "rapid-spin-source-audit/v1",
      move: "MOVE_RAPID_SPIN",
      moveId: 229,
      status: "exact",
      coverageCredit: true,
      source: {
        pointerOwnedRoot: {
          symbol: "Move_RAPID_SPIN", nextDispatchLabel: "Move_MOONLIGHT",
          source: {
            path: "data/battle_anim_scripts.s", start: 129764, endExclusive: 130516,
            byteLength: 752, sha256: "64c05bf424618bf9f7020cfb6f5654ac6c11d8f8bc8bf03f2735e392ec6676cd",
          },
          rom: {
            start: "0x082cd941", endExclusive: "0x082cd9ae", byteLength: 109,
            romSha256: "813e3d91d16478caf8c714503401800304857799ee34855657000d1d778cc261",
          },
        },
      },
      graph: {
        blocks: ["Move_RAPID_SPIN"],
        components: [
          "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_RAPID_SPIN",
          "sprite:gRapidSpinSpriteTemplate", "task:AnimTask_RapinSpinMonElevation",
          "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "visualCommand:clearmonbg",
          "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg",
        ],
      },
      resources: {
        impact: { tag: "ANIM_TAG_IMPACT", tagValue: 10135, tileBytes: 512, template: "gBasicHitSplatSpriteTemplate", callback: "AnimHitSplatBasic" },
        rapidSpin: { tag: "ANIM_TAG_RAPID_SPIN", tagValue: 10229, tileBytes: 768, template: "gRapidSpinSpriteTemplate", callback: "AnimRapidSpin -> AnimRapidSpin_Step" },
      },
      behavior: {
        monbg: { command: "monbg ANIM_ATTACKER", cleanup: "clearmonbg ANIM_ATTACKER" },
        elevation: { task: "AnimTask_RapinSpinMonElevation", spelling: "Rapin is source spelling", calls: [[0, 2, 0], [0, 2, 1]] },
        impact: { command: "create_basic_hitsplat_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=2" },
        shake: { command: "createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 2, FALSE, 1, 10, 1, 0", movePower: 20, powerDivisor: 12, clampedAmplitude: 1 },
        resourceLifetime: { loads: ["ANIM_TAG_IMPACT", "ANIM_TAG_RAPID_SPIN"], explicitUnload: false },
      },
    });
    expect(Object.keys(audit.source.directBodies.callbacks).sort()).toEqual([
      "AnimHitSplatBasic", "AnimRapidSpin", "AnimRapidSpin_Step",
      "AnimTask_RapinSpinMonElevation", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
      "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", "RapinSpinMonElevation_Step",
      "Task_ClearMonBg", "Task_InitUpdateMonBg", "Task_LoopAndPlaySE", "Task_UpdateMonBg",
    ]);
    expect(Object.keys(audit.source.directBodies.runtimeCommands).sort()).toEqual([
      "Cmd_clearmonbg", "Cmd_createsprite", "Cmd_createvisualtask", "Cmd_end",
      "Cmd_loadspritegfx", "Cmd_loopsewithpan", "Cmd_monbg", "Cmd_playsewithpan", "Cmd_waitforvisualfinish",
    ]);
  });

  it("derives the complete Level-50 census and preserves independent sibling controls", () => {
    const audit = JSON.parse(sourceAuditText()) as Json;
    expect(audit.carriers).toMatchObject({
      setCount: 1, speciesCount: 1,
      all: [{
        index: 281, label: "FRONTIER_MON_WARTORTLE_2", species: "SPECIES_WARTORTLE",
        moves: ["MOVE_SURF", "MOVE_ICE_BEAM", "MOVE_RAPID_SPIN", "MOVE_PROTECT"],
        itemName: "BATTLE_FRONTIER_ITEM_SHELL_BELL", nature: "NATURE_DOCILE",
        evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
      }],
      lowestLegalRoute: { challengeNum: 2, level50Range: [267, 371], trainerId: 110, regularTrainerRange: [110, 119] },
    });
    expect(audit.controls).toMatchObject({
      exact: ["MOVE_ROLLOUT", "MOVE_FLAIL", "MOVE_REVERSAL", "MOVE_ENDEAVOR"],
      unsupported: ["MOVE_PURSUIT", "MOVE_SPIT_UP", "MOVE_ICE_BALL"],
      entries: {
        MOVE_ROLLOUT: { status: "exact" }, MOVE_FLAIL: { status: "exact" },
        MOVE_REVERSAL: { status: "exact" }, MOVE_ENDEAVOR: { status: "exact" },
        MOVE_PURSUIT: { status: "unsupported-absent" }, MOVE_SPIT_UP: { status: "unsupported-absent" },
        MOVE_ICE_BALL: { status: "unsupported-absent" },
      },
    });
    expect(audit.checkpoint).toEqual({
      sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true,
      productionChanged: true, coveragePromotion: true, componentTrackCredit: false,
      latchPromotion: true, unsupportedNoCreditBoundary: false,
    });
    expect(audit.scope).toEqual({
      denseStateCaptured: true, reducerAdded: true, assetsExtracted: true, typedSeamAdded: true,
      compositorAdded: true, framebufferAcceptance: true, productionChanged: true, coveragePromotion: true,
      queueItemAdded: false, componentTrackFulfilled: false, latchRowAdded: true,
    });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_RAPID_SPIN")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual(["MOVE_PETAL_DANCE"]);
    expect(coverage.componentTracks.filter((track: Json) => track.moves?.includes("MOVE_RAPID_SPIN"))).toEqual([]);
  });

  it.each(stages)("validates the %s complete legal transient-free party-only Scene-ON stage", (
    _orientation, path, attackerSide, targetSide, playerSetIds, opponentSetIds, seed,
  ) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 2, battleNum: 2, trainerId: 110, playerSetIds, opponentSetIds, seed,
    });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).toEqual({ segments: [
      { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
      { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] },
    ] });
    expect(stage).not.toHaveProperty("captureFrames");
    expect(stage).not.toHaveProperty("preCheckpointCaptureFrames");
    expect(stage.overrides).not.toHaveProperty("battlers");
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
    const attacker = stage.overrides.parties[attackerSide][0];
    const target = stage.overrides.parties[targetSide][0];
    expect(attacker).toMatchObject({
      species: 8, level: 50, nature: 6, item: 219, abilitySlot: 0, friendship: 70,
      gender: "male", shiny: false, moves: [229, 229, 229, 229], ppUps: [0, 0, 0, 0],
      ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
      evs: { hp: 255, attack: 0, defense: 0, speed: 0, spAttack: 255, spDefense: 0 },
    });
    expect(target).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });
});
