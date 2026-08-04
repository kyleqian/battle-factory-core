import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backShakeGlowBlueFrameAtTick,
  backShakeGlowBlueTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import fastScenario from "../../tools/compare/fixtures/sendout-back-swampert-fast-shake-glow-blue.json" with { type: "json" };
import fastRunA from "../../tools/compare/fixtures/sendout-back-swampert-fast-shake-glow-blue-run-a.json" with { type: "json" };
import fastRunB from "../../tools/compare/fixtures/sendout-back-swampert-fast-shake-glow-blue-run-b.json" with { type: "json" };
import normalScenario from "../../tools/compare/fixtures/sendout-back-wailmer-normal-shake-glow-blue.json" with { type: "json" };
import normalRunA from "../../tools/compare/fixtures/sendout-back-wailmer-normal-shake-glow-blue-run-a.json" with { type: "json" };
import normalRunB from "../../tools/compare/fixtures/sendout-back-wailmer-normal-shake-glow-blue-run-b.json" with { type: "json" };
import slowScenario from "../../tools/compare/fixtures/sendout-back-starmie-slow-shake-glow-blue.json" with { type: "json" };
import slowRunA from "../../tools/compare/fixtures/sendout-back-starmie-slow-shake-glow-blue-run-a.json" with { type: "json" };
import slowRunB from "../../tools/compare/fixtures/sendout-back-starmie-slow-shake-glow-blue-run-b.json" with { type: "json" };

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
  readonly selectorEvidence: string;
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
  readonly paletteContract: string;
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
type Scenario = typeof normalScenario;
type Case = {
  readonly label: string;
  readonly speciesName: "SWAMPERT" | "WAILMER" | "STARMIE";
  readonly speciesId: 285 | 313 | 121;
  readonly recordIndex: 458 | 170 | 439;
  readonly y: 85 | 101 | 94;
  readonly startFrame: 1840 | 1839;
  readonly natureId: 3 | 6 | 15;
  readonly natureMod: 0 | 1 | 2;
  readonly selector: string;
  readonly initializer: string;
  readonly sourceId: 148 | 149 | 150;
  readonly period: 10 | 20 | 80;
  readonly passes: 2 | 1;
  readonly threshold: 54 | 24;
  readonly rawBytes: number;
  readonly rawSha: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const FIXTURES = "../../tools/compare/fixtures/";
const CASES: readonly Case[] = [
  {
    label: "swampert-fast-shake-glow-blue",
    speciesName: "SWAMPERT", speciesId: 285, recordIndex: 458, y: 85,
    startFrame: 1840, natureId: 3,
    natureMod: 0,
    selector: "ANIM_SHAKE_GLOW_BLUE_FAST",
    initializer: "Anim_ShakeGlowBlue_Fast",
    sourceId: 148,
    period: 10,
    passes: 2,
    threshold: 54,
    rawBytes: 134294,
    rawSha: "4f5ff4465b1a6ec30a1d61e9467ce47d29307a5aca14eb5a4139e56fa98b615e",
    scenario: fastScenario as Scenario,
    runA: fastRunA as Run,
    runB: fastRunB as Run,
  },
  {
    label: "wailmer-normal-shake-glow-blue",
    speciesName: "WAILMER", speciesId: 313, recordIndex: 170, y: 101,
    startFrame: 1839,
    natureId: 6,
    natureMod: 1,
    selector: "ANIM_SHAKE_GLOW_BLUE",
    initializer: "Anim_ShakeGlowBlue",
    sourceId: 149,
    period: 20,
    passes: 1,
    threshold: 54,
    rawBytes: 133489,
    rawSha: "cf50bd129485c7973a8ed2899c47a031ab8151d04a3952b7fabf2f423563c6a1",
    scenario: normalScenario,
    runA: normalRunA as Run,
    runB: normalRunB as Run,
  },
  {
    label: "starmie-slow-shake-glow-blue",
    speciesName: "STARMIE", speciesId: 121, recordIndex: 439, y: 94,
    startFrame: 1839, natureId: 15,
    natureMod: 2,
    selector: "ANIM_SHAKE_GLOW_BLUE_SLOW",
    initializer: "Anim_ShakeGlowBlue_Slow",
    sourceId: 150,
    period: 80,
    passes: 1,
    threshold: 24,
    rawBytes: 133425,
    rawSha: "34dbd9c657faaf5417ec6eb1849b84e1e41b920e17d1220448c668319e36dfe4",
    scenario: slowScenario as Scenario,
    runA: slowRunA as Run,
    runB: slowRunB as Run,
  },
];

function blendChannel(source: number, target: number, coefficient: number): number {
  return source + (((target - source) * coefficient) >> 4);
}

function blendPalette(
  unfaded: readonly number[],
  coefficient: number,
  color: "RGB_BLUE" | "RGB_RED",
): number[] {
  const target = color === "RGB_BLUE" ? [0, 0, 31] : [31, 0, 0];
  return unfaded.map((value) => {
    const red = blendChannel(value & 0x1f, target[0]!, coefficient);
    const green = blendChannel((value >> 5) & 0x1f, target[1]!, coefficient);
    const blue = blendChannel((value >> 10) & 0x1f, target[2]!, coefficient);
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
        "hp", "attack", "defense", "speed", "spAttack", "spDefense",
      ]);
      expect(Object.keys(mon.evs)).toEqual([
        "hp", "attack", "defense", "speed", "spAttack", "spDefense",
      ]);
      expect(Object.values(mon.evs).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
    }
  }
}

