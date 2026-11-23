// aud242c: the move-animation SEs gated by the background palette fade (fadetobg / restorebg + waitbgfadein / waitbgfadeout, the frame-level
// model of tools/extract/extract-anim-sound-timing.ts) of a live Scene ON move animation reproduce the ROM's, in both attacker sides. The fixtures
// are committed oracle output of tools/audio/soundEventProbe.py (stepping mode, with the call log) and carry the replay trace; this test needs
// no emulator. See docs/aud242-move-anim-sounds.md section 7.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { moveAnimOpRows, type TimedOp } from "../src/engine/moveAnimSounds.ts";
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
  calls: Array<{ fn: string; frame: number; noop?: boolean }>;
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242c-${name}.json`, import.meta.url), "utf8")) as Fixture;

// The other steps' SEs in these windows: SE_SELECT (menu), the effectiveness SEs (aud241b), SE_FAINT, SE_LOW_HEALTH, SE_M_STAT_INCREASE (239) / SE_M_STAT_DECREASE (245).
const OTHER_SES = [5, 12, 13, 14, 16, 90, 239, 245];
const isMoveSe = (e: FixtureEvent | SoundEvent): boolean => e.kind === "se" && !OTHER_SES.includes(e.id as number);
const row = (e: FixtureEvent | SoundEvent): string => `${e.frame}:${e.id}:${e.pan}`;
// Pan family: SE rows plus SE12PanpotControl rows (kind "pan", id null).
const isMoveSound = (e: FixtureEvent | SoundEvent): boolean => isMoveSe(e) || e.kind === "pan";
const soundRow = (e: FixtureEvent | SoundEvent): string => `${e.frame}:${e.kind === "pan" ? "pan" : "se"}:${e.id}:${e.pan}`;

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
  /** ROM frame minus our frame for every emitted SE (the window's residual; 0 = frame-exact). */
  delta: number;
  /** ROM move SEs we do not emit (frame:id:pan), each named. */
  romOnly?: readonly string[];
  /** The window is cut at this ROM frame on both sides: a later, gated part of the script, or the next move's body (its own residual). */
  romOnlyFrom?: number;
}

// Fade family (the frame model, docs section 7.1): Mach Punch (BG_HIGHSPEED, SE after waitbgfadein) is frame-exact in both sides; the other
// two keep the aud242a idle-lead class (+2: LIVE_MOVE_IDLE_LEAD_ROWS was measured as the visual onset, ISSUES #198). Hyper Fang's second SE
// (SE_M_LEER after waitbgfadeout + waitbgfadein) lands at the same +2 as its opening SE once the measured BG_IMPACT load lag (1) is in the
// table; Crunch's second SE sits after a sharp-teeth sprite wait (aud242b unmodelled lifetime, aud242d).
const FADE_SPECS: Record<string, Spec> = {
  "machpunch-opponent": { delta: 0 },
  "machpunch-player": { delta: 0 },
  "hyperfang-player": { delta: 0 },
  "crunch-player": { delta: 0 },
};

// Every row of a window is shifted by the same named per-move offset (ISSUES #198: the ROM script start vs the live adapter's body clock; the
// shape, ids, pans and the relative frames are exact): Flamethrower is a moves-with-unknown-idle-lead body (LIVE_MOVE_NO_PRE_ROW_SIDES); rsl1 gave its sound clock the ROM's 3 pre rows (+3 -> 0, both sides), the status bodies Metal Sound / Sweet Scent sit before the generic clock (-2 / -3, aud242a's -4 class), Icy Wind's opening SE is +2.
// The later gated rows (Icy Wind's panse after sprite waits; the next move's SEs) are the ROM-only part. Metal Sound is cut at ROM frame 121: the ROM
// loses two wall-clock frames there (121 / 122 have no pan call, a VBlank overrun like the BG load lag; its rows after 111 are noop calls anyway).
const PAN_SPECS: Record<string, Spec> = {
  "flamethrower-opponent": { delta: 0 },
  "flamethrower-player": { delta: 0 },
  "metalsound-opponent": { delta: -2, romOnlyFrom: 121 },
  "sweetscent-player": { delta: -1, romOnlyFrom: 400 },
  "icywind-opponent": { delta: 0, romOnlyFrom: 100 },
};

// Sound-task family (docs section 7.3): SoundTask_LoopSEAdjustPanning plays and pan steps ported from battle_anim_sound_tasks.c. Hyper Beam waits on a
// simple_palette_blend sprite (palette fade length from palette.c: the sprite is gone n - 1 ticks after the creation tick, aud242e; delta +1); Aurora Beam / Psybeam keep the +2 idle-lead class
// of the aud242a bodies, Fire Blast (SoundTask_FireBlast, 10 loop SEs + 2 ending SEs: the whole task) is +2, Ice Beam sits at +2 (after the same palette-blend wait). Ice Beam's seven SE137 rows (ROM 176..212) were ROM-only here until aud242f modelled the
// ice-crystal sprite lifetimes; they are emitted now at the same +2 (re-pinned in aud242f: the ROM log has the rows, the model now matches them).
// PlaySE1/2WithPanning visual tasks (createvisualtask, played and destroyed in the creation step): Dragon Claw's two SE_M_SCRATCH rows after the
// opening SE are frame-exact on an opponent attacker (pan -63, the AdjustPanning flip); Superpower (physical) is the +2 class, the status bodies
// Flatter is -3 and Cosmic Power 0 (lse2: its lead is presented in front of the body) (aud242a's status class -4 +-1: per-move constants). The windows are cut where the other gated rows start.
const TASK_SPECS: Record<string, Spec> = {
  "hyperbeam-opponent": { delta: 0 },
  "hyperbeam-player": { delta: 0 },
  "aurorabeam-player": { delta: 0 },
  "icebeam-opponent": { delta: 0 },
  "psybeam-player": { delta: 0 },
  "fireblast-player": { delta: 0 },
  "dragonclaw-opponent": { delta: 0, romOnlyFrom: 200 },
  "cosmicpower-player": { delta: 0, romOnlyFrom: 150 },
  "flatter-player": { delta: -3, romOnlyFrom: 100 },
  "superpower-player": { delta: 0, romOnlyFrom: 150 },
};

describe("move-animation SEs after background fades (aud242c)", () => {
  for (const [name, spec] of Object.entries({ ...FADE_SPECS, ...TASK_SPECS })) {
    it(`${name}: (frame, kind, id, pan) equals the ROM${spec.delta === 0 ? "" : ` at a named +${spec.delta} frame residual`}`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter(isMoveSe);
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e));
      const romOnly = new Set(spec.romOnly ?? []);
      const cut = (e: FixtureEvent): boolean => spec.romOnlyFrom === undefined || e.frame < spec.romOnlyFrom;
      expect(theirs.filter((e) => romOnly.has(row(e))).map(row)).toEqual([...romOnly]);
      expect(ours.length).toBeGreaterThan(0);
      expect(ours.map((e) => `${e.frame + spec.delta}:${e.id}:${e.pan}`).filter((r) => spec.romOnlyFrom === undefined || Number(r.split(":")[0]) < spec.romOnlyFrom)).toEqual(theirs.filter((e) => cut(e) && !romOnly.has(row(e))).map(row));
    });
  }

  for (const [name, spec] of Object.entries(PAN_SPECS)) {
    it(`${name}: SE and pan-change rows equal the ROM${spec.delta === 0 ? "" : ` at a named +${spec.delta} frame residual`}`, () => {
      const rom = fixture(name);
      // The ROM's SE12PanpotControl calls on a stopped SE player (the SE ended before its pan task did) are flagged noop by the probe (m4a RAM
      // unchanged; presentation ignores them). The engine does not model m4a state, so it emits the whole call stream while the live body runs:
      // the effective ROM rows must all be ours, in order, and every other row of ours must be one of the ROM's noop calls.
      const romOnly = (e: FixtureEvent): boolean => (spec.romOnlyFrom !== undefined && e.frame >= spec.romOnlyFrom) || (spec.romOnly ?? []).includes(soundRow(e));
      const inWindow = rom.events.filter((e) => isMoveSound(e) && !romOnly(e));
      const effective = inWindow.filter((e) => e.noop !== true).map(soundRow);
      const noop = new Set(inWindow.filter((e) => e.noop === true).map(soundRow));
      const ours = ourEvents(rom).filter(isMoveSound).map((e) => ({ ...e, frame: e.frame + spec.delta })).filter((e) => spec.romOnlyFrom === undefined || e.frame < spec.romOnlyFrom).map(soundRow);
      expect(ours.filter((r) => !noop.has(r))).toEqual(effective);
      expect(ours.filter((r) => noop.has(r)).length).toBe(ours.length - effective.length);
      expect(effective.length).toBeGreaterThan(0);
    });
  }

  it("Scene OFF emits no move-animation SE (the animation is skipped)", () => {
    const rom = fixture("machpunch-opponent");
    const off = { ...rom, trace: { ...rom.trace, battleScene: "off" as const, appStage: { id: "aud242b-dragonrage-opponent-off", frame: 0 } } };
    expect(ourEvents(off).filter(isMoveSe).map(row)).toEqual([]);
  });

  // Cmd_panse_adjustnone (raw pans, raw signed increment, Sunny Day +1), Cmd_panse_adjustall (AdjustPanning2 on all three, Wish -3 on an opponent
  // attacker flips every sign) and framesToWait > 0 (Task_PanFromInitialToTarget acts every w + 1 iterations): no window reaches these gated ops.
  describe("panse variants (source arithmetic)", () => {
    const player = { attackerSide: "player", targetSide: "opponent" } as const;
    const opponent = { attackerSide: "opponent", targetSide: "player" } as const;
    const rows = (op: Partial<TimedOp> & Pick<TimedOp, "op">, context: typeof player | typeof opponent) =>
      moveAnimOpRows({ frame: 0, id: 241, pan: -64, target: 63, inc: 1, wait: 0, ...op }, context).map((r) => `${r.offset}:${r.emission.kind}:${r.emission.pan}`);

    it("panse_adjustnone keeps the raw pans on either side and ends exactly at the target", () => {
      for (const context of [player, opponent]) {
        const out = rows({ op: "panse_adjustnone" }, context);
        expect(out[0]).toBe("0:se:-64");
        expect(out[1]).toBe("0:pan:-63");
        expect(out.at(-1)).toBe("126:pan:63");
        expect(out).toHaveLength(2 + 126);
      }
    });
    it("panse_adjustall negates pans and the increment for an opponent attacker (AdjustPanning2)", () => {
      const out = rows({ op: "panse_adjustall", id: 273, pan: 63, target: -64, inc: -3 }, opponent);
      expect(out[0]).toBe("0:se:-63");
      expect(out[1]).toBe("0:pan:-60");
      expect(out.at(-1)).toBe("42:pan:64");
      expect(rows({ op: "panse_adjustall", id: 273, pan: 63, target: -64, inc: -3 }, player)[0]).toBe("0:se:63");
    });
    it("framesToWait w acts every w + 1 iterations starting at iteration w", () => {
      const out = rows({ op: "panse", pan: -64, target: 63, inc: 60, wait: 2 }, player);
      expect(out).toEqual(["0:se:-64", "2:pan:-4", "5:pan:56", "8:pan:63"]);
    });
    it("a zero increment writes the target once", () => {
      expect(rows({ op: "panse", pan: 63, target: 63, inc: 2, wait: 0 }, player)).toEqual(["0:se:63", "0:pan:63"]);
    });
  });

  // createsoundtask arithmetic beyond the ROM windows (Hyper Beam / Psybeam / Aurora Beam / Ice Beam: pan step interval r7 = 0 or > 0, gap r9 = 0..5; Fire Blast).
  describe("sound tasks (source arithmetic)", () => {
    const player = { attackerSide: "player", targetSide: "opponent" } as const;
    const opponent = { attackerSide: "opponent", targetSide: "player" } as const;
    const loop = (args: { pan: number; target: number; inc: number; times: number; step: number; gap: number }, context: typeof player | typeof opponent) =>
      moveAnimOpRows({ op: "soundtask_loopse", frame: 0, id: 168, ...args }, context).map((r) => `${r.offset}:${r.emission.pan}${r.task === true ? "t" : ""}`);

    it("LoopSEAdjustPanning plays at once in the script step, then every gap + 1 calls (offsets gap, 2 gap + 1, ...)", () => {
      expect(loop({ pan: -64, target: 63, inc: 1, times: 3, step: 0, gap: 5 }, player)).toEqual(["0:-64", "5:-58t", "11:-52t"]);
    });
    it("a pan step every step + 1 calls, the last play ends the task before its pan step", () => {
      // Mist: 5 plays, step interval 5, gap 5 (plays 6 calls apart, pan stepping every 6 calls: each play sees one more step)
      expect(loop({ pan: -64, target: 63, inc: 20, times: 4, step: 5, gap: 5 }, player)).toEqual(["0:-64", "5:-44t", "11:-24t", "17:-4t"]);
    });
    it("gap 0 plays every call (offset 0 twice: the script step and RunTasks of the same iteration)", () => {
      expect(loop({ pan: 0, target: 63, inc: 4, times: 3, step: 0, gap: 0 }, player)).toEqual(["0:0", "0:4t", "1:8t"]);
    });
    it("an opponent attacker flips the pans and the increment follows the adjusted target", () => {
      const out = loop({ pan: -64, target: 63, inc: 1, times: 2, step: 0, gap: 5 }, opponent);
      expect(out).toEqual(["0:63", "5:57t"]);
    });
    it("the pan stays in range", () => {
      expect(loop({ pan: -64, target: 63, inc: 100, times: 3, step: 0, gap: 0 }, player)).toEqual(["0:-64", "0:36t", "1:63t"]);
    });

    const fire = (context: typeof player | typeof opponent) =>
      moveAnimOpRows({ op: "soundtask_fireblast", frame: 0, id: 144, id2: 145, pan: null }, context).map((r) => `${r.offset}:${r.emission.id}:${r.emission.pan}`);
    it("FireBlast: ten loop SEs every 11 calls from call 0 (pan +2 per call), two ending SEs at calls 111 and 117 at the target pan", () => {
      const out = fire(player);
      expect(out).toHaveLength(12);
      expect(out[0]).toBe("0:144:-64");
      expect(out[1]).toBe("11:144:-42");
      expect(out[9]).toBe("99:144:63");
      expect(out.slice(10)).toEqual(["111:145:63", "117:145:63"]);
    });
    it("FireBlast from an opponent attacker sweeps the other way", () => {
      const out = fire(opponent);
      expect(out[0]).toBe("0:144:63");
      expect(out[1]).toBe("11:144:41");
      expect(out.slice(10)).toEqual(["111:145:-63", "117:145:-63"]);
    });
  });
});
