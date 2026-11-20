// snd3 (docs/snd3-sweep-sounds.md): sound bugs of the frame catcher sweep (docs/fcs1-catcher-sweep.md findings 4-6), pinned against
// committed ROM windows (tools/audio/fixtures/snd3-*.json: soundEventProbe.py stepping mode; the --fast logs were the same rows). No emulator.
//  4. A battle-start Intimidate plays SE_M_STAT_DECREASE (its B_ANIM_STATS_CHANGE runs in both scenes), 3 frames before the banner.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { factoryBattleStartEntryFrame } from "../src/engine/factoryBattleStartEntry.ts";
import { ENTRY_STATS_CHANGE_SE_AGE } from "../src/engine/moveAnimSounds.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Row { frame: number; kind: string; id: number | null; pan: number | null; volume?: number; player?: string; via?: string; noop?: boolean }
interface Segment { frames: number; buttons?: string[] }
interface Fixture { frames: number; events: Row[]; trace?: { route: "generated-orchestrator"; battleScene: "on" | "off"; appStage: { id: string; frame: number }; segments: Segment[] } }
type Engine = ReturnType<typeof createInitialState>;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: Engine) => Engine> };
const fixture = (name: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}`, import.meta.url), "utf8")) as Fixture;
const played = <T extends Row | SoundEvent>(rows: readonly T[]): T[] => rows.filter((e) => (e as Row).noop !== true && e.kind !== "pan");

/** Replays a stage + segments on the engine; `onFrame` sees each state after its tick. */
function replay(stage: string, scene: "on" | "off", segments: readonly Segment[], frames: number, onFrame?: (state: Engine) => void): SoundEvent[] {
  let state = APP_STAGES[stage]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(segments as never)) {
    if (advance.frame > frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
    onFrame?.(state);
  }
  return events;
}

const SE_BALL_OPEN = 15;
const SE_M_STAT_DECREASE = 245;

describe("snd3 bug 4: the battle-start Intimidate's stat SE (both scenes)", () => {
  // ROM: lab tools/battle-lab/sta6m-intimp-{off,on}.json staged with --log-setup (the intro runs inside lab.prepare; absolute frames). The
  // app replays tools/compare/traces/sta6m-intro-intimp-*.json, whose frame f is the ROM's absolute frame f + 1178 (pau4m).
  const OFFSET = 1178;
  // ours minus the ROM's for the whole Scene ON intro send-out (the player's ball, cry and restore are 1 frame early; pre-existing): the stat
  // SE keeps the same place relative to our own intro, so its residual is the same.
  const OURS_MINUS_ROM = { off: 0, on: -1 } as const;
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: SE_M_STAT_DECREASE at the ROM's frame and pan, ENTRY_STATS_CHANGE_SE_AGE into the entry's stats-change command`, () => {
      const rom = fixture(`snd3-intro-intimp-${scene}-setup.json`);
      const romRows = played(rom.events).filter((e) => e.frame > OFFSET).map((e) => ({ ...e, frame: e.frame - OFFSET }));
      const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/sta6m-intro-intimp-${scene}.json`, import.meta.url), "utf8")) as { appStage: { id: string }; segments: Segment[] };
      let statsChangeStart: number | null = null;
      const ours = played(replay(trace.appStage.id, scene, trace.segments, 1000, (state) => {
        const entry = state.factoryRoundBattleOrchestrator?.battleStartIntro?.entry;
        if (entry === undefined || statsChangeStart !== null) return;
        const frame = factoryBattleStartEntryFrame(entry);
        if (frame.segments[0]!.commands[frame.commandIndex]?.type === "stats-change" && frame.lifecycle.phaseElapsed === 0) statsChangeStart = state.frame;
      }));
      const romStat = romRows.filter((e) => e.kind === "se" && e.id === SE_M_STAT_DECREASE);
      const ourStat = ours.filter((e) => e.kind === "se" && e.id === SE_M_STAT_DECREASE);
      expect(romStat.map((e) => [e.frame, e.pan, e.via])).toEqual([[scene === "off" ? 732 : 763, 64, "PlaySE12WithPanning"]]);
      expect(ourStat.map((e) => [e.frame - OURS_MINUS_ROM[scene], e.pan])).toEqual(romStat.map((e) => [e.frame, e.pan]));
      expect(ourStat[0]!.frame).toBe(statsChangeStart! + ENTRY_STATS_CHANGE_SE_AGE);
      // the residual is the intro's own: the player's send-out ball and cry carry the same one
      const ball = (rows: readonly (Row | SoundEvent)[]) => rows.filter((e) => e.kind === "se" && e.id === SE_BALL_OPEN).map((e) => e.frame);
      expect(ball(ours).map((f) => f - OURS_MINUS_ROM[scene]).slice(-1)).toEqual(ball(romRows).slice(-1));
    });
  }
});
