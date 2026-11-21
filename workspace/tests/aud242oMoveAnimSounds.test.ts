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
  // chg2: the charge turn's sound clock follows the opener's kernel execution (E = 10 -> 7 rows of R -> A0 on Dive, ROM SE frames 51 / 109): ours now sits on the ROM (-7 -> 0).
  { name: "dive-player", ids: [162, 233], delta: 0, rows: 2 },
  { name: "rollout-player", ids: [162, 175, 141], delta: 0, rows: 21 },
  // Five Rollout turns (counters 1..5) behind an opponent Defense Curl: the ROM's turn starts drift from ours by the presentation (not sound) offsets 9 / 14 / 21 / 33 / 54 (each turn ends on its MEGA_KICK2 row), constant inside a turn. hpd4: the foe Defense Curl and the Rollout body present their ROM script lead (bodyLeadFrames: ROM windows R->H 166 + lead) and the floor-free hit hold: 9 / 14 / 21 / 33 / 54 -> 3 / 2 / 2 / 0 / -1 (every turn toward the ROM). hpd2: the locked player's chained turn waits the foe's AI selection before the next `used` print (14-frame handoff, was 6): 8 frames per chained turn off the old 9 / 22 / 37 / 57 / 86.
  // hcr2c: rollout5 turns 4 / 5 (-1 -> -3 at turn 5, 0 -> -2 at turn 4) sit on the first print's u: the hold and lead are set once per presentation, so a later turn's body keeps turn 1's u (known non-ROM residual, not a sound lead).
  { name: "rollout5-player", ids: [162, 175, 141], delta: 0, rows: 111, turnDeltas: [0, 0, 0, -2, -3] },
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

