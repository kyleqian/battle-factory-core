// aud242o: the move-animation SE behind the Confuse Ray lifetimes (BallBounce sprite, BlendColorCycleByTag, SoundTask_AdjustPanningVar; tools/extract/extract-anim-sound-timing.ts, aud242o block).
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, call log + BlendPalette hook) and carry the replay trace; no emulator is needed.
// See docs/aud242-move-anim-sounds.md section 18.
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242o-${name}.json`, import.meta.url), "utf8")) as Fixture;

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

const SPECS: Array<{ name: string; ids: number[]; delta: number; rows: number; extra?: Record<string, number>; turnDeltas?: number[] }> = [
  { name: "petaldance-player", ids: [202, 141], delta: 2, rows: 2 },
  { name: "dive-player", ids: [162, 233], delta: -7, rows: 2 },
  { name: "rollout-player", ids: [162, 175, 141], delta: 3, rows: 21 },
  // Five Rollout turns (counters 1..5) behind an opponent Defense Curl: the ROM's turn starts drift from ours by the presentation (not sound) offsets 9 / 35 / 61 / 85 / 110 (each turn ends on its MEGA_KICK2 row), constant inside a turn.
  // hpd1 (docs/hpd1-hp-hold.md): the hit's hold is now the ROM's (bar + 1 + tail, no 28 floor), so the per-turn increment is the near-constant 26 / 26 / 24 / 25
  // (was 13 / 15 / 20 / 29 = a per-turn constant ~13 plus the floor's over-hold of 0 / 2 / 7 / 16); the +-1 is the app/ROM damage-roll difference (rol1). The ~25 per turn
  // that remains is not the hold (the labs' hold delta is 0).
  { name: "rollout5-player", ids: [162, 175, 141], delta: 0, rows: 111, turnDeltas: [9, 35, 61, 85, 110] },
];

describe("move-animation SEs of the aud242o lifetimes", () => {
  for (const { name, ids, delta, rows, extra = {}, turnDeltas } of SPECS) {
    it(`${name}: ${rows} rows at ROM = ours + ${turnDeltas?.join(" / ") ?? delta}`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter((e) => isMoveSe(e) && ids.includes(e.id as number));
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e) && ids.includes(e.id as number));
      expect(theirs).toHaveLength(rows);
      let turn = 0;
      const shifted = theirs.map((e) => {
        const d = turnDeltas === undefined ? delta : turnDeltas[turn]!;
        if (e.id === 141) turn++;
        return row({ ...e, frame: e.frame - d - (extra[row(e)] ?? 0) });
      });
      expect(ours.map(row)).toEqual(shifted);
    });
  }
});

