import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backVerticalShakeLowFrameAtTick,
  backVerticalShakeLowWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import geodudeScenario from "../../tools/compare/fixtures/sendout-back-geodude-fast-low.json" with { type: "json" };
import geodudeRunA from "../../tools/compare/fixtures/sendout-back-geodude-fast-low-run-a.json" with { type: "json" };
import geodudeRunB from "../../tools/compare/fixtures/sendout-back-geodude-fast-low-run-b.json" with { type: "json" };
import makuhitaScenario from "../../tools/compare/fixtures/sendout-back-makuhita-normal-low.json" with { type: "json" };
import makuhitaRunA from "../../tools/compare/fixtures/sendout-back-makuhita-normal-low-run-a.json" with { type: "json" };
import makuhitaRunB from "../../tools/compare/fixtures/sendout-back-makuhita-normal-low-run-b.json" with { type: "json" };
import hariyamaScenario from "../../tools/compare/fixtures/sendout-back-hariyama-slow-low.json" with { type: "json" };
import hariyamaRunA from "../../tools/compare/fixtures/sendout-back-hariyama-slow-low-run-a.json" with { type: "json" };
import hariyamaRunB from "../../tools/compare/fixtures/sendout-back-hariyama-slow-low-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof geodudeScenario;
type Sprite = { readonly flags: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly data: readonly number[]; readonly callbackSymbol: string; readonly centerToCornerVecX: number; readonly centerToCornerVecY: number; readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string } };
type Run = { readonly schema: string; readonly profile: string; readonly species: number; readonly natureId: number; readonly natureMod: number; readonly selectorEvidence: string; readonly sourceRecordIndex: number; readonly sourceBackAnimSet: string; readonly sourceBackAnimSetIndex: number; readonly sourceSelector: string; readonly sourceInitializer: string; readonly sourceId: number; readonly sourceStep: number; readonly sourceAmplitude: number; readonly sourcePhaseTable: readonly (readonly number[])[]; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly callbackAddresses: Readonly<Record<string, number>>; readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[] };
type Case = { readonly label: "geodude-fast-low" | "makuhita-normal-low" | "hariyama-slow-low"; readonly speciesName: "GEODUDE" | "MAKUHITA" | "HARIYAMA"; readonly speciesId: 74 | 335 | 336; readonly natureId: 2 | 6 | 17; readonly natureMod: 0 | 1 | 2; readonly sourceIndex: 70 | 22 | 486; readonly selector: "ANIM_V_SHAKE_LOW_TWICE_FAST" | "ANIM_V_SHAKE_LOW_TWICE" | "ANIM_V_SHAKE_LOW_TWICE_SLOW"; readonly initializer: "Anim_VerticalShakeLowTwice_Fast" | "Anim_VerticalShakeLowTwice" | "Anim_VerticalShakeLowTwice_Slow"; readonly sourceId: 99 | 92 | 98; readonly step: 56 | 40 | 24; readonly amplitude: 9 | 6; readonly startFrame: 1839 | 1840; readonly expectedY: 91 | 87; readonly rawBytes: number; readonly rawSha256: string; readonly scenario: Scenario; readonly runA: Run; readonly runB: Run };

const CASES: readonly Case[] = [
  { label: "geodude-fast-low", speciesName: "GEODUDE", speciesId: 74, natureId: 2, natureMod: 0, sourceIndex: 70, selector: "ANIM_V_SHAKE_LOW_TWICE_FAST", initializer: "Anim_VerticalShakeLowTwice_Fast", sourceId: 99, step: 56, amplitude: 9, startFrame: 1839, expectedY: 91, rawBytes: 37607, rawSha256: "c23772a75a41eeb0c9981675bd0223f876cfd091fdf2972f8a7e42189bb82ff1", scenario: geodudeScenario, runA: geodudeRunA as Run, runB: geodudeRunB as Run },
  { label: "makuhita-normal-low", speciesName: "MAKUHITA", speciesId: 335, natureId: 6, natureMod: 1, sourceIndex: 22, selector: "ANIM_V_SHAKE_LOW_TWICE", initializer: "Anim_VerticalShakeLowTwice", sourceId: 92, step: 40, amplitude: 6, startFrame: 1840, expectedY: 91, rawBytes: 37578, rawSha256: "9575423aff3eefc9058624a03ead8f61c7bc01d87ad67bad9d4efd134c666976", scenario: makuhitaScenario, runA: makuhitaRunA as Run, runB: makuhitaRunB as Run },
  { label: "hariyama-slow-low", speciesName: "HARIYAMA", speciesId: 336, natureId: 17, natureMod: 2, sourceIndex: 486, selector: "ANIM_V_SHAKE_LOW_TWICE_SLOW", initializer: "Anim_VerticalShakeLowTwice_Slow", sourceId: 98, step: 24, amplitude: 6, startFrame: 1840, expectedY: 87, rawBytes: 37582, rawSha256: "bf349b8ecfcbf42f1f77a363c86bbc504dbd1fc55dbe12e69ff511e6285fac22", scenario: hariyamaScenario, runA: hariyamaRunA as Run, runB: hariyamaRunB as Run },
];

function assertCompleteLegalParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, preCheckpointCaptureAllFrames: true, playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180] });
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({ level: 50, item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
  }
}

describe("BACK_ANIM_V_SHAKE_LOW Scene-ON evidence", () => {
  it("uses real Factory representatives for all three selector modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 70)).toMatchObject({ index: 70, label: "FRONTIER_MON_GEODUDE", species: "SPECIES_GEODUDE", moves: ["MOVE_MAGNITUDE", "MOVE_ROCK_BLAST", "MOVE_STRENGTH", "MOVE_PROTECT"], itemTableId: 6, itemName: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: "NATURE_BRAVE" });
    expect(frontierMons.entries.find(({ index }) => index === 22)).toMatchObject({ index: 22, label: "FRONTIER_MON_MAKUHITA", species: "SPECIES_MAKUHITA", moves: ["MOVE_FAKE_OUT", "MOVE_SEISMIC_TOSS", "MOVE_DETECT", "MOVE_WHIRLWIND"], itemTableId: 34, itemName: "BATTLE_FRONTIER_ITEM_SCOPE_LENS", nature: "NATURE_DOCILE" });
    expect(frontierMons.entries.find(({ index }) => index === 486)).toMatchObject({ index: 486, label: "FRONTIER_MON_HARIYAMA_2", species: "SPECIES_HARIYAMA", moves: ["MOVE_CROSS_CHOP", "MOVE_FIRE_PUNCH", "MOVE_ICE_PUNCH", "MOVE_THUNDER_PUNCH"], itemTableId: 24, itemName: "BATTLE_FRONTIER_ITEM_QUICK_CLAW", nature: "NATURE_QUIET" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, level: 50, nature: fixture.natureId, friendship: 70, gender: "male", shiny: false });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({ backAnimSetIndex: 13, backAnimSet: "BACK_ANIM_V_SHAKE_LOW", natureMod: fixture.natureMod, selector: fixture.selector });
      expect(fixture.runA).toMatchObject({ sourceRecordIndex: fixture.sourceIndex, selectorEvidence: expect.stringContaining(`index ${fixture.sourceIndex}`) });
    }
  });

  it.each(CASES)("matches every framebuffer/RAM/OAM frame of fresh paired $label receipts", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha256);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({ schema: "back-v-shake-low-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex, sourceBackAnimSet: "BACK_ANIM_V_SHAKE_LOW", sourceBackAnimSetIndex: 13, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId, sourceStep: fixture.step, sourceAmplitude: fixture.amplitude, sourcePhaseTable: [[6, 30], [-2, 15], [6, 30], [-1, 0]], sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + 80, frameCount: 81 } });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "VerticalShakeLowTwice", "WaitAnimEnd", "SpriteCallbackDummy"].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(81);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: 81 }, (_, index) => fixture.startFrame + index));
    expect(frames.map((row) => row.battler0.callbackSymbol)).toEqual([fixture.initializer, ...Array(78).fill("VerticalShakeLowTwice"), "WaitAnimEnd", "SpriteCallbackDummy"]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler0).toMatchObject({ flags: 12289, x: 72, y: fixture.expectedY, x2: expect.any(Number), y2: expect.any(Number), centerToCornerVecX: -32, centerToCornerVecY: -32, oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) } });
      expect(row.battler0.data).toHaveLength(8);
    }
    expect(frames[0]).toMatchObject({ battler0: { x2: 0, y2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer } });
    for (let tick = 0; tick < 78; tick += 1) {
      const model = backVerticalShakeLowFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(frames[tick + 1]!.battler0).toMatchObject({ x2: model.x2, y2: model.y2, data: [model.data0, 1, model.data2, 0, 0, model.data5, model.data6, model.data7], callbackSymbol: "VerticalShakeLowTwice" });
    }
    const terminal = backVerticalShakeLowFrameAtTick(fixture.speciesName, fixture.natureId, 78, 1)!;
    expect(frames[79]).toMatchObject({ battler0: { x2: 0, y2: 0, data: [terminal.data0, 1, terminal.data2, 0, 0, terminal.data5, terminal.data6, terminal.data7], callbackSymbol: "WaitAnimEnd" } });
    expect(frames[80]).toMatchObject({ battler0: { x2: 0, y2: 0, data: [0, 0, fixture.speciesId, 0, 0, 3, 0, fixture.amplitude], callbackSymbol: "SpriteCallbackDummy" } });
    expect(backVerticalShakeLowWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backVerticalShakeLowWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
