import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backShrinkGrowFrameAtTick,
  backShrinkGrowWaitAnimEndCallback,
} from "../../src/animation/backSendOutAnim.ts";
import dittoScenario from "../../tools/compare/fixtures/sendout-back-ditto-fast.json" with { type: "json" };
import dittoRunA from "../../tools/compare/fixtures/sendout-back-ditto-fast-run-a.json" with { type: "json" };
import dittoRunB from "../../tools/compare/fixtures/sendout-back-ditto-fast-run-b.json" with { type: "json" };
import octilleryScenario from "../../tools/compare/fixtures/sendout-back-octillery-normal.json" with { type: "json" };
import octilleryRunA from "../../tools/compare/fixtures/sendout-back-octillery-normal-run-a.json" with { type: "json" };
import octilleryRunB from "../../tools/compare/fixtures/sendout-back-octillery-normal-run-b.json" with { type: "json" };
import gligarScenario from "../../tools/compare/fixtures/sendout-back-gligar-slow-staged.json" with { type: "json" };
import gligarRunA from "../../tools/compare/fixtures/sendout-back-gligar-slow-staged-run-a.json" with { type: "json" };
import gligarRunB from "../../tools/compare/fixtures/sendout-back-gligar-slow-staged-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

type Scenario = typeof dittoScenario;
type Sprite = {
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
    readonly raw: string;
  };
};
type Run = {
  readonly schema: string;
  readonly profile: string;
  readonly species: number;
  readonly natureId: number;
  readonly natureMod: number;
  readonly selectorEvidence: string;
  readonly sourceRecordIndex: number | null;
  readonly sourceBackAnimSet: string;
  readonly sourceBackAnimSetIndex: number;
  readonly sourceSelector: string;
  readonly sourceInitializer: string;
  readonly sourceId: number;
  readonly sourceSpeed: number;
  readonly sourcePhaseLimit: number;
  readonly sourceDuration: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[];
};
type Case = {
  readonly label: "ditto-fast" | "octillery-normal" | "gligar-slow-staged";
  readonly speciesName: "DITTO" | "OCTILLERY" | "GLIGAR";
  readonly speciesId: 132 | 224 | 207;
  readonly natureId: 0 | 24 | 15;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 54 | 361 | null;
  readonly selector: "ANIM_SHRINK_GROW_FAST" | "ANIM_SHRINK_GROW" | "ANIM_SHRINK_GROW_SLOW";
  readonly initializer: "Anim_ShrinkGrow_Fast" | "Anim_ShrinkGrow" | "Anim_ShrinkGrow_Slow";
  readonly sourceId: 113 | 19 | 114;
  readonly speed: 8 | 4;
  readonly phaseLimit: 5 | 3;
  readonly duration: 80 | 48 | 96;
  readonly startFrame: 1837 | 1841 | 1838;
  readonly expectedY: 97 | 90 | 85;
  readonly rawBytes: 38542 | 23831 | 45820;
  readonly rawSha256: string;
  readonly selectorEvidence: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  {
    label: "ditto-fast", speciesName: "DITTO", speciesId: 132, natureId: 0, natureMod: 0,
    sourceIndex: 54, selector: "ANIM_SHRINK_GROW_FAST", initializer: "Anim_ShrinkGrow_Fast",
    sourceId: 113, speed: 8, phaseLimit: 5, duration: 80, startFrame: 1837, expectedY: 97,
    rawBytes: 38542,
    rawSha256: "03d766da9a7ddc9c1a2a7c1f258dc001497d160f2dbff22713e30ed816cd4157",
    selectorEvidence: "Factory record index 54 NATURE_HARDY",
    scenario: dittoScenario, runA: dittoRunA as Run, runB: dittoRunB as Run,
  },
  {
    label: "octillery-normal", speciesName: "OCTILLERY", speciesId: 224, natureId: 24, natureMod: 1,
    sourceIndex: 361, selector: "ANIM_SHRINK_GROW", initializer: "Anim_ShrinkGrow",
    sourceId: 19, speed: 8, phaseLimit: 3, duration: 48, startFrame: 1841, expectedY: 90,
    rawBytes: 23831,
    rawSha256: "2f75ee331dd01188bb987713b6bba3ad83f0a3d91f055aa22854bf27c8299718",
    selectorEvidence: "Factory record index 361 NATURE_QUIRKY",
    scenario: octilleryScenario, runA: octilleryRunA as Run, runB: octilleryRunB as Run,
  },
  {
    label: "gligar-slow-staged", speciesName: "GLIGAR", speciesId: 207, natureId: 15, natureMod: 2,
    sourceIndex: null, selector: "ANIM_SHRINK_GROW_SLOW", initializer: "Anim_ShrinkGrow_Slow",
    sourceId: 114, speed: 4, phaseLimit: 3, duration: 96, startFrame: 1838, expectedY: 85,
    rawBytes: 45820,
    rawSha256: "1a1f6caf910d7c5158ac1b2b5ef0b083a292bf92222f60ba12365716560a2580",
    selectorEvidence: "staged legal NATURE_MODEST; no DITTO, GLIGAR, or OCTILLERY Factory record has natureMod 2",
    scenario: gligarScenario, runA: gligarRunA as Run, runB: gligarRunB as Run,
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

describe("BACK_ANIM_SHRINK_GROW Scene-ON evidence", () => {
  it("pins source records and labels the staged-only slow nature", () => {
    expect(frontierMons.entries.find(({ index }) => index === 54)).toMatchObject({
      index: 54, label: "FRONTIER_MON_DITTO", species: "SPECIES_DITTO",
      moves: ["MOVE_TRANSFORM", "MOVE_NONE", "MOVE_NONE", "MOVE_NONE"],
      itemTableId: 59, itemName: "BATTLE_FRONTIER_ITEM_METAL_POWDER",
      evSpread: 9, evSpreadStats: ["F_EV_SPREAD_SPEED", "F_EV_SPREAD_HP"], nature: "NATURE_HARDY",
    });
    expect(frontierMons.entries.find(({ index }) => index === 361)).toMatchObject({
      index: 361, label: "FRONTIER_MON_OCTILLERY_2", species: "SPECIES_OCTILLERY",
      moves: ["MOVE_OCTAZOOKA", "MOVE_FIRE_BLAST", "MOVE_THUNDER_WAVE", "MOVE_MUD_SLAP"],
      itemTableId: 54, itemName: "BATTLE_FRONTIER_ITEM_LAX_INCENSE",
      evSpread: 37, evSpreadStats: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_DEFENSE", "F_EV_SPREAD_HP"], nature: "NATURE_QUIRKY",
    });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId,
        ppUps: [0, 0, 0, 0], friendship: 70, shiny: false,
      });
      expect(fixture.runA).toMatchObject({
        species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
        selectorEvidence: fixture.selectorEvidence, sourceRecordIndex: fixture.sourceIndex,
      });
    }
    expect(dittoScenario.overrides.parties.player[0]).toMatchObject({
      species: 132, nature: 0, moves: [144, 0, 0, 0], item: 223, gender: "genderless",
    });
    expect(octilleryScenario.overrides.parties.player[0]).toMatchObject({
      species: 224, nature: 24, moves: [190, 126, 86, 189], item: 221,
    });
    expect(gligarRunA.sourceRecordIndex).toBeNull();
    expect(gligarRunA.selectorEvidence).toContain("staged legal NATURE_MODEST");
    expect(gligarRunA.selectorEvidence).toContain("no DITTO, GLIGAR, or OCTILLERY Factory record");
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_DITTO" || species === "SPECIES_GLIGAR" || species === "SPECIES_OCTILLERY"
    )).every(({ nature }) => nature !== "NATURE_MODEST")).toBe(true);
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
      schema: "back-shrink-grow-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      selectorEvidence: fixture.selectorEvidence, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_SHRINK_GROW", sourceBackAnimSetIndex: 4,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer,
      sourceId: fixture.sourceId, sourceSpeed: fixture.speed, sourcePhaseLimit: fixture.phaseLimit,
      sourceDuration: fixture.duration,
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.duration + 3, frameCount: fixture.duration + 4 },
    });

    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.duration + 4);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: fixture.duration + 4 }, (_, index) => fixture.startFrame + index),
    );
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([
      ...Array(fixture.duration + 2).fill(fixture.initializer), "WaitAnimEnd", "SpriteCallbackDummy",
    ]);
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "ShrinkGrow", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({
        slot: 6, x: 72, y: fixture.expectedY,
        oam: { affineMode: expect.any(Number), matrix: expect.any(Array), raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
      expect(row.battler0.data).toHaveLength(8);
      expect(row.battler0.oam.matrix).toHaveLength(4);
    }

    expect(frames[0]).toMatchObject({
      battler0: {
        flags: 12289, x2: 0, y2: 0, centerToCornerVecX: -32, centerToCornerVecY: -32,
        data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (let tick = 0; tick <= fixture.duration; tick += 1) {
      const model = backShrinkGrowFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      const row = frames[tick + 1]!.battler0;
      expect(row).toMatchObject({
        flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: model.y2,
        centerToCornerVecX: -64, centerToCornerVecY: -64,
        data: [0, 1, model.data2, 0, model.data4, 0, fixture.speed, fixture.phaseLimit],
        callbackSymbol: fixture.initializer,
        oam: {
          affineMode: 3,
          matrix: [tick === 0 ? 256 : model.xScale, 0, 0, tick === 0 ? 256 : model.yScale],
        },
      });
    }
    const terminal = backShrinkGrowFrameAtTick(fixture.speciesName, fixture.natureId, fixture.duration + 1, 1)!;
    expect(frames[fixture.duration + 2]).toMatchObject({
      battler0: {
        flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
        centerToCornerVecX: -32, centerToCornerVecY: -32,
        data: [0, 1, terminal.data2, 0, terminal.data4, 0, fixture.speed, fixture.phaseLimit],
        callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[fixture.duration + 3]).toMatchObject({
      battler0: {
        flags: 4097, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
        data: [0, 0, fixture.speciesId, 0, terminal.data4, 0, fixture.speed, fixture.phaseLimit],
        callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(backShrinkGrowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backShrinkGrowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
