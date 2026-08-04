import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import {
  backConvexDoubleArcFrameAtTick,
  backConvexDoubleArcTerminalSpriteData,
  backConvexDoubleArcWaitAnimEndCallback,
  selectBackSendOutAnimation,
} from "../../src/animation/backSendOutAnim.ts";
import castformScenario from "../../tools/compare/fixtures/sendout-back-castform-twice-convex-double.json" with { type: "json" };
import castformRunA from "../../tools/compare/fixtures/sendout-back-castform-twice-convex-double-run-a.json" with { type: "json" };
import castformRunB from "../../tools/compare/fixtures/sendout-back-castform-twice-convex-double-run-b.json" with { type: "json" };
import zubatScenario from "../../tools/compare/fixtures/sendout-back-zubat-normal-convex-double.json" with { type: "json" };
import zubatRunA from "../../tools/compare/fixtures/sendout-back-zubat-normal-convex-double-run-a.json" with { type: "json" };
import zubatRunB from "../../tools/compare/fixtures/sendout-back-zubat-normal-convex-double-run-b.json" with { type: "json" };
import swabluScenario from "../../tools/compare/fixtures/sendout-back-swablu-slow-convex-double.json" with { type: "json" };
import swabluRunA from "../../tools/compare/fixtures/sendout-back-swablu-slow-convex-double-run-a.json" with { type: "json" };
import swabluRunB from "../../tools/compare/fixtures/sendout-back-swablu-slow-convex-double-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
type Scenario = typeof castformScenario;
type Sprite = {
  readonly flags: number;
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly callbackSymbol: string;
  readonly centerToCornerVecX: number;
  readonly centerToCornerVecY: number;
  readonly oam: { readonly affineMode: number; readonly matrix: readonly number[]; readonly raw: string };
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
  readonly sourceStep: number;
  readonly sourceXAmplitude: number;
  readonly sourceTerminalArcCount: number;
  readonly sourceOverflow: string;
  readonly sourceYRegions: readonly string[];
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbackAddresses: Readonly<Record<string, number>>;
  readonly frames: readonly { readonly frame: number; readonly sha256: string; readonly battler0: Sprite }[];
};
type Case = {
  readonly label: "castform-twice-convex-double" | "zubat-normal-convex-double" | "swablu-slow-convex-double";
  readonly speciesName: "CASTFORM" | "ZUBAT" | "SWABLU";
  readonly speciesId: 385 | 41 | 358;
  readonly natureId: 11 | 22 | 1;
  readonly natureMod: 0 | 1 | 2;
  readonly sourceIndex: 204 | 25 | 93;
  readonly selector: "ANIM_CONVEX_DOUBLE_ARC_TWICE" | "ANIM_CONVEX_DOUBLE_ARC" | "ANIM_CONVEX_DOUBLE_ARC_SLOW";
  readonly initializer: "Anim_ConvexDoubleArc_Twice" | "Anim_ConvexDoubleArc" | "Anim_ConvexDoubleArc_Slow";
  readonly sourceId: 126 | 125 | 124;
  readonly step: 8 | 6 | 4;
  readonly terminalArcCount: 3 | 2;
  readonly startFrame: 1840 | 1837 | 1838;
  readonly frameCount: 104 | 90 | 134;
  readonly expectedY: 80 | 91 | 89;
  readonly rawBytes: number;
  readonly rawSha256: string;
  readonly scenario: Scenario;
  readonly runA: Run;
  readonly runB: Run;
};

