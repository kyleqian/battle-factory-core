import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/amnesia-evidence.json" with { type: "json" };
import { verifyAmnesiaEvidence } from "../../tools/compare/amnesiaEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const audit = (): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/amnesiaSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
const completePartyKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

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

describe("MOVE_AMNESIA independent source and bilateral Scene-ON acceptance", () => {
  it("pins both pointer-owned ROM/source intervals and exactly ten generated components", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_AMNESIA", moveId: 133, status: "exact", coverageCredit: true,
      pointerOwned: {
        root: { start: "0x082cd055", endExclusive: "0x082cd079", byteLength: 36, romSha256: "dae2bb84a24a842637984bcbcaeed79d207a75e8bbd9d0caced8303ad4f486c4", sourceByteLength: 316, sourceSha256: "46d215b42fda8119c3b5cd9c200ee4275b963d5ca203c14415b11f71883b9ba5" },
        psychicBackground: { start: "0x082d7cd1", endExclusive: "0x082d7ce5", byteLength: 20, romSha256: "1639a9d5f5e5ea2a60a8fc5ca63e4726ba034725d265298942f57cf98170d968", sourceByteLength: 223, sourceSha256: "65d64577e4f4fd01582f21f7b717fad25008a238ac11624c89b01ac092ad3ffa" },
      },
      graph: {
        blocks: ["Move_AMNESIA", "SetPsychicBackground", "UnsetPsychicBackground"],
        components: [
          "asset:ANIM_TAG_AMNESIA", "sprite:gQuestionMarkSpriteTemplate",
          "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground",
          "task:AnimTask_SetPsychicBackground", "visualCommand:fadetobg",
          "visualCommand:restorebg", "visualCommand:setarg",
          "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
        ],
      },
    });
  });

  it("pins ANIM_TAG_AMNESIA, the question-mark callback chain, psychic palette task, and audio", () => {
    expect(audit()).toMatchObject({
      resources: {
        tag: "ANIM_TAG_AMNESIA", tagValue: 10093, tileBytes: 4096,
        gfx: { start: "0x08c0ddac", endExclusive: "0x08c0e47c", byteLength: 1744, romSha256: "2d3e0b1ca5c79349230439023aadf8eaffdcfd079483b75985c499719fd1c08f" },
        palette: { start: "0x08c0ccdc", endExclusive: "0x08c0cd04", byteLength: 40, romSha256: "900653100d8d4d1baf90874bf61e66bdb0e84b030443cc7cdc34f63eff42bb90" },
        template: { start: "0x08596744", endExclusive: "0x0859675c", byteLength: 24, romSha256: "6411e754c1eadae6878221444a3856248b4957bd4049af355d6b163bf44d88c4" },
        oam: "gOamData_AffineOff_ObjNormal_32x32",
      },
      callbacks: {
        AnimQuestionMark: { start: "0x0810f6b0", endExclusive: "0x0810f740", byteLength: 144, romSha256: "c63fe6a02e00a2bcdb87ff984aae389af421de319e9c0b62f254ef57a24fa579" },
        AnimQuestionMark_Step1: { start: "0x0810f740", endExclusive: "0x0810f774", byteLength: 52, romSha256: "bd67152164e71d5be0ec2c753f1213fb73feaaeb29a376025edc2eca0a88224e" },
        AnimQuestionMark_Step2: { start: "0x0810f774", endExclusive: "0x0810f7d2", byteLength: 94, romSha256: "fb409497f524738669886be4deca13977f6b087658412f767bf192f64ba64803" },
        AnimTask_SetPsychicBackground: { start: "0x0815a504", endExclusive: "0x0815a52c", byteLength: 40, romSha256: "4a04828ab02024e0edb3675c63e2856ec31fcb8edc7c494aa7cefb81f58623f4" },
        SetPsychicBackground_Step: { start: "0x0815a52c", endExclusive: "0x0815a5c8", byteLength: 156, romSha256: "a8c76dd93b6b846e91ee62662584b0653f7d7e243233def970ebf42bf431c4d9" },
      },
      behavior: { questionMarks: 1, audio: { sound: "SE_M_METRONOME", id: 186, loop: { interval: 16, count: 3 } } },
    });
  });

  it("pins all thirteen Level-50 Factory carriers, the lowest carrier, and distinct exact controls", () => {
    const result = audit();
    expect(result.carriers.all.map((entry: Json) => [entry.index, entry.label])).toEqual([
      [252, "FRONTIER_MON_TORKOAL_1"], [258, "FRONTIER_MON_GOREBYSS_1"], [259, "FRONTIER_MON_RELICANTH_1"],
      [321, "FRONTIER_MON_TANGELA_2"], [364, "FRONTIER_MON_RELICANTH_2"], [384, "FRONTIER_MON_WHISCASH_1"],
      [410, "FRONTIER_MON_SLOWKING_1"], [525, "FRONTIER_MON_WAILORD_2"], [563, "FRONTIER_MON_SLAKING_2"],
      [676, "FRONTIER_MON_QUAGSIRE_4"], [763, "FRONTIER_MON_REGICE_1"], [764, "FRONTIER_MON_REGISTEEL_1"],
      [786, "FRONTIER_MON_REGISTEEL_3"],
    ]);
    expect(result.carriers.lowest).toEqual({
      index: 252, label: "FRONTIER_MON_TORKOAL_1", species: "SPECIES_TORKOAL",
      moves: ["MOVE_EMBER", "MOVE_FIRE_SPIN", "MOVE_SMOKESCREEN", "MOVE_AMNESIA"],
      itemName: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY", nature: "NATURE_RELAXED",
      evSpreadStats: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_HP"],
    });
    expect(result.controls).toEqual({
      exactPsychicBackground: ["MOVE_HYPNOSIS", "MOVE_CONFUSION", "MOVE_PSYCHIC", "MOVE_DREAM_EATER", "MOVE_PSYBEAM", "MOVE_LUSTER_PURGE"],
      hypnosis: "distinct six-GoldRing target-path body; no Amnesia acceptance transfers",
      independence: "controls are status-only regression identities and confer no component, latch, or move acceptance",
    });
  });

  it.each(["player-back", "opponent-front"] as const)("validates the %s complete legal party-only Torkoal stage", (side) => {
    const config = fixture.orientations[side];
    const stage = JSON.parse(readFileSync(resolve(root, config.scenario), "utf8")) as Json;
    const validated = validateStage(config.scenario);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 1, battleNum: 0, trainerId: 100 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual([...completePartyKeys].sort());
        expect(mon.level).toBe(50); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6); expect(Object.keys(mon.evs)).toHaveLength(6);
        for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    const attacker = side === "player-back" ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    expect(attacker).toMatchObject({ species: 321, level: 50, nature: 7, moves: [133, 133, 133, 133], item: 142, abilitySlot: 0, friendship: 70, gender: "male", shiny: false });
    expect(stage.trace).not.toHaveProperty("captureFrames");
  });

  it("replays every retained state/RGB/change-map row and promotes only Amnesia", () => {
    const first = verifyAmnesiaEvidence(), second = verifyAmnesiaEvidence();
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schema: "amnesia-bilateral-evidence/v1", status: "exact", coverageCredit: true, sourceAuditRunSha256: "80abd30fed54afb45f8ffd583aef228f9bad23f718f00e4996daf5c93ee5b017" });
    for (const side of ["player-back", "opponent-front"] as const) expect(first.orientations[side]).toMatchObject({ rows: 216, sourceWindow: { startFrame: 205, endFrame: 420, frameCount: 216, sourceFrameCount: 216 }, changedRows: 142, questionMark: [52, 174], psychicTask: [23, 194], cleanup: { age: 215, active: false } });
    expect(fixture.evidenceScope).toMatchObject({ productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, componentTrackCredit: false, latchPromotion: false, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, siblingAcceptance: false, transientOverrides: [] });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(245);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_AMNESIA")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_HYPNOSIS")).toMatchObject({ status: "exact" });
  });
});
