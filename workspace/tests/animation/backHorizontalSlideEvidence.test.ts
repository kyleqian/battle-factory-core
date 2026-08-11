import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backHorizontalSlideFrameAtTick,
  backHorizontalSlideWaitAnimEndCallback,
  backSendOutTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import fastScenario from "../../tools/compare/fixtures/sendout-back-tentacruel-fast.json" with { type: "json" };
import fastRunA from "../../tools/compare/fixtures/sendout-back-tentacruel-fast-run-a.json" with { type: "json" };
import fastRunB from "../../tools/compare/fixtures/sendout-back-tentacruel-fast-run-b.json" with { type: "json" };
import normalScenario from "../../tools/compare/fixtures/sendout-back-tentacruel-normal.json" with { type: "json" };
import normalRunA from "../../tools/compare/fixtures/sendout-back-tentacruel-normal-run-a.json" with { type: "json" };
import normalRunB from "../../tools/compare/fixtures/sendout-back-tentacruel-normal-run-b.json" with { type: "json" };
import slowScenario from "../../tools/compare/fixtures/sendout-back-tentacruel-slow.json" with { type: "json" };
import slowRunA from "../../tools/compare/fixtures/sendout-back-tentacruel-slow-run-a.json" with { type: "json" };
import slowRunB from "../../tools/compare/fixtures/sendout-back-tentacruel-slow-run-b.json" with { type: "json" };
import bayleefScenario from "../../tools/compare/fixtures/sendout-back-bayleef-normal.json" with { type: "json" };
import bayleefRunA from "../../tools/compare/fixtures/sendout-back-bayleef-normal-run-a.json" with { type: "json" };
import bayleefRunB from "../../tools/compare/fixtures/sendout-back-bayleef-normal-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type EvidenceRun = {
  readonly schema: string;
  readonly profile: string;
  readonly species: number;
  readonly natureId: number;
  readonly natureMod: number;
  readonly sourceBackAnimSet: string;
  readonly sourceBackAnimSetIndex: number;
  readonly sourceSelector: string;
  readonly sourceInitializer: string;
  readonly sourceId: number;
  readonly sourceDuration: number;
  readonly sourceAmplitude: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly {
    readonly frame: number;
    readonly sha256: string;
    readonly battler0: {
      readonly x2: number;
      readonly y2: number;
      readonly data: readonly number[];
      readonly callbackSymbol: string;
      readonly animNum: number;
      readonly animCmdIndex: number;
      readonly oam: {
        readonly affineMode: number;
        readonly matrix: readonly number[];
      };
    };
  }[];
};

type Case = {
  readonly label: "tentacruel-fast" | "tentacruel-normal" | "tentacruel-slow" | "bayleef-normal";
  readonly speciesName: "TENTACRUEL" | "BAYLEEF";
  readonly speciesId: 73 | 153;
  readonly sourceRecordIndex: 434 | 722 | 626 | 180;
  readonly natureId: 8 | 24 | 15 | 6;
  readonly natureMod: 0 | 1 | 2;
  readonly selector: "ANIM_H_SLIDE_FAST" | "ANIM_H_SLIDE" | "ANIM_H_SLIDE_SLOW";
  readonly initializer: "Anim_HorizontalSlide_Fast" | "Anim_HorizontalSlide" | "Anim_HorizontalSlide_Slow";
  readonly sourceId: 94 | 3 | 70;
  readonly duration: 20 | 40 | 80;
  readonly startFrame: 1842 | 1839;
  readonly rawBytes: 11273 | 20199 | 38114 | 20200;
  readonly rawSha256: string;
  readonly playerSetIds: readonly [number, number, number];
  readonly opponentSetIds: readonly [number, number, number];
  readonly scenario: typeof fastScenario;
  readonly runA: EvidenceRun;
  readonly runB: EvidenceRun;
};

