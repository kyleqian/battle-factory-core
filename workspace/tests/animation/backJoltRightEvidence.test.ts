import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backJoltRightFrameAtTick,
  backJoltRightTerminalSpriteData,
  backJoltRightWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import machopScenario from "../../tools/compare/fixtures/sendout-back-machop-fast-jolt-right.json" with { type: "json" };
import machopRunA from "../../tools/compare/fixtures/sendout-back-machop-fast-jolt-right-run-a.json" with { type: "json" };
import machopRunB from "../../tools/compare/fixtures/sendout-back-machop-fast-jolt-right-run-b.json" with { type: "json" };
import electrikeScenario from "../../tools/compare/fixtures/sendout-back-electrike-normal-jolt-right.json" with { type: "json" };
import electrikeRunA from "../../tools/compare/fixtures/sendout-back-electrike-normal-jolt-right-run-a.json" with { type: "json" };
import electrikeRunB from "../../tools/compare/fixtures/sendout-back-electrike-normal-jolt-right-run-b.json" with { type: "json" };
import electrodeScenario from "../../tools/compare/fixtures/sendout-back-electrode-slow-jolt-right.json" with { type: "json" };
import electrodeRunA from "../../tools/compare/fixtures/sendout-back-electrode-slow-jolt-right-run-a.json" with { type: "json" };
import electrodeRunB from "../../tools/compare/fixtures/sendout-back-electrode-slow-jolt-right-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Sprite = {
  readonly slot: number;
  readonly flags: number;
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly animNum: number;
  readonly animCmdIndex: number;
  readonly centerToCornerVecX: number;
  readonly centerToCornerVecY: number;
  readonly data: readonly number[];
  readonly callbackSymbol: string;
  readonly oam: {
    readonly attr0: number;
    readonly attr1: number;
    readonly attr2: number;
    readonly affineMode: number;
    readonly matrixNumber: number;
    readonly matrix: readonly number[];
    readonly raw: string;
  };
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
  readonly sourceInitialStep: number;
  readonly sourceTravelLimit: number;
  readonly sourceOscillationCount: number;
  readonly sourceOscillationDelta: number;
  readonly sourceInitialReturnStep: number;
  readonly sourcePhases: readonly string[];
  readonly sourceTryFlipXCallsPerPhase: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[];
};
type Case = {
  readonly label: "machop-fast-jolt-right" | "electrike-normal-jolt-right" | "electrode-slow-jolt-right";
  readonly speciesName: "MACHOP" | "ELECTRIKE" | "ELECTRODE";
  readonly speciesId: 66 | 337 | 101;
  readonly natureId: 3 | 6 | 17;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 82 | 64 | 396;
  readonly selector: "ANIM_JOLT_RIGHT_FAST" | "ANIM_JOLT_RIGHT" | "ANIM_JOLT_RIGHT_SLOW";
  readonly initializer: "Anim_JoltRight_Fast" | "Anim_JoltRight" | "Anim_JoltRight_Slow";
  readonly sourceId: 136 | 137 | 138;
  readonly initialStep: 2 | 1;
  readonly travelLimit: 12 | 8 | 6;
  readonly oscillationCount: 16 | 12 | 6;
  readonly oscillationDelta: 4 | 2;
  readonly initialReturnStep: 4 | 2 | 0;
  readonly terminalTick: 35 | 30 | 20;
  readonly startFrame: 1838 | 1841;
  readonly expectedY: 92 | 96 | 93;
  readonly rawBytes: 18361 | 16000 | 11425;
  readonly rawSha256: string;
  readonly scenario: typeof machopScenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "machop-fast-jolt-right", speciesName: "MACHOP", speciesId: 66, natureId: 3, natureMod: 0, sourceIndex: 82, selector: "ANIM_JOLT_RIGHT_FAST", initializer: "Anim_JoltRight_Fast", sourceId: 136, initialStep: 2, travelLimit: 12, oscillationCount: 16, oscillationDelta: 4, initialReturnStep: 4, terminalTick: 35, startFrame: 1838, expectedY: 92, rawBytes: 18361, rawSha256: "97166605e5f413f011a2e2851b507f094a32eced476ed50a040da850a100e01a", scenario: machopScenario, runA: machopRunA as Run, runB: machopRunB as Run },
  { label: "electrike-normal-jolt-right", speciesName: "ELECTRIKE", speciesId: 337, natureId: 6, natureMod: 1, sourceIndex: 64, selector: "ANIM_JOLT_RIGHT", initializer: "Anim_JoltRight", sourceId: 137, initialStep: 1, travelLimit: 8, oscillationCount: 12, oscillationDelta: 2, initialReturnStep: 2, terminalTick: 30, startFrame: 1841, expectedY: 96, rawBytes: 16000, rawSha256: "74ba2bf876194fbba6803eee2f35c7e7650604898d239173f63f36a72f821377", scenario: electrikeScenario as typeof machopScenario, runA: electrikeRunA as Run, runB: electrikeRunB as Run },
  { label: "electrode-slow-jolt-right", speciesName: "ELECTRODE", speciesId: 101, natureId: 17, natureMod: 2, sourceIndex: 396, selector: "ANIM_JOLT_RIGHT_SLOW", initializer: "Anim_JoltRight_Slow", sourceId: 138, initialStep: 1, travelLimit: 6, oscillationCount: 6, oscillationDelta: 2, initialReturnStep: 0, terminalTick: 20, startFrame: 1841, expectedY: 93, rawBytes: 11425, rawSha256: "af21667986fab28c40b7bfe7d9934bc93e37615772459584b18702abd88b7141", scenario: electrodeScenario as typeof machopScenario, runA: electrodeRunA as Run, runB: electrodeRunB as Run },
];

