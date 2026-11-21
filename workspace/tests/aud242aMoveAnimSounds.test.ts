// aud242a: the script-level move-animation SEs (playsewithpan / playse / waitplaysewithpan / loopsewithpan) of a live Scene ON move
// animation reproduce the ROM's, in both attacker sides. The fixtures are committed oracle output of tools/audio/soundEventProbe.py
// (stepping mode) with the key script embedded; this test needs no emulator. See docs/aud242-move-anim-sounds.md.
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
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242a-${name}.json`, import.meta.url), "utf8")) as Fixture;

// The other steps' SEs in these windows: SE_SELECT (menu), the effectiveness SEs (aud241b), SE_FAINT, SE_LOW_HEALTH, SE_M_STAT_INCREASE (239).
const OTHER_SES = [5, 12, 13, 14, 16, 90, 239];
const isMoveSe = (e: FixtureEvent | SoundEvent): boolean => e.kind === "se" && !OTHER_SES.includes(e.id as number);
const row = (e: FixtureEvent | SoundEvent): string => `${e.frame}:${e.id}:${e.pan}`;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function ourMoveSes(rom: Fixture): SoundEvent[] {
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
  return events.filter(isMoveSe);
}

interface Spec {
  /** ROM frame minus our frame for every emitted SE (the window's residual; 0 = frame-exact). */
  delta: number;
  /** ROM move SEs we do not emit (frame:id:pan), each named. */
  romOnly?: readonly string[];
  /** ROM frame minus our frame for named emitted SEs of a later move body of the window (keyed by our `frame:id:pan`), replacing `delta`. */
  rowDelta?: Readonly<Record<string, number>>;
}

// Frame-exact: the generic script clock (src/engine/moveAnimSounds.ts) reproduces the ROM. The named residuals:
//  - idle-lead moves (Ember lead 4): LIVE_MOVE_IDLE_LEAD_ROWS was measured as the visual onset, not the script start (the ROM script runs
//    from the gAnimScriptActive rising edge, i.e. during the lead), so the SE sits a constant +2 after the generic clock.
//  - Psybeam +2: the per-move body offset the live adapters were aligned with differs from the script start by a constant; named, not fitted (aud242b/c).
//  - lead4 (B3): status moves (Agility, Swords Dance) were -4 before their script lead was presented ahead of the body (the sound clock moves by counter lead - 7); now frame-exact.
//  - Psybeam 104..151 id 200 = SE_M_PSYBEAM2 from SoundTask_LoopSEAdjustPanning (createsoundtask): aud242c emits them, frame-exact at the same +2.
//  - a later move body of the same round (Tackle 139 after Agility; Seismic Toss 214/131 after Swords Dance): declined bodies
//    (liveMoveAnimationDuration null) never emit. Seismic Toss's opening SE 238 sits after a background fade (aud242c resolves it): it now
//    emits, +1 frame short of the ROM (rowDelta; the LoadMoveBg / LoadDefaultBg overrun class, ISSUES #198).
const SPECS: Record<string, Spec> = {
  "slam-player": { delta: 0 },
  "razorleaf-player": { delta: 0 },
  "swift-opponent": { delta: 0 },
  "slash-opponent": { delta: 0 },
  "ember-player": { delta: 2 },
  "psybeam-player": { delta: 2 },
  "agility-player": { delta: 0, romOnly: ["391:139:-63"] },
  "swordsdance-opponent": { delta: 0, rowDelta: { "406:238:0": 1, "526:214:63": 1, "544:131:63": 1 } },
};

describe("move-animation script SEs (aud242a)", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    it(`${name}: (frame, kind, id, pan) equals the ROM${spec.delta === 0 ? "" : ` at a named ${spec.delta > 0 ? "+" : ""}${spec.delta} frame residual`}`, () => {
      const rom = fixture(name);
      const ours = ourMoveSes(rom);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      const romOnly = new Set(spec.romOnly ?? []);
      const matched = theirs.filter((e) => !romOnly.has(row(e)));
      expect(theirs.filter((e) => romOnly.has(row(e))).map(row)).toEqual([...romOnly]);
      expect(ours.length).toBeGreaterThan(0);
      expect(ours.map((e) => `${e.frame + (spec.rowDelta?.[`${e.frame}:${e.id}:${e.pan}`] ?? spec.delta)}:${e.id}:${e.pan}`)).toEqual(matched.map(row));
    });
  }

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("slam-player");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242a-slam-player-off", frame: 0 } } };
    expect(ourMoveSes(off).map(row)).toEqual([]);
  });

  it("covers both attacker sides and at least five moves", () => {
    const names = Object.keys(SPECS);
    expect(names.length).toBeGreaterThanOrEqual(5);
    expect(names.some((n) => n.endsWith("-player"))).toBe(true);
    expect(names.some((n) => n.endsWith("-opponent"))).toBe(true);
  });
});
