import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backShakeFlashYellowFrameAtTick,
  backShakeFlashYellowTerminalSpriteData,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import raichuScenario from "../../tools/compare/fixtures/sendout-back-raichu-fast-shake-flash-yellow.json" with { type: "json" };
import raichuRunA from "../../tools/compare/fixtures/sendout-back-raichu-fast-shake-flash-yellow-run-a.json" with { type: "json" };
import raichuRunB from "../../tools/compare/fixtures/sendout-back-raichu-fast-shake-flash-yellow-run-b.json" with { type: "json" };
import pikachuScenario from "../../tools/compare/fixtures/sendout-back-pikachu-normal-shake-flash-yellow.json" with { type: "json" };
import pikachuRunA from "../../tools/compare/fixtures/sendout-back-pikachu-normal-shake-flash-yellow-run-a.json" with { type: "json" };
import pikachuRunB from "../../tools/compare/fixtures/sendout-back-pikachu-normal-shake-flash-yellow-run-b.json" with { type: "json" };
import lanturnScenario from "../../tools/compare/fixtures/sendout-back-lanturn-slow-shake-flash-yellow.json" with { type: "json" };
import lanturnRunA from "../../tools/compare/fixtures/sendout-back-lanturn-slow-shake-flash-yellow-run-a.json" with { type: "json" };
import lanturnRunB from "../../tools/compare/fixtures/sendout-back-lanturn-slow-shake-flash-yellow-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Palette = { readonly paletteNum: number; readonly base: number; readonly unfaded: readonly number[]; readonly faded: readonly number[]; readonly hardware: readonly number[] };
type Sprite = {
  readonly slot: number; readonly flags: number; readonly visible: boolean;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly data: readonly number[]; readonly callbackSymbol: string;
  readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string };
  readonly objPalette: Palette;
};
type Task = { readonly slot: number; readonly callbackSymbol: string; readonly data: readonly number[]; readonly raw: string };
type Run = {
  readonly schema: string; readonly profile: string; readonly species: number; readonly natureId: number;
  readonly natureMod: number; readonly sourceRecordIndex: number; readonly sourceBackAnimSet: string;
  readonly sourceBackAnimSetIndex: number; readonly sourceSelector: string; readonly sourceInitializer: string;
  readonly sourceId: number; readonly sourceTable: string; readonly sourcePhases: readonly string[];
  readonly paletteContract: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite; readonly monAnimationTask: Task | null }[];
};
type Scenario = typeof raichuScenario;
type Case = {
  readonly label: string; readonly speciesName: "RAICHU" | "PIKACHU" | "LANTURN";
  readonly speciesId: 26 | 25 | 171; readonly natureId: 3 | 6 | 17; readonly natureMod: 0 | 1 | 2;
  readonly recordIndex: 487 | 66 | 381; readonly selector: string; readonly initializer: string;
  readonly sourceId: 139 | 140 | 141; readonly table: string; readonly terminalTick: 81 | 56 | 75;
  readonly startFrame: 1838 | 1839; readonly y: 88 | 87; readonly rawBytes: number; readonly rawSha: string;
  readonly sameFrameTransfers: readonly number[]; readonly scenario: Scenario; readonly runA: Run; readonly runB: Run;
};
const CASES: readonly Case[] = [
  { label: "raichu-fast-shake-flash-yellow", speciesName: "RAICHU", speciesId: 26, natureId: 3, natureMod: 0, recordIndex: 487, selector: "ANIM_SHAKE_FLASH_YELLOW_FAST", initializer: "Anim_ShakeFlashYellow_Fast", sourceId: 139, table: "sShakeYellowFlashData_Fast", terminalTick: 81, startFrame: 1838, y: 88, rawBytes: 87343, rawSha: "1cfae5f795ab25c9b9182229f08fb448fba6120bce404de4059eaa327d98e97a", sameFrameTransfers: [1844], scenario: raichuScenario, runA: raichuRunA as Run, runB: raichuRunB as Run },
  { label: "pikachu-normal-shake-flash-yellow", speciesName: "PIKACHU", speciesId: 25, natureId: 6, natureMod: 1, recordIndex: 66, selector: "ANIM_SHAKE_FLASH_YELLOW", initializer: "Anim_ShakeFlashYellow", sourceId: 140, table: "sShakeYellowFlashData_Normal", terminalTick: 56, startFrame: 1839, y: 87, rawBytes: 61508, rawSha: "583fd84fa59aed49dacfdabd291c94774ec058d49d87c3c58d010b2adc39a4cb", sameFrameTransfers: [], scenario: pikachuScenario as Scenario, runA: pikachuRunA as Run, runB: pikachuRunB as Run },
  { label: "lanturn-slow-shake-flash-yellow", speciesName: "LANTURN", speciesId: 171, natureId: 17, natureMod: 2, recordIndex: 381, selector: "ANIM_SHAKE_FLASH_YELLOW_SLOW", initializer: "Anim_ShakeFlashYellow_Slow", sourceId: 141, table: "sShakeYellowFlashData_Slow", terminalTick: 75, startFrame: 1839, y: 88, rawBytes: 82728, rawSha: "5518bbe2a4ad1817190863e43e2ce70b2e9f3e0ae6f5153cbb78ef204d9a314c", sameFrameTransfers: [], scenario: lanturnScenario as Scenario, runA: lanturnRunA as Run, runB: lanturnRunB as Run },
];

