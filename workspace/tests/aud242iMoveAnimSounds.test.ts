// aud242i: the move-animation SEs behind a `waitsound` (SE-length bound + the visual finish, tools/extract/extract-anim-sound-timing.ts) and the Sludge Bomb hit-particle lifetime
// of a live Scene ON move animation reproduce the ROM's. The fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, with the call log
// and the BlendPalette hook, AUDIO_PROBE_EXTRA_HOOKS=BlendPalette) and carry the replay trace; this test needs no emulator. See docs/aud242-move-anim-sounds.md section 13.
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242i-${name}.json`, import.meta.url), "utf8")) as Fixture;

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

// ROM frame minus ours for every emitted move SE (the idle-lead +2 class, ISSUES #198).
const SPECS: Record<string, { delta: number; rows: number }> = {
  // Move_SLUDGE_BOMB: ten SE126 + sludge projectiles, three SE175, `waitsound`, the hit-particle / blend_color_cycle wait, six SE148 (SE_M_TOXIC, PoisonBubblesEffect).
  "sludge-player": { delta: 0, rows: 19 },
  "sludge-opponent": { delta: 0, rows: 19 },
  // Move_FAINT_ATTACK: SE190 (before the first wait, already emitted), then after attacker_fade_to_invisible + the clearmonbg overrun the SE123 row. +3 on both rows and both sides:
  // the script start of this move is one frame earlier than the usual +2 idle-lead class (constant per move, like the other moves' named deltas), the interval is exact.
  "faint-player": { delta: 3, rows: 2 },
  "faint-opponent": { delta: 3, rows: 2 },
};

describe("move-animation SEs after the aud242i waits (Sludge Bomb waitsound, Faint Attack fade + clearmonbg)", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    it(`${name}: (frame, kind, id, pan) equals the ROM at a named +${spec.delta} frame residual`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter(isMoveSe);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      expect(ours.length).toBe(spec.rows);
      expect(ours.map((e) => row({ ...e, frame: e.frame + spec.delta }))).toEqual(theirs.map(row));
    });
  }
});
