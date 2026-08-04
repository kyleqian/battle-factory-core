import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backShrinkGrowVibrateFrameAtTick,
  backShrinkGrowVibrateTerminalSpriteData,
  backShrinkGrowVibrateWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import shedinjaScenario from "../../tools/compare/fixtures/sendout-back-shedinja-fast-shrink-grow-vibrate.json" with { type: "json" };
import shedinjaRunA from "../../tools/compare/fixtures/sendout-back-shedinja-fast-shrink-grow-vibrate-run-a.json" with { type: "json" };
import shedinjaRunB from "../../tools/compare/fixtures/sendout-back-shedinja-fast-shrink-grow-vibrate-run-b.json" with { type: "json" };
import raltsScenario from "../../tools/compare/fixtures/sendout-back-ralts-normal-shrink-grow-vibrate.json" with { type: "json" };
import raltsRunA from "../../tools/compare/fixtures/sendout-back-ralts-normal-shrink-grow-vibrate-run-a.json" with { type: "json" };
import raltsRunB from "../../tools/compare/fixtures/sendout-back-ralts-normal-shrink-grow-vibrate-run-b.json" with { type: "json" };
import abraScenario from "../../tools/compare/fixtures/sendout-back-abra-slow-shrink-grow-vibrate.json" with { type: "json" };
import abraRunA from "../../tools/compare/fixtures/sendout-back-abra-slow-shrink-grow-vibrate-run-a.json" with { type: "json" };
import abraRunB from "../../tools/compare/fixtures/sendout-back-abra-slow-shrink-grow-vibrate-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof shedinjaScenario;
type Run = typeof shedinjaRunA;
type Case = {
  readonly label: string;
  readonly speciesName: "SHEDINJA" | "RALTS" | "ABRA";
  readonly speciesId: 303 | 392 | 63;
  readonly natureId: 14 | 6 | 1;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 21 | 5 | 90;
  readonly selector: "ANIM_SHRINK_GROW_VIBRATE_FAST" | "ANIM_SHRINK_GROW_VIBRATE" | "ANIM_SHRINK_GROW_VIBRATE_SLOW";
  readonly initializer: "Anim_ShrinkGrowVibrate_Fast" | "Anim_ShrinkGrowVibrate" | "Anim_ShrinkGrowVibrate_Slow";
  readonly sourceId: 133 | 134 | 135;
  readonly cycle: 40 | 80;
  readonly duration: 40 | 80;
  readonly startFrame: 1836 | 1837 | 1840;
  readonly expectedY: 86 | 91 | 93;
  readonly rawBytes: 40911 | 21548 | 40902;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "shedinja-fast-shrink-grow-vibrate", speciesName: "SHEDINJA", speciesId: 303, natureId: 14, natureMod: 0, sourceIndex: 21, selector: "ANIM_SHRINK_GROW_VIBRATE_FAST", initializer: "Anim_ShrinkGrowVibrate_Fast", sourceId: 133, cycle: 40, duration: 80, startFrame: 1840, expectedY: 86, rawBytes: 40911, rawSha256: "c2a45100d6439267f90292268772216844e2a2bb642c93a68dffe8570be85df4", scenario: shedinjaScenario, runA: shedinjaRunA, runB: shedinjaRunB },
  { label: "ralts-normal-shrink-grow-vibrate", speciesName: "RALTS", speciesId: 392, natureId: 6, natureMod: 1, sourceIndex: 5, selector: "ANIM_SHRINK_GROW_VIBRATE", initializer: "Anim_ShrinkGrowVibrate", sourceId: 134, cycle: 40, duration: 40, startFrame: 1837, expectedY: 93, rawBytes: 21548, rawSha256: "a9b1f9c6c8d3ef0ee8dab0c39af346404c96e9781ebc7446152530023c42a1b9", scenario: raltsScenario as Scenario, runA: raltsRunA as unknown as Run, runB: raltsRunB as unknown as Run },
  { label: "abra-slow-shrink-grow-vibrate", speciesName: "ABRA", speciesId: 63, natureId: 1, natureMod: 2, sourceIndex: 90, selector: "ANIM_SHRINK_GROW_VIBRATE_SLOW", initializer: "Anim_ShrinkGrowVibrate_Slow", sourceId: 135, cycle: 80, duration: 80, startFrame: 1836, expectedY: 91, rawBytes: 40902, rawSha256: "3cdc7412eeedcf3a52a48d355bbc8dd7754a5e1c981227ea21434ea211e0b8d6", scenario: abraScenario as Scenario, runA: abraRunA as unknown as Run, runB: abraRunB as unknown as Run },
];

function assertCompleteLegalParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, preCheckpointCaptureAllFrames: true });
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({ level: 50, item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean), ppUps: [0, 0, 0, 0] });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.values(mon.evs).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
  }
}

describe("BACK_ANIM_SHRINK_GROW_VIBRATE Scene-ON evidence", () => {
  it("uses one complete legal Factory representative for every real nature modifier", () => {
    expect(frontierMons.entries.find(({ index }) => index === 21)).toMatchObject({ label: "FRONTIER_MON_SHEDINJA", species: "SPECIES_SHEDINJA", moves: ["MOVE_SHADOW_BALL", "MOVE_CONFUSE_RAY", "MOVE_SILVER_WIND", "MOVE_GRUDGE"], itemTableId: 54, nature: "NATURE_NAIVE" });
    expect(frontierMons.entries.find(({ index }) => index === 5)).toMatchObject({ label: "FRONTIER_MON_RALTS", species: "SPECIES_RALTS", moves: ["MOVE_CONFUSION", "MOVE_IMPRISON", "MOVE_DOUBLE_TEAM", "MOVE_LIGHT_SCREEN"], itemTableId: 35, nature: "NATURE_DOCILE" });
    expect(frontierMons.entries.find(({ index }) => index === 90)).toMatchObject({ label: "FRONTIER_MON_ABRA", species: "SPECIES_ABRA", moves: ["MOVE_MIMIC", "MOVE_METRONOME", "MOVE_FLASH", "MOVE_SEISMIC_TOSS"], itemTableId: 35, nature: "NATURE_LONELY" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, nature: fixture.natureId, friendship: 70, shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ backAnimSetIndex: 19, natureMod: fixture.natureMod, selector: fixture.selector });
      expect(fixture.runA.selectorEvidence).toContain(`record index ${fixture.sourceIndex}`);
    }
  });

  it.each(CASES)("pins every framebuffer/RAM/OAM/matrix frame in paired $label receipts", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({ schema: "back-shrink-grow-vibrate-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_SHRINK_GROW_VIBRATE", sourceBackAnimSetIndex: 19, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceCycle: fixture.cycle, sourceDuration: fixture.duration, sourceEvenAmplitude: 32, sourceOddAmplitude: 8, sourceOverflow: "data[2] > data[7]", sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.duration + 3, frameCount: fixture.duration + 4 } });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "ShrinkGrowVibrate", "WaitAnimEnd", "SpriteCallbackDummy"].sort());
    const frames = fixture.runA.frames;
    expect(frames.map(({ frame }) => frame)).toEqual(Array.from({ length: fixture.duration + 4 }, (_, index) => fixture.startFrame + index));
    expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    expect(frames[0]).toMatchObject({ battler0: { flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer, centerToCornerVecX: -32, centerToCornerVecY: -32, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    for (let tick = 0; tick <= fixture.duration; tick += 1) {
      const model = backShrinkGrowVibrateFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]).toMatchObject({ battler0: { flags: 4097, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: model.y2, data: [0, 1, model.data2, 0, model.data4, model.data5, fixture.cycle, fixture.duration], callbackSymbol: fixture.initializer, centerToCornerVecX: -64, centerToCornerVecY: -64, oam: { affineMode: 3, matrix: [model.xScale, 0, 0, model.yScale], raw: expect.stringMatching(/^[0-9a-f]{16}$/) } } });
    }
    const terminal = backShrinkGrowVibrateFrameAtTick(fixture.speciesName, fixture.natureId, fixture.duration + 1, 1)!;
    expect(frames[fixture.duration + 2]).toMatchObject({ battler0: { flags: 4097, x2: 0, y2: 0, data: [0, 1, terminal.data2, 0, 256, 256, fixture.cycle, fixture.duration], callbackSymbol: "WaitAnimEnd", centerToCornerVecX: -32, centerToCornerVecY: -32, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames.at(-1)).toMatchObject({ battler0: { data: backShrinkGrowVibrateTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId), callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backShrinkGrowVibrateWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShrinkGrowVibrateWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
