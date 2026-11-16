// aud242p: the move-animation SE behind the AnimTask_HardwarePaletteFade / AnimSpotlight / AnimClappingHand lifetimes (tools/extract/extract-anim-sound-timing.ts, aud242p blocks).
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, call log + BlendPalette hook) and carry the replay trace; no emulator is needed.
// See docs/aud242-move-anim-sounds.md section 20.
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242p-${name}.json`, import.meta.url), "utf8")) as Fixture;

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

// deltas = ROM frame - our frame per row (aud242p, section 20). Encore: the nine clap SE222 rows (12 ticks apart) and SE223 sit one frame ahead of ours in the ROM. Flatter:
// SE223 and the first SE229 are -3 (the lead class), the second SE229 (after `delay 5` and 38 confetti sprites) is 0: the ROM spends 3 more frames between the two SE229 rows; undiagnosed.
const SPECS: Array<{ name: string; ids: number[]; deltas: number[] }> = [
  { name: "encore-player", ids: [222, 223], deltas: Array(10).fill(-1) },
  { name: "flatter-player", ids: [223, 229], deltas: [-3, -3, 0] },
];

describe("move-animation SEs of the aud242p lifetimes", () => {
  for (const { name, ids, deltas } of SPECS) {
    it(`${name}: ${deltas.length} rows`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter((e) => isMoveSe(e) && ids.includes(e.id as number));
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e) && ids.includes(e.id as number));
      expect(theirs).toHaveLength(deltas.length);
      expect(ours.map(row)).toEqual(theirs.map((e, i) => row({ ...e, frame: e.frame - deltas[i]! })));
    });
  }
});
