import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/fire-blast-animation-source-staging.json" with { type: "json" };

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

describe("MOVE_FIRE_BLAST authoritative-source checkpoint", () => {
  it("pins the complete root/subroutine interval, command order, callbacks, OAM, asset, audio, and component graph", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/fireBlastSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: fixture.move,
      moveId: fixture.moveId,
      status: "unsupported-source-staging-checkpoint",
      source: fixture.source,
      sourceHashes: fixture.sourceHashes,
      scripts: fixture.scripts,
      ringPhases: fixture.ringPhases,
      crossVectors: fixture.crossVectors,
      lifecycle: {
        loads: ["ANIM_TAG_SMALL_EMBER"],
        unloads: [],
        ringSubroutineCalls: 3,
        ringSpritesPerCall: 5,
        crossSubroutineCalls: 9,
        crossSpritesPerCall: 5,
        oam: expect.stringContaining("AffineOff ObjNormal 32x32"),
        palette: ["F_PAL_BG 3,0,8 RGB_BLACK", "F_PAL_BG 2,8,0 RGB_BLACK"],
        audio: expect.stringContaining("source tick 111"),
      },
      sideDependencies: {
        ring: expect.stringContaining("attacker picture coordinates"),
        cross: expect.stringContaining("target-relative"),
        shake: expect.stringContaining("ANIM_TARGET, 5,0,20,1"),
        palette: expect.stringContaining("F_PAL_BG"),
        audio: expect.stringContaining("reverses"),
      },
      components: [
        "asset:ANIM_TAG_SMALL_EMBER", "soundTask:SoundTask_FireBlast",
        "sprite:gFireBlastCrossSpriteTemplate", "sprite:gFireBlastRingSpriteTemplate",
        "subroutine:FireBlastCross", "subroutine:FireBlastRing",
        "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ShakeMon",
      ],
      carrier: {
        lowestLegal: fixture.carrier.lowestLegal,
        challenge2Range: fixture.carrier.challenge2Range,
      },
      ownership: { gpuRegisters: false, gameplayState: false, renderer: false },
    });
    expect(audit.carrier.allLevel50).toHaveLength(18);
    expect(audit.carrier.allLevel50[0]).toMatchObject({
      index: fixture.carrier.lowestLegal.index,
      label: fixture.carrier.lowestLegal.label,
      species: fixture.carrier.lowestLegal.species,
    });
  });

  it("keeps Fire Blast distinct from its exact fire controls after its independent promotion", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/fireBlastSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit.sharedControls.dragonBreath).toContain("not Fire Blast");
    expect(audit.sharedControls.flamethrower).toContain("not Fire Blast");
    expect(audit.sharedControls.blazeKick).toContain("does not exercise");
    expect(audit.sharedControls.ember).toContain("does not prove");
    expect(audit.sharedControls.fireSpin).toContain("independent");
    expect(audit.sharedControls.projectilePrimitives).toContain("no Fire Blast acceptance credit");
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) => entry.move === fixture.move))
      .toMatchObject({ status: "exact" });
    expect(fixture.coverageCredit).toBe(false);
  });

  it.each([
    ["playerBack", true], ["opponentFront", false],
  ] as const)("keeps %s as a complete legal Scene-ON party stage with a capture-free endpoint", (orientation, playerAttacker) => {
    const stageFixture = fixture.stages[orientation];
    const bytes = readFileSync(stageFixture.scenario);
    const stage = JSON.parse(bytes.toString("utf8")) as Record<string, any>;
    expect(stage).toMatchObject({
      schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 2, battleNum: 2, trainerId: 110,
      playerSetIds: playerAttacker ? [359, 360, 361] : [267, 268, 269],
      opponentSetIds: playerAttacker ? [267, 268, 269] : [359, 360, 361],
      seed: playerAttacker ? 305419901 : 305419903,
    });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(stage).not.toHaveProperty("preCheckpointCaptureAllFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    for (const transient of ["battlers", "hp", "outcome", "sideConditions", "stages", "status", "weather"]) {
      expect(stage.overrides).not.toHaveProperty(transient);
    }
    expect(stage.trace.segments.every((segment: { frames: number; buttons: string[] }) =>
      segment.frames > 0 && segment.buttons.every((button) => button === "A"))).toBe(true);
    const parties = stage.overrides.parties as Record<string, Record<string, unknown>[]>;
    expect(parties.player).toHaveLength(3);
    expect(parties.opponent).toHaveLength(3);
    [...parties.player, ...parties.opponent].forEach(expectCompletePartyRecord);
    const attacker = playerAttacker ? parties.player : parties.opponent;
    const defender = playerAttacker ? parties.opponent : parties.player;
    expect(attacker.every((mon) => mon.species === 224 && mon.level === 50
      && mon.nature === 24 && mon.item === 221 && mon.abilitySlot === 0
      && JSON.stringify(mon.evs) === JSON.stringify({ hp: 170, attack: 0, defense: 170, speed: 0, spAttack: 0, spDefense: 170 })
      && JSON.stringify(mon.moves) === JSON.stringify([126, 126, 126, 126]))).toBe(true);
    expect(defender.every((mon) => mon.species === 95 && mon.level === 50
      && JSON.stringify(mon.moves) === JSON.stringify([33, 33, 33, 33]))).toBe(true);
    for (const mon of [...parties.player, ...parties.opponent]) {
      for (const transient of ["hp", "status", "statStages", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(sha256(stageFixture.scenario)).toBe(stageFixture.scenarioSha256);
    expect(stageFixture.endpoint).toMatchObject({ frame: 934, allPartyChecksumsValid: true });
    expect(stageFixture.endpoint.fireBlastPp[stageFixture.endpoint.consumedFireBlastPpSlot]).toBe(4);
    expect(stageFixture.endpoint.fireBlastPp.reduce((total, pp) => total + pp, 0)).toBe(19);
    expect(stageFixture.endpoint.partyChecksums).toEqual({
      player: [true, true, true], opponent: [true, true, true],
    });
  });
});
