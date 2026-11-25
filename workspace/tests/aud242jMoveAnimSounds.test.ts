// aud242j: the move-animation SEs behind the Struggle / Attract / Dig (unleash) / Silver Wind lifetimes (tools/extract/extract-anim-sound-timing.ts, aud242j block).
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, call log + BlendPalette hook) and carry the replay trace; no emulator is needed.
// See docs/aud242-move-anim-sounds.md section 14.
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
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242j-${name}.json`, import.meta.url), "utf8")) as Fixture;

// The other steps' SEs in these windows: SE_SELECT (menu), the effectiveness SEs (aud241b), SE_FAINT, SE_LOW_HEALTH, stat-change SEs.
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

// delta = ROM frame - our frame. ids selects the rows the aud242j lifetimes time (rows before the waits are older work with their own lead).
const SPECS: Array<{ name: string; ids: number[]; delta: number; rows: number }> = [
  // kst1: BODY_SOUND_LEAD_ROWS [165, -2] (the body SEs 2 rows later: delta 7 -> 5, the lab's hit SE 13 / faint SE 16 offset in the same window; was 2 rows earlier than them).
  { name: "struggle-player", ids: [162, 141], delta: 5, rows: 5 },
  { name: "silverwind-player", ids: [132, 228, 133], delta: 0, rows: 3 },
  { name: "silverwind-opponent", ids: [132, 228, 133], delta: 0, rows: 3 },
  { name: "dig-player", ids: [114], delta: 0, rows: 1 },
];

describe("move-animation SEs after the aud242j waits", () => {
  for (const { name, ids, delta, rows } of SPECS) {
    it(`${name}: ${rows} rows at ROM = ours + ${delta}`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter((e) => isMoveSe(e) && ids.includes(e.id as number));
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e) && ids.includes(e.id as number));
      expect(theirs).toHaveLength(rows);
      expect(ours.map(row)).toEqual(theirs.map((e) => row({ ...e, frame: e.frame - delta })));
    });
  }
});
