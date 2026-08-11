import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backTriangleDownFrameAtTick,
  backTriangleDownTerminalSpriteData,
  backTriangleDownWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import snoruntScenario from "../../tools/compare/fixtures/sendout-back-snorunt-twice-triangle.json" with { type: "json" };
import snoruntRunA from "../../tools/compare/fixtures/sendout-back-snorunt-twice-triangle-run-a.json" with { type: "json" };
import snoruntRunB from "../../tools/compare/fixtures/sendout-back-snorunt-twice-triangle-run-b.json" with { type: "json" };
import tyrogueScenario from "../../tools/compare/fixtures/sendout-back-tyrogue-normal-triangle.json" with { type: "json" };
import tyrogueRunA from "../../tools/compare/fixtures/sendout-back-tyrogue-normal-triangle-run-a.json" with { type: "json" };
import tyrogueRunB from "../../tools/compare/fixtures/sendout-back-tyrogue-normal-triangle-run-b.json" with { type: "json" };
import pidgeyScenario from "../../tools/compare/fixtures/sendout-back-pidgey-slow-triangle.json" with { type: "json" };
import pidgeyRunA from "../../tools/compare/fixtures/sendout-back-pidgey-slow-triangle-run-a.json" with { type: "json" };
import pidgeyRunB from "../../tools/compare/fixtures/sendout-back-pidgey-slow-triangle-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof snoruntScenario;
type Sprite = {
  readonly flags: number;
  readonly visible: boolean;
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
  readonly sourceAmplitude: number;
  readonly sourceRuns: number;
  readonly sourcePhaseTable: readonly (readonly number[])[];
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[];
};
type Case = {
  readonly label: "snorunt-twice-triangle" | "tyrogue-normal-triangle" | "pidgey-slow-triangle";
  readonly speciesName: "SNORUNT" | "TYROGUE" | "PIDGEY";
  readonly speciesId: 346 | 236 | 16;
  readonly natureId: 2 | 6 | 1;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 76 | 15 | 33;
  readonly selector: "ANIM_TRIANGLE_DOWN_TWICE" | "ANIM_TRIANGLE_DOWN" | "ANIM_TRIANGLE_DOWN_SLOW";
  readonly initializer: "Anim_TriangleDown_Fast" | "Anim_TriangleDown" | "Anim_TriangleDown_Slow";
  readonly sourceId: 106 | 105 | 104;
  readonly amplitude: 2 | 1;
  readonly runs: 2 | 1;
  readonly startFrame: 1839 | 1838;
  readonly frameCount: 40 | 21 | 39;
  readonly expectedY: 90 | 88;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "snorunt-twice-triangle", speciesName: "SNORUNT", speciesId: 346, natureId: 2, natureMod: 0, sourceIndex: 76, selector: "ANIM_TRIANGLE_DOWN_TWICE", initializer: "Anim_TriangleDown_Fast", sourceId: 106, amplitude: 2, runs: 2, startFrame: 1839, frameCount: 40, expectedY: 90, rawBytes: 19048, rawSha256: "b25d3fc6025f394cd908152bb7ea5e7533148ef7b765c74fe11179518b767361", scenario: snoruntScenario, runA: snoruntRunA as Run, runB: snoruntRunB as Run },
  { label: "tyrogue-normal-triangle", speciesName: "TYROGUE", speciesId: 236, natureId: 6, natureMod: 1, sourceIndex: 15, selector: "ANIM_TRIANGLE_DOWN", initializer: "Anim_TriangleDown", sourceId: 105, amplitude: 2, runs: 1, startFrame: 1839, frameCount: 21, expectedY: 88, rawBytes: 10324, rawSha256: "2913a35d25f8cb9006290d5aeaa48911b98dedf8ae7ce1798a3cec69857e057c", scenario: tyrogueScenario, runA: tyrogueRunA as Run, runB: tyrogueRunB as Run },
  { label: "pidgey-slow-triangle", speciesName: "PIDGEY", speciesId: 16, natureId: 1, natureMod: 2, sourceIndex: 33, selector: "ANIM_TRIANGLE_DOWN_SLOW", initializer: "Anim_TriangleDown_Slow", sourceId: 104, amplitude: 1, runs: 1, startFrame: 1838, frameCount: 39, expectedY: 88, rawBytes: 18597, rawSha256: "0d05595383b582de9272e7032c98cd8f35fd547b8aa5f351a1711dd40ecd53b1", scenario: pidgeyScenario, runA: pidgeyRunA as Run, runB: pidgeyRunB as Run },
];

function assertCompleteLegalParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab", profile: "battle-scene-on", level: 50, preCheckpointCaptureAllFrames: true,
    playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180],
  });
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({ level: 50, item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
  }
}

describe("BACK_ANIM_TRIANGLE_DOWN Scene-ON evidence", () => {
  it("uses the selected legal Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 76)).toMatchObject({ index: 76, label: "FRONTIER_MON_SNORUNT", species: "SPECIES_SNORUNT", moves: ["MOVE_ICY_WIND", "MOVE_HEADBUTT", "MOVE_LEER", "MOVE_BITE"], itemTableId: 7, itemName: "BATTLE_FRONTIER_ITEM_PERSIM_BERRY", nature: "NATURE_BRAVE" });
    expect(frontierMons.entries.find(({ index }) => index === 15)).toMatchObject({ index: 15, label: "FRONTIER_MON_TYROGUE", species: "SPECIES_TYROGUE", moves: ["MOVE_MACH_PUNCH", "MOVE_PROTECT", "MOVE_DOUBLE_TEAM", "MOVE_FACADE"], itemTableId: 6, itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_DOCILE" });
    expect(frontierMons.entries.find(({ index }) => index === 33)).toMatchObject({ index: 33, label: "FRONTIER_MON_PIDGEY", species: "SPECIES_PIDGEY", moves: ["MOVE_GUST", "MOVE_SAND_ATTACK", "MOVE_WHIRLWIND", "MOVE_QUICK_ATTACK"], itemTableId: 23, itemName: "BATTLE_FRONTIER_ITEM_SHARP_BEAK", nature: "NATURE_LONELY" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId, friendship: 70, gender: "male", shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 14, backAnimSet: "BACK_ANIM_TRIANGLE_DOWN", natureMod: fixture.natureMod, selector: fixture.selector,
      });
      expect(fixture.runA).toMatchObject({ sourceRecordIndex: fixture.sourceIndex, selectorEvidence: expect.stringContaining(`index ${fixture.sourceIndex}`) });
    }
  });

  it.each(CASES)("matches every framebuffer/RAM/OAM frame of fresh paired $label receipts", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-triangle-down-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId,
      natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_TRIANGLE_DOWN", sourceBackAnimSetIndex: 14,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceAmplitude: fixture.amplitude, sourceRuns: fixture.runs,
      sourcePhaseTable: [[1, 1, 12], [-2, 0, 12], [1, -1, 12], [0, 0, 0]],
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.frameCount - 1, frameCount: fixture.frameCount },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "TriangleDown", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.frameCount);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.frameCount }, (_, index) => fixture.startFrame + index));
    expect(frames[0]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
      data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
      centerToCornerVecX: -32, centerToCornerVecY: -32,
      oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
    } });
    const terminalTick = fixture.frameCount - 3;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const model = backTriangleDownFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(model.callback).toBe("TriangleDown");
      expect(frames[tick + 1]!.battler0).toMatchObject({
        flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2,
        data: [model.data0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: "TriangleDown", centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
    }
    const terminal = backTriangleDownFrameAtTick(fixture.speciesName, fixture.natureId, terminalTick, 1)!;
    expect(terminal.callback).toBe("WaitAnimEnd");
    expect(frames[terminalTick + 1]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: terminal.x2, y2: terminal.y2,
      data: [terminal.data0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7],
      callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(frames.at(-1)).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: terminal.x2, y2: terminal.y2,
      data: backTriangleDownTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId),
      callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(backTriangleDownWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backTriangleDownWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
