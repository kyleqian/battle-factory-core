// aud240d: Factory script sounds (heal fanfare, BGM stop / continue) reproduce the ROM's sound events frame for frame.
// The fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode) with the key script
// embedded; this test needs no emulator. See docs/aud240d-script-sounds.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { createFactoryTerminalPresentation } from "../src/engine/factoryTerminalPresentation.ts";
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
    terminal?: "roundWon";
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

// appTrace.ts is outside the typechecked tests graph (tsconfig include), so load its stage registry untyped.
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function collectWindow(rom: Fixture, collect = true): { events: SoundEvent[]; state: string } {
  const { appStage } = rom.trace;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (rom.trace.terminal === "roundWon") {
    // The staged seventh-win Lobby terminal (tools/probe/stage-factory-seventh-win-timeline-off.py): ROM tick k is terminal age k.
    const command = { type: "roundCompleted", commandId: "aud240d", battleIndex: 6, opponent: {} } as unknown as Parameters<typeof createFactoryTerminalPresentation>[0];
    state = { ...state, factoryTerminal: createFactoryTerminalPresentation(command) };
  }
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

  it("seventh-win-window.json: the Lobby WonChallenge page SEs, the BP fanfare with its BGM stop / continue, SE_SAVE and the default-NO record menu (Scene OFF stage)", () => {
    const rom = fixture("seventh-win-window");
    expect(rom.profile).toBe("battle-scene-off");
    expect(rom.events.map((e) => `${e.kind}:${e.id}`)).toEqual([
      "se:5", "stop:469", "fanfare:459", "continue:469", "se:5", "se:55", "se:5", "se:5",
    ]);
    expect(collectWindow(rom).events.map(key)).toEqual(rom.events.map(key));
  });

  it("brain-heal-setup-window.json: the Brain heal's SE_POKENAV_CALL follows the fanfare start by 163 ticks; our staged call-scene trace keeps that spacing (ROM relation from a Scene OFF lab setup log)", () => {
    const rom = fixture("brain-heal-setup-window");
    const named = rom.events.filter((e) => [368, 263].includes(e.id ?? -1) || e.kind === "continue");
    expect(named.map((e) => `${e.kind}:${e.id}`)).toEqual(["fanfare:368", "continue:469", "se:263"]);
    const [fanfare, continuation, call] = named;
    expect(continuation!.frame - fanfare!.frame).toBe(160);
    expect(call!.frame - fanfare!.frame).toBe(163);
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/factory-brain-silver-walkup-callscene-01-off.json", import.meta.url), "utf8")) as {
      appRoute: "generated-orchestrator";
      battleScene?: "on" | "off";
      appStage: { id: string; frame: number };
      oracleBattleLab: { preCheckpointFrameOffset: number };
      segments: Array<{ frames: number; buttons?: string[] }>;
    };
    const ours = collectWindow({
      from: 0, frames: 949, profile: "battle-scene-off", events: [],
      trace: { route: trace.appRoute, battleScene: trace.battleScene, appStage: trace.appStage, segments: trace.segments },
    }).events;
    const oursFanfare = ours.find((e) => e.kind === "fanfare")!;
    // sct1: the boss message's two `\p` page turns play SE_SELECT (TextPrinterWaitWithDownArrow); the lab log has them too (1169, 1303).
    expect(ours.map((e) => `${e.kind}:${e.id}`)).toEqual(["stop:469", "fanfare:368", "continue:469", "se:263", "se:5", "se:5"]);
    expect(ours.find((e) => e.kind === "continue")!.frame - oursFanfare.frame).toBe(160);
    expect(ours.find((e) => e.id === 263)!.frame - oursFanfare.frame).toBe(163);
    // sct1: the trace's heal press is the lab's own (oracle 632, so the fanfare, the continue and the call land on the log's 634 / 794 /
    // 797); its first call box still clears on the fixture's picture frame 829 because `waitse` waits for the call to end
    // (CALL_SCENE_POKENAV_CALL_WAIT). The press used to be 28 frames late (661), which hid that wait.
    const offset = trace.oracleBattleLab.preCheckpointFrameOffset;
    expect([oursFanfare.frame, ours.find((e) => e.kind === "continue")!.frame, ours.find((e) => e.id === 263)!.frame].map((f) => f + offset))
      .toEqual([fanfare!.frame, continuation!.frame, call!.frame]);
  });

  for (const name of ["heal-window", "postwin-record-window", "loss-terminal-window", "seventh-win-window"]) {
    it(`${name}.json: collecting sounds does not change the engine state`, () => {
      const rom = fixture(name);
      expect(collectWindow(rom, true).state).toBe(collectWindow(rom, false).state);
    });
  }
});
