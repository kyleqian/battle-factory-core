import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backHorizontalStretchFrameAtTick,
  backHorizontalStretchWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import lileepScenario from "../../tools/compare/fixtures/sendout-back-lileep-normal.json" with { type: "json" };
import lileepRunA from "../../tools/compare/fixtures/sendout-back-lileep-normal-run-a.json" with { type: "json" };
import lileepRunB from "../../tools/compare/fixtures/sendout-back-lileep-normal-run-b.json" with { type: "json" };
import mukSlowScenario from "../../tools/compare/fixtures/sendout-back-muk-slow.json" with { type: "json" };
import mukSlowRunA from "../../tools/compare/fixtures/sendout-back-muk-slow-run-a.json" with { type: "json" };
import mukSlowRunB from "../../tools/compare/fixtures/sendout-back-muk-slow-run-b.json" with { type: "json" };
import mukTwiceScenario from "../../tools/compare/fixtures/sendout-back-muk-twice.json" with { type: "json" };
import mukTwiceRunA from "../../tools/compare/fixtures/sendout-back-muk-twice-run-a.json" with { type: "json" };
import mukTwiceRunB from "../../tools/compare/fixtures/sendout-back-muk-twice-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = { readonly mode: string; readonly profile: string; readonly level: number; readonly preCheckpointCaptureAllFrames: boolean; readonly playerSetIds: readonly number[]; readonly opponentSetIds: readonly number[]; readonly overrides: { readonly parties: { readonly player: readonly Record<string, any>[]; readonly opponent: readonly Record<string, any>[] } } };
type Sprite = { readonly flags: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly animNum: number; readonly animCmdIndex: number; readonly data: readonly number[]; readonly callbackSymbol: string; readonly centerToCornerVecX: number; readonly centerToCornerVecY: number; readonly oam: { readonly affineMode: number; readonly matrixNumber: number; readonly matrix: readonly number[]; readonly raw: string } };
type Run = { readonly schema: string; readonly profile: string; readonly species: number; readonly natureId: number; readonly natureMod: number; readonly selectorEvidence: string; readonly sourceRecordIndex: number; readonly sourceBackAnimSet: string; readonly sourceBackAnimSetIndex: number; readonly sourceSelector: string; readonly sourceInitializer: string; readonly sourceId: number; readonly sourceDuration: number; readonly sourceAmplitude: number; readonly sourceRuns: number; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly callbackAddresses: Readonly<Record<string, number>>; readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[] };
type Case = { readonly label: "muk-twice" | "lileep-normal" | "muk-slow"; readonly speciesName: "MUK" | "LILEEP"; readonly speciesId: 89 | 388; readonly natureId: 3 | 6 | 17; readonly natureMod: 0 | 1 | 2; readonly sourceIndex: 140 | 420 | 612; readonly selector: "ANIM_H_STRETCH_FAR_TWICE" | "ANIM_H_STRETCH_FAR" | "ANIM_H_STRETCH_FAR_SLOW"; readonly initializer: "Anim_HorizontalStretchFar_Twice" | "Anim_HorizontalStretchFar" | "Anim_HorizontalStretchFar_Slow"; readonly sourceId: 91 | 117 | 118; readonly duration: 20 | 30 | 40; readonly amplitude: 40 | 60 | 70; readonly runs: 1 | 2; readonly terminalTick: 31 | 41 | 43; readonly startFrame: 1835 | 1838; readonly expectedY: 85 | 89; readonly rawBytes: number; readonly rawSha256: string; readonly sourceMoves: readonly number[]; readonly sourceItem: number; readonly scenario: Scenario; readonly runA: Run; readonly runB: Run };

