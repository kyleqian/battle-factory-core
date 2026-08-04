import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backConcaveArcLargeFrameAtTick,
  backConcaveArcLargeTerminalSpriteData,
  backConcaveArcLargeWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import magikarpScenario from "../../tools/compare/fixtures/sendout-back-magikarp-twice-concave-large.json" with { type: "json" };
import magikarpRunA from "../../tools/compare/fixtures/sendout-back-magikarp-twice-concave-large-run-a.json" with { type: "json" };
import magikarpRunB from "../../tools/compare/fixtures/sendout-back-magikarp-twice-concave-large-run-b.json" with { type: "json" };
import azurillScenario from "../../tools/compare/fixtures/sendout-back-azurill-normal-concave-large.json" with { type: "json" };
import azurillRunA from "../../tools/compare/fixtures/sendout-back-azurill-normal-concave-large-run-a.json" with { type: "json" };
import azurillRunB from "../../tools/compare/fixtures/sendout-back-azurill-normal-concave-large-run-b.json" with { type: "json" };
import treeckoScenario from "../../tools/compare/fixtures/sendout-back-treecko-slow-concave-large.json" with { type: "json" };
import treeckoRunA from "../../tools/compare/fixtures/sendout-back-treecko-slow-concave-large-run-a.json" with { type: "json" };
import treeckoRunB from "../../tools/compare/fixtures/sendout-back-treecko-slow-concave-large-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof magikarpScenario;
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
  readonly sourceStep: number;
  readonly sourceXAmplitude: number;
  readonly sourceYAmplitude: number;
  readonly sourceRuns: number;
  readonly sourceOverflow: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[];
};
type Case = {
  readonly label: "magikarp-twice-concave-large" | "azurill-normal-concave-large" | "treecko-slow-concave-large";
  readonly speciesName: "MAGIKARP" | "AZURILL" | "TREECKO";
  readonly speciesId: 129 | 350 | 277;
  readonly natureId: 0 | 19 | 1;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 6 | 1 | 94;
  readonly selector: "ANIM_CONCAVE_ARC_LARGE_TWICE" | "ANIM_CONCAVE_ARC_LARGE" | "ANIM_CONCAVE_ARC_LARGE_SLOW";
  readonly initializer: "Anim_ConcaveArcLarge_Twice" | "Anim_ConcaveArcLarge" | "Anim_ConcaveArcLarge_Slow";
  readonly sourceId: 123 | 122 | 121;
  readonly step: 8 | 6 | 4;
  readonly runs: 2 | 1;
  readonly startFrame: 1840 | 1839;
  readonly frameCount: 68 | 46 | 67;
  readonly expectedY: 89 | 90 | 86;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "magikarp-twice-concave-large", speciesName: "MAGIKARP", speciesId: 129, natureId: 0, natureMod: 0, sourceIndex: 6, selector: "ANIM_CONCAVE_ARC_LARGE_TWICE", initializer: "Anim_ConcaveArcLarge_Twice", sourceId: 123, step: 8, runs: 2, startFrame: 1840, frameCount: 68, expectedY: 89, rawBytes: 33049, rawSha256: "8680c46aef9d76a7c4c231d42d7b2b56656f1108b21976a03beccbf919b1c581", scenario: magikarpScenario, runA: magikarpRunA as Run, runB: magikarpRunB as Run },
  { label: "azurill-normal-concave-large", speciesName: "AZURILL", speciesId: 350, natureId: 19, natureMod: 1, sourceIndex: 1, selector: "ANIM_CONCAVE_ARC_LARGE", initializer: "Anim_ConcaveArcLarge", sourceId: 122, step: 6, runs: 1, startFrame: 1839, frameCount: 46, expectedY: 90, rawBytes: 22308, rawSha256: "8daceedff0517e495dc51daf6a1e2a6b6fa5f2564bcea4922ce88bf3bf13be35", scenario: azurillScenario as Scenario, runA: azurillRunA as Run, runB: azurillRunB as Run },
  { label: "treecko-slow-concave-large", speciesName: "TREECKO", speciesId: 277, natureId: 1, natureMod: 2, sourceIndex: 94, selector: "ANIM_CONCAVE_ARC_LARGE_SLOW", initializer: "Anim_ConcaveArcLarge_Slow", sourceId: 121, step: 4, runs: 1, startFrame: 1839, frameCount: 67, expectedY: 86, rawBytes: 32513, rawSha256: "6d1868ffe99209bbf097f56a9a1c37b38aa6e27e71e3f6f10df1ed7893b635b7", scenario: treeckoScenario as Scenario, runA: treeckoRunA as Run, runB: treeckoRunB as Run },
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

describe("BACK_ANIM_CONCAVE_ARC_LARGE Scene-ON evidence", () => {
  it("uses the selected legal Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 6)).toMatchObject({ index: 6, label: "FRONTIER_MON_MAGIKARP", species: "SPECIES_MAGIKARP", moves: ["MOVE_FLAIL", "MOVE_NONE", "MOVE_NONE", "MOVE_NONE"], itemTableId: 6, itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_HARDY" });
    expect(frontierMons.entries.find(({ index }) => index === 1)).toMatchObject({ index: 1, label: "FRONTIER_MON_AZURILL", species: "SPECIES_AZURILL", moves: ["MOVE_WATER_PULSE", "MOVE_ATTRACT", "MOVE_SING", "MOVE_CHARM"], itemTableId: 12, itemName: "BATTLE_FRONTIER_ITEM_CHERI_BERRY", nature: "NATURE_RASH" });
    expect(frontierMons.entries.find(({ index }) => index === 94)).toMatchObject({ index: 94, label: "FRONTIER_MON_TREECKO", species: "SPECIES_TREECKO", moves: ["MOVE_BULLET_SEED", "MOVE_AERIAL_ACE", "MOVE_QUICK_ATTACK", "MOVE_DOUBLE_TEAM"], itemTableId: 34, itemName: "BATTLE_FRONTIER_ITEM_SCOPE_LENS", nature: "NATURE_LONELY" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId, friendship: 70, gender: "male", shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 15, backAnimSet: "BACK_ANIM_CONCAVE_ARC_LARGE", natureMod: fixture.natureMod, selector: fixture.selector,
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
      schema: "back-concave-arc-large-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId,
      natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_CONCAVE_ARC_LARGE", sourceBackAnimSetIndex: 15,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceStep: fixture.step, sourceXAmplitude: 12, sourceYAmplitude: 12, sourceRuns: fixture.runs,
      sourceOverflow: "data[7] > 255",
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.frameCount - 1, frameCount: fixture.frameCount },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "ConcaveArc", "WaitAnimEnd", "SpriteCallbackDummy",
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
      const model = backConcaveArcLargeFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(model.callback).toBe(fixture.initializer);
      expect(frames[tick + 1]!.battler0).toMatchObject({
        flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2,
        data: [model.data0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: fixture.initializer, centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
    }
    const terminal = backConcaveArcLargeFrameAtTick(fixture.speciesName, fixture.natureId, terminalTick, 1)!;
    expect(terminal.callback).toBe("WaitAnimEnd");
    expect(frames[terminalTick + 1]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: terminal.x2, y2: terminal.y2,
      data: [terminal.data0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7],
      callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(frames.at(-1)).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
      data: backConcaveArcLargeTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId),
      callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(backConcaveArcLargeWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backConcaveArcLargeWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
