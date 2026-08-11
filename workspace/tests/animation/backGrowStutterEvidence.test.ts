import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backGrowStutterFrameAtTick,
  backGrowStutterWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import alakazamScenario from "../../tools/compare/fixtures/sendout-back-alakazam-slow-stutter.json" with { type: "json" };
import alakazamRunA from "../../tools/compare/fixtures/sendout-back-alakazam-slow-stutter-run-a.json" with { type: "json" };
import alakazamRunB from "../../tools/compare/fixtures/sendout-back-alakazam-slow-stutter-run-b.json" with { type: "json" };
import qwilfishScenario from "../../tools/compare/fixtures/sendout-back-qwilfish-twice-stutter.json" with { type: "json" };
import qwilfishRunA from "../../tools/compare/fixtures/sendout-back-qwilfish-twice-stutter-run-a.json" with { type: "json" };
import qwilfishRunB from "../../tools/compare/fixtures/sendout-back-qwilfish-twice-stutter-run-b.json" with { type: "json" };
import exploudScenario from "../../tools/compare/fixtures/sendout-back-exploud-normal-stutter.json" with { type: "json" };
import exploudRunA from "../../tools/compare/fixtures/sendout-back-exploud-normal-stutter-run-a.json" with { type: "json" };
import exploudRunB from "../../tools/compare/fixtures/sendout-back-exploud-normal-stutter-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = {
  readonly mode: string;
  readonly profile: string;
  readonly level: number;
  readonly preCheckpointCaptureAllFrames: boolean;
  readonly playerSetIds: readonly number[];
  readonly opponentSetIds: readonly number[];
  readonly overrides: {
    readonly parties: {
      readonly player: readonly Record<string, any>[];
      readonly opponent: readonly Record<string, any>[];
    };
  };
};
type Sprite = {
  readonly flags: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly callbackSymbol: string;
  readonly centerToCornerVecX: number;
  readonly centerToCornerVecY: number;
  readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string };
};
type Frame = { readonly frame: number; readonly sha256: string; readonly battler0: Sprite };
type Run = {
  readonly schema: string;
  readonly profile: string;
  readonly species: number;
  readonly natureId: number;
  readonly natureMod: number;
  readonly selectorEvidence: string;
  readonly sourceRecordIndex: number;
  readonly sourceBackAnimSet: string;
  readonly sourceBackAnimSetIndex: number;
  readonly sourceSelector: string;
  readonly sourceInitializer: string;
  readonly sourceId: number;
  readonly sourceDuration: number;
  readonly sourceAmplitude: number;
  readonly sourceRuns: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
};
type Case = {
  readonly label: "alakazam-slow" | "qwilfish-twice" | "exploud-normal";
  readonly speciesName: "ALAKAZAM" | "QWILFISH" | "EXPLOUD";
  readonly speciesId: 65 | 211 | 372;
  readonly natureId: 3 | 15 | 24;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 316 | 404 | 493;
  readonly selector: "ANIM_GROW_STUTTER_TWICE" | "ANIM_GROW_STUTTER" | "ANIM_GROW_STUTTER_SLOW";
  readonly initializer: "Anim_GrowStutter_Twice" | "Anim_GrowStutter" | "Anim_GrowStutter_Slow";
  readonly sourceId: 101 | 119 | 120;
  readonly duration: 20 | 30 | 40;
  readonly amplitude: 40 | 60 | 70;
  readonly runs: 1 | 2;
  readonly terminalTick: 31 | 41 | 43;
  readonly startFrame: 1839 | 1840;
  readonly expectedY: 83 | 85 | 87;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "qwilfish-twice", speciesName: "QWILFISH", speciesId: 211, natureId: 3, natureMod: 0,
    sourceIndex: 316, selector: "ANIM_GROW_STUTTER_TWICE", initializer: "Anim_GrowStutter_Twice",
    sourceId: 119, duration: 20, amplitude: 70, runs: 2, terminalTick: 43, startFrame: 1840,
    expectedY: 87, rawBytes: 21589, rawSha256: "dd3fd7f20cddcd5f4d749a210d3f8730e8ccc18b3f7c595e74f8cda085f49bd1",
    scenario: qwilfishScenario as Scenario, runA: qwilfishRunA as Run, runB: qwilfishRunB as Run,
  },
  {
    label: "exploud-normal", speciesName: "EXPLOUD", speciesId: 372, natureId: 24, natureMod: 1,
    sourceIndex: 493, selector: "ANIM_GROW_STUTTER", initializer: "Anim_GrowStutter",
    sourceId: 120, duration: 30, amplitude: 60, runs: 1, terminalTick: 31, startFrame: 1839,
    expectedY: 83, rawBytes: 15925, rawSha256: "aeff45bc8e553c8d7fd21a3e0f85e5d6c82cd34f3b57c8e4d24f1ebcd2637fe3",
    scenario: exploudScenario as Scenario, runA: exploudRunA as Run, runB: exploudRunB as Run,
  },
  {
    label: "alakazam-slow", speciesName: "ALAKAZAM", speciesId: 65, natureId: 15, natureMod: 2,
    sourceIndex: 404, selector: "ANIM_GROW_STUTTER_SLOW", initializer: "Anim_GrowStutter_Slow",
    sourceId: 101, duration: 40, amplitude: 40, runs: 1, terminalTick: 41, startFrame: 1840,
    expectedY: 85, rawBytes: 20657, rawSha256: "c557496c8b3c0c9372468d307cd8ecea1073f9dab962061b82838916d1a81eb2",
    scenario: alakazamScenario as Scenario, runA: alakazamRunA as Run, runB: alakazamRunB as Run,
  },
];

function assertCompleteLegalParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, preCheckpointCaptureAllFrames: true, playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180] });
  expect(scenario.overrides.parties.player).toHaveLength(3);
  expect(scenario.overrides.parties.opponent).toHaveLength(3);
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({ level: 50, item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect((Object.values(mon.evs) as number[]).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toHaveLength(4);
  }
}

describe("BACK_ANIM_GROW_STUTTER Scene-ON evidence", () => {
  it.each(CASES)("retains the real Factory source record for $label", (fixture) => {
    assertCompleteLegalParty(fixture.scenario);
    expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
    expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ species: fixture.speciesName, backAnimSetIndex: 12, backAnimSet: "BACK_ANIM_GROW_STUTTER", natureMod: fixture.natureMod, selector: fixture.selector });
    expect(frontierMons.entries.find(({ index }) => index === fixture.sourceIndex)).toMatchObject({ index: fixture.sourceIndex, species: `SPECIES_${fixture.speciesName}` });
    expect(fixture.runA).toMatchObject({ selectorEvidence: expect.stringContaining(`index ${fixture.sourceIndex}`), sourceRecordIndex: fixture.sourceIndex });
  });

  it.each(CASES)("matches the fresh paired byte-identical $label dense receipt", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-stutter-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-stutter-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({ schema: "back-grow-stutter-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceBackAnimSet: "BACK_ANIM_GROW_STUTTER", sourceBackAnimSetIndex: 12, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceDuration: fixture.duration, sourceAmplitude: fixture.amplitude, sourceRuns: fixture.runs, sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2, frameCount: fixture.terminalTick + 3 } });
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index));
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([...Array(fixture.terminalTick + 1).fill(fixture.initializer), "WaitAnimEnd", "SpriteCallbackDummy"]);
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "GrowStutter", "SpriteCallbackDummy", "WaitAnimEnd"].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({ flags: expect.any(Number), x: 72, y: fixture.expectedY, x2: 0, y2: 0, oam: { affineMode: expect.any(Number), matrix: expect.any(Array), raw: expect.stringMatching(/^[0-9a-f]{16}$/) } });
      expect(row.battler0.data).toHaveLength(8);
      expect(row.battler0.oam.matrix).toHaveLength(4);
    }
    expect(frames[0]).toMatchObject({ battler0: { flags: 12289, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = backGrowStutterFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({ flags: 4097, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2, centerToCornerVecX: -64, centerToCornerVecY: -64, data: [0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7], callbackSymbol: fixture.initializer, oam: { affineMode: 3, matrix: [tick === 0 ? 256 : model.xScale, 0, 0, tick === 0 ? 256 : model.yScale] } });
    }
    const terminal = backGrowStutterFrameAtTick(fixture.speciesName, fixture.natureId, fixture.terminalTick, 1)!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({ battler0: { flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({ battler0: { flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: [0, 0, fixture.speciesId, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backGrowStutterWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backGrowStutterWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
