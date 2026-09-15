import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-giga-drain-player-roselia-opponent-onix.json",
  "tools/battle-lab/mechanic-giga-drain-opponent-roselia-player-onix.json",
] as const;

const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_GIGA_DRAIN source and legal staging checkpoint", () => {
  it("pins the exclusive interval, complete graph, 24 literal orbs, and source-only controls", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/gigaDrainSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_GIGA_DRAIN",
      sourceBounds: {
        start: "0x082d1242", endExclusive: "0x082d12b1",
        evenPointerStart: "0x082d1242", bytes: 111,
        through: "cleanup end before GigaDrainAbsorbEffect",
      },
      subroutineBounds: {
        GigaDrainAbsorbEffect: { start: "0x082d12b1", endExclusive: "0x082d144a", bytes: 409 },
        HealingEffect: { start: "0x082d79df", endExclusive: "0x082d7a28", bytes: 73 },
      },
      audio: {
        impact: "SE_M_ABSORB/SOUND_PAN_TARGET",
        perGroup: "SE_M_GIGA_DRAIN/SOUND_PAN_TARGET",
        perGroupCount: 8,
        absorptionOrbCount: 24,
        healing: "SE_M_ABSORB_2/SOUND_PAN_ATTACKER",
      },
      fireSpread: {
        gigaDrainSpriteCommands: 0,
        generatedGraphComponent: false,
        sourceOwner: "FireSpreadEffect",
        sourceOwnerCommandCount: 7,
      },
      differencesFromControls: {
        blend: { gigaDrain: 12, absorb: 4, megaDrain: 8 },
        impactAnimation: { gigaDrain: 0, absorb: 2, megaDrain: 1 },
        orbSchedule: { gigaDrain: "8 groups / 24 total", absorb: "8 sequential / 8 total", megaDrain: "8 pairs / 16 total" },
        orbAudio: { gigaDrain: "SE_M_GIGA_DRAIN", absorb: "SE_M_CRABHAMMER", megaDrain: "SE_M_BUBBLE3" },
        fireSpread: { gigaDrain: 0, absorb: 0, megaDrain: 0 },
      },
      dependencies: {
        subroutines: ["GigaDrainAbsorbEffect", "HealingEffect"],
        tasks: ["AnimTask_ShakeMon"],
        sprites: [
          "gAbsorptionOrbSpriteTemplate", "gBasicHitSplatSpriteTemplate",
          "gHealingBlueStarSpriteTemplate", "gSimplePaletteBlendSpriteTemplate",
        ],
        assets: ["ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT"],
        cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
      },
      controls: {
        MOVE_ABSORB: "exact control only; no latch, timeline, or acceptance inheritance",
        MOVE_MEGA_DRAIN: "exact control only; no latch, timeline, or acceptance inheritance",
        MOVE_GIGA_DRAIN: "exact after independent bilateral dense acceptance",
      },
    });
    expect(audit.components).toEqual([
      "asset:ANIM_TAG_BLUE_STAR", "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_ORBS",
      "sprite:gHealingBlueStarSpriteTemplate", "subroutine:GigaDrainAbsorbEffect",
      "subroutine:HealingEffect", "task:AnimTask_ShakeMon", "visualCommand:blendoff",
      "visualCommand:clearmonbg", "visualCommand:create_absorption_orb_sprite",
      "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha",
      "visualCommand:simple_palette_blend", "visualCommand:splitbgprio_foes",
    ]);
    expect(audit.sourceRom).toMatchObject({
      moveBody: { bytes: 111, sha256: "6f7d2588e4edb2069775510c431ae68c949c9c6ae3230cc025dc8328045d0aac" },
      gigaDrainAbsorbEffect: { bytes: 409, sha256: "55b304fb89211b99dfbe4f805d88c554bc17158243e66dd31efa3cf64e110ddc" },
      healingEffect: { bytes: 73, sha256: "3c0702c6d7e94617b3a37033405b36a77da9d7d155eb344a33e4dfe0f164adb6" },
      shakeMon: { bytes: 292, sha256: "49d8612671dd6236c3eb93d8d9d084fd5c75d795958db5ff920023008b485ad6" },
      absorptionOrb: { bytes: 108, sha256: "2254538ed4abc7c14c5af5c5891bed2585ba22f6fd80a8b45aca3894d920ef1c" },
      simplePaletteBlend: { bytes: 168, sha256: "8d9d924fda6ac972c3431ddb26abb9ab7d0fd9a32919eb4baa3c2c909bf33c4a" },
    });
    expect(audit.orbGroups).toHaveLength(8);
    const orbs = audit.orbGroups.flat();
    expect(orbs).toHaveLength(24);
    expect(orbs.map((orb: { waveAmplitude: number }) => orb.waveAmplitude)).toEqual([
      8, -40, 20, 28, -8, 40, -8, 16, -32, -16, 8, -8,
      16, -16, 8, 8, 16, -40, 36, -8, 20, 8, 8, -20,
    ]);
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
    expect(audit.carrier).toMatchObject({
      lowestLevel50: {
        index: 276, label: "FRONTIER_MON_ROSELIA_2", species: "SPECIES_ROSELIA",
        nature: "NATURE_DOCILE",
        moves: ["MOVE_GIGA_DRAIN", "MOVE_SLUDGE_BOMB", "MOVE_GRASS_WHISTLE", "MOVE_SYNTHESIS"],
      },
      stageConstants: { ROSELIA: 363, ONIX: 95, GIGA_DRAIN: 202, TACKLE: 33, DOCILE: 6, QUICK_CLAW: 183 },
    });
    expect(audit.latchRequirement).toContain("No Absorb or Mega Drain latch is inherited");
  });

  it.each(scenarios)("keeps complete legal, capture-free Scene-ON staging in %s", (path) => {
    const bytes = readFileSync(path);
    const stage = JSON.parse(bytes.toString("utf8")) as Record<string, any>;
    expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, seed: 305419897 });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const transient of ["battlers", "hp", "outcome", "sideConditions", "stages", "status", "weather"]) {
      expect(stage.overrides).not.toHaveProperty(transient);
    }
    const parties = stage.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    const attacker = path.includes("player-roselia") ? parties.player : parties.opponent;
    const defender = path.includes("player-roselia") ? parties.opponent : parties.player;
    expect(attacker.every((mon) => mon.species === 363 && mon.level === 50
      && mon.nature === 6 && typeof mon.item === "number" && mon.item > 0 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === JSON.stringify([202, 202, 202, 202]))).toBe(true);
    expect(attacker[0]?.item).toBe(183);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50
      && typeof mon.item === "number" && mon.item > 0 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    expect(new Set([...attacker, ...defender].map((mon) => mon.item)).size).toBe(6);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      path.includes("player-roselia")
        ? "0991d630b159bd62343a2b27ec077a3fb1e0f5714e6e2f449d13f2a9ef785f60"
        : "a35d5c3e4152a7e35199f8edc52694e8cccab2ec3cf937191c0052085567de56",
    );
  });

  it("promotes Giga Drain alone without inheriting sibling acceptance", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      entries: Array<{ move: string; status: string }>;
      queue: string[];
    };
    for (const move of ["MOVE_ABSORB", "MOVE_MEGA_DRAIN"]) {
      expect(coverage.entries.find((entry) => entry.move === move)).toMatchObject({ status: "exact" });
    }
    expect(coverage.entries.find((entry) => entry.move === "MOVE_GIGA_DRAIN")).toMatchObject({ status: "exact" });
    expect(coverage.queue).not.toContain("MOVE_GIGA_DRAIN");
    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(256);
    const report = execFileSync("npm", ["run", "animation:coverage", "--silent"], { encoding: "utf8" });
    expect(report).toContain("Level 50: 256/276 exact, 0 partial, 0 staged, 20 unsupported");
  });
});
