import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backShakeGlowRedFrameAtTick,
  backShakeGlowRedTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import ponytaScenario from "../../tools/compare/fixtures/sendout-back-ponyta-fast-shake-glow-red.json" with { type: "json" };
import ponytaRunA from "../../tools/compare/fixtures/sendout-back-ponyta-fast-shake-glow-red-run-a.json" with { type: "json" };
import ponytaRunB from "../../tools/compare/fixtures/sendout-back-ponyta-fast-shake-glow-red-run-b.json" with { type: "json" };
import slugmaScenario from "../../tools/compare/fixtures/sendout-back-slugma-normal-shake-glow-red.json" with { type: "json" };
import slugmaRunA from "../../tools/compare/fixtures/sendout-back-slugma-normal-shake-glow-red-run-a.json" with { type: "json" };
import slugmaRunB from "../../tools/compare/fixtures/sendout-back-slugma-normal-shake-glow-red-run-b.json" with { type: "json" };
import magcargoScenario from "../../tools/compare/fixtures/sendout-back-magcargo-slow-shake-glow-red.json" with { type: "json" };
import magcargoRunA from "../../tools/compare/fixtures/sendout-back-magcargo-slow-shake-glow-red-run-a.json" with { type: "json" };
import magcargoRunB from "../../tools/compare/fixtures/sendout-back-magcargo-slow-shake-glow-red-run-b.json" with { type: "json" };

type Palette = {
  readonly paletteNum: number;
  readonly base: number;
  readonly unfaded: readonly number[];
  readonly faded: readonly number[];
  readonly hardware: readonly number[];
};
type Sprite = {
  readonly slot: number;
  readonly flags: number;
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly callbackSymbol: string;
  readonly oam: {
    readonly affineMode: number;
    readonly matrix: readonly number[];
    readonly raw: string;
  };
  readonly objPalette: Palette;
};
type Task = {
  readonly callbackSymbol: string;
  readonly data: readonly number[];
  readonly raw: string;
};
type Run = {
  readonly schema: string;
  readonly profile: string;
  readonly species: number;
  readonly natureId: number;
  readonly natureMod: number;
  readonly sourceRecordIndex: number;
  readonly sourceBackAnimSet: string;
  readonly sourceBackAnimSetIndex: number;
  readonly sourceSelector: string;
  readonly sourceInitializer: string;
  readonly sourceId: number;
  readonly sourcePeriod: number;
  readonly sourcePasses: number;
  readonly sourceMovementThreshold: number;
  readonly sourceColorSelector: string;
  readonly sourcePhases: readonly string[];
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly {
    readonly frame: number;
    readonly sha256: string;
    readonly battler0: Sprite;
    readonly monAnimationTask: Task | null;
  }[];
};
type Scenario = typeof ponytaScenario;
type Case = {
  readonly label: string;
  readonly speciesName: "PONYTA" | "SLUGMA" | "MAGCARGO";
  readonly speciesId: 77 | 218 | 219;
  readonly natureId: 0 | 22 | 21;
  readonly natureMod: 0 | 1 | 2;
  readonly recordIndex: 191 | 30 | 194;
  readonly selector: string;
  readonly initializer: string;
  readonly sourceId: 142 | 143 | 144;
  readonly period: 10 | 20 | 80;
  readonly passes: 2 | 1;
  readonly threshold: 54 | 24;
  readonly startFrame: 1838 | 1840;
  readonly y: 88 | 89;
  readonly rawBytes: number;
  readonly rawSha: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const FIXTURES = "../../tools/compare/fixtures/";
const CASES: readonly Case[] = [
  {
    label: "ponyta-fast-shake-glow-red",
    speciesName: "PONYTA",
    speciesId: 77,
    natureId: 0,
    natureMod: 0,
    recordIndex: 191,
    selector: "ANIM_SHAKE_GLOW_RED_FAST",
    initializer: "Anim_ShakeGlowRed_Fast",
    sourceId: 142,
    period: 10,
    passes: 2,
    threshold: 54,
    startFrame: 1838,
    y: 89,
    rawBytes: 129634,
    rawSha: "5cec6564e1dccb9cda0a539647abbeb7b26e9d9138e3aa5d9e35fe365635dafa",
    scenario: ponytaScenario,
    runA: ponytaRunA as Run,
    runB: ponytaRunB as Run,
  },
  {
    label: "slugma-normal-shake-glow-red",
    speciesName: "SLUGMA",
    speciesId: 218,
    natureId: 22,
    natureMod: 1,
    recordIndex: 30,
    selector: "ANIM_SHAKE_GLOW_RED",
    initializer: "Anim_ShakeGlowRed",
    sourceId: 143,
    period: 20,
    passes: 1,
    threshold: 54,
    startFrame: 1838,
    y: 88,
    rawBytes: 129882,
    rawSha: "cdcca3b12bd03086ee6ddd104cef245d62e6d3e645fb217adbbd42d812bcd295",
    scenario: slugmaScenario as Scenario,
    runA: slugmaRunA as Run,
    runB: slugmaRunB as Run,
  },
  {
    label: "magcargo-slow-shake-glow-red",
    speciesName: "MAGCARGO",
    speciesId: 219,
    natureId: 21,
    natureMod: 2,
    recordIndex: 194,
    selector: "ANIM_SHAKE_GLOW_RED_SLOW",
    initializer: "Anim_ShakeGlowRed_Slow",
    sourceId: 144,
    period: 80,
    passes: 1,
    threshold: 24,
    startFrame: 1840,
    y: 89,
    rawBytes: 130055,
    rawSha: "0fbfc262f9ccbec3e9736d26e2e768a609c2e5519a88cad84aedf310b2d5e9b4",
    scenario: magcargoScenario as Scenario,
    runA: magcargoRunA as Run,
    runB: magcargoRunB as Run,
  },
];

function blendChannel(
  source: number,
  target: number,
  coefficient: number,
): number {
  return source + (((target - source) * coefficient) >> 4);
}

function blendRed(unfaded: readonly number[], coefficient: number): number[] {
  return unfaded.map((color) => {
    const red = blendChannel(color & 0x1f, 31, coefficient);
    const green = blendChannel((color >> 5) & 0x1f, 0, coefficient);
    const blue = blendChannel((color >> 10) & 0x1f, 0, coefficient);
    return red | (green << 5) | (blue << 10);
  });
}

function assertCompleteParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab",
    profile: "battle-scene-on",
    level: 50,
    preCheckpointCaptureAllFrames: true,
  });
  for (const side of [
    scenario.overrides.parties.player,
    scenario.overrides.parties.opponent,
  ]) {
    expect(side).toHaveLength(3);
    expect(new Set(side.map(({ species }) => species)).size).toBe(3);
    for (const mon of side) {
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toEqual([0, 0, 0, 0]);
      expect(Object.keys(mon.ivs)).toEqual([
        "hp",
        "attack",
        "defense",
        "speed",
        "spAttack",
        "spDefense",
      ]);
      expect(Object.keys(mon.evs)).toEqual([
        "hp",
        "attack",
        "defense",
        "speed",
        "spAttack",
        "spDefense",
      ]);
      expect(
        Object.values(mon.evs).reduce((sum, value) => sum + value, 0),
      ).toBeLessThanOrEqual(510);
    }
  }
}

