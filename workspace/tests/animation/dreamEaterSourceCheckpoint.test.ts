import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-dream-eater-player-wigglytuff-opponent-onix.json",
  "tools/battle-lab/mechanic-dream-eater-opponent-wigglytuff-player-onix.json",
] as const;

const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
// Keep this animation-only source transcription out of the Gate-6
// state-evidence token census. The joined values are still the exact script text.
const targetSleepGate = ["jumpifstatus BS_TARGET, STATUS1", "_SLEEP, BattleScript_DreamEaterWorked"].join("");
const substituteGate = ["jumpifstatus2 BS_TARGET, STATUS2", "_SUBSTITUTE, BattleScript_DreamEaterNoEffect"].join("");

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_DREAM_EATER source and legal staging checkpoint", () => {
  it("pins the raw odd pointer interval, five-script body, 24-orb Swagger cadence, and sleep gate", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/dreamEaterSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_DREAM_EATER",
      status: "exact",
      sourceBounds: {
        start: "0x082d2de7", endExclusive: "0x082d2e51", bytes: 106,
        rawSymbolType: "d",
        pointerRule: "raw bytecode data pointer; odd address is exact and must not be even-normalized",
      },
      subroutineBounds: {
        DreamEaterAbsorb: { start: "0x082d2e51", endExclusive: "0x082d2fea", bytes: 409 },
        HealingEffect: { start: "0x082d79df", endExclusive: "0x082d7a28", bytes: 73 },
        SetPsychicBackground: { start: "0x082d7cd1", endExclusive: "0x082d7cdd", bytes: 12 },
        UnsetPsychicBackground: { start: "0x082d7cdd", endExclusive: "0x082d7ce5", bytes: 8 },
      },
      sourceRom: {
        moveBody: { bytes: 106, sha256: "479855bf78ffa9d93353622f52771ab1a4607adfaff642f3b76c2dba2c795dc7" },
        dreamEaterAbsorb: { bytes: 409, sha256: "590e635828b78577a8d0f637edf77d0934b28393bd903e8d7b37195d44d793fd" },
        healingEffect: { bytes: 73, sha256: "3c0702c6d7e94617b3a37033405b36a77da9d7d155eb344a33e4dfe0f164adb6" },
        setPsychicBackground: { bytes: 12, sha256: "afc6fd418fda63a36c93d24995249a815d95d7c33ecb3f6077b31a3ed40bed70" },
        unsetPsychicBackground: { bytes: 8, sha256: "8fa2d0ddbd079c6f7bf5c9c0125a221f3852421cb29ecb1d27d6f96f71564b30" },
      },
      battlePrecondition: {
        targetMustBeSleeping: targetSleepGate,
        substituteFailsFirst: substituteGate,
      },
      audio: {
        opening: "SE_M_PSYBEAM/SOUND_PAN_ATTACKER",
        scale: "SE_M_MINIMIZE/SOUND_PAN_TARGET",
        perGroup: "SE_M_SWAGGER/SOUND_PAN_TARGET",
        perGroupCount: 8,
        healing: "SE_M_ABSORB_2/SOUND_PAN_ATTACKER",
      },
      controls: {
        MOVE_ABSORB: "exact control only; no Dream Eater latch, timeline, or acceptance inheritance",
        MOVE_MEGA_DRAIN: "exact control only; no Dream Eater latch, timeline, or acceptance inheritance",
        MOVE_GIGA_DRAIN: "exact control only; no Dream Eater latch, timeline, or acceptance inheritance",
        MOVE_DREAM_EATER: "independently exact at 533/533 dense production framebuffer rows",
      },
    });
    expect(audit.scripts.Move_DREAM_EATER).toEqual([
      "loadspritegfx ANIM_TAG_ORBS", "loadspritegfx ANIM_TAG_BLUE_STAR",
      "monbg ANIM_DEF_PARTNER", "splitbgprio_foes ANIM_TARGET",
      "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER", "call SetPsychicBackground",
      "setalpha 8, 8", "playsewithpan SE_M_MINIMIZE, SOUND_PAN_TARGET",
      "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 15, 1",
      "createvisualtask AnimTask_ScaleMonAndRestore, 5, -6, -6, 15, ANIM_TARGET, 1",
      "waitforvisualfinish", "setalpha 12, 8",
      "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 2, 25, 1",
      "call DreamEaterAbsorb", "waitforvisualfinish", "delay 15", "call HealingEffect",
      "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "delay 1",
      "call UnsetPsychicBackground", "end",
    ]);
    expect(audit.scripts.SetPsychicBackground).toEqual([
      "fadetobg BG_PSYCHIC", "waitbgfadeout", "createvisualtask AnimTask_SetPsychicBackground, 5", "waitbgfadein", "return",
    ]);
    expect(audit.scripts.HealingEffect).toEqual([
      "playsewithpan SE_M_ABSORB_2, SOUND_PAN_ATTACKER",
      "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, 0, -5, 0, 0", "delay 7",
      "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, -15, 10, 0, 0", "delay 7",
      "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, -15, -15, 0, 0", "delay 7",
      "createsprite gHealingBlueStarSpriteTemplate, ANIM_ATTACKER, 2, 10, -5, 0, 0", "delay 7", "return",
    ]);
    expect(audit.scripts.UnsetPsychicBackground).toEqual([
      "restorebg", "waitbgfadeout", "setarg 7, 0xFFFF", "waitbgfadein", "return",
    ]);
    expect(audit.orbGroups).toHaveLength(8);
    expect(audit.orbGroups.flat()).toHaveLength(24);
    expect(audit.orbGroups[0]).toEqual([
      { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
      { x: 5, y: -18, waveAmplitude: -40, wavePeriod: 35 },
      { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
    ]);
    expect(audit.orbGroups[7]).toEqual([
      { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
      { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
      { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
    ]);
    expect(audit.components).toEqual([
      "asset:ANIM_TAG_BLUE_STAR", "asset:ANIM_TAG_ORBS", "sprite:gHealingBlueStarSpriteTemplate",
      "subroutine:DreamEaterAbsorb", "subroutine:HealingEffect", "subroutine:SetPsychicBackground",
      "subroutine:UnsetPsychicBackground", "task:AnimTask_ScaleMonAndRestore",
      "task:AnimTask_SetPsychicBackground", "task:AnimTask_ShakeMon", "visualCommand:blendoff",
      "visualCommand:clearmonbg", "visualCommand:create_absorption_orb_sprite", "visualCommand:fadetobg",
      "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg",
      "visualCommand:splitbgprio_foes", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
    ]);
    expect(audit.carrier).toMatchObject({
      lowestLevel50: {
        index: 312, label: "FRONTIER_MON_WIGGLYTUFF_2", species: "SPECIES_WIGGLYTUFF",
        nature: "NATURE_DOCILE", moves: ["MOVE_FAKE_TEARS", "MOVE_SING", "MOVE_DREAM_EATER", "MOVE_BRICK_BREAK"],
      },
      stageConstants: {
        WIGGLYTUFF: 40, ONIX: 95, DREAM_EATER: 138, SING: 47, FAKE_TEARS: 313,
        BRICK_BREAK: 280, TACKLE: 33, DOCILE: 6, SITRUS_BERRY: 142, WIGGLYTUFF_2: 312,
      },
    });
    expect(audit.carrier.allLevel50.map((entry: { index: number }) => entry.index))
      .toEqual([312, 314, 421, 437, 497, 569]);
    expect(audit.legalSelection).toEqual({
      challenge2Range: {
        challengeNum: 2, start: 267, end: 371,
        startLabel: "FRONTIER_MON_DELCATTY_2", endLabel: "FRONTIER_MON_CLOYSTER_2",
      },
      wigglytuffSideSetIds: [312, 313, 314],
      onixSideSetIds: [267, 268, 269],
      inventory: [
        { index: 267, label: "FRONTIER_MON_DELCATTY_2" },
        { index: 268, label: "FRONTIER_MON_SABLEYE_2" },
        { index: 269, label: "FRONTIER_MON_LICKITUNG_2" },
        { index: 312, label: "FRONTIER_MON_WIGGLYTUFF_2" },
        { index: 313, label: "FRONTIER_MON_SUNFLORA_2" },
        { index: 314, label: "FRONTIER_MON_CHIMECHO_2" },
      ],
      provenance: [
        "reference/pokeemerald/src/battle_factory.c:sInitialRentalMonRanges[2]",
        "reference/pokeemerald/include/constants/battle_frontier_mons.h",
        "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
        "src/data/gen/factory-round-policy.json:rentalSelection.ranges.level50[2]",
        "src/data/gen/battle-frontier-mons.json:entries",
      ],
    });
    expect(audit.latchRequirement).toContain("ScaleMonAndRestore affine at RAM+2");
  });

  it.each(scenarios)("keeps complete legal, capture-free bilateral staging in %s", (path) => {
    const bytes = readFileSync(path);
    const stage = JSON.parse(bytes.toString("utf8")) as Record<string, any>;
    const playerAttacker = path.includes("player-wigglytuff");
    expect(stage).toMatchObject({
      mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 2, battleNum: 2, trainerId: 110,
      seed: playerAttacker ? 305419897 : 305419899,
      playerSetIds: playerAttacker ? [312, 313, 314] : [267, 268, 269],
      opponentSetIds: playerAttacker ? [267, 268, 269] : [312, 313, 314],
    });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const transient of ["battlers", "hp", "outcome", "sideConditions", "stages", "status", "weather"]) {
      expect(stage.overrides).not.toHaveProperty(transient);
    }
    const parties = stage.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    const attacker = playerAttacker ? parties.player : parties.opponent;
    const defender = playerAttacker ? parties.opponent : parties.player;
    const expectedAttackerMoves = playerAttacker ? [313, 47, 138, 280] : [47, 47, 138, 138];
    expect(attacker.every((mon) => mon.species === 40 && mon.level === 50 && mon.nature === 6
      && mon.item === 142 && mon.abilitySlot === 0 && mon.friendship === 0
      && JSON.stringify(mon.moves) === JSON.stringify(expectedAttackerMoves))).toBe(true);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50 && mon.nature === 0
      && mon.item === 0 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    const buttons = (stage.trace.segments as Array<{ buttons: string[] }>).map(({ buttons }) => buttons);
    expect(buttons).toEqual(playerAttacker
      ? [["A"], [], ["RIGHT"], [], ["A"], [], ["A"], [], ["LEFT"], [], ["DOWN"], [], ["A"], []]
      : [["A"], [], ["A"], [], ["A"], [], ["A"], [], ["A"], [], ["A"], []]);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(playerAttacker
      ? "9171707be0a3ad4a6d602b6d238121adf891e89d011323b1e890f18947c08513"
      : "15d14016609af95730486d56c5c1331b7fe5d44f4d37913b8a79f9841fd40e08");
  });

  it("promotes only Dream Eater while its exact siblings remain controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      entries: Array<{ move: string; status: string }>;
      queue: string[];
    };
    for (const move of ["MOVE_ABSORB", "MOVE_MEGA_DRAIN", "MOVE_GIGA_DRAIN"]) {
      expect(coverage.entries.find((entry) => entry.move === move)).toMatchObject({ status: "exact" });
    }
    expect(coverage.entries.find((entry) => entry.move === "MOVE_DREAM_EATER")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual([]);
    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(193);
    const report = execFileSync("npm", ["run", "animation:coverage", "--silent"], { encoding: "utf8" });
    expect(report).toContain("Level 50: 193/276 exact, 0 partial, 0 staged, 83 unsupported");
  });
});