const CASES: readonly Case[] = [
  {
    label: "tentacruel-fast", speciesName: "TENTACRUEL", speciesId: 73, sourceRecordIndex: 434,
    natureId: 8, natureMod: 0, selector: "ANIM_H_SLIDE_FAST", initializer: "Anim_HorizontalSlide_Fast",
    sourceId: 94, duration: 20, startFrame: 1842, rawBytes: 11273,
    rawSha256: "44813ac0bc52abe9cad62ea8b6c019fb04a25363044f5496563cc0e161f1ee8e",
    playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180],
    scenario: fastScenario, runA: fastRunA, runB: fastRunB,
  },
  {
    label: "tentacruel-normal", speciesName: "TENTACRUEL", speciesId: 73, sourceRecordIndex: 722,
    natureId: 24, natureMod: 1, selector: "ANIM_H_SLIDE", initializer: "Anim_HorizontalSlide",
    sourceId: 3, duration: 40, startFrame: 1842, rawBytes: 20199,
    rawSha256: "86eb4b5b1cedf5e267797f4f9eaf6831fde1b10a63a316cc6f55cd2b3302fcac",
    playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180],
    scenario: normalScenario, runA: normalRunA, runB: normalRunB,
  },
  {
    label: "tentacruel-slow", speciesName: "TENTACRUEL", speciesId: 73, sourceRecordIndex: 626,
    natureId: 15, natureMod: 2, selector: "ANIM_H_SLIDE_SLOW", initializer: "Anim_HorizontalSlide_Slow",
    sourceId: 70, duration: 80, startFrame: 1842, rawBytes: 38114,
    rawSha256: "db6b09b14767a8a3932a228a771cdbf5511efc92ade18d1320e87f2d52a717d3",
    playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180],
    scenario: slowScenario, runA: slowRunA, runB: slowRunB,
  },
  {
    label: "bayleef-normal", speciesName: "BAYLEEF", speciesId: 153, sourceRecordIndex: 180,
    natureId: 6, natureMod: 1, selector: "ANIM_H_SLIDE", initializer: "Anim_HorizontalSlide",
    sourceId: 3, duration: 40, startFrame: 1839, rawBytes: 20200,
    rawSha256: "241db20d259d1b3d4d2d7d122c350a20ad9c131b2fc3e1fb49487ae70c807432",
    playerSetIds: [180, 154, 135], opponentSetIds: [156, 149, 188],
    scenario: bayleefScenario, runA: bayleefRunA, runB: bayleefRunB,
  },
];

function assertCompleteLegalParty(scenario: typeof fastScenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab",
    profile: "battle-scene-on",
    level: 50,
    challengeNum: 0,
    battleNum: 0,
    trainerId: 50,
    preCheckpointCaptureAllFrames: true,
  });
  for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
    expect(setId).toBeGreaterThanOrEqual(110);
    expect(setId).toBeLessThanOrEqual(199);
  }
  expect(scenario.overrides.parties.player).toHaveLength(3);
  expect(scenario.overrides.parties.opponent).toHaveLength(3);
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon.level).toBe(50);
    expect(Object.keys(mon.ivs)).toEqual([
      "hp", "attack", "defense", "speed", "spAttack", "spDefense",
    ]);
    expect(Object.keys(mon.evs)).toEqual([
      "hp", "attack", "defense", "speed", "spAttack", "spDefense",
    ]);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toHaveLength(4);
    expect(mon).toEqual(expect.objectContaining({
      item: expect.any(Number),
      abilitySlot: expect.any(Number),
      friendship: expect.any(Number),
      gender: expect.any(String),
      shiny: expect.any(Boolean),
    }));
  }
}

