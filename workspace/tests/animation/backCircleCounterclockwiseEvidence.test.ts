import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backCircleCounterclockwiseFrameAtTick,
  backCircleCounterclockwiseWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import hitmontopScenario from "../../tools/compare/fixtures/sendout-back-hitmontop-long.json" with { type: "json" };
import hitmontopRunA from "../../tools/compare/fixtures/sendout-back-hitmontop-long-run-a.json" with { type: "json" };
import hitmontopRunB from "../../tools/compare/fixtures/sendout-back-hitmontop-long-run-b.json" with { type: "json" };
import spindaNormalScenario from "../../tools/compare/fixtures/sendout-back-spinda-normal.json" with { type: "json" };
import spindaNormalRunA from "../../tools/compare/fixtures/sendout-back-spinda-normal-run-a.json" with { type: "json" };
import spindaNormalRunB from "../../tools/compare/fixtures/sendout-back-spinda-normal-run-b.json" with { type: "json" };
import spindaSlowScenario from "../../tools/compare/fixtures/sendout-back-spinda-slow-staged.json" with { type: "json" };
import spindaSlowRunA from "../../tools/compare/fixtures/sendout-back-spinda-slow-staged-run-a.json" with { type: "json" };
import spindaSlowRunB from "../../tools/compare/fixtures/sendout-back-spinda-slow-staged-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = { readonly mode: string; readonly profile: string; readonly level: number; readonly preCheckpointCaptureAllFrames: boolean; readonly playerSetIds: readonly number[]; readonly opponentSetIds: readonly number[]; readonly overrides: { readonly parties: { readonly player: readonly Record<string, any>[]; readonly opponent: readonly Record<string, any>[] } } };
type Sprite = { readonly flags: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly animNum: number; readonly animCmdIndex: number; readonly centerToCornerVecX: number; readonly centerToCornerVecY: number; readonly data: readonly number[]; readonly callbackSymbol: string; readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string } };
type Frame = { readonly frame: number; readonly sha256: string; readonly battler0: Sprite };
type Run = { readonly schema: string; readonly profile: string; readonly species: number; readonly natureId: number; readonly natureMod: number; readonly selectorEvidence: string; readonly sourceRecordIndex: number | null; readonly sourceBackAnimSet: string; readonly sourceBackAnimSetIndex: number; readonly sourceSelector: string; readonly sourceInitializer: string; readonly sourceId: number; readonly sourceRotation: number; readonly sourceData: number; readonly sourceSpeed: number; readonly animationSlot: number; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly callbackAddresses: Readonly<Record<string, number>>; readonly frames: readonly Frame[] };
type Case = { readonly label: "hitmontop-long" | "spinda-normal" | "spinda-slow-staged"; readonly speciesName: "HITMONTOP" | "SPINDA"; readonly speciesId: 237 | 308; readonly natureId: 0 | 7 | 15; readonly natureMod: 0 | 1 | 2; readonly sourceIndex: 236 | 145 | null; readonly selector: "ANIM_CIRCLE_C_CLOCKWISE_LONG" | "ANIM_CIRCLE_C_CLOCKWISE" | "ANIM_CIRCLE_C_CLOCKWISE_SLOW"; readonly initializer: "Anim_CircleCounterclockwise_Long" | "Anim_CircleCounterclockwise" | "Anim_CircleCounterclockwise_Slow"; readonly sourceId: 100 | 20 | 79; readonly rotation: 1024 | 512; readonly data: 6 | 3; readonly speed: 24 | 12; readonly terminalTick: 43 | 22; readonly startFrame: 1841 | 1838; readonly expectedY: 85 | 84; readonly rawBytes: number; readonly rawSha256: string; readonly scenario: Scenario; readonly runA: Run; readonly runB: Run };

