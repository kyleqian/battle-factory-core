// aud242f: the move-animation SEs gated by the next sprite lifetimes (AnimBowMon / AnimHornHit, Ice Beam / Ice Punch crystals, fist sprite, ...; tools/extract/extract-anim-sound-timing.ts)
// of a live Scene ON move animation reproduce the ROM's. The fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, with the call log
// and the BlendPalette hook, AUDIO_PROBE_EXTRA_HOOKS=BlendPalette) and carry the replay trace; this test needs no emulator. See docs/aud242-move-anim-sounds.md section 10.
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
  frames: number;
  events: FixtureEvent[];
  calls: Array<{ fn: string; frame: number; r0?: number; r2?: number }>;
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242f-${name}.json`, import.meta.url), "utf8")) as Fixture;

// The other steps' SEs in these windows: SE_SELECT (menu), the effectiveness SEs (aud241b), SE_FAINT, SE_LOW_HEALTH, SE_M_STAT_INCREASE (239) / SE_M_STAT_DECREASE (245).
const OTHER_SES = [5, 12, 13, 14, 16, 90, 239, 245];
const isMoveSe = (e: FixtureEvent | SoundEvent): boolean => e.kind === "se" && !OTHER_SES.includes(e.id as number);
const row = (e: FixtureEvent | SoundEvent): string => `${e.frame}:${e.id}:${e.pan}`;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function ourEvents(rom: Fixture): SoundEvent[] {
  const { appStage } = rom.trace;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (appStage !== undefined && appStage.frame === 0) state = APP_STAGES[appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

interface Spec {
  /** ROM frame minus our frame for every emitted SE (the window's residual; the per-move #198 offset). */
  delta: number;
  /** ROM move SEs we do not emit (frame:id:pan), each named. */
  romOnly?: readonly string[];
  /** The window is cut at this ROM frame on both sides: the next move's body (its own residual). */
  romOnlyFrom?: number;
  /** Extra frames on one of OUR rows (keyed by our frame:id:pan), each named. */
  extra?: Readonly<Record<string, number>>;
}

// Per-move offsets (ISSUES #198: ROM script start vs the live adapter's body clock; shape, ids, pans and relative frames are exact). ROM minus ours.
const SPECS: Record<string, Spec> = {
  "horndrill-player": { delta: 0 },
  "headbutt-player": { delta: 2, romOnlyFrom: 120 },
  "icepunch-player": { delta: 2 },
  "icebeam-player": { delta: 2 },
  "swagger-player": { delta: -3, romOnlyFrom: 300 },
  "hiddenpower-player": { delta: 2 },
  // aud242h: the second SE152 (after the blend_color_cycle wait) is emitted now and exact at the same -4.
  "growth-player": { delta: -4, romOnlyFrom: 300 },
};

describe("move-animation SEs after the aud242f sprite lifetime waits", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    it(`${name}: (frame, kind, id, pan) equals the ROM at a named ${spec.delta > 0 ? "+" : ""}${spec.delta} frame residual`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter(isMoveSe);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      const romOnly = new Set(spec.romOnly ?? []);
      const cut = (frame: number): boolean => spec.romOnlyFrom === undefined || frame < spec.romOnlyFrom;
      expect(theirs.filter((e) => romOnly.has(row(e))).map(row)).toEqual([...romOnly]);
      expect(ours.length).toBeGreaterThan(0);
      const shifted = ours.map((e) => ({ ...e, frame: e.frame + spec.delta + (spec.extra?.[row(e)] ?? 0) })).filter((e) => cut(e.frame));
      expect(shifted.map(row)).toEqual(theirs.filter((e) => cut(e.frame) && !romOnly.has(row(e))).map(row));
    });
  }

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("horndrill-player");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242b-dragonrage-opponent-off", frame: 0 } } };
    expect(ourEvents(off).filter(isMoveSe).map(row)).toEqual([]);
  });
});
