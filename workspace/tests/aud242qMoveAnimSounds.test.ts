// aud242q: the move-animation SE behind the branch resolution (Fury Cutter / Secret Power / Strength / Ice Ball), the AnimTask_ShakeAndSinkMon, AnimTask_BlendMonInAndOut / ExtrasensoryDistortion / TransparentCloneGrowAndShrink lifetimes and the RGB(...) argument split (tools/extract/extract-anim-sound-timing.ts).
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, call log + BlendPalette hook) and carry the replay trace; no emulator is needed.
// See docs/aud242-move-anim-sounds.md section 21.
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242q-${name}.json`, import.meta.url), "utf8")) as Fixture;

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

// deltas = ROM frame - our frame per row (aud242q, section 21). Fury Cutter / Secret Power +2 (the aud242a idle-lead class), Extrasensory +3, Super Fang -1. Ice Ball, five turns behind a Lv100
// Defense Curl target: SE137 -> SE198 is 30 in the ROM on every counter 1..5 (as in the table); the turn starts drift 9 / 21 / 38 / 64 / 95 (presentation, not sound, as the aud242o Rollout drift).
const SPECS: Array<{ name: string; ids: number[]; deltas: number[] }> = [
  { name: "furycutter-player", ids: [136], deltas: [2] },
  { name: "secretpower-player", ids: [152, 141], deltas: [2, 2, 2, 2] },
  { name: "extrasensory-player", ids: [170, 192], deltas: [3, 3, 3] },
  { name: "superfang-player", ids: [171, 161], deltas: [-1, -1] },
  { name: "iceball5-player", ids: [137, 198], deltas: [9, 9, 21, 21, 38, 38, 64, 64, 95, 95] },
];

describe("move-animation SEs of the aud242q lifetimes", () => {
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
