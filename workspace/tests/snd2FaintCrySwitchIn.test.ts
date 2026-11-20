// snd2: a Pokemon sent in and knocked out in the same turn cries as itself. {Player,Opponent}HandleFaintingCry
// (battle_controller_player.c / battle_controller_opponent.c) cry the party mon at gBattlerPartyIndexes[battler], the one on the field
// at the faint; ours cried the mon the turn started with (the frame catcher's seed 3 / seed 6 runs: "Go! PHANPY!" ... "PHANPY fainted!"
// cried CHARMELEON). ROM windows: tools/audio/fixtures/snd2-switchin-faint-{off,on}-window.json (soundEventProbe.py stepping mode, labs
// tools/battle-lab/snd2-switchin-faint-*.json: RATTATA switches to a Level 5 PIDGEY, the foe's SEISMIC TOSS knocks it out). No emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Row { frame: number; kind: string; id: number | null; pan: number | null; mode?: string | number; volume?: number; noop?: boolean }
interface Fixture {
  frames: number;
  events: Row[];
  trace: { route: "generated-orchestrator"; battleScene: "on" | "off"; appStage: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> };
}

const CRY_MODES = ["NORMAL", "DOUBLES", "ENCOUNTER", "HIGH_PITCH", "ECHO_START", "FAINT", "ECHO_END", "ROAR_1", "ROAR_2", "GROWL_1", "GROWL_2", "WEAK", "WEAK_DOUBLES"];
const SE_BALL_OPEN = 15;
const SPECIES_PIDGEY = 16;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function engineWindow(rom: Fixture): SoundEvent[] {
  let state = APP_STAGES[rom.trace.appStage.id]!(createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene }));
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

/** Every cry, BGM duck and battle SE from the incoming PIDGEY's ball open on, its frame counted from that ball: our send-in runs one
 * frame behind the ROM's in these windows (the second SE_BALL_OPEN: ROM 464, ours 465), which is send-in timing, not the cry. */
function afterIncomingBall(events: readonly (Row | SoundEvent)[]) {
  const played = events.filter((e) => !(e as Row).noop && e.kind !== "pan");
  const balls = played.filter((e) => e.kind === "se" && e.id === SE_BALL_OPEN);
  expect(balls).toHaveLength(2); // the recalled RATTATA's ball, then PIDGEY's
  const from = balls[1]!.frame;
  return played
    .filter((e) => e.frame >= from && (e.kind === "cry" || e.kind === "duck" || (e.kind === "se" && e.id !== SE_BALL_OPEN)))
    .map((e) => ({ at: e.frame - from, kind: e.kind, id: e.id, pan: e.pan, mode: typeof e.mode === "number" ? CRY_MODES[e.mode] : e.mode, volume: e.volume }));
}

describe("snd2: the faint cry of a Pokemon sent in that turn", () => {
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: PIDGEY's faint cry, as on the ROM`, () => {
      const rom = JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/snd2-switchin-faint-${scene}-window.json`, import.meta.url), "utf8")) as Fixture;
      const want = afterIncomingBall(rom.events);
      expect(want.filter((e) => e.kind === "cry").map((e) => [e.id, e.mode])).toEqual([[SPECIES_PIDGEY, "NORMAL"], [SPECIES_PIDGEY, "FAINT"]]);
      expect(afterIncomingBall(engineWindow(rom))).toEqual(want);
    });
  }
});
