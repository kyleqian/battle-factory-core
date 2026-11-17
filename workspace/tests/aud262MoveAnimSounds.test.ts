// aud262: T1 0..999 missing-gated tail, the power / HP / elevation / height dimensions (docs/aud242-move-anim-sounds.md section 28).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const fixture = (file: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${file}.json`, import.meta.url), "utf8")) as Fixture;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };

function ourEvents(rom: Fixture): SoundEvent[] {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (rom.trace.appStage !== undefined) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

const tableRows = (move: number, variant: number) =>
  timing.variants[timing.moves[move]!.variants[variant]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`);

function expectConstantOffset(rom: Fixture, ids: number[], count: number, from: "first" | "last" = "last"): number {
  const pick = (events: FixtureEvent[]) => { const rows = events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)); return from === "last" ? rows.slice(-count) : rows.slice(0, count); };
  const romRows = pick(rom.events);
  const ours = pick(ourEvents(rom));
  expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
  const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
  expect(new Set(offsets).size).toBe(1);
  return offsets[0]!;
}

// AnimTask_IsPowerOver99 (battle_anim_ground.c:734-742) writes ARG_RET_ID and Move_MAGNITUDE branches on it: MagnitudeRegular and MagnitudeIntense both start the 10-row SE_M_STRENGTH loop in the
// same script step (the intense branch only adds palette blends after it), so the branch is resolved and needs no power key in the table: ROM 214 x10 nine frames apart.
describe("Magnitude (aud262)", () => {
  it("the table entry: one SE_M_STRENGTH loop at frame 0 (both power branches), ungated", () => {
    expect(timing.moves[222]!.label).toBe("Move_MAGNITUDE");
    expect(timing.moves[222]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[222]!.variants[0]!]!.map((o) => `${o.op}:${o.frame}:${(o as { times?: number }).times}`)).toEqual(["loopsewithpan:0:10"]);
  });
  for (const [side, pan] of [["player", 63], ["opponent", -63]] as const) {
    it(`aud262-magnitude-${side}: ids, pans and the 9-frame loop equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud262-magnitude-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && e.id === 214).slice(0, 10);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 8, 17, 26, 35, 44, 53, 62, 71, 80]);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, [214], 10, "first")).toBe(3);
    });
  }
});

// Rapid Spin: the second SE_M_RAZOR_WIND2 loop starts after the first waitforvisualfinish + hit + delay; the first wait ends with AnimTask_RapinSpinMonElevation, whose length is set by the attacker's
// GetBattlerYCoordWithElevation (battle_anim_mons.c:342-370: 40 - gEnemyMonElevation for an opponent, 80 for the player; battle_anim_effects_3.c:1749-1883). Keyed on the attacker's elevation.
describe("Rapid Spin (aud262)", () => {
  const entry = timing.moves[229]!;
  const secondLoop = (elevation: number) => {
    const grid = (timing as unknown as { elevationGrids: number[][]; elevationClasses: number[] });
    const cells = grid.elevationGrids[(entry as unknown as { elevation: number[] }).elevation[1]!]!;
    const ops = timing.variants[cells[grid.elevationClasses.indexOf(elevation)]!]!;
    return ops.filter((o) => o.op === "loopsewithpan")[1]!.frame - ops.filter((o) => o.op === "loopsewithpan")[0]!.frame;
  };
  it("the table entry: ungated, keyed on the opponent attacker's elevation only", () => {
    expect(entry.label).toBe("Move_RAPID_SPIN");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect((entry as unknown as { elevation: number[] }).elevation.map((g) => g >= 0)).toEqual(Array.from({ length: 12 }, (_, i) => i % 2 === 1));
    expect([0, 5, 8].map(secondLoop)).toEqual([73, 73, 73]);
    expect([10, 13, 16].map(secondLoop)).toEqual([72, 70, 69]);
  });
  const windows = [["rapidspin", "player", 0, 73], ["rapidspinmoltres", "opponent", 5, 73], ["rapidspinvoltorb", "opponent", 10, 72], ["rapidspinpidgey", "opponent", 16, 69]] as const;
  for (const [name, side, elevation, gap] of windows) {
    it(`aud262-${name}-${side}: second loop ${gap} frames after the first (elevation ${elevation}); ids, pans, offset constant`, () => {
      const rom = fixture(`aud262-${name}-${side}`);
      const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && (e.id === 160 || e.id === 134));
      expect(rows.length).toBe(9);
      expect(rows[5]!.frame - rows[0]!.frame).toBe(gap);
      expect(secondLoop(elevation)).toBe(gap);
      expect(expectConstantOffset(rom, [160, 134], 9, "first")).toBe(2);
    });
  }
});

// Water Spout: AnimTask_WaterSpoutLaunch waits for its droplets (battle_anim_water.c:1054-1250): count by the attacker's HP quarter (GetWaterSpoutPowerForAnim), flight time by the attacker's pic Y.
// The quarter windows stage the HP through a real earlier hit (the faster Lv80 / 60 / 52 Rattata's Seismic Toss: 105 -> 25 / 45 / 53), not an injected value.
describe("Water Spout (aud262)", () => {
  it("the table entry: ungated, pic Y x HP quarter grid for the player, one constant variant for the opponent", () => {
    const entry = timing.moves[323]! as unknown as { label: string; gated: number[]; pic: number[]; hp: number[] };
    expect(entry.label).toBe("Move_WATER_SPOUT");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    expect(entry.hp.map((g) => g >= 0)).toEqual(Array.from({ length: 12 }, (_, i) => i % 2 === 0));
  });
  const windows = [["waterspout-q0", "player", 49, 11], ["waterspout-q1", "player", 49, 7], ["waterspout-q2", "player", 50, 7], ["waterspout-q3", "player", 51, 2], ["waterspoutsnorlax", "player", 51, 2], ["waterspout", "opponent", 46, 2]] as const;
  for (const [name, side, lastGap, offset] of windows) {
    it(`aud262-${name}-${side}: SE gaps 46 / ${lastGap} equal the ROM's, offset ${offset} constant`, () => {
      const rom = fixture(`aud262-${name}-${side}`);
      const rows = rom.events.filter((e) => e.noop !== true && e.kind === "se" && [162, 233, 163].includes(e.id as number));
      expect(rows.map((e) => e.id)).toEqual([162, 233, 163]);
      expect([rows[1]!.frame - rows[0]!.frame, rows[2]!.frame - rows[1]!.frame]).toEqual([46, lastGap]);
      expect(expectConstantOffset(rom, [162, 233, 163], 3, "first")).toBe(offset);
    });
  }
});
