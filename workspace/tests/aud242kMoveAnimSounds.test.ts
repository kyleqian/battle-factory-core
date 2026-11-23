// aud242k: the move-animation SEs behind the Ancient Power / Fire Punch / Yawn / Smokescreen / Scary Face / Wish / Safeguard / Lovely Kiss / Crunch / Recover (second turn, damaged) lifetimes (tools/extract/extract-anim-sound-timing.ts, aud242k block).
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, call log + BlendPalette hook) and carry the replay trace; no emulator is needed.
// See docs/aud242-move-anim-sounds.md section 15.
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242k-${name}.json`, import.meta.url), "utf8")) as Fixture;

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

// delta = ROM frame - our frame. ids selects the rows the aud242k lifetimes time (the first row of each window is older work with its own lead class: the idle +2 or the status -2..-5).
const SPECS: Array<{ name: string; ids: number[]; delta: number; rows: number }> = [
  { name: "ancientpower-player", ids: [171, 177], delta: 0, rows: 2 },
  { name: "firepunch-player", ids: [144, 147], delta: 0, rows: 2 },
  { name: "yawn-player", ids: [237, 232], delta: 0, rows: 3 },
  { name: "smokescreen-player", ids: [135, 159], delta: 0, rows: 2 /* pmc1: Smokescreen sound-clock lead 5 -> 7 (lab aud242k-smokescreen-player-on: SE 135 / 159 on the ROM rows 71 / 111) */ },
  { name: "scaryface-player", ids: [189, 192, 130], delta: 0, rows: 3 /* kse1: sound-clock lead 5 -> 7 (labs aud242k-scaryface-player-on / mechanic-scary-face-*: SE 189 / 192 / 130 on the ROM rows) */ },
  { name: "wish-player", ids: [207, 195], delta: 0, rows: 4 /* pmc1: Wish sound lead 7 - L (L = 2): SE_M_REFLECT 91, SE_M_HEAL_BELL 218 / 234 / 251 on the ROM rows */ },
  { name: "safeguard-player", ids: [225, 102], delta: 0, rows: 2 },
  { name: "lovelykiss-player", ids: [200, 226], delta: 0, rows: 2 },
  { name: "crunch-player", ids: [161], delta: 0, rows: 2 },
  { name: "recover-player", ids: [140, 179], delta: -2, rows: 4 },
];

describe("move-animation SEs of the aud242k lifetimes", () => {
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
