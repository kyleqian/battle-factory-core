// aud261: T1 0..999 missing-gated tail (docs/aud242-move-anim-sounds.md section 27).
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

function expectConstantOffset(rom: Fixture, ids: number[], last: number): number {
  const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number)).slice(-last);
  const romRows = pick(rom.events);
  const ours = pick(ourEvents(rom));
  expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
  const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
  expect(new Set(offsets).size).toBe(1);
  return offsets[0]!;
}

// AnimTask_AttackerStretchAndDisappear (battle_anim_effects_2.c:2792-2810, one 8-tick affine frame: 8 ticks) and AnimTask_ExtremeSpeedImpact (:2812-2873, 3 rounds of 12 calls then 24 x2 steps back: destroyed on
// call 60, 59 ticks) and the three mon-edge hit splats (10 each) gate the two waits: ROM 160 x3 (loop), 139 +39, 139 +12, 123 +12 (the splats), 135 x4 +44 after the VITAL_THROW2 (player attacker: 110 / 149 / 161 / 173 / 217).
// A Rattata opponent leaves a residual x2 = 1 (ROM, tgt x2 read at the task entry), which shortens the case-3 return by one call; the windows below use a Snorlax target (x2 = 0).
describe("Extreme Speed (aud261)", () => {
  it("the table entry: loop at 44, COMET_PUNCH at 83 / 95, VITAL_THROW2 at 107, DOUBLE_TEAM loop at 151, ungated", () => {
    expect(timing.moves[245]!.label).toBe("Move_EXTREME_SPEED");
    expect(timing.moves[245]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[245]!.variants[0]!]!.map((o) => `${o.op}:${o.frame}`)).toEqual(["loopsewithpan:44", "playsewithpan:83", "playsewithpan:95", "playsewithpan:107", "loopsewithpan:151"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud261-extremespeed-${side}: ids, pans and the +39 / +12 / +12 / +44 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-extremespeed-${side}`);
      const ids = [160, 139, 123, 135];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 8, 17, 39, 51, 63, 107, 115, 124, 133]);
      expect(expectConstantOffset(rom, ids, 10)).toBe(0);
    });
  }
});

// AnimMilkBottle_Step1 (battle_anim_effects_1.c:4003-4062, simulated by milkBottleDestroyCall) gates the wait before the thin ring: ROM 142 x3 (+14, +36), 225 +62, 179 +94 (the Healing blue stars); ROM minus ours -2 on both sides (status-move class). The window is the second turn: the first fails at full HP.
describe("Milk Drink (aud261)", () => {
  it("the table entry: CRABHAMMER SEs at 54 / 68 / 90, MILK_DRINK at 116, ABSORB_2 at 148, ungated", () => {
    expect(timing.moves[208]!.label).toBe("Move_MILK_DRINK");
    expect(timing.moves[208]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[208]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`)).toEqual(["54:142", "68:142", "90:142", "116:225", "148:179"]);
  });
  for (const [side, pan] of [["player", -64], ["opponent", 63]] as const) {
    it(`aud261-milkdrink-${side}: ids, pans and the +14 / +36 / +62 / +94 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-milkdrink-${side}`);
      const ids = [142, 225, 179];
      const romRows = rom.events.filter((e) => e.kind === "se" && ids.includes(e.id as number));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 14, 36, 62, 94]);
      expect(romRows.every((e) => e.pan === pan)).toBe(true);
      expect(expectConstantOffset(rom, ids, 5)).toBe(-2);
    });
  }
});

// AnimPainSplitProjectile (battle_anim_effects_3.c:2937-2970, 19 ticks to animEnded) and AnimTask_PainSplitMovement (:2974-3033, destroyed on call 13: 12 ticks) gate the two waits after each SWAGGER2: ROM 194 x3, 25 apart.
describe("Pain Split (aud261)", () => {
  it("the table entry: SWAGGER2 (pan 0) at 15 / 40 / 65, ungated", () => {
    expect(timing.moves[220]!.label).toBe("Move_PAIN_SPLIT");
    expect(timing.moves[220]!.gated.every((g) => g === 0)).toBe(true);
    expect(timing.variants[timing.moves[220]!.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}:${o.pan}`)).toEqual(["15:194:0", "40:194:0", "65:194:0"]);
  });
  for (const side of ["player", "opponent"] as const) {
    it(`aud261-painsplit-${side}: ids, pans and the +25 / +25 gaps equal the ROM's, offset constant`, () => {
      const rom = fixture(`aud261-painsplit-${side}`);
      const romRows = rom.events.filter((e) => e.kind === "se" && e.id === 194);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 25, 50]);
      expect(romRows.every((e) => e.pan === 0)).toBe(true);
      expect(expectConstantOffset(rom, [194], 3)).toBe(-4);
    });
  }
});
