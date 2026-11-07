// aud242c: the move-animation SEs gated by the background palette fade (fadetobg / restorebg + waitbgfadein / waitbgfadeout, the frame-level
// model of tools/extract/extract-anim-sound-timing.ts) of a live Scene ON move animation reproduce the ROM's, in both attacker sides. The fixtures
// are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, with the call log) and carry the replay trace; this test needs
// no emulator. See docs/aud242-move-anim-sounds.md section 7.
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
  profile: string;
  events: FixtureEvent[];
  calls: Array<{ fn: string; frame: number; noop?: boolean }>;
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242c-${name}.json`, import.meta.url), "utf8")) as Fixture;

// The other steps' SEs in these windows: SE_SELECT (menu), the effectiveness SEs (aud241b), SE_FAINT, SE_LOW_HEALTH, SE_M_STAT_INCREASE (239).
const OTHER_SES = [5, 12, 13, 14, 16, 90, 239];
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
  /** ROM frame minus our frame for every emitted SE (the window's residual; 0 = frame-exact). */
  delta: number;
  /** ROM move SEs we do not emit (frame:id:pan), each named. */
  romOnly?: readonly string[];
}

// Fade family (the frame model, docs section 7.1): Mach Punch (BG_HIGHSPEED, SE after waitbgfadein) is frame-exact in both sides; the other
// two keep the aud242a idle-lead class (+2: LIVE_MOVE_IDLE_LEAD_ROWS was measured as the visual onset, ISSUES #198). Hyper Fang's second SE
// (SE_M_LEER after waitbgfadeout + waitbgfadein) lands at the same +2 as its opening SE once the measured BG_IMPACT load lag (1) is in the
// table; Crunch's second SE sits after a sharp-teeth sprite wait (aud242b unmodelled lifetime, aud242d).
const FADE_SPECS: Record<string, Spec> = {
  "machpunch-opponent": { delta: 0 },
  "machpunch-player": { delta: 0 },
  "hyperfang-player": { delta: 2 },
  "crunch-player": { delta: 2, romOnly: ["135:161:63"] },
};

describe("move-animation SEs after background fades (aud242c)", () => {
  for (const [name, spec] of Object.entries(FADE_SPECS)) {
    it(`${name}: (frame, kind, id, pan) equals the ROM${spec.delta === 0 ? "" : ` at a named +${spec.delta} frame residual`}`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter(isMoveSe);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      const romOnly = new Set(spec.romOnly ?? []);
      expect(theirs.filter((e) => romOnly.has(row(e))).map(row)).toEqual([...romOnly]);
      expect(ours.length).toBeGreaterThan(0);
      expect(ours.map((e) => `${e.frame + spec.delta}:${e.id}:${e.pan}`)).toEqual(theirs.filter((e) => !romOnly.has(row(e))).map(row));
    });
  }

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("machpunch-opponent");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242b-dragonrage-opponent-off", frame: 0 } } };
    expect(ourEvents(off).filter(isMoveSe).map(row)).toEqual([]);
  });
});
