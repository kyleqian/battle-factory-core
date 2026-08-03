import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backHorizontalShakeFrameAtTick,
  backHorizontalShakeWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import cacturneScenario from "../../tools/compare/fixtures/sendout-back-cacturne-fast.json" with { type: "json" };
import cacturneRunA from "../../tools/compare/fixtures/sendout-back-cacturne-fast-run-a.json" with { type: "json" };
import cacturneRunB from "../../tools/compare/fixtures/sendout-back-cacturne-fast-run-b.json" with { type: "json" };
import venusaurScenario from "../../tools/compare/fixtures/sendout-back-venusaur-normal.json" with { type: "json" };
import venusaurRunA from "../../tools/compare/fixtures/sendout-back-venusaur-normal-run-a.json" with { type: "json" };
import venusaurRunB from "../../tools/compare/fixtures/sendout-back-venusaur-normal-run-b.json" with { type: "json" };
import salamenceScenario from "../../tools/compare/fixtures/sendout-back-salamence-slow.json" with { type: "json" };
import salamenceRunA from "../../tools/compare/fixtures/sendout-back-salamence-slow-run-a.json" with { type: "json" };
import salamenceRunB from "../../tools/compare/fixtures/sendout-back-salamence-slow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Scenario = typeof cacturneScenario;
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
  readonly label: "cacturne-fast" | "venusaur-normal" | "salamence-slow";
  readonly speciesName: "CACTURNE" | "VENUSAUR" | "SALAMENCE";
  readonly speciesId: 345 | 3 | 397;
  readonly natureId: 11 | 5 | 15;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 254 | 537 | 830;
  readonly selector: "ANIM_H_SHAKE_FAST" | "ANIM_H_SHAKE" | "ANIM_H_SHAKE_SLOW";
  readonly initializer: "Anim_HorizontalShake_Fast" | "Anim_HorizontalShake" | "Anim_HorizontalShake_Slow";
  readonly sourceId: 93 | 15 | 76;
  readonly step: 70 | 60 | 30;
  readonly amplitude: 6 | 3;
  readonly terminalTick: 33 | 39 | 77;
  readonly startFrame: 1840 | 1841;
  readonly expectedY: 87 | 86;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "cacturne-fast", speciesName: "CACTURNE", speciesId: 345, natureId: 11, natureMod: 0,
    sourceIndex: 254, selector: "ANIM_H_SHAKE_FAST", initializer: "Anim_HorizontalShake_Fast",
    sourceId: 93, step: 70, amplitude: 6, terminalTick: 33, startFrame: 1840, expectedY: 87,
    rawBytes: 16813, rawSha256: "97c700cd90700b3dc117a3f6f33a0bec5db45dea15795ba75932f10d407bc977",
    scenario: cacturneScenario, runA: cacturneRunA as Run, runB: cacturneRunB as Run,
  },
  {
    label: "venusaur-normal", speciesName: "VENUSAUR", speciesId: 3, natureId: 5, natureMod: 1,
    sourceIndex: 537, selector: "ANIM_H_SHAKE", initializer: "Anim_HorizontalShake",
    sourceId: 15, step: 60, amplitude: 3, terminalTick: 39, startFrame: 1840, expectedY: 87,
    rawBytes: 19483, rawSha256: "a69f036d24077f914904032669550d6e4ca29b28e8bbd5434eeffe18da9c66cb",
    scenario: venusaurScenario, runA: venusaurRunA as Run, runB: venusaurRunB as Run,
  },
  {
    label: "salamence-slow", speciesName: "SALAMENCE", speciesId: 397, natureId: 15, natureMod: 2,
    sourceIndex: 830, selector: "ANIM_H_SHAKE_SLOW", initializer: "Anim_HorizontalShake_Slow",
    sourceId: 76, step: 30, amplitude: 3, terminalTick: 77, startFrame: 1841, expectedY: 86,
    rawBytes: 36574, rawSha256: "c4c3004247f31b143840a754fbd7da0aa61c2a0ab12e6c148427b35e15ada5a0",
    scenario: salamenceScenario, runA: salamenceRunA as Run, runB: salamenceRunB as Run,
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

describe("BACK_ANIM_H_SHAKE Scene-ON evidence", () => {
  it("uses real Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 254)).toMatchObject({
      index: 254, label: "FRONTIER_MON_CACTURNE_1", species: "SPECIES_CACTURNE",
      moves: ["MOVE_NEEDLE_ARM", "MOVE_FAINT_ATTACK", "MOVE_ACID", "MOVE_MEGA_PUNCH"],
      itemTableId: 34, itemName: "BATTLE_FRONTIER_ITEM_SCOPE_LENS", nature: "NATURE_HASTY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 537)).toMatchObject({
      index: 537, label: "FRONTIER_MON_VENUSAUR_2", species: "SPECIES_VENUSAUR",
      moves: ["MOVE_LEECH_SEED", "MOVE_GIGA_DRAIN", "MOVE_DOUBLE_TEAM", "MOVE_LIGHT_SCREEN"],
      itemTableId: 32, itemName: "BATTLE_FRONTIER_ITEM_BRIGHT_POWDER", nature: "NATURE_BOLD",
    });
    expect(frontierMons.entries.find(({ index }) => index === 830)).toMatchObject({
      index: 830, label: "FRONTIER_MON_SALAMENCE_7", species: "SPECIES_SALAMENCE",
      moves: ["MOVE_FLAMETHROWER", "MOVE_DRAGON_CLAW", "MOVE_CRUNCH", "MOVE_BRICK_BREAK"],
      itemTableId: 41, itemName: "BATTLE_FRONTIER_ITEM_LUM_BERRY", nature: "NATURE_MODEST",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId,
        ppUps: [0, 0, 0, 0], friendship: 70, gender: "male", shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        species: fixture.speciesName, backAnimSetIndex: 7, backAnimSet: "BACK_ANIM_H_SHAKE",
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
      schema: "back-h-shake-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_H_SHAKE",
      sourceBackAnimSetIndex: 7, sourceSelector: fixture.selector,
      sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceStep: fixture.step, sourceAmplitude: fixture.amplitude,
      sourceWindow: {
        startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2,
        frameCount: fixture.terminalTick + 3,
      },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "HorizontalShake", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: fixture.terminalTick + 3 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      fixture.initializer, ...Array(fixture.terminalTick).fill("HorizontalShake"),
      "WaitAnimEnd", "SpriteCallbackDummy",
    ]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6, flags: 12289, x: 72, y: fixture.expectedY, y2: 0,
        animNum: 0, animCmdIndex: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrixNumber: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
      expect(row.battler0.data).toHaveLength(8);
    }
    expect(frames[0]).toMatchObject({
      battler0: {
        x2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
      },
    });
    for (let tick = 0; tick < fixture.terminalTick; tick += 1) {
      const model = backHorizontalShakeFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({
        x2: model.x2, data: [fixture.step, 1, model.data2, 0, 0, 0, 0, fixture.amplitude],
        callbackSymbol: "HorizontalShake",
      });
    }
    const terminal = backHorizontalShakeFrameAtTick(
      fixture.speciesName, fixture.natureId, fixture.terminalTick, 1,
    )!;
    expect(frames[fixture.terminalTick + 1]).toMatchObject({
      battler0: {
        x2: 0, data: [fixture.step, 1, terminal.data2, 0, 0, 0, 0, fixture.amplitude],
        callbackSymbol: "WaitAnimEnd",
      },
    });
    expect(frames[fixture.terminalTick + 2]).toMatchObject({
      battler0: {
        x2: 0, data: [0, 0, fixture.speciesId, 0, 0, 0, 0, fixture.amplitude],
        callbackSymbol: "SpriteCallbackDummy",
      },
    });
    expect(backHorizontalShakeWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalShakeWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
