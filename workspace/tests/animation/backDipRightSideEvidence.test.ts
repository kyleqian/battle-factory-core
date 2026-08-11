import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backDipRightSideFrameAtTick,
  backDipRightSideTerminalSpriteData,
  backDipRightSideWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import baltoyScenario from "../../tools/compare/fixtures/sendout-back-baltoy-twice-dip-right-side.json" with { type: "json" };
import baltoyRunA from "../../tools/compare/fixtures/sendout-back-baltoy-twice-dip-right-side-run-a.json" with { type: "json" };
import baltoyRunB from "../../tools/compare/fixtures/sendout-back-baltoy-twice-dip-right-side-run-b.json" with { type: "json" };
import sunkernScenario from "../../tools/compare/fixtures/sendout-back-sunkern-normal-dip-right-side.json" with { type: "json" };
import sunkernRunA from "../../tools/compare/fixtures/sendout-back-sunkern-normal-dip-right-side-run-a.json" with { type: "json" };
import sunkernRunB from "../../tools/compare/fixtures/sendout-back-sunkern-normal-dip-right-side-run-b.json" with { type: "json" };
import metapodScenario from "../../tools/compare/fixtures/sendout-back-metapod-fast-dip-right-side.json" with { type: "json" };
import metapodRunA from "../../tools/compare/fixtures/sendout-back-metapod-fast-dip-right-side-run-a.json" with { type: "json" };
import metapodRunB from "../../tools/compare/fixtures/sendout-back-metapod-fast-dip-right-side-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof baltoyScenario;
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
  readonly sourceDuration: number;
  readonly sourceAmplitude: number;
  readonly sourceOffset: number;
  readonly sourceRuns: number;
  readonly sourceOverflow: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[];
};
type Case = {
  readonly label: "baltoy-twice-dip-right-side" | "sunkern-normal-dip-right-side" | "metapod-fast-dip-right-side";
  readonly speciesName: "BALTOY" | "SUNKERN" | "METAPOD";
  readonly speciesId: 318 | 191 | 11;
  readonly natureId: 4 | 7 | 18;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 75 | 0 | 8;
  readonly selector: "ANIM_H_DIP_TWICE" | "ANIM_H_DIP" | "ANIM_H_DIP_FAST";
  readonly initializer: "Anim_HorizontalDip_Twice" | "Anim_HorizontalDip" | "Anim_HorizontalDip_Fast";
  readonly sourceId: 132 | 130 | 131;
  readonly duration: 30 | 60 | 90;
  readonly runs: 1 | 2;
  readonly startFrame: 1838 | 1839;
  readonly frameCount: 65 | 64 | 94;
  readonly expectedY: 88 | 90 | 92;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "baltoy-twice-dip-right-side", speciesName: "BALTOY", speciesId: 318, natureId: 4, natureMod: 0, sourceIndex: 75, selector: "ANIM_H_DIP_TWICE", initializer: "Anim_HorizontalDip_Twice", sourceId: 132, duration: 30, runs: 2, startFrame: 1838, frameCount: 65, expectedY: 88, rawBytes: 31781, rawSha256: "155506b388538c586cbd03823a197ce8facbec36903b88f08d3fecf32f48ce53", scenario: baltoyScenario, runA: baltoyRunA as Run, runB: baltoyRunB as Run },
  { label: "sunkern-normal-dip-right-side", speciesName: "SUNKERN", speciesId: 191, natureId: 7, natureMod: 1, sourceIndex: 0, selector: "ANIM_H_DIP", initializer: "Anim_HorizontalDip", sourceId: 130, duration: 60, runs: 1, startFrame: 1839, frameCount: 64, expectedY: 90, rawBytes: 30932, rawSha256: "a2efd7c9d1574df2e8be311be3db7bfb9d93083bf44304de002ca200017d8ae3", scenario: sunkernScenario as Scenario, runA: sunkernRunA as Run, runB: sunkernRunB as Run },
  { label: "metapod-fast-dip-right-side", speciesName: "METAPOD", speciesId: 11, natureId: 18, natureMod: 2, sourceIndex: 8, selector: "ANIM_H_DIP_FAST", initializer: "Anim_HorizontalDip_Fast", sourceId: 131, duration: 90, runs: 1, startFrame: 1839, frameCount: 94, expectedY: 92, rawBytes: 45591, rawSha256: "913b57d6118fda7e98056ccaaa78f003a061b9f0cae587a3ebcc90eab261b5bd", scenario: metapodScenario as Scenario, runA: metapodRunA as Run, runB: metapodRunB as Run },
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

