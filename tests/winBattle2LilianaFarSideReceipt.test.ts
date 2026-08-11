import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { opponentSheetNameForGfx } from "../src/engine/battleRoomRender.ts";
import {
  OBJ_EVENT_GFX,
  facilityTrainerGfxIdForClass,
} from "../src/engine/factoryTrainerOverworldGfx.ts";
import { getFactoryTrainerPresentation } from "../src/engine/factoryTrainerPresentation.ts";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";

const FAR_SIDE_TRACE = "tools/compare/traces-groundtruth/win-go-on-swap-offer-no-liliana-far-side-off.json";
const SOURCE_TRACE = "tools/compare/traces-groundtruth/win-go-on-swap-offer-no-guide-dismiss-off.json";
const FIXTURE = "tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json";
const BATTLE_START_WINDOWS = [
  ["tools/compare/traces-groundtruth/win-go-on-battle2-room-dismiss-off.json", 11308, 11337],
  ["tools/compare/traces-groundtruth/win-go-on-battle2-transition-black-off.json", 11514, 11556],
  ["tools/compare/traces-groundtruth/win-go-on-battle2-start-off.json", 13385, 13622],
  ["tools/compare/traces-groundtruth/win-go-on-battle2-action-ready-off.json", 13631, 13633],
] as const;

type Segment = Readonly<{ frames: number; buttons?: readonly string[] }>;
type RecordedTrace = Readonly<{
  segments: readonly Segment[];
  appRoute?: string;
  oracleProfile?: string;
  appStage?: Readonly<{ id: string; frame: number }>;
  oracleBattleLab?: Readonly<{ scenario: string }>;
}>;
type BattleLabFixture = Readonly<{
  mode: string;
  profile: string;
  trace: Readonly<{ segments: readonly Segment[] }>;
}>;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("WIN GO ON LILIANA far-side ground-truth receipt", () => {
  it("keeps the exact recorded prefix, mechanicLab fixture, app stage, and dense 10638-10752 capture span linked", () => {
    const derived = readJson<Record<string, unknown>>(FAR_SIDE_TRACE);
    const source = readJson<RecordedTrace>(SOURCE_TRACE);
    const fixture = readJson<BattleLabFixture>(FIXTURE);
    const resolved = loadCompareTrace(FAR_SIDE_TRACE);

    expect(derived).toEqual({
      sourceTrace: "win-go-on-swap-offer-no-guide-dismiss-off.json",
      appRoute: "generated-orchestrator",
      oracleProfile: "battle-scene-off",
      appStage: { id: "win-terminal-window-off", frame: 4623 },
      oracleBattleLab: {
        scenario: "../../battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json",
      },
      captureWindow: { start: 10638, end: 10752 },
    });
    expect(fixture).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    expect(source).toMatchObject({
      appRoute: "generated-orchestrator",
      oracleProfile: "battle-scene-off",
      appStage: { id: "win-terminal-window-off", frame: 4623 },
      oracleBattleLab: {
        scenario: "../../battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json",
      },
    });
    expect(resolved.segments).toEqual(source.segments);
    expect(resolved.segments).toEqual(fixture.trace.segments);
    expect(resolved.segments).toHaveLength(39);
    expect(resolved.segments.reduce((total, segment) => total + segment.frames, 0)).toBe(11308);
    expect(resolved.captureFrames).toEqual(
      Array.from({ length: 10752 - 10638 + 1 }, (_, index) => 10638 + index),
    );
    expect(resolved).toMatchObject({
      appRoute: "generated-orchestrator",
      oracleProfile: "battle-scene-off",
      appStage: { id: "win-terminal-window-off", frame: 4623 },
      oracleBattleLab: {
        scenario: "../../battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json",
      },
    });
  });

  it("pins LILIANA's trainer, class-to-gfx, sheet, and source quote provenance", () => {
    const liliana = getFactoryTrainerPresentation(9);
    const gfxId = facilityTrainerGfxIdForClass(liliana.facilityClassId);

    expect(liliana).toMatchObject({
      trainerId: 9,
      trainerSourceId: "FRONTIER_TRAINER_LILIANA",
      name: "LILIANA",
      facilityClassId: 0x27,
      facilityClass: "FACILITY_CLASS_SCHOOL_KID_F",
      speechBefore: ["I WON’T GIVE UP", "UNTIL I WIN"],
    });
    expect(gfxId).toBe(OBJ_EVENT_GFX.GIRL_3);
    expect(opponentSheetNameForGfx(gfxId)).toBe("GIRL_3");
  });

  it("extends the exact prefix only with the two ordinary held-quote acknowledgements and keeps every claimed window dense", () => {
    const source = readJson<RecordedTrace>(SOURCE_TRACE);
    const fixture = readJson<{
      overrides: { parties: { player: Array<Record<string, unknown>> } };
    }>(FIXTURE);
    const appended: readonly Segment[] = [
      { frames: 2, buttons: ["A"] },
      { frames: 2000, buttons: [] },
      { frames: 2, buttons: ["A"] },
      { frames: 1000, buttons: [] },
    ];

    for (const [path, start, end] of BATTLE_START_WINDOWS) {
      const resolved = loadCompareTrace(path);
      expect(resolved.segments.slice(0, source.segments.length)).toEqual(source.segments);
      expect(resolved.segments.slice(source.segments.length)).toEqual(appended);
      expect(resolved.segments.reduce((total, segment) => total + segment.frames, 0))
        .toBe(14312);
      expect(resolved.captureFrames).toEqual(
        Array.from({ length: end - start + 1 }, (_, index) => start + index),
      );
      expect(resolved).toMatchObject({
        appRoute: "generated-orchestrator",
        oracleProfile: "battle-scene-off",
        appStage: { id: "win-terminal-window-off", frame: 4623 },
      });
    }

    // The live Battle-2 action menu exposes the healed player lead. This
    // staged DUSCLOPS retains the fixture's harmless SPLASH choice while its
    // nature/EV/gender identity matches the source-derived set-666 record
    // already owned by winTerminalWindowStage.
    expect(fixture.overrides.parties.player[0]).toMatchObject({
      species: 362,
      nature: 3,
      evs: { hp: 255, attack: 255 },
      moves: [150, 150, 150, 150],
      gender: "female",
    });
  });
});
