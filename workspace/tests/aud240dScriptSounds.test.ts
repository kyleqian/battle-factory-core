// aud240d: Factory script sounds (heal fanfare, BGM stop / continue) reproduce the ROM's sound events frame for frame.
// The fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode) with the key script
// embedded; this test needs no emulator. See docs/aud240d-script-sounds.md.
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
}
interface Fixture {
  from: number;
  frames: number;
  profile: string;
  events: FixtureEvent[];
  trace: { route: "canonical-recorded"; battleScene?: "on" | "off"; segments: Array<{ frames: number; buttons?: string[] }> };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;
const key = (e: { frame: number; kind: string; id: number | null; pan: number | null }) => ({
  frame: e.frame,
  kind: e.kind,
  id: e.id,
  pan: e.pan,
});

function collectWindow(rom: Fixture, collect = true): { events: SoundEvent[]; state: string } {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.from + rom.frames) break;
    if (collect) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      if (advance.frame > rom.from) events.push(...result.events);
    } else {
      state = tick(state, advance.buttons);
    }
  }
  return { events, state: JSON.stringify(state) };
}

describe("script sounds match the ROM (aud240d)", () => {
  it("heal-window.json: the post-win heal scene's BGM stop, MUS_HEAL and the BGM continue", () => {
    const rom = fixture("heal-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(rom.events.map((e) => e.kind)).toEqual(["stop", "fanfare", "continue"]);
    const ours = collectWindow(rom);
    expect(ours.events.map(key)).toEqual(rom.events.map(key));
  });

  it("collecting sounds does not change the engine state", () => {
    const rom = fixture("heal-window");
    expect(collectWindow(rom, true).state).toBe(collectWindow(rom, false).state);
  });
});
