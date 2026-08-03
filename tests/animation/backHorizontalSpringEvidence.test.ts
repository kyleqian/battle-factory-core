import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backHorizontalSpringFrameAtTick,
  backHorizontalSpringWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import fastScenario from "../../tools/compare/fixtures/sendout-back-surskit-fast.json" with { type: "json" };
import fastRunA from "../../tools/compare/fixtures/sendout-back-surskit-fast-run-a.json" with { type: "json" };
import fastRunB from "../../tools/compare/fixtures/sendout-back-surskit-fast-run-b.json" with { type: "json" };
import normalScenario from "../../tools/compare/fixtures/sendout-back-surskit-normal.json" with { type: "json" };
import normalRunA from "../../tools/compare/fixtures/sendout-back-surskit-normal-run-a.json" with { type: "json" };
import normalRunB from "../../tools/compare/fixtures/sendout-back-surskit-normal-run-b.json" with { type: "json" };
import slowScenario from "../../tools/compare/fixtures/sendout-back-feebas-slow.json" with { type: "json" };
import slowRunA from "../../tools/compare/fixtures/sendout-back-feebas-slow-run-a.json" with { type: "json" };
import slowRunB from "../../tools/compare/fixtures/sendout-back-feebas-slow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Scenario = typeof fastScenario;
type Run = {
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
  readonly label: "surskit-fast" | "surskit-normal" | "feebas-slow";
  readonly speciesName: "SURSKIT" | "FEEBAS";
  readonly speciesId: 311 | 328;
  readonly natureId: 0 | 7 | 1;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 42 | 7 | null;
  readonly selector: "ANIM_H_SPRING_FAST" | "ANIM_H_SPRING" | "ANIM_H_SPRING_SLOW";
  readonly initializer: "Anim_HorizontalSpring_Fast" | "Anim_HorizontalSpring" | "Anim_HorizontalSpring_Slow";
  readonly sourceId: 109 | 62 | 110;
  readonly speed: 8 | 4;
  readonly limit: 512 | 256;
  readonly amplitude: 16 | 8;
  readonly startFrame: 1838 | 1839;
  readonly rawBytes: 31872 | 31422 | 31862;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "surskit-fast", speciesName: "SURSKIT", speciesId: 311, natureId: 0, natureMod: 0,
    sourceIndex: null, selector: "ANIM_H_SPRING_FAST", initializer: "Anim_HorizontalSpring_Fast",
    sourceId: 109, speed: 8, limit: 512, amplitude: 16, startFrame: 1839,
    rawBytes: 31872,
    rawSha256: "7f97f6722c47b6454b4067e57462aaa42dc404f6e11d5d6ea5f2ff7ad9920c40",
    scenario: fastScenario, runA: fastRunA as Run, runB: fastRunB as Run,
  },
  {
    label: "surskit-normal", speciesName: "SURSKIT", speciesId: 311, natureId: 7, natureMod: 1,
    sourceIndex: 42, selector: "ANIM_H_SPRING", initializer: "Anim_HorizontalSpring",
    sourceId: 62, speed: 8, limit: 512, amplitude: 8, startFrame: 1839,
    rawBytes: 31422,
    rawSha256: "42d5f4d5c54f9958d23560de7bc54a69f03d9e3559f26aa70325311e212669ec",
    scenario: normalScenario, runA: normalRunA as Run, runB: normalRunB as Run,
  },
  {
    label: "feebas-slow", speciesName: "FEEBAS", speciesId: 328, natureId: 1, natureMod: 2,
    sourceIndex: 7, selector: "ANIM_H_SPRING_SLOW", initializer: "Anim_HorizontalSpring_Slow",
    sourceId: 110, speed: 4, limit: 256, amplitude: 16, startFrame: 1838,
    rawBytes: 31862,
    rawSha256: "0ecde341e47881a57393cbacedc5b722d3be4c42bef9e92d0d47d9155badd6ff",
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

describe("BACK_ANIM_H_SPRING Scene-ON evidence", () => {
  it("pins the two real low-index records and labels Hardy fast as staged-only", () => {
    expect(frontierMons.entries.find(({ index }) => index === 42)).toMatchObject({
      index: 42, label: "FRONTIER_MON_SURSKIT", species: "SPECIES_SURSKIT",
      moves: ["MOVE_BUBBLE_BEAM", "MOVE_RAIN_DANCE", "MOVE_SWEET_SCENT", "MOVE_QUICK_ATTACK"],
      itemTableId: 22, itemName: "BATTLE_FRONTIER_ITEM_MYSTIC_WATER",
      evSpread: 17, evSpreadStats: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"],
      nature: "NATURE_RELAXED",
    });
    expect(frontierMons.entries.find(({ index }) => index === 7)).toMatchObject({
      index: 7, label: "FRONTIER_MON_FEEBAS", species: "SPECIES_FEEBAS",
      moves: ["MOVE_FLAIL", "MOVE_MIRROR_COAT", "MOVE_NONE", "MOVE_NONE"],
      itemTableId: 6, itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND",
      evSpread: 3, evSpreadStats: ["F_EV_SPREAD_ATTACK", "F_EV_SPREAD_HP"],
      nature: "NATURE_LONELY",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId,
        ppUps: [0, 0, 0, 0], item: 0, abilitySlot: 0, friendship: 70,
        gender: "male", shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        species: fixture.speciesName, backAnimSetIndex: 2,
        backAnimSet: "BACK_ANIM_H_SPRING", natureMod: fixture.natureMod,
        selector: fixture.selector,
      });
      expect(fixture.sourceIndex).toBe(fixture.label === "surskit-fast" ? null : fixture.label === "surskit-normal" ? 42 : 7);
    }
    expect(CASES[0]!.scenario.overrides.parties.player[0].nature).toBe(0);
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_SURSKIT" || species === "SPECIES_FEEBAS"
    )).every(({ nature }) => nature !== "NATURE_HARDY")).toBe(true);
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
      schema: "back-h-spring-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      sourceBackAnimSet: "BACK_ANIM_H_SPRING", sourceBackAnimSetIndex: 2,
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
      fixture.initializer, "HorizontalSpring", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6, flags: expect.any(Number), x: 72, y2: 0,
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
      const model = backHorizontalSpringFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
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
    const wait = frames[65 + 1]!;
    const terminal = backHorizontalSpringFrameAtTick(fixture.speciesName, fixture.natureId, 65, 1)!;
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
    expect(backHorizontalSpringWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backHorizontalSpringWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
