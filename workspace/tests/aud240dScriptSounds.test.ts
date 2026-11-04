// aud240d: Factory script sounds (heal fanfare, BGM stop / continue) reproduce the ROM's sound events frame for frame.
// The fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode) with the key script
// embedded; this test needs no emulator. See docs/aud240d-script-sounds.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { APP_STAGES } from "../tools/compare/appTrace.ts";
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
  trace: {
    route: "canonical-recorded" | "generated-orchestrator";
    battleScene?: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
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
  const { appStage } = rom.trace;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  const stage = (frame: number): void => {
    if (appStage?.frame === frame) state = APP_STAGES[appStage.id]!(state);
  };
  stage(0);
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
    stage(advance.frame);
  }
  return { events, state: JSON.stringify(state) };
}

describe("script sounds match the ROM (aud240d)", () => {
  it("heal-window.json: the post-win heal scene's BGM stop, MUS_HEAL and the BGM continue (Scene ON)", () => {
    const rom = fixture("heal-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(rom.events.map((e) => e.kind)).toEqual(["stop", "fanfare", "continue"]);
    expect(collectWindow(rom).events.map(key)).toEqual(rom.events.map(key));
  });

  it("postwin-record-window.json: heal, the record question's SE_SELECTs and the RECORD-YES SE_SAVE (Scene OFF lab)", () => {
    const rom = fixture("postwin-record-window");
    expect(rom.profile).toBe("battle-scene-off");
    expect(rom.events.map((e) => `${e.kind}:${e.id}`)).toEqual([
      "stop:469", "fanfare:368", "continue:469", "se:5", "se:5", "se:5", "se:5", "se:55",
    ]);
    expect(collectWindow(rom).events.map(key)).toEqual(rom.events.map(key));
  });

  it("loss-terminal-window.json: the Lobby LostChallenge page SEs, SE_SAVE, the record question and the RECORD-YES SE_SAVE (Scene OFF lab)", () => {
    const rom = fixture("loss-terminal-window");
    expect(rom.profile).toBe("battle-scene-off");
    expect(rom.events.map((e) => `${e.kind}:${e.id}`)).toEqual([
      "se:5", "se:5", "se:55", "se:5", "se:5", "se:5", "se:55",
    ]);
    expect(collectWindow(rom).events.map(key)).toEqual(rom.events.map(key));
  });

  for (const name of ["heal-window", "postwin-record-window", "loss-terminal-window"]) {
    it(`${name}.json: collecting sounds does not change the engine state`, () => {
      const rom = fixture(name);
      expect(collectWindow(rom, true).state).toBe(collectWindow(rom, false).state);
    });
  }
});
