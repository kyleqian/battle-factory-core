import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-mega-drain-player-skiploom-opponent-onix.json",
  "tools/battle-lab/mechanic-mega-drain-opponent-skiploom-player-onix.json",
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

describe("MOVE_MEGA_DRAIN source and legal staging checkpoint", () => {
  it("pins the exclusive body, every source-owned dependency, and its non-Absorb differences", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/megaDrainSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_MEGA_DRAIN",
      sourceBounds: {
        start: "0x082d10b2", endExclusive: "0x082d1121",
        evenPointerStart: "0x082d10b2", bytes: 111,
      },
      subroutineBounds: {
        MegaDrainAbsorbEffect: { start: "0x082d1121", endExclusive: "0x082d1242", bytes: 289 },
        HealingEffect: { start: "0x082d79df", endExclusive: "0x082d7a28", bytes: 73 },
      },
      audio: {
        impact: "SE_M_ABSORB/SOUND_PAN_TARGET",
        perPair: "SE_M_BUBBLE3/SOUND_PAN_TARGET",
        perPairCount: 8,
        healing: "SE_M_ABSORB_2/SOUND_PAN_ATTACKER",
      },
      differencesFromAbsorb: {
        blend: { megaDrain: 8, absorb: 4 },
        impactAnimation: { megaDrain: 1, absorb: 2 },
        orbSchedule: { megaDrain: "8 pairs / 16 total", absorb: "8 sequential / 8 total" },
        orbAudio: { megaDrain: "SE_M_BUBBLE3", absorb: "SE_M_CRABHAMMER" },
      },
      dependencies: {
        subroutines: ["MegaDrainAbsorbEffect", "HealingEffect"],
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
        MOVE_DREAM_EATER: "source-audit control only; remains independently unsupported",
        MOVE_GIGA_DRAIN: "exact independent control; no latch, timeline, or acceptance inheritance",
      },
    });
    expect(audit.components).toEqual([
      "asset:ANIM_TAG_BLUE_STAR", "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_ORBS",
      "sprite:gHealingBlueStarSpriteTemplate", "subroutine:HealingEffect",
      "subroutine:MegaDrainAbsorbEffect", "task:AnimTask_ShakeMon",
      "visualCommand:blendoff", "visualCommand:clearmonbg",
      "visualCommand:create_absorption_orb_sprite", "visualCommand:create_basic_hitsplat_sprite",
      "visualCommand:monbg", "visualCommand:setalpha",
      "visualCommand:simple_palette_blend", "visualCommand:splitbgprio_foes",
    ]);
    expect(audit.orbPairs).toHaveLength(8);
    expect(audit.orbPairs.flat()).toHaveLength(16);
    expect(audit.orbPairs[0]).toEqual([
      { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
      { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
    ]);
    expect(audit.orbPairs[7]).toEqual(audit.orbPairs[0]);
    expect(audit.carrier).toMatchObject({
      lowestLevel50: {
        index: 129, label: "FRONTIER_MON_SKIPLOOM", species: "SPECIES_SKIPLOOM",
        nature: "NATURE_DOCILE",
        moves: ["MOVE_MEGA_DRAIN", "MOVE_CONFUSION", "MOVE_COTTON_SPORE", "MOVE_SYNTHESIS"],
      },
      stageConstants: { SKIPLOOM: 188, ONIX: 95, MEGA_DRAIN: 72, TACKLE: 33, DOCILE: 6, PERSIM_BERRY: 140 },
    });
    expect(audit.carrier.allLevel50.map((entry: { index: number }) => entry.index))
      .toEqual([129, 139, 157, 216]);
    expect(audit.sourceRom).toMatchObject({
      moveBody: { bytes: 111, sha256: "61e8de67b2071b64f0675b009c849b79279b67f01cf8ee7c5ef435f6b4f1a9e4" },
      megaDrainAbsorbEffect: { bytes: 289, sha256: "4671a690dd416bf99d049bd6a91b867024500622c3dd7e2709b9c80c470e5bcd" },
      healingEffect: { bytes: 73, sha256: "3c0702c6d7e94617b3a37033405b36a77da9d7d155eb344a33e4dfe0f164adb6" },
      shakeMon: { bytes: 292, sha256: "49d8612671dd6236c3eb93d8d9d084fd5c75d795958db5ff920023008b485ad6" },
      absorptionOrb: { bytes: 108, sha256: "2254538ed4abc7c14c5af5c5891bed2585ba22f6fd80a8b45aca3894d920ef1c" },
      simplePaletteBlend: { bytes: 168, sha256: "8d9d924fda6ac972c3431ddb26abb9ab7d0fd9a32919eb4baa3c2c909bf33c4a" },
    });
    expect(audit.latchRequirement).toContain("No Absorb latch is inherited");
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
    const attacker = path.includes("player-skiploom") ? parties.player : parties.opponent;
    const defender = path.includes("player-skiploom") ? parties.opponent : parties.player;
    expect(attacker.every((mon) => mon.species === 188 && mon.level === 50
      && mon.nature === 6 && mon.item === 140 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === JSON.stringify([72, 72, 72, 72]))).toBe(true);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50
      && mon.item === 0 && mon.abilitySlot === 0
      && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      path.includes("player-skiploom")
        ? "08dfbd7f5b606321e3c2829865f53f76523a95bc4017f6a6e0f770b1b0c2193f"
        : "b851d96d56e8d53d29a4e8e4cc36c071c935a483b994ef70005fdc4deb18f71c",
    );
  });

  it("retains Mega Drain alongside each independently accepted drain move", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as {
      entries: Array<{ move: string; status: string }>;
      queue: string[];
    };
    expect(coverage.entries.find((entry) => entry.move === "MOVE_ABSORB"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry) => entry.move === "MOVE_MEGA_DRAIN"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry) => entry.move === "MOVE_GIGA_DRAIN"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry) => entry.move === "MOVE_DREAM_EATER"))
      .toMatchObject({ status: "exact" });
    expect(coverage.queue).not.toContain("MOVE_MEGA_DRAIN");
    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(229);
    const report = execFileSync("npm", ["run", "animation:coverage", "--silent"], { encoding: "utf8" });
    expect(report).toContain("Level 50: 229/276 exact, 0 partial, 0 staged, 47 unsupported");
  });
});
