import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/heal-bell-animation-source-staging.json" with { type: "json" };

const completeRecordKeys = [
  "abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level",
  "moves", "nature", "ppUps", "shiny", "species",
];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function expectCompletePartyRecord(mon: Record<string, unknown>): void {
  expect(Object.keys(mon).sort()).toEqual([...completeRecordKeys].sort());
  expect(Object.keys(mon.ivs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(Object.keys(mon.evs as Record<string, unknown>).sort()).toEqual(statKeys);
  expect(mon.moves).toHaveLength(4);
  expect(mon.ppUps).toHaveLength(4);
}

describe("MOVE_HEAL_BELL authoritative-source and legal bilateral staging checkpoint", () => {
  it("pins the complete source interval, root/ring command order, note paths, callbacks, assets, palettes, and component graph", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/healBellSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: fixture.move,
      moveId: fixture.moveId,
      status: "unsupported-source-staging-checkpoint",
      source: fixture.source,
      lifecycle: {
        initialLoads: ["ANIM_TAG_BELL", "ANIM_TAG_MUSIC_NOTES_2", "ANIM_TAG_THIN_RING"],
        notePaletteTags: ["ANIM_TAG_MUSIC_NOTES_2", "ANIM_SPRITES_START - 1", "ANIM_SPRITES_START - 2"],
        ringCalls: 3,
        healBellAudioCues: 3,
        noteUnloadBeforeSparkles: ["ANIM_TAG_BELL", "ANIM_TAG_MUSIC_NOTES_2", "ANIM_TAG_THIN_RING"],
        sparkleReloadBoundary: ["load ANIM_TAG_SPARKLE_2", "unload ANIM_TAG_SPARKLE_2", "load ANIM_TAG_THIN_RING"],
        audio: ["SE_M_HEAL_BELL/SOUND_PAN_ATTACKER x3", "SE_M_MORNING_SUN/SOUND_PAN_ATTACKER", "SE_SHINY/SOUND_PAN_ATTACKER"],
      },
      sideDependencies: {
        bellAndRings: expect.stringContaining("ANIM_ATTACKER"),
        notes: expect.stringContaining("opponent"),
        sparklingStars: expect.stringContaining("doubles"),
        palettes: expect.stringContaining("selector 4"),
      },
      ownership: { gpuRegisters: false, gameplayState: false, renderer: false },
    });
    expect(audit.scripts.Move_HEAL_BELL).toHaveLength(44);
    expect(audit.scripts.Move_HEAL_BELL.filter((line: string) => line.includes("gHealBellMusicNoteSpriteTemplate"))).toHaveLength(12);
    expect(audit.scripts.Move_HEAL_BELL.filter((line: string) => line === "call HealBellRing")).toHaveLength(3);
    expect(audit.scripts.HealBellRing).toEqual([
      "createvisualtask AnimTask_BlendBattleAnimPalExclude, 10, 4, 3, 8, 0, RGB(12, 24, 30)",
      "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_ATK_SIDE, 3, 2, 10, RGB_WHITE",
      "createsprite gThinRingExpandingSpriteTemplate, ANIM_ATTACKER, 40, 0, -24, 0, 1",
      "playsewithpan SE_M_HEAL_BELL, SOUND_PAN_ATTACKER",
      "return",
    ]);
    expect(audit.noteGroups).toEqual([
      [
        { x: 48, y: -18, duration: 35, tileVariant: 0, paletteVariant: 0 },
        { x: -48, y: 20, duration: 30, tileVariant: 1, paletteVariant: 1 },
        { x: -38, y: -29, duration: 30, tileVariant: 2, paletteVariant: 2 },
        { x: 36, y: 18, duration: 30, tileVariant: 3, paletteVariant: 3 },
      ],
      [
        { x: 19, y: 26, duration: 35, tileVariant: 4, paletteVariant: 4 },
        { x: -34, y: -12, duration: 30, tileVariant: 5, paletteVariant: 5 },
        { x: 41, y: -20, duration: 34, tileVariant: 6, paletteVariant: 2 },
        { x: -15, y: 26, duration: 32, tileVariant: 7, paletteVariant: 0 },
      ],
      [
        { x: -48, y: 18, duration: 31, tileVariant: 0, paletteVariant: 2 },
        { x: 48, y: -20, duration: 30, tileVariant: 2, paletteVariant: 5 },
        { x: 38, y: 29, duration: 33, tileVariant: 4, paletteVariant: 3 },
        { x: -36, y: -18, duration: 30, tileVariant: 6, paletteVariant: 1 },
      ],
    ]);
    expect(audit.components).toEqual([
      "asset:ANIM_TAG_BELL", "asset:ANIM_TAG_MUSIC_NOTES_2", "asset:ANIM_TAG_SPARKLE_2",
      "asset:ANIM_TAG_THIN_RING", "sprite:gBellSpriteTemplate",
      "sprite:gBlendThinRingExpandingSpriteTemplate", "sprite:gHealBellMusicNoteSpriteTemplate",
      "sprite:gSparklingStarsSpriteTemplate", "sprite:gThinRingExpandingSpriteTemplate",
      "subroutine:HealBellRing", "task:AnimTask_BlendBattleAnimPal",
      "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_FreeMusicNotesPals",
      "task:AnimTask_LoadMusicNotesPals", "visualCommand:unloadspritegfx",
    ]);
    expect(audit.carrier).toMatchObject({
      allLevel50: [
        { index: 162, label: "FRONTIER_MON_DELCATTY_1" },
        { index: 209, label: "FRONTIER_MON_CHIMECHO_1" },
        { index: 314, label: "FRONTIER_MON_CHIMECHO_2" },
      ],
      legalChallenge2: {
        index: 314, label: "FRONTIER_MON_CHIMECHO_2", species: "SPECIES_CHIMECHO",
        moves: ["MOVE_PSYCHIC", "MOVE_HYPNOSIS", "MOVE_DREAM_EATER", "MOVE_HEAL_BELL"],
        item: "BATTLE_FRONTIER_ITEM_TWISTED_SPOON", nature: "NATURE_QUIET",
      },
      challenge2Range: { start: 267, end: 371 },
    });
  });

  it.each([
    ["playerBack", true], ["opponentFront", false],
  ] as const)("keeps %s as a complete legal Scene-ON party stage without transient injection or dense capture", (orientation, playerAttacker) => {
    const stageFixture = fixture.stages[orientation];
    const bytes = readFileSync(stageFixture.scenario);
    const stage = JSON.parse(bytes.toString("utf8")) as Record<string, any>;
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
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
    expect(attacker.every((mon) => mon.species === 411 && mon.level === 50
      && mon.nature === 17 && mon.item === 214 && mon.abilitySlot === 0
      && JSON.stringify(mon.evs) === JSON.stringify({ hp: 170, attack: 0, defense: 170, speed: 0, spAttack: 0, spDefense: 170 })
      && JSON.stringify(mon.moves) === JSON.stringify([215, 215, 215, 215]))).toBe(true);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50
      && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    for (const mon of [...parties.player, ...parties.opponent]) {
      for (const transient of ["hp", "status", "statStages", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(stage.trace.segments.every((segment: { frames: number; buttons: string[] }) => segment.frames > 0
      && segment.buttons.every((button) => button === "A"))).toBe(true);
    expect(sha256(stageFixture.scenario)).toBe(stageFixture.scenarioSha256);
    expect(stageFixture.endpoint).toMatchObject({ frame: 1234, allPartyChecksumsValid: true });
  });

  it("retains the stage-only receipt and independent exact controls after promotion", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/healBellSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit.sharedControls.musicNotes2).toContain("MOVE_PERISH_SONG");
    expect(audit.sharedControls.sparkle2).toContain("gSparklingStarsSpriteTemplate calls AnimSparklingStars rather than AnimGrantingStars");
    expect(audit.sharedControls.thinRing).toContain("do not prove Heal Bell");
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_HEAL_BELL"))
      .toMatchObject({ status: "exact" });
    // This older endpoint-only receipt remains honest; the later bilateral
    // dense fixture owns the exact promotion instead of rewriting history.
    expect(fixture.coverageCredit).toBe(false);
    expect(fixture.boundedRemainder).toContain("No reducer");
  });
});