const CASES: readonly Case[] = [
  { label: "hitmontop-long", speciesName: "HITMONTOP", speciesId: 237, natureId: 0, natureMod: 0, sourceIndex: 236, selector: "ANIM_CIRCLE_C_CLOCKWISE_LONG", initializer: "Anim_CircleCounterclockwise_Long", sourceId: 100, rotation: 1024, data: 6, speed: 24, terminalTick: 43, startFrame: 1841, expectedY: 85, rawBytes: 21647, rawSha256: "fb28652932946f61d3084eb3ca71990380353b890bb9596b63de8e92a5470336", scenario: hitmontopScenario as Scenario, runA: hitmontopRunA as Run, runB: hitmontopRunB as Run },
  { label: "spinda-normal", speciesName: "SPINDA", speciesId: 308, natureId: 7, natureMod: 1, sourceIndex: 145, selector: "ANIM_CIRCLE_C_CLOCKWISE", initializer: "Anim_CircleCounterclockwise", sourceId: 20, rotation: 512, data: 6, speed: 24, terminalTick: 22, startFrame: 1838, expectedY: 84, rawBytes: 12066, rawSha256: "efea486d7eb1e16d76660523b39a8c3cfb2bdf8daa4388ef93873b91393ac6c9", scenario: spindaNormalScenario as Scenario, runA: spindaNormalRunA as Run, runB: spindaNormalRunB as Run },
  { label: "spinda-slow-staged", speciesName: "SPINDA", speciesId: 308, natureId: 15, natureMod: 2, sourceIndex: null, selector: "ANIM_CIRCLE_C_CLOCKWISE_SLOW", initializer: "Anim_CircleCounterclockwise_Slow", sourceId: 79, rotation: 512, data: 3, speed: 12, terminalTick: 43, startFrame: 1838, expectedY: 84, rawBytes: 21655, rawSha256: "f5bafbf5cd59b653da66e9d177eedfdf7346958c62eb64eeefe60d9edbf5ebdb", scenario: spindaSlowScenario as Scenario, runA: spindaSlowRunA as Run, runB: spindaSlowRunB as Run },
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

describe("BACK_ANIM_CIRCLE_COUNTERCLOCKWISE Scene-ON evidence", () => {
  it("pins the real source records and labels slow as staged-only", () => {
    expect(frontierMons.entries.find(({ index }) => index === 236)).toMatchObject({ index: 236, label: "FRONTIER_MON_HITMONTOP_1", species: "SPECIES_HITMONTOP", moves: ["MOVE_TRIPLE_KICK", "MOVE_DIG", "MOVE_MACH_PUNCH", "MOVE_QUICK_ATTACK"], itemTableId: 52, itemName: "BATTLE_FRONTIER_ITEM_LIECHI_BERRY", nature: "NATURE_HARDY" });
    expect(frontierMons.entries.find(({ index }) => index === 145)).toMatchObject({ index: 145, label: "FRONTIER_MON_SPINDA", species: "SPECIES_SPINDA", moves: ["MOVE_DIZZY_PUNCH", "MOVE_TEETER_DANCE", "MOVE_PSYBEAM", "MOVE_FAINT_ATTACK"], itemTableId: 2, itemName: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY", nature: "NATURE_RELAXED" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ species: fixture.speciesName, backAnimSetIndex: 6, backAnimSet: "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE", natureMod: fixture.natureMod, selector: fixture.selector });
      expect(fixture.runA.sourceRecordIndex).toBe(fixture.sourceIndex);
    }
    expect(frontierMons.entries.filter(({ species }) => species === "SPECIES_HITMONTOP" || species === "SPECIES_SPINDA").every(({ nature }) => nature !== "NATURE_MODEST")).toBe(true);
    expect(CASES[2]!.runA.selectorEvidence).toContain("staged legal NATURE_MODEST");
  });

  it.each(CASES)("matches the fresh byte-identical $label dense receipt every frame", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({ schema: "back-circle-counterclockwise-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceBackAnimSet: "BACK_ANIM_CIRCLE_COUNTERCLOCKWISE", sourceBackAnimSetIndex: 6, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceRotation: fixture.rotation, sourceData: fixture.data, sourceSpeed: fixture.speed, animationSlot: 1, sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2, frameCount: fixture.terminalTick + 3 } });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "CircleCounterclockwise", "WaitAnimEnd", "SpriteCallbackDummy"].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index));
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([fixture.initializer, ...Array(fixture.terminalTick).fill("CircleCounterclockwise"), "WaitAnimEnd", "SpriteCallbackDummy"]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({ flags: 12289, x: 72, y: fixture.expectedY, animNum: 0, animCmdIndex: 0, oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) } });
      expect(row.battler0.data).toHaveLength(8);
    }
    expect(frames[0]).toMatchObject({ battler0: { x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer } });
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = backCircleCounterclockwiseFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1, fixture.runA.animationSlot)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({ flags: 12289, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [model.data0, model.data1, model.data2, 0, 0, 0, 0, 0], callbackSymbol: model.callback, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } });
    }
    const terminal = backCircleCounterclockwiseFrameAtTick(fixture.speciesName, fixture.natureId, fixture.terminalTick, 1, fixture.runA.animationSlot)!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({ battler0: { flags: 12289, x: 72, y: fixture.expectedY, x2: terminal.x2, y2: terminal.y2, centerToCornerVecX: -32, centerToCornerVecY: -32, data: [terminal.data0, terminal.data1, terminal.data2, 0, 0, 0, 0, 0], callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({ battler0: { flags: 12289, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: [0, 0, fixture.speciesId, 0, 0, 0, 0, 0], callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backCircleCounterclockwiseWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backCircleCounterclockwiseWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
