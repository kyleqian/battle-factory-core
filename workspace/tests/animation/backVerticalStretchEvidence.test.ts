import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backSendOutTerminalSpriteData,
  backVerticalStretchFrameAtTick,
  backVerticalStretchWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import chinchouScenario from "../../tools/compare/fixtures/sendout-back-chinchou-twice.json" with { type: "json" };
import chinchouRunA from "../../tools/compare/fixtures/sendout-back-chinchou-twice-run-a.json" with { type: "json" };
import chinchouRunB from "../../tools/compare/fixtures/sendout-back-chinchou-twice-run-b.json" with { type: "json" };
import wurmpleScenario from "../../tools/compare/fixtures/sendout-back-wurmple-normal.json" with { type: "json" };
import wurmpleRunA from "../../tools/compare/fixtures/sendout-back-wurmple-normal-run-a.json" with { type: "json" };
import wurmpleRunB from "../../tools/compare/fixtures/sendout-back-wurmple-normal-run-b.json" with { type: "json" };
import weepinbellScenario from "../../tools/compare/fixtures/sendout-back-weepinbell-slow.json" with { type: "json" };
import weepinbellRunA from "../../tools/compare/fixtures/sendout-back-weepinbell-slow-run-a.json" with { type: "json" };
import weepinbellRunB from "../../tools/compare/fixtures/sendout-back-weepinbell-slow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = { readonly mode: string; readonly profile: string; readonly level: number; readonly preCheckpointCaptureAllFrames: boolean; readonly playerSetIds: readonly number[]; readonly opponentSetIds: readonly number[]; readonly overrides: { readonly parties: { readonly player: readonly Record<string, any>[]; readonly opponent: readonly Record<string, any>[] } } };
type Sprite = { readonly flags: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly data: readonly number[]; readonly callbackSymbol: string; readonly centerToCornerVecX: number; readonly centerToCornerVecY: number; readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string } };
type Run = { readonly schema: string; readonly profile: string; readonly species: number; readonly natureId: number; readonly natureMod: number; readonly selectorEvidence: string; readonly sourceRecordIndex: number; readonly sourceBackAnimSet: string; readonly sourceBackAnimSetIndex: number; readonly sourceSelector: string; readonly sourceInitializer: string; readonly sourceId: number; readonly sourceDuration: number; readonly sourceAmplitude: number; readonly sourceRuns: number; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly callbackAddresses: Readonly<Record<string, number>>; readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[] };
type Case = { readonly label: "chinchou-twice" | "wurmple-normal" | "weepinbell-slow"; readonly speciesName: "CHINCHOU" | "WURMPLE" | "WEEPINBELL"; readonly speciesId: 170 | 290 | 70; readonly natureId: 0 | 24 | 17; readonly natureMod: 0 | 1 | 2; readonly sourceIndex: 116 | 4 | 165; readonly selector: "ANIM_V_STRETCH_BOTH_ENDS_TWICE" | "ANIM_V_STRETCH_BOTH_ENDS" | "ANIM_V_STRETCH_BOTH_ENDS_SLOW"; readonly initializer: "Anim_VerticalStretchBothEnds_Twice" | "Anim_VerticalStretchBothEnds" | "Anim_VerticalStretchBothEnds_Slow"; readonly sourceId: 116 | 115 | 90; readonly duration: 20 | 30 | 40; readonly amplitude: 70 | 60 | 40; readonly runs: 1 | 2; readonly terminalTick: 43 | 31 | 41; readonly startFrame: 1840 | 1839 | 1842; readonly expectedY: 88 | 91 | 89; readonly rawBytes: number; readonly rawSha256: string; readonly scenario: Scenario; readonly runA: Run; readonly runB: Run };