describe("BACK_ANIM_DIP_RIGHT_SIDE Scene-ON evidence", () => {
  it("uses the selected legal Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 75)).toMatchObject({ index: 75, label: "FRONTIER_MON_BALTOY", species: "SPECIES_BALTOY", moves: ["MOVE_PSYBEAM", "MOVE_ANCIENT_POWER", "MOVE_LIGHT_SCREEN", "MOVE_MUD_SLAP"], itemTableId: 7, nature: "NATURE_NAUGHTY" });
    expect(frontierMons.entries.find(({ index }) => index === 0)).toMatchObject({ index: 0, label: "FRONTIER_MON_SUNKERN", species: "SPECIES_SUNKERN", moves: ["MOVE_MEGA_DRAIN", "MOVE_HELPING_HAND", "MOVE_SUNNY_DAY", "MOVE_LIGHT_SCREEN"], itemTableId: 54, nature: "NATURE_RELAXED" });
    expect(frontierMons.entries.find(({ index }) => index === 8)).toMatchObject({ index: 8, label: "FRONTIER_MON_METAPOD", species: "SPECIES_METAPOD", moves: ["MOVE_HARDEN", "MOVE_NONE", "MOVE_NONE", "MOVE_NONE"], itemTableId: 54, nature: "NATURE_BASHFUL" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, friendship: 70, shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ backAnimSetIndex: 18, backAnimSet: "BACK_ANIM_DIP_RIGHT_SIDE", natureMod: fixture.natureMod, selector: fixture.selector });
      expect(fixture.runA).toMatchObject({ sourceRecordIndex: fixture.sourceIndex, selectorEvidence: expect.stringContaining(`index ${fixture.sourceIndex}`) });
    }
  });

  it.each(CASES)("matches every framebuffer/RAM/OAM affine frame of fresh paired $label receipts", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-dip-right-side-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId,
      natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_DIP_RIGHT_SIDE", sourceBackAnimSetIndex: 18,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceDuration: fixture.duration, sourceAmplitude: 8, sourceOffset: -32, sourceRuns: fixture.runs,
      sourceOverflow: "data[2] > data[7]",
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.frameCount - 1, frameCount: fixture.frameCount },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "SetHorizontalDip", "WaitAnimEnd", "SpriteCallbackDummy"].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.frameCount);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.frameCount }, (_, index) => fixture.startFrame + index));
    expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    expect(frames[0]).toMatchObject({ battler0: { flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer, centerToCornerVecX: -32, centerToCornerVecY: -32, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    const terminalTick = fixture.frameCount - 3;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const model = backDipRightSideFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      const row = frames[tick + 1]!.battler0;
      expect(row).toMatchObject({
        flags: 4097, visible: true, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2,
        data: [model.data0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: model.callback, centerToCornerVecX: -64, centerToCornerVecY: -64,
        oam: { affineMode: 3, matrix: model.affineWrites[0].matrix, raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
    }
    const terminal = backDipRightSideFrameAtTick(fixture.speciesName, fixture.natureId, terminalTick, 1)!;
    expect(frames[terminalTick + 1]).toMatchObject({ battler0: { flags: 4097, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: [terminal.data0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "WaitAnimEnd", centerToCornerVecX: -32, centerToCornerVecY: -32, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(frames.at(-1)).toMatchObject({ battler0: { flags: 4097, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0, data: backDipRightSideTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId), callbackSymbol: "SpriteCallbackDummy", centerToCornerVecX: -32, centerToCornerVecY: -32, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    expect(backDipRightSideWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backDipRightSideWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
