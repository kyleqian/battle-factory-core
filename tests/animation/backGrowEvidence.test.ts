import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backGrowFrameAtTick,
  backGrowInStagesFrameAtTick,
  backGrowWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import weezingScenario from "../../tools/compare/fixtures/sendout-back-weezing-fast.json" with { type: "json" };
import weezingRunA from "../../tools/compare/fixtures/sendout-back-weezing-fast-run-a.json" with { type: "json" };
import weezingRunB from "../../tools/compare/fixtures/sendout-back-weezing-fast-run-b.json" with { type: "json" };
import wigglytuffScenario from "../../tools/compare/fixtures/sendout-back-wigglytuff-normal.json" with { type: "json" };
import wigglytuffRunA from "../../tools/compare/fixtures/sendout-back-wigglytuff-normal-run-a.json" with { type: "json" };
import wigglytuffRunB from "../../tools/compare/fixtures/sendout-back-wigglytuff-normal-run-b.json" with { type: "json" };
import koffingScenario from "../../tools/compare/fixtures/sendout-back-koffing-slow-staged.json" with { type: "json" };
import koffingRunA from "../../tools/compare/fixtures/sendout-back-koffing-slow-staged-run-a.json" with { type: "json" };
import koffingRunB from "../../tools/compare/fixtures/sendout-back-koffing-slow-staged-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = { readonly mode: string; readonly profile: string; readonly level: number; readonly preCheckpointCaptureAllFrames: boolean; readonly playerSetIds: readonly number[]; readonly opponentSetIds: readonly number[]; readonly overrides: { readonly parties: { readonly player: readonly Record<string, any>[]; readonly opponent: readonly Record<string, any>[] } } };
type Sprite = { readonly flags: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly data: readonly number[]; readonly callbackSymbol: string; readonly centerToCornerVecX: number; readonly centerToCornerVecY: number; readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string } };
type Frame = { readonly frame: number; readonly sha256: string; readonly battler0: Sprite };
type Run = { readonly schema: string; readonly profile: string; readonly species: number; readonly natureId: number; readonly natureMod: number; readonly selectorEvidence: string; readonly sourceRecordIndex: number | null; readonly sourceBackAnimSet: string; readonly sourceBackAnimSetIndex: number; readonly sourceSelector: string; readonly sourceInitializer: string; readonly sourceId: number; readonly sourceSpeed: number | null; readonly sourceRuns: number | null; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly callbackAddresses: Readonly<Record<string, number>>; readonly frames: readonly Frame[] };
type Case = { readonly label: "weezing-fast" | "wigglytuff-normal" | "koffing-slow-staged"; readonly speciesName: "WEEZING" | "WIGGLYTUFF" | "KOFFING"; readonly speciesId: 110 | 40 | 109; readonly natureId: 3 | 7 | 15; readonly natureMod: 0 | 1 | 2; readonly sourceIndex: 405 | 207 | null; readonly selector: "ANIM_GROW_TWICE" | "ANIM_GROW" | "ANIM_GROW_IN_STAGES"; readonly initializer: "Anim_Grow_Twice" | "Anim_Grow" | "Anim_GrowInStages"; readonly sourceId: 108 | 107 | 58; readonly speed: 8 | 4 | null; readonly runs: 2 | 1 | null; readonly terminalTick: 65 | 64 | 114; readonly startFrame: 1839 | 1842; readonly expectedY: 86 | 88 | 89; readonly rawBytes: number; readonly rawSha256: string; readonly scenario: Scenario; readonly runA: Run; readonly runB: Run };

