import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backHorizontalRepeatedSpringFrameAtTick,
  backHorizontalRepeatedSpringWaitAnimEndCallback,
} from "../../src/animation/backSendOutAnim.ts";
import fastScenario from "../../tools/compare/fixtures/sendout-back-luvdisc-fast-staged.json" with { type: "json" };
import fastRunA from "../../tools/compare/fixtures/sendout-back-luvdisc-fast-staged-run-a.json" with { type: "json" };
import fastRunB from "../../tools/compare/fixtures/sendout-back-luvdisc-fast-staged-run-b.json" with { type: "json" };
import normalScenario from "../../tools/compare/fixtures/sendout-back-luvdisc-normal.json" with { type: "json" };
import normalRunA from "../../tools/compare/fixtures/sendout-back-luvdisc-normal-run-a.json" with { type: "json" };
import normalRunB from "../../tools/compare/fixtures/sendout-back-luvdisc-normal-run-b.json" with { type: "json" };
import slowScenario from "../../tools/compare/fixtures/sendout-back-carvanha-slow.json" with { type: "json" };
import slowRunA from "../../tools/compare/fixtures/sendout-back-carvanha-slow-run-a.json" with { type: "json" };
import slowRunB from "../../tools/compare/fixtures/sendout-back-carvanha-slow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Scenario = typeof fastScenario;
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
  readonly sourceSpeed: number;
  readonly sourceLimit: number;
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
      readonly data: readonly number[];
      readonly callbackSymbol: string;
      readonly centerToCornerVecX: number;
      readonly centerToCornerVecY: number;
      readonly oam: {
        readonly affineMode: number;
        readonly matrix: readonly number[];
      };
    };
  }[];
};

type Case = {
  readonly label: "luvdisc-fast-staged" | "luvdisc-normal" | "carvanha-slow";
  readonly speciesName: "LUVDISC" | "CARVANHA";
  readonly speciesId: 325 | 330;
  readonly natureId: 0 | 7 | 17;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 123 | 86;
  readonly selector: "ANIM_H_REPEATED_SPRING_FAST" | "ANIM_H_REPEATED_SPRING" | "ANIM_H_REPEATED_SPRING_SLOW";
  readonly initializer: "Anim_HorizontalRepeatedSpring_Fast" | "Anim_HorizontalRepeatedSpring" | "Anim_HorizontalRepeatedSpring_Slow";
  readonly sourceId: 111 | 112 | 63;
  readonly speed: 8 | 4;
  readonly limit: 512 | 256;
  readonly amplitude: 16 | 8;
  readonly startFrame: 1839 | 1840;
  readonly expectedY: 90 | 87;
  readonly rawBytes: 32584 | 32087 | 32522;
  readonly rawSha256: string;
  readonly selectorEvidence: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "luvdisc-fast-staged", speciesName: "LUVDISC", speciesId: 325,
    natureId: 0, natureMod: 0, sourceIndex: 123,
    selector: "ANIM_H_REPEATED_SPRING_FAST", initializer: "Anim_HorizontalRepeatedSpring_Fast",
    sourceId: 111, speed: 8, limit: 512, amplitude: 16,
    startFrame: 1839, expectedY: 90, rawBytes: 32584,
    rawSha256: "58a82e8b83c4507b68ccf1247f4c37370560cdac866c1e58a54e455872bcab8b",
    selectorEvidence: "staged legal NATURE_HARDY; not a Factory-record selector (record 123 is NATURE_RELAXED)",
    scenario: fastScenario, runA: fastRunA as Run, runB: fastRunB as Run,
  },
  {
    label: "luvdisc-normal", speciesName: "LUVDISC", speciesId: 325,
    natureId: 7, natureMod: 1, sourceIndex: 123,
    selector: "ANIM_H_REPEATED_SPRING", initializer: "Anim_HorizontalRepeatedSpring",
    sourceId: 112, speed: 8, limit: 512, amplitude: 8,
    startFrame: 1839, expectedY: 90, rawBytes: 32087,
    rawSha256: "d2b0b2692734ca7acc903cfe2d9a7f461ad55a1c2d2df0c30daaba433a210202",
    selectorEvidence: "Factory record index 123 NATURE_RELAXED",
    scenario: normalScenario, runA: normalRunA as Run, runB: normalRunB as Run,
  },
  {
    label: "carvanha-slow", speciesName: "CARVANHA", speciesId: 330,
    natureId: 17, natureMod: 2, sourceIndex: 86,
    selector: "ANIM_H_REPEATED_SPRING_SLOW", initializer: "Anim_HorizontalRepeatedSpring_Slow",
    sourceId: 63, speed: 4, limit: 256, amplitude: 16,
    startFrame: 1840, expectedY: 87, rawBytes: 32522,
    rawSha256: "396db95ffe2208e9cb88a860d60cc0c26553770e90f0ddebb5a01435edf4eed8",
    selectorEvidence: "Factory record index 86 NATURE_QUIET",
    scenario: slowScenario, runA: slowRunA as Run, runB: slowRunB as Run,
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
    expect(Object.keys(mon.ivs)).toEqual([
      "hp", "attack", "defense", "speed", "spAttack", "spDefense",
    ]);
    expect(Object.keys(mon.evs)).toEqual([
      "hp", "attack", "defense", "speed", "spAttack", "spDefense",
    ]);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toHaveLength(4);
  }
}

