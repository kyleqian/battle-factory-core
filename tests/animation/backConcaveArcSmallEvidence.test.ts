import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backConcaveArcSmallFrameAtTick,
  backConcaveArcSmallTerminalSpriteData,
  backConcaveArcSmallWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import wynautScenario from "../../tools/compare/fixtures/sendout-back-wynaut-twice-concave-small.json" with { type: "json" };
import wynautRunA from "../../tools/compare/fixtures/sendout-back-wynaut-twice-concave-small-run-a.json" with { type: "json" };
import wynautRunB from "../../tools/compare/fixtures/sendout-back-wynaut-twice-concave-small-run-b.json" with { type: "json" };
import pichuScenario from "../../tools/compare/fixtures/sendout-back-pichu-normal-concave-small.json" with { type: "json" };
import pichuRunA from "../../tools/compare/fixtures/sendout-back-pichu-normal-concave-small-run-a.json" with { type: "json" };
import pichuRunB from "../../tools/compare/fixtures/sendout-back-pichu-normal-concave-small-run-b.json" with { type: "json" };
import marillScenario from "../../tools/compare/fixtures/sendout-back-marill-slow-concave-small.json" with { type: "json" };
import marillRunA from "../../tools/compare/fixtures/sendout-back-marill-slow-concave-small-run-a.json" with { type: "json" };
import marillRunB from "../../tools/compare/fixtures/sendout-back-marill-slow-concave-small-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof wynautScenario;
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
  readonly label: "wynaut-twice-concave-small" | "pichu-normal-concave-small" | "marill-slow-concave-small";
  readonly speciesName: "WYNAUT" | "PICHU" | "MARILL";
  readonly speciesId: 360 | 172 | 183;
  readonly natureId: 13 | 19 | 21;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 35 | 10 | 28;
  readonly selector: "ANIM_CONCAVE_ARC_SMALL_TWICE" | "ANIM_CONCAVE_ARC_SMALL" | "ANIM_CONCAVE_ARC_SMALL_SLOW";
  readonly initializer: "Anim_ConcaveArcSmall_Twice" | "Anim_ConcaveArcSmall" | "Anim_ConcaveArcSmall_Slow";
  readonly sourceId: 129 | 128 | 127;
  readonly step: 8 | 6 | 4;
  readonly runs: 2 | 1;
  readonly startFrame: 1838 | 1837;
  readonly frameCount: 68 | 46 | 67;
  readonly expectedY: 87 | 91 | 92;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "wynaut-twice-concave-small", speciesName: "WYNAUT", speciesId: 360, natureId: 13, natureMod: 0, sourceIndex: 35, selector: "ANIM_CONCAVE_ARC_SMALL_TWICE", initializer: "Anim_ConcaveArcSmall_Twice", sourceId: 129, step: 8, runs: 2, startFrame: 1838, frameCount: 68, expectedY: 87, rawBytes: 32878, rawSha256: "b7e049dc55d79371ef383dd730fc777552969bda60017993cf133cae7a1ed4a6", scenario: wynautScenario, runA: wynautRunA as Run, runB: wynautRunB as Run },
  { label: "pichu-normal-concave-small", speciesName: "PICHU", speciesId: 172, natureId: 19, natureMod: 1, sourceIndex: 10, selector: "ANIM_CONCAVE_ARC_SMALL", initializer: "Anim_ConcaveArcSmall", sourceId: 128, step: 6, runs: 1, startFrame: 1837, frameCount: 46, expectedY: 91, rawBytes: 22191, rawSha256: "ec53936c5fd61e982bd6427b259f423a067220ee97c151a385362c1fe84e3542", scenario: pichuScenario as Scenario, runA: pichuRunA as Run, runB: pichuRunB as Run },
  { label: "marill-slow-concave-small", speciesName: "MARILL", speciesId: 183, natureId: 21, natureMod: 2, sourceIndex: 28, selector: "ANIM_CONCAVE_ARC_SMALL_SLOW", initializer: "Anim_ConcaveArcSmall_Slow", sourceId: 127, step: 4, runs: 1, startFrame: 1838, frameCount: 67, expectedY: 92, rawBytes: 32341, rawSha256: "f8e2fda9c1bd1cabad9da3eb53a2d1d90bbc1cf350cb6556bbcf99cbc09c9cea", scenario: marillScenario as Scenario, runA: marillRunA as Run, runB: marillRunB as Run },
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

describe("BACK_ANIM_CONCAVE_ARC_SMALL Scene-ON evidence", () => {
  it("uses the selected legal Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 35)).toMatchObject({ index: 35, label: "FRONTIER_MON_WYNAUT", species: "SPECIES_WYNAUT", moves: ["MOVE_ENCORE", "MOVE_COUNTER", "MOVE_MIRROR_COAT", "MOVE_CHARM"], itemTableId: 54, itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", nature: "NATURE_JOLLY" });
    expect(frontierMons.entries.find(({ index }) => index === 10)).toMatchObject({ index: 10, label: "FRONTIER_MON_PICHU", species: "SPECIES_PICHU", moves: ["MOVE_SWEET_KISS", "MOVE_THUNDER_WAVE", "MOVE_ATTRACT", "MOVE_SHOCK_WAVE"], itemTableId: 2, itemName: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY", nature: "NATURE_RASH" });
    expect(frontierMons.entries.find(({ index }) => index === 28)).toMatchObject({ index: 28, label: "FRONTIER_MON_MARILL", species: "SPECIES_MARILL", moves: ["MOVE_WATER_PULSE", "MOVE_RAIN_DANCE", "MOVE_LIGHT_SCREEN", "MOVE_RETURN"], itemTableId: 22, itemName: "BATTLE_FRONTIER_ITEM_MYSTIC_WATER", nature: "NATURE_GENTLE" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId, friendship: 70, shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 17, backAnimSet: "BACK_ANIM_CONCAVE_ARC_SMALL", natureMod: fixture.natureMod, selector: fixture.selector,
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
      schema: "back-concave-arc-small-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId,
      natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_CONCAVE_ARC_SMALL", sourceBackAnimSetIndex: 17,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceStep: fixture.step, sourceXAmplitude: 4, sourceYAmplitude: 6, sourceRuns: fixture.runs,
      sourceOverflow: "data[7] > 255",
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.frameCount - 1, frameCount: fixture.frameCount },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "ConcaveArc", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.frameCount);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.frameCount }, (_, index) => fixture.startFrame + index));
    expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    expect(frames[0]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
      data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
      centerToCornerVecX: -32, centerToCornerVecY: -32,
      oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
    } });
    const terminalTick = fixture.frameCount - 3;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const model = backConcaveArcSmallFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(model.callback).toBe(fixture.initializer);
      expect(frames[tick + 1]!.battler0).toMatchObject({
        flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2,
        data: [model.data0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: fixture.initializer, centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
    }
    const terminal = backConcaveArcSmallFrameAtTick(fixture.speciesName, fixture.natureId, terminalTick, 1)!;
    expect(terminal.callback).toBe("WaitAnimEnd");
    expect(frames[terminalTick + 1]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: terminal.x2, y2: terminal.y2,
      data: [terminal.data0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7],
      callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(frames.at(-1)).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
      data: backConcaveArcSmallTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId),
      callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(backConcaveArcSmallWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backConcaveArcSmallWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