const CASES: readonly Case[] = [
  { label: "weezing-fast", speciesName: "WEEZING", speciesId: 110, natureId: 3, natureMod: 0, sourceIndex: 405, selector: "ANIM_GROW_TWICE", initializer: "Anim_Grow_Twice", sourceId: 108, speed: 8, runs: 2, terminalTick: 65, startFrame: 1839, expectedY: 86, rawBytes: 30880, rawSha256: "5949f90fe115cb1b81dcb9a768d4af963dd7d1c05171df669de8944f0d8c3104", scenario: weezingScenario as Scenario, runA: weezingRunA as Run, runB: weezingRunB as Run },
  { label: "wigglytuff-normal", speciesName: "WIGGLYTUFF", speciesId: 40, natureId: 7, natureMod: 1, sourceIndex: 207, selector: "ANIM_GROW", initializer: "Anim_Grow", sourceId: 107, speed: 4, runs: 1, terminalTick: 64, startFrame: 1842, expectedY: 88, rawBytes: 30026, rawSha256: "af8df9de2bbd38d267fb3d500a93741d3343124e34f24904e91f2754ba5a1dad", scenario: wigglytuffScenario as Scenario, runA: wigglytuffRunA as Run, runB: wigglytuffRunB as Run },
  { label: "koffing-slow-staged", speciesName: "KOFFING", speciesId: 109, natureId: 15, natureMod: 2, sourceIndex: null, selector: "ANIM_GROW_IN_STAGES", initializer: "Anim_GrowInStages", sourceId: 58, speed: null, runs: null, terminalTick: 114, startFrame: 1839, expectedY: 89, rawBytes: 52934, rawSha256: "1dc9bdb377d9c6392e5fa90dea7579aafbe9452e367c96080a8c81a7158d06ab", scenario: koffingScenario as Scenario, runA: koffingRunA as Run, runB: koffingRunB as Run },
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

describe("BACK_ANIM_GROW Scene-ON evidence", () => {
  it("pins the real source records and labels the staged-only selector", () => {
    expect(frontierMons.entries.find(({ index }) => index === 405)).toMatchObject({ index: 405, label: "FRONTIER_MON_WEEZING_1", species: "SPECIES_WEEZING", moves: ["MOVE_SLUDGE_BOMB", "MOVE_WILL_O_WISP", "MOVE_SHADOW_BALL", "MOVE_SMOKESCREEN"], itemTableId: 32, itemName: "BATTLE_FRONTIER_ITEM_BRIGHT_POWDER", nature: "NATURE_ADAMANT" });
    expect(frontierMons.entries.find(({ index }) => index === 207)).toMatchObject({ index: 207, label: "FRONTIER_MON_WIGGLYTUFF_1", species: "SPECIES_WIGGLYTUFF", moves: ["MOVE_SING", "MOVE_DISABLE", "MOVE_WISH", "MOVE_SECRET_POWER"], itemTableId: 18, itemName: "BATTLE_FRONTIER_ITEM_SILK_SCARF", nature: "NATURE_RELAXED" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ species: fixture.speciesName, backAnimSetIndex: 5, backAnimSet: "BACK_ANIM_GROW", natureMod: fixture.natureMod, selector: fixture.selector });
      expect(fixture.runA.sourceRecordIndex).toBe(fixture.sourceIndex);
    }
    expect(frontierMons.entries.filter(({ species }) => species === "SPECIES_WIGGLYTUFF" || species === "SPECIES_KOFFING" || species === "SPECIES_WEEZING").every(({ nature }) => nature !== "NATURE_MODEST")).toBe(true);
    expect(CASES[2]!.runA.selectorEvidence).toContain("staged legal NATURE_MODEST");
  });

  it.each(CASES)("matches the fresh byte-identical $label dense receipt", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({ schema: "back-grow-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceBackAnimSet: "BACK_ANIM_GROW", sourceBackAnimSetIndex: 5, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceSpeed: fixture.speed, sourceRuns: fixture.runs, sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2, frameCount: fixture.terminalTick + 3 } });
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index));
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([...Array(fixture.terminalTick + 1).fill(fixture.initializer), "WaitAnimEnd", "SpriteCallbackDummy"]);
    const callbackNames = fixture.natureMod === 2 ? [fixture.initializer, "SpriteCallbackDummy", "WaitAnimEnd"] : [fixture.initializer, "Grow", "SpriteCallbackDummy", "WaitAnimEnd"];
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual(callbackNames.sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({ flags: expect.any(Number), x: 72, y: fixture.expectedY, x2: 0, y2: 0, oam: { affineMode: expect.any(Number), matrix: expect.any(Array), raw: expect.stringMatching(/^[0-9a-f]{16}$/) } });
      expect(row.battler0.data).toHaveLength(8);
      expect(row.battler0.oam.matrix).toHaveLength(4);
    }
    expect(frames[0]).toMatchObject({ battler0: { flags: 12289, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    const reducer = fixture.natureMod === 2 ? backGrowInStagesFrameAtTick : backGrowFrameAtTick;
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = reducer(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({ flags: 4097, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2, centerToCornerVecX: -64, centerToCornerVecY: -64, data: [0, 1, model.data2, 0, model.data4, model.data5, model.data6, model.data7], callbackSymbol: fixture.initializer, oam: { affineMode: 3, matrix: [tick === 0 ? 256 : model.xScale, 0, 0, tick === 0 ? 256 : model.yScale] } });
    }
    const terminal = reducer(fixture.speciesName, fixture.natureId, fixture.terminalTick, 1)!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({ battler0: { flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, terminal.data2, 0, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({ battler0: { flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: [0, 0, fixture.speciesId, 0, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backGrowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backGrowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
