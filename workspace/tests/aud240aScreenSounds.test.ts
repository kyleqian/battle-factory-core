// aud240a: screen SE_SELECT emitters (draft, swap, in-game dialog menus) reproduce the ROM's sound events
// frame for frame. The fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, so
// the no-op second SE of a yes/no "NO" is kept); this test needs no emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent {
  frame: number;
  kind: string;
  id: number | null;
  pan: number | null;
  noop?: boolean;
}
interface Fixture {
  from?: number;
  frames: number;
  profile: string;
  events: FixtureEvent[];
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;
const trace = (name: string) =>
  JSON.parse(readFileSync(new URL(`../tools/compare/traces-groundtruth/${name}.json`, import.meta.url), "utf8")) as {
    battleScene?: "on" | "off";
    segments: Array<{ frames: number; buttons?: string[] }>;
  };

const key = (e: { frame: number; kind: string; id: number | null; pan: number | null }) => ({
  frame: e.frame,
  kind: e.kind,
  id: e.id,
  pan: e.pan,
});

function collectWindow(segments: Array<{ frames: number; buttons?: string[] }>, battleScene: "on" | "off" | undefined, from: number, frames: number): SoundEvent[] {
  let state = createInitialState({ appRoute: "canonical-recorded", battleScene });
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(segments)) {
    if (advance.frame > from + frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    expect(state.frame).toBe(advance.frame);
    if (advance.frame > from) events.push(...result.events);
  }
  return events;
}

describe("screen SE emitters match the ROM (aud240a)", () => {
  it("draft-window.json: the canonical draft anchor, SE_SELECT at f21 / f43 / f85", () => {
    const rom = fixture("draft-window");
    expect(rom.events.map((e) => e.frame)).toEqual([21, 43, 85]);
    const script = [
      { frames: 20 },
      { frames: 2, buttons: ["RIGHT"] },
      { frames: 20 },
      { frames: 2, buttons: ["A"] },
      { frames: 40 },
      { frames: 2, buttons: ["B"] },
      { frames: 30 },
    ];
    let state = createInitialState();
    const ours: SoundEvent[] = [];
    for (const advance of traceAdvances(script)) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      ours.push(...result.events);
    }
    expect(state.frame).toBe(rom.frames);
    expect(ours.map(key)).toEqual(rom.events.map(key));
  });

  for (const [name, source] of [
    ["draft-trace-window", "battle1-swapyes-b"],
    ["swap-window", "battle1-swapyes-b"],
    ["swap-decline-window", "battle1-winline-b-swap"],
  ] as const) {
    it(`${name}.json: every ROM sound event of the window, in order (${source})`, () => {
      const rom = fixture(name);
      expect(rom.profile).toBe("battle-scene-on");
      const source_ = trace(source);
      const ours = collectWindow(source_.segments, source_.battleScene, rom.from ?? 0, rom.frames);
      expect(rom.events.length).toBeGreaterThan(0);
      expect(rom.events.every((e) => e.kind === "se" && e.id === 5 && e.pan === null)).toBe(true);
      expect(ours.map(key)).toEqual(rom.events.map(key));
    });
  }

  it("the swap-offer NO plays SE_SELECT twice in one frame (menu.c plus Task_HandleYesNoInput), the ROM's no-op second SE included", () => {
    const rom = fixture("swap-decline-window");
    const doubled = rom.events.filter((e) => e.frame === 29632);
    expect(doubled.map((e) => e.noop === true)).toEqual([false, true]);
    expect(rom.events.filter((e) => e.frame === 29602)).toHaveLength(1);
  });

  it("collecting sounds does not change the engine state", () => {
    const source = trace("battle1-swapyes-b");
    const run = (collect: boolean) => {
      let state = createInitialState({ appRoute: "canonical-recorded", battleScene: source.battleScene });
      for (const advance of traceAdvances(source.segments)) {
        if (advance.frame > 30300) break;
        state = collect ? collectSoundTick(state.frame + 1, () => tick(state, advance.buttons)).result : tick(state, advance.buttons);
      }
      return JSON.stringify(state);
    };
    expect(run(true)).toBe(run(false));
  });
});