describe("BACK_ANIM_SHAKE_GLOW_RED Scene-ON evidence", () => {
  it("uses the three requested real Factory record selectors", () => {
    expect(frontierMons.entries[191]).toMatchObject({
      label: "FRONTIER_MON_PONYTA_1",
      species: "SPECIES_PONYTA",
      nature: "NATURE_HARDY",
    });
    expect(frontierMons.entries[30]).toMatchObject({
      label: "FRONTIER_MON_SLUGMA",
      species: "SPECIES_SLUGMA",
      nature: "NATURE_SASSY",
    });
    expect(frontierMons.entries[194]).toMatchObject({
      label: "FRONTIER_MON_MAGCARGO_1",
      species: "SPECIES_MAGCARGO",
      nature: "NATURE_GENTLE",
    });
    for (const fixture of CASES) {
      assertCompleteParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId,
        nature: fixture.natureId,
      });
      expect(
        selectBackSendOutAnimation(fixture.speciesName, fixture.natureId),
      ).toMatchObject({
        backAnimSetIndex: 22,
        natureMod: fixture.natureMod,
        selector: fixture.selector,
      });
    }
  });

  it.each(CASES)(
    "pins every framebuffer, sprite/OAM/task, and palette frame in paired $label receipts",
    (fixture) => {
      const rawA = readFileSync(
        new URL(
          `${FIXTURES}sendout-back-${fixture.label}-run-a.json`,
          import.meta.url,
        ),
      );
      const rawB = readFileSync(
        new URL(
          `${FIXTURES}sendout-back-${fixture.label}-run-b.json`,
          import.meta.url,
        ),
      );
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(fixture.rawBytes);
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(
        fixture.rawSha,
      );
      expect(fixture.runA).toEqual(fixture.runB);
      expect(fixture.runA).toMatchObject({
        schema: "back-shake-glow-red-scene-on-dense/v1",
        profile: "battle-scene-on",
        species: fixture.speciesId,
        natureId: fixture.natureId,
        natureMod: fixture.natureMod,
        sourceRecordIndex: fixture.recordIndex,
        sourceBackAnimSet: "BACK_ANIM_SHAKE_GLOW_RED",
        sourceBackAnimSetIndex: 22,
        sourceSelector: fixture.selector,
        sourceInitializer: fixture.initializer,
        sourceId: fixture.sourceId,
        sourcePeriod: fixture.period,
        sourcePasses: fixture.passes,
        sourceMovementThreshold: fixture.threshold,
        sourceColorSelector: "SHAKEGLOW_RED",
        sourcePhases: ["ShakeGlow_Blend", "ShakeGlow_Move", "WaitAnimEnd"],
        sourceWindow: {
          startFrame: fixture.startFrame,
          endFrame: fixture.startFrame + 130,
          frameCount: 131,
        },
      });
      expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual(
        [fixture.initializer, "WaitAnimEnd", "SpriteCallbackDummy"].sort(),
      );
      const frames = fixture.runA.frames;
      expect(frames).toHaveLength(131);
      expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(
        true,
      );
      expect(frames[0]).toMatchObject({
        battler0: {
          slot: 6,
          x: 72,
          y: fixture.y,
          x2: 0,
          data: [0, 1, 0, 0, 0, 0, 0, 0],
          callbackSymbol: fixture.initializer,
          oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
        },
      });

      const original = frames[0]!.battler0.objPalette.unfaded;
      let coefficient = 0;
      for (let tick = 0; tick <= 128; tick += 1) {
        const model = backShakeGlowRedFrameAtTick(
          fixture.speciesName,
          fixture.natureId,
          tick,
        )!;
        const row = frames[tick + 1]!;
        if (model.blendCoefficient !== null)
          coefficient = model.blendCoefficient;
        expect(row.battler0).toMatchObject({
          slot: 6,
          flags: 12289,
          visible: true,
          x: 72,
          y: fixture.y,
          x2: model.x2,
          y2: 0,
          data: [
            model.data0,
            model.data1,
            model.data2,
            model.data3,
            model.data4,
            model.data5,
            model.data6,
            model.data7,
          ],
          callbackSymbol: model.callback,
          oam: {
            affineMode: 1,
            matrix: [256, 0, 0, 256],
            raw: expect.stringMatching(/^[0-9a-f]{16}$/),
          },
          objPalette: { paletteNum: 0, base: 256, unfaded: original },
        });
        // The generic send-out materialization task owns the first 24 callback
        // outputs. Once it releases the OBJ palette, every remaining rising,
        // peak, falling, and restore coefficient is the direct BlendPalette
        // result of ShakeGlow_Blend; the receipt still retains the obscured
        // early faded/hardware rows byte-for-byte.
        if (tick >= 24) {
          expect(row.battler0.objPalette.faded).toEqual(
            blendRed(original, coefficient),
          );
        }
        expect(row.battler0.objPalette.hardware).toEqual(
          frames[tick]!.battler0.objPalette.faded,
        );
        expect(row.monAnimationTask).toMatchObject({
          callbackSymbol: "Task_HandleMonAnimation",
          data: [
            1,
            expect.any(Number),
            expect.any(Number),
            fixture.sourceId,
            0,
            fixture.speciesId,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
          ],
          raw: expect.stringMatching(/^[0-9a-f]{80}$/),
        });
      }
      expect(frames.at(-1)).toMatchObject({
        battler0: {
          x2: 0,
          data: backShakeGlowRedTerminalSpriteData(
            fixture.speciesName,
            fixture.natureId,
            0,
            fixture.speciesId,
          ),
          callbackSymbol: "SpriteCallbackDummy",
          objPalette: {
            unfaded: original,
            faded: original,
            hardware: original,
          },
        },
        monAnimationTask: null,
      });
    },
  );
});