describe("BACK_ANIM_H_SLIDE Scene-ON evidence", () => {
  it("pins TENTACRUEL's three real Factory records and BAYLEEF's distinct normal sibling", () => {
    expect(frontierMons.entries.find(({ index }) => index === 434)).toMatchObject({
      index: 434, label: "FRONTIER_MON_TENTACRUEL_1", species: "SPECIES_TENTACRUEL",
      moves: ["MOVE_SLUDGE_BOMB", "MOVE_ICY_WIND", "MOVE_BARRIER", "MOVE_CONFUSE_RAY"],
      nature: "NATURE_IMPISH",
    });
    expect(frontierMons.entries.find(({ index }) => index === 722)).toMatchObject({
      index: 722, label: "FRONTIER_MON_TENTACRUEL_4", species: "SPECIES_TENTACRUEL",
      moves: ["MOVE_HYDRO_PUMP", "MOVE_SLUDGE_BOMB", "MOVE_ICE_BEAM", "MOVE_MIRROR_COAT"],
      nature: "NATURE_QUIRKY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 626)).toMatchObject({
      index: 626, label: "FRONTIER_MON_TENTACRUEL_3", species: "SPECIES_TENTACRUEL",
      moves: ["MOVE_SURF", "MOVE_GIGA_DRAIN", "MOVE_ICE_BEAM", "MOVE_MIRROR_COAT"],
      nature: "NATURE_MODEST",
    });
    expect(frontierMons.entries.find(({ index }) => index === 180)).toMatchObject({
      index: 180, label: "FRONTIER_MON_BAYLEEF_1", species: "SPECIES_BAYLEEF",
      moves: ["MOVE_RAZOR_LEAF", "MOVE_TOXIC", "MOVE_SAFEGUARD", "MOVE_LIGHT_SCREEN"],
      nature: "NATURE_DOCILE",
    });
  });

  it.each(CASES)("stages a complete legal $label party despite the source record's challenge-range position", (fixture) => {
    assertCompleteLegalParty(fixture.scenario);
    expect(fixture.scenario.playerSetIds).toEqual(fixture.playerSetIds);
    expect(fixture.scenario.opponentSetIds).toEqual(fixture.opponentSetIds);
    expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
      species: fixture.speciesId,
      level: 50,
      nature: fixture.natureId,
      ppUps: [0, 0, 0, 0],
      item: 0,
      abilitySlot: 0,
      friendship: 70,
      gender: "male",
      shiny: false,
    });
    expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toEqual({
      species: fixture.speciesName,
      natureId: fixture.natureId,
      nature: fixture.speciesName === "BAYLEEF" ? "NATURE_DOCILE" : fixture.natureId === 8
        ? "NATURE_IMPISH" : fixture.natureId === 24 ? "NATURE_QUIRKY" : "NATURE_MODEST",
      backAnimSetIndex: 1,
      backAnimSet: "BACK_ANIM_H_SLIDE",
      natureMod: fixture.natureMod,
      selector: fixture.selector,
    });
  });

  it.each(CASES)("matches the fresh byte-identical $label active-to-dummy receipt", (fixture) => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-h-slide-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: fixture.speciesId,
      natureId: fixture.natureId,
      natureMod: fixture.natureMod,
      sourceBackAnimSet: "BACK_ANIM_H_SLIDE",
      sourceBackAnimSetIndex: 1,
      sourceSelector: fixture.selector,
      sourceInitializer: fixture.initializer,
      sourceId: fixture.sourceId,
      sourceDuration: fixture.duration,
      sourceAmplitude: 6,
      sourceWindow: {
        startFrame: fixture.startFrame,
        endFrame: fixture.startFrame + fixture.duration + 3,
        frameCount: fixture.duration + 4,
      },
    });

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.duration + 4);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: fixture.duration + 4 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      fixture.initializer,
      ...Array(fixture.duration + 1).fill("HorizontalSlide"),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer,
      "HorizontalSlide",
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6,
        flags: 12289,
        x: 72,
        y2: 0,
        animNum: 0,
        animCmdIndex: 0,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      });
    }

    // Task_HandleMonAnimation has installed the selected initializer but has
    // not called it on this first captured callback frame.
    expect(frames[0]).toMatchObject({
      battler0: {
        x2: 0,
        y2: 0,
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: fixture.initializer,
      },
    });
    for (let tick = 0; tick <= fixture.duration; tick += 1) {
      const model = backHorizontalSlideFrameAtTick(
        fixture.speciesName, fixture.natureId, tick, 1,
      )!;
      const row = frames[tick + 1]!.battler0;
      expect(row).toMatchObject({
        x2: model.x2,
        y2: model.y2,
        data: [model.data0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: model.callback,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      });
    }
    const cleanup = backHorizontalSlideFrameAtTick(
      fixture.speciesName, fixture.natureId, fixture.duration + 1, 1,
    )!;
    expect(frames[fixture.duration + 2]).toMatchObject({
      battler0: {
        x2: cleanup.x2,
        y2: cleanup.y2,
        data: [cleanup.data0, 1, cleanup.data2, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
      },
    });
    expect(frames[fixture.duration + 3]).toMatchObject({
      battler0: {
        x2: 0,
        y2: 0,
        data: backSendOutTerminalSpriteData(0, fixture.speciesId),
        callbackSymbol: "SpriteCallbackDummy",
      },
    });
    expect(backHorizontalSlideWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalSlideWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
