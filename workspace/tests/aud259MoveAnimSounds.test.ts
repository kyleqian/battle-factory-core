// aud259: Soft-Boiled (gSoftBoiledEggSpriteTemplate lifetime = the script's `setarg 7, 0xFFFF`, the egg reaches AnimSoftBoiledEgg_Step4 first).
// See docs/aud242-move-anim-sounds.md section 25.
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

describe("Soft Boiled (aud259)", () => {
  const entry = timing.moves[135]!;
  it("the table entry: SE 167 at 12, 166 at 143 (delay 120 + 7), 179 at 217 (after the egg wait at setarg + 1), ungated", () => {
    expect(entry.label).toBe("Move_SOFT_BOILED");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    const rows = timing.variants[entry.variants[0]!]!.map((o) => `${o.op}:${o.frame}:${(o as { id?: number }).id}:${o.pan}`);
    expect(rows).toEqual(["playsewithpan:12:167:-64", "playsewithpan:143:166:-64", "playsewithpan:217:179:63"]);
  });
  it("aud259-softboiled-player (the second turn's heal; the first fails at full HP): ids, pans and the 131 / 74-frame gaps equal the ROM's, offset constant", () => {
    const rom = fixture("aud259-softboiled-player");
    const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && [167, 166, 179].includes(e.id as number));
    const romRows = pick(rom.events);
    const ours = pick(ourEvents(rom));
    expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["167:-64", "166:-64", "179:-64"]);
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 131, 205]);
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
    const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
    expect(new Set(offsets).size).toBe(1);
    expect(offsets[0]).toBe(-5);
  });
});

// T2 seed 165 res17: ROM 193, 205 (+9), 205 (+41), 192 (+72). The ROM `via` read AnimTask_MonToSubstitute only because the probe's symbol table lists globals: AnimBlockX_Step is the local
// function at 0x0815f4f0..0x0815f620, between that task and AnimTask_OdorSleuthMovement. The rows are the Block X sprite's own SEs (battle_anim_effects_3.c:4898-4953).
describe("Block (aud259)", () => {
  const entry = timing.moves[335]!;
  it("the table entry: SE 193 at 3, the X's SKETCH / SKETCH / LEER 9 / 41 / 72 later against an opponent target (14 / 46 / 77 against a player target)", () => {
    expect(entry.label).toBe("Move_BLOCK");
    const rows = (side: number) => timing.variants[entry.variants[side]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}`).sort();
    const expected = (offsets: number[]) => [`3:193`, `${3 + offsets[0]!}:205`, `${3 + offsets[1]!}:205`, `${3 + offsets[2]!}:192`].sort();
    expect(rows(0)).toEqual(expected([9, 41, 72]));
    expect(rows(1)).toEqual(expected([14, 46, 77]));
  });
  for (const w of [{ file: "aud259-block-player", gaps: [0, 9, 41, 72], pan: 63 }, { file: "aud259-block-opponent", gaps: [0, 14, 46, 77], pan: -63 }]) {
    it(`${w.file}: ids, pans and gaps equal the ROM's; ROM minus ours is constant`, () => {
      const rom = fixture(w.file);
      const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && [193, 205, 192].includes(e.id as number));
      const romRows = pick(rom.events);
      const ours = pick(ourEvents(rom));
      expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["193", "205", "205", "192"].map((id) => `${id}:${w.pan}`));
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual(w.gaps);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
      expect(new Set(offsets).size).toBe(1);
      console.info(w.file, "ROM minus ours", offsets[0]);
    });
  }
});

// Dynamic Punch: `waitsound` after SE_M_VITAL_THROW2. The song's two tracks read FINE at tick 25 and the tick-26 status goes PAUSE; MPlayMain at TEMPO 220 (tempoI 150 until the TEMPO read in tick 1)
// reaches it in VBlank 19 (extract-anim-sound-timing.ts seExact, m4a_1.s:1150-1370), so the script resumes 19 iterations after the SE.
describe("Dynamic Punch (aud259)", () => {
  const entry = timing.moves[223]!;
  it("the table entry: SE 123 at 18, the waitsound resumes at 37 (18 + 19), then SE 177 every 8 frames, ungated", () => {
    expect(entry.label).toBe("Move_DYNAMIC_PUNCH");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    const rows = timing.variants[entry.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}:${o.pan}`);
    expect(rows).toEqual(["18:123:63", "37:177:63", "45:177:63", "53:177:63", "61:177:63", "69:177:63"]);
  });
  it("aud259-dynamicpunch-player: ids, pans and the 19 / 8 / 8 / 8 / 8-frame gaps equal the ROM's; ROM minus ours is constant (the fifth SE 177 falls after the engine's presented window)", () => {
    const rom = fixture("aud259-dynamicpunch-player");
    const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && [123, 177].includes(e.id as number));
    const romRows = pick(rom.events);
    const ours = pick(ourEvents(rom) as unknown as FixtureEvent[]);
    expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["123:63", "177:63", "177:63", "177:63", "177:63", "177:63"]);
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 19, 27, 35, 43, 51]);
    // The engine's move-animation command ends at body age 74 (DYNAMIC_PUNCH_BODY_LAST_AGE); the last explosion SE is script frame 69, age 77: the census's "after the command's last presenting frame" class.
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.slice(0, 5).map((e) => `${e.id}:${e.pan}`));
    const offsets = romRows.slice(0, 5).map((e, i) => e.frame - ours[i]!.frame);
    expect(new Set(offsets).size).toBe(1);
    console.info("aud259-dynamicpunch-player ROM minus ours", offsets[0]);
  });
});

// Fake Out: AnimTask_FakeOut (battle_anim_effects_2.c:3080-3131) is destroyed 15 calls after its creation, so the SKETCH after `waitforvisualfinish` is 16 frames after the FLATTER.
describe("Fake Out (aud259)", () => {
  const entry = timing.moves[252]!;
  it("the table entry: SE 229 at 0, SE 205 at 16, ungated", () => {
    expect(entry.label).toBe("Move_FAKE_OUT");
    expect(entry.gated.every((g) => g === 0)).toBe(true);
    const rows = timing.variants[entry.variants[0]!]!.map((o) => `${o.frame}:${(o as { id?: number }).id}:${o.pan}`);
    expect(rows).toEqual(["0:229:0", "16:205:63"]);
  });
  it("aud259-fakeout-player: ids, pans and the 16-frame gap equal the ROM's; ROM minus ours is constant", () => {
    const rom = fixture("aud259-fakeout-player");
    const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && [229, 205].includes(e.id as number));
    const romRows = pick(rom.events);
    const ours = pick(ourEvents(rom) as unknown as FixtureEvent[]);
    expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["229:0", "205:63"]);
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 16]);
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
    const offsets = romRows.map((e, i) => e.frame - ours[i]!.frame);
    expect(new Set(offsets).size).toBe(1);
    console.info("aud259-fakeout-player ROM minus ours", offsets[0]);
  });
});