describe("BACK_ANIM_SHAKE_GLOW_BLUE Scene-ON evidence", () => {
  it("uses the three named real Factory records with Emerald internal species IDs", () => {
    expect(frontierMons.entries[458]).toMatchObject({
      label: "FRONTIER_MON_SWAMPERT_1", species: "SPECIES_SWAMPERT",
      moves: ["MOVE_EARTHQUAKE", "MOVE_COUNTER", "MOVE_REST", "MOVE_CURSE"],
      itemName: "BATTLE_FRONTIER_ITEM_LUM_BERRY", nature: "NATURE_ADAMANT",
    });
    expect(frontierMons.entries[170]).toMatchObject({
      label: "FRONTIER_MON_WAILMER_1", species: "SPECIES_WAILMER",
      moves: ["MOVE_WHIRLPOOL", "MOVE_ROAR", "MOVE_DEFENSE_CURL", "MOVE_ROLLOUT"],
      itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE", nature: "NATURE_DOCILE",
    });
    expect(frontierMons.entries[439]).toMatchObject({
      label: "FRONTIER_MON_STARMIE_1", species: "SPECIES_STARMIE",
      moves: ["MOVE_PSYCHIC", "MOVE_CONFUSE_RAY", "MOVE_THUNDER_WAVE", "MOVE_RECOVER"],
      itemName: "BATTLE_FRONTIER_ITEM_SHELL_BELL", nature: "NATURE_MODEST",
    });
    for (const fixture of CASES) {
      assertCompleteParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId,
        level: 50,
        nature: fixture.natureId,
        ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
        ppUps: [0, 0, 0, 0],
        abilitySlot: 0,
        friendship: 70,
        shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 24,
        natureMod: fixture.natureMod,
        selector: fixture.selector,
      });
      expect(fixture.runA.selectorEvidence).toContain(`Factory record index ${fixture.recordIndex}`);
    }
  });

  it.each(CASES)(
    "pins every framebuffer, player RAM/OAM/task, and unfaded/faded/hardware palette frame in paired $label receipts",
    (fixture) => {
      const rawA = readFileSync(
        new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url),
      );
      const rawB = readFileSync(
        new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url),
      );
      expect(rawA.equals(rawB)).toBe(true);
      expect(rawA).toHaveLength(fixture.rawBytes);
      expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha);
      expect(fixture.runA).toEqual(fixture.runB);
      expect(fixture.runA).toMatchObject({
        schema: "back-shake-glow-blue-scene-on-dense/v1",
        profile: "battle-scene-on",
        species: fixture.speciesId,
        natureId: fixture.natureId,
        natureMod: fixture.natureMod,
        sourceRecordIndex: fixture.recordIndex,
        sourceBackAnimSet: "BACK_ANIM_SHAKE_GLOW_BLUE",
        sourceBackAnimSetIndex: 24,
        sourceSelector: fixture.selector,
        sourceInitializer: fixture.initializer,
        sourceId: fixture.sourceId,
        sourcePeriod: fixture.period,
        sourcePasses: fixture.passes,
        sourceMovementThreshold: fixture.threshold,
        sourceColorSelector: "SHAKEGLOW_BLUE",
        sourcePhases: ["ShakeGlow_Blend", "ShakeGlow_Move", "WaitAnimEnd"],
        paletteContract: "OBJ_PLTT_ID(oam.paletteNum), even-tick Sin(data[2],12), RGB_BLUE; RGB_RED coefficient-zero restore",
        sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + 130, frameCount: 131 },
      });
      expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual(
        [fixture.initializer, "WaitAnimEnd", "SpriteCallbackDummy"].sort(),
      );
      const frames = fixture.runA.frames;
      expect(frames).toHaveLength(131);
      expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
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
      let blendColor: "RGB_BLUE" | "RGB_RED" = "RGB_BLUE";
      for (let tick = 0; tick <= 128; tick += 1) {
        const model = backShakeGlowBlueFrameAtTick(fixture.speciesName, fixture.natureId, tick)!;
        const row = frames[tick + 1]!;
        if (model.blendCoefficient !== null) {
          coefficient = model.blendCoefficient;
          blendColor = model.blendColor!;
        }
        expect(row.battler0).toMatchObject({
          slot: 6,
          flags: 12289,
          visible: true,
          x: 72,
          y: fixture.y,
          x2: model.x2,
          y2: 0,
          data: [
            model.data0, model.data1, model.data2, model.data3,
            model.data4, model.data5, model.data6, model.data7,
          ],
          callbackSymbol: model.callback,
          oam: {
            affineMode: 1,
            matrix: [256, 0, 0, 256],
            raw: expect.stringMatching(/^[0-9a-f]{16}$/),
          },
          objPalette: { paletteNum: 0, base: 256, unfaded: original },
        });
        // The materialization task owns the first 24 callback outputs. Once
        // it releases OBJ palette zero, every blue rise/fall and the shared
        // RGB_RED coefficient-zero restore is direct ShakeGlow_Blend output.
        if (tick >= 24) {
          expect(row.battler0.objPalette.faded).toEqual(
            blendPalette(original, coefficient, blendColor),
          );
        }
        expect(row.battler0.objPalette.hardware).toEqual(
          frames[tick]!.battler0.objPalette.faded,
        );
        expect(row.monAnimationTask).toMatchObject({
          callbackSymbol: "Task_HandleMonAnimation",
          data: [
            1, expect.any(Number), expect.any(Number), fixture.sourceId, 0, fixture.speciesId,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ],
          raw: expect.stringMatching(/^[0-9a-f]{80}$/),
        });
      }
      expect(frames.at(-1)).toMatchObject({
        battler0: {
          x2: 0,
          data: backShakeGlowBlueTerminalSpriteData(
            fixture.speciesName, fixture.natureId, 0, fixture.speciesId,
          ),
          callbackSymbol: "SpriteCallbackDummy",
          objPalette: { unfaded: original, faded: original, hardware: original },
        },
        monAnimationTask: null,
      });
    },
  );
});