const CASES: readonly Case[] = [
  { label: "chinchou-twice", speciesName: "CHINCHOU", speciesId: 170, natureId: 0, natureMod: 0, sourceIndex: 116, selector: "ANIM_V_STRETCH_BOTH_ENDS_TWICE", initializer: "Anim_VerticalStretchBothEnds_Twice", sourceId: 116, duration: 20, amplitude: 70, runs: 2, terminalTick: 43, startFrame: 1840, expectedY: 88, rawBytes: 22114, rawSha256: "456f9cdd0391f3edb503c89c6a7c7df1a6cf8cccbe9c45cf7ff6a6dc4897ef26", scenario: chinchouScenario as Scenario, runA: chinchouRunA as Run, runB: chinchouRunB as Run },
  { label: "wurmple-normal", speciesName: "WURMPLE", speciesId: 290, natureId: 24, natureMod: 1, sourceIndex: 4, selector: "ANIM_V_STRETCH_BOTH_ENDS", initializer: "Anim_VerticalStretchBothEnds", sourceId: 115, duration: 30, amplitude: 60, runs: 1, terminalTick: 31, startFrame: 1839, expectedY: 91, rawBytes: 16304, rawSha256: "c430eeb4c6c4aa81de301fc577f6fad1451211a0afa20a488e4c39704b803345", scenario: wurmpleScenario as Scenario, runA: wurmpleRunA as Run, runB: wurmpleRunB as Run },
  { label: "weepinbell-slow", speciesName: "WEEPINBELL", speciesId: 70, natureId: 17, natureMod: 2, sourceIndex: 165, selector: "ANIM_V_STRETCH_BOTH_ENDS_SLOW", initializer: "Anim_VerticalStretchBothEnds_Slow", sourceId: 90, duration: 40, amplitude: 40, runs: 1, terminalTick: 41, startFrame: 1842, expectedY: 89, rawBytes: 21162, rawSha256: "eb5dca2cb07b4d2dc440a36c4d442fc277e0428d77236cae780dd81f4cc01306", scenario: weepinbellScenario as Scenario, runA: weepinbellRunA as Run, runB: weepinbellRunB as Run },
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

describe("BACK_ANIM_V_STRETCH Scene-ON evidence", () => {
  it("uses the requested real Factory records for every nature modifier", () => {
    expect(frontierMons.entries.find(({ index }) => index === 116)).toMatchObject({ index: 116, label: "FRONTIER_MON_CHINCHOU", species: "SPECIES_CHINCHOU", moves: ["MOVE_SPARK", "MOVE_DIVE", "MOVE_CONFUSE_RAY", "MOVE_TAKE_DOWN"], itemTableId: 54, itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", nature: "NATURE_HARDY" });
    expect(frontierMons.entries.find(({ index }) => index === 4)).toMatchObject({ index: 4, label: "FRONTIER_MON_WURMPLE", species: "SPECIES_WURMPLE", moves: ["MOVE_TACKLE", "MOVE_STRING_SHOT", "MOVE_POISON_STING", "MOVE_NONE"], itemTableId: 54, itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", nature: "NATURE_QUIRKY" });
    expect(frontierMons.entries.find(({ index }) => index === 165)).toMatchObject({ index: 165, label: "FRONTIER_MON_WEEPINBELL_1", species: "SPECIES_WEEPINBELL", moves: ["MOVE_RAZOR_LEAF", "MOVE_ACID", "MOVE_WRAP", "MOVE_SWEET_SCENT"], itemTableId: 34, itemName: "BATTLE_FRONTIER_ITEM_SCOPE_LENS", nature: "NATURE_QUIET" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ species: fixture.speciesName, backAnimSetIndex: 10, backAnimSet: "BACK_ANIM_V_STRETCH", natureMod: fixture.natureMod, selector: fixture.selector });
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
    expect(fixture.runA).toMatchObject({ schema: "back-v-stretch-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_V_STRETCH", sourceBackAnimSetIndex: 10, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceDuration: fixture.duration, sourceAmplitude: fixture.amplitude, sourceRuns: fixture.runs, sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2, frameCount: fixture.terminalTick + 3 } });
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
      const model = backVerticalStretchFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({ flags: 4097, centerToCornerVecX: -64, centerToCornerVecY: -64, data: [0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7], callbackSymbol: fixture.initializer, oam: { affineMode: 3, matrix: model.affineWrites[0] ? [model.affineWrites[0].xScale, 0, 0, model.affineWrites[0].yScale] : [256, 0, 0, 256] } });
    }
    const terminal = backVerticalStretchFrameAtTick(fixture.speciesName, fixture.natureId, fixture.terminalTick, 1)!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({ battler0: { flags: 4097, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({ battler0: { flags: 4097, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 0, fixture.speciesId, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backVerticalStretchWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalStretchWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
    expect(backSendOutTerminalSpriteData(0, fixture.speciesId)).toEqual([0, 0, fixture.speciesId, 0, 0, 0, 0, 0]);
  });
});
