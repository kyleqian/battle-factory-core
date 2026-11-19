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

// deltas = ROM frame - our frame per row (aud242p, section 20). Encore: the nine clap SE222 rows (12 ticks apart) and SE223 sit on the ROM frame since lse2 (one frame behind ours before). Flatter:
// SE223 and the first SE229 are -3 (the lead class), the second SE229 (after `delay 5` and 38 confetti sprites) is 0: the ROM spends 3 more frames between the two SE229 rows; undiagnosed.
const SPECS: Array<{ name: string; ids: number[]; deltas: number[] }> = [
  { name: "encore-player", ids: [222, 223], deltas: Array(10).fill(0) }, // lse2: -1 before the body lead was presented
  { name: "flatter-player", ids: [223, 229], deltas: [-3, -3, 0] },
  // Reversal: +2 on all three rows (SE209, SE217 before the five-orb wait, SE123 after the 50-tick orbs + `delay 20` + `delay 8`): the aud242a idle-lead class. Taunt: -4 on all five rows (the rows
  // behind the 63-tick thought bubble / 45-tick finger wait and the anger-mark SEs included).
  { name: "reversal-player", ids: [209, 217, 123], deltas: [2, 2, 2] },
  { name: "taunt-player", ids: [186, 167, 194], deltas: [-4, -4, -4, -4, -4] },
  // Leaf Blade (AnimTask_LeafBlade, 136 ticks: seven 11-call arcs, six 6-call holds, the last trail sprite; the SE_M_LEER row behind it) 0 on all four rows. Karate Chop (AnimTravelDiagonally, 10 + 1 ticks) 0; Mist Ball (TranslateAnimSpriteToTargetMonLocation behind AnimThrowMistBall, 30 + 2) +2 (the idle-lead class). Revenge (the two 13-tick
  // scratch sprites; the opponent's Pound goes first, its body is not a live adapter in the engine) +13 on all four rows (hpf3: -10 while the opponent's hit on the player kept the 28-row floor; hit -> next ATTACKSTRING is now ROM bar rise + 25 vs ours + 26 and ATTACKSTRING -> first SE 36 vs 37, so the 13 is the opponent's Pound body, which is not a live adapter): the gaps 75 / 17 / 10 are exact.
  { name: "karatechop-player", ids: [135, 139], deltas: [0, 0] },
  { name: "leafblade-player", ids: [128, 192], deltas: [0, 0, 0, 0] },
  { name: "mistball-player", ids: [129, 159, 246], deltas: [2, 2, 2] },
  { name: "revenge-player", ids: [152, 193, 123, 141], deltas: [13, 13, 13, 13] },
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
