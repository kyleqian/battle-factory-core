// aud242d: the move-animation SEs gated by the palette-family lifetimes (AnimTask_BlendBattleAnimPal / Exclude, gComplexPaletteBlendSpriteTemplate,
// AnimTask_MetallicShine; tools/extract/extract-anim-sound-timing.ts) of a live Scene ON move animation reproduce the ROM's. The fixtures are committed
// oracle output of tools/audio/soundEventProbe.py (stepping mode, with the call log and the BlendPalette hook, AUDIO_PROBE_EXTRA_HOOKS=BlendPalette)
// and carry the replay trace; this test needs no emulator. See docs/aud242-move-anim-sounds.md section 8.
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
  calls: Array<{ fn: string; frame: number; r0?: number; r2?: number }>;
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242d-${name}.json`, import.meta.url), "utf8")) as Fixture;

// The other steps' SEs in these windows: SE_SELECT (menu), the effectiveness SEs (aud241b), SE_FAINT, SE_LOW_HEALTH, SE_M_STAT_INCREASE (239) / SE_M_STAT_DECREASE (245).
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

interface Spec {
  /** ROM frame minus our frame for every emitted SE (the window's residual; the per-move #198 offset). */
  delta: number;
  /** ROM move SEs we do not emit (frame:id:pan), each named. */
  romOnly?: readonly string[];
  /** The window is cut at this ROM frame on both sides: the next move's body (its own residual). */
  romOnlyFrom?: number;
  /** Extra frames on one of OUR rows (keyed by our frame:id:pan), each named. */
  extra?: Readonly<Record<string, number>>;
}

// Per-move offsets (ISSUES #198: the ROM script start vs the live adapter's body clock; shape, ids, pans and relative frames are exact):
// Thunderbolt / Double-Edge / Icy Wind / Metal Claw / Steel Wing are the +2 idle-lead class; the status bodies Hail / Sunny Day / Calm Mind are -4 / -4 / -5
// (aud242a's -4 class +-1: per-move constants). Thunderbolt's two SE_M_THUNDERBOLT2 rows (behind the wait on gThunderboltOrb / gSparkElectricityFlashing, aud242g) carry the same named +1 as its SE_M_HYPER_BEAM row.
// aud242e models the elliptical task (Double-Edge's SE_M_MEGA_KICK2, +2 like the rest) and the sprite waits before Thunderbolt's SE_M_HYPER_BEAM, which lands 1 frame
// later than the +2 class (named extra +1, undiagnosed: the ROM's blend log matches the table to the frame up to that row).
// Metal Claw / Steel Wing: SE_M_HARDEN's second play is a Task_LoopAndPlaySE call counter (28 iterations) that spans the shine's creation, where the ROM
// loses 2 wall frames (VBlank overrun of the tilemap / image decompress): the model shifts only ops after the creation step (METALLIC_SHINE_LOAD_LAG),
// so that one row carries the named +2.
const SPECS: Record<string, Spec> = {
  "thunderbolt-player": { delta: 2, extra: { "169:215:63": 1, "236:119:63": 1, "255:119:63": 1 } },
  "icywind-opponent": { delta: 2 },
  "doubleedge-player": { delta: 2 },
  "calmmind-player": { delta: 0, romOnlyFrom: 500 }, // lse2: -5 before the body lead was presented
  "hail-player": { delta: -4, romOnlyFrom: 380 },
  "sunnyday-player": { delta: -4, romOnlyFrom: 390 },
  "metalclaw-player": { delta: 2, extra: { "95:120:-64": 2 } },
  "steelwing-player": { delta: 2, extra: { "98:120:-64": 2 } },
};

describe("move-animation SEs after palette-family waits (aud242d)", () => {
  for (const [name, spec] of Object.entries(SPECS)) {
    it(`${name}: (frame, kind, id, pan) equals the ROM at a named ${spec.delta > 0 ? "+" : ""}${spec.delta} frame residual`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter(isMoveSe);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      const romOnly = new Set(spec.romOnly ?? []);
      const cut = (frame: number): boolean => spec.romOnlyFrom === undefined || frame < spec.romOnlyFrom;
      expect(theirs.filter((e) => romOnly.has(row(e))).map(row)).toEqual([...romOnly]);
      expect(ours.length).toBeGreaterThan(0);
      const shifted = ours.map((e) => ({ ...e, frame: e.frame + spec.delta + (spec.extra?.[row(e)] ?? 0) })).filter((e) => cut(e.frame));
      expect(shifted.map(row)).toEqual(theirs.filter((e) => cut(e.frame) && !romOnly.has(row(e))).map(row));
    });
  }

  // The palette lifetimes against the ROM's own BlendPalette call log (no per-move offset involved): a wait resumes the iteration after the task's
  // last blend. AnimTask_BlendBattleAnimPal(Exclude) with delay d, y 0 -> |D|: blends every d + 1 calls from call d (call 0 = the script step, call k >= 1 =
  // RunTasks of iteration F + k - 1), the last blend destroys the task: gone d + |D|(d + 1) - 1 ticks after F; the first blend of d > 0 is at F + d - 1
  // (battle_anim_utility_funcs.c:169-198). gComplexPaletteBlendSpriteTemplate (delay d, n blends): gone (n + 1)(d + 1) ticks after F, whose last
  // BlendPalettes(0, 0) is the sprite's destroy (battle_anim_normal.c:344-398).
  interface Schedule {
    name: string;
    palette: number;
    kind: "blendAnimPal" | "complex";
    delay: number;
    /** |D| for the blend task, numBlends for the complex blend. */
    size: number;
    /** The ROM script's frames between the wait's resume and the next SE (delay N costs N + 2). */
    gap: number;
    nextSe: number;
  }
  const SCHEDULES: readonly Schedule[] = [
    { name: "thunderbolt-player", palette: 16, kind: "blendAnimPal", delay: 0, size: 6, gap: 12, nextSe: 94 },
    { name: "hail-player", palette: 16, kind: "blendAnimPal", delay: 3, size: 6, gap: 0, nextSe: 87 },
    { name: "sunnyday-player", palette: 16, kind: "blendAnimPal", delay: 1, size: 6, gap: 0, nextSe: 78 },
    { name: "calmmind-player", palette: 16, kind: "blendAnimPal", delay: 0, size: 16, gap: 0, nextSe: 80 },
    { name: "doubleedge-player", palette: 256, kind: "complex", delay: 4, size: 2, gap: 12, nextSe: 98 },
  ];
  for (const s of SCHEDULES) {
    it(`${s.name}: the ROM's blend calls end at the table lifetime and the wait resumes one iteration later`, () => {
      const rom = fixture(s.name);
      const calls = rom.calls.filter((c) => c.fn === "BlendPalette" && c.r0 === s.palette);
      const first = Math.min(...calls.map((c) => c.frame));
      const cluster = calls.map((c) => c.frame).filter((f) => f - first < 40);
      const last = Math.max(...cluster);
      const origin = s.kind === "complex" ? first : first - Math.max(s.delay - 1, 0);
      const exact = s.kind === "complex" ? (s.size + 1) * (s.delay + 1) : s.delay + s.size * (s.delay + 1) - 1;
      expect(last).toBe(origin + exact);
      if (s.kind === "blendAnimPal") {
        // one blend every d + 1 iterations, |D| + 1 distinct y values
        const frames = [...new Set(cluster)];
        expect(frames.length).toBe(s.delay === 0 ? s.size : s.size + 1);
        expect(last - first).toBe(s.delay === 0 ? s.size - 1 : s.size * (s.delay + 1));
      }
      expect(s.nextSe).toBe(last + 1 + s.gap);
      expect(rom.events.some((e) => e.kind === "se" && e.frame === s.nextSe && isMoveSe(e))).toBe(true);
    });
  }

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("thunderbolt-player");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242b-dragonrage-opponent-off", frame: 0 } } };
    expect(ourEvents(off).filter(isMoveSe).map(row)).toEqual([]);
  });
});
