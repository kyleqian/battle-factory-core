import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backVerticalShakeHorizontalSlideFrameAtTick,
  backVerticalShakeHorizontalSlideWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import krabbyScenario from "../../tools/compare/fixtures/sendout-back-krabby-fast.json" with { type: "json" };
import krabbyRunA from "../../tools/compare/fixtures/sendout-back-krabby-fast-run-a.json" with { type: "json" };
import krabbyRunB from "../../tools/compare/fixtures/sendout-back-krabby-fast-run-b.json" with { type: "json" };
import spinarakScenario from "../../tools/compare/fixtures/sendout-back-spinarak-normal.json" with { type: "json" };
import spinarakRunA from "../../tools/compare/fixtures/sendout-back-spinarak-normal-run-a.json" with { type: "json" };
import spinarakRunB from "../../tools/compare/fixtures/sendout-back-spinarak-normal-run-b.json" with { type: "json" };
import swinubScenario from "../../tools/compare/fixtures/sendout-back-swinub-slow.json" with { type: "json" };
import swinubRunA from "../../tools/compare/fixtures/sendout-back-swinub-slow-run-a.json" with { type: "json" };
import swinubRunB from "../../tools/compare/fixtures/sendout-back-swinub-slow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Scenario = typeof krabbyScenario;
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
  readonly sourceCallback: string;
  readonly sourceId: number;
  readonly sourceStep: number;
  readonly sourceModulus: number;
  readonly sourceAmplitude: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly {
    readonly frame: number;
    readonly sha256: string;
    readonly battler0: {
      readonly slot: number;
      readonly flags: number;
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
        readonly affineMode: number;
        readonly matrixNumber: number;
        readonly matrix: readonly number[];
        readonly raw: string;
      };
    };
  }[];
};

type Case = {
  readonly label: "krabby-fast" | "spinarak-normal" | "swinub-slow";
  readonly speciesName: "KRABBY" | "SPINARAK" | "SWINUB";
  readonly speciesId: 98 | 167 | 220;
  readonly natureId: 0 | 24 | 21;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 111 | 27 | 31;
  readonly selector: "ANIM_V_SHAKE_H_SLIDE_FAST" | "ANIM_V_SHAKE_H_SLIDE" | "ANIM_V_SHAKE_H_SLIDE_SLOW";
  readonly callback: "Anim_VerticalShakeHorizontalSlide_Fast" | "Anim_VerticalShakeHorizontalSlide" | "Anim_VerticalShakeHorizontalSlide_Slow";
  readonly sourceId: 103 | 102 | 89;
  readonly step: 64 | 48 | 24;
  readonly modulus: 96 | 128;
  readonly terminalTick: 33 | 43 | 86;
  readonly startFrame: 1838 | 1840;
  readonly expectedY: 90 | 101;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "krabby-fast", speciesName: "KRABBY", speciesId: 98, natureId: 0, natureMod: 0,
    sourceIndex: 111, selector: "ANIM_V_SHAKE_H_SLIDE_FAST", callback: "Anim_VerticalShakeHorizontalSlide_Fast",
    sourceId: 103, step: 64, modulus: 96, terminalTick: 33, startFrame: 1838, expectedY: 90,
    rawBytes: 17596, rawSha256: "e4df24020fb8442bd13c73bb21e7978396fae5986219eec8053ecdde36228eb0",
    scenario: krabbyScenario, runA: krabbyRunA as Run, runB: krabbyRunB as Run,
  },
  {
    label: "spinarak-normal", speciesName: "SPINARAK", speciesId: 167, natureId: 24, natureMod: 1,
    sourceIndex: 27, selector: "ANIM_V_SHAKE_H_SLIDE", callback: "Anim_VerticalShakeHorizontalSlide",
    sourceId: 102, step: 48, modulus: 128, terminalTick: 43, startFrame: 1840, expectedY: 101,
    rawBytes: 22128, rawSha256: "18fddc2509ceb84f8b527dc8eeef64a448204bd85391ce4168a5b45f64b47a0c",
    scenario: spinarakScenario, runA: spinarakRunA as Run, runB: spinarakRunB as Run,
  },
  {
    label: "swinub-slow", speciesName: "SWINUB", speciesId: 220, natureId: 21, natureMod: 2,
    sourceIndex: 31, selector: "ANIM_V_SHAKE_H_SLIDE_SLOW", callback: "Anim_VerticalShakeHorizontalSlide_Slow",
    sourceId: 89, step: 24, modulus: 128, terminalTick: 86, startFrame: 1838, expectedY: 101,
    rawBytes: 42671, rawSha256: "3f0f9e2246aeafbf3ddd2db443bd5e20976fb92aced600ab6f97590b7662327e",
    scenario: swinubScenario, runA: swinubRunA as Run, runB: swinubRunB as Run,
  },
];

function assertCompleteLegalParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab", profile: "battle-scene-on", level: 50,
    preCheckpointCaptureAllFrames: true,
    playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180],
  });
  expect(scenario.overrides.parties.player).toHaveLength(3);
  expect(scenario.overrides.parties.opponent).toHaveLength(3);
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({
      level: 50, item: expect.any(Number), abilitySlot: expect.any(Number),
      friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean),
    });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toHaveLength(4);
  }
}

describe("BACK_ANIM_V_SHAKE_H_SLIDE Scene-ON evidence", () => {
  it("uses real Factory records for every nature modifier", () => {
    expect(frontierMons.entries.find(({ index }) => index === 111)).toMatchObject({
      index: 111, label: "FRONTIER_MON_KRABBY", species: "SPECIES_KRABBY",
      moves: ["MOVE_CRABHAMMER", "MOVE_MUD_SHOT", "MOVE_FLAIL", "MOVE_KNOCK_OFF"],
      itemTableId: 6, itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_HARDY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 27)).toMatchObject({
      index: 27, label: "FRONTIER_MON_SPINARAK", species: "SPECIES_SPINARAK",
      moves: ["MOVE_SIGNAL_BEAM", "MOVE_NIGHT_SHADE", "MOVE_SPIDER_WEB", "MOVE_SCARY_FACE"],
      itemTableId: 52, itemName: "BATTLE_FRONTIER_ITEM_LIECHI_BERRY", nature: "NATURE_QUIRKY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 31)).toMatchObject({
      index: 31, label: "FRONTIER_MON_SWINUB", species: "SPECIES_SWINUB",
      moves: ["MOVE_ICY_WIND", "MOVE_DIG", "MOVE_ROCK_TOMB", "MOVE_ENDURE"],
      itemTableId: 2, itemName: "BATTLE_FRONTIER_ITEM_SITRUS_BERRY", nature: "NATURE_GENTLE",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId,
        ppUps: [0, 0, 0, 0], friendship: 70, gender: "male", shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        species: fixture.speciesName, backAnimSetIndex: 9, backAnimSet: "BACK_ANIM_V_SHAKE_H_SLIDE",
        natureMod: fixture.natureMod, selector: fixture.selector,
      });
      expect(fixture.runA).toMatchObject({
        sourceRecordIndex: fixture.sourceIndex, selectorEvidence: expect.stringContaining(`index ${fixture.sourceIndex}`),
      });
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
    expect(fixture.runA).toMatchObject({
      schema: "back-v-shake-h-slide-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_V_SHAKE_H_SLIDE",
      sourceBackAnimSetIndex: 9, sourceSelector: fixture.selector, sourceCallback: fixture.callback,
      sourceId: fixture.sourceId, sourceStep: fixture.step, sourceModulus: fixture.modulus, sourceAmplitude: 4,
      sourceWindow: {
        startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2,
        frameCount: fixture.terminalTick + 3,
      },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.callback, "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      fixture.callback, ...Array(fixture.terminalTick).fill(fixture.callback), "WaitAnimEnd", "SpriteCallbackDummy",
    ]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6, flags: 12289, x: 72, y: fixture.expectedY,
        animNum: 0, animCmdIndex: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrixNumber: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
      expect(row.battler0.data).toHaveLength(8);
    }
    expect(frames[0]).toMatchObject({
      battler0: { x2: 0, y2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.callback },
    });
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = backVerticalShakeHorizontalSlideFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({
        x2: model.x2, y2: model.y2, data: [0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: fixture.callback,
      });
    }
    const terminal = backVerticalShakeHorizontalSlideFrameAtTick(
      fixture.speciesName, fixture.natureId, fixture.terminalTick, 1,
    )!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({
      battler0: {
        x2: terminal.x2, y2: terminal.y2, data: [0, 1, terminal.data2, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
      },
    });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({
      battler0: {
        x2: terminal.x2, y2: terminal.y2, data: [0, 0, fixture.speciesId, 0, 0, 0, 0, 0],
        callbackSymbol: "SpriteCallbackDummy",
      },
    });
    expect(backVerticalShakeHorizontalSlideWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalShakeHorizontalSlideWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
