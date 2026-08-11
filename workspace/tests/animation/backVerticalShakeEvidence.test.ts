import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backVerticalShakeFrameAtTick,
  backVerticalShakeWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import arbokScenario from "../../tools/compare/fixtures/sendout-back-arbok-fast.json" with { type: "json" };
import arbokRunA from "../../tools/compare/fixtures/sendout-back-arbok-fast-run-a.json" with { type: "json" };
import arbokRunB from "../../tools/compare/fixtures/sendout-back-arbok-fast-run-b.json" with { type: "json" };
import houndourScenario from "../../tools/compare/fixtures/sendout-back-houndour-normal.json" with { type: "json" };
import houndourRunA from "../../tools/compare/fixtures/sendout-back-houndour-normal-run-a.json" with { type: "json" };
import houndourRunB from "../../tools/compare/fixtures/sendout-back-houndour-normal-run-b.json" with { type: "json" };
import manectricScenario from "../../tools/compare/fixtures/sendout-back-manectric-slow.json" with { type: "json" };
import manectricRunA from "../../tools/compare/fixtures/sendout-back-manectric-slow-run-a.json" with { type: "json" };
import manectricRunB from "../../tools/compare/fixtures/sendout-back-manectric-slow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Scenario = typeof arbokScenario;
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
  readonly label: "arbok-fast" | "houndour-normal" | "manectric-slow";
  readonly speciesName: "ARBOK" | "HOUNDOUR" | "MANECTRIC";
  readonly speciesId: 24 | 228 | 338;
  readonly natureId: 3 | 6 | 15;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 217 | 119 | 393;
  readonly selector: "ANIM_V_SHAKE_BACK_FAST" | "ANIM_V_SHAKE_BACK" | "ANIM_V_SHAKE_BACK_SLOW";
  readonly initializer: "Anim_VerticalShakeBack_Fast" | "Anim_VerticalShakeBack" | "Anim_VerticalShakeBack_Slow";
  readonly sourceId: 97 | 87 | 88;
  readonly step: 70 | 60 | 30;
  readonly amplitude: 6 | 3;
  readonly terminalTick: 33 | 39 | 77;
  readonly startFrame: 1837 | 1840 | 1841;
  readonly expectedY: 84 | 92;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "arbok-fast", speciesName: "ARBOK", speciesId: 24, natureId: 3, natureMod: 0,
    sourceIndex: 217, selector: "ANIM_V_SHAKE_BACK_FAST", initializer: "Anim_VerticalShakeBack_Fast",
    sourceId: 97, step: 70, amplitude: 6, terminalTick: 33, startFrame: 1837, expectedY: 84,
    rawBytes: 16882, rawSha256: "a5cdcdf3fad46139afbf8c72e39c34ff3fd4880190a2f8f402d472fe3e3c0007",
    scenario: arbokScenario, runA: arbokRunA as Run, runB: arbokRunB as Run,
  },
  {
    label: "houndour-normal", speciesName: "HOUNDOUR", speciesId: 228, natureId: 6, natureMod: 1,
    sourceIndex: 119, selector: "ANIM_V_SHAKE_BACK", initializer: "Anim_VerticalShakeBack",
    sourceId: 87, step: 60, amplitude: 3, terminalTick: 39, startFrame: 1840, expectedY: 92,
    rawBytes: 19559, rawSha256: "a8a14edab2813a6a0d73af0fc7a97b3ffa711055c339917ee9ea594baa325333",
    scenario: houndourScenario, runA: houndourRunA as Run, runB: houndourRunB as Run,
  },
  {
    label: "manectric-slow", speciesName: "MANECTRIC", speciesId: 338, natureId: 15, natureMod: 2,
    sourceIndex: 393, selector: "ANIM_V_SHAKE_BACK_SLOW", initializer: "Anim_VerticalShakeBack_Slow",
    sourceId: 88, step: 30, amplitude: 3, terminalTick: 77, startFrame: 1841, expectedY: 84,
    rawBytes: 36702, rawSha256: "c729cdcfa1d3e3ab131da3f8abccf2122d57d8608a6fd651691d70cf38c378ad",
    scenario: manectricScenario, runA: manectricRunA as Run, runB: manectricRunB as Run,
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

describe("BACK_ANIM_V_SHAKE Scene-ON evidence", () => {
  it("uses real Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 217)).toMatchObject({
      index: 217, label: "FRONTIER_MON_ARBOK_1", species: "SPECIES_ARBOK",
      moves: ["MOVE_POISON_FANG", "MOVE_DIG", "MOVE_BITE", "MOVE_GLARE"],
      itemTableId: 7, itemName: "BATTLE_FRONTIER_ITEM_PERSIM_BERRY", nature: "NATURE_ADAMANT",
    });
    expect(frontierMons.entries.find(({ index }) => index === 119)).toMatchObject({
      index: 119, label: "FRONTIER_MON_HOUNDOUR", species: "SPECIES_HOUNDOUR",
      moves: ["MOVE_CRUNCH", "MOVE_EMBER", "MOVE_ROAR", "MOVE_PROTECT"],
      itemTableId: 38, itemName: "BATTLE_FRONTIER_ITEM_CHARCOAL", nature: "NATURE_DOCILE",
    });
    expect(frontierMons.entries.find(({ index }) => index === 393)).toMatchObject({
      index: 393, label: "FRONTIER_MON_MANECTRIC_1", species: "SPECIES_MANECTRIC",
      moves: ["MOVE_THUNDERBOLT", "MOVE_FLASH", "MOVE_QUICK_ATTACK", "MOVE_ROAR"],
      itemTableId: 17, itemName: "BATTLE_FRONTIER_ITEM_MAGNET", nature: "NATURE_MODEST",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId,
        ppUps: [0, 0, 0, 0], friendship: 70, gender: "male", shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        species: fixture.speciesName, backAnimSetIndex: 8, backAnimSet: "BACK_ANIM_V_SHAKE",
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
      schema: "back-v-shake-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_V_SHAKE",
      sourceBackAnimSetIndex: 8, sourceSelector: fixture.selector,
      sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceStep: fixture.step, sourceAmplitude: fixture.amplitude,
      sourceWindow: {
        startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2,
        frameCount: fixture.terminalTick + 3,
      },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "VerticalShakeBack", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      fixture.initializer, ...Array(fixture.terminalTick).fill("VerticalShakeBack"),
      "WaitAnimEnd", "SpriteCallbackDummy",
    ]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6, flags: 12289, x: 72, y: fixture.expectedY, x2: 0,
        animNum: 0, animCmdIndex: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrixNumber: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
      expect(row.battler0.data).toHaveLength(8);
    }
    expect(frames[0]).toMatchObject({
      battler0: {
        y2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
      },
    });
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = backVerticalShakeFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({
        x2: 0, y2: model.y2, data: [fixture.step, 1, model.data2, 0, 0, 0, 0, fixture.amplitude],
        callbackSymbol: "VerticalShakeBack",
      });
    }
    const terminal = backVerticalShakeFrameAtTick(
      fixture.speciesName, fixture.natureId, fixture.terminalTick, 1,
    )!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({
      battler0: {
        x2: 0, y2: 0, data: [fixture.step, 1, terminal.data2, 0, 0, 0, 0, fixture.amplitude],
        callbackSymbol: "WaitAnimEnd",
      },
    });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({
      battler0: {
        x2: 0, y2: 0, data: [0, 0, fixture.speciesId, 0, 0, 0, 0, fixture.amplitude],
        callbackSymbol: "SpriteCallbackDummy",
      },
    });
    expect(backVerticalShakeWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalShakeWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
