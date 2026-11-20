// aud242n: the move-animation SE behind the Confuse Ray lifetimes (BallBounce sprite, BlendColorCycleByTag, SoundTask_AdjustPanningVar; tools/extract/extract-anim-sound-timing.ts, aud242n block).
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242n-${name}.json`, import.meta.url), "utf8")) as Fixture;

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

// delta = ROM frame - our frame (0: the lead-0 class). The SE_M_STRING_SHOT2 row (130; 196 = the ball bounce sprite SEs, aud242o) sits behind the wait on the 119-tick blend cycle, the 75-tick ball bounce and the 62 / 61-tick pan task.
const SPECS: Array<{ name: string; ids: number[]; delta: number; rows: number; extra?: Record<string, number> }> = [
  { name: "confuseray-player", ids: [130, 196], delta: 0, rows: 14 },
  { name: "confuseray-opponent", ids: [130, 196], delta: 0, rows: 14 },
  // Spark: +5 on the three opening SE_M_THUNDERBOLT2 rows (two loadspritegfx, the aud242a idle-lead class) and one more frame behind the first wait (`extra`): in the ROM the
  // 8-sprite step at script frame 50 pushes the fade's second call one frame late (BlendPalette log: BG y0 at 111, OBJ y0 at 112, against 69 / 69 for the first cycle). Recorded, not modelled.
  { name: "spark-player", ids: [119, 215], delta: 3, rows: 5, extra: { "138:215:63": 1, "149:119:63": 1 } },
  { name: "spark-opponent", ids: [119, 215], delta: 3, rows: 5, extra: { "142:215:-63": 1, "153:119:-63": 1 } },
];

describe("move-animation SEs of the aud242n lifetimes", () => {
  for (const { name, ids, delta, rows, extra = {} } of SPECS) {
    it(`${name}: ${rows} rows at ROM = ours + ${delta}`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter((e) => isMoveSe(e) && ids.includes(e.id as number));
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e) && ids.includes(e.id as number));
      expect(theirs).toHaveLength(rows);
      expect(ours.map(row)).toEqual(theirs.map((e) => row({ ...e, frame: e.frame - delta - (extra[row(e)] ?? 0) })));
    });
  }
});

// The 13 SE196 rows of the ball bounce sprite (battle_anim_ghost.c:249-256, :258-286) are in the confuseray specs above since aud242o (docs section 19).
