import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backHorizontalVibrateFrameAtTick,
  backSendOutTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import fastestScenario from "../../tools/compare/fixtures/sendout-back-beedrill-fastest.json" with { type: "json" };
import fastestRunA from "../../tools/compare/fixtures/sendout-back-beedrill-fastest-run-a.json" with { type: "json" };
import fastestRunB from "../../tools/compare/fixtures/sendout-back-beedrill-fastest-run-b.json" with { type: "json" };
import fastScenario from "../../tools/compare/fixtures/sendout-back-beedrill-fast.json" with { type: "json" };
import fastRunA from "../../tools/compare/fixtures/sendout-back-beedrill-fast-run-a.json" with { type: "json" };
import fastRunB from "../../tools/compare/fixtures/sendout-back-beedrill-fast-run-b.json" with { type: "json" };
import normalScenario from "../../tools/compare/fixtures/sendout-back-beedrill-normal.json" with { type: "json" };
import normalRunA from "../../tools/compare/fixtures/sendout-back-beedrill-normal-run-a.json" with { type: "json" };
import normalRunB from "../../tools/compare/fixtures/sendout-back-beedrill-normal-run-b.json" with { type: "json" };
import gastlyScenario from "../../tools/compare/fixtures/sendout-back-gastly-normal.json" with { type: "json" };
import gastlyRunA from "../../tools/compare/fixtures/sendout-back-gastly-normal-run-a.json" with { type: "json" };
import gastlyRunB from "../../tools/compare/fixtures/sendout-back-gastly-normal-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Case = {
  readonly label: "fastest" | "fast" | "normal";
  readonly natureId: 0 | 5 | 1;
  readonly natureMod: 0 | 1 | 2;
  readonly selector: "ANIM_H_VIBRATE_FASTEST" | "ANIM_H_VIBRATE_FAST" | "ANIM_H_VIBRATE";
  readonly callback: "Anim_HorizontalVibrate_Fastest" | "Anim_HorizontalVibrate_Fast" | "Anim_HorizontalVibrate";
  readonly sourceId: 96 | 95 | 2;
  readonly amplitude: 12 | 9 | 6;
  readonly rawBytes: 20737 | 20588 | 20367;
  readonly rawSha256: string;
  readonly scenario: typeof fastestScenario;
  readonly runA: EvidenceRun;
  readonly runB: EvidenceRun;
};

type EvidenceRun = {
  readonly schema: string;
  readonly profile: string;
  readonly species: number;
  readonly natureId: number;
  readonly natureMod: number;
  readonly sourceBackAnimSet: string;
  readonly sourceBackAnimSetIndex: number;
  readonly sourceSelector: string;
  readonly sourceId: number;
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

const CASES: readonly Case[] = [
  {
    label: "fastest", natureId: 0, natureMod: 0,
    selector: "ANIM_H_VIBRATE_FASTEST", callback: "Anim_HorizontalVibrate_Fastest",
    sourceId: 96, amplitude: 12, rawBytes: 20737,
    rawSha256: "3818da227b178358ac3fa0c58fe7cddb500e0bb56d7827de11ba99208bd51bbe",
    scenario: fastestScenario, runA: fastestRunA, runB: fastestRunB,
  },
  {
    label: "fast", natureId: 5, natureMod: 1,
    selector: "ANIM_H_VIBRATE_FAST", callback: "Anim_HorizontalVibrate_Fast",
    sourceId: 95, amplitude: 9, rawBytes: 20588,
    rawSha256: "cc2fcfe92395c4bb9db03179e898046270cbf56a3b11aa33f5068bab98faed74",
    scenario: fastScenario, runA: fastRunA, runB: fastRunB,
  },
  {
    label: "normal", natureId: 1, natureMod: 2,
    selector: "ANIM_H_VIBRATE", callback: "Anim_HorizontalVibrate",
    sourceId: 2, amplitude: 6, rawBytes: 20367,
    rawSha256: "e8b967069b23d04c8f524ed9c799ac22bea67af1b865c6f9ff10ac69c5fd7012",
    scenario: normalScenario, runA: normalRunA, runB: normalRunB,
  },
];

function assertCompleteLegalParty(scenario: typeof fastestScenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab",
    profile: "battle-scene-on",
    level: 50,
    preCheckpointCaptureAllFrames: true,
  });
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