const CASES: readonly Case[] = [
  { label: "muk-twice", speciesName: "MUK", speciesId: 89, natureId: 3, natureMod: 0, sourceIndex: 420, selector: "ANIM_H_STRETCH_FAR_TWICE", initializer: "Anim_HorizontalStretchFar_Twice", sourceId: 117, duration: 20, amplitude: 70, runs: 2, terminalTick: 43, startFrame: 1835, expectedY: 85, rawBytes: 21967, rawSha256: "b788249706f3ba0157706a153fa19e2c9081ffc159e46ed45e17248f17eb536b", sourceMoves: [188, 34, 103, 107], sourceItem: 211, scenario: mukTwiceScenario as Scenario, runA: mukTwiceRunA as Run, runB: mukTwiceRunB as Run },
  { label: "lileep-normal", speciesName: "LILEEP", speciesId: 388, natureId: 6, natureMod: 1, sourceIndex: 140, selector: "ANIM_H_STRETCH_FAR", initializer: "Anim_HorizontalStretchFar", sourceId: 118, duration: 30, amplitude: 60, runs: 1, terminalTick: 31, startFrame: 1838, expectedY: 89, rawBytes: 16198, rawSha256: "4775b00b4e8f036195125be92e636fc41df2554824a1acd18ac081763e78128a", sourceMoves: [246, 51, 275, 109], sourceItem: 221, scenario: lileepScenario as Scenario, runA: lileepRunA as Run, runB: lileepRunB as Run },
  { label: "muk-slow", speciesName: "MUK", speciesId: 89, natureId: 17, natureMod: 2, sourceIndex: 612, selector: "ANIM_H_STRETCH_FAR_SLOW", initializer: "Anim_HorizontalStretchFar_Slow", sourceId: 91, duration: 40, amplitude: 40, runs: 1, terminalTick: 41, startFrame: 1835, expectedY: 85, rawBytes: 21017, rawSha256: "102606daeaa38841f4a8aaecc0538182cc5484ed995cb6e2b85d6ed5465d6a20", sourceMoves: [188, 85, 53, 8], sourceItem: 141, scenario: mukSlowScenario as Scenario, runA: mukSlowRunA as Run, runB: mukSlowRunB as Run },
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

describe("BACK_ANIM_H_STRETCH Scene-ON evidence", () => {
  it("uses the requested real Factory records for every nature modifier", () => {
    expect(frontierMons.entries.find(({ index }) => index === 420)).toMatchObject({ index: 420, label: "FRONTIER_MON_MUK_1", species: "SPECIES_MUK", moves: ["MOVE_SLUDGE_BOMB", "MOVE_BODY_SLAM", "MOVE_SCREECH", "MOVE_MINIMIZE"], itemTableId: 28, itemName: "BATTLE_FRONTIER_ITEM_POISON_BARB", nature: "NATURE_ADAMANT" });
    expect(frontierMons.entries.find(({ index }) => index === 140)).toMatchObject({ index: 140, label: "FRONTIER_MON_LILEEP", species: "SPECIES_LILEEP", moves: ["MOVE_ANCIENT_POWER", "MOVE_ACID", "MOVE_INGRAIN", "MOVE_CONFUSE_RAY"], itemTableId: 54, itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", nature: "NATURE_DOCILE" });
    expect(frontierMons.entries.find(({ index }) => index === 612)).toMatchObject({ index: 612, label: "FRONTIER_MON_MUK_3", species: "SPECIES_MUK", moves: ["MOVE_SLUDGE_BOMB", "MOVE_THUNDERBOLT", "MOVE_FLAMETHROWER", "MOVE_ICE_PUNCH"], itemTableId: 41, itemName: "BATTLE_FRONTIER_ITEM_LUM_BERRY", nature: "NATURE_QUIET" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, moves: fixture.sourceMoves, ppUps: [0, 0, 0, 0], item: fixture.sourceItem, friendship: 70, shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ species: fixture.speciesName, backAnimSetIndex: 11, backAnimSet: "BACK_ANIM_H_STRETCH", natureMod: fixture.natureMod, selector: fixture.selector });
      expect(fixture.runA).toMatchObject({ sourceRecordIndex: fixture.sourceIndex, selectorEvidence: expect.stringContaining(`index ${fixture.sourceIndex}`) });
    }
  });

  it.each(CASES)("matches the fresh byte-identical $label dense receipt on every frame", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({ schema: "back-h-stretch-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_H_STRETCH", sourceBackAnimSetIndex: 11, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceDuration: fixture.duration, sourceAmplitude: fixture.amplitude, sourceRuns: fixture.runs, sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2, frameCount: fixture.terminalTick + 3 } });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "WaitAnimEnd", "SpriteCallbackDummy"].sort());

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index));
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([...Array(fixture.terminalTick + 1).fill(fixture.initializer), "WaitAnimEnd", "SpriteCallbackDummy"]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({ slot: 6, x: 72, y: fixture.expectedY, x2: 0, y2: 0, animNum: 0, animCmdIndex: 0, data: expect.any(Array), oam: { matrixNumber: 1, matrix: expect.any(Array), raw: expect.stringMatching(/^[0-9a-f]{16}$/) } });
      expect(row.battler0.data).toHaveLength(8);
      expect(row.battler0.oam.matrix).toHaveLength(4);
    }
    expect(frames[0]).toMatchObject({ battler0: { flags: 12289, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = backHorizontalStretchFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({ flags: 4097, centerToCornerVecX: -64, centerToCornerVecY: -64, data: [model.data0, model.data1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7], callbackSymbol: fixture.initializer, oam: { affineMode: 3, matrix: model.affineWrites[0] ? [model.affineWrites[0].xScale, 0, 0, model.affineWrites[0].yScale] : [256, 0, 0, 256] } });
    }
    const terminal = backHorizontalStretchFrameAtTick(fixture.speciesName, fixture.natureId, fixture.terminalTick, 1)!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({ battler0: { flags: 4097, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [terminal.data0, terminal.data1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({ battler0: { flags: 4097, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 0, fixture.speciesId, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backHorizontalStretchWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalStretchWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, fixture.speciesId)).toEqual([0, 0, fixture.speciesId, 0, 0, 0, 0, 0]);
  });
});