function assertLegalScenario(scenario: Scenario): void {
  expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, preCheckpointCaptureAllFrames: true });
  for (const side of [scenario.overrides.parties.player, scenario.overrides.parties.opponent]) {
    expect(side).toHaveLength(3);
    for (const mon of side) {
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toEqual([0, 0, 0, 0]);
      expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
      expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    }
  }
}

describe("BACK_ANIM_SHAKE_FLASH_YELLOW Scene-ON evidence", () => {
  it("uses the three required real Factory records and selectors", () => {
    expect(frontierMons.entries[487]).toMatchObject({ label: "FRONTIER_MON_RAICHU_2", species: "SPECIES_RAICHU", nature: "NATURE_ADAMANT" });
    expect(frontierMons.entries[66]).toMatchObject({ label: "FRONTIER_MON_PIKACHU", species: "SPECIES_PIKACHU", nature: "NATURE_DOCILE" });
    expect(frontierMons.entries[381]).toMatchObject({ label: "FRONTIER_MON_LANTURN_1", species: "SPECIES_LANTURN", nature: "NATURE_QUIET" });
    for (const fixture of CASES) {
      assertLegalScenario(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({ species: fixture.speciesId, nature: fixture.natureId });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 21, natureMod: fixture.natureMod, selector: fixture.selector,
      });
    }
  });

  it.each(CASES)("pins every framebuffer, sprite/OAM/task, and palette frame in paired $label receipts", (fixture) => {
    const rawA = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-a.json`, import.meta.url));
    const rawB = readFileSync(new URL(`${FIXTURES}sendout-back-${fixture.label}-run-b.json`, import.meta.url));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(fixture.rawBytes);
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(fixture.rawSha);
    expect(fixture.runA).toEqual(fixture.runB);
    expect(fixture.runA).toMatchObject({
      schema: "back-shake-flash-yellow-scene-on-dense/v1", profile: "battle-scene-on",
      species: fixture.speciesId, natureId: fixture.natureId, natureMod: fixture.natureMod,
      sourceRecordIndex: fixture.recordIndex, sourceBackAnimSet: "BACK_ANIM_SHAKE_FLASH_YELLOW",
      sourceBackAnimSetIndex: 21, sourceSelector: fixture.selector, sourceInitializer: fixture.initializer,
      sourceId: fixture.sourceId, sourceTable: fixture.table,
      sourcePhases: ["SetShakeFlashYellowPos", "ShakeFlashYellow", "WaitAnimEnd"],
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.terminalTick + 2, frameCount: fixture.terminalTick + 3 },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([fixture.initializer, "WaitAnimEnd", "SpriteCallbackDummy"].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.terminalTick + 3);
    expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    expect(frames[0]).toMatchObject({ battler0: { slot: 6, x: 72, y: fixture.y, x2: 0, data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer, oam: { affineMode: 1, matrix: [256, 0, 0, 256] } } });
    for (let tick = 0; tick <= fixture.terminalTick; tick += 1) {
      const model = backShakeFlashYellowFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      const row = frames[tick + 1]!;
      expect(row.battler0).toMatchObject({
        slot: 6, flags: 12289, visible: true, x: 72, y: fixture.y, x2: model.x2, y2: 0,
        data: [model.data0, model.data1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: model.callback, oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
        objPalette: { paletteNum: 0, base: 256 },
      });
      expect(row.monAnimationTask).toMatchObject({
        callbackSymbol: "Task_HandleMonAnimation", data: [1, expect.any(Number), expect.any(Number), fixture.sourceId, 0, fixture.speciesId, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], raw: expect.stringMatching(/^[0-9a-f]{80}$/),
      });
    }
    expect(frames.at(-1)).toMatchObject({ battler0: { x2: 0, data: backShakeFlashYellowTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId), callbackSymbol: "SpriteCallbackDummy" }, monAnimationTask: null });
  });

  it.each(CASES)("pins $label OBJ palette restoration and transfer timing", (fixture) => {
    const frames = fixture.runA.frames;
    const original = frames[0]!.battler0.objPalette.unfaded;
    expect(frames.every(({ battler0 }) => battler0.objPalette.unfaded.every((color, index) => color === original[index]))).toBe(true);
    expect(frames.at(-1)!.battler0.objPalette.faded).toEqual(original);
    expect(frames.at(-1)!.battler0.objPalette.hardware).toEqual(original);
    const sameFrameTransfers: number[] = [];
    for (let index = 1; index < frames.length; index += 1) {
      const current = frames[index]!.battler0.objPalette;
      const previous = frames[index - 1]!.battler0.objPalette;
      if (current.hardware.every((color, colorIndex) => color === previous.faded[colorIndex])) continue;
      expect(current.hardware).toEqual(current.faded);
      sameFrameTransfers.push(frames[index]!.frame);
    }
    expect(sameFrameTransfers).toEqual(fixture.sameFrameTransfers);
  });
});