const CASES: readonly Case[] = [
  { label: "castform-twice-convex-double", speciesName: "CASTFORM", speciesId: 385, natureId: 11, natureMod: 0, sourceIndex: 204, selector: "ANIM_CONVEX_DOUBLE_ARC_TWICE", initializer: "Anim_ConvexDoubleArc_Twice", sourceId: 126, step: 8, terminalArcCount: 3, startFrame: 1840, frameCount: 104, expectedY: 80, rawBytes: 50134, rawSha256: "435fe846a4b8243e09ca4e77e5d2f6478cab46f67cb75429118c6df8ad68fad6", scenario: castformScenario as Scenario, runA: castformRunA as Run, runB: castformRunB as Run },
  { label: "zubat-normal-convex-double", speciesName: "ZUBAT", speciesId: 41, natureId: 22, natureMod: 1, sourceIndex: 25, selector: "ANIM_CONVEX_DOUBLE_ARC", initializer: "Anim_ConvexDoubleArc", sourceId: 125, step: 6, terminalArcCount: 2, startFrame: 1837, frameCount: 90, expectedY: 91, rawBytes: 42919, rawSha256: "75cf303c0cf744231e21f13f48b863ee021c3f70777c5f24606578958cb65fd1", scenario: zubatScenario as Scenario, runA: zubatRunA as Run, runB: zubatRunB as Run },
  { label: "swablu-slow-convex-double", speciesName: "SWABLU", speciesId: 358, natureId: 1, natureMod: 2, sourceIndex: 93, selector: "ANIM_CONVEX_DOUBLE_ARC_SLOW", initializer: "Anim_ConvexDoubleArc_Slow", sourceId: 124, step: 4, terminalArcCount: 2, startFrame: 1838, frameCount: 134, expectedY: 89, rawBytes: 64218, rawSha256: "f1ef314515109075460552612f482b5f0335715db3709a8f45c4cfcb761cd8f6", scenario: swabluScenario as Scenario, runA: swabluRunA as Run, runB: swabluRunB as Run },
];

function assertCompleteLegalParty(scenario: Scenario): void {
  expect(scenario).toMatchObject({
    mode: "mechanicLab", profile: "battle-scene-on", level: 50, preCheckpointCaptureAllFrames: true,
    playerSetIds: [154, 135, 188], opponentSetIds: [156, 149, 180],
  });
  for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
    expect(mon).toMatchObject({ level: 50, item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) });
    expect(Object.keys(mon.ivs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.keys(mon.evs)).toEqual(["hp", "attack", "defense", "speed", "spAttack", "spDefense"]);
    expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
    expect(mon.moves).toHaveLength(4);
    expect(mon.ppUps).toEqual([0, 0, 0, 0]);
  }
}