function assertCompleteLegalParty(scenario: typeof machopScenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab", profile: "battle-scene-on", level: 50,
    preCheckpointCaptureAllFrames: true,
  });
  expect(scenario.overrides.parties.player).toHaveLength(3);
  expect(scenario.overrides.parties.opponent).toHaveLength(3);
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({
      level: 50, item: expect.any(Number), abilitySlot: expect.any(Number),
      friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean),
      ppUps: [0, 0, 0, 0],
    });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.values(mon.evs).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
  }
}

describe("BACK_ANIM_JOLT_RIGHT Scene-ON evidence", () => {
  it("uses the required real Factory records for every nature modifier", () => {
    expect(frontierMons.entries.find(({ index }) => index === 82)).toMatchObject({
      index: 82, label: "FRONTIER_MON_MACHOP", species: "SPECIES_MACHOP",
      moves: ["MOVE_SEISMIC_TOSS", "MOVE_REVENGE", "MOVE_ROCK_TOMB", "MOVE_SCARY_FACE"],
      itemTableId: 34, itemName: "BATTLE_FRONTIER_ITEM_SCOPE_LENS", nature: "NATURE_ADAMANT",
    });
    expect(frontierMons.entries.find(({ index }) => index === 64)).toMatchObject({
      index: 64, label: "FRONTIER_MON_ELECTRIKE", species: "SPECIES_ELECTRIKE",
      moves: ["MOVE_SPARK", "MOVE_THUNDER_WAVE", "MOVE_ROAR", "MOVE_QUICK_ATTACK"],
      itemTableId: 12, itemName: "BATTLE_FRONTIER_ITEM_CHERI_BERRY", nature: "NATURE_DOCILE",
    });
    expect(frontierMons.entries.find(({ index }) => index === 396)).toMatchObject({
      index: 396, label: "FRONTIER_MON_ELECTRODE_1", species: "SPECIES_ELECTRODE",
      moves: ["MOVE_THUNDERBOLT", "MOVE_SWIFT", "MOVE_LIGHT_SCREEN", "MOVE_PROTECT"],
      itemTableId: 6, itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_QUIET",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId,
        friendship: 70, shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 20, backAnimSet: "BACK_ANIM_JOLT_RIGHT", natureMod: fixture.natureMod,
        selector: fixture.selector,
      });
      expect(fixture.runA.selectorEvidence).toContain(`record index ${fixture.sourceIndex}`);
    }
  });

  it.each(CASES)("pins every framebuffer/RAM/OAM/affine frame in paired $label receipts", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-jolt-right-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_JOLT_RIGHT",
      sourceBackAnimSetIndex: 20, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer,
      sourceId: fixture.sourceId, sourceInitialStep: fixture.initialStep,
      sourceTravelLimit: fixture.travelLimit, sourceOscillationCount: fixture.oscillationCount,
      sourceOscillationDelta: fixture.oscillationDelta, sourceInitialReturnStep: fixture.initialReturnStep,
      sourcePhases: ["JoltRight", "JoltRight_0", "JoltRight_1", "JoltRight_2", "JoltRight_3"],
      sourceTryFlipXCallsPerPhase: 2,
      sourceWindow: {
        startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2,
        frameCount: fixture.terminalTick + 3,
      },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "JoltRight", "JoltRight_0", "JoltRight_1", "JoltRight_2", "JoltRight_3",
      "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map(({ frame }) => frame)).toEqual(
      Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    expect(frames[0]).toMatchObject({
      battler0: {
        slot: 6, flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
        data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
        centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      },
    });
    for (let tick = 0; tick <= fixture.terminalTick; tick += 1) {
      const model = backJoltRightFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      const row = frames[tick + 1]!.battler0;
      const double = model.affineMode === "double";
      expect(row).toMatchObject({
        slot: 6, flags: 4097, visible: true, x: 72, y: fixture.expectedY,
        x2: model.x2, y2: 0,
        data: [0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: model.callback,
        centerToCornerVecX: double ? -64 : -32,
        centerToCornerVecY: double ? -64 : -32,
        oam: {
          affineMode: double ? 3 : 1, matrix: [256, 0, 0, 256],
          raw: expect.stringMatching(/^[0-9a-f]{16}$/),
        },
      });
    }
    expect(frames.at(-1)).toMatchObject({
      battler0: {
        x2: 0, y2: 0,
        data: backJoltRightTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId),
        callbackSymbol: "SpriteCallbackDummy", centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(backJoltRightWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backJoltRightWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