describe("BACK_ANIM_H_SPRING_REPEATED Scene-ON evidence", () => {
  it("pins both reachable Factory records and labels the staged Hardy selector", () => {
    expect(frontierMons.entries.find(({ index }) => index === 123)).toMatchObject({
      index: 123, label: "FRONTIER_MON_LUVDISC", species: "SPECIES_LUVDISC",
      moves: ["MOVE_SWEET_KISS", "MOVE_ATTRACT", "MOVE_DIVE", "MOVE_RAIN_DANCE"],
      itemTableId: 24, itemName: "BATTLE_FRONTIER_ITEM_QUICK_CLAW",
      evSpread: 17, evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
      nature: "NATURE_RELAXED",
    });
    expect(frontierMons.entries.find(({ index }) => index === 86)).toMatchObject({
      index: 86, label: "FRONTIER_MON_CARVANHA", species: "SPECIES_CARVANHA",
      moves: ["MOVE_BITE", "MOVE_SCREECH", "MOVE_SCARY_FACE", "MOVE_SWAGGER"],
      itemTableId: 47, itemName: "BATTLE_FRONTIER_ITEM_SHELL_BELL",
      evSpread: 17, evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
      nature: "NATURE_QUIET",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      for (const mon of fixture.scenario.overrides.parties.player) {
        expect(mon).toMatchObject({
          species: fixture.speciesId, level: 50, nature: fixture.natureId,
          ppUps: [0, 0, 0, 0], friendship: 70, gender: "male", shiny: false,
        });
      }
      expect(fixture.runA).toMatchObject({
        species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
        selectorEvidence: fixture.selectorEvidence, sourceRecordIndex: fixture.sourceIndex,
      });
    }
    expect(CASES[0]!.scenario.overrides.parties.player[0]).toMatchObject({
      nature: 0, item: 183, moves: [186, 213, 291, 240],
    });
    expect(CASES[0]!.runA.selectorEvidence).toContain("staged legal NATURE_HARDY");
    expect(CASES[0]!.runA.selectorEvidence).toContain("not a Factory-record selector");
    expect(CASES[1]!.scenario.overrides.parties.player[0]).toMatchObject({
      nature: 7, item: 183, moves: [186, 213, 291, 240],
    });
    expect(CASES[2]!.scenario.overrides.parties.player[0]).toMatchObject({
      nature: 17, item: 219, moves: [44, 103, 184, 207],
    });
    expect(CASES[1]!.runA.selectorEvidence).toBe("Factory record index 123 NATURE_RELAXED");
    expect(CASES[2]!.runA.selectorEvidence).toBe("Factory record index 86 NATURE_QUIET");
  });

  it.each(CASES)("matches the fresh byte-identical $label active-to-dummy receipt", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-h-spring-repeated-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      selectorEvidence: fixture.selectorEvidence, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_H_SPRING_REPEATED", sourceBackAnimSetIndex: 3,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer,
      sourceId: fixture.sourceId, sourceSpeed: fixture.speed, sourceLimit: fixture.limit,
      sourceAmplitude: fixture.amplitude,
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + 67, frameCount: 68 },
    });

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(68);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 68 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      ...Array(66).fill(fixture.initializer), "WaitAnimEnd", "SpriteCallbackDummy",
    ]);
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "HorizontalRepeatedSpring", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6, flags: expect.any(Number), x: 72, y: fixture.expectedY, y2: 0,
        oam: { affineMode: expect.any(Number), matrix: expect.any(Array) },
      });
    }

    // Task_HandleMonAnimation's first captured row precedes the initializer
    // invocation: normal OAM, zeroed animation data, and no affine write.
    expect(frames[0]).toMatchObject({
      battler0: {
        flags: 12289, x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (let tick = 0; tick <= 64; tick += 1) {
      const model = backHorizontalRepeatedSpringFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      const row = frames[tick + 1]!.battler0;
      expect(row).toMatchObject({
        flags: 4097, x2: model.x2, y2: 0,
        centerToCornerVecX: -64, centerToCornerVecY: -64,
        data: [0, 1, 1, 0, fixture.amplitude, fixture.limit, fixture.speed, model.data7],
        callbackSymbol: fixture.initializer,
        // The mode bit is visible on this same VBlank, while the first
        // HandleSetAffineData write reaches OAM on the following frame.
        oam: { affineMode: 3, matrix: [tick === 0 ? 256 : model.xScale, 0, 0, 256] },
      });
    }
    const wait = frames[66]!;
    const terminal = backHorizontalRepeatedSpringFrameAtTick(fixture.speciesName, fixture.natureId, 65, 1)!;
    expect(wait).toMatchObject({
      battler0: {
        flags: 4097, x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        data: [0, 1, 1, 0, fixture.amplitude, fixture.limit, fixture.speed, terminal.data7],
        callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[67]).toMatchObject({
      battler0: {
        flags: 4097, x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        data: [0, 0, fixture.speciesId, 0, fixture.amplitude, fixture.limit, fixture.speed, terminal.data7],
        callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(backHorizontalRepeatedSpringWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalRepeatedSpringWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
