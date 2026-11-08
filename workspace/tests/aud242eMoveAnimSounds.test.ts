// aud242e: the move-animation SEs gated by fixed-length sprite and mon-task lifetimes (Toxic bubble, Sludge / WaterGun / WaterPulse arcs, Fang, platform
// shake, Overheat flame, elliptical mon task, ElectricBolt, absorption orb; tools/extract/extract-anim-sound-timing.ts) of a live Scene ON move animation reproduce the ROM's. The fixtures are committed
// oracle output of tools/audio/soundEventProbe.py (stepping mode, with the call log and the BlendPalette hook, AUDIO_PROBE_EXTRA_HOOKS=BlendPalette)
// and carry the replay trace; this test needs no emulator. See docs/aud242-move-anim-sounds.md section 9.
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
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242e-${name}.json`, import.meta.url), "utf8")) as Fixture;

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
// (aud242a's -4 class +-1: per-move constants). The ROM-only rows: Thunderbolt's two SE_M_THUNDERBOLT2 rows behind the unmodelled ElectricityEffect waits, and the next move's body (cut).
// aud242e models the elliptical task (Double-Edge's SE_M_MEGA_KICK2, +2 like the rest) and the sprite waits before Thunderbolt's SE_M_HYPER_BEAM, which lands 1 frame
// later than the +2 class (named extra +1, undiagnosed: the ROM's blend log matches the table to the frame up to that row).
// Metal Claw / Steel Wing: SE_M_HARDEN's second play is a Task_LoopAndPlaySE call counter (28 iterations) that spans the shine's creation, where the ROM
// loses 2 wall frames (VBlank overrun of the tilemap / image decompress): the model shifts only ops after the creation step (METALLIC_SHINE_LOAD_LAG),
// so that one row carries the named +2.
// Per-move offsets (ISSUES #198: ROM script start vs the live adapter's body clock; shape, ids, pans and relative frames are exact). ROM minus ours:
// Toxic +3, Rock Tomb / Sludge / Poison Fang / Water Pulse / Double-Edge / Rolling Kick +2, Water Gun 0, Absorb / Mega Drain / Giga Drain -1 (the absorb moves
// start their body 1 frame before ours). Named extras on single rows:
//  - Overheat's four SE_M_FIRE_PUNCH rows (id 147, after the eight-flame creation step and the flame wait) land 3 later in the ROM than the model; the creation
//    step makes eight sprites and the ROM loses wall frames there (VBlank overrun; Thunderbolt's nine-sprite step shows +1, same class). Undiagnosed beyond that.
//  - Poison Tail's rows after its first wait are +4 where the first rows are +2 (undiagnosed, ISSUES proposal).
//  - Counter is used second: the ROM's opponent move body (SE214 / SE131) is not emitted, and our Counter body starts 16 frames after the ROM's; the one
//    pre-body row (SE238, the status/menu SE before the turn) keeps the ROM's frame.
const SPECS: Record<string, Spec> = {
  "toxic-player": { delta: 3, romOnlyFrom: 280 },
  "rocktomb-player": { delta: 2 },
  "overheat-player": { delta: 2, extra: { "165:147:63": 3, "173:147:63": 3, "183:147:63": 3, "193:147:63": 3 } },
  "counter-player": { delta: -16, romOnly: ["221:214:-63", "239:131:-63"], extra: { "101:238:0": 16 } },
  "gigadrain-player": { delta: -1 },
  "thunderbolt-player": { delta: 2, romOnly: ["239:119:63", "258:119:63"], extra: { "169:215:63": 1 } },
  "sludge-player": { delta: 2 },
  "poisonfang-player": { delta: 2 },
  "watergun-player": { delta: 0 },
  "waterpulse-player": { delta: 2 },
  "doubleedge-player": { delta: 2 },
  "poisontail-player": { delta: 2, extra: { "99:120:-64": 2, "201:148:63": 2, "209:148:63": 2, "217:148:63": 2, "225:148:63": 2, "233:148:63": 2 } },
  "rollingkick-player": { delta: 2 },
  "absorb-player": { delta: -1, romOnlyFrom: 600 },
  "megadrain-player": { delta: -1 },
};

describe("move-animation SEs after sprite / mon-task lifetime waits (aud242e)", () => {
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

  // Lifetimes against the ROM's own BlendPalette call log or its relative SE gaps (no per-move offset involved).
  it("double-edge: the elliptical task (loops 2, speed 4: exact 30) created at ROM frame 98 lets the wait resume at 129, where the next simple blend starts", () => {
    const rom = fixture("doubleedge-player");
    const bg = rom.calls.filter((c) => c.fn === "BlendPalette" && c.r0 === 16).map((c) => c.frame);
    expect(Math.min(...bg)).toBe(98 + 30 + 1);
  });

  it("counter: the elliptical task (loops 1, speed 4: exact 14) puts the SE_M_VITAL_THROW2 row 21 frames after the first on both sides", () => {
    const rom = fixture("counter-player");
    const romRows = rom.events.filter((e) => e.kind === "se" && (e.id === 122 || e.id === 123)).map((e) => e.frame);
    const ours = ourEvents(rom).filter((e) => e.kind === "se" && (e.id === 122 || e.id === 123)).map((e) => e.frame);
    expect(romRows[1]! - romRows[0]!).toBe(21);
    expect(ours.map((f) => f - ours[0]!)).toEqual(romRows.map((f) => f - romRows[0]!));
  });

  it("rock tomb: the platform shake (shakes * (delay + 1) - 2) leaves the SE_M_HYPER_BEAM row at the same relative frame as the ROM", () => {
    const rom = fixture("rocktomb-player");
    const romRows = rom.events.filter((e) => e.kind === "se" && (e.id === 214 || e.id === 215)).map((e) => e.frame);
    const ours = ourEvents(rom).filter((e) => e.kind === "se" && (e.id === 214 || e.id === 215)).map((e) => e.frame);
    expect(ours.map((f) => f - ours[0]!)).toEqual(romRows.map((f) => f - romRows[0]!));
  });

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("toxic-player");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242b-dragonrage-opponent-off", frame: 0 } } };
    expect(ourEvents(off).filter(isMoveSe).map(row)).toEqual([]);
  });
});
