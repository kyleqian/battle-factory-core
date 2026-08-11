import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backShakeGlowGreenFrameAtTick,
  backShakeGlowGreenTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import fastScenario from "../../tools/compare/fixtures/sendout-back-roselia-fast-shake-glow-green-staged.json" with { type: "json" };
import fastRunA from "../../tools/compare/fixtures/sendout-back-roselia-fast-shake-glow-green-staged-run-a.json" with { type: "json" };
import fastRunB from "../../tools/compare/fixtures/sendout-back-roselia-fast-shake-glow-green-staged-run-b.json" with { type: "json" };
import normalScenario from "../../tools/compare/fixtures/sendout-back-roselia-normal-shake-glow-green.json" with { type: "json" };
import normalRunA from "../../tools/compare/fixtures/sendout-back-roselia-normal-shake-glow-green-run-a.json" with { type: "json" };
import normalRunB from "../../tools/compare/fixtures/sendout-back-roselia-normal-shake-glow-green-run-b.json" with { type: "json" };
import slowScenario from "../../tools/compare/fixtures/sendout-back-roselia-slow-shake-glow-green-staged.json" with { type: "json" };
import slowRunA from "../../tools/compare/fixtures/sendout-back-roselia-slow-shake-glow-green-staged-run-a.json" with { type: "json" };
import slowRunB from "../../tools/compare/fixtures/sendout-back-roselia-slow-shake-glow-green-staged-run-b.json" with { type: "json" };

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
  readonly staged: boolean;
  readonly natureLabel: "Hardy" | "Docile" | "Quiet";
  readonly natureId: 0 | 6 | 17;
  readonly natureMod: 0 | 1 | 2;
  readonly selector: string;
  readonly initializer: string;
  readonly sourceId: 145 | 146 | 147;
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
    label: "roselia-fast-shake-glow-green-staged",
    staged: true,
    natureLabel: "Hardy",
    natureId: 0,
    natureMod: 0,
    selector: "ANIM_SHAKE_GLOW_GREEN_FAST",
    initializer: "Anim_ShakeGlowGreen_Fast",
    sourceId: 145,
    period: 10,
    passes: 2,
    threshold: 54,
    rawBytes: 131618,
    rawSha: "6a1395b23696509bdd09a9e49bc58e80e3219b16de26cb1742d77ef552cb1b2e",
    scenario: fastScenario as Scenario,
    runA: fastRunA as Run,
    runB: fastRunB as Run,
  },
  {
    label: "roselia-normal-shake-glow-green",
    staged: false,
    natureLabel: "Docile",
    natureId: 6,
    natureMod: 1,
    selector: "ANIM_SHAKE_GLOW_GREEN",
    initializer: "Anim_ShakeGlowGreen",
    sourceId: 146,
    period: 20,
    passes: 1,
    threshold: 54,
    rawBytes: 130940,
    rawSha: "38dcc94a15e253c112e84b0b844d5f41bd9ba9ef9e968c797638b458f3d21938",
    scenario: normalScenario,
    runA: normalRunA as Run,
    runB: normalRunB as Run,
  },
  {
    label: "roselia-slow-shake-glow-green-staged",
    staged: true,
    natureLabel: "Quiet",
    natureId: 17,
    natureMod: 2,
    selector: "ANIM_SHAKE_GLOW_GREEN_SLOW",
    initializer: "Anim_ShakeGlowGreen_Slow",
    sourceId: 147,
    period: 80,
    passes: 1,
    threshold: 24,
    rawBytes: 131677,
    rawSha: "76013269c7bb6c31429b41a7ef69dd0cdfd1dfb386043b3edfa391d94b9013fc",
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
  color: "RGB_GREEN" | "RGB_RED",
): number[] {
  const target = color === "RGB_GREEN" ? [0, 31, 0] : [31, 0, 0];
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

describe("BACK_ANIM_SHAKE_GLOW_GREEN Scene-ON evidence", () => {
  it("uses the real Docile Roselia record and transparently stages only its absent modifiers", () => {
    expect(frontierMons.entries[171]).toMatchObject({
      label: "FRONTIER_MON_ROSELIA_1",
      species: "SPECIES_ROSELIA",
      moves: ["MOVE_MAGICAL_LEAF", "MOVE_TOXIC", "MOVE_GRASS_WHISTLE", "MOVE_COTTON_SPORE"],
      itemName: "BATTLE_FRONTIER_ITEM_PECHA_BERRY",
      evSpreadStats: ["F_EV_SPREAD_DEFENSE", "F_EV_SPREAD_HP"],
      nature: "NATURE_DOCILE",
    });
    expect(frontierMons.entries[276]).toMatchObject({
      label: "FRONTIER_MON_ROSELIA_2",
      species: "SPECIES_ROSELIA",
      nature: "NATURE_DOCILE",
    });
    for (const fixture of CASES) {
      assertCompleteParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: 363,
        level: 50,
        nature: fixture.natureId,
        ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
        evs: { hp: 252, attack: 0, defense: 252, speed: 0, spAttack: 0, spDefense: 0 },
        moves: [345, 92, 320, 178],
        ppUps: [0, 0, 0, 0],
        item: 135,
        abilitySlot: 0,
        friendship: 70,
        gender: "female",
        shiny: false,
      });
      expect(selectBackSendOutAnimation("ROSELIA", fixture.natureId)).toMatchObject({
        backAnimSetIndex: 23,
        natureMod: fixture.natureMod,
        selector: fixture.selector,
      });
      expect(fixture.runA.selectorEvidence).toContain("Factory record index 171");
      expect(fixture.runA.selectorEvidence.startsWith("Staged")).toBe(fixture.staged);
    }
    expect(CASES.filter(({ staged }) => !staged)).toHaveLength(1);
    expect(CASES.every(({ label }) => label.includes("roselia"))).toBe(true);
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
        schema: "back-shake-glow-green-scene-on-dense/v1",
        profile: "battle-scene-on",
        species: 363,
        natureId: fixture.natureId,
        natureMod: fixture.natureMod,
        sourceRecordIndex: 171,
        sourceBackAnimSet: "BACK_ANIM_SHAKE_GLOW_GREEN",
        sourceBackAnimSetIndex: 23,
        sourceSelector: fixture.selector,
        sourceInitializer: fixture.initializer,
        sourceId: fixture.sourceId,
        sourcePeriod: fixture.period,
        sourcePasses: fixture.passes,
        sourceMovementThreshold: fixture.threshold,
        sourceColorSelector: "SHAKEGLOW_GREEN",
        sourcePhases: ["ShakeGlow_Blend", "ShakeGlow_Move", "WaitAnimEnd"],
        paletteContract: "OBJ_PLTT_ID(oam.paletteNum), even-tick Sin(data[2],12), RGB_GREEN; RGB_RED coefficient-zero restore",
        sourceWindow: { startFrame: 1839, endFrame: 1969, frameCount: 131 },
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
          y: 88,
          x2: 0,
          data: [0, 1, 0, 0, 0, 0, 0, 0],
          callbackSymbol: fixture.initializer,
          oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
        },
      });

      const original = frames[0]!.battler0.objPalette.unfaded;
      let coefficient = 0;
      let blendColor: "RGB_GREEN" | "RGB_RED" = "RGB_GREEN";
      for (let tick = 0; tick <= 128; tick += 1) {
        const model = backShakeGlowGreenFrameAtTick("ROSELIA", fixture.natureId, tick)!;
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
          y: 88,
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
        // it releases OBJ palette zero, every green rise/fall and the shared
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
            1, expect.any(Number), expect.any(Number), fixture.sourceId, 0, 363,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ],
          raw: expect.stringMatching(/^[0-9a-f]{80}$/),
        });
      }
      expect(frames.at(-1)).toMatchObject({
        battler0: {
          x2: 0,
          data: backShakeGlowGreenTerminalSpriteData(
            "ROSELIA", fixture.natureId, 0, 363,
          ),
          callbackSymbol: "SpriteCallbackDummy",
          objPalette: { unfaded: original, faded: original, hardware: original },
        },
        monAnimationTask: null,
      });
    },
  );
});