describe("BACK_ANIM_H_VIBRATE Scene-ON evidence", () => {
  it("pins BEEDRILL's legal Factory source record and all three source-selected parties", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_BEEDRILL"))
      .toMatchObject({
        index: 154,
        species: "SPECIES_BEEDRILL",
        moves: ["MOVE_TWINEEDLE", "MOVE_PURSUIT", "MOVE_ENDEAVOR", "MOVE_AGILITY"],
        itemTableId: 34,
        nature: "NATURE_NAUGHTY",
      });

    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: 15,
        level: 50,
        nature: fixture.natureId,
        moves: [41, 228, 283, 97],
        ppUps: [0, 0, 0, 0],
        item: 0,
        abilitySlot: 0,
        friendship: 70,
        gender: "male",
        shiny: false,
      });
      expect(selectBackSendOutAnimation("BEEDRILL", fixture.natureId)).toMatchObject({
        species: "BEEDRILL",
        backAnimSetIndex: 0,
        backAnimSet: "BACK_ANIM_H_VIBRATE",
        natureMod: fixture.natureMod,
        selector: fixture.selector,
      });
    }
  });

  it("pins the distinct Factory GASTLY set 92 source record and Lonely normal route", () => {
    expect(frontierMons.entries.find(({ index }) => index === 92)).toMatchObject({
      index: 92,
      label: "FRONTIER_MON_GASTLY",
      species: "SPECIES_GASTLY",
      moves: ["MOVE_DREAM_EATER", "MOVE_HYPNOSIS", "MOVE_NIGHT_SHADE", "MOVE_CONFUSE_RAY"],
      itemTableId: 54,
      itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE",
      evSpread: 9,
      evSpreadStats: ["F_EV_SPREAD_SPEED", "F_EV_SPREAD_HP"],
      nature: "NATURE_LONELY",
    });
    expect(gastlyScenario).toMatchObject({
      mode: "mechanicLab",
      profile: "battle-scene-on",
      challengeNum: 0,
      battleNum: 0,
      level: 50,
      preCheckpointCaptureAllFrames: true,
      playerSetIds: [154, 135, 188],
    });
    assertCompleteLegalParty(gastlyScenario);
    expect(gastlyScenario.overrides.parties.player[0]).toMatchObject({
      species: 92,
      level: 50,
      nature: 1,
      moves: [138, 95, 101, 109],
      ppUps: [0, 0, 0, 0],
      item: 0,
      abilitySlot: 0,
      friendship: 70,
      gender: "male",
      shiny: false,
    });
    expect(selectBackSendOutAnimation("GASTLY", 1)).toEqual({
      species: "GASTLY",
      natureId: 1,
      nature: "NATURE_LONELY",
      backAnimSetIndex: 0,
      backAnimSet: "BACK_ANIM_H_VIBRATE",
      natureMod: 2,
      selector: "ANIM_H_VIBRATE",
    });
  });

  it("matches the fresh byte-identical Gastly normal active-to-dummy receipt", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-back-gastly-normal-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-back-gastly-normal-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(20367);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("d18ef99788612633f1f9fd1436234dfd5ef399beba66c78f01dd74378d180f09");
    expect(gastlyRunA).toEqual(gastlyRunB);
    expect(gastlyRunA).toMatchObject({
      schema: "back-h-vibrate-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 92,
      natureId: 1,
      natureMod: 2,
      sourceBackAnimSet: "BACK_ANIM_H_VIBRATE",
      sourceBackAnimSetIndex: 0,
      sourceSelector: "ANIM_H_VIBRATE",
      sourceId: 2,
      sourceAmplitude: 6,
      sourceWindow: { startFrame: 1838, endFrame: 1881, frameCount: 44 },
    });

    const frames = gastlyRunA.frames;
    expect(frames).toHaveLength(44);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 44 }, (_, index) => 1838 + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      ...Array(42).fill("Anim_HorizontalVibrate"),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(gastlyRunA.callbackAddresses).sort()).toEqual([
      "Anim_HorizontalVibrate",
      "SpriteCallbackDummy",
      "WaitAnimEnd",
    ].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6,
        flags: 12289,
        x: 72,
        y: 94,
        y2: 0,
        animNum: 0,
        animCmdIndex: 0,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      });
    }
    expect(frames[0]).toMatchObject({
      sha256: "ecca697e506e20b189f013c7be7dbeae1c89ffc6fd8b07a0e965bd1ce889ba33",
      battler0: {
        x2: 0,
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "Anim_HorizontalVibrate",
      },
    });
    for (let tick = 0; tick <= 40; tick += 1) {
      const model = backHorizontalVibrateFrameAtTick("GASTLY", 1, tick, 1)!;
      const row = frames[tick + 1]!.battler0;
      expect(row).toMatchObject({
        x2: model.x2,
        y2: model.y2,
        data: [0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: model.callback,
      });
    }
    const cleanup = backHorizontalVibrateFrameAtTick("GASTLY", 1, 41, 1)!;
    expect(frames[42]).toMatchObject({
      sha256: "14c4641dc4696ca96f5bf12398ea4ada498820ac562ad03c616b240a1288ab33",
      battler0: {
        x2: cleanup.x2,
        y2: cleanup.y2,
        data: [0, 1, cleanup.data2, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
      },
    });
    expect(frames[43]).toMatchObject({
      battler0: {
        x2: 0,
        y2: 0,
        data: backSendOutTerminalSpriteData(0, 92),
        callbackSymbol: "SpriteCallbackDummy",
      },
    });
  });

  it.each(CASES)("pins the fresh byte-identical $label active-to-dummy pair through the shared player-back seam", (fixture) => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-back-beedrill-${fixture.label}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-back-beedrill-${fixture.label}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-h-vibrate-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 15,
      natureId: fixture.natureId,
      natureMod: fixture.natureMod,
      sourceBackAnimSet: "BACK_ANIM_H_VIBRATE",
      sourceBackAnimSetIndex: 0,
      sourceSelector: fixture.selector,
      sourceId: fixture.sourceId,
      sourceAmplitude: fixture.amplitude,
      sourceWindow: { startFrame: 1840, endFrame: 1883, frameCount: 44 },
    });

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(44);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 44 }, (_, index) => 1840 + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      ...Array(42).fill(fixture.callback),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.callback,
      "SpriteCallbackDummy",
      "WaitAnimEnd",
    ].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0.oam).toMatchObject({
        affineMode: 1,
        matrix: [256, 0, 0, 256],
      });
    }

    // Frame 0 is the task-installed callback before its first source update.
    expect(frames[0]).toMatchObject({
      sha256: "c0440adfb0eac7d049ffa5111c44ae59bdbd63afc3d4905240ac94a838a8fe8a",
      battler0: {
        x2: 0, y2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: fixture.callback,
        animNum: 0, animCmdIndex: 0,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (let tick = 0; tick <= 40; tick += 1) {
      const model = backHorizontalVibrateFrameAtTick("BEEDRILL", fixture.natureId, tick, 1)!;
      const row = frames[tick + 1]!.battler0;
      expect(row).toMatchObject({
        x2: model.x2,
        y2: model.y2,
        data: [0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: model.callback,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      });
    }
    const cleanup = backHorizontalVibrateFrameAtTick("BEEDRILL", fixture.natureId, 41, 1)!;
    expect(frames[42]).toMatchObject({
      sha256: "4df41d7702a289e5a3c101c5a32321dc3bbc9af3eb92fb6f1f3abe5f0c1142e1",
      battler0: {
        x2: cleanup.x2,
        y2: cleanup.y2,
        data: [0, 1, cleanup.data2, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[43]).toMatchObject({
      battler0: {
        x2: 0,
        y2: 0,
        data: backSendOutTerminalSpriteData(0, 15),
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
