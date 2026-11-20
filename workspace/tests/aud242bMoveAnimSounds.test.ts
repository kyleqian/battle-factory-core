// aud242b: the move-animation SEs that sit after a data-dependent wait or inside a jumpret* branch (the wait resolver of
// tools/extract/extract-anim-sound-timing.ts) of a live Scene ON move animation reproduce the ROM's, in both attacker sides. The fixtures are committed oracle output of tools/audio/soundEventProbe.py
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242b-${name}.json`, import.meta.url), "utf8")) as Fixture;

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
  /** Extra ROM frames on top of `delta` for named emitted SEs, keyed by our `frame:id:pan`. */
  extra?: Readonly<Record<string, number>>;
  /** ROM frame minus our frame for named emitted SEs of a later move body of the window (keyed by our `frame:id:pan`), replacing `delta`. */
  rowDelta?: Readonly<Record<string, number>>;
}

// Wait resolver (src/data/gen/anim-sound-timing.json, tools/extract/extract-anim-sound-timing.ts): the script frame of an op after a wait is
// derived from the source lifetimes of the tasks / sprites the wait blocks on; the SE then plays at the same generic age rule as aud242a.
//  - Dragon Rage: lead-7 move; the ROM script runs from the gAnimScriptActive edge, so the whole window sits a constant +3 after the
//    generic clock (the aud242a idle-lead residual, ISSUES #198); the loop SE 145 after three waits is relative-exact (+0 on top).
//  - Mega Punch: the SE 123 inside call SetImpactBackground (IsTargetPlayerSide branch) is +1 after the generic clock in both sides:
//    unattributed (changebg's LoadMoveBg decompression is the candidate; no script wait is involved).
//  - Hi Jump Kick: the second SE (123, after the jump-kick sprite wait) is not emitted (gSlideMon* + gJumpKickSpriteTemplate lifetime unmodelled).
//  - Haze: status body, the ROM SE is 6 frames before the generic clock (aud242a's Agility / Swords Dance -4 class); Seismic Toss's opening
//    SE 238 (after a background fade, aud242c) now emits, 2 frames short of the ROM (rowDelta); the later SEs 214 / 131 are declined (aud242a).
//  - Hyper Fang: SE_M_LEER sits after waitbgfadeout / waitbgfadein (aud242c models the palette fade, docs section 7): it emits at the
//    same +2 as the opening SE (idle-lead class), the BG_IMPACT LoadMoveBg lag (+1) being in the table.
const SPECS: Record<string, Spec> = {
  "dragonrage-opponent": { delta: 3 },
  "dragonrage-player": { delta: 3 },
  "megapunch-player": { delta: 0 },
  "megapunch-opponent": { delta: 0 },
  "hijumpkick-player": { delta: 0 },
  "hijumpkick-opponent": { delta: 0 },
  "haze-player": { delta: -6, rowDelta: { "433:238:0": 2, "553:214:-63": 2, "571:131:-63": 2 } },
  "hyperfang-player": { delta: 0 },
};

describe("move-animation SEs after waits / inside branches (aud242b)", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    it(`${name}: (frame, kind, id, pan) equals the ROM${spec.delta === 0 ? "" : ` at a named ${spec.delta > 0 ? "+" : ""}${spec.delta} frame residual`}`, () => {
      const rom = fixture(name);
      const ours = ourMoveSes(rom);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      const romOnly = new Set(spec.romOnly ?? []);
      const matched = theirs.filter((e) => !romOnly.has(row(e)));
      expect(theirs.filter((e) => romOnly.has(row(e))).map(row)).toEqual([...romOnly]);
      expect(ours.length).toBeGreaterThan(0);
      expect(ours.map((e) => `${e.frame + (spec.rowDelta?.[`${e.frame}:${e.id}:${e.pan}`] ?? spec.delta + (spec.extra?.[`${e.frame}:${e.id}:${e.pan}`] ?? 0))}:${e.id}:${e.pan}`)).toEqual(matched.map(row));
    });
  }

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("dragonrage-opponent");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242b-dragonrage-opponent-off", frame: 0 } } };
    expect(ourMoveSes(off).map(row)).toEqual([]);
  });

  it("covers both attacker sides and at least five moves", () => {
    const names = Object.keys(SPECS);
    expect(new Set(names.map((n) => n.split("-")[0])).size).toBeGreaterThanOrEqual(5);
    expect(names.some((n) => n.endsWith("-player"))).toBe(true);
    expect(names.some((n) => n.endsWith("-opponent"))).toBe(true);
  });
});