describe("BACK_ANIM_CONVEX_DOUBLE_ARC Scene-ON evidence", () => {
  it("uses actual source-selected legal Factory records for all three nature modifiers", () => {
    expect(frontierMons.entries.find(({ index }) => index === 204)).toMatchObject({ index: 204, label: "FRONTIER_MON_CASTFORM_1", species: "SPECIES_CASTFORM", moves: ["MOVE_EMBER", "MOVE_WATER_PULSE", "MOVE_SHOCK_WAVE", "MOVE_ICY_WIND"], itemTableId: 60, itemName: "BATTLE_FRONTIER_ITEM_PETAYA_BERRY", nature: "NATURE_HASTY" });
    expect(frontierMons.entries.find(({ index }) => index === 25)).toMatchObject({ index: 25, label: "FRONTIER_MON_ZUBAT", species: "SPECIES_ZUBAT", moves: ["MOVE_POISON_FANG", "MOVE_WHIRLWIND", "MOVE_CONFUSE_RAY", "MOVE_AERIAL_ACE"], itemTableId: 12, itemName: "BATTLE_FRONTIER_ITEM_CHERI_BERRY", nature: "NATURE_SASSY" });
    expect(frontierMons.entries.find(({ index }) => index === 93)).toMatchObject({ index: 93, label: "FRONTIER_MON_SWABLU", species: "SPECIES_SWABLU", moves: ["MOVE_TAKE_DOWN", "MOVE_DREAM_EATER", "MOVE_SING", "MOVE_ATTRACT"], itemTableId: 37, itemName: "BATTLE_FRONTIER_ITEM_MENTAL_HERB", nature: "NATURE_LONELY" });
    // Pinned source correction for the contradictory brief: Hoppip/Lax is
    // normal (mod 1), while Castform/Hasty is twice (mod 0). Swablu/Lonely
    // is the legal record that supplies the missing slow/mod-2 receipt.
    expect(selectBackSendOutAnimation("HOPPIP", 9)).toMatchObject({ natureMod: 1, selector: "ANIM_CONVEX_DOUBLE_ARC" });
    expect(selectBackSendOutAnimation("CASTFORM", 11)).toMatchObject({ natureMod: 0, selector: "ANIM_CONVEX_DOUBLE_ARC_TWICE" });
    for (const fixture of CASES) {
      assertCompleteLegalParty(fixture.scenario);
      expect(fixture.scenario.overrides.parties.player[0]).toMatchObject({
        species: fixture.speciesId, level: 50, nature: fixture.natureId, friendship: 70, shiny: false,
      });
      expect(selectBackSendOutAnimation(fixture.speciesName, fixture.natureId)).toMatchObject({
        backAnimSetIndex: 16, backAnimSet: "BACK_ANIM_CONVEX_DOUBLE_ARC", natureMod: fixture.natureMod, selector: fixture.selector,
      });
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
    expect(fixture.runA).toMatchObject({
      schema: "back-convex-double-arc-scene-on-dense/v1", profile: "battle-scene-on", species: fixture.speciesId,
      natureId: fixture.natureId, natureMod: fixture.natureMod, sourceRecordIndex: fixture.sourceIndex,
      sourceBackAnimSet: "BACK_ANIM_CONVEX_DOUBLE_ARC", sourceBackAnimSetIndex: 16,
      sourceSelector: fixture.selector, sourceInitializer: fixture.initializer, sourceId: fixture.sourceId,
      sourceStep: fixture.step, sourceXAmplitude: 16, sourceTerminalArcCount: fixture.terminalArcCount,
      sourceOverflow: "data[7] > 256", sourceYRegions: ["<=95", "96..159", ">159"],
      sourceWindow: { startFrame: fixture.startFrame, endFrame: fixture.startFrame + fixture.frameCount - 1, frameCount: fixture.frameCount },
    });
    expect(Object.keys(fixture.runA.callbackAddresses).sort()).toEqual([
      fixture.initializer, "ConvexDoubleArc", "WaitAnimEnd", "SpriteCallbackDummy",
    ].sort());
    const frames = fixture.runA.frames;
    expect(frames).toHaveLength(fixture.frameCount);
    expect(frames.map((row) => row.frame)).toEqual(Array.from({ length: fixture.frameCount }, (_, index) => fixture.startFrame + index));
    expect(frames.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256))).toBe(true);
    expect(frames[0]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
      data: [0, 1, 0, 0, 0, 0, 0, 0], callbackSymbol: fixture.initializer,
      centerToCornerVecX: -32, centerToCornerVecY: -32,
      oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
    } });
    const terminalTick = fixture.frameCount - 3;
    for (let tick = 0; tick < terminalTick; tick += 1) {
      const model = backConvexDoubleArcFrameAtTick(fixture.speciesName, fixture.natureId, tick, 1)!;
      expect(model.callback).toBe(fixture.initializer);
      expect(frames[tick + 1]!.battler0).toMatchObject({
        flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: model.x2, y2: model.y2,
        data: [model.data0, 1, model.data2, model.data3, model.data4, model.data5, model.data6, model.data7],
        callbackSymbol: fixture.initializer, centerToCornerVecX: -32, centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256], raw: expect.stringMatching(/^[0-9a-f]{16}$/) },
      });
    }
    const terminal = backConvexDoubleArcFrameAtTick(fixture.speciesName, fixture.natureId, terminalTick, 1)!;
    expect(terminal.callback).toBe("WaitAnimEnd");
    expect(frames[terminalTick + 1]).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: terminal.x2, y2: terminal.y2,
      data: [terminal.data0, 1, terminal.data2, terminal.data3, terminal.data4, terminal.data5, terminal.data6, terminal.data7],
      callbackSymbol: "WaitAnimEnd", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(frames.at(-1)).toMatchObject({ battler0: {
      flags: 12289, visible: true, x: 72, y: fixture.expectedY, x2: 0, y2: 0,
      data: backConvexDoubleArcTerminalSpriteData(fixture.speciesName, fixture.natureId, 0, fixture.speciesId),
      callbackSymbol: "SpriteCallbackDummy", oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    } });
    expect(backConvexDoubleArcWaitAnimEndCallback(false)).toBe("WaitAnimEnd");
    expect(backConvexDoubleArcWaitAnimEndCallback(true)).toBe("SpriteCallbackDummy");
  });
});
