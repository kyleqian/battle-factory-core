import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const auditText = () => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/destinyBondSourceAudit.ts"], { cwd: root, encoding: "utf8" });
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

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
  ["player-back", "tools/battle-lab/mechanic-destiny-bond-player-wobbuffet-opponent-onix.json", "player", "opponent", 305420194, [33, 33, 33, 33]] as const,
  ["opponent-front", "tools/battle-lab/mechanic-destiny-bond-opponent-wobbuffet-player-onix.json", "opponent", "player", 305420195, [194, 194, 194, 194]] as const,
];

describe("MOVE_DESTINY_BOND source/classification and legal Scene-ON staging checkpoint", () => {
  it("regenerates the complete pointer-owned root, reachable tasks/callbacks/resources, and exact nine-component graph byte-identically", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("e77587b596a4ce2764eb35916016e47e168074d153a548276924d0a0aa692925");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "destiny-bond-source-audit/v1",
      move: "MOVE_DESTINY_BOND",
      moveId: 194,
      status: "unsupported-reducer-seam-checkpoint",
      coverageCredit: false,
      source: {
        pointerOwnedRoot: {
          symbol: "Move_DESTINY_BOND", nextDispatchLabel: "Move_ENDURE",
          source: { path: "data/battle_anim_scripts.s", start: 123788, endExclusive: 124427, byteLength: 639, sha256: "3f637750fd7a7fa97a2f352b559cb1e7eb82f9d0760c4693d5228437aaf09b71" },
          rom: { start: "0x082cd62c", endExclusive: "0x082cd687", byteLength: 91, romSha256: "7103101a87e4167605c3924a8ab8b251bd48c95b331f85d97d66165848774028" },
        },
        commands: [
          "loadspritegfx ANIM_TAG_WHITE_SHADOW", "fadetobg BG_GHOST", "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER", "waitbgfadein",
          "createvisualtask AnimTask_DestinyBondWhiteShadow, 5, 0, 48", "playsewithpan SE_M_CONFUSE_RAY, SOUND_PAN_ATTACKER", "delay 48",
          "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_ATTACKER, 2, 0, 24, 1",
          "createvisualtask AnimTask_BlendBattleAnimPalExclude, 2, 6, 1, 0, 12, RGB(29, 29, 29)", "delay 24",
          "createvisualtask AnimTask_BlendBattleAnimPalExclude, 2, 6, 1, 12, 0, RGB(29, 29, 29)", "playsewithpan SE_M_NIGHTMARE, SOUND_PAN_TARGET",
          "waitforvisualfinish", "restorebg", "waitbgfadein", "blendoff", "clearmonbg 5", "end",
        ],
      },
      graph: { blocks: ["Move_DESTINY_BOND"], components: [
        "asset:ANIM_TAG_WHITE_SHADOW", "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_DestinyBondWhiteShadow", "task:AnimTask_ShakeMonInPlace",
        "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:waitbgfadein",
      ] },
      behavior: {
        whiteShadow: { task: "AnimTask_DestinyBondWhiteShadow", args: [0, 48], blend: { initial: [0, 16], pulses: 24, cleanup: [0, 0] } },
        shake: { task: "AnimTask_ShakeMonInPlace", args: ["ANIM_ATTACKER", 2, 0, 24, 1] },
        palette: { task: "AnimTask_BlendBattleAnimPalExclude", args: [6, 1, 0, 12, "RGB(29, 29, 29)"], reverseArgs: [6, 1, 12, 0, "RGB(29, 29, 29)"] },
        background: { command: "fadetobg BG_GHOST", id: 2, cleanup: ["restorebg", "waitbgfadein", "blendoff", "clearmonbg 5", "end"] },
        audio: [{ sound: "SE_M_PSYBEAM", id: 189 }, { sound: "SE_M_CONFUSE_RAY", id: 196 }, { sound: "SE_M_NIGHTMARE", id: 121 }],
      },
      resources: {
        whiteShadow: { tag: "ANIM_TAG_WHITE_SHADOW", tagValue: 10188, tileBytes: 1024, source: "graphics/battle_anims/sprites/white_shadow.png" },
        ghostBackground: { id: "BG_GHOST", idValue: 2, source: "graphics/battle_anims/backgrounds/ghost.png + ghost.bin" },
      },
      checkpoint: {
        sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, reducerAdded: true, productionAssetWiring: true,
        typedSceneOnSeam: true, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false,
        latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true,
      },
    });
    expect(Object.keys(audit.source.directBodies.callbacks).sort()).toEqual([
      "AnimDestinyBondWhiteShadow", "AnimDestinyBondWhiteShadow_Step", "AnimTask_BlendBattleAnimPalExclude", "AnimTask_BlendSpriteColor_Step2",
      "AnimTask_DestinyBondWhiteShadow", "AnimTask_DestinyBondWhiteShadow_Step", "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step",
      "LoadMoveBg", "StartBlendAnimSpriteColor", "Task_ClearMonBg", "Task_FadeToBg", "Task_UpdateMonBg",
    ]);
    expect(Object.keys(audit.source.directBodies.runtimeCommands).sort()).toEqual([
      "Cmd_blendoff", "Cmd_clearmonbg", "Cmd_createvisualtask", "Cmd_delay", "Cmd_fadetobg", "Cmd_loadspritegfx", "Cmd_playsewithpan", "Cmd_restorebg", "Cmd_waitbgfadein",
    ]);
  });

  it("pins the complete Level-50 carrier census and source/component identity-only controls", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.carriers).toMatchObject({
      level50Range: [110, 849], count: 10,
      lowest: { index: 290, label: "FRONTIER_MON_WOBBUFFET_2", species: "SPECIES_WOBBUFFET", moves: ["MOVE_COUNTER", "MOVE_MIRROR_COAT", "MOVE_ENCORE", "MOVE_DESTINY_BOND"] },
      excludedOutsideLevel50: [], excludedOpenOnly: [],
    });
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([290, 316, 501, 662, 709, 802, 803, 812, 813, 814]);
    expect(audit.controls).toMatchObject({
      kind: "source/component identity checks only; controls confer no Destiny Bond, component, latch, or sibling acceptance",
      entries: {
        MOVE_LUSTER_PURGE: { status: "exact", component: "task:AnimTask_BlendBattleAnimPalExclude" },
        MOVE_HI_JUMP_KICK: { status: "exact", component: "task:AnimTask_ShakeMonInPlace" },
        MOVE_THRASH: { status: "exact", component: "task:AnimTask_ShakeMonInPlace" },
        MOVE_HORN_DRILL: { status: "exact", component: "task:AnimTask_ShakeMonInPlace" },
        MOVE_SKY_UPPERCUT: { status: "exact", component: "task:AnimTask_ShakeMonInPlace" },
        MOVE_GRUDGE: { status: "exact", components: ["visualCommand:fadetobg", "visualCommand:restorebg"] },
        MOVE_AURORA_BEAM: { status: "exact", components: ["visualCommand:fadetobg", "visualCommand:restorebg"] },
      },
    });
  });

  it.each(stages)("validates the %s complete legal transient-free party-only Scene-ON stage", (_orientation, path, attackerSide, targetSide, seed, aiMoves) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0, trainerId: 50, seed });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }] });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort());
        expect(Object.keys(mon.ivs).sort()).toEqual([...statKeys].sort());
        expect(Object.keys(mon.evs).sort()).toEqual([...statKeys].sort());
        expect(mon.level).toBe(50); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        for (const transient of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({ species: 202, level: 50, moves: [194, 194, 194, 194], ppUps: [0, 0, 0, 0] });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
    expect(stage.overrides.parties.opponent[0].moves).toEqual(aiMoves);
  });

  it("keeps the compact bilateral root receipts and unfulfilled non-exclusive track explicit", () => {
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/destiny-bond-staging-receipt.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({
      schema: "destiny-bond-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_DESTINY_BOND", moveId: 194,
      status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { auditRunSha256: "e77587b596a4ce2764eb35916016e47e168074d153a548276924d0a0aa692925", pointerOwnedRoot: { start: "0x082cd62c", endExclusive: "0x082cd687" } },
      scope: { framebuffersRetained: false, denseWindowCaptured: false, latchMeasured: false, productionChanged: false, coveragePromotion: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noReducerOrSeamOrCompositor: true },
    });
    expect(receipt.source.probeSha256).toBe(sha(readFileSync(resolve(root, receipt.source.probe))));
    for (const [orientation, expected] of Object.entries({
      "player-back": { attackerSide: "player", targetSide: "opponent", aiMoves: [33, 33, 33, 33], ppAfter: [4, 5, 5, 5], attackerBattler: 0, controllerExecFlags: 1, outputSha256: "a4b76fab9f11ac2a1d88b26fcf017928d778930891fa703219186e9931e0b312" },
      "opponent-front": { attackerSide: "opponent", targetSide: "player", aiMoves: [194, 194, 194, 194], ppAfter: [5, 5, 5, 4], attackerBattler: 1, controllerExecFlags: 2, outputSha256: "30b3536bf0c69f306c9095aa991b1ea12f97b4afa33807df6edc83d6058d9800" },
    })) {
      const run = receipt.runs[orientation];
      expect(run).toMatchObject({
        freshRuns: 2, outputsByteIdentical: true, outputSha256: expected.outputSha256, sourceInitialized: true, customPartiesBuiltBeforeBattle: true,
        attacker: { side: expected.attackerSide, partyIndex: 0, species: 202, level: 50, moves: [194, 194, 194, 194] },
        target: { side: expected.targetSide, partyIndex: 0, species: 95, level: 50, moves: [33, 33, 33, 33] },
        legalAiMoveSlots: expected.aiMoves,
        root: { symbol: "Move_DESTINY_BOND", start: "0x82cd62c", endExclusive: "0x82cd687", observations: 187, attackerBattler: expected.attackerBattler, targetBattler: expected.attackerBattler, controllerExecFlags: expected.controllerExecFlags, targetContract: "MOVE_TARGET_USER self-target; White Shadow discovers visible opponents" },
        pp: { before: [5, 5, 5, 5], after: expected.ppAfter, spent: 1 }, benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true,
      });
      expect(run.scenarioSha256).toBe(sha(readFileSync(resolve(root, run.scenario))));
    }
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(253);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_DESTINY_BOND")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual([]);
    expect(coverage.componentTracks.find((track: Json) => track.id === "destiny-bond-white-shadow")).toMatchObject({
      representatives: ["MOVE_DESTINY_BOND"], fulfilled: true,
      components: ["asset:ANIM_TAG_WHITE_SHADOW", "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_DestinyBondWhiteShadow", "task:AnimTask_ShakeMonInPlace", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:waitbgfadein"],
    });
  });
});
